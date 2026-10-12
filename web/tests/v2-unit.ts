import assert from 'node:assert/strict';
import { zeroHash, type Address } from 'viem';
import { citedAccounts, duelVerdict, findDuels, hitRate, parseReceipt, rankAuthors, weightedWins } from '../src/scoreboard';
import { noteIdFromIndex, Status } from '../src/lib';
import type { Note } from '../src/notes';

const author = '0x1111111111111111111111111111111111111111' as Address;
const other = '0x2222222222222222222222222222222222222222' as Address;
const token = '0x3333333333333333333333333333333333333333' as Address;
const n = (patch: Partial<Note> = {}): Note => ({ id: noteIdFromIndex(1), index: 1n, author, x: token, side: 0, targetBps: 12500, horizonDays: 30, parentId: zeroHash, text: 'A note', block: 1n, tx: zeroHash, timestamp: 1000, status: Status.Open, classAtPost: 1, classLive: 1, postPrice: 1n, postBalance: 1n, deposit: 1n, children: 0, observations: [], ...patch });
let cases = 0;
function check(name: string, fn: () => void) { fn(); cases++; console.log('PASS', name); }
check('Only leading status URLs on exact X/Twitter hosts are receipts', () => {
  for (const value of ['https://x.com/Caller/status/123 proof', 'twitter.com/Caller/status/123', ' x.com/Caller/status/123?x=1', 'https://www.twitter.com/Caller/status/123#proof']) assert.equal(parseReceipt(value)?.handle, 'caller');
  for (const value of ['proof https://x.com/Caller/status/123', 'https://x.com.evil/Caller/status/123', 'https://evil.test/x.com/Caller/status/123', 'https://x.com@evil.test/Caller/status/123', 'https://x.com/Caller/status/no', 'https://x.com/i/status/123', 'https://x.com/Caller/status/123script', 'javascript:x.com/Caller/status/123', 'x.com/1234567890123456/status/1']) assert.equal(parseReceipt(value), null, value);
});
check('Cited accounts count note verdicts without mutating authorship', () => {
  const notes = [n({ text: 'x.com/Caller/status/1', status: Status.Right }), n({ id: noteIdFromIndex(2), author: other, text: 'twitter.com/CALLER/status/2', status: Status.VoidSold }), n({ text: 'x.com/Caller/status/3', targetBps: 0 }), n({ text: 'x.com/Caller/status/4', status: Status.VoidNoData })];
  const rows = citedAccounts(notes);assert.equal(rows.length, 1);assert.equal(rows[0].posted, 3);assert.equal(rows[0].right, 1);assert.equal(rows[0].broken, 1);assert.equal(rows[0].noData, 1);
  assert.equal(notes[0].author, author);assert.equal(notes[1].author, other);
});
check('Duels require same token, opposite sides and different posting wallets', () => {
  const target = n(); const counter = n({ id: noteIdFromIndex(2), parentId: target.id, author: other, side: 1, targetBps: 7500 });
  assert.equal(findDuels([target, counter]).length, 1);
  for (const patch of [{ author }, { x: other }, { side: 0 }, { targetBps: 0 }, { parentId: zeroHash }]) assert.equal(findDuels([target, { ...counter, ...patch }]).length, 0);
  assert.equal(findDuels([{ ...target, status: Status.Right }, { ...counter, status: Status.Wrong }], true).length, 0);
  assert.equal(findDuels([{ ...target, status: Status.Right }, counter], true).length, 1);
  assert.equal(duelVerdict({ target: { ...target, status: Status.Right }, counter: { ...counter, status: Status.Right } }), 'Both right at their own horizons');
  assert.equal(duelVerdict({ target: { ...target, status: Status.Wrong }, counter: { ...counter, status: Status.VoidNoData } }), 'Neither call recorded right');
});
check('Rates expose empty samples and rank without losing bigint score precision', () => {
  assert.equal(hitRate(0, 0, 0, 0), null);assert.equal(hitRate(2, 1, 1, 1), 0.4);
  const rows = [{ address: author, record: [9007199254740993n, 5, 2, 1, 1, 1, 0] as const }, { address: other, record: [9007199254740992n, 2, 2, 0, 0, 0, 0] as const }];
  assert.equal(rankAuthors(rows, 'score')[0].address, author);assert.equal(rankAuthors(rows, 'rate')[0].address, other);
});
check('Weighted wins come only from positive RIGHT settlement deltas', () => {
  const settle = { status: Status.Right, settlePrice: 1n, scoreDelta: 17000n, keeper: author, block: 1n };
  assert.equal(weightedWins([n({ status: Status.Right, settlement: settle }), n({ status: Status.Wrong, settlement: { ...settle, scoreDelta: -9000n } }), n({ status: Status.Right })]), 17000n);
});
console.log(`${cases} v2 logic groups passed.`);
