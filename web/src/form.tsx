// The call form shared by Post and Seal: token X, venue finder, side, target, horizon, text, parent.
// The venue is derived through router.validateVenue so that seal, checkpoint and post all use the same struct.
import { useEffect, useState, type ReactNode } from 'react';
import { zeroAddress, type Address, type Hex } from 'viem';
import { MarginaliaRouterAbi, erc20Abi, univ2FactoryAbi, univ2PairAbi, univ3FactoryAbi, univ3PoolAbi, stateViewAbi } from './abi';
import { useApp } from './chain';
import { UNIV3_FEES } from './config';
import { addressRef, fmtAmount, parseTarget, Side, utf8Length, validAddress, VenueKind, type NoteParams, type Venue } from './lib';

export interface VenueOption {
  key: string;
  label: string;
  venue: Venue;
  liquidity: string;
}

export interface CallDraft {
  x: string;
  venueKey: string;
  side: number;
  pct: string;
  horizonDays: string;
  text: string;
  parentId: string;
}
export const EMPTY_DRAFT: CallDraft = { x: '', venueKey: '', side: Side.Buy, pct: '25', horizonDays: '30', text: '', parentId: '' };

const ZERO32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;

/** Resolves canonical venues for X: the launch v4 pool when X is MARG, v3 pools and v2 pairs against WETH and IMD. */
export function useVenueFinder(x: string): { options: VenueOption[]; loading: boolean; error: string | null; symbol: string } {
  const { pub, contracts, cfg } = useApp();
  const [options, setOptions] = useState<VenueOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('');
  useEffect(() => {
    setOptions([]);
    setError(null);
    setSymbol('');
    if (!validAddress(x)) return;
    const X = x.trim() as Address;
    if (X.toLowerCase() === contracts.imd.toLowerCase()) {
      setError('IMD itself cannot be the subject of a call; it is the quote currency.');
      return;
    }
    if (!contracts.venueFinderSafe) {
      setError('The router’s factory constants differ from the canonical Uniswap addresses; the venue finder is disabled.');
      return;
    }
    let live = true;
    setLoading(true);
    (async () => {
      const found: VenueOption[] = [];
      const sym = await pub.readContract({ address: X, abi: erc20Abi, functionName: 'symbol' }).catch(() => 'X');
      if (live) setSymbol(sym);
      if (X.toLowerCase() === contracts.marg.toLowerCase()) {
        const liq = await pub.readContract({ address: cfg.network.uniswapV4.stateView, abi: stateViewAbi, functionName: 'getLiquidity', args: [contracts.poolId] }).catch(() => 0n);
        found.push({
          key: `v4:${contracts.poolId}`,
          label: 'Launch pool · Uniswap v4 · MARG / IMD · fee 1.25%',
          venue: { kind: VenueKind.UniV4, ref: contracts.poolId, quote: contracts.imd, xIsToken0: false },
          liquidity: `v4 liquidity ${liq.toString()}`,
        });
      }
      const quotes: [Address, string][] = [
        [contracts.weth, 'WETH'],
        [contracts.imd, 'IMD'],
      ];
      const v3 = await Promise.all(
        quotes.flatMap(([q, qs]) =>
          UNIV3_FEES.map(async (fee) => {
            const pool = await pub.readContract({ address: contracts.univ3Factory, abi: univ3FactoryAbi, functionName: 'getPool', args: [X, q, fee] });
            if (pool === zeroAddress) return null;
            const liq = await pub.readContract({ address: pool, abi: univ3PoolAbi, functionName: 'liquidity' }).catch(() => 0n);
            return {
              key: `v3:${pool.toLowerCase()}`,
              label: `Uniswap v3 · ${sym} / ${qs} · fee ${fee / 10000}% · ${pool.slice(0, 10)}…`,
              venue: { kind: VenueKind.UniV3, ref: addressRef(pool), quote: q, xIsToken0: false } as Venue,
              liquidity: liq === 0n ? 'no liquidity (the router refuses it)' : `v3 liquidity ${liq.toString()}`,
              empty: liq === 0n,
            };
          }),
        ),
      );
      const v2 = await Promise.all(
        quotes.map(async ([q, qs]) => {
          const pair = await pub.readContract({ address: contracts.univ2Factory, abi: univ2FactoryAbi, functionName: 'getPair', args: [X, q] });
          if (pair === zeroAddress) return null;
          const [r0, r1] = await pub.readContract({ address: pair, abi: univ2PairAbi, functionName: 'getReserves' }).catch(() => [0n, 0n, 0] as const);
          const t0 = await pub.readContract({ address: pair, abi: univ2PairAbi, functionName: 'token0' });
          const qr = t0.toLowerCase() === q.toLowerCase() ? r0 : r1;
          return {
            key: `v2:${pair.toLowerCase()}`,
            label: `Uniswap v2 · ${sym} / ${qs} · ${pair.slice(0, 10)}…`,
            venue: { kind: VenueKind.UniV2, ref: addressRef(pair), quote: q, xIsToken0: false } as Venue,
            liquidity: `${fmtAmount(qr, 18, 3)} ${qs} in reserve`,
            empty: qr === 0n,
          };
        }),
      );
      for (const o of [...v3, ...v2]) if (o && !o.empty) found.push(o);
      if (live) {
        setOptions(found);
        if (found.length === 0) setError(`No canonical Uniswap venue quoted in WETH or IMD was found for ${sym}. The router accepts only such venues.`);
      }
    })()
      .catch((e) => live && setError((e as Error).message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [x, pub, contracts, cfg]);
  return { options, loading, error, symbol };
}

/** Validates the draft and, when complete, derives the venue through the router. */
export function useDerivedParams(draft: CallDraft, options: VenueOption[]): { params: NoteParams | null; problems: string[]; deriving: boolean } {
  const { pub, contracts } = useApp();
  const [derived, setDerived] = useState<{ key: string; venue: Venue } | null>(null);
  const [deriving, setDeriving] = useState(false);
  const [deriveError, setDeriveError] = useState<string | null>(null);
  const L = contracts.limits;
  const problems: string[] = [];
  const opt = options.find((o) => o.key === draft.venueKey);
  if (!validAddress(draft.x)) problems.push('Enter the token address.');
  if (!opt) problems.push('Pick a venue.');
  const target = parseTarget(draft.side, draft.pct, L.minTargetDeltaBps);
  if (target.error) problems.push(target.error);
  const h = Number(draft.horizonDays);
  if (!(Number.isInteger(h) && h >= 1 && h <= L.maxHorizonDays)) problems.push(`The horizon must be 1 to ${L.maxHorizonDays} whole days.`);
  const len = utf8Length(draft.text);
  if (len === 0) problems.push('Write the note.');
  if (len > L.textMax) problems.push(`The text is ${len} bytes; a call allows ${L.textMax}.`);
  if (draft.parentId.trim() && !/^0x[0-9a-fA-F]{1,64}$/.test(draft.parentId.trim())) problems.push('The parent id must be a hex note id.');

  const baseKey = opt ? `${draft.x.toLowerCase()}|${opt.key}` : '';
  useEffect(() => {
    if (!opt || !validAddress(draft.x)) return;
    let live = true;
    setDeriving(true);
    setDeriveError(null);
    const p: NoteParams = {
      x: draft.x.trim() as Address,
      venue: opt.venue,
      side: 0,
      targetBps: 11000,
      horizonDays: 1,
      parentId: ZERO32,
      class: 1,
      text: 'x',
    };
    pub
      .readContract({ address: contracts.router, abi: MarginaliaRouterAbi, functionName: 'validateVenue', args: [p, contracts.poolKey] })
      .then((v) => live && setDerived({ key: baseKey, venue: { kind: Number(v.kind), ref: v.ref, quote: v.quote, xIsToken0: v.xIsToken0 } }))
      .catch((e) => live && setDeriveError(`The router refused this venue: ${(e as Error).message.split('\n')[0]}`))
      .finally(() => live && setDeriving(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey]);
  if (deriveError) problems.push(deriveError);
  if (opt && derived?.key !== baseKey && !deriveError) problems.push('Deriving the venue through the router…');

  let params: NoteParams | null = null;
  if (problems.length === 0 && opt && derived) {
    params = {
      x: draft.x.trim() as Address,
      venue: derived.venue,
      side: draft.side,
      targetBps: target.targetBps!,
      horizonDays: h,
      parentId: draft.parentId.trim() ? (`0x${BigInt(draft.parentId.trim()).toString(16).padStart(64, '0')}` as Hex) : ZERO32,
      class: 1,
      text: draft.text,
    };
  }
  return { params, problems, deriving };
}

export function CallFields({ draft, onChange, finder, step, parentField }: { draft: CallDraft; onChange: (d: CallDraft) => void; finder: ReturnType<typeof useVenueFinder>; step?: number; parentField?: ReactNode }) {
  const { contracts } = useApp();
  const L = contracts.limits;
  const set = (patch: Partial<CallDraft>) => onChange({ ...draft, ...patch });
  const len = utf8Length(draft.text);
  const target = parseTarget(draft.side, draft.pct, L.minTargetDeltaBps);
  return (
    <>
      {(!step || step === 1) && <>
      <label htmlFor="x">Token X</label>
      <span className="hint">The ERC-20 the note is about. Paste its address; the venues it trades on are looked up for you.</span>
      <input id="x" className="mono" value={draft.x} onChange={(e) => set({ x: e.target.value.trim(), venueKey: '' })} placeholder="0x…" autoComplete="off" spellCheck={false} />
      {draft.x && !validAddress(draft.x) && <span className="hint">Not a valid address yet.</span>}
      {finder.loading && <p className="small" aria-live="polite">Looking up canonical Uniswap venues for {finder.symbol || 'this token'}…</p>}
      {finder.error && (
        <p className="status bad" role="alert">
          {finder.error}
        </p>
      )}
      {finder.options.length > 0 && (
        <fieldset>
          <legend>Venue · where X is priced ({finder.symbol})</legend>
          <span className="hint">Only canonical Uniswap pools quoted in IMD or WETH are offered. The launch pool is the only v4 venue.</span>
          {finder.options.map((o) => (
            <div className="radio-row" key={o.key}>
              <label>
                <input type="radio" name="venue" checked={draft.venueKey === o.key} onChange={() => set({ venueKey: o.key })} /> {o.label}
                <span className="small"> · {o.liquidity}</span>
              </label>
            </div>
          ))}
        </fieldset>
      )}
      </>}
      {(!step || step === 2) && <>
      <fieldset>
        <legend>Target presets</legend>
        <div className="presets">{[{ label: '+25%', side: Side.Buy, pct: '25' }, { label: '+50%', side: Side.Buy, pct: '50' }, { label: '2x', side: Side.Buy, pct: '100' }, { label: '-25%', side: Side.Sell, pct: '25' }].map(p => <button type="button" key={p.label} aria-pressed={draft.side === p.side && draft.pct === p.pct} onClick={() => set({ side: p.side, pct: p.pct })}>{p.label}</button>)}</div>
      </fieldset>
      <fieldset>
        <legend>Side</legend>
        <div className="radio-row">
          <label>
            <input type="radio" name="side" checked={draft.side === Side.Buy} onChange={() => set({ side: Side.Buy })} /> Upward call
          </label>
          <label>
            <input type="radio" name="side" checked={draft.side === Side.Sell} onChange={() => set({ side: Side.Sell })} /> Downward call
          </label>
        </div>
      </fieldset>
      <label htmlFor="pct">Target move, in percent</label>
      <span className="hint" id="pct-hint">
        At least {L.minTargetDeltaBps / 100}%. {target.targetBps !== undefined && `${draft.side === Side.Buy ? 'Upward' : 'Downward'} ${draft.pct}% means a target of ${(target.targetBps / 10000).toFixed(4).replace(/(\.\d{2})0+$/, '$1')}× the post price.`}
      </span>
      <input id="pct" inputMode="decimal" value={draft.pct} onChange={(e) => set({ pct: e.target.value })} aria-invalid={!!target.error} aria-describedby={target.error ? 'pct-hint pct-error' : 'pct-hint'} />
      {target.error && <span className="hint status bad" id="pct-error" role="alert">{target.error}</span>}
      <label htmlFor="horizon">Horizon, in days</label>
      <span className="hint">1 to {L.maxHorizonDays}. Settlement opens when it ends.</span>
      <input id="horizon" inputMode="numeric" value={draft.horizonDays} onChange={(e) => set({ horizonDays: e.target.value })} />
      </>}
      {(!step || step === 3) && <>
      <label htmlFor="text">Say why in one line</label>
      <span className="hint" id="text-hint">
        {len} / {L.textMax} bytes. Start with an X status URL to cite a public call.
      </span>
      <textarea id="text" value={draft.text} onChange={(e) => set({ text: e.target.value })} aria-describedby="text-hint" />
      {parentField !== undefined ? parentField : <><label htmlFor="parent">Parent note (optional)</label>
      <span className="hint">Your own open thesis to hang this call off, or another author's open call on the same token from the other side to counter it.</span>
      <input id="parent" className="mono" value={draft.parentId} onChange={(e) => set({ parentId: e.target.value })} placeholder="0x… note id, or empty" autoComplete="off" />
      </>}
      </>}
    </>
  );
}
