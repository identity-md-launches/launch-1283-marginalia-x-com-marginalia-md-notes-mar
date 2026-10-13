import { useEffect, useRef, useState, type FormEvent } from 'react';
import { recoverMessageAddress, stringToHex, type Address, type Hex } from 'viem';
import { BRIEF, KINDS, MAX_BYTES, SITE, feedbackMessage, utf8Bytes, weekOf, type AdoptedLedger, type FeedbackEntry, type FeedbackKind, type WeeklyDocument } from '../shared/feedback.js';
import { useRead, type Wallet } from './chain';
import { fmtDate, short } from './lib';

type Signed = { message: string; signature: Hex; address: Address };
// Preserve unsent text when Ethereum finishes booting or a composer tab changes.
// Memory only: no draft or signature is written to browser storage.
const pageDraft: { kind: FeedbackKind; text: string; handle: string } = { kind: 'Site', text: '', handle: '' };
async function publicJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('The feedback service is unavailable here. Open the site with its intake route, or retry.');
  return response.json() as Promise<T>;
}

function Entry({ entry }: { entry: FeedbackEntry }) {
  return <li id={`feedback-${entry.id}`} className="feedback-entry">
    <div className="feedback-meta"><span className="tag">{entry.kind}</span><a href={`#/author/${entry.address}`} title={entry.address}><bdi>{entry.handle ? `@${entry.handle}` : short(entry.address)}</bdi></a>{entry.noted && <span className="tag">posted a note</span>}</div>
    <p className="feedback-text" dir="auto">{entry.text}</p>
    <p className="small"><time dateTime={new Date(entry.ts * 1000).toISOString()}>{fmtDate(entry.ts)}</time> · <a href={`#/?tab=feedback&entry=${entry.id}`} title={entry.id}>Entry {short(entry.id)}</a></p>
    <details className="feedback-identity"><summary>Entry and posting wallet</summary><p className="mono">{entry.id}</p><p className="mono">{entry.address}</p>{entry.handle && <p className="small">The handle is supplied by the wallet. It does not verify identity.</p>}</details>
  </li>;
}

export function Feedback({ wallet, now }: { wallet: Wallet; now: number }) {
  const week = weekOf(now);
  const [kind, setKind] = useState<FeedbackKind>(pageDraft.kind);
  const [text, setText] = useState(pageDraft.text);
  const [handle, setHandle] = useState(pageDraft.handle);
  const [pending, setPending] = useState<'sign' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<'text' | 'handle' | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [signed, setSigned] = useState<Signed | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const handleRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const bytes = utf8Bytes(text);
  const message = feedbackMessage({ week, kind, text, handle: handle.replace(/^@/, '') });
  useEffect(() => { Object.assign(pageDraft, { kind, text, handle }); }, [kind, text, handle]);
  const board = useRead(async () => {
    const document = await publicJson<WeeklyDocument>(`/api/feedback/${week}.json`);
    if (document.site !== SITE || document.week !== week || !Array.isArray(document.entries) || !('pick' in document)) throw new Error('The weekly board returned an invalid document. Retry after the service is updated.');
    return document;
  }, [week]);
  const adopted = useRead(async () => {
    const ledger = await publicJson<AdoptedLedger>('/api/feedback/adopted.json');
    if (ledger.site !== SITE || !Array.isArray(ledger.builds)) throw new Error('The adopted ledger returned an invalid document.');
    return ledger;
  }, [week]);
  useEffect(() => { setSigned(null); setError(null); setFieldError(null); }, [message, wallet.account]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.hash.split('?')[1]).get('entry');
    if (id && /^0x[0-9a-f]{64}$/.test(id) && board.data) document.getElementById(`feedback-${id}`)?.scrollIntoView({ block: 'center' });
  }, [board.data]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    if (!text.trim() || bytes > MAX_BYTES) { setError('Enter 1–600 UTF-8 bytes. Shorten the text to continue.'); setFieldError('text'); textRef.current?.focus(); return; }
    if (!/^[A-Za-z0-9_]{0,15}$/.test(handle.replace(/^@/, ''))) { setError('Use up to 15 letters, numbers or underscores for the X handle.'); setFieldError('handle'); handleRef.current?.focus(); return; }
    if (!wallet.account) { await wallet.connect(); return; }
    const ethereum = window.ethereum;
    if (!ethereum) { setError('Open this page in a browser with an Ethereum wallet to sign feedback.'); return; }
    const account = wallet.account;
    busy.current = true;
    setError(null); setReceipt(null); setFieldError(null);
    try {
      let payload = signed?.message === message && signed.address.toLowerCase() === account.toLowerCase() ? signed : null;
      const currentAccounts = async () => (await ethereum.request({ method: 'eth_accounts' }) as string[])[0]?.toLowerCase();
      if (await currentAccounts() !== account.toLowerCase()) throw new Error('The connected wallet changed. Review the form and sign again.');
      if (!payload) {
        setPending('sign');
        const signature = await ethereum.request({ method: 'personal_sign', params: [stringToHex(message), account] }) as Hex;
        const recovered = await recoverMessageAddress({ message, signature });
        if (recovered.toLowerCase() !== account.toLowerCase()) throw new Error('The signature does not match the connected wallet.');
        payload = { message, signature, address: account };
      }
      if (await currentAccounts() !== account.toLowerCase()) throw new Error('The connected wallet changed. Review the form and sign again.');
      if (weekOf() !== week) throw new Error('A new week began. Review the form and sign again.');
      setSigned(payload); setPending('send');
      const response = await fetch('/api/feedback', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Feedback intake is unavailable on this host. Your text is still here.');
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok) {
        if (response.status < 500) setSigned(null);
        throw new Error(result.error || 'Feedback was not accepted. Retry.');
      }
      if (!result.id || !/^0x[0-9a-f]{64}$/.test(result.id)) throw new Error('Intake returned no valid entry ID. Retry the same entry.');
      setReceipt(result.id); setText(''); setSigned(null);
      void board.refresh();
    } catch (cause) {
      const detail = cause as { code?: number; message?: string; name?: string };
      setError(detail.code === 4001 ? 'Signature declined. Your text is still here; sign when ready.' : detail.name === 'TimeoutError' || detail.name === 'TypeError' ? 'Feedback could not reach the service. Your text is still here. Retry the same entry.' : detail.message || 'Feedback could not be posted. Retry.');
    } finally { setPending(null); busy.current = false; }
  }

  const entries = [...(board.data?.entries ?? [])].sort((a, b) => b.ts - a.ts || a.id.localeCompare(b.id));
  const pick = board.data?.pick;
  return <div className="feedback">
    <section aria-labelledby="feedback-fixed"><h2 id="feedback-fixed">Cannot change (immutable contracts)</h2><ul className="feedback-rules small">{BRIEF.immutable.map(rule => <li key={rule}>{rule}</li>)}</ul>
      <h2>Open to change</h2><ul className="feedback-rules small">{BRIEF.open.map(rule => <li key={rule}>{rule}</li>)}</ul>
      <p className="small">Ideas asking for price action, rewards, promotion or a new token are accepted, but will rank zero.</p>
    </section>
    <form onSubmit={submit} className="feedback-form">
      <h2>Tell us what to fix</h2>
      <p>Signature only. No gas, no approval, no token movement.</p>
      {wallet.account && <p className="small">Signing wallet: <bdi className="mono">{wallet.account}</bdi></p>}
      <p className="small">Describe the problem and a concrete change. One entry per wallet per hour; ten per week. Your entry and wallet address are public.</p>
      <fieldset disabled={!!pending}>
        <legend className="visually-hidden">Feedback for week {week}</legend>
        <label htmlFor="feedback-kind">Kind</label><select id="feedback-kind" value={kind} onChange={event => setKind(event.target.value as FeedbackKind)}>{KINDS.map(value => <option key={value}>{value}</option>)}</select>
        <label htmlFor="feedback-text">What should change?</label><textarea ref={textRef} id="feedback-text" value={text} onChange={event => setText(event.target.value)} rows={5} aria-invalid={fieldError === 'text' || bytes > MAX_BYTES} aria-describedby={`feedback-count${fieldError === 'text' ? ' feedback-error' : ''}`} placeholder="Where did you get stuck? What would make it clearer?"/>
        <p id="feedback-count" className={`small${bytes > MAX_BYTES ? ' bad' : ''}`}>{bytes} / {MAX_BYTES} UTF-8 bytes</p>
        <label htmlFor="feedback-handle">X handle (optional)</label><input ref={handleRef} id="feedback-handle" autoComplete="off" autoCapitalize="none" spellCheck={false} value={handle} onChange={event => setHandle(event.target.value)} aria-invalid={fieldError === 'handle'} aria-describedby={fieldError === 'handle' ? 'feedback-error' : 'feedback-handle-help'} placeholder="@handle"/>
        <p id="feedback-handle-help" className="small">A handle does not verify your identity.</p>
        <details className="feedback-signature"><summary>Preview the exact message</summary><pre>{message}</pre></details>
        <button className="primary" type="submit" disabled={!!pending || wallet.connecting}>{pending === 'sign' ? 'Sign in your wallet…' : pending === 'send' ? 'Posting feedback…' : !wallet.account ? 'Connect wallet to give feedback' : signed ? 'Retry posting feedback' : 'Sign and post feedback'}</button>
      </fieldset>
      <div role="status" className="feedback-result">{receipt && <p>Feedback saved. Entry <span className="mono">{receipt}</span>. The public board can take a minute to update.</p>}</div>
      {(error || wallet.error) && <p id="feedback-error" role="alert" className="status bad">{error || wallet.error}</p>}
    </form>
    <section aria-labelledby="feedback-board"><div className="section-head"><h2 id="feedback-board">This week’s entries</h2><button type="button" className="quiet" onClick={() => { void board.refresh(); void adopted.refresh(); }} disabled={board.loading || adopted.loading}>Refresh board</button></div>
      <p className="small">Week {week} · <a href={`/api/feedback/${week}.json`}>Public JSON</a>. The panel picks each Sunday. Handles are self-reported; the posting wallet is the author. Badges confirm an on-chain note; a missing badge may mean its chain read was unavailable.</p>
      {board.loading && <p role="status">Reading this week’s feedback…</p>}
      {board.error && <p className="status bad" role="alert">{board.error}</p>}
      {!board.loading && !board.error && !entries.length && <p className="empty">No entries this week. Tell us where you got stuck.</p>}
      <ol className="feedback-entries">{entries.map(entry => <Entry entry={entry} key={entry.id}/>)}</ol>
    </section>
    <section aria-labelledby="feedback-picked" className="feedback-pick"><h2 id="feedback-picked">Picked this week</h2>{pick ? <><p className="small">Panel request <span className="mono">{pick.attestationRequestId}</span></p><ol className="feedback-picked-list">{pick.ranked.map((id, index) => { const entry = entries.find(entry => entry.id === id); return <li key={id}><a href={`#/?tab=feedback&entry=${id}`}>{index + 1}. {entry?.text ?? id}</a>{entry && <p className="small">{short(entry.address)} · {short(id)}</p>}</li>; })}</ol>{!pick.ranked.length && <p>No entries were ranked for this pick.</p>}</> : <p className="small">{board.error ? 'The panel pick could not be read.' : board.loading ? 'Reading the panel pick…' : 'No panel pick published for this week yet.'}</p>}</section>
    <section aria-labelledby="feedback-adopted"><h2 id="feedback-adopted">Adopted</h2><p className="small">The append-only record of shipped builds. <a href="/api/feedback/adopted.json">Public ledger</a></p>
      {adopted.loading && <p role="status">Reading shipped builds…</p>}{adopted.error && <p className="status bad" role="alert">{adopted.error}</p>}
      {adopted.data && !adopted.data.builds.length && <p className="empty">No feedback builds adopted yet.</p>}
      <ol className="feedback-entries">{adopted.data?.builds.map(build => <li key={`${build.week}:${build.commit}`} className="feedback-entry"><h3>Week {build.week}</h3><p className="small">Synthesis: {build.synthesis ? 'yes' : 'no'}</p><ul>{build.implemented.map(entry => <li key={entry.id}><a className="mono" href={`/api/feedback/${build.week}.json`} title={entry.id}>{entry.id}</a><p className="small">{short(entry.author)} · share {Number((entry.share * 100).toFixed(4))}%</p></li>)}</ul><p className="small">Attestation request <span className="mono">{build.attestationRequestId}</span></p><p className="small">PR commit <span className="mono">{build.commit}</span></p></li>)}</ol>
    </section>
  </div>;
}
