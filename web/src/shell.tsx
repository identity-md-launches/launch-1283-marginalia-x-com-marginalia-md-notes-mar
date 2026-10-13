import { useEffect, useRef, type ReactNode } from 'react';
import type { Wallet } from './chain';
import { usePrize } from './pages/Home';
import { fmtAmount } from './lib';

export function PotChip() {
  const p = usePrize();
  return <a className="pot-chip" href="#/pools" aria-label={`Open Pots: ${p.data && !p.error ? fmtAmount(p.data.pool) + ' IMD' : 'pot unavailable'}`}><span aria-hidden="true">◈</span> {p.data && !p.error ? fmtAmount(p.data.pool) : '…'} IMD</a>;
}
export function Shell({ route, wallet, pot, children }: { route: string; wallet: Wallet; pot?: ReactNode; children: ReactNode }) {
  const feed = route === '/' || route.startsWith('/feed');
  const me = !!wallet.account && route.toLowerCase().startsWith(`/author/${wallet.account.toLowerCase()}`);
  return <div className="app-frame">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="app-topbar"><a className="brand" href="#/"><span className="mark" aria-hidden="true">☞</span> Marginalia</a>{pot ?? <a className="pot-chip" href="#/pools">… IMD</a>}<a className="feedback-link" href="#/feedback">Feedback</a></header>
    {children}
    <nav className="bottom-bar" aria-label="App navigation">
      <a href="#/" aria-current={feed ? 'page' : undefined}><NavIcon name="feed"/>Feed</a>
      <a href="#/scoreboard" aria-current={route.startsWith('/scoreboard') ? 'page' : undefined}><NavIcon name="record"/>Record</a>
      <a className="compose-trigger" href="#/call" aria-label="Make a call"><span aria-hidden="true">+</span></a>
      <a href="#/pools" aria-current={route.startsWith('/pools') ? 'page' : undefined}><NavIcon name="pots"/>Pots</a>
      {wallet.account ? <a href={`#/author/${wallet.account}`} aria-current={me ? 'page' : undefined}><NavIcon name="me"/>Me</a> : <button type="button" aria-label="Me · Connect wallet" onClick={wallet.connect} disabled={wallet.connecting}><NavIcon name="me"/>{wallet.connecting ? 'Wait…' : 'Me'}</button>}
    </nav>
  </div>;
}
function NavIcon({ name }: { name: 'feed' | 'record' | 'pots' | 'me' }) {
  const paths = { feed: 'M4 5h16M4 12h16M4 19h11', record: 'M5 20V12M12 20V4M19 20V8', pots: 'M5 9h14l-2 11H7L5 9Zm3-4h8M12 2v4', me: 'M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 22v-3a8 8 0 0 1 16 0v3' };
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}
export function ComposeSheet({ thesis, close, children }: { thesis: boolean; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; dialog?.close(); (before?.isConnected ? before : document.querySelector<HTMLElement>('.compose-trigger'))?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className="compose-sheet" aria-labelledby="compose-heading" onCancel={e => { e.preventDefault(); close(); }}>
    <header className="sheet-header"><div><h1 id="compose-heading">{thesis ? 'Write a thesis' : 'Make a call'}</h1><a href={thesis ? '#/call' : '#/thesis'}>{thesis ? 'Call instead' : 'Thesis instead'}</a></div><button type="button" className="quiet sheet-close" onClick={close} aria-label="Close compose">×</button></header>
    {children}
  </dialog>;
}
