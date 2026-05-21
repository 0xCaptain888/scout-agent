import { type Address, getAddress } from "viem";
import { publicClient } from "./client.js";

// ---------------------------------------------------------------------------
// RankingBoard ABI (subset used by the runtime)
// ---------------------------------------------------------------------------
export const RANKING_BOARD_ABI = [
  {
    type: "function",
    name: "getStats",
    inputs: [{ name: "agentId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "wins", type: "uint256", internalType: "uint256" },
      { name: "losses", type: "uint256", internalType: "uint256" },
      { name: "totalPnl", type: "int256", internalType: "int256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "top",
    inputs: [{ name: "n", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "agentIds", type: "uint256[]", internalType: "uint256[]" },
      { name: "pnls", type: "int256[]", internalType: "int256[]" },
    ],
    stateMutability: "view",
  },
] as const;

// ---------------------------------------------------------------------------
// Contract address
// ---------------------------------------------------------------------------
const RANKING_BOARD_ADDRESS: Address = "0x1EBD6D3e5cA2fBF234Dfd3073E8B682d487E6ff1";

function getRankingAddress(): Address {
  const addr = process.env.RANKING_BOARD_ADDRESS || RANKING_BOARD_ADDRESS;
  return getAddress(addr);
}

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------
export async function getAgentStats(
  agentId: bigint,
): Promise<{ wins: bigint; losses: bigint; totalPnl: bigint }> {
  const [wins, losses, totalPnl] = await publicClient.readContract({
    address: getRankingAddress(),
    abi: RANKING_BOARD_ABI,
    functionName: "getStats",
    args: [agentId],
  });
  return { wins, losses, totalPnl };
}

export async function getLeaderboard(
  n: bigint,
): Promise<{ agentIds: readonly bigint[]; pnls: readonly bigint[] }> {
  const [agentIds, pnls] = await publicClient.readContract({
    address: getRankingAddress(),
    abi: RANKING_BOARD_ABI,
    functionName: "top",
    args: [n],
  });
  return { agentIds, pnls };
}
