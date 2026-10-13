import assert from 'node:assert/strict';
import { zeroAddress, zeroHash, type PublicClient } from 'viem';
import { checkThesisParent, parentIdOf, readThesisParent, thesisParentError, type ThesisParent } from '../src/thesis-parent';
import { Status } from '../src/lib';

const author = '0x1234567890AbcdEF1234567890aBcdef12345678' as const;
const other = '0x2222222222222222222222222222222222222222' as const;
const id = parentIdOf('0x1')!;
const parent: ThesisParent = { id, author, status: Status.ThesisOpen, targetBps: 0, graceEnd: 604900, chainTime: 100 };
assert.equal(parentIdOf(' 0x1 '), id);
assert.equal(parentIdOf('0xAB'), `0x${'0'.repeat(62)}ab`);
for (const invalid of ['', '1', '0x', '0xxyz', zeroHash, `0x${'1'.repeat(65)}`]) assert.equal(parentIdOf(invalid), null);
assert.match(thesisParentError({ ...parent, author: zeroAddress }, author, 100)!, /does not exist/);

// Gate 1: live ThesisOpen, not an ordinary call or a closed/forfeited thesis.
for (const status of Object.values(Status).filter(s => s !== Status.ThesisOpen)) {
  assert.equal(thesisParentError({ ...parent, status }, author, 100), 'Choose an open thesis as the parent.');
}
assert.equal(thesisParentError({ ...parent, targetBps: 12500 }, author, 100), 'Choose an open thesis as the parent.');

// Gate 2: connected author; checksum casing cannot change ownership.
assert.equal(thesisParentError(parent, author.toLowerCase() as typeof author, 100), null);
assert.match(thesisParentError(parent, other, 100)!, /another wallet/);

// Gate 3: before or at the inclusive deadline, never one second after it.
assert.equal(thesisParentError(parent, author, parent.graceEnd - 1), null);
assert.equal(thesisParentError(parent, author, parent.graceEnd), null);
assert.match(thesisParentError(parent, author, parent.graceEnd + 1)!, /deadline has passed/);
assert.match(thesisParentError({ ...parent, chainTime: parent.graceEnd + 1 }, author, 1)!, /deadline has passed/);

let status: number = Status.ThesisOpen;
let chainTime = 200n;
const calls: { functionName: string; blockNumber: bigint; address: string; args: string[] }[] = [];
const pub = {
  getBlock: async () => ({ number: 42n, timestamp: chainTime }),
  readContract: async (call: (typeof calls)[number]) => {
    calls.push(call);
    if (call.functionName === 'horizonEnd') return 100n;
    return { author, status, targetBps: 0 };
  },
} as unknown as PublicClient;
assert.deepEqual(await readThesisParent(pub, other, id, 604800), { ...parent, chainTime: 200 });
assert.deepEqual(calls.map(c => [c.functionName, c.blockNumber, c.address, c.args[0]]), [
  ['noteOf', 42n, other, id], ['horizonEnd', 42n, other, id],
]);
assert.equal(await checkThesisParent(pub, other, id, author, 604800), parent.graceEnd);
status = Status.ThesisClosed;
await assert.rejects(checkThesisParent(pub, other, id, author, 604800), /open thesis/);
status = Status.ThesisOpen;
chainTime = 604901n;
await assert.rejects(checkThesisParent(pub, other, id, author, 604800), /deadline has passed/);
await assert.rejects(readThesisParent({ getBlock: async () => ({ number: 1n, timestamp: 1n }), readContract: async () => { throw Error('provider offline'); } } as unknown as PublicClient, other, id, 604800), /Could not verify this parent on chain; retry/);
console.log('PASS child-call: ID/existence, ThesisOpen, author, inclusive grace, chain clock, fixed-block reads and fresh preflight rejection.');
