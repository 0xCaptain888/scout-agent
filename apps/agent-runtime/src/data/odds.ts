// ---------------------------------------------------------------------------
// Odds data fetcher - The Odds API (https://api.the-odds-api.com/v4)
// Doc ref: Section 7.1.6 — "Store historical snapshots to Postgres"
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.the-odds-api.com/v4";

function getApiKey(): string {
  return process.env.ODDS_API_KEY || "";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface MatchOdds {
  home: number;
  draw: number;
  away: number;
  bookmaker: string;
}

// ---------------------------------------------------------------------------
// Postgres odds history persistence
// ---------------------------------------------------------------------------

import pg from "pg";

let pool: pg.Pool | null = null;
let dbAvailable = false;

function getPool(): pg.Pool | null {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  try {
    pool = new pg.Pool({ connectionString, max: 3 });
    pool.on("error", (err) => {
      console.error("[Odds:DB] Pool error:", err.message);
      dbAvailable = false;
    });
    dbAvailable = true;
    return pool;
  } catch {
    return null;
  }
}

/** Ensure odds_history table exists (idempotent) */
async function ensureOddsTable(): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS odds_history (
        id BIGSERIAL PRIMARY KEY,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        sport_key TEXT NOT NULL,
        bookmaker TEXT NOT NULL,
        home_odds NUMERIC NOT NULL,
        draw_odds NUMERIC NOT NULL,
        away_odds NUMERIC NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_odds_teams ON odds_history(home_team, away_team);
      CREATE INDEX IF NOT EXISTS idx_odds_time ON odds_history(fetched_at DESC);
    `);
    dbAvailable = true;
  } catch (err) {
    console.warn("[Odds:DB] Table creation failed:", err instanceof Error ? err.message : err);
    dbAvailable = false;
  }
}

// Initialize table on module load
ensureOddsTable().catch(() => {});

/** Persist an odds snapshot to Postgres */
async function persistOddsSnapshot(
  homeTeam: string,
  awayTeam: string,
  sportKey: string,
  odds: MatchOdds,
): Promise<void> {
  if (!dbAvailable) return;
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO odds_history (home_team, away_team, sport_key, bookmaker, home_odds, draw_odds, away_odds)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [homeTeam, awayTeam, sportKey, odds.bookmaker, odds.home, odds.draw, odds.away],
    );
  } catch (err) {
    // Non-fatal: log and continue
    console.warn("[Odds:DB] Snapshot persist failed:", err instanceof Error ? err.message : err);
  }
}

// ---------------------------------------------------------------------------
// Cache (5-minute TTL)
// ---------------------------------------------------------------------------
interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

// ---------------------------------------------------------------------------
// Deterministic mock odds from team names
// ---------------------------------------------------------------------------
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

function generateMockOdds(homeTeam: string, awayTeam: string): MatchOdds {
  const h = simpleHash(homeTeam + awayTeam);
  // Generate realistic-ish odds
  const homeBase = 1.4 + (h % 30) / 10; // 1.4 - 4.4
  const drawBase = 2.8 + ((h >> 4) % 20) / 10; // 2.8 - 4.8
  const awayBase = 1.6 + ((h >> 8) % 35) / 10; // 1.6 - 5.1

  return {
    home: Math.round(homeBase * 100) / 100,
    draw: Math.round(drawBase * 100) / 100,
    away: Math.round(awayBase * 100) / 100,
    bookmaker: "mock",
  };
}

// ---------------------------------------------------------------------------
// API function
// ---------------------------------------------------------------------------

export async function getOdds(
  sportKey: string = "soccer_epl",
  matchTeams?: { home: string; away: string }
): Promise<MatchOdds[]> {
  const cacheKey = `odds:${sportKey}:${matchTeams?.home || ""}:${matchTeams?.away || ""}`;
  const cached = getCached<MatchOdds[]>(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  if (!apiKey) {
    // Return mock odds
    if (matchTeams) {
      const mock = [generateMockOdds(matchTeams.home, matchTeams.away)];
      setCache(cacheKey, mock);
      // Persist mock snapshot to Postgres for history
      persistOddsSnapshot(matchTeams.home, matchTeams.away, sportKey, mock[0]).catch(() => {});
      return mock;
    }
    return [generateMockOdds("Home Team", "Away Team")];
  }

  try {
    const url = `${BASE_URL}/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`[Odds] API returned ${res.status}, using mock data`);
      if (matchTeams) return [generateMockOdds(matchTeams.home, matchTeams.away)];
      return [];
    }

    const data = (await res.json()) as Array<{
      home_team: string;
      away_team: string;
      bookmakers: Array<{
        key: string;
        markets: Array<{
          key: string;
          outcomes: Array<{ name: string; price: number }>;
        }>;
      }>;
    }>;

    const results: MatchOdds[] = [];

    for (const event of data) {
      // If matchTeams specified, filter to that match
      if (matchTeams) {
        const homeMatch =
          event.home_team.toLowerCase().includes(matchTeams.home.toLowerCase()) ||
          matchTeams.home.toLowerCase().includes(event.home_team.toLowerCase());
        const awayMatch =
          event.away_team.toLowerCase().includes(matchTeams.away.toLowerCase()) ||
          matchTeams.away.toLowerCase().includes(event.away_team.toLowerCase());
        if (!homeMatch || !awayMatch) continue;
      }

      const bookmaker = event.bookmakers[0];
      if (!bookmaker) continue;

      const h2hMarket = bookmaker.markets.find((m) => m.key === "h2h");
      if (!h2hMarket) continue;

      const outcomes = h2hMarket.outcomes;
      const homeOdds = outcomes.find((o) => o.name === event.home_team)?.price || 2.0;
      const awayOdds = outcomes.find((o) => o.name === event.away_team)?.price || 3.0;
      const drawOdds = outcomes.find((o) => o.name === "Draw")?.price || 3.5;

      const oddsEntry: MatchOdds = {
        home: homeOdds,
        draw: drawOdds,
        away: awayOdds,
        bookmaker: bookmaker.key,
      };

      results.push(oddsEntry);

      // Persist each real odds snapshot to Postgres
      persistOddsSnapshot(
        event.home_team,
        event.away_team,
        sportKey,
        oddsEntry,
      ).catch(() => {});
    }

    if (results.length === 0 && matchTeams) {
      results.push(generateMockOdds(matchTeams.home, matchTeams.away));
    }

    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.warn("[Odds] API failed, using mock data:", err instanceof Error ? err.message : err);
    if (matchTeams) return [generateMockOdds(matchTeams.home, matchTeams.away)];
    return [];
  }
}

/**
 * Get odds for a specific match by team names.
 */
export async function getMatchOdds(homeTeam: string, awayTeam: string): Promise<MatchOdds> {
  const results = await getOdds("soccer_epl", { home: homeTeam, away: awayTeam });
  return results[0] || generateMockOdds(homeTeam, awayTeam);
}

/**
 * Get historical odds snapshots for a match from Postgres.
 */
export async function getOddsHistory(
  homeTeam: string,
  awayTeam: string,
  limit: number = 50,
): Promise<Array<MatchOdds & { fetchedAt: string }>> {
  const p = getPool();
  if (!p || !dbAvailable) return [];
  try {
    const result = await p.query(
      `SELECT home_odds, draw_odds, away_odds, bookmaker, fetched_at
       FROM odds_history
       WHERE home_team = $1 AND away_team = $2
       ORDER BY fetched_at DESC
       LIMIT $3`,
      [homeTeam, awayTeam, limit],
    );
    return result.rows.map((r: any) => ({
      home: parseFloat(r.home_odds),
      draw: parseFloat(r.draw_odds),
      away: parseFloat(r.away_odds),
      bookmaker: r.bookmaker,
      fetchedAt: r.fetched_at,
    }));
  } catch {
    return [];
  }
}
