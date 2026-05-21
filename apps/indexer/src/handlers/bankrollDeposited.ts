import { type Log } from "viem";
import { updateAgentBankroll } from "../db/client.js";

/**
 * BankrollDeposited(uint256 indexed tokenId, uint256 amount)
 *
 * Emitted by AgentRegistry when a user deposits USDT into an agent's bankroll.
 * Updates the agents table bankroll balance (increment).
 */
export async function handleBankrollDeposited(log: Log): Promise<void> {
  const args = (log as any).args;
  if (!args) {
    console.warn("[bankrollDeposited] Skipping log with missing args:", log.transactionHash);
    return;
  }

  const tokenId = BigInt(args.tokenId);
  const amount = BigInt(args.amount);

  console.log(`[bankrollDeposited] Agent #${tokenId} deposited ${amount}`);

  await updateAgentBankroll(tokenId, amount, "deposit");
}
