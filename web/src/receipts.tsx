import { parseReceipt } from './scoreboard';

export function Citation({ text }: { text: string }) {
  const receipt = parseReceipt(text);
  return receipt ? <p className="citation small"><a href={receipt.url} target="_blank" rel="noreferrer">cites @{receipt.handle}</a><span> · The cited account did not post this note.</span></p> : null;
}
