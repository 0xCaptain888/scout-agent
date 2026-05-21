// ---------------------------------------------------------------------------
// Sports data fetcher - football-data.org API v4
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.football-data.org/v4";

function getApiKey(): string {
  return process.env.FOOTBALL_DATA_API_KEY || "";
}

function headers(): Record<string, string> {
  const key = getApiKey();
  return key ? { "X-Auth-Token": key } : {};
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Fixture {
  id: number;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  utcDate: string;
  status: string;
  score: {
    home: number | null;
    away: number | null;
  };
  matchday: number | null;
}

// ---------------------------------------------------------------------------
// In-memory cache (5-minute TTL)
// ---------------------------------------------------------------------------
interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
// Mock data fallback
// ---------------------------------------------------------------------------
function mockFixtures(): Fixture[] {
  const now = Date.now();
  return [
    {
      id: 90001,
      competition: "Premier League",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      utcDate: new Date(now + 2 * 3600_000).toISOString(),
      status: "SCHEDULED",
      score: { home: null, away: null },
      matchday: 30,
    },
    {
      id: 90002,
      competition: "Premier League",
      homeTeam: "Manchester United",
      awayTeam: "Liverpool",
      utcDate: new Date(now + 6 * 3600_000).toISOString(),
      status: "SCHEDULED",
      score: { home: null, away: null },
      matchday: 30,
    },
    {
      id: 90003,
      competition: "La Liga",
      homeTeam: "Real Madrid",
      awayTeam: "Barcelona",
      utcDate: new Date(now + 24 * 3600_000).toISOString(),
      status: "SCHEDULED",
      score: { home: null, away: null },
      matchday: 28,
    },
    {
      id: 90004,
      competition: "Serie A",
      homeTeam: "AC Milan",
      awayTeam: "Juventus",
      utcDate: new Date(now + 48 * 3600_000).toISOString(),
      status: "SCHEDULED",
      score: { home: null, away: null },
      matchday: 32,
    },
  ];
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

function parseMatch(m: Record<string, unknown>): Fixture {
  const comp = m.competition as Record<string, unknown> | undefined;
  const homeTeam = m.homeTeam as Record<string, unknown> | undefined;
  const awayTeam = m.awayTeam as Record<string, unknown> | undefined;
  const score = m.score as Record<string, unknown> | undefined;
  const fullTime = score?.fullTime as Record<string, unknown> | undefined;

  return {
    id: (m.id as number) || 0,
    competition: (comp?.name as string) || "Unknown",
    homeTeam: (homeTeam?.name as string) || "Unknown",
    awayTeam: (awayTeam?.name as string) || "Unknown",
    utcDate: (m.utcDate as string) || new Date().toISOString(),
    status: (m.status as string) || "SCHEDULED",
    score: {
      home: (fullTime?.home as number) ?? null,
      away: (fullTime?.away as number) ?? null,
    },
    matchday: (m.matchday as number) ?? null,
  };
}

export async function getFixtures(from: string, to: string): Promise<Fixture[]> {
  const cacheKey = `fixtures:${from}:${to}`;
  const cached = getCached<Fixture[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/matches?dateFrom=${from}&dateTo=${to}`;
    const res = await fetch(url, { headers: headers() });

    if (!res.ok) {
      console.warn(`[Sports] API returned ${res.status}, using mock data`);
      return mockFixtures();
    }

    const data = (await res.json()) as { matches?: Record<string, unknown>[] };
    const matches = (data.matches || []).map(parseMatch);
    setCache(cacheKey, matches);
    return matches;
  } catch (err) {
    console.warn("[Sports] API failed, using mock data:", err instanceof Error ? err.message : err);
    return mockFixtures();
  }
}

export async function getFixture(id: number): Promise<Fixture | null> {
  const cacheKey = `fixture:${id}`;
  const cached = getCached<Fixture>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/matches/${id}`;
    const res = await fetch(url, { headers: headers() });

    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, unknown>;
    const fixture = parseMatch(data);
    setCache(cacheKey, fixture);
    return fixture;
  } catch {
    return null;
  }
}

export async function getH2H(teamA: string, teamB: string): Promise<Fixture[]> {
  // football-data.org doesn't have a direct H2H endpoint by team name,
  // so we return mock H2H data for hackathon purposes
  const cacheKey = `h2h:${teamA}:${teamB}`;
  const cached = getCached<Fixture[]>(cacheKey);
  if (cached) return cached;

  const mockH2H: Fixture[] = [
    {
      id: 80001,
      competition: "Previous Meeting",
      homeTeam: teamA,
      awayTeam: teamB,
      utcDate: new Date(Date.now() - 90 * 86400_000).toISOString(),
      status: "FINISHED",
      score: { home: 2, away: 1 },
      matchday: null,
    },
    {
      id: 80002,
      competition: "Previous Meeting",
      homeTeam: teamB,
      awayTeam: teamA,
      utcDate: new Date(Date.now() - 180 * 86400_000).toISOString(),
      status: "FINISHED",
      score: { home: 1, away: 1 },
      matchday: null,
    },
  ];

  setCache(cacheKey, mockH2H);
  return mockH2H;
}

/**
 * Get upcoming fixtures (next 7 days). Convenience wrapper.
 */
export async function getUpcomingFixtures(): Promise<Fixture[]> {
  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 7 * 86400_000).toISOString().slice(0, 10);
  return getFixtures(from, to);
}
