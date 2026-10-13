# Marginalia v6 design

The final source implements a phone-first social app and a separate compact landing, sharing the established paper, ink and rust theme. `web/src/styles.css` retains the base controls and secondary contract screens; `web/src/app.css` defines the v5 layout and overrides. The UI contains no external font, remote script or animation dependency.

## Tokens and type

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| paper | #f6f1e7 | #15130f | Page, shell, sheet |
| ink | #1d1a16 | #ece5d6 | Primary text |
| ink-soft | #5a5146 | #b4a995 | Supporting text and counts |
| field | #fffdf8 | #1d1a16 | Inputs/cards |
| rule | #d9cfbd | #3a342b | Dividers/borders |
| tag | #ece5d6 | #272219 | Secondary surfaces |
| rust / rust-ink | #b9471f / #ffffff | Same | Primary button |
| accent-text / focus | #a63c18 | #f1a281 | Links, selected tabs, focus |
| ok / bad | #3f6b3a / #8f2a1c | #8fc287 / #e3907e | Status, alongside text |

Root size is 16px. Six role sizes are 14px supporting, 16px body/control, 20px section/name, 24px page title, 32px landing promise and 48px profile hit rate. Weights are 400, 600 and 700; titles and reputation use 700. Body is the system serif stack Iowan Old Style, Palatino, Book Antiqua, Georgia; addresses/parameters use the system monospace stack. No font files are fetched. Body line-height is 1.5, landing title 1.12, reputation 1.1. Numeric values use tabular figures. Small labels remain sentence case with no tracked capitals.

Base spacing tokens are 4/8/12/16/24/32px. The app uses 16px phone gutters (12px below 350px), cards 12px corners, buttons/fields 8px, and the phone sheet 20px upper corners. Desktop dialog corners are 16px. Input text remains 16px to avoid mobile text-entry zoom. Hashes, names and long values wrap; grids use minmax(0,1fr).

## Surfaces and components

The landing has a 38rem maximum measure: wordmark, verbatim promise, three numbered steps, live pot/deadline, one full-width Launch app control, the contracts/site caveat, then footer links. Both light and dark 390×844 browser views show the product and Launch app without scrolling. The promise/caveat take precedence over the generic probe's 60-word budget.

The app has a 44rem maximum width, with borders on larger screens and no desktop sidebar. Its top bar groups the wordmark, weekly pot chip and Feedback. The chip reads “Weekly pot ◈ N.NNNN IMD”, switching to “◈ N.N IMD” at 600px and below; its accessible name retains the full label and precision. It opens Pots. The brand and Feedback never break inside words, and very long amounts wrap within the chip or onto another top-bar row. The bottom bar is Feed, Pages, +, Record, Me: fixed, five equal columns, with a rust central + and safe-area padding. Main content reserves enough bottom space to keep final controls clear of it. At 320px the top bar may wrap and profile actions stack. At 740px the main gutter becomes 24px and compose is centered; below that compose sits at the bottom of the screen.

Cards show a passive avatar/generated mark and posting identity, rate with settled count, age, target/horizon/verdict, a three-line why, bond/trade/parent metadata and Counter/Share/Back. Theses add Read and the child receipt. Claims open the note page. `Entry` in `web/src/pages/Feed.tsx` defaults to the three-line excerpt; its `expanded` prop on the Annex receipt renders the complete selectable text without a self-link. Latest, Settling soon, Theses and Backed are actual filter buttons with aria-pressed state. The Record list orders hit rate then settled count; zero-settled wallets are explicitly unranked. No displayed score or score explanation remains.

Profiles put the 48px hit rate beside its settled sample, then backing counts, one main Back action with the live next-page cost, the exact backing copy, optional own earnings, and Calls/Theses/Backers tabs. Existing Pages controls sit in a native disclosure. Address-derived symmetric marks stay deterministic; only verified live LARP names gain image avatars. No remote avatar bytes become DOM markup.

Compose uses a native modal dialog with its own scroll area, focus containment, Escape/close, scroll locking and focus restoration. The first call controls are Token, five targets, three horizons, Why, Trade it too, the cost/bond line and action. Defaults remain +25%, seven days, 0.25 IMD bond, with the trade default resolved from actual holdings/venue. More contains the less common parameters and one-sentence tap hints. Admission reuses `Hint` for the admission rule, four-hook limit and fee risk; `.admission .field-heading` lets opened hints use the full width instead of squeezing the label. A thesis parent remains visible when discovery resolves through the Annex, with a persistent error explaining the router-venue requirement and disabled transaction controls. The upward hold and thesis seven-day child rules remain visible as required. TxButton owns pending/confirmation/error states and the short send caveat. The full caveat on landing and About distinguishes immutable contracts from a site rebuilt by the swarm, never hot-fixed.

## Pages components and claim states

`web/src/pages/PagesDirectory.tsx` reuses the shell, `Person`, form controls and `TxButton`. `PagesSearch` has a persistent visible label, inline error with focus return, and native form/Enter submission. At `#/pages`, discovery follows search; “Your pages” follows the ranked subjects. `.page-subjects` and `.page-holdings` are semantic lists with shared alignment, one-rem row spacing, subtle separators and wrapped tabular counts. `.page-handle` is a 44px-minimum link. Search uses a flexible input and a fixed-content primary button; no new font, color or type role is introduced.

Discovery scans the complete deployment window in 2,000-block chunks. Subject supply, next-page quotes and current candidate balances share a fixed block. Unread ranges are disclosed in a native details element; failed balances render unknown rather than zero. Refresh retries. “Your pages” offers a native Sell back disclosure with a one-page default, expected receive amount, fee and a 1% output minimum. Selling retains simulation, receipt and wrong-network gates without a token approval or purchase eligibility gate.

On handle pages, `.handle-escrow` precedes trading and groups the 8% escrow explanation, unclaimed/claimed status and recycle date. It uses the existing rule token as a structural inset, not a new accent. The one-page amount and receive line reuse existing backing controls. `.handle-claim` is a native disclosure containing `.claim-steps`, an ordered list: exact sentence/Post on X, tweet URL or ID, then approval/request. Step headings use the body size and weight 600, below the handle page's h1. The live fee is visible. Pending and answered states replace these steps, show deadline/payee, and keep errors recoverable. Only deadline-expired pending requests offer abandon. Existing recycle and deferred-burn controls retain their prerequisites.

The claim and search inputs remain 16px, accept paste, and have explicit invalid-state descriptions. Claim URLs are parsed as data and never fetched. The X composer is a passive external link containing the exact contract-returned sentence. The global send caveat states “Contracts can't change; the site gets rebuilt. Can break. Not advice.”

## Accessibility and state

Native anchors, buttons, inputs, labels, details/summary and dialog preserve keyboard behavior. Every hint has an accessible label; icon-only controls have names; avatars have alt text or an SVG image label. Focus is a visible two-pixel outline, status is text rather than color alone, and forced-color selection has an explicit border. Buttons generally target 44px or more; compact hints are 28px, above the probe's 24px minimum. The inherited reduced-motion rule disables unnecessary transitions. No auto-playing media or timed navigation is introduced.

Reads distinguish loading, missing, failed and partial data. History gaps and unavailable backer/identity/quote reads never masquerade as zero activity. Profile backers use verified fixed-block page balances: gaps can leave undiscovered holders, while a failed balance read shows “Unknown” with Retry backers and lists only verified holdings; share cards carry the same uncertainty. The app shell and Feedback stay reachable when chain verification fails; transaction controls wait for verified contracts and live prerequisites. Wallet rejection, wrong chain, exact approval confirmation and receipt completion remain separate states.

## Review evidence and limits

The worker applied the pinned Better Interface accessibility, layout, writing, typography, color and UI domains while implementing. It inspected real Chromium screenshots for landing, feed, compose and profile; interaction suites cover dark 320/390 and desktop 1440, long values, keyboard controls and wallet errors. The pinned landing probe measures contrast, overflow, targets, typography and metadata. Exact results, source findings/fixes and the required copy-budget exception are in `web/VALIDATION.md` and `web/validation/v6/` (current checks) and the retained earlier records.

These are local browser observations and source checks. They do not claim a screen-reader session, Safari/device rendering, production domain mounting, complete RPC history or funded contract transactions. Theme appearance and network-dependent content remain subject to the visitor's browser and available reads.

## Reuse rules

Start a route inside `.app-main` with a page h1 and the existing spacing/type tokens. Use native links for navigation and `TxButton` plus `WalletAction` for every contract write. Reuse `Person` only for verified wallet identities; a handle subject is an X handle link, never a verified wallet name. Keep a single emphasized action per flow stage, errors next to their fields, numeric values tabular and long values wrappable. Do not add fonts, palette values, remote scripts or independent deployment settings for a new surface. The native compose dialog is the only elevated overlay; lists and handle escrow use flat structural rules. Root scroll padding and claim-control scroll margins reserve clearance above the fixed bottom bar during browser focus scrolling.
