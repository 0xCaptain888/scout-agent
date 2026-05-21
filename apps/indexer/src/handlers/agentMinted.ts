import { type Log } from "viem";
import { insertAgent } from "../db/client.js";

/**
 * AgentMinted(uint256 indexed agentId, address indexed owner, address wallet, uint256 gene)
 */
export async function handleAgentMinted(log: Log): Promise<void> {
  const args = (log as any).args;
  if (!args) {
    console.warn("[agentMinted] Skipping log with missing args:", log.transactionHash);
    return;
  }

  const agentId = BigInt(args.agentId);
  const owner: string = args.owner;
  const wallet: string = args.wallet;
  const gene = BigInt(args.gene);

  console.log(`[agentMinted] Agent #${agentId} minted by ${owner}`);

  await insertAgent({
    id: agentId,
    owner,
    wallet,
    gene,
    mintedAt: new Date(),
    bankroll: 0n,
  });
}
