'use client';

import React from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'orange' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2.5',
};

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[#00FF87] text-[#0A0A0F] font-semibold hover:bg-[#00FF87]/90 active:bg-[#00FF87]/80',
  secondary:
    'bg-transparent text-[#00FF87] font-semibold border border-[#00FF87] hover:bg-[#00FF87]/10 active:bg-[#00FF87]/20',
  orange:
    'bg-[#FF6B2C] text-white font-semibold hover:bg-[#FF6B2C]/90 active:bg-[#FF6B2C]/80',
  ghost:
    'bg-transparent text-gray-300 hover:bg-[#1E1E2A] active:bg-[#1E1E2A]/80',
};

const spinnerColorMap: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: '#0A0A0F',
  secondary: '#00FF87',
  orange: '#ffffff',
  ghost: '#9CA3AF',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      children,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87]/50 disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...rest}
      >
        {loading && (
          <Spinner
            size={size === 'lg' ? 'md' : 'sm'}
            color={spinnerColorMap[variant]}
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
