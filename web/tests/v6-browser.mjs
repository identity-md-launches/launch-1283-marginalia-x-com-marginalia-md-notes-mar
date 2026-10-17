// V6 production-browser interactions. RPC/wallet harness derived from retained v5 regressions. No RPC request or transaction leaves the fixture.
// Uses the project's viem and an independently installed Playwright (PLAYWRIGHT_MODULE).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodeFunctionData, encodeErrorResult, encodeFunctionResult, encodeAbiParameters, encodeEventTopics, keccak256, toHex, parseAbi, zeroAddress, zeroHash, maxUint256 } from 'viem';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.env.SITE_DIR || path.join(here, '../../dist'));
const pagesAddress='0x3333333333333333333333333333333333333333';
const wethPool='0x5555555555555555555555555555555555555555';
const usdPool='0x4444444444444444444444444444444444444444';


const evidence = process.env.EVIDENCE_DIR;
if (evidence) fs.mkdirSync(evidence, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'imd-deployment.json')));
const annex = manifest.contracts.find(c => c.name === 'MarginaliaAnnex').address;
const pages = manifest.contracts.find(c => c.name === 'MarginaliaPages').address;
const pagesAbi=JSON.parse(fs.readFileSync(path.join(dist,'abi/MarginaliaPages.json')));
const hook = manifest.contracts.find(c => c.name === 'MarginaliaHook').address;
const marg = manifest.contracts.find(c => c.name === 'Marginalia').address;
const imd = manifest.network.pairToken.address;
const router = '0xa3579D7c59A2C0c742fC4e5BB18AF93241D1d263';
const judge = '0xa9e1891d76553195B4Cbcd0F8Db290C8C0FA28B9';
const treasury = '0x3e00372cc4967D2bd006Ca882c51dAf45a9810C8';
const v3 = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const v2 = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
const weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const usdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const author = '0x1111111111111111111111111111111111111111';
const other = '0x2222222222222222222222222222222222222222';
const deploy = 26169583n, unit = 10n ** 18n;
const hookAbi = JSON.parse(fs.readFileSync(path.join(dist, 'abi/MarginaliaHook.json')));
const abi = [...hookAbi,...JSON.parse(fs.readFileSync(path.join(dist,'abi/MarginaliaAnnex.json'))),...pagesAbi, ...JSON.parse(fs.readFileSync(path.join(dist,'abi/MarginaliaTreasury.json'))), ...JSON.parse(fs.readFileSync(path.join(dist, 'abi/MarginaliaRouter.json'))), ...JSON.parse(fs.readFileSync(path.join(dist, 'abi/MarginaliaJudge.json'))), ...parseAbi([
  'function IDENTITY() view returns (address)', 'function LARP() view returns (address)', 'function NAMES() view returns (address)', 'function primaryOf(address) view returns (uint256,string,bool)', 'function faceURI(uint256) view returns (string)', 'function symbol() view returns (string)', 'function decimals() view returns (uint8)', 'function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)',
  'function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)', 'function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)', 'function tickBitmap(int16) view returns (uint256)', 'function getTickBitmap(bytes32,int16) view returns (uint256)', 'function ticks(int24) view returns (uint128,int128,uint256,uint256,int56,uint160,uint32,bool)', 'function getTickLiquidity(bytes32,int24) view returns (uint128,int128)', 'function token0() view returns (address)', 'function token1() view returns (address)', 'function tickSpacing() view returns (int24)', 'function liquidity() view returns (uint128)', 'function fee() view returns (uint24)', 'function deposit() payable', 'function priceOf(bytes32,address) view returns (uint256)', 'function observe(address,(uint8 kind,bytes32 ref,address quote,bool xIsToken0),address) view returns (uint256,uint256)',
  'function getPool(address,address,uint24) view returns (address)', 'function getPair(address,address) view returns (address)', 'function getLiquidity(bytes32) view returns (uint128)',
])];
const venueType = { type: 'tuple', components: [{ name: 'kind', type: 'uint8' }, { name: 'ref', type: 'bytes32' }, { name: 'quote', type: 'address' }, { name: 'xIsToken0', type: 'bool' }] };
const poolKey = { currency0: imd, currency1: marg, fee: 12500, tickSpacing: 60, hooks: hook };
const keyType = { type: 'tuple', components: [{name:'currency0',type:'address'}, {name:'currency1',type:'address'}, {name:'fee',type:'uint24'}, {name:'tickSpacing',type:'int24'}, {name:'hooks',type:'address'}] };
const poolIdOf = key => keccak256(encodeAbiParameters([keyType], [key]));
const poolId = poolIdOf(poolKey);
const venue = { kind: 1, ref: poolId, quote: imd, xIsToken0: false };
const draft = { x: marg, venueKey: `v4:${poolId}`, side: 0, pct: '25', horizonDays: '30', text: 'A review call with a target.', parentId: '' };
const handleSubject = keccak256(toHex('x:market_reader'));
const authorSubject = toHex(BigInt(author),{size:32});
const otherSubject = toHex(BigInt(other),{size:32});
const soldSubject = toHex(BigInt(treasury),{size:32});
const subject = keccak256(encodeAbiParameters([{ type: 'address' }, venueType], [marg, venue]));
const hash = keccak256(encodeAbiParameters([{type:'address'},{type:'address'},venueType,{type:'uint8'},{type:'uint32'},{type:'uint16'},{type:'bytes32'},{type:'string'}], [author,marg,venue,0,12500,30,zeroHash,draft.text]));
const sealKey = keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [author, hash]));
const id = toHex(1, { size: 32 });
const tx = toHex(123, { size: 32 });
let f;
const reset = (patch = {}) => { f = { now: Math.floor(Date.now()/1000), head: 26185000n, notes: true, status: 1, deposit: unit/4n, allowance: 100n*unit, claimed: false, pool: unit, count: 1, closed: true, checkpointAge: 7200, sealAge: null, symbol: 'MARG', decimals: 18, token: marg, wallet: true, account: author, chain: '0x1', observe: false, reject: true, requests: [], rpc: [], created: [], children: 0, usd:true, registered:false, pagesHolding:0n, pagesEligible:true, claimPending:false, burn:0n, ...patch }; };
function event(name, values, block, logIndex = 0) {
  const ev = abi.find(a => a.type === 'event' && a.name === name);
  return { address: values.source==='pages' ? pages : values.source==='annex' || f.annexNotes ? annex : hook, topics: encodeEventTopics({ abi: [ev], eventName: name, args: values }), data: encodeAbiParameters(ev.inputs.filter(i => !i.indexed), ev.inputs.filter(i => !i.indexed).map(i => values[i.name])), blockNumber: toHex(block), blockHash: toHex(block, {size:32}), transactionHash: tx, transactionIndex: '0x0', logIndex: toHex(logIndex), removed: false };
}
function gallery() {
  if(f.social) return [
 {id:toHex(1,{size:32}),author,side:0,targetBps:12500,horizonDays:7,parentId:zeroHash,status:0,text:'https://x.com/cited_person/status/123 Supply is falling. The next seven days will test whether demand can hold.',class:0},
 {id:toHex(2,{size:32}),author:other,side:1,targetBps:7500,horizonDays:1,parentId:zeroHash,status:0,text:f.annexText ?? 'A separate Annex call with its own bond.',source:'annex'},
 {id:toHex(3,{size:32}),author,side:0,targetBps:0,horizonDays:0,parentId:zeroHash,status:6,text:'An argument for the week: usage should matter more than a passing narrative.',children:f.childPosted?1:0},
 ...(f.childPosted?[{id:toHex(4,{size:32}),author,side:0,targetBps:15000,horizonDays:7,parentId:toHex(3,{size:32}),status:0,text:'The own child call tests that argument.'}]:[]),
 {id:toHex(5,{size:32}),author:treasury,side:0,targetBps:12500,horizonDays:30,parentId:zeroHash,status:0,text:'No settled call from this wallet yet.'}
 ];
  return [
    {id:toHex(1,{size:32}),author,class:f.traded?0:1,side:0,targetBps:15000,parentId:zeroHash,status:1,text:'https://x.com/market_reader/status/123456 Supply is falling while fees grow. The record will tell.'},
    {id:toHex(2,{size:32}),author:other,side:1,targetBps:7500,parentId:toHex(1,{size:32}),status:0,text:'The fee spike is temporary. New supply will absorb it before this horizon.'},
    {id:toHex(3,{size:32}),author,side:1,targetBps:7500,parentId:zeroHash,status:2,text:'twitter.com/market_reader/status/789012 The market has priced in next quarter already.'},
    {id:toHex(4,{size:32}),author:other,side:0,targetBps:20000,parentId:zeroHash,status:1,text:'A hard target, on the record. Usage must keep growing to reach it.'},
  ];
}
function logs() {
  const out = [];
  if (f.gallery) {
    for (const [i,n] of gallery().entries()) {
      out.push(event('NotePosted',{...n,x:marg,class:n.class??1,horizonDays:n.horizonDays??30},f.head-BigInt(2500-i*100), i));
      if (n.status !== 0 && n.targetBps > 0) out.push(event('Settled',{id:n.id,status:n.status,settlePrice:unit,scoreDelta:n.status===1 ? 15000n : -10000n,keeper:author},f.head-BigInt(100-i),i+20));
    }
  } else if (f.notes) {
    out.push(event('NotePosted', {id, author: f.noteAuthor ?? author, x: f.token, class:1, side:0, targetBps:f.thesis ? 0 : 12000, horizonDays:f.thesis ? 0 : 30, parentId:zeroHash, text:'A review note: the evidence matters more than the result.'}, f.noteBlock ?? f.head - 2500n));
    if (f.extraNoteBlock) out.push(event('NotePosted', {id:toHex(2,{size:32}), author, x:f.token, class:1, side:0, targetBps:12000, horizonDays:30, parentId:zeroHash, text:'A note posted while the author was away.'}, f.extraNoteBlock));
    if (f.observe) out.push(event('Observed', {id,xRead:123456n,balance:f.sentinel ? maxUint256 : 5000000n}, f.head-100n, 1));
    if (f.status === 5) out.push(event('Settled', {id,status:5,settlePrice:0n,scoreDelta:-5000n,keeper:zeroAddress}, f.head-90n, 2));
  }
  if (f.sealAge !== null) out.push(event('Sealed', {hash,author,x:marg,venueRef:poolId}, f.head-1200n, 3));
  for (const n of f.created) out.push(event('NotePosted', { ...n.p, id:n.id, author:n.author }, n.block, 10));
  if (f.backerFixture) out.push(event('Trade', {subject:toHex(BigInt(author),{size:32}),trader:other,buy:true,amount:1n,value:unit/20n,fee:unit/200n,supply:1n,source:'pages'},26181000n));
  if(f.catalog) {
    out.push(event('HandleRegistered',{subject:handleSubject,handle:'market_reader',source:'pages'},26180754n));
    for(const [i,sub] of [handleSubject,authorSubject,otherSubject,soldSubject].entries()) for(const trader of [author,other]) out.push(event('Trade',{subject:sub,trader,buy:true,amount:1n,value:unit/20n,fee:unit/200n,supply:1n,source:'pages'},26181000n+BigInt(i*1000),i));
  }
  return out;
}
function receiptTradeLogs() {
 const e=abi.find(e=>e.type==='event'&&e.name==='XTraded');
 const args={trader:author,kind:1,xIn:imd,xOut:marg,spent:unit,received:2n*unit};
 const note=logs().find(l=>l.address.toLowerCase()===hook.toLowerCase()&&l.topics[0]===encodeEventTopics({abi:hookAbi,eventName:'NotePosted'})[0]);
 return [{...note,address:router,topics:encodeEventTopics({abi:[e],eventName:'XTraded',args}),data:encodeAbiParameters(e.inputs.filter(i=>!i.indexed),e.inputs.filter(i=>!i.indexed).map(i=>args[i.name]))},note];
}
function block(number) {
  const n = number === 'latest' ? f.head : number === 'finalized' ? f.head-64n : BigInt(number);
  const time = n === (f.noteBlock ?? f.head-2500n) ? f.now - (f.noteAge ?? 90000) : n === f.head-1200n ? f.now-(f.sealAge || 14400) : f.now - Number(f.head-n)*12;
  return { number:toHex(n), hash:toHex(n,{size:32}), parentHash:toHex(n-1n,{size:32}), timestamp:toHex(time), nonce:'0x0000000000000000', difficulty:'0x0', totalDifficulty:'0x0', gasLimit:'0x1c9c380', gasUsed:'0x0', miner:zeroAddress, extraData:'0x', baseFeePerGas:'0x1', size:'0x1', transactions:[], uncles:[], logsBloom:`0x${'0'.repeat(512)}`, receiptsRoot:zeroHash, stateRoot:zeroHash, transactionsRoot:zeroHash, sha3Uncles:zeroHash, mixHash:zeroHash };
}
function value(fn, args, address) {
  if(fn==='IDENTITY') return author;
  if(fn==='ISSUER_BPS') return 8000n;
  if(fn==='LARP') return manifest.contracts.find(c=>c.name==='LARP').address;
  if(fn==='NAMES') return manifest.contracts.find(c=>c.name==='IMDNames').address;
  if(fn==='primaryOf') return [42n, f.identityName && args[0].toLowerCase()===author ? f.identityName : '', !!f.identityName && args[0].toLowerCase()===author];
  if(fn==='faceURI') return 'data:application/json,'+encodeURIComponent(JSON.stringify({image:f.avatar||'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"%3E%3Crect width="10" height="10" fill="orange"/%3E%3C/svg%3E'}));

  const constants = { hook, pricer:treasury, router, judge, treasury, imd, token:marg, UNIV3_FACTORY:v3, UNIV2_FACTORY:v2, WETH:weth, STAMP:unit/10n, MARG_BUY:unit/4n, BOND_MIN:unit/4n, BOND_MAX:10n*unit, SEAL_MIN:1800n, SEAL_MAX:21600n, SETTLE_WINDOW:21600n, THESIS_GRACE:604800n, SWEEP_AFTER:2419200n, TEXT_MAX:280n, THESIS_TEXT_MAX:8192n, MIN_TARGET_DELTA_BPS:1000, MAX_HORIZON_DAYS:90, KEEPER_BPS:1000n, JUDGE_THRESHOLD:2n*unit, poolId, getPoolKey:poolKey, margPriceInImd:unit, getLiquidity:1000000n*unit, noteCount: f.notes ? 1n : 0n };
  if (fn in constants) return constants[fn];
  if (fn === 'symbol') return address.toLowerCase() === imd.toLowerCase() ? 'IMD' : f.symbol;
  if (fn === 'decimals') { if(f.noDecimals) throw Error('decimals unavailable'); return f.decimals; }
  if (fn === 'balanceOf' && f.wethMarket && address.toLowerCase()===weth.toLowerCase()) return f.wethBalance ?? 0n;
  if (fn === 'balanceOf') return f.balance ?? 100n*unit;
  if (fn === 'allowance') return args[1].toLowerCase() === hook.toLowerCase() ? (f.hookAllowance ?? f.allowance) : f.allowance;
  if (fn === 'getPool' && f.wethMarket && args[2]===3000 && args.some(a=>typeof a==='string'&&a.toLowerCase()===(f.tradeToken??marg).toLowerCase()) && args.some(a=>typeof a==='string'&&a.toLowerCase()===weth.toLowerCase())) return wethPool;
  if (fn === 'getPool') return f.usd && args.some(a=>typeof a==='string'&&a.toLowerCase()===usdc.toLowerCase()) && args[2]===3000 ? usdPool : zeroAddress;
  if (fn === 'getPair') return zeroAddress;
  if (fn === 'getSlot0') return [1n<<96n,0,0,12500];
  if (fn === 'slot0' && address.toLowerCase()===wethPool.toLowerCase()) return [1n<<96n,0,0,1,1,0,true];
  if (fn === 'tickSpacing') return 60;
  if (fn === 'fee') return 3000;
  if (fn === 'slot0') return [1000000n*(1n<<96n),0,0,1,1,0,true];
  if (fn === 'token0') return address.toLowerCase()===wethPool.toLowerCase()?weth:usdc;
  if (fn === 'token1') return address.toLowerCase()===wethPool.toLowerCase()?(f.tradeToken??marg):imd;
  if (fn === 'liquidity') return 1000000n*unit;
  if (fn === 'getTickBitmap' || fn==='tickBitmap') return 0n;
  if (fn === 'observe' && args.length===3) return [unit,unit];
  if (fn === 'postPrice') return unit;
  if (fn === 'hookAllowedFor') return true;
  if (fn === 'intake') return treasury;
  if (fn === 'action') return zeroHash;
  if (fn === 'annex') return annex;
  if (fn === 'priceOf') return f.oracleCost ?? unit/2n;
  if (fn === 'admittedHook') return false;
  if (fn === 'subjectOf') return toHex(BigInt(args[0]),{size:32});
  if (fn === 'subjectOfHandle' || fn==='registerHandle') return keccak256(toHex('x:'+args[0].toLowerCase()));
  if (fn === 'registeredHandle') return f.registered;
  if (fn === 'subjects' && f.catalog) return [args[0]===handleSubject?5n:args[0]===authorSubject?3n:args[0]===soldSubject?0n:8n,zeroAddress,unit,BigInt(f.now-86400)];
  if (fn === 'subjects') return [f.backerFixture ? (f.backerSupply ?? 0n) : f.pagesHolding,f.payee??zeroAddress,f.escrow??unit,f.noClock?0n:BigInt(f.now-86400)];
  if (fn === 'claims') return [f.claimPending ? tx : zeroHash,author,unit/2n,f.claimPending?BigInt(f.now-(f.claimAge??100)):0n];
  if (fn === 'pendingBurn') return f.burn;
  if (fn === 'buyPrice') return [unit/20n*args[1],unit/200n*args[1]];
  if (fn === 'sellPrice') return [unit/20n*args[1],unit/200n*args[1]];
  if (fn === 'pagesOf' && f.catalog) { if(f.balanceFail && args[1].toLowerCase()===other) throw Error('Fixture: current balance unavailable'); return args[0]===soldSubject?0n:args[0]===otherSubject?(args[1].toLowerCase()===other?8n:0n):args[1].toLowerCase()===author?(f.sold?0n:1n):args[0]===handleSubject?4n:2n; }
  if (fn === 'pagesOf' && f.backerFixture) { if(f.holdingsFail) throw Error('Current holdings unavailable'); return f.backerHolding ?? 0n; }
  if (fn === 'pagesOf') return f.social ? (args[0].toLowerCase()===toHex(BigInt(author),{size:32}).toLowerCase()?2n:0n) : f.pagesHolding;
  if (fn === 'eligible') return f.pagesEligible;
  if (fn === 'claimMessage') return `I claim my Marginalia Pages payout on chain 1 for contract ${pages} to wallet ${args[0]}`;
  if (fn === 'CLAIM_WINDOW') return 90n*86400n;
  if (fn === 'ANSWER_DEADLINE') return 3n*86400n;
  if (['buy','sell','burn','abandonClaim','recycle','deposit'].includes(fn)) return undefined;
  if (['requestClaim','requestAdmission'].includes(fn)) return tx;
  if (fn === 'tradeAndNote') { if(f.simFail) throw Error('Slippage: simulated output is below the minimum'); return unit; }
  if (fn === 'post') return keccak256(toHex('annex-note'));
  if (fn === 'observationsOf') return [];
  if (fn === 'horizonEnd') return BigInt(f.created.find(n=>n.id===args[0])?.at ?? (f.thesis ? f.now-(f.noteAge??90000) : f.horizonEnd ?? f.now+86400));
  if (fn === 'requestedAt') return f.judgePending ? BigInt(f.now-4*86400) : 0n;
  if (fn === 'requestOf') return f.judgePending ? tx : zeroHash;
  if (fn === 'paid') return !!f.paid;
  if (fn === 'lastDripDay') return f.dripped ? Math.floor(f.now/86400) : Math.floor(f.now/86400)-1;
  if (fn === 'requestJudging') return tx;
  if (['payJudged','abandonRequest','drip','retract'].includes(fn)) return undefined;

  if (fn === 'validateVenue') return args[0].venue;
  if (fn === 'priceWindows') return [f.checkpointAge === null ? 0n : BigInt(f.now-f.checkpointAge),0n,0n,0n,0n,0n,0n];
  if (fn === 'seals') return f.sealAge !== null && args[0].toLowerCase() === sealKey.toLowerCase() ? [BigInt(f.now-f.sealAge),unit,unit,unit, f.wrongSubject ? zeroHash : subject] : [0n,0n,0n,0n,zeroHash];
  if (fn === 'records' && f.social) { return args[0].toLowerCase()===treasury.toLowerCase()?[999999n,1,0,0,0,0,0]:args[0].toLowerCase()===author?[10n,8,5,1,1,0,0]:[9999n,8,10,2,2,0,0]; }
  if (fn === 'records') { if(f.newAuthor) return [0n,0,0,0,0,0,0]; return args[0].toLowerCase() === other.toLowerCase() ? [12500n,3,2,0,0,0,0] : [45000n,5,2,1,1,1,0]; }
  if (fn === 'eligibleTheses') return f.emptyPrize ? [] : [toHex(5,{size:32})];
  if (fn === 'today') return Math.floor(f.now/86400);
  if (fn === 'week') return Math.floor(f.now/604800);
  if (fn === 'refundPool' || fn === 'thesisPool') return f.pool;
  if (fn === 'notesPerDay') return f.count;
  if (fn === 'refundClaimed') return f.claimed;
  if (fn === 'judgedPaid' || fn === 'judgedSet') return !!f.judged;
  if (fn === 'weekClosed') return f.closed;
  if (fn === 'noteOf' && f.gallery) { const n = gallery().find(n => n.id === args[0]); return {author:n.author,x:marg,side:n.side,targetBps:n.targetBps,horizonDays:n.horizonDays??30,class:n.class??1,status:n.status,postPrice:unit,postBalance:5000000n,deposit:n.status===0 ? unit/4n : 0n,parentId:n.parentId,children:n.children??0}; }
  if (fn === 'noteOf' && f.created.some(n=>n.id===args[0])) { const n=f.created.find(n=>n.id===args[0]);return {...n.p,author:n.author,status:n.p.targetBps===0?6:0,class:1,postPrice:unit,postBalance:unit,deposit:unit/4n,children:0}; }
  if (fn === 'noteOf') return {author:f.noteAuthor??author,x:f.token,side:0,targetBps:f.thesis ? 0 : 12000,horizonDays:f.thesis ? 0 : 30,class:1,status:f.status,postPrice:unit,postBalance:5000000n,deposit:f.deposit,parentId:zeroHash,children:f.children};
  if (fn === 'approve') return true;
  if (fn === 'note') { if(f.strictVenue && args[0].venue.kind===1 && poolIdOf(args[1])!==args[0].venue.ref) throw Error('BadVenue: supplied key differs from selected venue'); return id; }
  if (['checkpointVenue','seal','sweep','claimDeposit','claimRefund','observe','settle','settleThesis'].includes(fn)) return undefined;
  throw Error(`Unhandled function ${fn}`);
}
function rpc(r) {
  f.rpc.push(r);
  try {
    let result;
    if (r.method === 'eth_chainId') result = '0x1';
    else if (r.method === 'eth_getCode') result = f.noCode || (f.noIdentityCode && r.params[0].toLowerCase()===manifest.contracts.find(c=>c.name==='LARP').address.toLowerCase()) ? '0x' : '0x6000';
    else if (r.method === 'eth_getBalance') result = toHex(5n*unit);
    else if (r.method === 'eth_blockNumber') result = toHex(f.head);
    else if (r.method === 'eth_getBlockByNumber') result = block(r.params[0]);
    else if (r.method === 'eth_getLogs') {
      const q = r.params[0];
      if (f.pageLogsGap && q.address.toLowerCase()===pages.toLowerCase() && BigInt(q.fromBlock)===26182753n) return {jsonrpc:'2.0',id:r.id,error:{code:-32602,message:'Fixture: Pages range refused'}};
      if (f.backerFixture && f.backerGap !== false && q.address.toLowerCase()===pages.toLowerCase() && BigInt(q.fromBlock)===26182753n) return {jsonrpc:'2.0',id:r.id,error:{code:-32602,message:'Fixture: page sell range unavailable'}};
      if ((f.failLogs && BigInt(q.fromBlock) < f.head-2000n) || (f.refuseBefore && BigInt(q.fromBlock) < f.refuseBefore)) return {jsonrpc:'2.0',id:r.id,error:{code:-32602,message:'Archive requests require a personal token'}};
      result = logs().filter(l => l.address.toLowerCase()===q.address.toLowerCase() && BigInt(l.blockNumber) >= BigInt(q.fromBlock) && BigInt(l.blockNumber) <= BigInt(q.toBlock) && (!q.topics?.[0] || (Array.isArray(q.topics[0]) ? q.topics[0].includes(l.topics[0]) : q.topics[0] === l.topics[0])));
    } else if (r.method === 'eth_call') {
      const call = r.params[0]; const {functionName,args=[]} = decodeFunctionData({abi,data:call.data});
      if (functionName==='noteOf' && !f.gallery && (args[0]!==id && !f.created.some(n=>n.id===args[0]))) return {jsonrpc:'2.0',id:r.id,error:{code:3,message:'execution reverted',data:encodeErrorResult({abi:hookAbi,errorName:'UnknownNote'})}};
      if (functionName==='noteOf' && f.parentReadFail) return {jsonrpc:'2.0',id:r.id,error:{code:-32000,message:'Temporary parent read failure'}};
      if (f.offchain && functionName === 'symbol') return {jsonrpc:'2.0',id:r.id,error:{code:3,message:'execution reverted',data:'0x556f1830'+encodeAbiParameters([{type:'address'},{type:'string[]'},{type:'bytes'},{type:'bytes4'},{type:'bytes'}], [call.to,['https://attacker.example/{sender}/{data}'],'0x1234','0x12345678','0x']).slice(2)}};
      const resultValue = value(functionName,args,call.to);
      result = functionName==='observe'&&args.length===3 ? encodeAbiParameters([{type:'uint256'},{type:'uint256'}],resultValue) : encodeFunctionResult({abi,functionName,result:resultValue});
    } else if (r.method === 'eth_getTransactionByHash') { const t=f.requests[0]||{to:hook,data:'0x'};result={hash:tx,blockHash:toHex(f.head,{size:32}),blockNumber:toHex(f.head),transactionIndex:'0x0',from:author,to:t.to,input:t.data,value:'0x0',nonce:'0x0',gas:'0x5208',gasPrice:'0x1',type:'0x2',chainId:'0x1',maxFeePerGas:'0x1',maxPriorityFeePerGas:'0x1',v:'0x1',r:zeroHash,s:zeroHash}; }
    else if (r.method === 'eth_getTransactionReceipt' && f.delayReceipt) result = null;
    else if (r.method === 'eth_getTransactionReceipt') result = { transactionHash:tx, transactionIndex:'0x0', blockHash:toHex(f.head,{size:32}), blockNumber:toHex(f.head), from:author, to:hook, cumulativeGasUsed:'0x5208', gasUsed:'0x5208', effectiveGasPrice:'0x1', contractAddress:null, logs: f.traded ? receiptTradeLogs() : f.lastPosted ? [event('NotePosted',{...f.lastPosted.p,id:f.lastPosted.id,author:f.lastPosted.author},f.lastPosted.block)] : [], logsBloom:`0x${'0'.repeat(512)}`, status:'0x1', type:'0x2' };
    else throw Error(`Unhandled RPC ${r.method}`);
    return {jsonrpc:'2.0',id:r.id,result};
  } catch(e) { console.error('RPC fixture error:',e.message); return {jsonrpc:'2.0',id:r.id,error:{code:-32000,message:e.message}}; }
}
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server = createServer((req,res) => {
  let file = decodeURIComponent(req.url.split('?')[0]).replace(/^\/preview\//,'');
  if (req.url === '/' && f.appHost) file = 'app/index.html';
  if (file === '' || file.endsWith('/')) file += 'index.html';
  const p = path.join(dist,file);
  if (!p.startsWith(dist) || !fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type',mime[path.extname(p)] || 'application/octet-stream'); res.end(fs.readFileSync(p));
});
await new Promise(r => server.listen(0,'127.0.0.1',r));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const browser = await (process.env.BROWSER === 'webkit' ? webkit : chromium).launch({headless:true,timeout:30000});
const reports=[];
const metrics={};
let context,page,errors,external;
async function open(route='/',patch={}) {
  if(context) await context.close();
  reset(patch); errors=[]; external=[];
  context = await browser.newContext({viewport:{width:390,height:844},colorScheme:'light'});
  await context.addInitScript(({wallet,account,chain,sealed,hash,draft,savedTrade})=>{
    if(savedTrade) localStorage.setItem('marginalia.trade.v3',JSON.stringify(savedTrade));
    const handlers={};window.__walletAccount=a=>{account=a;handlers.accountsChanged?.(a?[a]:[]);};

    if(sealed) {localStorage.setItem('marginalia.seals',JSON.stringify({[hash]:draft}));localStorage.setItem('marginalia.prefill',JSON.stringify({draft,hash}));}
    window.__sent=[];
    if(wallet) window.ethereum={request:async({method,params})=>{
      if(method==='eth_accounts'||method==='eth_requestAccounts')return account?[account]:[];
      if(method==='eth_chainId')return chain;
      if(method==='wallet_switchEthereumChain'){if(chain!=='0x1'){chain='0x1';throw {code:4902,message:'unknown chain'};} return null;}
      if(method==='wallet_addEthereumChain'){window.__added=params;return null;}
      if(method==='eth_sendTransaction'){window.__sent.push(params[0]); return fetch('/__wallet',{method:'POST',body:JSON.stringify(params[0])}).then(async r=>{const v=await r.json();if(v.reject)throw {code:4001,message:'User rejected'};return v.hash;});}
      throw Error(`Unexpected wallet method ${method}`);
    },on:(name,cb)=>{handlers[name]=cb;},removeListener:name=>{delete handlers[name];}};
  },{wallet:f.wallet,account:f.account,chain:f.chain,sealed:f.sealAge!==null,hash,draft,savedTrade:f.savedTrade});
  await context.route('**/*',async route=>{
    const u=route.request().url();
    if(u.startsWith(new URL(url).origin+'/api/feedback/')) return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Feedback intake not mounted in this contract fixture.'})});
    if(manifest.network.rpcUrls.some(r=>u===r||u===r+'/')) {
      const req=JSON.parse(route.request().postData());
      const respond = r => {
        if(f.primaryRefusesHistory && u.startsWith(manifest.network.rpcUrls[0]) && r.method==='eth_getLogs' && BigInt(r.params[0].fromBlock)<f.head-7999n) {
          f.rpc.push(r);f.primaryFailures=(f.primaryFailures||0)+1;
          return {jsonrpc:'2.0',id:r.id,error:{code:-32602,message:'Archive requests require a personal token'}};
        }
        if(u.startsWith(manifest.network.rpcUrls[1]) && r.method==='eth_getLogs')f.secondaryReads=(f.secondaryReads||0)+1;
        return rpc(r);
      };
      const out=Array.isArray(req)?req.map(respond):respond(req);
      await route.fulfill({contentType:'application/json',body:JSON.stringify(out)});
    } else if(u.endsWith('/__wallet')) {
      const t=JSON.parse(route.request().postData());f.requests.push(t);
      if(!f.reject){const {functionName,args}=decodeFunctionData({abi,data:t.data});f.lastFn=functionName;
      if(functionName==='note'||functionName==='tradeAndNote') {const p=args[functionName==='note'?0:1];const n={p,id:toHex(f.created.length+2,{size:32}),author:f.account,at:f.now,block:f.head};f.created.push(n);f.lastPosted=n;if(p.parentId===id)f.children++;}
if(functionName==='deposit')f.wethBalance=(f.wethBalance??0n)+BigInt(t.value);if(functionName==='drip')f.dripped=true;if(functionName==='requestJudging')f.judgePending=true;if(functionName==='payJudged')f.paid=true;if(functionName==='registerHandle')f.registered=true;if(functionName==='buy')f.pagesHolding+=args[1];if(functionName==='sell'){f.pagesHolding-=args[1];f.sold=true;}if(functionName==='requestClaim'){f.claimPending=true;f.claimAge=0;}if(functionName==='abandonClaim')f.claimPending=false;if(functionName==='burn')f.burn-=args[0];if(functionName==='checkpointVenue')f.checkpointAge=0;if(functionName==='approve'){if(args[0].toLowerCase()===hook.toLowerCase())f.hookAllowance=args[1];else f.allowance=args[1];}if(functionName==='claimRefund')f.claimed=true;if(functionName==='claimDeposit')f.deposit=0n;}
      await route.fulfill({contentType:'application/json',body:JSON.stringify({reject:f.reject,hash:tx})});
    } else if(u.endsWith('/imd-deployment.json') && f.pages) { await route.fulfill({contentType:'application/json',body:JSON.stringify({...manifest,contracts:[...manifest.contracts,{name:'MarginaliaPages',address:pagesAddress,abiPath:'abi/MarginaliaPages.json',abiHash:keccak256(toHex(canon(pagesAbi))).slice(2)}]})}); } else if(u.startsWith(new URL(url).origin)) await route.continue();
    else {external.push(u);await route.abort();}
  });
  page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date(f.now*1000)});
  await page.goto(route==='landing'?url:url+'app/#'+route);
  await page.locator(route==='landing'?'footer':'.app-footer').waitFor({timeout:12000}).catch(async e=>{console.error('BOOT',await page.locator('body').innerText());throw e;});
  await page.getByRole('button',{name:'Refresh',exact:true}).waitFor({timeout:100}).catch(()=>{});
  await page.waitForTimeout(300);
}
const canon=v=>v===null?'null':Array.isArray(v)?`[${v.map(canon).join(',')}]`:typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`:JSON.stringify(v);
const text=()=>page.locator('main#main').innerText();
async function shot(name,fullPage=false){if(evidence)await page.screenshot({path:path.join(evidence,name+'.png'),fullPage});}
async function callForm() {
  await page.locator('#x').fill(marg);
  await page.getByLabel(/Launch pool/).check();
  await page.locator('#text').fill(draft.text);
  await page.waitForTimeout(200);
}
async function sent(fn){const all=await page.evaluate(()=>window.__sent);const entry=all.map(t=>({...t,...decodeFunctionData({abi,data:t.data})})).find(t=>t.functionName===fn);assert(entry,`No ${fn} wallet request`);return entry;}
let checkIndex=0;
async function check(name,fn){const index=checkIndex++;if(process.env.TEST_RANGE){const [start,end]=process.env.TEST_RANGE.split(':').map(Number);if(index<start||index>=end)return;}if(process.env.TEST_FILTER&&!name.includes(process.env.TEST_FILTER))return;try{await fn();assert.deepEqual(errors,[],'Browser script errors');assert.deepEqual(external,[],'Unexpected outside request'); reports.push({name,result:'pass'});console.log('PASS',name);}catch(e){reports.push({name,result:'FAIL',error:e.stack});console.error('FAIL',name,e.message);if(page)console.error((await page.locator('body').innerText()).slice(0,3500));process.exitCode=1;}}async function tradeReady(){await page.locator('#trade-why').fill('A tested call');await page.locator('.baseline-status').filter({hasText:'Baseline ready.'}).waitFor();}
async function waitEnabled(locator){await locator.waitFor();await page.waitForFunction(sel=>!document.querySelector(sel)?.disabled,await locator.evaluate(e=>{e.dataset.awaitEnabled='yes';return '[data-await-enabled="yes"]';}));}

const social = {gallery:true,social:true};
async function shareResult() {
 await page.evaluate(()=>{window.__cardText=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__cardText.push(text);return fill.call(this,text,...args);};});
 await page.locator('.profile > .share button').first().click();await page.locator('.profile > .share img').waitFor();
 return page.evaluate(()=>window.__cardText.join(' '));
}
const noOverflow=async(name)=>{for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});await page.waitForTimeout(70);const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);assert(scroll<=width,name+': '+width);(metrics[name]??=[]).push({width,scroll});}};
try {
 await check('Pages tab order, active state, pot destination and handle/address search', async()=>{
  await open('/',{catalog:true});
  assert.deepEqual(await page.locator('.bottom-bar').locator('a,button').allTextContents(),['Feed','Pages','+','Record','Me']);
  await page.locator('.bottom-bar').getByRole('link',{name:'Pages',exact:true}).click();
  await page.getByRole('heading',{name:'Pages',exact:true}).waitFor();
  assert.equal(await page.locator('.bottom-bar [aria-current]').innerText(),'Pages');
  assert.equal(await page.locator('.pot-chip').getAttribute('href'),'#/pools');
  for(const handle of ['@Market_Reader','market_reader','0xngmi']) {
   await page.locator('#pages-search').fill(handle);await page.getByRole('button',{name:'Find pages'}).click();
   await page.waitForURL(new RegExp('#/pages/'+handle.replace('@','').toLowerCase()+'$'));await page.locator('#page-amount').waitFor();
   await page.locator('.bottom-bar').getByRole('link',{name:'Pages',exact:true}).click();
  }
  await page.locator('#pages-search').fill('0x12345678901234567890');await page.getByRole('button',{name:'Find pages'}).click();await page.locator('#pages-search-error').waitFor();assert(await page.locator('#pages-search').evaluate(e=>e===document.activeElement));
  await page.locator('#pages-search').fill(author);await page.locator('#pages-search').press('Enter');await page.waitForURL(new RegExp('#/author/'+author+'$'));await page.locator('.profile').waitFor();
  assert.equal(f.requests.length,0);
 });
 await check('Directory ranks by verified backers then supply and shows names, counts and next cost',async()=>{
  await open('/pages',{catalog:true,identityName:'writer.imd'});await page.getByRole('button',{name:'Refresh pages',exact:true}).waitFor();
  assert.deepEqual(await page.locator('.page-subjects > li').evaluateAll(es=>es.map(e=>e.dataset.subject)),[handleSubject,authorSubject,otherSubject]);
  assert.match(await page.locator('.page-subjects > li').first().innerText(),/@market_reader.*2 backers.*5 pages.*Next page 0.055 IMD/s);
  await page.locator('.page-subjects .person strong').filter({hasText:'writer.imd'}).waitFor();
  assert.equal(await page.locator('.page-holdings > li').count(),2);
  const scans=f.rpc.filter(r=>r.method==='eth_getLogs'&&r.params[0].address.toLowerCase()===pages.toLowerCase());assert(scans.length>=6);for(const r of scans)assert(BigInt(r.params[0].toBlock)-BigInt(r.params[0].fromBlock)<2000n);
  for(const r of f.rpc.filter(r=>r.method==='eth_call'&&r.params[0].to.toLowerCase()===pages.toLowerCase())){const {functionName}=decodeFunctionData({abi,data:r.params[0].data});if(['subjects','buyPrice','pagesOf'].includes(functionName))assert.equal(r.params[1],toHex(f.head));}
  await shot('pages-light-390',true);
 });
 await check('Your pages sells one page with bounded output and no approval or eligibility gate',async()=>{
  await open('/pages',{catalog:true,pagesEligible:false,reject:false});await page.getByRole('button',{name:'Refresh pages',exact:true}).waitFor();
  const holding=page.locator('.page-holdings > li').first();await holding.getByText('Sell back',{exact:true}).click();
  assert.equal(await holding.getByLabel('Pages to sell').inputValue(),'1');
  await holding.getByText('You receive 0.045 IMD for 1 pages.',{exact:true}).waitFor();
  await waitEnabled(holding.getByRole('button',{name:'Sell pages',exact:true}));await holding.getByRole('button',{name:'Sell pages',exact:true}).click();
  await page.getByText('No verified holdings found.',{exact:true}).waitFor();
  const sell=await sent('sell');assert.equal(sell.to.toLowerCase(),pages.toLowerCase());assert.equal(sell.args[0],handleSubject);assert.equal(sell.args[1],1n);assert.equal(sell.args[2],44550000000000000n);assert.equal(f.requests.length,1);
 });
 await check('Directory discloses missing log ranges and unknown balances, refresh recovers',async()=>{
  await open('/pages',{catalog:true,pageLogsGap:true,balanceFail:true});await page.getByRole('button',{name:'Refresh pages',exact:true}).waitFor();
  await page.getByText(/Incomplete history/).click();assert.match(await text(),/26182753–26184752/);assert.match(await text(),/Counts and order are incomplete/);assert.match(await text(),/Backers unknown/);assert.match(await text(),/Your holdings may be incomplete/);
  f.pageLogsGap=false;f.balanceFail=false;await page.getByRole('button',{name:'Refresh pages',exact:true}).click();await page.getByRole('button',{name:'Refresh pages',exact:true}).waitFor();assert.equal(await page.locator('.pages-gaps').count(),0);assert.equal(await page.locator('.page-subjects > li').count(),3);assert(!/Backers unknown/.test(await text()));
 });
 await check('Directory empty and disconnected states retain search and wallet action',async()=>{
  await open('/pages',{wallet:false});await page.getByText('No pages held yet.',{exact:false}).waitFor();assert.match(await text(),/Connect your wallet to see your holdings/);assert(await page.getByRole('button',{name:'Find pages'}).isEnabled());assert(await page.getByRole('button',{name:'Connect wallet',exact:true}).isVisible());assert.equal(f.requests.length,0);
 });
 await check('Handle explanation, escrow and clock precede controls; default one and receive lines',async()=>{
  await open('/pages/market_reader',{registered:true,pagesHolding:2n});await page.locator('.handle-state').filter({hasText:'unclaimed · escrow 1 IMD'}).waitFor();
  const copy=await page.locator('.handle-escrow').innerText();for(const phrase of ['writer’s 8% in escrow','claims it with one tweet','90 days of the first trade','thesis pools','sell back to the curve at any time either way','Recycle date:'])assert(copy.includes(phrase));
  assert((await page.locator('.handle-escrow').boundingBox()).y<(await page.locator('#page-amount').boundingBox()).y);
  assert.equal(await page.locator('#page-amount').inputValue(),'1');assert.match(await text(),/you can hold up to 10/);
  await page.getByText('You receive 1 pages for 0.055 IMD (0.005 IMD fee).',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Sell',exact:true}).click();await page.getByText('You receive 0.045 IMD for 1 pages.',{exact:true}).waitFor();await shot('handle-light-390',true);
  await open('/pages/new_writer',{noClock:true,escrow:0n});await page.getByText('The 90-day clock starts with the first page trade.',{exact:true}).waitFor();assert.equal(await page.getByText(/Recycle date:/).count(),0);
 });
 await check('Claim exact message and X composer, URL parsing, exact approval then request, pending lock',async()=>{
  await open('/pages/market_reader',{registered:true,allowance:0n,reject:false});await page.getByText('Claim this handle',{exact:true}).click();
  const message=`I claim my Marginalia Pages payout on chain 1 for contract ${pages} to wallet ${author}`;
  await page.waitForFunction(m=>document.querySelector('#claim-message')?.value===m,message);
  const href=await page.getByRole('link',{name:'Post on X'}).getAttribute('href');assert.equal(new URL(href).searchParams.get('text'),message);
  await page.locator('#claim-tweet').fill('https://x.com/market_reader/status/1234567890123456789?s=20');
  const approve=page.getByRole('button',{name:'Approve 0.5 IMD for claim',exact:true});await waitEnabled(approve);assert.equal(await page.getByRole('button',{name:'Request claim',exact:true}).count(),0);
  await approve.click();const request=page.getByRole('button',{name:'Request claim',exact:true});await waitEnabled(request);const ap=await sent('approve');assert.equal(ap.to.toLowerCase(),imd.toLowerCase());assert.equal(ap.args[0].toLowerCase(),pages.toLowerCase());assert.equal(ap.args[1],unit/2n);
  await request.click();await page.locator('.claim-pending').waitFor();const req=await sent('requestClaim');assert.equal(req.to.toLowerCase(),pages.toLowerCase());assert.deepEqual(req.args,['market_reader',1234567890123456789n]);assert.equal(f.requests.length,2);assert.equal(await page.getByRole('button',{name:'Request claim',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Abandon unanswered claim',exact:true}).count(),0);assert.match(await text(),/You may delete the tweet once the claim has been answered/);await shot('claim-pending-light-390',true);
 });
 await check('Claim rejects hostile URL and changed live fee without a wallet request',async()=>{
  await open('/pages/market_reader',{registered:true,allowance:0n,reject:false});await page.getByText('Claim this handle',{exact:true}).click();await page.locator('#claim-tweet').fill('https://x.com.evil.test/a/status/123');await page.locator('#claim-tweet-error').waitFor();assert(await page.getByRole('button',{name:'Approve 0.5 IMD for claim',exact:true}).isDisabled());
  await page.locator('#claim-tweet').fill('123');await waitEnabled(page.getByRole('button',{name:'Approve 0.5 IMD for claim',exact:true}));f.oracleCost=unit;await page.getByRole('button',{name:'Approve 0.5 IMD for claim',exact:true}).click();await page.getByRole('alert').filter({hasText:'live oracle fee changed'}).waitFor();assert.equal(f.requests.length,0);
 });
 await check('Pending claim polls to answered payee and allows tweet deletion',async()=>{
  await open('/pages/market_reader',{registered:true,claimPending:true});await page.getByText('Claim this handle',{exact:true}).click();await page.locator('.claim-pending').waitFor();f.payee=other;f.claimPending=false;
  await page.clock.fastForward(16000);await page.getByText('Claim answered.',{exact:false}).waitFor();assert.match(await page.locator('.handle-state').innerText(),/Claimed payee/);assert.equal(await page.locator('.handle-state a').getAttribute('title'),other);assert.equal(await page.locator('.claim-pending').count(),0);assert.match(await text(),/You may delete the tweet/);assert.equal(f.requests.length,0);
 });
 await check('Pending deadline exposes abandon; answer without payee can retry',async()=>{
  await open('/pages/market_reader',{registered:true,claimPending:true,claimAge:3*86400-10,reject:false});await page.getByText('Claim this handle',{exact:true}).click();await page.locator('.claim-pending').waitFor();assert.equal(await page.getByRole('button',{name:'Abandon unanswered claim',exact:true}).count(),0);
  await page.clock.fastForward(16000);await page.getByRole('button',{name:'Abandon unanswered claim',exact:true}).click();await page.locator('#claim-tweet').waitFor();assert.match(await text(),/request closed without a payee/);assert.equal((await sent('abandonClaim')).args[0],handleSubject);
 });
 await check('Claim wallet rejection remains recoverable',async()=>{
  await open('/pages/market_reader',{registered:true,allowance:0n});await page.getByText('Claim this handle',{exact:true}).click();await page.locator('#claim-tweet').fill('123');const ap=page.getByRole('button',{name:'Approve 0.5 IMD for claim',exact:true});await waitEnabled(ap);await ap.click();await page.getByRole('alert').filter({hasText:/rejected/i}).waitFor();assert(await ap.isEnabled());assert.equal(f.requests.length,1);
 });
 await check('Claim wallet changes reset tweet and preserve the exact new payee sentence',async()=>{
  await open('/pages/market_reader',{registered:true});await page.getByText('Claim this handle',{exact:true}).click();await page.locator('#claim-tweet').fill('123');await page.evaluate(a=>window.__walletAccount(a),other);
  await page.waitForFunction(a=>document.querySelector('#claim-message')?.value.endsWith(a),other);assert.equal(await page.locator('#claim-tweet').inputValue(),'');assert(await page.getByRole('button',{name:'Request claim',exact:true}).isDisabled());assert.equal(f.requests.length,0);
 });
 await check('Weekly pot fixed decimals and responsive label; exact caveats',async()=>{
  await open('/',{pool:5215n*unit/10n});await page.setViewportSize({width:1440,height:844});await page.locator('.pot-wide').filter({hasText:'Weekly pot ◈ 521.5000 IMD'}).waitFor();assert.equal(await page.locator('.pot-chip').innerText(),'Weekly pot ◈ 521.5000 IMD');await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.pot-chip').innerText(),'◈ 521.5 IMD');
  const caveat='Built, audited and deployed by the identity.md swarm, an open network of AI agents, with a review on our side. The contracts cannot be changed; the site is rebuilt by the swarm, never hot-fixed. New: it can break, misprice, or refuse to do what it says. Nothing here is advice. Post with an amount you are willing to lose.';
  await open('landing');assert.equal(await page.locator('.caveat').innerText(),caveat);assert((await page.locator('.launch-app').boundingBox()).y<844);
  await open('/about');assert.equal(await page.locator('.caveat').innerText(),caveat);
  await open('/call');await tradeReady();assert.equal(await page.locator('.trade-action .send-caveat').innerText(),"Contracts can't change; the site gets rebuilt. Can break. Not advice.");
 });
 await check('Thesis share uses first sentence and status; call keeps target and status',async()=>{
  await open('/',social);await page.getByRole('button',{name:'Theses',exact:true}).click();const card=page.locator('.social-card');await card.getByRole('button',{name:'Share',exact:true}).click();await page.getByLabel('Share text').waitFor();assert.match(await page.getByLabel('Share text').inputValue(),/Marginalia note No. 3 by 0x1111…1111: An argument for the week: usage should matter more than a passing narrative\. thesis open\./);
  await open('/note/'+toHex(3,{size:32}),social);await page.getByRole('button',{name:'Share',exact:true}).click();await page.getByLabel('Share text').waitFor();assert.match(await page.getByLabel('Share text').inputValue(),/usage should matter.*thesis open/);
  await open('/note/'+toHex(1,{size:32}),social);await page.getByRole('button',{name:'Share',exact:true}).click();await page.getByLabel('Share text').waitFor();assert.match(await page.getByLabel('Share text').inputValue(),/25%.*open\./);
 });
 await check('Annex call share retains target and status',async()=>{
  await open('/note/'+toHex(2,{size:32}),social);const share=page.locator('main > .share');await share.getByRole('button',{name:'Share',exact:true}).click();await share.getByLabel('Share text').waitFor();assert.match(await share.getByLabel('Share text').inputValue(),/Marginalia Annex call.*25%.*open/);
 });
 await check('Pages rendered contrast, normal phone first screen and focus in both themes',async()=>{
  for(const dark of [false,true]){
   await open('/pages',{catalog:true,pool:5215n*unit/10n,identityName:'writer.imd'});await page.getByRole('button',{name:'Refresh pages',exact:true}).waitFor();await page.emulateMedia({colorScheme:dark?'dark':'light',reducedMotion:'reduce'});await page.waitForTimeout(200);
   const measured=await page.evaluate(()=>{
    const channels=color=>color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
    const lum=color=>{const v=channels(color);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
    const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const bg=getComputedStyle(document.body).backgroundColor;
    const result={};for(const selector of ['.page-handle','.page-subject-stats','.pages-search button']){
     const style=getComputedStyle(document.querySelector(selector));const background=selector==='.pages-search button'?style.backgroundColor:bg;
     result[selector]={foreground:style.color,background,contrast:ratio(style.color,background)};
    }return result;
   });
   metrics[dark?'contrast-dark':'contrast-light']=measured;for(const value of Object.values(measured))assert(value.contrast>=4.5);
   const button=await page.getByRole('button',{name:'Find pages'}).boundingBox();assert(button.y+button.height<844);
   await page.locator('#pages-search').focus();await page.keyboard.press('Tab');await shot('pages-final-'+(dark?'dark':'light')+'-390');
  }
 });
 await check('Claim field and request stay clear of phone navigation when focused',async()=>{
  for(const width of [320,390]){
   await open('/pages/market_reader',{registered:true});await page.setViewportSize({width,height:844});await page.getByText('Claim this handle',{exact:true}).click();await page.locator('#claim-tweet').fill('123');
   const field=await page.locator('#claim-tweet').boundingBox();const nav=await page.locator('.bottom-bar').boundingBox();assert(field.y>=0&&field.y+field.height<=nav.y,'Focused tweet field is obscured by bottom navigation');
   await page.getByRole('button',{name:'Request claim',exact:true}).focus();const action=await page.getByRole('button',{name:'Request claim',exact:true}).boundingBox();assert(action.y>=0&&action.y+action.height<=nav.y,'Focused request is obscured');
   metrics['claimFocus'+width]={field,action,nav};await shot('claim-focused-'+width);
  }
 });
 await check('Changed screens reflow at 320/390/1440 in both themes, keyboard focus and long pot',async()=>{
  for(const dark of [false,true])for(const route of ['/pages','/pages/market_reader']){
   await open(route,{catalog:route==='/pages',registered:true,pagesHolding:10n,pool:1234567890123456789n*unit});await page.emulateMedia({colorScheme:dark?'dark':'light',reducedMotion:'reduce'});
   if(route==='/pages/market_reader'){await page.getByText('Claim this handle',{exact:true}).click();await page.locator('#claim-tweet').fill('https://x.com/market_reader/status/1234567890123456789');}
   await noOverflow(route+(dark?' dark':' light'));assert(!/\bscore\b/i.test(await text()));await page.setViewportSize({width:390,height:844});await shot((route==='/pages'?'pages':'claim')+(dark?'-dark':'-light')+'-390',true);
  }
  await open('/pages',{catalog:true});await page.locator('#pages-search').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Find pages');assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');await shot('pages-keyboard-390');
 });
} finally {
 if(evidence){fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify(reports,null,2));fs.writeFileSync(path.join(evidence,'metrics.json'),JSON.stringify(metrics,null,2));}
 await context?.close();await browser.close();server.close();
}
