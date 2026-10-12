# Marginalia site v2

A static scoreboard for the live Marginalia launch on Ethereum. React 19, TypeScript, Vite and viem retain the v1 ledger, bounded history loader and transaction builders. The app has no backend or remote scripts. Publish only repository-root `dist/`; hash routes and a relative base work under gateway subpaths.

## Pages

| Route | Reader/writer purpose | Actions |
| --- | --- | --- |
| `#/` | Weekly prize and clock, wallet scores, cited accounts, open duels, recent verdicts, feed | Read, sort, follow calls |
| `#/feed` | Filter notes by token, wallet, kind or `?cites=handle` | Read receipts |
| `#/note/<hex-id>` | Claim, author, citation, horizon, observations and outcome | Share; counter; observe, settle, forfeit thesis, claim |
| `#/duel/<counter-hex-id>` | Both calls, authors, records, bonds and independent verdicts | Share; open either note's actions |
| `#/author/<address>` | Net score, hit rate, weighted wins, broken holds, notes and duels | Share; link to claims |
| `#/post` | Three-step first note; full form for experienced wallets; thesis option | Checkpoint, exact router approval, post |
| `#/post?counter=<id>` | Same X, opposite side and parent prefilled | Post counter-call |
| `#/post?kind=thesis` | Enter a thesis for the weekly record | Post thesis |
| `#/seal` | Local draft, checkpoint, exact stamp approval, seal/reveal timeline | Approve 0.1 IMD to hook; seal; open saved reveal |
| `#/pools` | Existing daily refunds, weekly pools, claims and eligible sweeps | Claim deposit/refund; sweep |
| `#/about` | One-line mechanics, contracts and agent documents | Read `./llms.txt` and `./agents.md` |

Path-style routes in the brief are represented by hash routes so no server rewrite is required. The page market is out of scope.

## Configuration and transaction rules

`dist/imd-deployment.json` is the runtime source for deployment addresses, chain, ABI paths and network. `src/config.ts` loads it, verifies the referenced ABI Keccaks, and centralizes the launch block and retained canonical venue constants. Typed ABI subsets remain in `src/abi.ts`; `public/abi/*.json` are the unchanged implementation-derived exports. `loadContracts` verifies RPC chain/code, hook token/IMD bindings, the live pool key, and reads router/judge/treasury from the hook. The optional handoff poolKey must match if supplied. Venue factories/WETH are cross-checked against router constants.

Wallets use EIP-1193 injection. Unknown-chain switching offers the handoff's exact `wallet_addEthereumChain` parameters. No WalletConnect ID or secret configuration is needed. Browser reads use only the approved public RPCs; worker validation uses the supplied loopback relay without publishing it.

- Posting approval: IMD to the runtime router, exactly stamp + MARG allocation + chosen bond, only when allowance is short.
- Seal-only exception: IMD to the runtime hook, exactly STAMP = 0.1 IMD; a differing live stamp disables sealing. No other hook approval is offered.
- Every transaction is simulated before requesting a signature and stays pending through confirmation. Approval refreshes are awaited. Reads invalidate previous-wallet/subject eligibility while preserving same-subject polling state.
- Seals save the exact draft locally before simulation/signing. Seal checkpoint calldata contains only public X/venue and fixed unused fields, never the private draft. Reveal requires the same author, hash and subject, within 30 minutes–6 hours; its deadline is capped at expiry. An expired or changed reveal never silently becomes an ordinary post.
- Browser storage is unencrypted. Clearing storage loses local seal drafts and cached history. Keep the original parameters with the author until reveal.

No USD feed, stablecoin quote or price service is supplied by the verified handoff. Per the pinned Ethereum UX fallback, prize and costs show IMD and **USD context unavailable**; no dollar value or new oracle address is invented. The existing live MARG/IMD read still supplies the post output minimum.

## Records and receipts

Authors come from `NotePosted`, then rank by live `records(address).score` or hit rate. Hit rate = right / (right + wrong + broken + retracted); open/thesis/no-data outcomes are excluded. No-data outcomes still penalize score. A dash means no counted outcome. Difficulty-weighted wins sum positive RIGHT `Settled.scoreDelta` values in loaded history, separately from net score and judged wins.

A leading exact-host x.com/twitter.com status URL adds a citation. It never replaces the wallet author. The cited account did not post the note. Cited accounts rank by the number of right receipt notes; all verdict categories remain visible. The site cannot authenticate the original post, identity or endorsement. A writer can cite a call more than once; the index counts notes, not verified unique public calls.

Duels require another wallet's parent call, the same X and the opposite side. Either open leg keeps a duel open. Both can be right at their own horizons. Released/forfeited deposits are labeled honestly; the contract's current state does not expose a historical original bond after release.

History retains the v1 bounded scanner: 2,000-block chunks, up to four recent plus four historical chunks per refresh, persisted ranges/cursor, 64-block overlap and a reorg anchor. Partial coverage and unavailable records remain explicit. Leaderboard discovery, citations, weighted wins and duels depend on loaded history; records themselves are live contract reads. Refresh/Load more history continues coverage. Prize reads poll every 30 seconds; transaction prerequisites every 15 seconds.

## Sharing and agent documents

Every note, duel and author has a client-side 1200×630 canvas card. It uses local fonts and text only, writes image/png plus text/plain to the clipboard, and falls back to a PNG download with selectable text. No rendering service is called. The inherited generic OG card remains; per-page unfurl images require the later service and are not claimed here.

Root `llms.txt` and `AGENTS.md` were absent in the supplied tree. V2 adds deployment/interface documentation and copies both verbatim to `dist/llms.txt` and `dist/agents.md` during manifest generation. Both are inventoried and hash-checked.

## Build and preview

```sh
cd web
npm ci --cache /tmp/marginalia-npm-cache --no-audit --no-fund
npm run typecheck
npm run build
node scripts/manifest.mjs /path/to/deployment.json /path/to/network.json
node scripts/check.mjs /path/to/deployment.json /path/to/network.json
npm run preview
```

The manifest scripts default to the task's `.imd/reads` files while supplied; operators must retain the verified handoff for later rebuilds. Regenerate the manifest after any export change. The scripts check exact network/handoff, canonical ABI hashes, every SHA-256 and verbatim agent docs. Source and the unchanged lockfile accompany the final export.

This worker used an isolated `/tmp/marginalia-v2/web` copy with the identical manifest, lockfile and configuration, leaving all repository dependency and build-configuration paths untouched. Copy root agent docs and the supplied handoff into that tree before running manifest/check. Copy only the resulting `dist/` back. No registry archive or dependency cache is part of delivery.

## Validation

See `VALIDATION.md` and root `DESIGN.md`. From `web/`, with the lockfile dependencies installed:

```sh
mkdir -p ../test/scratch
./node_modules/.bin/esbuild tests/v2-unit.ts --bundle --platform=node --format=esm --outfile=../test/scratch/v2-unit.mjs
node ../test/scratch/v2-unit.mjs
./node_modules/.bin/esbuild tests/revision-unit.ts --bundle --platform=node --format=esm --outfile=../test/scratch/revision-unit.mjs
node ../test/scratch/revision-unit.mjs
./node_modules/.bin/esbuild tests/history-unit.ts --bundle --platform=node --format=esm --outfile=../test/scratch/history-unit.mjs
node ../test/scratch/history-unit.mjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/marginalia-browsers PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs EVIDENCE_DIR=../test/scratch/v2-browser node tests/v2-browser.mjs
```

The browser runner owns and closes a local static server under `/preview/`, mocks RPC/wallet, blocks other requests and broadcasts nothing. Its accounts and datasets are fixtures. Playwright may be installed separately under `/tmp`; it is not a project dependency. `tests/revision-browser.mjs` is retained as the historical v1 reproduction harness; v2 replaces its superseded author layout and disabled-seal expectations. `tests/live-read.ts` bundles like the unit tests; pass the worker-approved RPC and absolute `dist/imd-deployment.json` path for read-only code/ABI/encoding checks.
