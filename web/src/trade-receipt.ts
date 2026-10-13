import { decodeEventLog, parseAbi, zeroAddress, type PublicClient } from 'viem';
import type { Contracts } from './chain';
import { UNIV3_FEES, type AppConfig } from './config';
import type { Note } from './notes';
import { MarginaliaHookAbi, univ3FactoryAbi } from './abi';
import { readMarket } from './market';
export const xTradedAbi = parseAbi(['event XTraded(address indexed trader,uint8 kind,address indexed xIn,address indexed xOut,uint256 spent,uint256 received)']);
export async function readReceiptTrade(pub: PublicClient, cfg: AppConfig, c: Contracts, n: Note) {
  const receipt = await pub.getTransactionReceipt({ hash: n.tx });
  let leg: { amount: bigint; symbol: string; approximate?: boolean } | null = null;
  let matched = false;
  for (const log of receipt.logs) {
    const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
    if (same(log.address, c.router)) {
      try {
        const { args: a } = decodeEventLog({ abi: xTradedAbi, eventName:'XTraded', data:log.data, topics:log.topics });
        if (!same(a.trader,n.author) || !same(n.side === 0 ? a.xOut : a.xIn,n.x)) continue;
        if (same(a.xIn,c.imd)) leg={amount:a.spent,symbol:'IMD'};
        else if (same(a.xOut,c.imd)) leg={amount:a.received,symbol:'IMD'};
        else if (same(a.xIn,c.weth)) leg={amount:a.spent,symbol:'WETH'};
        else if (same(a.xOut,c.weth)) leg={amount:a.received,symbol:'WETH'};
      } catch { /* Other router event. */ }
    } else if (same(log.address,c.hook)) {
      try {
        const { args } = decodeEventLog({ abi:MarginaliaHookAbi, eventName:'NotePosted', data:log.data, topics:log.topics });
        if (same(args.id,n.id) && same(args.author,n.author)) { matched=true; break; }
        leg=null; // A preceding trade belongs to that preceding receipt, not this note.
      } catch { /* Other lifecycle event. */ }
    }
  }
  if (!matched || !leg) return null;
  if (leg.symbol === 'IMD') return leg;
  // Informational historical IMD equivalent only; never substituted into transaction or target math.
  const bridges=await Promise.allSettled(UNIV3_FEES.map(async fee=>{
    const pool=await pub.readContract({address:c.univ3Factory,abi:univ3FactoryAbi,functionName:'getPool',args:[c.weth,c.imd,fee],blockNumber:n.block});
    return pool===zeroAddress?null:readMarket(pub,cfg,c,c.weth,2,pool,c.poolKey,n.block);
  }));
  const usable=bridges.flatMap(r=>r.status==='fulfilled'&&r.value?[r.value]:[]).sort((a,b)=>a.quoteDepth>b.quoteDepth?-1:1);
  return usable.length ? {amount:leg.amount*usable[0].priceInQuote/10n**18n,symbol:'IMD',approximate:true} : leg;
}
