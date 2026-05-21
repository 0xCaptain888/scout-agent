import { z } from "zod";
import { apiGet } from "../clients.js";
import type { Market } from "../types.js";

export const getMarketSchema = z.object({
  marketId: z.string().describe("The market ID to look up"),
});

export const getMarketDef = {
  name: "xlayer_get_market",
  description:
    "Get detailed information about a single ScoutAgent prediction market on X Layer, including odds and pool size.",
  inputSchema: {
    type: "object" as const,
    properties: {
      marketId: {
        type: "string",
        description: "The market ID to look up",
      },
    },
    required: ["marketId"],
  },
};

export async function handleGetMarket(params: Record<string, unknown>) {
  const { marketId } = getMarketSchema.parse(params);
  const res = await apiGet<Market>(`/api/markets/${marketId}`);

  if (!res.ok) {
    return {
      content: [{ type: "text" as const, text: `API error ${res.status}: ${JSON.stringify(res.data)}` }],
      isError: true,
    };
  }

  const m = res.data;
  const text = [
    `Market: ${m.id}`,
    `Match: ${m.homeTeam} vs ${m.awayTeam}`,
    `Date: ${m.matchDate}`,
    `Status: ${m.status}`,
    `Odds: Home ${m.odds.home} | Draw ${m.odds.draw} | Away ${m.odds.away}`,
    `Total Pool: ${m.totalPool}`,
    m.resolvedOutcome ? `Resolved Outcome: ${m.resolvedOutcome}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { content: [{ type: "text" as const, text }] };
}
