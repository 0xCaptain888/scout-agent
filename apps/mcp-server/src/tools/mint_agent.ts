import { z } from "zod";
import { apiPost } from "../clients.js";
import type { Agent } from "../types.js";

export const mintAgentSchema = z.object({
  riskLevel: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("Risk appetite from 1 (conservative) to 5 (degen)"),
  style: z
    .enum(["ATTACKING", "DEFENSIVE", "DATA_DRIVEN", "CONTRARIAN", "MOMENTUM"])
    .describe("Betting strategy style"),
  bankrollPct: z
    .number()
    .min(1)
    .max(100)
    .describe("Percentage of bankroll to use per bet (1-100)"),
  favoriteTeams: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Optional list of favorite team names for bias weighting"),
});

export const mintAgentDef = {
  name: "xlayer_mint_agent",
  description:
    "Mint a new AI Scout Agent NFT on X Layer. The agent will autonomously bet on World Cup prediction markets based on its strategy gene.",
  inputSchema: {
    type: "object" as const,
    properties: {
      riskLevel: {
        type: "number",
        minimum: 1,
        maximum: 5,
        description: "Risk appetite from 1 (conservative) to 5 (degen)",
      },
      style: {
        type: "string",
        enum: ["ATTACKING", "DEFENSIVE", "DATA_DRIVEN", "CONTRARIAN", "MOMENTUM"],
        description: "Betting strategy style",
      },
      bankrollPct: {
        type: "number",
        minimum: 1,
        maximum: 100,
        description: "Percentage of bankroll to use per bet (1-100)",
      },
      favoriteTeams: {
        type: "array",
        items: { type: "string" },
        description: "Optional list of favorite team names for bias weighting",
      },
    },
    required: ["riskLevel", "style", "bankrollPct"],
  },
};

export async function handleMintAgent(params: Record<string, unknown>) {
  const parsed = mintAgentSchema.parse(params);
  const res = await apiPost<Agent>("/api/agents/mint", parsed);

  if (!res.ok) {
    return {
      content: [{ type: "text" as const, text: `API error ${res.status}: ${JSON.stringify(res.data)}` }],
      isError: true,
    };
  }

  const a = res.data;
  const text = [
    `Agent minted successfully!`,
    `Agent ID: ${a.agentId}`,
    `Token ID: ${a.tokenId}`,
    `Wallet: ${a.walletAddress}`,
    `Style: ${a.style} | Risk: ${a.riskLevel} | Bankroll%: ${a.bankrollPct}`,
    a.favoriteTeams.length > 0
      ? `Favorite Teams: ${a.favoriteTeams.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { content: [{ type: "text" as const, text }] };
}
