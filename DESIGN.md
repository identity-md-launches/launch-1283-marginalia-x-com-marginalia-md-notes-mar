# Marginalia v3 design

The implemented interface keeps the project's paper ledger and puts the trade composer on the first screen. `web/src/styles.css` is the token source; `web/src/pages/Home.tsx` and `web/src/trade.tsx` define the primary layout. The headline is “Trade it. Say why.”, followed by “The chain keeps the receipt.” The required swarm caveat sits before the composer, and the retained prize, records, receipts and duels follow it.

## Tokens and color

| Role | Light | Dark |
| --- | --- | --- |
| Paper | `#f6f1e7` | `#15130f` |
| Ink | `#1d1a16` | `#ece5d6` |
| Secondary ink | `#5a5146` | `#b4a995` |
| Field | `#fffdf8` | `#1d1a16` |
| Rule | `#d9cfbd` | `#3a342b` |
| Tag surface | `#ece5d6` | `#272219` |
| Primary fill / text | `#b9471f` / white | same |
| Link and focus | `#a63c18` | `#f1a281` |
| Success | `#3f6b3a` | `#8fc287` |
| Error | `#8f2a1c` | `#e3907e` |

Themes follow `prefers-color-scheme`; verdicts also have text labels. The layout is flat: rules, underlines and a stronger top rule on the composer, with no decorative shadows or gradients. Focus has an explicit two-pixel perimeter; forced-colors uses `Highlight`.

Spacing tokens are 0.25, 0.5, 0.75, 1, 1.5 and 2rem. Radius is 2px. The prose measure is 40rem, ordinary page width 44rem, record/feed width 70rem and composer width 34rem. Compact composer spacing is explicit in its component classes.

## Typography

Local system serif stack: Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif. Addresses and code use the system monospace stack. No font download is needed. Text is selectable and tabular numerals align live values.

The final role scale has five sizes: small 0.88rem, body 1rem, section 1.3rem, title 1.6rem and display 2rem. Body root is 17px, reduced to 16px at widths up to 420px; editable fields remain 1rem. Weight roles are 400, 600 and 700, with h1 at 700. The mobile home headline uses title size; desktop uses display. The headline is the heaviest role. Former tracked capitals and small mono labels now use ordinary sentence case. Hashes, long values and dollar estimates wrap; editable token fields may ellipsize visually while retaining the entire selectable value.

## Components and behavior

- `Masthead`, `WalletBar`, `WalletAction`: compact brand and wallet control, wrapping navigation, visible chain state and one active switch-network control. The skip link and route focus support keyboard navigation.
- `TradeForm`: token picker, pay/receive columns, direction/target presets, horizon, one-line reason and conviction slider. The cost and current approval/checkpoint/trade action stay together. Venue details reveal depth, fees, custom target/horizon, older v4 PoolKey entry and quote source. Polling preserves pending action labels and locks form fields until receipt confirmation.
- `Caveat`: non-dismissible paragraph before the home composer and in every loaded-page footer, as requested.
- `UsdContext`, `DollarSource`: estimates beside live token amounts, labeled source and an explicit unavailable fallback. USD is informational.
- `PostPage`, `SealPage`: retained guided call/thesis and seal/reveal flows. The four composer choices are native pressed-state buttons. Checkpoint timers do not announce every tick; drafts remain in browser storage.
- `Entry`, `NoteVenue`, `AnnexNote`: wallet-attributed receipt, optional supplied citation, swap-proven badge, current venue depth and Radar link, live lifecycle controls. A cited handle never replaces the wallet author.
- `Prize`, `Leaderboards`, `DuelPair`, `AuthorPage`: existing record comparisons. Partial history and read failures are disclosed; no invented record fills an empty state.
- `PagesPanel`: renders nothing without a manifest address. When configured, exposes the capped curve, holdings/eligibility, exact approval and trade, registration, exact claim sentence, pending claim/escrow lifecycle and reserved burn.
- `TxButton`, `Notice`: simulation/signature/pending/confirmed/error states with transaction links. Buttons remain disabled while pending. Native details provide progressive disclosure; no modal traps are introduced.
- `Share`: existing local 1200×630 canvas receipt/duel/author cards with bounded wrapping, clipboard and download fallback. The generic share PNG uses the new tagline and caveat.

## Responsive layout

At 390×844 the brand/wallet, tagline, complete caveat, composer fields and main action fit on the first screen. The same home layout and long numeric values are checked at 320px without document overflow. Pay/receive stay two columns; the four composer choices form a 2×2 grid. All flex/grid children that carry variable values can shrink and wrap. The venue select and manual PoolKey stay inside the column.

From 740px the navigation sits beside the brand and wallet. The composer stays centered and narrow even on the wide scoreboard route. Leaderboards stack below 50rem; prize panels and seal steps stack below 34rem. Duels keep two `minmax(0,1fr)` legs to preserve comparison. Other native tables retain their local scroll container. Transaction controls are at least 44px; compact presets/tabs and header controls remain at least 24px with spacing, generally 34–40px.

Only the retained short color/underline transitions animate; reduced-motion preferences disable them. No infinite or entrance animation is used.

## Review and maintenance

Applied all six pinned Better Interface domains while building. Coverage, measured probe results, corrected findings and unperformed checks are in `web/VALIDATION.md`. The probe's repetition and mobile prose-budget flags reflect the brief's mandatory repeated caveat, exact conviction explanation and baseline sentence; this content is retained deliberately.

Reuse the five text roles, native controls, paper/ink roles and transaction state components. New views should consume verified runtime configuration and scoped live reads, disclose gaps, and keep the relevant action beside its state. Do not add a second deployment address source, implied verified identity, fabricated dollar value, private seal-text access or hidden approval amounts.
