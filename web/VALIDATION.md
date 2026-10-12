# Marginalia v2 — worker validation

2026-10-12. Complete for the stated frontend scope, with the explicit USD fallback and unperformed live signing checks below. These are worker observations, not independent certification or hosting approval. No transaction was broadcast.

## Scope and assumptions

Continued the accepted React/Vite/TypeScript/viem app, ledger appearance, runtime manifest and history loader. Added scoreboard/prize, receipt attribution/index, duels, author scoreboards, canvas sharing, guided first notes, seal approval and local draft flow, and agent documents. Hash routes implement the brief's page paths for static hosting. No page-market feature, identity claim, new deployment, dependency update, build-configuration edit, ignore-file change or backend was introduced.

The supplied handoff names no USD oracle or price service. Following the pinned Ethereum UX rule, amounts remain live IMD values with “USD context unavailable”; no price or address is guessed. Wallet hit rate uses the four stated on-chain outcome counters; no-data is excluded from that ratio and still penalizes the score. Weighted wins and receipt rankings are explicitly based on loaded history. A released deposit does not reveal the historical original bond amount.

Root agent docs were missing in the supplied tree. Added interface documentation based on the existing source and ABIs and copied it verbatim into the export; these are product documents, not new authority to sign or deploy.

## Checks run

The repository's package/lockfile, Vite and TypeScript configuration stayed unchanged. Installed with `npm ci --prefix /tmp/marginalia-v2/web --cache /tmp/marginalia-npm-cache --ignore-scripts --no-audit --no-fund`, then copied current source/public/scripts/tests and unchanged configuration into that isolated tree. The first installation attempt without a temporary npm cache was refused by the filesystem; the temporary-cache invocation succeeded. No dependency directories or cache archives enter the submission.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass, TypeScript strict checks |
| `npm run build` | Pass, production relative-base Vite export; retained >500kB chunk advisory, about 607kB main JS / 184kB gzip |
| `npm run manifest` and `npm run check` | Pass: 2 handoff-bound contracts, 11 inventoried assets, exact network/walletAddChain, canonical ABI Keccaks, SHA-256 inventory, verbatim agent docs |
| esbuild + Node `tests/v2-unit.ts` | 5 groups pass: strict receipt hosts, authorship preservation, duel rules, bigint ranking and empty rates, weighted wins |
| esbuild + Node `tests/revision-unit.ts` | 9 retained scenarios pass: exact amounts, target boundaries, refunds, errors, history retention and reorg handling |
| esbuild + Node `tests/history-unit.ts` | 7 retained scenarios pass: deployment backfill, returning gaps, bounded cursors, refused ranges, migration, reorgs |
| `tests/v2-browser.mjs` | 21 production-browser scenarios pass; exact results in `validation/v2/results.json` |
| `tests/live-read.ts` through the supplied worker RPC | Pass at block 26174067: chain 1, nonempty deployed code, companions, canonical venue constants, venue derivation, seal hash/key, ABI subsets/canonical hashes; live noteCount 0 |
| Additional live prize reads | Block 26174125: week 2962; thesis pool 318035289680921038634 wei IMD; 0 eligible theses; MARG/IMD price 23062886163929 in contract units; recorded in `validation/v2/live-prize.json` |
| Permitted-path / size inspection | Protected configuration/dependencies unchanged; no submodule or generated dependency directory added; final byte inventory in `validation/v2/submission.json` |

The browser connector returned `Transport closed`. Local Playwright (installed tool module, Chromium 154) owned and closed a foreground `/preview/` server and browser instead. The export was served under a subpath. RPC/wallet calls were intercepted; outside requests were blocked. Fixture addresses, records, dates, signatures and receipts are test data, not deployed configuration. The legacy `revision-browser.mjs` remains a v1 reproduction harness; v2's runner replaces superseded disabled-seal and author-layout assertions.

The 21 browser cases cover scoreboard ordering and sort behavior; empty/incomplete records; attribution and cited filtering; duel/author records and counter prefill; three-step first posting and presets; exact router and hook approvals; seal checkpoint privacy; local draft persistence/storage failure; immature/expired/mismatched reveals; missing/wrong chains and exact add-chain params; pending confirmation/refetch; share image/text clipboard and download fallback; zero share network calls; retained observe/settle/forfeit/claim/sweep controls; CCIP isolation; verbatim agent links; keyboard focus; and responsive light/dark layouts. Rejections return actionable errors and release the correct control.

## Better Interface review

Read the supplied workflow, all six domain core sections and the design-documentation section, plus the pinned Ethereum UX reference. Reviewed source, production interactions and rendered screenshots. New behavior uses the established native controls, serif/mono stacks and paper/ink tokens.

| Domain | Coverage and outcome |
| --- | --- |
| Accessibility | Checked labels, native buttons/links/details/radios, pressed sort state, live result/error text, 44px primary controls, skip link and route focus. Keyboard focus was visibly inspected in dark mode. No timed announcements on each clock tick. Screen-reader, physical-device and forced-colors sessions unperformed. |
| Layout | Home checked at 320, 390, 768 and 1440px; Note, Duel, Author, Post, Seal, Pools and About at 320/390px. No document horizontal overflow. Duplex calls remain side by side. Doubled root text reflows; native 200% browser zoom unperformed. |
| Writing | Checked requested tagline/reasons/hold-rule sentence, honest attribution, neutral claims, explicit rate denominator and partial-history limitations, local-draft warning, clear error recovery. No invented dollar price, identity or winner. |
| Typography | Retained 17px serif body and mono addresses/numbers. Increased address-input text to 17px. Checked long URLs, full addresses, wrapped duel text, bounded card content and score numerals. System fonts may differ on other hosts. |
| Colors | Computed actual body/link/secondary/tag colors in both themes; measured pairs below. Replaced failing dark link text with the semantic accent-text token. No claim that every possible state/background was measured. |
| UI | Checked sorting, first-post progression/back, preset selection, loading/empty/error/partial records, pending/rejected/confirmed mock actions, inline share output, reveal windows and fallback downloads. Existing short transitions honor reduced motion. No new modal, animation sequence or icon system. Slow-motion animation-panel review not applicable to new behavior and unperformed for retained transitions. |

Measured contrast ratios from computed browser colors (`validation/v2/metrics.json`):

| Foreground / surface | Light | Dark |
| --- | --- | --- |
| Ink / paper | 15.40:1 | 14.79:1 |
| Secondary / paper | 6.91:1 | 8.00:1 |
| Link / paper | 5.69:1 | 9.03:1 |
| Accent text / tag | 5.10:1 | 7.69:1 |

## Findings fixed and rechecked

| Severity | Source | Evidence, correction and recheck |
| --- | --- | --- |
| Critical privacy | `src/checkpoint.tsx:8` | Shared checkpoint previously received the private seal draft in public calldata. Source confirms checkpointVenue uses only X/venue. Seal checkpoints now send fixed public unused fields and empty text. Browser decoded wallet calldata and every relevant simulation; private text/side/target/parent were absent. Exact seal hash and reveal behavior still pass. |
| Critical approval gate | `src/pages/Seal.tsx:33` | V1 intentionally disabled sealing. V2's explicit exception is restricted to this page: verified live STAMP must equal 0.1 IMD; approve targets the runtime hook for that exact amount. Browser decoded 100000000000000000 wei to the hook and verified posting still approves only the router. |
| High state integrity | `src/chain.ts:282` | A generic read could otherwise expose a previous wallet's cached allowance during a subject change, or a refetch gap could release approval state early. Reads bind results to identity and awaited refresh, preserving same-subject polling. Rejection, delayed confirmation and subsequent fresh-allowance cases pass. |
| High runtime binding | `src/config.ts:133`, `src/chain.ts:72` | Startup now reads manifest ABI paths and checks canonical hashes, verifies the RPC chain/nonempty code and pool binding before the app offers actions. Manifest/ABI checks and live chain reads pass. This does not certify arbitrary deployed behavior. |
| Medium attribution | `src/scoreboard.ts:9`, `src/receipts.tsx:3` | Added exact-host leading-status parser with separate cited metadata, never assignment to Note.author. Spoofed host/userinfo/mid-text cases fail parsing; UI and ranking tests preserve posting wallets. |
| Medium contrast | `src/styles.css:160` | Prior dark rust small text was below 4.5:1. A separate light/dark accent-text/focus role preserves the primary fill and yields measured link ratios 5.69/9.03. Dark focused screenshot inspected. |
| Medium state copy | `src/pages/Feed.tsx:51`, `src/lib.ts` | Released bonds formerly rendered as “…” and no-data copy incorrectly implied a wrong-counter increment. Now state released/forfeited plainly and distinguish a score penalty from the wrong counter. Source matches settlement implementation; record/unit checks pass. |
| Low card wrapping | `src/share.tsx:25` | First card preview split ordinary words and let raw citation URLs dominate the claim. Cards now wrap words, split only overlong tokens, keep attribution on two lines and use the rationale after a leading receipt URL. Final duel card inspected; 1200×630 and clipboard tests pass. |

No unresolved address, approval or remote-script finding was observed in this worker review. This is not an independent audit or authorization to host.

## Evidence and remaining limits

Inspected screenshots: `validation/v2/home-1440.png`, `home-390.png`, `home-dark-focus.png`, `author-390.png`, `duel-390.png`, `share-duel.png`; `post-390.png` captures the retained experienced-wallet form. All screenshots use labeled mock data and are review artifacts, not public live-record claims.

No real wallet signature, token approval, checkpoint, seal, reveal, swap, settlement, claim or sweep was broadcast. Mock transactions establish builder/control behavior, not live liquidity, inclusion, future oracle payouts or real wallet UX. The live hook had no notes and an uninitialized checkpoint during the read check, so populated records were necessarily mocked. Native clipboard permissions on iOS/other browsers, full screen-reader behavior, physical devices, native zoom, ENS resolution and real social unfurls remain unverified. The supplied handoff has no USD source; no dollar approximation is claimed. Share generation is client-only; a per-page OG image service is out of scope.

The source/export is ready for the network's independent review. Only the network controls publication. The worker has not edited Git internals or published the site.
