import { type Log } from "viem";
import { upsertStats } from "../db/client.js";

/**
 * StatsUpdated(uint256 indexed agentId, uint32 wins, uint32 losses, uint32 totalBets, int256 totalPnl)
 */
export async function handleRankingUpdated(log: Log): Promise<void> {
  const args = (log as any).args;
  if (!args) {
    console.warn("[rankingUpdated] Skipping log with missing args:", log.transactionHash);
    return;
  }

  const agentId = BigInt(args.agentId);
  const wins: number = Number(args.wins);
  const losses: number = Number(args.losses);
  const totalBets: number = Number(args.totalBets);
  const totalPnl = BigInt(args.totalPnl);

  console.log(
    `[rankingUpdated] Agent #${agentId} stats: W${wins}/L${losses} bets=${totalBets} pnl=${totalPnl}`,
  );

  await upsertStats({
    agentId,
    wins,
    losses,
    totalBets,
    totalPnl,
    lastActive: new Date(),
  });
}
