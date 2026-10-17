// Optional public, read-only smoke check of the actual runtime node order and complete history scan.
// Usage: bundle with esbuild for Node, then pass dist/imd-deployment.json. No wallet or transaction.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Address } from 'viem';
import { loadContracts, makePublicClient } from '../src/chain';
import { ANNEX_DEPLOY_BLOCK, type AppConfig } from '../src/config';
import { loadFeed } from '../src/notes';
import { readOpenWeeks } from '../src/week';
const manifest=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const address=(name:string):Address=>manifest.contracts.find((c:{name:string})=>c.name===name).address;
const cfg={deployment:manifest,chainId:manifest.chainId,network:manifest.network,walletAddChain:manifest.walletAddChain,rpcUrls:manifest.network.rpcUrls,explorer:manifest.network.explorer,hook:address('MarginaliaHook'),marg:address('Marginalia'),imd:manifest.network.pairToken.address,annex:address('MarginaliaAnnex'),pages:address('MarginaliaPages')} as AppConfig;
const storage=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)}});
const pub=makePublicClient(cfg);assert.equal(await pub.getChainId(),manifest.chainId);
const contracts=await loadContracts(pub,cfg);const pots=await readOpenWeeks(pub,cfg.hook,contracts.judge);
const feeds=await Promise.all([loadFeed(pub,cfg.hook),loadFeed(pub,cfg.annex!,ANNEX_DEPLOY_BLOCK,'annex')]);
console.log(JSON.stringify({publicNodes:cfg.rpcUrls,chainId:manifest.chainId,companionsVerified:true,currentWeek:pots.current,defaultWeek:pots.defaultWeek,openWeeks:pots.weeks.map(w=>({week:w.week,pool:w.pool,eligible:w.eligible.length})),history:feeds.map((f,i)=>({source:i?'annex':'hook',toBlock:f.toBlock,notes:f.notes.length,complete:!f.partial,coverage:f.coverage,failedRanges:f.failedRanges,warnings:f.warnings})),transactionsSent:0},(_,v)=>typeof v==='bigint'?v.toString():v,2));
assert(feeds.every(f=>!f.partial),'Public nodes left a history gap; inspect the evidence, never substitute empty history.');
