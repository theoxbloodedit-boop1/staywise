import React from 'react';
import { X } from 'lucide-react';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)]', className)}>
      {children}
    </div>
  );
}

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const BADGE_STYLES: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  brand: 'bg-teal-50 text-teal-800 border-teal-200',
};

export function Badge({
  children,
  variant = 'neutral',
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border leading-4 whitespace-nowrap',
        BADGE_STYLES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusToBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'Ready':
    case 'Completed':
    case 'Resolved':
    case 'Passed':
    case 'Verified':
    case 'Active':
    case 'Delivered':
    case 'Checked In':
      return 'success';
    case 'Not Ready':
    case 'Critical':
    case 'Rejected':
    case 'Overdue':
    case 'Failed':
    case 'Reopened':
    case 'Damaged':
    case 'Missing':
      return 'danger';
    case 'Submitted for Review':
    case 'Awaiting Verification':
    case 'Pending':
    case 'High':
    case 'Discrepancies Noted':
    case 'Unavailable — Escalated':
      return 'warning';
    case 'Assigned':
    case 'In Progress':
    case 'Confirmed':
    case 'Arriving Today':
    case 'Departing Today':
    case 'Medium':
      return 'info';
    default:
      return 'neutral';
  }
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'inverted';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-900 shadow-xs',
    secondary: 'bg-teal-700 text-white hover:bg-teal-800 border border-teal-700',
    outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent',
    danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-600',
    inverted: 'bg-white text-slate-900 hover:bg-slate-100 border border-white shadow-xs',
  };
  const sizes = {
    sm: 'h-8 px-2.5 text-xs',
    md: 'h-9 px-3.5 text-[13px]',
    lg: 'h-10 px-4 text-sm',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/15 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block space-y-1">
      {label && <span className="block text-xs font-medium text-slate-700">{label}</span>}
      <input
        className={cn(
          'w-full h-9 px-3 text-[13px] bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10',
          className
        )}
        {...props}
      />
    </label>
  );
}

export function TextArea({
  label,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block space-y-1">
      {label && <span className="block text-xs font-medium text-slate-700">{label}</span>}
      <textarea
        className={cn(
          'w-full p-2.5 text-[13px] bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10',
          className
        )}
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block space-y-1">
      {label && <span className="block text-xs font-medium text-slate-700">{label}</span>}
      <select
        className={cn(
          'w-full h-9 px-2.5 text-[13px] bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[1px]">
      <div
        className={cn(
          'w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col',
          maxWidth
        )}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-200 mb-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
