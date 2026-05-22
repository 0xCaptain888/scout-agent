'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import {
  STYLE_COLORS, STRATEGY_STYLES, CONTRACTS,
  AGENT_REGISTRY_ABI, RANKING_BOARD_ABI, PREDICTION_MARKET_ABI,
  type StrategyStyle,
} from '@/lib/contracts';
import { ArrowLeft, TrendingUp, Clock, Wallet, Loader2, ExternalLink, Check, AlertCircle, Activity } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { BadgesSection } from '@/components/BadgesSection';

const EXPLORER_URL = 'https://www.oklink.com/xlayer-test';

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// Outcome labels and colors
const OUTCOME_LABELS: Record<number, string> = { 1: 'HOME', 2: 'DRAW', 3: 'AWAY' };
const OUTCOME_COLORS: Record<number, string> = {
  1: '#00FF87',
  2: '#EAB308',
  3: '#FF6B2C',
};

// Market status: 0 = Open, 1 = Closed, 2 = Resolved
const MARKET_STATUS: Record<number, string> = { 0: 'Open', 1: 'Closed', 2: 'Resolved' };

// --- Types ---
interface BetRecord {
  marketId: bigint;
  outcome: number;
  amount: bigint;
  txHash: string;
  blockNumber: bigint;
  status: 'Pending' | 'Won' | 'Lost';
  resolvedOutcome?: number;
}

interface PnlPoint {
  x: number;
  y: number;
  label: string;
}

// --- Gene decoder ---
function decodeGene(gene: bigint) {
  const riskLevel = Number(gene & BigInt(0x7));
  const styleIdx = Number((gene >> BigInt(3)) & BigInt(0x7));
  const bankrollPct = Number((gene >> BigInt(6)) & BigInt(0x7f));
  const style = STRATEGY_STYLES[styleIdx] || 'DATA_DRIVEN';
  return { riskLevel: riskLevel || 1, style: style as StrategyStyle, bankrollPct };
}

// --- Synthetic PnL curve generator ---
function generatePnlCurve(wins: number, losses: number, finalPnl: number): PnlPoint[] {
  const totalBets = wins + losses;
  if (totalBets === 0) return [{ x: 0, y: 0, label: 'Start' }];

  const points: PnlPoint[] = [{ x: 0, y: 0, label: 'Start' }];
  let cumPnl = 0;
  const avgWin = totalBets > 0 ? (Math.abs(finalPnl) + totalBets * 0.5) / Math.max(wins, 1) : 1;
  const avgLoss = totalBets > 0 ? (Math.abs(finalPnl) + totalBets * 0.3) / Math.max(losses, 1) : 1;

  // Create a shuffled sequence of wins/losses that ends at finalPnl
  const results: boolean[] = [];
  for (let i = 0; i < wins; i++) results.push(true);
  for (let i = 0; i < losses; i++) results.push(false);

  // Seed-based shuffle for consistency
  let seed = wins * 7 + losses * 13 + Math.abs(Math.round(finalPnl * 100));
  for (let i = results.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [results[i], results[j]] = [results[j], results[i]];
  }

  // Accumulate PnL, then scale to match final value
  const rawPoints: number[] = [];
  let rawCum = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i]) {
      rawCum += avgWin * (0.7 + (((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 100) / 100) * 0.6);
    } else {
      rawCum -= avgLoss * (0.7 + (((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 100) / 100) * 0.6);
    }
    rawPoints.push(rawCum);
  }

  // Scale so last point matches finalPnl
  const rawFinal = rawPoints[rawPoints.length - 1] || 1;
  const scale = rawFinal !== 0 ? finalPnl / rawFinal : 0;

  for (let i = 0; i < rawPoints.length; i++) {
    cumPnl = rawPoints[i] * scale;
    points.push({
      x: i + 1,
      y: Math.round(cumPnl * 1000) / 1000,
      label: `Bet #${i + 1}`,
    });
  }

  return points;
}

// --- PnL Chart Component (placeholder - will be filled in) ---
// SECTION: PnlChart component
function PnlChart({ points }: { points: PnlPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted">
        No betting data available yet
      </div>
    );
  }

  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 20, bottom: 30, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 0);
  const yRange = maxY - minY || 1;
  const xRange = maxX - minX || 1;

  const scaleX = (x: number) => padding.left + ((x - minX) / xRange) * chartW;
  const scaleY = (y: number) => padding.top + chartH - ((y - minY) / yRange) * chartH;

  const zeroY = scaleY(0);
  const finalPnl = points[points.length - 1].y;
  const lineColor = finalPnl >= 0 ? '#00FF87' : '#EF4444';
  const fillColor = finalPnl >= 0 ? '#00FF8715' : '#EF444415';

  // Build line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.x)},${scaleY(p.y)}`).join(' ');

  // Build area path (fill under curve to zero line)
  const areaPath = `${linePath} L${scaleX(points[points.length - 1].x)},${zeroY} L${scaleX(points[0].x)},${zeroY} Z`;

  // Grid lines (horizontal)
  const yTicks: number[] = [];
  const yStep = yRange / 4;
  for (let i = 0; i <= 4; i++) {
    yTicks.push(minY + yStep * i);
  }

  // X-axis ticks
  const xTicks: number[] = [];
  const xStep = Math.max(1, Math.floor(xRange / 5));
  for (let i = minX; i <= maxX; i += xStep) {
    xTicks.push(i);
  }
  if (xTicks[xTicks.length - 1] !== maxX) xTicks.push(maxX);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <g key={`grid-${i}`}>
          <line
            x1={padding.left}
            y1={scaleY(tick)}
            x2={width - padding.right}
            y2={scaleY(tick)}
            stroke="#ffffff10"
            strokeWidth={1}
          />
          <text
            x={padding.left - 8}
            y={scaleY(tick) + 4}
            fill="#6b7280"
            fontSize={10}
            textAnchor="end"
            fontFamily="monospace"
          >
            {tick.toFixed(2)}
          </text>
        </g>
      ))}

      {/* Zero line */}
      {minY < 0 && maxY > 0 && (
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="#ffffff30"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )}

      {/* X-axis ticks */}
      {xTicks.map((tick, i) => (
        <text
          key={`x-${i}`}
          x={scaleX(tick)}
          y={height - 6}
          fill="#6b7280"
          fontSize={10}
          textAnchor="middle"
          fontFamily="monospace"
        >
          #{tick}
        </text>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill={fillColor} />

      {/* Line */}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* End dot */}
      <circle
        cx={scaleX(points[points.length - 1].x)}
        cy={scaleY(points[points.length - 1].y)}
        r={4}
        fill={lineColor}
      />
      <circle
        cx={scaleX(points[points.length - 1].x)}
        cy={scaleY(points[points.length - 1].y)}
        r={7}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        opacity={0.4}
      />

      {/* Axis labels */}
      <text x={width / 2} y={height} fill="#6b7280" fontSize={10} textAnchor="middle">
        Bet Number
      </text>
      <text
        x={10}
        y={height / 2}
        fill="#6b7280"
        fontSize={10}
        textAnchor="middle"
        transform={`rotate(-90, 10, ${height / 2})`}
      >
        PnL (USDT)
      </text>
    </svg>
  );
}

// --- Decision History Row ---
function BetRow({ bet }: { bet: BetRecord }) {
  const outcomeLabel = OUTCOME_LABELS[bet.outcome] || `#${bet.outcome}`;
  const outcomeColor = OUTCOME_COLORS[bet.outcome] || '#9CA3AF';
  const statusColor =
    bet.status === 'Won' ? 'text-neon-green' : bet.status === 'Lost' ? 'text-red-400' : 'text-yellow-400';
  const statusBg =
    bet.status === 'Won'
      ? 'bg-neon-green/10 border-neon-green/20'
      : bet.status === 'Lost'
        ? 'bg-red-400/10 border-red-400/20'
        : 'bg-yellow-400/10 border-yellow-400/20';

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-xs mono text-muted whitespace-nowrap">MKT #{bet.marketId.toString()}</div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full border"
          style={{
            color: outcomeColor,
            backgroundColor: outcomeColor + '15',
            borderColor: outcomeColor + '30',
          }}
        >
          {outcomeLabel}
        </span>
        <span className="text-sm mono text-white">{formatEther(bet.amount)} USDT</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full border', statusBg, statusColor)}>
          {bet.status}
        </span>
        <a
          href={`${EXPLORER_URL}/tx/${bet.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-neon-green transition-colors"
          title="View on OKLink"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

// === MAIN PAGE COMPONENT ===
export default function AgentDetailPage() {
  const params = useParams();
  const agentId = parseInt(params.id as string) || 1;
  const tokenId = BigInt(agentId);
  const publicClient = usePublicClient();

  const [depositAmount, setDepositAmount] = useState('');
  const [txMode, setTxMode] = useState<'idle' | 'approve' | 'deposit' | 'withdraw'>('idle');
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [betsLoading, setBetsLoading] = useState(true);

  // --- Read agent data from AgentRegistry ---
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

  const { data: bankrollData, refetch: refetchBankroll } = useReadContract({
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

  // --- Read stats from RankingBoard ---
  const { data: statsData, isLoading: loadingStats } = useReadContract({
    address: CONTRACTS.RankingBoard,
    abi: RANKING_BOARD_ABI,
    functionName: 'getStats',
    args: [tokenId],
  });

  // --- Write contract hooks ---
  const {
    writeContract,
    data: txHash,
    isPending: isTxPending,
    error: txError,
    reset: resetTx,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // --- Parse data ---
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
  const agentExists = owner !== undefined && owner !== '0x0000000000000000000000000000000000000000';

  // --- PnL curve ---
  const pnlPoints = useMemo(() => generatePnlCurve(wins, losses, pnlValue), [wins, losses, pnlValue]);

  // --- Fetch bet events ---
  const fetchBets = useCallback(async () => {
    if (!publicClient) return;
    setBetsLoading(true);
    try {
      const logs = await publicClient.getLogs({
        address: CONTRACTS.PredictionMarket,
        event: {
          name: 'BetPlaced',
          type: 'event',
          inputs: [
            { name: 'marketId', type: 'uint256', indexed: true },
            { name: 'agentId', type: 'uint256', indexed: true },
            { name: 'outcome', type: 'uint8', indexed: false },
            { name: 'amount', type: 'uint256', indexed: false },
          ],
        },
        args: {
          agentId: tokenId,
        },
        fromBlock: BigInt(0),
        toBlock: 'latest',
      });

      // For each bet, check market status to determine win/loss
      const betRecords: BetRecord[] = await Promise.all(
        logs.map(async (log) => {
          const marketId = (log as any).args.marketId as bigint;
          const outcome = Number((log as any).args.outcome);
          const amount = (log as any).args.amount as bigint;

          let status: 'Pending' | 'Won' | 'Lost' = 'Pending';
          let resolvedOutcome: number | undefined;

          try {
            const marketData = await publicClient.readContract({
              address: CONTRACTS.PredictionMarket,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'getMarket',
              args: [marketId],
            }) as any;

            const marketStatus = Number(marketData.status ?? marketData[2] ?? 0);
            if (marketStatus === 2) {
              resolvedOutcome = Number(marketData.resolvedOutcome ?? marketData[3] ?? 0);
              status = outcome === resolvedOutcome ? 'Won' : 'Lost';
            }
          } catch {
            // Market read failed, keep as Pending
          }

          return {
            marketId,
            outcome,
            amount,
            txHash: log.transactionHash || '',
            blockNumber: log.blockNumber || BigInt(0),
            status,
            resolvedOutcome,
          };
        }),
      );

      setBets(betRecords.sort((a, b) => Number(b.blockNumber - a.blockNumber)));
    } catch (err) {
      console.error('Failed to fetch bet logs:', err);
      setBets([]);
    } finally {
      setBetsLoading(false);
    }
  }, [publicClient, tokenId]);

  useEffect(() => {
    if (agentExists) {
      fetchBets();
    }
  }, [agentExists, fetchBets]);

  // --- Refetch bankroll after confirmed tx ---
  useEffect(() => {
    if (isConfirmed) {
      refetchBankroll();
    }
  }, [isConfirmed, refetchBankroll]);

  // --- Deposit handler (approve + deposit) ---
  function handleDeposit() {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    const amount = parseEther(depositAmount);
    setTxMode('approve');
    resetTx();
    writeContract({
      address: CONTRACTS.MockUSDT,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.AgentRegistry, amount],
    });
  }

  // After approve confirms, automatically call depositBankroll
  useEffect(() => {
    if (isConfirmed && txMode === 'approve' && depositAmount) {
      const amount = parseEther(depositAmount);
      setTxMode('deposit');
      resetTx();
      // Small delay to allow state reset
      setTimeout(() => {
        writeContract({
          address: CONTRACTS.AgentRegistry,
          abi: AGENT_REGISTRY_ABI,
          functionName: 'depositBankroll',
          args: [tokenId, amount],
        });
      }, 500);
    }
  }, [isConfirmed, txMode]);

  // --- Withdraw handler ---
  function handleWithdraw() {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    const amount = parseEther(depositAmount);
    setTxMode('withdraw');
    resetTx();
    writeContract({
      address: CONTRACTS.AgentRegistry,
      abi: AGENT_REGISTRY_ABI,
      functionName: 'withdrawBankroll',
      args: [tokenId, amount],
    });
  }

  // Reset txMode when deposit/withdraw confirms
  useEffect(() => {
    if (isConfirmed && (txMode === 'deposit' || txMode === 'withdraw')) {
      // Keep success state visible briefly then reset
      const timer = setTimeout(() => {
        setTxMode('idle');
        setDepositAmount('');
        resetTx();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, txMode]);

  const busy = isTxPending || isConfirming;
  const txLabel =
    txMode === 'approve'
      ? 'Approving USDT...'
      : txMode === 'deposit'
        ? 'Depositing...'
        : txMode === 'withdraw'
          ? 'Withdrawing...'
          : '';

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-neon-green animate-spin" />
      </div>
    );
  }

  // --- Agent not found ---
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
          {/* === Left Column: Agent Card === */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
            <div className="card overflow-hidden sticky top-24">
              {/* Agent visual header */}
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

                {/* Bankroll management with working deposit/withdraw */}
                <div className="border-t border-border pt-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-neon-orange" /> Bankroll
                  </h4>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Amount (USDT)"
                    disabled={busy}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mono focus:outline-none focus:border-neon-green/40 disabled:opacity-50"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDeposit}
                      disabled={busy || !depositAmount}
                      className={clsx('btn-primary !py-2 text-xs flex items-center justify-center gap-1', busy && 'opacity-70 cursor-not-allowed')}
                    >
                      {busy && txMode !== 'withdraw' && txMode !== 'idle' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : null}
                      {txMode === 'approve' && busy ? 'Approving...' : txMode === 'deposit' && busy ? 'Depositing...' : 'Deposit'}
                    </button>
                    <button
                      onClick={handleWithdraw}
                      disabled={busy || !depositAmount}
                      className={clsx('btn-secondary !py-2 text-xs flex items-center justify-center gap-1', busy && 'opacity-70 cursor-not-allowed')}
                    >
                      {busy && txMode === 'withdraw' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : null}
                      {txMode === 'withdraw' && busy ? 'Withdrawing...' : 'Withdraw'}
                    </button>
                  </div>

                  {/* Transaction status feedback */}
                  {txHash && (
                    <div className="space-y-2">
                      {isConfirmed && (txMode === 'deposit' || txMode === 'withdraw') ? (
                        <div className="flex items-center gap-2 text-neon-green text-xs font-medium">
                          <Check className="h-4 w-4" />
                          {txMode === 'deposit' ? 'Deposit' : 'Withdrawal'} confirmed!
                        </div>
                      ) : isConfirming ? (
                        <div className="flex items-center gap-2 text-yellow-400 text-xs">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Confirming transaction...
                        </div>
                      ) : null}
                      <a
                        href={`${EXPLORER_URL}/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] mono text-muted hover:text-neon-green transition-colors break-all"
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        View on OKLink
                      </a>
                    </div>
                  )}

                  {txError && (
                    <div className="flex items-start gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-2">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span className="break-all">{(txError as Error).message?.slice(0, 150) || 'Transaction failed'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* === Right Column: Stats + Charts + History === */}
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

            {/* PnL Curve Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-neon-green" /> Cumulative PnL
              </h3>
              <PnlChart points={pnlPoints} />
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
                      href={`${EXPLORER_URL}/address/${owner}`}
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
                      href={`${EXPLORER_URL}/address/${agentWallet}`}
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

            {/* Badges */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
              <BadgesSection agentId={String(agentId)} />
            </motion.div>

            {/* Decision History */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-neon-orange" /> Decision History
              </h3>

              {betsLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading bet history...
                </div>
              ) : bets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted">No bets placed yet</p>
                  <p className="text-xs text-muted/60 mt-1">
                    Bets will appear here once the agent places its first wager on a market.
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-border text-[10px] uppercase tracking-wider text-muted">
                    <div className="flex items-center gap-3">
                      <span className="w-16">Market</span>
                      <span className="w-14">Pick</span>
                      <span>Amount</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Status</span>
                      <span className="w-4" />
                    </div>
                  </div>
                  {bets.map((bet, i) => (
                    <BetRow key={`${bet.marketId}-${i}`} bet={bet} />
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
