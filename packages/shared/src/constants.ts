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
    agentNFT: "" as `0x${string}`,
    bettingMarket: "" as `0x${string}`,
    treasury: "" as `0x${string}`,
  },
  [xLayerTestnet.id]: {
    agentNFT: "" as `0x${string}`,
    bettingMarket: "" as `0x${string}`,
    treasury: "" as `0x${string}`,
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
