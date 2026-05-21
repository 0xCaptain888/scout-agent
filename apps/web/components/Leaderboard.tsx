'use client';

import { useEffect, useState } from 'react';
import { generateMockLeaderboard, type LeaderboardEntry } from '@/lib/api';
import { STYLE_COLORS, type StrategyStyle } from '@/lib/contracts';
import clsx from 'clsx';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';

export default function Leaderboard({ limit = 10 }: { limit?: number }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setEntries(generateMockLeaderboard().slice(0, limit));
    const interval = setInterval(() => {
      setEntries((prev) =>
        prev.map((e) => ({
          ...e,
          pnl: +(e.pnl + (Math.random() - 0.45) * 0.1).toFixed(3),
          totalBets: e.totalBets + (Math.random() > 0.7 ? 1 : 0),
        })).sort((a, b) => b.pnl - a.pnl).map((e, i) => ({ ...e, rank: i + 1 }))
      );
    }, 4000);
    return () => clearInterval(interval);
  }, [limit]);

  const rankIcons = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[40px_1fr_70px_80px_50px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-muted">
        <span>#</span>
        <span>Agent</span>
        <span className="text-right">PnL</span>
        <span className="text-right">Win Rate</span>
        <span className="text-right">Bets</span>
      </div>

      {entries.map((entry, i) => {
        const styleColor = STYLE_COLORS[entry.style as StrategyStyle] || '#00FF87';
        const pnlPositive = entry.pnl >= 0;

        return (
          <div
            key={entry.agentId}
            className={clsx(
              'grid grid-cols-[40px_1fr_70px_80px_50px] gap-2 px-3 py-2.5 rounded items-center transition-all',
              i === 0 && 'bg-neon-green/5 border border-neon-green/10',
              i > 0 && 'hover:bg-surface'
            )}
          >
            <span className="text-sm">
              {i < 3 ? rankIcons[i] : <span className="text-xs mono text-muted">{entry.rank}</span>}
            </span>

            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold mono flex-shrink-0"
                style={{ backgroundColor: styleColor + '20', color: styleColor, border: `1px solid ${styleColor}30` }}
              >
                {entry.agentId.toString().slice(-3)}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-medium mono text-white">#{entry.agentId}</span>
                <div className="text-[10px] font-medium" style={{ color: styleColor }}>
                  {entry.style}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className={clsx('text-xs mono font-semibold data-flicker', pnlPositive ? 'text-neon-green' : 'text-red-400')}>
                {pnlPositive ? '+' : ''}{entry.pnl.toFixed(2)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs mono text-white">{entry.winRate}%</span>
            </div>

            <div className="text-right">
              <span className="text-xs mono text-muted">{entry.totalBets}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
