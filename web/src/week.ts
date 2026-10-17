import type { Address, Hex, PublicClient } from 'viem';
import { MarginaliaHookAbi } from './abi';
import { JudgeActionsAbi } from './lifecycle-abi';
import { DEPLOY_BLOCK } from './config';
import type { FeedData } from './notes';

export interface WeekPot { week: number; pool: bigint; eligible: readonly Hex[] }
export interface YourThesis extends WeekPot { id: Hex; index: bigint; graceEnd: number; isEligible: boolean }
const deploymentWeek = new WeakMap<PublicClient, Promise<number>>();

/** Inspect every chain week since launch, including pools with no loaded events. */
export async function readOpenWeeks(pub: PublicClient, hook: Address, judge: Address) {
  let first = deploymentWeek.get(pub);
  if (!first) {
    first = pub.getBlock({ blockNumber: DEPLOY_BLOCK }).then(b => Math.floor(Number(b.timestamp) / 604800));
    deploymentWeek.set(pub, first);
    void first.catch(() => deploymentWeek.delete(pub));
  }
  const [from, current] = await Promise.all([first, pub.readContract({ address: hook, abi: MarginaliaHookAbi, functionName: 'week' })]);
  const weeks: WeekPot[] = [];
  for (let end = current; end >= from; end -= 4) {
    const batch = Array.from({ length: Math.min(4, end - from + 1) }, (_, i) => end - i);
    const rows = await Promise.all(batch.map(async week => {
      const [pool, paid] = await Promise.all([
        pub.readContract({ address: hook, abi: MarginaliaHookAbi, functionName: 'thesisPool', args: [week] }),
        pub.readContract({ address: judge, abi: JudgeActionsAbi, functionName: 'paid', args: [week] }),
      ]);
      if (pool === 0n || paid) return null;
      const eligible = await pub.readContract({ address: judge, abi: JudgeActionsAbi, functionName: 'eligibleTheses', args: [week] });
      return { week, pool, eligible };
    }));
    for (const row of rows) if (row) weeks.push(row);
  }
  // Current-week fees already fund a pool, but its theses are still arriving.
  // Keep that week in Your week; open Pots on the newest completed unpaid week.
  return { current, weeks, defaultWeek: weeks.find(w => w.week < current)?.week ?? Math.max(0, current - 1) };
}

/** Event history supplies the timestamp; noteOf verifies the wallet and thesis live. */
export async function readYourTheses(pub: PublicClient, hook: Address, wallet: Address, feed: FeedData, weeks: WeekPot[], grace: number): Promise<YourThesis[]> {
  const pots = new Map(weeks.map(w => [w.week, w]));
  const candidates = feed.notes.filter(n => n.source !== 'annex' && n.targetBps === 0 && n.author.toLowerCase() === wallet.toLowerCase() && pots.has(Math.floor(n.timestamp / 604800)));
  const rows: YourThesis[] = [];
  for (let i = 0; i < candidates.length; i += 4) {
    const batch = await Promise.all(candidates.slice(i, i + 4).map(async n => {
      const live = await pub.readContract({ address: hook, abi: MarginaliaHookAbi, functionName: 'noteOf', args: [n.id] });
      if (live.targetBps !== 0 || live.author.toLowerCase() !== wallet.toLowerCase()) return null;
      const pot = pots.get(Math.floor(n.timestamp / 604800))!;
      return { ...pot, id: n.id, index: n.index, graceEnd: n.timestamp + grace, isEligible: pot.eligible.some(id => id.toLowerCase() === n.id.toLowerCase()) };
    }));
    for (const row of batch) if (row) rows.push(row);
  }
  return rows;
}
