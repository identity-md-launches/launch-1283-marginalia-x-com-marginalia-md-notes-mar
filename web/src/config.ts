// One place for chain, addresses, RPCs and ABIs.
//
// Deployment addresses, the chain id, the network block (public RPC URLs, explorer, Uniswap v4 addresses)
// and the ABI paths come from `imd-deployment.json`, which the publisher checks against the deployment
// handoff and which the app fetches at runtime (`loadDeployment`). Nothing below duplicates an address
// that lives in that file. The constants here are the few things the handoff does not carry: the deploy
// block to scan logs from, the canonical Uniswap v2/v3 factories and WETH the venue finder uses (also
// exposed by the router as UNIV3_FACTORY / UNIV2_FACTORY / WETH and cross-checked at runtime), and links.
// No private credentials: every RPC URL is public.

import { keccak256, toBytes, type Address, type Hex } from 'viem';
import type { PoolKey } from './lib';

export const CHAIN_ID = 1 as const;

/** Block the launch was deployed in (deployment.json blockNumber); NotePosted logs are scanned from here. */
export const DEPLOY_BLOCK = 26169583n;
export const ANNEX_DEPLOY_BLOCK = 26178192n;
// Named by the SITE v3 brief; used only for informational dollars.
export const USDC: Address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
/** Public nodes limit eth_getLogs ranges; this chunk size is served by the configured public RPCs. */
export const LOG_CHUNK = 2000n;
/** Read the recent tail first, then continue historical coverage in a separate bounded batch. */
export const LOG_TAIL = 8000n;
export const LOG_HISTORY_CHUNKS = 4;
export const LOG_REORG_OVERLAP = 64n;

/** Canonical Uniswap factories and WETH on Ethereum mainnet, as named by the brief. The router exposes the
 * same three constants; `useContracts` reads them and the venue finder refuses to run if they disagree. */
export const EXPECTED_UNIV3_FACTORY: Address = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
export const EXPECTED_UNIV2_FACTORY: Address = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
export const EXPECTED_WETH: Address = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
export const UNIV3_FEES = [100, 500, 3000, 10000] as const;

export const LINKS = {
  x: 'https://x.com/marginalia_md',
  radar: 'https://imdradar.site',
  launch: 'https://explorer.imd.fun/jobs/9060a248-29ce-4683-b5d1-54fbc83cd49d',
};

export interface DeploymentContract {
  name: string;
  address: Address;
  abiHash: string;
  abiPath: string;
}
export interface NetworkBlock {
  chainId: number;
  name: string;
  testnet: boolean;
  rpcUrls: string[];
  explorer: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  faucets: string[];
  uniswapV4: {
    poolManager: Address;
    universalRouter: Address;
    quoter: Address;
    stateView: Address;
    positionManager: Address;
    permit2: Address;
  };
  pairToken: { address: Address; symbol: string; name: string; decimals: number };
  otherPairTokens?: { id: string; address: Address; symbol: string; name: string; decimals: number }[];
}
export interface WalletAddChain {
  chainId: Hex;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorerUrls: string[];
}
export interface Deployment {
  version: 1;
  launchId: string;
  chainId: number;
  sourceCommit: string;
  attestationHash: string;
  contracts: DeploymentContract[];
  assets: { path: string; sha256: string }[];
  network: NetworkBlock;
  walletAddChain?: WalletAddChain;
  poolKey?: PoolKey;
}

/** Resolved runtime configuration: the handoff plus the two addresses the app needs by role. */
export interface AppConfig {
  deployment: Deployment;
  chainId: number;
  hook: Address;
  marg: Address;
  imd: Address;
  annex?: Address;
  pages?: Address;
  rpcUrls: string[];
  explorer: string;
  network: NetworkBlock;
  walletAddChain?: WalletAddChain;
}

let cached: Promise<AppConfig> | null = null;

/** Fetches `imd-deployment.json` next to index.html (relative, so it works under a gateway subpath). */
export function loadDeployment(): Promise<AppConfig> {
  if (!cached) {
    cached = (async () => {
      const res = await fetch(new URL('imd-deployment.json', document.baseURI).toString(), { cache: 'no-cache' });
      if (!res.ok) throw new Error(`imd-deployment.json: HTTP ${res.status}`);
      const d = (await res.json()) as Deployment;
      const hook = d.contracts.find((c) => c.name === 'MarginaliaHook');
      const marg = d.contracts.find((c) => c.name === 'Marginalia');
      if (!hook || !marg) throw new Error('imd-deployment.json lacks MarginaliaHook or Marginalia');
      if (d.chainId !== CHAIN_ID || d.network.chainId !== CHAIN_ID) throw new Error(`unexpected chain ${d.chainId}`);
      const canonical = (v: unknown): string => v === null ? 'null' : Array.isArray(v) ? `[${v.map(canonical).join(',')}]` : typeof v === 'object' ? `{${Object.keys(v!).sort().map(k => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}` : JSON.stringify(v);
      await Promise.all(d.contracts.map(async contract => {
        if (!/^abi\/[A-Za-z0-9_-]+\.json$/.test(contract.abiPath)) throw new Error('Invalid deployment ABI path.');
        const response = await fetch(new URL(contract.abiPath, document.baseURI));
        if (!response.ok) throw new Error(`Could not load ${contract.name} ABI.`);
        const abi: unknown = await response.json();
        if (!Array.isArray(abi) || keccak256(toBytes(canonical(abi))).slice(2) !== contract.abiHash) throw new Error(`${contract.name} ABI does not match the deployment.`);
      }));
      return {
        deployment: d,
        chainId: d.chainId,
        hook: hook.address,
        annex: d.contracts.find(c => c.name === 'MarginaliaAnnex' || c.name === 'annex')?.address,
        pages: d.contracts.find(c => c.name === 'MarginaliaPages' || c.name === 'pages')?.address,
        marg: marg.address,
        imd: d.network.pairToken.address,
        rpcUrls: d.network.rpcUrls,
        explorer: d.network.explorer,
        network: d.network,
        walletAddChain: d.walletAddChain,
      };
    })();
  }
  return cached;
}
