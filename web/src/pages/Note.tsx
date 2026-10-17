import { sendChecked } from '../transactions';
import { NoteVenue } from '../note-venue';
import { UsdContext } from '../price';
import { Citation } from '../receipts';
import { noteColumn, noteShareLine, Share } from '../share';
import { findDuels } from '../scoreboard';
import { formatUnits, maxUint256, type Hex } from 'viem';
import { useState } from 'react';
import { ClaimControls, readClaim } from '../claims';
import { MarginaliaHookAbi, erc20Abi } from '../abi';
import { useApp, useRead } from '../chain';
import { CLASS_LABEL, describeTarget, fmtAmount, fmtDate, noteIdFromIndex, short, Status, utf8Length, STATUS_EXPLAIN, STATUS_LABEL } from '../lib';
import { horizonEndOf, isThesis } from '../notes';
import { Addr, Countdown, Notice, StatusTag, TxButton, TxLink } from '../ui';
import { describeOutcome, Entry, type FeedProps } from './Feed';
import { useThesisParent } from '../child-call';
import { ChildPosted, postedChild } from '../social';
import { Person } from '../identity';
import { childCallHref } from '../thesis-parent';

const ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000';

export function NotePage({ id: rawId, feed, error, loading, refresh }: FeedProps & { id: Hex }) {
  const { pub, contracts, wallet, now } = useApp();
  const id = rawId.length === 66 ? (rawId.toLowerCase() as Hex) : noteIdFromIndex(BigInt(rawId));
  const n = feed?.byId.get(id) ?? feed?.notes.find((x) => x.id.toLowerCase() === id);
  const childParent = useThesisParent(n && isThesis(n) ? id : '');
  const app = useApp();
  const [retraction,setRetraction]=useState('');
  const [paid, setPaid] = useState<Record<string, boolean>>({});
  const claimRead = useRead(n ? () => readClaim(pub, contracts.hook, n, contracts.limits.stamp) : null, [n?.id, feed?.loadedAt]);
  const claim = claimRead.data?.id === n?.id ? claimRead.data : undefined;
  const metadata = useRead(n ? async () => {
    const [decimals, symbol] = await Promise.all([
      pub.readContract({ address: n.x, abi: erc20Abi, functionName: 'decimals' }).catch(() => null),
      pub.readContract({ address: n.x, abi: erc20Abi, functionName: 'symbol' }).catch(() => 'X'),
    ]);
    return { x: n.x, decimals, symbol };
  } : null, [n?.x]);
  const token = metadata.data?.x === n?.x ? metadata.data : undefined;
  const balanceText = (v: bigint) => v === maxUint256 ? 'Unavailable (token read failed)' : token?.decimals !== null && token?.decimals !== undefined ? formatUnits(v, token.decimals) : `${v} raw units`;

  if (error)
    return (
      <Notice kind="bad">
        <p>Could not read the feed: {error}</p>
      </Notice>
    );
  if (!feed) return <p className="empty">Reading notes from Ethereum…</p>;
  if (!n) return <p className="empty">{feed.partial ? 'This note is not in the available history; older events may be missing.' : <>No note with id {short(id, 10, 6)} has been posted yet.</>}</p>;

  const thesis = isThesis(n);
  const hEnd = horizonEndOf(n);
  const wEnd = hEnd + contracts.limits.settleWindow;
  const graceEnd = n.timestamp + contracts.limits.thesisGrace;
  const children = feed.notes.filter((c) => c.parentId.toLowerCase() === n.id.toLowerCase());
  const parent = n.parentId !== ZERO ? feed.byId.get(n.parentId) : undefined;
  const mine = wallet.account?.toLowerCase() === n.author.toLowerCase();
  const hook = { address: contracts.hook, abi: MarginaliaHookAbi, erc20Abi } as const;
  const send = (fn: 'observe' | 'settle' | 'settleThesis') => async () => {
    const { request } = await pub.simulateContract({ ...hook, functionName: fn, args: [n.id], account: wallet.account! });
    return wallet.client!.writeContract(request);
  };

  return (
    <>
      <h1>
        Note № {n.index.toString()} <StatusTag status={n.status} />
      </h1>
      <p className="entry-claim">
        {thesis ? 'Thesis' : <>{n.x.toLowerCase() === contracts.marg.toLowerCase() ? 'MARG' : <Addr a={n.x} />} {describeTarget(n.side, n.targetBps)} within {n.horizonDays} days</>}
      </p>
      {thesis && <ChildPosted n={{...n, children: childParent.parent?.children ?? n.children}} feed={feed}/>}
      {thesis && mine && n.children === 0 && (childParent.parent?.children ?? 0) === 0 && !postedChild(n, feed) && childParent.ready && childParent.parent && <div className="actions">
        <a className="button primary" href={childCallHref(n.id)}>Post the child call</a>
        <span className="small">Due {fmtDate(childParent.parent.graceEnd)}</span>
      </div>}
      <Citation text={n.text} />
      <p className="entry-text">{n.text}</p>
      <p className="small">{STATUS_EXPLAIN[n.status]}</p>
      <NoteVenue n={n}/>
      <div className="actions">
        {!thesis && n.status === Status.Open && !mine && <a className="button" href={`#/post?counter=${n.id}`}>Counter this call</a>}
        {findDuels(feed.notes).filter(d => d.counter.id === n.id || d.target.id === n.id).map(d => <a className="button" key={d.counter.id} href={`#/duel/${d.counter.id}`}>View duel № {d.counter.index.toString()}</a>)}
      </div>
      <Share card={{ kind: 'Note', title: thesis ? 'A thesis on the record' : `${token?.symbol ?? short(n.x)} · ${describeTarget(n.side, n.targetBps)}`, columns: [noteColumn(n, token?.symbol ?? short(n.x))], line: noteShareLine(n), filename: `marginalia-note-${n.index}` }} />
      <dl className="facts">
        <dt>Author</dt>
        <dd>
          <Person address={n.author}/>
        </dd>
        <dt>Class</dt>
        <dd>{CLASS_LABEL[n.classLive]}</dd>
        <dt>Bond</dt>
        <dd>{n.deposit > 0n ? `${fmtAmount(n.deposit)} IMD held` : 'released or forfeited'} {n.deposit>0n && <UsdContext imd={n.deposit}/>}</dd>
        <dt>Posted</dt>
        <dd>
          {fmtDate(n.timestamp)} · block {n.block.toString()} · <TxLink hash={n.tx} />
        </dd>
        {!thesis && (
          <>
            <dt>Post price</dt>
            <dd>{fmtAmount(n.postPrice, 18, 8)} IMD per X (scaled 1e18) <UsdContext imd={n.postPrice}/></dd>
            <dt>Horizon end</dt>
            <dd>
              {fmtDate(hEnd)} {hEnd > now && <>(<Countdown until={hEnd} prefix="in " />)</>}
            </dd>
            <dt>Settlement window</dt>
            <dd>
              {fmtDate(hEnd)} → {fmtDate(wEnd)} (6 hours). Observations are taken here; settlement happens after it.
            </dd>
          </>
        )}
        {thesis && (
          <>
            <dt>Child grace</dt>
            <dd>
              until {fmtDate(graceEnd)} {graceEnd > now && <>(<Countdown until={graceEnd} prefix="" /> left)</>} · {n.children} child call{n.children === 1 ? '' : 's'}
            </dd>
          </>
        )}
        {n.revealedHash && (
          <>
            <dt>Sealed</dt>
            <dd>
              revealed from seal <span className="mono">{short(n.revealedHash, 10, 6)}</span>
            </dd>
          </>
        )}
        {n.settlement && (
          <>
            <dt>Outcome</dt>
            <dd>
              {describeOutcome(n.settlement.status)}{n.settlement.status !== Status.Retracted && <> · settle price {fmtAmount(n.settlement.settlePrice, 18, 8)}</>}{n.settlement.status !== Status.Retracted && <> · settled by <Addr a={n.settlement.keeper} /></>}
            </dd>
          </>
        )}
        {n.retraction !== undefined && (
          <>
            <dt>Retraction</dt>
            <dd>{n.retraction || '(no text)'}</dd>
          </>
        )}
        {parent && (
          <>
            <dt>Parent</dt>
            <dd>
              <a href={`#/note/${parent.id}`}>№ {parent.index.toString()}</a> · {STATUS_LABEL[parent.status]}
              {parent.author.toLowerCase() !== n.author.toLowerCase() ? ' · a counter against another author' : ' · the author’s own thesis'}
            </dd>
          </>
        )}
      </dl>

      {!thesis && (
        <>
          <h2>Observations</h2>
          <p className="small">
            Inside the 6-hour window after the horizon anyone may record a reading of the venue. At least 3 readings spaced 20 blocks and spanning an
            hour are needed; a more adverse reading replaces a slot. The site shows them; a keeper usually runs them.
          </p>
          <p className="small">X readings are lossless raw observation integers; their meaning depends on the venue and they are not spot prices. Balances use X’s on-chain decimals when available. “Unavailable” marks a failed token balance read.</p>
          {n.observations.length === 0 ? (
            <p className="empty">No observation recorded yet.</p>
          ) : (
            <div className="table-scroll" role="region" aria-label="Observation evidence" tabIndex={0}><table className="observations">
              <thead>
                <tr>
                  <th>Block</th>
                  <th className="num">X reading (raw integer)</th>
                  <th className="num">Author balance ({token?.decimals !== null && token?.decimals !== undefined ? token.symbol : 'raw units'})</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {n.observations.map((o) => (
                  <tr key={o.tx + o.block.toString()}>
                    <td>{o.block.toString()}</td>
                    <td className="num">{o.xRead.toString()}</td>
                    <td className="num">{balanceText(o.balance)}</td>
                    <td>
                      <TxLink hash={o.tx} label="" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
          {n.status === Status.Open && (
            <>
              <h3>Keeper actions</h3>
              <p className="small">
                Anyone may press these. They are how an open call becomes a result: observations gather the price evidence, settlement applies it.
                A settler receives 10% of a forfeited bond; nothing is paid otherwise.
              </p>
              {now < hEnd && (
                <p>
                  The horizon has not ended. Observing opens <Countdown until={hEnd} prefix="in " />.
                </p>
              )}
              {now >= hEnd && now <= wEnd && (
                <TxButton label="Observe" busyLabel="Observing…" onSend={send('observe')} onDone={refresh} explain={`Records one reading of the venue now. The window closes ${fmtDate(wEnd)}.`} />
              )}
              {now > wEnd && (
                <TxButton
                  label="Settle"
                  busyLabel="Settling…"
                  primary
                  onSend={send('settle')}
                  onDone={refresh}
                  explain="The window has closed. Settling computes the outcome from the recorded observations and returns or forfeits the bond."
                />
              )}
            </>
          )}
        </>
      )}

      {thesis && n.status === Status.ThesisOpen && n.children === 0 && (
        <>
          <h3>Keeper action</h3>
          {now <= graceEnd ? (
            <p>
              The author has <Countdown until={graceEnd} /> left to hang a call off this thesis. After that anyone may forfeit it.
            </p>
          ) : (
            <TxButton
              label="Forfeit thesis"
              busyLabel="Forfeiting…"
              onSend={send('settleThesis')}
              onDone={refresh}
              explain="The 7-day grace passed with no child call. Forfeiting moves the bond to the pools; the caller receives 10% of it."
            />
          )}
        </>
      )}

      {mine && (
        <>
          <h2>Your claims</h2>
          {claimRead.error && <Notice kind="bad"><p>Could not check claims. Refresh to try again.</p></Notice>}
          {claim && <>
            <p className="small">Writer refund for day {claim.day}: {formatUnits(claim.pool, 18)} IMD <UsdContext imd={claim.pool}/> shared by {claim.count} unclaimed notes, capped at one stamp. {claim.claimed || paid[`${id}:refund`] ? 'Already claimed.' : claim.day >= claim.today ? 'Opens after the day ends.' : claim.refund === 0n ? 'No share remains.' : ''}</p>
            <ClaimControls claim={{ ...claim, deposit: paid[`${id}:deposit`] ? 0n : claim.deposit, refund: paid[`${id}:refund`] ? 0n : claim.refund }} onDone={kind => { setPaid(p => ({ ...p, [`${id}:${kind}`]: true })); claimRead.refresh(); refresh(); }} />
          </>}
        </>
      )}

      {mine && n.status===Status.Open && now<hEnd && <details><summary>Retract this call</summary><p>Retracting forfeits the entire bond.</p><label htmlFor="hook-retraction">Reason (up to 280 bytes)</label><input id="hook-retraction" value={retraction} onChange={e=>setRetraction(e.target.value)}/><TxButton label="Retract and forfeit bond" busyLabel="Retracting…" disabled={utf8Length(retraction)>280} onSend={()=>sendChecked(app,contracts.hook,MarginaliaHookAbi,'retract',[n.id,retraction])} onDone={refresh}/></details>}
      {children.length > 0 && (
        <>
          <h2>Children</h2>
          <ul className="ledger">
            {children.map((c) => (
              <Entry key={c.id} n={c} />
            ))}
          </ul>
        </>
      )}
      <p className="small">
        <button type="button" className="quiet" onClick={refresh} disabled={loading}>
          {loading ? 'Reading…' : 'Refresh from chain'}
        </button>
      </p>
    </>
  );
}
