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

## 2026-10-13 · v4 delivery state (the product, briefed as a promise)

**Correction, dated 2026-10-13:** MarginaliaPages v0.10 is **live**, not pending. Launch 1467, address `0xf69ccb8f46049248c59522b21a04cc193729d8fa`, Ethereum block 26180753, deployment tx `0xbf5fbffe0cc266da14f319c15662000bf04bbbd6098b716010d4c29d4be2f837`, source = this project's pinned launch-1467 tree (commit `5cf7caed0e188088eb3f55c8e5005e281cd382d9`), canonical ABI Keccak `0d5e0eb325d547d7f67a13e48230649a55d2dc987292ab711de1d1d12e098a1f` over the already-exported `abi/MarginaliaPages.json` (recomputed locally, equal). This job's read-only check at Ethereum block 26184543 through the configured `https://eth.drpc.org`: 18,010 bytes of code at the address, `hook()` = the launch hook, `annex()` = the live Annex, `intake()` = `0x1397434cd35e8a9C8aC312A61D3A285EB31dea56`, `ISSUER_BPS` 8000 / `FEE_BPS` 1000, deployment receipt status success at block 26180753 (`web/validation/v4/pages-live.json`). The runtime manifest now binds it (`web/deployment/integrations.json`); boot re-verifies code, ABI hash and the hook/Annex bindings before any Pages control is enabled. The v3.2 table row "Address pending; all UI hidden" above is superseded by this line; every Pages surface is shown.

**Published site at task intake:** v3.2 at `marginalia.site.identitymd.eth`, CID `bafybeihkcwwujsfhq7mzgwwbpivywyguzfbdpd4hws6hp7nc6w63vmligq` per the pinned handoff. **This repository delivery:** v4 source and static `dist/`; the new CID and name update are assigned at publication. No contract is deployed by this job. This is the owner's product brief, not a weekly feedback pick: no credits file, no attestation, no adopted-ledger row.

**What v4 changes.** The first screen is the promise (three sentences as the headline), the unchanged caveat directly under it, three doors (Make a call → `#/call`, Write a thesis with the week's pot and entry deadline → `#/thesis`, Your pages → the connected wallet's `#/author/<address>`), the secondary link "See who is right" → `#/scoreboard`, the line "You are your wallet…", then the record with the leaderboard ranked by hit rate first. Trade-and-post and just-the-call are one flow with a "Trade it too" toggle (default on when the wallet holds the venue's quote token); an admitted hooked launch pool resolves through the Annex without a tab and the cost line names the contract holding the bond. Conviction, venue, manual PoolKey, parent thesis, slippage and deadline sit behind "More". Every contract rule is explained inline where it bites. `#/author/<address>` is the reputation product: hit rate large, counts, score with its one-line meaning, open/settled calls, theses, backers and writer earnings from Pages `Trade` events, share card and the backing panel. Feedback moved to a footer link (`#/feedback`, `#/?tab=feedback` still works) with the intake contract unchanged.

**Where every contract function lives in v4** (the previous site's reachable writes): router `tradeAndNote`, `note`, `checkpointVenue` and IMD/X `approve` to the router → `#/call` (one flow; `#/post` keeps the exact-parameter form for seal reveals and hook counters, `#/post?counter=` and `#/call?counter=` prefill counters, `#/?child=` / `#/call?child=` prefill the own-thesis child); thesis `note` (target zero) → `#/thesis`; hook `seal` and the exact 0.1 IMD hook `approve` → `#/seal` (linked from the call flow's More and About); `observe`, `settle`, `settleThesis`, `retract`, `claimDeposit` → `#/note/<id>`; `claimRefund`, `sweep`, judge `requestJudging` / `payJudged` / `abandonRequest`, treasury `drip` → `#/pools`; Annex `post`, `checkpointVenue`, IMD `approve` to the Annex → `#/call` when the venue resolves through the Annex (and the Annex counter route); Annex `requestAdmission` and its exact fee approval → the Admission disclosure at the foot of the call flow; Annex `observe`, `settle`, `claimDeposit`, `retract` → `#/note/<annex-id>`; Pages `registerHandle`, `buy`, `sell`, `requestClaim`, `abandonClaim`, `recycle`, `burn` and the exact IMD approvals to Pages → the backing panel on `#/author/<address>` and `#/pages/<handle>`; WETH `deposit` → the call flow's Wrap step; the author record and share cards → `#/author/<address>`, `#/note/<id>`, `#/duel/<id>`; the Feedback panel → `#/feedback`; agent documents → `./agents.md`, `./llms.txt`. No function lost its home.

| Item | State / next concrete action |
| --- | --- |
| Publish v4 | Contributor publisher assigns commit/CID and updates the site name; append those facts here when known. |
| Pages live | Bound and verified; first real page trades, claims and burns remain untested with funds. |
| Retained browser suites | `tests/v3-browser.mjs` was ported to the v4 routes (18 pass, 2 scenarios marked superseded). `tests/child-call-browser.mjs` still drives the removed home composer tabs in 9 of 22 scenarios; 13 pass. Porting those 9 to `#/call` / `#/thesis` is the next test task; the behaviors they cover (parent gates, calldata, grace) pass in the retained unit suite and in the 13 route-based scenarios. |
| Feedback intake | Unchanged route, message shape and Worker; still to be mounted by the operator. |
| Keeper / history / seal delivery / social previews / live-chain checks | As in v3.2. |

The immutable list is unchanged. No token code, mint, fee or payment path was added. Approvals remain exact and only to the router, the Annex, Pages and the hook (0.1 IMD stamp), plus WETH's own deposit.
