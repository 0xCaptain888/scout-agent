// ---------------------------------------------------------------------------
// Oracle resolve job - check for ended matches and resolve markets
// ---------------------------------------------------------------------------

import { type Hex, keccak256, toHex } from "viem";
import { getMarket, marketCount } from "../chain/market.js";
import { resolveMatch } from "../chain/market.js";
import { getFixture, getFixtures, type Fixture } from "../data/sports.js";

// ---------------------------------------------------------------------------
// matchId (bytes32) -> Football-Data API fixture config
// ---------------------------------------------------------------------------

interface MatchConfig {
  label: string;
  fixtureId: number | null; // Football-Data API fixture ID (set when known)
  homeTeam: string; // used for fallback search
  awayTeam: string; // used for fallback search
}

/**
 * Build a mapping from on-chain matchId (keccak256 of label) to match config.
 * The fixture IDs can be filled in once the actual Football-Data IDs are known;
 * until then the resolver will attempt a team-name based search.
 */
function buildMatchIdMap(): Map<Hex, MatchConfig> {
  const entries: Array<{ label: string; fixtureId: number | null; home: string; away: string }> = [
    { label: "MATCH_MCI_LIV_001", fixtureId: null, home: "Manchester City", away: "Liverpool" },
    { label: "MATCH_BAR_RMA_002", fixtureId: null, home: "FC Barcelona", away: "Real Madrid" },
    { label: "MATCH_BAY_DOR_003", fixtureId: null, home: "FC Bayern München", away: "Borussia Dortmund" },
    { label: "MATCH_PSG_MAR_004", fixtureId: null, home: "Paris Saint-Germain", away: "Olympique de Marseille" },
    { label: "MATCH_JUV_INT_005", fixtureId: null, home: "Juventus", away: "Inter Milan" },
  ];

  const map = new Map<Hex, MatchConfig>();
  for (const e of entries) {
    const id = keccak256(toHex(e.label)) as Hex;
    map.set(id, { label: e.label, fixtureId: e.fixtureId, homeTeam: e.home, awayTeam: e.away });
  }
  return map;
}

const MATCH_ID_MAP = buildMatchIdMap();

// ---------------------------------------------------------------------------
// Score lookup
// ---------------------------------------------------------------------------

interface MatchScore {
  home: number;
  away: number;
}

/**
 * Attempt to retrieve the final score for a match from the Football-Data API.
 *
 * Resolution order:
 *   1. If the matchId has a known fixtureId, fetch directly via getFixture().
 *   2. Otherwise, search recent finished fixtures by team name.
 *   3. Return null if no real score is available (caller decides what to do).
 */
export async function getFinishedFixtureScore(matchId: Hex): Promise<MatchScore | null> {
  const config = MATCH_ID_MAP.get(matchId);

  // --- Strategy 1: direct fixture lookup ---
  if (config?.fixtureId) {
    try {
      const fixture = await getFixture(config.fixtureId);
      if (fixture && fixture.status === "FINISHED" && fixture.score.home !== null && fixture.score.away !== null) {
        return { home: fixture.score.home, away: fixture.score.away };
      }
      // fixture exists but not finished yet – fall through
    } catch (err) {
      console.warn(
        `[Resolve] Failed to fetch fixture ${config.fixtureId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // --- Strategy 2: search recent finished fixtures by team name ---
  if (config) {
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
      const to = now.toISOString().slice(0, 10);
      const fixtures = await getFixtures(from, to);

      const match = fixtures.find(
        (f) =>
          f.status === "FINISHED" &&
          f.score.home !== null &&
          f.score.away !== null &&
          matchesTeams(f, config.homeTeam, config.awayTeam),
      );

      if (match && match.score.home !== null && match.score.away !== null) {
        console.log(
          `[Resolve] Found finished fixture via team search: ${match.homeTeam} vs ${match.awayTeam} (id=${match.id})`,
        );
        return { home: match.score.home, away: match.score.away };
      }
    } catch (err) {
      console.warn(
        `[Resolve] Failed to search fixtures for ${config.label}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // --- No real score available ---
  return null;
}

/**
 * Fuzzy check whether a fixture involves the expected home/away teams.
 * Team names from the API can differ slightly from our config, so we do a
 * case-insensitive substring match.
 */
function matchesTeams(fixture: Fixture, home: string, away: string): boolean {
  const fHome = fixture.homeTeam.toLowerCase();
  const fAway = fixture.awayTeam.toLowerCase();
  const h = home.toLowerCase();
  const a = away.toLowerCase();

  return (fHome.includes(h) || h.includes(fHome)) && (fAway.includes(a) || a.includes(fAway));
}

// ---------------------------------------------------------------------------
// Main resolve loop
// ---------------------------------------------------------------------------

/**
 * Check for markets that should be resolved (match ended but market still open).
 * Fetches final scores from the Football-Data API and calls MatchOracle.resolveMatch.
 *
 * Mock scores are only used when the MOCK_RESOLUTION env var is explicitly set to "true".
 */
export async function resolveEndedMarkets(): Promise<void> {
  const useMock = process.env.MOCK_RESOLUTION === "true";

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

        try {
          // Attempt to get real scores from the Football-Data API
          const score = await getFinishedFixtureScore(market.matchId);

          if (score) {
            console.log(
              `[Resolve] Resolving market ${i} with real score ${score.home}-${score.away}`,
            );
            await resolveMatch(market.matchId, score.home, score.away);
            console.log(`[Resolve] Market ${i} resolved successfully`);
          } else if (useMock) {
            // MOCK_RESOLUTION=true: fall back to random scores for demo purposes
            const homeScore = Math.floor(Math.random() * 4);
            const awayScore = Math.floor(Math.random() * 4);
            console.log(
              `[Resolve] No real score available. Using MOCK score ${homeScore}-${awayScore} for market ${i}`,
            );
            await resolveMatch(market.matchId, homeScore, awayScore);
            console.log(`[Resolve] Market ${i} resolved with mock score`);
          } else {
            console.log(
              `[Resolve] Skipping market ${i} – no real score data available yet (set MOCK_RESOLUTION=true to use random scores)`,
            );
          }
        } catch (err) {
          console.error(
            `[Resolve] Failed to resolve market ${i}:`,
            err instanceof Error ? err.message : err,
          );
        }
      } catch (err) {
        console.error(
          `[Resolve] Error checking market ${i}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    console.log("[Resolve] Resolution check complete");
  } catch (err) {
    console.error("[Resolve] Fatal error:", err instanceof Error ? err.message : err);
  }
}
