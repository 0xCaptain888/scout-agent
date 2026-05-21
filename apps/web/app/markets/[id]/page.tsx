'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { generateMockMarkets, generateMockTxFeed } from '@/lib/api';
import clsx from 'clsx';
import { Clock, TrendingUp, ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = parseInt(params.id as string);
  const markets = generateMockMarkets();
  const market = markets.find((m) => m.id === marketId) || markets[0];
  const recentBets = generateMockTxFeed().slice(0, 10);

  const [selectedOutcome, setSelectedOutcome] = useState<'HOME' | 'DRAW' | 'AWAY' | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [placing, setPlacing] = useState(false);

  const totalStake = parseFloat(market.homeStake) + parseFloat(market.drawStake) + parseFloat(market.awayStake);

  const outcomes = [
    { key: 'HOME' as const, team: market.homeTeam, odds: market.homeOdds, stake: market.homeStake, color: '#00FF87', pct: (parseFloat(market.homeStake) / totalStake * 100) },
    { key: 'DRAW' as const, team: 'Draw', odds: market.drawOdds, stake: market.drawStake, color: '#6B7280', pct: (parseFloat(market.drawStake) / totalStake * 100) },
    { key: 'AWAY' as const, team: market.awayTeam, odds: market.awayOdds, stake: market.awayStake, color: '#FF6B2C', pct: (parseFloat(market.awayStake) / totalStake * 100) },
  ];

  async function handlePlaceBet() {
    if (!selectedOutcome || !betAmount) return;
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setPlacing(false);
    alert(`Bet placed! (Mock) ${betAmount} OKB on ${selectedOutcome}`);
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/markets" className="inline-flex items-center gap-2 text-sm text-muted hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Markets
        </Link>

        {/* Match Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <span className={clsx(
              'text-xs uppercase tracking-wider px-3 py-1 rounded-full border font-medium',
              market.status === 'Open' ? 'text-neon-green bg-neon-green/10 border-neon-green/30' : 'text-neon-orange bg-neon-orange/10 border-neon-orange/30'
            )}>
              {market.status}
            </span>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Clock className="h-4 w-4" />
              <span className="mono">{new Date(market.kickoff * 1000).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-3xl md:text-5xl font-black text-white">{market.homeTeam}</div>
              <div className="text-sm text-muted mt-2">HOME</div>
            </div>
            <div className="text-2xl font-bold text-muted">VS</div>
            <div className="text-center">
              <div className="text-3xl md:text-5xl font-black text-white">{market.awayTeam}</div>
              <div className="text-sm text-muted mt-2">AWAY</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-6">
            <TrendingUp className="h-4 w-4 text-neon-green" />
            <span className="text-sm mono text-muted">Total Volume: <span className="text-neon-green font-medium">{totalStake.toFixed(2)} OKB</span></span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Outcome Columns */}
          {outcomes.map((o, i) => (
            <motion.div
              key={o.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <button
                onClick={() => setSelectedOutcome(o.key)}
                className={clsx(
                  'card w-full p-6 text-center transition-all',
                  selectedOutcome === o.key
                    ? 'ring-2'
                    : 'hover:border-opacity-40'
                )}
                style={selectedOutcome === o.key ? {
                  borderColor: o.color + '60',
                  boxShadow: `0 0 20px ${o.color}20`,
                  ringColor: o.color,
                } : undefined}
              >
                <div className="text-sm text-muted uppercase tracking-wider mb-2">{o.key}</div>
                <div className="text-2xl font-bold mb-1" style={{ color: o.color }}>{o.team}</div>
                <div className="text-4xl font-black mono data-flicker mb-3" style={{ color: o.color }}>
                  {o.odds.toFixed(2)}
                </div>
                <div className="text-xs text-muted">
                  Stake: <span className="mono text-white">{o.stake} OKB</span>
                </div>
                <div className="mt-3 h-2 bg-background rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${o.pct}%`, backgroundColor: o.color + '80' }} />
                </div>
                <div className="text-[10px] mono mt-1" style={{ color: o.color }}>{o.pct.toFixed(1)}%</div>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Bet Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6 mb-8">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-neon-orange" />
            Place Bet
          </h3>
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-xs text-muted mb-1 block">Selected Outcome</label>
              <div className="bg-background border border-border rounded-lg px-4 py-3 text-sm mono">
                {selectedOutcome || 'Select above'}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Amount (OKB)</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm mono text-white focus:outline-none focus:border-neon-green/40"
              />
            </div>
            <button
              onClick={handlePlaceBet}
              disabled={!selectedOutcome || !betAmount || placing}
              className={clsx('btn-primary flex items-center justify-center gap-2', (!selectedOutcome || !betAmount) && 'opacity-50 cursor-not-allowed')}
            >
              {placing ? (
                <div className="h-5 w-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : (
                'Place Bet'
              )}
            </button>
          </div>
          {selectedOutcome && betAmount && (
            <div className="mt-3 text-xs text-muted">
              Potential return: <span className="mono text-neon-green font-medium">
                {(parseFloat(betAmount) * (outcomes.find(o => o.key === selectedOutcome)?.odds || 0)).toFixed(3)} OKB
              </span>
            </div>
          )}
        </motion.div>

        {/* Recent Bets */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Recent Bets</h3>
          <div className="space-y-2">
            {recentBets.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs mono text-muted">#{tx.agentId}</span>
                  <span className={clsx(
                    'text-xs font-bold mono',
                    tx.outcome === 'HOME' ? 'text-neon-green' : tx.outcome === 'AWAY' ? 'text-neon-orange' : 'text-muted'
                  )}>
                    {tx.outcome}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs mono text-neon-green">{tx.amount} OKB</span>
                  <div className="text-[10px] mono text-muted">{tx.txHash.slice(0, 10)}...</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
