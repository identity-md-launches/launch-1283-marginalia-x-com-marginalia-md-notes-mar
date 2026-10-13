import type { Address, PublicClient } from 'viem';
import type { Contracts } from './chain';
import { MarginaliaHookAbi } from './abi';
import { AnnexAbi } from './annex-abi';
/** Scores and counts are additive; a failed Annex read is never represented as zero. */
export async function readRecord(pub: PublicClient, c: Contracts, author: Address) {
  const h = await pub.readContract({address:c.hook,abi:MarginaliaHookAbi,functionName:'records',args:[author]});
  if (!c.annex) return h;
  const a = await pub.readContract({address:c.annex,abi:AnnexAbi,functionName:'records',args:[author]});
  return [h[0]+a[0],h[1]+a[1],h[2]+a[2],h[3]+a[3],h[4]+a[4],h[5]+a[5],h[6]] as const;
}
