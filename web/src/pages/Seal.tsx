import { useState } from 'react';
import { useApp } from '../chain';
import { Checkpoint, useCheckpoint } from '../checkpoint';
import { CallFields, EMPTY_DRAFT, useDerivedParams, useVenueFinder, type CallDraft } from '../form';
import { fmtAmount, fmtDate, sealHash, short } from '../lib';
import { Addr, Countdown, Notice, TxLink } from '../ui';
import type { FeedProps } from './Feed';

const SEALS_KEY = 'marginalia.seals';

export function SealPage({ feed }: FeedProps) {
  const { contracts, wallet, now } = useApp();
  const L = contracts.limits;
  const [draft, setDraft] = useState<CallDraft>(EMPTY_DRAFT);
  const finder = useVenueFinder(draft.x);
  const derived = useDerivedParams(draft, finder.options);
  const acct = wallet.account;
  const hash = acct && derived.params ? sealHash(acct, derived.params) : null;
  const checkpoint = useCheckpoint(derived.params);

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
      /* ignore */
    }
    window.location.hash = '#/post';
  };
  const mySeals = acct ? (feed?.seals ?? []).filter((s) => s.author.toLowerCase() === acct.toLowerCase()) : [];

  return (
    <>
      <h1>Seal a note</h1>
      <p className="lede">
        A seal commits to a call before it is public. It pays one extra stamp ({fmtAmount(L.stamp)} IMD, non-refundable), snapshots the venue's price
        and your X balance, and binds you, X and the venue. You reveal by posting the very same parameters between <strong>30 minutes and 6 hours</strong>{' '}
        later; the sealed price is then used as the post price. A seal that lapses keeps its stamp in the pools.
      </p>
      <Notice>
        <p>
          In this first version the sealed text stays with the author: this site shows the seal event, its hash, the window and the reveal. Delivery of
          sealed notes to key holders arrives with the key market in a later iteration.
        </p>
      </Notice>
      <Notice kind="bad"><p><strong>New sealing is unavailable on this site.</strong> The live hook requires an IMD allowance to the hook, while this site's policy allows approvals only to the router. The requester must resolve this conflict before sealing can be enabled. Existing seals can still be revealed.</p></Notice>
      <h2>1 · Write the call</h2>
      <CallFields draft={draft} onChange={setDraft} finder={finder} />
      {derived.problems.length > 0 && (
        <ul className="small">
          {derived.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {derived.params && <><h2>2 · Checkpoint the venue</h2><Checkpoint params={derived.params} window={checkpoint} purpose="Sealing" disabled /></>}
      <h2>3 · Seal</h2>
      <dl className="facts">
        <dt>Seal hash</dt>
        <dd className="mono">{hash ?? (acct ? '… complete the form' : '… connect a wallet; the hash includes your address')}</dd>
        <dt>Stamp</dt>
        <dd>
          {fmtAmount(L.stamp)} IMD, pulled from your wallet by the hook itself; it needs an IMD allowance of exactly that amount
        </dd>
        <dt>Reveal window</dt>
        <dd>from 30 minutes to 6 hours after the seal is mined</dd>
      </dl>
      <p className="small">
        The hash is keccak256 of (your address, X, the derived venue, side, target, horizon, parent, text). Changing one character of the text changes it, so
        keep your original parameters. Existing saved drafts in this browser can be opened below.
      </p>
      <button type="button" disabled aria-describedby="seal-unavailable">Seal unavailable</button>
      <p className="small" id="seal-unavailable">No hook approval or seal transaction can be requested here. A mature checkpoint does not resolve the approval restriction.</p>

      <h2>Your seals</h2>
      {!acct && <p className="small">Connect a wallet to list your seals.</p>}
      {acct && mySeals.length === 0 && <p className="empty">No seal from this wallet in the available history.</p>}
      {mySeals.length > 0 && (
        <ul className="ledger">
          {mySeals.map((s) => {
            const open = s.timestamp + L.sealMin;
            const close = s.timestamp + L.sealMax;
            const revealed = feed?.notes.find((n) => n.revealedHash?.toLowerCase() === s.hash.toLowerCase());
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
