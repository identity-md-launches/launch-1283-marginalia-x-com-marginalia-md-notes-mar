import { useMemo, useState, type ReactNode } from 'react';
import { useApp } from '../chain';
import { CLASS_LABEL, describeTarget, fmtAmount, fmtDate, short, Status, validAddress } from '../lib';
import { isThesis, type FeedData, type Note } from '../notes';
import { Notice, StatusTag } from '../ui';
import { HistoryStatus } from '../history';

export interface FeedProps {
  feed: FeedData | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

export function Entry({ n, tokenName, children }: { n: Note; tokenName?: string; children?: ReactNode }) {
  const { contracts } = useApp();
  const thesis = isThesis(n);
  const token = tokenName ?? (n.x.toLowerCase() === contracts.marg.toLowerCase() ? 'MARG' : short(n.x));
  return (
    <li className="entry">
      <div className="entry-head">
        <StatusTag status={n.status} />
        <span className="entry-claim">
          {thesis ? (
            <>Thesis</>
          ) : (
            <>
              <a href={`#/note/${n.id}`} className="mono" title={n.x}>
                {token}
              </a>{' '}
              {describeTarget(n.side, n.targetBps)} in {n.horizonDays} d
            </>
          )}
        </span>
        <a href={`#/note/${n.id}`} className="small mono">
          № {n.index.toString()}
        </a>
      </div>
      <p className={`entry-text ${thesis ? 'clamp' : ''}`}>{n.text}</p>
      <div className="entry-meta">
        <span>
          by <a href={`#/author/${n.author}`} className="mono">{short(n.author)}</a>
        </span>
        <span>bond {fmtAmount(n.deposit > 0n ? n.deposit : undefined)} IMD{n.deposit === 0n ? ' (released)' : ''}</span>
        <span>{CLASS_LABEL[n.classLive]}</span>
        <span>{fmtDate(n.timestamp)}</span>
        {n.settlement && n.settlement.status !== Status.Retracted && <span>settled at price {fmtAmount(n.settlement.settlePrice, 18, 6)} · outcome {describeOutcome(n.settlement.status)}</span>}
        {n.parentId !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
          <span>
            ↳ <a href={`#/note/${n.parentId}`}>parent № {BigInt(n.parentId).toString()}</a>
          </span>
        )}
      </div>
      {children}
    </li>
  );
}

export function describeOutcome(status: number): string {
  return ({ 1: 'right', 2: 'wrong', 3: 'void (sold)', 4: 'void (no data)', 5: 'retracted', 7: 'thesis closed', 8: 'thesis forfeited' } as Record<number, string>)[status] ?? `status ${status}`;
}

export function FeedPage({ feed, error, loading, refresh }: FeedProps) {
  const { contracts } = useApp();
  const [token, setToken] = useState('');
  const [author, setAuthor] = useState('');
  const [kind, setKind] = useState<'all' | 'calls' | 'theses'>('all');

  const shown = useMemo(() => {
    if (!feed) return [];
    const t = token.trim().toLowerCase();
    const a = author.trim().toLowerCase();
    return feed.notes.filter((n) => {
      if (kind === 'calls' && isThesis(n)) return false;
      if (kind === 'theses' && !isThesis(n)) return false;
      if (t && !(n.x.toLowerCase() === t || (t === 'marg' && n.x.toLowerCase() === contracts.marg.toLowerCase()))) return false;
      if (a && n.author.toLowerCase() !== a) return false;
      return true;
    });
  }, [feed, token, author, kind, contracts.marg]);

  return (
    <>
      <h1>Notes and theses</h1>
      <p className="lede">Post a claim with an IMD bond. Right returns it; wrong forfeits it. Nothing pays for being right.</p>
      <div className="filters">
        <div>
          <label htmlFor="f-token">Token</label>
          <input id="f-token" className="mono" placeholder="0x… or MARG" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
          {token.trim() && token.trim().toLowerCase() !== 'marg' && !validAddress(token) && <span className="hint">Not a valid address yet.</span>}
        </div>
        <div>
          <label htmlFor="f-author">Author</label>
          <input id="f-author" className="mono" placeholder="0x…" value={author} onChange={(e) => setAuthor(e.target.value)} autoComplete="off" />
          {author.trim() && !validAddress(author) && <span className="hint">Not a valid address yet.</span>}
        </div>
      </div>
      <div className="radio-row" role="radiogroup" aria-label="Kind">
        {(['all', 'calls', 'theses'] as const).map((k) => (
          <label key={k}>
            <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} /> {k}
          </label>
        ))}
        <button type="button" className="quiet" onClick={refresh} disabled={loading}>
          {loading ? 'Reading…' : 'Refresh'}
        </button>
      </div>
      {error && (
        <Notice kind="bad">
          <p>Could not read the feed from the public nodes: {error}</p>
        </Notice>
      )}
      <HistoryStatus feed={feed} loading={loading} refresh={refresh} />
      <ul className="ledger" aria-live="polite">
        {shown.map((n) => (
          <Entry key={n.id} n={n} />
        ))}
      </ul>
      {feed && shown.length === 0 && (
        <p className="empty">
          {feed.partial ? 'No matching entry in the available history. Older entries may be missing.' : feed.notes.length === 0 ? 'The margin is still blank. No note has been posted yet; the first one appears here.' : 'No note matches these filters.'}
        </p>
      )}
      {!feed && !error && <p className="empty">Reading notes from Ethereum…</p>}
    </>
  );
}
