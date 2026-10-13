import { useContext, useMemo, useState, type ReactNode } from 'react';
import { type Address } from 'viem';
import { readReceiptTrade } from '../trade-receipt';
import { erc20Abi } from '../abi';
import { useApp, useRead } from '../chain';
import { describeTarget, fmtAmount, fmtDate, short, Status, validAddress } from '../lib';
import { horizonEndOf, isThesis, type FeedData, type Note } from '../notes';
import { Notice, Countdown } from '../ui';
import { HistoryStatus } from '../history';
import { Citation } from '../receipts';
import { parseReceipt } from '../scoreboard';
import { Person } from '../identity';
import { AuthorRate, ChildPosted, FeedContext, readBacked } from '../social';
import { noteColumn, noteShareLine, Share } from '../share';

export interface FeedProps { feed: FeedData | null; error: string | null; loading: boolean; refresh: () => void }
export function ageOf(timestamp: number, now: number) {
  const seconds = Math.max(0, now - timestamp);
  return seconds < 60 ? 'now' : seconds < 3600 ? `${Math.floor(seconds / 60)}m` : seconds < 86400 ? `${Math.floor(seconds / 3600)}h` : `${Math.floor(seconds / 86400)}d`;
}
function TradeAmount({ n }: { n: Note }) {
  const { pub, cfg, contracts } = useApp();
  const read = useRead(n.source !== 'annex' && n.classAtPost !== 1 ? () => readReceiptTrade(pub, cfg, contracts, n) : null, [n.id, n.tx]);
  if (n.classAtPost === 1 || n.source === 'annex' || (n.classAtPost !== 0 && !read.data)) return null;
  return <span>{read.data ? `traded ${read.data.approximate ? '≈ ' : ''}${fmtAmount(read.data.amount)} ${read.data.symbol}${read.data.symbol === 'WETH' ? ' · IMD equivalent unavailable' : ''}` : 'Trade amount unavailable'}</span>;
}
export function Entry({ n, tokenName, children, expanded = false }: { n: Note; tokenName?: string; children?: ReactNode; expanded?: boolean }) {
  const { pub, contracts, wallet, now } = useApp();
  const feed = useContext(FeedContext);
  const thesis = isThesis(n), mine = wallet.account?.toLowerCase() === n.author.toLowerCase();
  const metadata = useRead(!thesis && !tokenName && n.x.toLowerCase() !== contracts.marg.toLowerCase() ? () => pub.readContract({ address: n.x, abi: erc20Abi, functionName: 'symbol' }) : null, [n.x, tokenName, thesis]);
  const token = tokenName ?? (n.x.toLowerCase() === contracts.marg.toLowerCase() ? 'MARG' : metadata.data?.slice(0, 24) || short(n.x));
  const parent = feed?.notes.find(x => x.id.toLowerCase() === n.parentId.toLowerCase());
  const canCounter = !mine && (thesis ? n.status === Status.ThesisOpen : n.status === Status.Open);
  const verdict = thesis ? 'thesis' : ({0:'open',1:'right',2:'wrong',3:'broken',4:'no data',5:'retracted'} as Record<number,string>)[n.status] ?? 'closed';
  return <li className="entry social-card" data-source={n.source ?? 'hook'}>
    <div className="card-person"><Person address={n.author}/><time dateTime={new Date(n.timestamp * 1000).toISOString()} title={fmtDate(n.timestamp)}>{ageOf(n.timestamp, now)}</time></div>
    <div className="card-rate"><AuthorRate address={n.author} revision={feed?.loadedAt}/><span className="small">hit rate</span></div>
    <div className="card-claim"><span className="token-chip" title={n.x}>{thesis ? `thesis · week ${Math.floor(n.timestamp / 604800)}` : token}</span>{!thesis && <><strong>{describeTarget(n.side, n.targetBps)}</strong><span className="small">{n.horizonDays}d</span></>}<span className={`tag ${verdict.replace(' ', '-')}`}>{verdict}{n.status === Status.Open && <> · <Countdown until={horizonEndOf(n)}/></>}</span></div>
    {expanded ? <p className="entry-text">{n.text}</p> : <a className="card-why" href={`#/note/${n.id}`} aria-label={`Read ${thesis ? 'thesis' : 'call'} ${n.source === 'annex' ? short(n.id) : 'No. ' + n.index}`}><p className="entry-text">{n.text}</p></a>}
    <Citation text={n.text}/>
    <div className="entry-meta"><span>{n.deposit > 0n ? `${fmtAmount(n.deposit)} IMD bond` : 'Bond released or forfeited'}</span><TradeAmount n={n}/><a href={`#/note/${n.id}`}>{n.source === 'annex' ? `Annex ${short(n.id, 6, 4)}` : `No. ${n.index}`}</a></div>
    {parent && <p className="small card-parent"><a href={`#/note/${parent.id}`}>{isThesis(parent) ? `under thesis No. ${parent.index}` : `counter to ${parent.source === 'annex' ? 'Annex ' + short(parent.id) : 'No. ' + parent.index}`}</a></p>}
    {thesis && <div className="card-child"><ChildPosted n={n} feed={feed}/>{n.status === Status.ThesisOpen && n.children === 0 && !feed?.notes.some(c => c.parentId === n.id && c.author.toLowerCase() === n.author.toLowerCase()) && <span className="small">Needs its child call within 7 days.</span>}</div>}
    <div className="card-actions">{thesis && <a href={`#/note/${n.id}`}>Read</a>}{canCounter ? <a href={thesis ? `#/thesis?rebut=${n.id}` : `#/call?counter=${n.id}`}>Counter</a> : <button type="button" disabled title={mine ? 'Choose another writer’s open call.' : 'Only open calls can be countered.'}>Counter</button>}
      <Share href={`#/note/${n.id}`} compact card={{ kind: 'Note', title: thesis ? 'A thesis on the record' : `${token} · ${describeTarget(n.side, n.targetBps)}`, columns: [noteColumn(n, token)], line: noteShareLine(n), filename: `marginalia-note-${n.id}` }}/>
      <a href={`#/author/${n.author}?back=1`}>Back</a>
    </div>{children}
  </li>;
}
export function describeOutcome(status: number): string {
  return ({1:'right',2:'wrong',3:'broken',4:'no data',5:'retracted',7:'thesis closed',8:'thesis forfeited'} as Record<number,string>)[status] ?? `status ${status}`;
}
export function FeedPage({ feed, error, loading, refresh, embedded = false }: FeedProps & { embedded?: boolean }) {
  const { pub, contracts, wallet } = useApp();
  const [token, setToken] = useState(''), [author, setAuthor] = useState('');
  const [tab, setTab] = useState<'Latest'|'Settling soon'|'Theses'|'Backed'>('Latest');
  const cited = new URLSearchParams(window.location.hash.split('?')[1] || '').get('cites')?.toLowerCase();
  const backed = useRead(tab === 'Backed' && wallet.account && contracts.pages && feed ? () => readBacked(pub, contracts.pages!, wallet.account!, [...new Set(feed.notes.map(n => n.author.toLowerCase()))] as Address[]) : null, [tab, wallet.account, contracts.pages, feed?.loadedAt]);
  const shown = useMemo(() => {
    const t = token.trim().toLowerCase(), a = author.trim().toLowerCase();
    const notes = (feed?.notes ?? []).filter(n => {
      if (cited && parseReceipt(n.text)?.handle !== cited) return false;
      if (tab === 'Theses' && !isThesis(n)) return false;
      if (tab === 'Settling soon' && (isThesis(n) || n.status !== Status.Open)) return false;
      if (tab === 'Backed' && !backed.data?.held.has(n.author.toLowerCase())) return false;
      if (t && !(n.x.toLowerCase() === t || t === 'marg' && n.x.toLowerCase() === contracts.marg.toLowerCase())) return false;
      return !a || n.author.toLowerCase() === a;
    });
    return tab === 'Settling soon' ? notes.sort((a,b) => horizonEndOf(a) - horizonEndOf(b)) : notes;
  }, [feed, token, author, tab, contracts.marg, cited, backed.data]);
  return <section className="feed-view">
    <div className="section-head">{embedded ? <h2>Feed</h2> : <h1>Feed</h1>}<button type="button" className="quiet" onClick={refresh} disabled={loading}>{loading ? 'Reading…' : 'Refresh'}</button></div>
    <div className="feed-tabs tabs" role="group" aria-label="Feed views">{(['Latest','Settling soon','Theses','Backed'] as const).map(t => <button type="button" aria-pressed={tab === t} key={t} onClick={() => setTab(t)}>{t}</button>)}</div>
    {cited && <p className="small">Receipts citing @{cited} · <a href="#/feed">Show all notes</a></p>}
    <details className="feed-filters"><summary>Filter by token or writer</summary><div className="filters"><div><label htmlFor="f-token">Token</label><input id="f-token" placeholder="0x… or MARG" value={token} onChange={e => setToken(e.target.value)} />{token && token.toLowerCase() !== 'marg' && !validAddress(token) && <span className="hint">Enter a token address or MARG.</span>}</div><div><label htmlFor="f-author">Writer address</label><input id="f-author" placeholder="0x…" value={author} onChange={e => setAuthor(e.target.value)}/></div></div></details>
    {error && <Notice kind="bad"><p>Could not read the feed. {error}</p><button type="button" onClick={refresh}>Retry feed</button></Notice>}
    {tab === 'Backed' && !wallet.account && <p className="empty">Read the writers you back. <button type="button" onClick={wallet.connect}>Connect wallet</button></p>}
    {tab === 'Backed' && (backed.error || !!backed.data?.missing) && <Notice kind="bad"><p>Some page holdings could not be read. This feed is incomplete.</p><button type="button" onClick={backed.refresh}>Retry holdings</button></Notice>}
    {tab === 'Backed' && backed.loading && <p role="status">Reading your pages…</p>}
    <ul className="ledger" aria-label="Notes and theses">{shown.map(n => <Entry key={`${n.source}:${n.id}`} n={n}/>)}</ul>
    {feed && !shown.length && !(tab === 'Backed' && (!wallet.account || backed.loading || backed.error)) && <p className="empty">{feed.partial ? 'No matching notes in the available history.' : tab === 'Backed' ? 'No calls from your backed writers yet.' : tab === 'Theses' ? 'No theses yet.' : tab === 'Settling soon' ? 'No open calls awaiting settlement.' : 'No matching notes yet.'} <a href={tab === 'Theses' ? '#/thesis' : '#/call'}>{tab === 'Theses' ? 'Write a thesis' : 'Make a call'}</a></p>}
    {!feed && !error && <p className="empty" role="status">Reading notes from Ethereum…</p>}
    {!embedded && <HistoryStatus feed={feed} loading={loading} refresh={refresh}/>}
  </section>;
}
