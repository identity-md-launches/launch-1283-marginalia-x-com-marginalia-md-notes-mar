// Checks dist/imd-deployment.json the way the publisher does: structure, hashes, ABI binding, no stray keys,
// no address or URL outside the handoff and the network block, and that no bundle loads remote code.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { keccak256, toBytes } from 'viem';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const dist = path.join(root, 'dist');
const deploymentPath = process.argv[2] ?? path.join(root, '.imd', 'reads', 'deployment.json');
const networkPath = process.argv[3] ?? path.join(root, '.imd', 'reads', 'network.json');
const canon = (v) =>
  v === null ? 'null' : Array.isArray(v) ? `[${v.map(canon).join(',')}]` : typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v);
const fail = (m) => {
  console.error('FAIL', m);
  process.exitCode = 1;
};

const m = JSON.parse(fs.readFileSync(path.join(dist, 'imd-deployment.json'), 'utf8'));
const handoff = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
const net = fs.existsSync(networkPath) ? JSON.parse(fs.readFileSync(networkPath, 'utf8')) : null;

const allowed = new Set(['version', 'launchId', 'chainId', 'sourceCommit', 'attestationHash', 'contracts', 'assets', 'network', 'walletAddChain', 'poolKey']);
for (const k of Object.keys(m)) if (!allowed.has(k)) fail(`extra top-level key ${k}`);
if (m.version !== 1) fail('version');
for (const k of ['launchId', 'chainId', 'sourceCommit', 'attestationHash']) if (m[k] !== handoff[k]) fail(`${k} differs from handoff`);
if (m.contracts.length !== handoff.contracts.length) fail('contract count');
for (const c of handoff.contracts) {
  const mc = m.contracts.find((x) => x.name === c.name);
  if (!mc) fail(`missing contract ${c.name}`);
  else {
    if (mc.address !== c.address || mc.abiHash !== c.abiHash) fail(`${c.name} address/abiHash differ`);
    if (!/^[0-9a-f]{64}$/.test(mc.abiHash)) fail(`${c.name} abiHash format`);
    if (/^(https?:)?\/\//.test(mc.abiPath) || mc.abiPath.includes('..')) fail(`${c.name} abiPath`);
    const abi = JSON.parse(fs.readFileSync(path.join(dist, mc.abiPath), 'utf8'));
    if (!Array.isArray(abi)) fail(`${mc.abiPath} is not a raw ABI array`);
    if (keccak256(toBytes(canon(abi))).slice(2) !== mc.abiHash) fail(`${c.name} abi hash mismatch`);
    if (!m.assets.find((a) => a.path === mc.abiPath)) fail(`${mc.abiPath} not listed in assets`);
  }
}
const walk = (dir, rel = '') =>
  fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const r = rel ? `${rel}/${e.name}` : e.name;
    return e.isDirectory() ? walk(dir, r) : [r];
  });
const files = walk(dist).filter((p) => p !== 'imd-deployment.json').sort();
const listed = m.assets.map((a) => a.path).sort();
if (JSON.stringify(files) !== JSON.stringify(listed)) fail(`asset list differs from dist contents:\n  dist: ${files}\n  listed: ${listed}`);
if (!listed.includes('index.html')) fail('index.html not listed');
if (listed.includes('imd-deployment.json')) fail('manifest lists itself');
for (const a of m.assets) {
  const buf = fs.readFileSync(path.join(dist, a.path));
  if (createHash('sha256').update(buf).digest('hex') !== a.sha256) fail(`sha256 mismatch ${a.path}`);
  if (!/^[0-9a-f]{64}$/.test(a.sha256)) fail(`sha256 format ${a.path}`);
}
if (net) {
  if (canon(m.network) !== canon(net.network)) fail('network block differs from network.json');
  if (net.walletAddChain && canon(m.walletAddChain) !== canon(net.walletAddChain)) fail('walletAddChain differs');
} else if (m.network || m.walletAddChain) fail('network present without network.json');
if ('poolKey' in handoff !== 'poolKey' in m) fail('poolKey presence differs from handoff');

// Addresses and URLs in the manifest must come from the handoff or the network block.
const text = JSON.stringify({ ...m, assets: undefined, network: undefined, walletAddChain: undefined });
const okAddrs = new Set([...handoff.contracts.map((c) => c.address.toLowerCase()), ...(handoff.poolKey ? Object.values(handoff.poolKey).filter((v) => typeof v === 'string' && v.startsWith('0x')).map((v) => v.toLowerCase()) : [])]);
for (const a of text.match(/0x[0-9a-fA-F]{40}/g) ?? []) if (!okAddrs.has(a.toLowerCase())) fail(`address outside handoff: ${a}`);
if (/https?:\/\//.test(text)) fail('URL outside the network block');

for (const [source, target] of [['llms.txt', 'llms.txt'], ['AGENTS.md', 'agents.md']]) {
  if (!fs.readFileSync(path.join(root, source)).equals(fs.readFileSync(path.join(dist, target)))) fail(`${target} differs from repository source`);
}

// Static-hosting and remote-code checks on the export.
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
for (const src of html.match(/(?:src|href)="([^"]+)"/g) ?? []) {
  const v = src.split('"')[1];
  if (/^(https?:)?\/\//.test(v)) fail(`index.html references a remote resource: ${v}`);
  if (v.startsWith('/') && !v.startsWith('//')) fail(`index.html uses an absolute path: ${v}`);
}
for (const f of files.filter((p) => p.endsWith('.js'))) {
  const js = fs.readFileSync(path.join(dist, f), 'utf8');
  const urls = [...new Set(js.match(/https?:\/\/[^\s"'`)]+/g) ?? [])];
  const allowedHosts = ['x.com/marginalia_md', 'explorer.imd.fun', 'etherscan.io', 'ethereum-rpc.publicnode.com', 'eth.drpc.org', 'react.dev', 'reactjs.org', 'github.com', 'viem.sh', 'eips.ethereum.org', 'w3.org', 'docs.metamask.io', 'metamask.io', 'metamask.app.link', 'eth.wiki', 'chainagnostic.org', 'ethereum.org', 'ietf.org'];
  for (const u of urls) if (!allowedHosts.some((h) => u.includes(h))) console.warn(`note: ${f} contains URL ${u}`);
  if (/new Function\(|importScripts\(|<script src=/.test(js)) fail(`${f} contains dynamic code loading`);
}
console.log(process.exitCode ? 'manifest check FAILED' : `manifest check OK: ${m.contracts.length} contracts, ${m.assets.length} assets`);
