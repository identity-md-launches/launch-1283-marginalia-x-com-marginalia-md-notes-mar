# Marginalia site v3.2

This continuation adds the fifth **Feedback** composer tab and the operator's weekly build loop. It preserves the existing trade, calls, theses, child calls, seals, Annex, hidden Pages and runtime verification. Feedback signs exact EIP-191 JSON and uses a same-origin intake route; it never approves or moves tokens. The immutable/open lists appear before the form. Text is capped at 600 UTF-8 bytes; the connected wallet, exact message and self-reported handle are explicit. The form remains usable during an RPC outage. Unsent drafts survive composer changes in page memory only; no drafts or signatures are saved to browser storage.

`web/worker/feedback.js` is the Cloudflare module to mount beside existing assets. Bind FEEDBACK KV, FEEDBACK_WRITES (the exported durable writer for strict concurrent rate limits) and ASSETS. See [worker/README.md](worker/README.md) for mounting, signature/ID encoding, public document schemas, the pick key and the one-line adopted-ledger append. This job delivers service code; production mounting and publication remain operator steps. On a plain static/IPFS host without the route, the app explains the unavailable service rather than inventing entries.

Read [../docs/loop.md](../docs/loop.md), [../docs/STATUS.md](../docs/STATUS.md) and [../docs/CHANGELOG.md](../docs/CHANGELOG.md) before every continuation and append to STATUS/CHANGELOG before delivering. These three documents also ship under `dist/docs/`; `agents.md` links them. No bootstrap ranking, oracle request, adopted build or credit is fabricated.

The post-success venue notice now depends on the confirmed NotePosted target: target-zero theses omit it, priced calls retain it. Existing child-call follow-up remains intact.

## Feedback validation

Alongside the existing build/typecheck/manifest commands below, run these from `web/` with its unchanged dependencies installed:

```sh
node tests/feedback-worker.mjs
node tests/feedback-noted.mjs
node tests/feedback-ledger.mjs
./node_modules/.bin/esbuild worker/feedback.js --bundle --format=esm --platform=browser --outfile=/tmp/marginalia-feedback-worker.js
MINIFLARE_MODULE=/absolute/path/to/miniflare/dist/src/index.js WORKER_BUNDLE=/tmp/marginalia-feedback-worker.js node tests/feedback-runtime.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs EVIDENCE_DIR=../test/scratch/feedback node tests/feedback-browser.mjs
```

Miniflare 4 and Playwright are optional test tools installed outside this repository, not application dependencies. `BROWSER=webkit` runs the same interactions in WebKit. The browser test serves the production export at a subpath, runs the actual intake against test storage and signs with fresh ephemeral accounts, while rejecting all external chain calls. The workerd test exercises the actual durable object and KV APIs. The note-badge test verifies code/chain/ABI/binding failures with deterministic RPC fixtures. Test accounts and entries never ship in `dist/`. The worker validation report distinguishes local tests from unperformed live signing/deployment.

## Retained v3.1 behavior

Trade it. Say why. The chain keeps the receipt. This version continues the existing React 19 / TypeScript / Vite / viem ledger, with the trade composer first and the scoreboard below it. Publish repository-root `dist/` as plain files. Relative Vite assets and hash routes support a gateway subpath without server rewrites.

## Child calls

On your open thesis, **Post the child call** opens `#/?child=<thesis-id>`. Use **Trade and post** or **Just the call**; both receive only the parent ID, leaving the token and text empty and retaining their ordinary target/horizon defaults. Neither inherits a token or side from the thesis. The composer shows “Child call under your thesis <short id>, due <date>”. `#/post?child=<id>` also supports the retained call form.

You can enter **Parent (your own open thesis)** manually in call mode. In the trade box, open **Parent thesis (optional)** below the primary action. The ID must identify a hook thesis, be `ThesisOpen`, belong to the connected wallet, and be within `THESIS_GRACE`. Empty means an independent call. These parent rules do not apply to `#/post?counter=`, thesis rebuttals or saved seal reveals. The Annex cannot satisfy a hook thesis's child requirement, so its composer has no own-thesis field.

`src/thesis-parent.ts` reads `noteOf` and `horizonEnd` at one block, using the hook's live grace limit. A thesis's zero horizon makes `horizonEnd` its posting timestamp. This works even if event history is incomplete. `src/child-call.tsx` scopes eligibility to parent, account and chain, refreshes every 15 seconds, and disables invalid/loading parents with a one-sentence explanation. Approval and posting re-read eligibility. Both posting paths cap their existing deadline at the thesis's inclusive grace end. Counter calls retain their separate other-author/same-token/opposite-side rules.

A confirmed thesis shows **Next: your child call, due <date>**, using the confirmed receipt block timestamp. Open thesis feed cards say **needs its child call** while on-chain `children` is zero; a normal feed refresh updates that state after a child is confirmed. No contract, deployment setting, caveat or economic rule changed.

## Configuration

The browser loads **`dist/imd-deployment.json`** for deployment addresses, chain ID, ABI paths and public network configuration. `src/config.ts` verifies canonical ABI Keccaks. `loadContracts` verifies chain/code, token/IMD/pool bindings, and derives router, judge, treasury and pricer from the hook. It checks the Annex's hook binding and, when present, the Pages hook/Annex bindings. No private credentials or WalletConnect ID are required; signing uses an injected EIP-1193 wallet.

`deployment/mainnet.json` and `deployment/network.json` preserve the supplied handoffs for reproducible builds after task inputs disappear. `deployment/integrations.json` adds only the explicitly authorized live Annex, `0xd0c0d97aebe9194606bcc46ce56524eee4615543`. The manifest keeps the original launch identifiers, contracts and unchanged network/walletAddChain objects. No top-level integration configuration is added to the exported manifest.

Pages v0.10 has **no deployment address**. Its implementation-derived ABI and frontend are included, but all panels, links, routes and reads stay hidden until a verified `MarginaliaPages` entry is added to the runtime manifest. Do not use a placeholder address. After deployment, add the authorized address and ABI hash to `deployment/integrations.json`, then regenerate and verify the export. Provenance and ABI hashes are in `contracts/README.md`.

The named IMD/USDC v3 reference, canonical factories/WETH and deployment scan blocks are centralized in `src/config.ts`; factories/WETH are cross-checked against the router. Every v4 state/quote uses the manifest network's Uniswap addresses. The posting router is derived from the hook, as this app uses its atomic trade-and-note path. Unknown-chain errors offer the exact `wallet_addEthereumChain` parameters, then retry switching.

## Routes and actions

| Route | Purpose and primary controls |
| --- | --- |
| `#/` | Trade and post; just the call; thesis; launched-token call; Feedback; checkpoint; exact approvals; WETH wrap; Annex hook admission; scoreboard below |
| `#/scoreboard` | Prize/clock, combined hook + Annex wallet records, cited accounts, duels, verdicts, feed |
| `#/feed` | Filter notes, including `?cites=handle`; venue liquidity and token Radar links |
| `#/note/<hex-id>` | Receipt, share, counter, own-thesis child call, observe, settle, retract, thesis forfeiture, deposit/refund claim; Annex actions target the Annex |
| `#/?child=<hex-id>` | Child composer, with only an own-thesis parent prefilled; both hook posting modes available |
| `#/duel/<counter-id>` | Independent call legs and their records |
| `#/author/<address>` | Combined record, weighted wins, notes, duels, sharing; Pages when deployed |
| `#/post` | Retained guided first call and experienced-writer form |
| `#/post?counter=<id>` | Opposite-side counter-call; Annex parents use the Annex composer |
| `#/post?kind=thesis` | Long-form thesis and child-call requirement |
| `#/seal` | Local draft, public checkpoint, exact stamp approval, seal and timed reveal |
| `#/pools` | Deposit/refund claims, sweeps, judging request/payment/abandonment, treasury drip |
| `#/pages/<handle>` | Registration, page trades, exact claim sentence/tweet ID, abandonment, recycling and deferred burn; available only with Pages address |
| `#/about` | Mechanics, contract explorer links and exported agent documents |

## Transaction behavior

- The trade box discovers canonical v2/v3 WETH/IMD pairs and bounded v4 Initialize events, validates every candidate on the relevant contract, and ranks normalized active quote liquidity. V4 history starts no earlier than the hook launch and covers at most 16,000 recent blocks. Failed reads and incomplete depth comparisons are disclosed. Supply an older v4 PoolKey in the venue details; it still must pass contract validation.
- Client-side bigint quotes read one block of pool state. V3/v4 quotes walk initialized ticks and liquidity changes; v2 uses reserve math. The quote includes the MARG hook's quiet sell fee. Trades use a 1% minimum, positive MARG allocation minimum with 10% room, and a 10-minute deadline. Excessive tick traversal fails explicitly. No third-party quote API is called.
- An X-side ERC-20 approval goes only to the hook-derived router for the exact input. Posting IMD approval is exactly stamp + MARG allocation + bond. **If both legs spend IMD, one approval covers their sum.** Allowances are checked before offering approval. WETH shortage offers a separate `deposit()` for exactly the missing amount, using native value; the subsequent trade sends no native value.
- Annex posting approves exactly 0.35 IMD + bond to the manifest Annex. `validateVenue` is authoritative for hook/static/dynamic-fee eligibility. Its own checkpoint and `postPrice` supply the baseline, bounded at +3% for upward or -3% for downward calls. Admission validates up to four distinct contracts, reads the panel fee and offers exact fee approval.
- Checkpoints use fixed public unused fields and never reset a usable 1–6 hour window. Drafts persist locally; the countdown enables posting at maturity. Sealed drafts never enter checkpoint calldata or simulations. Reveal remains bound to author/hash/subject and the 30-minute–6-hour window, with deadline capped at expiry. Only sealing approves exactly the verified 0.1 IMD stamp to the hook.
- Pages reads `eligible`, registers a handle before its first trade, quotes both value and 10% fee, and approves exactly the quoted cost. Claims display the contract's exact `claimMessage(wallet)`. Pending claim abandonment, escrow recycling and reserved-fee burn have live eligibility gates. Burns have a positive MARG minimum and spend contract reserves, not a wallet approval.
- Transaction calls simulate first, recheck wallet identity/chain, request a signature and stay pending through confirmation. Prerequisite reads are scoped to the wallet and subject. Errors, rejection, insufficient funds and failed reads remain explicit.

USD values are informational **spot** references from the deepest active canonical IMD/USDC v3 pool among the four standard fee tiers. USDC is treated as a dollar reference and can depeg. The source is labeled and linked; missing/stale prices show `USD unavailable`. No USD value enters settlement, approval, quote minima or transaction calldata. USD context on a WETH-side trade is unavailable when the WETH/IMD bridge cannot be read.

## Records and limitations

The hook and Annex scanners start at blocks 26169583 and 26178192 respectively. Each uses 2,000-block requests, bounded recent/backfill batches, persisted successful ranges, a 64-block overlap and reorg anchor. Refresh continues coverage; gaps remain disclosed. Wallet scores combine both contracts. Rankings, receipts and weighted wins depend on loaded history and never substitute a cited handle for the posting wallet. Both sides of a duel settle independently.

Venue liquidity on a note is reconstructed from its posting transaction when directly decodable. Nested smart-wallet calldata or unavailable transactions show an explicit unavailable state. Calls can still be authored by contract wallets. The liquidity comparison is an active virtual reserve, not executable capacity or a guarantee against removal.

Pages holders can follow the writer's public seal commitments in their panel. **Private early delivery of sealed text is not deployed:** the contracts publish only hashes and the draft stays in the author's unencrypted local storage. The frontend does not pretend hashes disclose draft text. Canvas cards remain local; the generic OG image targets the supplied `marginalia.chat` domain, while per-route social unfurls require a future rendering service.

The full swarm caveat stays above the home fold and in every loaded-page footer. Launch text in `../docs/launch-copy.md` is for the operator to post manually.

## Build and preview

With Node and the unchanged lockfile:

```sh
cd web
npm ci --cache /tmp/marginalia-npm-cache --no-audit --no-fund
npm run typecheck
npm run build
npm run manifest
npm run check
npm run preview
```

`manifest` runs after the production build, copies the three continuation-memory documents into `dist/docs/`, and inventories every exported file except itself with SHA-256. It also binds canonical ABI Keccaks and copies root `AGENTS.md` / `llms.txt` verbatim. `check` verifies those files, exact handoff/network, the explicit Annex extension, relative assets and export completeness. Regenerate after any export change. The source, unchanged package manifest/lockfile and final static export travel together.

The assignment forbids writing dependency paths, so this worker installed the same lockfile in `/tmp/marginalia-child/build/web`, copied source/public/scripts/tests plus root documents there, built/checked there and copied only `dist/` back. No dependency directory, registry archive, submodule, ignore-file edit or build-configuration change is delivered.

## Validation

See `VALIDATION.md`, `validation/v3.2/` (current) and `validation/v3.1/` (historical) and root `DESIGN.md` (older evidence remains in `validation/v3/`). From `web/` with dependencies installed:

```sh
for name in v2-unit revision-unit history-unit v3-unit child-call-unit; do
  ./node_modules/.bin/esbuild "tests/$name.ts" --bundle --platform=node --format=esm --outfile="/tmp/$name.mjs"
  node "/tmp/$name.mjs"
done
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs EVIDENCE_DIR=../test/scratch/v3-browser node tests/v3-browser.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs EVIDENCE_DIR=../test/scratch/child-call-browser node tests/child-call-browser.mjs
```

Playwright may be installed separately under `/tmp`; it is not an application dependency. The runner serves production files under `/preview/`, mocks wallet/RPC responses, blocks outside requests and broadcasts nothing. `BROWSER=webkit` selects WebKit when its runtime works. Older browser harnesses remain historical v1/v2 reproductions and contain superseded home-layout expectations. `tests/v3-live.ts`, bundled like the unit tests, takes a public RPC URL and absolute runtime manifest path for read-only verification and same-block comparison against the configured Uniswap quoter. Real wallet signing and live transaction outcomes were not tested or authorized.

`tests/child-call-browser.mjs` covers the three parent gates, nonexistent IDs, fresh preflight, expiry, account changes, both calldata paths, the receipt handoff and feed state. `TEST_FILTER` selects a scenario by name. `tests/child-call-live.ts` takes the same arguments as `v3-live.ts` for an optional read-only parent check; its live run did not finish because the worker RPC returned empty responses and HTTP 429, recorded in validation.
