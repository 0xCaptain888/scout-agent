// ---------------------------------------------------------------------------
// Natural language intent extraction
// ---------------------------------------------------------------------------

import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { getLLMProvider } from "../agent/llm.js";
import { getUpcomingFixtures, type Fixture } from "../data/sports.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
const IntentRequestSchema = z.object({
  text: z.string().min(1),
  agentId: z.string().optional(),
});

export interface ExtractedIntent {
  team: string | null;
  action: "BET_FOR" | "BET_AGAINST" | null;
  confidence: number;
  error?: string;
  matchedFixture?: {
    id: number;
    home: string;
    away: string;
    competition: string;
    kickoff: string;
  };
}

// ---------------------------------------------------------------------------
// Load intent prompt
// ---------------------------------------------------------------------------
let cachedIntentPrompt: string | null = null;

function getIntentPrompt(): string {
  if (cachedIntentPrompt) return cachedIntentPrompt;
  try {
    cachedIntentPrompt = readFileSync(resolve(process.cwd(), "prompts", "intent.md"), "utf-8");
  } catch {
    cachedIntentPrompt =
      "Extract betting intent from the user text. Respond with JSON: {team, action: BET_FOR|BET_AGAINST, confidence: 0-1}";
  }
  return cachedIntentPrompt;
}

// ---------------------------------------------------------------------------
// Match a team name to nearest upcoming fixture
// ---------------------------------------------------------------------------
function findMatchingFixture(teamName: string, fixtures: Fixture[]): Fixture | null {
  const normalized = teamName.toLowerCase().trim();
  return (
    fixtures.find(
      (f) =>
        f.homeTeam.toLowerCase().includes(normalized) ||
        f.awayTeam.toLowerCase().includes(normalized) ||
        normalized.includes(f.homeTeam.toLowerCase()) ||
        normalized.includes(f.awayTeam.toLowerCase())
    ) || null
  );
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export async function handleIntent(req: FastifyRequest, reply: FastifyReply) {
  try {
    const body = IntentRequestSchema.parse(req.body);

    // Use DeepSeek to extract intent
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || "sk-placeholder",
      baseURL: "https://api.deepseek.com/v1",
    });

    const intentPrompt = getIntentPrompt();

    const response = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: intentPrompt },
        { role: "user", content: body.text },
      ],
      temperature: 0.1,
      max_tokens: 256,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return reply.status(500).send({ error: "Empty LLM response" });
    }

    const parsed = JSON.parse(content) as {
      team: string | null;
      action: string | null;
      confidence: number;
      error?: string;
    };

    const result: ExtractedIntent = {
      team: parsed.team,
      action: parsed.action as ExtractedIntent["action"],
      confidence: parsed.confidence || 0,
      error: parsed.error,
    };

    // Try to match to an upcoming fixture
    if (result.team) {
      const fixtures = await getUpcomingFixtures();
      const matched = findMatchingFixture(result.team, fixtures);
      if (matched) {
        result.matchedFixture = {
          id: matched.id,
          home: matched.homeTeam,
          away: matched.awayTeam,
          competition: matched.competition,
          kickoff: matched.utcDate,
        };
      }
    }

    return reply.send(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ error: "Invalid request", details: err.errors });
    }
    console.error("[Intent] Error:", err);
    return reply.status(500).send({
      error: "Intent extraction failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
