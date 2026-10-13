// Read-only check. Pass an RPC and the exported runtime manifest; never signs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPublicClient, http, type Address } from 'viem';
import { MarginaliaHookAbi } from '../src/abi';
import { noteIdFromIndex } from '../src/lib';
import { readThesisParent, thesisParentError } from '../src/thesis-parent';

const manifest = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const hook = manifest.contracts.find((c: { name: string }) => c.name === 'MarginaliaHook').address as Address;
const pub = createPublicClient({ transport: http(process.argv[2]), ccipRead: false });
assert.equal(await pub.getChainId(), manifest.chainId);
assert((await pub.getCode({ address: hook }))!.length > 2);
const args = { address: hook, abi: MarginaliaHookAbi } as const;
const grace = Number(await pub.readContract({ ...args, functionName: 'THESIS_GRACE' }));
const count = await pub.readContract({ ...args, functionName: 'noteCount' });
assert.equal(grace, 7 * 86400);
await assert.rejects(readThesisParent(pub, hook, noteIdFromIndex(count + 1n), grace), /This parent does not exist/);
let latest;
if (count > 0n) {
  const parent = await readThesisParent(pub, hook, noteIdFromIndex(count), grace);
  latest = { ...parent, errorForAuthor: thesisParentError(parent, parent.author, parent.chainTime) };
}
console.log(JSON.stringify({ chainId: manifest.chainId, hook, thesisGrace: grace, noteCount: String(count), latest, unknownNoteDecoded: true, transactionsSent: 0 }, null, 2));
