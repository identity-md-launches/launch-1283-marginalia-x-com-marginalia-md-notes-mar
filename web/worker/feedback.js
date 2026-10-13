import { encodeAbiParameters, isAddress, keccak256, recoverMessageAddress } from 'viem';
import { BRIEF, SITE, KINDS, MAX_BYTES, feedbackMessage, utf8Bytes, weekOf } from '../shared/feedback.js';
import { notedAuthors } from './noted.js';

class HttpError extends Error {
  constructor(status, message, retryAfter) { super(message); this.status = status; this.retryAfter = retryAfter; }
}
const addressKey = address => address.toLowerCase();
const entryKey = (week, id) => `entry:${week}:${id}`;
const rateKey = address => `rate:${addressKey(address)}`;
const fail = (status, message, retry) => { throw new HttpError(status, message, retry); };
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');

export function feedbackId(address, week, text) {
  // Fixed encoding: keccak256(abi.encode(address, uint256 week, string text)).
  return keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }, { type: 'string' }], [address, BigInt(week), text]));
}

export async function verifySubmission(body, now = Math.floor(Date.now() / 1000)) {
  if (!exactKeys(body, ['message', 'signature', 'address']) || typeof body.message !== 'string' || typeof body.signature !== 'string' || typeof body.address !== 'string') fail(400, 'Send message, signature and address.');
  if (!isAddress(body.address, { strict: false }) || !/^0x[0-9a-fA-F]{130}$/.test(body.signature)) fail(400, 'Invalid address or personal-sign signature.');
  let message;
  try { message = JSON.parse(body.message); } catch { fail(400, 'The signed message must be JSON.'); }
  if (!exactKeys(message, ['site', 'week', 'kind', 'text', 'handle']) || message.site !== SITE || !Number.isSafeInteger(message.week) || message.week !== weekOf(now)) fail(400, 'The message must name this site and the current week. Refresh and sign again.');
  if (!KINDS.includes(message.kind) || typeof message.text !== 'string' || !message.text.trim() || utf8Bytes(message.text) > MAX_BYTES) fail(400, 'Choose Site, Mechanics or Idea and enter 1–600 UTF-8 bytes.');
  if (new TextDecoder().decode(new TextEncoder().encode(message.text)) !== message.text) fail(400, 'Text contains invalid Unicode.');
  if (typeof message.handle !== 'string' || !/^[A-Za-z0-9_]{0,15}$/.test(message.handle)) fail(400, 'Use an X handle of up to 15 letters, numbers or underscores, without @.');
  if (feedbackMessage(message) !== body.message) fail(400, 'Sign the exact compact JSON in site, week, kind, text, handle order.');
  let recovered;
  try { recovered = await recoverMessageAddress({ message: body.message, signature: body.signature }); } catch { fail(401, 'Signature could not be recovered.'); }
  if (addressKey(recovered) !== addressKey(body.address)) fail(401, 'Signature does not match the posting wallet.');
  const address = addressKey(recovered);
  return { week: message.week, entry: { id: feedbackId(address, message.week, message.text), address, handle: message.handle, kind: message.kind, text: message.text, ts: now, noted: false }, message: body.message, signature: body.signature };
}

async function readBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(415, 'Use application/json.');
  if (Number(request.headers.get('content-length')) > 8192) fail(413, 'Request too large.');
  const reader = request.body?.getReader();
  if (!reader) fail(400, 'Request body is missing.');
  const chunks = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) { await reader.cancel(); fail(413, 'Request too large.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { fail(400, 'Invalid JSON body.'); }
}

function json(value, status = 200, cache = false, origin, retryAfter) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache ? 'public, max-age=60' : 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  if (retryAfter) headers['Retry-After'] = String(retryAfter);
  return new Response(JSON.stringify(value), { status, headers });
}
const errorResponse = error => json({ error: error instanceof HttpError ? error.message : 'Feedback storage is unavailable. Retry the same signed entry.' }, error.status || 503, false, undefined, error.retryAfter);

export async function readEntries(kv, week) {
  const entries = []; let cursor;
  do {
    const page = await kv.list({ prefix: `entry:${week}:`, ...(cursor ? { cursor } : {}) });
    for (const key of page.keys) {
      const row = key.metadata ? { entry: key.metadata } : await kv.get(key.name, 'json');
      if (!row?.entry) fail(503, 'The board is still synchronizing. Refresh in a minute.');
      entries.push(row.entry);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return entries.sort((a, b) => b.ts - a.ts || a.id.localeCompare(b.id));
}

export async function readLedger(kv) {
  const ledger = await kv.get('adopted.json', 'json') ?? { site: SITE, builds: [] };
  if (ledger.site !== SITE || !Array.isArray(ledger.builds)) fail(503, 'The adopted ledger is invalid.');
  for (const build of ledger.builds) {
    if (!Number.isSafeInteger(build.week) || !Array.isArray(build.implemented) || !build.implemented.length || !/^0x[0-9a-fA-F]{64}$/.test(build.attestationRequestId) || !/^[0-9a-f]{40}$/.test(build.commit) || typeof build.synthesis !== 'boolean') fail(503, 'The adopted ledger is invalid.');
    if (Math.abs(build.implemented.reduce((sum, entry) => sum + entry.share, 0) - 1) > 1e-9 || build.implemented.some(entry => !/^0x[0-9a-f]{64}$/.test(entry.id) || !isAddress(entry.author, { strict: false }) || !Number.isFinite(entry.share) || entry.share <= 0 || entry.share > 1)) fail(503, 'The adopted credits are invalid.');
  }
  return ledger;
}

export async function documentFor(env, week, request, includePick = false) {
  const [ledger, entries] = await Promise.all([readLedger(env.FEEDBACK), readEntries(env.FEEDBACK, week)]);
  const noted = await notedAuthors(env, request, entries.map(entry => entry.address));
  const doc = { site: SITE, week, brief: BRIEF, adopted: [...new Set(ledger.builds.flatMap(build => build.implemented.map(entry => entry.id)))], entries: entries.map(entry => ({ ...entry, noted: noted.has(entry.address) })) };
  if (includePick) {
    const pick = await env.FEEDBACK.get(`pick:${week}`, 'json');
    if (pick && (pick.week !== week || !/^0x[0-9a-fA-F]{64}$/.test(pick.attestationRequestId) || !Array.isArray(pick.ranked) || new Set(pick.ranked).size !== pick.ranked.length || pick.ranked.some(id => !entries.some(entry => entry.id === id)))) fail(503, 'The panel pick is invalid or its entries are still synchronizing.');
    return { ...doc, pick };
  }
  return doc;
}

/** Returns null for non-feedback paths, for mounting beside an existing asset handler. */
export async function handleFeedback(request, env) {
  const url = new URL(request.url);
  if (!/^\/api\/feedback(?:\/|$)/.test(url.pathname)) return null;
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return json({ error: 'Use the same-origin feedback route.' }, 403);
  try {
    if (!env.FEEDBACK) fail(503, 'Feedback intake is not configured yet.');
    if (url.pathname === '/api/feedback' && request.method === 'POST') {
      const body = await readBody(request);
      const submission = await verifySubmission(body);
      if (!env.FEEDBACK_WRITES) fail(503, 'Feedback intake is not configured yet.');
      const writer = env.FEEDBACK_WRITES.get(env.FEEDBACK_WRITES.idFromName(submission.entry.address));
      return await writer.fetch(new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
    }
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    if (url.pathname === '/api/feedback/adopted.json') return json(await readLedger(env.FEEDBACK), 200, true, origin);
    const match = url.pathname.match(/^\/api\/feedback\/(today|0|[1-9][0-9]{0,6})\.json$/);
    if (!match) return json({ error: 'Feedback document not found.' }, 404);
    const week = match[1] === 'today' ? weekOf() : Number(match[1]);
    return json(await documentFor(env, week, request, match[1] !== 'today'), 200, true, origin);
  } catch (error) { return errorResponse(error); }
}

/** One durable serializer per wallet. KV remains the public store; a transactional outbox
 * prevents concurrent isolates bypassing KV limits or losing an accepted entry on a KV failure. */
export class FeedbackWriter {
  constructor(state, env) { this.state = state; this.env = env; }
  async publish(pending) {
    const { entry, week } = pending;
    const rate = await this.state.storage.get('rate');
    await this.env.FEEDBACK.put(rateKey(entry.address), JSON.stringify(rate));
    // JSON escaping can expand valid 600-byte text beyond KV's 1 KiB metadata cap.
    // The value is still complete; readEntries falls back to it when metadata is absent.
    const options = utf8Bytes(JSON.stringify(entry)) <= 1024 ? { metadata: entry } : undefined;
    await this.env.FEEDBACK.put(entryKey(week, entry.id), JSON.stringify(pending), options);
    await this.state.storage.put(`done:${entry.id}`, true);
    await this.state.storage.delete(`pending:${entry.id}`);
  }
  async fetch(request) {
    return this.state.blockConcurrencyWhile(async () => {
      try {
        const pending = await verifySubmission(await readBody(request));
        const { entry, week } = pending;
        const storage = this.state.storage;
        const previous = await storage.get(`entry:${entry.id}`);
        if (previous) {
          if (previous.message !== pending.message) fail(409, 'This text is already posted this week. Its kind and handle cannot be changed.');
          if (!await storage.get(`done:${entry.id}`)) await this.publish(previous);
          return json({ id: entry.id });
        }
        // KV rate state is also consulted on cold/migrated writers; durable state closes its propagation gap.
        const mirror = await this.env.FEEDBACK.get(rateKey(entry.address), 'json');
        await storage.transaction(async tx => {
          const saved = await tx.get('rate');
          const rates = [saved, mirror].filter(Boolean);
          const lastTs = Math.max(...rates.map(rate => rate.lastTs), -3600);
          const count = Math.max(...rates.map(rate => rate.week === week ? rate.count : 0), 0);
          if (entry.ts - lastTs < 3600) fail(429, 'One entry per wallet per hour. Try again after the hour has passed.', Math.max(1, 3600 - (entry.ts - lastTs)));
          if (count >= 10) fail(429, 'Ten entries per wallet per week. Try again next week.', (week + 1) * 604800 - entry.ts);
          await tx.put('rate', { week, count: count + 1, lastTs: entry.ts });
          await tx.put(`entry:${entry.id}`, pending);
          await tx.put(`pending:${entry.id}`, pending);
          await tx.setAlarm(Date.now() + 60000);
        });
        await this.publish(pending);
        return json({ id: entry.id }, 201);
      } catch (error) { return errorResponse(error); }
    });
  }
  async alarm() {
    await this.state.blockConcurrencyWhile(async () => {
      try {
        const pending = await this.state.storage.list({ prefix: 'pending:' });
        for (const item of pending.values()) await this.publish(item);
      } finally {
        // Keep a durable retry scheduled beyond Cloudflare's finite automatic alarm retries.
        if ((await this.state.storage.list({ prefix: 'pending:' })).size) await this.state.storage.setAlarm(Date.now() + 60000);
      }
    });
  }
}

export default { async fetch(request, env) {
  const response = await handleFeedback(request, env);
  if (response) return response;
  return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
} };
