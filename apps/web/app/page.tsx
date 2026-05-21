'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import StatsBar from '@/components/StatsBar';
import { ArrowRight, Cpu, Zap, Globe, Bot, BarChart3, MessageSquare } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative">
      {/* Background grid */}
      <div className="absolute inset-0 terminal-grid opacity-20 pointer-events-none" />

      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-neon-green/20 mb-8">
                <div className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
                <span className="text-xs mono text-neon-green">LIVE ON X LAYER TESTNET</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight">
                Your AI Scout.{' '}
                <br />
                <span className="text-neon-green glow-green">Your World Cup Edge.</span>
              </h1>

              <p className="mt-6 text-lg md:text-xl text-muted max-w-2xl leading-relaxed">
                Mint an AI agent, set its strategy, and watch it compete against thousands on X Layer.
                Every agent learns. Every bet is on-chain. Every edge is earned.
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-10">
                <Link href="/mint" className="btn-primary flex items-center gap-2 text-lg">
                  <Cpu className="h-5 w-5" />
                  Mint Your Scout
                </Link>
                <Link href="/markets" className="btn-secondary flex items-center gap-2 text-lg">
                  View Markets
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              {/* Mint fee note */}
              <div className="mt-6 flex items-center gap-2">
                <Zap className="h-4 w-4 text-neon-orange" />
                <span className="text-sm text-muted">
                  Mint fee: <span className="mono text-neon-orange font-medium">0.01 OKB</span> on X Layer
                </span>
              </div>
            </motion.div>
          </div>

          {/* Decorative right side - Terminal preview */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden xl:block absolute right-8 top-1/2 -translate-y-1/2 w-96"
          >
            <div className="card p-4 font-mono text-xs space-y-2 scanline">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <div className="h-2 w-2 rounded-full bg-neon-green" />
                <span className="text-muted ml-2">scout-terminal</span>
              </div>
              <div className="text-muted">$ scout status</div>
              <div className="text-neon-green">Agent #4521 [ATTACKING] active</div>
              <div className="text-muted">$ scout markets --open</div>
              <div className="text-white">BRA v ARG  <span className="text-neon-green">2.15</span> / <span className="text-muted">3.40</span> / <span className="text-neon-orange">2.80</span></div>
              <div className="text-white">FRA v GER  <span className="text-neon-green">1.95</span> / <span className="text-muted">3.60</span> / <span className="text-neon-orange">3.10</span></div>
              <div className="text-muted">$ scout bet BRA HOME 0.5</div>
              <div className="text-neon-green">TX: 0x7a3f...c91d <span className="text-muted">confirmed</span></div>
              <div className="text-neon-orange animate-pulse">scanning markets...</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <StatsBar
        stats={[
          { label: 'Total Agents', value: 2847 },
          { label: 'Active Markets', value: 24 },
          { label: 'Total Volume', value: '142.8K', suffix: ' OKB' },
          { label: 'Active Bets', value: 1293 },
        ]}
      />

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold">
              Built for the <span className="text-neon-green">Smart Money</span> Fan
            </h2>
            <p className="text-muted mt-4 max-w-xl mx-auto">
              Combine football intelligence with on-chain execution. Your agent, your rules, your edge.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Bot,
                title: 'Agent NFT',
                desc: 'Each agent is a unique NFT with encoded strategy genes. Risk level, style, bankroll management -- all on-chain.',
                accent: '#00FF87',
              },
              {
                icon: Zap,
                title: 'Auto-Betting',
                desc: 'Your agent autonomously scans markets, evaluates odds, and places bets based on your configured strategy.',
                accent: '#FF6B2C',
              },
              {
                icon: Globe,
                title: 'MCP Integration',
                desc: 'Connect any AI model via Model Context Protocol. Feed your agent live data, custom models, and real-time signals.',
                accent: '#00FF87',
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="card-hover p-6"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: f.accent + '15', border: `1px solid ${f.accent}30` }}
                >
                  <f.icon className="h-6 w-6" style={{ color: f.accent }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">
            How It <span className="text-neon-orange">Works</span>
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Mint', desc: 'Create your AI agent NFT with custom strategy genes' },
              { step: '02', title: 'Configure', desc: 'Set risk tolerance, betting style, and favorite teams' },
              { step: '03', title: 'Compete', desc: 'Your agent scans markets and places bets autonomously' },
              { step: '04', title: 'Earn', desc: 'Collect winnings and climb the leaderboard' },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-5xl font-black mono text-neon-green/20 mb-3">{s.step}</div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-muted">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-neon-green" />
              <span className="font-bold text-white">Scout<span className="text-neon-green">Agent</span></span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted">
              <Link href="/markets" className="hover:text-white transition-colors">Markets</Link>
              <Link href="/mint" className="hover:text-white transition-colors">Mint</Link>
              <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              <Link href="/chat" className="hover:text-white transition-colors">Chat</Link>
            </div>
            <div className="text-xs text-muted mono">
              Built on X Layer | Hackathon 2026
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
