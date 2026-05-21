'use client';

import { type Market } from '@/lib/api';
import clsx from 'clsx';
import { Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface MarketCardProps {
  market: Market;
}

export default function MarketCard({ market }: MarketCardProps) {
  const totalStake = parseFloat(market.homeStake) + parseFloat(market.drawStake) + parseFloat(market.awayStake);
  const homePct = totalStake > 0 ? (parseFloat(market.homeStake) / totalStake) * 100 : 33;
  const drawPct = totalStake > 0 ? (parseFloat(market.drawStake) / totalStake) * 100 : 33;
  const awayPct = 100 - homePct - drawPct;

  const kickoffDate = new Date(market.kickoff * 1000);
  const timeStr = kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const statusColors = {
    Open: 'text-neon-green bg-neon-green/10 border-neon-green/30',
    Locked: 'text-neon-orange bg-neon-orange/10 border-neon-orange/30',
    Resolved: 'text-muted bg-muted/10 border-muted/30',
  };

  return (
    <Link href={`/markets/${market.id}`}>
      <div className="card-hover p-5 h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className={clsx('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-medium', statusColors[market.status])}>
            {market.status}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted">
            <Clock className="h-3 w-3" />
            <span className="mono">{timeStr}</span>
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between mb-5">
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-white">{market.homeTeam}</div>
            <div className="text-xs text-muted mt-1">HOME</div>
          </div>
          <div className="text-xs text-muted font-bold px-3">VS</div>
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-white">{market.awayTeam}</div>
            <div className="text-xs text-muted mt-1">AWAY</div>
          </div>
        </div>

        {/* Odds row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'HOME', odds: market.homeOdds, color: '#00FF87' },
            { label: 'DRAW', odds: market.drawOdds, color: '#6B7280' },
            { label: 'AWAY', odds: market.awayOdds, color: '#FF6B2C' },
          ].map((o) => (
            <div key={o.label} className="text-center p-2 rounded bg-background border border-border">
              <div className="text-[10px] text-muted uppercase">{o.label}</div>
              <div className="text-sm font-bold mono data-flicker" style={{ color: o.color }}>
                {o.odds.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Distribution bar */}
        <div className="space-y-1.5">
          <div className="flex h-2 rounded-full overflow-hidden bg-background">
            <div className="h-full bg-neon-green/70 transition-all" style={{ width: `${homePct}%` }} />
            <div className="h-full bg-muted/40 transition-all" style={{ width: `${drawPct}%` }} />
            <div className="h-full bg-neon-orange/70 transition-all" style={{ width: `${awayPct}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] mono text-muted">{homePct.toFixed(0)}%</span>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted" />
              <span className="text-[10px] mono text-muted">{totalStake.toFixed(2)} OKB</span>
            </div>
            <span className="text-[10px] mono text-muted">{awayPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
