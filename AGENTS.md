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

A target-zero thesis uses MARG, a zero venue, zero horizon and up to 8192 UTF-8 bytes. It needs an author's child call within seven days or its bond can be forfeited. Read hook.week(), hook.thesisPool(week) and judge.eligibleTheses(week) for the prize and eligible set. Judging opens after week-end plus seven days and requires the live threshold. There is no USD price source in the supplied deployment; do not invent a dollar value.

A counter-call uses another author's open call as parentId, the same X, and the opposite side. Each call keeps its own bond, target and horizon. Both can be right, or neither; settlement is independent. Thesis rebuttals are not price-call duels.

## Seal and reveal

The sole additional approval is on the seal flow: approve IMD to the manifest's HOOK for exactly STAMP = 0.1 IMD, only when allowance is short. All posting approvals remain to the router. Read and verify STAMP before approval. Never request a larger or unlimited hook approval.

Compute hook.sealHash(author, params) or its identical abi.encode/Keccak encoding of author, X, venue, side, targetBps, horizonDays, parentId and text. Keep the full original draft with its author. Simulate and sign hook.seal(X, venue, hash); only X, venue and hash are public at sealing. The site's draft stays in local browser storage and is not encrypted.

Read hook.seals(hook.sealKey(author, hash)). Reveal from the same wallet by posting the exact parameters through router.note, from 30 minutes through six hours after sealing. Recheck the subject and timestamps before signing; cap the post deadline at seal expiry. A reveal uses the sealed baseline and does not need a new checkpoint. Editing the text, author or any bound parameter changes the hash. An expired seal cannot silently become an ordinary reveal; its stamp remains in the pools.

## Permissionless lifecycle

During the six hours after a call's horizon, anyone can observe(id). At least three observations spaced 20 blocks and spanning an hour are required. After that window anyone can settle(id). The contract decides the verdict, score and bond; no-data returns the deposit but penalizes score. Anyone can settleThesis(id) after the child grace if it has no child. Keeper forfeiture rewards are 10% where the contract provides them.

Read fresh eligibility before claimDeposit(id), claimRefund(id) or sweep(kind, epoch), simulate first, and wait for confirmation before refreshing. Refunds cap at a stamp; weekly sweeps require the judge's closed state. Never infer eligibility solely from cached events. Source and ABI describe additional contract entry points; the site's retained pools and note controls cover the existing reader/writer flows.

## Static site

Hash routes: #/, #/feed, #/post, #/seal, #/pools, #/note/<hex-id>, #/duel/<counter-hex-id>, #/author/<address>, #/about. #/post?counter=<hex-id> prefills a counter-call. Pages and client-side share cards need no backend. The page market and verified identity claims are not deployed here. Informational, not advice. Bonds can be lost.
