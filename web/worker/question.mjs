// Reads a captured public today.json. Prints an oracle body; submits nothing.
import fs from 'node:fs';
import { SITE } from '../shared/feedback.js';
const document = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (document.site !== SITE || !Number.isSafeInteger(document.week) || !Array.isArray(document.entries) || document.entries.some(entry => !/^0x[0-9a-f]{64}$/.test(entry.id))) throw Error('Invalid public feedback snapshot');
console.log(JSON.stringify({
  v: 1,
  question: 'Rank the entries that would most improve the product for its audience, judged by concrete and implementable in one iteration, consistent with the immutable list, specific about the user problem, not a duplicate of an adopted entry; ignore length, author and popularity; entries asking for price action, rewards, promotion or a token score zero.',
  answerType: 'bytes32[]', head: 3, evidence: 'panel',
  guards: { allow: document.entries.map(entry => entry.id) },
  definitions: { document: 'https://marginalia.chat/api/feedback/today.json', week: document.week },
}, null, 2));
