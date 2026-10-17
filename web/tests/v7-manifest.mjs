import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const m=JSON.parse(fs.readFileSync(path.join(root,'dist/imd-deployment.json')));
const source=JSON.parse(fs.readFileSync(path.join(root,'web/deployment/network.json')));
const urls=['https://rpc.mevblocker.io','https://gateway.tenderly.co/public/mainnet','https://ethereum-rpc.publicnode.com','https://eth.drpc.org'];
for(const value of [m.network.rpcUrls,m.walletAddChain.rpcUrls,source.network.rpcUrls,source.walletAddChain.rpcUrls])assert.deepEqual(value,urls);
assert.deepEqual(m.network,source.network);assert.deepEqual(m.walletAddChain,source.walletAddChain);
const pinned=process.argv[2]||path.join(root,'.imd/reads/network.json');
if(fs.existsSync(pinned)){
 const previous=JSON.parse(fs.readFileSync(pinned));previous.network.rpcUrls=urls;previous.walletAddChain.rpcUrls=urls;
 assert.deepEqual(source,previous,'Only the expressly requested RPC lists may differ from the pinned network');
}
assert(!/flashbots|1rpc|cloudflare-eth|blastapi|blockpi|ankr/i.test(JSON.stringify(source)));
console.log('PASS v7 manifest: exact ordered public RPC and wallet lists; all other chain settings preserved');
