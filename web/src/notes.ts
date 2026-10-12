// The feed: NotePosted and the lifecycle events, read in bounded chunks from the deploy block, joined with
// live `noteOf` state. The venue is not in NotePosted nor noteOf; it stays with the author (see Post).
import { parseAbiItem, type Address, type Hex, type PublicClient } from 'viem';
import { MarginaliaHookAbi } from './abi';
import { DEPLOY_BLOCK, LOG_CHUNK, LOG_TAIL, LOG_REORG_OVERLAP } from './config';

export interface Settlement {
  status: number;
  settlePrice: bigint;
  scoreDelta: bigint;
  keeper: Address;
  block: bigint;
}
export interface Observation {
  xRead: bigint;
  balance: bigint;
  block: bigint;
  tx: Hex;
}
export interface Note {
  id: Hex;
  index: bigint;
  author: Address;
  x: Address;
  classAtPost: number;
  side: number;
  targetBps: number;
  horizonDays: number;
  parentId: Hex;
  text: string;
  block: bigint;
  tx: Hex;
  timestamp: number;
  // live
  status: number;
  classLive: number;
  postPrice: bigint;
  postBalance: bigint;
  deposit: bigint;
  children: number;
  settlement?: Settlement;
  retraction?: string;
  observations: Observation[];
  revealedHash?: Hex;
}
export interface SealRecord {
  hash: Hex;
  author: Address;
  x: Address;
  venueRef: Hex;
  block: bigint;
  tx: Hex;
  timestamp: number;
}
export interface FeedData {
  notes: Note[];
  byId: Map<Hex, Note>;
  seals: SealRecord[];
  toBlock: bigint;
  loadedAt: number;
  partial: boolean;
  warnings: string[];
}

const ev = {
  NotePosted: parseAbiItem('event NotePosted(bytes32 indexed id, address indexed author, address indexed x, uint8 class, uint8 side, uint32 targetBps, uint16 horizonDays, bytes32 parentId, string text)'),
  Settled: parseAbiItem('event Settled(bytes32 indexed id, uint8 status, uint256 settlePrice, int256 scoreDelta, address keeper)'),
  Observed: parseAbiItem('event Observed(bytes32 indexed id, uint256 xRead, uint256 balance)'),
  Retracted: parseAbiItem('event Retracted(bytes32 indexed id, string text)'),
  Sealed: parseAbiItem('event Sealed(bytes32 indexed hash, address indexed author, address indexed x, bytes32 venueRef)'),
  Revealed: parseAbiItem('event Revealed(bytes32 indexed id, bytes32 indexed hash)'),
};

// Store decoded events, never cached noteOf state, under a chain-and-hook-specific key.
const fetchLogs = (pub: PublicClient, hook: Address, fromBlock: bigint, toBlock: bigint) =>
  pub.getLogs({ address: hook, events: Object.values(ev), strict: true, fromBlock, toBlock });
type EventLog = Awaited<ReturnType<typeof fetchLogs>>[number];
type Range = [bigint, bigint];
interface LogCache { version: 1; logs: EventLog[]; ranges: Range[]; cursor: bigint; anchor?: { block: bigint; hash: Hex } }
const memory = new Map<string, LogCache>();
const pending = new WeakMap<PublicClient, Map<string, Promise<FeedData>>>();
const max = (a: bigint, b: bigint) => a > b ? a : b;
function mergeRanges(ranges: Range[]): Range[] {
  const out: Range[] = [];
  for (const [a, b] of ranges.sort((a, b) => a[0] < b[0] ? -1 : 1)) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 1n) last[1] = max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}
function readCache(key: string): LogCache | undefined {
  if (memory.has(key)) return memory.get(key);
  try {
    const c = JSON.parse(localStorage.getItem(key) || 'null', (_, value) =>
      value && typeof value === 'object' && typeof value.bigint === 'string' && /^-?\d+$/.test(value.bigint) ? BigInt(value.bigint) : value) as LogCache | null;
    if (c?.version === 1 && typeof c.cursor === 'bigint' && Array.isArray(c.logs) && Array.isArray(c.ranges)
      && c.ranges.every(r => r.length === 2 && r.every(v => typeof v === 'bigint'))
      && c.logs.every(l => typeof l.blockNumber === 'bigint' && l.args && l.eventName in ev)) return c;
  } catch { /* inaccessible, obsolete or corrupted local storage: read the recent chain tail */ }
}
async function mapBounded<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(8, items.length) }, async () => {
    while (index < items.length) { const i = index++; out[i] = await fn(items[i]); }
  }));
  return out;
}

const tsCache = new Map<bigint, number>();
async function blockTime(pub: PublicClient, n: bigint): Promise<number> {
  const c = tsCache.get(n);
  if (c !== undefined) return c;
  const b = await pub.getBlock({ blockNumber: n });
  const t = Number(b.timestamp);
  tsCache.set(n, t);
  return t;
}

export function loadFeed(pub: PublicClient, hook: Address): Promise<FeedData> {
  let jobs = pending.get(pub);
  if (!jobs) { jobs = new Map(); pending.set(pub, jobs); }
  const key = hook.toLowerCase();
  const active = jobs.get(key);
  if (active) return active;
  const job = scanFeed(pub, hook).finally(() => jobs!.delete(key));
  jobs.set(key, job);
  return job;
}

async function scanFeed(pub: PublicClient, hook: Address): Promise<FeedData> {
  const toBlock = await pub.getBlockNumber({ cacheTime: 0 });
  const key = `marginalia.logs.v1.1.${hook.toLowerCase()}`;
  let cache = readCache(key);
  const warnings: string[] = [];
  if (cache?.anchor) {
    try {
      const anchor = await pub.getBlock({ blockNumber: cache.anchor.block });
      if (anchor.hash !== cache.anchor.hash || cache.cursor > toBlock) {
        cache = undefined;
        tsCache.clear();
        warnings.push('A chain reorganization changed cached history. Recent events have been read again.');
      }
    } catch { warnings.push('The cached history anchor could not be verified by the node.'); }
  }
  const tailStart = max(DEPLOY_BLOCK, toBlock - LOG_TAIL + 1n);
  // At most four 2,000-block requests per refresh, regardless of time since launch.
  let from = cache ? max(tailStart, cache.cursor - LOG_REORG_OVERLAP + 1n) : tailStart;
  // Retry holes that are still within the recent tail, without rescanning known older history.
  let coveredUntil = tailStart;
  for (const [a, b] of cache?.ranges ?? []) {
    if (a > coveredUntil) break;
    if (b >= coveredUntil) coveredUntil = b + 1n;
  }
  if (coveredUntil < from) from = coveredUntil;
  let logs = [...(cache?.logs ?? [])];
  const ranges = (cache?.ranges ?? []).flatMap(([a, b]): Range[] => a < from ? [[a, b < from ? b : from - 1n]] : []);
  for (const block of tsCache.keys()) if (block >= from) tsCache.delete(block);
  for (let a = from; a <= toBlock; a += LOG_CHUNK) {
    const b = a + LOG_CHUNK - 1n > toBlock ? toBlock : a + LOG_CHUNK - 1n;
    try {
      const chunk = await fetchLogs(pub, hook, a, b);
      logs = logs.filter(l => l.blockNumber < a || l.blockNumber > b).concat(chunk);
      ranges.push([a, b]);
    } catch {
      warnings.push(`The public nodes did not serve blocks ${a}–${b}. Other available entries are still shown.`);
    }
  }
  logs.sort((a, b) => a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1);
  const coverage = mergeRanges(ranges);
  const partial = coverage.length !== 1 || coverage[0][0] > DEPLOY_BLOCK || coverage[0][1] < toBlock;
  if (partial) warnings.unshift('History is incomplete. This browser keeps previously read events and scans only the latest 8,000 blocks. Missing older notes, seals or observations may not appear.');
  const saved: LogCache = { version: 1, logs, ranges: coverage, cursor: toBlock };
  const anchorBlock = toBlock - LOG_REORG_OVERLAP;
  if (anchorBlock >= DEPLOY_BLOCK) {
    try { const anchor = await pub.getBlock({ blockNumber: anchorBlock }); if (anchor.hash) saved.anchor = { block: anchorBlock, hash: anchor.hash }; }
    catch { /* overlap is still re-read even if an anchor cannot be saved */ }
  }
  memory.set(key, saved);
  try { localStorage.setItem(key, JSON.stringify(saved, (_, v) => typeof v === 'bigint' ? { bigint: v.toString() } : v)); }
  catch { warnings.push('Browser storage is unavailable or full. Events are kept only for this visit.'); }
  const posted = logs.filter(l => l.eventName === 'NotePosted');
  const settled = logs.filter(l => l.eventName === 'Settled');
  const observed = logs.filter(l => l.eventName === 'Observed');
  const retracted = logs.filter(l => l.eventName === 'Retracted');
  const sealed = logs.filter(l => l.eventName === 'Sealed');
  const revealed = logs.filter(l => l.eventName === 'Revealed');
  const blocks = new Set<bigint>();
  for (const l of [...posted, ...sealed]) blocks.add(l.blockNumber);
  await mapBounded([...blocks], async b => {
    try { await blockTime(pub, b); } catch { warnings.push(`Block ${b} could not be dated; its entries are temporarily omitted.`); }
  });

  const views = await mapBounded(posted, async l => {
    try { return await pub.readContract({ address: hook, abi: MarginaliaHookAbi, functionName: 'noteOf', args: [l.args.id!] }); }
    catch { warnings.push(`Live state for note ${BigInt(l.args.id!)} is unavailable; that entry is temporarily omitted.`); return null; }
  });
  const byId = new Map<Hex, Note>();
  const notes: Note[] = posted.flatMap((l, i) => {
    const v = views[i];
    if (!v || !tsCache.has(l.blockNumber)) return [];
    const n: Note = {
      id: l.args.id!,
      index: BigInt(l.args.id!),
      author: l.args.author!,
      x: l.args.x!,
      classAtPost: Number(l.args.class),
      side: Number(l.args.side),
      targetBps: Number(l.args.targetBps),
      horizonDays: Number(l.args.horizonDays),
      parentId: l.args.parentId!,
      text: l.args.text ?? '',
      block: l.blockNumber,
      tx: l.transactionHash,
      timestamp: tsCache.get(l.blockNumber) ?? 0,
      status: Number(v.status),
      classLive: Number(v.class),
      postPrice: v.postPrice,
      postBalance: v.postBalance,
      deposit: v.deposit,
      children: Number(v.children),
      observations: [],
    };
    byId.set(n.id, n);
    return [n];
  });
  for (const l of settled) {
    const n = byId.get(l.args.id!);
    if (n) n.settlement = { status: Number(l.args.status), settlePrice: l.args.settlePrice!, scoreDelta: l.args.scoreDelta!, keeper: l.args.keeper!, block: l.blockNumber };
  }
  for (const l of observed) {
    const n = byId.get(l.args.id!);
    if (n) n.observations.push({ xRead: l.args.xRead!, balance: l.args.balance!, block: l.blockNumber, tx: l.transactionHash });
  }
  for (const l of retracted) {
    const n = byId.get(l.args.id!);
    if (n) n.retraction = l.args.text ?? '';
  }
  for (const l of revealed) {
    const n = byId.get(l.args.id!);
    if (n) n.revealedHash = l.args.hash!;
  }
  notes.sort((a, b) => (a.index > b.index ? -1 : 1));
  const seals: SealRecord[] = sealed.filter(l => tsCache.has(l.blockNumber)).map((l) => ({
    hash: l.args.hash!,
    author: l.args.author!,
    x: l.args.x!,
    venueRef: l.args.venueRef!,
    block: l.blockNumber,
    tx: l.transactionHash,
    timestamp: tsCache.get(l.blockNumber) ?? 0,
  }));
  seals.sort((a, b) => (a.block > b.block ? -1 : 1));
  return { notes, byId, seals, toBlock, loadedAt: Date.now(), partial: partial || warnings.some(w => w.includes('temporarily omitted')), warnings };
}

export function horizonEndOf(n: Note): number {
  return n.timestamp + n.horizonDays * 86400;
}
export function isThesis(n: Note): boolean {
  return n.targetBps === 0;
}
