import { createContext } from 'react';
import type { Address, PublicClient } from 'viem';
import { useApp, useRead, type Contracts } from './chain';
import { readRecord } from './records';
import { formatRate, recordRate, settledCount } from './scoreboard';
import { isThesis, type FeedData, type Note } from './notes';
import { PagesAbi } from './pages-abi';
export const FeedContext = createContext<FeedData | null>(null);
const records = new WeakMap<PublicClient, Map<string, { at: number; value: ReturnType<typeof readRecord> }>>();
export function sharedRecord(pub: PublicClient, contracts: Contracts, address: Address, revision?: number) {
  let cache = records.get(pub); if (!cache) { cache = new Map(); records.set(pub, cache); }
  const key = `${contracts.hook}:${address.toLowerCase()}:${revision ?? ''}`, old = cache.get(key);
  if (old && Date.now() - old.at < 15000) return old.value;
  const value = readRecord(pub, contracts, address).catch(e => { cache!.delete(key); throw e; });
  cache.set(key, { at: Date.now(), value }); return value;
}
export function AuthorRate({ address, revision }: { address: Address; revision?: number }) {
  const { pub, contracts } = useApp();
  const record = useRead(() => sharedRecord(pub, contracts, address, revision), [pub, address, revision]);
  const r = record.error ? undefined : record.data;
  return <span className="author-rate" aria-label="Author hit rate">{r ? <><strong>{formatRate(recordRate(r))}</strong> · {r[2]} of {settledCount(r)}</> : record.error ? 'Hit rate unavailable' : 'Reading record…'}</span>;
}
export function postedChild(n: Note, feed: FeedData | null): Note | undefined {
  return feed?.notes.filter(c => c.source !== 'annex' && !isThesis(c) && c.parentId.toLowerCase() === n.id.toLowerCase() && c.author.toLowerCase() === n.author.toLowerCase()).sort((a,b) => a.block < b.block ? -1 : 1)[0];
}
export function ChildPosted({ n, feed }: { n: Note; feed: FeedData | null }) {
  const child = postedChild(n, feed);
  if (child) return <a className="child-posted small" href={`#/note/${child.id}`}>Child call posted (No. {child.index.toString()})</a>;
  return n.children > 0 ? <span className="small">Child call posted · receipt outside loaded history</span> : null;
}
export async function readBacked(pub: PublicClient, pages: Address, wallet: Address, authors: Address[]) {
  const held = new Set<string>(); let missing = 0;
  const blockNumber = await pub.getBlockNumber();
  for (let i = 0; i < authors.length; i += 6) {
    const results = await Promise.allSettled(authors.slice(i, i+6).map(async author => {
      const subject = await pub.readContract({ address: pages, abi: PagesAbi, functionName: 'subjectOf', args: [author], blockNumber });
      return { author, amount: await pub.readContract({ address: pages, abi: PagesAbi, functionName: 'pagesOf', args: [subject, wallet], blockNumber }) };
    }));
    for (const r of results) { if (r.status === 'rejected') missing++; else if (r.value.amount > 0n) held.add(r.value.author.toLowerCase()); }
  }
  return { held, missing };
}
