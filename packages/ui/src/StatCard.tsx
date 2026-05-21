'use client';

import React from 'react';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

const trendConfig: Record<
  NonNullable<StatCardProps['trend']>,
  { icon: string; color: string }
> = {
  up: { icon: '\u2191', color: 'text-[#00FF87]' },
  down: { icon: '\u2193', color: 'text-red-400' },
  neutral: { icon: '\u2192', color: 'text-gray-400' },
};

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, suffix, trend, className = '', ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-xl border border-[#1E1E2A] bg-[#12121A] p-5 ${className}`}
        {...rest}
      >
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{value}</span>
          {suffix && (
            <span className="text-sm text-gray-400">{suffix}</span>
          )}
          {trend && (
            <span
              className={`ml-auto text-sm font-medium ${trendConfig[trend].color}`}
            >
              {trendConfig[trend].icon}
            </span>
          )}
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';

export { StatCard };
