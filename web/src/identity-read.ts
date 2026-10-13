// Read-only interface derived from launch 1436 at 0ef5649c67e948c75bf432d619dbf0613648cb8d.
// Full compiler ABIs and canonical hashes are in the runtime manifest. No wallet client is accepted here.
import { parseAbi, zeroAddress, type Address, type PublicClient } from 'viem';
import { IPFS_GATEWAY, type AppConfig } from './config';
export const identityAbi = parseAbi([
  'function IDENTITY() view returns (address)',
  'function LARP() view returns (address)',
  'function NAMES() view returns (address)',
  'function primaryOf(address wallet) view returns (uint256 imdId,string full,bool live)',
  'function faceURI(uint256 imdId) view returns (string uri)',
]);
export interface Identity { name: string; avatar: string | null; imdId: bigint | null }
export const noIdentity = (): Identity => ({ name: '', avatar: null, imdId: null });

export function sanitizeAvatar(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 262144 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  if (/^data:image\/(?:png|jpeg|gif|webp|avif|svg\+xml)(?:;charset=utf-8)?(?:;base64|;utf8)?,/i.test(value)) return value;
  let u = value;
  if (u.startsWith('ipfs://')) {
    const path = u.slice(7).replace(/^ipfs\//, '');
    if (!/^[a-zA-Z0-9]+(?:\/[^?#]*)?$/.test(path) || path.split('/').includes('..')) return null;
    u = IPFS_GATEWAY + path;
  }
  try { const url = new URL(u); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export function primaryIdentity(imdId: bigint, name: string, live: boolean): Identity {
  return live && /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?\.imd$/.test(name)
    ? { name, avatar: null, imdId } : noIdentity();
}
export async function verifyIdentity(pub: PublicClient, cfg: AppConfig): Promise<boolean> {
  const c = cfg.identity;
  if (!c) return false;
  const blockNumber = await pub.getBlockNumber();
  const code = await Promise.all([c.larp, c.names, c.links].map(address => pub.getCode({ address, blockNumber })));
  if (code.some(x => !x || x === '0x')) return false;
  const read = (address: Address, functionName: 'IDENTITY' | 'LARP' | 'NAMES') => pub.readContract({ address, abi: identityAbi, functionName, blockNumber });
  const [identity, namesIdentity, linksIdentity, namesLarp, linksLarp, linksNames] = await Promise.all([
    read(c.larp, 'IDENTITY'), read(c.names, 'IDENTITY'), read(c.links, 'IDENTITY'), read(c.names, 'LARP'), read(c.links, 'LARP'), read(c.links, 'NAMES'),
  ]);
  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  return !eq(identity, zeroAddress) && eq(identity, namesIdentity) && eq(identity, linksIdentity)
    && eq(namesLarp, c.larp) && eq(linksLarp, c.larp) && eq(linksNames, c.names);
}

// Bound metadata size and latency; parse JSON as data. SVG art is only ever an <img>, never markup.
export async function avatarFromMetadata(uri: string): Promise<string | null> {
  if (uri.length > 524288) return null;
  let text: string;
  if (/^data:application\/json(?:;charset=utf-8)?(?:;base64)?,/i.test(uri)) {
    const comma = uri.indexOf(',');
    text = /;base64,/i.test(uri.slice(0, comma + 1)) ? new TextDecoder().decode(Uint8Array.from(atob(uri.slice(comma + 1)), x => x.charCodeAt(0))) : decodeURIComponent(uri.slice(comma + 1));
  } else {
    const safe = sanitizeAvatar(uri);
    if (!safe || safe.startsWith('data:')) return null;
    const res = await fetch(safe, { signal: AbortSignal.timeout(5000), credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok || Number(res.headers.get('content-length')) > 524288) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    let length = 0; const chunks: Uint8Array[] = [];
    while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > 524288) { await reader.cancel(); return null; } chunks.push(value); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    text = new TextDecoder().decode(bytes);
  }
  const meta = JSON.parse(text);
  return sanitizeAvatar(meta?.image || meta?.image_url || (typeof meta?.image_data === 'string' ? `data:image/svg+xml;utf8,${encodeURIComponent(meta.image_data)}` : ''));
}
export async function resolveIdentity(pub: PublicClient, cfg: AppConfig, wallet: Address): Promise<Identity> {
  if (!cfg.identity) return noIdentity();
  const blockNumber = await pub.getBlockNumber();
  const [id, full, live] = await pub.readContract({ address: cfg.identity.names, abi: identityAbi, functionName: 'primaryOf', args: [wallet], blockNumber });
  const result = primaryIdentity(id, full, live);
  if (!result.name) return result;
  try { result.avatar = await avatarFromMetadata(await pub.readContract({ address: cfg.identity.larp, abi: identityAbi, functionName: 'faceURI', args: [id], blockNumber })); } catch { /* Keep the verified name and generated mark. */ }
  return result;
}
