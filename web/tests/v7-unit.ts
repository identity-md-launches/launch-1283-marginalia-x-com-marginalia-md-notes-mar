// Deterministic wallet/week eligibility and actual viem HTTP fallback tests. No public RPC or signing.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { encodeAbiParameters, encodeEventTopics, encodeFunctionResult, parseAbiItem, toHex, zeroHash, type Address, type PublicClient } from 'viem';
import { MarginaliaHookAbi } from '../src/abi';
import { makePublicClient } from '../src/chain';
import { DEPLOY_BLOCK, type AppConfig } from '../src/config';
import { loadFeed, type FeedData } from '../src/notes';
import { readOpenWeeks, readYourTheses } from '../src/week';
import { YourThesisLine } from '../src/your-week';

const unit=10n**18n, wallet=toHex(101,{size:20}) as Address, hook=toHex(102,{size:20}) as Address, judge=toHex(103,{size:20}) as Address;
const id=toHex(1,{size:32}), now=1792224000, week=Math.floor(now/604800)-1;
let checks=0;
async function check(name:string,fn:()=>Promise<void>|void){try{await fn();checks++;console.log('PASS',name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}
const viewed:number[]=[];
const pub={getBlock:async()=>({timestamp:BigInt((week-2)*604800)}),readContract:async({functionName,args}:any)=>{
 if(functionName==='week')return week+1;
 if(functionName==='thesisPool')return args[0]===week+1?0n:args[0]===week-1?4n*unit:500n*unit;
 if(functionName==='paid')return args[0]===week-1;
 if(functionName==='eligibleTheses'){viewed.push(args[0]);return args[0]===week?[id]:[];}
 if(functionName==='noteOf')return {author:wallet,targetBps:0,children:1};
 throw Error('Unexpected call '+functionName);
}} as unknown as PublicClient;
let weeks=await readOpenWeeks(pub,hook,judge);
await check('Latest funded unpaid week selected; every week since deployment inspected, paid and empty excluded',()=>{
 assert.equal(weeks.defaultWeek,week);assert.deepEqual(weeks.weeks.map(w=>w.week),[week,week-2]);assert.deepEqual(viewed,[week,week-2]);
});
await check('A newly funded current week becomes the default even before it has eligible theses',async()=>{
 const funded={...pub,readContract:async(call:any)=>call.functionName==='thesisPool'&&call.args[0]===week+1?unit:(pub.readContract as any)(call)} as PublicClient;
 const result=await readOpenWeeks(funded,hook,judge);assert.equal(result.defaultWeek,week+1);assert.equal(result.weeks[0].eligible.length,0);
});
const feed={notes:[{id,index:1n,author:wallet,targetBps:0,timestamp:week*604800+100}],loadedAt:now} as FeedData;
await check('Own loaded theses are verified by noteOf and eligibleTheses, never a child-count inference',async()=>{
 const rows=await readYourTheses(pub,hook,wallet,feed,weeks.weeks,604800);assert.equal(rows.length,1);assert(rows[0].isEligible);
 assert.equal(rows[0].graceEnd,week*604800+604900);
 const noEligible=await readYourTheses(pub,hook,wallet,feed,[{week,pool:unit,eligible:[]}],604800);assert.equal(noEligible[0].isEligible,false);
});
await check('No thesis, another wallet, Annex entry and unfunded week produce no rows',async()=>{
 for(const notes of [[],[{...feed.notes[0],author:judge}],[{...feed.notes[0],source:'annex'}],[{...feed.notes[0],timestamp:(week+1)*604800+1}]])assert.deepEqual(await readYourTheses(pub,hook,wallet,{...feed,notes} as FeedData,weeks.weeks,604800),[]);
});
await check('Exact eligible, local deadline/link and expired lines; inclusive seven-day boundary',()=>{
 const t={id,index:1n,week,pool:1234567n*unit/1000n,eligible:[id],graceEnd:now+3600,isEligible:true};
 const render=(patch={})=>renderToStaticMarkup(createElement(YourThesisLine,{thesis:{...t,...patch},now}));
 assert.equal(render(),`<li>Thesis No. 1, week ${week}: eligible for the 1234.567 IMD pot</li>`);
 const pending=render({isEligible:false});assert(pending.includes(`href="#/post?child=${id}"`));assert(pending.includes('needs your call under it by'));assert(pending.includes('1 h 00 min'));assert(pending.includes('left'));
 assert(render({isEligible:false,graceEnd:now}).includes('needs your call'));
 assert.equal(render({isEligible:false,graceEnd:now-1}),`<li>Thesis No. 1, week ${week}: grace ended, forfeitable</li>`);
});

const storage=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)},configurable:true});
const event=parseAbiItem('event NotePosted(bytes32 indexed id, address indexed author, address indexed x, uint8 class, uint8 side, uint32 targetBps, uint16 horizonDays, bytes32 parentId, string text)');
const args={id,author:wallet,x:wallet,class:1,side:0,targetBps:0,horizonDays:0,parentId:zeroHash,text:'A historical thesis.'};
const log={address:hook,topics:encodeEventTopics({abi:[event],eventName:'NotePosted',args}),data:encodeAbiParameters(event.inputs.filter(i=>!i.indexed),[1,0,0,0,zeroHash,args.text]),blockNumber:toHex(DEPLOY_BLOCK+100n),blockHash:zeroHash,transactionHash:id,transactionIndex:'0x0',logIndex:'0x0',removed:false};
const head=DEPLOY_BLOCK+40999n;
const attempts:{node:number;a:bigint;b:bigint}[]=[];const active=[0,0],peak=[0,0];let failAll=false,missingResult=false;
const servers=[0,1].map(node=>createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk;
 const input=JSON.parse(raw),rows=Array.isArray(input)?input:[input];
 const chunks=rows.filter((r:any)=>r.method==='eth_getLogs');active[node]+=chunks.length;peak[node]=Math.max(peak[node],active[node]);
 const failure=chunks.some((r:any)=>BigInt(r.params[0].fromBlock)===DEPLOY_BLOCK+8000n && (node===0||failAll));
 await new Promise(r=>setTimeout(r,5));
 if(failure){active[node]-=chunks.length;for(const r of chunks)attempts.push({node,a:BigInt(r.params[0].fromBlock),b:BigInt(r.params[0].toBlock)});res.writeHead(429,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'rate limited'}));return;}
 const output=rows.map((r:any)=>{
  let result:any;
  if(r.method==='eth_blockNumber')result=toHex(head);
  else if(r.method==='eth_getBlockByNumber')result={number:r.params[0],timestamp:toHex(now-86400*4),hash:zeroHash};
  else if(r.method==='eth_getLogs'){
   const a=BigInt(r.params[0].fromBlock),b=BigInt(r.params[0].toBlock);attempts.push({node,a,b});assert(b-a<2000n);
   if(node===0&&a===DEPLOY_BLOCK)return {jsonrpc:'2.0',id:r.id,error:{code:-32000,message:'archive unavailable'}};
   if(missingResult&&a===DEPLOY_BLOCK+4000n)return {jsonrpc:'2.0',id:r.id};
   result=a<=DEPLOY_BLOCK+100n&&b>=DEPLOY_BLOCK+100n?[{...log,address:r.params[0].address}]:[];
  }else if(r.method==='eth_call')result=encodeFunctionResult({abi:MarginaliaHookAbi,functionName:'noteOf',result:{author:wallet,x:wallet,side:0,targetBps:0,horizonDays:0,class:1,status:6,postPrice:unit,postBalance:unit,deposit:unit,parentId:zeroHash,children:1}});
  else throw Error(r.method);
  return {jsonrpc:'2.0',id:r.id,result};
 });
 active[node]-=chunks.length;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(Array.isArray(input)?output:output[0]));
}));
await Promise.all(servers.map(s=>new Promise<void>(r=>s.listen(0,'127.0.0.1',r))));
const urls=servers.map(s=>`http://127.0.0.1:${(s.address() as any).port}`);
const rpc=makePublicClient({chainId:1,rpcUrls:urls,explorer:'https://example.test',network:{name:'Fixture',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18}}} as AppConfig);
try{
 await check('Actual viem fallback completes hook and Annex from deployment; archive failure and HTTP 429 retried elsewhere',async()=>{
  const progress:FeedData[]=[];
  const [h,a]=await Promise.all([loadFeed(rpc,hook,DEPLOY_BLOCK,'hook',f=>progress.push(f)),loadFeed(rpc,judge,DEPLOY_BLOCK,'annex')]);
  assert.equal(h.partial,false);assert.equal(a.partial,false);assert.equal(h.notes.length,1);assert.equal(a.notes.length,1);
  assert(progress.length>0&&progress[0].scanning&&progress[0].partial);assert(progress[0].notes.length===0);
  assert(attempts.some(r=>r.node===1&&r.a===DEPLOY_BLOCK));assert(attempts.some(r=>r.node===1&&r.a===DEPLOY_BLOCK+8000n));
  assert(peak.every(n=>n<=4),JSON.stringify(peak));
  for(const contract of [hook,judge]){const cached=JSON.parse(storage.get(`marginalia.logs.v1.1.${contract}`)!);assert.equal(cached.ranges.length,1);assert.equal(cached.ranges[0][0].bigint,DEPLOY_BLOCK.toString());assert.equal(cached.ranges[0][1].bigint,head.toString());assert.equal(cached.logs.length,1);}
 });
 await check('All-node 429 leaves a coverage hole, preserves other logs, manual retry serves only holes plus overlap',async()=>{
  const contract=toHex(104,{size:20}) as Address;failAll=true;
  const first=await loadFeed(rpc,contract);assert(first.partial);assert(first.failedRanges!.length>0);assert.equal(first.notes.length,1);
  const cached=JSON.parse(storage.get(`marginalia.logs.v1.1.${contract}`)!);assert(!cached.ranges.some(([a,b]:any)=>BigInt(a.bigint)<=DEPLOY_BLOCK+8000n&&BigInt(b.bigint)>=DEPLOY_BLOCK+8000n));
  const holes=first.failedRanges!.map(([a])=>a);attempts.length=0;failAll=false;
  const retried=await loadFeed(rpc,contract);assert.equal(retried.partial,false);assert.equal(retried.notes.length,1);
  assert(attempts.filter(r=>r.node===0).every(r=>holes.includes(r.a)||r.a>=head-64n));
 });
 await check('Missing JSON-RPC result is never saved as covered empty history',async()=>{
  missingResult=true;const contract=toHex(105,{size:20}) as Address;
  const first=await loadFeed(rpc,contract);assert(first.partial);assert(first.failedRanges!.some(([a])=>a===DEPLOY_BLOCK+4000n));
  const cached=JSON.parse(storage.get(`marginalia.logs.v1.1.${contract}`)!);assert(!cached.ranges.some(([a,b]:any)=>BigInt(a.bigint)<=DEPLOY_BLOCK+4000n&&BigInt(b.bigint)>=DEPLOY_BLOCK+4000n));
 });
}finally{await Promise.all(servers.map(s=>new Promise<void>(r=>s.close(()=>r()))));}
console.log(`${checks} v7 unit scenarios passed; node log concurrency peaks ${peak.join(', ')}`);
