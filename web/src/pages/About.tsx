import { UsdContext, DollarSource } from '../price';
import { HOLD_RULE, REASONS } from '../scoreboard';
import { useApp } from '../chain';
import { fmtAmount } from '../lib';
import { assetUrl } from '../config';
import { Addr, Caveat } from '../ui';

export function AboutPage() {
  const { contracts, cfg } = useApp();
  const L = contracts.limits;
  return (
    <>
      <h1>About Marginalia</h1><Caveat/>
      <p className="lede">Find out who is actually right. Leave a record of why you were.</p>
      <ul>{REASONS.map(r => <li key={r}>{r}</li>)}</ul>
      <h2>What binds a call</h2>
      <p className="hold-rule">{HOLD_RULE}.</p>
      <p>A bond of {fmtAmount(L.bondMin)} IMD <UsdContext imd={L.bondMin}/> to {fmtAmount(L.bondMax)} IMD <UsdContext imd={L.bondMax}/> returns when right; wrong, broken holds and retractions forfeit it.</p>
      <p>A horizon is the deadline: 1–{L.maxHorizonDays} days for a target at least {L.minTargetDeltaBps / 100}% away.</p>
      <p>A checkpoint fixes the baseline; post after one hour and before six hours.</p>
      <p>Settlement uses observations in the six hours after the horizon; anyone may observe and settle.</p>
      <p>Posting also costs a {fmtAmount(L.stamp)} IMD <UsdContext imd={L.stamp}/> stamp and {fmtAmount(L.margBuy)} IMD <UsdContext imd={L.margBuy}/> allocated to MARG.</p>
      <h2>Prove the argument</h2>
      <p>A thesis needs your child call within seven days; an evidence panel judges the weekly prize.</p>
      <p>A duel pairs opposite calls on the same token; each keeps its own bond, target and horizon.</p>
      <p>A seal fixes the hash now; reveal the exact local draft from 30 minutes to six hours later.</p>
      <p>A citation starts with an X status URL; the cited account did not post the note, and the posting wallet remains its author.</p>
      <p>Informational, not advice. Bonds can be lost. A right call returns its bond; reputation pays no pool reward.</p>
      <DollarSource/>
      <h2>Your name and avatar</h2><p>A live primary name.imd and avatar come from the verified LARP registry through read-only calls; other wallets have a generated mark.</p><h2>For agents</h2>
      <p><a href={assetUrl("llms.txt")}>llms.txt</a> · <a href={assetUrl("agents.md")}>AGENTS.md</a></p>
      <p className="small">Read how to post, seal and settle without the UI; contract wallets can hold the record.</p>
      <h2>The contracts</h2>
      <dl className="facts">
        <dt>Hook</dt>
        <dd>
          <Addr a={contracts.hook} full />
        </dd>
        {contracts.annex && <><dt>Annex</dt><dd><Addr a={contracts.annex} full/></dd></>}
        {contracts.pages && <><dt>Pages</dt><dd><Addr a={contracts.pages} full/></dd></>}
        <dt>Router</dt>
        <dd>
          <Addr a={contracts.router} full /> <span className="small">(read from hook.router())</span>
        </dd>
        <dt>Judge</dt>
        <dd>
          <Addr a={contracts.judge} full /> <span className="small">(hook.judge())</span>
        </dd>
        <dt>Treasury</dt>
        <dd>
          <Addr a={contracts.treasury} full /> <span className="small">(hook.treasury())</span>
        </dd>
        <dt>MARG</dt>
        <dd>
          <Addr a={contracts.marg} full />
        </dd>
        <dt>IMD</dt>
        <dd>
          <Addr a={contracts.imd} full />
        </dd>
        <dt>Launch pool</dt>
        <dd>
          Uniswap v4 · fee {contracts.poolKey.fee / 10000}% · tick spacing {contracts.poolKey.tickSpacing} · id <span className="mono">{contracts.poolId}</span>
        </dd>
        <dt>Chain</dt>
        <dd>
          {cfg.network.name} ({cfg.chainId}); reads through {cfg.rpcUrls.join(', ')}
        </dd>
      </dl>
      <p className="small">
        Marginalia has no owner, pause or upgrade. Trading reads the chain through the public nodes above and signs with your wallet only; Feedback uses the same-origin intake. The site has no analytics.
      </p>
    </>
  );
}
