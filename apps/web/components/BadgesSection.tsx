'use client';

import { useEffect, useState } from 'react';

interface Badge {
  teamId: number;
  teamName: string;
  earnedAt: number;
  marketId: string;
}

const TEAM_COLORS: Record<number, string> = {
  1: '#74ACDF', 2: '#0055A4', 3: '#FEDF00', 4: '#CE1124',
  5: '#AA151B', 6: '#FFCE00', 7: '#006600', 8: '#FF7F00',
  9: '#008C45', 10: '#FAE042', 11: '#7B9DD0', 12: '#FCD116',
  13: '#BC002D', 14: '#003478', 15: '#C1272D', 16: '#00853F',
  17: '#3C3B6E', 18: '#006847', 19: '#171796', 20: '#C60C30',
  21: '#00008B', 22: '#239F40', 23: '#FF0000', 24: '#006AA7',
};

const TEAM_SHORT: Record<number, string> = {
  1: 'ARG', 2: 'FRA', 3: 'BRA', 4: 'ENG', 5: 'ESP', 6: 'GER',
  7: 'POR', 8: 'NED', 9: 'ITA', 10: 'BEL', 11: 'URU', 12: 'COL',
  13: 'JPN', 14: 'KOR', 15: 'MAR', 16: 'SEN', 17: 'USA', 18: 'MEX',
  19: 'CRO', 20: 'DEN', 21: 'AUS', 22: 'IRN', 23: 'SUI', 24: 'SWE',
};

export function BadgesSection({ agentId }: { agentId: string }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runtimeUrl = process.env.NEXT_PUBLIC_AGENT_RUNTIME_URL || 'http://localhost:3001';
    fetch(`${runtimeUrl}/api/agents/${agentId}/badges`)
      .then(r => r.json())
      .then(data => {
        setBadges(data.badges || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [agentId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="animate-pulse h-20 bg-slate-800 rounded" />
      </div>
    );
  }

  // Group by team
  const byTeam = badges.reduce<Record<string, number>>((acc, b) => {
    const key = TEAM_SHORT[b.teamId] || `T${b.teamId}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-white flex items-center gap-2">
          <span className="text-lg">&#127941;</span> Earned Badges
        </h2>
        <span className="text-xs text-slate-400">{badges.length} total</span>
      </div>

      {badges.length === 0 ? (
        <p className="text-slate-500 text-center py-4 text-sm">
          No badges yet. This agent earns a badge each time it bets on the winning team.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byTeam).map(([team, count]) => {
              const teamId = Object.entries(TEAM_SHORT).find(([, v]) => v === team)?.[0];
              const color = teamId ? TEAM_COLORS[Number(teamId)] : '#888';
              return (
                <div
                  key={team}
                  className="flex items-center gap-2 rounded-full px-3 py-1.5"
                  style={{ backgroundColor: `${color}22`, border: `1px solid ${color}66` }}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-bold text-sm text-white">{team}</span>
                  <span className="text-xs" style={{ color }}>x{count}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-800 pt-3 text-xs text-slate-400">
            &#127942; World Cup Prize Pool share based on total badges earned across the tournament.
          </div>
        </>
      )}
    </div>
  );
}
