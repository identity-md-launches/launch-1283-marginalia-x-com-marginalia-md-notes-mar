import { createPublicClient, fallback, http, keccak256, toBytes } from 'viem';

const canonical = value => value === null ? 'null' : Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const hex = bytes => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');

async function asset(env, request, path) {
  if (!env.ASSETS) throw new Error('An asset binding is required for on-chain badge checks.');
  const response = await env.ASSETS.fetch(new Request(new URL(`/${path}`, request.url)));
  if (!response.ok) throw new Error('Deployment asset unavailable.');
  return response;
}

/** records().posted is incremented in the same successful path as NotePosted, and
 * never decremented. This reads the complete on-chain record, without a partial log scan. */
export async function notedAuthors(env, request, addresses) {
  const noted = new Set();
  const missing = [];
  for (const address of new Set(addresses)) {
    if (await env.FEEDBACK.get(`noted:${address}`) === 'true') noted.add(address);
    else missing.push(address);
  }
  if (!missing.length) return noted;
  try {
    const manifest = await (await asset(env, request, 'imd-deployment.json')).json();
    const pub = createPublicClient({ ccipRead: false, transport: fallback(manifest.network.rpcUrls.map(url => http(url, { timeout: 4000, retryCount: 0 })), { retryCount: 0 }) });
    if (await pub.getChainId() !== manifest.chainId) throw new Error('Wrong RPC chain.');
    const hook = manifest.contracts.find(contract => contract.name === 'MarginaliaHook');
    const contracts = await Promise.all(manifest.contracts.filter(contract => ['MarginaliaHook', 'MarginaliaAnnex'].includes(contract.name)).map(async contract => {
      if (!/^[a-zA-Z0-9_./-]+$/.test(contract.abiPath) || contract.abiPath.includes('..') || contract.abiPath.startsWith('/')) throw new Error('Invalid ABI path.');
      const bytes = await (await asset(env, request, contract.abiPath)).arrayBuffer();
      const abi = JSON.parse(new TextDecoder().decode(bytes));
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      if (hex(hash) !== manifest.assets.find(item => item.path === contract.abiPath)?.sha256 || keccak256(toBytes(canonical(abi))).slice(2) !== contract.abiHash) throw new Error('ABI integrity check failed.');
      const code = await pub.getCode({ address: contract.address });
      if (!code || code === '0x') throw new Error('Missing contract code.');
      if (contract.name === 'MarginaliaAnnex' && (await pub.readContract({ address: contract.address, abi, functionName: 'hook' })).toLowerCase() !== hook?.address.toLowerCase()) throw new Error('Annex binding mismatch.');
      return { address: contract.address, abi };
    }));
    const blockNumber = await pub.getBlockNumber();
    // Bounded RPC concurrency, with no submitted handle used as identity.
    for (let i = 0; i < missing.length; i += 6) {
      await Promise.all(missing.slice(i, i + 6).map(async address => {
        const records = await Promise.allSettled(contracts.map(contract => pub.readContract({ ...contract, functionName: 'records', args: [address], blockNumber })));
        if (records.some(record => record.status === 'fulfilled' && BigInt(record.value[1]) > 0n)) {
          noted.add(address);
          await env.FEEDBACK.put(`noted:${address}`, 'true', { expirationTtl: 3600 });
        }
      }));
    }
  } catch {
    // Fail closed: never invent a badge on an unavailable/unverified chain read.
    // Absence of a badge is explicitly not a claim that this wallet never posted.
  }
  return noted;
}
