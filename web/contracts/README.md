# Integration source provenance

These two source snapshots are integration inputs, not a change to the live protocol. They are byte-identical to the explicitly supplied commits. Their full original trees were downloaded and compiled in `/tmp`, retaining those trees' Foundry configuration/dependencies. No new submodule, dependency archive or compiled Foundry output is included here. Imports in the snapshots refer to those original trees; obtain the pinned repository to reproduce compilation.

| Contract | Pinned source | Source SHA-256 |
| --- | --- | --- |
| Annex | [launch 1384, a0154db168b6630b74ba8e1dfefb373a598b65db](https://github.com/identity-md-launches/launch-1384-src-marginaliaannex-sol/tree/a0154db168b6630b74ba8e1dfefb373a598b65db), `src/MarginaliaAnnex.sol` | `2f7bc5ae583377bbf62c5cd80520e0165773973ba7afbd93febd04bca8ce5764` |
| Pages v0.10 | [launch 1467, 5cf7caed0e188088eb3f55c8e5005e281cd382d9](https://github.com/identity-md-launches/launch-1467-src-marginaliapages-sol/tree/5cf7caed0e188088eb3f55c8e5005e281cd382d9), `src/MarginaliaPages.sol` | `f3af7e121c86059ba1a7a7aa4b9ec7bcab5dbfe3e88f7487df98a054bcc4e4e4` |

`public/abi/MarginaliaAnnex.json` and `MarginaliaPages.json` are the raw ABI arrays extracted from `forge build` outputs, not reconstructed hook-era interfaces. `src/annex-abi.ts` and `pages-abi.ts` use these arrays. The new unit check compares all typed entries to their raw exports.

Canonical Keccak-256 hashes use recursively sorted object keys, unchanged array order and compact JSON, without the `0x` prefix:

| ABI | Canonical Keccak-256 |
| --- | --- |
| MarginaliaAnnex | `d5caa09b5445973684cc46375443c967ff8baf3da70992ddbdb102327cc79c0b` |
| MarginaliaPages | `0d5e0eb325d547d7f67a13e48230649a55d2dc987292ab711de1d1d12e098a1f` |
| MarginaliaPricer | `80bc5817e270079c09ddb9fe6c6450740f0699caee7a5448c8013bf49b583ba7` |
| MarginaliaTreasury | `973fd39fd0ddd326ac97ab9fe23931e6310ec428338118ec524bb2d117e3411a` |

Pricer and Treasury ABIs were exported from the existing deployed project's implementation sources. Their addresses are read from the live hook, never invented or configured as companion addresses. Existing token/hook/router/judge ABI arrays are retained.

The Annex is explicitly bound in `deployment/integrations.json` to `0xd0c0d97aebe9194606bcc46ce56524eee4615543`, deployment block 26178192. Its original `AGENTS.md` Annex section and `ADAPTATION.md` audit history informed the integration. Venue acceptance always uses `validateVenue`; in particular, dynamic fee pools require the Marginalia hook or an admitted hook, even when ordinary swap permission bits are clear.

Pages remains unaddressed. Its v0.10 constructor has hook, Annex, intake, action and signer; runtime binding is checked against the hook/Annex after an authorized deployment is supplied. Registration, eligibility, exact claimMessage, claims, recycle and pendingBurn flows are built against this exact ABI. The whitelist gate is owned by the Pages implementation; the frontend reads `eligible(wallet)` and does not maintain a duplicate whitelist.

All source license headers are preserved. The frontend's concentrated-liquidity quote uses the project's MIT-licensed Uniswap TickMath algorithm and bigint swap arithmetic. No external quote service or additional application package was introduced.
