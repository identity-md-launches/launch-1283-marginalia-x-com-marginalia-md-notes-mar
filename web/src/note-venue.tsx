import { decodeFunctionData, type Abi, type Address } from 'viem';
import { useApp, useRead } from './chain';
import { AnnexAbi } from './annex-abi';
import { TradeRouterAbi } from './trade-abi';
import { MarginaliaRouterAbi } from './abi';
import { readMarket } from './market';
import { fmtAmount, type NoteParams, type PoolKey } from './lib';
import type { Note } from './notes';
import { UsdContext } from './price';

export function NoteVenue({ n }: { n: Note }) {
  const { pub, cfg, contracts:c } = useApp();
  const read = useRead(n.targetBps ? async () => {
    const tx = await pub.getTransaction({hash:n.tx});
    const abi:Abi = n.source==='annex' ? AnnexAbi : [...TradeRouterAbi,...MarginaliaRouterAbi];
    const decoded = decodeFunctionData({abi,data:tx.input});
    if (!['tradeAndNote','note','post','sellWithNote'].includes(decoded.functionName)) throw new Error('Venue is nested in a contract-wallet transaction.');
    const params = decoded.args?.[decoded.functionName==='tradeAndNote'?1:0] as NoteParams;
    const key = decoded.args?.[decoded.functionName==='tradeAndNote'?2:1] as PoolKey;
    if (params.x.toLowerCase()!==n.x.toLowerCase()) throw new Error('Different transaction subject.');
    const pool = `0x${params.venue.ref.slice(-40)}` as Address;
    return readMarket(pub,cfg,c,n.x,params.venue.kind,pool,key);
  } : null,[n.id]);
  if (!n.targetBps) return null;
  const m=read.data;
  return <p className="small venue-line">{m ? <>{fmtAmount(m.quoteDepth)} {m.venue.quote.toLowerCase()===c.imd.toLowerCase()?'IMD':'WETH / ETH'} {m.kind===3?'reserve':'active virtual quote liquidity'} <UsdContext imd={m.depthImd}/></> : read.error ? 'Venue liquidity unavailable' : 'Reading venue liquidity…'}</p>;
}
