import { useApp, useRead } from './chain';
import { fmtDate, fmtDuration } from './lib';
import type { FeedData } from './notes';
import { potAmount } from './shell';
import { readOpenWeeks, readYourTheses, type WeekPot, type YourThesis } from './week';

export function YourThesisLine({ thesis: t, now }: { thesis: YourThesis; now: number }) {
  const prefix = `Thesis No. ${t.index}, week ${t.week}: `;
  return <li>{t.isEligible ? `${prefix}eligible for the ${potAmount(t.pool, 3)} IMD pot`
    : now <= t.graceEnd ? <a href={`#/post?child=${t.id}`}>{prefix}needs your call under it by {fmtDate(t.graceEnd)} ({fmtDuration(t.graceEnd - now)} left)</a>
    : `${prefix}grace ended, forfeitable`}</li>;
}

export function YourWeekLines({ feed, weeks }: { feed: FeedData | null; weeks: WeekPot[] }) {
  const { pub, contracts, wallet, now } = useApp();
  const read = useRead(wallet.account && feed ? () => readYourTheses(pub, contracts.hook, wallet.account!, feed, weeks, contracts.limits.thesisGrace) : null,
    [wallet.account, feed?.loadedAt, weeks], [wallet.account, feed?.loadedAt, weeks]);
  if (!wallet.account || !read.data?.length) return read.error ? <p role="alert">Could not check your theses. Refresh the record to retry.</p> : null;
  return <section className="your-week" aria-label="Your week"><h2>Your week</h2><ul>{read.data.map(t => <YourThesisLine key={t.id} thesis={t} now={now}/>)}</ul></section>;
}

export function YourWeek({ feed }: { feed: FeedData | null }) {
  const { pub, contracts, wallet, now } = useApp();
  const hasThesis = feed?.notes.some(n => n.source !== 'annex' && n.targetBps === 0 && n.author.toLowerCase() === wallet.account?.toLowerCase());
  const read = useRead(wallet.account && feed && hasThesis ? () => readOpenWeeks(pub, contracts.hook, contracts.judge) : null,
    [wallet.account, feed?.loadedAt, Math.floor(now / 30)], [wallet.account, feed?.loadedAt]);
  if (!wallet.account || !hasThesis) return null;
  if (read.error) return <p role="alert">Could not check the open thesis pots. Refresh the record to retry.</p>;
  return read.data ? <YourWeekLines feed={feed} weeks={read.data.weeks}/> : null;
}
