import { useEffect, useState } from 'react';
import { decodeEventLog, formatUnits, parseUnits, zeroAddress, zeroHash, type Address, type Hex } from 'viem';
import { useApp, useRead } from './chain';
import { erc20Abi, MarginaliaHookAbi, MarginaliaRouterAbi } from './abi';
import { AnnexAbi } from './annex-abi';
import { TradeRouterAbi } from './trade-abi';
import { wrapAbi } from './market-abi';
import { approvalPlan, baselineBound, discoverMarkets, eq, publicParams, quoteMarket } from './market';
import { fmtAmount, parseAmount, parseTarget, short, utf8Length, validAddress, venueId, type NoteParams, type PoolKey } from './lib';
import { Countdown, Notice, TxButton, WalletAction } from './ui';
import { DollarSource, UsdContext } from './price';
import { sendChecked } from './transactions';
import { rememberVenue } from './pages/Post';
import { HOLD_RULE } from './scoreboard';
import type { Note } from './notes';
import { Admission } from './annex';
import { ChildCallContext, ThesisParentField, useThesisParent } from './child-call';
import { checkThesisParent } from './thesis-parent';
const DRAFT_KEY = 'marginalia.trade.v3';
type Draft = { token: string; amount: string; side: number; pct: string; days: string; why: string; bond: string; manual: string; parentId: string };
function readDraft(fallback: Draft): Draft {
  try { const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null'); const d = stored && { parentId: '', ...stored }; return d && Object.keys(fallback).every(k => typeof d[k] === typeof fallback[k as keyof Draft]) ? d : fallback; } catch { return fallback; }
}
export function TradeForm({ annex = false, refresh, counter, childId }: { annex?: boolean; refresh: () => void; counter?: Note; childId?: string | null }) {
  const app = useApp(); const { pub, cfg, contracts: c, wallet, now } = app;
  const [draft, setDraft] = useState<Draft>(() => {
    const defaults = { token: c.marg, amount: '1', side: 0, pct: '25', days: '7', why: '', bond: '0.25', manual: '', parentId: '' };
    // A child link carries only the thesis ID, never the thesis's token or a saved counter draft.
    return childId && !annex && !counter ? { ...defaults, token: '', parentId: childId } : readDraft(defaults);
  });
  useEffect(()=>{if(counter)setDraft(d=>({...d,token:counter.x,side:counter.side===0?1:0,days:String(counter.horizonDays)}));},[counter?.id]);
  const [token, setToken] = useState(draft.token);
  const [selected, setSelected] = useState('');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pendingAction,setPendingAction] = useState<{kind:string; approval?:{token:Address;amount:bigint;allowance:bigint;balance:bigint}} | null>(null);
  const [posted, setPosted] = useState<Hex | null>(null);
  const [storageError, setStorageError] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }));
  useEffect(() => { const timer = setTimeout(() => { setToken(draft.token.trim()); setSelected(''); }, 350); return () => clearTimeout(timer); }, [draft.token]);
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { setStorageError(true); } }, [draft]);
  let manualKey: PoolKey | undefined, manualError: string | undefined;
  if (draft.manual.trim()) { try {
    const k = JSON.parse(draft.manual);
    if (![k.currency0, k.currency1, k.hooks].every(a => typeof a === 'string' && validAddress(a)) || !Number.isInteger(k.fee) || k.fee < 0 || k.fee > 8388608 || !Number.isInteger(k.tickSpacing) || k.tickSpacing <= 0 || k.tickSpacing > 32767) throw new Error();
    manualKey = k;
  } catch { manualError = 'Enter a complete PoolKey JSON: currency0, currency1, fee, tickSpacing, hooks.'; } }
  const finder = useRead(validAddress(token) && (!annex || c.annex) && !manualError ? () => discoverMarkets(pub, cfg, c, token as Address, annex, manualKey) : null, [token, annex, draft.manual, revision]);
  const market = finder.data?.markets.find(m => m.id === selected) ?? finder.data?.markets[0];
  const subjectReady = !!market && eq(token, draft.token.trim()) && !finder.error && !finder.loading;
  const symbol = finder.data?.symbol ?? 'token';
  const quoteSymbol = market && eq(market.venue.quote, c.imd) ? 'IMD' : market?.venue.quote === zeroAddress ? 'ETH' : 'WETH';
  const input = market ? draft.side === 0 ? market.venue.quote : token as Address : undefined;
  const inputSymbol = draft.side === 0 ? quoteSymbol : symbol;
  const inputDecimals = draft.side === 0 ? 18 : finder.data?.decimals;
  let amount: bigint | null = null;
  try { if (/^\d+(\.\d+)?$/.test(draft.amount) && inputDecimals !== undefined && (draft.amount.split('.')[1]?.length ?? 0) <= inputDecimals) amount = parseUnits(draft.amount, inputDecimals); } catch { /* validation below */ }
  const bond = parseAmount(draft.bond);
  const L = c.limits;
  const bondOk = bond !== null && bond >= L.bondMin && bond <= L.bondMax;
  const imdIn = bondOk ? L.stamp + L.margBuy + bond! : null;
  const target = parseTarget(draft.side, draft.pct, L.minTargetDeltaBps);
  const childParent = useThesisParent(!annex && !counter ? draft.parentId : '');
  const days = Number(draft.days), bytes = utf8Length(draft.why);
  const counterOk = !counter || counter.status===0 && counter.author.toLowerCase()!==wallet.account?.toLowerCase() && draft.side!==counter.side && eq(token,counter.x);
  const fieldsOk = childParent.ready && counterOk && subjectReady && bondOk && !target.error && Number.isInteger(days) && days >= 1 && days <= L.maxHorizonDays && bytes > 0 && bytes <= L.textMax;
  const params: NoteParams | null = market && fieldsOk ? { ...publicParams(token as Address, market.venue), side: draft.side, targetBps: target.targetBps!, horizonDays: days, text: draft.why, parentId: counter?.id ?? childParent.id ?? zeroHash } : null;
  const spender = annex ? c.annex : c.router;
  const window = useRead(subjectReady && spender ? async () => {
    const args = [venueId(market!.venue)] as const;
    return annex ? pub.readContract({ address: spender, abi: AnnexAbi, functionName: 'priceWindows', args }) : pub.readContract({ address: spender, abi: MarginaliaRouterAbi, functionName: 'priceWindows', args });
  } : null, [subjectReady, market?.id, spender, revision, Math.floor(now / 15)], [subjectReady, market?.id, spender]);
  const started = window.data ? Number(window.data[0]) : 0;
  const age = now - started;
  const checkpointReady = !window.error && started > 0 && age >= 3600 && age <= 21600;
  const quote = useRead(!annex && subjectReady && input && input !== zeroAddress && amount && amount > 0n ? async () => ({ ...await quoteMarket(pub, cfg, c, market!, input!, amount!), at: Date.now() }) : null,
    [annex, subjectReady, market?.id, input, amount?.toString(), revision, Math.floor(now / 15)], [annex, subjectReady, market?.id, input, amount?.toString()]);
  const margPrice = useRead(() => pub.readContract({ address: c.hook, abi: MarginaliaHookAbi, functionName: 'margPriceInImd' }), [Math.floor(now / 15)], [c.hook]);
  const minMargOut = margPrice.data && !margPrice.error ? L.margBuy * 10n ** 18n * 90n / (margPrice.data * 100n) : 0n;
  const baseline = useRead(annex && subjectReady && checkpointReady ? () => pub.readContract({ address: c.annex!, abi: AnnexAbi, functionName: 'postPrice', args: [market!.venue, draft.side === 0] }) : null,
    [annex, market?.id, subjectReady, checkpointReady, draft.side, revision, Math.floor(now / 15)], [annex, market?.id, subjectReady, checkpointReady, draft.side]);
  const spendPlan = annex ? imdIn ? [{ token: c.imd, amount: imdIn }] : [] : input && amount && imdIn ? approvalPlan(input, c.imd, amount, imdIn) : [];
  const planKey = spendPlan.map(p => `${p.token}:${p.amount}`).join('|');
  const funds = useRead(wallet.account && spender && spendPlan.length ? async () => {
    const plans = await Promise.all(spendPlan.map(async p => {
      const [balance, allowance] = await Promise.all([
        pub.readContract({ address: p.token, abi: erc20Abi, functionName: 'balanceOf', args: [wallet.account!] }),
        pub.readContract({ address: p.token, abi: erc20Abi, functionName: 'allowance', args: [wallet.account!, spender] }),
      ]); return { ...p, balance, allowance };
    }));
    const eth = await pub.getBalance({ address: wallet.account! });
    return { plans, eth };
  } : null, [wallet.account, spender, planKey, revision, Math.floor(now / 15)], [wallet.account, spender, planKey]);
  const missing = funds.data?.plans.find(p => p.balance < p.amount);
  const nextApproval = funds.data?.plans.find(p => p.allowance < p.amount);
  const approval = busy && pendingAction?.approval ? pendingAction.approval : nextApproval;
  const quoteReady = annex ? !!baseline.data && !baseline.error : !!quote.data && !quote.error && Date.now() - quote.data.at < 30000 && amount! > 0n && input !== zeroAddress;
  const canProceed = !!params && checkpointReady && quoteReady && minMargOut > 0n && !!funds.data && !funds.error && !missing;
  const wrap = !annex && input && eq(input, c.weth) && missing && eq(missing.token, c.weth) && funds.data && funds.data.eth > missing.amount - missing.balance;
  const done = async () => { setRevision(r => r + 1); await funds.refresh(); refresh(); };
  const checkpoint = async () => sendChecked(app, spender!, annex ? AnnexAbi : MarginaliaRouterAbi, 'checkpointVenue', [publicParams(token as Address, market!.venue), market!.key]);
  const submit = async () => {
    if (!params || !market || !canProceed) throw new Error('Refresh the quote and review the form.');
    let deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    if (childParent.id) {
      const closes = BigInt(await checkThesisParent(pub, c.hook, childParent.id, wallet.account!, L.thesisGrace));
      if (closes < deadline) deadline = closes;
    }
    if (annex) return sendChecked(app, c.annex!, AnnexAbi, 'post', [params, market.key, bond!, minMargOut, baselineBound(baseline.data!, draft.side), deadline]);
    const x = { kind: market.kind, key: market.key, zeroForOne: market.venue.xIsToken0 === (draft.side === 1), pool: market.pool, tokenIn: input!, amountIn: amount!, minOut: quote.data!.output * 99n / 100n };
    if (x.minOut <= 0n) throw new Error('Output minimum is too small.');
    return sendChecked(app, c.router, TradeRouterAbi, 'tradeAndNote', [x, params, market.key, imdIn!, minMargOut, deadline]);
  };
  const afterPost = async (hash: Hex) => {
    const receipt = await pub.getTransactionReceipt({ hash });
    for (const log of receipt.logs) {
      if (!eq(log.address, annex ? c.annex! : c.hook)) continue;
      try { const decoded = decodeEventLog({ abi: annex ? AnnexAbi : MarginaliaHookAbi, data: log.data, topics: log.topics, eventName: 'NotePosted' });
        const id = (decoded.args as { id: Hex }).id; setPosted(id); if (params) rememberVenue(id, params);
      } catch { /* other event */ }
    }
    await done();
  };
  const quoteToImd = (v: bigint): bigint | null => market && eq(market.venue.quote,c.imd) ? v : finder.data?.wethImd ? v*finder.data.wethImd/10n**18n : null;
  const inputImd = amount && market ? quoteToImd(draft.side===0 ? amount : amount*market.priceInQuote/10n**18n) : null;
  const outputImd = quote.data && market ? quoteToImd(draft.side===0 ? quote.data.output*market.priceInQuote/10n**18n : quote.data.output) : null;
  const nextAction = canProceed && nextApproval ? 'approve' : wrap ? 'wrap' : subjectReady && window.data && !window.error && (!started || age>21600) ? 'checkpoint' : 'execute';
  const action = busy && pendingAction ? pendingAction.kind : nextAction;
  const sign = (props: Parameters<typeof TxButton>[0]) => <TxButton {...props} onBusyChange={value=>{if(value)setPendingAction({kind:nextAction,approval:nextApproval});else setPendingAction(null);setBusy(value);}} />;
  const approve = async () => {
    if (childParent.id) await checkThesisParent(pub, c.hook, childParent.id, wallet.account!, L.thesisGrace);
    return sendChecked(app, approval!.token, erc20Abi, 'approve', [spender!, approval!.amount]);
  };
  return <section className="trade-form" aria-label={annex ? 'Launched token call' : 'Trade and post'}>
    {counter && <p className="small">Counter to <a href={`#/note/${counter.id}`}>{short(counter.id)}</a>. Use the same token and opposite side.</p>}
    {childParent.requested && <ChildCallContext state={childParent} />}
    <fieldset className="trade-fields" disabled={busy}>
      <div className="token-row"><div><label htmlFor="trade-token">Token</label><input id="trade-token" value={draft.token} onChange={e => set({ token: e.target.value })} placeholder="Paste a token address" spellCheck={false} autoComplete="off" /></div><button type="button" className="quiet token-pick" onClick={() => set({ token: c.marg })}>MARG</button></div>
      {!annex && <div className="trade-amount"><div><label htmlFor="trade-amount">You pay · {inputSymbol}</label><input id="trade-amount" inputMode="decimal" value={draft.amount} onChange={e => set({ amount: e.target.value })} /></div><div className="trade-output"><span className="small">You receive</span><strong>{quote.data && !quote.error ? fmtAmount(quote.data.output, draft.side === 0 ? finder.data?.decimals ?? 18 : 18, 5) : '—'} <span>{draft.side === 0 ? symbol : quoteSymbol}</span></strong><UsdContext imd={outputImd}/></div></div>}
      <div className="preset-line" role="group" aria-label="Target presets">{[{ label: '+25%', side: 0, pct: '25' }, { label: '+50%', side: 0, pct: '50' }, { label: '2x', side: 0, pct: '100' }, { label: '-25%', side: 1, pct: '25' }, { label: '-50%', side: 1, pct: '50' }].map(p => <button type="button" key={p.label} aria-pressed={draft.side === p.side && draft.pct === p.pct} onClick={() => set({ side: p.side, pct: p.pct })}>{p.label}</button>)}<select aria-label="Horizon" value={draft.days} onChange={e => set({ days: e.target.value })}>{['1','7','30'].map(d => <option key={d} value={d}>{d}d</option>)}{!['1','7','30'].includes(draft.days) && <option value={draft.days}>{draft.days}d</option>}</select></div>
      <label htmlFor="trade-why">Why <span className="small">{bytes}/280 bytes</span></label><input id="trade-why" value={draft.why} onChange={e => set({ why: e.target.value })} placeholder="Make the call. An X status URL can lead." aria-invalid={bytes > 280} />
      <div className="conviction-label"><label htmlFor="conviction">Conviction</label><span>{draft.bond} IMD <UsdContext imd={bond} /></span></div><input id="conviction" type="range" min={formatUnits(L.bondMin,18)} max={formatUnits(L.bondMax,18)} step="0.25" value={draft.bond} onChange={e => set({ bond: e.target.value })} />
      <p className="small bond-help">Returned if you are right, forfeited if not.</p>
    </fieldset>
    <p className="trade-cost">You pay {!annex && <>{draft.amount} {inputSymbol} <UsdContext imd={inputImd}/> + </>}{imdIn ? fmtAmount(imdIn) : '—'} IMD <UsdContext imd={imdIn}/></p>
    <div className="trade-action">
      <WalletAction>{action==='approve' && approval ? sign({ label: `Approve ${fmtAmount(approval.amount, eq(approval.token,c.imd) ? 18 : inputDecimals ?? 18)} ${eq(approval.token,c.imd) ? 'IMD' : inputSymbol}`, busyLabel: 'Approving…', primary: true, disabled: !childParent.ready, onSend: approve, onDone: done }) : action==='wrap' ? sign({ label: 'Wrap ETH', busyLabel: 'Wrapping…', primary: true, disabled: !childParent.ready, onSend: () => sendChecked(app, c.weth, wrapAbi, 'deposit', [], missing!.amount - missing!.balance), onDone: done }) : action==='checkpoint' ? sign({ label: 'Checkpoint venue', busyLabel: 'Checkpointing…', primary: true, disabled: !childParent.ready, onSend: checkpoint, onDone: done }) : sign({ label: annex ? 'Post call' : 'Trade and post', busyLabel: annex ? 'Posting…' : 'Trading and posting…', primary: true, disabled: !canProceed || !!approval, onSend: submit, onDone: afterPost })}</WalletAction>
    </div>
    <p className="small baseline-status">{finder.loading ? 'Finding the deepest available venue…' : !subjectReady ? 'Choose a token with a supported venue.' : checkpointReady ? 'Baseline ready.' : started && age < 3600 ? <>Baseline ready in <Countdown until={started + 3600} />. Draft saved locally.</> : 'Your baseline is the hour of price history before you, not the moment you click.'}</p>
    {!annex && !counter && <details className="trade-details" open={childParent.requested || undefined}>
      <summary>Parent thesis (optional)</summary>
      <ThesisParentField id="trade-parent" value={draft.parentId} onChange={parentId => set({ parentId })} state={childParent} disabled={busy} />
    </details>}
    {posted && <Notice kind="ok"><p>Call recorded. <a href={`#/note/${posted}`}>Open the receipt</a>.</p></Notice>}
    {wallet.account && missing && !wrap && <p className="status bad">You need {fmtAmount(missing.amount, eq(missing.token,c.imd) ? 18 : inputDecimals ?? 18)} {eq(missing.token,c.imd) ? 'IMD' : inputSymbol}; balance {fmtAmount(missing.balance, eq(missing.token,c.imd) ? 18 : inputDecimals ?? 18)}.</p>}
    {[finder.error, quote.error, baseline.error, funds.error, window.error, manualError].filter(Boolean).map((err, i) => <p className="status bad" role="alert" key={i}>{err!.split('\n')[0]}</p>)}
    {(finder.error || quote.error || window.error || funds.error) && <button type="button" className="quiet" onClick={() => setRevision(r => r + 1)}>Retry reads</button>}
    {input === zeroAddress && !annex && <p className="status bad">This router requires an ERC-20 input. Select a WETH or IMD venue.</p>}
    {storageError && <p className="status bad">Browser storage is unavailable. Keep this tab open to retain your draft.</p>}
    <details className="trade-details"><summary>Venue, costs and limits</summary>
      <p className="small">{fmtAmount(L.stamp)} IMD <UsdContext imd={L.stamp}/> stamp + {fmtAmount(L.margBuy)} IMD <UsdContext imd={L.margBuy}/> of MARG, which you keep + {draft.bond} IMD <UsdContext imd={bond}/> bond. Gas extra. {annex ? 'Baseline has 3% room.' : 'Trade output minimum has 1% slippage.'} MARG allocation minimum has 10% room. Deadline: 10 minutes.</p>
      <p className="small">{HOLD_RULE} Tokens whose balances shrink can break this rule.</p>
      <p className="small">{draft.side === 0 ? 'Upward call' : 'Downward call'}{annex ? ' · Declared position' : ' · position proven by the swap'}.</p>
      {market && <><label htmlFor="trade-venue">Venue</label><select id="trade-venue" value={market.id} onChange={e => setSelected(e.target.value)} disabled={busy}>{finder.data?.markets.map(m => <option value={m.id} key={m.id}>Uniswap v{m.kind === 1 ? 4 : m.kind === 2 ? 3 : 2} · {eq(m.venue.quote,c.imd) ? 'IMD' : m.venue.quote === zeroAddress ? 'ETH' : 'WETH'} · {m.fee / 10000}% · {short(m.venue.ref)}</option>)}</select><p className="small">{fmtAmount(market.quoteDepth)} {quoteSymbol} {market.kind === 3 ? 'reserve' : 'active virtual quote liquidity'}. {market.depthImd !== undefined && <UsdContext imd={market.depthImd} />} Depth is a comparison, not executable capacity.</p></>}
      {finder.data && <p className="small">V4 discovery covers blocks {finder.data.from.toString()}–{finder.data.block.toString()}. {finder.data.failed > 0 ? `${finder.data.failed} reads or venues failed validation; discovery may be incomplete.` : ''} Older v4 venues can be supplied below. {finder.data.markets.some(m => m.depthImd === undefined) && 'WETH conversion unavailable; cross-currency depth ranking is incomplete.'}</p>}
      <div className="two-fields"><div><label htmlFor="custom-target">Target move (%)</label><input id="custom-target" inputMode="decimal" value={draft.pct} onChange={e => set({ pct: e.target.value })} disabled={busy} /></div><div><label htmlFor="custom-days">Horizon (days)</label><input id="custom-days" inputMode="numeric" value={draft.days} onChange={e => set({ days: e.target.value })} disabled={busy} /></div></div>
      {target.error && <p className="status bad">{target.error}</p>}
      <label htmlFor="manual-key">V4 PoolKey (optional JSON)</label><textarea id="manual-key" value={draft.manual} onChange={e => set({ manual: e.target.value })} spellCheck={false} disabled={busy} />
      <DollarSource />
      {annex && <p className="small">Avoid pools whose entire liquidity one party can remove. An empty pool still has a standing price; the least favorable observed price decides.</p>}
    </details>
    {annex && <Admission />}
  </section>;
}
