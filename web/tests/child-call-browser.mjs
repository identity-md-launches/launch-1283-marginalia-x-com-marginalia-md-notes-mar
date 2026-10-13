// Child-call integration tests against the production export; fixture retained from v3-browser.mjs. No RPC request or transaction leaves the fixture.
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
  'function symbol() view returns (string)', 'function decimals() view returns (uint8)', 'function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)',
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
const reset = (patch = {}) => { f = { now: Math.floor(Date.now()/1000), head: 26180000n, notes: true, status: 1, deposit: unit/4n, allowance: 100n*unit, claimed: false, pool: unit, count: 1, closed: true, checkpointAge: 7200, sealAge: null, symbol: 'MARG', decimals: 18, token: marg, wallet: true, account: author, chain: '0x1', observe: false, reject: true, requests: [], rpc: [], created: [], children: 0, usd:true, registered:false, pagesHolding:0n, pagesEligible:true, claimPending:false, burn:0n, ...patch }; };
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
    out.push(event('NotePosted', {id, author: f.noteAuthor ?? author, x: f.token, class:1, side:0, targetBps:f.thesis ? 0 : 12000, horizonDays:f.thesis ? 0 : 30, parentId:zeroHash, text:'A review note: the evidence matters more than the result.'}, f.noteBlock ?? f.head - 2500n));
    if (f.extraNoteBlock) out.push(event('NotePosted', {id:toHex(2,{size:32}), author, x:f.token, class:1, side:0, targetBps:12000, horizonDays:30, parentId:zeroHash, text:'A note posted while the author was away.'}, f.extraNoteBlock));
    if (f.observe) out.push(event('Observed', {id,xRead:123456n,balance:f.sentinel ? maxUint256 : 5000000n}, f.head-100n, 1));
    if (f.status === 5) out.push(event('Settled', {id,status:5,settlePrice:0n,scoreDelta:-5000n,keeper:zeroAddress}, f.head-90n, 2));
  }
  if (f.sealAge !== null) out.push(event('Sealed', {hash,author,x:marg,venueRef:poolId}, f.head-1200n, 3));
  for (const n of f.created) out.push(event('NotePosted', { ...n.p, id:n.id, author:n.author }, n.block, 10));
  return out;
}
function block(number) {
  const n = number === 'latest' ? f.head : number === 'finalized' ? f.head-64n : BigInt(number);
  const time = n === (f.noteBlock ?? f.head-2500n) ? f.now - (f.noteAge ?? 90000) : n === f.head-1200n ? f.now-(f.sealAge || 14400) : f.now - Number(f.head-n)*12;
  return { number:toHex(n), hash:toHex(n,{size:32}), parentHash:toHex(n-1n,{size:32}), timestamp:toHex(time), nonce:'0x0000000000000000', difficulty:'0x0', totalDifficulty:'0x0', gasLimit:'0x1c9c380', gasUsed:'0x0', miner:zeroAddress, extraData:'0x', baseFeePerGas:'0x1', size:'0x1', transactions:[], uncles:[], logsBloom:`0x${'0'.repeat(512)}`, receiptsRoot:zeroHash, stateRoot:zeroHash, transactionsRoot:zeroHash, sha3Uncles:zeroHash, mixHash:zeroHash };
}
function value(fn, args, address) {
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
  if (fn === 'noteOf' && f.created.some(n=>n.id===args[0])) { const n=f.created.find(n=>n.id===args[0]);return {...n.p,author:n.author,status:n.p.targetBps===0?6:0,class:1,postPrice:unit,postBalance:unit,deposit:unit/4n,children:0}; }
  if (fn === 'noteOf') return {author:f.noteAuthor??author,x:f.token,side:0,targetBps:f.thesis ? 0 : 12000,horizonDays:f.thesis ? 0 : 30,class:1,status:f.status,postPrice:unit,postBalance:5000000n,deposit:f.deposit,parentId:zeroHash,children:f.children};
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
      if (functionName==='noteOf' && (args[0]!==id && !f.created.some(n=>n.id===args[0]))) return {jsonrpc:'2.0',id:r.id,error:{code:3,message:'execution reverted',data:encodeErrorResult({abi:hookAbi,errorName:'UnknownNote'})}};
      if (functionName==='noteOf' && f.parentReadFail) return {jsonrpc:'2.0',id:r.id,error:{code:-32000,message:'Temporary parent read failure'}};
      if (f.offchain && functionName === 'symbol') return {jsonrpc:'2.0',id:r.id,error:{code:3,message:'execution reverted',data:'0x556f1830'+encodeAbiParameters([{type:'address'},{type:'string[]'},{type:'bytes'},{type:'bytes4'},{type:'bytes'}], [call.to,['https://attacker.example/{sender}/{data}'],'0x1234','0x12345678','0x']).slice(2)}};
      const resultValue = value(functionName,args,call.to);
      result = functionName==='observe'&&args.length===3 ? encodeAbiParameters([{type:'uint256'},{type:'uint256'}],resultValue) : encodeFunctionResult({abi,functionName,result:resultValue});
    } else if (r.method === 'eth_getTransactionByHash') { const t=f.requests[0]||{to:hook,data:'0x'};result={hash:tx,blockHash:toHex(f.head,{size:32}),blockNumber:toHex(f.head),transactionIndex:'0x0',from:author,to:t.to,input:t.data,value:'0x0',nonce:'0x0',gas:'0x5208',gasPrice:'0x1',type:'0x2',chainId:'0x1',maxFeePerGas:'0x1',maxPriorityFeePerGas:'0x1',v:'0x1',r:zeroHash,s:zeroHash}; }
    else if (r.method === 'eth_getTransactionReceipt' && f.delayReceipt) result = null;
    else if (r.method === 'eth_getTransactionReceipt') result = { transactionHash:tx, transactionIndex:'0x0', blockHash:toHex(f.head,{size:32}), blockNumber:toHex(f.head), from:author, to:hook, cumulativeGasUsed:'0x5208', gasUsed:'0x5208', effectiveGasPrice:'0x1', contractAddress:null, logs: f.lastPosted ? [event('NotePosted',{...f.lastPosted.p,id:f.lastPosted.id,author:f.lastPosted.author},f.lastPosted.block)] : [], logsBloom:`0x${'0'.repeat(512)}`, status:'0x1', type:'0x2' };
    else throw Error(`Unhandled RPC ${r.method}`);
    return {jsonrpc:'2.0',id:r.id,result};
  } catch(e) { console.error('RPC fixture error:',e.message); return {jsonrpc:'2.0',id:r.id,error:{code:-32000,message:e.message}}; }
}
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server = createServer((req,res) => {
  let file = decodeURIComponent(req.url.split('?')[0]).replace(/^\/preview\//,'');
  if (file === '') file='index.html';
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
if(functionName==='deposit')f.wethBalance=(f.wethBalance??0n)+BigInt(t.value);if(functionName==='drip')f.dripped=true;if(functionName==='requestJudging')f.judgePending=true;if(functionName==='payJudged')f.paid=true;if(functionName==='registerHandle')f.registered=true;if(functionName==='buy')f.pagesHolding+=args[1];if(functionName==='sell')f.pagesHolding-=args[1];if(functionName==='requestClaim')f.claimPending=true;if(functionName==='abandonClaim')f.claimPending=false;if(functionName==='burn')f.burn-=args[0];if(functionName==='checkpointVenue')f.checkpointAge=0;if(functionName==='approve'){if(args[0].toLowerCase()===hook.toLowerCase())f.hookAllowance=args[1];else f.allowance=args[1];}if(functionName==='claimRefund')f.claimed=true;if(functionName==='claimDeposit')f.deposit=0n;}
      await route.fulfill({contentType:'application/json',body:JSON.stringify({reject:f.reject,hash:tx})});
    } else if(u.endsWith('/imd-deployment.json') && f.pages) { await route.fulfill({contentType:'application/json',body:JSON.stringify({...manifest,contracts:[...manifest.contracts,{name:'MarginaliaPages',address:pagesAddress,abiPath:'abi/MarginaliaPages.json',abiHash:keccak256(toHex(canon(pagesAbi))).slice(2)}]})}); } else if(u.startsWith(url)) await route.continue();
    else {external.push(u);await route.abort();}
  });
  page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'#'+route);
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
async function check(name,fn){if(process.env.TEST_FILTER&&!name.includes(process.env.TEST_FILTER))return;try{await fn();assert.deepEqual(errors,[],'Browser script errors');assert.deepEqual(external,[],'Unexpected outside request'); reports.push({name,result:'pass'});console.log('PASS',name);}catch(e){reports.push({name,result:'FAIL',error:e.stack});console.error('FAIL',name,e.message);if(page)console.error((await page.locator('body').innerText()).slice(0,3500));process.exitCode=1;}}async function tradeReady(){await page.locator('#trade-why').fill('A tested call');await page.locator('.baseline-status').filter({hasText:'Baseline ready.'}).waitFor();}
async function waitEnabled(locator){await locator.waitFor();await page.waitForFunction(sel=>!document.querySelector(sel)?.disabled,await locator.evaluate(e=>{e.dataset.awaitEnabled='yes';return '[data-await-enabled="yes"]';}));}
const ownThesis = { thesis:true, status:6, noteAge:3600 };
const parentLabel = 'Parent thesis (optional)';
const parentContext = () => page.locator('.child-call-context');
async function tradeChild() {
  await page.locator('#trade-token').fill(marg);
  await tradeReady();
}
async function chooseManualParent(mode, value=id) {
  if(mode==='trade') {
    await page.locator('summary').filter({hasText:parentLabel}).click();
    await page.locator('#trade-parent').fill(value);
  } else await page.locator('#parent').fill(value);
}
async function childAction(mode) {
  return mode==='trade' ? page.locator('.trade-action button') : page.getByRole('button',{name:'Post the call',exact:true});
}
try {
  await check('Owner thesis CTA opens both composers with only the parent supplied',async()=>{
    await open('/note/'+id,ownThesis);
    const cta=page.getByRole('link',{name:'Post the child call',exact:true});await cta.waitFor();
    assert(await cta.evaluate(e=>e.classList.contains('primary')));
    assert.equal(await cta.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(185, 71, 31)');await shot('thesis-note-390');
    await cta.click();await parentContext().filter({hasText:'Child call under your thesis'}).waitFor();
    assert.equal(await page.locator('#trade-token').inputValue(),'');
    assert.equal(await page.locator('#trade-why').inputValue(),'');
    assert.equal(await page.locator('#trade-parent').inputValue(),id);
    assert.match(await parentContext().innerText(),/due /);
    assert(!/Counter to/.test(await text()));
    const childActionBox=await page.locator('.trade-action button').boundingBox();
    metrics.childActionBottom=childActionBox.y+childActionBox.height;
    assert(metrics.childActionBottom<=844,`Child action bottom: ${metrics.childActionBottom}`);
    await shot('child-trade-390');
    await page.getByRole('button',{name:'Just the call',exact:true}).click();
    assert.equal(await page.locator('#x').inputValue(),'');
    assert.equal(await page.locator('#text').inputValue(),'');
    assert.equal(await page.locator('#parent').inputValue(),id);
    await parentContext().filter({hasText:'Child call under your thesis'}).waitFor();
    await shot('child-call-390');
  });
  await check('CTA is hidden for other wallets, disconnected, closed and expired theses',async()=>{
    for(const patch of [{account:other},{account:null},{status:7},{noteAge:604801}]) {
      await open('/note/'+id,{...ownThesis,...patch});
      await page.getByRole('heading',{name:/Note №/}).waitFor();
      assert.equal(await page.getByRole('link',{name:'Post the child call',exact:true}).count(),0);
    }
  });
  await check('A child link discards unrelated saved trade and seal prefills',async()=>{
    await open('/?child='+id,{...ownThesis,sealAge:3600,savedTrade:{token:other,amount:'12',side:1,pct:'50',days:'30',why:'Previous draft',bond:'10',manual:'',parentId:toHex(77,{size:32})}});
    assert.equal(await page.locator('#trade-token').inputValue(),'');
    assert.equal(await page.locator('#trade-why').inputValue(),'');
    assert.equal(await page.locator('#trade-parent').inputValue(),id);
    await page.getByRole('button',{name:'Just the call',exact:true}).click();
    assert.equal(await page.locator('#x').inputValue(),'');
    assert(!/Revealing seal/.test(await text()));
  });
  for(const mode of ['trade','call']) {
    await check(`${mode}: all three chain gates and nonexistent/malformed parents block posting`,async()=>{
      for(const [patch,error] of [[{status:0},'Choose an open thesis'],[{noteAuthor:other},'belongs to another wallet'],[{noteAge:604801},'deadline has passed']]) {
        await open(mode==='trade'?'/':'/post',{...ownThesis,...patch});
        if(mode==='trade')await tradeReady();else await callForm();
        await chooseManualParent(mode);
        await page.locator(mode==='trade'?'#trade-parent-status':'#parent-status').filter({hasText:error}).waitFor();
        assert(await (await childAction(mode)).isDisabled());assert.equal(f.requests.length,0);
      }
      await open(mode==='trade'?'/':'/post',ownThesis);
      if(mode==='trade')await tradeReady();else await callForm();
      await chooseManualParent(mode,toHex(77,{size:32}));
      await page.locator(mode==='trade'?'#trade-parent-status':'#parent-status').filter({hasText:'does not exist'}).waitFor();
      assert(await (await childAction(mode)).isDisabled());
      const field=page.locator(mode==='trade'?'#trade-parent':'#parent');
      await field.fill('not an id');assert.equal(await field.getAttribute('aria-invalid'),'true');
      assert.match(await page.locator(mode==='trade'?'#trade-parent-status':'#parent-status').innerText(),/nonzero hex/);
      await field.fill('');await waitEnabled(await childAction(mode));
    });
  }
  await check('Just the call posts the author’s child on the same side with bounded calldata',async()=>{
    await open('/post?child='+id,{...ownThesis,noteAge:604700,reject:false});await callForm();
    await waitEnabled(await childAction('call'));await (await childAction('call')).click();
    await page.getByText(/Posted as/).waitFor();
    const call=await sent('note');assert.equal(call.to.toLowerCase(),router.toLowerCase());
    assert.equal(call.args[0].parentId,id);assert.equal(call.args[0].side,0);
    assert.equal(call.args[4],BigInt(f.now+100));assert(call.args[3]>0n);
    assert(f.rpc.some(r=>r.method==='eth_call'&&r.params[0].data===call.data));
    assert.equal(f.children,1);
  });
  await check('Trade child supports another token and either side, with combined/exact approval intact',async()=>{
    await open('/?child='+id,{...ownThesis,tradeToken:other,wethMarket:true,allowance:0n,wethBalance:10n*unit,reject:false});
    await page.locator('#trade-token').fill(other);await tradeReady();
    await page.getByRole('button',{name:'-25%',exact:true}).click();
    const action=page.locator('.trade-action button');await action.filter({hasText:'Approve'}).waitFor();await waitEnabled(action);await action.click();
    await page.getByText(/Confirmed/).first().waitFor();
    await action.filter({hasText:'Trade and post'}).waitFor();await waitEnabled(action);await action.click();
    await page.getByText('Call recorded.',{exact:false}).waitFor();
    const call=await sent('tradeAndNote');assert.equal(call.args[1].parentId,id);
    assert.equal(call.args[1].x.toLowerCase(),other.toLowerCase());assert.equal(call.args[1].side,1);
    assert.equal(call.args[1].targetBps,7500);assert.equal(call.args[1].horizonDays,7);
    assert(call.args[0].minOut>0n);assert(call.args[4]>0n);assert(call.args[5]<=BigInt(f.now+610));
    const approval=await sent('approve');assert.equal(approval.args[0].toLowerCase(),router.toLowerCase());assert.equal(approval.args[1],unit);
  });
  await check('Trade child approval still sums IMD and caps the transaction deadline at grace end',async()=>{
    await open('/?child='+id,{...ownThesis,noteAge:604700,allowance:0n,reject:false});await tradeChild();
    const action=page.locator('.trade-action button');await action.filter({hasText:'Approve 1.6 IMD'}).waitFor();await waitEnabled(action);await action.click();
    await action.filter({hasText:'Trade and post'}).waitFor();await waitEnabled(action);await action.click();await page.getByText('Call recorded.',{exact:false}).waitFor();
    assert.equal((await sent('approve')).args[1],1600000000000000000n);
    assert.equal((await sent('tradeAndNote')).args[5],BigInt(f.now+100));
  });
  await check('Live wallet change invalidates prior parent eligibility',async()=>{
    await open('/?child='+id,ownThesis);await tradeChild();await waitEnabled(page.locator('.trade-action button'));
    await page.evaluate(account=>window.__walletAccount(account),other);
    await parentContext().filter({hasText:'belongs to another wallet'}).waitFor();
    assert(await page.locator('.trade-action button').isDisabled());
    await page.evaluate(account=>window.__walletAccount(account),author);await waitEnabled(page.locator('.trade-action button'));
  });
  await check('Grace expiry during editing disables the child action without real-time waiting',async()=>{
    await open('/?child='+id,{...ownThesis,noteAge:604795});await page.clock.install({time:new Date(f.now*1000)});
    await tradeChild();await waitEnabled(page.locator('.trade-action button'));await page.clock.fastForward(6000);
    await parentContext().filter({hasText:'deadline has passed'}).waitFor();assert(await page.locator('.trade-action button').isDisabled());assert.equal(f.requests.length,0);
  });
  for(const mode of ['trade','call']) {
    await check(`${mode}: fresh preflight refuses a parent closed after the last UI read`,async()=>{
      await open(mode==='trade'?'/?child='+id:'/post?child='+id,ownThesis);
      if(mode==='trade')await tradeChild();else await callForm();
      await waitEnabled(await childAction(mode));f.status=7;await (await childAction(mode)).click();
      await page.getByRole('alert').filter({hasText:'Choose an open thesis'}).waitFor();assert.equal(f.requests.length,0);
    });
  }
  await check('Failed chain reads stay disabled and recover with an explicit retry',async()=>{
    await open('/?child='+id,{...ownThesis,notes:false,parentReadFail:true});
    await parentContext().filter({hasText:'Could not verify'}).waitFor();assert(await page.locator('.trade-action button').isDisabled());
    f.parentReadFail=false;await page.getByRole('button',{name:'Retry parent check',exact:true}).click();
    await parentContext().filter({hasText:'Child call under your thesis'}).waitFor();
  });
  await check('Parent reads work independently of missing event history',async()=>{
    await open('/?child='+id,{...ownThesis,notes:false});await parentContext().filter({hasText:'Child call under your thesis'}).waitFor();await tradeChild();await waitEnabled(page.locator('.trade-action button'));
  });
  await check('Thesis confirmation uses its receipt block and links to its own child composer',async()=>{
    await open('/post?kind=thesis',{reject:false});await page.locator('#thesis').fill('An argument that needs an ordinary child call.');
    const button=page.getByRole('button',{name:'Post the thesis',exact:true});await waitEnabled(button);await button.click();
    const next=page.getByRole('link',{name:/Next: your child call, due /});await next.waitFor();
    const created=f.created[0];assert.equal(created.p.targetBps,0);assert.equal(await next.getAttribute('href'),'#/?child='+created.id);
    const date=await page.evaluate(ts=>new Date(ts*1000).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}),f.now+604800);
    assert.match(await next.innerText(),new RegExp(date.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    await shot('thesis-next-390');await next.click();await parentContext().filter({hasText:'Child call under your thesis'}).waitFor();
    assert.equal(await page.locator('#trade-parent').inputValue(),created.id);assert.equal(await page.locator('#trade-token').inputValue(),'');
  });
  await check('Home Write a thesis returns to the child composer even within the same route',async()=>{
    await open('/',{reject:false});await page.getByRole('button',{name:'Write a thesis',exact:true}).click();
    await page.locator('#thesis').fill('The argument comes first, then its child.');const button=page.getByRole('button',{name:'Post the thesis',exact:true});await waitEnabled(button);await button.click();
    await page.getByRole('link',{name:/Next: your child call, due /}).click();await page.locator('#trade-token').waitFor();assert.equal(await page.locator('#trade-parent').inputValue(),f.created[0].id);
  });
  await check('Feed needs-child label follows live children, including after a recorded child',async()=>{
    await open('/feed',ownThesis);await page.getByText('needs its child call',{exact:true}).waitFor();
    f.children=1;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByText('needs its child call',{exact:true}).waitFor({state:'detached'});
    await open('/feed',{...ownThesis,status:8});assert.equal(await page.getByText('needs its child call',{exact:true}).count(),0);
  });
  await check('Counters retain other-author, same-token and opposite-side rules',async()=>{
    await open('/post?counter='+id,{status:0,noteAuthor:other});
    await page.getByLabel(/Launch pool/).check();await page.locator('#text').fill('An independent counter');await waitEnabled(await childAction('call'));
    assert.equal(await page.locator('#parent').count(),0);assert.equal(await parentContext().count(),0);
    await page.getByRole('radio',{name:'Upward call',exact:true}).check();assert(await (await childAction('call')).isDisabled());
    await open('/post?counter='+id,{status:0});await page.getByLabel(/Launch pool/).check();await page.locator('#text').fill('Own counter refused');assert(await (await childAction('call')).isDisabled());
  });
  await check('Annex composer never offers or submits a hook child parent',async()=>{
    await open('/?child='+id,ownThesis);await page.getByRole('button',{name:'Launched tokens',exact:true}).click();
    assert.equal(await page.locator('#trade-parent').count(),0);assert.equal(await parentContext().count(),0);
  });
  await check('Disconnected and wrong-chain child actions offer connect or add-chain before posting',async()=>{
    await open('/?child='+id,{...ownThesis,wallet:false});await page.locator('.trade-action button').click();await page.getByText(/No browser wallet found/).first().waitFor();assert.equal(f.requests.length,0);
    await open('/?child='+id,{...ownThesis,chain:'0xaa36a7'});await parentContext().filter({hasText:'Switch to Ethereum'}).waitFor();await page.getByRole('button',{name:'Switch to Ethereum',exact:true}).click();
    assert.deepEqual((await page.evaluate(()=>window.__added))[0],manifest.walletAddChain);await parentContext().filter({hasText:'Child call under your thesis'}).waitFor();
  });
  await check('Child surfaces reflow at 320, 390 and 1440; keyboard and dark focus stay visible',async()=>{
    for(const route of ['/note/'+id,'/?child='+id,'/post?child='+id,'/feed']) {
      await open(route,ownThesis);
      for(const width of [320,390,1440]) {await page.setViewportSize({width,height:844});const w=await page.evaluate(()=>document.documentElement.scrollWidth);assert(w<=width,`${route}: ${w} > ${width}`);metrics[`${route}:${width}`]={width,scroll:w};}
    }
    await open('/?child='+id,ownThesis);await page.setViewportSize({width:320,height:844});await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
    await page.locator('#trade-parent').focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'trade-parent');
    assert.notEqual(await page.locator('#trade-parent').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
    await shot('child-focus-dark-320');
    await page.locator('#trade-parent').fill('0x'+'f'.repeat(64));await page.locator('#trade-parent-status').filter({hasText:'does not exist'}).waitFor();assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=320);await shot('child-error-dark-320');
    await open('/',{wallet:false});const box=await page.locator('.trade-action button').boundingBox();assert(box.y+box.height<=844);await shot('home-390');
  });
} finally {
  if(evidence){fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify(reports,null,2));fs.writeFileSync(path.join(evidence,'metrics.json'),JSON.stringify(metrics,null,2));}
  await context?.close();await browser.close();server.close();
}
