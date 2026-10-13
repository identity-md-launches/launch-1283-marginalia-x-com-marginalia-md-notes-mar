// Browser regressions against the production export. v4: home trade scenarios open #/call (the one call flow);
// scenarios that drove the removed composer tabs are marked SUPERSEDED and skipped with a reason. No RPC request or transaction leaves the fixture.
// Uses the project's viem and an independently installed Playwright (PLAYWRIGHT_MODULE).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodeFunctionData, encodeFunctionResult, encodeAbiParameters, encodeEventTopics, keccak256, toHex, parseAbi, zeroAddress, zeroHash, maxUint256 } from 'viem';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.env.SITE_DIR || path.join(here, '../../dist'));
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'imd-deployment.json')));
const pagesAddress=manifest.contracts.find(c=>c.name==='MarginaliaPages').address; // v4: live Pages from the runtime manifest
const wethPool='0x5555555555555555555555555555555555555555';
const usdPool='0x4444444444444444444444444444444444444444';


const evidence = process.env.EVIDENCE_DIR;
if (evidence) fs.mkdirSync(evidence, { recursive: true });
const annex = manifest.contracts.find(c => c.name === 'MarginaliaAnnex').address;
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
const poolId = keccak256(encodeAbiParameters([{ type: 'tuple', components: [{name:'currency0',type:'address'}, {name:'currency1',type:'address'}, {name:'fee',type:'uint24'}, {name:'tickSpacing',type:'int24'}, {name:'hooks',type:'address'}] }], [poolKey]));
const venue = { kind: 1, ref: poolId, quote: imd, xIsToken0: false };
const draft = { x: marg, venueKey: `v4:${poolId}`, side: 0, pct: '25', horizonDays: '30', text: 'A review call with a target.', parentId: '' };
const subject = keccak256(encodeAbiParameters([{ type: 'address' }, venueType], [marg, venue]));
const hash = keccak256(encodeAbiParameters([{type:'address'},{type:'address'},venueType,{type:'uint8'},{type:'uint32'},{type:'uint16'},{type:'bytes32'},{type:'string'}], [author,marg,venue,0,12500,30,zeroHash,draft.text]));
const sealKey = keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [author, hash]));
const id = toHex(1, { size: 32 });
const tx = toHex(123, { size: 32 });
let f;
const reset = (patch = {}) => { f = { now: Math.floor(Date.now()/1000), head: 26180000n, notes: true, status: 1, deposit: unit/4n, allowance: 100n*unit, claimed: false, pool: unit, count: 1, closed: true, checkpointAge: 7200, sealAge: null, symbol: 'MARG', decimals: 18, token: marg, wallet: true, account: author, chain: '0x1', observe: false, reject: true, requests: [], rpc: [], usd:true, registered:false, pagesHolding:0n, pagesEligible:true, claimPending:false, burn:0n, ...patch }; };
function event(name, values, block, logIndex = 0) {
  const ev = hookAbi.find(a => a.type === 'event' && a.name === name);
  return { address: f.annexNotes ? annex : hook, topics: encodeEventTopics({ abi: [ev], eventName: name, args: values }), data: encodeAbiParameters(ev.inputs.filter(i => !i.indexed), ev.inputs.filter(i => !i.indexed).map(i => values[i.name])), blockNumber: toHex(block), blockHash: toHex(block, {size:32}), transactionHash: tx, transactionIndex: '0x0', logIndex: toHex(logIndex), removed: false };
}
function gallery() {
  return [
    {id:toHex(1,{size:32}),author,side:0,targetBps:15000,parentId:zeroHash,status:1,text:'https://x.com/market_reader/status/123456 Supply is falling while fees grow. The record will tell.'},
    {id:toHex(2,{size:32}),author:other,side:1,targetBps:7500,parentId:toHex(1,{size:32}),status:0,text:'The fee spike is temporary. New supply will absorb it before this horizon.'},
    {id:toHex(3,{size:32}),author,side:1,targetBps:7500,parentId:zeroHash,status:2,text:'twitter.com/market_reader/status/789012 The market has priced in next quarter already.'},
    {id:toHex(4,{size:32}),author:other,side:0,targetBps:20000,parentId:zeroHash,status:1,text:'A hard target, on the record. Usage must keep growing to reach it.'},
  ];
}
function logs() {
  const out = [];
  if (f.gallery) {
    for (const [i,n] of gallery().entries()) {
      out.push(event('NotePosted',{...n,x:marg,class:1,horizonDays:30},f.head-BigInt(2500-i*100), i));
      if (n.status !== 0) out.push(event('Settled',{id:n.id,status:n.status,settlePrice:unit,scoreDelta:n.status===1 ? 15000n : -10000n,keeper:author},f.head-BigInt(100-i),i+20));
    }
  } else if (f.notes) {
    out.push(event('NotePosted', {id, author, x: f.token, class:1, side:0, targetBps:f.thesis ? 0 : 12000, horizonDays:f.thesis ? 0 : 30, parentId:zeroHash, text:'A review note: the evidence matters more than the result.'}, f.noteBlock ?? f.head - 2500n));
    if (f.extraNoteBlock) out.push(event('NotePosted', {id:toHex(2,{size:32}), author, x:f.token, class:1, side:0, targetBps:12000, horizonDays:30, parentId:zeroHash, text:'A note posted while the author was away.'}, f.extraNoteBlock));
    if (f.observe) out.push(event('Observed', {id,xRead:123456n,balance:f.sentinel ? maxUint256 : 5000000n}, f.head-100n, 1));
    if (f.status === 5) out.push(event('Settled', {id,status:5,settlePrice:0n,scoreDelta:-5000n,keeper:zeroAddress}, f.head-90n, 2));
  }
  if (f.sealAge !== null) out.push(event('Sealed', {hash,author,x:marg,venueRef:poolId}, f.head-1200n, 3));
  return out;
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
  if(fn==='primaryOf') return [0n,'',false];

  const constants = { hook, pricer:treasury, router, judge, treasury, imd, token:marg, UNIV3_FACTORY:v3, UNIV2_FACTORY:v2, WETH:weth, STAMP:unit/10n, MARG_BUY:unit/4n, BOND_MIN:unit/4n, BOND_MAX:10n*unit, SEAL_MIN:1800n, SEAL_MAX:21600n, SETTLE_WINDOW:21600n, THESIS_GRACE:604800n, SWEEP_AFTER:2419200n, TEXT_MAX:280n, THESIS_TEXT_MAX:8192n, MIN_TARGET_DELTA_BPS:1000, MAX_HORIZON_DAYS:90, KEEPER_BPS:1000n, JUDGE_THRESHOLD:2n*unit, poolId, getPoolKey:poolKey, margPriceInImd:unit, getLiquidity:1000000n*unit, noteCount: f.notes ? 1n : 0n };
  if (fn in constants) return constants[fn];
  if (fn === 'symbol') return address.toLowerCase() === imd.toLowerCase() ? 'IMD' : f.symbol;
  if (fn === 'decimals') { if(f.noDecimals) throw Error('decimals unavailable'); return f.decimals; }
  if (fn === 'balanceOf' && f.wethMarket && address.toLowerCase()===weth.toLowerCase()) return f.wethBalance ?? 0n;
  if (fn === 'balanceOf') return f.balance ?? 100n*unit;
  if (fn === 'allowance') return args[1].toLowerCase() === hook.toLowerCase() ? (f.hookAllowance ?? f.allowance) : f.allowance;
  if (fn === 'getPool' && f.wethMarket && args[2]===3000 && args.some(a=>typeof a==='string'&&a.toLowerCase()===marg.toLowerCase()) && args.some(a=>typeof a==='string'&&a.toLowerCase()===weth.toLowerCase())) return wethPool;
  if (fn === 'getPool') return f.usd && args.some(a=>typeof a==='string'&&a.toLowerCase()===usdc.toLowerCase()) && args[2]===3000 ? usdPool : zeroAddress;
  if (fn === 'getPair') return zeroAddress;
  if (fn === 'getSlot0') return [1n<<96n,0,0,12500];
  if (fn === 'slot0' && address.toLowerCase()===wethPool.toLowerCase()) return [1n<<96n,0,0,1,1,0,true];
  if (fn === 'tickSpacing') return 60;
  if (fn === 'fee') return 3000;
  if (fn === 'slot0') return [1000000n*(1n<<96n),0,0,1,1,0,true];
  if (fn === 'token0') return address.toLowerCase()===wethPool.toLowerCase()?weth:usdc;
  if (fn === 'token1') return address.toLowerCase()===wethPool.toLowerCase()?marg:imd;
  if (fn === 'liquidity') return 1000000n*unit;
  if (fn === 'getTickBitmap' || fn==='tickBitmap') return 0n;
  if (fn === 'observe' && args.length===3) return [unit,unit];
  if (fn === 'postPrice') return unit;
  if (fn === 'hookAllowedFor') return true;
  if (fn === 'intake') return treasury;
  if (fn === 'action') return zeroHash;
  if (fn === 'annex') return annex;
  if (fn === 'priceOf') return unit/2n;
  if (fn === 'admittedHook') return false;
  if (fn === 'subjectOf') return toHex(BigInt(args[0]),{size:32});
  if (fn === 'subjectOfHandle' || fn==='registerHandle') return keccak256(toHex('x:'+args[0].toLowerCase()));
  if (fn === 'registeredHandle') return f.registered;
  if (fn === 'subjects') return [f.pagesHolding,zeroAddress,unit,BigInt(f.now-86400)];
  if (fn === 'claims') return [f.claimPending ? tx : zeroHash,author,unit/2n,f.claimPending?BigInt(f.now-4*86400):0n];
  if (fn === 'pendingBurn') return f.burn;
  if (fn === 'buyPrice') return [unit/20n*args[1],unit/200n*args[1]];
  if (fn === 'sellPrice') return [unit/20n*args[1],unit/200n*args[1]];
  if (fn === 'pagesOf') return f.pagesHolding;
  if (fn === 'eligible') return f.pagesEligible;
  if (fn === 'claimMessage') return `I claim this handle on chain 1 for contract ${pagesAddress} to wallet ${author}`;
  if (fn === 'CLAIM_WINDOW') return 90n*86400n;
  if (fn === 'ANSWER_DEADLINE') return 3n*86400n;
  if (['buy','sell','burn','abandonClaim','recycle','deposit'].includes(fn)) return undefined;
  if (['requestClaim','requestAdmission'].includes(fn)) return tx;
  if (fn === 'tradeAndNote') { if(f.simFail) throw Error('Slippage: simulated output is below the minimum'); return unit; }
  if (fn === 'post') return keccak256(toHex('annex-note'));
  if (fn === 'observationsOf') return [];
  if (fn === 'horizonEnd') return BigInt(f.horizonEnd ?? f.now+86400);
  if (fn === 'requestedAt') return f.judgePending ? BigInt(f.now-4*86400) : 0n;
  if (fn === 'requestOf') return f.judgePending ? tx : zeroHash;
  if (fn === 'paid') return !!f.paid;
  if (fn === 'lastDripDay') return f.dripped ? Math.floor(f.now/86400) : Math.floor(f.now/86400)-1;
  if (fn === 'requestJudging') return tx;
  if (['payJudged','abandonRequest','drip','retract'].includes(fn)) return undefined;

  if (fn === 'validateVenue') return args[0].venue;
  if (fn === 'priceWindows') return [f.checkpointAge === null ? 0n : BigInt(f.now-f.checkpointAge),0n,0n,0n,0n,0n,0n];
  if (fn === 'seals') return f.sealAge !== null && args[0].toLowerCase() === sealKey.toLowerCase() ? [BigInt(f.now-f.sealAge),unit,unit,unit, f.wrongSubject ? zeroHash : subject] : [0n,0n,0n,0n,zeroHash];
  if (fn === 'records') { if(f.newAuthor) return [0n,0,0,0,0,0,0]; return args[0].toLowerCase() === other.toLowerCase() ? [12500n,3,2,0,0,0,0] : [45000n,5,2,1,1,1,0]; }
  if (fn === 'eligibleTheses') return f.emptyPrize ? [] : [toHex(5,{size:32})];
  if (fn === 'today') return Math.floor(f.now/86400);
  if (fn === 'week') return Math.floor(f.now/604800);
  if (fn === 'refundPool' || fn === 'thesisPool') return f.pool;
  if (fn === 'notesPerDay') return f.count;
  if (fn === 'refundClaimed') return f.claimed;
  if (fn === 'judgedPaid' || fn === 'judgedSet') return !!f.judged;
  if (fn === 'weekClosed') return f.closed;
  if (fn === 'noteOf' && f.gallery) { const n = gallery().find(n => n.id === args[0]); return {author:n.author,x:marg,side:n.side,targetBps:n.targetBps,horizonDays:30,class:1,status:n.status,postPrice:unit,postBalance:5000000n,deposit:n.status===0 ? unit/4n : 0n,parentId:n.parentId,children:0}; }
  if (fn === 'noteOf') return {author,x:f.token,side:0,targetBps:f.thesis ? 0 : 12000,horizonDays:f.thesis ? 0 : 30,class:1,status:f.status,postPrice:unit,postBalance:5000000n,deposit:f.deposit,parentId:zeroHash,children:0};
  if (fn === 'approve') return true;
  if (fn === 'note') return id;
  if (['checkpointVenue','seal','sweep','claimDeposit','claimRefund','observe','settle','settleThesis'].includes(fn)) return undefined;
  throw Error(`Unhandled function ${fn}`);
}
function rpc(r) {
  f.rpc.push(r);
  try {
    let result;
    if (r.method === 'eth_chainId') result = '0x1';
    else if (r.method === 'eth_getCode') result = f.noCode ? '0x' : '0x6000';
    else if (r.method === 'eth_getBalance') result = toHex(5n*unit);
    else if (r.method === 'eth_blockNumber') result = toHex(f.head);
    else if (r.method === 'eth_getBlockByNumber') result = block(r.params[0]);
    else if (r.method === 'eth_getLogs') {
      const q = r.params[0];
      if ((f.failLogs && BigInt(q.fromBlock) < f.head-2000n) || (f.refuseBefore && BigInt(q.fromBlock) < f.refuseBefore)) return {jsonrpc:'2.0',id:r.id,error:{code:-32602,message:'Archive requests require a personal token'}};
      result = logs().filter(l => l.address.toLowerCase()===q.address.toLowerCase() && BigInt(l.blockNumber) >= BigInt(q.fromBlock) && BigInt(l.blockNumber) <= BigInt(q.toBlock) && (!q.topics?.[0] || (Array.isArray(q.topics[0]) ? q.topics[0].includes(l.topics[0]) : q.topics[0] === l.topics[0])));
    } else if (r.method === 'eth_call') {
      const call = r.params[0]; const {functionName,args=[]} = decodeFunctionData({abi,data:call.data});
      if (f.offchain && functionName === 'symbol') return {jsonrpc:'2.0',id:r.id,error:{code:3,message:'execution reverted',data:'0x556f1830'+encodeAbiParameters([{type:'address'},{type:'string[]'},{type:'bytes'},{type:'bytes4'},{type:'bytes'}], [call.to,['https://attacker.example/{sender}/{data}'],'0x1234','0x12345678','0x']).slice(2)}};
      const resultValue = value(functionName,args,call.to);
      result = functionName==='observe'&&args.length===3 ? encodeAbiParameters([{type:'uint256'},{type:'uint256'}],resultValue) : encodeFunctionResult({abi,functionName,result:resultValue});
    } else if (r.method === 'eth_getTransactionByHash') { const t=f.requests[0]||{to:hook,data:'0x'};result={hash:tx,blockHash:toHex(f.head,{size:32}),blockNumber:toHex(f.head),transactionIndex:'0x0',from:author,to:t.to,input:t.data,value:'0x0',nonce:'0x0',gas:'0x5208',gasPrice:'0x1',type:'0x2',chainId:'0x1',maxFeePerGas:'0x1',maxPriorityFeePerGas:'0x1',v:'0x1',r:zeroHash,s:zeroHash}; }
    else if (r.method === 'eth_getTransactionReceipt' && f.delayReceipt) result = null;
    else if (r.method === 'eth_getTransactionReceipt') result = { transactionHash:tx, transactionIndex:'0x0', blockHash:toHex(f.head,{size:32}), blockNumber:toHex(f.head), from:author, to:hook, cumulativeGasUsed:'0x5208', gasUsed:'0x5208', effectiveGasPrice:'0x1', contractAddress:null, logs: f.lastFn==='tradeAndNote' ? [event('NotePosted',{id,author,x:marg,class:0,side:0,targetBps:12500,horizonDays:7,parentId:zeroHash,text:'A tested call'},f.head)] : [], logsBloom:`0x${'0'.repeat(512)}`, status:'0x1', type:'0x2' };
    else throw Error(`Unhandled RPC ${r.method}`);
    return {jsonrpc:'2.0',id:r.id,result};
  } catch(e) { console.error('RPC fixture error:',e.message); return {jsonrpc:'2.0',id:r.id,error:{code:-32000,message:e.message}}; }
}
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server = createServer((req,res) => {
  let file = decodeURIComponent(req.url.split('?')[0]).replace(/^\/preview\//,'');
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
  await context.addInitScript(({wallet,account,chain,sealed,hash,draft})=>{
    if(sealed) {localStorage.setItem('marginalia.seals',JSON.stringify({[hash]:draft}));localStorage.setItem('marginalia.prefill',JSON.stringify({draft,hash}));}
    window.__sent=[];
    if(wallet) window.ethereum={request:async({method,params})=>{
      if(method==='eth_accounts'||method==='eth_requestAccounts')return [account];
      if(method==='eth_chainId')return chain;
      if(method==='wallet_switchEthereumChain'){if(chain!=='0x1'){chain='0x1';throw {code:4902,message:'unknown chain'};} return null;}
      if(method==='wallet_addEthereumChain'){window.__added=params;return null;}
      if(method==='eth_sendTransaction'){window.__sent.push(params[0]); return fetch('/__wallet',{method:'POST',body:JSON.stringify(params[0])}).then(async r=>{const v=await r.json();if(v.reject)throw {code:4001,message:'User rejected'};return v.hash;});}
      throw Error(`Unexpected wallet method ${method}`);
    },on:()=>{},removeListener:()=>{}};
  },{wallet:f.wallet,account:f.account,chain:f.chain,sealed:f.sealAge!==null,hash,draft});
  await context.route('**/*',async route=>{
    const u=route.request().url();
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
      if(!f.reject){const {functionName,args}=decodeFunctionData({abi,data:t.data});f.lastFn=functionName;if(functionName==='deposit')f.wethBalance=(f.wethBalance??0n)+BigInt(t.value);if(functionName==='drip')f.dripped=true;if(functionName==='requestJudging')f.judgePending=true;if(functionName==='payJudged')f.paid=true;if(functionName==='registerHandle')f.registered=true;if(functionName==='buy')f.pagesHolding+=args[1];if(functionName==='sell')f.pagesHolding-=args[1];if(functionName==='requestClaim')f.claimPending=true;if(functionName==='abandonClaim')f.claimPending=false;if(functionName==='burn')f.burn-=args[0];if(functionName==='checkpointVenue')f.checkpointAge=0;if(functionName==='approve'){if(args[0].toLowerCase()===hook.toLowerCase())f.hookAllowance=args[1];else f.allowance=args[1];}if(functionName==='claimRefund')f.claimed=true;if(functionName==='claimDeposit')f.deposit=0n;}
      await route.fulfill({contentType:'application/json',body:JSON.stringify({reject:f.reject,hash:tx})});
    } else if(u.endsWith('/imd-deployment.json') && f.pages) { await route.fulfill({contentType:'application/json',body:JSON.stringify({...manifest,contracts:[...manifest.contracts,{name:'MarginaliaPages',address:pagesAddress,abiPath:'abi/MarginaliaPages.json',abiHash:keccak256(toHex(canon(pagesAbi))).slice(2)}]})}); } else if(u.startsWith(new URL(url).origin)) await route.continue();
    else {external.push(u);await route.abort();}
  });
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'app/#'+route);
  await page.locator('footer').waitFor({timeout:12000}).catch(async e=>{console.error('BOOT',await page.locator('body').innerText());throw e;});
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
const UNUSED_SUPERSEDED={'Annex tab uses its own approval and positive 3% baseline bound':'v4 resolves the Annex automatically; covered by v3-unit calldata and the Annex counter route','Annex admission validates the batch and approves only the current panel fee':'v4 keeps Admission inside the call flow; its batch/fee logic is unchanged and unit-tested'};
async function check(name,fn){if(process.env.TEST_FILTER&&!name.includes(process.env.TEST_FILTER))return;try{await fn();assert.deepEqual(errors,[],'Browser script errors');assert.deepEqual(external,[],'Unexpected outside request'); reports.push({name,result:'pass'});console.log('PASS',name);}catch(e){reports.push({name,result:'FAIL',error:e.stack});console.error('FAIL',name,e.message);if(page)console.error((await page.locator('body').innerText()).slice(0,3500));process.exitCode=1;}}async function tradeReady(){await page.locator('#trade-why').fill('A tested call');await page.locator('.baseline-status').filter({hasText:'Baseline ready.'}).waitFor();}
async function waitEnabled(locator){await locator.waitFor();await page.waitForFunction(sel=>!document.querySelector(sel)?.disabled,await locator.evaluate(e=>{e.dataset.awaitEnabled='yes';return '[data-await-enabled="yes"]';}));}
try {
 await check('Trade first, caveat visible, no Pages without manifest; mobile and desktop fit',async()=>{
  await open('/call',{wallet:false,gallery:true});await page.locator('#trade-token').waitFor();
  await page.getByText('Baseline ready.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Pages',exact:true}).count(),0);assert.equal(await page.locator('.trade-action button').count(),1);
  assert(!/page market|coming with|Readers pay writers/.test(await text()));
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});const m=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,action:document.querySelector('.trade-action button').getBoundingClientRect().bottom,caveat:document.querySelector('.send-caveat').getBoundingClientRect().bottom}));assert(m.scroll<=width,JSON.stringify(m));if(width===390){assert(m.action<=844,JSON.stringify(m));}metrics[width]=m;await shot(`home-${width}`);}
  assert.equal(errors.length,0);assert.deepEqual(external,[]);
 });
 await check('Absent wallet gives actionable feedback',async()=>{await open('/call',{wallet:false});await page.locator('.trade-action button').click();await page.getByText(/No browser wallet found/).first().waitFor();assert.equal(f.requests.length,0);});
 await check('Wrong chain precedes signing; unknown chain receives exact add-chain parameters',async()=>{await open('/call',{chain:'0xaa36a7',allowance:0n});await tradeReady();assert.equal(await page.locator('.trade-action').getByRole('button',{name:'Approve',exact:false}).count(),0);assert.equal(await page.locator('dialog').getByRole('button',{name:'Switch to Ethereum',exact:true}).count(),1);await page.locator('dialog').getByRole('button',{name:'Switch to Ethereum',exact:true}).click();assert.deepEqual((await page.evaluate(()=>window.__added))[0],manifest.walletAddChain);await page.locator('.trade-action button').filter({hasText:'Approve 1.6 IMD'}).waitFor();assert.equal(f.requests.length,0);});
 await check('Exact combined IMD approval, confirmation, then bounded tradeAndNote simulation and signing',async()=>{await open('/call',{allowance:0n,reject:false});await tradeReady();const a=page.locator('.trade-action button').filter({hasText:'Approve 1.6 IMD'});await waitEnabled(a);await a.click();await page.getByText(/Confirmed/).first().waitFor();const approval=await sent('approve');assert.equal(approval.to.toLowerCase(),imd.toLowerCase());assert.equal(approval.args[0].toLowerCase(),router.toLowerCase());assert.equal(approval.args[1],1600000000000000000n);const t=page.locator('.trade-action button').filter({hasText:'Trade and post'});await waitEnabled(t);await t.click();await page.getByText('Call recorded.',{exact:false}).waitFor();const trade=await sent('tradeAndNote');assert.equal(trade.to.toLowerCase(),router.toLowerCase());assert.equal(trade.args[0].amountIn,unit);assert(trade.args[0].minOut>0n);assert.equal(trade.args[1].targetBps,12500);assert.equal(trade.args[1].horizonDays,7);assert.equal(trade.args[3],600000000000000000n);assert(trade.args[4]>0n);assert(trade.args[5]<=BigInt(f.now+610));assert(f.rpc.some(r=>r.method==='eth_call'&&r.params[0].data===trade.data));});
 await check('Wallet rejection recovers and no double submission during pending approval',async()=>{await open('/call',{allowance:0n,reject:true});await tradeReady();const a=page.locator('.trade-action button').filter({hasText:'Approve'});await waitEnabled(a);await a.click();await page.getByRole('alert').filter({hasText:/rejected/i}).waitFor();assert.equal(await a.isEnabled(),true);assert.equal(f.requests.length,1);f.reject=false;f.delayReceipt=true;await a.click();await page.getByText('Sent. Waiting for confirmation…',{exact:false}).waitFor();assert(await page.locator('.trade-action button').isDisabled());assert(await page.locator('#trade-token').isDisabled());f.delayReceipt=false;f.head+=1n;await page.getByText('Confirmed.',{exact:false}).waitFor();assert.equal(f.requests.length,2);});
 await check('Missing checkpoint saves draft and exposes countdown without real-time waiting',async()=>{await open('/call',{checkpointAge:null,reject:false});await page.locator('#trade-why').fill('Saved checkpoint draft');const b=page.locator('.trade-action button').filter({hasText:'Start the one-hour warm-up'});await waitEnabled(b);await b.click();await page.locator('.baseline-status').filter({hasText:'ready in'}).waitFor();const c=await sent('checkpointVenue');assert.equal(c.args[0].text,'');assert.equal(c.args[0].targetBps,11000);assert.match(await page.evaluate(()=>localStorage.getItem('marginalia.trade.v3')),/Saved checkpoint draft/);assert(await page.locator('.trade-action button').isDisabled());});
 await check('Young checkpoint matures using a controlled clock',async()=>{await open('/call',{checkpointAge:3599});await page.clock.install({time:new Date(f.now*1000)});await page.locator('#trade-why').fill('Clock fixture');await page.clock.fastForward(2100);await page.getByText('Baseline ready.',{exact:true}).waitFor();await waitEnabled(page.locator('.trade-action button').filter({hasText:'Trade and post'}));});
 await check('Text byte limit and failed simulation disable or reject before wallet signing',async()=>{await open('/call',{simFail:true});await tradeReady();await page.locator('#trade-why').fill('界'.repeat(94));assert(await page.locator('.trade-action button').isDisabled());await page.locator('#trade-why').fill('Under the limit');await waitEnabled(page.locator('.trade-action button'));await page.locator('.trade-action button').click();await page.getByRole('alert').filter({hasText:/Slippage|minimum|simulation/i}).waitFor();assert.equal(f.requests.length,0);});
 await check('Side presets select SELL and its input token; amount minima are retained',async()=>{await open('/call',{reject:false});await tradeReady();await page.getByRole('button',{name:'-50%',exact:true}).click();await waitEnabled(page.locator('.trade-action button'));await page.locator('.trade-action button').click();await page.getByText(/Confirmed/).first().waitFor();const t=await sent('tradeAndNote');assert.equal(t.args[0].tokenIn.toLowerCase(),marg.toLowerCase());assert.equal(t.args[0].zeroForOne,false);assert.equal(t.args[1].side,1);assert.equal(t.args[1].targetBps,5000);});
 await check('Annex tab uses its own approval and positive 3% baseline bound',async()=>{await open('/call?counter='+id,{allowance:0n,reject:false,annexNotes:true,status:0,account:other,noteBlock:26179000n});await tradeReady();const a=page.locator('.trade-action button').filter({hasText:'Approve 0.6 IMD'});await waitEnabled(a);await a.click();await page.getByText(/Confirmed/).first().waitFor();const ap=await sent('approve');assert.equal(ap.args[0].toLowerCase(),annex.toLowerCase());assert.equal(ap.args[1],600000000000000000n);const p=page.locator('.trade-action button').filter({hasText:'Post the call'});await waitEnabled(p);await p.click();await page.getByText(/Confirmed/).first().waitFor();const call=await sent('post');assert.equal(call.to.toLowerCase(),annex.toLowerCase());assert.equal(call.args[2],unit/4n);assert.equal(call.args[4],unit*97n/100n);assert(call.args[3]>0n);});
 await check('Original guided call, thesis and seal routes remain usable',async()=>{await open('/call',{newAuthor:true});await page.goto(url+'app/#/post');await page.locator('#x').waitFor();assert.equal(await page.locator('.post-steps li').count(),3);await page.goto(url+'app/#/thesis');await page.locator('#thesis').waitFor();assert.match(await text(),/Post your own child call within 7 days/);await page.getByRole('button',{name:'Close compose'}).click();await page.getByRole('link',{name:'Seal',exact:true}).click();await page.getByRole('heading',{name:/Seal/}).first().waitFor();assert.match(await text(),/30 minutes/);});
 await check('Pages are enabled only by manifest; handle registration precedes first trade',async()=>{await open('/pages/market_reader',{pages:true,reject:false,allowance:0n});await page.getByRole('heading',{name:'Pages',exact:true}).waitFor();const r=page.getByRole('button',{name:'Register handle',exact:true});await waitEnabled(r);await r.click();await page.getByRole('button',{name:/Approve 0.055 IMD for pages/}).waitFor();const a=page.getByRole('button',{name:/Approve 0.055 IMD for pages/});await waitEnabled(a);await a.click();await page.getByRole('button',{name:'Buy pages',exact:true}).waitFor();await page.getByRole('button',{name:'Buy pages',exact:true}).click();await page.getByText('You hold 1 of 10.',{exact:true}).waitFor();const reg=await sent('registerHandle');assert.equal(reg.args[0],'market_reader');const ap=await sent('approve');assert.equal(ap.args[0].toLowerCase(),pagesAddress.toLowerCase());assert.equal(ap.args[1],55000000000000000n);const t=await sent('buy');assert.equal(t.args[2],55000000000000000n);});
 await check('Pages sell remains available without eligibility; exact claim sentence and burn recovery',async()=>{await open('/pages/market_reader',{pages:true,registered:true,pagesHolding:2n,pagesEligible:false,burn:unit,reject:false});await page.getByRole('button',{name:'Sell',exact:true}).click();await waitEnabled(page.getByRole('button',{name:'Sell pages',exact:true}));await page.getByRole('button',{name:'Sell pages',exact:true}).click();await page.getByText('You hold 1 of 10.',{exact:true}).waitFor();await page.getByText('Claim this handle',{exact:true}).click();assert.equal(await page.locator('#claim-message').inputValue(),`I claim this handle on chain 1 for contract ${pagesAddress} to wallet ${author}`);await page.locator('#claim-tweet').fill('123456789');await waitEnabled(page.getByRole('button',{name:'Request claim',exact:true}));await page.getByRole('button',{name:'Request claim',exact:true}).click();await page.getByText('Pending request',{exact:false}).waitFor();await page.getByText('Retry deferred burn',{exact:true}).click();await page.getByRole('button',{name:'Retry burn',exact:true}).click();await page.getByText('Retry deferred burn',{exact:true}).waitFor({state:'detached'});const burn=await sent('burn');assert.equal(burn.args[0],unit);assert(burn.args[1]>0n);});
 await check('WETH shortage wraps exactly the missing amount before ERC-20 trade',async()=>{await open('/call',{wethMarket:true,reject:false});await tradeReady();await page.getByText('More',{exact:true}).click();await page.locator('#trade-venue').selectOption({label:await page.locator('#trade-venue option').filter({hasText:'WETH'}).innerText()});await page.locator('#trade-toggle').check();const w=page.getByRole('button',{name:'Wrap ETH',exact:true});await waitEnabled(w);await w.click();await page.getByText(/Confirmed/).first().waitFor();const d=await sent('deposit');assert.equal(d.to.toLowerCase(),weth.toLowerCase());assert.equal(BigInt(d.value),unit);assert.equal(f.requests.length,1);await waitEnabled(page.locator('.trade-action button').filter({hasText:'Trade and post'}));await page.locator('.trade-action button').click();await page.getByText('Call recorded.',{exact:false}).waitFor();const t=await sent('tradeAndNote');assert.equal(t.args[0].kind,2);assert.equal(t.args[0].tokenIn.toLowerCase(),weth.toLowerCase());assert(!t.value||BigInt(t.value)===0n);});
 await check('Unavailable USD stays explicit and does not block token-denominated posting',async()=>{await open('/call',{usd:false});await tradeReady();await waitEnabled(page.locator('.trade-action button'));assert.match(await text(),/USD unavailable/);assert(!/≈\s*\$/.test(await text()));});
 await check('Annex admission validates the batch and approves only the current panel fee',async()=>{await open('/call',{allowance:0n,reject:false});await page.getByText('Request a hook admission',{exact:true}).click();await page.locator('#admission-hooks').fill([other,other].join('\n'));assert.match(await text(),/distinct contract/);await page.locator('#admission-hooks').fill(other);const a=page.getByRole('button',{name:'Approve 0.5 IMD for admission',exact:true});await waitEnabled(a);await a.click();const r=page.getByRole('button',{name:'Request admission',exact:true});await waitEnabled(r);await r.click();await page.getByText(/Confirmed/).first().waitFor();const ap=await sent('approve');assert.equal(ap.args[0].toLowerCase(),annex.toLowerCase());assert.equal(ap.args[1],unit/2n);const request=await sent('requestAdmission');assert.deepEqual(request.args[0],[other]);});
 await check('Annex note lifecycle uses the Annex and current horizon',async()=>{await open('/note/'+id,{annexNotes:true,status:0,noteBlock:26179000n,horizonEnd:Math.floor(Date.now()/1000)-1800,reject:false});await page.getByRole('heading',{name:'Launched-token receipt',exact:true}).waitFor();const o=page.getByRole('button',{name:'Observe',exact:true});await waitEnabled(o);assert(await page.getByRole('button',{name:'Settle',exact:true}).isDisabled());await o.click();await page.getByText(/Confirmed/).first().waitFor();assert.equal((await sent('observe')).to.toLowerCase(),annex.toLowerCase());});
 await check('Judging and treasury controls use fresh pool state and configured companions',async()=>{await open('/pools',{pool:3n*unit,reject:false});const r=page.getByRole('button',{name:'Request judging',exact:true});await waitEnabled(r);await r.click();await page.getByText(/Confirmed/).first().waitFor();assert.equal((await sent('requestJudging')).to.toLowerCase(),judge.toLowerCase());const d=page.getByRole('button',{name:'Drip to the pools',exact:true});await waitEnabled(d);await d.click();await page.waitForFunction(()=>window.__sent.length===2);assert.equal((await sent('drip')).to.toLowerCase(),treasury.toLowerCase());});
 await check('All primary routes and secondary composer tabs reflow at 320 and 390',async()=>{
  for(const route of ['/scoreboard','/feed','/author/'+author,'/note/'+id,'/duel/'+toHex(2,{size:32}),'/post','/seal','/pools','/about','/pages/market_reader']){
   await open(route,{gallery:true,pages:route.startsWith('/pages/')});
   for(const width of [320,390]){await page.setViewportSize({width,height:844});await page.waitForTimeout(80);const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);assert(scroll<=width,`${route} overflow ${scroll} at ${width}`);}
  }
  for(const route of ['/','/call','/thesis','/feedback']){await open(route,{gallery:true});await page.setViewportSize({width:320,height:844});await page.waitForTimeout(300);assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=320,route);}
 });
 await check('Keyboard focus, dark mode and long values remain within 320px',async()=>{await open('/call');await page.setViewportSize({width:320,height:844});await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.locator('#trade-amount').fill('999999999999999999999999999999999999999999999999999999');await page.locator('#trade-token').focus();await page.keyboard.press('Tab');const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,style:getComputedStyle(document.activeElement).outlineStyle,width:document.documentElement.scrollWidth}));assert.equal(focus.tag,'BUTTON');assert.notEqual(focus.style,'none');assert(focus.width<=320);await shot('dark-long-values-320');});
} finally {
 if(evidence){fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify(reports,null,2));fs.writeFileSync(path.join(evidence,'metrics.json'),JSON.stringify(metrics,null,2));}
 await context?.close();await browser.close();server.close();
}
