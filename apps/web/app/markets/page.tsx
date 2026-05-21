'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import MarketCard from '@/components/MarketCard';
import { generateMockMarkets } from '@/lib/api';
import clsx from 'clsx';
import { Filter, BarChart3 } from 'lucide-react';

const FILTERS = ['All', 'Open', 'Locked', 'Resolved'] as const;

export default function MarketsPage() {
  const [filter, setFilter] = useState<string>('All');
  const markets = generateMockMarkets();

  const filtered = filter === 'All' ? markets : markets.filter((m) => m.status === filter);

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
              <p className="text-muted mt-1 text-sm">{markets.length} total markets available</p>
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((market, i) => (
            <motion.div
              key={market.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <MarketCard market={market} />
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Filter className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-muted">No markets found for this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
