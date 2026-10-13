# Marginalia v3.2 design

## Overview

The implemented interface keeps the project's paper ledger and puts the trade composer on the first screen. `web/src/styles.css` is the token source; `web/src/pages/Home.tsx` and `web/src/trade.tsx` define the primary layout. The headline is “Trade it. Say why.”, followed by “The chain keeps the receipt.” The required swarm caveat sits before the composer, and the retained prize, records, receipts and duels follow it. Version 3.2 adds a fifth Feedback composer tab while retaining the author’s child-call path. It adds no fonts, colors or layout breakpoints. The Feedback surface presents the immutable rules first, then the signature-only form and public weekly record.

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

Themes follow `prefers-color-scheme`; verdicts also have text labels. Final rendered Feedback text/field contrast measured 17.05:1 light and 13.82:1 dark; secondary/field 7.65:1 and 7.47:1; white/primary action fill 5.27:1 in both (`web/validation/v3.2/feedback-contrast.json`). The layout is flat: rules, underlines and a stronger top rule on the composer, with no decorative shadows or gradients. Focus has an explicit two-pixel perimeter; forced-colors uses `Highlight`.

Spacing tokens are 0.25, 0.5, 0.75, 1, 1.5 and 2rem. Radius is 2px. The prose measure is 40rem, ordinary page width 44rem, record/feed width 70rem and composer width 34rem. Compact composer spacing is explicit in its component classes.

## Typography

Local system serif stack: Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif. Addresses and code use the system monospace stack. No font download is needed. Text is selectable and tabular numerals align live values.

The final role scale has five sizes: small 0.88rem, body 1rem, section 1.3rem, title 1.6rem and display 2rem. Body root is 17px, reduced to 16px at widths up to 420px; editable fields remain 1rem. Weight roles are 400, 600 and 700, with h1 at 700. The mobile home headline uses title size; desktop uses display. The headline is the heaviest role. Former tracked capitals and small mono labels now use ordinary sentence case. Hashes, long values and dollar estimates wrap; editable token fields may ellipsize visually while retaining the entire selectable value.

## Components and behavior

- `Masthead`, `WalletBar`, `WalletAction`: compact brand and wallet control, wrapping navigation, visible chain state and one active switch-network control. The skip link and route focus support keyboard navigation.
- `TradeForm`: token picker, pay/receive columns, direction/target presets, horizon, one-line reason and conviction slider. The cost and current approval/checkpoint/trade action stay together. Venue details reveal depth, fees, custom target/horizon, older v4 PoolKey entry and quote source. Polling preserves pending action labels and locks form fields until receipt confirmation.
- `Caveat`: non-dismissible paragraph before the home composer and in every loaded-page footer, as requested.
- `UsdContext`, `DollarSource`: estimates beside live token amounts, labeled source and an explicit unavailable fallback. USD is informational.
- `PostPage`, `SealPage`: retained guided call/thesis and seal/reveal flows. The five composer choices are native pressed-state buttons. Checkpoint timers do not announce every tick; drafts remain in browser storage.
- `Feedback` (`web/src/feedback.tsx`): accepts the existing wallet and clock, without requiring contract context. The always-visible immutable/open lists share `web/shared/feedback.js` with the Worker’s oracle document. The form uses native labels, select, textarea and input, a UTF-8 byte counter, an explicit signing wallet and an exact-JSON disclosure. One primary action progresses through connect, sign, post and retry. Pending disables the fieldset; errors announce and focus invalid fields; rejection preserves text. Drafts stay in page memory across tab/boot changes, never local storage. The newest-first board, picked card and adopted ledger use flat ruled rows, full wrapping IDs and explicit loading/empty/error/retry states. Handles are self-reported and note badges require positive on-chain evidence. No badges, data or credits are invented for empty states.
- `ThesisParentField`, `ChildCallContext` (`web/src/child-call.tsx`): a native labeled input, associated hint/error, `aria-invalid` and polite status text; an optional retry appears only for a failed chain read. The valid context links the shortened thesis ID to its receipt and shows the due date. The trade field uses native `details` below the main action, labeled “Parent thesis (optional)”, opening automatically when a parent is supplied. In call mode it occupies the existing parent position beside the final writing step. Full input values remain selectable.
- `NotePage` (`web/src/pages/Note.tsx`): an eligible author sees a primary navigation link, “Post the child call”, immediately below the thesis heading, before its potentially long text. The same primary fill used by other actions establishes priority. The thesis completion notice in `PostPage` links directly to this composer and includes the due date.
- `Entry`, `NoteVenue`, `AnnexNote`: wallet-attributed receipt, optional supplied citation, swap-proven badge, current venue depth and Radar link, live lifecycle controls. A cited handle never replaces the wallet author. An open thesis with zero on-chain children shows the plain-text “needs its child call” state; it uses the existing small-text role, with no extra badge or color.
- `Prize`, `Leaderboards`, `DuelPair`, `AuthorPage`: existing record comparisons. Partial history and read failures are disclosed; no invented record fills an empty state.
- `PagesPanel`: renders nothing without a manifest address. When configured, exposes the capped curve, holdings/eligibility, exact approval and trade, registration, exact claim sentence, pending claim/escrow lifecycle and reserved burn.
- `TxButton`, `Notice`: simulation/signature/pending/confirmed/error states with transaction links. Buttons remain disabled while pending. Native details provide progressive disclosure; no modal traps are introduced.
- `Share`: existing local 1200×630 canvas receipt/duel/author cards with bounded wrapping, clipboard and download fallback. The generic share PNG uses the new tagline and caveat.

## Responsive layout

At 390×844 the brand/wallet, tagline, complete caveat, composer fields and main action fit on the first screen. The same home layout and long numeric values are checked at 320px without document overflow. Pay/receive stay two columns; the five composer choices use two rows: three equal choices above two equal choices, implemented with a six-column grid and spans of two/three. All flex/grid children that carry variable values can shrink and wrap. The venue select and manual PoolKey stay inside the column. The new optional parent disclosure sits after the primary action so the default first screen retains its existing density. The child context wraps above the fields when present, with a 1.4 line height and `--space-1` bottom margin; the 390px child composer still shows its main action within the first 844px. Both themes and 320/390/1440px child surfaces were exercised in Chromium and WebKit.

From 740px the navigation sits beside the brand and wallet. The composer stays centered and narrow even on the wide scoreboard route. Leaderboards stack below 50rem; prize panels and seal steps stack below 34rem. Duels keep two `minmax(0,1fr)` legs to preserve comparison. Other native tables retain their local scroll container. Transaction controls are at least 44px; compact presets/tabs and header controls remain at least 24px with spacing, generally 34–40px.

Feedback uses `--space-2` within metadata and `--space-4` between entries, a ruled form boundary and no nested cards. Details summaries are at least 44px high; the full-width submit action is at least 44px. The immutable list remains expanded by request, so the Feedback form naturally follows below it on a phone. The default home trade action still fits within the first 390×844 screen. Feedback long text, exact JSON, wallet addresses and IDs reflow at 320/390/768/1440 in light and dark Chromium/WebKit checks. The read-only signing preview uses pre-wrap; it is the only new code-style block.

Only the retained short color/underline transitions animate; reduced-motion preferences disable them. No infinite or entrance animation is used.

## Review and maintenance

Applied all six pinned Better Interface domains while building. Coverage, measured probe results, corrected findings and unperformed checks are in `web/VALIDATION.md`, with current v3.2 evidence in `web/validation/v3.2/` and historical v3.1 evidence in `web/validation/v3.1/`. Native screen-reader, physical-device, RTL and browser-native zoom checks are not claimed. The v3.2 probe’s repetition and mobile prose-budget flags reflect the brief’s mandatory repeated caveat and preserved composer copy; this content is retained deliberately.

Reuse the five text roles, native controls, paper/ink roles and transaction state components. New views should consume verified runtime configuration and scoped live reads, disclose gaps, and keep the relevant action beside its state. Do not add a second deployment address source, implied verified identity, fabricated dollar value, private seal-text access or hidden approval amounts.

Design review references: Jakub Krehel’s Better Interface (MIT, pinned commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`); documentation method from Paul Bakaus’s Impeccable (Apache-2.0, pinned commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`).
