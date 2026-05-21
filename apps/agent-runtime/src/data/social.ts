// ---------------------------------------------------------------------------
// Social sentiment (deterministic, hash-based)
// ---------------------------------------------------------------------------

/**
 * DJB2a hash producing a 32-bit unsigned integer from a string.
 */
function djb2a(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // ensure unsigned
}

/**
 * Derive multiple independent pseudo-random values from a single seed hash
 * by mixing the seed with different constants (xorshift-style).
 */
function mixHash(seed: number, round: number): number {
  let h = seed ^ (round * 0x9e3779b9);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Map a 32-bit hash to a float in [lo, hi].
 */
function hashToRange(hash: number, lo: number, hi: number): number {
  return lo + (hash / 0xffffffff) * (hi - lo);
}

/**
 * Get deterministic social sentiment for a team.
 *
 * Returns a value between -1 (very negative) and 1 (very positive).
 * The result is fully deterministic for a given team name, but exhibits
 * realistic variation across teams:
 *   - A base popularity factor (most teams cluster around 0, a few polarise)
 *   - A "form" modifier simulating recent run of results
 *   - A small volatility wobble
 */
export function getTeamSentiment(teamName: string): number {
  const key = teamName.toLowerCase().trim();
  const seed = djb2a(key);

  // Base sentiment: mild sigmoid so most teams sit near centre
  const baseRaw = hashToRange(mixHash(seed, 1), -1, 1);
  const base = Math.tanh(baseRaw * 1.2);

  // Form modifier: [-0.35, +0.35]
  const form = hashToRange(mixHash(seed, 2), -0.35, 0.35);

  // Small volatility wobble: [-0.1, +0.1]
  const wobble = hashToRange(mixHash(seed, 3), -0.1, 0.1);

  const raw = base * 0.55 + form + wobble;
  const clamped = Math.max(-1, Math.min(1, raw));
  return Math.round(clamped * 100) / 100;
}

/**
 * Get sentiment comparison between two teams.
 */
export function getMatchSentiment(
  homeTeam: string,
  awayTeam: string,
): { home: number; away: number; delta: number } {
  const home = getTeamSentiment(homeTeam);
  const away = getTeamSentiment(awayTeam);
  return {
    home,
    away,
    delta: Math.round((home - away) * 100) / 100,
  };
}
