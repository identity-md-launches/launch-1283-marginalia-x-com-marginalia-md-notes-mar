# LARP read-only identity binding

Site v5 pins [identity-md-launches/launch-1436-placelarp-placelinks](https://github.com/identity-md-launches/launch-1436-placelarp-placelinks/tree/0ef5649c67e948c75bf432d619dbf0613648cb8d), source commit `0ef5649c67e948c75bf432d619dbf0613648cb8d`. The three addresses are those explicitly authorized by the v5 brief. No contract was deployed or changed.

The pinned tree was downloaded outside this repository and compiled with cached Solidity 0.8.26 using `forge build --offline --skip test --skip script`. The raw compiler `abi` arrays were copied to `web/public/abi/`. Canonical Keccak means JSON object keys sorted recursively, array order preserved, no insignificant whitespace, UTF-8 bytes. `web/scripts/manifest.mjs` independently recomputes these hashes on each build; the browser checks the exported arrays on boot.

| Contract | Ethereum address | Canonical ABI Keccak-256 |
| --- | --- | --- |
| LARP | `0x69000A4A9FA561Dd6b313741bf1F79F4aDE4adAF` | `8d4a29122cc5a3f23d47df9fb3bd854546ff88320617fad37a11bd9a9a48f827` |
| IMDNames | `0x690084D1331F7a6509EeD32e7d34ffAcB377d807` | `084bfb95693364a98f439bcd285a32c4b23bbeb4fb2e6e58f2eedff2f2012af3` |
| LARPLinks | `0x69005EdeC64B8586EC8d5E32f757a818b5d493C0` | `bd66b81cc3ec153f2b119b09cadf06e53fba32c31e6ebcbf80101b7ab675544a` |

Build inputs are in `web/deployment/integrations.json`; the only runtime address/ABI binding is `dist/imd-deployment.json`. LARP does not create a new top-level manifest field. Existing launch identifiers, deployed contracts, pool key, network and wallet-add-chain values remain unchanged.

`larp-protocol` 0.1.0's published `whois(wallet)` implementation was read as field documentation: primary name, avatar and imdId. It is not imported or executed by the site. `identity-read.ts` uses only view calls derived from the pinned source: Names `primaryOf(wallet)` returns `(imdId, full, live)`; LARP `faceURI(imdId)` resolves face token metadata or the identity's existing metadata fallback. The site does not invent an SDK fallback image or infer identity from cited handles. A missing/non-live primary name always produces the short address and deterministic generated mark.

At a single boot block the site requires nonempty code for all three addresses, a shared nonzero `IDENTITY()`, `IMDNames.LARP()` and `LARPLinks.LARP()/NAMES()` matching the manifest. Failed identity verification falls back to marks while existing Marginalia contract safety gates remain intact. A read-only worker check at Ethereum block **26185508** found 6,833 / 21,095 / 9,856 code bytes and the expected bindings, using the configured public source `https://ethereum-rpc.publicnode.com`. Evidence: `web/validation/v5/identity-live.json`. This is not a runtime-bytecode equivalence audit or a funded interaction test.

Name/avatar reads use a fixed block, are cached briefly, and accept no wallet client. Metadata is parsed as JSON, bounded to 512 KiB and a five-second fetch timeout. Image URLs allow http(s), IPFS resolved through the centralized gateway, and data images; reject credentials, controls, JavaScript, HTML data URLs, file/blob/protocol-relative URLs and parent traversal in IPFS paths. Images have alt text, lazy loading, no referrer, and a generated fallback on error. SVG data is rendered only through `<img>`; never through HTML injection, an object, iframe or script. Metadata is untrusted data and cannot invoke an approval, transfer, wallet signature or external script. Remote image availability and metadata-server CORS remain outside the site's control.
