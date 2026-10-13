// Backers of a writer: holders of that wallet's pages and what the writer earned, read from Pages Trade events.
// Chunked from the Pages deployment block; a refused range is disclosed as a gap, never shown as zero backers.
import { parseAbiItem, type Address, type PublicClient } from 'viem';
import { PagesAbi } from './pages-abi';
import { LOG_CHUNK, PAGES_DEPLOY_BLOCK } from './config';

export const tradeEvent = parseAbiItem('event Trade(bytes32 indexed subject, address indexed trader, bool indexed buy, uint256 amount, uint256 value, uint256 fee, uint256 supply)');
/** At most this many chunks per read keeps a phone's history scan bounded; older ranges are reported as a gap. */
export const BACKER_CHUNKS = 40;

export interface Backers {
  subject: `0x${string}`;
  supply: bigint;
  holders: { address: Address; pages: bigint }[];
  earned: bigint;
  trades: number;
  issuerBps: bigint;
  partial: boolean;
  from: bigint;
  to: bigint;
}

export async function readBackers(pub: PublicClient, pages: Address, author: Address): Promise<Backers> {
  const h = { address: pages, abi: PagesAbi } as const;
  const [subject, head, issuerBps] = await Promise.all([
    pub.readContract({ ...h, functionName: 'subjectOf', args: [author] }),
    pub.getBlockNumber(),
    pub.readContract({ ...h, functionName: 'ISSUER_BPS' }),
  ]);
  const s = await pub.readContract({ ...h, functionName: 'subjects', args: [subject] });
  const net = new Map<string, bigint>();
  let earned = 0n, trades = 0, partial = false;
  const start = head > PAGES_DEPLOY_BLOCK + LOG_CHUNK * BigInt(BACKER_CHUNKS) ? head - LOG_CHUNK * BigInt(BACKER_CHUNKS) + 1n : PAGES_DEPLOY_BLOCK;
  if (start > PAGES_DEPLOY_BLOCK) partial = true;
  for (let a = start; a <= head; a += LOG_CHUNK) {
    const end = a + LOG_CHUNK - 1n < head ? a + LOG_CHUNK - 1n : head;
    try {
      const logs = await pub.getLogs({ address: pages, event: tradeEvent, args: { subject }, fromBlock: a, toBlock: end, strict: true });
      for (const l of logs) {
        trades++;
        const key = l.args.trader.toLowerCase();
        net.set(key, (net.get(key) ?? 0n) + (l.args.buy ? l.args.amount : -l.args.amount));
        earned += l.args.fee * issuerBps / 10000n;
      }
    } catch { partial = true; }
  }
  const holders = [...net.entries()].filter(([, pages]) => pages > 0n).map(([address, pages]) => ({ address: address as Address, pages })).sort((x, y) => (y.pages > x.pages ? 1 : y.pages < x.pages ? -1 : 0));
  return { subject, supply: s[0], holders, earned, trades, issuerBps, partial, from: start, to: head };
}
