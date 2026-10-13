# Feedback intake deployment

This is deployable code, not an already mounted service. The static export still works independently; Feedback shows an explicit service-unavailable state on hosts without `/api/feedback`. No third-party script, token approval, transaction or relay participates. The wallet calls only EIP-191 `personal_sign` for this form.

## Mount beside the existing assets

Keep the site's existing Worker and asset routing. Import `handleFeedback` from `web/worker/feedback.js`, re-export `FeedbackWriter`, and delegate the matching routes before the existing handler:

```js
import { handleFeedback } from './web/worker/feedback.js';
export { FeedbackWriter } from './web/worker/feedback.js';
export default {
  async fetch(request, env, ctx) {
    return await handleFeedback(request, env)
      ?? existingAssetHandler.fetch(request, env, ctx);
  }
};
```

`existingAssetHandler` here means the site's current imported asset handler. This fragment belongs in that Worker; it is not a replacement asset implementation. The module's default export already supports a standard `ASSETS` binding as a standalone mounting option.

Create a **KV namespace named/bound `FEEDBACK`** in the existing Worker. Add **`FEEDBACK_WRITES`**, a Durable Object binding to the exported `FeedbackWriter` class, and a migration with `new_sqlite_classes = ["FeedbackWriter"]` (use the next unused migration tag in the deployed Worker). Each wallet maps to one durable instance. Keep this binding/namespace stable across releases. Bind **`ASSETS`** to the same static export, or expose an equivalent internal fetcher through `env.ASSETS` when calling `handleFeedback`; its `/imd-deployment.json` and ABI routes must return the actual exported files. Route `/api/feedback` and `/api/feedback/*` to this Worker **before** the SPA/static fallback. No new secret or deployment address is needed. Use the actual KV ID returned by Cloudflare; no made-up namespace ID is supplied here.

The serializer is necessary for the exact hourly/weekly limits: Workers KV is eventually consistent and cannot atomically read/increment counters across locations ([Cloudflare's consistency guidance](https://developers.cloudflare.com/kv/concepts/how-kv-works/)). KV contains the rate record and all entries; the durable transaction closes the race, retains an outbox and retries failed KV projection through an alarm. Without both bindings POST returns 503, rather than claiming to enforce a limit it cannot guarantee. A successful retry of identical signed bytes returns the existing ID and uses no additional quota. Reusing the same text with a different kind/handle returns 409. A lost response can be retried with the same body. After a durable reservation but failed KV write, retry that same entry; changing its text still encounters the reserved quota. An alarm retries its publication even without the client.

No dependency files change. `viem` is already pinned by `web/package-lock.json`. Install with that lock and bundle this module through the existing Worker's bundler. For a standalone bundle, from `web/`:

```sh
npm ci --cache /tmp/marginalia-npm-cache --no-audit --no-fund
./node_modules/.bin/esbuild worker/feedback.js --bundle --format=esm --platform=browser --minify --outfile=/tmp/marginalia-feedback-worker.js
```

Deploy with the existing account's Worker tooling and the bindings above. Exporting the class from the final entrypoint is essential. There is no need to ship npm tarballs, node_modules or a registry. This assignment does not publish the Worker or change DNS.

## Signed input and public documents

POST `/api/feedback` takes `{message, signature, address}`. `message` is **a string**, exactly `JSON.stringify({site:'marginalia.chat', week:Math.floor(unixSeconds/604800), kind, text, handle})`, with those keys in that order and no extra whitespace. `kind` is `Site`, `Mechanics` or `Idea`; `handle` is `''` or 1–15 letters/digits/underscores, without `@`. Text is nonempty and at most **600 UTF-8 bytes**, preserved verbatim. No Unicode normalization or trimming changes signed text. Address matching is case-insensitive; stored addresses are lowercase. This uses local EOA signature recovery, not EIP-1271 or a network verification service. Contract-wallet signatures are not supported by this particular off-chain route; the existing on-chain authoring flows remain unchanged.

The ID encoding is **`keccak256(abi.encode(address,uint256 week,string text))`**. It is not packed concatenation. The response is `{id}` (201 new; 200 identical retry). Error responses have `{error}`, no-store, and 429 includes `Retry-After` seconds. Entries are limited to one per **rolling 3,600 seconds**, ten per **Unix week**. The rolling-hour check spans week boundaries. Bodies above 8 KiB, malformed JSON, wrong site/week, altered signer, noncanonical messages and cross-origin requests are refused. Requests without an Origin header permit public scripts/oracles; there is no wildcard CORS grant. GET responses are JSON with `Cache-Control: public, max-age=60`, `Vary: Origin`, and allow-origin only for the matching origin.

KV layout:

| Key | Stored value |
| --- | --- |
| `entry:<week>:<id>` | `{week, entry, message, signature}`; public entry also in KV listing metadata when it fits 1 KiB; otherwise read the value. No shared mutable weekly array |
| `rate:<lowercase address>` | `{week,count,lastTs}`; durable state supplies authoritative concurrent enforcement |
| `noted:<lowercase address>` | Positive verified-chain badge cache, TTL one hour |
| `pick:<week>` | `{week,attestationRequestId,ranked:[id,...]}`, copied from the verified panel answer |
| `adopted.json` | `{site:'marginalia.chat',builds:[...]}`, append-only operator ledger |

`GET /api/feedback/<week>.json` returns the oracle document below plus `pick` (null until published). All KV list pages are joined and entries sort newest first. `GET /api/feedback/adopted.json` returns the ledger. `GET /api/feedback/today.json` returns **exactly**:

```text
{site, week, brief:{audience,scope,immutable:[...],open:[...]}, adopted:[ids],
 entries:[{id,address,handle,kind,text,ts,noted:bool}]}
```

`adopted` includes implemented IDs from all shipped builds. `ts` is server Unix seconds. `noted` comes from the hook/Annex on-chain `records(address).posted`: both pinned contracts increment it in the same successful path that emits `NotePosted`, and never decrement it. This avoids claiming complete log coverage from a partial scan. Reads use the runtime manifest's RPCs, addresses and verified ABIs, chain/code checks and the Annex's hook binding. A supplied handle never determines a badge. A failed read yields no positive badge; the UI explains that absence is not proof of no note. The signature-verification function itself is fully offline. No private credentials are read or returned.

HTTP caching and KV propagation may delay a newly accepted entry. The form shows its returned ID immediately and offers Refresh board. A static/IPFS-only gateway cannot accept shared submissions; mount the route on the named site's Worker. Do not fake a board using local storage or exported sample entries.

## Publish a pick and append an adopted build

Follow `docs/loop.md`, including verification of the oracle receipt and the credit-vs-diff review. With the actual verified pick saved as `pick.json`, write it to `pick:<week>` via the existing Cloudflare dashboard or `wrangler kv key put --binding FEEDBACK --remote "pick:$WEEK" --path pick.json`. No public endpoint can write picks or the adopted ledger.

Initialize `adopted.json` from `worker/adopted.json` **only on a new empty namespace**. After each reviewed/shipped build, download the latest ledger, and from `web/` append exactly once (variables must contain the real file paths/week/commit):

```sh
node worker/ledger.mjs adopted.json "../docs/credits/$WEEK.json" "$PR_COMMIT" pick.json snapshot.json > adopted.next.json
```

Then inspect the added row, retain the previous ledger as a backup, and upload `adopted.next.json` as the `adopted.json` KV key, with `wrangler kv key put --binding FEEDBACK --remote adopted.json --path adopted.next.json` or the dashboard. Also append the identical row to repository `web/worker/adopted.json` in the next continuation. Use one operator for these manual updates; KV has no compare-and-swap for competing administrators. The helper validates authors, shares, disposition coverage, request/week, real-format commit, and duplicate adoption; it cannot judge whether a UI diff actually implements an idea. **That mandatory review must pass before upload.** Never edit or remove old rows. Credit comes solely from `docs/credits/<week>.json`, never an operator's allocation.

## Checks

From `web/` with the unchanged dependencies: `node tests/feedback-worker.mjs` and `node tests/feedback-ledger.mjs`. The workerd integration test uses a separately installed Miniflare 4 (`MINIFLARE_MODULE` pointing to its module and `WORKER_BUNDLE` to the esbuild output): `node tests/feedback-runtime.mjs`. Browser validation uses `tests/feedback-browser.mjs`; see `VALIDATION.md` for exact commands, results and limitations. None of these tests spends funds or deploys a contract.
