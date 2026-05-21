import { type Log } from "viem";
import { updateMarket } from "../db/client.js";

/**
 * MarketResolved(uint256 indexed marketId, uint8 winningOutcome)
 */
export async function handleMarketResolved(log: Log): Promise<void> {
  const args = (log as any).args;
  if (!args) {
    console.warn("[marketResolved] Skipping log with missing args:", log.transactionHash);
    return;
  }

  const marketId = BigInt(args.marketId);
  const winningOutcome: number = Number(args.winningOutcome);

  console.log(`[marketResolved] Market #${marketId} resolved with outcome=${winningOutcome}`);

  await updateMarket({
    id: marketId,
    status: 2, // 0=open, 1=locked, 2=resolved
    winningOutcome,
  });
}
