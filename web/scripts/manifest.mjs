// Writes dist/imd-deployment.json from the deployment handoff and the network file, after `vite build`.
// Usage: node scripts/manifest.mjs [deployment.json] [network.json]   (defaults: web/deployment/mainnet.json and network.json)
// Copies the full ABIs into dist/abi/, checks each canonical keccak against the handoff abiHash, and lists
// every exported file with its SHA-256. Re-run after any change to dist/.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { keccak256, toBytes } from 'viem';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const dist = path.join(root, 'dist');
const deploymentPath = process.argv[2] ?? path.join(root, 'web', 'deployment', 'mainnet.json');
const networkPath = process.argv[3] ?? path.join(root, 'web', 'deployment', 'network.json');

const canon = (v) =>
  v === null ? 'null' : Array.isArray(v) ? `[${v.map(canon).join(',')}]` : typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v);
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const handoff = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
const integrations = JSON.parse(fs.readFileSync(path.join(root, 'web', 'deployment', 'integrations.json'), 'utf8'));
const net = fs.existsSync(networkPath) ? JSON.parse(fs.readFileSync(networkPath, 'utf8')) : null;
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html missing: run vite build first');

// Two static entrypoints share one compiled tree and one runtime deployment file.
// The app host serves app/index.html as /, with the shared dist assets at its root.
fs.mkdirSync(path.join(dist, 'app'), { recursive: true });
const landingHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
fs.writeFileSync(path.join(dist, 'app/index.html'), landingHtml
  .replace('data-surface="landing"', 'data-surface="app"')
  .replaceAll('"./assets/', '"../assets/')
  .replace(/<title>.*?<\/title>/, '<title>Marginalia · Feed</title>'));

// Agent documents are exact repository bytes, included in the final asset inventory.
for (const [source, target] of [['llms.txt', 'llms.txt'], ['AGENTS.md', 'agents.md']]) {
  fs.copyFileSync(path.join(root, source), path.join(dist, target));
}
// The served agent interface links to the same durable continuation memory.
fs.mkdirSync(path.join(dist, 'docs'), { recursive: true });
for (const name of ['loop.md', 'STATUS.md', 'CHANGELOG.md']) {
  fs.copyFileSync(path.join(root, 'docs', name), path.join(dist, 'docs', name));
}

// ABIs: the app ships every contract it talks to; the manifest binds the handoff's contracts to theirs.
fs.mkdirSync(path.join(dist, 'abi'), { recursive: true });
for (const name of [...new Set(['Marginalia', 'MarginaliaHook', 'MarginaliaRouter', 'MarginaliaJudge', 'MarginaliaAnnex', 'MarginaliaPages', 'MarginaliaTreasury', 'MarginaliaPricer', ...integrations.contracts.map(c => c.name)])]) {
  const src = path.join(here, '..', 'public', 'abi', `${name}.json`);
  fs.copyFileSync(src, path.join(dist, 'abi', `${name}.json`));
}
const contracts = [...handoff.contracts,...integrations.contracts].map((c) => {
  const abiPath = `abi/${c.name}.json`;
  const abi = JSON.parse(fs.readFileSync(path.join(dist, abiPath), 'utf8'));
  const got = keccak256(toBytes(canon(abi))).slice(2);
  if (got !== c.abiHash) throw new Error(`${c.name}: abi hash ${got} != handoff ${c.abiHash}`);
  return { name: c.name, address: c.address, abiHash: c.abiHash, abiPath };
});

const walk = (dir, rel = '') =>
  fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const r = rel ? `${rel}/${e.name}` : e.name;
    return e.isDirectory() ? walk(dir, r) : [r];
  });
const assets = walk(dist)
  .filter((p) => p !== 'imd-deployment.json')
  .sort()
  .map((p) => ({ path: p, sha256: sha256(fs.readFileSync(path.join(dist, p))) }));
if (assets.length > 128) throw new Error(`${assets.length} assets exceed the 128 limit`);
for (const a of assets) {
  const size = fs.statSync(path.join(dist, a.path)).size;
  if (size > 8 * 1024 * 1024) throw new Error(`${a.path} exceeds 8 MiB`);
}

const manifest = {
  version: 1,
  launchId: handoff.launchId,
  chainId: handoff.chainId,
  sourceCommit: handoff.sourceCommit,
  attestationHash: handoff.attestationHash,
  contracts,
  assets,
};
if (handoff.poolKey) {
  const k = handoff.poolKey;
  manifest.poolKey = { currency0: k.currency0, currency1: k.currency1, fee: k.fee, tickSpacing: k.tickSpacing, hooks: k.hooks };
}
if (net) {
  manifest.network = net.network;
  if (net.walletAddChain) manifest.walletAddChain = net.walletAddChain;
}
fs.writeFileSync(path.join(dist, 'imd-deployment.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote dist/imd-deployment.json: ${contracts.length} contracts, ${assets.length} assets, network=${!!net}`);
