import { useRef, useState } from 'react';
import type { Address } from 'viem';
import { PagesPanel } from './Pages';
import { PagesAbi } from '../pages-abi';
import { sharedRecord } from '../social';
import { readBackers } from '../backers';
import { useApp, useRead } from '../chain';
import { fmtAmount, short, Status } from '../lib';
import { formatRate, recordRate, settledCount } from '../scoreboard';
import { Share } from '../share';
import { Notice } from '../ui';
import { Person } from '../identity';
import { YourWeek } from '../your-week';
import { Entry, type FeedProps } from './Feed';
export const BACKING_COPY = 'Readers back a writer by holding their pages. 8% of every page trade goes to the writer. Holders can sell back to the curve at any time.';
export function AuthorPage({ address, feed, error, loading, refresh }: FeedProps & { address: Address }) {
  const { pub, contracts, wallet } = useApp();
  const rec = useRead(() => sharedRecord(pub, contracts, address, feed?.loadedAt), [address, feed?.loadedAt]);
  const backers = useRead(contracts.pages ? () => readBackers(pub, contracts.pages!, address) : null, [address, contracts.pages, feed?.loadedAt]);
  const price = useRead(contracts.pages ? async () => {
    const h = { address: contracts.pages!, abi: PagesAbi } as const;
    const subject = await pub.readContract({ ...h, functionName: 'subjectOf', args: [address] });
    const [value, fee] = await pub.readContract({ ...h, functionName: 'buyPrice', args: [subject, 1n] });
    return value + fee;
  } : null, [contracts.pages, address, feed?.loadedAt]);
  const [tab, setTab] = useState<'Calls'|'Theses'|'Backers'>('Calls');
  const [backOpen, setBackOpen] = useState(new URLSearchParams(window.location.hash.split('?')[1]).has('back'));
  const backing = useRef<HTMLDetailsElement>(null);
  const notes = feed?.notes.filter(n => n.author.toLowerCase() === address.toLowerCase()) ?? [];
  const r = rec.error ? undefined : rec.data, b = backers.error ? undefined : backers.data;
  const mine = wallet.account?.toLowerCase() === address.toLowerCase();
  const theses = notes.filter(n => n.targetBps === 0), calls = notes.filter(n => n.targetBps !== 0);
  const counter = !mine ? calls.find(n => n.status === Status.Open) : undefined;
  const rate = r ? formatRate(recordRate(r)) : '…';
  return <section className="profile">
    <h1 className="visually-hidden">{mine ? 'Your profile' : 'Writer profile'}</h1>
    {mine && <YourWeek feed={feed}/>}
    <div className="profile-identity"><Person address={address} large/><span className="small">{mine ? 'Your record' : 'Writer'}</span></div>
    <section className="profile-rate" aria-label="Hit rate"><span className="small">Hit rate</span><div><strong className="rate-large">{rate}</strong><span>{r ? `${r[2]} of ${settledCount(r)} settled` : 'Reading record…'}</span></div></section>
    {rec.error && <Notice kind="bad"><p>Record unavailable. <button type="button" onClick={rec.refresh}>Retry record</button></p></Notice>}
    <dl className="profile-stats"><div><dt>Backers</dt><dd>{b ? b.holdingsFailed ? 'Unknown' : `${b.partial ? '≥ ' : ''}${b.holders.length}` : '…'}</dd></div><div><dt>Pages held</dt><dd>{b ? b.supply.toString() : '…'}</dd></div><div><dt>Theses</dt><dd>{feed ? `${feed.partial ? '≥ ' : ''}${theses.length}` : '…'}</dd></div></dl>
    <div className="profile-actions"><button type="button" className="primary" disabled={!contracts.pages} onClick={() => { setBackOpen(true); requestAnimationFrame(() => backing.current?.scrollIntoView({ block: 'start' })); }}>Back this writer · {price.data && !price.error ? fmtAmount(price.data) : '…'} IMD</button>{counter ? <a className="button quiet" href={`#/call?counter=${counter.id}`}>Counter</a> : <button type="button" disabled title={mine ? 'Counter another writer’s call.' : 'No open call in the loaded record.'}>Counter</button>}</div>
    <p className="small backing-copy">{BACKING_COPY}</p>
    {mine && <div className="own-profile"><p>You earned <strong>{b ? `${b.partial ? 'at least ' : ''}${fmtAmount(b.earned)} IMD` : '…'}</strong></p><p className="small"><a href="#/pools">Claim refunds and deposits in Pools</a> · <a href="#/seal">Seal a call</a></p></div>}
    {b?.partial && <Notice><p className="small">Page history has gaps in blocks {b.from.toString()}–{b.to.toString()}. Some backers may be undiscovered; earnings include only readable Trade events. Listed page balances are verified at block {b.to.toString()}.</p></Notice>}
    {!!b?.holdingsFailed && <Notice kind="bad"><p className="small">Current page balances could not be verified for {b.holdingsFailed} wallets. The backer count is unknown; only verified holders are listed. <button type="button" onClick={backers.refresh}>Retry backers</button></p></Notice>}
    {backers.error && <Notice kind="bad"><p>Page history unavailable. <button type="button" onClick={backers.refresh}>Retry backers</button></p></Notice>}
    <details className="profile-backing" ref={backing} open={backOpen} onToggle={e => setBackOpen(e.currentTarget.open)}><summary>Backing controls</summary><PagesPanel author={address} feed={feed}/><p className="small">For a cited handle, <a href="#/scoreboard">open its Pages from the receipts index</a>.</p></details>
    <div className="tabs profile-tabs" role="group" aria-label="Profile views">{(['Calls','Theses','Backers'] as const).map(t => <button type="button" key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab !== 'Backers' ? <><ul className="ledger">{(tab === 'Calls' ? calls : theses).map(n => <Entry key={`${n.source}:${n.id}`} n={n}/>)}</ul>{feed && !(tab === 'Calls' ? calls : theses).length && <p className="empty">No {tab.toLowerCase()} in {feed.partial ? 'the available' : 'this'} record.</p>}</> : b ? <ul className="backer-list">{b.holders.map(h => <li key={h.address}><Person address={h.address}/><span>{h.pages.toString()} pages</span></li>)}{!b.holders.length && <li>{b.holdingsFailed ? 'No verified backers to show.' : b.partial ? 'No current backers found in readable history.' : 'No backers yet.'}</li>}</ul> : <p role="status">{backers.error ? 'Backers unavailable.' : 'Reading page trades…'}</p>}
    {error && <Notice kind="bad"><p>Notes unavailable. {error}</p></Notice>}
    <Share card={{ kind: 'Author', title: `The record of ${short(address)}`, columns: [{ title: 'Posting wallet', claim: r ? `${rate} hit rate · ${r[2]} of ${settledCount(r)} settled` : 'Record unavailable.', author: short(address), result: b ? `${b.holdingsFailed ? 'Backer count unknown' : `${b.partial ? 'At least ' : ''}${b.holders.length} backers`} · ${b.supply} pages held` : 'Backers unavailable' }], line: `Marginalia wallet ${short(address)}: ${r ? `${rate} hit rate · ${r[2]} of ${settledCount(r)} settled.` : 'record unavailable.'}`, filename: `marginalia-author-${address}` }}/>
    <button type="button" className="quiet" disabled={loading} onClick={() => { void rec.refresh(); void backers.refresh(); void price.refresh(); refresh(); }}>{loading ? 'Reading…' : 'Refresh record'}</button>
  </section>;
}
