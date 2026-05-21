import { z } from "zod";
import { apiGet } from "../clients.js";
import type { AgentStats } from "../types.js";

export const getAgentStatsSchema = z.object({
  agentId: z.string().describe("The agent ID to get statistics for"),
});

export const getAgentStatsDef = {
  name: "xlayer_get_agent_stats",
  description:
    "Get performance statistics for an AI Scout Agent on X Layer, including win rate, PnL, ROI, and streak.",
  inputSchema: {
    type: "object" as const,
    properties: {
      agentId: {
        type: "string",
        description: "The agent ID to get statistics for",
      },
    },
    required: ["agentId"],
  },
};

export async function handleGetAgentStats(params: Record<string, unknown>) {
  const { agentId } = getAgentStatsSchema.parse(params);
  const res = await apiGet<AgentStats>(`/api/agents/${agentId}/stats`);

  if (!res.ok) {
    return {
      content: [{ type: "text" as const, text: `API error ${res.status}: ${JSON.stringify(res.data)}` }],
      isError: true,
    };
  }

  const s = res.data;
  const text = [
    `Agent ${s.agentId} Stats`,
    `─────────────────────`,
    `Record: ${s.wins}W / ${s.losses}L / ${s.draws}D (${s.totalBets} total bets)`,
    `Win Rate: ${(s.winRate * 100).toFixed(1)}%`,
    `Total PnL: ${s.totalPnl} OKB`,
    `ROI: ${(s.roi * 100).toFixed(1)}%`,
    `Current Streak: ${s.streak > 0 ? `${s.streak}W` : s.streak < 0 ? `${Math.abs(s.streak)}L` : "0"}`,
  ].join("\n");

  return { content: [{ type: "text" as const, text }] };
}
