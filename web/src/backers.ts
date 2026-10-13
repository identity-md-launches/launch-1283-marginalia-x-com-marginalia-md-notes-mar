// Trade events discover candidate backers and writer earnings; pagesOf verifies current holdings.
// Gaps can hide candidates and earnings, but must never turn a former holder into a current backer.
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
  holdingsFailed: number;
  from: bigint;
  to: bigint;
}

export async function readBackers(pub: PublicClient, pages: Address, author: Address): Promise<Backers> {
  const h = { address: pages, abi: PagesAbi } as const;
  const head = await pub.getBlockNumber({ cacheTime: 0 });
  const [subject, issuerBps] = await Promise.all([
    pub.readContract({ ...h, functionName: 'subjectOf', args: [author], blockNumber: head }),
    pub.readContract({ ...h, functionName: 'ISSUER_BPS', blockNumber: head }),
  ]);
  const s = await pub.readContract({ ...h, functionName: 'subjects', args: [subject], blockNumber: head });
  const candidates = new Set<Address>();
  let earned = 0n, trades = 0, partial = false;
  const start = head > PAGES_DEPLOY_BLOCK + LOG_CHUNK * BigInt(BACKER_CHUNKS) ? head - LOG_CHUNK * BigInt(BACKER_CHUNKS) + 1n : PAGES_DEPLOY_BLOCK;
  if (start > PAGES_DEPLOY_BLOCK) partial = true;
  for (let a = start; a <= head; a += LOG_CHUNK) {
    const end = a + LOG_CHUNK - 1n < head ? a + LOG_CHUNK - 1n : head;
    try {
      const logs = await pub.getLogs({ address: pages, event: tradeEvent, args: { subject }, fromBlock: a, toBlock: end, strict: true });
      for (const l of logs) {
        trades++;
        candidates.add(l.args.trader.toLowerCase() as Address);
        earned += l.args.fee * issuerBps / 10000n;
      }
    } catch { partial = true; }
  }
  const holders: Backers['holders'] = [];
  let holdingsFailed = 0;
  const addresses = [...candidates];
  // Limit concurrent RPC reads even for a busy writer; a failed balance remains unknown, not zero.
  for (let i = 0; i < addresses.length; i += 20) {
    const balances = await Promise.allSettled(addresses.slice(i, i + 20).map(async address => ({
      address,
      pages: await pub.readContract({ ...h, functionName: 'pagesOf', args: [subject, address], blockNumber: head }),
    })));
    for (const balance of balances) {
      if (balance.status === 'rejected') holdingsFailed++;
      else if (balance.value.pages > 0n) holders.push(balance.value);
    }
  }
  holders.sort((x, y) => (y.pages > x.pages ? 1 : y.pages < x.pages ? -1 : x.address.localeCompare(y.address)));
  return { subject, supply: s[0], holders, earned, trades, issuerBps, partial, holdingsFailed, from: start, to: head };
}
