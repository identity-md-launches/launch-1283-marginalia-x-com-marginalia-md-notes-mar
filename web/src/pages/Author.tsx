import type { Address } from 'viem';
import { MarginaliaHookAbi } from '../abi';
import { useApp, useRead } from '../chain';
import { fmtScore, short } from '../lib';
import { formatRate, recordRate, weightedWins } from '../scoreboard';
import { Share } from '../share';
import { Addr, Notice } from '../ui';
import { OpenDuels } from './Duel';
import { Entry, type FeedProps } from './Feed';

export function AuthorPage({ address, feed, error, loading, refresh }: FeedProps & { address: Address }) {
  const { pub, contracts, wallet } = useApp();
  const rec = useRead(() => pub.readContract({ address: contracts.hook, abi: MarginaliaHookAbi, functionName: 'records', args: [address] }), [address, feed?.loadedAt]);
  const notes = feed?.notes.filter(n => n.author.toLowerCase() === address.toLowerCase()) ?? [];
  const r = rec.error ? undefined : rec.data;
  const mine = wallet.account?.toLowerCase() === address.toLowerCase();
  const weighted = weightedWins(notes);
  return <>
    <p className="eyebrow">The record speaks</p><h1>Author record</h1>
    <p><Addr a={address} full />{mine && <span className="small"> (this wallet)</span>}</p>
    <p className="small">Record of a wallet, claimable later.</p>
    {rec.error && <Notice kind="bad"><p>Could not read the record. <button type="button" onClick={rec.refresh}>Retry record</button></p></Notice>}
    <div className="scoreboard-stats">
      <div><span className="eyebrow">Score</span><strong>{fmtScore(r?.[0])}</strong></div>
      <div><span className="eyebrow">Hit rate</span><strong>{r ? formatRate(recordRate(r)) : '…'}</strong></div>
      <div><span className="eyebrow">Difficulty-weighted wins</span><strong>{feed ? fmtScore(weighted) : '…'}</strong></div>
    </div>
    <p className="hold-count">{r ? r[4] : '…'} upward {r?.[4] === 1 ? 'call broke' : 'calls broke'} the wallet's hold rule.</p>
    <dl className="record-grid">{['Posted', 'Right', 'Wrong', 'Broken', 'Retracted', 'Judged wins'].map((label, i) => <div key={label}><dt>{label}</dt><dd>{r ? r[i + 1].toString() : '…'}</dd></div>)}</dl>
    <details className="metric-note small"><summary>What counts</summary><p>Hit rate = right ÷ (right + wrong + broken + retracted); open, thesis and no-data outcomes are excluded. Score still penalizes no-data outcomes.</p><p>Difficulty-weighted wins sum positive score changes from right calls in the loaded history{feed?.partial ? ' (incomplete)' : ''}; they are not the net score or the number of thesis prizes.</p></details>
    <Share card={{ kind: 'Author', title: `The record of ${short(address)}`, columns: [{ title: 'Wallet record · unclaimed', claim: r ? `Score ${fmtScore(r[0])} · ${formatRate(recordRate(r))} hit rate. ${r[2]} right / ${r[3]} wrong / ${r[4]} broken / ${r[5]} retracted. ${r[1]} posted.` : 'Record unavailable.', author: short(address), result: feed ? `${fmtScore(weighted)} difficulty-weighted wins${feed.partial ? ' · partial history' : ''}` : 'Win history unavailable', detail: 'Hit rate excludes open, thesis and no-data outcomes.' }], line: `Marginalia wallet ${short(address)}: ${r ? `score ${fmtScore(r[0])}, ${formatRate(recordRate(r))} hit rate, ${r[4]} broken holds. Hit rate excludes open, thesis and no-data outcomes.` : 'record unavailable.'}`, filename: `marginalia-author-${address}` }} />
    <OpenDuels feed={feed} author={address} />
    <h2>Notes on the record</h2>
    {error && <Notice kind="bad"><p>Could not read the notes: {error}</p></Notice>}
    <ul className="ledger">{notes.map(n => <Entry key={n.id} n={n} />)}</ul>
    {feed && !notes.length && <p className="empty">{feed.partial ? 'No notes from this wallet in the available history; older notes may be missing.' : 'This wallet has not posted a note yet.'}</p>}
    {mine && <p className="small">Claim deposits and refunds from <a href="#/pools">Pools</a>.</p>}
    <button type="button" className="quiet" disabled={loading} onClick={() => { rec.refresh(); refresh(); }}>{loading ? 'Reading…' : 'Refresh record'}</button>
  </>;
}
