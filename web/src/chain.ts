// Chain access: a public read client over the configured public RPCs, the visitor's injected wallet for
// signing, and the resolved contract set (router / judge / treasury are read from the hook, never typed in).
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  fallback,
  http,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { MarginaliaHookAbi, MarginaliaRouterAbi } from './abi';
import { EXPECTED_UNIV2_FACTORY, EXPECTED_UNIV3_FACTORY, EXPECTED_WETH, type AppConfig } from './config';
import type { PoolKey } from './lib';

export interface Contracts {
  hook: Address;
  router: Address;
  judge: Address;
  treasury: Address;
  marg: Address;
  imd: Address;
  poolKey: PoolKey;
  poolId: Hex;
  univ3Factory: Address;
  univ2Factory: Address;
  weth: Address;
  /** True when the router's factory/WETH constants equal the canonical ones named in config. */
  venueFinderSafe: boolean;
  limits: {
    stamp: bigint;
    margBuy: bigint;
    bondMin: bigint;
    bondMax: bigint;
    sealMin: number;
    sealMax: number;
    settleWindow: number;
    thesisGrace: number;
    sweepAfter: number;
    textMax: number;
    thesisTextMax: number;
    minTargetDeltaBps: number;
    maxHorizonDays: number;
    keeperBps: number;
    judgeThreshold: bigint;
  };
}

export function makeChain(cfg: AppConfig): Chain {
  return {
    id: cfg.chainId,
    name: cfg.network.name,
    nativeCurrency: cfg.network.nativeCurrency,
    rpcUrls: { default: { http: cfg.rpcUrls } },
    blockExplorers: { default: { name: 'Explorer', url: cfg.explorer } },
  };
}

export function makePublicClient(cfg: AppConfig): PublicClient {
  const chain = makeChain(cfg);
  return createPublicClient({
    chain,
    transport: fallback(cfg.rpcUrls.map((u) => http(u, { batch: true, retryCount: 2 }))),
    batch: { multicall: false },
  });
}

/** Reads the hook's companions and constants once; everything the pages need to build a transaction. */
export async function loadContracts(pub: PublicClient, cfg: AppConfig): Promise<Contracts> {
  const hook = cfg.hook;
  const h = { address: hook, abi: MarginaliaHookAbi } as const;
  const [router, judge, treasury, imd, token, key, pid] = await Promise.all([
    pub.readContract({ ...h, functionName: 'router' }),
    pub.readContract({ ...h, functionName: 'judge' }),
    pub.readContract({ ...h, functionName: 'treasury' }),
    pub.readContract({ ...h, functionName: 'imd' }),
    pub.readContract({ ...h, functionName: 'token' }),
    pub.readContract({ ...h, functionName: 'getPoolKey' }),
    pub.readContract({ ...h, functionName: 'poolId' }),
  ]);
  if (imd.toLowerCase() !== cfg.imd.toLowerCase()) throw new Error('hook.imd() differs from network.pairToken');
  if (token.toLowerCase() !== cfg.marg.toLowerCase()) throw new Error('hook.token() differs from the Marginalia address');
  const r = { address: router, abi: MarginaliaRouterAbi } as const;
  const [v3f, v2f, weth] = await Promise.all([
    pub.readContract({ ...r, functionName: 'UNIV3_FACTORY' }),
    pub.readContract({ ...r, functionName: 'UNIV2_FACTORY' }),
    pub.readContract({ ...r, functionName: 'WETH' }),
  ]);
  const consts = await Promise.all(
    (
      [
        'STAMP', 'MARG_BUY', 'BOND_MIN', 'BOND_MAX', 'SEAL_MIN', 'SEAL_MAX', 'SETTLE_WINDOW', 'THESIS_GRACE', 'SWEEP_AFTER',
        'TEXT_MAX', 'THESIS_TEXT_MAX', 'MIN_TARGET_DELTA_BPS', 'MAX_HORIZON_DAYS', 'KEEPER_BPS', 'JUDGE_THRESHOLD',
      ] as const
    ).map((fn) => pub.readContract({ ...h, functionName: fn }) as Promise<bigint | number>),
  );
  const n = (v: bigint | number) => Number(v);
  const b = (v: bigint | number) => BigInt(v);
  return {
    hook,
    router,
    judge,
    treasury,
    marg: token,
    imd,
    poolKey: { currency0: key.currency0, currency1: key.currency1, fee: key.fee, tickSpacing: key.tickSpacing, hooks: key.hooks },
    poolId: pid,
    univ3Factory: v3f,
    univ2Factory: v2f,
    weth,
    venueFinderSafe:
      v3f.toLowerCase() === EXPECTED_UNIV3_FACTORY.toLowerCase() &&
      v2f.toLowerCase() === EXPECTED_UNIV2_FACTORY.toLowerCase() &&
      weth.toLowerCase() === EXPECTED_WETH.toLowerCase(),
    limits: {
      stamp: b(consts[0]), margBuy: b(consts[1]), bondMin: b(consts[2]), bondMax: b(consts[3]),
      sealMin: n(consts[4]), sealMax: n(consts[5]), settleWindow: n(consts[6]), thesisGrace: n(consts[7]), sweepAfter: n(consts[8]),
      textMax: n(consts[9]), thesisTextMax: n(consts[10]), minTargetDeltaBps: n(consts[11]), maxHorizonDays: n(consts[12]),
      keeperBps: n(consts[13]), judgeThreshold: b(consts[14]),
    },
  };
}

// ------------------------------------------------------------------ wallet

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, cb: (...a: never[]) => void) => void;
  removeListener?: (event: string, cb: (...a: never[]) => void) => void;
};
declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

export interface Wallet {
  available: boolean;
  account: Address | null;
  chainId: number | null;
  onChain: boolean;
  connecting: boolean;
  switching: boolean;
  error: string | null;
  connect: () => Promise<void>;
  switchChain: () => Promise<void>;
  client: WalletClient | null;
}

export function useWallet(cfg: AppConfig | null): Wallet {
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eth = typeof window !== 'undefined' ? window.ethereum : undefined;
  const available = !!eth;

  useEffect(() => {
    if (!eth) return;
    const onAccounts = (accs: string[]) => setAccount(accs?.[0] ? (accs[0] as Address) : null);
    const onChain = (id: string) => setChainId(Number(id));
    eth.on?.('accountsChanged', onAccounts as never);
    eth.on?.('chainChanged', onChain as never);
    // Silent reconnect if the site is already authorised.
    eth.request({ method: 'eth_accounts' }).then((a) => onAccounts(a as string[])).catch(() => undefined);
    eth.request({ method: 'eth_chainId' }).then((c) => onChain(c as string)).catch(() => undefined);
    return () => {
      eth.removeListener?.('accountsChanged', onAccounts as never);
      eth.removeListener?.('chainChanged', onChain as never);
    };
  }, [eth]);

  const client = useMemo(() => {
    if (!eth || !account || !cfg) return null;
    return createWalletClient({ account, chain: makeChain(cfg), transport: custom(eth) });
  }, [eth, account, cfg]);

  const connect = async () => {
    if (!eth) {
      setError('No browser wallet found. Install one (for example MetaMask or Rabby) and reload.');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accs = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
      setAccount(accs[0] ? (accs[0] as Address) : null);
      const c = (await eth.request({ method: 'eth_chainId' })) as string;
      setChainId(Number(c));
    } catch (e) {
      setError((e as Error).message || 'Could not connect.');
    } finally {
      setConnecting(false);
    }
  };

  const switchChain = async () => {
    if (!eth || !cfg) return;
    setSwitching(true);
    setError(null);
    const hexId = `0x${cfg.chainId.toString(16)}`;
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] });
    } catch (e) {
      const code = (e as { code?: number }).code;
      if ((code === 4902 || code === -32603 || /unrecognized|not added|unknown chain/i.test(String((e as Error).message))) && cfg.walletAddChain) {
        try {
          await eth.request({ method: 'wallet_addEthereumChain', params: [cfg.walletAddChain] });
          await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] });
        } catch (e2) {
          setError((e2 as Error).message || 'Could not add the chain.');
        }
      } else {
        setError((e as Error).message || 'Could not switch chain.');
      }
    } finally {
      setSwitching(false);
      try {
        const c = (await eth.request({ method: 'eth_chainId' })) as string;
        setChainId(Number(c));
      } catch {
        /* ignore */
      }
    }
  };

  return {
    available,
    account,
    chainId,
    onChain: !!cfg && chainId === cfg.chainId,
    connecting,
    switching,
    error,
    connect,
    switchChain,
    client,
  };
}

// ------------------------------------------------------------------ context

export interface AppCtx {
  cfg: AppConfig;
  pub: PublicClient;
  contracts: Contracts;
  wallet: Wallet;
  now: number;
}
export const Ctx = createContext<AppCtx | null>(null);
export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('App context missing');
  return c;
}

/** A clock that ticks once a second, for countdowns. */
export function useNow(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** Generic async read with refresh; `deps` re-run it, `key` of null skips. */
export function useRead<T>(fn: (() => Promise<T>) | null, deps: unknown[]): { data: T | undefined; error: string | null; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!fn) return;
    let live = true;
    setLoading(true);
    fn()
      .then((d) => {
        if (live) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => live && setError((e as Error).message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, loading, refresh: () => setTick((t) => t + 1) };
}
