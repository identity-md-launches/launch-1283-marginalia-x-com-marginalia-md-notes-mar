// Client-side Uniswap state quotes. All reads in a quote use one block; no quote service.
import { encodeAbiParameters, keccak256, zeroAddress, zeroHash, type Address, type PublicClient } from 'viem';
import { erc20Abi, univ2FactoryAbi, univ2PairAbi, univ3FactoryAbi, MarginaliaRouterAbi } from './abi';
import { AnnexAbi } from './annex-abi';
import { PricerQuoteAbi } from './pricer-abi';
import { initEvent, v3StateAbi, v4StateAbi } from './market-abi';
import { DEPLOY_BLOCK, UNIV3_FEES, type AppConfig } from './config';
import type { Contracts } from './chain';
import { addressRef, type NoteParams, type PoolKey, type Venue } from './lib';
export const Q96 = 1n << 96n;
export const keyType = { type: 'tuple', components: [{ name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' }, { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' }] } as const;
export const poolIdOf = (key: PoolKey) => keccak256(encodeAbiParameters([keyType], [key]));
export const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export interface Market {
  id: string; kind: number; pool: Address; key: PoolKey; venue: Venue;
  fee: number; liquidity: bigint; quoteDepth: bigint; priceInQuote: bigint; depthImd?: bigint;
}
export function publicParams(x: Address, venue: Venue): NoteParams {
  return { x, venue, side: 0, targetBps: 11000, horizonDays: 1, parentId: zeroHash, class: 1, text: '' };
}
export async function readMarket(pub: PublicClient, cfg: AppConfig, c: Contracts, x: Address, kind: number, pool: Address, key: PoolKey, blockNumber?: bigint): Promise<Market> {
  let t0: Address, t1: Address, fee: number, liquidity: bigint, quoteDepth: bigint, priceInQuote: bigint;
  if (kind === 3) {
    const [a, b, rs] = await Promise.all([
      pub.readContract({ address: pool, abi: univ2PairAbi, functionName: 'token0', blockNumber }),
      pub.readContract({ address: pool, abi: univ2PairAbi, functionName: 'token1', blockNumber }),
      pub.readContract({ address: pool, abi: univ2PairAbi, functionName: 'getReserves', blockNumber }),
    ]);
    t0 = a; t1 = b; fee = 3000; liquidity = rs[0] < rs[1] ? rs[0] : rs[1]; quoteDepth = eq(x, t0) ? rs[1] : rs[0];
    priceInQuote = quoteDepth * 10n**18n / ((eq(x,t0)?rs[0]:rs[1]) || 1n);
  } else {
    let sqrt: bigint;
    if (kind === 2) {
      const state = { address: pool, abi: v3StateAbi, blockNumber } as const;
      const [a, b, f, l, slot] = await Promise.all([
        pub.readContract({ ...state, functionName: 'token0' }), pub.readContract({ ...state, functionName: 'token1' }),
        pub.readContract({ ...state, functionName: 'fee' }), pub.readContract({ ...state, functionName: 'liquidity' }), pub.readContract({ ...state, functionName: 'slot0' }),
      ]);
      t0 = a; t1 = b; fee = f; liquidity = l; sqrt = slot[0];
    } else {
      t0 = key.currency0; t1 = key.currency1; fee = key.fee;
      const id = poolIdOf(key);
      const [l, slot] = await Promise.all([
        pub.readContract({ address: cfg.network.uniswapV4.stateView, abi: v4StateAbi, functionName: 'getLiquidity', args: [id], blockNumber }),
        pub.readContract({ address: cfg.network.uniswapV4.stateView, abi: v4StateAbi, functionName: 'getSlot0', args: [id], blockNumber }),
      ]);
      liquidity = l; sqrt = slot[0];
    }
    if (!sqrt) throw new Error('Pool has no standing price.');
    quoteDepth = eq(x, t0) ? liquidity * sqrt / Q96 : liquidity * Q96 / sqrt;
    priceInQuote = eq(x,t0) ? sqrt*sqrt*10n**18n/(Q96*Q96) : Q96*Q96*10n**18n/(sqrt*sqrt);
  }
  if (!eq(x, t0) && !eq(x, t1)) throw new Error('Pool does not contain the selected token.');
  const quote = eq(x, t0) ? t1 : t0;
  if (!liquidity || !quoteDepth || ![c.imd, c.weth, zeroAddress].some(a => eq(a, quote))) throw new Error('No valid quote liquidity.');
  const venue: Venue = { kind, ref: kind === 1 ? poolIdOf(key) : addressRef(pool), quote, xIsToken0: eq(x, t0) };
  return { id: `${kind}:${venue.ref}`, kind, pool, key, venue, fee, liquidity, quoteDepth, priceInQuote, depthImd: eq(quote, c.imd) ? quoteDepth : undefined };
}
export async function discoverMarkets(pub: PublicClient, cfg: AppConfig, c: Contracts, x: Address, annex = false, extraKey?: PoolKey) {
  if (!c.venueFinderSafe) throw new Error('The router venue constants differ from the verified configuration.');
  if (eq(x, c.imd) || eq(x, zeroAddress)) throw new Error('Choose a token other than IMD or native ETH.');
  const [symbol, decimals, block] = await Promise.all([
    pub.readContract({ address: x, abi: erc20Abi, functionName: 'symbol' }),
    pub.readContract({ address: x, abi: erc20Abi, functionName: 'decimals' }), pub.getBlockNumber(),
  ]);
  const found: Market[] = []; let failed = 0;
  const validate = async (m: Market) => {
    const p = publicParams(x, m.venue);
    const venue = annex
      ? await pub.readContract({ address: c.annex!, abi: AnnexAbi, functionName: 'validateVenue', args: [p, m.key], blockNumber: block })
      : await pub.readContract({ address: c.router, abi: MarginaliaRouterAbi, functionName: 'validateVenue', args: [p, m.key], blockNumber: block });
    if (!found.some(a => a.id === m.id)) found.push({ ...m, venue });
  };
  if (!annex) {
    for (const q of [c.imd, c.weth].filter(q => !eq(q, x))) {
      const candidates = await Promise.allSettled(UNIV3_FEES.map(async fee => {
        const pool = await pub.readContract({ address: c.univ3Factory, abi: univ3FactoryAbi, functionName: 'getPool', args: [x, q, fee], blockNumber: block });
        if (pool !== zeroAddress) await validate(await readMarket(pub, cfg, c, x, 2, pool, c.poolKey, block));
      }));
      failed += candidates.filter(r => r.status === 'rejected').length;
      try {
        const pool = await pub.readContract({ address: c.univ2Factory, abi: univ2FactoryAbi, functionName: 'getPair', args: [x, q], blockNumber: block });
        if (pool !== zeroAddress) await validate(await readMarket(pub, cfg, c, x, 3, pool, c.poolKey, block));
      } catch { failed++; }
    }
  }
  const keys: PoolKey[] = extraKey ? [extraKey] : [];
  if (eq(x, c.marg)) keys.push(c.poolKey);
  const from = block > DEPLOY_BLOCK + 16000n ? block - 16000n + 1n : DEPLOY_BLOCK;
  // Initialize events are authenticated by the configured PoolManager, with bounded ranges.
  for (let a = from; a <= block; a += 2000n) {
    const end = a + 1999n < block ? a + 1999n : block;
    const results = await Promise.allSettled([true, false].map(currency0 => pub.getLogs({ address: cfg.network.uniswapV4.poolManager, event: initEvent, args: currency0 ? { currency0: x } : { currency1: x }, fromBlock: a, toBlock: end, strict: true })));
    for (const r of results) {
      if (r.status === 'rejected') { failed++; continue; }
      for (const l of r.value) keys.push({ currency0: l.args.currency0, currency1: l.args.currency1, fee: l.args.fee, tickSpacing: l.args.tickSpacing, hooks: l.args.hooks });
    }
  }
  for (const key of keys) {
    if (!annex && key.hooks !== zeroAddress && !eq(key.hooks, c.hook)) continue;
    try { await validate(await readMarket(pub, cfg, c, x, 1, zeroAddress, key, block)); } catch { failed++; }
  }
  // Normalize WETH depth using the deepest active canonical WETH/IMD v3 pool.
  let bridge: { depth: bigint; price: bigint } | undefined;
  const bridges = await Promise.allSettled(UNIV3_FEES.map(async fee => {
    const pool = await pub.readContract({ address: c.univ3Factory, abi: univ3FactoryAbi, functionName: 'getPool', args: [c.weth, c.imd, fee], blockNumber: block });
    if (pool === zeroAddress) return;
    const m = await readMarket(pub, cfg, c, c.weth, 2, pool, c.poolKey, block);
    const [sqrt] = await pub.readContract({ address: pool, abi: v3StateAbi, functionName: 'slot0', blockNumber: block });
    return { depth: m.quoteDepth, price: m.venue.xIsToken0 ? sqrt * sqrt * 10n ** 18n / Q96 ** 2n : Q96 ** 2n * 10n ** 18n / (sqrt * sqrt) };
  }));
  for (const r of bridges) if (r.status === 'fulfilled' && r.value && (!bridge || r.value.depth > bridge.depth)) bridge = r.value;
  const wethMarket = found.find(m=>!eq(m.venue.quote,c.imd));
  if (!bridge && wethMarket && c.pricer) {
    try { const [,price] = await pub.readContract({address:c.pricer,abi:PricerQuoteAbi,functionName:'observe',args:[cfg.network.uniswapV4.poolManager,wethMarket.venue,c.imd],blockNumber:block}); if(price>0n)bridge={depth:0n,price}; } catch { /* If unavailable, keep the comparison explicitly partial. */ }
  }
  for (const m of found) if (m.depthImd === undefined && bridge) m.depthImd = m.quoteDepth * bridge.price / 10n ** 18n;
  found.sort((a, b) => (b.depthImd ?? 0n) > (a.depthImd ?? 0n) ? 1 : (b.depthImd ?? 0n) < (a.depthImd ?? 0n) ? -1 : b.quoteDepth > a.quoteDepth ? 1 : -1);
  return { symbol, decimals, markets: found, failed, from, block, wethImd: bridge?.price };
}
const ceil = (a: bigint, b: bigint) => (a + b - 1n) / b;
export function quoteV2(input: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  return input * 997n * reserveOut / (reserveIn * 1000n + input * 997n);
}
const tickFactors = [
  'fffcb933bd6fad37aa2d162d1a594001','fff97272373d413259a46990580e213a','fff2e50f5f656932ef12357cf3c7fdcc','ffe5caca7e10e4e61c3624eaa0941cd0','ffcb9843d60f6159c9db58835c926644','ff973b41fa98c081472e6896dfb254c0','ff2ea16466c96a3843ec78b326b52861','fe5dee046a99a2a811c461f1969c3053','fcbe86c7900a88aedcffc83b479aa3a4','f987a7253ac413176f2b074cf7815e54','f3392b0822b70005940c7a398e4b70f3','e7159475a2c29b7443b29c7fa6e889d9','d097f3bdfd2022b8845ad8f792aa5825','a9f746462d870fdf8a65dc1f90e061e5','70d869a156d2a1b890bb3df62baf32f7','31be135f97d08fd981231505542fcfa6','9aa508b5b7a84e1c677de54f3e99bc9','5d6af8dedb81196699c329225ee604','2216e584f5fa1ea926041bedfe98','48a170391f7dc42444e8fa2',
].map(h => BigInt(`0x${h}`));
// TickMath Q64.96, matching the project's Uniswap core library (MIT).
export function sqrtAtTick(tick: number): bigint {
  if (Math.abs(tick) > 887272) throw new Error('Tick out of range.');
  let ratio = 1n << 128n;
  for (let i = 0; i < 20; i++) if ((Math.abs(tick) & (1 << i)) !== 0) ratio = ratio * tickFactors[i] >> 128n;
  if (tick > 0) ratio = ((1n << 256n) - 1n) / ratio;
  return ceil(ratio, 1n << 32n);
}
export async function quoteMarket(pub: PublicClient, cfg: AppConfig, c: Contracts, m: Market, input: Address, amount: bigint) {
  if (amount <= 0n) throw new Error('Enter an amount above zero.');
  const blockNumber = await pub.getBlockNumber({ cacheTime: 0 });
  const zeroForOne = m.venue.xIsToken0 === !eq(input, m.venue.quote);
  if (m.kind === 3) {
    const [r0, r1] = await pub.readContract({ address: m.pool, abi: univ2PairAbi, functionName: 'getReserves', blockNumber });
    return { output: quoteV2(amount, zeroForOne ? r0 : r1, zeroForOne ? r1 : r0), blockNumber };
  }
  const v4 = m.kind === 1, id = m.venue.ref;
  const state = { address: cfg.network.uniswapV4.stateView, abi: v4StateAbi, blockNumber } as const;
  const v3 = { address: m.pool, abi: v3StateAbi, blockNumber } as const;
  let [sqrt, tick] = v4 ? await pub.readContract({ ...state, functionName: 'getSlot0', args: [id] }) : await pub.readContract({ ...v3, functionName: 'slot0' });
  let liquidity = v4 ? await pub.readContract({ ...state, functionName: 'getLiquidity', args: [id] }) : await pub.readContract({ ...v3, functionName: 'liquidity' });
  const spacing = v4 ? m.key.tickSpacing : await pub.readContract({ ...v3, functionName: 'tickSpacing' });
  let fee = m.fee;
  if (v4) {
    const slot = await pub.readContract({ ...state, functionName: 'getSlot0', args: [id] });
    const protocol = zeroForOne ? slot[2] & 4095 : slot[2] >> 12;
    fee = protocol + slot[3] - Math.floor(protocol * slot[3] / 1e6);
  }
  if (fee >= 1000000) throw new Error('This pool cannot quote an exact-input trade.');
  let remaining = amount, output = 0n;
  for (let step = 0; remaining > 0n && step < 64; step++) {
    // Walk a bitmap word at a time, including empty words, exactly as core does.
    const compressed = Math.floor(tick / spacing) + (zeroForOne ? 0 : 1);
    const word = Math.floor(compressed / 256), bit = ((compressed % 256) + 256) % 256;
    const bitmap = v4 ? await pub.readContract({ ...state, functionName: 'getTickBitmap', args: [id, word] }) : await pub.readContract({ ...v3, functionName: 'tickBitmap', args: [word] });
    let nextBit = zeroForOne ? 0 : 255, initialized = false;
    for (let b = bit; b >= 0 && b <= 255; b += zeroForOne ? -1 : 1) if ((bitmap & (1n << BigInt(b))) !== 0n) { nextBit = b; initialized = true; break; }
    const nextTick = Math.max(-887272, Math.min(887272, (word * 256 + nextBit) * spacing));
    const boundary = sqrtAtTick(nextTick);
    const net = remaining * BigInt(1000000 - fee) / 1000000n;
    const needed = liquidity === 0n ? 0n : zeroForOne ? ceil(liquidity * Q96 * (sqrt - boundary), sqrt * boundary) : ceil(liquidity * (boundary - sqrt), Q96);
    const reaches = net >= needed;
    const next = reaches ? boundary : zeroForOne ? ceil(liquidity * Q96 * sqrt, liquidity * Q96 + net * sqrt) : sqrt + net * Q96 / liquidity;
    output += zeroForOne ? liquidity * (sqrt - next) / Q96 : liquidity * Q96 * (next - sqrt) / (next * sqrt);
    if (!reaches) remaining = 0n;
    else {
      remaining -= needed + ceil(needed * BigInt(fee), BigInt(1000000 - fee));
      if (initialized) {
        const info = v4 ? await pub.readContract({ ...state, functionName: 'getTickLiquidity', args: [id, nextTick] }) : await pub.readContract({ ...v3, functionName: 'ticks', args: [nextTick] });
        liquidity += zeroForOne ? -info[1] : info[1];
      }
      tick = zeroForOne ? nextTick - 1 : nextTick;
    }
    sqrt = next;
    if (nextTick === -887272 || nextTick === 887272) { if (remaining) throw new Error('Not enough pool liquidity for this amount.'); }
  }
  if (remaining > 0n) throw new Error('Quote crosses too many ticks. Reduce the amount.');
  // The X leg carries no note hookData: a MARG sell pays the quiet 3% fee.
  if (v4 && eq(m.key.hooks, c.hook) && eq(input, c.marg)) output -= output * 300n / 10000n;
  if (!output) throw new Error('Output rounds to zero.');
  return { output, blockNumber };
}
export function approvalPlan(input: Address, imd: Address, amount: bigint, imdIn: bigint) {
  // When IMD funds both legs, one exact combined approval is essential: the router pulls it twice.
  return eq(input, imd) ? [{ token: imd, amount: amount + imdIn }] : [{ token: input, amount }, { token: imd, amount: imdIn }];
}
export function baselineBound(price: bigint, side: number) { return side === 0 ? ceil(price * 103n, 100n) : price * 97n / 100n; }
