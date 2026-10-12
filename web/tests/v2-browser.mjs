// Browser regressions against the production export. No RPC request or transaction leaves the fixture.
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
const before = false;


const evidence = process.env.EVIDENCE_DIR;
if (evidence) fs.mkdirSync(evidence, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'imd-deployment.json')));
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
const abi = [...hookAbi, ...JSON.parse(fs.readFileSync(path.join(dist, 'abi/MarginaliaRouter.json'))), ...JSON.parse(fs.readFileSync(path.join(dist, 'abi/MarginaliaJudge.json'))), ...parseAbi([
  'function symbol() view returns (string)', 'function decimals() view returns (uint8)', 'function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)',
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
const reset = (patch = {}) => { f = { now: Math.floor(Date.now()/1000), head: deploy + 3500n, notes: true, status: 1, deposit: unit/4n, allowance: 100n*unit, claimed: false, pool: unit, count: 1, closed: true, checkpointAge: 7200, sealAge: null, symbol: 'MARG', decimals: 18, token: marg, wallet: true, account: author, chain: '0x1', observe: false, reject: true, requests: [], rpc: [], ...patch }; };
function event(name, values, block, logIndex = 0) {
  const ev = hookAbi.find(a => a.type === 'event' && a.name === name);
  return { address: hook, topics: encodeEventTopics({ abi: [ev], eventName: name, args: values }), data: encodeAbiParameters(ev.inputs.filter(i => !i.indexed), ev.inputs.filter(i => !i.indexed).map(i => values[i.name])), blockNumber: toHex(block), blockHash: toHex(block, {size:32}), transactionHash: tx, transactionIndex: '0x0', logIndex: toHex(logIndex), removed: false };
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
  const constants = { router, judge, treasury, imd, token:marg, UNIV3_FACTORY:v3, UNIV2_FACTORY:v2, WETH:weth, STAMP:unit/10n, MARG_BUY:unit/4n, BOND_MIN:unit/4n, BOND_MAX:10n*unit, SEAL_MIN:1800n, SEAL_MAX:21600n, SETTLE_WINDOW:21600n, THESIS_GRACE:604800n, SWEEP_AFTER:2419200n, TEXT_MAX:280n, THESIS_TEXT_MAX:8192n, MIN_TARGET_DELTA_BPS:1000, MAX_HORIZON_DAYS:90, KEEPER_BPS:1000n, JUDGE_THRESHOLD:2n*unit, poolId, getPoolKey:poolKey, margPriceInImd:unit, getLiquidity:unit, noteCount: f.notes ? 1n : 0n };
  if (fn in constants) return constants[fn];
  if (fn === 'symbol') return address.toLowerCase() === imd.toLowerCase() ? 'IMD' : f.symbol;
  if (fn === 'decimals') { if(f.noDecimals) throw Error('decimals unavailable'); return f.decimals; }
  if (fn === 'balanceOf') return f.balance ?? 100n*unit;
  if (fn === 'allowance') return args[1].toLowerCase() === hook.toLowerCase() ? (f.hookAllowance ?? f.allowance) : f.allowance;
  if (fn === 'getPool' || fn === 'getPair') return zeroAddress;
  if (fn === 'validateVenue') return venue;
  if (fn === 'priceWindows') return [f.checkpointAge === null ? 0n : BigInt(f.now-f.checkpointAge),0n,0n,0n,0n,0n,0n];
  if (fn === 'seals') return f.sealAge !== null && args[0].toLowerCase() === sealKey.toLowerCase() ? [BigInt(f.now-f.sealAge),unit,unit,unit, f.wrongSubject ? zeroHash : subject] : [0n,0n,0n,0n,zeroHash];
  if (fn === 'records') { if(f.newAuthor) return [0n,0,0,0,0,0,0]; return args[0].toLowerCase() === other.toLowerCase() ? [12500n,3,2,0,0,0,0] : [45000n,5,2,1,1,1,0]; }
  if (fn === 'eligibleTheses') return f.emptyPrize ? [] : [toHex(5,{size:32})];
  if (fn === 'today') return Math.floor(f.now/86400);
  if (fn === 'week') return Math.floor(f.now/604800);
  if (fn === 'refundPool' || fn === 'thesisPool') return f.pool;
  if (fn === 'notesPerDay') return f.count;
  if (fn === 'refundClaimed') return f.claimed;
  if (fn === 'judgedPaid' || fn === 'judgedSet') return false;
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
    else if (r.method === 'eth_blockNumber') result = toHex(f.head);
    else if (r.method === 'eth_getBlockByNumber') result = block(r.params[0]);
    else if (r.method === 'eth_getLogs') {
      const q = r.params[0];
      if ((f.failLogs && BigInt(q.fromBlock) < f.head-2000n) || (f.refuseBefore && BigInt(q.fromBlock) < f.refuseBefore)) return {jsonrpc:'2.0',id:r.id,error:{code:-32602,message:'Archive requests require a personal token'}};
      result = logs().filter(l => BigInt(l.blockNumber) >= BigInt(q.fromBlock) && BigInt(l.blockNumber) <= BigInt(q.toBlock) && (!q.topics?.[0] || (Array.isArray(q.topics[0]) ? q.topics[0].includes(l.topics[0]) : q.topics[0] === l.topics[0])));
    } else if (r.method === 'eth_call') {
      const call = r.params[0]; const {functionName,args=[]} = decodeFunctionData({abi,data:call.data});
      if (f.offchain && functionName === 'symbol') return {jsonrpc:'2.0',id:r.id,error:{code:3,message:'execution reverted',data:'0x556f1830'+encodeAbiParameters([{type:'address'},{type:'string[]'},{type:'bytes'},{type:'bytes4'},{type:'bytes'}], [call.to,['https://attacker.example/{sender}/{data}'],'0x1234','0x12345678','0x']).slice(2)}};
      const resultValue = value(functionName,args,call.to);
      result = encodeFunctionResult({abi,functionName,result:resultValue});
    } else if (r.method === 'eth_getTransactionByHash') { const t=f.requests[0]||{to:hook,data:'0x'};result={hash:tx,blockHash:toHex(f.head,{size:32}),blockNumber:toHex(f.head),transactionIndex:'0x0',from:author,to:t.to,input:t.data,value:'0x0',nonce:'0x0',gas:'0x5208',gasPrice:'0x1',type:'0x2',chainId:'0x1',maxFeePerGas:'0x1',maxPriorityFeePerGas:'0x1',v:'0x1',r:zeroHash,s:zeroHash}; }
    else if (r.method === 'eth_getTransactionReceipt' && f.delayReceipt) result = null;
    else if (r.method === 'eth_getTransactionReceipt') result = { transactionHash:tx, transactionIndex:'0x0', blockHash:toHex(f.head,{size:32}), blockNumber:toHex(f.head), from:author, to:hook, cumulativeGasUsed:'0x5208', gasUsed:'0x5208', effectiveGasPrice:'0x1', contractAddress:null, logs:[], logsBloom:`0x${'0'.repeat(512)}`, status:'0x1', type:'0x2' };
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
const browser = await (process.env.BROWSER === 'webkit' ? webkit : chromium).launch({headless:true});
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
      if(!f.reject){const {functionName,args}=decodeFunctionData({abi,data:t.data});if(functionName==='approve'){if(args[0].toLowerCase()===hook.toLowerCase())f.hookAllowance=args[1];else f.allowance=args[1];}if(functionName==='claimRefund')f.claimed=true;if(functionName==='claimDeposit')f.deposit=0n;}
      await route.fulfill({contentType:'application/json',body:JSON.stringify({reject:f.reject,hash:tx})});
    } else if(u.startsWith(url)) await route.continue();
    else {external.push(u);await route.abort();}
  });
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'#'+route);
  await page.locator('main#main').waitFor({timeout:12000}).catch(async e=>{console.error('BOOT',await page.locator('body').innerText());throw e;});
  await page.getByRole('button',{name:'Refresh',exact:true}).waitFor({timeout:100}).catch(()=>{});
  await page.waitForTimeout(300);
}
const text=()=>page.locator('main#main').innerText();
async function shot(name){if(evidence)await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true});}
async function callForm() {
  await page.locator('#x').fill(marg);
  await page.getByLabel(/Launch pool/).check();
  await page.locator('#text').fill(draft.text);
  await page.waitForTimeout(200);
}
async function sent(fn){const all=await page.evaluate(()=>window.__sent);const entry=all.map(t=>({...t,...decodeFunctionData({abi,data:t.data})})).find(t=>t.functionName===fn);assert(entry,`No ${fn} wallet request`);return entry;}
async function check(name,fn){try{await fn(); reports.push({name,result:'pass'});console.log('PASS',name);}catch(e){reports.push({name,result:'FAIL',error:e.stack});console.error('FAIL',name,e.message);if(page)console.error((await page.locator('body').innerText()).slice(0,3500));process.exitCode=1;}}try {
  await check('Scoreboard order, live prize, eligibility and citation ownership', async()=>{
    await open('/',{gallery:true});
    await page.locator('.ranking li').first().waitFor();
    assert.match(await page.locator('.prize').innerText(),/1 IMD/);
    assert.match(await page.locator('.prize').innerText(),/1 eligible thesis/);
    assert.match(await text(),/USD context unavailable/);
    assert.match(await page.locator('.ranking').first().locator('li').first().innerText(),/0x1111/);
    await page.getByRole('button',{name:'By hit rate',exact:true}).click();
    assert.match(await page.locator('.ranking').first().locator('li').first().innerText(),/0x2222/);
    assert.match(await page.locator('.cited-ranking').innerText(),/@market_reader/);
    assert.match(await text(),/The cited account did not post the note/);
    const sections=await page.evaluate(()=>['.prize','.leaderboards','#open-duels','.verdicts','.filters','.reasons'].map(s=>document.querySelector(s).getBoundingClientRect().top));
    assert(sections.every((v,i)=>i===0||v>sections[i-1]));
    await page.locator('.cited-ranking a').click();
    await page.getByRole('heading',{name:'Notes and theses',exact:true}).waitFor();
    assert.equal(await page.locator('.entry').count(),2);
    assert.equal(errors.length,0);assert.deepEqual(external,[]);
  });
  await check('Empty prize and wallet-free reading are invitations, not invented results',async()=>{
    await open('/',{notes:false,wallet:false,emptyPrize:true,pool:0n});
    await page.getByText(/no thesis entered yet/).waitFor();
    assert.match(await text(),/0 IMD/);assert.match(await text(),/Put yours on the ledger/);
    assert.equal(await page.locator('.ranking li').count(),0);
    assert.equal(f.requests.length,0);
  });
  await check('Note and duel show both wallets, claims, bonds and independent verdicts',async()=>{
    await open('/duel/0x2',{gallery:true});
    await page.getByRole('heading',{name:'Duel № 2'}).waitFor();
    assert.equal(await page.locator('.duel-side').count(),2);
    assert.match(await text(),/Awaiting both verdicts/);
    assert.match(await page.locator('.duel-pair').innerText(),/0.25 IMD bonded/);
    assert.match(await text(),/different targets and horizons can make both right/);
    await page.getByRole('link',{name:'№ 2',exact:true}).click();
    await page.getByRole('heading',{name:/Note № 2/}).waitFor();
    await page.getByRole('link',{name:'Counter this call',exact:true}).click();
    await page.locator('#x').waitFor();assert.equal((await page.locator('#x').inputValue()).toLowerCase(),marg.toLowerCase());
    assert.equal(await page.locator('#parent').inputValue(),toHex(2,{size:32}));
    assert(await page.getByLabel('Upward call',{exact:true}).isChecked());
  });
  await check('Author record shows net score, weighted wins and broken holds separately',async()=>{
    await open('/author/'+author,{gallery:true});
    await page.locator('.scoreboard-stats').waitFor();
    assert.match(await text(),/4.50/);assert.match(await text(),/40.0%/);
    assert.match(await text(),/1.50/);assert.match(await text(),/1 upward call broke/);
    assert.match(await text(),/Record of a wallet, claimable later/);
    assert.equal(await page.locator('.ledger .entry').count(),2);
  });
  await check('First wallet post progresses through token, target and one-line reason',async()=>{
    await open('/post',{notes:false,newAuthor:true});
    await page.locator('.post-steps').waitFor();assert.equal(await page.locator('#text').count(),0);
    assert(await page.getByRole('button',{name:'Continue',exact:true}).isDisabled());
    await page.locator('#x').fill(marg);await page.getByLabel(/Launch pool/).check();
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByRole('button',{name:'2x',exact:true}).click();assert.equal(await page.locator('#pct').inputValue(),'100');
    await page.getByRole('button',{name:'-25%',exact:true}).click();assert(await page.getByLabel('Downward call',{exact:true}).isChecked());
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByLabel('Say why in one line',{exact:true}).fill(draft.text);
    const post=page.getByRole('button',{name:'Post the call',exact:true});await post.waitFor();
    await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Post the call')?.disabled);
    await post.click();await page.getByRole('alert').filter({hasText:/reject|declined/i}).waitFor();
    const t=await sent('note');assert.equal(t.to.toLowerCase(),router.toLowerCase());
    assert.equal(t.args[0].targetBps,7500);assert.equal(t.args[0].side,1);assert.equal(t.args[2],600000000000000000n);
    assert(await post.isEnabled());assert.match(await text(),/binds the posting wallet, not every wallet/);
  });
  await check('Exact router approval persists only to router and rejected signing recovers',async()=>{
    await open('/post',{allowance:0n});await callForm();await page.locator('#bond').fill('0.25009');
    const approve=page.getByRole('button',{name:'Approve 0.60009 IMD to the router',exact:true});await approve.waitFor();await approve.click();
    await page.getByRole('alert').filter({hasText:/reject|declined/i}).waitFor();const t=await sent('approve');
    assert.equal(t.to.toLowerCase(),imd.toLowerCase());assert.equal(t.args[0].toLowerCase(),router.toLowerCase());assert.equal(t.args[1],600090000000000000n);
    assert(await approve.isEnabled());assert(!f.requests.some(t=>t.to.toLowerCase()===hook.toLowerCase()));
  });
  await check('Seal approval is exactly STAMP to runtime hook; draft remains local',async()=>{
    await open('/seal',{hookAllowance:0n,reject:false});await callForm();
    const approve=page.getByRole('button',{name:'Approve 0.1 IMD to the hook',exact:true});await approve.waitFor();await approve.click();
    const seal=page.getByRole('button',{name:'Seal the call',exact:true});await seal.waitFor();
    await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Seal the call')?.disabled);
    const t=await sent('approve');assert.equal(t.to.toLowerCase(),imd.toLowerCase());assert.equal(t.args[0].toLowerCase(),hook.toLowerCase());assert.equal(t.args[1],unit/10n);
    await seal.click();await page.getByText(/Draft saved in this browser/).waitFor();
    await page.waitForFunction(()=>window.__sent.length===2);
    const sealed=await sent('seal');assert.equal(sealed.to.toLowerCase(),hook.toLowerCase());assert.equal(sealed.args.length,3);assert.equal(sealed.args[2],hash);
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('marginalia.seals')));assert.equal(stored[hash].text,draft.text);
    assert(!sealed.data.includes(Buffer.from(draft.text).toString('hex')));assert.equal(f.requests.length,2);
    assert.deepEqual(external,[]);
  });
  await check('Seal checkpoints never reveal draft text, target, parent or side',async()=>{
    await open('/seal',{checkpointAge:null});await callForm();
    await page.getByLabel('Downward call',{exact:true}).check();await page.locator('#pct').fill('50');await page.locator('#parent').fill('0x9');
    await page.getByRole('button',{name:'Checkpoint venue',exact:true}).click();await page.getByRole('alert').filter({hasText:/reject|declined/i}).waitFor();
    const t=await sent('checkpointVenue');assert.equal(t.args[0].text,'');assert.equal(t.args[0].side,0);assert.equal(t.args[0].targetBps,11000);assert.equal(t.args[0].parentId,zeroHash);assert.equal(t.args[0].horizonDays,1);
    assert(!t.data.includes(Buffer.from(draft.text).toString('hex')));
    for(const r of f.rpc.filter(r=>r.method==='eth_call')) {const call=decodeFunctionData({abi,data:r.params[0].data});if(call.functionName==='validateVenue'||call.functionName==='checkpointVenue')assert.notEqual(call.args[0].text,draft.text);}
  });
  await check('Seal refuses immature checkpoint, insufficient IMD and missing local storage',async()=>{
    await open('/seal',{checkpointAge:1200});await callForm();const seal=page.getByRole('button',{name:'Seal the call',exact:true});await seal.waitFor();assert(await seal.isDisabled());assert.match(await text(),/opens in/);
    await open('/seal',{balance:0n});await callForm();await page.getByText(/Your wallet needs/).waitFor();assert(await page.getByRole('button',{name:'Seal the call',exact:true}).isDisabled());
    await open('/seal');await callForm();await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('denied');};});
    const blocked=page.getByRole('button',{name:'Seal the call',exact:true});await blocked.click();await page.getByRole('alert').filter({hasText:/Allow local storage/}).waitFor();assert.equal(f.requests.length,0);
  });
  await check('Reveal rejects early, late, wrong-subject and wrong-author seals; no fallback post',async()=>{
    for(const patch of [{sealAge:1700},{sealAge:22000},{sealAge:14400,wrongSubject:true},{sealAge:14400,account:other}]) {
      await open('/post',patch);const post=page.getByRole('button',{name:'Post the call',exact:true});await post.waitFor();assert(await post.isDisabled());assert.equal(f.requests.length,0);
    }
    await open('/post',{sealAge:14400});const post=page.getByRole('button',{name:'Post the call',exact:true});await post.waitFor();
    await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Post the call')?.disabled);
    await post.click();await page.getByRole('alert').filter({hasText:/reject|declined/i}).waitFor();const sentNote=await sent('note');assert(sentNote.args[4]<=BigInt(f.now+7200));
  });
  await check('Wrong chain offers add-chain and all signing controls stay guarded',async()=>{
    await open('/post',{chain:'0x2'});await callForm();assert(await page.getByRole('button',{name:'Post the call',exact:true}).isDisabled());
    await page.getByRole('button',{name:'Switch to Ethereum'}).click();await page.waitForTimeout(250);assert.deepEqual(await page.evaluate(()=>window.__added),[manifest.walletAddChain]);
    assert.match(await page.locator('.walletbar').innerText(),/on Ethereum/);
    await open('/post',{wallet:false});assert(await page.getByRole('button',{name:'Connect wallet',exact:true}).isDisabled());assert.equal(f.requests.length,0);
  });
  await check('Client share draws 1200x630 PNG and copies image plus text with zero network',async()=>{
    for(const route of ['/note/0x1','/duel/0x2','/author/'+author]) {
      await open(route,{gallery:true});await page.getByRole('button',{name:'Share',exact:true}).waitFor();
      await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async items=>{window.__clipboard=await Promise.all(items[0].types.map(async type=>({type,text:type==='text/plain'?await (await items[0].getType(type)).text():null,size:(await items[0].getType(type)).size})));}}}));
      const net=f.rpc.length;await page.getByRole('button',{name:'Share',exact:true}).click();await page.getByText('Image and text copied. Paste into your post.').waitFor();
      const image=page.locator('.share-result img');await image.waitFor();assert.deepEqual(await image.evaluate(i=>[i.naturalWidth,i.naturalHeight]),[1200,630]);
      const clip=await page.evaluate(()=>window.__clipboard);assert.deepEqual(clip.map(x=>x.type),['image/png','text/plain']);assert(clip[1].text.includes('Marginalia'));assert(clip[1].text.includes('#/'));assert(clip[0].size>10000);
      assert.equal(f.rpc.length,net);assert.deepEqual(external,[]);
      if(route.includes('/duel/'))await image.screenshot({path:path.join(evidence,'share-duel.png')});
    }
  });
  await check('Share fallback downloads PNG and leaves selectable text',async()=>{
    await open('/note/0x1',{gallery:true});await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async()=>{throw Error('denied');}}}));
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Share',exact:true}).click();assert.equal((await download).suggestedFilename(),'marginalia-note-1.png');
    assert.match(await page.locator('.share').innerText(),/Clipboard unavailable/);assert((await page.getByLabel('Share text').inputValue()).includes('0x1111'));
  });
  await check('Permissionless observe, settle and forfeit still simulate and request the hook',async()=>{
    for(const [patch,label,fn] of [[{status:0,noteAge:30*86400+100},'Observe','observe'],[{status:0,noteAge:30*86400+22000},'Settle','settle'],[{status:6,thesis:true,noteAge:8*86400},'Forfeit thesis','settleThesis']]) {
      await open('/note/0x1',patch);const button=page.getByRole('button',{name:label,exact:true});await button.waitFor();await button.click();await page.getByRole('alert').filter({hasText:/reject|declined/i}).waitFor();const t=await sent(fn);assert.equal(t.to.toLowerCase(),hook.toLowerCase());
    }
  });
  await check('Pools retain deposit, refund and eligible sweep controls',async()=>{
    await open('/pools');const claim=page.getByRole('button',{name:/^Claim deposit/});await claim.waitFor();assert(await claim.isEnabled());assert(await page.getByRole('button',{name:/^Claim refund/}).isEnabled());
    await claim.click();await page.getByRole('alert').filter({hasText:/reject|declined/i}).waitFor();assert.equal((await sent('claimDeposit')).to.toLowerCase(),hook.toLowerCase());
    assert(await page.getByRole('button',{name:/^Sweep day/}).isEnabled());
  });
  await check('Approvals stay pending through confirmation and allowance refresh',async()=>{
    await open('/post',{allowance:0n,reject:false,delayReceipt:true});await callForm();
    await page.getByRole('button',{name:'Approve 0.6 IMD to the router',exact:true}).click();
    await page.getByText(/Waiting for confirmation/).waitFor();
    const busy=page.getByRole('button',{name:'Approving…',exact:true});assert(await busy.isDisabled());
    await page.waitForTimeout(1100);assert(await busy.isDisabled());assert.equal(f.requests.length,1);
    f.delayReceipt=false;
    await page.getByRole('button',{name:'Post the call',exact:true}).waitFor({timeout:15000});assert.equal(f.requests.length,1);
  });
  await check('Token CCIP lookup cannot call an unapproved URL',async()=>{
    await open('/post',{offchain:true});await callForm();assert.deepEqual(external,[]);
    assert(await page.getByRole('button',{name:'Post the call',exact:true}).count());
  });
  await check('Incomplete history stays explicit and live read failures fail closed',async()=>{
    await open('/',{head:deploy+12000n,noteBlock:deploy+9500n,refuseBefore:deploy+4001n});
    await page.getByText(/History incomplete/).first().waitFor();
    await page.locator('.history summary').click();assert.match(await text(),/did not serve blocks/);
    f.refuseBefore=null;await page.getByRole('button',{name:'Load more history',exact:true}).click();
    await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();
    await open('/seal',{checkpointAge:null});await callForm();assert(await page.getByRole('button',{name:'Checkpoint venue',exact:true}).isEnabled());assert(await page.getByRole('button',{name:'Seal the call',exact:true}).isDisabled());
  });
  await check('All primary pages reflow at 320 and 390 pixels without clipped controls',async()=>{
    for(const route of ['/note/0x1','/duel/0x2','/author/'+author,'/post','/seal','/pools','/about']) {
      await open(route,{gallery:!['/post','/seal','/pools'].includes(route)});
      for(const width of [320,390]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' at '+width);}
      if(route==='/duel/0x2')await shot('duel-390');
      if(route==='/post')await shot('post-390');
      if(route==='/author/'+author)await shot('author-390');
      assert.equal(errors.length,0);assert.deepEqual(external,[]);
    }
  });
  await check('About serves verbatim agent docs from the gateway subpath',async()=>{
    await open('/about');for(const [label,name,source] of [['llms.txt','llms.txt','llms.txt'],['AGENTS.md','agents.md','AGENTS.md']]) {
      const href=await page.getByRole('link',{name:label,exact:true}).getAttribute('href');assert.equal(href,'./'+name);
      const body=await (await context.request.get(url+name)).text();assert.equal(body,fs.readFileSync(path.join(dist,'..',source),'utf8'));
    }
  });
  await check('Responsive production export, light/dark contrast, keyboard focus and enlarged text',async()=>{
    await open('/',{gallery:true});await page.locator('.ranking li').first().waitFor();
    for(const width of [320,390,768,1440]) {await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===390||width===1440)await shot('home-'+width);}
    await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
    await page.getByRole('button',{name:'By score',exact:true}).focus();await shot('home-dark-focus');
    metrics.dark=await page.evaluate(()=>({focus:getComputedStyle(document.activeElement).outlineStyle,paper:getComputedStyle(document.body).backgroundColor,ink:getComputedStyle(document.body).color,soft:getComputedStyle(document.querySelector('.small')).color,link:getComputedStyle(document.querySelector('.citation a')).color,tag:getComputedStyle(document.querySelector('.tag')).backgroundColor}));assert.equal(metrics.dark.focus,'solid');
    await page.emulateMedia({colorScheme:'light'});metrics.light=await page.evaluate(()=>({paper:getComputedStyle(document.body).backgroundColor,ink:getComputedStyle(document.body).color,soft:getComputedStyle(document.querySelector('.small')).color,link:getComputedStyle(document.querySelector('.citation a')).color,tag:getComputedStyle(document.querySelector('.tag')).backgroundColor}));
    await page.evaluate(()=>document.documentElement.style.fontSize='34px');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>document.documentElement.style.fontSize='');
    await page.getByRole('link',{name:'Seal',exact:true}).click();await page.getByRole('heading',{name:'Seal a note'}).waitFor();assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'x');
    assert.equal(errors.length,0);assert.deepEqual(external,[]);
  });
} finally {
  const lum = color => color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => (v/=255)<=0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
  for(const theme of ['light','dark'])if(metrics[theme]) {const c=metrics[theme];const contrast=(a,b)=>Number(((Math.max(lum(a),lum(b))+0.05)/(Math.min(lum(a),lum(b))+0.05)).toFixed(2));c.contrast={ink:contrast(c.ink,c.paper),secondary:contrast(c.soft,c.paper),link:contrast(c.link,c.paper),linkOnTag:contrast(c.link,c.tag)};}
  if(evidence){fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify(reports,null,2));fs.writeFileSync(path.join(evidence,'metrics.json'),JSON.stringify(metrics,null,2));}
  await browser.close();await new Promise(r=>server.close(r));
}
