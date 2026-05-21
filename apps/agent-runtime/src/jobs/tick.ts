// ---------------------------------------------------------------------------
// Tick job - BullMQ-powered concurrent agent processing
// Doc ref: Section 7.1.9 — "enqueue to BullMQ, concurrent processing"
// ---------------------------------------------------------------------------

import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { totalSupply, isPaused } from "../chain/registry.js";
import { runAgentTick } from "../agent/loop.js";

// ---------------------------------------------------------------------------
// Redis connection (reused by Queue + Worker)
// ---------------------------------------------------------------------------

let connection: IORedis | null = null;

function getRedisConnection(): IORedis {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    });
    connection.on("error", (err) => {
      console.error("[BullMQ] Redis connection error:", err.message);
    });
  }
  return connection;
}

// ---------------------------------------------------------------------------
// Queue & Worker
// ---------------------------------------------------------------------------

const QUEUE_NAME = "agent-tick";
let queue: Queue | null = null;
let worker: Worker | null = null;
let bullmqAvailable = false;

/**
 * Initialize BullMQ queue and worker.
 * Falls back to sequential processing if Redis is unavailable.
 */
export function initTickQueue(): void {
  try {
    const conn = getRedisConnection();

    queue = new Queue(QUEUE_NAME, {
      connection: conn,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        attempts: 1, // each tick is idempotent; no need to retry
      },
    });

    // Concurrency: process up to 5 agent ticks simultaneously
    worker = new Worker(
      QUEUE_NAME,
      async (job: Job<{ tokenId: string }>) => {
        const tokenId = BigInt(job.data.tokenId);
        console.log(`[Tick:Worker] Processing agent ${tokenId}`);
        await runAgentTick(tokenId);
      },
      {
        connection: conn,
        concurrency: parseInt(process.env.TICK_CONCURRENCY || "5", 10),
      },
    );

    worker.on("completed", (job) => {
      console.log(`[Tick:Worker] Agent ${job.data.tokenId} tick complete`);
    });

    worker.on("failed", (job, err) => {
      console.error(
        `[Tick:Worker] Agent ${job?.data?.tokenId} tick failed:`,
        err.message,
      );
    });

    bullmqAvailable = true;
    console.log("[Tick] BullMQ queue initialized (concurrent processing)");
  } catch (err) {
    console.warn(
      "[Tick] BullMQ init failed, using sequential fallback:",
      err instanceof Error ? err.message : err,
    );
    bullmqAvailable = false;
  }
}

// ---------------------------------------------------------------------------
// Sequential fallback (when Redis is unavailable)
// ---------------------------------------------------------------------------

async function tickSequential(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    const tokenId = BigInt(i);
    try {
      const paused = await isPaused(tokenId).catch(() => true);
      if (paused) {
        console.log(`[Tick] Agent ${i} is paused, skipping`);
        continue;
      }
      await runAgentTick(tokenId);
    } catch (err) {
      console.error(
        `[Tick] Error processing agent ${i}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a tick for all active (non-paused) agents.
 * Uses BullMQ for concurrent processing when Redis is available,
 * falls back to sequential processing otherwise.
 */
export async function tickAllAgents(): Promise<void> {
  try {
    const supply = await totalSupply().catch(() => 0n);
    const count = Number(supply);

    if (count === 0) {
      console.log("[Tick] No agents registered");
      return;
    }

    console.log(`[Tick] Processing ${count} agents...`);

    // BullMQ path: enqueue each agent as a separate job
    if (bullmqAvailable && queue) {
      const jobs: Array<{ name: string; data: { tokenId: string } }> = [];

      for (let i = 0; i < count; i++) {
        const tokenId = BigInt(i);
        try {
          const paused = await isPaused(tokenId).catch(() => true);
          if (paused) {
            console.log(`[Tick] Agent ${i} is paused, skipping`);
            continue;
          }
          jobs.push({
            name: `tick-agent-${i}`,
            data: { tokenId: i.toString() },
          });
        } catch {
          // Skip agents we can't read
        }
      }

      if (jobs.length > 0) {
        await queue.addBulk(jobs);
        console.log(`[Tick] Enqueued ${jobs.length} agent ticks to BullMQ`);
      }
    } else {
      // Sequential fallback
      await tickSequential(count);
    }

    console.log("[Tick] All agents processed");
  } catch (err) {
    console.error(
      "[Tick] Fatal error:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Gracefully shut down the BullMQ worker and queue.
 */
export async function shutdownTickQueue(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
  if (connection) {
    connection.disconnect();
    connection = null;
  }
  bullmqAvailable = false;
  console.log("[Tick] BullMQ queue shut down");
}
