// Local test storage only; never bundled into the app.
import { FeedbackWriter } from '../worker/feedback.js';
export class KV {
  values = new Map(); metadata = new Map(); failWrite = false;
  async get(key, type) { const value = this.values.get(key) ?? null; return type === 'json' && value ? JSON.parse(value) : value; }
  async put(key, value, options) { if (this.failWrite) throw Error('KV unavailable'); if (options?.metadata && new TextEncoder().encode(JSON.stringify(options.metadata)).length > 1024) throw Error('KV metadata too large'); this.values.set(key, value); if (options?.metadata) this.metadata.set(key, options.metadata); }
  async list({ prefix, cursor }) {
    const keys = [...this.values.keys()].filter(key => key.startsWith(prefix)).sort();
    const offset = Number(cursor || 0);
    return { keys: keys.slice(offset, offset + 2).map(name => ({ name, metadata: this.metadata.get(name) })), list_complete: offset + 2 >= keys.length, cursor: String(offset + 2) };
  }
}
export function durableState() {
  const map = new Map();
  const storage = { get: async key => map.get(key), put: async (key, value) => { map.set(key, structuredClone(value)); }, delete: async key => map.delete(key), setAlarm: async () => {}, list: async ({ prefix }) => new Map([...map].filter(([key]) => key.startsWith(prefix))) };
  storage.transaction = async fn => { const before = structuredClone(map); try { return await fn(storage); } catch (error) { map.clear(); for (const [key, value] of before) map.set(key, value); throw error; } };
  let queue = Promise.resolve();
  return { storage, blockConcurrencyWhile: fn => { const next = queue.then(fn); queue = next.catch(() => {}); return next; } };
}
export function environment() {
  const env = { FEEDBACK: new KV() };
  const writers = new Map();
  env.FEEDBACK_WRITES = { idFromName: value => value, get: id => { if (!writers.has(id)) writers.set(id, new FeedbackWriter(durableState(), env)); return writers.get(id); } };
  return env;
}
