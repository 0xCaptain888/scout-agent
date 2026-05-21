import { type Chain } from "viem";

// ─── X Layer Chain Definitions ───────────────────────────────────────────────

export const xLayerMainnet = {
  id: 196,
  name: "X Layer Mainnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: { name: "OKLink", url: "https://www.oklink.com/xlayer" },
  },
} as const satisfies Chain;

export const xLayerTestnet = {
  id: 195,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testrpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: { name: "OKLink", url: "https://www.oklink.com/xlayer-test" },
  },
  testnet: true,
} as const satisfies Chain;

// ─── RPC URLs ────────────────────────────────────────────────────────────────

export const RPC_URLS = {
  [xLayerMainnet.id]: "https://rpc.xlayer.tech",
  [xLayerTestnet.id]: "https://testrpc.xlayer.tech",
} as const;

// ─── Block Explorer URLs ─────────────────────────────────────────────────────

export const BLOCK_EXPLORER_URLS = {
  [xLayerMainnet.id]: "https://www.oklink.com/xlayer",
  [xLayerTestnet.id]: "https://www.oklink.com/xlayer-test",
} as const;

// ─── Contract Addresses (filled after deployment) ────────────────────────────

export const CONTRACT_ADDRESSES = {
  [xLayerMainnet.id]: {
    mockUSDT: "0x0b489F9988C52F72BdEC5F8d55b1fD390B8Cd41D" as `0x${string}`,
    agentRegistry: "0x6F4DF8979a8f18Ce3fD2ff941e5a3610E5cAfCa5" as `0x${string}`,
    rankingBoard: "0x1EBD6D3e5cA2fBF234Dfd3073E8B682d487E6ff1" as `0x${string}`,
    predictionMarket: "0x7058132Ba4aE19983c61590644F2943A3B7fDf80" as `0x${string}`,
    matchOracle: "0x494960e21058290BB2F1328b6b837dCF26aA5DCb" as `0x${string}`,
  },
  [xLayerTestnet.id]: {
    mockUSDT: "0x0b489F9988C52F72BdEC5F8d55b1fD390B8Cd41D" as `0x${string}`,
    agentRegistry: "0x6F4DF8979a8f18Ce3fD2ff941e5a3610E5cAfCa5" as `0x${string}`,
    rankingBoard: "0x1EBD6D3e5cA2fBF234Dfd3073E8B682d487E6ff1" as `0x${string}`,
    predictionMarket: "0x7058132Ba4aE19983c61590644F2943A3B7fDf80" as `0x${string}`,
    matchOracle: "0x494960e21058290BB2F1328b6b837dCF26aA5DCb" as `0x${string}`,
  },
} as const;

// ─── Protocol Constants ──────────────────────────────────────────────────────

/** Protocol fee in basis points (2% = 200 bps) */
export const PROTOCOL_FEE_BPS = 200;

/** Protocol fee as a percentage */
export const PROTOCOL_FEE_PCT = 2;

// ─── Strategy Metadata ──────────────────────────────────────────────────────

export const STYLE_NAMES: readonly string[] = [
  "Attacking",
  "Defensive",
  "Data-Driven",
  "Contrarian",
  "Momentum",
] as const;

export const RISK_LEVEL_LABELS: readonly string[] = [
  "", // 0 is unused
  "Very Low",
  "Low",
  "Medium",
  "High",
  "Very High",
] as const;
