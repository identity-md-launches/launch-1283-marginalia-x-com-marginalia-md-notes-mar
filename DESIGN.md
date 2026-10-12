# Marginalia site — design

Source of truth: `web/src/styles.css` (tokens and global styles), `web/src/ui.tsx` (shared components),
`web/src/pages/*.tsx` (page composition). Extracted from the final source of the Marginalia front end.

## Overview

The audience is people who read and write bonded notes about tokens and want to see the record the chain keeps.
The visual character is **a ledger, not a terminal**: paper and ink, serif text, hairline rules between entries,
one rust accent for links and the one primary action on a page. There are no gradients, shadows, glass, charts
or imagery; the only mark is the manicule ☞ beside the word Marginalia in the masthead.

System-wide rules: one column, mobile first, 17 px base, a reading measure of 40 rem for prose and forms, a page
width of 44 rem. Hierarchy comes from weight, size and spacing rather than colour. Monospace is used only for
addresses, hashes and ids. Page-specific arrangements (the record table on the author page, the two numbered
steps on the post page) are not rules for other pages.

## Colors

Defined as CSS custom properties on `:root` in `web/src/styles.css`, with a `prefers-color-scheme: dark`
override of the same names. Hex is the canonical format.

| Token | Light | Dark | Job |
| --- | --- | --- | --- |
| `--paper` | `#f6f1e7` | `#15130f` | page background |
| `--ink` | `#1d1a16` | `#ece5d6` | body text, borders of buttons |
| `--ink-soft` | `#5a5146` | `#b4a995` | secondary text, hints, meta lines |
| `--rust` | `#b9471f` | `#b9471f` | links, primary button, focus ring, open-status tag, notice bar |
| `--rust-ink` | `#ffffff` | `#ffffff` | text on the primary button |
| `--rule` | `#d9cfbd` | `#3a342b` | hairlines between entries, field borders, table rules |
| `--field` | `#fffdf8` | `#1d1a16` | input and secondary button background |
| `--tag` | `#ece5d6` | `#272219` | status tags, notices, hover background |
| `--ok` | `#3f6b3a` | `#8fc287` | right-status tag, confirmed text |
| `--bad` | `#8f2a1c` | `#e3907e` | wrong/forfeited tag, errors |

Status is never colour alone: every tag carries its word (`.tag` text) and errors carry text with `role="alert"`.
Contrast ratios were not measured in a browser during this assignment (see `web/VALIDATION.md`); the light
pairs are chosen to be dark-on-light with large margins, the rust-on-paper link pair is the one to re-check.

## Typography

- Body: `--font-serif` = Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif. System
  fonts only; nothing is downloaded.
- Code, addresses, ids: `--font-mono` = ui-monospace, SF Mono, Menlo, Consolas, Liberation Mono, monospace, at
  0.85 em of the surrounding text (`.mono`, `.addr`, `code`).
- Base 17 px (`html`), line height 1.5, `font-variant-numeric: tabular-nums` on `body` so counts and amounts
  align. `overflow-wrap: anywhere` keeps long hashes from overflowing a 320 px viewport.
- Roles: `h1` 1.6 rem / 600; `h2` 1.3 rem / 600 with 2 rem top space; `h3` 1.05 rem / 600; `.lede` 1.05 rem in
  `--ink-soft`; `.small`, `.hint`, `.entry-meta` 0.88 rem in `--ink-soft`; `.tag` 0.78 rem / 600 uppercase with
  0.02 em tracking. Headings use `text-wrap: balance`.
- Prose and lists are capped at `--measure` (40 rem).

## Layout

- `.page`: max-width 44 rem, centred, 1 rem side padding, one column at every width.
- Spacing scale: `--space-1` 0.25 rem through `--space-8` 2 rem (1, 2, 3, 4, 6, 8 quarter-rems).
- `.masthead`: brand left, nav right (`margin-left: auto`), wraps under 44 rem; nav links are 44 px tall.
- `.walletbar`: one line of state text plus at most one action (connect, or switch chain), wraps on narrow widths.
- `.ledger` / `.entry`: the list of notes; each entry is a status tag, the token and claim on one line
  (`.entry-head`, wraps), the text beneath (`.entry-text`, theses clamped to 6 lines in the feed), then
  author, bond, class and date in `.entry-meta`.
- `dl.facts`: two-column definition grid (`max-content 1fr`) that collapses to one column under 420 px.
- `.filters`: one column, two columns from 560 px.
- Tables (`table`) are full width within the measure, numeric columns right-aligned (`.num`).
- Observed in the browser: see `web/VALIDATION.md`; widths not checked there are untested.

## Elevation & Depth

Flat by design. The only depth cues are 1 px hairlines in `--rule` and a 3 px left bar in `--rust` on
`.notice` (`--ok` / `--bad` variants). No shadows, no overlays, no stacking beyond normal flow.

## Shapes

`--radius: 2px` on buttons, inputs, tags, fieldsets and notices: barely rounded, so the page reads as print.
Buttons and inputs are 44 px tall minimum (`min-height`), fields full-width up to the measure.

## Components (all in `web/src/ui.tsx` unless noted)

- **Buttons** (`styles.css`): `button` default is ink outline on `--field`; `.primary` is rust fill with white
  text, one per section; `.quiet` is a hairline-bordered secondary (refresh, copy). Disabled state is 55 %
  opacity with `not-allowed`.
- **TxButton**: one on-chain action with its own pending state (`busy`), label switching to `busyLabel`,
  `aria-busy`, and inline status: sent (with tx link), confirmed (`role="status"`), or failed (`role="alert"`,
  human-readable reason from `lib.ts explainError`). Disabled unless the wallet is connected on the right chain.
  Always released in `finally`.
- **WalletBar**: the four-state strip (no wallet / connect / switch to Ethereum / connected as …) with one
  primary control at a time; chain switch falls back to `wallet_addEthereumChain` with the manifest's
  `walletAddChain`.
- **Addr**: short address in monospace linking to the explorer, with a `copy` button labelled for screen readers.
- **StatusTag**: `.tag` plus a status class (`open`, `right`, `wrong`, `forfeited`, …) from `lib.ts STATUS_CLASS`.
- **Notice**: `.notice` with optional `ok` / `bad`; `bad` has `role="alert"`.
- **Countdown**: tabular `fmtDuration` countdown driven by the shared one-second clock in `chain.ts useNow`.
- **Masthead / Footer**: brand with manicule, section nav with `aria-current`, footer with the canonical links,
  full hook and MARG addresses and the fixed disclaimer line.
- **CallFields** (`web/src/form.tsx`): the shared call form (token, venue finder radio list, side, target,
  horizon, text with byte count, parent) used by Post and Seal; hints are `.hint` under each label.
- **Entry** (`web/src/pages/Feed.tsx`): one ledger row for a note; reused on author, note (children) and pools.

## Do's and Don'ts

- Start a new page from `.page` → `Masthead` → `WalletBar` → `main` → `Footer` (see `App.tsx`); add a route in
  `App.tsx` and a nav item in `ui.tsx NAV`.
- Use `.lede` for the one-paragraph explanation at the top, `h2` for sections, `dl.facts` for key/value state,
  `.ledger` + `Entry` for lists of notes, `table` only for numeric records.
- One `.primary` action per section; every chain write goes through `TxButton`, never a bare `button`.
- Keep copy plain and literal: a bonded feed, not a perp DEX, not a prediction market; nothing pays for being
  right; never promise returns; never say "buy" for posting (it is "post", the MARG leg is "a MARG purchase").
- Do not add colours outside the token table, gradients, shadows, icons other than the manicule, or charts.
- Addresses, hashes and ids are the only monospace; everything else is the serif stack.
- Do not hard-code an address: contracts come from `imd-deployment.json` at runtime, companions from the hook.
