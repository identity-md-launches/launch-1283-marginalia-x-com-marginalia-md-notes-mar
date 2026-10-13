import { useState } from 'react';
import { zeroAddress, zeroHash, type Address } from 'viem';
import { PagesAbi } from '../pages-abi';
import { erc20Abi, MarginaliaHookAbi } from '../abi';
import { useApp, useRead } from '../chain';
import { fmtAmount, fmtDate, parseAmount, short } from '../lib';
import { intakeAbi } from '../market-abi';
import { UsdContext } from '../price';
import { sendChecked } from '../transactions';
import { Addr, Notice, TxButton, WalletAction } from '../ui';
import type { FeedProps } from './Feed';

/** No address means no surface, no read and no action. This is intentionally not a "coming soon" panel. */
export function PagesPanel(props: { author?: Address; handle?: string; feed?: FeedProps['feed'] }) {
  const { contracts } = useApp();
  return contracts.pages ? <LivePages {...props} /> : null;
}
function LivePages({ author, handle, feed }: { author?: Address; handle?: string; feed?: FeedProps['feed'] }) {
  const app = useApp(); const { pub, contracts: c, wallet, now } = app;
  const [amountText,setAmount] = useState('1'); const [side,setSide] = useState<'buy'|'sell'>('buy');
  const [tweet,setTweet] = useState(''); const [copied,setCopied] = useState(false); const [busy,setBusy] = useState(false);
  const [burnText,setBurn] = useState('');
  const normalized = handle?.replace(/^@/,'').toLowerCase();
  const validHandle = !!normalized && /^[a-z0-9_]{1,15}$/.test(normalized);
  const amount = /^\d+$/.test(amountText) && Number(amountText)>=1 && Number(amountText)<=10 ? BigInt(amountText) : null;
  const h = { address:c.pages!,abi:PagesAbi } as const;
  const read = useRead(author || validHandle ? async () => {
    const subject = author ? await pub.readContract({...h,functionName:'subjectOf',args:[author]}) : await pub.readContract({...h,functionName:'subjectOfHandle',args:[normalized!]});
    const [s,claim,next,pendingBurn,registered,claimWindow,answerDeadline,price] = await Promise.all([
      pub.readContract({...h,functionName:'subjects',args:[subject]}), pub.readContract({...h,functionName:'claims',args:[subject]}),
      pub.readContract({...h,functionName:'buyPrice',args:[subject,1n]}), pub.readContract({...h,functionName:'pendingBurn'}),
      author ? Promise.resolve(true) : pub.readContract({...h,functionName:'registeredHandle',args:[subject]}),
      pub.readContract({...h,functionName:'CLAIM_WINDOW'}),pub.readContract({...h,functionName:'ANSWER_DEADLINE'}),
      pub.readContract({address:c.hook,abi:MarginaliaHookAbi,functionName:'margPriceInImd'}),
    ]);
    const holding = wallet.account ? await pub.readContract({...h,functionName:'pagesOf',args:[subject,wallet.account]}) : 0n;
    const [eligible,balance,allowance,message,intake,action] = await Promise.all([
      wallet.account ? pub.readContract({...h,functionName:'eligible',args:[wallet.account]}) : false,
      wallet.account ? pub.readContract({address:c.imd,abi:erc20Abi,functionName:'balanceOf',args:[wallet.account]}) : 0n,
      wallet.account ? pub.readContract({address:c.imd,abi:erc20Abi,functionName:'allowance',args:[wallet.account,c.pages!]}) : 0n,
      wallet.account ? pub.readContract({...h,functionName:'claimMessage',args:[wallet.account]}) : '',
      pub.readContract({...h,functionName:'intake'}),pub.readContract({...h,functionName:'action'}),
    ]);
    const oracleCost = await pub.readContract({address:intake,abi:intakeAbi,functionName:'priceOf',args:[action,c.imd]});
    const quote = amount && (side==='buy' || holding>=amount) ? await pub.readContract({...h,functionName:side==='buy'?'buyPrice':'sellPrice',args:[subject,amount]}) : null;
    return {subject,s,claim,next,pendingBurn,registered,claimWindow,answerDeadline,price,holding,eligible,balance,allowance,message,oracleCost,quote};
  } : null,[author,normalized,wallet.account,amountText,side,Math.floor(now/15)],[author,normalized,wallet.account,amountText,side]);
  const s = read.error ? undefined : read.data;
  const total = s?.quote ? side==='buy' ? s.quote[0]+s.quote[1] : (s.quote[0]-s.quote[1])*99n/100n : 0n;
  const ready = !busy && !!s && !!amount && !!total && (side==='buy' ? s.eligible && s.holding+amount<=10n && s.balance>=total : s.holding>=amount);
  const tx = (name:string,args:readonly unknown[]) => () => sendChecked(app,c.pages!,PagesAbi,name,args);
  const approve = (cost:bigint) => () => sendChecked(app,c.imd,erc20Abi,'approve',[c.pages!,cost]);
  const common = {onDone:read.refresh,onBusyChange:setBusy};
  const burn = burnText ? parseAmount(burnText) : s?.pendingBurn;
  const minBurnOut = burn && s?.price ? burn*10n**18n*90n/(s.price*100n) : 0n;
  const canClaim = !busy && !!s && !!wallet.account && !!validHandle && /^\d+$/.test(tweet) && BigInt(tweet)>0n && BigInt(tweet)<(1n<<256n) && s.s[1]===zeroAddress && s.claim[0]===zeroHash && s.oracleCost>0n && s.oracleCost<=10n**18n && s.balance>=s.oracleCost;
  return <section className="pages-panel" aria-labelledby="pages-heading"><h2 id="pages-heading">{author ? 'Back this writer' : 'Pages'}</h2>
    <p>{author ? <>Writer <Addr a={author}/></> : `@${normalized}`}</p>
    <p className="small">Readers back a writer by holding their pages. 8% of every page trade goes to the writer. Holders can sell back to the curve at any time.</p>
    {!author && !validHandle && <p role="alert">Enter an X handle of 1–15 letters, numbers or underscores.</p>}
    {read.error && <Notice kind="bad"><p>Pages reads failed. <button onClick={read.refresh}>Retry Pages</button></p></Notice>}
    <p>Next page: {s ? fmtAmount(s.next[0]+s.next[1]) : '…'} IMD <UsdContext imd={s ? s.next[0]+s.next[1] : null}/> including a 10% fee.</p>
    <p className="small">0.05 IMD × page number, capped at 10 IMD from page 200, plus the fee. Nontransferable. Supply: {s?.s[0].toString() ?? '…'}.</p>
    <p>You hold {s?.holding.toString() ?? '…'} of 10.</p>
    <p className="small">{wallet.account ? s ? s.eligible ? 'Eligible to buy.' : 'Not yet eligible to buy.' : 'Checking eligibility…' : 'Connect to check eligibility.'} Backing opens with the identity.md whitelist, 10,000 MARG, or a posted note on the hook or Annex. Selling stays open to holders.</p>
    <fieldset disabled={busy}><legend>Back with pages</legend><div className="tabs" role="group" aria-label="Page trade direction"><button type="button" aria-pressed={side==='buy'} onClick={()=>setSide('buy')}>Buy</button><button type="button" aria-pressed={side==='sell'} onClick={()=>setSide('sell')}>Sell</button></div><label htmlFor="page-amount">Pages (1–10)</label><input id="page-amount" inputMode="numeric" value={amountText} onChange={e=>setAmount(e.target.value)}/></fieldset>
    {s?.quote && <p>{side==='buy'?'Maximum cost':'Minimum received'}: {fmtAmount(total)} IMD <UsdContext imd={total}/>. Fee: {fmtAmount(s.quote[1])} IMD <UsdContext imd={s.quote[1]}/>{side==='sell' && ' · 1% slippage.'}</p>}
    <WalletAction>{side==='buy' && s && !s.registered ? <><p className="small">Register this handle before its first trade. No fee; registration grants no ownership.</p><TxButton {...common} label="Register handle" busyLabel="Registering…" disabled={busy || !validHandle} onSend={tx('registerHandle',[normalized])}/></> : side==='buy' && s && s.allowance<total ? <TxButton {...common} primary label={`Approve ${fmtAmount(total)} IMD for pages`} busyLabel="Approving…" disabled={!ready} onSend={approve(total)}/> : <TxButton {...common} primary label={side==='buy'?'Buy pages':'Sell pages'} busyLabel="Trading pages…" disabled={!ready} onSend={tx(side,[s?.subject,amount,total])}/>}</WalletAction>
    {validHandle && <details><summary>Claim this handle</summary><p>Tweet exactly this sentence from @{normalized}. The panel checks the tweet and sets its named wallet as payee.</p><label htmlFor="claim-message">Exact claim message</label><textarea id="claim-message" readOnly value={s?.message ?? ''}/><div className="actions"><button type="button" disabled={!s?.message} onClick={async()=>{try{await navigator.clipboard.writeText(s!.message);setCopied(true);}catch{setCopied(false);}}}>{copied?'Copied':'Copy sentence'}</button>{s?.message && <a className="button" href={`https://x.com/intent/tweet?text=${encodeURIComponent(s.message)}`} target="_blank" rel="noreferrer">Post on X</a>}</div>
      <p>Escrow: {s ? fmtAmount(s.s[2]) : '…'} IMD <UsdContext imd={s?.s[2]}/>. Recycle date: {s?.s[3] ? fmtDate(Number(s.s[3]+s.claimWindow)) : 'Starts with the first page trade.'}</p>
      {s?.s[1]!==zeroAddress && s?.s[1] && <p>Claimed payee: <Addr a={s.s[1]}/></p>}
      <label htmlFor="claim-tweet">Tweet ID</label><input id="claim-tweet" inputMode="numeric" value={tweet} onChange={e=>setTweet(e.target.value.trim())} disabled={busy}/><p className="small">Panel fee: {s ? fmtAmount(s.oracleCost) : '…'} IMD <UsdContext imd={s?.oracleCost}/>. Reimbursed from available escrow on success.</p>
      <WalletAction>{s && s.allowance<s.oracleCost ? <TxButton {...common} label="Approve claim fee" busyLabel="Approving…" disabled={!canClaim} onSend={approve(s.oracleCost)}/> : <TxButton {...common} label="Request claim" busyLabel="Requesting…" disabled={!canClaim} onSend={tx('requestClaim',[normalized,/^\d+$/.test(tweet)?BigInt(tweet):0n])}/>}</WalletAction>
      {s && s.claim[0]!==zeroHash && <><p className="small">Pending request {short(s.claim[0])}. Abandon after {fmtDate(Number(s.claim[3]+s.answerDeadline))}.</p><TxButton {...common} label="Abandon unanswered claim" busyLabel="Abandoning…" disabled={busy || now<Number(s.claim[3]+s.answerDeadline)} onSend={tx('abandonClaim',[s.subject])}/></>}
      {s && s.s[2]>0n && <TxButton {...common} label="Recycle expired escrow" busyLabel="Recycling…" disabled={busy || s.s[1]!==zeroAddress || now<Number(s.s[3]+s.claimWindow) || s.claim[0]!==zeroHash} onSend={tx('recycle',[s.subject])}/>}
    </details>}
    {s && s.pendingBurn>0n && <details><summary>Retry deferred burn</summary><p>{fmtAmount(s.pendingBurn)} IMD <UsdContext imd={s.pendingBurn}/> waiting to be converted to MARG and burned.</p><label htmlFor="burn-amount">IMD to use</label><input id="burn-amount" inputMode="decimal" value={burnText||fmtAmount(s.pendingBurn,18,18)} onChange={e=>setBurn(e.target.value)} disabled={busy}/><TxButton {...common} label="Retry burn" busyLabel="Retrying…" disabled={busy || !burn || burn>s.pendingBurn || minBurnOut<=0n} onSend={tx('burn',[burn,minBurnOut])} explain="Uses the contract's reserved IMD, with a nonzero MARG minimum and 10% room."/></details>}
    {s && s.holding>0n && author && <section><h3>Sealed calls, revealed later</h3><p className="small">Public commitments by this writer. The draft stays with the writer until reveal; a seal hash alone cannot disclose it, and holding pages grants no notes, rooms or early access.</p><ul>{feed?.seals.filter(x=>x.author.toLowerCase()===author.toLowerCase()).map(x=><li key={x.hash}>{short(x.hash)} · {fmtDate(x.timestamp)}</li>)}</ul></section>}
  </section>;
}
