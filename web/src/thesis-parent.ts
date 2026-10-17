import { BaseError, ContractFunctionRevertedError, zeroAddress, type Address, type Hex, type PublicClient } from 'viem';
import { MarginaliaHookAbi } from './abi';
import { Status } from './lib';

export interface ThesisParent {
  id: Hex;
  author: Address;
  status: number;
  targetBps: number;
  graceEnd: number;
  chainTime: number;
  children?: number;
}

export function parentIdOf(value: string): Hex | null {
  const id = value.trim();
  return /^0x[0-9a-fA-F]{1,64}$/.test(id) && BigInt(id) > 0n
    ? `0x${BigInt(id).toString(16).padStart(64, '0')}` : null;
}

/** The hook accepts the exact grace-end second (it rejects timestamp > graceEnd). */
export function thesisParentError(parent: ThesisParent, author: Address, now: number): string | null {
  if (parent.author === zeroAddress) return 'This parent does not exist; enter your thesis ID.';
  if (parent.status !== Status.ThesisOpen || parent.targetBps !== 0) return 'Choose an open thesis as the parent.';
  if (parent.author.toLowerCase() !== author.toLowerCase()) return 'This thesis belongs to another wallet; connect its author or choose your own thesis.';
  if (Math.max(now, parent.chainTime) > parent.graceEnd) return 'This thesis’s child-call deadline has passed; choose one still inside its grace period.';
  return null;
}

/** Fixed-block reads do not depend on the feed's event coverage or browser cache. */
export async function readThesisParent(pub: PublicClient, hook: Address, id: Hex, grace: number): Promise<ThesisParent> {
  try {
    const block = await pub.getBlock({ blockTag: 'latest' });
    const at = { address: hook, abi: MarginaliaHookAbi, blockNumber: block.number } as const;
    const note = await pub.readContract({ ...at, functionName: 'noteOf', args: [id] });
    // A thesis has zero horizon, so horizonEnd is its original postedAt timestamp.
    const postedAt = note.targetBps === 0 ? Number(await pub.readContract({ ...at, functionName: 'horizonEnd', args: [id] })) : 0;
    return { id, children: Number(note.children), author: note.author, status: note.status, targetBps: note.targetBps, graceEnd: postedAt + grace, chainTime: Number(block.timestamp) };
  } catch (error) {
    const revert = error instanceof BaseError ? error.walk(e => e instanceof ContractFunctionRevertedError) : undefined;
    if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName === 'UnknownNote') {
      throw new Error('This parent does not exist; enter your thesis ID.');
    }
    throw new Error('Could not verify this parent on chain; retry the parent check.');
  }
}

/** Re-read immediately before approving or posting; bound a delayed signature to the grace. */
export async function checkThesisParent(pub: PublicClient, hook: Address, id: Hex, author: Address, grace: number): Promise<number> {
  const parent = await readThesisParent(pub, hook, id, grace);
  const error = thesisParentError(parent, author, parent.chainTime);
  if (error) throw new Error(error);
  return parent.graceEnd;
}

export const childCallHref = (id: Hex) => `#/call?child=${id}`;
