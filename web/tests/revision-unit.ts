// Offline regression cases. Bundle with esbuild for Node, then execute (see README).
import assert from 'node:assert/strict';
import { parseTarget, targetBpsFor, parseAmount, sealHash, explainError, Status, NO_VENUE } from '../src/lib';
import { refundShare } from '../src/claims';
import { loadFeed } from '../src/notes';
import { DEPLOY_BLOCK, LOG_TAIL } from '../src/config';
import { formatUnits, type PublicClient, type Address, type Hex } from 'viem';
const unit = 10n ** 18n;
let checks = 0;
function check(name: string, fn: () => void) { fn(); checks++; console.log('PASS', name); }
check('exact approval totals', () => {
  for (const bond of ['0.25009','0.250000000000000001','9.999999999999999999']) {
    const total = parseAmount(bond)! + unit/10n + unit/4n;
    assert.equal(parseAmount(formatUnits(total,18)),total);
  }
  assert.equal(formatUnits(parseAmount('0.25009')!+unit*35n/100n,18),'0.60009');
  assert.equal(parseAmount('0.2500000000000000001'),null);
});
check('priced calls cannot encode zero or overflow uint32', () => {
  for (const s of ['99.999','100','NaN','Infinity','1e20','-10','10.001','']) assert(parseTarget(1,s).error,s);
  assert.equal(parseTarget(1,'99.99').targetBps,1);
  assert.equal(parseTarget(1,'10').targetBps,9000);
  assert.equal(parseTarget(0,'10').targetBps,11000);
  assert.equal(parseTarget(0,'42949572.95').targetBps,4294967295);
  assert(parseTarget(0,'42949572.96').error);
  assert(parseTarget(0,'42949573').error);
  assert(parseTarget(0,'9.99').error);
  assert.throws(()=>targetBpsFor(1,99.999));
  const p={x:'0x1111111111111111111111111111111111111111' as Address,venue:NO_VENUE,side:0,targetBps:parseTarget(0,'42949572.95').targetBps!,horizonDays:30,parentId:`0x${'0'.repeat(64)}` as Hex,class:1,text:'boundary'};
  assert.match(sealHash(p.x,p),/^0x[0-9a-f]{64}$/);
});
check('remaining refund share: integer rounding, cap, empty/count-zero', () => {
  assert.equal(refundShare(1n,2,unit/10n),0n);
  assert.equal(refundShare(unit,0,unit/10n),0n);
  assert.equal(refundShare(unit,2,unit/10n),unit/10n);
  assert.equal(refundShare(unit/10n,2,unit/10n),unit/20n);
  assert.equal(Status.Retracted,5);
});
check('pricer revert is readable by name and selector', () => {
  assert.match(explainError(new Error('execution reverted: 0xc3651e6d')),/wait one hour/);
  assert.match(explainError(new Error('PriceHistoryUnavailable')),/1 and 6 hours/);
});

// Test cursor persistence, bounded history, gaps, incremental logs and reorg replacement with a fake client.
const storage = new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)},configurable:true});
let head=DEPLOY_BLOCK+3500n;
let refuse=false, reorg=false, prune=false;
const calls: [bigint,bigint][]=[];
const hook='0x3333333333333333333333333333333333333333' as Address;
const id=`0x${'0'.repeat(63)}1` as Hex;
const event={eventName:'NotePosted',args:{id,author:hook,x:hook,class:1,side:0,targetBps:12000,horizonDays:30,parentId:`0x${'0'.repeat(64)}`,text:'Persisted note'},blockNumber:DEPLOY_BLOCK+100n,transactionHash:id,logIndex:0};
const client = {
  getBlockNumber:async()=>head,
  getBlock:async({blockNumber}:{blockNumber?:bigint})=>({timestamp:1791763200n,hash:reorg?'0xdef':'0xabc',number:blockNumber??head}),
  getLogs:async({fromBlock,toBlock}:{fromBlock:bigint;toBlock:bigint})=>{calls.push([fromBlock,toBlock]);if(refuse&&fromBlock<head-2000n)throw Error('Archive unavailable');return !prune&&event.blockNumber>=fromBlock&&event.blockNumber<=toBlock?[event]:[];},
  readContract:async()=>({status:0,class:1,postPrice:unit,postBalance:unit,deposit:unit/4n,children:0}),
} as unknown as PublicClient;
let feed=await loadFeed(client,hook);
assert.equal(feed.notes.length,1);assert.equal(feed.partial,false);assert.equal(calls.length,2);assert(storage.size>0);checks++;
console.log('PASS initial events persisted');
calls.length=0;head+=100n;
feed=await loadFeed(client,hook);
assert.equal(feed.notes.length,1);assert.equal(calls.length,1);assert(calls[0][0]>event.blockNumber);assert.equal(feed.partial,false);checks++;
console.log('PASS refresh reads only overlap and tail, retains historical note');
// New client instance (as on reload) and far-future head: no unbounded 90-day backfill.
calls.length=0;head+=650000n;refuse=true;
feed=await loadFeed({...client} as PublicClient,hook);
assert.equal(calls.length,4);assert(calls.every(([a,b])=>a>=head-LOG_TAIL+1n&&b-a<2000n));assert.equal(feed.notes.length,1);assert(feed.partial);assert(feed.warnings.some(w=>w.includes('did not serve')));checks++;
console.log('PASS old cached note survives refused ranges, 90-day scan bounded to four chunks');
// Failed ranges inside the tail are retried, but older gaps stay honestly disclosed.
refuse=false;calls.length=0;
feed=await loadFeed(client,hook);
assert.equal(calls.length,4);assert(feed.partial);assert(!feed.warnings.some(w=>w.includes('did not serve')));checks++;
console.log('PASS recent failed ranges recover without losing historical-gap disclosure');
reorg=true;prune=true;calls.length=0;
feed=await loadFeed(client,hook);
assert.equal(feed.notes.length,0);assert(feed.warnings.some(w=>w.includes('reorganization')));checks++;
console.log('PASS changed anchor invalidates cache and discards reorganized events');
console.log(`${checks} unit scenarios passed`);
