'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover';
  children: React.ReactNode;
  className?: string;
}

const baseStyles =
  'rounded-xl border border-[#1E1E2A] bg-[#12121A] p-6';

const variantStyles: Record<NonNullable<CardProps['variant']>, string> = {
  default: '',
  hover:
    'transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(0,255,135,0.15)] hover:border-[#00FF87]/30',
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', children, className = '', ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card };
