import type { Address } from 'viem';
import { Status } from './lib';
import { isThesis, type Note } from './notes';

export type AuthorRecord = readonly [bigint, number, number, number, number, number, number];
export interface RankedAuthor { address: Address; record: AuthorRecord }

/** A citation is metadata, never an author or a verified identity claim. */
export function parseReceipt(text: string): { handle: string; url: string } | null {
  const match = text.trimStart().match(/^(?:https?:\/\/)?(?:www\.)?(x\.com|twitter\.com)\/([a-zA-Z0-9_]{1,15})\/status\/(\d+)(?=$|[\s?#/])/i);
  if (!match || /^(i|intent|home|search|share)$/i.test(match[2])) return null;
  return { handle: match[2].toLowerCase(), url: `https://${match[1].toLowerCase()}/${match[2]}/status/${match[3]}` };
}

// The contract record has no no-data count. Define this rate explicitly from its counters.
export function hitRate(right: number, wrong: number, broken: number, retracted: number): number | null {
  const finished = right + wrong + broken + retracted;
  return finished ? right / finished : null;
}
export const recordRate = (r: AuthorRecord) => hitRate(r[2], r[3], r[4], r[5]);
export const formatRate = (v: number | null) => v === null ? '—' : `${(v * 100).toFixed(1)}%`;
export function rankAuthors(rows: RankedAuthor[], order: 'score' | 'rate'): RankedAuthor[] {
  return [...rows].sort((a, b) => {
    if (order === 'rate') {
      const rate = (recordRate(b.record) ?? -1) - (recordRate(a.record) ?? -1);
      if (rate) return rate;
    }
    if (a.record[0] !== b.record[0]) return a.record[0] > b.record[0] ? -1 : 1;
    return a.address.toLowerCase().localeCompare(b.address.toLowerCase());
  });
}

export interface Duel { counter: Note; target: Note }
export function findDuels(notes: Note[], onlyOpen = false): Duel[] {
  const byId = new Map(notes.map(n => [n.id.toLowerCase(), n]));
  return notes.flatMap(counter => {
    const target = byId.get(counter.parentId.toLowerCase());
    if (!target || isThesis(counter) || isThesis(target) || counter.author.toLowerCase() === target.author.toLowerCase()
      || counter.x.toLowerCase() !== target.x.toLowerCase() || counter.side === target.side) return [];
    if (onlyOpen && counter.status !== Status.Open && target.status !== Status.Open) return [];
    return [{ counter, target }];
  });
}
export function duelVerdict({ counter, target }: Duel): string {
  if (counter.status === Status.Open || target.status === Status.Open) return 'Awaiting both verdicts';
  if (counter.status === Status.Right && target.status === Status.Right) return 'Both right at their own horizons';
  if (counter.status === Status.Right) return 'Counter right';
  if (target.status === Status.Right) return 'Original call right';
  return 'Neither call recorded right';
}

export interface CitedRecord {
  handle: string; posted: number; right: number; wrong: number; broken: number; retracted: number; noData: number; open: number;
}
export function citedAccounts(notes: Note[]): CitedRecord[] {
  const accounts = new Map<string, CitedRecord>();
  for (const n of notes) {
    const citation = parseReceipt(n.text);
    if (!citation || isThesis(n)) continue;
    const r = accounts.get(citation.handle) ?? { handle: citation.handle, posted: 0, right: 0, wrong: 0, broken: 0, retracted: 0, noData: 0, open: 0 };
    r.posted++;
    if (n.status === Status.Right) r.right++;
    else if (n.status === Status.Wrong) r.wrong++;
    else if (n.status === Status.VoidSold) r.broken++;
    else if (n.status === Status.Retracted) r.retracted++;
    else if (n.status === Status.VoidNoData) r.noData++;
    else r.open++;
    accounts.set(citation.handle, r);
  }
  return [...accounts.values()].sort((a, b) => b.right - a.right || a.wrong - b.wrong || a.handle.localeCompare(b.handle));
}

export function weightedWins(notes: Note[]): bigint {
  return notes.reduce((sum, n) => sum + (n.status === Status.Right && n.settlement && n.settlement.scoreDelta > 0n ? n.settlement.scoreDelta : 0n), 0n);
}

export const HOLD_RULE = "An upward call's wallet must hold through the horizon or forfeit its bond; this binds the posting wallet, not every wallet the author owns";
export const REASONS = [
  "Receipts for every call: a price, a deadline, a bond, and the chain's verdict",
  'Prove it: a difficulty-weighted score, public duels, a weekly prize',
  "Readers pay writers: pages of an author's marginalia (coming with the page market)",
];
