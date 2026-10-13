import { useState } from 'react';
import { zeroAddress, type Address } from 'viem';
import { AnnexAbi } from './annex-abi';
import { erc20Abi } from './abi';
import { useApp, useRead } from './chain';
import { fmtAmount, fmtDate, short, Status, utf8Length, validAddress } from './lib';
import { intakeAbi } from './market-abi';
import { UsdContext } from './price';
import { sendChecked } from './transactions';
import { Addr, Countdown, Notice, TxButton, WalletAction } from './ui';
import type { FeedProps } from './pages/Feed';
import { Entry } from './pages/Feed';
import type { Note } from './notes';
import { noteColumn, Share } from './share';

export function Admission() {
  const app = useApp(); const { contracts: c, pub, wallet, now } = app;
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const addresses = text.trim().split(/[\s,]+/).filter(Boolean);
  const valid = addresses.length > 0 && addresses.length <= 4 && addresses.every(a => validAddress(a) && a.toLowerCase() !== zeroAddress) && new Set(addresses.map(a => a.toLowerCase())).size === addresses.length;
  const state = useRead(c.annex ? async () => {
    const a = { address: c.annex!, abi: AnnexAbi } as const;
    const [intake, action] = await Promise.all([pub.readContract({ ...a, functionName: 'intake' }), pub.readContract({ ...a, functionName: 'action' })]);
    const cost = await pub.readContract({ address: intake, abi: intakeAbi, functionName: 'priceOf', args: [action, c.imd] });
    const allowance = wallet.account ? await pub.readContract({ address: c.imd, abi: erc20Abi, functionName: 'allowance', args: [wallet.account, c.annex!] }) : 0n;
    const balance = wallet.account ? await pub.readContract({ address: c.imd, abi: erc20Abi, functionName: 'balanceOf', args: [wallet.account] }) : 0n;
    const eligible = valid ? await Promise.all(addresses.map(async address => ({ address, code: await pub.getCode({ address: address as Address }), admitted: await pub.readContract({ ...a, functionName: 'admittedHook', args: [address as Address] }) }))) : [];
    return { cost, allowance, balance, eligible };
  } : null, [c.annex, wallet.account, text, Math.floor(now / 30)], [c.annex, wallet.account, text]);
  const s = state.data;
  const ready = valid && !!s && !state.error && s.cost > 0n && s.cost <= 10n ** 18n && s.balance >= s.cost && s.eligible.every(a => a.code && a.code !== '0x' && !a.admitted);
  return <details className="trade-details"><summary>Request a hook admission</summary>
    <p className="small">A panel can admit hooks that keep trading open to everyone. Up to four hooks per request. A refused or split answer can spend the fee without admitting a hook.</p>
    <label htmlFor="admission-hooks">Hook addresses</label><textarea id="admission-hooks" value={text} onChange={e => setText(e.target.value)} disabled={busy} placeholder="One address per line" />
    {text && !valid && <p className="status bad">Enter one to four distinct contract addresses.</p>}
    <p>Panel fee: {s ? fmtAmount(s.cost) : '…'} IMD <UsdContext imd={s?.cost} /></p>
    {s?.eligible.map(a => <p className="small" key={a.address}>{short(a.address)}: {a.admitted ? 'Already admitted' : !a.code || a.code === '0x' ? 'No contract code' : 'Not admitted'}</p>)}
    {state.error && <Notice kind="bad"><p>Admission reads failed. <button type="button" onClick={state.refresh}>Retry</button></p></Notice>}
    <WalletAction>{s && s.allowance < s.cost ? <TxButton label={`Approve ${fmtAmount(s.cost)} IMD for admission`} busyLabel="Approving…" disabled={!ready} onBusyChange={setBusy} onSend={() => sendChecked(app,c.imd,erc20Abi,'approve',[c.annex!,s.cost])} onDone={state.refresh} /> : <TxButton label="Request admission" busyLabel="Requesting…" disabled={!ready} onBusyChange={setBusy} onSend={() => sendChecked(app,c.annex!,AnnexAbi,'requestAdmission',[addresses])} onDone={state.refresh} />}</WalletAction>
  </details>;
}
export function AnnexNote({ n, refresh }: { n: Note; refresh: FeedProps['refresh'] }) {
  const app = useApp(); const { pub, contracts: c, wallet, now } = app;
  const [retraction, setRetraction] = useState('');
  const a = { address: c.annex!, abi: AnnexAbi } as const;
  const live = useRead(async () => {
    const [view, end, obs, block] = await Promise.all([
      pub.readContract({ ...a, functionName:'noteOf',args:[n.id] }), pub.readContract({ ...a,functionName:'horizonEnd',args:[n.id] }),
      pub.readContract({ ...a,functionName:'observationsOf',args:[n.id] }), pub.getBlock(),
    ]); return { view,end,obs,block };
  }, [n.id, Math.floor(now/15)], [n.id]);
  const s = live.error ? undefined : live.data, mine = wallet.account?.toLowerCase() === s?.view.author.toLowerCase();
  const end = s ? Number(s.end) : 0;
  const done = async () => { await live.refresh(); refresh(); };
  const tx = (name:string,args:readonly unknown[]) => () => sendChecked(app,c.annex!,AnnexAbi,name,args);
  const last = s?.obs.at(-1);
  const observeReady = !!s && s.view.status === Status.Open && now >= end && now <= end+21600 && (!last || s.block.number >= last.blockNumber+20n);
  return <><h1>Launched-token receipt</h1><p className="small">Annex · {short(n.id,10,6)}</p><ul className="ledger"><Entry n={s ? {...n,status:s.view.status,deposit:s.view.deposit} : n}/></ul>
    {!mine && s?.view.status===Status.Open && <a className="button" href={`#/post?counter=${n.id}`}>Counter this call</a>}
    <Share card={{ kind:'Note',title:'A call on the record',columns:[noteColumn(n,short(n.x))],line:`Marginalia Annex call by ${short(n.author)}.`,filename:`marginalia-annex-${n.id}` }} />
    {live.error && <Notice kind="bad"><p>Live note state unavailable.</p><button type="button" onClick={live.refresh}>Retry note</button></Notice>}
    <dl className="facts"><dt>Contract</dt><dd><Addr a={c.annex!}/></dd><dt>Horizon</dt><dd>{s ? fmtDate(end) : 'Reading…'} {s && now < end && <Countdown until={end}/>}</dd><dt>Bond</dt><dd>{s ? fmtAmount(s.view.deposit) : '…'} IMD <UsdContext imd={s?.view.deposit}/></dd><dt>Baseline</dt><dd>{s ? fmtAmount(s.view.postPrice,18,8) : '…'} IMD per 1e18 units of X <UsdContext imd={s?.view.postPrice}/></dd></dl>
    <h2>Observe and settle</h2><p className="small">Three readings, at least 20 blocks apart and spanning one hour, in the six hours after the horizon. The least favorable price decides.</p>
    <ol>{s?.obs.map(o => <li key={o.blockNumber.toString()} className="small">Block {o.blockNumber.toString()} · {fmtDate(Number(o.timestamp))} · X reading {o.xRead.toString()}</li>)}</ol>
    {s?.view.status === Status.Open && <WalletAction><TxButton label="Observe" busyLabel="Observing…" disabled={!observeReady} onSend={tx('observe',[n.id])} onDone={done}/><TxButton label="Settle" busyLabel="Settling…" disabled={now<=end+21600} onSend={tx('settle',[n.id])} onDone={done}/></WalletAction>}
    {mine && s && ([Status.Right,Status.VoidNoData] as number[]).includes(s.view.status) && s.view.deposit>0n && <TxButton label="Claim deposit" busyLabel="Claiming…" primary onSend={tx('claimDeposit',[n.id])} onDone={done}/>}
    {mine && s?.view.status===Status.Open && now<end && <details><summary>Retract this call</summary><p>Retracting forfeits the entire bond.</p><label htmlFor="annex-retraction">Reason (up to 280 bytes)</label><input id="annex-retraction" value={retraction} onChange={e=>setRetraction(e.target.value)}/><TxButton label="Retract and forfeit bond" busyLabel="Retracting…" disabled={utf8Length(retraction)>280} onSend={tx('retract',[n.id,retraction])} onDone={done}/></details>}
  </>;
}
