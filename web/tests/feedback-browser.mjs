// V7: the retired intake resolves without forms, signatures, API calls or history reads.
// Worker protocol tests remain separately preserved; no service is mounted by this fixture.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const dist=path.resolve(process.env.SITE_DIR||path.join(path.dirname(fileURLToPath(import.meta.url)),'../../dist'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{let file=req.url.split('?')[0].replace(/^\/preview\//,'');if(!file||file.endsWith('/'))file+='index.html';const p=path.join(dist,file);if(!p.startsWith(dist)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/preview/`;
const browser=await chromium.launch({headless:true});const reports=[];let context,page,requests,errors;
async function open(route='/feedback',wallet=false){
 await context?.close();requests=[];errors=[];context=await browser.newContext({viewport:{width:390,height:844}});
 if(wallet)await context.addInitScript(()=>{window.ethereum={request:async({method})=>{if(method==='eth_accounts'||method==='eth_requestAccounts')return ['0x1111111111111111111111111111111111111111'];if(method==='eth_chainId')return '0x1';throw Error('No signing permitted: '+method);},on(){},removeListener(){}};});
 await context.route('**/*',async route=>{const u=route.request().url();requests.push(u);if(u.startsWith(new URL(url).origin))await route.continue();else await route.abort();});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(route==='landing'?url:url+'app/#'+route);await page.getByRole('link',{name:route==='landing'?'Launch app':'@marginalia_md',exact:true}).waitFor();
}
async function check(name,fn){try{await fn();assert.deepEqual(errors,[]);assert(!requests.some(u=>u.includes('/api/feedback')));reports.push({name,result:'pass'});console.log('PASS',name);}catch(e){reports.push({name,result:'FAIL',error:e.stack});process.exitCode=1;console.error('FAIL',name,e.message);}}
try{
 await check('Old Feedback URL renders the exact paused paragraph even when Ethereum is unavailable',async()=>{await open();assert.equal(await page.locator('main p').innerText(),'Feedback intake is paused. Reach us on X at @marginalia_md.');});
 await check('No form, composer, board, adopted ledger or signature control remains',async()=>{await open('/feedback',true);assert.equal(await page.locator('main form, main input, main textarea, main button, main details').count(),0);assert.equal(await page.getByText('This week’s entries',{exact:true}).count(),0);});
 await check('Legacy tab alias resolves to the same paragraph',async()=>{await open('/?tab=feedback');assert.equal(await page.locator('main h1').innerText(),'Feedback');assert.equal(await page.locator('main p').count(),1);});
 await check('Top bar and app footer contain no Feedback entry',async()=>{await open();assert.equal(await page.locator('header a[href*="feedback"],footer a[href*="feedback"],nav a[href*="feedback"]').count(),0);});
 await check('Landing footer contains no Feedback entry',async()=>{await open('landing');assert.equal(await page.locator('a[href*="feedback"]').count(),0);});
 await check('X handle is a real keyboard-focusable link to the requested account',async()=>{await open();const link=page.getByRole('link',{name:'@marginalia_md'});assert.equal(await link.getAttribute('href'),'https://x.com/marginalia_md');await link.focus();assert.notEqual(await link.evaluate(e=>getComputedStyle(e).outlineStyle),'none');});
 await check('Paused route reflows in both themes at 320, 390 and 1440',async()=>{await open();for(const dark of [false,true])for(const width of [320,390,1440]){await page.emulateMedia({colorScheme:dark?'dark':'light'});await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth)<=width);}});
}finally{if(process.env.EVIDENCE_DIR){fs.mkdirSync(process.env.EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.EVIDENCE_DIR,'results.json'),JSON.stringify(reports,null,2));}await context?.close();await browser.close();server.close();}
