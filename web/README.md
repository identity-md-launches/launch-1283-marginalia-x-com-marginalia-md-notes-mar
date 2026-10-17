# Marginalia site v7

React 19, TypeScript, Vite and viem, retaining the project's existing dependency lock and build configuration. The repository-root `dist/` is the complete static export. The landing is `dist/index.html`; the app is `dist/app/index.html`. Both use one compiled component tree, local bundled scripts and `dist/imd-deployment.json`. No wallet key, provider key or WalletConnect project ID is required. Visitors sign with an injected EIP-1193 wallet.

## Build and preview

With Node 22 and the locked dependencies installed, from `web/`:

```sh
npm ci
npm run typecheck
npm run build
npm run manifest
npm run check
```

The assignment worker installed the unchanged lockfile into a temporary mirror outside the repository, built there and copied the export back; it did not edit dependency files or write node_modules in the submitted tree. A clean rebuild uses the commands above. `build` runs strict TypeScript before Vite; `manifest` creates the app entrypoint, copies exact agent documents/continuation memory and exports the canonical ABIs, then inventories every final file. Run it after any change to exported bytes. `check` verifies assets, ABI hashes, manifest schema/bindings, exact network and agent-document equality. The existing Vite base is `./`.

From the repository root run `python3 -m http.server 4173 --directory dist` and open `http://localhost:4173/` or `http://localhost:4173/app/`. Hash routes need no server rewrites. Do not open the files with file://: runtime JSON fetches need HTTP.

## Hosting the two surfaces

Publish the complete `dist/` tree. At marginalia.chat, `/` serves index.html and `/app/` serves app/index.html. At app.marginalia.chat, map only the root document `/` to dist/app/index.html, while `/assets/`, `/abi/`, `/imd-deployment.json`, `/agents.md`, `/llms.txt`, `/docs/` and `/share-card.png` serve the same files from dist root. This is an entrypoint mapping, not a second independently configured build. The app's relative `../` assets resolve correctly from `/app/` and normalize to the root on the app host. Do not deploy only the app directory: its shared assets live above it. Generic OG imagery uses the given marginalia.chat domain; route-specific unfurls remain client-side share cards.

Feedback intake and weekly ranking are paused. Old `#/feedback` and `#/?tab=feedback` links show only the requested X contact paragraph, without API/history reads or signatures. No Feedback navigation entry remains. Historical Worker code and its protocol tests are retained as inactive source; no Worker deployment is required.

## Configuration and safety

`deployment/mainnet.json` preserves the supplied main deployment, `deployment/network.json` the chain table with the owner-authorized v7 public RPC order, and `deployment/integrations.json` the explicitly authorized Annex, Pages and read-only LARP contracts. These are build inputs. At runtime `src/config.ts` loads only the exported manifest for deployment addresses, ABI paths, chain/network and Uniswap configuration. Boot checks ABI hashes, chain ID, code and hook/router/Annex/Pages bindings. Factories and WETH are checked against the router. Unknown-chain switch failures offer the configured wallet_addEthereumChain parameters and switch again.

LARP is pinned to launch 1436 source `0ef5649c67e948c75bf432d619dbf0613648cb8d`; [provenance](../docs/integrations/larp.md) records full hashes, public-source verification and passive avatar policy. Failed identity reads show addresses/generated marks. An X citation is never an author's identity. No remote script, identity write or name-registration control was added.

All existing transaction paths remain: exact router/Annex/Pages allowances, hook approval only for the verified stamp, and WETH's native `deposit()` without approval. When both router legs spend IMD the allowance is their sum. Quotes remain client-side bigint math over venue state, with positive output minima and bounded deadlines. Every send is simulated and requires a verified chain plus current eligibility. No transactions were broadcast during worker validation.

## Routes

| App hash route | Home for the control |
| --- | --- |
| `#/`, `#/feed` | Latest, Settling soon, Theses, Backed; hook/Annex cards with Counter, Share and Back |
| `#/scoreboard` | Hit rate and settled count, ties by count, zero-settled wallets last; cited receipts and duels retained |
| `#/call` | Modal call flow; `?token=`, `?child=`, `?counter=`; More, WETH wrap and Annex admission |
| `#/thesis` | Thesis sheet, pot/deadline, seven-day child rule and receipt handoff |
| `#/author/<address>` | Rate/count, backing, Calls/Theses/Backers; own earnings, Pools and Seal |
| `#/note/<id>` | Receipt, lifecycle, deposits, counter; existing-child receipt and secondary further child |
| `#/duel/<counter-id>` | Independent call legs, each wallet's hit rate/count |
| `#/post` | Exact-parameter form, seal reveals, thesis/counter/child aliases retained |
| `#/seal` | Private local draft, public checkpoint, exact hook stamp, seal and timed reveal |
| `#/pools` | Deposits/refunds, sweep, judging request/payment/abandonment, treasury drip |
| `#/pages` | Search handle or wallet, subjects ranked by verified backers then supply, next-page quote, Your pages and sell-back |
| `#/pages/<handle>` | Handle registration/trades, escrow and recycle date, exact sentence → URL/ID → 0.5 IMD approval → claim request → pending/answer/deadline; abandon, recycle and deferred burn |
| `#/feedback`, `#/?tab=feedback` | Paused contact paragraph; no form or service reads |
| `#/about` | Full caveat, mechanics, identity explanation, contracts and agent documents |

Hit rate excludes no-data outcomes and always has its settled sample beside it. Contract score is still read as part of the immutable record tuple but has no rendered surface. Missing history, backing reads or receipt amounts are disclosed rather than shown as zero. A WETH-funded trade may show its historical IMD equivalent, explicitly approximate; when that quote is unavailable it shows WETH and says the equivalent is unavailable. Neither value enters transaction or settlement math.

## Validation

From `web/`, with Playwright installed outside the repository and Chromium available:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs EVIDENCE_DIR=../test/scratch/v7 node tests/v7-browser.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs EVIDENCE_DIR=../test/scratch/v6 node tests/v6-browser.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs EVIDENCE_DIR=../test/scratch/v5 node tests/v5-browser.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs EVIDENCE_DIR=../test/scratch/v4 node tests/v4-browser.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs EVIDENCE_DIR=../test/scratch/v3 node tests/v3-browser.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs EVIDENCE_DIR=../test/scratch/child node tests/child-call-browser.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs EVIDENCE_DIR=../test/scratch/feedback node tests/feedback-browser.mjs
node tests/feedback-worker.mjs
node tests/feedback-noted.mjs
node tests/feedback-ledger.mjs
```

TypeScript unit files in tests can be bundled with the locked esbuild (`--bundle --platform=node --format=esm --outfile=/tmp/<test>.mjs`) then run with Node. Retained units cover v2, revision, history, v3 and child-call behavior; new units cover identity/holdings/ranking and authenticated trade receipts. Browser fixtures decode actual calldata and provide deterministic chain state; they do not contact a live chain or spend funds. All original test files remain. Earlier v2/revision presentation suites remain historical; current v3/v4/child/feedback suites are ported to the app entrypoint.

[VALIDATION.md](VALIDATION.md) records exact results and limits. [DESIGN.md](../DESIGN.md) documents implemented tokens and responsive behavior. The Better Interface review and pinned taste probe are local evidence, not independent certification. Real wallet spending, oracle outcomes, full historical availability, Safari and physical-device assistive technology remain untested here.

## v5 review revision

The extended `tests/v5-browser.mjs` includes the reported Annex child-parent, selected PoolKey, expanded receipt, gapped backer and admission-hint regressions. Run that production-browser suite with `TEST_FILTER=Revision` for only these cases. `tests/backers-unit.ts` uses deterministic fixed-block reads to cover missing buys/sells, failed balances and bounded candidate verification; bundle and run it like the retained unit suites above. Current revision evidence and limitations are appended in `VALIDATION.md`.

## v6 continuation

This is the owner's Pages product brief, with no credits or attestation. The v5 theme, routes, function-to-home map and approvals remain. The bottom bar is Feed / Pages / + / Record / Me; the pot chip opens Pots. Search remains usable during a failed chain boot, while contract actions wait for verification. The full-window Pages scan is chunked; gaps, failed balances and missing handle preimages stay explicit. Refresh repeats discovery; sell quotes refresh every 15 seconds and after confirmation. A failed holding read never becomes a zero holding.

`tests/v6-unit.ts` covers search and tweet parsing, full log coverage, fixed-block verification, rank order, unknown values, fixed-decimal pots and share text. `tests/v6-browser.mjs` drives the production export for discovery, sell-back, claim sequence and URL parsing, pending polling/payee/deadline, wallet changes/rejection, exact approvals, copy and responsive layouts. `tests/v6-live.ts` is an optional read-only smoke check: bundle it like the units, then pass the authorized RPC URL and the absolute manifest path. It prints public-source evidence without recording the supplied RPC URL and sends no transaction. The live oracle fee is checked before each claim signature; a value other than the brief's 0.5 IMD disables this flow.

Dependency and build configuration remain unchanged. This task installed the existing lockfile in a temporary mirror under `/tmp/`, built there, and copied the production export back, avoiding edits to repository node_modules or package files. Build, typecheck, browser, manifest and pinned-design results are in VALIDATION.md; publication remains pending.

## v7 continuation

The own profile adds Your week for every positive, unpaid thesis pool, using judge eligibility and fresh noteOf verification. The same lines appear under the selected pot's judging controls. Pots finds the newest funded unpaid completed chain week by reading every week since deployment; current-week pools still appear in Me and remain manually selectable. The exact child badges remain; an existing child removes the own-thesis post-child button.

`deployment/network.json` is the sole build input for the RPC lists: MEV Blocker, Tenderly public mainnet, PublicNode, dRPC. This explicit v7 request overrides the older two-node pinned list; all addresses and other network fields remain identical. At runtime the manifest supplies these lists to viem fallback and wallet_addEthereumChain. HTTP 429 is a transport failure, not an empty history result.

The event loader preserves v1 caches and publishes the recent 8,000 blocks first, then scans every missing 2,000-block range automatically. Hook and Annex share a queue of four log requests. Each successful result is persisted immediately, including an actual empty array; missing/non-array log results fail within the per-node transport so the next node can serve the range. All-node failures remain holes. Once the pass finishes, Load more history manually retries holes (and refreshes the live reorg overlap). Coverage, incomplete/complete status and live-state read failures remain explicit. Refresh retains the previous Hook and Annex snapshots independently until each replacement arrives, preserving mounted receipts/composers and confirmed transaction links.

`tests/v7-unit.ts` checks week discovery, all three line states, no-thesis cases and actual local HTTP fallback with archive errors, HTTP 429, missing results, shared concurrency and cache recovery. `tests/v7-browser.mjs` checks the production UI, automatic history, links, defaults, retained badges, Feedback removal and responsive keyboard layouts. The retained feedback-browser tests now assert the paused route; historical service protocol tests remain runnable. See VALIDATION.md for current results and untested live-chain behavior.

The optional `tests/v7-live.ts` smoke check takes the runtime manifest path (no wallet or RPC credential), uses its exact public node order, verifies companion bindings and scans Hook/Annex history. Its printed chain state is dated evidence, not a fixed default week. For bounded browser runs, `TEST_RANGE=start:end` selects zero-based scenarios, end exclusive; for example run v5 with `0:12` and `12:24` to include all 23 cases. Final v7 worker results are 110 current Chromium scenarios and ten unit suites; Safari and funded actions remain unverified.


## v7 review revision

Pots defaults to the newest funded unpaid completed chain week; current-week pools remain visible in Me and manually selectable. Refresh retains Hook/Annex snapshots independently, preserving loaded Annex receipt/composer confirmation state. Each node rejects missing/non-array log results inside viem fallback, and weekly table amounts retain the existing 12px gutter. No dependency or build configuration changed.

All 112 current Chromium cases and ten unit suites pass; the new delayed-Annex test and malformed-node cases are retained in source. For bounded runs use TEST_RANGE=start:end (end exclusive); v5 ran as 0:5, 5:10, 10:15, 15:20, 20:23; child-call as 0:8, 8:16, 16:22. A retained child-call content assertion now waits for the same required venue notice after asynchronous record refresh; all calldata checks remain. See VALIDATION.md and validation/v7-revision/ for reproductions, final results, the unchanged landing copy-budget exception and unavailable WebKit/live-chain checks. `.imd-responses.json` in the repository root answers all four reviewer finding IDs.
