# Validation record — Marginalia site

Worker-side record for the front-end job of 2026-10-12. This is the worker's report, not an independent
certification. Everything marked *not performed* was not performed.

## 1. Scope and assumptions

- Pages built: feed (`#/`), author (`#/author/<addr>`), note (`#/note/<id>`), post (`#/post`), seal (`#/seal`),
  pools (`#/pools`), about (`#/about`). Export: `dist/` at the repository root, relative base, hash routing.
- Stack: Vite 7, React 19, TypeScript 5.9, viem 2.57 (no wagmi, no RainbowKit, no WalletConnect: injected
  EIP-1193 wallets only). Source in `web/`, lockfile `web/package-lock.json`.
- Addresses: hook and MARG from the deployment handoff via `dist/imd-deployment.json` at runtime; IMD from the
  manifest's `network.pairToken`; router, judge, treasury from `hook.router()/judge()/treasury()`; the pool key
  from `hook.getPoolKey()`; factories and WETH from the router's constants, cross-checked against the canonical
  addresses in `src/config.ts` (the venue finder disables itself on mismatch).
- Inferred choices: the seal's stamp is pulled by the hook itself (`MarginaliaHook._fund` uses
  `safeTransferFrom(msg.sender, …)`), so the seal page asks for one IMD approval of exactly `STAMP` **to the
  hook**. Every other approval targets the router for exactly `STAMP + MARG_BUY + bond`. The review brief's
  "approvals target only the router" holds for posting; sealing cannot work without this one hook approval, and
  the page says so in words.
- The deployment handoff has no `poolKey`, so `imd-deployment.json` has none; the app reads the key from the hook.
- The feed is empty on chain today (`noteCount() == 0` at block 26172946), so list rendering with real
  entries could not be observed against live data.

## 2. Commands and results

| Check | Command | Result |
| --- | --- | --- |
| Contracts compile (for ABIs) | `forge build` | ok (6 min) |
| Typecheck | `cd web && npx tsc -p tsconfig.json --noEmit` | ok, 0 errors |
| Production build | `cd web && npm run build` | ok; `dist/index.html` 1.58 kB, JS 568 kB (171 kB gzip), CSS 7.7 kB |
| Manifest | `node scripts/manifest.mjs` | wrote `dist/imd-deployment.json`: 2 contracts, 8 assets, network copied |
| Manifest check | `node scripts/check.mjs` | ok: structure, sha256 of every asset, canonical keccak of both ABIs equal the handoff `abiHash`, `network`/`walletAddChain` byte-equal to `network.json`, no extra keys, no address or URL outside the handoff/network block, no absolute or remote reference in `index.html`, no dynamic code loading |
| Encodings vs live contracts | `node test/scratch/encodings.mjs` (read-only eth_call on publicnode) | all 23 checks ok |

The encoding script verifies, against the live hook and router:
`poolId(IMD, MARG, 12500, 60, hook)` = `hook.poolId()`; `getPoolKey()` fields; client `sealHash` and `sealKey`
equal the contract's pure functions for params with a non-ASCII string; `hook.router()` =
0xa3579D7c59A2C0c742fC4e5BB18AF93241D1d263; `validateVenue` on the launch pool with X = MARG derives
`quote = IMD`, `xIsToken0 = false`; `priceWindows(keccak(venue))` reads; v3 `getPool(USDC, WETH, 500)` and v2
`getPair(USDC, WETH)` resolve through the canonical factories; the router's `UNIV3_FACTORY`, `UNIV2_FACTORY`,
`WETH` equal the brief's addresses; every entry of `src/abi.ts` is byte-identical (canonical JSON) to an entry of
the full ABI shipped in `dist/abi/`.

Live constants read with `cast call` during the build and matched by the UI copy: STAMP 0.1, MARG_BUY 0.25,
BOND_MIN 0.25, BOND_MAX 10 IMD, SEAL_MIN 1800 s, SEAL_MAX 21600 s, SETTLE_WINDOW 21600 s, THESIS_GRACE 7 d,
SWEEP_AFTER 28 d, TEXT_MAX 280, THESIS_TEXT_MAX 8192, MIN_TARGET_DELTA_BPS 1000, MAX_HORIZON_DAYS 90, KEEPER_BPS
1000, JUDGE_THRESHOLD 2 IMD, `hook.judge()` 0xa9e1891d76553195B4Cbcd0F8Db290C8C0FA28B9, `hook.treasury()`
0x3e00372cc4967D2bd006Ca882c51dAf45a9810C8. The app reads all of these at runtime rather than trusting the copy.

## 3. Review brief (read-only, before hosting)

- **Addresses**: no contract address is typed into the app except the canonical Uniswap v3/v2 factories and
  WETH in `src/config.ts`, which the brief names and which are only used after they match the router's
  constants. Hook and MARG come from the manifest, which `check.mjs` compares with the handoff.
- **Approvals**: `Post.tsx` approves IMD to `contracts.router` for exactly `imdIn`; `Seal.tsx` approves IMD to
  `contracts.hook` for exactly `STAMP` (see assumptions). No unlimited approval anywhere.
- **Transactions vs ABIs**: every write goes through `simulateContract` with the generated ABI subsets, which
  the encoding script proves are entries of the compiled ABIs. Calls built: `router.checkpointVenue(p, key)`,
  `router.note(p, key, imdIn, minMargOut, deadline)`, `hook.seal(x, venue, hash)`, `hook.observe/settle/
  settleThesis/claimDeposit/claimRefund(id)`, `hook.sweep(kind, epoch)`, ERC-20 `approve`.
- **No external code**: `index.html` references only the bundled assets with relative paths; the bundle fetches
  `./imd-deployment.json` and the configured RPC URLs only. The URLs `check.mjs` prints as notes are
  documentation strings inside viem's error messages, not loaded resources. No analytics, no fonts, no CDN.
- **Venue finder**: `form.tsx useVenueFinder` calls `getPool(token, WETH|IMD, fee ∈ {100, 500, 3000, 10000})` on
  the v3 factory and `getPair(token, WETH|IMD)` on the v2 factory, lists only pools with liquidity, and offers
  the launch pool as the only v4 venue (when X is MARG).
- **Copy**: no promise of returns; posting is "post", the MARG leg is "a MARG purchase"; the footer carries
  "Informational and research purposes only. Not financial advice. Bonds can be lost." on every page, and the
  feed and about pages state: a bonded feed, not a perp DEX, not a prediction market, nothing pays for being right.

## 4. Better Interface review

Coverage (without a browser; rendered checks not performed, see §5):

| Domain | Status | Evidence / notes |
| --- | --- | --- |
| Accessibility | Checked (source) | Labels bound to every input (`htmlFor`); radio groups in `fieldset`/`legend`; 44 px targets on buttons, inputs and nav; visible `:focus-visible` ring in rust; errors `role="alert"`, confirmations `role="status"`; copy buttons have `aria-label` with the address; status never colour alone (tag text). Not performed: keyboard walk, focus visibility over every background, screen reader. |
| Layout | Checked (source) | One column, 44 rem page, 40 rem measure; `dl.facts` collapses under 420 px; `overflow-wrap: anywhere` for hashes; filters stack under 560 px. Not performed: reflow at 320 px, clipping. |
| Writing | Checked | Plain-language ledes on every page; action labels are verbs with the object ("Checkpoint venue", "Approve 0.6 IMD to the router", "Post the call"); errors translated in `lib.ts explainError`; the one-hour wait and the 30 min to 6 h reveal window are stated in words and as countdowns. |
| Typography | Checked (source) | Serif system stack, 17 px base, tabular numerals, monospace limited to ids; heading sizes 1.6/1.3/1.05 rem. Not performed: wrapping at narrow widths, loaded-font confirmation. |
| Colors | Checked (source) | Token table in `DESIGN.md`; dark mode via `prefers-color-scheme` with the same accent. Not performed: measured contrast; the rust link on paper (`#b9471f` on `#f6f1e7`) is the pair to measure first. |
| UI | Checked (source) | Flat surfaces, 2 px radius, one primary action per section, per-button pending state, 120 ms colour transitions gated by `prefers-reduced-motion: no-preference`. Not applicable: dialogs, icons beyond the manicule, animations. |

Findings fixed during the build (source review):

1. MEDIUM `web/src/pages/Seal.tsx`: the seal transaction would revert without an IMD allowance to the hook
   (`_fund` pulls the stamp). Fixed: allowance read and an "Approve 0.1 IMD to the hook" step before "Seal".
2. MEDIUM `web/src/form.tsx`: a user-typed venue would not match what the router derives (quote, xIsToken0),
   breaking seal/reveal binding. Fixed: the venue is always derived through `router.validateVenue` before any
   hash or transaction.
3. LOW `web/src/ui.tsx` TxButton: a rejected wallet request would leave the button locked. Fixed: state release
   in `finally`, with the wallet rejection translated.

Remaining limitations: rendered checks (§5); the empty live feed means list density with real entries is
unobserved; thesis text clamping (`-webkit-line-clamp`) is unverified in a browser.

## 5. Not performed, and why

- **Browser inspection of the export** (screenshots, 320/390/desktop widths, console and resource errors,
  focus walk, measured contrast): the browser tool blocks `file:` URLs, no tool-managed preview
  (`test/scratch/browser/preview.json`) was supplied, and a 50-second foreground `python3 -m http.server` on
  127.0.0.1 was not reachable from the browser tool (connection refused). No screenshot exists; none is claimed.
- **Interaction tests with a mocked wallet**: not run; time was spent on the live-chain encoding checks above.
  The transaction paths were exercised only up to `simulateContract` argument construction by typecheck, and the
  encodings they depend on were verified against the live contracts.
- **Live transactions**: none broadcast. Checkpoint, approve, note, seal, observe, settle, claims and sweep were
  not executed on mainnet; their behaviour past simulation is untested.
- **Log scanning at scale**: the chunked `eth_getLogs` loop from block 26169583 was exercised only by the code
  path, not against a node with logs (there are none yet).

## 6. Completion

**Incomplete for the stated scope**: the build, typecheck, manifest checks and live encoding checks passed, and
every required page and control exists in source, but the required browser inspection and interaction tests
did not run. Useful partial work, not a verified delivery.
