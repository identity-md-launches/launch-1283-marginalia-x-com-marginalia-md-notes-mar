import { UsdContext } from '../price';
import type { Hex } from 'viem';
import { readRecord } from '../records';
import { useApp, useRead } from '../chain';
import { describeTarget, fmtAmount, fmtDate, fmtScore, noteIdFromIndex, short } from '../lib';
import { horizonEndOf } from '../notes';
import { Citation } from '../receipts';
import { duelVerdict, findDuels, formatRate, recordRate, type Duel } from '../scoreboard';
import { noteColumn, Share } from '../share';
import { StatusTag } from '../ui';
import type { FeedProps } from './Feed';

export function DuelPair({ duel, records = false }: { duel: Duel; records?: boolean }) {
  const { pub, contracts } = useApp();
  const rec = useRead(records ? () => Promise.all([duel.target, duel.counter].map(n => readRecord(pub,contracts,n.author))) : null, [duel.target.author, duel.counter.author, records]);
  return <div className="duel-pair">{[duel.target, duel.counter].map((n, i) => <article key={n.id} className="duel-side">
    <p className="eyebrow">{i === 0 ? 'Original call' : 'Counter-call'} · <a href={`#/note/${n.id}`}>{n.source==='annex'?`Annex ${short(n.id,8,6)}`:`№ ${n.index.toString()}`}</a></p>
    <p><a href={`#/author/${n.author}`} className="mono">{short(n.author)}</a></p>
    <p className="duel-claim">{describeTarget(n.side, n.targetBps)}</p>
    <p className="small">{n.x.toLowerCase() === contracts.marg.toLowerCase() ? 'MARG' : short(n.x)} · {n.horizonDays} days</p>
    <p className="duel-text">{n.text}</p>
    <Citation text={n.text} />
    <p className="small">{n.deposit > 0n ? `${fmtAmount(n.deposit)} IMD bonded` : 'Bond released or forfeited'} {n.deposit>0n && <UsdContext imd={n.deposit}/>}<br />Horizon {fmtDate(horizonEndOf(n))}</p>
    <StatusTag status={n.status} />
    {records && <p className="small duel-record">{rec.error ? 'Record unavailable; reload to retry.' : rec.data ? <>Score {fmtScore(rec.data[i][0])} · {formatRate(recordRate(rec.data[i]))} hit rate<br />{rec.data[i][2]} right · {rec.data[i][3]} wrong · {rec.data[i][4]} broken</> : 'Reading record…'}</p>}
  </article>)}</div>;
}

export function OpenDuels({ feed, author }: Pick<FeedProps, 'feed'> & { author?: string }) {
  const duels = findDuels(feed?.notes ?? [], true).filter(d => !author || [d.target.author, d.counter.author].some(a => a.toLowerCase() === author.toLowerCase()));
  return <section aria-labelledby="open-duels"><h2 id="open-duels">Open duels <span className="small">/ {feed ? duels.length : '…'}</span></h2>
    <p className="small">Same token. Opposite sides. Separate bonds and horizons.</p>
    {duels.map(duel => <div className="duel" key={duel.counter.id}><DuelPair duel={duel} /><a className="duel-link" href={`#/duel/${duel.counter.id}`}>Follow this duel →</a></div>)}
    {feed && !duels.length && <p className="empty">No open duel in {feed.partial ? 'the available' : 'this'} record. <a href="#/feed">Find a call to counter.</a></p>}
    {!feed && <p className="empty">Reading duels…</p>}
  </section>;
}

export function DuelPage({ id: raw, feed, error }: FeedProps & { id: Hex }) {
  const { contracts } = useApp();
  const id = noteIdFromIndex(BigInt(raw));
  const duel = findDuels(feed?.notes ?? []).find(d => d.counter.id.toLowerCase() === id.toLowerCase());
  if (!duel) return <><h1>Duel</h1><p className="empty">{error ? `Could not read the duel: ${error}` : !feed ? 'Reading both calls…' : feed.partial ? 'This duel is not in the available history. Load more history or refresh.' : 'This note is not an opposite-side counter-call against another wallet on the same token.'}</p></>;
  const token = duel.counter.x.toLowerCase() === contracts.marg.toLowerCase() ? 'MARG' : short(duel.counter.x);
  const verdict = duelVerdict(duel);
  return <><p className="eyebrow">Two claims. One public record.</p><h1>Duel {duel.counter.source==='annex'?short(duel.counter.id,8,6):`№ ${duel.counter.index.toString()}`}</h1>
    <p className="lede">{verdict}</p>
    <DuelPair duel={duel} records />
    <p className="small">Each call settles independently; different targets and horizons can make both right, or neither.</p>
    <Share card={{ kind: 'Duel', title: verdict, columns: [noteColumn(duel.target, token), noteColumn(duel.counter, token)], line: `Marginalia duel: ${short(duel.target.author)} vs ${short(duel.counter.author)}. ${verdict}.`, filename: `marginalia-duel-${duel.counter.index}` }} />
    <p className="small">Open either note for its observations and permissionless settlement controls.</p>
  </>;
}
