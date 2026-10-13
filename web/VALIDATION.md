# Marginalia v4: the product, briefed as a promise

Checked on 2026-10-13 UTC on this worker. Local observations, not independent certification. No funded transaction, oracle request, contract deployment, Worker publication or IPFS/DNS update was performed.

## Delivered behavior

First screen: the three-sentence promise as the headline, the unchanged caveat directly under it (not dismissible), three doors with one primary button and one plain line each (Make a call → `#/call`; Write a thesis with the week's pot and entry deadline → `#/thesis`; Your pages → the connected wallet's profile, or a connect button), "See who is right" → `#/scoreboard`, the wallet line, then the record (leaderboard by hit rate first, then by score; recent verdicts; prize; duels; feed). Feedback is a footer link (`#/feedback`; `#/?tab=feedback` still works) opening the unchanged panel; the intake route and message shape are untouched.

One call flow (`web/src/trade.tsx`): token from `?token=` or the last token, +25%, 7 days, bond 0.25 IMD, "Trade it too" on when the wallet holds the venue's quote token (balance read on chain), off otherwise or when the venue takes native ETH or resolves through the Annex. Visible: token, five presets, horizon, why, one cost line in IMD and dollars naming the contract that holds the bond, one button. Behind More: conviction slider, venue, manual PoolKey, parent thesis, slippage (0.1–5%), deadline (10/20 min), the seal link, the dollar source. Toggle off sends router `note(params, poolKey, imdIn, minMargOut, deadline)` with only the exact IMD approval to the router; toggle on keeps `tradeAndNote` with the summed exact approval; the Annex path keeps its own exact approval and 3% baseline bound; WETH wrapping is unchanged. Discovery tries the router's canonical venues first and falls back to Annex-admitted hooked pools only when the router finds none. Inline rules: the bond line, the hold rule for upward calls only, the baseline warm-up sentence with countdown and "Baseline ready.", the warm-up button label, the 7-day child rule before the thesis bond and on the receipt with the "Post the child call" button.

Profile (`web/src/pages/Author.tsx`, `web/src/backers.ts`): wallet, hit rate large, five counts, score with its one-line meaning, judged wins, share card, open calls with settlement countdowns, settled calls with verdicts, theses, duels, backers (holders with net positive pages from Pages `Trade` events since block 26180753, writer earnings = fee × ISSUER_BPS / 10000, trade count, disclosed gaps) and the backing panel with the required backing copy; the sealed list is "Sealed calls, revealed later". Pages is bound live in the manifest and verified at boot (code, ABI hash, `hook()`, `annex()`).

## Checks and evidence

| Check | Result |
| --- | --- |
| Live Pages verification | Read-only at Ethereum block 26184543 via the configured `https://eth.drpc.org`: 18,010 bytes of code, `hook()`/`annex()`/`intake()` as expected, ISSUER_BPS 8000, FEE_BPS 1000, deployment tx succeeded at block 26180753. `validation/v4/pages-live.json`. Exported ABI Keccak recomputed = `0d5e0eb3…e098a1f` |
| `npm run typecheck` / `npm run build` | Passed, strict TypeScript; relative base; main JS 732 kB / 213 kB gzip (retained >500 kB advisory) |
| `npm run manifest` / `npm run check` | Passed: 4 bound contracts (Marginalia, MarginaliaHook, MarginaliaAnnex, MarginaliaPages), 18 assets with SHA-256, canonical ABI Keccaks, exact network/walletAddChain copies, agent-doc equality, no remote resources |
| `tests/v4-browser.mjs` (new) | **11/11 in Chromium** against the production export with mocked wallet/RPC: first screen order and contents, door routing, defaults and disclosure, toggle off → exact 0.6 IMD router approval + `note`, toggle on → 1.6 IMD + `tradeAndNote`, auto-off without IMD and `?token=` precedence, baseline warm-up/ready/button, thesis rule before bond and on receipt, profile contents and backers, own profile earnings, footer Feedback and old tab link, 320/390 dark reflow and focus. `validation/v4/results.json`, screenshots |
| `tests/v3-browser.mjs` (ported to v4 routes) | **18 pass, 2 marked superseded** (the removed "Launched tokens" tab scenarios; Annex calldata and admission logic remain unit-tested and the Annex counter route is retained). `validation/v4/v3-regressions-ported.log` |
| `tests/child-call-browser.mjs` (retained, unported) | **13/22 pass**; the 9 failures drive the removed home composer tabs ("Trade and post", "Write a thesis" tab clicks). The gates, calldata and grace behaviors they cover pass in `child-call-unit` and the 13 route-based scenarios. Porting is listed in STATUS. `validation/v4/child-call-browser.log` |
| Retained unit suites | v2 (5 groups), revision (9), history (7), v3 arithmetic/ABI/calldata, child-call gates, feedback ledger, feedback noted, feedback worker: all passed unchanged |
| `tests/feedback-browser.mjs` / `feedback-runtime.mjs` | Not rerun this job (Miniflare/workerd and the Worker fixture unchanged; the panel component, route and message shape are untouched; the v4 suite opens the panel from the footer and the old tab link) |
| Pinned taste probe | **14/16** at 320/390/1440 on the final export: render, layout, targets, contrast, casing, tracking, eyebrows, type sizes/faces, glyphs, slogans, chrome, motion, share pass. Fails: repetition (the caveat twice, required by the brief) and copy-budget (135 prose words at 390 against the 60 bar: the 64-word caveat, three required one-line door explanations, the secondary link line and the required wallet line). `validation/v4/taste-checks.json`; 390 screenshot inspected: promise, caveat and all three door buttons are within the first screen |
| Assigned browser tool | Not used; Playwright screenshots stand in (`validation/v4/*.png`) |

## Better Interface review (six domains)

Accessibility: native links/buttons/inputs/details, one `h1` per route, labelled toggle and selects, `aria-pressed` presets, status/alert roles, disabled pending fieldsets, visible 2px focus (dark 320 screenshot). No screen-reader or device session. Layout: 390 first screen holds the promise, caveat and three door buttons (`metrics.json`); no overflow at 320/390/1440 on every route; doors stack at ≤420px. Writing: product voice, imperative, no exclamation marks (asserted on the first screen), "buy" only inside the Pages panel controls, backing copy verbatim, caveat unchanged, rules at the moment they bite. Typography: the five existing sizes and three weights; the promise headline is the heaviest type; no new fonts. Colors: existing tokens; probe contrast pass in light; dark inspected in screenshots. UI: one primary action per door and per flow, native disclosure for More, loading/empty/error/retry states for backers and the prize.

Findings fixed during the build: `#/feedback` was shadowed by the `/feed` prefix route (caught by the v4 suite; order fixed in `App.tsx`); Annex admission would have lost its home when no token resolved through the Annex (rendered under the call flow whenever the Annex is configured); the Pages fixture address in the retained suite now comes from the manifest.

## Limitations

No real wallet signature or funded transaction; no live Pages trade, claim, burn or Annex admission; the automatic Annex venue fallback is exercised by code review and the v3-unit calldata checks, not by a browser scenario with a hooked pool fixture; the child-call browser suite is partly unported (above); WebKit was not run; USD, keeper and history limitations are as in v3.2. The hosted CID is assigned at publication.

---

# Marginalia v3.2: Feedback and weekly-loop validation

Checked on 2026-10-13 UTC. Complete for the stated implementation scope, with the deployment and manual/live limitations below. These are local worker observations, not independent certification. No funded transaction, oracle request, contract deployment, Worker publication or DNS/IPFS update was performed.

## Delivered behavior and important decisions

The fifth composer tab follows Launched tokens. The immutable/open lists precede a Site / Mechanics / Idea form with a 600 UTF-8-byte counter, optional unverified X handle, explicit signing wallet, exact compact JSON preview and signature-only action. The browser uses only `personal_sign`, verifies the recovered wallet locally, rechecks the selected account/week, and POSTs the exact message/signature/address. It neither switches chain for feedback nor requests a transaction, approval or token movement. Pending disables fields; rejection, service errors and rate limits preserve the draft. Identical retries reuse the signature while mounted. Unsent text survives composer/boot remounts in page memory, not local storage.

`web/worker/feedback.js` supplies the same-origin API, local viem recovery, deterministic abi.encode ID, KV storage, rolling-hour and Unix-week limits, exact today.json, picks and adopted ledger. A per-wallet Durable Object is additionally required to close KV's distributed read/write race; a KV-only mount refuses POST with 503. A transactional outbox plus alarms preserves accepted submissions through KV failures. `noted.js` uses manifest-specified assets/RPCs and on-chain posted counters whose increment accompanies NotePosted in both pinned contracts. Positive-only badge caching does not infer identity from handles or fabricate a negative history result on RPC failure.

The weekly loop, fixed continuation header, credits/actual-diff review, no-token/no-regression rejection gates and six delivered-job history are in docs. No bootstrap attestation, feedback entries or credits were invented. Sunday selection uses the specified current Unix week; the Thursday week boundary and post-pick cutoff are explicitly documented. The thesis success notice now follows the confirmed event's target, omitting the venue notice for theses and retaining it for priced calls.

## Checks and evidence

| Check | Result |
| --- | --- |
| Dependency install | Passed with the unchanged web lockfile in `/tmp/marginalia-feedback/web`; no repository dependency/cache/config/lockfile edits |
| `npm run typecheck` / `npm run build` | Passed, strict TypeScript and production Vite export; relative base; main JS 723.54 kB / 210.69 kB gzip. Existing >500 kB chunk advisory remains; no build-config change |
| `npm run manifest` / `npm run check` | Passed: 3 bound contracts, 18 listed assets, complete SHA-256 inventory, canonical ABI Keccaks, exact handoff/network/wallet parameters and agent-doc copies. Loop/STATUS/CHANGELOG exported under `dist/docs/` |
| `node tests/feedback-worker.mjs` | **18/18 groups**: offline EIP-191, ID encoding, altered data/signer, canonical payload, Unicode/600-byte boundary, persisted evidence, JSON-escaping/KV-metadata overflow, concurrent requests, hourly/weekly boundaries, duplicate/rewrite policy, KV failure/outbox/alarm, list pagination, exact today shape, pick/adoption, CORS/body/method errors and badge cache. `validation/v3.2/worker-results.txt` |
| `node tests/feedback-noted.mjs` | Passed: hook OR Annex posted record, fixed block, manifest RPC only, chain/code/ABI SHA and Keccak/Annex hook-binding gates, positive cache and fail-closed absence. RPC responses are fixtures, not live author claims |
| `node tests/feedback-ledger.mjs` | Passed: request/week/author, complete ranked dispositions, shares, synthesis, duplicate adoption, full commit format, immutable old prefix. Semantic correspondence to a future diff remains a mandatory reviewer gate |
| `node tests/feedback-runtime.mjs` | Passed in actual local **workerd**, Miniflare 4, with real KV metadata and Durable Object transaction/alarm APIs: recovered signature, accepted/idempotent posts, concurrent hourly rejection, stored counters, exact document and empty ledger. No Cloudflare account/login/deployment needed |
| `tests/feedback-browser.mjs` | **10/10 scenarios each in Chromium and WebKit** against the production export and actual Worker logic with test storage. Fresh ephemeral EOA signatures are real local cryptography; wallet/RPC interactions are mocked. `feedback-chromium.json`, `feedback-webkit.json` |
| Retained `tests/child-call-browser.mjs` | **22/22 each in Chromium and WebKit**. Includes new assertions for thesis notice suppression, priced-call notice retention and feedback draft preservation; existing own-child eligibility/calldata/grace/counter/receipt behavior stays intact. `child-chromium.json`, `child-webkit.json` |
| Retained `tests/v3-browser.mjs` | **20/20 Chromium scenarios**: trade/approval, summed IMD, unknown-chain recovery, pending/rejection, checkpoints, call/thesis/seal, Annex, hidden/conditional Pages, lifecycle, judging/treasury and mobile/dark states. `v3-regressions.json` |
| Retained unit suites | v2 (5 groups), revision (9), history (7), v3 arithmetic/ABI/calldata and child-call gates all passed |
| Read-only live `tests/v3-live.ts` | Passed at Ethereum block **26181241** through configured `https://eth.drpc.org`: chain/code, hook-derived companions, pool/venue/seal encoding, ABI hashes, Annex binding/admission and both local launch-pool quote outputs equal to the configured quoter. `live-read.json`; no transaction sent |
| Pinned taste probe | Final production export measured at 320/390/1440 and reduced motion. Render, layout, targets, contrast, type, metadata and motion pass. **14/16**, with two retained-copy exceptions below; `taste-checks.json` |
| Assigned browser tool | Opened production `/preview/`, selected Feedback, edited text, traversed textarea → handle by keyboard and inspected the actual screenshot at 390. Width 390 / scrollWidth 390. This browser received public-RPC 400/403 responses; Feedback still worked in the boot/failure view. On this plain-file preview, API 404s produce the explicit service-unavailable/retry state, not a fabricated empty board |

The feedback browser scenarios cover rule ordering/fifth tab, real exact-message signing and posting, byte/handle validation, disconnected/missing wallet, wrong-chain signature-only success, rejection/retry, pending/account changes, service/board retry and signature reuse, hourly errors, picked/badge/adopted rendering, full hashes and 600-character strings, light/dark, keyboard focus and 320/390/768/1440 widths. Every unexpected transaction/switch/approval method is rejected by the fixture. External RPC requests are intercepted; no test broadcasts a transaction.

The browser runners serve a gateway-like `/preview/` subpath while the API stays same-origin at `/api/feedback`. Tooling and dependencies remain in `/tmp` (Playwright also supplied under `/opt`). WebKit uses temporary system libraries with an explicit Mesa EGL vendor file; Playwright's ldconfig-only host precheck was bypassed because those libraries are provided through LD_LIBRARY_PATH, then the real engine/interaction tests ran successfully. The initial latest-Miniflare harness API/date/path mismatches were repaired by using Miniflare 4, a supported compatibility date and an explicit modulesRoot; the final workerd test passes from `web/`.

## Better Interface: six-domain review

Visual idea: retain the paper-and-ink receipt ledger, adding a public product-feedback margin within the existing composer. The immutable rules stay expanded as requested; the default home trade action remains on the first phone screen. No new font, color scheme, hero, token control or decorative animation was added.

| Domain | Coverage, evidence and limits |
| --- | --- |
| Accessibility | Native pressed buttons, labels/select/textarea/input/details, text-associated validation/focus, disabled pending fieldset, status/error announcements and visible focus checked. Keyboard form sequence and both engine roles/states exercised. Physical-device and screen-reader sessions were not performed |
| Layout | Default home primary action within 390×844; feedback rules/form/board, long unbroken input/JSON/addresses/IDs at 320/390/768/1440 in both themes and engines without document overflow. Representative screenshots retained; no browser-native 200% zoom or full RTL localization claim |
| Writing | Short action/error/empty/retry copy, exact requested signature disclaimer and ranking-zero warning, full immutable/open list, author-vs-handle and badge-read limitations. No new purchase/price promotion or chart links. Existing caveat and contract-flow copy preserved |
| Typography | Existing five roles / three weights, system serif prose and mono data. Inputs remain 1rem; exact JSON pre-wraps; full addresses/IDs remain reachable and selectable. No remote fonts |
| Colors | Reused semantic light/dark/focus/error tokens. Probe measured sampled home solid-background text at required 4.5:1 (3:1 large). Rendered Feedback measurements also pass: text/field 17.05:1 light and 13.82:1 dark; secondary/field 7.65:1 and 7.47:1; white/primary 5.27:1 in both. See `feedback-contrast.json`; viewed light/dark form and focus screenshots. Not a claim of full accessibility certification |
| UI | Loading, empty, pending, success, error, rejected signature, unavailable intake, retry and account-change states exercised; flat rules and rows, one filled form action, native disclosure, no new motion/modal/icon library |

## Findings and fixes

| Severity / source | Finding, change and evidence |
| --- | --- |
| High · `web/worker/feedback.js:124` | KV alone cannot serialize cross-location counters. Added the durable per-wallet reservation and outbox, required binding/fail-closed response, concurrent unit + workerd tests. The deployment README makes the extra binding explicit |
| High · `web/worker/feedback.js:165` | A transient KV failure must not erase an accepted post or consume a second credit on retry. Persisted the original signed outbox, idempotent re-publication and recurring alarm. Failure/retry/alarm tests pass |
| Medium · `web/src/App.tsx:88`, `web/src/feedback.tsx:26` | A signature-only form should not disappear during an Ethereum outage. Feedback is available in boot/failure state without contract context; both-browser outage fixtures post successfully |
| Medium · `web/src/feedback.tsx:8` | Switching composer tabs/finishing chain boot could drop unsent text. Kept draft fields in page memory, never browser storage; loaded-home tab regression passes in both browsers |
| Medium · `web/worker/feedback.js:130` | A valid 600-byte text containing many quotes can exceed KV’s 1 KiB JSON metadata limit. Store the full value and omit oversized metadata, with a read fallback. A 600-quote round trip passes both the unit fixture and actual workerd |
| Medium · `web/src/feedback.tsx:72` | A wallet change while awaiting signature could misattribute submission. Recheck accounts before signing and before POST, recover signer locally; delayed-signature/account-change browser test prevents POST |
| Medium · `web/src/pages/Post.tsx:177`, `web/src/pages/Post.tsx:326` | Thesis confirmation incorrectly mentioned an on-chain venue. Store priced-ness from confirmed NotePosted and condition the sentence; both thesis and priced-call assertions pass, child follow-up preserved |
| Medium · `web/src/styles.css:348` | Adding a fifth tab could create a third row and push the trade action below the fold. Used two grid rows (3 then 2) with wrapping labels; first-screen and narrow-width regression/probe pass |
| Preserved copy exceptions · `web/src/ui.tsx` / `web/src/pages/Home.tsx` | The probe flags the pre-existing repeated swarm caveat and 64 mobile prose words against its 60-word bar. The task explicitly retains the caveat and other copy; both remain unchanged. These are documented scope exceptions, not hidden passing measurements |

## Reproduce / deployment boundaries

See `web/README.md` for build and new test commands, and `web/worker/README.md` for the production mount. All shared fields, service code, operator tools, tests, docs, the unchanged package manifest/lock and final static assets are delivered. FEEDBACK KV, FEEDBACK_WRITES durable migration and ASSETS must be configured by the site's operator; no namespace ID, signer, attestation ID, Pages address or new CID was invented. The weekly oracle operation and manual ledger append were documented, not performed.

No real injected-wallet signature, production Cloudflare propagation/load test, long-running alarm outage, funded on-chain transaction, oracle request, screen-reader session, physical iPhone, native browser zoom or independent publication check was performed. EIP-1271 contract-wallet feedback signatures are not part of this local-recovery route. RPC failure hides unconfirmed badges and is disclosed; a missing badge is not a verified negative. Public board propagation may lag a returned post receipt. The operator must review future credits against actual behavior; schema validation alone cannot certify credit entitlement or absence of semantic regressions.

`DESIGN.md` describes the implemented source. `validation/v3.2/submission.json` records final integrity and byte-budget checks. A redundant older v2 dark-home screenshot was removed to leave space for current evidence; all source, ABIs, runtime assets, share cards and necessary dependencies/lockfiles remain intact. No ignore file, protected configuration/dependency path, Git internals or GitHub path was edited. No local commit is made because the assignment forbids `.git/` writes; the prepared tree is collected by the contributor submission mechanism. Historical reports below describe their own releases and checks, not additional checks performed by v3.2.

---

# Marginalia v3.1: child-call worker validation

Checked on 2026-10-13 UTC. Complete for the stated frontend scope. These are local worker results, not independent certification or an on-chain audit. No real wallet signature, funded transaction, contract deployment or publication occurred.

## Scope and choices

The existing React 19 / Vite / TypeScript / viem site remains intact. Changes are limited to the author's child call: thesis-page navigation, a validated parent input in both hook composers, receipt follow-up and feed status. Source, the unchanged dependency manifest/lockfile, and the rebuilt static export are present together. No contract, deployment handoff, network setting, caveat, dependency, build configuration, ignore file, Git internals or GitHub path was edited. No dependency directory or registry archive is delivered.

The child route is `#/?child=<id>`; its “Just the call” tab and `#/post?child=<id>` use the retained call form. Only the parent is carried over: token/text start empty and the composer's ordinary defaults remain. Parent validation reads the hook directly, independently of event-history coverage. It checks existence, `ThesisOpen`, author equality and the inclusive seven-day grace boundary. `horizonEnd(id)` gives a thesis's posting timestamp because its horizon is zero. The helper uses the same block for both reads and the hook's live `THESIS_GRACE` limit. It repeats these checks before approval and posting and caps both posting deadlines at grace end.

Counters retain their own rules. Saved seal reveals retain their original parameters and path. Annex calls cannot increment a hook thesis's children and do not expose this field. The feed's reminder applies to an open thesis with `children == 0`; a closed/forfeited thesis cannot receive a child and has no reminder. Its child count remains the on-chain count, not a count inferred from loaded events.

## Checks and evidence

| Check | Result |
| --- | --- |
| Dependency installation in `/tmp/marginalia-child/build/web` using the unchanged lockfile | Passed; source/config copied into the isolated build directory, no repository dependency writes |
| `npm run typecheck` | Passed, strict TypeScript |
| `npm run build` | Passed; relative `./` base, locally bundled assets, hash routes; main JS 710.58 kB / 206.61 kB gzip; existing >500 kB chunk advisory retained |
| `npm run manifest` and `npm run check` | Passed; 3 bound contracts, 15 asset SHA-256 hashes, canonical ABI hashes, exact handoff/network/wallet parameters, relative assets, agent-doc equality |
| Handoff preservation | `web/deployment/mainnet.json` and `web/deployment/network.json` equal the supplied inputs; manifest includes the same previously authorized Annex |
| `tests/child-call-unit.ts` | Passed: malformed/zero/existing IDs; all non-ThesisOpen statuses; ownership/case; one second before, exactly at and one second after grace; chain-clock protection; fixed-block reads and fresh preflight rejection |
| `tests/child-call-browser.mjs` on production files | **21/21 scenarios in Chromium; 21/21 in WebKit**, then the affected CTA/composer scenario passed again in both after the final CSS-only fixes; mocked wallet/RPC and all external requests blocked; engine and final-style results in `validation/v3.1/` |
| Existing `tests/v3-browser.mjs` regression suite | **21/21** in Chromium: approval accounting, pending/rejection, checkpoints, trade minima, call/thesis/seal routes, Annex, Pages gates, lifecycle, mobile layouts; no external request or browser script error |
| Existing unit suites | All passed: v2 (5 groups), revision (9), history (7), v3 arithmetic/ABI/calldata group |
| `tests/v3-live.ts` read-only run | Passed at block **26180413**: Ethereum chain/code, hook-derived companions, pool/venue bindings, ABI subsets/hashes, seal encodings, Annex hook binding, and both local quote directions matching the configured quoter; `validation/v3.1/live-read.txt` |
| Additional `tests/child-call-live.ts` attempt | Did not complete: worker RPC returned empty JSON responses; a later live browser refresh received **HTTP 429 Too Many Requests**; no additional live-parent result is claimed |
| Pinned `taste.mjs --out test/scratch/taste` | **13/16** on the final export with mocked RPC at 320/390/1440, plus reduced motion (the earlier live run also scored 14/16); passed render/layout/targets/contrast/type/metadata checks; two preserved-copy exceptions and one confirmed data-row false positive below |
| Assigned browser tool | Inspected live export under `/preview/` at 390 and 320; first-screen action bottom measured **768.30px** at 390×844, no sideways overflow; later refresh encountered the RPC failures above |

The browser suite tests both the manual parent and the thesis link, unknown and malformed IDs, the three gates in both forms, another token/either side, chain-independent feed coverage, account changes, grace expiry via a controlled clock, fresh preflight rejection, normal exact approvals including summed IMD, positive minima and capped deadlines, receipt-block-derived due dates, home/standalone thesis handoffs, feed refresh, retained counter behavior, Annex exclusion, disconnected/wrong-chain recovery, and keyboard/dark/mobile states. Mock receipts confirm that `parentId` reaches `note` and `tradeAndNote`. No timer test waits out the real seven-day grace or one-hour checkpoint.

Tests serve the actual export under `/preview/`; fixtures stay in tests and never enter production. WebKit 27.2 needed temporary system libraries and an explicit Mesa EGL vendor setting; tooling lives outside the repository. The assigned-browser preview and initial taste probes redirected only configured public RPC requests to the worker-supplied transport; production configuration was unchanged. After the worker RPC failures, the final probe used the browser suite’s RPC fixture with outside traffic blocked. The probe script itself was unchanged. Public source labels remain `https://ethereum-rpc.publicnode.com` and `https://eth.drpc.org`.

## Better Interface review

Visual idea: the existing paper ledger becomes an actionable receipt, with the author's next required call placed directly under the thesis heading. No new visual system was introduced. All six pinned domains were applied while building and reviewed after the final source changes.

| Domain | Coverage and evidence |
| --- | --- |
| Accessibility | Checked native link/button/input/details semantics, input label, `aria-describedby`, `aria-invalid`, polite status, keyboard focus and disabled/pending paths. Viewed `child-focus-dark-320.png`; focus uses the existing 2px ring. Screen-reader and native-device sessions were not performed. |
| Layout | Checked home, thesis note, both composers and feed at 320/390/1440 in both browsers. No document overflow. Viewed the final `home-mock-final-390.png`, `thesis-note-390.png`, `child-trade-390.png` and dark error/focus evidence. Optional parent stays below the primary action; context wraps above fields. Native zoom and RTL were not tested. |
| Writing | Checked the brief's exact CTA/context/receipt/feed phrases and short field-specific errors. Counter instructions remain separate. The duplicate disclosure/input label was corrected. Original caveat and economic copy remain verbatim. |
| Typography | Reused existing five text roles, three weight roles, serif prose and monospace data; no new font or type size. Checked long IDs and errors in narrow views; field values remain fully selectable. Probe passes type sizes/families/tracking/casing. |
| Colors | Reused light/dark semantic tokens. Final probe measured all sampled solid-background text at >=4.5:1 (>=3:1 large). Viewed child focus and error states in dark mode; no new colors. This is sampled measurement, not a full accessibility certification. |
| UI | Checked native disclosure, parent loading/error/retry, wallet/chain changes, disabled eligibility and successful follow-up. Existing transaction pending/rejection regressions pass. No new animation, modal, icon, shadow or elevation. Reduced-motion probe passes. |

## Findings, fixes and retained exceptions

| Finding | Evidence, correction and recheck |
| --- | --- |
| High: own-child path missing / counter rules incompatible | `src/pages/Note.tsx:71`, `src/pages/Post.tsx:75`, `src/trade.tsx:63`: added owner-gated CTA, separate child context and shared live validator; both calldata paths and all three gates pass in Chromium/WebKit. |
| Medium: nonexistent parent could appear as generic read failure | `src/abi.ts:5`, `src/thesis-parent.ts:39`: initial browser test reproduced the missing `UnknownNote` decoder; added the exact error entry from the pinned full ABI, now giving a one-sentence existence error. Full exported ABI and hashes did not change. Both browsers pass the regression. |
| Medium: expiry or closure after an earlier read | `src/thesis-parent.ts:48`, `src/pages/Post.tsx:142`, `src/trade.tsx:105`: fresh preflight and grace-capped deadlines; controlled expiry and closure-before-signing tests pass. |
| Low: repeated parent label in an open disclosure | `src/trade.tsx:151`, `src/child-call.tsx:32`: summary now says “Parent thesis (optional)”; input retains the requested full label. Rechecked in both browsers. |
| Medium: primary anchor had no filled style | `src/styles.css:80`: screenshot review found that only buttons received the primary fill; included `.button.primary` and its hover state in the existing token rule. A new rendered-color assertion and final screenshots pass in Chromium/WebKit. |
| Medium: child context pushed the WebKit action past the fold | `src/styles.css:286`: the added context now uses `--space-1` bottom spacing and a 1.4 line height. Final child-action bottoms: **802.89px Chromium**, **842.30px WebKit**, within the 390×844 first screen; asserted by both browser runs. |
| Probe false positive: eyebrow detection | `src/pages/Home.tsx:85`: the final populated fixture places a posting-wallet address in the Recent verdicts row near the following feed heading. Screenshot inspection confirms it is receipt data inside a linked verdict, not a kicker above a heading; the retained verdict row is unchanged. |
| Preserved exception: repetition and mobile prose budget | Final taste report flags the same caveat twice and 64 first-screen prose words against the 60-word probe bar (70 words in the live run). The brief says “same … caveat, copy rules” and “keep everything else exactly as is”; the pre-existing required caveat stays above the home fold and in the footer. No scope-wide copy redesign was made. |

## Limitations and delivery

No funded posting, actual wallet signing, physical iPhone, screen-reader session, native 200% zoom, RTL localization, live seven-day lifecycle or hosted/IPFS publication was tested. Mocked success paths are not claims that a live transaction was sent. The optional additional live-parent probe failed on worker RPC responses; the earlier live deployment/binding checks succeeded. Public-history gaps remain disclosed by the existing site. Real parent eligibility is re-read and the contract remains authoritative when a transaction is mined.

`DESIGN.md` describes the final source. The runtime manifest was regenerated after the final build. Obsolete hashed JS files were removed from `dist/`; source, runtime ABIs, static assets and the existing lockfile remain complete. Generated browser/cache/dependency directories are excluded by location, without changing an ignore file. A redundant earlier live-home screenshot was omitted to keep the full tree below 8 MiB even before compression; the final home, thesis CTA, child composer and dark error/focus screenshots remain, along with all source and runtime assets. `validation/v3.1/submission.json` records final file/hash/budget checks. No `.git` write or local commit was made because the assignment expressly forbids touching `.git/`; files are prepared for the contributor submission mechanism.

---

# Marginalia v3 — worker validation

Validated locally on 2026-10-13 UTC. These are worker observations, not independent certification, a contract audit or hosting approval. No real signature or transaction was requested or broadcast.

## Delivered scope

Continued the existing stack, ledger appearance, history cache, scoreboard, receipts, duels, guided post, seals, canvas sharing and agent documents. Added the trade-first composer and four modes, client-state quotes, exact combined approvals, ETH wrapping, informational IMD/USDC dollars, live Annex integration and lifecycle/admission controls, deployment-gated Pages v0.10, judging/treasury controls and operator launch copy.

The supplied deployment and network remain authoritative. The only additional runtime deployment is the Annex address explicitly supplied in this task. Pages is not deployed or represented by a placeholder. The source snapshots and ABI hashes are documented in `contracts/README.md`.

No existing contract, dependency, package manifest/lockfile, Vite/TypeScript/Foundry configuration, ignore file, Git internals or GitHub workflow was edited. Dependencies and browser tooling were installed only in `/tmp`. The unchanged package lock accompanies the source; generated application assets are in repository-root `dist/`.

## Checks

| Check | Outcome |
| --- | --- |
| `npm ci` with the unchanged lockfile in `/tmp/marginalia-v3/build/web` | Passed; no dependency or cache directory delivered |
| `npm run typecheck` | Passed, strict TypeScript |
| `npm run build` | Passed, production Vite export with relative base; main JS approximately 705 kB / 205 kB gzip; retained Vite advisory for a chunk above 500 kB |
| `npm run manifest` / `npm run check` | Passed: original handoff plus explicit Annex, 3 bound contracts, 15 SHA-256 assets, exact network/wallet parameters, canonical ABI hashes, agent-doc equality and static asset checks |
| Exact source builds | Both supplied Annex/Pages trees compiled in `/tmp` with their existing Foundry configuration; raw ABI arrays extracted from outputs |
| `tests/v2-unit.ts` | 5 retained groups passed: receipt parsing/attribution, duels, rates, bigint ranking and weighted wins |
| `tests/revision-unit.ts` | 9 retained scenarios passed: amounts, targets, refund math, errors, history persistence/gaps and reorg handling |
| `tests/history-unit.ts` | 7 retained scenarios passed: deployment backfill, returning gaps, bounded cursors, refused ranges, migration and reorgs |
| `tests/v3-unit.ts` | Passed: separate/overlapping exact approvals, asymmetric 3% bounds, v2 reserve arithmetic, TickMath endpoints/monotonicity, pinned ABI equality/hashes, encoded router/Annex arguments and Pages interface |
| `tests/v3-browser.mjs` | 20 production Chromium scenarios passed; final case list and results in `validation/v3/browser-results.json` |
| `tests/v3-live.ts` against configured `https://eth.drpc.org` | Passed at block 26179943: chain/code/bindings, venue/seal encoding, ABI hashes, Annex hook binding and exact venue predicate; both client quote directions matched the configured v4 quoter at the same block |
| Pinned `taste.mjs` against root `dist/` | Final machine results in `validation/v3/taste-checks.json`; required-copy exceptions below |
| Launch text validation | All 9 messages within 280 characters; each has the swarm caveat and “Nothing pays for being right”; no prohibited purchase/price/returns language or chart links |
| Path and byte inspection | Final file/export accounting in `validation/v3/submission.json`; protected paths and dependencies unchanged |

The browser runner owns its static server at a `/preview/` subpath, injects a mock wallet, intercepts all configured RPC calls and blocks other network requests. Synthetic addresses exist only in tests. It checks absence/wrong-chain states, the exact add-chain object, approval destinations/amounts, simulation before signing, confirmation/rejection/pending behavior, UTF-8 limits, one-hour checkpoint timing using a controlled clock, saved drafts, upward/downward trades, WETH wrapping, USD failure, Annex posting/admission/observation, Pages registration/trades/claims/burn, judging/drip, keyboard focus, dark mode and responsive layouts. Mock transactions prove the client builds and gates calls; they do not prove live inclusion or execution.

The live check used eth_call for quoter comparison, never a transaction. For 0.01 IMD input the local and quoter outputs were both `558366433404114398988` raw MARG; for 0.01 MARG both were `169404867137` raw IMD, at block 26179943. This checks the live launch pool in both directions, including its quiet sell fee. It does not establish every other token/pool/hook behavior. Live hook noteCount was 0 and the checkpoint window was uninitialized.

## Better Interface coverage

Read the pinned workflow, core principles of all six domains, relevant supporting sections and document-web-design; also used the pinned design-critic and Ethereum frontend UX references. `DESIGN.md` documents the final implementation rather than a proposed system.

| Domain | Review and evidence |
| --- | --- |
| Accessibility | Native labeled controls, pressed-state choices, keyboard skip/focus, error/status announcements, pending disabled states and non-announcing timers. Chromium keyboard/dark/reduced-motion interaction and probe target checks. Physical devices, screen readers and forced-color rendering unperformed. |
| Layout | Inspected the 390px first screen: wallet, full caveat, swap state and main control are visible. Checked 320/390/1440 home widths and oversized amounts; final browser suite checks primary routes and secondary tabs at 320/390. Responsive metadata and wrapped hashes/values. |
| Writing | Requested short headline and tagline; permanent caveat; costs next to actions; explicit no-data/history/price failures; wallet authors distinguished from citations; USD never described as a settlement oracle; private seal text access not claimed. Operator copy stays within the requested limits. |
| Typography | Five final text-size roles, 400/600/700 weights, local serif/mono families, h1 heaviest. Removed tracked capitals and harmonized retained small-size variants. Long amounts wrap. Probe records computed sizes/families/weights. |
| Colors | Semantic light/dark paper, ink, field, link, focus and verdict tokens. Probe measured all visible home text against resolved backgrounds and passed its 4.5:1 / 3:1 large-text bars. Dark focused layout inspected; no claim that every conceivable state was contrast-measured. |
| UI | One primary action follows current prerequisites. Exact approval -> confirmation -> refreshed allowance -> trade. Pending action labels remain stable. Checkpoint, wrap, simulation errors, rejection, source failure and recovery are explicit. Native details hold secondary settings; no animation or modal system added. |

## Findings and repairs

| Severity | Source | Finding, repair and evidence |
| --- | --- | --- |
| High | `src/market.ts:191`, `src/trade.tsx:75` | IMD can fund both the X leg and note leg. A separate smaller approval would leave the atomic transaction underfunded. Combined exact approval now covers both pulls; decoded browser request is 1.6 IMD for 1 IMD trade + 0.6 IMD note cost. |
| High | `src/trade.tsx:30`, `src/trade.tsx:89` | Polling could change the action label while an approval receipt was pending. Snapshot the pending action/approval, lock inputs, and await confirmed refresh. Delayed-receipt regression now passes. |
| High | `src/annex.tsx:52`, `src/pages/Pages.tsx:50` | Failed live state must not leave stale eligibility active, and Pages actions must not race a pending approval. Error clears eligibility; Pages action prerequisites include global panel busy state. |
| High | `src/market.ts:60`, `src/config.ts`, `src/chain.ts:97` | New discovery must respect verified venue constants and runtime bindings. It refuses mismatched factories/WETH; candidates use the exact contract-derived venue. Annex code/hook binding and ABI hash checked live. |
| Medium | `src/styles.css:315` | A very long dollar estimate could widen a 320px document. Dollar estimates now wrap; long-value interaction passes. |
| Medium | `src/ui.tsx:246` | Wrong-network controls were duplicated in header/composer. The header is now the single active switch control; composer gives contextual guidance. Exact unknown-chain fallback test passes. |
| Medium | `src/lib.ts` | A generic viem message hid the simulation's reason. Error decoding now checks nested causes/error names before generic text; failed simulation exposes the minimum/slippage error and requests no signature. |
| Medium | `src/note-venue.tsx:28` | The initially assumed Radar query URL was not a token deep link. Read the current public Radar route implementation and verified the launchpad page; links now use `/launchpad/<lowercase-address>`. No Radar script is imported. |
| Medium | `src/pages/Duel.tsx:15` | Duel wallet records needed the same hook + Annex aggregation as authors/rankings. They now use the shared `readRecord`; a failed Annex read is not represented as zero. |
| Low | `src/styles.css:262`, `web/index.html` | Harmonized retained typography and updated metadata/card to the current tagline. Generic OG image uses the supplied live domain. |

## Probe exceptions required by the brief

The machine probe flags the exact caveat twice and measures 79 first-screen prose words at 390px against its default 60-word bar. `src/ui.tsx:250` deliberately renders the caveat on home and in the footer, as explicitly required. The extra first-screen words are the requested conviction explanation and baseline sentence. Removing or hiding this material would violate the task; it is retained. The 390px main action and complete caveat still fit on the first screen, and there is no layout/contrast/target failure associated with these flags.

The probe reports compact secondary controls below its comfortable 44px advisory, while passing its 24px/spacing requirement. Main transaction buttons remain 44px. Labels and native form semantics were reviewed separately from the probe.

## Limits and untested live behavior

- No real approval, wrap, trade, checkpoint, note, seal/reveal, observation, settlement, claim, admission, judge request, drip, sweep or burn was signed. Public RPC reads and eth_call simulations are not transaction certification.
- Pages has no deployment address. Its interactions use a manifest-injected test deployment with the exact v0.10 ABI. Live Pages code, signer/intake configuration, oracle responses, fee burns and claim outcomes cannot be verified yet; all shipped Pages UI is hidden.
- Private early delivery of seal text cannot be implemented from the supplied contracts: only commitments are public, while the draft is local to its author. The conditional holder panel lists commitments and states this limitation. No invented decryptor, key, relay or backend is supplied.
- Public-node browser history calls sometimes returned HTTP 403/400. The UI discloses incomplete history and continues bounded retries/backfill. Venue discovery is bounded and can miss older v4 pools; manual PoolKey entry still requires contract validation. A single party may remove liquidity and quotes can change before inclusion.
- The read-only quote parity test covers the launch pool. Fee-on-transfer/rebasing tokens, all tick-boundary/liquidity configurations and newly admitted hook behavior have not been exhaustively exercised on chain. Simulation and explicit minima remain required.
- WebKit was installed in `/tmp`, including extracted runtime libraries, but its browser could not create a page and was terminated after a bounded 40-second smoke test. No WebKit rendering or interaction pass is claimed. Chromium is the completed browser validation. Physical mobile wallets, Safari clipboard policy, screen readers, native browser zoom and actual social unfurls remain untested.
- The generic OG card is static. Per-note/per-author social preview services are not deployed. Source fonts may render differently on another operating system.

Older `validation/v2/` files remain historical evidence, not claims about v3. The current results are in `validation/v3/`. Only the contributor network controls publication; this worker did not edit Git internals or publish the site.
