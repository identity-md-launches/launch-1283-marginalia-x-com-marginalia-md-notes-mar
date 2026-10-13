import assert from 'node:assert/strict';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeAbiParameters, keccak256 } from 'viem';
import worker, { feedbackId, verifySubmission, handleFeedback } from '../worker/feedback.js';
import { BRIEF, SITE, feedbackMessage, weekOf } from '../shared/feedback.js';

import { environment } from './feedback-fixture.mjs';

const account = privateKeyToAccount(generatePrivateKey());
const other = privateKeyToAccount(generatePrivateKey());
const originalNow = Date.now;
let now = Math.floor(originalNow() / 604800000) * 604800 + 10000;
Date.now = () => now * 1000;
const checks = [];
async function test(name, fn) { await fn(); checks.push(name); console.log(`PASS ${name}`); }
async function signed(text = 'Make the child-call deadline easier to find.', changes = {}, author = account) {
  const message = feedbackMessage({ week: weekOf(), kind: 'Site', text, handle: '', ...changes });
  return { message, signature: await author.signMessage({ message }), address: author.address };
}
const request = body => new Request('https://marginalia.chat/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://marginalia.chat' }, body: JSON.stringify(body) });
const get = (path, env) => worker.fetch(new Request(`https://marginalia.chat/api/feedback/${path}.json`), env);
try {
  await test('EIP-191 recovers the exact signing wallet without a network call', async () => {
    const originalFetch = globalThis.fetch; globalThis.fetch = () => { throw Error('Signature verification must be offline'); };
    try { assert.equal((await verifySubmission(await signed())).entry.address, account.address.toLowerCase()); } finally { globalThis.fetch = originalFetch; }
  });
  await test('ID uses abi.encode(address,uint256,string), case-independent address', async () => {
    const text = 'UTF-8: café'; const week = weekOf();
    const expected = keccak256(encodeAbiParameters([{type:'address'}, {type:'uint256'}, {type:'string'}], [account.address, BigInt(week), text]));
    assert.equal(feedbackId(account.address.toLowerCase(), week, text), expected);
    assert.notEqual(feedbackId(other.address, week, text), expected);
    assert.notEqual(feedbackId(account.address, week + 1, text), expected);
  });
  await test('Altered signer, signature and signed text are rejected', async () => {
    const body = await signed();
    await assert.rejects(verifySubmission({ ...body, address: other.address }), /does not match/);
    await assert.rejects(verifySubmission({ ...body, signature: '0x' }), /signature/);
    await assert.rejects(verifySubmission({ ...body, message: body.message.replace('easier', 'harder') }), /does not match/);
  });
  await test('Canonical JSON binds order, site, kind, text, handle and week', async () => {
    const body = await signed(); const parsed = JSON.parse(body.message);
    for (const message of [JSON.stringify({...parsed,site:'elsewhere'}), JSON.stringify({...parsed,kind:'Other'}), JSON.stringify({...parsed,extra:true}), JSON.stringify(parsed,null,2), JSON.stringify({...parsed,handle:'@alice'}), JSON.stringify({...parsed,week:weekOf()-1})]) await assert.rejects(verifySubmission({...body,message}));
  });
  await test('600 UTF-8 bytes accepted, 601 rejected; empty/malformed Unicode rejected', async () => {
    await verifySubmission(await signed('é'.repeat(300)));
    await assert.rejects(verifySubmission(await signed('é'.repeat(300)+'x')), /600/);
    await assert.rejects(verifySubmission(await signed('   ')), /600/);
    await assert.rejects(verifySubmission(await signed('\ud800')), /Unicode/);
  });
  await test('POST persists signed evidence, public entry and KV rate', async () => {
    const env=environment(); const body=await signed(); const response=await worker.fetch(request(body),env);
    assert.equal(response.status,201); const {id}=await response.json();
    const saved=await env.FEEDBACK.get(`entry:${weekOf()}:${id}`,'json'); assert.equal(saved.message,body.message); assert.equal(saved.signature,body.signature);
    assert.equal((await env.FEEDBACK.get(`rate:${account.address.toLowerCase()}`,'json')).count,1);
  });
  await test('Valid 600-byte text survives JSON expansion beyond the KV metadata cap', async () => {
    const env = environment(); const body = await signed('"'.repeat(600));
    const response = await worker.fetch(request(body), env); assert.equal(response.status, 201);
    const { id } = await response.json(); assert.equal(env.FEEDBACK.metadata.has(`entry:${weekOf()}:${id}`), false);
    assert.equal((await (await get('today', env)).json()).entries[0].text, '"'.repeat(600));
  });
  await test('Concurrent different entries enforce one per rolling hour', async () => {
    const env=environment(); const responses=await Promise.all((await Promise.all(['one','two','three'].map(text=>signed(text)))).map(body=>worker.fetch(request(body),env)));
    assert.deepEqual(responses.map(response=>response.status).sort(),[201,429,429]);
    assert.equal(responses.find(response=>response.status===429).headers.get('Retry-After'),'3600');
  });
  await test('Identical retry is idempotent; changed kind/handle cannot rewrite same ID', async () => {
    const env=environment(); const body=await signed(); const a=await worker.fetch(request(body),env); const b=await worker.fetch(request(body),env);
    assert.equal(b.status,200); assert.deepEqual(await a.json(),await b.json());
    const c=await worker.fetch(request(await signed(undefined,{kind:'Idea'})),env); assert.equal(c.status,409);
  });
  await test('One hour boundary, weekly tenth entry and next week reset', async () => {
    const start=now; const env=environment();
    for(let i=0;i<10;i++){ now=start+i*3600; assert.equal((await worker.fetch(request(await signed(`entry ${i}`)),env)).status,201); }
    now+=3599; assert.equal((await worker.fetch(request(await signed('too early')),env)).status,429);
    now++; assert.equal((await worker.fetch(request(await signed('eleventh')),env)).status,429);
    now=(weekOf()+1)*604800; assert.equal((await worker.fetch(request(await signed('new week')),env)).status,201); now=start;
  });
  await test('Rolling hour does not reset at the Unix week boundary', async () => {
    const start=now; const env=environment(); now=(weekOf()+1)*604800-10;
    assert.equal((await worker.fetch(request(await signed('before')),env)).status,201); now+=11;
    assert.equal((await worker.fetch(request(await signed('after')),env)).status,429); now=start;
  });
  await test('KV failure preserves durable outbox and retries without double-counting', async () => {
    const env=environment(); const body=await signed(); env.FEEDBACK.failWrite=true;
    assert.equal((await worker.fetch(request(body),env)).status,503); env.FEEDBACK.failWrite=false;
    assert.equal((await worker.fetch(request(body),env)).status,200);
    assert.equal((await env.FEEDBACK.get(`rate:${account.address.toLowerCase()}`,'json')).count,1);
    assert.equal((await (await get('today',env)).json()).entries.length,1);
  });
  await test('Alarm flushes an accepted outbox after a failed request', async () => {
    const env=environment(); const body=await signed('alarm'); env.FEEDBACK.failWrite=true; await worker.fetch(request(body),env); env.FEEDBACK.failWrite=false;
    await env.FEEDBACK_WRITES.get(account.address.toLowerCase()).alarm(); assert.equal((await (await get('today',env)).json()).entries.length,1);
  });
  await test('Current document has exactly the oracle shape; newest first and paginated KV complete', async () => {
    const env=environment(); const start=now;
    for(let i=0;i<4;i++){ now=start+i*3600; await worker.fetch(request(await signed(`entry ${i}`)),env); }
    const response=await get('today',env); const doc=await response.json();
    assert.deepEqual(Object.keys(doc),['site','week','brief','adopted','entries']); assert.equal(doc.site,SITE); assert.equal(doc.week,weekOf()); assert.deepEqual(doc.brief,BRIEF); assert.deepEqual(doc.adopted,[]);
    assert.deepEqual(doc.entries.map(entry=>entry.text),['entry 3','entry 2','entry 1','entry 0']);
    assert.deepEqual(Object.keys(doc.entries[0]),['id','address','handle','kind','text','ts','noted']); assert.equal(doc.entries[0].noted,false);
    assert.equal(response.headers.get('Cache-Control'),'public, max-age=60'); assert.equal(response.headers.get('Access-Control-Allow-Origin'),null); now=start;
  });
  await test('Pick and adopted ledger round trip, with exact picked order and shares', async () => {
    const env=environment(); const body=await signed(); const {id}=await (await worker.fetch(request(body),env)).json();
    const attestationRequestId=keccak256(new TextEncoder().encode('fixture request'));
    await env.FEEDBACK.put(`pick:${weekOf()}`,JSON.stringify({week:weekOf(),attestationRequestId,ranked:[id]}));
    const build={week:weekOf(),attestationRequestId,implemented:[{id,author:account.address,share:1}],synthesis:false,commit:'a'.repeat(40)};
    await env.FEEDBACK.put('adopted.json',JSON.stringify({site:SITE,builds:[build]}));
    assert.deepEqual((await (await get(String(weekOf()),env)).json()).pick.ranked,[id]);
    assert.deepEqual((await (await get('today',env)).json()).adopted,[id]); assert.deepEqual((await (await get('adopted',env)).json()).builds,[build]);
  });
  await test('Bad picks/credits fail visibly instead of showing fabricated or empty data', async () => {
    const env=environment(); await env.FEEDBACK.put(`pick:${weekOf()}`,JSON.stringify({week:weekOf(),ranked:['fake']}));
    assert.equal((await get(String(weekOf()),env)).status,503);
    await env.FEEDBACK.put('adopted.json',JSON.stringify({site:SITE,builds:[{week:weekOf()}]})); assert.equal((await get('adopted',env)).status,503);
  });
  await test('Same-origin CORS, malformed body, size cap, method and unconfigured routes', async () => {
    const env=environment(); const body=await signed();
    const cross=new Request(request(body),{headers:{Origin:'https://other.example','Content-Type':'application/json'}}); assert.equal((await worker.fetch(cross,env)).status,403);
    const same=await worker.fetch(new Request('https://marginalia.chat/api/feedback/today.json',{headers:{Origin:'https://marginalia.chat'}}),env); assert.equal(same.headers.get('Access-Control-Allow-Origin'),'https://marginalia.chat');
    assert.equal((await worker.fetch(new Request('https://marginalia.chat/api/feedback',{method:'POST',body:'bad'}),env)).status,415);
    assert.equal((await worker.fetch(request({message:'x'.repeat(8200)}),env)).status,413);
    assert.equal((await worker.fetch(new Request('https://marginalia.chat/api/feedback',{method:'DELETE'}),env)).status,405);
    assert.equal((await worker.fetch(request(body),{FEEDBACK:env.FEEDBACK})).status,503);
    assert.equal(await handleFeedback(new Request('https://marginalia.chat/not-feedback'),env),null);
  });
  await test('A cached positive chain result grants badge; handle alone does not', async () => {
    const env=environment(); const body=await signed('badge',{handle:'someone'}); await worker.fetch(request(body),env);
    assert.equal((await (await get('today',env)).json()).entries[0].noted,false);
    await env.FEEDBACK.put(`noted:${account.address.toLowerCase()}`,'true'); assert.equal((await (await get('today',env)).json()).entries[0].noted,true);
  });
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
} finally { Date.now=originalNow; }
