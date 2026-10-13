// The profile page is the product: a wallet, its hit rate, its record, its calls and theses, and its backers.
import { PagesPanel } from './Pages';
import type { Address } from 'viem';
import { readRecord } from '../records';
import { readBackers } from '../backers';
import { useApp, useRead } from '../chain';
import { fmtAmount, fmtScore, short, Status } from '../lib';
import { UsdContext } from '../price';
import { formatRate, recordRate } from '../scoreboard';
import { Share } from '../share';
import { Addr, Countdown, Notice, StatusTag } from '../ui';
import { OpenDuels } from './Duel';
import { Entry, type FeedProps } from './Feed';

export const SCORE_MEANING = "Score accrues only on calls priced on the MARG launch pool; every other token's calls settle and count in the hit rate.";
export const BACKING_COPY = 'Readers back a writer by holding their pages. 8% of every page trade goes to the writer. Holders can sell back to the curve at any time.';

export function AuthorPage({ address, feed, error, loading, refresh }: FeedProps & { address: Address }) {
  const { pub, contracts, wallet, now } = useApp();
  const rec = useRead(() => readRecord(pub,contracts,address), [address, feed?.loadedAt]);
  const backers = useRead(contracts.pages ? () => readBackers(pub, contracts.pages!, address) : null, [address, contracts.pages, feed?.loadedAt], [address, contracts.pages]);
  const notes = feed?.notes.filter(n => n.author.toLowerCase() === address.toLowerCase()) ?? [];
  const r = rec.error ? undefined : rec.data;
  const b = backers.error ? undefined : backers.data;
  const mine = wallet.account?.toLowerCase() === address.toLowerCase();
  const theses = notes.filter(n => n.targetBps === 0);
  const open = notes.filter(n => n.targetBps !== 0 && n.status === Status.Open);
  const settled = notes.filter(n => n.targetBps !== 0 && n.status !== Status.Open);
  const rate = r ? formatRate(recordRate(r)) : '…';
  const counts = r ? `${r[1]} posted · ${r[2]} right · ${r[3]} wrong · ${r[4]} broken · ${r[5]} retracted` : 'record unavailable';
  return <>
    <p className="eyebrow">{mine ? 'Your profile' : 'Profile'}</p>
    <h1 className="profile-wallet"><Addr a={address} full /></h1>
    {mine && <p className="small">This is your wallet. You are your wallet: no account, no handle, no name unless you want one.</p>}
    {rec.error && <Notice kind="bad"><p>Could not read the record. <button type="button" onClick={rec.refresh}>Retry record</button></p></Notice>}
    <section className="profile-rate" aria-label="Hit rate"><span className="eyebrow">Hit rate</span><strong className="rate-large">{rate}</strong><p className="small">right ÷ (right + wrong + broken + retracted); open calls, theses and no-data outcomes are excluded.</p></section>
    <dl className="record-grid" aria-label="Record counts">{['Posted', 'Right', 'Wrong', 'Broken', 'Retracted'].map((label, i) => <div key={label}><dt>{label}</dt><dd>{r ? r[i + 1].toString() : '…'}</dd></div>)}</dl>
    <p className="profile-score"><span className="eyebrow">Score</span><strong>{fmtScore(r?.[0])}</strong> <span className="small">{SCORE_MEANING}</span></p>
    {r && r[6] > 0 && <p className="small">{r[6]} judged thesis {r[6] === 1 ? 'win' : 'wins'}.</p>}
    <Share card={{ kind: 'Author', title: `The record of ${short(address)}`, columns: [{ title: 'Wallet record · unclaimed', claim: r ? `${rate} hit rate · score ${fmtScore(r[0])}. ${r[2]} right / ${r[3]} wrong / ${r[4]} broken / ${r[5]} retracted. ${r[1]} posted.` : 'Record unavailable.', author: short(address), result: b ? `${b.holders.length} backers · ${b.supply.toString()} pages` : 'Backers unavailable', detail: 'Hit rate excludes open, thesis and no-data outcomes.' }], line: `Marginalia wallet ${short(address)}: ${r ? `${rate} hit rate, score ${fmtScore(r[0])}, ${counts}.` : 'record unavailable.'}`, filename: `marginalia-author-${address}` }} />

    <h2>Open calls</h2>
    {open.length ? <ul className="ledger">{open.map(n => <Entry key={n.id} n={n}><p className="small">Settles <Countdown until={n.timestamp + n.horizonDays * 86400} prefix="in " />; anyone may observe for six hours after that.</p></Entry>)}</ul> : feed && <p className="empty">No open call{feed.partial ? ' in the available history' : ''}.</p>}
    <h2>Settled calls</h2>
    {settled.length ? <ul className="ledger">{settled.map(n => <Entry key={n.id} n={n}><p className="small">Verdict: <StatusTag status={n.settlement?.status ?? n.status} />{n.settlement && <> · {fmtScore(n.settlement.scoreDelta)} score</>}</p></Entry>)}</ul> : feed && <p className="empty">No settled call{feed.partial ? ' in the available history' : ''}.</p>}
    <h2>Theses</h2>
    {theses.length ? <ul className="ledger">{theses.map(n => <Entry key={n.id} n={n} />)}</ul> : feed && <p className="empty">No thesis{feed.partial ? ' in the available history' : ''}.</p>}
    {error && <Notice kind="bad"><p>Could not read the notes: {error}</p></Notice>}
    <OpenDuels feed={feed} author={address} />

    <h2 id="backers">{mine ? 'Your pages' : 'Backers'}</h2>
    <p>{BACKING_COPY}</p>
    {contracts.pages ? <>
      <dl className="record-grid" aria-label="Backers">
        <div><dt>Pages</dt><dd>{b ? b.supply.toString() : '…'}</dd></div>
        <div><dt>Backers</dt><dd>{b ? b.holders.length.toString() : '…'}</dd></div>
        <div><dt>{mine ? 'You earned' : 'Writer earned'}</dt><dd>{b ? <>{fmtAmount(b.earned)} IMD</> : '…'}</dd></div>
      </dl>
      {b && <p className="small"><UsdContext imd={b.earned}/> {b.trades} page trade{b.trades === 1 ? '' : 's'} read from Trade events{b.partial ? `; only blocks ${b.from.toString()}–${b.to.toString()} were readable, so older backers and earnings may be missing` : ''}.</p>}
      {b && b.holders.length > 0 && <ul className="backer-list">{b.holders.map(h => <li key={h.address}><a className="mono" href={`#/author/${h.address}`}>{short(h.address)}</a> · {h.pages.toString()} page{h.pages === 1n ? '' : 's'}</li>)}</ul>}
      {backers.error && <Notice kind="bad"><p>Backers could not be read. <button type="button" className="quiet" onClick={backers.refresh}>Retry backers</button></p></Notice>}
      {backers.loading && !b && <p className="small" role="status">Reading page trades…</p>}
      <PagesPanel author={address} feed={feed}/>
    </> : <p className="small">Pages are not in the runtime manifest; backing is unavailable here.</p>}
    {mine && <p className="small">Claim deposits and refunds from <a href="#/pools">Pools</a>. Seal a call at <a href="#/seal">Seal</a>.</p>}
    <button type="button" className="quiet" disabled={loading} onClick={() => { rec.refresh(); backers.refresh(); refresh(); }}>{loading ? 'Reading…' : 'Refresh record'}</button>
    <p className="small">Read at {new Date(now * 1000).toLocaleTimeString()}. Citations never establish identity; the posting wallet is the author.</p>
  </>;
}
