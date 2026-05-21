'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useReadContract } from 'wagmi';
import { useSearchParams } from 'next/navigation';
import { CONTRACTS, AGENT_REGISTRY_ABI, PREDICTION_MARKET_ABI, RANKING_BOARD_ABI } from '@/lib/contracts';
import Leaderboard from '@/components/Leaderboard';
import LiveTxFeed from '@/components/LiveTxFeed';
import { Activity, Trophy, Radio, Zap, BarChart3 } from 'lucide-react';

// Particle type for the agent visualization
interface Particle {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  style: string;
  color: string;
  size: number;
  speed: number;
  outcome: 'HOME' | 'DRAW' | 'AWAY';
  opacity: number;
  highlight?: boolean;
}

const OUTCOME_ZONES = {
  HOME:  { x: 20, y: 30, label: 'HOME', color: '#00FF87' },
  DRAW:  { x: 50, y: 70, label: 'DRAW', color: '#6B7280' },
  AWAY:  { x: 80, y: 30, label: 'AWAY', color: '#FF6B2C' },
};

const STYLE_PARTICLE_COLORS: Record<string, string> = {
  ATK: '#FF6B2C',
  DEF: '#3B82F6',
  DATA: '#00FF87',
  CTR: '#A855F7',
  MOM: '#EAB308',
};

function generateParticles(count: number): Particle[] {
  const outcomes: Array<'HOME' | 'DRAW' | 'AWAY'> = ['HOME', 'DRAW', 'AWAY'];
  const styles = Object.keys(STYLE_PARTICLE_COLORS);
  return Array.from({ length: count }, (_, i) => {
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const zone = OUTCOME_ZONES[outcome];
    return {
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      targetX: zone.x + (Math.random() - 0.5) * 25,
      targetY: zone.y + (Math.random() - 0.5) * 25,
      style,
      color: STYLE_PARTICLE_COLORS[style],
      size: 2 + Math.random() * 3,
      speed: 0.3 + Math.random() * 0.7,
      outcome,
      opacity: 0.4 + Math.random() * 0.6,
      highlight: false,
    };
  });
}

// Animated counter
function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDisplay(value), 50);
    return () => clearTimeout(timer);
  }, [value]);
  return <span className="mono data-flicker">{prefix}{display.toLocaleString()}{suffix}</span>;
}

// Demo match data with fluctuating odds
const DEMO_MATCHES_BASE = [
  { home: 'BRA', away: 'ARG', homeOdds: 2.15, drawOdds: 3.40, awayOdds: 2.80 },
  { home: 'FRA', away: 'GER', homeOdds: 1.95, drawOdds: 3.60, awayOdds: 3.10 },
  { home: 'ENG', away: 'ESP', homeOdds: 2.40, drawOdds: 3.20, awayOdds: 2.50 },
  { home: 'ITA', away: 'POR', homeOdds: 2.05, drawOdds: 3.30, awayOdds: 3.00 },
  { home: 'NED', away: 'BEL', homeOdds: 2.25, drawOdds: 3.50, awayOdds: 2.70 },
];

const STATIC_MATCHES = [
  { home: 'BRA', away: 'ARG', homeOdds: '2.15', drawOdds: '3.40', awayOdds: '2.80' },
  { home: 'FRA', away: 'GER', homeOdds: '1.95', drawOdds: '3.60', awayOdds: '3.10' },
  { home: 'ENG', away: 'ESP', homeOdds: '2.40', drawOdds: '3.20', awayOdds: '2.50' },
];

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  const [particles, setParticles] = useState<Particle[]>([]);
  const [tick, setTick] = useState(0);

  // --- Demo state ---
  const [demoAgents, setDemoAgents] = useState(142);
  const [demoActiveBets, setDemoActiveBets] = useState(1847);
  const [demoVolume, setDemoVolume] = useState(24500);
  const [demoMatchOdds, setDemoMatchOdds] = useState(
    DEMO_MATCHES_BASE.map((m) => ({ ...m }))
  );
  const surgeTimerRef = useRef(0);
  const highlightTimerRef = useRef(0);

  // --- On-chain reads ---
  const { data: totalAgentsData } = useReadContract({
    address: CONTRACTS.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'totalSupply',
  });

  const { data: totalMarketsData } = useReadContract({
    address: CONTRACTS.PredictionMarket,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'totalMarkets',
  });

  const { data: topAgentsData } = useReadContract({
    address: CONTRACTS.RankingBoard,
    abi: RANKING_BOARD_ABI,
    functionName: 'top',
    args: [BigInt(5)],
  });

  const onChainAgents = totalAgentsData !== undefined ? Number(totalAgentsData as bigint) : null;
  const onChainMarkets = totalMarketsData !== undefined ? Number(totalMarketsData as bigint) : null;

  // Derive stats: use demo overrides or on-chain data
  const stats = useMemo(() => {
    if (isDemo) {
      return {
        totalAgents: demoAgents,
        marketsOpen: 12,
        activeBets: demoActiveBets,
        volumeToday: demoVolume,
      };
    }
    return {
      totalAgents: onChainAgents ?? 0,
      marketsOpen: onChainMarkets ?? 0,
      activeBets: 0,
      volumeToday: 0,
    };
  }, [isDemo, demoAgents, demoActiveBets, demoVolume, onChainAgents, onChainMarkets]);

  // --- Demo timers: agent count (every 8s), bets+volume (every 3s), odds (every 5s) ---
  useEffect(() => {
    if (!isDemo) return;

    const agentInterval = setInterval(() => {
      setDemoAgents((prev) => prev + 1);
    }, 8000);

    const betsInterval = setInterval(() => {
      setDemoActiveBets((prev) => prev + Math.floor(Math.random() * 5) + 1);
      setDemoVolume((prev) => prev + Math.floor(Math.random() * 41) + 10);
    }, 3000);

    const oddsInterval = setInterval(() => {
      setDemoMatchOdds((prev) =>
        prev.map((m) => ({
          ...m,
          homeOdds: Math.max(1.10, m.homeOdds + (Math.random() - 0.5) * 0.15),
          drawOdds: Math.max(1.50, m.drawOdds + (Math.random() - 0.5) * 0.10),
          awayOdds: Math.max(1.10, m.awayOdds + (Math.random() - 0.5) * 0.15),
        }))
      );
    }, 5000);

    return () => {
      clearInterval(agentInterval);
      clearInterval(betsInterval);
      clearInterval(oddsInterval);
    };
  }, [isDemo]);

  // Initialize particles
  useEffect(() => {
    setParticles(generateParticles(isDemo ? 120 : 60));
  }, [isDemo]);

  // Animate particles
  useEffect(() => {
    const retargetChance = isDemo ? 0.03 : 0.005;
    const surgeIntervalTicks = 150; // 15 seconds at 100ms tick
    const highlightIntervalTicks = 200; // 20 seconds at 100ms tick
    const highlightDurationTicks = 10; // 1 second at 100ms tick

    const interval = setInterval(() => {
      setTick((t) => t + 1);

      if (isDemo) {
        surgeTimerRef.current += 1;
        highlightTimerRef.current += 1;
      }

      setParticles((prev) => {
        let updated = prev.map((p) => {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const jitterX = (Math.random() - 0.5) * 2;
          const jitterY = (Math.random() - 0.5) * 2;

          let newX = p.x + dx * p.speed * 0.02 + jitterX;
          let newY = p.y + dy * p.speed * 0.02 + jitterY;

          if (Math.random() < retargetChance) {
            const outcomes: Array<'HOME' | 'DRAW' | 'AWAY'> = ['HOME', 'DRAW', 'AWAY'];
            const newOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
            const zone = OUTCOME_ZONES[newOutcome];
            return {
              ...p,
              x: newX,
              y: newY,
              targetX: zone.x + (Math.random() - 0.5) * 25,
              targetY: zone.y + (Math.random() - 0.5) * 25,
              outcome: newOutcome,
              highlight: false,
            };
          }

          return { ...p, x: newX, y: newY };
        });

        // Demo surge: every 15 seconds, 30% of particles rush to one outcome
        if (isDemo && surgeTimerRef.current >= surgeIntervalTicks) {
          surgeTimerRef.current = 0;
          const outcomes: Array<'HOME' | 'DRAW' | 'AWAY'> = ['HOME', 'DRAW', 'AWAY'];
          const surgeTarget = outcomes[Math.floor(Math.random() * outcomes.length)];
          const zone = OUTCOME_ZONES[surgeTarget];
          const surgeCount = Math.floor(updated.length * 0.3);
          const indices = Array.from({ length: updated.length }, (_, i) => i);
          // Shuffle and pick first surgeCount
          for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
          }
          for (let k = 0; k < surgeCount; k++) {
            const idx = indices[k];
            updated[idx] = {
              ...updated[idx],
              targetX: zone.x + (Math.random() - 0.5) * 25,
              targetY: zone.y + (Math.random() - 0.5) * 25,
              outcome: surgeTarget,
            };
          }
        }

        // Demo highlight: every 20 seconds, flash one particle for 1 second
        if (isDemo && highlightTimerRef.current >= highlightIntervalTicks) {
          const randomIdx = Math.floor(Math.random() * updated.length);
          updated[randomIdx] = { ...updated[randomIdx], highlight: true };
          highlightTimerRef.current = 0;
        }
        // Clear highlight after 1 second
        if (isDemo && highlightTimerRef.current === highlightDurationTicks) {
          updated = updated.map((p) => (p.highlight ? { ...p, highlight: false } : p));
        }

        return updated;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isDemo]);

  // Count particles per outcome
  const outcomeCounts = useMemo(() => {
    const counts = { HOME: 0, DRAW: 0, AWAY: 0 };
    particles.forEach((p) => counts[p.outcome]++);
    return counts;
  }, [particles]);

  // Determine which matches to show
  const displayMatches = useMemo(() => {
    if (isDemo) {
      return demoMatchOdds.map((m) => ({
        home: m.home,
        away: m.away,
        homeOdds: m.homeOdds.toFixed(2),
        drawOdds: m.drawOdds.toFixed(2),
        awayOdds: m.awayOdds.toFixed(2),
      }));
    }
    return STATIC_MATCHES;
  }, [isDemo, demoMatchOdds]);

  // Stats items for the top bar
  const statsItems = useMemo(() => {
    if (isDemo) {
      return [
        { label: 'Agents', value: stats.totalAgents, color: 'text-neon-green' },
        { label: 'Markets', value: stats.marketsOpen, color: 'text-neon-orange' },
        { label: 'Active Bets', value: stats.activeBets, color: 'text-neon-green' },
        { label: 'Volume', value: stats.volumeToday, color: 'text-neon-orange', prefix: '$' },
      ];
    }
    return [
      { label: 'Agents', value: stats.totalAgents, color: 'text-neon-green' },
      { label: 'Markets', value: stats.marketsOpen, color: 'text-neon-orange' },
    ];
  }, [isDemo, stats]);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-background">
      {/* Top Stats Bar */}
      <div className="border-b border-border bg-surface/30 px-4 py-3 flex-shrink-0">
        <div className="mx-auto max-w-[1920px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-neon-green animate-pulse" />
            <span className="font-bold text-white text-lg">Live Dashboard</span>
            <div className="flex items-center gap-1 ml-3 px-2 py-0.5 rounded-full bg-neon-green/10 border border-neon-green/20">
              <Radio className="h-3 w-3 text-neon-green animate-pulse" />
              <span className="text-[10px] mono text-neon-green uppercase">Live</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {statsItems.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted">{s.label}</div>
                <div className={`text-sm font-bold mono data-flicker ${s.color}`}>
                  <AnimatedCounter value={s.value} prefix={'prefix' in s ? (s as any).prefix : ''} />
                </div>
              </div>
            ))}
            {isDemo && (
              <div className="flex items-center gap-1.5 ml-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] mono text-red-400 uppercase tracking-wider">Demo</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Leaderboard */}
        <div className="w-[340px] border-r border-border flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
            <Trophy className="h-4 w-4 text-neon-orange" />
            <span className="text-sm font-bold text-white">Top Agents</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <Leaderboard limit={10} />
          </div>
        </div>

        {/* CENTER: Particle Visualization */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-neon-green" />
              <span className="text-sm font-bold text-white">Agent Swarm</span>
              <span className="text-[10px] mono text-muted">{particles.length} agents active</span>
            </div>
            <div className="flex items-center gap-4">
              {Object.entries(OUTCOME_ZONES).map(([key, zone]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: zone.color }} />
                  <span className="text-[10px] mono" style={{ color: zone.color }}>
                    {key} ({outcomeCounts[key as keyof typeof outcomeCounts]})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 relative">
            {/* Grid background */}
            <div className="absolute inset-0 terminal-grid opacity-30" />

            {/* Outcome zone labels */}
            {Object.entries(OUTCOME_ZONES).map(([key, zone]) => (
              <div
                key={key}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
                style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
              >
                <div
                  className="absolute -inset-12 rounded-full opacity-10 animate-pulse-slow"
                  style={{
                    background: `radial-gradient(circle, ${zone.color}40, transparent 70%)`,
                  }}
                />
                <div className="relative">
                  <div className="text-2xl font-black mono uppercase tracking-widest opacity-20" style={{ color: zone.color }}>
                    {key}
                  </div>
                  <div className="text-3xl font-black mono mt-1 data-flicker" style={{ color: zone.color, textShadow: `0 0 20px ${zone.color}60` }}>
                    {outcomeCounts[key as keyof typeof outcomeCounts]}
                  </div>
                </div>
              </div>
            ))}

            {/* Particles */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {particles.map((p, i) => {
                const nearby = particles.find(
                  (q, j) => j !== i && Math.abs(q.x - p.x) < 8 && Math.abs(q.y - p.y) < 8 && q.outcome === p.outcome
                );
                if (!nearby) return null;
                return (
                  <line
                    key={`line-${p.id}`}
                    x1={p.x}
                    y1={p.y}
                    x2={nearby.x}
                    y2={nearby.y}
                    stroke={p.color}
                    strokeWidth="0.15"
                    opacity="0.15"
                  />
                );
              })}
              {particles.map((p) => (
                <circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r={p.highlight ? p.size * 0.3 * 3 : p.size * 0.3}
                  fill={p.color}
                  opacity={p.highlight ? 1 : p.opacity}
                >
                  <animate
                    attributeName="opacity"
                    values={
                      p.highlight
                        ? '1;0.8;1'
                        : `${p.opacity};${p.opacity * 0.6};${p.opacity}`
                    }
                    dur={p.highlight ? '0.3s' : `${2 + Math.random() * 2}s`}
                    repeatCount="indefinite"
                  />
                  {p.highlight && (
                    <animate
                      attributeName="r"
                      values={`${p.size * 0.3 * 3};${p.size * 0.3 * 2.5};${p.size * 0.3 * 3}`}
                      dur="0.5s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
              ))}
            </svg>

            {/* Match ticker at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/80 to-transparent pt-12 pb-4 px-4">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                {displayMatches.map((m) => (
                  <div key={`${m.home}-${m.away}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface/80 border border-border">
                    <span className="text-xs font-bold text-white">{m.home}</span>
                    <div className="flex gap-1">
                      <span className="text-[10px] mono text-neon-green">{m.homeOdds}</span>
                      <span className="text-[10px] mono text-muted">{m.drawOdds}</span>
                      <span className="text-[10px] mono text-neon-orange">{m.awayOdds}</span>
                    </div>
                    <span className="text-xs font-bold text-white">{m.away}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Live TX Feed */}
        <div className="w-[340px] border-l border-border flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
            <BarChart3 className="h-4 w-4 text-neon-green" />
            <span className="text-sm font-bold text-white">Live Feed</span>
            <div className="ml-auto h-2 w-2 rounded-full bg-neon-green animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <LiveTxFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
