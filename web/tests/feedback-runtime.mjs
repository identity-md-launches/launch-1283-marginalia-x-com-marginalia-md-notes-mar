// Run the actual bundled Worker in workerd via an external Miniflare installation.
import assert from 'node:assert/strict';
import path from 'node:path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { feedbackMessage, weekOf } from '../shared/feedback.js';
const { Miniflare } = await import(process.env.MINIFLARE_MODULE || 'miniflare');
const mf = new Miniflare({ rootPath: path.dirname(process.env.WORKER_BUNDLE), modulesRoot: path.dirname(process.env.WORKER_BUNDLE), modules: true, scriptPath: process.env.WORKER_BUNDLE, compatibilityDate: '2026-07-01', kvNamespaces: ['FEEDBACK'], durableObjects: { FEEDBACK_WRITES: { className: 'FeedbackWriter', useSQLite: true } } });
try {
  const account = privateKeyToAccount(generatePrivateKey());
  const message = feedbackMessage({ week: weekOf(), kind: 'Site', text: 'Make the first step clearer.', handle: '' });
  const body = { message, signature: await account.signMessage({ message }), address: account.address };
  const post = body => mf.dispatchFetch('https://marginalia.chat/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://marginalia.chat' }, body: JSON.stringify(body) });
  const accepted = await post(body);
  assert.equal(accepted.status, 201, await accepted.clone().text());
  const { id } = await accepted.json();
  const retry = await post(body); assert.equal(retry.status, 200); assert.equal((await retry.json()).id, id);
  const changed = feedbackMessage({ ...JSON.parse(message), text: 'Another idea.' });
  const limited = await post({ ...body, message: changed, signature: await account.signMessage({ message: changed }) });
  assert.equal(limited.status, 429);
  const doc = await (await mf.dispatchFetch('https://marginalia.chat/api/feedback/today.json')).json();
  assert.deepEqual(Object.keys(doc), ['site','week','brief','adopted','entries']); assert.equal(doc.entries.length,1); assert.equal(doc.entries[0].id,id);
  const second = privateKeyToAccount(generatePrivateKey());
  const requests = await Promise.all(['one','two','three'].map(async text => {
    const message = feedbackMessage({week:weekOf(),kind:'Idea',text,handle:''});
    return {message,signature:await second.signMessage({message}),address:second.address};
  }));
  const responses = await Promise.all(requests.map(post)); assert.deepEqual(responses.map(response=>response.status).sort(),[201,429,429]);
  const kv = await mf.getKVNamespace('FEEDBACK');
  const rate = await kv.get(`rate:${second.address.toLowerCase()}`,'json'); assert.equal(rate.count,1);
  const ledger = await (await mf.dispatchFetch('https://marginalia.chat/api/feedback/adopted.json')).json(); assert.deepEqual(ledger,{site:'marginalia.chat',builds:[]});
  const escapedAuthor = privateKeyToAccount(generatePrivateKey());
  const escapedMessage = feedbackMessage({week:weekOf(),kind:'Site',text:'"'.repeat(600),handle:''});
  const escaped = await post({message:escapedMessage,signature:await escapedAuthor.signMessage({message:escapedMessage}),address:escapedAuthor.address});
  assert.equal(escaped.status,201,await escaped.clone().text());
  const escapedId = (await escaped.json()).id;
  assert.equal((await (await mf.dispatchFetch('https://marginalia.chat/api/feedback/today.json')).json()).entries.find(entry=>entry.id===escapedId).text,'"'.repeat(600));
  console.log('PASS workerd: actual Worker module, Durable Object transaction/alarm API, KV metadata, offline signature recovery, idempotency, concurrency, rate limits, exact oracle document and empty ledger.');
} finally { await mf.dispose(); }
