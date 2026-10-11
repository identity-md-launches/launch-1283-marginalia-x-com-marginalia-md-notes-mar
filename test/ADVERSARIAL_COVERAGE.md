# Additional adversarial coverage

These tests extend the accepted suite without changing implementation or configuration files.

| File | Coverage |
| --- | --- |
| `HookBoundaries.t.sol` | Caller authentication, fabricated hook data, exact-output restrictions, foreign pools, transactional rollback, text/target/horizon limits, parent validation, observation and seal time boundaries, forfeitures, unauthorized/duplicate claims, sweeping, and bond round trips. The two fuzz properties run 1,000 cases each. |
| `LaunchBinding.t.sol` | First-pool binding, factory and LP-fee restrictions, invalid pairs, the exact five permissions, pinned EIP-1167 bytecode, constructor rehearsal without external code, absence of common admin entry points, LP fee collection and full withdrawal, a noted buy against a manager seeded only with MARG, and exact fee accounting in both currency orders. |
| `HookAccountingInvariant.t.sol` | A real PoolManager with three funded writers and a separate keeper; 128 runs of 80 randomly selected actions. Unexpected handler reverts fail the campaign. |

The accounting handler maintains an independent ledger from deposits, fees, stamps, gifts,
forfeitures, withdrawals, oracle spending, and prize payments. After every generated action it checks:

- IMD claims equal the sum of all outstanding bonds, daily refund pools, and weekly thesis pools.
- Claims also equal cumulative value credited minus cumulative payments; the manager backs them.
- Each bond equals its outstanding, returned, and forfeited portions, with no duplicate payout.
- Note states and child counts agree with the modeled transitions; completed notes never reopen.
- Retractions and refund claims update the remaining writer count correctly.
- Keeper rewards are exactly 10% of applicable forfeitures. Refunds are equal remaining shares capped at one stamp.
- Treasury gifts minus drips equal its actual balance. Oracle requests spend their fixed mock price,
  leave no judge balance or approval, and prizes follow the 50/30/20 ranking with unused shares rolled forward.
- The hook retains no MARG claims. All MARG balances in the generated system sum to the unchanged supply.

Actions include buys, quiet and noted sells, calls, theses, timely children, seals, observations,
settlement, retraction, both claims, funding, treasury drips, day/week sweeps, unauthorized claims,
and judging requests, answers, payments, and abandonment. Initial notes and a deterministic handler
scenario prevent an empty-state campaign from being the only exercised behavior.

## Scope and confirmed defect

The hook, router, treasury, judge, pricer and PoolManager are the repository implementations.
Companion code is installed at the pinned addresses using the existing fixture. IMD and the Intake
are local mocks; the accounting handler uses the fixture's permissive ERC-1271 signer. Signature
authenticity is covered by the existing oracle tests, not by this accounting mock. Live deployment
identity and live mainnet behavior still require the existing `test/fork` suite and `MAINNET_RPC_URL`.

The review reproduced a missing seven-day check when attaching a child to a thesis:
`src/MarginaliaHook.sol` accepts the first child after eight days while the thesis remains open.
This prevents its forfeiture and can release its bond. The finding and a self-contained Foundry
test that fails on the current source are in the requested root `.imd-findings.json` report.
The passing suite does not assert that late children are valid. Its child handler explicitly
generates timely children; the exact seven-day boundary is tested separately.

Run `forge build` and `forge test`. The offline selection is
`forge test --no-match-path 'test/fork/*'`.
