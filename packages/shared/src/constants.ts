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
    mockUSDT: "0x9284B976cB15cD825b1ee771e68E8D38eF38bC8d" as `0x${string}`,
    agentRegistry: "0x634c68e2b4C6999e35c12472F977Daa1669F6607" as `0x${string}`,
    rankingBoard: "0xe76FB0c6De4C6439A6e91739f1f742f45047CEF7" as `0x${string}`,
    predictionMarket: "0xD79bf8C717bb77F7BbA5F7fBae22244976AAfbDa" as `0x${string}`,
    matchOracle: "0x40B3CC07E09BF464E4E9dfAd36FB128Ce79E939b" as `0x${string}`,
    badgeRegistry: "0x10C26877d055f522c4A99900eb0A50B0070B53F9" as `0x${string}`,
    worldCupPrizePool: "0x090e1010Ef1F8989F41A5Ae354f16266f4D29bc4" as `0x${string}`,
  },
  [xLayerTestnet.id]: {
    mockUSDT: "0x9284B976cB15cD825b1ee771e68E8D38eF38bC8d" as `0x${string}`,
    agentRegistry: "0x634c68e2b4C6999e35c12472F977Daa1669F6607" as `0x${string}`,
    rankingBoard: "0xe76FB0c6De4C6439A6e91739f1f742f45047CEF7" as `0x${string}`,
    predictionMarket: "0xD79bf8C717bb77F7BbA5F7fBae22244976AAfbDa" as `0x${string}`,
    matchOracle: "0x40B3CC07E09BF464E4E9dfAd36FB128Ce79E939b" as `0x${string}`,
    badgeRegistry: "0x10C26877d055f522c4A99900eb0A50B0070B53F9" as `0x${string}`,
    worldCupPrizePool: "0x090e1010Ef1F8989F41A5Ae354f16266f4D29bc4" as `0x${string}`,
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
