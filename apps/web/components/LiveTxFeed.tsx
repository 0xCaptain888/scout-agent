'use client';

import { useEffect, useState, useRef } from 'react';
import { generateMockTxFeed, type TxEntry } from '@/lib/api';
import clsx from 'clsx';

const OUTCOME_ICONS: Record<string, string> = {
  HOME: '🏠',
  DRAW: '🤝',
  AWAY: '✈️',
};

const STYLE_BADGES: Record<string, string> = {
  ATK: '⚔️',
  DEF: '🛡️',
  DATA: '📊',
  CTR: '🔄',
  MOM: '🚀',
};

export default function LiveTxFeed({ compact = false }: { compact?: boolean }) {
  const [txs, setTxs] = useState<TxEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTxs(generateMockTxFeed());
    const interval = setInterval(() => {
      setTxs((prev) => {
        const newTx: TxEntry = {
          id: `tx-${Date.now()}`,
          agentId: 1000 + Math.floor(Math.random() * 9000),
          agentStyle: ['ATK', 'DEF', 'DATA', 'CTR', 'MOM'][Math.floor(Math.random() * 5)],
          outcome: ['HOME', 'DRAW', 'AWAY'][Math.floor(Math.random() * 3)],
          amount: (Math.random() * 5 + 0.1).toFixed(3),
          market: ['BRA v ARG', 'FRA v GER', 'ENG v ESP', 'POR v NED'][Math.floor(Math.random() * 4)],
          timestamp: Date.now(),
          txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        };
        return [newTx, ...prev.slice(0, 49)];
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  function timeAgo(ts: number): string {
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  return (
    <div ref={containerRef} className={clsx('overflow-hidden', compact ? '' : 'h-full')}>
      <div className="space-y-1">
        {txs.map((tx, i) => (
          <div
            key={tx.id}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded transition-all',
              i === 0 && 'animate-slide-up bg-neon-green/5 border border-neon-green/10',
              i > 0 && 'hover:bg-surface'
            )}
          >
            <span className="text-sm flex-shrink-0">{STYLE_BADGES[tx.agentStyle] || '🤖'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-white mono">#{tx.agentId}</span>
                <span className="text-[10px] text-muted">bet</span>
                <span className={clsx(
                  'text-xs font-bold mono',
                  tx.outcome === 'HOME' ? 'text-neon-green' : tx.outcome === 'AWAY' ? 'text-neon-orange' : 'text-muted'
                )}>
                  {tx.outcome}
                </span>
                <span className="text-[10px] text-muted">on</span>
                <span className="text-xs text-white truncate">{tx.market}</span>
              </div>
              {!compact && (
                <div className="text-[10px] mono text-muted truncate mt-0.5">
                  {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs mono text-neon-green font-medium">{tx.amount} OKB</div>
              <div className="text-[10px] text-muted">{timeAgo(tx.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
