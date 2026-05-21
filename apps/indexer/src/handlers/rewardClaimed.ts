import { type Log } from "viem";
import { insertRewardClaim } from "../db/client.js";

/**
 * RewardClaimed(uint256 indexed marketId, uint256 indexed agentId, uint256 reward)
 *
 * Emitted by PredictionMarket when an agent claims their reward after market resolution.
 * Records the claim in the reward_claims table.
 */
export async function handleRewardClaimed(log: Log): Promise<void> {
  const args = (log as any).args;
  if (!args) {
    console.warn("[rewardClaimed] Skipping log with missing args:", log.transactionHash);
    return;
  }

  const marketId = BigInt(args.marketId);
  const agentId = BigInt(args.agentId);
  const reward = BigInt(args.reward);

  console.log(
    `[rewardClaimed] Agent #${agentId} claimed ${reward} from market #${marketId}`,
  );

  await insertRewardClaim({
    marketId,
    agentId,
    reward,
    claimedAt: new Date(),
    txHash: log.transactionHash ?? "0x",
  });
}
