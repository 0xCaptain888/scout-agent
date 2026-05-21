import { type Log } from "viem";
import { insertBet } from "../db/client.js";

/**
 * BetPlaced(bytes32 indexed txHash, uint256 indexed marketId, uint256 indexed agentId, uint8 outcome, uint256 amount)
 */
export async function handleBetPlaced(log: Log): Promise<void> {
  const args = (log as any).args;
  if (!args) {
    console.warn("[betPlaced] Skipping log with missing args:", log.transactionHash);
    return;
  }

  const txHash: string = log.transactionHash ?? args.txHash;
  const marketId = BigInt(args.marketId);
  const agentId = BigInt(args.agentId);
  const outcome: number = Number(args.outcome);
  const amount = BigInt(args.amount);

  console.log(
    `[betPlaced] Agent #${agentId} bet ${amount} on market #${marketId} outcome=${outcome}`,
  );

  await insertBet({
    txHash,
    marketId,
    agentId,
    outcome,
    amount,
    placedAt: new Date(),
  });
}
