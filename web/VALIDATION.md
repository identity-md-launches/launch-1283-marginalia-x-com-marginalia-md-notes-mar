# Marginalia frontend revision — validation record

2026-10-12. Worker observations, not independent certification. This record supersedes the previous
frontend validation, including its unsupported exception for hook approvals. The existing app was repaired;
contract sources, dependencies, lockfiles, build configuration and the unrelated helper were left unchanged.

## Result and scope

Completed the requested revision with one response for each of the 23 finding IDs in `.imd-responses.json`.
The source, existing lockfile and final static export are present together. Publication must use **dist/ only**.
No deployment, approval, signature, or other transaction was broadcast to Ethereum.

The critical policy conflict is deliberately gated: **new sealing is unavailable**. The immutable hook needs
its own IMD allowance, which the site's router-only policy forbids. The hook approval and seal transaction
builders were removed; hashing, checkpoint state, seal events and existing reveals remain available. The
preparatory Seal checkpoint write is also disabled with an explanation, avoiding gas for an unavailable
seal. Post's checkpoint controls remain usable. This is the resolution explicitly requested by the critical
finding, not a substitute approval to the wrong spender.

The two approved public nodes do not provide reliable archive logs. The revision makes that limitation
visible and survivable, without adding another endpoint: per-browser event/cursor persistence, bounded
recent scans, successful-range coverage, per-chunk error handling and live `noteOf`. **Fresh browsers may
lack older history.** No complete archive, mainnet transaction success or platform social unfurl is claimed.

## Reproduction and correction

`tests/revision-browser.mjs` has a `MODE=before` branch that ran against the unchanged original `dist/` copied
to `/tmp/marginalia-before`. All 13 grouped reproduction scenarios passed; see
[reproductions.json](validation/reproductions.json). The normal branch then ran against the final production
export at a static `/preview/` subpath with an injected mock wallet and intercepted JSON-RPC. Its 19 grouped
regression scenarios passed; see [browser-results.json](validation/browser-results.json).

| Finding group | Source of correction | Evidence and recheck |
| --- | --- | --- |
| High: historical logs take down the feed | `src/notes.ts:132`, `src/config.ts:20`, `src/App.tsx:112` | Supplied historical queries reproduced publicnode -32602 archive-token refusal and dRPC code 35. Original mocked browser showed whole-feed failure. Revised scans use one OR-topic query per chunk, at most four 2000-block ranges over an 8000-block tail; transport retries/fallback may add RPC attempts. A 64-block overlap and block-hash anchor handle reorgs. Refused ranges retain other data and are disclosed. Cursor reload, recent-hole retry, cached older notes, a 650000-block gap and changed-anchor invalidation are tested. |
| Critical: hook approval violates policy | `src/pages/Seal.tsx:55` | Original unsigned request decoded as approve(hook, 0.1 IMD). Revised build contains no Seal approval or seal transaction builder; browser confirms disabled controls even with allowance present. |
| Critical: approval amount differs from display | `src/pages/Post.tsx:225`, `src/lib.ts:193` | Original bond 0.25009 displayed 0.6 but requested 0.60009. Revised label, total, chosen bond and explanation retain all 18 decimals; captured request is exactly 600090000000000000 units to the router. Excess precision is rejected. |
| High: target rounds into thesis or crashes | `src/lib.ts:157`, `src/form.tsx:128` | Original 99.999 downward request encoded zero; original 42949573 upward seal crashed. Integer parsing and final uint32/nonzero bounds now reject both inline without losing the page. Edge values and nonfinite/overprecision input tested. |
| High/medium: seal checkpoint omitted | `src/checkpoint.tsx:7`, `src/pages/Seal.tsx:65`, `src/lib.ts:244` | Live priceWindows was all zero at head 26173275. Shared checkpoint states render none/young/mature/stale; countdown tests pass on Post and Seal. Named/selector PriceHistoryUnavailable errors map to a readable one-hour instruction. Policy gating still prevents new sealing. |
| High/medium: valid reveal blocked by old checkpoint | `src/pages/Post.tsx:81` | Four-hour seal/nine-hour checkpoint fixture now permits posting after validating connected author, computed hash, full subject and unconsumed seal. Early, expired, wrong-subject, wrong-author and changed-draft reveals are blocked. A fresh chain-time check precedes simulation, and router deadline cannot outlive the seal. |
| High/low: unreachable sweeps | `src/pages/Pools.tsx:49`, `src/pages/Pools.tsx:153` | Day/week selectors query arbitrary epochs; captured requests decode sweep(0,day) and sweep(1,week). Both require nonzero balance and 28 days after period end; an open judge week disables sweeping. |
| High/low: missing/miscounted claims | `src/claims.tsx:7`, `src/pages/Pools.tsx:33`, `src/pages/Note.tsx:216` | Shared live note/claimed/day-share eligibility. Direct deposit and refund controls confirmed with mock receipts, removed immediately, then refreshed. Already-paid notes count zero; integer-zero share and empty-count cases tested. |
| High: author record breaks on mobile | `src/pages/Author.tsx:34`, `src/styles.css:145` | Original score cell was 66.47px tall at both 320 and 390 widths. Final 1234567.89 is 25.5px tall with all seven label/value pairs intact. Desktop table preserved. |
| High: first screen overfilled; directional copy | `src/pages/Feed.tsx:83`, `src/ui.tsx:142`, `src/form.tsx:217`, `src/pages/About.tsx:18` | Requested shorter heading/lede/wallet sentence implemented. Note text moves from y=857.14 to y=693.20 at 390×844 and ends at y=744.20; complete first entry and empty state fit. Direction labels use Upward/Downward call or Up/Down; enums unchanged. |
| Low: CCIP requests, dead launch link, retraction text | `src/chain.ts:67`, `src/config.ts:32`, `src/pages/Feed.tsx:46` | OffchainLookup fixture caused an external request in the old build; ccipRead:false prevents it now. Old /launches/1283 returned 404; supplied job page returned 200. Retracted fixture omits zero settle price and uses a named outcome. |
| Medium: observation evidence rounded away | `src/pages/Note.tsx:17`, `src/pages/Note.tsx:143` | Raw xRead=123456 stays 123456; balance 5000000 with decimals=6 is 5 USDC. Failed decimals displays 5000000 raw units; maxUint256 balance displays unavailable. Table scroll is local and focusable. |
| Medium: missing share image | `index.html:12`, `public/share-card.png` | Locally rendered and visually inspected 1200×630 PNG; OG/Twitter metadata includes image, description and dimensions. Image resolves from the test gateway subpath and is in the hashed asset inventory. |

The informational review's “nothing must refuse hosting” conclusion was disputed because its own hook
approval exception and exact-display assertion contradicted reproduced critical defects. Address/ABI facts
were rechecked. No hosted-helper defect reproduced: the existing helper remains outside the app and export.

## Commands and results

Dependencies were installed from the **unchanged** `web/package-lock.json` into an isolated copy at
`/tmp/marginalia-revision/web`, with npm cache and Playwright outside the repository. Source files were
synchronized there before each build; final output bytes were copied into repo-root `dist/`. This avoided
writing the repository's prohibited dependency/cache paths. Reproduction commands for a normal checkout
are in [README.md](README.md).

- `npm ci --prefix /tmp/marginalia-revision/web --cache /tmp/marginalia-npm-cache --no-audit --no-fund`: passed.
- `npm run typecheck --prefix /tmp/marginalia-revision/web`: passed, no errors.
- `npm run build --prefix /tmp/marginalia-revision/web`: passed, Vite 7.1.9. One nonfatal existing-size-class
  warning for the main JS chunk (579,330 bytes; about 175 kB gzip). No build configuration changed.
- `node /tmp/marginalia-revision/web/scripts/manifest.mjs <pinned deployment> <pinned network>`: passed;
  two handoff contracts, nine inventoried assets, network and walletAddChain copied unchanged.
- `node /tmp/marginalia-revision/web/scripts/check.mjs <pinned deployment> <pinned network>`: passed;
  exact asset inventory, SHA-256, canonical ABI Keccak, configuration schema/binding, relative export paths.
  Its informational URL notes are viem documentation/unused ENS gateway strings, not fetched resources.
- Bundled `tests/revision-unit.ts` with the installed esbuild, ran it with Node: **9 scenarios passed**.
- Playwright **1.64.0**, Chromium **156.0.8078.4**, `tests/revision-browser.mjs`: **13 original-defect
  reproduction scenarios and 19 final regression scenarios passed**. The runner owns and closes its preview
  and browser in one bounded foreground process. Mock RPC failures and mock wallet rejections are deliberate.
- Bundled and ran `tests/live-read.ts` against the contributor's `http://127.0.0.1:37181/rpc/1`: read-only
  checks passed at head **26173275**. This worker-only URL is not in the static app configuration.
- `git diff --check`: passed. Protected paths and source/export byte integrity checked separately before delivery.

Read-only chain checks: chain 1; nonempty code for hook, MARG, router, judge, treasury, IMD, both canonical
factories and WETH; router **0xa3579D7c59A2C0c742fC4e5BB18AF93241D1d263**, judge
**0xa9e1891d76553195B4Cbcd0F8Db290C8C0FA28B9**, treasury
**0x3e00372cc4967D2bd006Ca882c51dAf45a9810C8**; launch pool ID
`0x436763bf49aa9ea6db1d8d4d80ac8c7b3c36ad58fa6281a06ea39c92d69e2f20`; validated venue; client sealHash/sealKey
matching the live pure functions; every typed hook/router/judge ABI subset entry present in its full ABI;
canonical deployed ABI hashes matching the handoff. Live noteCount was zero, so populated evidence uses fixtures.

Browser coverage includes every changed financial control, approval destination/amount, rejection recovery,
claim confirmations, sweep eligibility, ordinary and sealed posting gates, observe/settle/forfeit requests,
no-wallet and wrong-chain states, add-chain fallback, malicious offchain lookup, relative asset loading,
empty/partial/error states, cache reload, responsive records and share metadata. Fixture wallet requests
terminate in the local test route; none reach a wallet or real RPC.

## Better Interface review — six domains

Pinned Better Interface and eth-frontend-ux references were read and applied within the revision scope.
No unrelated redesign or dependency change was made.

| Domain | Coverage | Evidence and limitations |
| --- | --- | --- |
| Accessibility | Checked | Native labels/radios/buttons retained. Target errors have aria-invalid, described-by and alert semantics. New epoch controls are labeled; evidence scroll region is keyboard focusable. A visible keyboard focus ring was inspected in dark mode. No screen-reader session, native 200% zoom, automated axe scan or exhaustive focus walk was performed. |
| Layout | Checked | Production screenshots at 320/390/1440px; first entry and empty state fit at 390×844. Author labels/numbers stay whole at 320/390; no document overflow in measured views. Evidence table scrolls within its region. No physical-phone or intermediate-breakpoint sweep was performed. |
| Writing | Checked | Exact requested Feed/wallet prose, directional terminology, explicit approval-policy gate, missing-history warning, checkpoint wait and reveal countdown. Financial authorization amount equals its transaction encoding. Existing disclaimer and canonical social link retained. |
| Typography | Checked | Existing 17px serif stack and tabular numbers retained. Author values no longer fragment; raw readings and exact authorization amounts do not lose precision. System font stack is declared, not proof that proprietary Iowan/Palatino fonts exist on every device. |
| Colors | Checked with limitation | Computed rendered body/secondary/link pairs measured in light and dark mode (below). Existing mandated palette retained. Dark rust links remain below 4.5:1 for small text; this pre-existing palette limitation was not silently redesigned outside the listed findings. No comprehensive contrast compliance claim. |
| UI | Checked | Existing ledger, 2px edges, disabled/error/confirmed states and motion preferences preserved. Button rejection recovery and mocked confirmation/refresh exercised. Screenshots inspected in light/dark, including keyboard focus. No dialogs, charts or staged animation were added. |

Rendered contrast on the actual paper background:

| Theme | Body | Secondary text | Rust links |
| --- | ---: | ---: | ---: |
| Light (#f6f1e7) | 15.40:1 | 6.91:1 | 4.68:1 |
| Dark (#15130f) | 14.79:1 | 8.00:1 | **3.52:1** |

[Measured bounds and colors](validation/browser-metrics.json) are from the final export. Representative
screenshots were actually inspected:
[feed at 390](validation/feed-390.png), [author at 320](validation/author-320.png),
[author at 1440](validation/author-1440.png), [dark feed and keyboard focus](validation/feed-dark-keyboard.png),
[observation evidence](validation/note-evidence.png), [empty feed](validation/empty-390.png).
These are mock data screens, not mainnet note records. The assigned browser connector returned “Transport
closed”; the local Playwright browser supplied the rendered inspection instead.

## Remaining limits

- New seals require the requester to resolve the router-only approval conflict; no bypass is enabled.
- Old unavailable events cannot be reconstructed by a fresh browser; the UI labels partial histories and
  does not claim missing notes do not exist. Cache storage can be denied or exhausted, with an explicit warning.
- No real wallet signature, funded mainnet action, keeper execution, claim or sweep was sent. Mock success
  receipts test UI transitions; live reads and ABI checks do not prove transaction success under all chain states.
- No WebKit/Firefox, physical-device or screen-reader inspection, exhaustive accessibility audit, or native
  browser zoom test. The existing dark rust small-text contrast limitation remains recorded above.
- The hosting origin is unspecified. Relative share artwork resolves in static hosting, but absolute metadata
  URLs and actual social-crawler unfurls await the final hosting origin.

**Complete for the requested revision scope**, with the deliberate sealing gate and documented limitations.
