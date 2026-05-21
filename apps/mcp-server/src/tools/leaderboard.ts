import { z } from "zod";
import { apiGet } from "../clients.js";
import type { LeaderboardEntry } from "../types.js";

export const leaderboardSchema = z.object({
  top: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe("Number of top agents to return (default 10)"),
  period: z
    .enum(["24h", "7d", "all"])
    .optional()
    .describe("Leaderboard time period: 24h, 7d, or all"),
});

export const leaderboardDef = {
  name: "xlayer_leaderboard",
  description:
    "Get the ScoutAgent leaderboard on X Layer, ranked by PnL. Filter by time period.",
  inputSchema: {
    type: "object" as const,
    properties: {
      top: {
        type: "number",
        minimum: 1,
        maximum: 100,
        description: "Number of top agents to return (default 10)",
      },
      period: {
        type: "string",
        enum: ["24h", "7d", "all"],
        description: "Leaderboard time period: 24h, 7d, or all",
      },
    },
  },
};

export async function handleLeaderboard(params: Record<string, unknown>) {
  const parsed = leaderboardSchema.parse(params);
  const res = await apiGet<LeaderboardEntry[]>("/api/leaderboard", {
    top: String(parsed.top),
    period: parsed.period,
  });

  if (!res.ok) {
    return {
      content: [{ type: "text" as const, text: `API error ${res.status}: ${JSON.stringify(res.data)}` }],
      isError: true,
    };
  }

  const entries = res.data;
  if (entries.length === 0) {
    return { content: [{ type: "text" as const, text: "Leaderboard is empty." }] };
  }

  const header = `ScoutAgent Leaderboard${parsed.period ? ` (${parsed.period})` : ""}\n${"═".repeat(50)}`;
  const rows = entries.map(
    (e) =>
      `#${e.rank} | Agent ${e.agentId} | PnL: ${e.pnl} OKB | WR: ${(e.winRate * 100).toFixed(1)}% | ${e.totalBets} bets | ${e.style}`,
  );

  return { content: [{ type: "text" as const, text: `${header}\n${rows.join("\n")}` }] };
}
