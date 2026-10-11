# Marginalia hook launch (univ4_hook, Ethereum mainnet): adaptation

This round makes the tree as delivered (commit 8075b3e, v0.8) the hook launch: the `Marginalia` token and
`MarginaliaHook(IPoolManager, token, factory)`, which clones the live launch #1240 companions. The launch shape
already held, and nothing about it changed:

- `Marginalia` (`src/Marginalia.sol`): no constructor arguments, 18 decimals, 1,000,000,000 MARG minted once to
  `msg.sender` (the factory). It has no mint, owner, pause, fee or upgrade path.
- `MarginaliaHook`: a nonpayable constructor `(IPoolManager $poolManager, address $token, address $factory)`. It
  validates its permissions (beforeInitialize, beforeSwap, afterSwap, beforeSwapReturnDelta,
  afterSwapReturnDelta = flags 0x20cc), clones Router/Judge/Treasury from the `src/MarginaliaImpls.sol`
  constants, and initialises each clone once. The constructor reads no chain state. `beforeInitialize` is
  callable only by the PoolManager. It requires the factory as sender and fee 12500, binds the first pool and
  refuses any later one. The hook has no owner, admin, pause, upgrade or setter. Its runtime has no
  DELEGATECALL, CALLCODE or SELFDESTRUCT and is 22,770 bytes (EIP-170 limit 24,576).
- The companion sources (`MarginaliaRouter`, `MarginaliaJudge`, `MarginaliaTreasury`, `MarginaliaPricer`,
  `MarginaliaTypes`) are **unchanged** in this round. The live implementations are what the clones run, and the
  brief forbids redeploying them.

## Changes, by finding

Each finding in the imported audit was checked against the unchanged tree first.

1. **`f31a482c` (high): `seal()` bound neither the sealer, nor X, nor the venue. Reproduced.** On the
   unchanged code, `seals` was keyed by `hash` alone, and `_postNote` used whichever seal sat at
   `sealHash(author, p)`. A stranger could therefore occupy that slot. The victim's note then reverted
   `TooEarly`, and once it did post, it was priced from the stranger's venue. An author could also seal one
   venue's baselines and reveal on another. Fix in `src/MarginaliaHook.sol`:
   - Seals are stored at `sealKey(sealer, hash) = keccak256(abi.encode(sealer, hash))`, a new public pure helper.
   - `Seal` gains `subject = keccak256(abi.encode(x, venue))`.
   - A reveal uses only the author's own seal whose subject is the note's own `p.x` and `p.venue`. Any other
     seal counts as no seal, so it can neither block nor price the note.

   The seal still pays its stamp, prices both baselines and snapshots the sealer's own X balance, as before.
   Tests in `test/LaunchAuditFindings.t.sol`:
   - `testAStrangersSealNeitherBlocksNorPricesTheAuthorsNote`
   - `testAnAuthorsSealOnAnotherVenueDoesNotPriceTheNote`

   The existing seal tests in `test/Lifecycle.t.sol` read the record at its new key.
2. **`43fe5339` (medium): an unguarded `totalSupply()` could block `settle` and `retract`. Reproduced.**
   `_difficulty` called `IERC20(x).totalSupply()` with all remaining gas and then `FullMath.mulDiv`. A reverting
   supply, or one whose market cap overflows, therefore made `settle` and `retract` revert forever. Fix:
   - The supply is read by staticcall bounded by the existing `BALANCE_READ_GAS`, the same way balances are.
   - A failed read, or a `postPrice * supply` that would overflow, books market cap 0, which is tier 1. SPEC's
     rule for an unreadable supply is also tier 1.
   - The score formula is otherwise unchanged.

   Tests:
   - `testARevertingTotalSupplyStillSettlesWrongAndPaysTheKeeper`
   - `testARevertingTotalSupplyDoesNotBlockARetraction`
   - `testAHugeSupplyBooksTierOneInsteadOfOverflowing`
3. **`559dc581` (low): the writer refund counted retracted notes. Reproduced.** `retract` left the note in
   `notesPerDay`, so the day's other notes were underpaid. Fix: `retract` decrements `notesPerDay[n.day]` unless
   the note already claimed its refund, in which case the claim already decremented it. Tests:
   - `testARetractedNoteLeavesTheDaysRefundSplit`: the sole non-retracted note takes `min(pool, STAMP)`.
   - `testARetractionAfterTheRefundClaimDoesNotDoubleCount`
4. **`d492eadc` (low): a lapsed seal was never cleared. Reproduced.** Fix:
   - `seal()` refuses only a seal that is still live (`age <= SEAL_MAX`). A lapsed seal may be replaced.
   - Posting the note now deletes the author's seal whether it was timely or lapsed.

   Tests:
   - `testALapsedSealCanBeSealedAgain`
   - `testUnrevealedSealIsNotAFreeOptionAndLapses` (Lifecycle) previously asserted that "the lapsed seal
     record stays". It now asserts the record is spent, because that rule is the one this finding changed.
5. **`b88581da` (low): `launch.json` was mixed-case and had no `initialPrice`. Reproduced.** `launch.json` is
   **removed**. The manifest belongs to the step after this one, and a partial manifest in the tree is checked
   and rejected. `README.md` now says the manifest step writes it. The launch values the code relies on are
   unchanged:
   - constructor args `$poolManager, $token, $factory`
   - flags 0x20cc
   - fee 12500 and tick spacing 60
   - IMD `0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7`
6. **`cceb58e5` (info): one test asserted a gas measurement that this toolchain no longer gives. Reproduced:**
   177 passed and 1 failed, out of 178. `test/AuditFindings.t.sol`
   `testHeadOfThreeFitsIntakeStipendAndAFullRankingIsRetried` asserted that a 120-id answer does *not* fit the
   200k callback. It now asserts the property itself, on either outcome:
   - if the answer fits, the week is judged and the head is the thesis;
   - if it does not, the week stays unjudged and the head-of-three retry fits.

   No contract changed for this finding.

## Findings left alone, and why

- **`e20484511` (low): the judge never compares `a.questionHash` with `questionBody(week)`. Reproduces.** By
  reading the code, `onOracleResult` has no such check. The existing tests also deliver attestations with
  `questionHash = keccak256("q")`, and the judge accepts them. **Not fixed:** the check belongs in
  `MarginaliaJudge`, and the hook runs a clone of the live implementation `0xC934…72b4`. The brief forbids
  redeploying the companions. Editing the source here would make the tests run code that mainnet does not run,
  and the hook has no way to see the question hash, because the judge passes it only the head of three. The
  impact is unchanged from the audit: the Intake must route answers to the right `requestId`, and a misrouted
  answer most often leaves an empty head, which rolls the week's pool forward. Fixing this needs a new judge
  implementation, which is a decision for the requester.
- **`3d919d39` (info): the companions are EIP-1167 clones with initialisers.** The brief mandates this. The
  hook's own runtime has no DELEGATECALL, which the protected floor checks.
- **`9e449bc8` (info): `beforeInitialize` does not pin tick spacing 60 or the IMD address.** Left as is. The
  factory supplies both from the manifest, the brief asks only for the factory and fee 12500, and pinning IMD
  would make the hook unusable on any test or other manager.
- **`447e57be` (info): third-party non-empty `hookData` reverts.** This is documented behaviour and unchanged.
- **`9d389a94` (info): coverage statement.** It needs no action.

## Validation (this round)

- `forge build`: passed, with lint warnings only.
- `forge test --no-match-path 'test/fork/*'`: **186 passed, 0 failed**. That is the 178 tests as delivered
  plus 8 new ones in `test/LaunchAuditFindings.t.sol`. The brief's 179 does not match the delivered tree, which
  had 178.
- The supplied protected floors (`Hook.protected.t.sol`, `Token.protected.t.sol`) were run unchanged from
  `test/scratch/` and all **11 passed**. They ran against the built creation code with the manager, token
  probe and factory probe at their own addresses, IMD as the paired currency, fee 12500, tick spacing 60,
  sqrtPrice 2^96, flags 0x20cc, expected supply 10^27 and decimals 18. The hook's constructor ran in an EVM
  where the implementation addresses have no code.
- **Not run:** the mainnet fork suite `test/fork/MainnetLaunch.t.sol`, because no `MAINNET_RPC_URL` was
  available on this machine. The imported audit reports 5 fork tests passing against the live companions on
  the unchanged tree. This round changed only the hook, so the companions' byte-identity it reported is not
  affected.
- No dependency, build configuration, submodule or CI file was changed.

---

# Earlier rounds: companion implementations (launch #1240)


This is the Ethereum mainnet contracts-only launch. Deploy exactly these existing application
contracts, each with an empty constructor argument list:

| Contract | Constructor behavior | Runtime / creation bytecode (bytes) |
| --- | --- | --- |
| `MarginaliaRouter` | Locks its own `hook` to `address(1)` | 17,616 / 17,667 |
| `MarginaliaJudge` | Locks its own `hook` and initializes its EIP-712 implementation domain | 11,194 / 12,362 |
| `MarginaliaTreasury` | Locks its own `hook` to `address(1)` | 1,449 / 1,493 |
| `MarginaliaPricer` | Implicit nonpayable, zero-argument constructor; stateless | 7,748 / 7,774 |

These constructors were already suitable for an empty-chain factory deployment and required no
argument changes. They make no external calls. All library calls are internally linked. There is
no owner, pause, upgrade, action fee, token deployment, pool creation or deployment-time initializer
in this launch. Router, Judge and Treasury are implementations, not operational instances: the
later hook creates immutable EIP-1167 clones and initializes them atomically. The implementation
lock is the explicitly requested sentinel, not an invented recipient or dependency address.

The worker prepared and rehearsed the deployment bytecodes; it did not broadcast transactions or
read wallet keys. The manifest/deployment service supplies confirmed addresses. The existing
`MarginaliaImpls.sol` rehearsal constants belong to the later hook launch and must be replaced with
those confirmed addresses at that step. None is used by the four implementation constructors.

## Reproduced imported findings and changes

All six imported findings reproduced. None was dismissed.

1. **`a4534c56…`: posting used a manipulable same-block spot.** On the original code, selling
   2,000,000 MARG, posting a BUY +10% call and buying back caused a falling market to settle RIGHT.
   The mirror SELL attack also settled RIGHT. `test/AuditFindings.t.sol` reproduces both with real
   local v4 swaps and checks that both now settle WRONG. Changes:
   - `src/MarginaliaTypes.sol` adds `PriceWindow`, holding a first accumulator reading and sampled
     price extremes.
   - `src/MarginaliaRouter.sol` adds permissionless `checkpointVenue`, using the existing canonical
     venue validation and deriving orientation/quote before storing history. The mapping is keyed
     by the derived venue, not caller-supplied orientation. `postPrice` passes that history to the
     stateless pricer. A live checkpoint cannot be replaced or have its start reset.
   - `src/MarginaliaPricer.sol` replaces the spot-only posting API with one that requires a prior
     window: at least one hour, an earlier block, and at most six hours since its start. V3/v2 use
     the accumulator TWAP from that start through posting. V4 and the hub use the maximum sampled
     price for a BUY baseline, minimum for SELL, including the current price. The baseline's
     conservative direction is opposite settlement's because it multiplies the target.
   - `src/MarginaliaHook.sol` reads the baseline through its router and exposes its existing pricer
     reference so the router also makes stateless price calls. Settlement and score formulas stay
     unchanged. Hook runtime remains below EIP-170 at 23,864 bytes; creation code is 25,469 bytes.
   - `test/PriceHistory.t.sol` covers accumulator timing, both price orientations, hub manipulation,
     fresh/missing/expired history, window preservation and fuzzed conservative v4 baselines.

2. **`c697391d…`: a fully ineligible ranking permanently trapped a thesis pool.** The original
   `payJudged` reverted `BadAnswer` for a signed ranking containing only id 999. In
   `src/MarginaliaJudge.sol`, an empty filtered head now reaches the hook's existing unranked-slot
   rollover instead of reverting. Signed empty arrays are also accepted as a no-winner result.
   Payment remains one-shot. `test/AuditFindings.t.sol` verifies the entire remaining IMD pool
   rolls to the current week, the old pool is zero, and a second payment fails.

3. **`e454c18b…`: the root manifest described the wrong launch.** The supplied `launch.json`
   contained `kind: univ4_hook`, token/pool entries and no contracts array. It was removed. No
   replacement manifest was written: that is the next launch step's responsibility. `README.md`
   now distinguishes these four implementations from the later token/hook launch.

4. **`58380615…`: unbounded callback storage exhausted the Intake stipend.** The original clone
   ran out of the 200,000-gas stipend when storing a full 120-id ranking. In
   `src/MarginaliaJudge.sol`, only the requested first three ids are stored. Filtering and
   deduplication still occur at payment; entries after the requested head are ignored, including
   when the head contains ineligible ids. Tests cover 5 and 120 ids, EOA and ERC-1271 signatures,
   no-winner answers, duplicate/invalid ids, replay, sender checks, signature tampering, validity
   windows, quorum and retry. `test/JudgeOracle.t.sol` also pins the supplied protocol digest,
   signature and callback selector on a clone. The vector's 5/4 panel is verified by a test-only
   signature harness and is correctly rejected by the application's unchanged 7/5 quorum.

5. **`9129914f…`: v4 reads accepted a pool with no active liquidity.** Removing all fixture
   liquidity still allowed an observation on the original code. `src/MarginaliaPricer.sol` now
   rejects empty v4 venues and the v4 ETH/IMD hub with `EmptyPool`, including observation,
   checkpoint and posting reads. The integration regression verifies the failed observation
   leaves the call to resolve `VoidNoData`; unit tests cover an empty hub too.

6. **`71bebb06…`: forfeiture conversion used a floor derived from the caller's manipulated spot.**
   The original conversion succeeded immediately after a 2,000,000-MARG dump. In
   `src/MarginaliaHook.sol`, the pot sale's 97% floor now uses the router's mature MARG/IMD window
   and its conservative maximum, including the current price. The dump now reverts without
   consuming the pot. Full-fill accounting and the 97% factor remain unchanged. Tests also
   demonstrate conversion resumes after a genuine price decline once a fresh window matures,
   and verify the IMD claims received. The author's optional deposit conversion is unchanged.

## Other launch adaptation

- `src/MarginaliaRouter.sol`, `src/MarginaliaJudge.sol`, `src/MarginaliaTreasury.sol`: each one-shot
  initializer additionally checks `msg.sender == hook_`, matching the explicit requirement that
  the hook initializes its clones. The constructor locks and nonzero configuration checks remain.
  `test/Implementations.t.sol` checks all implementation locks, refusal of another caller, one
  successful initialization and refusal of every repeat.
- `test/helpers/Fixture.sol` seeds a real checkpoint and advances the EVM clock by an hour before
  price-call tests. Existing economic assertions are preserved. `test/fork/MainnetLaunch.t.sol`
  does the same for the selected live venue and explicitly skips when `MAINNET_RPC_URL` is absent,
  allowing the whole suite to run with an empty environment. A skip is not a fork pass.
- `README.md` documents the launch scope, changed posting/conversion preparation, no-winner
  rollover, head-of-three semantics and oracle limitations. This file records every adaptation.
- No build configuration, dependency, environment file, submodule, repository metadata or CI file
  was changed. No dependencies were installed. All delivered regression tests are outside scratch.

## Operational consequences and preserved behavior

Anyone may checkpoint a canonical venue. Price calls and pot conversions need a window between
one and six hours old; an expired window must be restarted and mature again. Theses need no price
history. A stale baseline causes an atomic revert, with the user's funds unchanged. The six-hour
expiry prevents indefinitely stale references; preserving live extrema prevents an attacker from
erasing an honest checkpoint immediately before posting. This is a deliberate, tested behavior
change required by the two reproduced spot-price findings. Tests use `vm.warp` and `vm.roll`, not
real-time waiting.

V4 and hub histories remain sampled price extremes, not accumulators. They rely on honest
permissionless observations, as does the pre-existing settlement design. Spacing alone cannot
prove a price was held at unobserved times; hostile extreme readings can defer conversion or make
a call harder to win until expiry. V3/v2 averages use elapsed accumulator time. The existing
18-decimal assumption, oracle signer trust and canonical venue policy are unchanged.

The judge threshold remains 2 IMD, the configured oracle price 0.5 IMD, the prize split 50/30/20,
and the treasury drip 2% per UTC day. No 0.25% action fee was added. Canonical venue validation,
fee-on-transfer pulls, weekly pools, retry deadlines, sweep accounting, full-fill sales and the
one-hour settlement observation span remain in place.

## Validation

- Original baseline: 33 tests passed before changes. Added regressions failed against the original
  source for the findings described above, then passed against the fixes.
- `forge build --sizes`: passed with the repository's existing Solidity 0.8.26 / Cancun / via-IR /
  optimizer settings. All four implementations and the later hook fit runtime/initcode limits.
- The **unchanged** supplied `Contracts.protected.t.sol` was copied to scratch and run against all
  four compiled creation bytecodes with no constructor arguments on chain id 1. It passed factory
  CREATE2 deployment, predicted-address checks, runtime limits and forbidden-opcode scanning.
- `test/Implementations.t.sol` independently rehearses all four deployments without dependencies
  present on chain, checks linked bytecode behavior, and exercises clone initialization.
- Final `forge build`: passed (compiler/lint warnings, no errors).
- Final `forge test --no-match-path 'test/fork/*'`: **59 passed, 0 failed**; the fuzz test ran the
  configured 256 cases.
- Final plain `forge test`: **59 passed, 0 failed, 1 skipped suite setup**. The mainnet fork suite
  explicitly skipped because no RPC URL was supplied.
- The four local CREATE2 implementation deployments used **8,694,125 gas**, excluding the test's
  opcode-scanning loop and any production factory overhead.
- No live mainnet fork, Slither, Mythril, explorer verification or broadcast is claimed.

## Revision round 2 (2026-10-11): reviewer findings

Each finding was reproduced before anything changed (the two supplied proofs failed on the starting tree
and pass now; `.imd-responses.json` carries the verdicts). Changes, by file:

- `src/MarginaliaPricer.sol` (finding `4772e72b`, zero prices; `272fbe0d`): `fromSqrt` reverts `EmptyPool`
  when a price rounds to zero in either orientation; the v2 spot and v2 TWAP, `postPrice` and `settlePrice`
  reject a zero result. `sqrt` seeds with `x / 2 + 1` so `type(uint256).max` no longer overflows.
- `src/MarginaliaJudge.sol` (`70ce87bf`, stranded pot): `convertForfeits` tries the whole pot, then halves
  down to 1/256 (`CONVERT_HALVINGS`), through the unchanged judge-only `sellPotMarg` and its unchanged 97%
  floor, and re-raises the hook's reason only if no tranche sells. (`f0aea555`): `weekClosed` stays false
  while a request is still deliverable; new permissionless `abandonRequest(week)` invalidates an unanswered
  request after `ANSWER_DEADLINE`, after which the week can be swept and a late delivery is refused.
  (`b5fc440f`): `onOracleResult` requires `a.chainId == block.chainid`.
- `src/MarginaliaHook.sol` (`ce3d30ae`, dust voids a SELL): the hold rule is `_broken`; a SELL call breaks
  only when the balance grows by more than `SELL_HOLD_TOLERANCE_BPS` (10%) of the post balance and the
  deposit's worth of X. (`7fa6bcfb`, slot squatting): `observe` keeps the slot spacing and cap, but a reading
  more adverse to the call than the latest entry replaces it (`_moreAdverse`). (`542fd714`, switchable
  `balanceOf`): the balance is read by bounded-gas staticcall (`_balanceOf`); a failed read is the
  unverifiable sentinel and counts as not held. (`0a0c1d10`, free option): `VoidNoData` books `-difficulty`
  while the deposit remains claimable. (`7539406d`): `MAX_WEEK_THESES = 120` replaces the silent 256 cut;
  a 121st thesis reverts before its stamp and deposit are taken. (`4772e72b`): a zero baseline is refused
  and a series the pricer cannot price settles `VoidNoData` instead of reverting forever. Hook runtime is
  24,442 bytes (limit 24,576).
- `src/MarginaliaRouter.sol` (`6948a02b`, v3 branch): a canonical v3 pool with zero liquidity is refused.
- Tests: `test/RevisionFindings.t.sol` (one test per change above), `test/PotTranche.t.sol` (the reviewer's
  proof kept as the regression, plus the pot draining across fresh windows), `test/Lifecycle.t.sol`
  `testNoDataRefunds` updated for the negative score. The supplied proofs were run from `test/scratch/`.

Disputed, with reasons in `.imd-responses.json`: `6948a02b` (venue admission is the project's design and
has no owner-settable policy; the free variants are closed and the limit is documented), `ec6beba1` (the
adverse-extreme rule is the one the brief specifies; its cost is a paid round trip), `86e81b29` (concerns
the later hook launch, recorded as its first work item). The four implementation constructors are
unchanged: still empty, still locking `hook = address(1)`, still making no external calls.

Validation after this round: `forge build` passes (warnings only); `forge test --no-match-path 'test/fork/*'`
passes every test; the two reviewer proofs pass from `test/scratch/`.

## Revision round 3 (2026-10-10): reviewer findings

Each finding was reproduced on the unchanged tree before anything changed (the reviewer's recipes, rebuilt in
`test/scratch/Round3Repro.t.sol`, failed exactly as reported: leaderboard share 50.005 IMD for the self-priced
venue, VoidSold with score -20,538 for the gifted SELL call, `sqrt(2) == 2`). `.imd-responses.json` carries the
verdicts. Changes, by file:

- `src/MarginaliaHook.sol` (`c7331916`, self-priced venue farms the leaderboard): `_difficulty` returns 0 for a
  call whose venue is not the launch pool (v4, `ref == poolId`), so `settle` and `retract` book no score and no
  `weekScore` for it, in either direction. The call still returns or forfeits its own deposit on price, still
  counts in `right` / `wrong` / `broken` / `retracted`, and still takes the writer refund. Of the reviewer's three
  options this is the only one that bounds the draw to zero: a capped multiple or a depth-derived tier still
  leaves a RIGHT on a pool the author alone provisions free, and free rights dilute honest scores pro-rata
  across any number of wallets. A venue policy that would let other canonical pools score again is the
  requester's decision; there is no owner to set one.
- `src/MarginaliaHook.sol` (`80c42ce7`, a gift voids a SELL call): the SELL hold rule is removed; `_broken` is
  false for SELL calls, which settle on price alone. `balanceOf` cannot distinguish a buy-back from a stranger's
  transfer, so every tolerance is a griefing price, not a guarantee. The BUY hold rule and its unverifiable-read
  sentinel are unchanged. `SELL_HOLD_TOLERANCE_BPS` is gone. Hook runtime is 24,411 bytes, initcode 26,016.
- `src/MarginaliaPricer.sol` (`4e3977e5`, advisory): `sqrt` returns 1 for inputs 1..3 before the loop; the
  overflow-safe seed stays for the rest. One of the four deployed contracts, so fixed here.
- Tests: `test/Round3Findings.t.sol` (the reviewer's two scenarios as regressions, plus: a wrong call and a
  retraction on another venue book no score, a launch-pool call still scores and pays, a gift of any size does
  not void a SELL call, a wrong SELL call still forfeits, a BUY call still breaks on a sale, `sqrt` exhaustive
  over 0..1023 and fuzzed over `uint256`). `test/RevisionFindings.t.sol`: `testARealBuyBackStillVoidsASellCall`
  encoded the removed rule and is now `testABuyBackNoLongerVoidsASellCallItSettlesOnPrice`;
  `testARevertingBalanceOfVoidsTheCallAsSoldNotAsNoData` asserts score 0 (its venue is not the launch pool).
- Docs: `SPEC.md` 4.3 (hold rule, score eligibility), 4.4 and section 10 rows; `README.md` leaderboard row,
  audit history and known limits now state both rules as implemented.

The four implementation constructors are unchanged: empty, locking `hook = address(1)`, no external calls.
Validation after this round: `forge build --sizes` passes (warnings only); `forge test --no-match-path
'test/fork/*'` passes every test (the fork suite still skips without `MAINNET_RPC_URL`); the unchanged supplied
`Contracts.protected.t.sol` was run again from `test/scratch/` against the four rebuilt creation bytecodes with
no constructor arguments on chain id 1 and passed.
