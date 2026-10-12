// Read-only live verification, with the contributor-provided loopback RPC passed as argv[2].
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPublicClient, http, keccak256, toBytes } from 'viem';
import { MarginaliaHookAbi, MarginaliaRouterAbi, MarginaliaJudgeAbi } from '../src/abi';
import { loadContracts } from '../src/chain';
import { sealHash, sealKey, sealSubject, venueId } from '../src/lib';
import type { AppConfig, Deployment } from '../src/config';
const d: Deployment=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const cfg={deployment:d,chainId:d.chainId,hook:d.contracts.find(c=>c.name==='MarginaliaHook')!.address,marg:d.contracts.find(c=>c.name==='Marginalia')!.address,imd:d.network.pairToken.address,rpcUrls:[process.argv[2]],explorer:d.network.explorer,network:d.network,walletAddChain:d.walletAddChain} as AppConfig;
const pub=createPublicClient({transport:http(process.argv[2]),ccipRead:false});
assert.equal(await pub.getChainId(),1);
const c=await loadContracts(pub,cfg);
assert.equal(c.router.toLowerCase(),'0xa3579d7c59a2c0c742fc4e5bb18af93241d1d263');
assert.equal(c.judge.toLowerCase(),'0xa9e1891d76553195b4cbcd0f8db290c8c0fa28b9');
assert(c.venueFinderSafe);
for(const a of [c.hook,c.marg,c.router,c.judge,c.treasury,c.imd,c.univ2Factory,c.univ3Factory,c.weth])assert((await pub.getCode({address:a}))!.length>2);
const p={x:c.marg,venue:{kind:1,ref:c.poolId,quote:c.imd,xIsToken0:false},side:0,targetBps:12000,horizonDays:30,parentId:`0x${'0'.repeat(64)}` as `0x${string}`,class:1,text:'A read-only encoding check. ☞'};
const h={address:c.hook,abi:MarginaliaHookAbi} as const;
const derived=await pub.readContract({address:c.router,abi:MarginaliaRouterAbi,functionName:'validateVenue',args:[p,c.poolKey]});
assert.equal(derived.ref,p.venue.ref);assert.equal(derived.quote.toLowerCase(),p.venue.quote.toLowerCase());assert.equal(derived.xIsToken0,false);
// A public contract address is sufficient for pure hashing; this does not assert ownership or send a transaction.
const author=c.hook;
assert.equal(sealHash(author,p),await pub.readContract({...h,functionName:'sealHash',args:[author,p]}));
assert.equal(sealKey(author,sealHash(author,p)),await pub.readContract({...h,functionName:'sealKey',args:[author,sealHash(author,p)]}));
const window=await pub.readContract({address:c.router,abi:MarginaliaRouterAbi,functionName:'priceWindows',args:[venueId(p.venue)]});
const canon=(v:unknown):string=>v===null?'null':Array.isArray(v)?`[${v.map(canon).join(',')}]`:typeof v==='object'?`{${Object.keys(v!).sort().map(k=>`${JSON.stringify(k)}:${canon((v as Record<string,unknown>)[k])}`).join(',')}}`:JSON.stringify(v);
const abiDir=process.argv[3].replace(/imd-deployment.json$/,'abi/');
for(const [name,subset] of [['MarginaliaHook',MarginaliaHookAbi],['MarginaliaRouter',MarginaliaRouterAbi],['MarginaliaJudge',MarginaliaJudgeAbi]] as const){const full=JSON.parse(fs.readFileSync(abiDir+name+'.json','utf8'));for(const entry of subset)assert(full.some((e:unknown)=>canon(e)===canon(entry)));}
for(const contract of d.contracts){const full=JSON.parse(fs.readFileSync(abiDir+contract.name+'.json','utf8'));assert.equal(keccak256(toBytes(canon(full))).slice(2),contract.abiHash);}
console.log(JSON.stringify({head:String(await pub.getBlockNumber()),router:c.router,judge:c.judge,treasury:c.treasury,poolId:c.poolId,window:window.map(String),sealSubject:sealSubject(p),noteCount:String(await pub.readContract({...h,functionName:'noteCount'})),result:'addresses/code, venue, seal encodings, ABI subsets and canonical hashes verified; no transaction sent'},null,2));
