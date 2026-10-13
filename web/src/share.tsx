import { useEffect, useRef, useState } from 'react';
import { describeTarget, fmtDate, short, STATUS_LABEL } from './lib';
import { horizonEndOf, isThesis, type Note } from './notes';
import { parseReceipt } from './scoreboard';

export interface CardColumn { title: string; claim: string; author: string; result: string; detail?: string }
export interface ShareCard { kind: 'Note' | 'Duel' | 'Author'; title: string; columns: CardColumn[]; line: string; filename: string }
export function noteShareLine(n: Note): string {
  const sentence = n.text.trim().replace(/\s+/g, ' ').match(/^.*?[.!?](?=\s|$)|^.+$/u)?.[0] ?? '';
  const claim = isThesis(n) ? Array.from(sentence).slice(0, 140).join('') : describeTarget(n.side, n.targetBps);
  const stop = /[.!?]$/.test(claim) ? '' : '.';
  const title = n.source === 'annex' ? 'Marginalia Annex call' : `Marginalia note No. ${n.index}`;
  return `${title} by ${short(n.author)}: ${claim}${stop} ${STATUS_LABEL[n.status]}.`;
}
export function noteColumn(n: Note, token: string): CardColumn {
  const citation = parseReceipt(n.text);
  const rationale = citation ? n.text.trimStart().replace(/^\S+\s*/, '') : n.text;
  return {
    title: n.source==='annex' ? `Annex ${short(n.id,8,6)}` : `Note № ${n.index}`,
    claim: isThesis(n) ? n.text : `${token} ${describeTarget(n.side, n.targetBps)} in ${n.horizonDays} d — ${rationale}`,
    author: short(n.author),
    result: n.status === 0 ? `Open · horizon ${fmtDate(horizonEndOf(n))}` : STATUS_LABEL[n.status],
    detail: citation ? `cites @${citation.handle} · cited account did not post the note` : undefined,
  };
}
const clean = (text: string) => text.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, ' ');
function lines(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, max: number, gap: number) {
  // Character wrapping also bounds a long URL or an unbroken hash.
  const out: string[] = [];
  let line = '';
  for (const word of clean(text).split(/\s+/)) {
    if (ctx.measureText((line ? line + ' ' : '') + word).width <= width) { line += (line ? ' ' : '') + word; continue; }
    if (line) { out.push(line); line = ''; }
    for (const character of word) {
      if (line && ctx.measureText(line + character).width > width) { out.push(line); line = ''; }
      line += character;
    }
  }
  if (line) out.push(line);
  out.slice(0, max).forEach((s, i) => {
    let value = s;
    if (i === max - 1 && out.length > max) {
      while (ctx.measureText(value + '…').width > width) value = value.slice(0, -1);
      value += '…';
    }
    ctx.fillText(value, x, y + gap * i);
  });
}

/** All pixels are drawn here with system fonts. No network requests or image imports. */
export async function renderShareCard(card: ShareCard): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot create a share image. Copy the text below.');
  ctx.fillStyle = '#f6f1e7'; ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = '#b9471f'; ctx.fillRect(44, 40, 5, 550);
  ctx.fillStyle = '#1d1a16'; ctx.font = 'bold 36px Georgia, serif'; ctx.fillText('☞ Marginalia', 76, 80);
  ctx.font = '18px monospace'; ctx.textAlign = 'right'; ctx.fillText(card.kind.toUpperCase() + ' / ON ETHEREUM', 1124, 76); ctx.textAlign = 'left';
  ctx.strokeStyle = '#d9cfbd'; ctx.beginPath(); ctx.moveTo(76, 108); ctx.lineTo(1124, 108); ctx.stroke();
  ctx.font = 'bold 34px Georgia, serif'; lines(ctx, card.title, 76, 155, 1048, 1, 40);
  const width = card.columns.length === 2 ? 490 : 1048;
  for (const [i, col] of card.columns.slice(0, 2).entries()) {
    const x = 76 + i * 550;
    ctx.fillStyle = '#5a5146'; ctx.font = '19px monospace'; lines(ctx, col.title, x, 205, width, 1, 26);
    ctx.fillStyle = '#1d1a16'; ctx.font = '29px Georgia, serif'; lines(ctx, col.claim, x, 253, width, 5, 36);
    ctx.font = 'bold 23px Georgia, serif'; lines(ctx, col.result, x, 463, width, 2, 29);
    ctx.fillStyle = '#5a5146'; ctx.font = '18px monospace'; lines(ctx, `Posting wallet ${col.author}`, x, 532, width, 1, 23);
    if (col.detail) { ctx.font = '16px Georgia, serif'; lines(ctx, col.detail, x, 558, width, 2, 22); }
  }
  ctx.fillStyle = '#5a5146'; ctx.font = '17px Georgia, serif'; ctx.fillText('Informational, not advice. Bonds can be lost.', 76, 604);
  ctx.textAlign = 'right'; ctx.fillText('Say it with a bond.', 1124, 604);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create the image. Copy the text below.')), 'image/png'));
}

export function Share({ card, href, compact = false }: { card: ShareCard; href?: string; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const currentUrl = useRef('');
  const text = `${card.line}\n${href ? new URL(href, window.location.href).href : window.location.href}`;
  useEffect(() => () => { if (currentUrl.current) URL.revokeObjectURL(currentUrl.current); }, []);
  const share = async () => {
    setBusy(true); setMessage('');
    try {
      const blob = await renderShareCard(card);
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      const next = URL.createObjectURL(blob); currentUrl.current = next; setUrl(next);
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob, 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
        setMessage('Image and text copied. Paste into your post.');
      } catch {
        const a = document.createElement('a'); a.href = next; a.download = card.filename + '.png'; a.click();
        setMessage('Clipboard unavailable. Image downloaded; copy the text below.');
      }
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  };
  return <div className={`share ${compact ? 'share-compact' : ''}`}>
    <button type="button" onClick={share} disabled={busy}>{busy ? 'Drawing card…' : 'Share'}</button>
    <span className="small" role="status">{message}</span>
    {message && <div className="share-result">
      {url && <><img src={url} width="1200" height="630" alt={`${card.kind} share card: ${card.line}`} /><a className="button" href={url} download={card.filename + '.png'}>Download card</a></>}
      <label>Share text<textarea readOnly value={text} onFocus={e => e.target.select()} /></label>
      <button type="button" className="quiet" onClick={async () => { try { await navigator.clipboard.writeText(text); setMessage('Text copied.'); } catch { setMessage('Select the text above to copy it.'); } }}>Copy text</button>
      <p className="small">Drawn in this browser. Link preview images arrive with a separate service.</p>
    </div>}
  </div>;
}
