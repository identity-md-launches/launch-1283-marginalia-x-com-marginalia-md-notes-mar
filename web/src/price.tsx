import { createContext, useContext, type ReactNode } from 'react';
import { zeroAddress } from 'viem';
import { useApp, useRead } from './chain';
import { univ3FactoryAbi } from './abi';
import { v3StateAbi } from './market-abi';
import { UNIV3_FEES, USDC } from './config';
import { eq, Q96 } from './market';
const PriceContext = createContext<{ usd?: number; pool?: string; at?: number }>({});
export function DollarProvider({ children }: { children: ReactNode }) {
  const { pub, contracts: c, now } = useApp();
  const read = useRead(async () => {
    const blockNumber = await pub.getBlockNumber();
    const pools = await Promise.allSettled(UNIV3_FEES.map(async fee => {
      const pool = await pub.readContract({ address: c.univ3Factory, abi: univ3FactoryAbi, functionName: 'getPool', args: [c.imd, USDC, fee], blockNumber });
      if (pool === zeroAddress) return null;
      const [slot, t0, liquidity] = await Promise.all([
        pub.readContract({ address: pool, abi: v3StateAbi, functionName: 'slot0', blockNumber }),
        pub.readContract({ address: pool, abi: v3StateAbi, functionName: 'token0', blockNumber }),
        pub.readContract({ address: pool, abi: v3StateAbi, functionName: 'liquidity', blockNumber }),
      ]);
      if (!liquidity || !slot[0]) return null;
      const s = Number(slot[0]) / Number(Q96);
      // IMD 18 decimals, USDC 6. Spot USDC reference, never a settlement input.
      const usd = (eq(t0, c.imd) ? s * s : 1 / (s * s)) * 1e12;
      const depth = eq(t0, c.imd) ? liquidity * slot[0] / Q96 : liquidity * Q96 / slot[0];
      return Number.isFinite(usd) && usd > 0 ? { usd, depth, pool, at: Date.now() } : null;
    }));
    const valid = pools.flatMap(p => p.status === 'fulfilled' && p.value ? [p.value] : []).sort((a,b) => a.depth > b.depth ? -1 : 1);
    return valid[0] ?? {};
  }, [c.imd, Math.floor(now / 60)], [c.imd]);
  return <PriceContext.Provider value={read.error ? {} : read.data ?? {}}>{children}</PriceContext.Provider>;
}
export function useDollar() { return useContext(PriceContext); }
export function UsdContext({ imd }: { imd?: bigint | null }) {
  const price = useDollar();
  if (!price.usd || !price.at || Date.now() - price.at > 120000 || imd == null) return <span className="small usd">USD unavailable</span>;
  const usd = Number(imd) / 1e18 * price.usd;
  if (!Number.isFinite(usd)) return <span className="small usd">USD unavailable</span>;
  return <span className="small usd" title="Informational, from the IMD/USDC pool. USDC is treated as a dollar reference; it can depeg. Never used to settle.">≈{usd > 0 && usd < 0.01 ? '$<0.01' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(usd)}</span>;
}
export function DollarSource() {
  const { cfg } = useApp(); const price = useDollar();
  return <p className="small">{price.pool ? <>Dollars: informational, from the <a href={`${cfg.explorer}/address/${price.pool}`} target="_blank" rel="noreferrer">IMD/USDC pool</a>. USDC can depeg; never used to settle.</> : 'Dollar reference unavailable. Token amounts remain authoritative.'}</p>;
}
