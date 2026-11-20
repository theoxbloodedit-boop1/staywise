import React from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'inverted';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-navy text-white hover:bg-slate-800 border border-brand-navy shadow-xs',
  secondary: 'bg-brand-600 text-white hover:bg-teal-800 border border-brand-600',
  outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-600',
  inverted: 'bg-white text-slate-900 hover:bg-slate-100 border border-white shadow-xs',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-3.5 text-sm',
  md: 'min-h-[46px] px-4 text-sm',
  lg: 'min-h-[50px] px-5 text-base',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/15 disabled:opacity-50 disabled:cursor-not-allowed text-center',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
