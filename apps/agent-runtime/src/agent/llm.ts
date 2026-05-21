import OpenAI from "openai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AgentDecision {
  action: "BET" | "SKIP";
  outcome: "HOME" | "DRAW" | "AWAY";
  amount: string;
  confidence: number;
  reasoning: string;
}

export interface LLMProvider {
  decide(context: object, systemPrompt: string): Promise<AgentDecision>;
}

// ---------------------------------------------------------------------------
// Default SKIP decision (used as fallback)
// ---------------------------------------------------------------------------
function skipDecision(reason: string): AgentDecision {
  return {
    action: "SKIP",
    outcome: "HOME",
    amount: "0",
    confidence: 0,
    reasoning: reason,
  };
}

// ---------------------------------------------------------------------------
// Load system prompt from file
// ---------------------------------------------------------------------------
let cachedSystemPrompt: string | null = null;

export function getSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  try {
    const promptPath = resolve(process.cwd(), "prompts", "system.md");
    cachedSystemPrompt = readFileSync(promptPath, "utf-8");
  } catch {
    cachedSystemPrompt =
      "You are an AI football scout agent. Analyze the match context and decide whether to BET or SKIP. Respond with valid JSON.";
  }
  return cachedSystemPrompt;
}

// ---------------------------------------------------------------------------
// DeepSeek Provider (OpenAI-compatible)
// Bound to DeepSeek V4 via OpenAI-compatible SDK
// ---------------------------------------------------------------------------
export class DeepSeekProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || "sk-placeholder",
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
    });
    this.model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    console.log(`[LLM] DeepSeek provider initialized (model: ${this.model})`);
  }

  async decide(context: object, systemPrompt: string): Promise<AgentDecision> {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Analyze this match context and make a decision. Respond ONLY with a valid JSON object matching this schema:
{
  "action": "BET" | "SKIP",
  "outcome": "HOME" | "DRAW" | "AWAY",
  "amount": "string (USDT amount)",
  "confidence": number (0-1),
  "reasoning": "string (1-3 sentences)"
}

Match Context:
${JSON.stringify(context, null, 2)}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 512,
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("Empty response from LLM");
        }

        const parsed = JSON.parse(content) as AgentDecision;

        // Validate required fields
        if (!parsed.action || !["BET", "SKIP"].includes(parsed.action)) {
          throw new Error(`Invalid action: ${parsed.action}`);
        }
        if (parsed.action === "BET") {
          if (!["HOME", "DRAW", "AWAY"].includes(parsed.outcome)) {
            throw new Error(`Invalid outcome: ${parsed.outcome}`);
          }
          if (!parsed.amount || parseFloat(parsed.amount) <= 0) {
            throw new Error(`Invalid amount: ${parsed.amount}`);
          }
        }
        parsed.confidence = Math.max(0, Math.min(1, parsed.confidence || 0));
        parsed.reasoning = parsed.reasoning || "No reasoning provided";

        return parsed;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[LLM] Attempt ${attempt}/${maxRetries} failed: ${msg}`);

        if (attempt === maxRetries) {
          return skipDecision(`LLM failed after ${maxRetries} attempts: ${msg}`);
        }

        // Brief backoff before retry
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    return skipDecision("LLM exhausted retries");
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------
let provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!provider) {
    provider = new DeepSeekProvider();
  }
  return provider;
}
