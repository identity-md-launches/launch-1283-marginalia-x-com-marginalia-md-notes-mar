import { useMemo, useState } from 'react';
import type { FeedData } from './notes';
import { readOpenWeeks } from './week';
import { YourWeekLines } from './your-week';
import { zeroHash } from 'viem';
import { useApp,useRead } from './chain';
import { JudgeActionsAbi,TreasuryAbi } from './lifecycle-abi';
import { MarginaliaHookAbi,erc20Abi } from './abi';
import { fmtAmount,fmtDate } from './lib';
import { UsdContext } from './price';
import { TxButton,WalletAction } from './ui';
import { sendChecked } from './transactions';
export function JudgingControls({feed}: {feed: FeedData | null}){
 const app=useApp(),{pub,contracts:c,now}=app;
 const defaults=useRead(()=>readOpenWeeks(pub,c.hook,c.judge),[feed?.loadedAt,Math.floor(now/30)],[c.hook,c.judge]);
 const [chosenWeek,setWeek]=useState<string | null>(null);
 const weekText=chosenWeek ?? (defaults.data ? String(defaults.data.defaultWeek) : '');
 const week=/^\d+$/.test(weekText)&&Number(weekText)<=4294967295?Number(weekText):null;
 const read=useRead(week!==null?async()=>{
  const j={address:c.judge,abi:JudgeActionsAbi} as const;
  const [requestedAt,request,judged,paid,deadline,eligible,pool]=await Promise.all([
   pub.readContract({...j,functionName:'requestedAt',args:[week]}),pub.readContract({...j,functionName:'requestOf',args:[week]}),pub.readContract({...j,functionName:'judgedSet',args:[week]}),pub.readContract({...j,functionName:'paid',args:[week]}),pub.readContract({...j,functionName:'ANSWER_DEADLINE'}),
   pub.readContract({...j,functionName:'eligibleTheses',args:[week]}),pub.readContract({address:c.hook,abi:MarginaliaHookAbi,functionName:'thesisPool',args:[week]}),
  ]); const abandonable=request!==zeroHash&&!judged&&now>=Number(requestedAt+deadline) ? await pub.simulateContract({...j,functionName:'abandonRequest',args:[week]}).then(()=>true).catch(()=>false) : false;
  return {requestedAt,request,judged,paid,deadline,pending:request!==zeroHash&&!judged,eligible,pool,abandonable};
 }:null,[week,feed?.loadedAt,Math.floor(now/30)],[week]);
 const s=read.error?undefined:read.data;
 const myWeeks=useMemo(()=>s && week!==null && s.pool>0n && !s.paid ? [{week,pool:s.pool,eligible:s.eligible}] : [],[s,week]);
 const treasury=useRead(async()=>({last:await pub.readContract({address:c.treasury,abi:TreasuryAbi,functionName:'lastDripDay'}),balance:await pub.readContract({address:c.imd,abi:erc20Abi,functionName:'balanceOf',args:[c.treasury]})}),[Math.floor(now/30)],[c.treasury]);
 const opens=week!==null?(week+1)*604800+c.limits.thesisGrace:0;
 const expired=!!s&&now>=Number(s.requestedAt+s.deadline);
 return <section><h2>Request and pay judging</h2><label htmlFor="judge-week">Week number</label><input id="judge-week" inputMode="numeric" value={weekText} onChange={e=>setWeek(e.target.value)}/>
  <p className="small">{week!==null ? `Opens ${fmtDate(opens)}.` : 'Finding the latest unpaid pot…'} The existing prize pool pays the panel; no wallet approval.</p>
  {defaults.error && chosenWeek === null && <p role="alert">Could not find the latest unpaid pot. Enter a week number or refresh to retry.</p>}
  <p className="small">An eligible thesis is one whose author posted a call under it within 7 days of the thesis.</p>
  {read.error&&<p role="alert">Could not read judging eligibility.</p>}
  {s&&<p>{s.eligible.length} eligible theses · {fmtAmount(s.pool)} IMD <UsdContext imd={s.pool}/> · {s.paid?'Paid':s.judged?'Judged':s.pending?'Request recorded':'No pending request'}</p>}
  <WalletAction><TxButton label="Request judging" busyLabel="Requesting…" disabled={!s||s.judged||now<opens||!s.eligible.length||s.pool<c.limits.judgeThreshold||(s.request!==zeroHash&&!expired)} onSend={()=>sendChecked(app,c.judge,JudgeActionsAbi,'requestJudging',[week])} onDone={read.refresh}/><TxButton label="Pay judged prize" busyLabel="Paying…" disabled={!s?.judged||s.paid} onSend={()=>sendChecked(app,c.judge,JudgeActionsAbi,'payJudged',[week])} onDone={read.refresh}/>{!!s?.abandonable&&<TxButton label="Abandon unanswered judging" busyLabel="Abandoning…" disabled={!expired||s.judged} onSend={()=>sendChecked(app,c.judge,JudgeActionsAbi,'abandonRequest',[week])} onDone={read.refresh}/>}</WalletAction>
  <YourWeekLines feed={feed} weeks={myWeeks}/>
  <h2>Treasury drip</h2><p className="small">Moves 2% of held IMD to the pools, at most once per UTC day.</p>{treasury.data&&<p>Available drip: {fmtAmount(treasury.data.balance*2n/100n)} IMD <UsdContext imd={treasury.data.balance*2n/100n}/></p>}
  <TxButton label="Drip to the pools" busyLabel="Dripping…" disabled={!treasury.data||!!treasury.error||treasury.data.last===Math.floor(now/86400)||treasury.data.balance*2n/100n===0n} onSend={()=>sendChecked(app,c.treasury,TreasuryAbi,'drip')} onDone={treasury.refresh}/>
 </section>;
}
