import { z } from "zod";
import { apiPost } from "../clients.js";
import type { IntentResult } from "../types.js";

export const naturalIntentSchema = z.object({
  text: z
    .string()
    .describe("Natural language text describing what the user wants to do"),
  agentId: z
    .string()
    .optional()
    .describe("Optional agent ID for context-aware intent parsing"),
});

export const naturalIntentDef = {
  name: "xlayer_natural_intent",
  description:
    'Parse natural language into a ScoutAgent action intent. For example: "bet 0.5 OKB on Brazil to win" becomes a structured place_bet intent.',
  inputSchema: {
    type: "object" as const,
    properties: {
      text: {
        type: "string",
        description: "Natural language text describing what the user wants to do",
      },
      agentId: {
        type: "string",
        description: "Optional agent ID for context-aware intent parsing",
      },
    },
    required: ["text"],
  },
};

export async function handleNaturalIntent(params: Record<string, unknown>) {
  const parsed = naturalIntentSchema.parse(params);
  const res = await apiPost<IntentResult>("/api/intent", parsed);

  if (!res.ok) {
    return {
      content: [{ type: "text" as const, text: `API error ${res.status}: ${JSON.stringify(res.data)}` }],
      isError: true,
    };
  }

  const r = res.data;
  const text = [
    `Intent: ${r.intent}`,
    `Confidence: ${(r.confidence * 100).toFixed(0)}%`,
    `Parameters: ${JSON.stringify(r.params, null, 2)}`,
    r.suggestedAction ? `\nSuggested action: ${r.suggestedAction}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { content: [{ type: "text" as const, text }] };
}
