// History regressions with an in-memory chain and browser storage; no network or signatures.
import assert from 'node:assert/strict';
import { toHex, type Address, type PublicClient } from 'viem';
import { DEPLOY_BLOCK, LOG_CHUNK } from '../src/config';
import { loadFeed } from '../src/notes';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
}, configurable: true });
const unit = 10n ** 18n;
let sequence = 100;
function fixture(offset: bigint) {
  const hook = toHex(sequence++, { size: 20 }) as Address;
  const calls: [bigint, bigint][] = [];
  const state = { head: DEPLOY_BLOCK + offset, refuse: (_a: bigint, _b: bigint) => false, reorg: false, liveFails: false };
  const posted = (index: number, offset: bigint) => ({
    eventName: 'NotePosted', blockNumber: DEPLOY_BLOCK + offset, transactionHash: toHex(index, { size: 32 }), logIndex: 0,
    args: { id: toHex(index, { size: 32 }), author: hook, x: hook, class: 1, side: 0, targetBps: 12000, horizonDays: 30, parentId: toHex(0, { size: 32 }), text: `History note ${index}` },
  });
  const events: any[] = [];
  const client = {
    getBlockNumber: async () => state.head,
    getBlock: async ({ blockNumber }: { blockNumber?: bigint }) => ({ timestamp: 1791763200n, number: blockNumber ?? state.head, hash: toHex(state.reorg ? 2 : 1, { size: 32 }) }),
    getLogs: async ({ fromBlock, toBlock }: { fromBlock: bigint; toBlock: bigint }) => {
      calls.push([fromBlock, toBlock]);
      assert(toBlock - fromBlock < LOG_CHUNK, 'All RPC ranges must be at most 2,000 blocks');
      if (state.refuse(fromBlock, toBlock)) throw Error('Archive requests require a personal token');
      return events.filter(e => e.blockNumber >= fromBlock && e.blockNumber <= toBlock);
    },
    readContract: async () => {
      if (state.liveFails) throw Error('Live state unavailable');
      return { status: 0, class: 1, postPrice: unit, postBalance: unit, deposit: unit / 4n, children: 0 };
    },
  } as unknown as PublicClient;
  return { hook, state, calls, events, posted, load: () => loadFeed(client, hook), key: `marginalia.logs.v1.1.${hook}` };
}
let checks = 0;
async function check(name: string, run: () => Promise<void>) {
  try { await run(); checks++; console.log('PASS', name); }
  catch (e) { console.error('FAIL', name, e); process.exitCode = 1; }
}
await check('Fresh browser recovers the reviewer’s historical note from deployment', async () => {
  const f = fixture(12000n); f.events.push(f.posted(1, 1000n));
  let feed = await f.load();
  for (let i = 0; feed.partial && i < 3; i++) feed = await f.load();
  assert.deepEqual(feed.notes.map(n => n.index), [1n]);
  assert.equal(feed.partial, false);
  assert(f.calls.some(([a, b]) => a === DEPLOY_BLOCK && b === DEPLOY_BLOCK + 1999n));
});
await check('Returning browser retrieves the served gap after a 9,000-block absence', async () => {
  const f = fixture(3500n); f.events.push(f.posted(1, 100n));
  assert.equal((await f.load()).notes.length, 1);
  f.events.push(f.posted(2, 4000n)); f.state.head += 9000n;
  f.state.refuse = a => a < f.state.head - 10000n;
  let feed = await f.load();
  for (let i = 0; feed.notes.length < 2 && i < 3; i++) feed = await f.load();
  assert.deepEqual(feed.notes.map(n => n.index), [2n, 1n]);
  assert.equal(feed.partial, false);
});
await check('Automatic scan covers all history in one load and all six event types join', async () => {
  const f = fixture(50000n); const note = f.posted(1, 16000n); f.events.push(note);
  const base = { blockNumber: DEPLOY_BLOCK + 16100n, transactionHash: note.transactionHash };
  f.events.push(
    { ...base, logIndex: 1, eventName: 'Observed', args: { id: note.args.id, xRead: 99n, balance: unit } },
    { ...base, logIndex: 2, eventName: 'Settled', args: { id: note.args.id, status: 1, settlePrice: unit, scoreDelta: 10n, keeper: f.hook } },
    { ...base, logIndex: 3, eventName: 'Retracted', args: { id: note.args.id, text: 'Historical retraction' } },
    { ...base, logIndex: 4, eventName: 'Sealed', args: { hash: note.args.id, author: f.hook, x: f.hook, venueRef: note.args.id } },
    { ...base, logIndex: 5, eventName: 'Revealed', args: { id: note.args.id, hash: note.args.id } },
  );
  let feed = await f.load();
  assert.equal(feed.partial, false);
  assert.equal(f.calls.length, 26);
  const saved = JSON.parse(storage.get(f.key)!);
  assert.equal(BigInt(saved.historyCursor.bigint), DEPLOY_BLOCK);
  assert.equal(feed.partial, false);
  assert.equal(feed.notes.length, 1);
  assert.equal(feed.notes[0].observations[0].xRead, 99n);
  assert.equal(feed.notes[0].settlement?.scoreDelta, 10n);
  assert.equal(feed.notes[0].retraction, 'Historical retraction');
  assert.equal(feed.notes[0].revealedHash, note.args.id);
  assert.equal(feed.seals.length, 1);
});
await check('Refused history cannot starve later ranges; recovery retries only remaining holes', async () => {
  const f = fixture(26000n); f.events.push(f.posted(1, 1000n), f.posted(2, 10000n));
  f.state.refuse = a => a === DEPLOY_BLOCK;
  let feed = await f.load();
  for (let i = 0; feed.notes.length === 0 && i < 5; i++) feed = await f.load();
  assert.deepEqual(feed.notes.map(n => n.index), [2n]); assert(feed.partial);
  f.state.refuse = () => false;
  for (let i = 0; feed.partial && i < 5; i++) feed = await f.load();
  assert.deepEqual(feed.notes.map(n => n.index), [2n, 1n]); assert.equal(feed.partial, false);
  // Complete history needs only the live overlap on the next refresh.
  f.calls.length = 0; feed = await f.load(); assert.equal(f.calls.length, 1); assert.equal(feed.notes.length, 2);
});
await check('Successful coverage survives a failed overlap and a later successful replacement', async () => {
  const f = fixture(3500n); f.events.push(f.posted(1, 3490n));
  assert.equal((await f.load()).notes.length, 1);
  const ranges = JSON.parse(storage.get(f.key)!).ranges;
  f.state.refuse = () => true;
  const failed = await f.load(); assert.equal(failed.notes.length, 1);
  assert.deepEqual(JSON.parse(storage.get(f.key)!).ranges, ranges);
  assert(failed.warnings.some(w => w.includes('did not serve')));
  f.state.refuse = () => false; f.events.length = 0;
  assert.equal((await f.load()).notes.length, 0);
});
await check('Old v1 tail-only caches migrate without dropping logs and coverage', async () => {
  const f = fixture(12000n); const recent = f.posted(2, 11000n); f.events.push(f.posted(1, 1000n), recent);
  const saved = { version: 1, logs: [recent], cursor: f.state.head, ranges: [[f.state.head - 7999n, f.state.head]] };
  storage.set(f.key, JSON.stringify(saved, (_, v) => typeof v === 'bigint' ? { bigint: v.toString() } : v));
  const feed = await f.load();
  assert.deepEqual(feed.notes.map(n => n.index), [2n, 1n]); assert.equal(feed.partial, false);
});
await check('A changed block anchor discards reorganized historical logs', async () => {
  const f = fixture(12000n); f.events.push(f.posted(1, 1000n));
  assert.equal((await f.load()).notes.length, 1);
  f.state.reorg = true; f.events.length = 0;
  const feed = await f.load(); assert.equal(feed.notes.length, 0);
  assert(feed.warnings.some(w => w.includes('reorganization')));
});
console.log(`${checks} history scenarios passed`);
