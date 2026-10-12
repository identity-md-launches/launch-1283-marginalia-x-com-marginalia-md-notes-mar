# Marginalia site v2 — implemented design

Source: `web/src/styles.css`, shared `ui.tsx`, `share.tsx`, `form.tsx`, `checkpoint.tsx` and `pages/*.tsx`. This describes the implemented v2 export, not a proposal.

## Overview

Readers compare who was right; writers put a claim on the record. The retained identity is paper, ink, serif type, a manicule and ledger rules. Home prioritizes prize/clock, wallet and citation records, duels, verdicts and feed. It contains no post form. Prose stays brief and factual; contracts and deeper definitions sit behind details or on About. Wallet connection is optional for reading.

## Colors

The canonical notation remains hex. Semantic tokens live in `styles.css`; system dark preference overrides the same roles.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--paper` | `#f6f1e7` | `#15130f` | Page |
| `--ink` | `#1d1a16` | `#ece5d6` | Primary text, structural emphasis |
| `--ink-soft` | `#5a5146` | `#b4a995` | Hints, metadata, labels |
| `--field` | `#fffdf8` | `#1d1a16` | Fields and prize surface |
| `--rule` | `#d9cfbd` | `#3a342b` | Separators and fields |
| `--tag` | `#ece5d6` | `#272219` | Tags, notices, selected presets |
| `--rust` / `--rust-ink` | `#b9471f` / `#ffffff` | Same | Filled primary action and its text |
| `--accent-text`, `--focus` | `#a63c18` | `#f1a281` | Links, open labels, focus perimeter |
| `--accent-hover` | `#9e3b18` | Same | Primary hover fill |
| `--ok` | `#3f6b3a` | `#8fc287` | Right/confirmed |
| `--bad` | `#8f2a1c` | `#e3907e` | Wrong/forfeited/error |

V2 separates accent text from the retained button fill to fix dark small-text contrast. Actual computed contrast measurements and their tested surfaces are recorded in `web/validation/v2/metrics.json` and `web/VALIDATION.md`. Every status also has a word. The share canvas deliberately uses the light paper/ink palette for exported images regardless of browser theme.

## Typography

Body is 17px, unitless line-height 1.5, system serif stack: Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif. No font is downloaded. Weight requests use 400/600; actual system face availability varies. The mono stack is ui-monospace, SF Mono, Menlo, Consolas, Liberation Mono, monospace; use it for addresses, ranks, hashes and small ledger labels.

Standard h1/h2/h3 are 1.6/1.3/1.05rem, weight 600 and line-height 1.2. Home h1 is `clamp(1.85rem,4vw,2.8rem)` with -0.035em tracking. Prize amount is `clamp(2rem,5vw,3.4rem)`; counters are tabular throughout. Small text is 0.88rem; eyebrow labels are 0.76rem monospace with 0.08em tracking. Editable fields, including address fields, are at least 1rem (17px). Prose is capped at 40rem, wraps arbitrary hashes/URLs, and remains selectable. Long theses have a feed preview and a full note page.

Share cards are exactly 1200×630. They use Georgia and monospace at explicit canvas sizes, wrap words with a character fallback for long tokens, and bound line counts. A receipt's raw URL is omitted from its share rationale; the cited handle and non-authorship notice remain. The full original text stays on the note page.

## Layout

The spacing scale is 0.25, 0.5, 0.75, 1, 1.5 and 2rem. Standard pages max out at 44rem; scoreboard, feed and duel routes use 70rem. All pages have 1rem side padding. Forms and long prose retain the 40rem measure.

Home's two leaderboard columns use 1.2fr/1fr with 2.5rem gap, stacking below 50rem. Prize amount/clock use two columns, stacking below 34rem. Duel legs remain side by side with `minmax(0,1fr)` even on phones, preserving the comparison; inner padding and text size reduce below 34rem. Navigation wraps naturally and uses tighter spacing on phones. The author scoreboard has two columns with weighted wins across both; six record counters form three columns. The first-note step indicator has three equal columns. Seal timeline stacks below 34rem.

Native details keep definitions/history optional. Tables that need width retain their local scroll container; the document itself reflows. Browser evidence covers home at 320, 390, 768 and 1440px and all primary pages at 320/390px. Doubled root text was checked separately from browser-native zoom, which was not tested.

## Elevation & Depth

The interface is flat. Thin rules separate records; the prize has a stronger ink top rule and field background. No gradient, blur or floating panel is introduced. The active sort button uses an inset underline. Share output opens inline, with no modal focus trap required.

## Shapes

The existing radius is 2px. Buttons, fields and tags retain square ledger proportions. Standard controls have a 44px minimum height; the compact copy control retains its 32px height. Content is never clipped to a fixed-height card. The status tag stays on one line and carries its verdict text.

## Components

- `Masthead`, `WalletBar`, `Footer` (`ui.tsx`): navigation, network/account state, informational and bond-loss copy. The first keyboard target is a visible-on-focus skip link; SPA navigation focuses `main`.
- `Addr`, `StatusTag`, `Notice`, `Countdown` (`ui.tsx`): copy/explorer address, labeled verdict, inline alert and tabular clock. Clocks do not announce every tick.
- `TxButton` (`ui.tsx`): per-action pending label, disabled state through confirmation, rejection/revert feedback and transaction link. Approvals await a fresh allowance read.
- `Prize`, `Leaderboards`, `Verdicts` (`pages/Home.tsx`): live pool/eligible reads, pressed-state sorting controls, wallet and citation rankings, compact settled links. Empty/error/partial states never invent records.
- `Citation` (`receipts.tsx`): canonical X/Twitter status link and explicit posting-wallet distinction; no embedded remote content.
- `DuelPair`, `OpenDuels` (`pages/Duel.tsx`): independent legs, horizons, bonds, authors and records, with note links for action controls.
- `CallFields` (`form.tsx`): shared venue finder, side and target presets, horizon, reason and parent. An optional step limits visible fields for first-time posting; all native controls retain labels.
- `Checkpoint` (`checkpoint.tsx`): baseline countdown and eligibility. Seal checkpoints use public unused parameters, protecting the draft from calldata disclosure.
- `Share` (`share.tsx`): one click draws and copies image plus text; fallback download, image preview and selectable/copyable text are inline. Busy and result states are explicit.

Existing 120ms background/underline transitions are gated by reduced-motion preference. No animated page entrance, autoplay or decorative movement was added. Focus is a 2px explicit perimeter; forced-colors uses the system Highlight value.

## Do's and Don'ts

Reuse the standard page for prose/forms and the wide page only for record comparisons. Keep the token roles and system-font stacks. Use one emphasized transactional action at a time; sort controls use pressed state and underline. Add pages through hash routing and preserve the relative runtime manifest. Explain unavailable data and history coverage. Keep receipts separate from wallet identity; show the contract's actual verdict and the current bond state.

A new page should use `useApp` for verified runtime configuration, `useRead` for scoped state, the existing ledger/facts primitives, and `TxButton` for simulation and signing. Do not add hardcoded deployment addresses, unlimited approvals, remote image rendering, fabricated prices or a page-market flow before its contract exists.

Design review used the pinned Better Interface material by Jakub Krehel (MIT), the document reference adapted from Paul Bakaus's Impeccable (Apache-2.0), and the pinned ethskills frontend UX guide by Austin Griffith (MIT). Review coverage and unperformed checks are in `web/VALIDATION.md`.
