// ---------------------------------------------------------------------------
// All API routes
// ---------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import { handleIntent } from "./intent.js";
import { runAgentTick, getDecisionLogs } from "../agent/loop.js";
import { getUpcomingFixtures } from "../data/sports.js";
import { getMarket, marketCount } from "../chain/market.js";
import {
  geneOf,
  bankrollOf,
  isPaused,
  ownerOf,
  walletOf,
  totalSupply,
} from "../chain/registry.js";
import { getLeaderboard, getAgentStats } from "../chain/ranking.js";
import { decodeGene, STYLE_NAMES } from "../agent/strategy.js";
import { formatUnits } from "viem";

// ---------------------------------------------------------------------------
// Helper: safe BigInt contract reads with fallback
// ---------------------------------------------------------------------------
async function safeRead<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Register all routes
// ---------------------------------------------------------------------------
export async function registerRoutes(app: FastifyInstance) {
  // Health check
  app.get("/health", async () => ({
    status: "ok",
    service: "agent-runtime",
    timestamp: new Date().toISOString(),
  }));

  // POST /api/intent - Natural language intent extraction
  app.post("/api/intent", handleIntent);

  // GET /api/agents/:id - Get agent details
  app.get<{ Params: { id: string } }>("/api/agents/:id", async (req, reply) => {
    try {
      const tokenId = BigInt(req.params.id);
      const [gene, bankroll, paused, owner, wallet] = await Promise.all([
        safeRead(() => geneOf(tokenId), 0n),
        safeRead(() => bankrollOf(tokenId), 0n),
        safeRead(() => isPaused(tokenId), false),
        safeRead(() => ownerOf(tokenId), "0x0000000000000000000000000000000000000000" as `0x${string}`),
        safeRead(() => walletOf(tokenId), "0x0000000000000000000000000000000000000000" as `0x${string}`),
      ]);

      const decoded = decodeGene(gene);
      return {
        id: req.params.id,
        owner,
        wallet,
        bankroll: formatUnits(bankroll, 6),
        bankrollRaw: bankroll.toString(),
        paused,
        gene: {
          raw: gene.toString(),
          riskLevel: decoded.riskLevel,
          style: STYLE_NAMES[decoded.style] || "UNKNOWN",
          styleIndex: decoded.style,
          bankrollPct: decoded.bankrollPct,
          favoriteTeams: decoded.favoriteTeams,
        },
      };
    } catch (err) {
      return reply.status(404).send({
        error: "Agent not found",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // GET /api/agents/:id/decisions - Get agent decision history
  app.get<{ Params: { id: string } }>("/api/agents/:id/decisions", async (req) => {
    const logs = getDecisionLogs(req.params.id);
    return { agentId: req.params.id, decisions: logs };
  });

  // POST /api/agents/:id/run - Manually trigger agent tick
  app.post<{ Params: { id: string } }>("/api/agents/:id/run", async (req, reply) => {
    try {
      const tokenId = BigInt(req.params.id);
      const decisions = await runAgentTick(tokenId);
      return {
        agentId: req.params.id,
        decisionsCount: decisions.length,
        decisions,
      };
    } catch (err) {
      return reply.status(500).send({
        error: "Agent tick failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // POST /api/agents/:id/pause - Toggle agent pause state
  app.post<{ Params: { id: string } }>("/api/agents/:id/pause", async (req, reply) => {
    try {
      const tokenId = BigInt(req.params.id);
      const currentlyPaused = await safeRead(() => isPaused(tokenId), false);
      // Note: actual pause toggle requires on-chain tx from owner
      // For hackathon, we return the current state
      return {
        agentId: req.params.id,
        paused: currentlyPaused,
        message: "Use the contract directly to toggle pause state (requires agent owner signature)",
      };
    } catch (err) {
      return reply.status(500).send({
        error: "Pause check failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // GET /api/markets - List recent markets
  app.get("/api/markets", async () => {
    const total = await safeRead(() => marketCount(), 0n);
    const count = Number(total);
    const markets = [];

    // Return last 20 markets
    const start = Math.max(0, count - 20);
    for (let i = start; i < count; i++) {
      try {
        const market = await getMarket(BigInt(i));
        markets.push({
          id: i,
          matchId: market.matchId,
          startTime: market.startTime.toString(),
          status: ["OPEN", "LOCKED", "RESOLVED"][market.status] || "UNKNOWN",
          resolvedOutcome: ["NONE", "HOME", "DRAW", "AWAY"][market.resolvedOutcome] || "NONE",
          totalHome: formatUnits(market.totalHome, 6),
          totalDraw: formatUnits(market.totalDraw, 6),
          totalAway: formatUnits(market.totalAway, 6),
          totalPool: formatUnits(market.totalPool, 6),
        });
      } catch {
        // Market read failed, skip
      }
    }

    return { total: count, markets };
  });

  // GET /api/markets/:id - Get single market
  app.get<{ Params: { id: string } }>("/api/markets/:id", async (req, reply) => {
    try {
      const marketId = BigInt(req.params.id);
      const market = await getMarket(marketId);
      return {
        id: req.params.id,
        matchId: market.matchId,
        startTime: market.startTime.toString(),
        status: ["OPEN", "LOCKED", "RESOLVED"][market.status] || "UNKNOWN",
        resolvedOutcome: ["NONE", "HOME", "DRAW", "AWAY"][market.resolvedOutcome] || "NONE",
        totalHome: formatUnits(market.totalHome, 6),
        totalDraw: formatUnits(market.totalDraw, 6),
        totalAway: formatUnits(market.totalAway, 6),
        totalPool: formatUnits(market.totalPool, 6),
      };
    } catch (err) {
      return reply.status(404).send({
        error: "Market not found",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // GET /api/leaderboard - Agent leaderboard (on-chain RankingBoard)
  app.get("/api/leaderboard", async () => {
    const total = await safeRead(() => totalSupply(), 0n);
    const count = Math.min(Number(total), 50);

    if (count === 0) {
      return { leaderboard: [] };
    }

    // Fetch the top agents from the RankingBoard contract
    const topData = await safeRead(
      () => getLeaderboard(BigInt(count)),
      { agentIds: [] as readonly bigint[], pnls: [] as readonly bigint[] },
    );

    const agents = [];
    for (let i = 0; i < topData.agentIds.length; i++) {
      const agentId = Number(topData.agentIds[i]);
      const pnlRaw = topData.pnls[i];

      // Fetch per-agent stats (wins, losses, totalPnl)
      const stats = await safeRead(
        () => getAgentStats(BigInt(agentId)),
        { wins: 0n, losses: 0n, totalPnl: 0n },
      );

      const wins = Number(stats.wins);
      const losses = Number(stats.losses);
      const totalGames = wins + losses;

      agents.push({
        agentId,
        wins,
        losses,
        winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
        pnl: formatUnits(pnlRaw, 6),
        pnlRaw: pnlRaw.toString(),
      });
    }

    // Already sorted by PnL from the contract, but ensure descending order
    agents.sort((a, b) => parseFloat(b.pnl) - parseFloat(a.pnl));

    return { leaderboard: agents };
  });

  // GET /api/stats - Global system stats
  app.get("/api/stats", async () => {
    const [agentCount, mkCount] = await Promise.all([
      safeRead(() => totalSupply(), 0n),
      safeRead(() => marketCount(), 0n),
    ]);

    const allDecisions = getDecisionLogs();
    const bets = allDecisions.filter((d) => d.decision.action === "BET");

    return {
      totalAgents: Number(agentCount),
      totalMarkets: Number(mkCount),
      totalDecisions: allDecisions.length,
      totalBetsPlaced: bets.length,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  // GET /api/fixtures - Upcoming fixtures
  app.get("/api/fixtures", async () => {
    const fixtures = await getUpcomingFixtures();
    return { fixtures };
  });
}
