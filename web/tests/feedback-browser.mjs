import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { hexToString, keccak256, toBytes } from 'viem';
import worker from '../worker/feedback.js';
import { environment } from './feedback-fixture.mjs';
import { feedbackMessage, weekOf } from '../shared/feedback.js';
const {chromium,webkit} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const here=path.dirname(fileURLToPath(import.meta.url));
const dist=process.env.SITE_DIR || path.resolve(here,'../../dist');
const evidence=process.env.EVIDENCE_DIR;
if(evidence) fs.mkdirSync(evidence,{recursive:true});
const account=privateKeyToAccount(generatePrivateKey());
const other=privateKeyToAccount(generatePrivateKey());
let env, mode, posted, requests, page;
const errors=[],results=[],metrics=[];
const server=createServer(async(req,res)=>{
  try {
    if(req.url.startsWith('/api/feedback')){
      const body=[];for await(const chunk of req)body.push(chunk);
      if(req.method==='POST')posted.push(JSON.parse(Buffer.concat(body).toString()));
      if(mode.apiError){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'Feedback service unavailable. Retry.'}));return;}
      const response=await worker.fetch(new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(body)}:{})}),env);
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    const rel=decodeURIComponent(req.url.split('?')[0]).replace(/^\/preview\//,'')||'index.html';
    const file=path.resolve(dist,rel);
    if(!file.startsWith(path.resolve(dist)+path.sep)){res.writeHead(404);res.end();return;}
    if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'content-type':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.png')?'image/png':'text/html'});res.end(fs.readFileSync(file));
  }catch(error){res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/preview/`;
const browser=await (process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true});
async function open(patch={}){
  if(page) await page.context().close();
  env=environment();mode={connected:true,chain:'0x1',...patch};posted=[];requests=[];errors.length=0;
  const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:patch.dark?'dark':'light',reducedMotion:'reduce'});
  page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.exposeFunction('__feedbackSign',async message=>{if(mode.holdSign)await new Promise(resolve=>{mode.releaseSign=resolve;});return account.signMessage({message:hexToString(message)});});
  await page.route('**/*',async route=>{
    if(route.request().url().startsWith(new URL(url).origin)) return route.continue();
    // Feedback must remain available even if the entire public RPC is down.
    const input=route.request().postDataJSON();const error=row=>({jsonrpc:'2.0',id:row.id,error:{code:-32000,message:'RPC unavailable in feedback fixture'}});
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(Array.isArray(input)?input.map(error):error(input??{}))});
  });
  await page.addInitScript(({address,connected,chain,missing,reject})=>{
    window.__requests=[];window.__current=connected?address:null;window.__reject=reject;window.__listeners={};
    if(!missing)window.ethereum={
      on:(name,fn)=>window.__listeners[name]=fn,removeListener:()=>{},
      request:async({method,params})=>{
        window.__requests.push({method,params});
        if(method==='eth_accounts')return window.__current?[window.__current]:[];
        if(method==='eth_requestAccounts'){window.__current=address;return[address];}
        if(method==='eth_chainId')return chain;
        if(method==='personal_sign'){if(window.__reject)throw Object.assign(new Error('Declined'),{code:4001});return window.__feedbackSign(params[0]);}
        throw Error('Unexpected wallet request: '+method);
      }
    };
  },{address:account.address,connected:mode.connected,chain:mode.chain,missing:mode.missing,reject:mode.reject});
  await page.goto(url+'#/?tab=feedback');await page.locator('#feedback-text').waitFor();
  await page.getByText('Reading this week’s feedback…',{exact:true}).waitFor({state:'hidden'});
}
async function fill(text='Put the next step beside the receipt.') { await page.locator('#feedback-text').fill(text); }
const action=()=>page.locator('.feedback-form button.primary');
async function shot(name,fullPage=false){if(evidence)await page.screenshot({path:path.join(evidence,`${process.env.BROWSER||'chromium'}-${name}.png`),fullPage});}
async function check(name,fn){try{await fn();assert.deepEqual(errors,[]);results.push({name,result:'pass'});console.log('PASS',name);}catch(error){results.push({name,result:'FAIL',error:error.stack});console.error('FAIL',name,error);process.exitCode=1;}}
try{
  await check('Feedback is fifth, fixed list precedes form, and board is empty with real service',async()=>{
    await open();assert.equal(await page.locator('.composer-tabs button').nth(4).innerText(),'Feedback');
    assert.equal(await page.locator('#feedback-fixed').innerText(),'Cannot change (immutable contracts)');
    assert(await page.locator('#feedback-fixed').evaluate(e=>!!(e.compareDocumentPosition(document.querySelector('.feedback-form'))&Node.DOCUMENT_POSITION_FOLLOWING)));
    await page.getByText('No entries this week. Tell us where you got stuck.').waitFor();
    assert.match(await page.locator('.feedback-form').innerText(),/No gas, no approval, no token movement/);await shot('rules-390');
  });
  await check('Real EIP-191 signature reaches Worker; exact JSON, handle normalization, saved entry',async()=>{
    await open();await fill('Keep the full error next to the action.');await page.locator('#feedback-kind').selectOption('Idea');await page.locator('#feedback-handle').fill('@reader');
    await page.locator('.feedback-signature summary').click();const preview=await page.locator('.feedback-signature pre').innerText();await action().click();
    await page.getByText(/Feedback saved\. Entry/).waitFor();assert.equal(posted.length,1);assert.equal(posted[0].message,preview);
    assert.deepEqual(JSON.parse(preview),{site:'marginalia.chat',week:weekOf(),kind:'Idea',text:'Keep the full error next to the action.',handle:'reader'});
    await page.locator('.feedback-entry').filter({hasText:'Keep the full error next to the action.'}).waitFor();
    assert.equal(await page.locator('#feedback-text').inputValue(),'');assert.deepEqual((await page.evaluate(()=>window.__requests)).filter(row=>!['eth_accounts','eth_requestAccounts','eth_chainId','personal_sign'].includes(row.method)),[]);await shot('posted-390');
  });
  await check('UTF-8 counter validates bytes and focuses text; handle validation is local',async()=>{
    await open();await fill('🙂'.repeat(151));assert.equal(await page.locator('#feedback-count').innerText(),'604 / 600 UTF-8 bytes');await action().click();
    assert.equal(await page.locator('#feedback-text').getAttribute('aria-invalid'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'feedback-text');assert.equal(posted.length,0);
    await fill('🙂'.repeat(150));await page.locator('#feedback-handle').fill('bad handle');await action().click();assert.equal(await page.evaluate(()=>document.activeElement.id),'feedback-handle');assert.equal(posted.length,0);
  });
  await check('Disconnected connect, missing wallet and wrong chain need no transaction/switch',async()=>{
    await open({connected:false});await fill();assert.equal(await action().innerText(),'Connect wallet to give feedback');await action().click();await page.getByRole('button',{name:'Sign and post feedback',exact:true}).waitFor();assert.equal(posted.length,0);
    await open({missing:true,connected:false});await fill();await action().click();await page.getByRole('alert').filter({hasText:'No browser wallet found'}).waitFor();
    await open({chain:'0x2'});await fill();await action().click();await page.getByText(/Feedback saved\. Entry/).waitFor();assert(!(await page.evaluate(()=>window.__requests)).some(row=>/switch|addEthereumChain|sendTransaction/.test(row.method)));
  });
  await check('Rejected signature preserves text and re-enables action',async()=>{
    await open({reject:true});await fill();await action().click();await page.getByRole('alert').filter({hasText:'Signature declined'}).waitFor();assert.equal(await page.locator('#feedback-text').inputValue(),'Put the next step beside the receipt.');assert.equal(await action().isDisabled(),false);assert.equal(posted.length,0);
    await page.evaluate(()=>window.__reject=false);await action().click();await page.getByText(/Feedback saved\. Entry/).waitFor();
  });
  await check('Pending locks form; account change before signature returns prevents POST',async()=>{
    await open({holdSign:true});await fill();await action().click();await page.getByRole('button',{name:'Sign in your wallet…'}).waitFor();assert(await page.locator('#feedback-text').isDisabled());
    await page.evaluate(address=>{window.__current=address;window.__listeners.accountsChanged?.([address]);},other.address);mode.releaseSign();await page.getByRole('alert').filter({hasText:'wallet changed'}).waitFor();assert.equal(posted.length,0);assert(!await action().isDisabled());
  });
  await check('HTTP error, board retry and signature reuse preserve draft',async()=>{
    await open({apiError:true});await page.getByRole('alert').filter({hasText:'service is unavailable'}).first().waitFor();await fill();await action().click();await page.getByRole('alert').filter({hasText:'Feedback service unavailable. Retry.'}).waitFor();assert.equal(await action().innerText(),'Retry posting feedback');
    mode.apiError=false;await action().click();await page.getByText(/Feedback saved\. Entry/).waitFor();assert.equal((await page.evaluate(()=>window.__requests)).filter(row=>row.method==='personal_sign').length,1);
    await page.getByRole('button',{name:'Refresh board',exact:true}).click();await page.getByText('No feedback builds adopted yet.').waitFor();
  });
  await check('Rate-limit response is displayed without gas or approvals',async()=>{
    await open();await fill('First entry.');await action().click();await page.getByText(/Feedback saved\. Entry/).waitFor();await fill('Second entry.');await action().click();await page.getByRole('alert').filter({hasText:'One entry per wallet per hour'}).waitFor();assert.equal(await page.locator('#feedback-text').inputValue(),'Second entry.');
  });
  await check('Picked order, verified note badge, self-reported handle and adopted shares render',async()=>{
    await open();const message=feedbackMessage({week:weekOf(),kind:'Mechanics',text:'Show the child-call deadline beside the thesis.',handle:'unverified_name'});
    const body={message,signature:await account.signMessage({message}),address:account.address};
    const response=await worker.fetch(new Request('https://marginalia.chat/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),env);const{id}=await response.json();
    await env.FEEDBACK.put(`noted:${account.address.toLowerCase()}`,'true');const requestId=keccak256(toBytes('browser fixture attestation'));
    await env.FEEDBACK.put(`pick:${weekOf()}`,JSON.stringify({week:weekOf(),attestationRequestId:requestId,ranked:[id]}));
    await env.FEEDBACK.put('adopted.json',JSON.stringify({site:'marginalia.chat',builds:[{week:weekOf(),implemented:[{id,author:account.address,share:1}],synthesis:false,attestationRequestId:requestId,commit:'c'.repeat(40)}]}));
    await page.getByRole('button',{name:'Refresh board',exact:true}).click();await page.getByText('posted a note',{exact:true}).waitFor();await page.getByText(/share 100%/).waitFor();assert.match(await page.locator('.feedback-pick').innerText(),/Show the child-call deadline/);
    await page.locator('.feedback-identity summary').click();await page.getByText('The handle is supplied by the wallet. It does not verify identity.').waitFor();await page.locator('.feedback-pick').scrollIntoViewIfNeeded();await shot('board-390');
  });
  await check('Long text/hashes, keyboard focus, dark mode and responsive layout',async()=>{
    for(const dark of[false,true]){
      await open({dark});await fill('W'.repeat(600));await page.locator('.feedback-signature summary').click();
      for(const width of[320,390,768,1440]){await page.setViewportSize({width,height:844});const size=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.equal(size.scroll,size.client);metrics.push({dark,width,...size});}
      await page.setViewportSize({width:320,height:844});await page.locator('#feedback-handle').focus();await page.keyboard.press('Tab');await page.keyboard.press('Tab');const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,outline:getComputedStyle(document.activeElement).outlineStyle}));assert.equal(focus.outline,'solid');await shot(dark?'focus-dark-320':'form-320');
    }
  });
}finally{
  if(evidence){fs.writeFileSync(path.join(evidence,`${process.env.BROWSER||'chromium'}-results.json`),JSON.stringify({results,metrics},null,2));}
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
