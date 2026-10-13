# Marginalia v5 worker validation

Checked on 2026-10-13 UTC against the production export. These are the implementing worker's local results, not an independent review or hosting certification. No real wallet signature, funded transaction, oracle request, contract deployment, Worker publication or DNS/IPFS update was made. Feedback tests use generated local test accounts and storage.

## Build, configuration and live reads

| Check | Result and evidence |
| --- | --- |
| Strict typecheck and production build | Passed using the unchanged lockfile in a temporary mirror outside the repository. React 19 / TS / Vite; relative base. Final main JS about 746 kB / 218 kB gzip, CSS 37 kB. Vite's retained >500 kB chunk advisory remains; no missing runtime dependency. |
| Manifest generation and check | Passed: 7 bound contracts, 22 inventoried assets plus the manifest itself; every final SHA-256 and canonical ABI Keccak verified. Main deployment identifiers/poolKey preserved, network and walletAddChain identical to the supplied handoff. `validation/v5/manifest-check.log`. |
| Two static surfaces | Root landing and /app/ app work below a gateway subpath. A separate mocked host-root mapping serves app/index.html with shared root assets/manifest; tested successfully. Hosting instructions in README. No separate runtime address configuration. |
| LARP source/ABI pin | Compiled launch 1436 source `0ef5649c67e948c75bf432d619dbf0613648cb8d` outside the repo with cached Solidity 0.8.26, exported raw compiler ABIs, recomputed canonical hashes. Unit assertions compare view selectors, mutability and return shapes to those full ABI arrays. `docs/integrations/larp.md`. |
| Live LARP code/bindings | Read-only at Ethereum block 26185508: LARP / Names / Links code 6,833 / 21,095 / 9,856 bytes, shared IDENTITY and correct cross-links. Public source `https://ethereum-rpc.publicnode.com`; `validation/v5/identity-live.json`. |
| Fresh complete application boot | Actual `loadDeployment`, `loadContracts` and `verifyIdentity` passed against Ethereum at block **26185629**, with all 7 manifest ABI hashes verified. Canonical factory/WETH checks passed. Week 2962 pot `507645840223181205005` wei IMD; entries close Unix 1792022400. A no-name read of the public hook returned no primary name. `validation/v5/boot-live.json`. |
| Scope and bundle | No Solidity, dependency/lockfile, protected configuration, Worker intake or adopted-ledger changes. No submodule, dependency/cache archive or node_modules added. Generated historical preview PNGs pruned; required runtime assets, ABIs, source and all test files retained. Prospective tree stays below 8 MiB; `validation/v5/bundle.json` records the final measurement. |

## Interaction and unit coverage

All **75 Chromium browser scenarios pass**. They load the actual production bundle, inject deterministic RPC/wallet fixtures, decode transaction calldata and reject unexpected outside requests. Browser reports/logs are in `validation/v5/`.

| Suite | Result | Meaningful coverage |
| --- | --- | --- |
| v5 browser | 12/12 | Landing/promise/caveat/pot/metadata/Launch app; app host and subpath; five shell controls; hook/Annex cards, Backed holdings, cited-author separation; LARP name/no-name/no-code fallbacks, rejected JavaScript URLs and non-executing SVG scripts; authenticated traded IMD; rate ties/zero-settled; profile backing price/earnings; defaults, tap hints, remembered token, modal containment/Escape/focus restoration; posted-child correction; dark 320/390 and desktop 1440 with no horizontal overflow or displayed score. |
| v4 browser, ported | 11/11 | Retained call/thesis transaction behavior under the new shell: exact 0.6 IMD router approval without a trade, exact combined 1.6 IMD with a trade; output minima/deadlines, holding-dependent toggle defaults, URL token precedence, baseline warm-up/ready, blank public checkpoint text, persisted draft, thesis rule before bond and on receipt, profile/Feedback, route reflow and focus. Old presentation expectations now assert the v5 equivalents. |
| v3 browser, ported | 20/20 | Exact approval/confirmation/simulation, revert and stale-quote handling, wrong-chain add-chain, Pages register/trade/claim/sell/abandon/recycle/burn, router and hook prerequisites, WETH exact missing deposit, unavailable dollars, Annex own approvals/baseline/counter/admission/lifecycle, judge/treasury, 320/390 reflow. Both formerly skipped Annex scenarios are active and pass. The slippage-revert fixture intentionally logs its simulated error. |
| Child-call browser, ported | 22/22 | All nine scenarios outstanding from v4 plus the retained thirteen: parent author/type/status/grace, absent/stale/failed reads, counters/reveals, manual parent, approval-time recheck, exact parent calldata and deadline cap, thesis receipt handoff, live children, Annex exclusion, wallet/network prerequisites, dark layout and retained Feedback draft. |
| Feedback browser, ported | 10/10 | Actual local EIP-191 signing through unchanged Worker, compact message/handle normalization, byte limits, pending/account changes, rejection, retry signature reuse, rate-limit/service failure, badge/pick/adoption display and dark/light 320/390/768/1440. No gas/approval/switch in Feedback. |

Seven TypeScript unit suites pass (`validation/v5/units.log`): v2 (five groups), revision (nine), history (seven), v3 quote/math/ABI/approval/calldata, child-parent gates and preflight, new v5 identity/ranking/holdings, and authenticated trade receipts. V5 ranking compares exact integer fractions before applying settled-count ties, including large-counter cases. Receipt tests reject other routers, other posting wallets, preceding notes and later trades; a cited handle cannot become an author. Missing WETH→IMD history yields an explicit WETH fallback, not an invented amount.

Retained Feedback Worker tests pass all 18 groups; note-badge and credit-ledger suites also pass. The durable workerd/Miniflare runtime suite was not rerun: service implementation and deployment are unchanged. Earlier v2/revision browser files remain in the tree as historical presentation suites; their business behavior is exercised by retained unit suites and current v3/v4/v5 regressions. No claim is made that obsolete score/three-door presentation expectations still pass.

## Better Interface review: six domains

| Domain | Review and measured coverage | Findings fixed / limits |
| --- | --- | --- |
| Accessibility | Native dialog and disclosure semantics, labels, alt text, aria-pressed filters/presets, status/alert text, visible focus; keyboard interactions and Escape tested. | `src/App.tsx:54` and `src/shell.tsx:38`: route focus previously competed with dialog restoration; now closing restores the original trigger or + fallback. Compact hints are 28px; primary controls are generally ≥44px. No screen-reader or physical-device session. |
| Layout | Actual landing, feed, profile and compose screenshots inspected; root/app-subpath/root-host checked; every primary route reflows at 320/390, plus 1440 checks. Landing product and Launch app, app +, and the call primary control are visible on the 390 first screen. | `src/app.css:107`: native sheet contains its own scrolling and leaves the page below inert; wrapping/minmax grids contain addresses and long values. A test screenshot now waits for the inherited 120ms theme transition before inspecting dark controls. |
| Writing | Required promise, full caveat and backing copy verbatim; rate plus sample everywhere; short one-sentence tap hints; visible upward hold and thesis child rules; “buy” limited to Pages controls. | `src/trade.tsx:176`: one summed cost when both legs spend IMD. `src/note-venue.tsx`: removed the old Radar link. `src/pages/Note.tsx:73`: posted-child receipt replaces the first-child primary CTA. No promotional chart or returns copy. |
| Typography | Final role scale 14/16/20/24/32/48px, system serif + monospace, 400/600/700 weights; no remote fonts. Probe reports four used sizes on the landing, three weights, no tracked small capitals. | At 390 the landing title is the heaviest type; profile rate uses the same strongest weight. The required promise overrides the generic short-headline preference. |
| Color | Retained light/dark paper/ink/rust tokens. Pinned probe measures landing text contrast as passing 4.5:1 (3:1 large); dark app screenshots inspected. | Status uses words as well as color. No claim of automated full-route dark contrast certification. Forced-colors selection has an explicit border. |
| UI | Loading/failed/empty/partial states; one composer action; explicit exact approval, pending receipt and rejection; fresh contract prerequisites; no stale identity substituted for another wallet. | `src/App.tsx:120`: Annex counters explicitly select Annex and unresolved counters wait for their note. `src/identity-read.ts:31`: code/cross-binding failure never invents a name. `src/trade-receipt.ts:8`: amounts authenticate emitter, posting wallet and receipt ID. |

The exact pinned design-critic probe ran on the export at 320/390/1440, with offline RPC behavior: **15/16 pass**. Rendering, layout, targets, measured contrast, casing, tracking, eyebrows, type sizes/faces, glyphs, slogans, repetition, chrome, motion and share metadata pass. The single failure is first-screen prose: **74 words at 390 versus the generic 60-word bar**, caused by the mandatory verbatim promise and unchanged full caveat. Both fit on the first screen with Launch app. These task requirements take precedence; the full caveat was neither hidden nor shortened. `validation/v5/taste-summary.json`. Offline pot-unavailable state is honest; separate browser mocks and the live check verify populated pot/deadline behavior.

The assigned browser connector returned a closed transport. Locally installed Playwright Chromium supplied the rendered checks and screenshots instead. Screenshots kept for this delivery are actual browser output. Historical generated screenshots were pruned for the source budget, with a path/byte record in `pruned-previews.json`; previous textual validation logs remain.

## Hosting review and remaining limits

The worker checked the critical address/approval/script categories: runtime addresses come from the authorized manifest or verified hook companions; all v4 exact spender/amount rules remain; LARP modules accept only public reads and never invoke wallet APIs; client-side venue quotes remain; remote avatar content enters only an image/JSON parser; no external script or cited-handle authorship is introduced. No unresolved critical finding was identified in this local review. A critical address, approval or script finding from the independent review must still refuse hosting.

The host must publish the whole dist tree and map the app host entrypoint as documented. Neither production mounting nor named-domain content was changed here. Live tests were reads only: funded actions, contract-wallet signing, oracle responses, settlement progression, reorg behavior on a real chain, third-party metadata/CORS availability, complete historic event coverage, WebKit/Safari and native assistive technology remain untested. Missing/gapped data is disclosed by the UI. No complete-history, identity-ownership or financial outcome guarantee is implied.


## 2026-10-13 · Review revision of the accepted v5 tree

**Complete for the reported scope.** Base `6265fecda7b2ee59f0da0151eb4e91015c4b8d6a`. This section supersedes the earlier v5 review only for these findings and the checks rerun below. Six IDs, five root causes; every ID is answered as fixed in `.imd-responses.json`. These are worker observations, not independent certification. No real wallet request or live RPC was used by these regressions.

### Reproduction and fixes

| Finding ID prefix; source | Reproduced on accepted export | Correction and final recheck |
| --- | --- | --- |
| `74821a7c`; `web/src/trade.tsx:87` | With a valid own thesis, Annex-only discovery removed context and parent, enabled the action and sent mocked `Annex.post` with zero parent. Missing checkpoint/allowance also exposed unintended actions. | Parent lookup no longer depends on Annex resolution. Keep context/field, show a persistent explanation, require a router venue for any thesis parent; guard approval, checkpoint and submit. Tests cover URL, manually entered and saved parents; zero wallet requests while blocked; recovery to a router key with the same parent; explicit clearing and exact standalone Annex approval. `before-child-metrics.json`, `metrics.json`. |
| `ca463835`; `web/src/trade.tsx:142` | Non-launch hookless IMD and native-ETH v4 pools failed the router's PoolId/key comparison in simulation (`BadVenue`); no note wallet request followed. | Send `market.key` to `note`, as already used by validation/checkpoint/trade. Fixture enforces the Solidity comparison from `src/MarginaliaRouter.sol:207`; both cases now reach the mock wallet with matching key/ref, router, 0.6 IMD cost and positive MARG minimum. No broadcast. |
| `3f922c5a`; `web/src/annex.tsx:57`, `web/src/pages/Feed.tsx:42` | Supplied 269-byte why remained clamped on the detail page: 72px client height, 144px scroll height at 390; 72/168px at 320, self-link retained. | `Entry expanded` renders plain complete text only on Annex detail. Feed still clamps to three lines. After: 144/144px and 168/168px; computed clamp `none`, no text link. Both dark screenshots inspected. |
| `016d5dd9` and duplicate `531056d7`; `web/src/backers.ts:24`, `web/src/pages/Author.tsx:39` | Readable buy plus refused sell range returned a former holder with one page despite supply/pagesOf zero; profile claimed ≥1. | Discover all traders, including sell-only/net-zero candidates; verify each current balance at the same fixed head as supply in batches of at most 20; omit zero or failed balances. Unknown counts and retry for failed reads; separate history/earnings gap. Browser proves no former holder, ≥0 verified lower bound, correct share text, unknown-count share on failure and retry recovery. Six unit groups also cover bounded scans, deduplication, current amounts and concurrency. |
| `2678ce92`; `web/src/annex.tsx:32`, `web/src/app.css:132` | Admission had a three-sentence paragraph and zero rule hints. | Three existing `Hint` controls retain original sentences and live fee. Keyboard opens each named hint; 320/390/1440 reflow passes. First visual pass found squeezed labels when hints opened in a flex row; scoped normal-flow wrapping fixed it. Final screenshot inspected. |

The original backer unit failures in `backers-before.log` are intentional reproduction evidence. `before-metrics.json` contains the original clipping and false-count measurements. All current test reports in this directory pass. Fixtures are local: representative wallet/token addresses in test files are not deployment configuration or placeholders in the app.

### Rerun commands and outcomes

Dependencies were installed with the **unchanged** `web/package-lock.json` in a fresh temporary mirror under `/tmp/`, using `npm ci --no-audit --no-fund`. Playwright 1.58.2 and Chromium 145 were installed separately outside the repository. The source build used the existing Vite config; no package, lockfile, node_modules, build config or ignore file was changed in this tree.

From the mirrored `web/`: `npm run typecheck`, `npm run build`, `npm run manifest`, `npm run check` passed. Final static JS is approximately 748 kB (218 kB gzip), CSS 37 kB; the retained Vite chunk-size advisory remains. Manifest validation checks all 7 bound contract ABIs and 22 other exported files, the unchanged handoff/network/walletAddChain, local assets and agent-document equality. Final export and prospective submission bytes are in `bundle.json`.

Each browser command used `PLAYWRIGHT_MODULE=<temporary playwright/index.mjs>`, `PLAYWRIGHT_BROWSERS_PATH=<temporary browsers>` and `EVIDENCE_DIR=<temporary suite directory>` against the rebuilt production `dist/`:

| Command from web/ | Result |
| --- | --- |
| `node tests/v5-browser.mjs` | 23/23: retained 12 plus 11 new revision scenarios |
| `node tests/v4-browser.mjs` | 11/11 |
| `node tests/child-call-browser.mjs` | 22/22, retaining all nine previously ported scenarios |
| `node tests/v3-browser.mjs` | 20/20 |
| `node tests/feedback-browser.mjs` | 10/10 |

Browser tests reject unexpected external requests and script errors; transaction assertions decode real ABI calldata sent only to the fixture. Expected fixture errors for unavailable balances and simulated reverts appear in logs, not as page exceptions. The current 86 scenarios cover exact approvals, add-chain, simulation/error handling, receipt authorship, LARP and passive avatars, Pages and lifecycle controls, counters/reveals, defaults, first-screen actions, dark 320/390 and 1440 reflow, and the new failure cases. `*-browser.json` and `*-browser.log` retain results.

Bundled each TypeScript unit with the locked esbuild (`--bundle --platform=node --format=esm`), then ran with Node: v2, revision, history, v3, child-call, v5, trade-receipt and **backers** all pass (eight suites, `units.log`). `node tests/feedback-worker.mjs`, `feedback-noted.mjs` and `feedback-ledger.mjs` also pass. The optional durable workerd runtime suite and historical obsolete v2 presentation browser suites were not rerun; their source remains intact. Contract tests were not rerun for this frontend-only revision.

From repository root: `IMD_PLAYWRIGHT=<temporary playwright/index.mjs> PLAYWRIGHT_BROWSERS_PATH=<temporary browsers> node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline`. **15/16 checks pass** at 320/390/1440; `taste-summary.json`. The unchanged required promise/caveat produces the same sole copy-budget exception: 74 first-screen prose words at 390 (generic bar 60). The actual 390 first-screen screenshot was inspected: product and Launch app remain visible, caveat unchanged. Offline pot reads honestly show unavailable; populated live-state UI is covered by the retained fixture tests. Probe screenshots remain in scratch, which the worker removes.

### Better Interface coverage of the revision

| Domain | Coverage and final state |
| --- | --- |
| Accessibility — checked | Existing native labelled fields, disabled transaction states and role=alert explanations retained. Admission uses named native details/summary; each toggled with Enter in browser. Modal focus/escape and parent field keyboard behavior passed retained suites. No screen-reader or native 200% zoom session. |
| Layout — checked | Screenshots inspected for corrected Annex detail at 320/390, blocked child flow, gapped-backer profile and admission. Long note text is fully reachable; opened hints use full width. Revised states pass 320/390/1440 overflow checks. No unrelated layout or breakpoint changes. |
| Writing — checked | Critical error states the incompatibility and how to recover. Partial history is distinct from unverified current balances; profile/share use the same uncertainty. Original admission sentences, fee/risk, caveats and backing copy preserved. |
| Typography — checked | Reuse existing serif/mono scale, weights, line-height and wrapping. Removed only detail truncation; feed excerpts retain their clamp. No new fonts or type sizes. Actual long-text heights recorded above. |
| Colors — checked within limits | Reuse existing theme/status tokens, with text as well as color conveying the block. Pinned landing probe passes measured contrast; dark corrected-state screenshots inspected. No new palette values; full-route dark contrast and forced-colors audit were not separately repeated. |
| UI — checked | Zero wallet requests while a thesis has an Annex-only venue; normal router recovery and explicit parent removal work. Missing holdings never become zero, errors support retry, share cards agree. Existing approval amounts, recipients, WETH deposit and simulation/receipt flows pass regressions. |

### Scope and limitations

The generated export contains both entrypoints and the regenerated SHA-256 inventory. No token/Solidity, ABI, deployment address/network, external script, dependency/build configuration, fee/mint/payment model, Feedback intake or adopted-ledger change. This revision corrects the existing `note` calldata to match the selected venue and prevents invalid child workflows; it adds no contract action. LARP code remains view-only, metadata remains passive, quotes remain client-side and receipt authorship remains the posting wallet. Source diff plus all critical-flow regressions identified no unresolved address, approval or script issue. Independent review still decides hosting.

The assigned browser connector returned `Transport closed`; the local Playwright browser supplied screenshots and interactions. Downloaded WebKit reported missing host libraries (including GTK4/GStreamer), so no WebKit result is claimed. Mainnet spending/signatures, fresh live RPC reads, oracle/lifecycle progression, production hosting/Feedback deployment, reorgs, complete historical discovery, physical devices, native assistive technology and the complete dark-route contrast matrix remain untested in this revision. Existing historical live-read evidence is not relabelled as a fresh check.
