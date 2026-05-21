import { apiGet } from "../clients.js";
import type { StrategyGene } from "../types.js";

export const agentStrategiesResource = {
  uri: "xlayer://agent/{agentId}/strategy",
  name: "Agent Strategy Gene",
  description:
    "Returns the strategy gene configuration for a given AI Scout Agent, including style, risk level, and weighting parameters.",
  mimeType: "application/json",
};

export async function handleAgentStrategy(agentId: string) {
  const res = await apiGet<StrategyGene>(`/api/agents/${agentId}/strategy`);

  if (!res.ok) {
    return {
      contents: [
        {
          uri: `xlayer://agent/${agentId}/strategy`,
          mimeType: "application/json",
          text: JSON.stringify({ error: `API error ${res.status}`, details: res.data }),
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri: `xlayer://agent/${agentId}/strategy`,
        mimeType: "application/json",
        text: JSON.stringify(res.data, null, 2),
      },
    ],
  };
}
