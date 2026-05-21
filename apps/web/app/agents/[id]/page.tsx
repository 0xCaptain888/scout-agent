'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import {
  STYLE_COLORS, STRATEGY_STYLES, CONTRACTS,
  AGENT_REGISTRY_ABI, RANKING_BOARD_ABI,
  type StrategyStyle,
} from '@/lib/contracts';
import { ArrowLeft, TrendingUp, Clock, Wallet, Loader2 } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

// Decode strategy gene bits
function decodeGene(gene: bigint) {
  const riskLevel = Number(gene & BigInt(0x7));
  const styleIdx = Number((gene >> BigInt(3)) & BigInt(0x7));
  const bankrollPct = Number((gene >> BigInt(6)) & BigInt(0x7f));
  const style = STRATEGY_STYLES[styleIdx] || 'DATA_DRIVEN';
  return { riskLevel: riskLevel || 1, style: style as StrategyStyle, bankrollPct };
}

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = parseInt(params.id as string) || 1;
  const tokenId = BigInt(agentId);

  const [depositAmount, setDepositAmount] = useState('');

  // Read agent data from AgentRegistry
  const { data: geneData, isLoading: loadingGene } = useReadContract({
    address: CONTRACTS.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'geneOf',
    args: [tokenId],
  });

  const { data: ownerData } = useReadContract({
    address: CONTRACTS.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
  });

  const { data: walletData } = useReadContract({
    address: CONTRACTS.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'walletOf',
    args: [tokenId],
  });

  const { data: bankrollData } = useReadContract({
    address: CONTRACTS.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'bankrollOf',
    args: [tokenId],
  });

  const { data: pausedData } = useReadContract({
    address: CONTRACTS.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'isPaused',
    args: [tokenId],
  });

  // Read stats from RankingBoard
  const { data: statsData, isLoading: loadingStats } = useReadContract({
    address: CONTRACTS.RankingBoard,
    abi: RANKING_BOARD_ABI,
    functionName: 'getStats',
    args: [tokenId],
  });

  // Parse data
  const gene = geneData as bigint | undefined;
  const decoded = gene !== undefined ? decodeGene(gene) : null;
  const owner = ownerData as `0x${string}` | undefined;
  const agentWallet = walletData as `0x${string}` | undefined;
  const bankroll = bankrollData as bigint | undefined;
  const isPaused = pausedData as boolean | undefined;

  const stats = statsData as [bigint, bigint, bigint] | undefined;
  const wins = stats ? Number(stats[0]) : 0;
  const losses = stats ? Number(stats[1]) : 0;
  const totalPnl = stats ? stats[2] : BigInt(0);
  const totalBets = wins + losses;
  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : '0.0';
  const pnlValue = Number(formatEther(totalPnl));
  const pnlPositive = pnlValue >= 0;

  const styleVal = decoded?.style || 'DATA_DRIVEN';
  const styleColor = STYLE_COLORS[styleVal];
  const isLoading = loadingGene || loadingStats;

  // Check if agent exists (ownerData would fail if not)
  const agentExists = owner !== undefined && owner !== '0x0000000000000000000000000000000000000000';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-neon-green animate-spin" />
      </div>
    );
  }

  if (!agentExists && !isLoading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/markets" className="inline-flex items-center gap-2 text-sm text-muted hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="text-center py-20">
            <div className="text-6xl font-black mono text-muted mb-4">#{agentId}</div>
            <p className="text-muted">This agent does not exist on-chain yet.</p>
          </div>
        </div>
      </div>
    );
  }

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
                  <div className="text-6xl font-black mono" style={{ color: styleColor }}>#{agentId}</div>
                  <div className="mt-2 text-sm uppercase tracking-[0.3em] text-muted">{styleVal.replace('_', ' ')}</div>
                  {isPaused && (
                    <div className="mt-2 text-xs px-2 py-0.5 rounded-full bg-red-400/10 border border-red-400/30 text-red-400 inline-block">
                      PAUSED
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Owner</span>
                  <span className="mono text-xs text-white">
                    {owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : '...'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Agent Wallet</span>
                  <span className="mono text-xs text-neon-green/60">
                    {agentWallet ? `${agentWallet.slice(0, 6)}...${agentWallet.slice(-4)}` : '...'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Strategy Gene</span>
                  <span className="mono text-xs text-neon-green/60">
                    {gene !== undefined ? `0x${gene.toString(16).padStart(16, '0').slice(0, 10)}...` : '...'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Risk Level</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <div key={l} className={clsx('h-3 w-3 rounded-sm', l <= (decoded?.riskLevel || 0) ? (l > 3 ? 'bg-neon-orange' : 'bg-neon-green') : 'bg-border')} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Bankroll %</span>
                  <span className="mono text-white">{decoded?.bankrollPct || 0}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Bankroll Balance</span>
                  <span className="mono text-neon-green">
                    {bankroll !== undefined ? `${formatEther(bankroll)} USDT` : '...'}
                  </span>
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
                    placeholder="Amount (USDT)"
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

          {/* Stats + Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'PnL', value: `${pnlPositive ? '+' : ''}${pnlValue.toFixed(3)}`, suffix: ' USDT', color: pnlPositive ? 'text-neon-green' : 'text-red-400' },
                  { label: 'Win Rate', value: winRate, suffix: '%', color: 'text-white' },
                  { label: 'Total Bets', value: totalBets.toString(), suffix: '', color: 'text-white' },
                  { label: 'Wins', value: wins.toString(), suffix: '', color: 'text-neon-green' },
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

            {/* On-Chain Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-neon-green" /> On-Chain Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Token ID</span>
                  <span className="mono text-white">{agentId}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Losses</span>
                  <span className="mono text-red-400">{losses}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Status</span>
                  <span className={clsx('mono text-xs font-medium', isPaused ? 'text-red-400' : 'text-neon-green')}>
                    {isPaused ? 'Paused' : 'Active'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Full Gene (hex)</span>
                  <span className="mono text-xs text-muted break-all">
                    {gene !== undefined ? `0x${gene.toString(16)}` : '...'}
                  </span>
                </div>
                {owner && (
                  <div className="text-sm">
                    <span className="text-muted">Owner: </span>
                    <a
                      href={`https://www.oklink.com/xlayer-test/address/${owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono text-xs text-neon-green/70 hover:text-neon-green transition-colors"
                    >
                      {owner}
                    </a>
                  </div>
                )}
                {agentWallet && (
                  <div className="text-sm">
                    <span className="text-muted">Agent Wallet: </span>
                    <a
                      href={`https://www.oklink.com/xlayer-test/address/${agentWallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono text-xs text-neon-green/70 hover:text-neon-green transition-colors"
                    >
                      {agentWallet}
                    </a>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Info note */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-neon-orange" /> Activity
              </h3>
              <p className="text-sm text-muted">
                Decision history is derived from on-chain BetPlaced events. Connect to a subgraph or indexer for full historical data.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
