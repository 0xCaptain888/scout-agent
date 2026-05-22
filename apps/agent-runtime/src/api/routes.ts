// ---------------------------------------------------------------------------
// All API routes
// ---------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import { handleIntent } from "./intent.js";
import { requireSiwe, generateNonce, getSiweAuth } from "./siwe.js";
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
  pauseAgentOnChain,
} from "../chain/registry.js";
import { getLeaderboard, getAgentStats } from "../chain/ranking.js";
import { decodeGene, STYLE_NAMES } from "../agent/strategy.js";
import { queryOnchainOS } from "../data/okx-onchain.js";
import { formatUnits } from "viem";
import { publicClient } from "../chain/client.js";

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

  // GET /api/auth/nonce - Generate a fresh nonce for SIWE
  app.get("/api/auth/nonce", async () => ({
    nonce: generateNonce(),
  }));

  // POST /api/intent - Natural language intent extraction (write → requires SIWE)
  app.post("/api/intent", { preHandler: [requireSiwe] }, handleIntent);

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

  // POST /api/agents/:id/run - Manually trigger agent tick (requires SIWE, owner only)
  app.post<{ Params: { id: string } }>("/api/agents/:id/run", { preHandler: [requireSiwe] }, async (req, reply) => {
    try {
      const tokenId = BigInt(req.params.id);

      // Verify caller is the agent owner
      const auth = getSiweAuth(req);
      if (auth) {
        const owner = await safeRead(
          () => ownerOf(tokenId),
          "0x0000000000000000000000000000000000000000" as `0x${string}`,
        );
        if (auth.address.toLowerCase() !== owner.toLowerCase()) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Only the agent owner can trigger a tick",
          });
        }
      }
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

  // POST /api/agents/:id/pause - Toggle agent pause state (requires SIWE, owner only)
  app.post<{ Params: { id: string } }>("/api/agents/:id/pause", { preHandler: [requireSiwe] }, async (req, reply) => {
    try {
      const tokenId = BigInt(req.params.id);
      const currentlyPaused = await safeRead(() => isPaused(tokenId), false);

      // Verify caller is the agent owner
      const auth = getSiweAuth(req);
      if (auth) {
        const owner = await safeRead(
          () => ownerOf(tokenId),
          "0x0000000000000000000000000000000000000000" as `0x${string}`,
        );
        if (auth.address.toLowerCase() !== owner.toLowerCase()) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Only the agent owner can toggle pause state",
          });
        }
      }
      // Execute on-chain pause toggle via operator wallet
      const txHash = await pauseAgentOnChain(tokenId);
      const newPaused = !currentlyPaused;

      return {
        agentId: req.params.id,
        paused: newPaused,
        previousState: currentlyPaused,
        txHash,
        explorerUrl: `https://www.oklink.com/xlayer-test/tx/${txHash}`,
      };
    } catch (err) {
      return reply.status(500).send({
        error: "Pause toggle failed",
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

  // GET /api/okx/onchain - OKX OnchainOS status (token price + gas)
  // Doc ref: Section 11 — explicit OKX API call for "political correctness"
  app.get("/api/okx/onchain", async () => {
    const status = await queryOnchainOS();
    return status;
  });

  // ── Badge endpoints ──
  app.get<{ Params: { id: string } }>('/api/agents/:id/badges', async (req) => {
    const { id } = req.params;
    const brAddress = process.env.BADGE_REGISTRY_ADDRESS as `0x${string}`;
    if (!brAddress) return { badges: [], count: 0 };

    const BADGE_REGISTRY_ABI = [
      {
        name: 'getBadges',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'agentId', type: 'uint256' }],
        outputs: [{
          name: '',
          type: 'tuple[]',
          components: [
            { name: 'teamId', type: 'uint16' },
            { name: 'earnedAt', type: 'uint64' },
            { name: 'marketId', type: 'uint256' },
          ],
        }],
      },
      {
        name: 'getBadgeCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'agentId', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ] as const;

    const TEAM_NAMES: Record<number, string> = {
      1: 'Argentina', 2: 'France', 3: 'Brazil', 4: 'England',
      5: 'Spain', 6: 'Germany', 7: 'Portugal', 8: 'Netherlands',
      9: 'Italy', 10: 'Belgium', 11: 'Uruguay', 12: 'Colombia',
      13: 'Japan', 14: 'South Korea', 15: 'Morocco', 16: 'Senegal',
      17: 'USA', 18: 'Mexico', 19: 'Croatia', 20: 'Denmark',
      21: 'Australia', 22: 'Iran', 23: 'Switzerland', 24: 'Sweden',
    };

    try {
      const badges = await publicClient.readContract({
        address: brAddress,
        abi: BADGE_REGISTRY_ABI,
        functionName: 'getBadges',
        args: [BigInt(id)],
      });

      return {
        badges: badges.map((b: any) => ({
          teamId: Number(b.teamId),
          teamName: TEAM_NAMES[Number(b.teamId)] ?? `Team ${b.teamId}`,
          earnedAt: Number(b.earnedAt) * 1000,
          marketId: b.marketId.toString(),
        })),
        count: badges.length,
      };
    } catch (err) {
      console.error('[Badges] Error reading badges:', (err as Error).message);
      return { badges: [], count: 0 };
    }
  });

  // Prize pool info
  app.get('/api/prize-pool', async () => {
    const poolAddr = process.env.WORLD_CUP_PRIZE_POOL_ADDRESS as `0x${string}`;
    if (!poolAddr) return { balance: '0', distributed: false };

    const POOL_ABI = [
      {
        name: 'poolBalance',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
      },
      {
        name: 'distributed',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
      },
    ] as const;

    try {
      const [balance, distributed] = await Promise.all([
        publicClient.readContract({ address: poolAddr, abi: POOL_ABI, functionName: 'poolBalance' }),
        publicClient.readContract({ address: poolAddr, abi: POOL_ABI, functionName: 'distributed' }),
      ]);
      return {
        balance: (Number(balance) / 1e6).toFixed(2),
        distributed,
      };
    } catch (err) {
      return { balance: '0', distributed: false };
    }
  });
}
