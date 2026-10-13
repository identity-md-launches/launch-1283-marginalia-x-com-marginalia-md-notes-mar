import { getAddress, isAddress, keccak256, parseAbiItem, toBytes, type Address, type Hex, type PublicClient } from 'viem';
import { tradeEvent } from './backers';
import { LOG_CHUNK, PAGES_DEPLOY_BLOCK } from './config';
import { PagesAbi } from './pages-abi';

export function pagesSearchRoute(input: string): string | null {
  const text = input.trim();
  if (isAddress(text)) return `#/author/${getAddress(text)}`;
  const handle = text.replace(/^@/, '').toLowerCase();
  return /^[a-z0-9_]{1,15}$/.test(handle) ? `#/pages/${handle}` : null;
}

export function parseTweetId(input: string): bigint | null {
  let id = input.trim();
  if (!/^\d+$/.test(id)) {
    try {
      const url = new URL(/^https?:\/\//i.test(id) ? id : `https://${id}`);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port ||
        !/^(www\.|mobile\.)?(x\.com|twitter\.com)$/i.test(url.hostname)) return null;
      const match = url.pathname.match(/^\/(?:[a-z0-9_]{1,15}\/status|i\/web\/status)\/(\d+)(?:\/(?:photo|video)\/\d+)?\/?$/i);
      if (!match) return null;
      id = match[1];
    } catch { return null; }
  }
  if (id.length > 78) return null;
  const value = BigInt(id);
  return value > 0n && value < (1n << 256n) ? value : null;
}

export interface PageSubject {
  subject: Hex;
  author?: Address;
  handle?: string;
  supply: bigint | null;
  backers: number;
  holdingsFailed: number;
  holding: bigint | null;
  next: bigint | null;
}
export interface PagesDirectoryData {
  rows: PageSubject[];
  from: bigint;
  to: bigint;
  gaps: { from: bigint; to: bigint; kind: 'trades' | 'handles' }[];
}
const registeredEvent = parseAbiItem('event HandleRegistered(bytes32 indexed subject, string handle)');

async function batches<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += 20) results.push(...await Promise.allSettled(items.slice(i, i + 20).map(fn)));
  return results;
}

/** Scan the whole deployment window in bounded chunks. Events discover candidates, never balances. */
export async function readPagesDirectory(pub: PublicClient, pages: Address, wallet?: Address): Promise<PagesDirectoryData> {
  const head = await pub.getBlockNumber({ cacheTime: 0 });
  const candidates = new Map<Hex, Set<Address>>();
  const handles = new Map<Hex, string>();
  const gaps: PagesDirectoryData['gaps'] = [];
  for (let from = PAGES_DEPLOY_BLOCK; from <= head; from += LOG_CHUNK) {
    const to = from + LOG_CHUNK - 1n < head ? from + LOG_CHUNK - 1n : head;
    const [trades, registrations] = await Promise.allSettled([
      pub.getLogs({ address: pages, event: tradeEvent, fromBlock: from, toBlock: to, strict: true }),
      pub.getLogs({ address: pages, event: registeredEvent, fromBlock: from, toBlock: to, strict: true }),
    ]);
    if (trades.status === 'rejected') gaps.push({ from, to, kind: 'trades' });
    else for (const log of trades.value) {
      const id = log.args.subject.toLowerCase() as Hex;
      if (!candidates.has(id)) candidates.set(id, new Set());
      candidates.get(id)!.add(log.args.trader.toLowerCase() as Address);
    }
    if (registrations.status === 'rejected') gaps.push({ from, to, kind: 'handles' });
    else for (const log of registrations.value) {
      const handle = log.args.handle;
      if (/^[a-z0-9_]{1,15}$/.test(handle) && keccak256(toBytes(`x:${handle}`)) === log.args.subject.toLowerCase())
        handles.set(log.args.subject.toLowerCase() as Hex, handle);
    }
  }
  const h = { address: pages, abi: PagesAbi, blockNumber: head } as const;
  const rows: PageSubject[] = [...candidates].map(([subject]) => ({
    subject, author: BigInt(subject) > 0n && BigInt(subject) >> 160n === 0n ? getAddress(`0x${subject.slice(-40)}`) : undefined,
    handle: handles.get(subject), supply: null, next: null, backers: 0, holdingsFailed: 0, holding: wallet ? null : 0n,
  }));
  await batches(rows, async row => {
    const [state, next] = await Promise.allSettled([
      pub.readContract({ ...h, functionName: 'subjects', args: [row.subject] }),
      pub.readContract({ ...h, functionName: 'buyPrice', args: [row.subject, 1n] }),
    ]);
    if (state.status === 'fulfilled') row.supply = state.value[0];
    if (next.status === 'fulfilled') row.next = next.value[0] + next.value[1];
  });
  const balances = rows.flatMap(row => {
    const addresses = candidates.get(row.subject)!;
    if (wallet) addresses.add(wallet.toLowerCase() as Address);
    return [...addresses].map(address => ({ row, address }));
  });
  await batches(balances, async ({ row, address }) => {
    try {
      const value = await pub.readContract({ ...h, functionName: 'pagesOf', args: [row.subject, address] });
      if (value > 0n) row.backers++;
      if (address === wallet?.toLowerCase()) row.holding = value;
    } catch { row.holdingsFailed++; }
  });
  const active = rows.filter(row => row.supply !== 0n || (row.holding ?? 0n) > 0n);
  active.sort((a, b) => b.backers - a.backers || ((b.supply ?? -1n) > (a.supply ?? -1n) ? 1 : (b.supply ?? -1n) < (a.supply ?? -1n) ? -1 : a.subject.localeCompare(b.subject)));
  return { rows: active, from: PAGES_DEPLOY_BLOCK, to: head, gaps };
}
