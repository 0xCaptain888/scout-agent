// ---------------------------------------------------------------------------
// Social sentiment (mock / deterministic)
// ---------------------------------------------------------------------------

/**
 * Simple deterministic hash for consistent mock data.
 */
function stringHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Get mock social sentiment for a team.
 * Returns a value between -1 (very negative) and 1 (very positive).
 * Uses a deterministic hash of the team name for consistency.
 */
export function getTeamSentiment(teamName: string): number {
  const hash = stringHash(teamName.toLowerCase().trim());
  // Map hash to range [-1, 1] with some clustering around center
  const raw = ((hash % 2000) - 1000) / 1000;
  // Apply a mild sigmoid-like compression to keep values realistic
  const compressed = raw * 0.7 + Math.sin(raw * Math.PI) * 0.15;
  return Math.round(Math.max(-1, Math.min(1, compressed)) * 100) / 100;
}

/**
 * Get sentiment comparison between two teams.
 */
export function getMatchSentiment(
  homeTeam: string,
  awayTeam: string
): { home: number; away: number; delta: number } {
  const home = getTeamSentiment(homeTeam);
  const away = getTeamSentiment(awayTeam);
  return {
    home,
    away,
    delta: Math.round((home - away) * 100) / 100,
  };
}
