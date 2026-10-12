import { MarginaliaHookAbi, erc20Abi } from '../abi';
import { UsdContext } from '../price';
import { useState } from 'react';
import { useApp, useRead } from '../chain';
import { Checkpoint, useCheckpoint } from '../checkpoint';
import { CallFields, EMPTY_DRAFT, useDerivedParams, useVenueFinder, type CallDraft } from '../form';
import { fmtAmount, fmtDate, sealHash, sealKey, short } from '../lib';
import { Addr, Countdown, Notice, TxLink, TxButton } from '../ui';
import type { FeedProps } from './Feed';

const SEALS_KEY = 'marginalia.seals';

export function SealPage({ feed, refresh }: FeedProps) {
  const { pub, contracts, wallet, now } = useApp();
  const L = contracts.limits;
  const [draft, setDraft] = useState<CallDraft>(EMPTY_DRAFT);
  const finder = useVenueFinder(draft.x);
  const derived = useDerivedParams(draft, finder.options);
  const acct = wallet.account;
  const hash = acct && derived.params ? sealHash(acct, derived.params) : null;
  const checkpoint = useCheckpoint(derived.params);
  const [saved, setSaved] = useState('');
  const [storageError, setStorageError] = useState('');
  const key = acct && hash ? sealKey(acct, hash) : null;
  const funds = useRead(acct ? async () => ({ account: acct,
    allowance: await pub.readContract({ address: contracts.imd, abi: erc20Abi, functionName: 'allowance', args: [acct, contracts.hook] }),
    balance: await pub.readContract({ address: contracts.imd, abi: erc20Abi, functionName: 'balanceOf', args: [acct] }),
  }) : null, [acct, Math.floor(now / 15)], [acct]);
  const current = useRead(key ? async () => ({ key, value: await pub.readContract({ address: contracts.hook, abi: MarginaliaHookAbi, functionName: 'seals', args: [key] }) }) : null, [key, feed?.loadedAt, Math.floor(now / 15)], [key]);
  const f = funds.data?.account === acct && !funds.error ? funds.data : undefined;
  const existing = current.data?.key === key && !current.error ? current.data.value : undefined;
  const active = existing && existing[0] > 0n && now <= Number(existing[0]) + L.sealMax;
  const stampVerified = L.stamp === 100000000000000000n;
  const ready = !!hash && !!derived.params && checkpoint.state === 'ready' && !!f && f.balance >= L.stamp && !!existing && !active && stampVerified;
  const saveDraft = () => {
    if (!hash) throw new Error('Complete the call and connect its author first.');
    const all = JSON.parse(localStorage.getItem(SEALS_KEY) || '{}');
    all[hash] = draft;
    localStorage.setItem(SEALS_KEY, JSON.stringify(all));
    if (localStorage.getItem(SEALS_KEY) !== JSON.stringify(all)) throw new Error('Enable local storage before sealing; the draft must stay with you.');
    setSaved(hash);
  };
  const approve = async () => {
    if (!stampVerified) throw new Error('The live stamp differs from the authorized 0.1 IMD; sealing is disabled.');
    const { request } = await pub.simulateContract({ address: contracts.imd, abi: erc20Abi, functionName: 'approve', args: [contracts.hook, L.stamp], account: acct! });
    return wallet.client!.writeContract(request);
  };
  const sendSeal = async () => {
    if (!ready || !derived.params || !hash) throw new Error('Complete the call and wait for a mature checkpoint.');
    // Save before even simulating: no sealed text leaves this browser in this transaction.
    try { saveDraft(); } catch { throw new Error('Could not save the draft. Allow local storage before sealing.'); }
    const { request } = await pub.simulateContract({ address: contracts.hook, abi: MarginaliaHookAbi, functionName: 'seal', args: [derived.params.x, derived.params.venue, hash], account: acct! });
    return wallet.client!.writeContract(request);
  };

  const stored: Record<string, CallDraft> = (() => {
    try {
      return JSON.parse(localStorage.getItem(SEALS_KEY) || '{}');
    } catch {
      return {};
    }
  })();

  const reveal = (h: string) => {
    const d = stored[h];
    if (!d) return;
    try {
      localStorage.setItem('marginalia.prefill', JSON.stringify({ draft: d, hash: h }));
    } catch {
      setStorageError('Could not open the saved draft. Allow local storage, then retry reveal.');
      return;
    }
    window.location.hash = '#/post';
  };
  const mySeals = acct ? (feed?.seals ?? []).filter((s) => s.author.toLowerCase() === acct.toLowerCase()) : [];

  return (
    <>
      <h1>Seal a note</h1>
      <p className="lede">Commit now. Show the call later. The hash fixes your words before the verdict.</p>
      <ol className="seal-timeline"><li><strong>Seal</strong><span>{fmtAmount(L.stamp)} IMD stamp</span></li><li><strong>Wait 30 minutes</strong><span>Text stays in this browser</span></li><li><strong>Reveal by 6 hours</strong><span>Post the exact saved call</span></li></ol>
      <p className="small">The extra stamp is non-refundable; a lapsed seal keeps it in the pools.</p>
      <h2>1 · Write the call</h2>
      <CallFields draft={draft} onChange={setDraft} finder={finder} />
      {derived.problems.length > 0 && (
        <ul className="small">
          {derived.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {derived.params && <><h2>2 · Checkpoint the venue</h2><Checkpoint params={derived.params} window={checkpoint} purpose="Sealing" /></>}
      <h2>3 · Seal</h2>
      <dl className="facts">
        <dt>Seal hash</dt>
        <dd className="mono">{hash ?? (acct ? '… complete the form' : '… connect a wallet; the hash includes your address')}</dd>
        <dt>Stamp</dt>
        <dd>
          {fmtAmount(L.stamp)} IMD · <UsdContext /> · exactly this amount approved to the hook
        </dd>
        <dt>Reveal window</dt>
        <dd>from 30 minutes to 6 hours after the seal is mined</dd>
      </dl>
      <p className="small">
        The hash is keccak256 of (your address, X, the derived venue, side, target, horizon, parent, text). Changing one character of the text changes it, so
        keep your original parameters. Existing saved drafts in this browser can be opened below.
      </p>
      <p className="small">Keep this browser's storage until reveal; the saved draft is local, not encrypted. Anyone using this browser profile can read it.</p>
      {!acct && <p className="small">Connect a wallet to seal its call.</p>}
      {(funds.error || current.error) && <Notice kind="bad"><p>Could not verify this seal or its allowance.</p><button type="button" onClick={() => { funds.refresh(); current.refresh(); }}>Retry seal reads</button></Notice>}
      {!stampVerified && <Notice kind="bad"><p>The hook stamp is not the authorized 0.1 IMD. Sealing is disabled.</p></Notice>}
      {f && f.balance < L.stamp && <Notice kind="bad"><p>Your wallet needs {fmtAmount(L.stamp)} IMD for this stamp.</p></Notice>}
      {active && <Notice><p>This exact call is already sealed. {now < Number(existing![0]) + L.sealMin ? <>Reveal opens in <Countdown until={Number(existing![0]) + L.sealMin} />.</> : <>Reveal closes in <Countdown until={Number(existing![0]) + L.sealMax} />.</>}</p></Notice>}
      {f && f.allowance < L.stamp && <TxButton label="Approve 0.1 IMD to the hook" busyLabel="Approving stamp…" primary disabled={!ready} onSend={approve} onDone={() => funds.refresh()} explain="Only this seal page can request a hook allowance: exactly 0.1 IMD. Posting approvals still go to the router." />}
      {f && f.allowance >= L.stamp && <TxButton label="Seal the call" busyLabel="Sealing…" primary disabled={!ready} onSend={sendSeal} onDone={() => { funds.refresh(); current.refresh(); refresh(); }} explain="Saves the draft locally, then sends only token, venue and commitment hash to the hook." />}
      {saved && <p role="status" className="small">Draft saved in this browser for seal {short(saved)}.</p>}

      <h2>Your seals</h2>
      {storageError && <Notice kind="bad"><p>{storageError}</p></Notice>}
      {!acct && <p className="small">Connect a wallet to list your seals.</p>}
      {acct && mySeals.length === 0 && <p className="empty">No seal from this wallet in the available history.</p>}
      {mySeals.length > 0 && (
        <ul className="ledger">
          {mySeals.map((s) => {
            const open = s.timestamp + L.sealMin;
            const close = s.timestamp + L.sealMax;
            const revealed = feed?.notes.find((n) => n.author.toLowerCase() === acct?.toLowerCase() && n.revealedHash?.toLowerCase() === s.hash.toLowerCase());
            const state = revealed ? 'revealed' : now < open ? 'waiting' : now <= close ? 'reveal open' : 'lapsed';
            return (
              <li className="entry" key={s.tx + s.hash}>
                <div className="entry-head">
                  <span className={`tag ${state === 'reveal open' ? 'open' : state === 'lapsed' ? 'wrong' : state === 'revealed' ? 'right' : ''}`}>{state}</span>
                  <span className="entry-claim mono">{short(s.hash, 12, 8)}</span>
                </div>
                <div className="entry-meta">
                  <span>
                    X <Addr a={s.x} />
                  </span>
                  <span>sealed {fmtDate(s.timestamp)}</span>
                  <span>
                    reveal {fmtDate(open)} → {fmtDate(close)}
                  </span>
                  {state === 'waiting' && (
                    <span>
                      opens in <Countdown until={open} />
                    </span>
                  )}
                  {state === 'reveal open' && (
                    <span>
                      closes in <Countdown until={close} />
                    </span>
                  )}
                  <TxLink hash={s.tx} />
                  {revealed && <a href={`#/note/${revealed.id}`}>note № {revealed.index.toString()}</a>}
                </div>
                {state === 'reveal open' && stored[s.hash] && (
                  <div className="actions">
                    <button type="button" className="primary" onClick={() => reveal(s.hash)}>
                      Reveal: open the post form with these parameters
                    </button>
                  </div>
                )}
                {state === 'reveal open' && !stored[s.hash] && <p className="small">This browser has no copy of the sealed parameters. Post them from the Post page exactly as sealed.</p>}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
