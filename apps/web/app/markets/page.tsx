'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACTS, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import clsx from 'clsx';
import { Filter, BarChart3, Clock, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';

const FILTERS = ['All', 'Open', 'Locked', 'Resolved'] as const;
const STATUS_MAP = ['Open', 'Locked', 'Resolved'] as const;

function MarketStatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    Open: 'text-neon-green bg-neon-green/10 border-neon-green/30',
    Locked: 'text-neon-orange bg-neon-orange/10 border-neon-orange/30',
    Resolved: 'text-muted bg-muted/10 border-muted/30',
  };
  return (
    <span className={clsx('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-medium', statusColors[status] || statusColors.Open)}>
      {status}
    </span>
  );
}

interface OnChainMarket {
  id: number;
  matchId: string;
  startTime: number;
  status: string;
  resolvedOutcome: number;
  totalHome: bigint;
  totalDraw: bigint;
  totalAway: bigint;
  totalPool: bigint;
}

export default function MarketsPage() {
  const [filter, setFilter] = useState<string>('All');

  // Read total markets count
  const { data: totalMarketsData, isLoading: loadingCount } = useReadContract({
    address: CONTRACTS.PredictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'totalMarkets',
  });

  const totalMarkets = totalMarketsData !== undefined ? Number(totalMarketsData as bigint) : 0;

  // Build array of market IDs (1-based)
  const marketIds = useMemo(() => {
    if (!totalMarkets) return [];
    return Array.from({ length: Math.min(totalMarkets, 50) }, (_, i) => i + 1);
  }, [totalMarkets]);

  // Batch read all market data
  const { data: marketsRaw, isLoading: loadingMarkets } = useReadContracts({
    contracts: marketIds.map((id) => ({
      address: CONTRACTS.PredictionMarket,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getMarket' as const,
      args: [BigInt(id)],
    })),
  });

  // Parse market data
  const markets: OnChainMarket[] = useMemo(() => {
    if (!marketsRaw) return [];
    return marketsRaw
      .map((result, i) => {
        if (result.status !== 'success' || !result.result) return null;
        const m = result.result as {
          matchId: `0x${string}`;
          startTime: bigint;
          status: number;
          resolvedOutcome: number;
          totalHome: bigint;
          totalDraw: bigint;
          totalAway: bigint;
          totalPool: bigint;
        };
        return {
          id: marketIds[i],
          matchId: m.matchId,
          startTime: Number(m.startTime),
          status: STATUS_MAP[m.status] || 'Open',
          resolvedOutcome: m.resolvedOutcome,
          totalHome: m.totalHome,
          totalDraw: m.totalDraw,
          totalAway: m.totalAway,
          totalPool: m.totalPool,
        };
      })
      .filter(Boolean) as OnChainMarket[];
  }, [marketsRaw, marketIds]);

  const filtered = filter === 'All' ? markets : markets.filter((m) => m.status === filter);
  const isLoading = loadingCount || loadingMarkets;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-neon-green" />
                Markets
              </h1>
              <p className="text-muted mt-1 text-sm">
                {isLoading ? 'Loading...' : `${totalMarkets} total markets on-chain`}
              </p>
            </div>

            <div className="flex items-center gap-1 bg-surface rounded-lg border border-border p-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    'px-3 py-1.5 rounded text-xs font-medium transition-all',
                    filter === f
                      ? 'bg-neon-green/10 text-neon-green'
                      : 'text-muted hover:text-white'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-neon-green animate-spin" />
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((market, i) => {
              const totalPool = market.totalHome + market.totalDraw + market.totalAway;
              const totalPoolEth = Number(formatEther(totalPool));
              const homeEth = Number(formatEther(market.totalHome));
              const drawEth = Number(formatEther(market.totalDraw));
              const awayEth = Number(formatEther(market.totalAway));
              const homePct = totalPoolEth > 0 ? (homeEth / totalPoolEth) * 100 : 33;
              const drawPct = totalPoolEth > 0 ? (drawEth / totalPoolEth) * 100 : 33;
              const awayPct = 100 - homePct - drawPct;
              const kickoffDate = new Date(market.startTime * 1000);
              const timeStr = kickoffDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = kickoffDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
              const matchIdShort = market.matchId.slice(0, 10) + '...';

              return (
                <motion.div
                  key={market.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="card-hover p-5 h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <MarketStatusBadge status={market.status} />
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <Clock className="h-3 w-3" />
                        <span className="mono">{dateStr} {timeStr}</span>
                      </div>
                    </div>

                    {/* Market ID and Match */}
                    <div className="mb-4">
                      <div className="text-lg font-bold text-white">Market #{market.id}</div>
                      <div className="text-[10px] mono text-muted mt-1">Match: {matchIdShort}</div>
                    </div>

                    {/* Pool distribution */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: 'HOME', value: homeEth, color: '#00FF87' },
                        { label: 'DRAW', value: drawEth, color: '#6B7280' },
                        { label: 'AWAY', value: awayEth, color: '#FF6B2C' },
                      ].map((o) => (
                        <div key={o.label} className="text-center p-2 rounded bg-background border border-border">
                          <div className="text-[10px] text-muted uppercase">{o.label}</div>
                          <div className="text-sm font-bold mono data-flicker" style={{ color: o.color }}>
                            {o.value.toFixed(2)}
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
                          <span className="text-[10px] mono text-muted">{totalPoolEth.toFixed(2)} OKB</span>
                        </div>
                        <span className="text-[10px] mono text-muted">{awayPct.toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* Resolved outcome */}
                    {market.status === 'Resolved' && (
                      <div className="mt-3 text-center text-xs text-muted border-t border-border pt-2">
                        Outcome: <span className="font-bold text-white">
                          {['HOME', 'DRAW', 'AWAY'][market.resolvedOutcome] || 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20">
            <Filter className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-muted">
              {totalMarkets === 0
                ? 'No markets created on-chain yet.'
                : 'No markets found for this filter.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
