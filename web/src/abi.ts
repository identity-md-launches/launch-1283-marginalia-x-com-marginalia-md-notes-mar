// GENERATED from forge output (out/*.json) by test/scratch/genabi.mjs — do not edit by hand.
// Subsets of the full ABIs shipped in public/abi/*.json; a check compares each entry against the full file.

export const MarginaliaHookAbi = [
 {
  "type": "function",
  "name": "BOND_MAX",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "BOND_MIN",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "JUDGE_THRESHOLD",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "KEEPER_BPS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MARG_BUY",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MAX_HORIZON_DAYS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint16",
    "internalType": "uint16"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MIN_TARGET_DELTA_BPS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "SEAL_MAX",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "SEAL_MIN",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "SETTLE_WINDOW",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "STAMP",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "SWEEP_AFTER",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "TEXT_MAX",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "THESIS_GRACE",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "THESIS_TEXT_MAX",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "claimDeposit",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "claimRefund",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "getPoolKey",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "tuple",
    "internalType": "struct PoolKey",
    "components": [
     {
      "name": "currency0",
      "type": "address",
      "internalType": "Currency"
     },
     {
      "name": "currency1",
      "type": "address",
      "internalType": "Currency"
     },
     {
      "name": "fee",
      "type": "uint24",
      "internalType": "uint24"
     },
     {
      "name": "tickSpacing",
      "type": "int24",
      "internalType": "int24"
     },
     {
      "name": "hooks",
      "type": "address",
      "internalType": "contract IHooks"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "horizonEnd",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "imd",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "judge",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract MarginaliaJudge"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "judgedPaid",
  "inputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "margPriceInImd",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "noteCount",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "noteMeta",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "author",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "w",
    "type": "uint32",
    "internalType": "uint32"
   },
   {
    "name": "thesis",
    "type": "bool",
    "internalType": "bool"
   },
   {
    "name": "hasChild",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "noteOf",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "v",
    "type": "tuple",
    "internalType": "struct MarginaliaTypes.NoteView",
    "components": [
     {
      "name": "author",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "x",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "side",
      "type": "uint8",
      "internalType": "enum MarginaliaTypes.Side"
     },
     {
      "name": "targetBps",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "horizonDays",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "class",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "status",
      "type": "uint8",
      "internalType": "enum MarginaliaTypes.Status"
     },
     {
      "name": "postPrice",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "postBalance",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "deposit",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "parentId",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "children",
      "type": "uint32",
      "internalType": "uint32"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "notesPerDay",
  "inputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "observe",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "poolId",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "PoolId"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "records",
  "inputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "score",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "posted",
    "type": "uint32",
    "internalType": "uint32"
   },
   {
    "name": "right",
    "type": "uint32",
    "internalType": "uint32"
   },
   {
    "name": "wrong",
    "type": "uint32",
    "internalType": "uint32"
   },
   {
    "name": "broken",
    "type": "uint32",
    "internalType": "uint32"
   },
   {
    "name": "retracted",
    "type": "uint32",
    "internalType": "uint32"
   },
   {
    "name": "judgedWins",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "refundClaimed",
  "inputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "refundPool",
  "inputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "retract",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "text",
    "type": "string",
    "internalType": "string"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "router",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract MarginaliaRouter"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "seal",
  "inputs": [
   {
    "name": "x",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "venue",
    "type": "tuple",
    "internalType": "struct MarginaliaTypes.Venue",
    "components": [
     {
      "name": "kind",
      "type": "uint8",
      "internalType": "enum MarginaliaTypes.VenueKind"
     },
     {
      "name": "ref",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "quote",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "xIsToken0",
      "type": "bool",
      "internalType": "bool"
     }
    ]
   },
   {
    "name": "hash",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "sealHash",
  "inputs": [
   {
    "name": "author",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "p",
    "type": "tuple",
    "internalType": "struct MarginaliaTypes.NoteParams",
    "components": [
     {
      "name": "x",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "venue",
      "type": "tuple",
      "internalType": "struct MarginaliaTypes.Venue",
      "components": [
       {
        "name": "kind",
        "type": "uint8",
        "internalType": "enum MarginaliaTypes.VenueKind"
       },
       {
        "name": "ref",
        "type": "bytes32",
        "internalType": "bytes32"
       },
       {
        "name": "quote",
        "type": "address",
        "internalType": "address"
       },
       {
        "name": "xIsToken0",
        "type": "bool",
        "internalType": "bool"
       }
      ]
     },
     {
      "name": "side",
      "type": "uint8",
      "internalType": "enum MarginaliaTypes.Side"
     },
     {
      "name": "targetBps",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "horizonDays",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "parentId",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "class",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "text",
      "type": "string",
      "internalType": "string"
     }
    ]
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "function",
  "name": "sealKey",
  "inputs": [
   {
    "name": "sealer",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "hash",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "function",
  "name": "seals",
  "inputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "at",
    "type": "uint64",
    "internalType": "uint64"
   },
   {
    "name": "baseBuy",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "baseSell",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "balance",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "subject",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "settle",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "settleThesis",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "sweep",
  "inputs": [
   {
    "name": "kind",
    "type": "uint8",
    "internalType": "uint8"
   },
   {
    "name": "epoch",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "thesesOfWeek",
  "inputs": [
   {
    "name": "w",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bytes32[]",
    "internalType": "bytes32[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "thesisPool",
  "inputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "today",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "token",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "treasury",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract MarginaliaTreasury"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "week",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "event",
  "name": "Accrued",
  "inputs": [
   {
    "name": "day",
    "type": "uint32",
    "indexed": true,
    "internalType": "uint32"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "DepositClaimed",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "to",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "JudgedPaid",
  "inputs": [
   {
    "name": "day",
    "type": "uint32",
    "indexed": true,
    "internalType": "uint32"
   },
   {
    "name": "amounts",
    "type": "uint256[3]",
    "indexed": false,
    "internalType": "uint256[3]"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "NotePosted",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "author",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "x",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "class",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   },
   {
    "name": "side",
    "type": "uint8",
    "indexed": false,
    "internalType": "enum MarginaliaTypes.Side"
   },
   {
    "name": "targetBps",
    "type": "uint32",
    "indexed": false,
    "internalType": "uint32"
   },
   {
    "name": "horizonDays",
    "type": "uint16",
    "indexed": false,
    "internalType": "uint16"
   },
   {
    "name": "parentId",
    "type": "bytes32",
    "indexed": false,
    "internalType": "bytes32"
   },
   {
    "name": "text",
    "type": "string",
    "indexed": false,
    "internalType": "string"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Observed",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "xRead",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "balance",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "RefundClaimed",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "wallet",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Retracted",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "text",
    "type": "string",
    "indexed": false,
    "internalType": "string"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Revealed",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "hash",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Sealed",
  "inputs": [
   {
    "name": "hash",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "author",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "x",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "venueRef",
    "type": "bytes32",
    "indexed": false,
    "internalType": "bytes32"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Settled",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "status",
    "type": "uint8",
    "indexed": false,
    "internalType": "enum MarginaliaTypes.Status"
   },
   {
    "name": "settlePrice",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "scoreDelta",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "keeper",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Swept",
  "inputs": [
   {
    "name": "kind",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   },
   {
    "name": "epoch",
    "type": "uint32",
    "indexed": true,
    "internalType": "uint32"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "ThesisForfeited",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "ThesisReleased",
  "inputs": [
   {
    "name": "id",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   }
  ],
  "anonymous": false
 }
] as const;

export const MarginaliaRouterAbi = [
 {
  "type": "function",
  "name": "UNIV2_FACTORY",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "UNIV3_FACTORY",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "WETH",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "checkpointVenue",
  "inputs": [
   {
    "name": "p",
    "type": "tuple",
    "internalType": "struct MarginaliaTypes.NoteParams",
    "components": [
     {
      "name": "x",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "venue",
      "type": "tuple",
      "internalType": "struct MarginaliaTypes.Venue",
      "components": [
       {
        "name": "kind",
        "type": "uint8",
        "internalType": "enum MarginaliaTypes.VenueKind"
       },
       {
        "name": "ref",
        "type": "bytes32",
        "internalType": "bytes32"
       },
       {
        "name": "quote",
        "type": "address",
        "internalType": "address"
       },
       {
        "name": "xIsToken0",
        "type": "bool",
        "internalType": "bool"
       }
      ]
     },
     {
      "name": "side",
      "type": "uint8",
      "internalType": "enum MarginaliaTypes.Side"
     },
     {
      "name": "targetBps",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "horizonDays",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "parentId",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "class",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "text",
      "type": "string",
      "internalType": "string"
     }
    ]
   },
   {
    "name": "v4Key",
    "type": "tuple",
    "internalType": "struct PoolKey",
    "components": [
     {
      "name": "currency0",
      "type": "address",
      "internalType": "Currency"
     },
     {
      "name": "currency1",
      "type": "address",
      "internalType": "Currency"
     },
     {
      "name": "fee",
      "type": "uint24",
      "internalType": "uint24"
     },
     {
      "name": "tickSpacing",
      "type": "int24",
      "internalType": "int24"
     },
     {
      "name": "hooks",
      "type": "address",
      "internalType": "contract IHooks"
     }
    ]
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "hook",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IMarginaliaHook"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "note",
  "inputs": [
   {
    "name": "p",
    "type": "tuple",
    "internalType": "struct MarginaliaTypes.NoteParams",
    "components": [
     {
      "name": "x",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "venue",
      "type": "tuple",
      "internalType": "struct MarginaliaTypes.Venue",
      "components": [
       {
        "name": "kind",
        "type": "uint8",
        "internalType": "enum MarginaliaTypes.VenueKind"
       },
       {
        "name": "ref",
        "type": "bytes32",
        "internalType": "bytes32"
       },
       {
        "name": "quote",
        "type": "address",
        "internalType": "address"
       },
       {
        "name": "xIsToken0",
        "type": "bool",
        "internalType": "bool"
       }
      ]
     },
     {
      "name": "side",
      "type": "uint8",
      "internalType": "enum MarginaliaTypes.Side"
     },
     {
      "name": "targetBps",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "horizonDays",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "parentId",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "class",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "text",
      "type": "string",
      "internalType": "string"
     }
    ]
   },
   {
    "name": "v4Key",
    "type": "tuple",
    "internalType": "struct PoolKey",
    "components": [
     {
      "name": "currency0",
      "type": "address",
      "internalType": "Currency"
     },
     {
      "name": "currency1",
      "type": "address",
      "internalType": "Currency"
     },
     {
      "name": "fee",
      "type": "uint24",
      "internalType": "uint24"
     },
     {
      "name": "tickSpacing",
      "type": "int24",
      "internalType": "int24"
     },
     {
      "name": "hooks",
      "type": "address",
      "internalType": "contract IHooks"
     }
    ]
   },
   {
    "name": "imdIn",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "minMargOut",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "deadline",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "postPrice",
  "inputs": [
   {
    "name": "v",
    "type": "tuple",
    "internalType": "struct MarginaliaTypes.Venue",
    "components": [
     {
      "name": "kind",
      "type": "uint8",
      "internalType": "enum MarginaliaTypes.VenueKind"
     },
     {
      "name": "ref",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "quote",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "xIsToken0",
      "type": "bool",
      "internalType": "bool"
     }
    ]
   },
   {
    "name": "buy",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "priceWindows",
  "inputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "startedAt",
    "type": "uint64",
    "internalType": "uint64"
   },
   {
    "name": "blockNumber",
    "type": "uint64",
    "internalType": "uint64"
   },
   {
    "name": "xStart",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "xMin",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "xMax",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "quoteMin",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "quoteMax",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "validateVenue",
  "inputs": [
   {
    "name": "p",
    "type": "tuple",
    "internalType": "struct MarginaliaTypes.NoteParams",
    "components": [
     {
      "name": "x",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "venue",
      "type": "tuple",
      "internalType": "struct MarginaliaTypes.Venue",
      "components": [
       {
        "name": "kind",
        "type": "uint8",
        "internalType": "enum MarginaliaTypes.VenueKind"
       },
       {
        "name": "ref",
        "type": "bytes32",
        "internalType": "bytes32"
       },
       {
        "name": "quote",
        "type": "address",
        "internalType": "address"
       },
       {
        "name": "xIsToken0",
        "type": "bool",
        "internalType": "bool"
       }
      ]
     },
     {
      "name": "side",
      "type": "uint8",
      "internalType": "enum MarginaliaTypes.Side"
     },
     {
      "name": "targetBps",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "horizonDays",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "parentId",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "class",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "text",
      "type": "string",
      "internalType": "string"
     }
    ]
   },
   {
    "name": "key",
    "type": "tuple",
    "internalType": "struct PoolKey",
    "components": [
     {
      "name": "currency0",
      "type": "address",
      "internalType": "Currency"
     },
     {
      "name": "currency1",
      "type": "address",
      "internalType": "Currency"
     },
     {
      "name": "fee",
      "type": "uint24",
      "internalType": "uint24"
     },
     {
      "name": "tickSpacing",
      "type": "int24",
      "internalType": "int24"
     },
     {
      "name": "hooks",
      "type": "address",
      "internalType": "contract IHooks"
     }
    ]
   }
  ],
  "outputs": [
   {
    "name": "v",
    "type": "tuple",
    "internalType": "struct MarginaliaTypes.Venue",
    "components": [
     {
      "name": "kind",
      "type": "uint8",
      "internalType": "enum MarginaliaTypes.VenueKind"
     },
     {
      "name": "ref",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "quote",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "xIsToken0",
      "type": "bool",
      "internalType": "bool"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "event",
  "name": "Noted",
  "inputs": [
   {
    "name": "author",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "sellMarg",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   },
   {
    "name": "spent",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "received",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "VenueCheckpointed",
  "inputs": [
   {
    "name": "venue",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "startedAt",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   }
  ],
  "anonymous": false
 }
] as const;

export const MarginaliaJudgeAbi = [
 {
  "type": "function",
  "name": "MAX_PRICE",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "PANEL_SIZE",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint16",
    "internalType": "uint16"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "QUORUM",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint16",
    "internalType": "uint16"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "eligibleTheses",
  "inputs": [
   {
    "name": "week",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "out",
    "type": "bytes32[]",
    "internalType": "bytes32[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "judgedOf",
  "inputs": [
   {
    "name": "day",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "top",
    "type": "bytes32[3]",
    "internalType": "bytes32[3]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "judgedSet",
  "inputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "requestOf",
  "inputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "weekClosed",
  "inputs": [
   {
    "name": "week",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 }
] as const;

export const MarginaliaAbi = [
 {
  "type": "function",
  "name": "allowance",
  "inputs": [
   {
    "name": "owner",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "spender",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "approve",
  "inputs": [
   {
    "name": "spender",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "value",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "balanceOf",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "decimals",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint8",
    "internalType": "uint8"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "name",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "string",
    "internalType": "string"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "symbol",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "string",
    "internalType": "string"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "totalSupply",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 }
] as const;

export const erc20Abi = [
 { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
 { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
 { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
 { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
 { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
 { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 's', type: 'address' }, { name: 'v', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const;
export const univ3FactoryAbi = [
 { type: 'function', name: 'getPool', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }, { name: 'b', type: 'address' }, { name: 'fee', type: 'uint24' }], outputs: [{ name: '', type: 'address' }] },
] as const;
export const univ2FactoryAbi = [
 { type: 'function', name: 'getPair', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }, { name: 'b', type: 'address' }], outputs: [{ name: '', type: 'address' }] },
] as const;
export const univ3PoolAbi = [
 { type: 'function', name: 'liquidity', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint128' }] },
 { type: 'function', name: 'token0', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
 { type: 'function', name: 'token1', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
 { type: 'function', name: 'fee', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint24' }] },
] as const;
export const univ2PairAbi = [
 { type: 'function', name: 'getReserves', stateMutability: 'view', inputs: [], outputs: [{ name: 'r0', type: 'uint112' }, { name: 'r1', type: 'uint112' }, { name: 't', type: 'uint32' }] },
 { type: 'function', name: 'token0', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
 { type: 'function', name: 'token1', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
] as const;
export const stateViewAbi = [
 { type: 'function', name: 'getLiquidity', stateMutability: 'view', inputs: [{ name: 'poolId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint128' }] },
] as const;
