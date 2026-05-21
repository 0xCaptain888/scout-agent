import { type Log } from "viem";
import { updateAgentBankroll } from "../db/client.js";

/**
 * BankrollWithdrawn(uint256 indexed tokenId, uint256 amount)
 *
 * Emitted by AgentRegistry when a user withdraws USDT from an agent's bankroll.
 * Updates the agents table bankroll balance (decrement).
 */
export async function handleBankrollWithdrawn(log: Log): Promise<void> {
  const args = (log as any).args;
  if (!args) {
    console.warn("[bankrollWithdrawn] Skipping log with missing args:", log.transactionHash);
    return;
  }

  const tokenId = BigInt(args.tokenId);
  const amount = BigInt(args.amount);

  console.log(`[bankrollWithdrawn] Agent #${tokenId} withdrew ${amount}`);

  await updateAgentBankroll(tokenId, amount, "withdraw");
}
