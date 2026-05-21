import { type Log } from "viem";
import { insertMarket } from "../db/client.js";

/**
 * MarketCreated(uint256 indexed marketId, bytes32 indexed matchId, uint256 startTime)
 *
 * Emitted by PredictionMarket when a new betting market is created for a match.
 * Inserts a new row into the markets table with status OPEN (0).
 */
export async function handleMarketCreated(log: Log): Promise<void> {
  const args = (log as any).args;
  if (!args) {
    console.warn("[marketCreated] Skipping log with missing args:", log.transactionHash);
    return;
  }

  const marketId = BigInt(args.marketId);
  const matchId = BigInt(args.matchId);
  const startTime = Number(args.startTime);

  console.log(
    `[marketCreated] Market #${marketId} created for match ${matchId}, starts at ${new Date(startTime * 1000).toISOString()}`,
  );

  await insertMarket({
    id: marketId,
    matchId,
    startTime: new Date(startTime * 1000),
    status: 0, // OPEN
  });
}
