import assert from 'node:assert/strict';
import { toHex, type Address, type PublicClient } from 'viem';
import { BACKER_CHUNKS, readBackers } from '../src/backers';
import { LOG_CHUNK, PAGES_DEPLOY_BLOCK } from '../src/config';

const author = '0x1111111111111111111111111111111111111111' as Address;
const trader = '0x2222222222222222222222222222222222222222' as Address;
const pages = '0x3333333333333333333333333333333333333333' as Address;
const subject = toHex(1n, { size: 32 });
const head = PAGES_DEPLOY_BLOCK + 3999n;
const trade = (buy: boolean, amount = 1n, address = trader) => ({ args: { trader: address, buy, amount, fee: 5n * 10n ** 15n } });
type Read = { functionName: string; args?: readonly unknown[]; blockNumber?: bigint };
function fixture({ at = head, gap = false, balance = 0n, supply = balance, fail = false, first = [trade(true)], second = [] as ReturnType<typeof trade>[] } = {}) {
  const reads: Read[] = [];
  const pub = {
    getBlockNumber: async () => at,
    readContract: async (c: Read) => {
      reads.push(c);
      if (c.functionName === 'subjectOf') return subject;
      if (c.functionName === 'ISSUER_BPS') return 8000n;
      if (c.functionName === 'subjects') return [supply, author, 0n, 0n];
      if (c.functionName === 'pagesOf') { if (fail) throw new Error('Balance unavailable'); return balance; }
      throw new Error(`Unexpected ${c.functionName}`);
    },
    getLogs: async ({ fromBlock }: { fromBlock: bigint }) => {
      if (fromBlock === PAGES_DEPLOY_BLOCK) return first;
      if (gap) throw new Error('Sell range unavailable');
      return second;
    },
  } as unknown as PublicClient;
  return { pub, reads };
}
let failures = 0;
async function check(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log('PASS', name); }
  catch (e) { failures++; console.error('FAIL', name, e); }
}
await check('A sell in an unreadable range cannot leave a former holder in the list', async () => {
  const { pub, reads } = fixture({ gap: true });
  const b = await readBackers(pub, pages, author);
  assert.equal(b.partial, true); assert.equal(b.supply, 0n); assert.deepEqual(b.holders, []);
  assert(reads.some(r => r.functionName === 'pagesOf'));
  assert(reads.every(r => r.blockNumber === head), 'Supply, subject, fee and balances share one snapshot');
  assert.equal(b.earned, 4n * 10n ** 15n, 'Readable fees still count toward partial earnings');
});
await check('Every candidate is checked, including net-zero and sell-only histories', async () => {
  for (const first of [[trade(false)], [trade(true), trade(false)]]) {
    const { pub } = fixture({ gap: true, first, balance: 3n });
    const b = await readBackers(pub, pages, author);
    assert.deepEqual(b.holders, [{ address: trader, pages: 3n }]);
  }
});
await check('Failed balance reads are excluded and marked independently of history gaps', async () => {
  for (const gap of [false, true]) {
    const { pub } = fixture({ gap, fail: true });
    const b = await readBackers(pub, pages, author);
    assert.deepEqual(b.holders, []);
    assert.equal(b.holdingsFailed, 1); assert.equal(b.partial, gap);
  }
});
await check('Complete history uses current balances, deduplicates candidates and sorts holdings', async () => {
  const { pub, reads } = fixture({ balance: 2n, first: [trade(true), trade(true)], second: [trade(false)] });
  const b = await readBackers(pub, pages, author);
  assert.deepEqual(b.holders, [{ address: trader, pages: 2n }]); assert.equal(b.partial, false);
  assert.equal(b.holdingsFailed, 0); assert.equal(b.trades, 3);
  assert.equal(reads.filter(r => r.functionName === 'pagesOf').length, 1);
});
await check('Bounded history discloses undiscovered holders but verifies sell-only candidates', async () => {
  const { pub, reads } = fixture({ at: PAGES_DEPLOY_BLOCK + LOG_CHUNK * BigInt(BACKER_CHUNKS + 1), second: [trade(false)], balance: 1n });
  const b = await readBackers(pub, pages, author);
  assert.equal(b.partial, true); assert(b.from > PAGES_DEPLOY_BLOCK);
  assert.deepEqual(b.holders, [{ address: trader, pages: 1n }]);
  assert(reads.every(r => r.blockNumber === b.to));
});
await check('Candidate balances are read in bounded batches and failures do not hide verified holders', async () => {
  const candidates = Array.from({ length: 45 }, (_, i) => toHex(i + 10, { size: 20 }) as Address);
  let active = 0, peak = 0;
  const { pub } = fixture({ first: candidates.map(a => trade(true, 1n, a)) });
  const read = pub.readContract;
  pub.readContract = (async (c: Read) => {
    if (c.functionName !== 'pagesOf') return read(c as never);
    active++; peak = Math.max(peak, active);
    await new Promise(r => setTimeout(r, 1)); active--;
    if (c.args?.[1] === candidates[0]) throw new Error('One balance failed');
    return BigInt(candidates.indexOf(c.args?.[1] as Address) % 3);
  }) as typeof pub.readContract;
  const b = await readBackers(pub, pages, author);
  assert.equal(b.holdingsFailed, 1); assert.equal(b.holders.length, 30);
  assert(peak > 1 && peak <= 20, `Balance concurrency ${peak}`);
  assert(b.holders.every((h, i) => i === 0 || b.holders[i-1].pages >= h.pages));
});
if (failures) throw new Error(`${failures} backer regressions failed`);
