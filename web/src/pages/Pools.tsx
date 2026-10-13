import { JudgingControls } from '../judging';
import { UsdContext } from '../price';
import { useState } from 'react';
import { formatUnits } from 'viem';
import { ClaimControls, readClaim } from '../claims';
import { MarginaliaHookAbi, MarginaliaJudgeAbi } from '../abi';
import { useApp, useRead } from '../chain';
import { fmtAmount, fmtDate } from '../lib';
import { Notice, TxButton } from '../ui';
import { Entry, type FeedProps } from './Feed';

export function PoolsPage({ feed, refresh }: FeedProps) {
  const { pub, contracts, wallet, now } = useApp();
  const hook = { address: contracts.hook, abi: MarginaliaHookAbi } as const;
  const judge = { address: contracts.judge, abi: MarginaliaJudgeAbi } as const;
  const [sweepKind, setSweepKind] = useState<0 | 1>(0);
  const [epochInput, setEpochInput] = useState('');
  const [paid, setPaid] = useState<Record<string, boolean>>({});
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
  const claims = useRead(wallet.account && feed ? async () => {
    const rows = await Promise.all(mine.map(async n => ({ note: n, claim: await readClaim(pub, contracts.hook, n, contracts.limits.stamp) })));
    return { account: wallet.account, rows };
  } : null, [wallet.account, feed?.loadedAt, s?.today]);
  const rows = claims.data?.account === wallet.account ? claims.data.rows.map(row => ({ ...row, claim: {
    ...row.claim,
    deposit: paid[`${row.note.id}:deposit`] ? 0n : row.claim.deposit,
    refund: paid[`${row.note.id}:refund`] ? 0n : row.claim.refund,
  } })) : [];
  const claimable = rows.filter(r => r.claim.deposit > 0n);
  const refundable = rows.filter(r => r.claim.refund > 0n);
  const afterClaim = (id: string) => (kind: 'deposit' | 'refund') => {
    setPaid(p => ({ ...p, [`${id}:${kind}`]: true }));
    claims.refresh(); state.refresh(); sweepRead.refresh(); refresh();
  };
  // Preselect an epoch old enough to inspect, and allow any earlier day or week.
  const span = sweepKind === 0 ? 86400 : 7 * 86400;
  const defaultEpoch = Math.max(0, Math.floor((now - contracts.limits.sweepAfter) / span) - 1);
  const epochText = epochInput || String(defaultEpoch);
  const epoch = /^\d+$/.test(epochText) && Number(epochText) <= 4294967295 ? Number(epochText) : null;
  const sweepRead = useRead(epoch !== null ? async () => ({
    epoch, kind: sweepKind,
    balance: await pub.readContract({ ...hook, functionName: sweepKind === 0 ? 'refundPool' : 'thesisPool', args: [epoch] }),
    closed: sweepKind === 0 || await pub.readContract({ ...judge, functionName: 'weekClosed', args: [epoch] }),
  }) : null, [epoch, sweepKind, feed?.loadedAt]);
  const sweep = sweepRead.data?.epoch === epoch && sweepRead.data?.kind === sweepKind && !sweepRead.error ? sweepRead.data : undefined;
  const sweepAt = epoch !== null ? (epoch + 1) * span + contracts.limits.sweepAfter : 0;
  const canSweep = !!sweep && now >= sweepAt && sweep.closed && sweep.balance > 0n && !sweepRead.loading;
  const sendSweep = (kind: number, epoch: number) => async () => {
    const { request } = await pub.simulateContract({ ...hook, functionName: 'sweep', args: [kind, epoch], account: wallet.account! });
    return wallet.client!.writeContract(request);
  };

  return (
    <>
      <h1>Pools</h1>
      <p className="lede">
        Hook fees, stamps and forfeited bonds stay in IMD inside the hook. At accrual, 70% goes to the week's thesis prize and 30% to the day's writer
        refund. Annex stamps fund MARG burns; its forfeitures join these pools. Nothing here pays for being right.
      </p>
      {state.error && (
        <Notice kind="bad">
          <p>Could not read the pools: {state.error}</p>
        </Notice>
      )}
      <h2>Writer refunds, by day</h2>
      <p className="small">
        Non-retracted notes of a day share the day's refund pool after it ends, capped at one stamp ({fmtAmount(contracts.limits.stamp)} IMD <UsdContext imd={contracts.limits.stamp}/>) each. Day numbers count from the Unix
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
              <td className="num">{fmtAmount(s.refunds[i])} <UsdContext imd={s.refunds[i]}/></td>
              <td className="num">{s.counts[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Thesis prize, by week</h2>
      <p className="small">
        Judging a week waits until the week ends plus the 7-day child grace, needs at least {fmtAmount(contracts.limits.judgeThreshold)} IMD <UsdContext imd={contracts.limits.judgeThreshold}/> in the pool, and
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
                <td className="num">{fmtAmount(s.theses[i])} <UsdContext imd={s.theses[i]}/></td>
                <td>{st}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <JudgingControls/>
      <h2>Sweep</h2>
      <p className="small">
        A pool left unclaimed for 28 days after its period rolls forward into the current week's thesis prize. Anyone may sweep; it pays nothing. A
        week's pool can be swept only once the judge confirms the week is closed.
      </p>
      <label htmlFor="sweep-kind">Pool to inspect</label>
      <select id="sweep-kind" value={sweepKind} onChange={e => { setSweepKind(Number(e.target.value) as 0 | 1); setEpochInput(''); }}>
        <option value={0}>Day · writer refund</option><option value={1}>Week · thesis prize</option>
      </select>
      <label htmlFor="sweep-epoch">{sweepKind === 0 ? 'Day' : 'Week'} number</label>
      <input id="sweep-epoch" inputMode="numeric" value={epochText} onChange={e => setEpochInput(e.target.value)} aria-invalid={epoch === null} />
      {epoch === null && <p role="alert" className="status bad">Enter a whole epoch number from 0 to 4294967295.</p>}
      {sweepRead.error && <Notice kind="bad"><p>Could not read this pool. Refresh to try again.</p></Notice>}
      {sweep && <dl className="facts">
        <dt>Remaining</dt><dd>{formatUnits(sweep.balance, 18)} IMD <UsdContext imd={sweep.balance}/></dd>
        <dt>Sweep opens</dt><dd>{fmtDate(sweepAt)} · {now >= sweepAt ? '28-day wait complete' : 'too early'}</dd>
        {sweepKind === 1 && <><dt>Judge closure</dt><dd>{sweep.closed ? 'Week closed' : 'Week is not closed; cannot sweep'}</dd></>}
      </dl>}
      <TxButton key={`${sweepKind}:${epoch}`} label={`Sweep ${sweepKind === 0 ? 'day' : 'week'} ${epoch ?? '…'}`} busyLabel="Sweeping…" disabled={!canSweep} onSend={sendSweep(sweepKind, epoch!)} onDone={() => { sweepRead.refresh(); state.refresh(); claims.refresh(); }} explain={sweep?.balance === 0n ? 'This pool is empty; nothing can be swept.' : 'Rolls this eligible pool into the current week. No reward is paid to the caller.'} />

      <h2>Your claims</h2>
      {!wallet.account && <p className="small">Connect a wallet to see deposits and refunds you can claim.</p>}
      {wallet.account && (
        <>
          {claims.error && <Notice kind="bad"><p>Could not check claim eligibility. Refresh to try again.</p></Notice>}
          {!claims.data && !claims.error ? <p className="small">Checking your claims…</p> : <p className="small">Deposits available: {claimable.length}. Writer refunds available: {refundable.length}. {feed?.partial && 'These counts cover only the available note history.'}</p>}
          <ul className="ledger">
            {rows.filter(r => r.claim.deposit > 0n || r.claim.refund > 0n).map(({ note, claim }) => (
              <Entry key={note.id} n={note}><ClaimControls claim={claim} onDone={afterClaim(note.id)} /></Entry>
            ))}
          </ul>
          {claims.data && claimable.length + refundable.length === 0 && <p className="empty">Nothing to claim among the loaded notes.</p>}
        </>
      )}
      <p className="small">
        <button type="button" className="quiet" onClick={() => { state.refresh(); sweepRead.refresh(); claims.refresh(); refresh(); }}>
          Refresh from chain
        </button>
      </p>
    </>
  );
}
