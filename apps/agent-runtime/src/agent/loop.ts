// ---------------------------------------------------------------------------
// ReAct agent loop - runs a single tick for one agent
// ---------------------------------------------------------------------------

import { formatUnits } from "viem";
import { geneOf, bankrollOf, isPaused } from "../chain/registry.js";
import { getMarket, getBetAmount, placeBet, marketCount } from "../chain/market.js";
import { getLLMProvider, getSystemPrompt } from "./llm.js";
import { decodeGene, buildStrategyPrompt, type StrategyContext } from "./strategy.js";
import { getUpcomingFixtures, getH2H, type Fixture } from "../data/sports.js";
import { getMatchOdds } from "../data/odds.js";
import { getMatchSentiment } from "../data/social.js";

// ---------------------------------------------------------------------------
// In-memory decision log (for hackathon; use DB in production)
// ---------------------------------------------------------------------------
export interface DecisionLog {
  agentId: string;
  marketId: string;
  fixture: { home: string; away: string; competition: string };
  decision: {
    action: string;
    outcome: string;
    amount: string;
    confidence: number;
    reasoning: string;
  };
  txHash?: string;
  timestamp: string;
}

const decisionLogs: DecisionLog[] = [];

export function getDecisionLogs(agentId?: string): DecisionLog[] {
  if (agentId) return decisionLogs.filter((d) => d.agentId === agentId);
  return [...decisionLogs];
}

// ---------------------------------------------------------------------------
// Run a single agent tick
// ---------------------------------------------------------------------------
export async function runAgentTick(agentId: bigint): Promise<DecisionLog[]> {
  const results: DecisionLog[] = [];
  const agentIdStr = agentId.toString();

  try {
    console.log(`[AgentLoop] Starting tick for agent ${agentIdStr}`);

    // 1. Check if agent is paused
    const paused = await isPaused(agentId).catch(() => false);
    if (paused) {
      console.log(`[AgentLoop] Agent ${agentIdStr} is paused, skipping`);
      return results;
    }

    // 2. Load agent state
    const [geneRaw, bankrollRaw] = await Promise.all([
      geneOf(agentId).catch(() => 0n),
      bankrollOf(agentId).catch(() => 0n),
    ]);

    const gene = decodeGene(geneRaw);
    const bankrollUsdt = formatUnits(bankrollRaw, 6); // USDT has 6 decimals

    if (parseFloat(bankrollUsdt) <= 0) {
      console.log(`[AgentLoop] Agent ${agentIdStr} has no bankroll, skipping`);
      return results;
    }

    // 3. Fetch upcoming matches
    const fixtures = await getUpcomingFixtures();
    if (fixtures.length === 0) {
      console.log(`[AgentLoop] No upcoming fixtures found`);
      return results;
    }

    // 4. Check how many markets exist
    const totalMarkets = await marketCount().catch(() => 0n);

    // 5. For each upcoming fixture, check if there's a market and if agent hasn't bet yet
    for (const fixture of fixtures.slice(0, 5)) {
      // Limit to 5 matches per tick
      try {
        await processFixture(agentId, agentIdStr, gene, bankrollUsdt, bankrollRaw, fixture, totalMarkets, results);
      } catch (err) {
        console.error(
          `[AgentLoop] Error processing fixture ${fixture.id} for agent ${agentIdStr}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    console.log(`[AgentLoop] Tick complete for agent ${agentIdStr}, ${results.length} decisions made`);
  } catch (err) {
    console.error(
      `[AgentLoop] Fatal error for agent ${agentIdStr}:`,
      err instanceof Error ? err.message : err
    );
  }

  return results;
}

// ---------------------------------------------------------------------------
// Process a single fixture for an agent
// ---------------------------------------------------------------------------
async function processFixture(
  agentId: bigint,
  agentIdStr: string,
  gene: ReturnType<typeof decodeGene>,
  bankrollUsdt: string,
  bankrollRaw: bigint,
  fixture: Fixture,
  totalMarkets: bigint,
  results: DecisionLog[]
): Promise<void> {
  // Try to find a matching market (iterate recent markets)
  let matchedMarketId: bigint | null = null;

  for (let i = Number(totalMarkets) - 1; i >= Math.max(0, Number(totalMarkets) - 20); i--) {
    try {
      const market = await getMarket(BigInt(i));
      // Market is open (status 0) and hasn't started yet
      if (market.status === 0 && market.startTime > BigInt(Math.floor(Date.now() / 1000))) {
        // Check if agent already bet
        const bet = await getBetAmount(BigInt(i), agentId);
        if (bet.amount === 0n) {
          matchedMarketId = BigInt(i);
          break;
        }
      }
    } catch {
      continue;
    }
  }

  if (matchedMarketId === null) {
    // No open market found for this fixture - skip
    return;
  }

  // Gather context
  const [odds, h2h, sentiment] = await Promise.all([
    getMatchOdds(fixture.homeTeam, fixture.awayTeam),
    getH2H(fixture.homeTeam, fixture.awayTeam),
    Promise.resolve(getMatchSentiment(fixture.homeTeam, fixture.awayTeam)),
  ]);

  // Build recent performance from decision logs
  const recentDecisions = getDecisionLogs(agentIdStr).slice(-10);
  const wins = recentDecisions.filter((d) => d.decision.action === "BET").length;
  const winRate = recentDecisions.length > 0 ? Math.round((wins / recentDecisions.length) * 100) : 50;

  // Build strategy prompt
  const strategyCtx: StrategyContext = {
    gene,
    currentBankroll: bankrollUsdt,
    winRate,
    recentPnl: "0.00",
    recentCount: recentDecisions.length,
    recentSummary:
      recentDecisions.length > 0
        ? recentDecisions
            .slice(-3)
            .map((d) => `${d.decision.action} ${d.fixture.home} vs ${d.fixture.away}`)
            .join("; ")
        : "No recent decisions",
  };

  const strategyPrompt = buildStrategyPrompt(strategyCtx);
  const systemPrompt = getSystemPrompt() + "\n\n" + strategyPrompt;

  // Build match context for LLM
  const matchContext = {
    match: {
      home: fixture.homeTeam,
      away: fixture.awayTeam,
      competition: fixture.competition,
      kickoff: fixture.utcDate,
      matchday: fixture.matchday,
    },
    odds: {
      home: odds.home,
      draw: odds.draw,
      away: odds.away,
      bookmaker: odds.bookmaker,
    },
    h2h: h2h.map((h) => ({
      home: h.homeTeam,
      away: h.awayTeam,
      score: `${h.score.home}-${h.score.away}`,
      date: h.utcDate,
    })),
    sentiment: {
      home: sentiment.home,
      away: sentiment.away,
      delta: sentiment.delta,
    },
    bankroll: {
      total: bankrollUsdt,
      maxBetPct: gene.bankrollPct,
      maxBetAmount: ((parseFloat(bankrollUsdt) * gene.bankrollPct) / 100).toFixed(2),
    },
  };

  // Call LLM
  const llm = getLLMProvider();
  const decision = await llm.decide(matchContext, systemPrompt);

  // Log decision
  const log: DecisionLog = {
    agentId: agentIdStr,
    marketId: matchedMarketId.toString(),
    fixture: {
      home: fixture.homeTeam,
      away: fixture.awayTeam,
      competition: fixture.competition,
    },
    decision: {
      action: decision.action,
      outcome: decision.outcome,
      amount: decision.amount,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
    },
    timestamp: new Date().toISOString(),
  };

  // If BET, place on-chain
  if (decision.action === "BET") {
    try {
      const outcomeMap: Record<string, number> = { HOME: 1, DRAW: 2, AWAY: 3 };
      const outcomeNum = outcomeMap[decision.outcome] || 1;

      // Convert amount to USDT smallest unit (6 decimals)
      let betAmount = BigInt(Math.floor(parseFloat(decision.amount) * 1e6));

      // Cap at max allowed
      const maxBet = (bankrollRaw * BigInt(gene.bankrollPct)) / 100n;
      if (betAmount > maxBet) betAmount = maxBet;
      if (betAmount > bankrollRaw) betAmount = bankrollRaw;

      if (betAmount > 0n) {
        const txHash = await placeBet(matchedMarketId, agentId, outcomeNum, betAmount);
        log.txHash = txHash;
        console.log(
          `[AgentLoop] Agent ${agentIdStr} placed bet: ${decision.outcome} on ${fixture.homeTeam} vs ${fixture.awayTeam}, amount: ${decision.amount} USDT, tx: ${txHash}`
        );
      }
    } catch (err) {
      console.error(
        `[AgentLoop] Failed to place bet for agent ${agentIdStr}:`,
        err instanceof Error ? err.message : err
      );
      log.decision.reasoning += ` [On-chain tx failed: ${err instanceof Error ? err.message : "unknown error"}]`;
    }
  }

  decisionLogs.push(log);
  results.push(log);
}
