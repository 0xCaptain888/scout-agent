// ---------------------------------------------------------------------------
// Tick job - runs all active agents sequentially
// ---------------------------------------------------------------------------

import { totalSupply, isPaused } from "../chain/registry.js";
import { runAgentTick } from "../agent/loop.js";

/**
 * Run a tick for all active (non-paused) agents.
 * For hackathon: simple sequential processing (no BullMQ).
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
          err instanceof Error ? err.message : err
        );
      }
    }

    console.log("[Tick] All agents processed");
  } catch (err) {
    console.error("[Tick] Fatal error:", err instanceof Error ? err.message : err);
  }
}
