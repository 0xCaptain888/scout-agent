'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { STYLE_COLORS, type StrategyStyle } from '@/lib/contracts';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

// Mock agent data
function getMockAgent(id: number) {
  const styles: StrategyStyle[] = ['ATTACKING', 'DEFENSIVE', 'DATA_DRIVEN', 'CONTRARIAN', 'MOMENTUM'];
  const style = styles[id % 5];
  return {
    id,
    owner: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    style,
    riskLevel: (id % 5) + 1,
    bankrollPercent: 10 + (id % 90),
    reputation: 50 + (id % 50),
    totalBets: 10 + (id % 100),
    totalWins: 5 + (id % 60),
    pnl: (Math.sin(id) * 10),
    favoriteTeams: ['Brazil', 'France'],
    strategyGene: `0x${id.toString(16).padStart(16, '0')}`,
  };
}

function getMockHistory() {
  const outcomes = ['HOME', 'DRAW', 'AWAY'];
  const matches = ['BRA v ARG', 'FRA v GER', 'ENG v ESP', 'POR v NED'];
  return Array.from({ length: 15 }, (_, i) => {
    const won = Math.random() > 0.4;
    return {
      id: i,
      match: matches[Math.floor(Math.random() * matches.length)],
      outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
      amount: (Math.random() * 2 + 0.1).toFixed(3),
      won,
      pnlChange: won ? +(Math.random() * 3).toFixed(3) : -(Math.random() * 2).toFixed(3),
      timestamp: Date.now() - (i * 3600000) - Math.random() * 1800000,
    };
  });
}

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = parseInt(params.id as string) || 4521;
  const agent = getMockAgent(agentId);
  const history = getMockHistory();
  const styleColor = STYLE_COLORS[agent.style];
  const pnlPositive = agent.pnl >= 0;
  const winRate = agent.totalBets > 0 ? ((agent.totalWins / agent.totalBets) * 100).toFixed(1) : '0';

  const [depositAmount, setDepositAmount] = useState('');

  // Sparkline
  const sparkData = Array.from({ length: 20 }, (_, i) => Math.sin(i * 0.5 + agentId) * 5 + agent.pnl * (i / 20));
  const maxY = Math.max(...sparkData.map(Math.abs)) + 1;
  const sparkPoints = sparkData.map((v, i) => `${(i / 19) * 280},${30 - (v / maxY) * 25}`).join(' ');

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/markets" className="inline-flex items-center gap-2 text-sm text-muted hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Agent Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
            <div className="card overflow-hidden sticky top-24">
              <div
                className="relative aspect-square flex flex-col items-center justify-center p-6"
                style={{
                  background: `radial-gradient(circle at 30% 20%, ${styleColor}20, transparent 60%), #12121A`,
                }}
              >
                <div className="absolute inset-0 terminal-grid opacity-20" />
                <div className="relative text-center">
                  <div className="text-6xl font-black mono" style={{ color: styleColor }}>#{agent.id}</div>
                  <div className="mt-2 text-sm uppercase tracking-[0.3em] text-muted">{agent.style.replace('_', ' ')}</div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Owner</span>
                  <span className="mono text-xs text-white">{agent.owner.slice(0, 6)}...{agent.owner.slice(-4)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Strategy Gene</span>
                  <span className="mono text-xs text-neon-green/60">{agent.strategyGene.slice(0, 10)}...</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Risk Level</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <div key={l} className={clsx('h-3 w-3 rounded-sm', l <= agent.riskLevel ? (l > 3 ? 'bg-neon-orange' : 'bg-neon-green') : 'bg-border')} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Bankroll %</span>
                  <span className="mono text-white">{agent.bankrollPercent}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Reputation</span>
                  <span className="mono text-neon-green">{agent.reputation}/100</span>
                </div>

                {/* Bankroll management */}
                <div className="border-t border-border pt-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-neon-orange" /> Bankroll
                  </h4>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Amount (OKB)"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mono focus:outline-none focus:border-neon-green/40"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn-primary !py-2 text-xs">Deposit</button>
                    <button className="btn-secondary !py-2 text-xs">Withdraw</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats + History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'PnL', value: `${pnlPositive ? '+' : ''}${agent.pnl.toFixed(3)}`, suffix: ' OKB', color: pnlPositive ? 'text-neon-green' : 'text-red-400' },
                  { label: 'Win Rate', value: winRate, suffix: '%', color: 'text-white' },
                  { label: 'Total Bets', value: agent.totalBets.toString(), color: 'text-white' },
                  { label: 'Wins', value: agent.totalWins.toString(), color: 'text-neon-green' },
                ].map((s) => (
                  <div key={s.label} className="card p-4 text-center">
                    <div className="text-xs text-muted uppercase tracking-wider mb-1">{s.label}</div>
                    <div className={clsx('text-xl font-bold mono data-flicker', s.color)}>
                      {s.value}{s.suffix}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* PnL Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-neon-green" /> PnL History
              </h3>
              <svg width="100%" height="60" viewBox="0 0 280 60" preserveAspectRatio="none">
                <line x1="0" y1="30" x2="280" y2="30" stroke="#1E1E2A" strokeWidth="0.5" />
                <polyline points={sparkPoints} fill="none" stroke={pnlPositive ? '#00FF87' : '#EF4444'} strokeWidth="2" />
              </svg>
            </motion.div>

            {/* Decision History */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-neon-orange" /> Decision History
              </h3>
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className={clsx('w-6 h-6 rounded flex items-center justify-center flex-shrink-0', h.won ? 'bg-neon-green/10' : 'bg-red-400/10')}>
                      {h.won ? <ArrowUpRight className="h-3 w-3 text-neon-green" /> : <ArrowDownRight className="h-3 w-3 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white font-medium">{h.match}</span>
                        <span className={clsx('text-xs mono font-bold', h.outcome === 'HOME' ? 'text-neon-green' : h.outcome === 'AWAY' ? 'text-neon-orange' : 'text-muted')}>
                          {h.outcome}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted mono">{new Date(h.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs mono text-white">{h.amount} OKB</div>
                      <div className={clsx('text-[10px] mono font-medium', h.won ? 'text-neon-green' : 'text-red-400')}>
                        {h.won ? '+' : ''}{h.pnlChange} OKB
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
