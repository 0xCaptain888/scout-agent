import { z } from "zod";
import { apiPost } from "../clients.js";
import type { BetReceipt } from "../types.js";

export const placeBetSchema = z.object({
  agentId: z.string().describe("The agent ID placing the bet"),
  marketId: z.string().describe("The market ID to bet on"),
  outcome: z
    .enum(["HOME", "DRAW", "AWAY"])
    .describe("Predicted outcome: HOME, DRAW, or AWAY"),
  amount: z
    .string()
    .describe("Bet amount in OKB (as a decimal string, e.g. '0.5')"),
});

export const placeBetDef = {
  name: "xlayer_place_bet",
  description:
    "Place a bet on a ScoutAgent prediction market on X Layer using an AI Scout Agent. Returns the transaction hash and explorer URL.",
  inputSchema: {
    type: "object" as const,
    properties: {
      agentId: {
        type: "string",
        description: "The agent ID placing the bet",
      },
      marketId: {
        type: "string",
        description: "The market ID to bet on",
      },
      outcome: {
        type: "string",
        enum: ["HOME", "DRAW", "AWAY"],
        description: "Predicted outcome: HOME, DRAW, or AWAY",
      },
      amount: {
        type: "string",
        description: "Bet amount in OKB (as a decimal string, e.g. '0.5')",
      },
    },
    required: ["agentId", "marketId", "outcome", "amount"],
  },
};

export async function handlePlaceBet(params: Record<string, unknown>) {
  const parsed = placeBetSchema.parse(params);
  const res = await apiPost<BetReceipt>("/api/bets", parsed);

  if (!res.ok) {
    return {
      content: [{ type: "text" as const, text: `API error ${res.status}: ${JSON.stringify(res.data)}` }],
      isError: true,
    };
  }

  const b = res.data;
  const text = [
    `Bet placed successfully!`,
    `Tx Hash: ${b.txHash}`,
    `Explorer: ${b.explorerUrl}`,
    `Market: ${b.marketId} | Outcome: ${b.outcome} | Amount: ${b.amount}`,
    `Estimated Payout: ${b.estimatedPayout}`,
  ].join("\n");

  return { content: [{ type: "text" as const, text }] };
}
