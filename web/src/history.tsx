import type { FeedData } from './notes';

/** Compact coverage state shared by the feed and pages that rely on its event history. */
export function HistoryStatus({ feed, loading, refresh }: { feed: FeedData | null; loading: boolean; refresh: () => void }) {
  if (!feed) return null;
  const count = `${feed.notes.length} note${feed.notes.length === 1 ? '' : 's'} loaded`;
  const status = feed.partial ? 'History incomplete' : feed.warnings.length ? 'Read warning' : 'History complete';
  return (
    <details className="history small">
      <summary aria-label={`${count}. ${status}. Read coverage details`}>
        {count} · <strong>{status}</strong>
      </summary>
      <p>Read up to block {feed.toBlock.toString()}. {feed.scanning ? 'Older history is loading automatically.' : feed.partial ? 'Load more history to retry missing ranges.' : 'Event coverage from deployment is complete.'}</p>
      {feed.coverageDetails ? feed.coverageDetails.map(detail => <p key={detail}>Covered blocks · {detail}.</p>) : feed.coverage && <p>Covered blocks: {feed.coverage.map(([a, b]) => `${a}–${b}`).join(', ') || 'none yet'}.</p>}
      {feed.warnings.length > 0 && <ul>{feed.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
      {!feed.scanning && (feed.partial || feed.warnings.length > 0) && <button type="button" className="quiet" onClick={refresh} disabled={loading}>{loading ? 'Reading…' : feed.partial ? 'Load more history' : 'Refresh history'}</button>}
    </details>
  );
}
