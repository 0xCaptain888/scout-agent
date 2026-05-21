// ---------------------------------------------------------------------------
// Agent Runtime - Main entry point
// ---------------------------------------------------------------------------

import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cron from "node-cron";
import { registerRoutes } from "./api/routes.js";
import { tickAllAgents } from "./jobs/tick.js";
import { resolveEndedMarkets } from "./jobs/resolve.js";

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
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[Fatal] Failed to start Agent Runtime:", err);
  process.exit(1);
});
