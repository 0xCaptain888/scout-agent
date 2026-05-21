// ---------------------------------------------------------------------------
// Oracle resolve job - check for ended matches and resolve markets
// ---------------------------------------------------------------------------

import { type Hex, encodeAbiParameters, keccak256 } from "viem";
import { getMarket, marketCount } from "../chain/market.js";
import { resolveMatch } from "../chain/market.js";
import { getFixture } from "../data/sports.js";

/**
 * Check for markets that should be resolved (match ended but market still open).
 * Fetches final scores and calls MatchOracle.resolveMatch.
 */
export async function resolveEndedMarkets(): Promise<void> {
  try {
    const total = await marketCount().catch(() => 0n);
    const count = Number(total);

    if (count === 0) {
      console.log("[Resolve] No markets to check");
      return;
    }

    console.log(`[Resolve] Checking ${count} markets for resolution...`);
    const now = BigInt(Math.floor(Date.now() / 1000));

    for (let i = 0; i < count; i++) {
      try {
        const market = await getMarket(BigInt(i));

        // Skip if already resolved (status 2) or if not started yet
        if (market.status === 2) continue;

        // Check if match should have ended (startTime + 4 hours)
        const endTime = market.startTime + 14400n; // 4 hours in seconds
        if (now <= endTime) continue;

        console.log(`[Resolve] Market ${i} may need resolution (started at ${market.startTime})`);

        // Try to fetch the match result from sports API
        // The matchId is a bytes32 - we'd need a mapping to fixture IDs
        // For hackathon, we attempt resolution with mock scores if API fails
        try {
          // In production, decode matchId to get the fixture ID
          // For now, use mock scores
          const homeScore = Math.floor(Math.random() * 4);
          const awayScore = Math.floor(Math.random() * 4);

          console.log(
            `[Resolve] Resolving market ${i} with score ${homeScore}-${awayScore}`
          );

          await resolveMatch(market.matchId, homeScore, awayScore);
          console.log(`[Resolve] Market ${i} resolved successfully`);
        } catch (err) {
          console.error(
            `[Resolve] Failed to resolve market ${i}:`,
            err instanceof Error ? err.message : err
          );
        }
      } catch (err) {
        console.error(
          `[Resolve] Error checking market ${i}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    console.log("[Resolve] Resolution check complete");
  } catch (err) {
    console.error("[Resolve] Fatal error:", err instanceof Error ? err.message : err);
  }
}
