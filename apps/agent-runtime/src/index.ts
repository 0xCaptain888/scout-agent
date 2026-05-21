// ---------------------------------------------------------------------------
// Agent Runtime - Main entry point
// ---------------------------------------------------------------------------

import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cron from "node-cron";
import { registerRoutes } from "./api/routes.js";
import { tickAllAgents, initTickQueue, shutdownTickQueue } from "./jobs/tick.js";
import { resolveEndedMarkets } from "./jobs/resolve.js";
import { queryOnchainOS } from "./data/okx-onchain.js";

async function main() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // Register CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  // Register all API routes
  await registerRoutes(app);

  // Start cron jobs
  const enableCron = process.env.ENABLE_CRON !== "false";

  if (enableCron) {
    // Initialize BullMQ queue for concurrent agent processing
    initTickQueue();

    // Tick every minute - process all active agents
    cron.schedule("* * * * *", async () => {
      console.log("[Cron] Running agent tick...");
      try {
        await tickAllAgents();
      } catch (err) {
        console.error("[Cron] Tick error:", err instanceof Error ? err.message : err);
      }
    });

    // Resolve every 10 minutes - check for ended matches
    cron.schedule("*/10 * * * *", async () => {
      console.log("[Cron] Running market resolution...");
      try {
        await resolveEndedMarkets();
      } catch (err) {
        console.error("[Cron] Resolve error:", err instanceof Error ? err.message : err);
      }
    });

    console.log("[Cron] Scheduled: tick (every 1m), resolve (every 10m)");

    // Heartbeat mode: generates continuous baseline activity
    const HEARTBEAT_MODE = process.env.HEARTBEAT_MODE === 'true';
    if (HEARTBEAT_MODE) {
      const { createDemoMarket } = await import('./jobs/createDemoMarket.js');
      console.log('[Heartbeat] Running in heartbeat mode — generates baseline activity');

      // Every 2 hours create a new demo market
      setInterval(async () => {
        try { await createDemoMarket(); } catch (e) { console.error('[Heartbeat] Market creation error:', e); }
      }, 2 * 3600_000);

      // Create one immediately on start
      createDemoMarket().catch(e => console.error('[Heartbeat] Initial market creation error:', e));
    }
  } else {
    console.log("[Cron] Cron jobs disabled (ENABLE_CRON=false)");
  }

  // Start server
  const port = parseInt(process.env.PORT || "3001", 10);
  const host = process.env.HOST || "0.0.0.0";

  try {
    await app.listen({ port, host });
    console.log(`[Server] Agent Runtime listening on ${host}:${port}`);
    console.log(`[Server] Health check: http://${host}:${port}/health`);

    // Warm up OKX OnchainOS cache on startup (Section 11 integration)
    queryOnchainOS()
      .then((s) =>
        console.log(
          `[OKX OnchainOS] Initialized — OKB=$${s.okbPrice?.priceUsd || "?"}, available=${s.available}`,
        ),
      )
      .catch((err) =>
        console.warn("[OKX OnchainOS] Startup warmup failed:", err),
      );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[Fatal] Failed to start Agent Runtime:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Shutdown] SIGTERM received, shutting down...");
  await shutdownTickQueue();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Shutdown] SIGINT received, shutting down...");
  await shutdownTickQueue();
  process.exit(0);
});
