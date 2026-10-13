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

## 2026-10-13 · v5 delivery state: the social app

**Provenance correction:** the v4 delivery above became commit `2fa583d379d5e4565264a7404d181c72350fddd8`. The pinned project at this task's intake identifies CID `bafybeifxyveqjbsrvcyes4lj5k7gtpr7exomx5cnowu4nyloal74y6pkby` as the published v4 site. **This delivery is v5 source and static export, pending publication.** Its commit/CID are assigned by the contributor publisher; no value is invented. Owner's product brief, not a weekly pick: no credits file, no attestation and no adopted-ledger row.

**Two surfaces, one tree:** dist/index.html is the landing (promise, three steps, unchanged full caveat, live pot/deadline, Launch app); dist/app/index.html is the app. The app opens the feed and retains the paper/ink/rust theme with dark mode and 320/390 layouts. Top bar: wordmark, live pot, Feedback. Bottom: Feed, Record, +, Pots, Me. One compose sheet holds the call/thesis flows, defaults and tap hints. Feed cards combine hook and Annex, verified people, rate/count, verdict, why, bond, authenticated trade amount, parent and Counter/Share/Back. The profile exposes rate/count, pages, backers, theses and backing; own profile adds earnings and claims/Seal. The displayed difficulty score is removed everywhere; records rank by hit rate then settled count, with zero-settled wallets last.

**LARP bound and verified, read-only:** launch 1436 source `0ef5649c67e948c75bf432d619dbf0613648cb8d`; LARP `0x69000A4A9FA561Dd6b313741bf1F79F4aDE4adAF`, Names `0x690084D1331F7a6509EeD32e7d34ffAcB377d807`, Links `0x69005EdeC64B8586EC8d5E32f757a818b5d493C0`. Raw compiler ABIs and canonical hashes are in the shared manifest. Worker read-only verification at Ethereum block 26185508 found code and matching IDENTITY/LARP/NAMES bindings. Browser boot repeats code/link checks; Names primaryOf and LARP faceURI resolve only live primary names and passive sanitized images. Other wallets keep addresses and generated marks. No name is inferred from a citation and no identity call can request a wallet operation. Exact provenance, hashes and metadata limits: `docs/integrations/larp.md`; evidence: `web/validation/v5/identity-live.json`. There is no missing-interface fallback stub.

**Child-call correction:** hook thesis cards and note pages link the author's already-posted ordinary child as “Child call posted (No. N)”. A further child is secondary. When chain state reports children outside readable event history, the UI states that gap rather than inventing a child ID. All 22 child-call browser scenarios are now ported to app routes, including the nine outstanding from v4; parent gates, calldata, fresh preflight, grace, thesis receipt and Annex exclusion are exercised.

**Re-verified v5 function-to-home map** (hash routes are inside the app):

| Contract entry points | Reachable v5 control |
| --- | --- |
| Router `tradeAndNote`, `note`, `checkpointVenue`; ERC-20 `approve` to router | + / `#/call`, with Trade it too; `#/post` exact form; counters and `?child=` preserve their independent gates |
| Router target-zero `note` | Thesis instead / `#/thesis`, pot/deadline and seven-day rule before bond and after receipt |
| Hook `seal`; IMD `approve` to hook for exact STAMP | Own profile Seal or More → `#/seal`; timed reveal → `#/post`, original draft/author/hash preserved |
| Hook `observe`, `settle`, `settleThesis`, `retract`, `claimDeposit` | `#/note/<hook-id>` with fresh state and simulation |
| Hook `claimRefund`, `sweep`; judge `requestJudging`, `payJudged`, `abandonRequest`; treasury `drip` | Pots / `#/pools`; own profile links here for refunds/deposits |
| Annex `post`, `checkpointVenue`; exact IMD `approve` | `#/call` resolved Annex flow, including Annex counters; separate venue/baseline/bond contract |
| Annex `requestAdmission`; exact admission fee `approve` | Admission disclosure below `#/call`, including when no venue is selected |
| Annex `observe`, `settle`, `claimDeposit`, `retract` | `#/note/<annex-id>`; Annex IDs never sent to the hook |
| Pages `registerHandle`, `buy`, `sell`, `requestClaim`, `abandonClaim`, `recycle`, `burn`; exact IMD `approve` | Back on cards, profile backing panel, `#/pages/<handle>`; claim text/fee/escrow and burn output minimum retained |
| WETH `deposit` | Call sheet's Wrap ETH step; exact missing native value, no approval |
| Contract views, record/share, public seals | Feed, Record, author, note/duel, backing and Seal surfaces; no score display |
| LARP/Names/Links views | Person/avatar components after manifest/code/binding verification; no write controls |
| EIP-191 Feedback | Top-bar Feedback, landing footer or `#/feedback`; unchanged same-origin intake and message bytes |

No token code, mint, fee, payment path or deployed contract changed. Spending approvals remain only to the verified router, Annex, Pages or hook stamp, in exact amounts; WETH is its own deposit. Quotes still use client-side venue-state math. No external scripts. The receipt parser authenticates router, author and note instead of treating a cited handle as the author. Any address, approval or script finding is a critical hosting refusal; the worker review reports no unresolved finding in those categories, but does not replace independent review.

**Checks and limitations:** strict typecheck/build, complete manifest/hash/network checks, unit and browser interaction suites, screenshots at 320/390/1440 and the six-domain Better Interface review are recorded in `web/VALIDATION.md`. The pinned landing taste probe's sole copy-budget exception preserves the mandatory verbatim promise/caveat. Historic preview PNGs were pruned to stay within the 8 MiB source bundle budget; historical test code and textual evidence remain. Real spending/signatures, oracle execution, full historical availability and production hosting/Feedback mounting are not certified by these local checks.

| Pending operation | Next action |
| --- | --- |
| Publish v5 | Publish complete dist; map app.marginalia.chat root to dist/app/index.html with shared dist-root assets/manifest; keep marginalia.chat/app/ working. Record actual commit/CID afterwards. |
| Feedback on both origins | Mount existing same-origin routes to shared service/storage without changing `site:'marginalia.chat'`; production smoke test remains operator work. |
| Live wallets and lifecycle | Exercise with authorized funds separately; no worker transaction was sent. |
| Remote metadata/history | Failed LARP/image reads fall back; incomplete chain history is disclosed. No complete-history or third-party avatar availability guarantee. |
| Keeper, private seal delivery, route-specific OG | Existing limitations remain; public seal commitments only, client-side share cards, no new service. |

**Final worker read check:** the v5 runtime loader, application code/binding checks and LARP verification passed against Ethereum block 26185629. All seven exported ABI hashes verified; canonical venue constants matched. The weekly pot read was 507.645840223181205005 IMD for Unix week 2962, entries closing 1792022400. This is a dated observation, not a fixed UI value. No transaction was sent. Current browser results: v5 12/12, ported v4 11/11, v3 20/20, child calls 22/22 and Feedback 10/10; seven unit suites and the retained Feedback service tests pass. `web/VALIDATION.md` distinguishes rendered, mocked and live-read evidence.


## 2026-10-13 · v5 review revision (publication pending)

Revised the accepted v5 tree at `6265fecda7b2ee59f0da0151eb4e91015c4b8d6a` for six review finding IDs (five distinct causes). All reproduced locally before source changes; `.imd-responses.json` records each disposition. This remains the owner's product brief, with no credits file, attestation or adopted-ledger entry. This revision is source plus a rebuilt static export; no hosting or on-chain deployment is claimed.

- A child-call draft retains its thesis context and editable parent when automatic venue discovery selects the Annex. The action explains the incompatibility and blocks approval, warm-up and posting. Choosing a router venue keeps the same parent and its existing author/grace checks; deliberately clearing the parent restores a standalone Annex call.
- Router `note` now receives the selected market's PoolKey, matching validation/checkpoint and the trade path. Non-launch v4 IMD and native-ETH venues work with Trade it too off.
- Annex receipt pages render the whole argument. Feed cards retain three-line excerpts.
- Pages Trade events identify candidate wallets and earnings. Candidate `pagesOf` balances, subject and supply are read at one fixed block; sold-out wallets are excluded. A failed balance read displays an unknown count, offers retry and lists only verified holdings, including on share cards. Separate history gaps still disclose undiscovered backers and partial earnings.
- Admission's three rules are one-sentence, named tap hints beside the address and fee controls. Expanded hints wrap at the full available width.

**Function-to-home recheck:** the v5 table above remains complete. `#/call` retains router `tradeAndNote`, `note` and `checkpointVenue`, exact router allowances, WETH deposit, Annex `post`/checkpoint/allowance and admission request/fee. Thesis children now require a router venue; this prevents an unrelated Annex post and removes no valid contract action. `#/thesis` retains target-zero notes; `#/post` retains exact parameters, counters and reveals. Own-profile/More `#/seal` retains the exact hook stamp, seal and reveal handoff. Hook and Annex note pages retain observe, settle, retract and claimDeposit, plus hook settleThesis. Pots retains refunds, sweeps, judging request/pay/abandon and treasury drip. Backing panels retain Pages register/buy/sell, claim/abandon/recycle and reserved-fund burn. Feedback and read-only LARP routes are unchanged.

**Checks:** strict typecheck/build and manifest check passed; 86/86 Chromium browser scenarios (23 v5 including 11 new, 11 v4, 22 child-call, 20 v3, 10 Feedback), eight unit suites and three retained Feedback service suites passed. Dark layouts include 320/390 and desktop 1440. The pinned landing probe remains 15/16: its only exception is the required verbatim promise/caveat's 74 words against the generic 60-word bar. Local evidence, reproduced failures, final measurements and the six-domain review are in `web/VALIDATION.md` and `web/validation/v5-revision/`.

No Solidity, ABI, deployment/network binding, build configuration, dependencies, approval recipient/amount, fee, Feedback message or adopted entry changed. The corrected PoolKey is transaction calldata for the user's selected venue. Identity calls remain views, avatars passive, quotes client-side and cited handles separate from wallet authorship. No unresolved address, approval or script finding was identified by this local recheck; independent hosting review remains required. Browser/wallet/RPC fixtures do not prove funded mainnet actions, production hosting, complete history, or physical-device accessibility. The assigned browser connector returned `Transport closed`; local Playwright supplied the rendered checks. WebKit was not run because its downloaded runtime reported missing system libraries.

## 2026-10-13 · v6 delivery state: Pages discovery and focused fixes

**Provenance:** the accepted v5 tree at intake is `104db93de26a28e3c6a8e0694907585c92a690f2` (PR #8). The pinned project identifies its published CID as `bafybeib5srvgktbemzdc5qxdj4x2y2ditopsxcl3d7toqfsfzkxamz2tku`. This v6 source and static export are **pending submission/publication**; no new commit, CID or deployment is invented. This is the owner's product brief: no credits file, attestation or adopted-ledger entry.

**What changed:** bottom navigation is Feed, Pages, +, Record, Me. The weekly pot chip remains the Pots door, with four-decimal “Weekly pot ◈ … IMD” and a compact one-decimal phone label. `#/pages` searches X handles (including @ and 0x-prefixed handles) or full wallet addresses, discovers traded subjects, ranks verified current backers then supply, shows next-page cost and offers connected-wallet sell-back. Trade and HandleRegistered scans cover the whole deployment window in 2,000-block chunks. Balances, supply and quotes share a fixed block; unread ranges, missing names and failed balances stay explicit with refresh/retry.

Handle pages show the 8% escrow explanation before trade controls, the unclaimed balance/recycle clock or the claimed payee. The ordered claim flow retains the exact contract sentence, opens the X composer, extracts a tweet ID from an X/Twitter URL or numeric input, approves exactly 0.5 IMD to Pages only when needed, then requests the claim. Live fee and claim/payee state are rechecked before either signature. Pending claims refresh every 15 seconds, show the answer deadline and expose abandon after it; an answered claim shows its payee and permits deleting the tweet. Changing wallets clears the tweet field. The live fee must equal 0.5 IMD for this brief's flow; a different quote blocks it with an explanation.

Backing retains a one-page default, states what is received and its fee, and says “you can hold up to 10”. Landing/About and the under-button caveat now distinguish immutable contracts from the swarm-rebuilt site. Thesis shares contain the first sentence up to 140 characters and the status; call shares retain target and status, including Annex receipts. Share-card drawing remains unchanged. The v5 paper/ink/rust theme, feed, composer, routes, identity and Feedback remain.

**Function-to-home map:** every v5 row above remains reachable. Router `tradeAndNote`/`note`/checkpoint, exact router approvals, WETH deposit and Annex post/checkpoint/admission stay in Call; thesis target-zero notes stay in Thesis; exact Post, Seal and timed reveals remain. Hook/Annex note controls retain observe, settle, retract and deposit claims, plus hook settleThesis. The top pot chip and own-profile Pools link reach refunds, sweep, judge request/pay/abandon and treasury drip. Pages register/buy/sell, request/abandon, recycle and deferred burn remain in author/handle backing panels; `#/pages` adds another home for the existing sell operation. Feedback and all LARP calls are unchanged; identity remains view-only. No contract, token, ABI, dependency, build configuration, network binding or economics changed.

**Read-only live evidence:** at Ethereum block **26186708**, Pages code and hook/Annex bindings verified; the claim window was 90 days, answer deadline three days and oracle fee **0.5 IMD**. The new scanner covered blocks 26180753–26186708 without a gap and found two active subjects: a wallet with ten pages and one backer, and @marginalia_md with one page and one backer. This is a dated observation, not static UI data or a promise of future history availability. No transaction or X post was sent.

**Validation and hosting posture:** current build/typecheck, current retained regressions, new Pages/claim interactions, manifest/asset/ABI/network checks, six-domain Better Interface review and the byte budget are recorded in `web/VALIDATION.md`. The pinned landing probe's sole word-budget exception preserves the owner's verbatim promise and revised full caveat. No unresolved address, approval or script finding was identified locally; any such finding is critical and must refuse hosting. The worker's tests do not substitute for independent review.

Publication of both static surfaces remains an operator step. Funded wallet actions, actual oracle responses, physical devices/assistive technology, Safari and production Feedback mounting remain untested. The read-only chain observation does not certify those actions. Existing keeper, private seal-delivery and route-specific OG limitations remain. The adopted ledger remains empty and unchanged.
