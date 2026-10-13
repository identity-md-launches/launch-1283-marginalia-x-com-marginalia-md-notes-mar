import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { keccak256, toBytes, type Address } from 'viem';
import { useApp, useRead } from './chain';
import { noIdentity, resolveIdentity, sanitizeAvatar, verifyIdentity, type Identity } from './identity-read';
import { short } from './lib';
const Identities = createContext<{ ready: boolean; read: (a: Address) => Promise<Identity> } | null>(null);
export function IdentityProvider({ children }: { children: ReactNode }) {
  const { cfg, pub } = useApp();
  const check = useRead(() => verifyIdentity(pub, cfg), [pub, cfg]);
  const read = useMemo(() => {
    const cache = new Map<string, { at: number; promise: Promise<Identity> }>();
    return (a: Address) => {
      const key = a.toLowerCase(), old = cache.get(key);
      if (old && Date.now() - old.at < 60000) return old.promise;
      const promise = resolveIdentity(pub, cfg, a).catch(noIdentity);
      cache.set(key, { at: Date.now(), promise }); return promise;
    };
  }, [cfg, pub]);
  return <Identities.Provider value={{ ready: check.data === true && !check.error, read }}>{children}</Identities.Provider>;
}
export function useIdentity(address: Address) {
  const c = useContext(Identities);
  const read = useRead(c?.ready ? () => c.read(address) : null, [c?.ready, c?.read, address]);
  return read.data ?? noIdentity();
}
export function Avatar({ address, name, url, large = false }: { address: Address; name?: string; url?: string | null; large?: boolean }) {
  const [failed, setFailed] = useState('');
  const safe = sanitizeAvatar(url);
  const digest = keccak256(toBytes(address.toLowerCase()));
  const cells = Array.from({ length: 25 }, (_, i) => {
    const x = i % 5, y = Math.floor(i / 5), bit = parseInt(digest.slice(2 + y * 3 + Math.min(x, 4 - x), 3 + y * 3 + Math.min(x, 4 - x)), 16);
    return bit % 2 === 0 || i === 12 ? <rect key={i} x={x + 1} y={y + 1} width="1" height="1"/> : null;
  });
  return safe && failed !== safe ? <img className={`avatar ${large ? 'avatar-large' : ''}`} src={safe} alt={`${name || short(address)} avatar`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(safe)}/> : <svg className={`avatar generated-mark ${large ? 'avatar-large' : ''}`} role="img" aria-label={`Generated mark for ${short(address)}`} viewBox="0 0 7 7">{cells}</svg>;
}
export function Person({ address, large = false }: { address: Address; large?: boolean }) {
  const identity = useIdentity(address);
  return <a className={`person ${large ? 'person-large' : ''}`} href={`#/author/${address}`}><Avatar address={address} name={identity.name} url={identity.avatar} large={large}/><span><strong>{identity.name || short(address)}</strong><span className="small mono">{short(address)}</span></span></a>;
}
