import "dotenv/config";
import { createPublicClient, http, defineChain, type Log, type Abi } from "viem";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { initSchema, query, closePool } from "./db/client.js";
import { handleAgentMinted } from "./handlers/agentMinted.js";
import { handleBetPlaced } from "./handlers/betPlaced.js";
import { handleMarketResolved } from "./handlers/marketResolved.js";
import { handleRankingUpdated } from "./handlers/rankingUpdated.js";

// ---------------------------------------------------------------------------
// X Layer Testnet chain definition
// ---------------------------------------------------------------------------
const xlayerTestnet = defineChain({
  id: 195,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testrpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: { name: "OKLink", url: "https://www.oklink.com/xlayer-test" },
  },
  testnet: true,
});

const CONFIRMATION_BLOCKS = 5; // reorg-protection buffer

const client = createPublicClient({
  chain: xlayerTestnet,
  transport: http(),
});

// ---------------------------------------------------------------------------
// Contract addresses from environment
// ---------------------------------------------------------------------------
const AGENT_NFT_ADDRESS = (process.env["AGENT_NFT_ADDRESS"] ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
const BETTING_ADDRESS = (process.env["BETTING_ADDRESS"] ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
const MARKET_ADDRESS = (process.env["MARKET_ADDRESS"] ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
const RANKING_ADDRESS = (process.env["RANKING_ADDRESS"] ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

// ---------------------------------------------------------------------------
// Contract ABIs (event signatures only)
// ---------------------------------------------------------------------------
const agentNftAbi = [
  {
    type: "event",
    name: "AgentMinted",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "owner", type: "address", indexed: true, internalType: "address" },
      { name: "wallet", type: "address", indexed: false, internalType: "address" },
      { name: "gene", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
] as const satisfies Abi;

const bettingAbi = [
  {
    type: "event",
    name: "BetPlaced",
    inputs: [
      { name: "txHash", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "marketId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "agentId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "outcome", type: "uint8", indexed: false, internalType: "uint8" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
] as const satisfies Abi;

const marketAbi = [
  {
    type: "event",
    name: "MarketResolved",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "winningOutcome", type: "uint8", indexed: false, internalType: "uint8" },
    ],
  },
] as const satisfies Abi;

const rankingAbi = [
  {
    type: "event",
    name: "StatsUpdated",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "wins", type: "uint32", indexed: false, internalType: "uint32" },
      { name: "losses", type: "uint32", indexed: false, internalType: "uint32" },
      { name: "totalBets", type: "uint32", indexed: false, internalType: "uint32" },
      { name: "totalPnl", type: "int256", indexed: false, internalType: "int256" },
    ],
  },
] as const satisfies Abi;

// ---------------------------------------------------------------------------
// Event watchers with 5-block confirmation buffer
// ---------------------------------------------------------------------------
function startWatchers(): void {
  console.log("[indexer] Starting event watchers...");

  client.watchContractEvent({
    address: AGENT_NFT_ADDRESS,
    abi: agentNftAbi,
    eventName: "AgentMinted",
    pollingInterval: 4_000,
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          const currentBlock = await client.getBlockNumber();
          if (log.blockNumber && currentBlock - log.blockNumber < CONFIRMATION_BLOCKS) continue;
          await handleAgentMinted(log as unknown as Log);
        } catch (err) {
          console.error("[agentMinted] Error processing log:", err);
        }
      }
    },
  });

  client.watchContractEvent({
    address: BETTING_ADDRESS,
    abi: bettingAbi,
    eventName: "BetPlaced",
    pollingInterval: 4_000,
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          const currentBlock = await client.getBlockNumber();
          if (log.blockNumber && currentBlock - log.blockNumber < CONFIRMATION_BLOCKS) continue;
          await handleBetPlaced(log as unknown as Log);
        } catch (err) {
          console.error("[betPlaced] Error processing log:", err);
        }
      }
    },
  });

  client.watchContractEvent({
    address: MARKET_ADDRESS,
    abi: marketAbi,
    eventName: "MarketResolved",
    pollingInterval: 4_000,
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          const currentBlock = await client.getBlockNumber();
          if (log.blockNumber && currentBlock - log.blockNumber < CONFIRMATION_BLOCKS) continue;
          await handleMarketResolved(log as unknown as Log);
        } catch (err) {
          console.error("[marketResolved] Error processing log:", err);
        }
      }
    },
  });

  client.watchContractEvent({
    address: RANKING_ADDRESS,
    abi: rankingAbi,
    eventName: "StatsUpdated",
    pollingInterval: 4_000,
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          const currentBlock = await client.getBlockNumber();
          if (log.blockNumber && currentBlock - log.blockNumber < CONFIRMATION_BLOCKS) continue;
          await handleRankingUpdated(log as unknown as Log);
        } catch (err) {
          console.error("[rankingUpdated] Error processing log:", err);
        }
      }
    },
  });

  console.log("[indexer] All watchers started");
}

// ---------------------------------------------------------------------------
// HTTP API (Fastify)
// ---------------------------------------------------------------------------
async function startApi(): Promise<void> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  // Health check
  app.get("/healthz", async () => ({ status: "ok", service: "indexer" }));

  // GET /indexer/leaderboard?top=20&period=24h
  app.get<{ Querystring: { top?: string; period?: string } }>(
    "/indexer/leaderboard",
    async (request) => {
      const top = Math.min(Number(request.query.top) || 20, 100);
      const period = request.query.period ?? "24h";

      // Parse period into an interval string
      const intervalMap: Record<string, string> = {
        "1h": "1 hour",
        "6h": "6 hours",
        "24h": "24 hours",
        "7d": "7 days",
        "30d": "30 days",
        all: "100 years",
      };
      const interval = intervalMap[period] ?? "24 hours";

      const result = await query(
        `SELECT s.agent_id, s.wins, s.losses, s.total_bets, s.total_pnl, s.last_active,
                a.owner, a.wallet
         FROM agent_stats s
         LEFT JOIN agents a ON a.id = s.agent_id
         WHERE s.last_active >= NOW() - $1::interval
         ORDER BY s.total_pnl DESC
         LIMIT $2`,
        [interval, top],
      );
      return { leaderboard: result.rows };
    },
  );

  // GET /indexer/recent-bets?limit=50
  app.get<{ Querystring: { limit?: string } }>(
    "/indexer/recent-bets",
    async (request) => {
      const limit = Math.min(Number(request.query.limit) || 50, 200);
      const result = await query(
        `SELECT b.tx_hash, b.market_id, b.agent_id, b.outcome, b.amount, b.placed_at,
                a.owner
         FROM bets b
         LEFT JOIN agents a ON a.id = b.agent_id
         ORDER BY b.placed_at DESC
         LIMIT $1`,
        [limit],
      );
      return { bets: result.rows };
    },
  );

  // GET /indexer/agent/:id/history
  app.get<{ Params: { id: string } }>(
    "/indexer/agent/:id/history",
    async (request) => {
      const agentId = request.params.id;

      const [agentResult, betsResult, statsResult] = await Promise.all([
        query(`SELECT * FROM agents WHERE id = $1`, [agentId]),
        query(
          `SELECT tx_hash, market_id, outcome, amount, placed_at
           FROM bets WHERE agent_id = $1 ORDER BY placed_at DESC LIMIT 100`,
          [agentId],
        ),
        query(`SELECT * FROM agent_stats WHERE agent_id = $1`, [agentId]),
      ]);

      return {
        agent: agentResult.rows[0] ?? null,
        stats: statsResult.rows[0] ?? null,
        bets: betsResult.rows,
      };
    },
  );

  const port = Number(process.env["PORT"] ?? 3002);
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`[indexer] HTTP API listening on :${port}`);
}

// ---------------------------------------------------------------------------
// Main entrypoint
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("[indexer] Starting Scout Agent Indexer...");

  // 1. Initialize database schema
  await initSchema();

  // 2. Start on-chain event watchers
  startWatchers();

  // 3. Start HTTP API
  await startApi();

  console.log("[indexer] Ready");
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[indexer] Shutting down...");
  await closePool();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[indexer] Shutting down...");
  await closePool();
  process.exit(0);
});

main().catch((err) => {
  console.error("[indexer] Fatal error:", err);
  process.exit(1);
});
