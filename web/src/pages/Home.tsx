import { useState } from 'react';
import type { Address } from 'viem';
import { readRecord } from '../records';
import { MarginaliaHookAbi, MarginaliaJudgeAbi } from '../abi';
import { useApp, useRead } from '../chain';
import { HistoryStatus } from '../history';
import { fmtAmount, fmtDate, fmtScore, short } from '../lib';
import { UsdContext } from '../price';
import { citedAccounts, formatRate, rankAuthors, recordRate, REASONS, type RankedAuthor } from '../scoreboard';
import { Caveat, Countdown, Notice, StatusTag } from '../ui';
import { FeedPage, type FeedProps } from './Feed';
import { OpenDuels } from './Duel';

/** The three sentences every screen is tested against. Verbatim from the owner's brief. */
export const PROMISE = ['Build your trader reputation on-chain.', 'Write your notes and theses with your trades.', 'Let readers back you by holding your pages.'] as const;
export const WALLET_LINE = 'You are your wallet. No account, no handle, no name unless you want one.';

export function usePrize(loadedAt?: number) {
  const { pub, contracts, now } = useApp();
  return useRead(async () => {
    const week = await pub.readContract({ address: contracts.hook, abi: MarginaliaHookAbi, functionName: 'week' });
    const [pool, eligible] = await Promise.all([
      pub.readContract({ address: contracts.hook, abi: MarginaliaHookAbi, functionName: 'thesisPool', args: [week] }),
      pub.readContract({ address: contracts.judge, abi: MarginaliaJudgeAbi, functionName: 'eligibleTheses', args: [week] }),
    ]);
    return { week, pool, eligible: eligible.length, closes: (week + 1) * 604800, opens: (week + 1) * 604800 + contracts.limits.thesisGrace };
  }, [loadedAt, Math.floor(now / 30)], [contracts.hook]);
}

export function Prize({ loadedAt }: { loadedAt?: number }) {
  const { contracts } = useApp();
  const read = usePrize(loadedAt);
  const s = read.error ? undefined : read.data;
  return <section className="prize" aria-label="This week's thesis prize">
    <div><p className="eyebrow">This week's thesis prize</p>
      <p className="prize-amount">{s ? fmtAmount(s.pool) : '…'} <span>IMD</span></p>
      <UsdContext imd={s?.pool} />
    </div>
    <div className="prize-clock"><p className="small">Judging opens</p>
      <p className="clock-value">{s ? <Countdown until={s.opens} prefix="in " /> : 'Reading the clock…'}</p>
      {s && <p className="small">{fmtDate(s.opens)}</p>}
      {s && <p className="small">{s.eligible === 0 ? <>no thesis entered yet · <a href="#/thesis">Write a thesis</a></> : <>{s.eligible} eligible {s.eligible === 1 ? 'thesis' : 'theses'} · <a href="#/pools">View pools</a></>}</p>}
    </div>
    {read.error && <Notice kind="bad"><p>Prize unavailable. <button type="button" className="quiet" onClick={read.refresh}>Retry prize read</button></p></Notice>}
    <p className="small prize-rule">A thesis counts only after you post one ordinary call under it within 7 days. Judging needs {fmtAmount(contracts.limits.judgeThreshold)} IMD <UsdContext imd={contracts.limits.judgeThreshold}/> and pays the top three 50 / 30 / 20.</p>
  </section>;
}

/** The first screen: the promise, the caveat, three doors and one secondary link. */
export function Doors({ loadedAt }: { loadedAt?: number }) {
  const { wallet } = useApp();
  const prize = usePrize(loadedAt);
  const p = prize.error ? undefined : prize.data;
  const mine = wallet.account && wallet.onChain ? `#/author/${wallet.account}` : null;
  return <section className="doors" aria-label="Three doors">
    <div className="door">
      <h2>Make a call</h2>
      <p>A target, a horizon and one line of why, with your trade if you want it. The chain settles it.</p>
      <a className="button primary" href="#/call">Make a call</a>
    </div>
    <div className="door">
      <h2>Write a thesis</h2>
      <p>A longer argument for this week's pot{p ? <>: {fmtAmount(p.pool)} IMD<UsdContext imd={p.pool}/>, entries close {fmtDate(p.closes)}</> : prize.error ? '. Pot unavailable right now' : '. Reading the pot…'}.</p>
      <a className="button primary" href="#/thesis">Write a thesis</a>
    </div>
    <div className="door">
      <h2>Your pages</h2>
      <p>Your own page and record. Readers back you by holding your pages.</p>
      {mine ? <a className="button primary" href={mine}>Your pages</a> : <button type="button" className="primary" onClick={wallet.connect} disabled={wallet.connecting}>{wallet.connecting ? 'Connecting…' : 'Connect to open your pages'}</button>}
    </div>
    <p className="door-secondary"><a href="#/scoreboard">See who is right</a> · the public record, by hit rate.</p>
    <p className="small wallet-line">{WALLET_LINE}</p>
  </section>;
}

export function Leaderboards({ feed }: Pick<FeedProps, 'feed'>) {
  const { pub, contracts, cfg } = useApp();
  const [order, setOrder] = useState<'score' | 'rate'>('rate');
  const records = useRead(feed ? async () => {
    const authors = [...new Set(feed.notes.map(n => n.author.toLowerCase()))] as Address[];
    const rows: RankedAuthor[] = [];
    let missing = 0;
    // Keep RPC fanout bounded even when the history grows.
    for (let i = 0; i < authors.length; i += 6) {
      const batch = await Promise.allSettled(authors.slice(i, i + 6).map(async address => ({ address, record: await readRecord(pub,contracts,address) })));
      for (const result of batch) { if (result.status === 'fulfilled') rows.push(result.value); else missing++; }
    }
    return { rows, missing };
  } : null, [feed?.loadedAt]);
  const ranked = rankAuthors(records.data?.rows ?? [], order);
  const cited = citedAccounts(feed?.notes ?? []);
  return <div className="leaderboards">
    <section aria-labelledby="author-leaderboard"><div className="section-head"><h2 id="author-leaderboard">Who is right</h2><span className="eyebrow">Posting wallets</span></div>
      <div className="tabs" role="group" aria-label="Rank authors"><button type="button" aria-pressed={order === 'rate'} onClick={() => setOrder('rate')}>By hit rate</button><button type="button" aria-pressed={order === 'score'} onClick={() => setOrder('score')}>By score</button></div>
      <ol className="ranking" aria-label="Author leaderboard">{ranked.map(({ address, record: r }, i) => <li key={address}>
        <div className="rank-line"><span className="rank-number">{String(i + 1).padStart(2, '0')}</span><a className="mono" href={`#/author/${address}`}>{short(address)}</a><strong>{order === 'score' ? fmtScore(r[0]) : formatRate(recordRate(r))}</strong></div>
        <p className="small">{r[1]} posted · {r[2]} right · {r[3]} wrong · {r[4]} broken · {r[5]} retracted</p>
        <p className="small">{order === 'score' ? `${formatRate(recordRate(r))} hit rate` : `${fmtScore(r[0])} score`}</p>
      </li>)}</ol>
      {(!feed || records.loading) && <p className="small" role="status">Reading wallet records…</p>}
      {feed && records.data && !ranked.length && !records.data.missing && <p className="empty">The record starts with a call. <a href="#/call">Make yours.</a></p>}
      {(records.error || !!records.data?.missing) && <Notice kind="bad"><p>{records.data?.missing ?? 'Some'} wallet records could not be read; ranking is incomplete.</p><button type="button" className="quiet" onClick={records.refresh}>Retry records</button></Notice>}
      <details className="small metric-note"><summary>How to read the score</summary><p>Hit rate = right ÷ (right + wrong + broken + retracted); open calls, theses and no-data outcomes are excluded. Score accrues only on calls priced on the MARG launch pool; every other token's calls settle and count in the hit rate. Harder targets earn more weight. A dash means no counted result.</p></details>
    </section>
    <section aria-labelledby="cited-leaderboard"><div className="section-head"><h2 id="cited-leaderboard">Cited accounts</h2><span className="eyebrow">Receipts index</span></div>
      <p className="small">Ranked by right receipt notes. The cited account did not post the note; the posting wallet owns its bond and hold rule.</p>
      <ol className="ranking cited-ranking">{cited.map((r, i) => <li key={r.handle}>
        <div className="rank-line"><span className="rank-number">{String(i + 1).padStart(2, '0')}</span><a href={`#/feed?cites=${encodeURIComponent(r.handle)}`}>@{r.handle}</a>{cfg.pages && <a className="small" href={`#/pages/${r.handle}`}>Pages</a>}<strong>{r.right} right</strong></div>
        <p className="small">{r.posted} receipts · {r.wrong} wrong · {r.broken} broken · {r.retracted} retracted · {r.noData} no data · {r.open} open</p>
      </li>)}</ol>
      {feed && !cited.length && <p className="empty">No cited calls in this record yet. Start a note with an X status URL to leave a receipt.</p>}
      <p className="small">Citations are supplied by writers; they do not verify identity, endorsement or the original claim.</p>
    </section>
  </div>;
}

export function Verdicts({ feed }: Pick<FeedProps, 'feed'>) {
  const settled = (feed?.notes ?? []).filter(n => n.settlement).sort((a, b) => a.settlement!.block > b.settlement!.block ? -1 : a.settlement!.block < b.settlement!.block ? 1 : 0).slice(0, 6);
  return <section className="verdicts" aria-label="Recent verdicts"><h2>Recent verdicts</h2>
    <div className="verdict-strip">{settled.map(n => <a key={n.id} href={`#/note/${n.id}`} className="verdict-item"><StatusTag status={n.settlement!.status} /><span className="mono">{short(n.author)}</span><span className="small">{n.source==='annex'?short(n.id,8,6):`№ ${n.index.toString()}`} · {fmtScore(n.settlement!.scoreDelta)}</span></a>)}</div>
    {feed && !settled.length && <p className="small">No verdict recorded in the available history yet.</p>}
  </section>;
}

export function HomePage(props: FeedProps) {
  return <>
    <div className="promise"><h1>{PROMISE.map(line => <span key={line}>{line}</span>)}</h1></div>
    <Caveat/>
    <Doors loadedAt={props.feed?.loadedAt}/>
    <Scoreboard {...props} embedded/>
  </>;
}
export function Scoreboard(props: FeedProps & {embedded?:boolean}) {
  return <section className="scoreboard">{!props.embedded && <h1>The public record</h1>}
    <HistoryStatus {...props} /><Leaderboards feed={props.feed}/><Verdicts feed={props.feed}/><Prize loadedAt={props.feed?.loadedAt} /><OpenDuels feed={props.feed}/><FeedPage {...props} embedded/>
    <ol className="reasons">{REASONS.map((reason,i)=><li key={reason}><span className="mono">0{i+1}</span><p>{reason}</p></li>)}</ol>
  </section>;
}
