# Marginalia status

## 2026-10-13 · v3.2 delivery state

Every future continuation reads `docs/loop.md`, `docs/STATUS.md` and `docs/CHANGELOG.md` first and appends to both STATUS and CHANGELOG before delivering. This dated section is an append-only release snapshot; later jobs add dated updates rather than quietly replacing unresolved facts.

**Published site at task intake:** v3.1 at `marginalia.site.identitymd.eth`, CID `bafybeicj77hs3b2mqarnabtuq2euk4zoaaeywpa6v4362mlueonqwj7qk4`, according to the pinned project handoff. Product/signature domain: `marginalia.chat`. **This repository delivery:** v3.2 source and static `dist/`; the new CID and serving-site update are assigned during publication. Do not use the prior CID as proof v3.2 is live. No contract is deployed by this job.

## Contracts and verification

Ethereum, chain ID **1**. The runtime source of truth is `dist/imd-deployment.json`; this table documents it and does not replace it. Public RPCs, Uniswap addresses, chain-add parameters and ABI bindings are retained from the supplied handoff. `web/deployment/mainnet.json`, `network.json` and the already-authorized `integrations.json` are reproducible build inputs. No credentials are bundled.

| Contract | Address / status | Verification provenance |
| --- | --- | --- |
| Marginalia (MARG) | `0xfa0efea559bde229031c2b0a219472316647759c` | Live launch 1283, block 26169583; handoff source commit `f99868c781b4844b1e45837932ad73c790f7b288`, ABI Keccak `38880b8e56d42ce900f744a7908c7139632a49f1c3f33385c64ceaed29d37bee` |
| MarginaliaHook | `0xf0457dd0cf526686190e4f057ba19db14d34a0cc` | Same launch/block/source; ABI Keccak `ffba7e31146b501ba95575d8af426ac1e360dcc5dd3a502fc8981b9c94c763c7` |
| MarginaliaAnnex | `0xd0c0d97aebe9194606bcc46ce56524eee4615543` | Authorized v3 integration, block 26178192; pinned launch 1384 source/ABI, Keccak `d5caa09b5445973684cc46375443c967ff8baf3da70992ddbdb102327cc79c0b`; `annex.hook()` binding checked by the client |
| Router | `0xa3579D7c59A2C0c742fC4e5BB18AF93241D1d263` | Prior recorded read of `hook.router()` at block 26180413; derive again at runtime, do not hard-code from this table |
| Judge | `0xa9e1891d76553195B4Cbcd0F8Db290C8C0FA28B9` | Prior `hook.judge()` at the same block; runtime-derived |
| Treasury | `0x3e00372cc4967D2bd006Ca882c51dAf45a9810C8` | Prior `hook.treasury()` at the same block; runtime-derived |
| IMD reference | `0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7` | Network pair token, cross-checked with `hook.imd()` |
| MarginaliaPages v0.10 | **Address pending; all UI hidden** | Pinned launch 1467 source commit `5cf7caed0e188088eb3f55c8e5005e281cd382d9`; ABI exported, no manifest address. Do not infer one. |

The prior live read/code/binding/quote check is in `web/validation/v3.1/live-read.txt`; that historical check is not a claim this job repeated it. This job also completed a fresh read-only verification at Ethereum block **26181241**: contract code and bindings, Annex predicate, ABI hashes and both local launch-pool quote directions matching the configured quoter. No transaction was sent. Current local checks and limitations are in `web/VALIDATION.md`. Runtime boot rechecks chain, code, companions, pool bindings and ABI hashes before enabling existing transaction controls. Per-export SHA-256 hashes are regenerated for v3.2. The handoff also mentions a distributor in project history, but supplies no distributor ABI/address in the runtime contract set; no new distributor integration is inferred.

## What this delivery adds

The home Feedback tab collects Site / Mechanics / Idea, up to 600 UTF-8 bytes and an optional unverified X handle. The wallet signs the exact site/week/kind/text/handle JSON; this flow has no gas, approvals or token movements. Feedback remains reachable while chain reads are unavailable. Immutable rules precede the form. Entries, chain-derived note badges, panel ranking and shipped-build credits are public JSON. No sample suggestions, artificial rankings or guessed attestation IDs are included.

`web/worker/feedback.js` is ready to mount on the site's existing Cloudflare Worker; **it is not deployed here**. It needs FEEDBACK KV, the exported FeedbackWriter bound as FEEDBACK_WRITES for strict distributed rate enforcement, and the existing assets exposed as ASSETS for chain badge verification. `web/worker/README.md` describes mounting, cache behavior, signature encoding and the manual adoption append. This is an explicit backend exception for feedback to the otherwise static reader/writer site.

`docs/loop.md` defines the Sunday oracle question, exact public document, fixed continuation header, verbatim ranked-entry handoff, credits schema and mandatory regression/token-code/credit review failures. This bootstrap has no attestation and issues no credits. `web/worker/adopted.json` starts empty. The thesis post success notice now omits the venue sentence for target-zero theses and retains it for priced calls.

## Open work / feedback-style backlog

| Item | State / next concrete action |
| --- | --- |
| Publish v3.2 | Contributor publisher assigns commit/CID and updates the existing site name; append those facts to this log when known. |
| Feedback intake | Operator mounts the delivered routes and binds KV/durable writer/assets; smoke-test real wallet signing and same-origin public JSON after deployment. No local test claims production deployment. |
| First Sunday pick | Operator captures synchronized today.json, asks the one panel ranking question and publishes its verified request/order. No entries or picks are invented for launch. |
| Pages address | Still pending launch deployment; retain hidden UI until a real manifest address and verified ABI/bindings are supplied. |
| History completeness / keeper | Existing hook/Annex scans disclose gaps and use bounded chunks. Keeper operation remains an operator task; no new keeper service is deployed here. |
| Seal delivery | Public commitments only. No private draft delivery is deployed; do not imply hashes reveal draft text. |
| Social previews | Generic OG card plus client-side share cards remain. Per-route server unfurls are not implemented. |
| Live-chain checks | Real spending, signatures and lifecycle progression are outside this job's test authority. See current validation for mocked vs read-only coverage. |

No `docs/FEEDBACK.md` existed at intake. These are concrete unresolved items from the delivered site and supplied history, not fabricated user submissions. Future user priorities come from the public Feedback board and verified pick.

## What cannot change

The deployed economics and venue/bond/hold rules stay immutable: noted MARG sells 1% + 0.1 IMD stamp, quiet sells 3%; notes 0.1 stamp + 0.25 IMD of retained MARG + 0.25–10 bond; accruals 70% thesis / 30% refunds; own child within seven days; oracle-ranked theses; venue checkpoint baseline aged 1–6 hours; exact Annex venue admission; Pages' capped 0.05 IMD × n curve, ten per wallet per subject, 80/10/10 and whitelist OR 10,000 MARG OR posted-note gate when deployed; one token, no second MARG. Nothing is advice. The full shared list is `web/shared/feedback.js` and public today.json.

Open to change: site, copy/flows, agents.md/llms.txt, keeper and new modules alongside immutable contracts. Weekly site continuations cannot add token code, mint, fee or payment paths, regress an adoption, or reallocate credit outside the reviewed credit file. Existing exact approvals, manifest verification, caveat and no purchase/price-promotion/chart-link copy rules stay intact.
