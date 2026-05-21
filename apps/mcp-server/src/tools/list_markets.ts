import { z } from "zod";
import { apiGet } from "../clients.js";
import type { Market } from "../types.js";

export const listMarketsSchema = z.object({
  status: z
    .enum(["OPEN", "LOCKED", "RESOLVED"])
    .optional()
    .describe("Filter by market status"),
  matchDateFrom: z
    .string()
    .optional()
    .describe("Filter matches from this date (ISO 8601)"),
  matchDateTo: z
    .string()
    .optional()
    .describe("Filter matches up to this date (ISO 8601)"),
});

export const listMarketsDef = {
  name: "xlayer_list_markets",
  description:
    "List all ScoutAgent prediction markets on X Layer. Optionally filter by status or match date range.",
  inputSchema: {
    type: "object" as const,
    properties: {
      status: {
        type: "string",
        enum: ["OPEN", "LOCKED", "RESOLVED"],
        description: "Filter by market status",
      },
      matchDateFrom: {
        type: "string",
        description: "Filter matches from this date (ISO 8601)",
      },
      matchDateTo: {
        type: "string",
        description: "Filter matches up to this date (ISO 8601)",
      },
    },
  },
};

export async function handleListMarkets(params: Record<string, unknown>) {
  const parsed = listMarketsSchema.parse(params);
  const res = await apiGet<Market[]>("/api/markets", {
    status: parsed.status,
    matchDateFrom: parsed.matchDateFrom,
    matchDateTo: parsed.matchDateTo,
  });

  if (!res.ok) {
    return {
      content: [{ type: "text" as const, text: `API error ${res.status}: ${JSON.stringify(res.data)}` }],
      isError: true,
    };
  }

  const markets = res.data;
  const summary = markets.map(
    (m) =>
      `[${m.id}] ${m.homeTeam} vs ${m.awayTeam} | ${m.matchDate} | ${m.status} | Pool: ${m.totalPool}`,
  );

  return {
    content: [
      {
        type: "text" as const,
        text:
          markets.length === 0
            ? "No markets found matching the criteria."
            : `Found ${markets.length} market(s):\n\n${summary.join("\n")}`,
      },
    ],
  };
}
