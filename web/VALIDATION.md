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
