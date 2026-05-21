import { type Address, type Hex, getAddress } from "viem";
import { publicClient, getOperatorClient } from "./client.js";

// ---------------------------------------------------------------------------
// PredictionMarket ABI (subset used by the runtime)
// ---------------------------------------------------------------------------
export const PREDICTION_MARKET_ABI = [
  {
    type: "function",
    name: "getMarket",
    inputs: [{ name: "marketId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct IPredictionMarket.Market",
        components: [
          { name: "matchId", type: "bytes32", internalType: "bytes32" },
          { name: "startTime", type: "uint256", internalType: "uint256" },
          { name: "status", type: "uint8", internalType: "enum IPredictionMarket.Status" },
          { name: "resolvedOutcome", type: "uint8", internalType: "enum IPredictionMarket.Outcome" },
          { name: "totalHome", type: "uint256", internalType: "uint256" },
          { name: "totalDraw", type: "uint256", internalType: "uint256" },
          { name: "totalAway", type: "uint256", internalType: "uint256" },
          { name: "totalPool", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBet",
    inputs: [
      { name: "marketId", type: "uint256", internalType: "uint256" },
      { name: "agentId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "outcome", type: "uint8", internalType: "enum IPredictionMarket.Outcome" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isClaimed",
    inputs: [
      { name: "marketId", type: "uint256", internalType: "uint256" },
      { name: "agentId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalMarkets",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "placeBet",
    inputs: [
      { name: "marketId", type: "uint256", internalType: "uint256" },
      { name: "agentId", type: "uint256", internalType: "uint256" },
      { name: "outcome", type: "uint8", internalType: "enum IPredictionMarket.Outcome" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimReward",
    inputs: [
      { name: "marketId", type: "uint256", internalType: "uint256" },
      { name: "agentId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolveMarket",
    inputs: [
      { name: "marketId", type: "uint256", internalType: "uint256" },
      { name: "outcome", type: "uint8", internalType: "enum IPredictionMarket.Outcome" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ---------------------------------------------------------------------------
// MatchOracle ABI
// ---------------------------------------------------------------------------
export const MATCH_ORACLE_ABI = [
  {
    type: "function",
    name: "resolveMatch",
    inputs: [
      { name: "matchId", type: "bytes32", internalType: "bytes32" },
      { name: "homeScore", type: "uint8", internalType: "uint8" },
      { name: "awayScore", type: "uint8", internalType: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "scoreOf",
    inputs: [{ name: "matchId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "homeScore", type: "uint8", internalType: "uint8" },
      { name: "awayScore", type: "uint8", internalType: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "marketIds",
    inputs: [{ name: "matchId", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registerMatch",
    inputs: [
      { name: "matchId", type: "bytes32", internalType: "bytes32" },
      { name: "marketId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ---------------------------------------------------------------------------
// Contract addresses
// ---------------------------------------------------------------------------
const PREDICTION_MARKET_ADDRESS: Address = "0x7058132Ba4aE19983c61590644F2943A3B7fDf80";

function getMarketAddress(): Address {
  const addr = process.env.PREDICTION_MARKET_ADDRESS || PREDICTION_MARKET_ADDRESS;
  return getAddress(addr);
}

const MATCH_ORACLE_ADDRESS: Address = "0x494960e21058290BB2F1328b6b837dCF26aA5DCb";

function getOracleAddress(): Address {
  const addr = process.env.MATCH_ORACLE_ADDRESS || MATCH_ORACLE_ADDRESS;
  return getAddress(addr);
}

// ---------------------------------------------------------------------------
// PredictionMarket read functions
// ---------------------------------------------------------------------------
export interface MarketData {
  matchId: Hex;
  startTime: bigint;
  status: number;
  resolvedOutcome: number;
  totalHome: bigint;
  totalDraw: bigint;
  totalAway: bigint;
  totalPool: bigint;
}

export async function getMarket(marketId: bigint): Promise<MarketData> {
  const result = await publicClient.readContract({
    address: getMarketAddress(),
    abi: PREDICTION_MARKET_ABI,
    functionName: "getMarket",
    args: [marketId],
  });
  return result as unknown as MarketData;
}

export async function getBetAmount(
  marketId: bigint,
  agentId: bigint
): Promise<{ outcome: number; amount: bigint }> {
  const [outcome, amount] = await publicClient.readContract({
    address: getMarketAddress(),
    abi: PREDICTION_MARKET_ABI,
    functionName: "getBet",
    args: [marketId, agentId],
  });
  return { outcome, amount };
}

export async function marketCount(): Promise<bigint> {
  return publicClient.readContract({
    address: getMarketAddress(),
    abi: PREDICTION_MARKET_ABI,
    functionName: "totalMarkets",
  });
}

// ---------------------------------------------------------------------------
// PredictionMarket write functions
// ---------------------------------------------------------------------------
export async function placeBet(
  marketId: bigint,
  agentId: bigint,
  outcome: number,
  amount: bigint
): Promise<Hex> {
  const client = getOperatorClient();
  return client.writeContract({
    address: getMarketAddress(),
    abi: PREDICTION_MARKET_ABI,
    functionName: "placeBet",
    args: [marketId, agentId, outcome, amount],
  });
}

export async function claimReward(marketId: bigint, agentId: bigint): Promise<Hex> {
  const client = getOperatorClient();
  return client.writeContract({
    address: getMarketAddress(),
    abi: PREDICTION_MARKET_ABI,
    functionName: "claimReward",
    args: [marketId, agentId],
  });
}

// ---------------------------------------------------------------------------
// MatchOracle write functions
// ---------------------------------------------------------------------------
export async function resolveMatch(
  matchId: Hex,
  homeScore: number,
  awayScore: number
): Promise<Hex> {
  const client = getOperatorClient();
  return client.writeContract({
    address: getOracleAddress(),
    abi: MATCH_ORACLE_ABI,
    functionName: "resolveMatch",
    args: [matchId, homeScore, awayScore],
  });
}
