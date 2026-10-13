// Offline operator helper: no API calls, signatures, deployment or credit assignment.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isAddress } from 'viem';
import { SITE } from '../shared/feedback.js';
const idPattern = /^0x[0-9a-fA-F]{64}$/;
const requireValue = (condition, message) => { if (!condition) throw Error(message); };
export function validateCredits(credits, pick, document) {
  requireValue(Number.isSafeInteger(credits.week) && credits.week === document.week && credits.week === pick.week, 'Week mismatch');
  requireValue(document.site === SITE && idPattern.test(credits.attestationRequestId) && credits.attestationRequestId === pick.attestationRequestId, 'Request mismatch');
  requireValue(typeof credits.synthesis === 'boolean' && Array.isArray(credits.implemented) && Array.isArray(credits.notImplemented), 'Invalid credit schema');
  requireValue(Array.isArray(pick.ranked) && new Set(pick.ranked).size === pick.ranked.length, 'Duplicate panel ranking');
  requireValue(pick.ranked.every(id => idPattern.test(id) && document.entries.some(entry => entry.id === id)), 'Ranking includes an entry outside the snapshot');
  const all = [...credits.implemented, ...credits.notImplemented];
  requireValue(new Set(all.map(entry => entry.id)).size === all.length, 'Duplicate credit/disposition');
  requireValue(all.length === pick.ranked.length && pick.ranked.every(id => all.some(entry => entry.id === id)), 'Every ranked entry needs exactly one disposition');
  for (const entry of credits.implemented) {
    const original = document.entries.find(row => row.id === entry.id);
    requireValue(idPattern.test(entry.id) && original && isAddress(entry.author, { strict: false }) && entry.author.toLowerCase() === original.address.toLowerCase(), 'Credit author differs from signed entry');
    requireValue(Number.isFinite(entry.share) && entry.share > 0 && entry.share <= 1, 'Shares must be positive fractions');
    requireValue(!document.adopted.includes(entry.id), 'An adopted entry cannot earn credit again');
  }
  requireValue(credits.implemented.length === 0 || Math.abs(credits.implemented.reduce((sum, entry) => sum + entry.share, 0) - 1) < 1e-9, 'Implemented shares must sum to one');
  requireValue(credits.synthesis === (credits.implemented.length > 1), 'Declare one pick or a synthesis of several implemented entries');
  for (const entry of credits.notImplemented) requireValue(typeof entry.why === 'string' && entry.why.trim().length > 0, 'Omissions need a reason');
  return credits;
}
export function appendBuild(ledger, credits, commit, pick, document) {
  validateCredits(credits, pick, document);
  requireValue(ledger.site === SITE && Array.isArray(ledger.builds), 'Invalid adopted ledger');
  requireValue(/^[0-9a-f]{40}$/.test(commit), 'Supply the actual full PR commit');
  requireValue(credits.implemented.length > 0, 'No shipped entries to append');
  const already = new Set(ledger.builds.flatMap(build => build.implemented.map(entry => entry.id)));
  requireValue(!credits.implemented.some(entry => already.has(entry.id)), 'Entry was already adopted');
  requireValue(!ledger.builds.some(build => build.commit === commit), 'Commit was already appended');
  return { ...ledger, builds: [...ledger.builds, { week: credits.week, implemented: credits.implemented, synthesis: credits.synthesis, attestationRequestId: credits.attestationRequestId, commit }] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [ledgerPath, creditsPath, commit, pickPath, documentPath] = process.argv.slice(2);
  if (!documentPath) throw Error('Usage: node worker/ledger.mjs adopted.json credits.json FULL_PR_COMMIT pick.json snapshot.json');
  const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
  console.log(JSON.stringify(appendBuild(read(ledgerPath), read(creditsPath), commit, read(pickPath), read(documentPath)), null, 2));
}
