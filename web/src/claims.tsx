import { UsdContext } from './price';
import { formatUnits, type Address, type PublicClient } from 'viem';
import { AnnexAbi } from './annex-abi';
import { MarginaliaHookAbi } from './abi';
import { useApp } from './chain';
import { Status } from './lib';
import type { Note } from './notes';
import { TxButton } from './ui';

export function refundShare(pool: bigint, count: number, stamp: bigint): bigint {
  const share = count > 0 ? pool / BigInt(count) : 0n;
  return share < stamp ? share : stamp;
}
export async function readClaim(pub: PublicClient, hook: Address, n: Note, stamp: bigint) {
  if (n.source === 'annex' && n.sourceAddress) {
    const view = await pub.readContract({ address:n.sourceAddress, abi:AnnexAbi, functionName:'noteOf',args:[n.id] });
    const day = Math.floor(n.timestamp/86400);
    return { id:n.id,author:view.author,day,today:day,pool:0n,count:0,claimed:true,deposit:([Status.Right,Status.VoidNoData] as number[]).includes(view.status)?view.deposit:0n,refund:0n,annex:n.sourceAddress };
  }
  const h = { address: hook, abi: MarginaliaHookAbi } as const;
  const day = Math.floor(n.timestamp / 86400);
  const [view, claimed, pool, count, today] = await Promise.all([
    pub.readContract({ ...h, functionName: 'noteOf', args: [n.id] }),
    pub.readContract({ ...h, functionName: 'refundClaimed', args: [n.id] }),
    pub.readContract({ ...h, functionName: 'refundPool', args: [day] }),
    pub.readContract({ ...h, functionName: 'notesPerDay', args: [day] }),
    pub.readContract({ ...h, functionName: 'today' }),
  ]);
  const deposit = ([Status.Right, Status.VoidNoData, Status.ThesisClosed] as number[]).includes(view.status) ? view.deposit : 0n;
  const refund = !claimed && view.status !== Status.Retracted && day < today ? refundShare(pool, count, stamp) : 0n;
  return { id: n.id, author: view.author, day, today, pool, count, claimed, deposit, refund, annex: undefined as Address | undefined };
}
export type Claim = Awaited<ReturnType<typeof readClaim>>;

export function ClaimControls({ claim, onDone }: { claim: Claim; onDone: (kind: 'deposit' | 'refund') => void | Promise<void> }) {
  const { pub, contracts, wallet } = useApp();
  if (wallet.account?.toLowerCase() !== claim.author.toLowerCase()) return null;
  const send = (functionName: 'claimDeposit' | 'claimRefund') => async () => {
    const { request } = await pub.simulateContract({ address: claim.annex ?? contracts.hook, abi: claim.annex ? AnnexAbi : MarginaliaHookAbi, functionName, args: [claim.id], account: wallet.account! });
    return wallet.client!.writeContract(request);
  };
  return <>
    {(claim.deposit>0n||claim.refund>0n)&&<p className="small">Available: {formatUnits(claim.deposit+claim.refund,18)} IMD <UsdContext imd={claim.deposit+claim.refund}/></p>}
    {claim.deposit > 0n && <TxButton label={`Claim deposit (${formatUnits(claim.deposit, 18)} IMD)`} busyLabel="Claiming deposit…" primary onSend={send('claimDeposit')} onDone={() => onDone('deposit')} explain="Returns this note’s remaining bond to its author." />}
    {claim.refund > 0n && <TxButton label={`Claim refund (${formatUnits(claim.refund, 18)} IMD)`} busyLabel="Claiming refund…" onSend={send('claimRefund')} onDone={() => onDone('refund')} explain={`Day ${claim.day}: this note’s current share, capped at one stamp. It may change before confirmation.`} />}
  </>;
}
