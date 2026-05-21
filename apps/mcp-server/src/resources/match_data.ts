import { apiGet } from "../clients.js";
import type { MatchData } from "../types.js";

export const matchDataResource = {
  uri: "xlayer://match/{matchId}",
  name: "Match Data",
  description:
    "Returns detailed match data for a given match ID, including team names, date, venue, and statistics.",
  mimeType: "application/json",
};

export async function handleMatchData(matchId: string) {
  const res = await apiGet<MatchData>(`/api/matches/${matchId}`);

  if (!res.ok) {
    return {
      contents: [
        {
          uri: `xlayer://match/${matchId}`,
          mimeType: "application/json",
          text: JSON.stringify({ error: `API error ${res.status}`, details: res.data }),
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri: `xlayer://match/${matchId}`,
        mimeType: "application/json",
        text: JSON.stringify(res.data, null, 2),
      },
    ],
  };
}
