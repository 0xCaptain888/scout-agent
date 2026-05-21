// ---------------------------------------------------------------------------
// Odds data fetcher - The Odds API (https://api.the-odds-api.com/v4)
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

      results.push({
        home: homeOdds,
        draw: drawOdds,
        away: awayOdds,
        bookmaker: bookmaker.key,
      });
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
