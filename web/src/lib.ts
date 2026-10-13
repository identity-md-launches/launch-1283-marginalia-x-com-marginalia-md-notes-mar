// Pure helpers: encodings that must match the contracts, enum names, formatting. No network access here.
import { encodeAbiParameters, formatUnits, getAddress, isAddress, keccak256, pad, parseUnits, zeroHash } from 'viem';
import type { Address, Hex } from 'viem';

// ------------------------------------------------------------------ contract types

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}
export const VenueKind = { None: 0, UniV4: 1, UniV3: 2, UniV2: 3 } as const;
export type VenueKindValue = (typeof VenueKind)[keyof typeof VenueKind];
export interface Venue {
  kind: number;
  ref: Hex;
  quote: Address;
  xIsToken0: boolean;
}
export const Side = { Buy: 0, Sell: 1 } as const;
export interface NoteParams {
  x: Address;
  venue: Venue;
  side: number;
  targetBps: number;
  horizonDays: number;
  parentId: Hex;
  class: number;
  text: string;
}
export const Status = {
  Open: 0,
  Right: 1,
  Wrong: 2,
  VoidSold: 3,
  VoidNoData: 4,
  Retracted: 5,
  ThesisOpen: 6,
  ThesisClosed: 7,
  ThesisForfeited: 8,
} as const;
export const STATUS_LABEL: Record<number, string> = {
  0: 'open',
  1: 'right',
  2: 'wrong',
  3: 'void · sold',
  4: 'void · no data',
  5: 'retracted',
  6: 'thesis open',
  7: 'thesis closed',
  8: 'thesis forfeited',
};
export const STATUS_CLASS: Record<number, string> = {
  0: 'open',
  1: 'right',
  2: 'wrong',
  3: 'void',
  4: 'void',
  5: 'retracted',
  6: 'open',
  7: 'closed',
  8: 'forfeited',
};
export const STATUS_EXPLAIN: Record<number, string> = {
  0: 'The horizon has not been settled yet. Anyone may observe inside the settlement window and settle after it.',
  1: 'The call reached its target. The bond is returned to the author; nothing else is paid for being right.',
  2: 'The call missed its target. The bond is forfeited to the pools; the settler received 10% of it.',
  3: 'An upward call whose author sold the position before the horizon ended. The bond is forfeited.',
  4: 'The settlement window produced no usable observations. The bond is returned; this outcome is excluded from hit rate.',
  5: 'The author withdrew the note before settlement. The bond is forfeited and the record counts a retraction.',
  6: 'A thesis that still waits for the author to hang a call off it within 7 days.',
  7: 'A thesis released by a child call that resolved. The author may claim its deposit.',
  8: 'A thesis whose 7-day grace passed without a child call. Its deposit went to the pools.',
};
export const CLASS_LABEL: Record<number, string> = { 0: 'traded', 1: 'declared', 2: 'agent', 3: 'attested' };

// ------------------------------------------------------------------ encodings

const POOL_KEY_TUPLE = {
  type: 'tuple',
  components: [
    { name: 'currency0', type: 'address' },
    { name: 'currency1', type: 'address' },
    { name: 'fee', type: 'uint24' },
    { name: 'tickSpacing', type: 'int24' },
    { name: 'hooks', type: 'address' },
  ],
} as const;
const VENUE_TUPLE = {
  type: 'tuple',
  components: [
    { name: 'kind', type: 'uint8' },
    { name: 'ref', type: 'bytes32' },
    { name: 'quote', type: 'address' },
    { name: 'xIsToken0', type: 'bool' },
  ],
} as const;

/** Uniswap v4 pool id: keccak256(abi.encode(PoolKey)). */
export function poolId(key: PoolKey): Hex {
  return keccak256(encodeAbiParameters([POOL_KEY_TUPLE], [key]));
}
/** The router's price-window key: keccak256(abi.encode(Venue)). */
export function venueId(v: Venue): Hex {
  return keccak256(encodeAbiParameters([VENUE_TUPLE], [v]));
}
/** MarginaliaHook.sealHash(author, p): keccak256(abi.encode(author, x, venue, side, targetBps, horizonDays, parentId, text)). */
export function sealHash(author: Address, p: NoteParams): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'address' },
        VENUE_TUPLE,
        { type: 'uint8' },
        { type: 'uint32' },
        { type: 'uint16' },
        { type: 'bytes32' },
        { type: 'string' },
      ],
      [author, p.x, p.venue, p.side, p.targetBps, p.horizonDays, p.parentId, p.text],
    ),
  );
}
/** MarginaliaHook.sealKey(sealer, hash). */
export function sealKey(sealer: Address, hash: Hex): Hex {
  return keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [sealer, hash]));
}
/** The subject bound by the live seal (X and the entire derived venue). */
export function sealSubject(p: NoteParams): Hex {
  return keccak256(encodeAbiParameters([{ type: 'address' }, VENUE_TUPLE], [p.x, p.venue]));
}
/** A v3 pool or v2 pair address left-padded to bytes32, as Venue.ref expects. */
export function addressRef(a: Address): Hex {
  return pad(a, { size: 32 });
}
/** The zero venue a thesis carries (no price venue). */
export const NO_VENUE: Venue = { kind: VenueKind.None, ref: zeroHash, quote: '0x0000000000000000000000000000000000000000', xIsToken0: false };

/** Note ids are bytes32(noteCount): 1, 2, 3… */
export function noteIdFromIndex(i: number | bigint): Hex {
  return pad(`0x${BigInt(i).toString(16)}` as Hex, { size: 32 });
}
export function noteIndex(id: Hex): bigint {
  return BigInt(id);
}

/** targetBps from a percentage move: BUY 10000 + pct*100, SELL 10000 - pct*100. */
export function targetBpsFor(side: number, pct: number): number {
  const result = parseTarget(side, String(pct));
  if (result.error) throw new Error(result.error);
  return result.targetBps!;
}
/** Percentages encode exact hundredths; never round a call into a thesis or outside uint32. */
export function parseTarget(side: number, text: string, minDeltaBps = 1000): { targetBps?: number; error?: string } {
  if (side !== Side.Buy && side !== Side.Sell) return { error: 'Choose an upward or downward call.' };
  if (!/^\d+(\.\d{1,2})?$/.test(text.trim())) return { error: 'Enter a finite percentage with at most two decimal places.' };
  const [whole, fraction = ''] = text.trim().split('.');
  const delta = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  const target = side === Side.Buy ? 10000n + delta : 10000n - delta;
  if (delta < BigInt(minDeltaBps)) return { error: `The target must be at least ${minDeltaBps / 100}% away.` };
  if (side === Side.Sell && (target < 1n || target > 9000n)) return { error: 'A downward target must be between 10% and 99.99%.' };
  if (side === Side.Buy && (target < 11000n || target > 4294967295n)) return { error: 'An upward target must be between 10% and 42949572.95%.' };
  return { targetBps: Number(target) };
}
export function describeTarget(side: number, targetBps: number): string {
  if (targetBps === 0) return 'thesis';
  if (side === Side.Buy && targetBps === 20000) return 'Up 2x';
  const pct = (targetBps - 10000) / 100;
  const sign = pct > 0 ? '+' : '';
  return `${side === Side.Buy ? 'Up' : 'Down'} ${sign}${pct.toFixed(pct % 1 === 0 ? 0 : 2)}%`;
}

// ------------------------------------------------------------------ formatting

export function short(a: string, head = 6, tail = 4): string {
  return a.length > head + tail + 2 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a;
}
export function checksum(a: string): Address {
  return getAddress(a);
}
export function validAddress(a: string): a is Address {
  return isAddress(a.trim());
}
export function fmtAmount(v: bigint | undefined, decimals = 18, digits = 4): string {
  if (v === undefined) return '…';
  const s = formatUnits(v, decimals);
  const [i, f = ''] = s.split('.');
  const frac = f.slice(0, digits).replace(/0+$/, '');
  return frac ? `${i}.${frac}` : i;
}
export function parseAmount(s: string, decimals = 18): bigint | null {
  try {
    const t = s.trim();
    if (!/^\d*\.?\d*$/.test(t) || t === '' || t === '.') return null;
    if ((t.split('.')[1]?.length ?? 0) > decimals) return null;
    return parseUnits(t, decimals);
  } catch {
    return null;
  }
}
/** Score is int256 scaled 1e4. */
export function fmtScore(score: bigint | undefined): string {
  if (score === undefined) return '…';
  const neg = score < 0n;
  const a = neg ? -score : score;
  const whole = a / 10000n;
  const frac = (a % 10000n).toString().padStart(4, '0').slice(0, 2);
  return `${neg ? '−' : ''}${whole}.${frac}`;
}
export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m.toString().padStart(2, '0')} min`;
  if (m > 0) return `${m} min ${sec.toString().padStart(2, '0')} s`;
  return `${sec} s`;
}
export function fmtDate(ts: number | bigint): string {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
export function utf8Length(s: string): number {
  return new TextEncoder().encode(s).length;
}
export function dayOf(ts: number): number {
  return Math.floor(ts / 86400);
}
export function weekOf(ts: number): number {
  return Math.floor(ts / (7 * 86400));
}

/** Human text for wallet and contract errors (never a raw selector where we know better). */
export function explainError(e: unknown): string {
  const any = e as { shortMessage?: string; message?: string; code?: number; cause?: { code?: number; message?: string } };
  const code = any?.code ?? any?.cause?.code;
  if (code === 4001) return 'You rejected the request in your wallet.';
  const msg = String(any?.shortMessage || any?.message || e || 'Unknown error');
  const causes: string[] = [msg];
  let current = e as { cause?: unknown; shortMessage?: string; message?: string; data?: { errorName?: string } } | undefined;
  for (let i=0; current && i<8; i++) { causes.push(current.shortMessage ?? '', current.message ?? '', current.data?.errorName ?? ''); current=current.cause as typeof current; }
  const detail=causes.join(' ');
  const known: [RegExp, string][] = [
    [/PriceHistoryUnavailable|0xc3651e6d/i, 'Checkpoint this venue, then wait one hour. The checkpoint must be between 1 and 6 hours old.'],
    [/InvalidNote/, 'The contract refused the note (InvalidNote): check the target, horizon, text length, X token or venue.'],
    [/BadVenue/, 'The contract refused the venue (BadVenue): the pool must be canonical, hold liquidity, contain X and be quoted in IMD, WETH or ETH.'],
    [/NotEligible/, 'This wallet is not yet eligible for pages. Check the access rules.'],
    [/BadSubject/, 'Register this handle before its first page trade.'],
    [/TooManyPages/, 'A wallet can hold at most ten pages of one subject.'],
    [/InsufficientPages/, 'You do not hold enough pages for this amount.'],
    [/ClaimPending|AlreadyClaimed|BadClaim|BadHandle/, 'Check the handle and current claim state before trying again.'],
    [/BadList/, 'The hook list or current admission fee is not valid. Refresh admission details.'],
    [/InsufficientPendingBurn/, 'The pending burn balance changed. Refresh the amount.'],
    [/TooEarly/, 'Too early: the contract says this action is not open yet.'],
    [/NotOpen/, 'This note is not in a state that allows the action.'],
    [/NothingToClaim/, 'Nothing to claim for this note.'],
    [/NothingToSweep/, 'That pool is already empty.'],
    [/Unauthorized/, 'Only the note’s author may do this.'],
    [/Expired/, 'The deadline passed before the transaction was mined.'],
    [/Slippage|TooLittle/, 'The quote moved beyond an output minimum or baseline limit. Refresh the quote and try again.'],
    [/insufficient funds/i, 'Not enough ETH for gas.'],
    [/ERC20InsufficientAllowance|allowance/i, 'The input token allowance is too small. Complete the displayed approval first.'],
    [/ERC20InsufficientBalance|transfer amount exceeds balance/i, 'Not enough of the input token in the wallet.'],
    [/User rejected|user rejected|denied/i, 'You rejected the request in your wallet.'],
  ];
  for (const [re, text] of known) if (re.test(detail)) return text;
  return msg.length > 300 ? `${msg.slice(0, 300)}…` : msg;
}
