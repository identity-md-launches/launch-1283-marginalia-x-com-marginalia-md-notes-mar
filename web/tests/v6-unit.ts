import assert from 'node:assert/strict';
import { keccak256, toBytes, toHex, type Address, type PublicClient } from 'viem';
import { pagesSearchRoute, parseTweetId, readPagesDirectory } from '../src/pages-data';
import { noteShareLine } from '../src/share';
import { potAmount } from '../src/shell';
import { PAGES_DEPLOY_BLOCK, LOG_CHUNK } from '../src/config';
import type { Note } from '../src/notes';

const a = '0x1111111111111111111111111111111111111111' as Address;
const b = '0x2222222222222222222222222222222222222222' as Address;
const c = '0x3333333333333333333333333333333333333333' as Address;
const sa = toHex(BigInt(a), {size:32}), sb = toHex(BigInt(b), {size:32});
const sh = keccak256(toBytes('x:writer'));
assert.equal(pagesSearchRoute(' @Writer_1 '), '#/pages/writer_1');
assert.equal(pagesSearchRoute('Writer'), '#/pages/writer');
assert.equal(pagesSearchRoute('0xngmi'), '#/pages/0xngmi');
assert.equal(pagesSearchRoute('@0xngmi'), '#/pages/0xngmi');
assert.equal(pagesSearchRoute(a), '#/author/'+a);
for (const bad of ['', '@', 'x'.repeat(16), 'bad-handle', '0x12345678901234567890', 'https://x.com/a', '<script>']) assert.equal(pagesSearchRoute(bad), null);
for (const good of ['123456', ' 123456 ', 'https://x.com/writer/status/123456?s=20', 'twitter.com/Writer/status/123456', 'https://mobile.twitter.com/writer/status/123456/photo/1', 'https://x.com/i/web/status/123456']) assert.equal(parseTweetId(good),123456n);
for (const bad of ['', '0', '-1', '1.2', '1e3', 'https://x.com.evil.test/a/status/123', 'https://x.com@evil.test/a/status/123', 'https://evil.test/a/status/123', 'https://x.com/a/123', 'javascript:123', 'https://x.com:8080/a/status/123', (1n<<256n).toString()]) assert.equal(parseTweetId(bad),null);
assert.equal(potAmount(521500000000000000000n,4),'521.5000');
assert.equal(potAmount(521500000000000000000n,1),'521.5');
assert.equal(potAmount(123456789012345678901234567890n,4),'123456789012.3456');
const thesis = {index:7n,author:a,text:'First sentence. Second sentence should be omitted.',targetBps:0,status:6} as Note;
assert.equal(noteShareLine(thesis),'Marginalia note No. 7 by 0x1111…1111: First sentence. thesis open.');
assert(!noteShareLine({...thesis,text:'😀'.repeat(150)}).includes('\ufffd'));
assert.equal(Array.from(noteShareLine({...thesis,text:'😀'.repeat(150)}).split(': ')[1].split('. thesis')[0]).length,140);
assert.match(noteShareLine({...thesis,targetBps:12500,side:0,status:0}),/25%.*open\./);
assert.match(noteShareLine({...thesis,source:'annex',targetBps:7500,side:1,status:2}),/Marginalia Annex call.*25%.*wrong/);
console.log('PASS search, tweet URL security, pot precision and thesis/call share text');

const head = PAGES_DEPLOY_BLOCK + 2n*LOG_CHUNK + 50n;
const queries: any[] = [], reads: any[] = [];
let gap=false, failed=false, nameGap=false;
const pub = {
 getBlockNumber:async()=>head,
 getLogs:async(q:any)=>{
  queries.push(q); assert(q.toBlock-q.fromBlock<LOG_CHUNK); assert(q.fromBlock>=PAGES_DEPLOY_BLOCK);
  if(q.event.name==='HandleRegistered') { if(nameGap) throw Error('missing registrations'); return [{args:{subject:sh,handle:'writer'}},{args:{subject:sb,handle:'forged'}}]; }
  if(gap && q.fromBlock===PAGES_DEPLOY_BLOCK+LOG_CHUNK) throw Error('range refused');
  return [sa,sb,sh].flatMap(subject=>[a,b,c].map(trader=>({args:{subject,trader,buy:trader===a}})));
 },
 readContract:async(q:any)=>{
  reads.push(q);assert.equal(q.blockNumber,head);
  const subject=q.args[0];
  if(q.functionName==='subjects') return [subject===sh?8n:subject===sa?4n:7n,a,0n,0n];
  if(q.functionName==='buyPrice')return[100n,10n];
  if(q.functionName==='pagesOf') {if(failed && q.args[1]===b)throw Error('balance failed');return q.args[1]===c?0n:subject===sb&&q.args[1]===b?0n:subject===sh?4n:2n;}
  throw Error(q.functionName);
 }
} as unknown as PublicClient;
let data=await readPagesDirectory(pub,c,a);
assert.deepEqual(data.rows.map(r=>r.subject),[sh,sa,sb]);
assert.equal(data.rows[0].handle,'writer');assert.equal(data.rows[1].author,a);
assert.equal(data.rows[2].handle,undefined);assert.equal(data.rows[0].backers,2);assert.equal(data.rows[0].holding,4n);assert.equal(data.rows[0].next,110n);
assert.equal(data.gaps.length,0);assert.equal(queries.at(-1).toBlock,head);assert.equal(queries[0].fromBlock,PAGES_DEPLOY_BLOCK);
assert.equal(reads.filter(r=>r.functionName==='pagesOf').length,9,'Deduplicate candidates across chunks and wallet');
gap=true;failed=true;nameGap=true;data=await readPagesDirectory(pub,c,b);
assert(data.gaps.some(g=>g.kind==='trades'));assert(data.gaps.some(g=>g.kind==='handles'));
assert.equal(data.rows.find(r=>r.subject===sh)!.handle,undefined);
for(const row of data.rows){assert.equal(row.holdingsFailed,1);assert.equal(row.holding,null);assert.equal(row.backers,1);}
console.log('PASS full chunk coverage, name integrity, current balances, deduplication, ranking and disclosed failures');
