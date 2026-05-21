'use client';

import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  success:
    'bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/20',
  warning:
    'bg-[#FF6B2C]/10 text-[#FF6B2C] border border-[#FF6B2C]/20',
  danger:
    'bg-red-500/10 text-red-400 border border-red-500/20',
  info:
    'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  neutral:
    'bg-[#1E1E2A]/60 text-gray-400 border border-[#1E1E2A]',
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', children, className = '', ...rest }, ref) => {
    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
        {...rest}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
