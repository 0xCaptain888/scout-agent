'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';

interface StatsBarProps {
  stats: { label: string; value: string | number; prefix?: string; suffix?: string }[];
}

export default function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="w-full border-y border-border bg-surface/50">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-xs uppercase tracking-wider text-muted">{stat.label}</span>
              <span className={clsx('text-xl md:text-2xl font-bold mono data-flicker', i % 2 === 0 ? 'text-neon-green' : 'text-neon-orange')}>
                {stat.prefix}{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}{stat.suffix}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
