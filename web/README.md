# Marginalia site v5

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

Feedback still POSTs to same-origin `/api/feedback` with the exact v3.2 message shape and reads the same public documents. Mount the existing Worker routes on each served origin using the same service/storage; do not change the message's `site:'marginalia.chat'`. See [worker/README.md](worker/README.md). Plain static hosts without that optional route show the intake failure honestly. Nothing here publishes the Worker, DNS or an IPFS CID.

## Configuration and safety

`deployment/mainnet.json` preserves the supplied main deployment, `deployment/network.json` the unchanged chain table, and `deployment/integrations.json` the explicitly authorized Annex, Pages and read-only LARP contracts. These are build inputs. At runtime `src/config.ts` loads only the exported manifest for deployment addresses, ABI paths, chain/network and Uniswap configuration. Boot checks ABI hashes, chain ID, code and hook/router/Annex/Pages bindings. Factories and WETH are checked against the router. Unknown-chain switch failures offer the unchanged wallet_addEthereumChain parameters and switch again.

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
| `#/pages/<handle>` | Handle registration/trades, claim sentence, abandon, recycle and deferred burn |
| `#/feedback`, `#/?tab=feedback` | Unchanged signed Feedback intake and board |
| `#/about` | Full caveat, mechanics, identity explanation, contracts and agent documents |

Hit rate excludes no-data outcomes and always has its settled sample beside it. Contract score is still read as part of the immutable record tuple but has no rendered surface. Missing history, backing reads or receipt amounts are disclosed rather than shown as zero. A WETH-funded trade may show its historical IMD equivalent, explicitly approximate; when that quote is unavailable it shows WETH and says the equivalent is unavailable. Neither value enters transaction or settlement math.

## Validation

From `web/`, with Playwright installed outside the repository and Chromium available:

```sh
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
