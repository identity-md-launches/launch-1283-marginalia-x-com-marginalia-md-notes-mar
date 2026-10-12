import { MarginaliaHookAbi, MarginaliaJudgeAbi } from '../abi';
import { useApp, useRead } from '../chain';
import { fmtAmount, fmtDate, Status } from '../lib';
import { Notice, TxButton } from '../ui';
import { Entry, type FeedProps } from './Feed';

export function PoolsPage({ feed, refresh }: FeedProps) {
  const { pub, contracts, wallet, now } = useApp();
  const hook = { address: contracts.hook, abi: MarginaliaHookAbi } as const;
  const judge = { address: contracts.judge, abi: MarginaliaJudgeAbi } as const;
  const state = useRead(async () => {
    const [today, week] = await Promise.all([pub.readContract({ ...hook, functionName: 'today' }), pub.readContract({ ...hook, functionName: 'week' })]);
    const days = [today, today - 1, today - 2];
    const weeks = [week, week - 1, week - 2];
    const [refunds, counts, theses, judgedPaid, judgedSet, closed] = await Promise.all([
      Promise.all(days.map((d) => pub.readContract({ ...hook, functionName: 'refundPool', args: [d] }))),
      Promise.all(days.map((d) => pub.readContract({ ...hook, functionName: 'notesPerDay', args: [d] }))),
      Promise.all(weeks.map((w) => pub.readContract({ ...hook, functionName: 'thesisPool', args: [w] }))),
      Promise.all(weeks.map((w) => pub.readContract({ ...hook, functionName: 'judgedPaid', args: [w] }))),
      Promise.all(weeks.map((w) => pub.readContract({ ...judge, functionName: 'judgedSet', args: [w] }))),
      Promise.all(weeks.map((w) => pub.readContract({ ...judge, functionName: 'weekClosed', args: [w] }))),
    ]);
    return { today, week, days, weeks, refunds, counts, theses, judgedPaid, judgedSet, closed };
  }, [feed?.loadedAt]);
  const s = state.data;
  const mine = wallet.account ? feed?.notes.filter((n) => n.author.toLowerCase() === wallet.account!.toLowerCase()) ?? [] : [];
  const claimable = mine.filter((n) => n.deposit > 0n && (n.status === Status.Right || n.status === Status.VoidNoData || n.status === Status.ThesisClosed));
  const refundable = mine.filter((n) => n.status !== Status.Retracted && s && Math.floor(n.timestamp / 86400) < s.today);
  const sendSweep = (kind: number, epoch: number) => async () => {
    const { request } = await pub.simulateContract({ ...hook, functionName: 'sweep', args: [kind, epoch], account: wallet.account! });
    return wallet.client!.writeContract(request);
  };
  const sweepableDay = s ? s.days.find((d, i) => s.refunds[i] > 0n && now >= (d + 1) * 86400 + contracts.limits.sweepAfter) : undefined;

  return (
    <>
      <h1>Pools</h1>
      <p className="lede">
        Every fee, stamp and forfeited bond stays in IMD inside the hook. At accrual, 70% goes to the week's thesis prize and 30% to the day's writer
        refund. Nothing is sold for ETH, and nothing here pays for being right.
      </p>
      {state.error && (
        <Notice kind="bad">
          <p>Could not read the pools: {state.error}</p>
        </Notice>
      )}
      <h2>Writer refunds, by day</h2>
      <p className="small">
        Non-retracted notes of a day share the day's refund pool after it ends, capped at one stamp (0.1 IMD) each. Day numbers count from the Unix
        epoch; today is {s ? s.today : '…'}.
      </p>
      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Ends</th>
            <th className="num">Pool (IMD)</th>
            <th className="num">Notes</th>
          </tr>
        </thead>
        <tbody>
          {s?.days.map((d, i) => (
            <tr key={d}>
              <td>
                {d}
                {i === 0 ? ' (today)' : ''}
              </td>
              <td>{fmtDate((d + 1) * 86400)}</td>
              <td className="num">{fmtAmount(s.refunds[i])}</td>
              <td className="num">{s.counts[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Thesis prize, by week</h2>
      <p className="small">
        Judging a week waits until the week ends plus the 7-day child grace, needs at least {fmtAmount(contracts.limits.judgeThreshold)} IMD in the pool, and
        pays an evidence panel's top three 50 / 30 / 20. An eligible thesis is one with a child call. This week is {s ? s.week : '…'}.
      </p>
      <table>
        <thead>
          <tr>
            <th>Week</th>
            <th>Judging opens</th>
            <th className="num">Pool (IMD)</th>
            <th>Judging state</th>
          </tr>
        </thead>
        <tbody>
          {s?.weeks.map((w, i) => {
            const opens = (w + 1) * 7 * 86400 + contracts.limits.thesisGrace;
            const st = s.judgedPaid[i]
              ? 'paid'
              : s.judgedSet[i]
                ? 'judged, payout pending'
                : s.closed[i]
                  ? 'closed without judging'
                  : now < opens
                    ? 'waiting'
                    : s.theses[i] < contracts.limits.judgeThreshold
                      ? 'below threshold'
                      : 'ready for the judge';
            return (
              <tr key={w}>
                <td>
                  {w}
                  {i === 0 ? ' (this week)' : ''}
                </td>
                <td>{fmtDate(opens)}</td>
                <td className="num">{fmtAmount(s.theses[i])}</td>
                <td>{st}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h2>Sweep</h2>
      <p className="small">
        A pool left unclaimed for 28 days after its period rolls forward into the current week's thesis prize. Anyone may sweep; it pays nothing. A
        week's pool can be swept only once the judge confirms the week is closed.
      </p>
      {sweepableDay !== undefined ? (
        <TxButton label={`Sweep day ${sweepableDay}`} busyLabel="Sweeping…" onSend={sendSweep(0, sweepableDay)} onDone={() => state.refresh()} />
      ) : (
        <p className="small">No recent day pool is old enough to sweep. Older epochs can be swept from a wallet directly with sweep(kind, epoch).</p>
      )}

      <h2>Your claims</h2>
      {!wallet.account && <p className="small">Connect a wallet to see deposits and refunds you can claim.</p>}
      {wallet.account && (
        <>
          <p className="small">
            Deposits ({claimable.length}) are claimed per note; refunds are available for {refundable.length} of your notes from past days, subject to the
            pool of that day. Open a note to claim.
          </p>
          <ul className="ledger">
            {[...claimable, ...refundable.filter((n) => !claimable.includes(n))].map((n) => (
              <Entry key={n.id} n={n} />
            ))}
          </ul>
          {claimable.length + refundable.length === 0 && <p className="empty">Nothing to claim right now.</p>}
        </>
      )}
      <p className="small">
        <button type="button" className="quiet" onClick={() => { state.refresh(); refresh(); }}>
          Refresh from chain
        </button>
      </p>
    </>
  );
}
