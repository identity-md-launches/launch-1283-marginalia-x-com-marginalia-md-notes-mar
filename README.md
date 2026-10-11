# Marginalia — notes in the margin of every trade

This launch deploys four Marginalia companion implementations on Ethereum mainnet: Router, Judge, Treasury and Pricer, all with no constructor arguments. The token and Uniswap v4 hook belong to a later launch. Buying MARG through the
router with a note attached posts a falsifiable call on any ERC-20, backed by a flat stamp and a flat
refundable deposit. Calls resolve against a manipulation-resistant settlement price built from permissionless
on-chain observations (v3/v2 TWAPs, the adverse extreme on v4); right calls get their deposit back,
everything else feeds the weekly pools, including thesis prizes ranked by the IMD oracle panel.
No owner, no pause, no upgrade. Spec: `SPEC.md`.

## Contracts

| Contract | Role |
|---|---|
| `Marginalia` | The launch ERC-20: 1,000,000,000 × 1e18 minted once to its deployer (the launch factory). |
| `MarginaliaHook` | The hook (flags `0x20cc`): binds the launch pool, takes the stamp and deposit on noted buys and the 1%/3% fee on sells, holds notes, observations, records and the three pools, and pays out. Its constructor clones the three companions (EIP-1167) from the live launch-1240 implementations and initialises each once. Notes can be counters: a thesis may rebut another author's open thesis, a call may take the other side of another author's open call on the same token (`parentId` pointing at that note). |
| `MarginaliaRouter` | The only path that can attach a note; optionally trades X on Uniswap v4, v3 or v2 in the same transaction so the position is proven, and refuses a note about a token other than the one traded. Plain MARG buys and sells go through any v4 router. |
| `MarginaliaJudge` | The oracle consumer: once a week buys the panel's ranking of the week's long-form theses through the IMD Intake, verifies the EIP-712 attestation, tells the hook whom to pay. Short-form calls are never judged. |
| `MarginaliaTreasury` | Receives prizes and gifts in IMD; drips 2% of its IMD into the pools daily. No withdraw; refuses ETH. |
| `MarginaliaPricer` | Stateless, ownerless helper the hook calls by staticcall (kept out of the hook for code size): score arithmetic (log2, sqrt, difficulty), price reads and the settlement rule: a prior-window baseline (v3/v2 accumulator TWAP, conservative v4/hub extreme); observation reads (v3 tick cumulative, v2 price cumulative, v4 spot, the ETH→IMD hub spot); settle price = TWAP first→last on v3/v2, the observation least favourable to the call on v4 and on the hub leg. An honest observation pins the extreme; the series must span at least one hour. |

## How the pot pays

Every IMD accrual (stamps, sell fees, converted forfeits, treasury drips) splits at accrual time:

| Share | Pool | Paid to |
|---|---|---|
| 70% | the week's thesis prize | the panel's top three long-form theses, 50/30/20, after `requestJudging(week)` and `payJudged(week)` |
| 30% | the day's writer refund | every non-retracted note of the day, equal split, capped at one stamp; `claimRefund(id)` after the day ends |

The score (difficulty-weighted, netted across right, wrong, broken, unproven and retracted calls, on every venue)
is reputation: no pool pays for it. That is deliberate. On any canonical pool an author can be the only LP and
trader and manufacture a right call for a stamp; a pool that paid by score would pay them (review finding
c7331916). With no such pool the number can be inflated but never cashed, and the venue is on every note for the
reader and the site to judge. A paid leaderboard, if one is ever run, is a campaign funded from the paying wallet's
retained MARG with published rules, outside the hook.

Unclaimed pools roll forward after 28 days (`sweep`). Nothing in any pool is paid for a price outcome
except through the score, which is difficulty-weighted, netted against wrong calls, and capped.

## Deployment order

1. ✅ Contracts-only launch **#1240** (Ethereum mainnet, tx `0x93a1b0cce64e04d4bd7edd7b5fb6e6268b1fd5ab68fb5b990e66c56e972d71a3`,
   block 26163341): `MarginaliaRouter` `0x365CcB3cfBC430600485234F56FD5ECb23fd70D1`, `MarginaliaJudge`
   `0xC93460730a79a22282f063A0c6BA5E340Ac372b4`, `MarginaliaTreasury` `0xe2086012f5F9CC7cAECDBC70dE392e263aAe8481`
   (ownerless implementations that lock themselves in their constructors so only clones can be initialised, once,
   by the hook) plus the stateless `MarginaliaPricer` `0xEaff9B262341A0cB05579227e662BFE768A71cfb`. The on-chain
   runtime bytecode matches this tree's build (the judge differs only in its EIP-712 immutables).
2. ✅ The four addresses are pinned in `src/MarginaliaImpls.sol`.
3. Hook launch (`launch.json`, kind `univ4_hook`): the factory deploys the token and the hook; the hook's constructor
   clones the three implementations and initialises each with itself in the same transaction. The constructor is
   chain-state-free (the launcher rehearses constructors in an empty EVM): it reads no code at any address, and a
   codeless companion would revert on first use because every companion call expects return data.

Because the router is deployed, the `NoteParams` ABI it accepts is fixed; that is why a counter rides the existing
`parentId` field instead of a new one. `forge build --sizes` is the gate for the hook's runtime (EIP-170, 24,576) and
initcode (EIP-3860, 49,152) sizes; the mainnet-fork rehearsal (`test/fork`) runs against the live implementations
without etching.

## Build and test

Solidity 0.8.26, Cancun, via-IR, optimizer 200 runs, `bytecode_hash = "none"`. All dependencies are
vendored under `lib/` (versions in `dependencies.json`); no network is needed to build or run the unit tests.

```sh
forge build --sizes
forge test --no-match-path 'test/fork/*'
```

Without `MAINNET_RPC_URL`, the fork tests explicitly skip, including under plain `forge test`.
The fork rehearsal deploys through the real IMD LaunchFactory on an Ethereum mainnet fork, impersonating
the protocol's launch wallet, and then posts a note through the router:

```sh
MAINNET_RPC_URL=https://... forge test --match-path test/fork/MainnetLaunch.t.sol -vvv
```

## Launch

The implementations are live (launch #1240, above). `launch.json` is the hook launch: `MarginaliaHook` with
`$poolManager, $token, $factory`, the `Marginalia` token, and the MARG/IMD pool at LP fee 12500. See
`ADAPTATION.md` for the implementations' reproduced findings, changes and validation.

Sealed notes: `seal(x, venue, hash)` commits to a note before it is posted. The seal pays one stamp up front
(non-refundable, so a seal is never a free option), prices the venue's BUY and SELL baselines at that moment, and
snapshots the author's X balance. The note is then posted through the router as usual, no sooner than 30 minutes
and no later than 6 hours after the seal (`SEAL_MIN`, `SEAL_MAX`); it settles against the sealed baseline, and a
sealed BUY call is refused if the author's X balance fell since the seal (position first, then seal). Between seal
and reveal, the author's key holders may read what was sealed off-chain; everyone else sees only the `Sealed`
event (author, X, venue). The hash is `sealHash(author, params)` over the router-derived venue, which is what the
hook receives (`router.validateVenue` gives it). A seal that lapses leaves its stamp in the pools; the same text can
only be sealed once.

Counters and duels: a thesis whose `parentId` is another author's open thesis is a rebuttal; it needs its own child
call like any thesis and then competes in the same weekly judged set. A call whose `parentId` is another author's
open call on the same token, from the opposite side, is a counter-call. No deposit moves between the two: each
settles on its own price and keeps or forfeits its own deposit, their scores move in opposite directions, and the
duel's outcome is the pair of `Settled` events (the link is in `NotePosted.parentId`), read off-chain. The keeper who
settles a wrong or broken call earns 10% of the forfeited deposit (`KEEPER_BPS`).

Before posting a price call, anyone calls `router.checkpointVenue(noteParams, venueKey)` for its
canonical venue. Its first checkpoint must be at least one hour old, from an earlier block, and at
most six hours old. Further checkpoints preserve the start and accumulate conservative extremes;
they cannot erase an honest reading. After expiry, checkpoint again and allow a new hour to elapse.
Theses (`targetBps == 0`) do not need price history. This warm-up uses on-chain timestamps; tests
advance the EVM clock and never wait in real time.

For v3/v2, the post baseline is the accumulator TWAP from the checkpoint to posting. For v4 and
the ETH/IMD hub leg, a BUY baseline uses the maximum of the window's readings and the current
price, and SELL uses the minimum. Settlement retains the opposite extremes and its existing
one-hour minimum span. `judge.convertForfeits()` requires the same mature history for the MARG/IMD
venue and enforces 97% of its conservative maximum as the minimum IMD output. A fall beyond the
floor defers conversion until a fresh window supports it. Calls and checkpoint reads reject a v4
venue or hub with no active liquidity.

The oracle callback stores only the requested head of three ids, then filters and deduplicates them
when paid. A signed empty or entirely ineligible head pays no winners and rolls the whole remaining
thesis pool forward. Extra ranking entries beyond the requested head are ignored.

## Audit history

The swarm's four-specialist panel reviewed the whole repository during the first implementations launch
(job `0c08497a`, 2026-10-10) and merged 14 reproduced findings, led by a self-priced venue (any contract
answering `slot0()` could set a note's price) and a leaderboard sweep that paid twice. All are fixed in
commit `1e6388a`: every price venue and trade venue is now checked against the canonical Uniswap factories
(v3/v2) or recomputed from the full key with liquidity (v4) in the router, sweeps zero their pools, an
unanswered judging request can be retried after three days, quiet weeks' thesis pools sweep once the judge
confirms nothing is pending, implementations lock themselves against stray `init` calls, sells of pot MARG
require a whole fill with a slippage floor, and the Attested class can no longer be self-declared.

The relaunch of those fixes (launch 1217) was then parked by the audit judge on the one finding the first
round had not closed: `observe()` read spot, so a two-block pump → observe → unwind bought a settlement
for swap fees. v0.5 moved settlement into `MarginaliaPricer`: Uniswap v3 and v2 venues settle on the
time-weighted average between the first and last observation (their on-chain accumulators), v4 venues
and the ETH→IMD hub leg settle on the observation least favourable to the call, and the observations
must span at least an hour. Accumulator prices weight the elapsed time, and an honest observer can
pin the v4/hub extreme; sampled extremes do not measure prices between observations. Tests: `testTwoBlockPumpObserveUnwindSettlesWrong` (local),
`testTradeAndNoteOnUniswapV3` settles LINK on the live v3 accumulator (fork), `test/Pricer.t.sol`.

The second implementations review (2026-10-11) reopened the launch on eight reproduced findings; all are
answered in `.imd-responses.json` and listed in `ADAPTATION.md`. In short: a price that rounds to zero is
refused everywhere; forfeited MARG converts in tranches (`convertForfeits` sells the largest halving of the
pot the pool absorbs); a stranger's dust cannot void a SELL call (a tolerance rule, since replaced by no SELL
hold rule at all: see the third review below); an observation slot is never owned (a more adverse reading replaces the
latest entry, so a one-block pump is overwritten next block); a note token whose `balanceOf` fails is "not
held" (VoidSold, never a refundable void); an unobserved call scores as wrong though its deposit returns;
a week holds at most 120 theses and refuses the 121st before taking anything; `abandonRequest` invalidates
an unanswered judging request after its deadline so a thesis pool is never swept from under a deliverable
answer; and an attestation must be about this chain. Two findings are disputed as design: any canonical
Uniswap pool is a venue (an author can be its only participant: see the limits below), and the adverse
extreme can be moved against a call by a paid round trip, which is the cost of the rule the launch asks for.

The third review (2026-10-10) reopened the launch on the self-priced venue, now reproduced as a loss path
(a wallet that is the only LP and trader of a hookless X/IMD pool settled a 100x call RIGHT at tier 3 and took
the capped 10% of the week's leaderboard pool for one stamp), and on the residual of the SELL hold rule (a
stranger's gift of the deposit's worth of X still voided a correct SELL call). Both are fixed: only a call
priced on the launch pool books a score (a call on any other venue still returns or forfeits its own deposit
and takes the writer refund, but books nothing and draws nothing from the leaderboard), and SELL calls have no
hold rule at all (any balance-growth rule is a stranger's transfer away from voiding a correct call; the BUY
hold rule is unchanged). The advisory `sqrt(2) == 2` is also fixed. See `ADAPTATION.md` and `.imd-responses.json`.

## v1 scope and known limits

- Price reads assume 18-decimal assets on both sides. Quotes other than IMD, ETH or WETH are refused.
- v4 venues have no on-chain accumulator, so their baseline and settlement rely on sampled extremes rather than a TWAP. These require honest permissionless observations; time spacing alone cannot prove an unobserved price was held continuously. A
  single hostile observation can push a genuine call to WRONG only by moving the pool against it at that
  block, which costs the mover the same swap fees and arbitrage exposure as a pump.
- Sells of MARG pay 3% through any router, or 1% plus the stamp through `sellWithNote` with a note and deposit attached.
- A right call's deposit comes back as MARG (`claimDeposit`); the fee-free conversion to IMD was removed for code size.
- The X trade leg supports v4 pools (including native-ETH pairs), v3 pools and v2 pairs; exact-input only.
- Quiet (un-noted) MARG sells are exact-input only: an exact-output sell through any router reverts
  (`NoteNeedsExactInput`). Exact-output buys are unaffected.
- `noteOf` returns a slim `NoteView`; the venue, text and timestamps are in the `NotePosted` event, which carries
  the ids, class, side, target, horizon, parent and text (price and deposit are read from `noteOf`).
- The implementation addresses in `MarginaliaImpls.sol` are the live launch-1240 deployments; the local tests etch
  rehearsal code at those same addresses, the fork tests use the live code.
- The action fee on follow trades, treasury conversion of ETH/USDC/USDT to IMD, the on-chain ERC-8004 agent
  badge (contract wallets are marked Agent), and attestation re-delivery are specified but not yet built.
- The judge binds an answer to the Intake request it paid for and to this chain id; it does not recompute
  the oracle's canonical question hash (the eligible set can change after the request), so the Intake is
  trusted to deliver each answer under the request it was bought for.
- Venue admission is "any canonical Uniswap pool with liquidity", and an author can be the only LP and trader
  of such a pool. A call priced there is a bonded claim that returns or forfeits the author's own deposit on
  price and moves a reputation score that no pool pays for. The site labels venues where the author is the
  dominant liquidity; the contract cannot see that and does not pretend to.
- SELL calls have no hold rule: they settle on price alone. BUY calls must keep their post balance.
- The hook's constructor reads no chain state (the launcher rehearses constructors in an empty EVM); the pinned
  implementation addresses are exercised by the mainnet-fork rehearsal instead.
