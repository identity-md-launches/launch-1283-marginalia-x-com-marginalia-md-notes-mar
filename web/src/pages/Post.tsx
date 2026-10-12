import { useEffect, useState } from 'react';
import { decodeEventLog, formatUnits, type Hex } from 'viem';
import { MarginaliaHookAbi, MarginaliaRouterAbi, erc20Abi } from '../abi';
import { useApp, useRead } from '../chain';
import { CallFields, EMPTY_DRAFT, useDerivedParams, useVenueFinder, type CallDraft } from '../form';
import { fmtAmount, fmtDate, NO_VENUE, parseAmount, sealHash, sealKey, sealSubject, utf8Length, type NoteParams } from '../lib';
import { Checkpoint, useCheckpoint } from '../checkpoint';
import { Countdown, Notice, TxButton } from '../ui';
import type { FeedProps } from './Feed';

const ZERO32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;
const PREFILL_KEY = 'marginalia.prefill';
const VENUES_KEY = 'marginalia.venues';

export function rememberVenue(id: Hex, params: NoteParams) {
  try {
    const all = JSON.parse(localStorage.getItem(VENUES_KEY) || '{}');
    all[id] = { x: params.x, venue: params.venue, side: params.side, targetBps: params.targetBps, horizonDays: params.horizonDays, text: params.text };
    localStorage.setItem(VENUES_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}

export function PostPage({ refresh }: FeedProps) {
  const { pub, contracts, wallet, now } = useApp();
  const L = contracts.limits;
  const [mode, setMode] = useState<'call' | 'thesis'>('call');
  const [draft, setDraft] = useState<CallDraft>(EMPTY_DRAFT);
  const [thesisText, setThesisText] = useState('');
  const [thesisParent, setThesisParent] = useState('');
  const [bond, setBond] = useState('0.25');
  const [posted, setPosted] = useState<{ id: Hex; hash: Hex } | null>(null);
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFILL_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { draft: CallDraft; hash: string };
        setDraft(p.draft);
        setMode('call');
        setPrefilledFrom(p.hash);
        localStorage.removeItem(PREFILL_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const finder = useVenueFinder(mode === 'call' ? draft.x : '');
  const derived = useDerivedParams(draft, finder.options);

  // thesis params
  const tLen = utf8Length(thesisText);
  const thesisProblems: string[] = [];
  if (tLen === 0) thesisProblems.push('Write the thesis.');
  if (tLen > L.thesisTextMax) thesisProblems.push(`The text is ${tLen} bytes; a thesis allows ${L.thesisTextMax}.`);
  if (thesisParent.trim() && !/^0x[0-9a-fA-F]{1,64}$/.test(thesisParent.trim())) thesisProblems.push('The parent id must be a hex note id.');
  const thesisParams: NoteParams | null =
    mode === 'thesis' && thesisProblems.length === 0
      ? {
          x: contracts.marg,
          venue: NO_VENUE,
          side: 0,
          targetBps: 0,
          horizonDays: 0,
          parentId: thesisParent.trim() ? (`0x${BigInt(thesisParent.trim()).toString(16).padStart(64, '0')}` as Hex) : ZERO32,
          class: 1,
          text: thesisText,
        }
      : null;
  const params = mode === 'call' ? derived.params : thesisParams;
  const problems = mode === 'call' ? derived.problems : thesisProblems;

  // bond and totals
  const bondWei = parseAmount(bond);
  const bondOk = bondWei !== null && bondWei >= L.bondMin && bondWei <= L.bondMax;
  const imdIn = bondOk ? L.stamp + L.margBuy + bondWei! : null;

  const checkpoint = useCheckpoint(mode === 'call' ? params : null);
  const acct = wallet.account;
  const formHash = acct && mode === 'call' && params ? sealHash(acct, params) : null;
  const key = acct && formHash ? sealKey(acct, formHash) : null;
  const seal = useRead(key ? async () => ({ key, value: await pub.readContract({ address: contracts.hook, abi: MarginaliaHookAbi, functionName: 'seals', args: [key] }) }) : null,
    [key, Math.floor(now / 15), posted?.hash]);
  const liveSeal = seal.data?.key === key && !seal.error ? seal.data?.value : undefined;
  const bound = !!(params && liveSeal && liveSeal[0] > 0n && liveSeal[4].toLowerCase() === sealSubject(params).toLowerCase());
  const sealAt = bound ? Number(liveSeal![0]) : 0;
  const sealAge = now - sealAt;
  const revealReady = bound && sealAge >= L.sealMin && sealAge <= L.sealMax;
  const requestedReveal = prefilledFrom !== null;
  const matchesPrefill = !!formHash && formHash.toLowerCase() === prefilledFrom?.toLowerCase();
  // An explicit reveal never silently falls back to an ordinary post after expiry or edits.
  const callReady = requestedReveal ? matchesPrefill && revealReady :
    !!liveSeal && (bound && sealAge <= L.sealMax ? revealReady : checkpoint.state === 'ready');

  // price and allowance
  const price = useRead(() => pub.readContract({ address: contracts.hook, abi: MarginaliaHookAbi, functionName: 'margPriceInImd' }), [Math.floor(now / 30)]);
  const minMargOut = price.data && price.data > 0n ? ((L.margBuy * 10n ** 18n) / price.data) * 90n / 100n : 0n;
  const allowance = useRead(
    acct ? () => pub.readContract({ address: contracts.imd, abi: erc20Abi, functionName: 'allowance', args: [acct, contracts.router] }) : null,
    [acct, posted?.hash, Math.floor(now / 15)],
  );
  const balance = useRead(acct ? () => pub.readContract({ address: contracts.imd, abi: erc20Abi, functionName: 'balanceOf', args: [acct] }) : null, [acct, posted?.hash, Math.floor(now / 15)]);
  const needsApproval = imdIn !== null && allowance.data !== undefined && allowance.data < imdIn;
  const enoughImd = imdIn !== null && balance.data !== undefined && balance.data >= imdIn;

  const sendApprove = async () => {
    const { request } = await pub.simulateContract({ address: contracts.imd, abi: erc20Abi, functionName: 'approve', args: [contracts.router, imdIn!], account: acct! });
    return wallet.client!.writeContract(request);
  };
  const sendNote = async () => {
    let deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
    if (requestedReveal || revealReady) {
      if (!params || !key || !formHash || (requestedReveal && !matchesPrefill)) throw new Error('The form no longer matches the saved seal.');
      const current = await pub.readContract({ address: contracts.hook, abi: MarginaliaHookAbi, functionName: 'seals', args: [key] });
      const block = await pub.getBlock();
      const age = block.timestamp - current[0];
      if (!current[0] || current[4].toLowerCase() !== sealSubject(params).toLowerCase() || age < BigInt(L.sealMin) || age > BigInt(L.sealMax)) {
        throw new Error('This seal is not in its reveal window, or has already been consumed. Refresh its state.');
      }
      // The router's deadline also prevents a delayed signature becoming an unsealed post after expiry.
      const closes = current[0] + BigInt(L.sealMax);
      if (closes < deadline) deadline = closes;
    }
    const { request } = await pub.simulateContract({
      address: contracts.router,
      abi: MarginaliaRouterAbi,
      functionName: 'note',
      args: [params!, contracts.poolKey, imdIn!, minMargOut, deadline],
      account: acct!,
    });
    return wallet.client!.writeContract(request);
  };
  const onPosted = async (hash: Hex) => {
    const r = await pub.getTransactionReceipt({ hash });
    for (const log of r.logs) {
      if (log.address.toLowerCase() !== contracts.hook.toLowerCase()) continue;
      try {
        const ev = decodeEventLog({ abi: MarginaliaHookAbi, data: log.data, topics: log.topics });
        if (ev.eventName === 'NotePosted') {
          const id = (ev.args as { id: Hex }).id;
          if (params) rememberVenue(id, params);
          setPosted({ id, hash });
        }
      } catch {
        /* other event */
      }
    }
    refresh();
  };

  const readyToPost = !!params && bondOk && imdIn !== null && allowance.data !== undefined && !needsApproval && enoughImd && (mode === 'thesis' && !requestedReveal || mode === 'call' && callReady) && minMargOut > 0n;

  return (
    <>
      <h1>Post a note</h1>
      <p className="lede">
        A note is a bonded claim. Posting costs a stamp and a small MARG purchase, and locks a bond you choose. Right returns the bond; wrong forfeits
        it. Nothing pays for being right. This is informational, not advice.
      </p>
      {prefilledFrom && (
        <Notice>
          <p>
            Revealing seal <span className="mono">{prefilledFrom.slice(0, 14)}…</span>: post these exact parameters, unchanged, between 30 minutes and 6 hours after the seal. The
            seal hash of the form below is <span className="mono">{formHash ? formHash.slice(0, 14) : '…'}…</span>
          </p>
          {!matchesPrefill && <p role="alert">These parameters or this wallet do not match the saved seal. Restore the original draft to reveal.</p>}
          <button type="button" className="quiet" onClick={() => setPrefilledFrom(null)}>Leave reveal mode</button>
        </Notice>
      )}
      {mode === 'call' && (requestedReveal || bound) && <Notice kind={revealReady ? 'ok' : ''}>
        {bound ? <p>Seal recorded {fmtDate(sealAt)}. {sealAge < L.sealMin ? <>Reveal opens in <Countdown until={sealAt + L.sealMin} />.</> : revealReady ? <>Reveal open; closes in <Countdown until={sealAt + L.sealMax} />. The sealed baseline is used; no new checkpoint is needed.</> : <>This seal has expired. It cannot be revealed; its stamp stays in the pools.</>}</p>
          : <p>{seal.loading || !formHash ? 'Complete the call and connect its author to check the seal.' : seal.error ? 'Could not check this seal. Posting is disabled until it can be verified.' : 'No matching unconsumed seal was found for this author and these parameters.'}</p>}
      </Notice>}
      <fieldset>
        <legend>Kind</legend>
        <div className="radio-row">
          <label>
            <input type="radio" name="mode" checked={mode === 'call'} onChange={() => setMode('call')} /> Call · a priced target with a horizon
          </label>
          <label>
            <input type="radio" name="mode" checked={mode === 'thesis'} onChange={() => setMode('thesis')} /> Thesis · a longer argument, no target
          </label>
        </div>
      </fieldset>

      {mode === 'call' ? (
        <CallFields draft={draft} onChange={setDraft} finder={finder} />
      ) : (
        <>
          <label htmlFor="thesis">Thesis</label>
          <span className="hint">
            {tLen} / {L.thesisTextMax} bytes. A thesis must get one of your own child calls within 7 days, or its bond is forfeited. At most 3 per author and
            120 per week.
          </span>
          <textarea id="thesis" value={thesisText} onChange={(e) => setThesisText(e.target.value)} style={{ minHeight: '14rem' }} />
          <label htmlFor="tparent">Rebuts (optional)</label>
          <span className="hint">Another author's open thesis this one argues against.</span>
          <input id="tparent" className="mono" value={thesisParent} onChange={(e) => setThesisParent(e.target.value)} placeholder="0x… note id, or empty" autoComplete="off" />
        </>
      )}

      <label htmlFor="bond">Bond, in IMD</label>
      <span className="hint">
        {fmtAmount(L.bondMin)} to {fmtAmount(L.bondMax)} IMD, held for the horizon. It is yours again if the call is right and lost if it is not.
      </span>
      <input id="bond" inputMode="decimal" value={bond} onChange={(e) => setBond(e.target.value)} aria-invalid={!bondOk} />
      {!bondOk && <span className="hint">Enter a bond between {fmtAmount(L.bondMin)} and {fmtAmount(L.bondMax)} IMD, with at most 18 decimal places.</span>}

      <h2>What posting pulls from your wallet</h2>
      <dl className="facts">
        <dt>Stamp</dt>
        <dd>{fmtAmount(L.stamp)} IMD · non-refundable, to the pools (70% thesis prize, 30% writer refunds)</dd>
        <dt>MARG purchase</dt>
        <dd>
          {fmtAmount(L.margBuy)} IMD · spent on MARG in the launch pool; the MARG goes to you. At least {fmtAmount(minMargOut)} MARG (10% below the current
          price of {price.data ? fmtAmount(price.data, 18, 10) : '…'} IMD per MARG)
        </dd>
        <dt>Bond</dt>
        <dd>{bondOk ? formatUnits(bondWei!, 18) : '…'} IMD · returned when right</dd>
        <dt>Total</dt>
        <dd>
          <strong>{imdIn !== null ? formatUnits(imdIn, 18) : '…'} IMD</strong>, approved to the router only, for exactly this amount
        </dd>
        {acct && (
          <>
            <dt>Your IMD</dt>
            <dd>
              {fmtAmount(balance.data)} IMD · router allowance {fmtAmount(allowance.data)} IMD
            </dd>
          </>
        )}
      </dl>

      {problems.length > 0 && (
        <ul className="small">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {mode === 'call' && params && !requestedReveal && !(bound && sealAge <= L.sealMax) && (
        <><h2>1 · Checkpoint the venue</h2><Checkpoint params={params} window={checkpoint} /></>
      )}

      {params && (
        <>
          <h2>{mode === 'call' ? '2' : '1'} · Approve and post</h2>
          {!acct && <p className="small">Connect a wallet above to continue.</p>}
          {acct && !enoughImd && imdIn !== null && balance.data !== undefined && (
            <Notice kind="bad">
              <p>Your wallet holds {fmtAmount(balance.data)} IMD; posting needs {formatUnits(imdIn, 18)} IMD.</p>
            </Notice>
          )}
          {acct && needsApproval && (
            <TxButton
              label={`Approve ${imdIn ? formatUnits(imdIn, 18) : ''} IMD to the router`}
              busyLabel="Approving…"
              primary
              onSend={sendApprove}
              onDone={() => allowance.refresh()}
              disabled={!bondOk || requestedReveal && !callReady}
              explain={`Authorizes exactly ${imdIn !== null ? formatUnits(imdIn, 18) : '…'} IMD to the router address read from the hook. Nothing else is approved.`}
            />
          )}
          {acct && !needsApproval && allowance.data !== undefined && (
            <TxButton
              label={mode === 'call' ? 'Post the call' : 'Post the thesis'}
              busyLabel="Posting…"
              primary
              disabled={!readyToPost}
              onSend={sendNote}
              onDone={onPosted}
              explain={`Calls router.note(params, launch pool key, ${imdIn ? formatUnits(imdIn, 18) : '…'} IMD, min ${formatUnits(minMargOut, 18)} MARG, deadline ${requestedReveal || revealReady ? 'up to 20 min, capped at seal expiry' : '20 min'}). The transaction is simulated first and you see the reason if it would fail.`}
            />
          )}
          {posted && (
            <Notice kind="ok">
              <p>
                Posted as <a href={`#/note/${posted.id}`}>note № {BigInt(posted.id).toString()}</a>. The venue you chose is not stored on chain; this browser
                keeps it so you can settle or seal against it later.
              </p>
            </Notice>
          )}
        </>
      )}
    </>
  );
}
