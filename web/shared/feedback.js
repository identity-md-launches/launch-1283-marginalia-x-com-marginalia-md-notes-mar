// Public product brief, shared by the form and the oracle document.
export const SITE = 'marginalia.chat';
export const WEEK_SECONDS = 604800;
export const MAX_BYTES = 600;
export const KINDS = ['Site', 'Mechanics', 'Idea'];
export const BRIEF = {
  audience: 'Crypto traders and readers on a phone, arriving from X, who need to use Marginalia without an AI or documentation beside them.',
  scope: 'Improve the product in one concrete, implementable iteration. Ignore length, author and popularity. Requests for price action, rewards, promotion or a token score zero.',
  immutable: [
    'Noted MARG sells pay 1% + a 0.1 IMD stamp; quiet sells pay 3%.',
    'Every note costs a 0.1 IMD stamp + 0.25 IMD of MARG the author keeps + a 0.25–10 IMD bond.',
    'Accruals split 70% to the weekly thesis pool / 30% to daily writer refunds.',
    'A thesis needs its author’s child call within 7 days. The IMD oracle panel ranks theses.',
    'A call’s baseline is its venue’s 1–6 hour price window (the checkpoint). Every venue needs one.',
    'Annex venues must be live v4 pools containing X and IMD, WETH or native ETH. Static-fee pools may have no hook, our hook, a hook without swap permissions or an admitted hook. Dynamic-fee pools require our hook or admission. The Annex validates the venue on chain.',
    'Pages, when live: a capped curve of 0.05 IMD × n, reaching 10 IMD at page 200; ten pages per wallet per subject; an 80/10/10 split. Its purchase gate is the whitelist OR 10,000 MARG OR a posted note.',
    'One token. No second MARG ever.',
    'Nothing is advice. Bonds can be lost.',
  ],
  open: ['The site, its copy and flows.', 'agents.md and llms.txt.', 'The keeper.', 'New modules alongside the existing contracts.'],
};
export const weekOf = (seconds = Math.floor(Date.now() / 1000)) => Math.floor(seconds / WEEK_SECONDS);
export const utf8Bytes = text => new TextEncoder().encode(text).length;
export function feedbackMessage({ week, kind, text, handle }) {
  return JSON.stringify({ site: SITE, week, kind, text, handle });
}
