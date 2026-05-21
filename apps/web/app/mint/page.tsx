'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Shield, BarChart3, TrendingUp, RefreshCw, Coins, ExternalLink, Check } from 'lucide-react';
import {
  STRATEGY_STYLES, STYLE_COLORS, encodeStrategyGene,
  CONTRACTS, AGENT_REGISTRY_ABI,
  type StrategyStyle,
} from '@/lib/contracts';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import clsx from 'clsx';

const TEAMS = [
  'Brazil', 'Argentina', 'France', 'Germany', 'England',
  'Spain', 'Portugal', 'Netherlands', 'Belgium', 'Croatia',
];

const STYLE_ICONS: Record<string, React.ReactNode> = {
  ATTACKING: <Zap className="h-4 w-4" />,
  DEFENSIVE: <Shield className="h-4 w-4" />,
  DATA_DRIVEN: <BarChart3 className="h-4 w-4" />,
  CONTRARIAN: <RefreshCw className="h-4 w-4" />,
  MOMENTUM: <TrendingUp className="h-4 w-4" />,
};

const EXPLORER_URL = 'https://www.oklink.com/xlayer-test';

export default function MintPage() {
  const [riskLevel, setRiskLevel] = useState(3);
  const [style, setStyle] = useState<StrategyStyle>('DATA_DRIVEN');
  const [bankroll, setBankroll] = useState(25);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(['Brazil', 'France']);

  // Read mint fee from contract
  const { data: mintFeeData } = useReadContract({
    address: CONTRACTS.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'mintFee',
  });

  // Read total supply from contract
  const { data: totalSupplyData } = useReadContract({
    address: CONTRACTS.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'totalSupply',
  });

  // Write contract: mintAgent
  const {
    writeContract,
    data: txHash,
    isPending: isMinting,
    error: mintError,
    reset: resetMint,
  } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const mintFee = mintFeeData as bigint | undefined;
  const totalSupply = totalSupplyData as bigint | undefined;

  function toggleTeam(team: string) {
    setSelectedTeams((prev) =>
      prev.includes(team)
        ? prev.filter((t) => t !== team)
        : prev.length < 4
          ? [...prev, team]
          : prev
    );
  }

  function handleMint() {
    const teamIndices = selectedTeams.map((t) => TEAMS.indexOf(t) + 1);
    const gene = encodeStrategyGene(
      riskLevel,
      STRATEGY_STYLES.indexOf(style),
      bankroll,
      teamIndices,
    );

    writeContract({
      address: CONTRACTS.AgentRegistry,
      abi: AGENT_REGISTRY_ABI,
      functionName: 'mintAgent',
      args: [gene],
      value: mintFee ?? BigInt(0),
    });
  }

  const styleColor = STYLE_COLORS[style];
  const riskLabels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
  const mintFeeFormatted = mintFee ? formatEther(mintFee) : '...';
  const nextTokenId = totalSupply !== undefined ? Number(totalSupply) + 1 : '???';
  const busy = isMinting || isConfirming;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Mint Your <span className="text-neon-green">Scout Agent</span>
          </h1>
          <p className="text-muted mb-10">
            Configure your agent&apos;s strategy genes and deploy it on X Layer.
            {totalSupply !== undefined && (
              <span className="ml-2 mono text-neon-green/60">({Number(totalSupply)} agents minted)</span>
            )}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-3 space-y-8">
            {/* Risk Level */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-6"
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-neon-orange" />
                Risk Level
              </h3>
              <div className="space-y-4">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(parseInt(e.target.value))}
                  className="w-full accent-neon-green"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <div
                        key={l}
                        className={clsx(
                          'h-8 w-8 rounded flex items-center justify-center text-xs font-bold mono transition-all cursor-pointer',
                          l <= riskLevel
                            ? l > 3 ? 'bg-neon-orange/20 text-neon-orange border border-neon-orange/30' : 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                            : 'bg-background text-muted border border-border'
                        )}
                        onClick={() => setRiskLevel(l)}
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                  <span className={clsx('text-sm font-medium mono', riskLevel > 3 ? 'text-neon-orange' : 'text-neon-green')}>
                    {riskLabels[riskLevel - 1]}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Strategy Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Cpu className="h-5 w-5 text-neon-green" />
                Betting Style
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {STRATEGY_STYLES.map((s) => {
                  const color = STYLE_COLORS[s];
                  const isSelected = style === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={clsx(
                        'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all text-xs font-medium',
                        isSelected
                          ? 'border-opacity-60'
                          : 'border-border hover:border-opacity-30 text-muted hover:text-white'
                      )}
                      style={isSelected ? {
                        backgroundColor: color + '15',
                        borderColor: color + '60',
                        color: color,
                      } : undefined}
                    >
                      {STYLE_ICONS[s]}
                      <span className="truncate">{s.replace('_', ' ')}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Bankroll */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Coins className="h-5 w-5 text-neon-orange" />
                Bankroll Allocation
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Max bet per market</span>
                  <span className="text-lg font-bold mono text-neon-green">{bankroll}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={bankroll}
                  onChange={(e) => setBankroll(parseInt(e.target.value))}
                  className="w-full accent-neon-green"
                />
                <div className="flex justify-between text-[10px] mono text-muted">
                  <span>1% Conservative</span>
                  <span>100% YOLO</span>
                </div>
              </div>
            </motion.div>

            {/* Favorite Teams */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-6"
            >
              <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-neon-green" />
                Favorite Teams
              </h3>
              <p className="text-xs text-muted mb-4">Select up to 4 teams your agent will prioritize</p>
              <div className="flex flex-wrap gap-2">
                {TEAMS.map((team) => {
                  const isSelected = selectedTeams.includes(team);
                  return (
                    <button
                      key={team}
                      onClick={() => toggleTeam(team)}
                      className={clsx(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                        isSelected
                          ? 'bg-neon-green/10 border-neon-green/40 text-neon-green'
                          : 'bg-background border-border text-muted hover:text-white hover:border-border'
                      )}
                    >
                      {team}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Preview + Mint */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              {/* Agent Preview Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="card overflow-hidden"
              >
                <div
                  className="relative aspect-square flex flex-col items-center justify-center p-6"
                  style={{
                    background: `radial-gradient(circle at 30% 20%, ${styleColor}20, transparent 60%), radial-gradient(circle at 80% 80%, ${styleColor}10, transparent 50%), #12121A`,
                  }}
                >
                  <div className="absolute inset-0 terminal-grid opacity-20" />
                  <div className="relative text-center">
                    <div className="text-6xl font-black mono" style={{ color: styleColor }}>
                      #{nextTokenId}
                    </div>
                    <div className="mt-2 text-sm uppercase tracking-[0.3em] text-muted">{style.replace('_', ' ')}</div>

                    <div className="mt-6 flex items-center justify-center gap-4">
                      <div className="text-center">
                        <div className="text-xs text-muted">Risk</div>
                        <div className="text-lg font-bold mono" style={{ color: riskLevel > 3 ? '#FF6B2C' : '#00FF87' }}>{riskLevel}/5</div>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <div className="text-xs text-muted">Bankroll</div>
                        <div className="text-lg font-bold mono text-neon-green">{bankroll}%</div>
                      </div>
                    </div>

                    {selectedTeams.length > 0 && (
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
                        {selectedTeams.map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-muted">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted mb-3">
                    <span>Strategy Gene</span>
                    <span className="mono text-neon-green/60">
                      0x{encodeStrategyGene(riskLevel, STRATEGY_STYLES.indexOf(style), bankroll, []).toString(16).padStart(16, '0')}
                    </span>
                  </div>
                  <div className="text-xs text-muted">
                    Network: <span className="text-white">X Layer Testnet</span>
                  </div>
                </div>
              </motion.div>

              {/* Mint Button */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Mint Fee</span>
                  <span className="text-lg font-bold mono text-neon-orange">{mintFeeFormatted} OKB</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Gas (estimated)</span>
                  <span className="mono text-muted">~0.001 OKB</span>
                </div>

                {/* Success state */}
                {isConfirmed && txHash ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-neon-green text-sm font-medium">
                      <Check className="h-5 w-5" />
                      Agent minted successfully!
                    </div>
                    <a
                      href={`${EXPLORER_URL}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs mono text-neon-green/70 hover:text-neon-green transition-colors break-all"
                    >
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      {txHash}
                    </a>
                    <button
                      onClick={() => resetMint()}
                      className="w-full btn-secondary text-sm"
                    >
                      Mint Another
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleMint}
                      disabled={busy}
                      className={clsx(
                        'w-full btn-primary flex items-center justify-center gap-2 text-lg',
                        busy && 'opacity-70 cursor-not-allowed'
                      )}
                    >
                      {isMinting ? (
                        <>
                          <div className="h-5 w-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                          Confirm in Wallet...
                        </>
                      ) : isConfirming ? (
                        <>
                          <div className="h-5 w-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <Cpu className="h-5 w-5" />
                          Mint Agent
                        </>
                      )}
                    </button>

                    {/* Show pending tx hash */}
                    {txHash && !isConfirmed && (
                      <a
                        href={`${EXPLORER_URL}/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[10px] mono text-muted hover:text-white transition-colors break-all"
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        View on OKLink
                      </a>
                    )}
                  </>
                )}

                {/* Error state */}
                {mintError && (
                  <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3 break-all">
                    {(mintError as Error).message?.slice(0, 200) || 'Transaction failed'}
                  </div>
                )}

                <p className="text-[10px] text-muted text-center">
                  Your agent will be deployed as an ERC-721 NFT on X Layer
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
