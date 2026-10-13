import { parseAbi } from 'viem';
export const v3StateAbi = parseAbi([
 'function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)',
 'function tickBitmap(int16) view returns (uint256)',
 'function ticks(int24) view returns (uint128 liquidityGross,int128 liquidityNet,uint256,uint256,int56,uint160,uint32,bool)',
 'function tickSpacing() view returns (int24)',
 'function liquidity() view returns (uint128)',
 'function token0() view returns (address)',
 'function token1() view returns (address)',
 'function fee() view returns (uint24)',
]);
export const v4StateAbi = parseAbi([
 'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96,int24 tick,uint24 protocolFee,uint24 lpFee)',
 'function getLiquidity(bytes32 poolId) view returns (uint128)',
 'function getTickBitmap(bytes32 poolId,int16 word) view returns (uint256)',
 'function getTickLiquidity(bytes32 poolId,int24 tick) view returns (uint128 liquidityGross,int128 liquidityNet)',
]);
export const wrapAbi = parseAbi(['function deposit() payable']);
export const intakeAbi = parseAbi(['function priceOf(bytes32 action,address token) view returns (uint256)']);
export const initEvent = parseAbi(['event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)'])[0];
