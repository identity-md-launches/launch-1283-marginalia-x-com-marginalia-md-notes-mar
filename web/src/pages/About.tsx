import { useApp } from '../chain';
import { fmtAmount } from '../lib';
import { Addr } from '../ui';

export function AboutPage() {
  const { contracts, cfg } = useApp();
  const L = contracts.limits;
  return (
    <>
      <h1>What this is</h1>
      <p className="lede">
        Marginalia is a bonded feed: a place to write a falsifiable note about a token, put an IMD bond behind it, and have the chain settle whether it
        was right. It is not a perp DEX, not a prediction market, and nothing pays for being right. A right call gets its own bond back; a wrong one
        loses it to the pools. The record that results is reputation, not income.
      </p>
      <h2>How a note works</h2>
      <ol className="steps">
        <li>
          <strong>Call.</strong> Name a token X, a canonical Uniswap venue where it is priced in IMD, WETH or ETH, a side (BUY = up, SELL = down), a
          target at least {L.minTargetDeltaBps / 100}% away and a horizon of 1 to {L.maxHorizonDays} days. Text up to {L.textMax} bytes.
        </li>
        <li>
          <strong>Checkpoint.</strong> The router records the venue's price first. A call may be posted once the checkpoint is between 1 and 6 hours
          old, so a note cannot be priced on a moment the author just made.
        </li>
        <li>
          <strong>Post.</strong> Posting pulls {fmtAmount(L.stamp)} IMD stamp (non-refundable, to the pools) + {fmtAmount(L.margBuy)} IMD spent on MARG
          in the launch pool (the MARG goes to the author) + a bond of {fmtAmount(L.bondMin)} to {fmtAmount(L.bondMax)} IMD, held for the horizon.
        </li>
        <li>
          <strong>Settle.</strong> For 6 hours after the horizon anyone records observations; after the window anyone settles. Right returns the bond.
          Wrong, sold-out BUYs and retractions forfeit it; the settler gets 10% of a forfeit.
        </li>
      </ol>
      <h2>Theses, counters and seals</h2>
      <p>
        A <strong>thesis</strong> has no target and no horizon, up to {L.thesisTextMax} bytes of text, and must get one of the author's own child calls
        within 7 days or its bond is forfeited. Theses with a child are judged weekly by an evidence panel; the week's pool pays the top three.
      </p>
      <p>
        A <strong>counter</strong> is a note whose parent is another author's live note: a rebuttal of a thesis, or an opposite-side call on the same
        token. Bonds never change hands between them; the scores move in opposite directions.
      </p>
      <p>
        A <strong>seal</strong> commits to a note before posting it: one extra stamp, a snapshot of the venue price and of the author's balance, and a
        reveal between 30 minutes and 6 hours later by posting the very same parameters. The sealed text stays with the author until then.
      </p>
      <h2>The contracts</h2>
      <dl className="facts">
        <dt>Hook</dt>
        <dd>
          <Addr a={contracts.hook} full />
        </dd>
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
        No owner, admin, pause, upgrade or setter exists anywhere in these contracts. This site has no backend and no analytics; it reads the chain through
        the public nodes above and signs with your wallet only.
      </p>
    </>
  );
}
