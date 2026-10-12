// The feed: NotePosted and the lifecycle events, read in bounded chunks from the deploy block, joined with
// live `noteOf` state. The venue is not in NotePosted nor noteOf; it stays with the author (see Post).
import { parseAbiItem, type Address, type Hex, type PublicClient } from 'viem';
import { MarginaliaHookAbi } from './abi';
import { DEPLOY_BLOCK, LOG_CHUNK } from './config';

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
}

const ev = {
  NotePosted: parseAbiItem('event NotePosted(bytes32 indexed id, address indexed author, address indexed x, uint8 class, uint8 side, uint32 targetBps, uint16 horizonDays, bytes32 parentId, string text)'),
  Settled: parseAbiItem('event Settled(bytes32 indexed id, uint8 status, uint256 settlePrice, int256 scoreDelta, address keeper)'),
  Observed: parseAbiItem('event Observed(bytes32 indexed id, uint256 xRead, uint256 balance)'),
  Retracted: parseAbiItem('event Retracted(bytes32 indexed id, string text)'),
  Sealed: parseAbiItem('event Sealed(bytes32 indexed hash, address indexed author, address indexed x, bytes32 venueRef)'),
  Revealed: parseAbiItem('event Revealed(bytes32 indexed id, bytes32 indexed hash)'),
};

async function chunked<T>(from: bigint, to: bigint, get: (a: bigint, b: bigint) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let a = from; a <= to; a += LOG_CHUNK) {
    const b = a + LOG_CHUNK - 1n > to ? to : a + LOG_CHUNK - 1n;
    out.push(...(await get(a, b)));
  }
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

export async function loadFeed(pub: PublicClient, hook: Address): Promise<FeedData> {
  const toBlock = await pub.getBlockNumber();
  const logsOf = <A extends (typeof ev)[keyof typeof ev]>(event: A) =>
    chunked(DEPLOY_BLOCK, toBlock, (fromBlock, tb) => pub.getLogs({ address: hook, event, fromBlock, toBlock: tb }));
  const [posted, settled, observed, retracted, sealed, revealed] = await Promise.all([
    logsOf(ev.NotePosted),
    logsOf(ev.Settled),
    logsOf(ev.Observed),
    logsOf(ev.Retracted),
    logsOf(ev.Sealed),
    logsOf(ev.Revealed),
  ]);
  const blocks = new Set<bigint>();
  for (const l of [...posted, ...sealed]) blocks.add(l.blockNumber);
  await Promise.all([...blocks].map((b) => blockTime(pub, b)));

  const views = await Promise.all(
    posted.map((l) => pub.readContract({ address: hook, abi: MarginaliaHookAbi, functionName: 'noteOf', args: [l.args.id!] })),
  );
  const byId = new Map<Hex, Note>();
  const notes: Note[] = posted.map((l, i) => {
    const v = views[i];
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
    return n;
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
  const seals: SealRecord[] = sealed.map((l) => ({
    hash: l.args.hash!,
    author: l.args.author!,
    x: l.args.x!,
    venueRef: l.args.venueRef!,
    block: l.blockNumber,
    tx: l.transactionHash,
    timestamp: tsCache.get(l.blockNumber) ?? 0,
  }));
  seals.sort((a, b) => (a.block > b.block ? -1 : 1));
  return { notes, byId, seals, toBlock, loadedAt: Date.now() };
}

export function horizonEndOf(n: Note): number {
  return n.timestamp + n.horizonDays * 86400;
}
export function isThesis(n: Note): boolean {
  return n.targetBps === 0;
}
