import { useEffect, useState } from 'react';
import { decodeEventLog, type Hex } from 'viem';
import { MarginaliaHookAbi, MarginaliaRouterAbi, erc20Abi } from '../abi';
import { useApp, useRead } from '../chain';
import { CallFields, EMPTY_DRAFT, useDerivedParams, useVenueFinder, type CallDraft } from '../form';
import { fmtAmount, fmtDate, NO_VENUE, parseAmount, sealHash, utf8Length, venueId, type NoteParams } from '../lib';
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

  // checkpoint window (calls only)
  const vid = params && mode === 'call' ? venueId(params.venue) : null;
  const win = useRead(
    vid ? () => pub.readContract({ address: contracts.router, abi: MarginaliaRouterAbi, functionName: 'priceWindows', args: [vid] }) : null,
    [vid, Math.floor(now / 15)],
  );
  const startedAt = win.data ? Number(win.data[0]) : 0;
  const age = startedAt ? now - startedAt : -1;
  const windowState: 'none' | 'young' | 'ready' | 'stale' = startedAt === 0 ? 'none' : age < 3600 ? 'young' : age <= 6 * 3600 ? 'ready' : 'stale';

  // price and allowance
  const price = useRead(() => pub.readContract({ address: contracts.hook, abi: MarginaliaHookAbi, functionName: 'margPriceInImd' }), [Math.floor(now / 30)]);
  const minMargOut = price.data && price.data > 0n ? ((L.margBuy * 10n ** 18n) / price.data) * 90n / 100n : 0n;
  const acct = wallet.account;
  const allowance = useRead(
    acct ? () => pub.readContract({ address: contracts.imd, abi: erc20Abi, functionName: 'allowance', args: [acct, contracts.router] }) : null,
    [acct, posted?.hash, Math.floor(now / 15)],
  );
  const balance = useRead(acct ? () => pub.readContract({ address: contracts.imd, abi: erc20Abi, functionName: 'balanceOf', args: [acct] }) : null, [acct, posted?.hash, Math.floor(now / 15)]);
  const needsApproval = imdIn !== null && allowance.data !== undefined && allowance.data < imdIn;
  const enoughImd = imdIn !== null && balance.data !== undefined && balance.data >= imdIn;

  const sendCheckpoint = async () => {
    const { request } = await pub.simulateContract({ address: contracts.router, abi: MarginaliaRouterAbi, functionName: 'checkpointVenue', args: [params!, contracts.poolKey], account: acct! });
    return wallet.client!.writeContract(request);
  };
  const sendApprove = async () => {
    const { request } = await pub.simulateContract({ address: contracts.imd, abi: erc20Abi, functionName: 'approve', args: [contracts.router, imdIn!], account: acct! });
    return wallet.client!.writeContract(request);
  };
  const sendNote = async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
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

  const readyToPost = !!params && bondOk && imdIn !== null && !needsApproval && enoughImd && (mode === 'thesis' || windowState === 'ready') && minMargOut > 0n;

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
            seal hash of the form below is <span className="mono">{acct && derived.params ? sealHash(acct, derived.params).slice(0, 14) : '…'}…</span>
          </p>
        </Notice>
      )}
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
      {!bondOk && <span className="hint">Enter a bond between {fmtAmount(L.bondMin)} and {fmtAmount(L.bondMax)} IMD.</span>}

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
        <dd>{bondOk ? fmtAmount(bondWei!) : '…'} IMD · returned when right</dd>
        <dt>Total</dt>
        <dd>
          <strong>{imdIn !== null ? fmtAmount(imdIn) : '…'} IMD</strong>, approved to the router only, for exactly this amount
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

      {mode === 'call' && params && (
        <>
          <h2>1 · Checkpoint the venue</h2>
          <p className="small">
            The router records the venue's price now. A call may be posted once the checkpoint is <strong>between 1 and 6 hours old</strong>, so a note
            cannot be priced on a moment its author just made. The wait is deliberate.
          </p>
          {windowState === 'none' && (
            <TxButton label="Checkpoint venue" busyLabel="Checkpointing…" primary onSend={sendCheckpoint} onDone={() => win.refresh()} explain="No checkpoint exists for this venue yet." />
          )}
          {windowState === 'young' && (
            <Notice>
              <p>
                Checkpointed {fmtDate(startedAt)}. Posting opens in <Countdown until={startedAt + 3600} /> and stays open until {fmtDate(startedAt + 6 * 3600)}.
                Leave this page and come back; the checkpoint lives on chain.
              </p>
            </Notice>
          )}
          {windowState === 'ready' && (
            <Notice kind="ok">
              <p>
                Checkpoint is {Math.floor(age / 60)} minutes old. Posting is open for <Countdown until={startedAt + 6 * 3600} /> more.
              </p>
            </Notice>
          )}
          {windowState === 'stale' && (
            <>
              <Notice kind="bad">
                <p>The last checkpoint is older than 6 hours. Checkpoint again and wait one hour.</p>
              </Notice>
              <TxButton label="Checkpoint venue again" busyLabel="Checkpointing…" primary onSend={sendCheckpoint} onDone={() => win.refresh()} />
            </>
          )}
        </>
      )}

      {params && (
        <>
          <h2>{mode === 'call' ? '2' : '1'} · Approve and post</h2>
          {!acct && <p className="small">Connect a wallet above to continue.</p>}
          {acct && !enoughImd && imdIn !== null && balance.data !== undefined && (
            <Notice kind="bad">
              <p>Your wallet holds {fmtAmount(balance.data)} IMD; posting needs {fmtAmount(imdIn)} IMD.</p>
            </Notice>
          )}
          {acct && needsApproval && (
            <TxButton
              label={`Approve ${imdIn ? fmtAmount(imdIn) : ''} IMD to the router`}
              busyLabel="Approving…"
              primary
              onSend={sendApprove}
              onDone={() => allowance.refresh()}
              disabled={!bondOk}
              explain="One ERC-20 approval of exactly the total above, to the router address read from the hook. Nothing else is approved."
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
              explain={`Calls router.note(params, launch pool key, ${imdIn ? fmtAmount(imdIn) : '…'} IMD, min ${fmtAmount(minMargOut)} MARG, deadline 20 min). The transaction is simulated first and you see the reason if it would fail.`}
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
