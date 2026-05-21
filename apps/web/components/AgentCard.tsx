'use client';

import { STYLE_COLORS, type StrategyStyle } from '@/lib/contracts';
import clsx from 'clsx';

interface AgentCardProps {
  id: number;
  style: string;
  riskLevel: number;
  pnl: number;
  winRate: number;
  totalBets: number;
  compact?: boolean;
  onClick?: () => void;
}

export default function AgentCard({
  id, style, riskLevel, pnl, winRate, totalBets, compact, onClick,
}: AgentCardProps) {
  const styleColor = STYLE_COLORS[style as StrategyStyle] || '#00FF87';
  const pnlPositive = pnl >= 0;

  // Mini sparkline (mock)
  const sparkPoints = Array.from({ length: 12 }, (_, i) => {
    const y = 20 + Math.sin(i * 0.8 + id) * 15 + (pnlPositive ? -i * 0.5 : i * 0.5);
    return `${i * 8},${y}`;
  }).join(' ');

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="card-hover p-3 flex items-center gap-3 cursor-pointer"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold mono"
          style={{ backgroundColor: styleColor + '20', color: styleColor, border: `1px solid ${styleColor}40` }}
        >
          #{id}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">Agent #{id}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium"
              style={{ backgroundColor: styleColor + '20', color: styleColor }}
            >
              {style}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className={clsx('text-xs mono', pnlPositive ? 'text-neon-green' : 'text-red-400')}>
              {pnlPositive ? '+' : ''}{pnl.toFixed(3)} OKB
            </span>
            <span className="text-xs text-muted">{winRate}% WR</span>
          </div>
        </div>
        <svg width="96" height="40" className="flex-shrink-0">
          <polyline
            points={sparkPoints}
            fill="none"
            stroke={pnlPositive ? '#00FF87' : '#EF4444'}
            strokeWidth="1.5"
            opacity="0.7"
          />
        </svg>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="card-hover p-5 cursor-pointer group">
      {/* Agent Visual */}
      <div className="relative mb-4">
        <div
          className="w-full aspect-square rounded-lg flex items-center justify-center relative overflow-hidden"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${styleColor}15, transparent 70%), #12121A`,
            border: `1px solid ${styleColor}30`,
          }}
        >
          <div className="text-center">
            <div className="text-4xl font-bold mono" style={{ color: styleColor }}>#{id}</div>
            <div className="text-xs text-muted mt-1 uppercase tracking-widest">{style}</div>
          </div>
          {/* Decorative grid */}
          <div className="absolute inset-0 terminal-grid opacity-30" />
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">PnL</span>
          <span className={clsx('text-sm mono font-semibold data-flicker', pnlPositive ? 'text-neon-green glow-green' : 'text-red-400')}>
            {pnlPositive ? '+' : ''}{pnl.toFixed(3)} OKB
          </span>
        </div>

        {/* Risk bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted">Risk Level</span>
            <span className="text-xs mono text-white">{riskLevel}/5</span>
          </div>
          <div className="h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(riskLevel / 5) * 100}%`,
                backgroundColor: riskLevel > 3 ? '#FF6B2C' : '#00FF87',
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">{totalBets} bets</span>
          <span className="text-muted">{winRate}% win rate</span>
        </div>

        {/* Sparkline */}
        <svg width="100%" height="30" className="mt-1">
          <polyline
            points={sparkPoints}
            fill="none"
            stroke={pnlPositive ? '#00FF87' : '#EF4444'}
            strokeWidth="1.5"
            opacity="0.6"
          />
        </svg>
      </div>
    </div>
  );
}
