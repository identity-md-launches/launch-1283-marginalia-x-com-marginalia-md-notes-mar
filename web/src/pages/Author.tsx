import type { Address } from 'viem';
import { MarginaliaHookAbi } from '../abi';
import { useApp, useRead } from '../chain';
import { fmtScore } from '../lib';
import { Addr, Notice } from '../ui';
import { Entry, type FeedProps } from './Feed';

export function AuthorPage({ address, feed, error }: FeedProps & { address: Address }) {
  const { pub, contracts, wallet } = useApp();
  const rec = useRead(
    () => pub.readContract({ address: contracts.hook, abi: MarginaliaHookAbi, functionName: 'records', args: [address] }),
    [address, feed?.loadedAt],
  );
  const notes = feed?.notes.filter((n) => n.author.toLowerCase() === address.toLowerCase()) ?? [];
  const r = rec.data;
  const mine = wallet.account?.toLowerCase() === address.toLowerCase();
  return (
    <>
      <h1>Author</h1>
      <p>
        <Addr a={address} full />
        {mine && <span className="small"> (this is you)</span>}
      </p>
      <h2>Record</h2>
      <p className="small">
        The score is reputation only: log₂(claimed multiple) × √(30 / horizon) × a market-cap tier, +1 when right, −1 when wrong or unproven,
        −0.5 when retracted. No pool pays for it.
      </p>
      {rec.error && (
        <Notice kind="bad">
          <p>Could not read the record: {rec.error}</p>
        </Notice>
      )}
      <table>
        <thead>
          <tr>
            <th>Score</th>
            <th className="num">Posted</th>
            <th className="num">Right</th>
            <th className="num">Wrong</th>
            <th className="num">Broken</th>
            <th className="num">Retracted</th>
            <th className="num">Judged wins</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{fmtScore(r?.[0])}</td>
            <td className="num">{r ? r[1] : '…'}</td>
            <td className="num">{r ? r[2] : '…'}</td>
            <td className="num">{r ? r[3] : '…'}</td>
            <td className="num">{r ? r[4] : '…'}</td>
            <td className="num">{r ? r[5] : '…'}</td>
            <td className="num">{r ? r[6] : '…'}</td>
          </tr>
        </tbody>
      </table>
      <h2>Notes</h2>
      {error && (
        <Notice kind="bad">
          <p>Could not read the feed: {error}</p>
        </Notice>
      )}
      <ul className="ledger">
        {notes.map((n) => (
          <Entry key={n.id} n={n} />
        ))}
      </ul>
      {feed && notes.length === 0 && <p className="empty">This author has not posted a note yet.</p>}
      {mine && (
        <p className="small">
          Deposits and refunds are claimed from each note's own page. Open a note above to claim.
        </p>
      )}
    </>
  );
}
