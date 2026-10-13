// The one call flow: a target, a horizon, one line of why, and the trade if the wallet wants it.
// Trade-and-post (router.tradeAndNote) and just-the-call (router.note) are one form with a "Trade it too" toggle.
// A token whose only live venue is an admitted hooked v4 pool routes through the Annex automatically; the cost
// line says which contract holds the bond. Approvals stay exact: IMD (and the X input) to the router, IMD to the
// Annex for Annex calls, WETH.deposit for wrapping. Every contract rule is explained inline where it bites.
import { useEffect, useState } from 'react';
import { decodeEventLog, formatUnits, parseUnits, zeroAddress, zeroHash, type Address, type Hex } from 'viem';
import { useApp, useRead } from './chain';
import { erc20Abi, MarginaliaHookAbi, MarginaliaRouterAbi } from './abi';
import { AnnexAbi } from './annex-abi';
import { TradeRouterAbi } from './trade-abi';
import { wrapAbi } from './market-abi';
import { approvalPlan, baselineBound, discoverMarkets, eq, publicParams, quoteMarket } from './market';
import { fmtAmount, parseAmount, parseTarget, short, utf8Length, validAddress, venueId, type NoteParams, type PoolKey } from './lib';
import { Countdown, Notice, TxButton, WalletAction, Hint, SendCaveat } from './ui';
import { DollarSource, UsdContext } from './price';
import { sendChecked } from './transactions';
import { rememberVenue } from './pages/Post';
import { HOLD_RULE } from './scoreboard';
import type { Note } from './notes';
import { Admission } from './annex';
import { ChildCallContext, ThesisParentField, useThesisParent } from './child-call';
import { checkThesisParent } from './thesis-parent';
const DRAFT_KEY = 'marginalia.trade.v3';
type Draft = { token: string; amount: string; side: number; pct: string; days: string; why: string; bond: string; manual: string; parentId: string; slippage: string; deadline: string };
const DEFAULTS: Omit<Draft, 'token'> = { amount: '1', side: 0, pct: '25', days: '7', why: '', bond: '0.25', manual: '', parentId: '', slippage: '1', deadline: '10' };
export const BOND_RULE = 'Returned if right, lost if wrong.';
export const BASELINE_WARMUP = 'Your call is measured against the hour of prices before you; this pool needs a one-hour warm-up first, we saved your draft.';
function readDraft(fallback: Draft): Draft {
  try { const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null'); const d = stored && { ...DEFAULTS, ...stored }; return d && Object.keys(fallback).every(k => typeof d[k] === typeof fallback[k as keyof Draft]) ? d : fallback; } catch { return fallback; }
}
export function TradeForm({ annex: annexForced = false, refresh, counter, childId, initialToken }: { annex?: boolean; refresh: () => void; counter?: Note; childId?: string | null; initialToken?: string | null }) {
  const app = useApp(); const { pub, cfg, contracts: c, wallet, now } = app;
  const [draft, setDraft] = useState<Draft>(() => {
    const defaults: Draft = { token: c.marg, ...DEFAULTS };
    // A child link carries only the thesis ID, never the thesis's token or a saved counter draft.
    if (childId && !annexForced && !counter) return { ...defaults, token: '', parentId: childId };
    const saved = readDraft(defaults);
    // Token from the URL wins over the last token; everything else keeps the defaults (+25%, 7 days, 0.25 IMD).
    return initialToken && validAddress(initialToken) ? { ...saved, token: initialToken, parentId: '' } : saved;
  });
  useEffect(()=>{if(counter)setDraft(d=>({...d,token:counter.x,side:counter.side===0?1:0,days:String(counter.horizonDays)}));},[counter?.id]);
  const [token, setToken] = useState(draft.token);
  const [selected, setSelected] = useState('');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tradeChoice, setTradeChoice] = useState<boolean | null>(null);
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
  // Venue resolution: the router's canonical venues first; if none exists and the Annex admits a hooked pool, the Annex.
  const finder = useRead(validAddress(token) && (!annexForced || c.annex) && !manualError ? async () => {
    if (annexForced) return { ...await discoverMarkets(pub, cfg, c, token as Address, true, manualKey), annex: true };
    const hookMarkets = await discoverMarkets(pub, cfg, c, token as Address, false, manualKey);
    if (hookMarkets.markets.length || !c.annex) return { ...hookMarkets, annex: false };
    try { const annexMarkets = await discoverMarkets(pub, cfg, c, token as Address, true, manualKey); if (annexMarkets.markets.length) return { ...annexMarkets, annex: true }; } catch { /* keep the router result and its explicit empty state */ }
    return { ...hookMarkets, annex: false };
  } : null, [token, annexForced, draft.manual, revision]);
  const annex = annexForced || !!finder.data?.annex;
  const market = finder.data?.markets.find(m => m.id === selected) ?? finder.data?.markets[0];
  const subjectReady = !!market && eq(token, draft.token.trim()) && !finder.error && !finder.loading;
  const symbol = finder.data?.symbol ?? 'token';
  const quoteSymbol = market && eq(market.venue.quote, c.imd) ? 'IMD' : market?.venue.quote === zeroAddress ? 'ETH' : 'WETH';
  const input = market ? draft.side === 0 ? market.venue.quote : token as Address : undefined;
  const inputSymbol = draft.side === 0 ? quoteSymbol : symbol;
  const inputDecimals = draft.side === 0 ? 18 : finder.data?.decimals;
  // "Trade it too" defaults on when the wallet holds the venue's quote token; the Annex posts without a trade leg.
  const quoteHolding = useRead(wallet.account && market && !annex && market.venue.quote !== zeroAddress ? () => pub.readContract({ address: market.venue.quote, abi: erc20Abi, functionName: 'balanceOf', args: [wallet.account!] }) : null, [wallet.account, market?.venue.quote, annex, revision], [wallet.account, market?.venue.quote, annex]);
  const tradeAvailable = !annex && !!market && market.venue.quote !== zeroAddress;
  const trade = tradeAvailable && (tradeChoice ?? (!!quoteHolding.data && quoteHolding.data > 0n));
  let amount: bigint | null = null;
  try { if (/^\d+(\.\d+)?$/.test(draft.amount) && inputDecimals !== undefined && (draft.amount.split('.')[1]?.length ?? 0) <= inputDecimals) amount = parseUnits(draft.amount, inputDecimals); } catch { /* validation below */ }
  const bond = parseAmount(draft.bond);
  const L = c.limits;
  const bondOk = bond !== null && bond >= L.bondMin && bond <= L.bondMax;
  const imdIn = bondOk ? L.stamp + L.margBuy + bond! : null;
  const target = parseTarget(draft.side, draft.pct, L.minTargetDeltaBps);
  const childParent = useThesisParent(!counter ? draft.parentId : '');
  const childVenueError = annex && childParent.requested ? 'Annex calls cannot be a thesis’s child call. Choose a token with a router venue.' : null;
  const childReady = childParent.ready && !childVenueError;
  const days = Number(draft.days), bytes = utf8Length(draft.why);
  const slippageBps = /^\d+(\.\d+)?$/.test(draft.slippage) && Number(draft.slippage) >= 0.1 && Number(draft.slippage) <= 5 ? Math.round(Number(draft.slippage) * 100) : null;
  const deadlineMinutes = ['10', '20'].includes(draft.deadline) ? Number(draft.deadline) : 10;
  const counterOk = !counter || counter.status===0 && counter.author.toLowerCase()!==wallet.account?.toLowerCase() && draft.side!==counter.side && eq(token,counter.x);
  const fieldsOk = childReady && counterOk && subjectReady && bondOk && !target.error && Number.isInteger(days) && days >= 1 && days <= L.maxHorizonDays && bytes > 0 && bytes <= L.textMax && slippageBps !== null;
  const params: NoteParams | null = market && fieldsOk ? { ...publicParams(token as Address, market.venue), side: draft.side, targetBps: target.targetBps!, horizonDays: days, text: draft.why, parentId: counter?.id ?? childParent.id ?? zeroHash } : null;
  const spender = annex ? c.annex : c.router;
  const window = useRead(subjectReady && spender ? async () => {
    const args = [venueId(market!.venue)] as const;
    return annex ? pub.readContract({ address: spender, abi: AnnexAbi, functionName: 'priceWindows', args }) : pub.readContract({ address: spender, abi: MarginaliaRouterAbi, functionName: 'priceWindows', args });
  } : null, [subjectReady, market?.id, spender, revision, Math.floor(now / 15)], [subjectReady, market?.id, spender]);
  const started = window.data ? Number(window.data[0]) : 0;
  const age = now - started;
  const checkpointReady = !window.error && started > 0 && age >= 3600 && age <= 21600;
  const quote = useRead(trade && subjectReady && input && input !== zeroAddress && amount && amount > 0n ? async () => ({ ...await quoteMarket(pub, cfg, c, market!, input!, amount!), at: Date.now() }) : null,
    [trade, subjectReady, market?.id, input, amount?.toString(), revision, Math.floor(now / 15)], [trade, subjectReady, market?.id, input, amount?.toString()]);
  const margPrice = useRead(() => pub.readContract({ address: c.hook, abi: MarginaliaHookAbi, functionName: 'margPriceInImd' }), [Math.floor(now / 15)], [c.hook]);
  const minMargOut = margPrice.data && !margPrice.error ? L.margBuy * 10n ** 18n * 90n / (margPrice.data * 100n) : 0n;
  const baseline = useRead(annex && subjectReady && checkpointReady ? () => pub.readContract({ address: c.annex!, abi: AnnexAbi, functionName: 'postPrice', args: [market!.venue, draft.side === 0] }) : null,
    [annex, market?.id, subjectReady, checkpointReady, draft.side, revision, Math.floor(now / 15)], [annex, market?.id, subjectReady, checkpointReady, draft.side]);
  const spendPlan = annex || !trade ? imdIn ? [{ token: c.imd, amount: imdIn }] : [] : input && amount && imdIn ? approvalPlan(input, c.imd, amount, imdIn) : [];
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
  const quoteReady = annex ? !!baseline.data && !baseline.error : !trade ? true : !!quote.data && !quote.error && Date.now() - quote.data.at < 30000 && amount! > 0n && input !== zeroAddress;
  const canProceed = !!params && checkpointReady && quoteReady && minMargOut > 0n && !!funds.data && !funds.error && !missing;
  const wrap = trade && input && eq(input, c.weth) && missing && eq(missing.token, c.weth) && funds.data && funds.data.eth > missing.amount - missing.balance;
  const done = async () => { setRevision(r => r + 1); await funds.refresh(); refresh(); };
  const checkpoint = async () => {
    if (!childReady) throw new Error(childVenueError ?? 'Verify the thesis parent before continuing.');
    return sendChecked(app, spender!, annex ? AnnexAbi : MarginaliaRouterAbi, 'checkpointVenue', [publicParams(token as Address, market!.venue), market!.key]);
  };
  const submit = async () => {
    if (childVenueError) throw new Error(childVenueError);
    if (!params || !market || !canProceed) throw new Error('Refresh the quote and review the form.');
    let deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60);
    if (childParent.id) {
      const closes = BigInt(await checkThesisParent(pub, c.hook, childParent.id, wallet.account!, L.thesisGrace));
      if (closes < deadline) deadline = closes;
    }
    if (annex) return sendChecked(app, c.annex!, AnnexAbi, 'post', [params, market.key, bond!, minMargOut, baselineBound(baseline.data!, draft.side), deadline]);
    if (!trade) return sendChecked(app, c.router, MarginaliaRouterAbi, 'note', [params, market.key, imdIn!, minMargOut, deadline]);
    const x = { kind: market.kind, key: market.key, zeroForOne: market.venue.xIsToken0 === (draft.side === 1), pool: market.pool, tokenIn: input!, amountIn: amount!, minOut: quote.data!.output * BigInt(10000 - slippageBps!) / 10000n };
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
  const combinedImd = trade && input !== undefined && eq(input, c.imd);
  const totalImd = imdIn !== null && (!combinedImd || amount !== null) ? imdIn + (combinedImd ? amount! : 0n) : null;
  const inputImd = amount && market ? quoteToImd(draft.side===0 ? amount : amount*market.priceInQuote/10n**18n) : null;
  const outputImd = quote.data && market ? quoteToImd(draft.side===0 ? quote.data.output*market.priceInQuote/10n**18n : quote.data.output) : null;
  const nextAction = canProceed && nextApproval ? 'approve' : wrap ? 'wrap' : subjectReady && window.data && !window.error && (!started || age>21600) ? 'checkpoint' : 'execute';
  const action = busy && pendingAction ? pendingAction.kind : nextAction;
  const sign = (props: Parameters<typeof TxButton>[0]) => <TxButton {...props} onBusyChange={value=>{if(value)setPendingAction({kind:nextAction,approval:nextApproval});else setPendingAction(null);setBusy(value);}} />;
  const approve = async () => {
    if (!childReady) throw new Error(childVenueError ?? 'Verify the thesis parent before continuing.');
    if (childParent.id) await checkThesisParent(pub, c.hook, childParent.id, wallet.account!, L.thesisGrace);
    return sendChecked(app, approval!.token, erc20Abi, 'approve', [spender!, approval!.amount]);
  };
  const holder = annex ? 'the Annex' : 'the hook';
  const sym = (t: Address) => eq(t, c.imd) ? 'IMD' : inputSymbol;
  const dec = (t: Address) => eq(t, c.imd) ? 18 : inputDecimals ?? 18;
  return <section className="trade-form" aria-label="Make a call">
    {counter && <p className="small">Counter to <a href={`#/note/${counter.id}`}>{short(counter.id)}</a>. Use the same token and opposite side.</p>}
    {childParent.requested && <ChildCallContext state={childParent} />}
    {childVenueError && <p className="status bad" role="alert">{childVenueError}</p>}
    <fieldset className="trade-fields" disabled={busy}>
      <div className="token-row"><div><label htmlFor="trade-token">Token</label><input id="trade-token" value={draft.token} onChange={e => set({ token: e.target.value })} placeholder="Paste a token address" spellCheck={false} autoComplete="off" /></div><button type="button" className="quiet token-pick" onClick={() => set({ token: c.marg })}>MARG</button></div>
      <div className="field-heading"><span>Target</span><Hint label="Target rule">Choose how far the token must move from its baseline.</Hint></div><div className="preset-line" role="group" aria-label="Target presets">{[{ label: '+25%', side: 0, pct: '25' }, { label: '+50%', side: 0, pct: '50' }, { label: '2x', side: 0, pct: '100' }, { label: '-25%', side: 1, pct: '25' }, { label: '-50%', side: 1, pct: '50' }].map(p => <button type="button" key={p.label} aria-pressed={draft.side === p.side && draft.pct === p.pct} onClick={() => set({ side: p.side, pct: p.pct })}>{p.label}</button>)}</div><div className="field-heading"><span>Horizon</span><Hint label="Horizon rule">The chain checks the call after this many whole days.</Hint></div><div className="preset-line horizon-presets" role="group" aria-label="Horizon presets">{['1','7','30'].map(d => <button type="button" key={d} aria-pressed={draft.days === d} onClick={() => set({ days: d })}>{d} {d === '1' ? 'day' : 'days'}</button>)}</div>
      <label htmlFor="trade-why">Why <span className="small">{bytes}/280 bytes</span></label><textarea rows={2} id="trade-why" value={draft.why} onChange={e => set({ why: e.target.value })} placeholder="Make the call. An X status URL can lead." aria-invalid={bytes > 280} />
      <div className="trade-toggle"><label className="toggle-label"><input id="trade-toggle" type="checkbox" checked={trade} disabled={!tradeAvailable} onChange={e => setTradeChoice(e.target.checked)} /> Trade it too</label><Hint label="Trade rule">{annex ? 'Launched-token calls post without a trade leg.' : !market ? 'Needs a venue.' : market.venue.quote === zeroAddress ? 'This venue takes native ETH; the router needs an ERC-20 input.' : trade ? 'The swap and the call go in one transaction.' : 'Just the call; no swap.'}</Hint></div>
      {trade && <div className="trade-amount"><div><label htmlFor="trade-amount">You pay · {inputSymbol}</label><input id="trade-amount" inputMode="decimal" value={draft.amount} onChange={e => set({ amount: e.target.value })} /></div><div className="trade-output"><span className="small">You receive</span><strong>{quote.data && !quote.error ? fmtAmount(quote.data.output, draft.side === 0 ? finder.data?.decimals ?? 18 : 18, 5) : '—'} <span>{draft.side === 0 ? symbol : quoteSymbol}</span></strong><UsdContext imd={outputImd}/></div></div>}
    </fieldset>
    <p className="trade-cost">You pay {trade && !combinedImd && <>{draft.amount} {inputSymbol} <UsdContext imd={inputImd}/> + </>}{totalImd !== null ? fmtAmount(totalImd) : '—'} IMD <UsdContext imd={totalImd}/> · {draft.bond} IMD of it is your bond, held by {holder}.</p>
    <p className="small bond-help rule-bond">{BOND_RULE}</p>
    {draft.side === 0 && <p className="small rule-hold">Hold the token through the horizon or lose the bond. <Hint label="Hold rule">{HOLD_RULE}.</Hint></p>}
    <div className="trade-action">
      <WalletAction>{action==='approve' && approval ? sign({ label: `Approve ${fmtAmount(approval.amount, dec(approval.token))} ${sym(approval.token)}`, busyLabel: 'Approving…', primary: true, disabled: !childReady, onSend: approve, onDone: done, explain: `Approve exactly ${fmtAmount(approval.amount, dec(approval.token))} ${sym(approval.token)} to ${annex ? 'the Annex' : 'the router'}.` }) : action==='wrap' ? sign({ label: 'Wrap ETH', busyLabel: 'Wrapping…', primary: true, disabled: !childReady, onSend: () => sendChecked(app, c.weth, wrapAbi, 'deposit', [], missing!.amount - missing!.balance), onDone: done }) : action==='checkpoint' ? sign({ label: 'Start the one-hour warm-up', busyLabel: 'Checkpointing…', primary: true, disabled: !childReady, onSend: checkpoint, onDone: done }) : sign({ label: annex ? 'Post the call' : trade ? 'Trade and post' : 'Post the call', busyLabel: annex || !trade ? 'Posting…' : 'Trading and posting…', primary: true, disabled: !canProceed || !!approval, onSend: submit, onDone: afterPost })}</WalletAction>{!wallet.account && <SendCaveat/>}
    </div>
    <div className="baseline-line"><p className="small baseline-status">{finder.loading ? 'Finding a venue…' : !subjectReady ? 'Choose a token with a supported venue.' : checkpointReady ? 'Baseline ready.' : started && age < 3600 ? <>Baseline ready in <Countdown until={started + 3600} />.</> : 'Start the one-hour baseline warm-up.'}</p><Hint label="Baseline rule">The baseline must be one to six hours old when you post.</Hint></div>
    {posted && <Notice kind="ok"><p>Call recorded. <a className="button" href={`#/note/${posted}`}>Open the receipt</a></p></Notice>}
    {wallet.account && missing && !wrap && <p className="status bad">You need {fmtAmount(missing.amount, dec(missing.token))} {sym(missing.token)}; balance {fmtAmount(missing.balance, dec(missing.token))}.</p>}
    {[finder.error, quote.error, baseline.error, funds.error, window.error, manualError].filter(Boolean).map((err, i) => <p className="status bad" role="alert" key={i}>{err!.split('\n')[0]}</p>)}
    {(finder.error || quote.error || window.error || funds.error) && <button type="button" className="quiet" onClick={() => setRevision(r => r + 1)}>Retry reads</button>}
    {storageError && <p className="status bad">Browser storage is unavailable. Keep this tab open to retain your draft.</p>}
    <details className="trade-details trade-more" open={childParent.requested || undefined}><summary>More</summary>
      <div className="conviction-label"><label htmlFor="conviction">Conviction · bond</label><span>{draft.bond} IMD <UsdContext imd={bond} /></span></div><input id="conviction" type="range" min={formatUnits(L.bondMin,18)} max={formatUnits(L.bondMax,18)} step="0.25" value={draft.bond} onChange={e => set({ bond: e.target.value })} disabled={busy} />
      <Hint label="Bond rule">Choose {fmtAmount(L.bondMin)} to {fmtAmount(L.bondMax)} IMD to hold for the horizon.</Hint>
      {market && <><label htmlFor="trade-venue">Venue</label><select id="trade-venue" value={market.id} onChange={e => setSelected(e.target.value)} disabled={busy}>{finder.data?.markets.map(m => <option value={m.id} key={m.id}>Uniswap v{m.kind === 1 ? 4 : m.kind === 2 ? 3 : 2} · {eq(m.venue.quote,c.imd) ? 'IMD' : m.venue.quote === zeroAddress ? 'ETH' : 'WETH'} · {m.fee / 10000}% · {short(m.venue.ref)}</option>)}</select><p className="small">{fmtAmount(market.quoteDepth)} {quoteSymbol} {market.kind === 3 ? 'reserve' : 'active virtual quote liquidity'}. {market.depthImd !== undefined && <UsdContext imd={market.depthImd} />} <Hint label="Venue depth rule">Depth compares pools and does not guarantee executable capacity.</Hint> {annex ? 'Resolved through the Annex: this pool is an admitted hooked launch pool.' : 'Resolved through the router.'}</p></>}
      {finder.data && <p className="small">V4 discovery covers blocks {finder.data.from.toString()}–{finder.data.block.toString()}. {finder.data.failed > 0 ? `${finder.data.failed} reads or venues failed validation; discovery may be incomplete.` : ''} Older v4 venues can be supplied below. {finder.data.markets.some(m => m.depthImd === undefined) && 'WETH conversion unavailable; cross-currency depth ranking is incomplete.'}</p>}
      <div className="two-fields"><div><label htmlFor="custom-target">Target move (%)</label><input id="custom-target" inputMode="decimal" value={draft.pct} onChange={e => set({ pct: e.target.value })} disabled={busy} /></div><div><label htmlFor="custom-days">Horizon (days)</label><input id="custom-days" inputMode="numeric" value={draft.days} onChange={e => set({ days: e.target.value })} disabled={busy} /></div></div>
      {target.error && <p className="status bad">{target.error}</p>}
      <label htmlFor="manual-key">V4 PoolKey (optional JSON)</label><textarea id="manual-key" value={draft.manual} onChange={e => set({ manual: e.target.value })} spellCheck={false} disabled={busy} />
      {!counter && <ThesisParentField id="trade-parent" value={draft.parentId} onChange={parentId => set({ parentId })} state={childParent} disabled={busy} />}
      <div className="two-fields"><div><label htmlFor="trade-slippage">Trade slippage (%)</label><input id="trade-slippage" inputMode="decimal" value={draft.slippage} onChange={e => set({ slippage: e.target.value })} disabled={busy || !trade} aria-invalid={slippageBps === null} /></div><div><label htmlFor="trade-deadline">Deadline</label><select id="trade-deadline" value={draft.deadline} onChange={e => set({ deadline: e.target.value })} disabled={busy}><option value="10">10 minutes</option><option value="20">20 minutes</option></select></div></div>
      {slippageBps === null && <p className="status bad">Slippage must be between 0.1% and 5%.</p>}
      <p className="small">{fmtAmount(L.stamp)} IMD stamp + {fmtAmount(L.margBuy)} IMD MARG allocation + {draft.bond} IMD bond.</p><Hint label="Cost rule">You keep the MARG allocation and pay network gas separately.</Hint><Hint label="Output minimum rule">{annex ? 'The baseline has 3% room and the MARG allocation minimum has 10% room.' : trade ? `The trade minimum has ${draft.slippage}% slippage and the MARG allocation minimum has 10% room.` : 'This call has no trade leg and the MARG allocation minimum has 10% room.'}</Hint>
      <p className="small">{draft.side === 0 ? 'Upward call' : 'Downward call'}{annex ? ' · declared position' : trade ? ' · position proven by the swap' : ' · declared position'}.</p><Hint label="Token balance rule">Tokens whose balances shrink can break the hold rule.</Hint>
      <p className="small"><a href="#/seal">Seal this call first</a> <Hint label="Seal rule">Commit the draft hash now and reveal the exact draft from 30 minutes through six hours later.</Hint></p>
      <DollarSource />
      {annex && <><Hint label="Liquidity rule">Avoid pools whose entire liquidity one party can remove.</Hint><Hint label="Observation rule">An empty pool still has a standing price, and the least favorable observed price decides.</Hint></>}
    </details>
    {c.annex && <Admission />}
  </section>;
}
