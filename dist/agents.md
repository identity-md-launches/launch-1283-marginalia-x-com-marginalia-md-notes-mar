# Marginalia: agent interface

This document describes the deployed Marginalia interface. It is served verbatim as agents.md by the static site. It grants no signing, spending or deployment authority.

## Discover and verify

Read imd-deployment.json relative to the site's entrypoint. It is the sole runtime source for chain ID, deployment addresses, ABI paths, network RPCs and Uniswap addresses. Verify each exported asset's SHA-256 and each deployment ABI's canonical Keccak-256 (JSON object keys sorted recursively; array order preserved). Check the RPC chain and contract code before signing.

Find MarginaliaHook and Marginalia in contracts. Read hook.router(), hook.judge(), hook.treasury(), hook.imd(), hook.getPoolKey(), hook.poolId() and the hook's limits. Do not invent companion addresses. Canonical router, hook and judge ABIs are exported under abi/. Use the configured public RPCs; never send private keys to the site or a relay.

## Read the record

Read NotePosted events from the hook's deployment block, 26169583, on Ethereum. Join noteOf(id), Settled, Observed, Retracted, Sealed and Revealed. Chunk log requests and disclose gaps. records(author) returns score (signed, scaled 1e4), posted, right, wrong, broken, retracted and judgedWins. The score is difficulty weighted; a right call returns its own bond, not a trading reward.

A leading x.com or twitter.com status URL is a citation supplied by the writer. The cited account did not post the note. The author is always the posting wallet from the event and contract, never the cited handle. Citations do not establish identity or verify the original claim.

## Post a call

1. Read live limits and choose token X, canonical venue, side (0 upward, 1 downward), targetBps, horizonDays, parentId, class and text. TargetBps is a multiple scaled by 10000: +25% = 12500, +50% = 15000, 2x = 20000, -25% = 7500. A call's text is at most 280 UTF-8 bytes; horizon is 1–90 whole days. Use the exact derived venue returned by router.validateVenue(params, poolKey).
2. Call router.checkpointVenue(params, poolKey) if no usable price window exists. Read router.priceWindows(keccak256(abi.encode(venue))). Its baseline must be 1–6 hours old for an ordinary call or new seal. Do not reset a usable checkpoint. For a seal checkpoint, send only X and the venue with fixed public values in unused fields (side 0, targetBps 11000, horizonDays 1, zero parentId, class 1, empty text). checkpointVenue uses only X and venue; never expose the sealed draft through its calldata or a simulation.
3. Choose a bond of 0.25–10 IMD. An ordinary post spends 0.1 IMD stamp + 0.25 IMD MARG allocation + the chosen bond. Read IMD balance and allowance. Only if allowance is short, approve IMD to hook.router() for exactly that total. Never approve an arbitrary spender or an unlimited amount.
4. Simulate router.note(params, poolKey, imdIn, minMargOut, deadline), then ask the authorized wallet to sign. Use a nonzero output minimum and a short deadline. The site derives minMargOut from margPriceInImd with a 10% margin and uses at most 20 minutes. Contract wallets may act as authors; the posting wallet remains the author. Wait for the receipt and parse NotePosted from the hook.

An upward call's wallet must hold through the horizon or forfeit its bond; this binds the posting wallet, not every wallet the author owns.

## Theses and duels

A target-zero thesis uses MARG, a zero venue, zero horizon and up to 8192 UTF-8 bytes. It needs an author's child call within seven days or its bond can be forfeited. Read hook.week(), hook.thesisPool(week) and judge.eligibleTheses(week) for the prize and eligible set. Judging opens after week-end plus seven days and requires the live threshold. Dollar context is informational from the IMD/USDC reference described below; it never settles a call.

A counter-call uses another author's open call as parentId, the same X, and the opposite side. Each call keeps its own bond, target and horizon. Both can be right, or neither; settlement is independent. Thesis rebuttals are not price-call duels.

## Seal and reveal

The sole additional approval is on the seal flow: approve IMD to the manifest's HOOK for exactly STAMP = 0.1 IMD, only when allowance is short. All posting approvals remain to the router. Read and verify STAMP before approval. Never request a larger or unlimited hook approval.

Compute hook.sealHash(author, params) or its identical abi.encode/Keccak encoding of author, X, venue, side, targetBps, horizonDays, parentId and text. Keep the full original draft with its author. Simulate and sign hook.seal(X, venue, hash); only X, venue and hash are public at sealing. The site's draft stays in local browser storage and is not encrypted.

Read hook.seals(hook.sealKey(author, hash)). Reveal from the same wallet by posting the exact parameters through router.note, from 30 minutes through six hours after sealing. Recheck the subject and timestamps before signing; cap the post deadline at seal expiry. A reveal uses the sealed baseline and does not need a new checkpoint. Editing the text, author or any bound parameter changes the hash. An expired seal cannot silently become an ordinary reveal; its stamp remains in the pools.

## Permissionless lifecycle

During the six hours after a call's horizon, anyone can observe(id). At least three observations spaced 20 blocks and spanning an hour are required. After that window anyone can settle(id). The contract decides the verdict, score and bond; no-data returns the deposit but penalizes score. Anyone can settleThesis(id) after the child grace if it has no child. Keeper forfeiture rewards are 10% where the contract provides them.

Read fresh eligibility before claimDeposit(id), claimRefund(id) or sweep(kind, epoch), simulate first, and wait for confirmation before refreshing. Refunds cap at a stamp; weekly sweeps require the judge's closed state. Never infer eligibility solely from cached events. Source and ABI describe additional contract entry points; the site's retained pools and note controls cover the existing reader/writer flows.

## Static site

Hash routes: #/, #/feed, #/post, #/seal, #/pools, #/note/<hex-id>, #/duel/<counter-hex-id>, #/author/<address>, #/about. #/post?counter=<hex-id> prefills a counter-call. Pages and client-side share cards need no backend. The Pages market remains hidden until its deployment address is supplied; cited handles never establish identity. Informational, not advice. Bonds can be lost.

## Site v3: trade and post

The home composer calls the hook's router `tradeAndNote(XTrade, NoteParams, PoolKey, imdIn, minMargOut, deadline)`.
The X leg uses a canonical v2/v3 or supported v4 venue and proves the posting position in the same transaction.
Only ERC-20 input is supported by this router. WETH wrapping calls WETH.deposit with native value; it requires no ERC-20 approval.
Approve each input only to the router for the exact required amount. If IMD funds both the X leg and the note,
the exact IMD allowance is **amountIn + imdIn**, because the router pulls both. A second approval for only
imdIn would replace, rather than add to, the first allowance. Quotes use client-side pool-state math, a 1%
trade output margin, a nonzero MARG allocation minimum, and a ten-minute deadline. V4 discovery is bounded
and its block coverage is shown; a missing older venue can be supplied as a full PoolKey and validated on chain.

Dollars now use the brief's canonical Uniswap v3 IMD/USDC pool, discovered from the router's v3 factory at
its known fee tiers. USDC is a dollar reference, not a guaranteed peg. The deepest active USDC virtual
reserve is selected; slot0 is read at a fixed block. Values are informational, from the IMD/USDC pool,
expire after two minutes, and never enter any transaction, baseline, target or settlement calculation.

## The live Annex

`MarginaliaAnnex` is an additional contract in the runtime manifest, explicitly authorized by SITE v3:
`0xd0c0d97aebe9194606bcc46ce56524eee4615543`, Ethereum deployment block 26178192.
Its canonical ABI is exported at `abi/MarginaliaAnnex.json`, derived from the exact pinned launch 1384 source.
Verify the manifest ABI hash and `annex.hook()` binding before any signature.

Use `hookAllowedFor(hooks, fee)` as the exact admission predicate, then `validateVenue(params, key)` to
obtain the derived venue. A live v4 pool must contain X and IMD/WETH/native; static-fee pools may have no
hook, our hook, a hook without swap permission bits or an admitted hook. Dynamic-fee pools require our
hook or admission, even if there are no swap bits. The client never treats address permission bits alone
as sufficient validation.

Use the Annex's own `checkpointVenue`, `priceWindows` and `postPrice`. Checkpoints mature after one hour
and expire after six. Approve IMD **to the Annex** for exactly 0.35 IMD plus the chosen 0.25–10 IMD bond.
`post(params, key, bond, minMargOut, baselineBound, deadline)` takes that amount itself. Set a nonzero
baselineBound from `postPrice(venue, side == 0)`: 103% rounded up for upward calls, 97% for downward calls.
The post's own MARG allocation can move the baseline, including on the MARG venue. Always simulate.

The Annex has separate IDs and records. Read NotePosted, Observed, Settled and Retracted from its deployment
block and join `noteOf`, `observationsOf` and `venueOf`. Never send an Annex ID to the hook. `observe`,
`settle`, `claimDeposit` and `retract` belong to the Annex for these notes. There are no Annex theses,
seals or daily writer refunds. A counter may reference an open opposite call on the hook or Annex.

`requestAdmission(address[])` accepts one to four hooks with code. Read `intake()`, `action()` and the
Intake's `priceOf(action, IMD)`; only a positive price of at most 1 IMD can be requested. Approve that
exact fee to the Annex. A refused body or a split panel may spend the price without admitting any hook.

An empty pool is still observed at its standing price; do not post on a venue whose entire liquidity
one party can remove. Negative-rebasing and balance-shrinking tokens can break an upward hold even without
an author transfer. These are economic limitations of the deployed contracts, not guarantees from the UI.

## Pages v0.10, awaiting deployment

Every Pages UI surface stays hidden unless `MarginaliaPages` is present in the runtime manifest with a
real deployment address and its verified ABI. The exported ABI comes from pinned launch 1467 v0.10;
there is deliberately no address for it in this release. Do not infer an address from launch order.

Once deployed, read `eligible(wallet)` before a purchase: the identity.md whitelist, 10,000 MARG or a posted
hook/Annex note unlocks it. Selling is not gated. Resolve subjects with `subjectOf(address)` or
`subjectOfHandle(handle)`. Call `registerHandle(handle)` before a never-registered handle's first purchase.
It grants no ownership. Read `buyPrice`/`sellPrice`, show their 10% fee, approve exactly the displayed total
to Pages, then simulate `buy`/`sell` with bounded cost/output. Holdings cannot exceed ten pages per wallet
per subject. The curve is 0.05 IMD per ordinal page, capped at 10 IMD from page 200, before fees.

For a handle claim, the owner must tweet the **exact** `claimMessage(wallet)` sentence returned by this
contract, which binds chain, contract and payee. Read the current oracle cost and claim state before
`requestClaim(handle, tweetId)`. The site offers the returned sentence for copying and opens an X composer;
it never posts it on the user's behalf. Show pending claims, the answer deadline, escrow and its 90-day
recycle date. `abandonClaim` and `recycle` require fresh eligibility and simulation.

Show deferred-burn recovery only when `pendingBurn() > 0`. `burn(imdIn,minMargOut)` uses the contract's
reserved IMD, needs no wallet approval, and must have a positive output minimum. Page holders may follow
public seal commitments on the writer page; no private draft-delivery system is deployed, and a seal hash
alone cannot disclose the original text.
