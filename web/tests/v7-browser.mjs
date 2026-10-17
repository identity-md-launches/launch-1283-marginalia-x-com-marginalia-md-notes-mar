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
  if(f.weekNotes) return f.weekNotes;
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
      out.push(event('NotePosted',{...n,x:marg,class:n.class??1,horizonDays:n.horizonDays??30},n.block ?? f.head-BigInt(2500-i*100), i));
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
  const time = f.weekNotes?.find(row=>row.block===n)?.at ?? (n === (f.noteBlock ?? f.head-2500n) ? f.now - (f.noteAge ?? 90000) : n === f.head-1200n ? f.now-(f.sealAge || 14400) : f.now - Number(f.head-n)*12);
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
  if (fn === 'paid') return f.weekPots ? !!f.weekPots[args[0]]?.paid : !!f.paid;
  if (fn === 'lastDripDay') return f.dripped ? Math.floor(f.now/86400) : Math.floor(f.now/86400)-1;
  if (fn === 'requestJudging') return tx;
  if (['payJudged','abandonRequest','drip','retract'].includes(fn)) return undefined;

  if (fn === 'validateVenue') return args[0].venue;
  if (fn === 'priceWindows') return [f.checkpointAge === null ? 0n : BigInt(f.now-f.checkpointAge),0n,0n,0n,0n,0n,0n];
  if (fn === 'seals') return f.sealAge !== null && args[0].toLowerCase() === sealKey.toLowerCase() ? [BigInt(f.now-f.sealAge),unit,unit,unit, f.wrongSubject ? zeroHash : subject] : [0n,0n,0n,0n,zeroHash];
  if (fn === 'records' && f.social) { return args[0].toLowerCase()===treasury.toLowerCase()?[999999n,1,0,0,0,0,0]:args[0].toLowerCase()===author?[10n,8,5,1,1,0,0]:[9999n,8,10,2,2,0,0]; }
  if (fn === 'records') { if(f.newAuthor) return [0n,0,0,0,0,0,0]; return args[0].toLowerCase() === other.toLowerCase() ? [12500n,3,2,0,0,0,0] : [45000n,5,2,1,1,1,0]; }
  if (fn === 'eligibleTheses' && f.weekPots) return f.weekPots[args[0]]?.eligible ?? [];
  if (fn === 'thesisPool' && f.weekPots) return f.weekPots[args[0]]?.pool ?? 0n;
  if (fn === 'paid' && f.weekPots) return !!f.weekPots[args[0]]?.paid;
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
async function check(name,fn){if(process.env.TEST_FILTER&&!name.includes(process.env.TEST_FILTER))return;try{await fn();assert.deepEqual(errors,[],'Browser script errors');assert.deepEqual(external,[],'Unexpected outside request'); reports.push({name,result:'pass'});console.log('PASS',name);}catch(e){reports.push({name,result:'FAIL',error:e.stack});console.error('FAIL',name,e.message);if(page)console.error((await page.locator('body').innerText()).slice(0,3500));process.exitCode=1;}}async function tradeReady(){await page.locator('#trade-why').fill('A tested call');await page.locator('.baseline-status').filter({hasText:'Baseline ready.'}).waitFor();}
async function waitEnabled(locator){await locator.waitFor();await page.waitForFunction(sel=>!document.querySelector(sel)?.disabled,await locator.evaluate(e=>{e.dataset.awaitEnabled='yes';return '[data-await-enabled="yes"]';}));}

const social = {gallery:true,social:true};
async function shareResult() {
 await page.evaluate(()=>{window.__cardText=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__cardText.push(text);return fill.call(this,text,...args);};});
 await page.locator('.profile > .share button').first().click();await page.locator('.profile > .share img').waitFor();
 return page.evaluate(()=>window.__cardText.join(' '));
}
const noOverflow=async(name)=>{for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});await page.waitForTimeout(70);const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);assert(scroll<=width,name+': '+width);(metrics[name]??=[]).push({width,scroll});}};

const fixedNow=1792224000, current=Math.floor(fixedNow/604800), previous=current-1;
const thesisId=n=>toHex(n,{size:32});
const thesis=(n,week,age,patch={})=>({id:thesisId(n),author,side:0,targetBps:0,horizonDays:0,parentId:zeroHash,status:6,text:'An argument for the week.',children:0,block:deploy+BigInt(n*100),at:fixedNow-age,...patch});
const weekly=()=>({now:fixedNow,head:deploy+41000n,gallery:true,weekNotes:[
 thesis(1,previous,4*86400,{children:1}),thesis(2,previous,5*86400),thesis(3,previous,8*86400),
 thesis(4,current,3600,{block:deploy+40000n}),
],weekPots:{[previous]:{pool:507645840223181205005n,eligible:[thesisId(1)]},[current]:{pool:0n,eligible:[]}}});
const waitWeek=()=>page.locator('.your-week li').first().waitFor();
try {
 await check('Me shows eligible, needs-call local deadline and forfeitable lines above the profile',async()=>{
  await open('/author/'+author,weekly());await waitWeek();
  const lines=await page.locator('.your-week li').allTextContents();assert.equal(lines.length,3);
  assert(lines.includes(`Thesis No. 1, week ${previous}: eligible for the 507.645 IMD pot`));
  assert(lines.some(line=>line.startsWith(`Thesis No. 2, week ${previous}: needs your call under it by `)&&/\(.*left\)/.test(line)));
  assert(lines.includes(`Thesis No. 3, week ${previous}: grace ended, forfeitable`));
  const child=page.locator('.your-week a');assert.equal(await child.getAttribute('href'),`#/post?child=${thesisId(2)}`);
  assert(await page.locator('.your-week').evaluate(e=>!!(e.compareDocumentPosition(document.querySelector('.profile-identity'))&Node.DOCUMENT_POSITION_FOLLOWING)));
  await child.click();await page.locator('#parent').waitFor();assert.equal(await page.locator('#parent').inputValue(),thesisId(2));assert.equal(f.requests.length,0);
 });
 await check('No thesis in an open week, disconnected wallet and another profile show no Your week block',async()=>{
  for(const patch of [{weekNotes:[]},{account:other},{wallet:false}]){await open('/author/'+author,{...weekly(),...patch});assert.equal(await page.locator('.your-week').count(),0);}
 });
 await check('Every unpaid funded week is read; paid and empty weeks disappear',async()=>{
  const patch=weekly();patch.weekPots[current]={pool:20n*unit,eligible:[thesisId(4)]};
  await open('/author/'+author,patch);await page.locator('.your-week li').filter({hasText:'Thesis No. 4'}).waitFor();assert.equal(await page.locator('.your-week li').count(),4);
  patch.weekPots[previous].paid=true;await open('/author/'+author,patch);await waitWeek();assert.equal(await page.locator('.your-week li').count(),1);
 });
 await check('Pots defaults to latest funded unpaid chain week and shows connected thesis lines plus eligibility explanation',async()=>{
  await open('/pools',weekly());await waitWeek();assert.equal(await page.locator('#judge-week').inputValue(),String(previous));
  assert.equal(await page.locator('.your-week li').count(),3);
  const sentence=page.getByText('An eligible thesis is one whose author posted a call under it within 7 days of the thesis.',{exact:true});await sentence.waitFor();
  assert(await sentence.evaluate(e=>!!(e.compareDocumentPosition([...document.querySelectorAll('p')].find(p=>p.textContent.includes('eligible theses ·')))&Node.DOCUMENT_POSITION_FOLLOWING)));
  await page.locator('#judge-week').fill(String(current));await page.getByText('0 eligible theses · 0 IMD',{exact:false}).waitFor();await page.locator('.your-week').waitFor({state:'hidden'});
  assert.equal(await page.locator('#judge-week').inputValue(),String(current));
 });
 await check('Pots skips a paid newest pool and works without a connected wallet',async()=>{
  const patch=weekly();patch.weekPots[current]={pool:unit,paid:true,eligible:[]};patch.wallet=false;
  await open('/pools',patch);await page.waitForFunction(w=>document.querySelector('#judge-week')?.value===String(w),previous);assert.equal(await page.locator('.your-week').count(),0);
 });
 await check('Existing child keeps exact feed badge and removes every post-child action on the thesis page',async()=>{
  await open('/',{gallery:true,social:true,childPosted:true});await page.getByRole('button',{name:'Theses',exact:true}).click();await page.getByRole('link',{name:'Child call posted (No. 4)',exact:true}).waitFor();
  await page.goto(url+'app/#/note/'+thesisId(3));await page.getByRole('heading',{name:/Note № 3/}).waitFor();assert.equal(await page.locator('a[href*="child="]').count(),0);assert(await page.getByRole('link',{name:'Child call posted (No. 4)',exact:true}).count()>0);
  await open('/',{gallery:true,social:true});await page.getByRole('button',{name:'Theses',exact:true}).click();await page.getByText('Needs its child call within 7 days.',{exact:true}).waitFor();
 });
 await check('Feedback has no entry, composer, signing or history/API reads; old aliases resolve',async()=>{
  for(const route of ['/feedback','/?tab=feedback']){
   await open(route);assert.equal(await page.getByRole('link',{name:'Feedback',exact:true}).count(),0);
   assert.equal(await page.locator('main p').innerText(),'Feedback intake is paused. Reach us on X at @marginalia_md.');
   assert.equal(await page.getByRole('link',{name:'@marginalia_md'}).getAttribute('href'),'https://x.com/marginalia_md');
   assert.equal(await page.locator('main form, main textarea, main input').count(),0);assert.equal(f.rpc.filter(r=>r.method==='eth_getLogs').length,0);assert.equal(f.requests.length,0);
  }
  await open('landing');assert.equal(await page.locator('a[href*="feedback"]').count(),0);
 });
 await check('Automatic scan reaches deploy block in one load and retains complete summary/coverage',async()=>{
  await open('/',{noteBlock:deploy+100n,head:deploy+41000n});await page.locator('.social-card').waitFor();await page.getByText('History complete',{exact:true}).waitFor();
  const ranges=f.rpc.filter(r=>r.method==='eth_getLogs'&&r.params[0].address.toLowerCase()===hook.toLowerCase()).map(r=>[BigInt(r.params[0].fromBlock),BigInt(r.params[0].toBlock)]);
  assert(ranges.some(([a])=>a===deploy));assert(ranges.every(([a,b])=>b-a<2000n));assert.equal(await page.getByRole('button',{name:'Load more history',exact:true}).count(),0);
  await page.locator('.history summary').click();await page.getByText(/Covered blocks · Hook/).waitFor();
 });
 await check('Changed Me and Pots fit 320/390/1440, both themes, long values and keyboard child link',async()=>{
  for(const dark of [false,true])for(const route of ['/author/'+author,'/pools']){
   await open(route,weekly());await waitWeek();await page.emulateMedia({colorScheme:dark?'dark':'light',reducedMotion:'reduce'});await noOverflow(route+(dark?' dark':' light'));
   await page.setViewportSize({width:390,height:844});if(route.startsWith('/author')){const first=await page.locator('.your-week').boundingBox();assert(first.y+first.height<844);await page.locator('.your-week a').focus();assert.notEqual(await page.locator('.your-week a').evaluate(e=>getComputedStyle(e).outlineStyle),'none');}
   const measured=await page.evaluate(()=>{
    const lum=color=>{const v=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return .2126*v[0]+.7152*v[1]+.0722*v[2];};
    const bg=getComputedStyle(document.body).backgroundColor;
    return ['.your-week li','.your-week a'].map(selector=>{const color=getComputedStyle(document.querySelector(selector)).color;return {selector,color,background:bg,contrast:(Math.max(lum(color),lum(bg))+.05)/(Math.min(lum(color),lum(bg))+.05)};});
   });metrics[(dark?'dark':'light')+'EligibilityContrast']=measured;for(const value of measured)assert(value.contrast>=4.5);
   await shot((route.startsWith('/author')?'me':'pots')+(dark?'-dark':'-light')+'-390',true);
   if(route==='/pools')await page.locator('#judge-week').scrollIntoViewIfNeeded();else await page.evaluate(()=>scrollTo(0,0));
   await shot((route.startsWith('/author')?'me':'pots')+(dark?'-dark':'-light')+'-viewport-390');
  }
 });
} finally {
 if(evidence){fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify(reports,null,2));fs.writeFileSync(path.join(evidence,'metrics.json'),JSON.stringify(metrics,null,2));}
 await context?.close();await browser.close();server.close();
}
