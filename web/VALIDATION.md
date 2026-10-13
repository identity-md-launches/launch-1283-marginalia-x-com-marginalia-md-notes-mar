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
