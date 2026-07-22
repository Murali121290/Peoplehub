import React from 'react';
import { cn } from '../utils/cn';

export type StatCardColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type StatCardVariant = 'icon' | 'accent-border';

export interface StatCardTrend {
  direction: 'up' | 'down' | 'flat' | 'urgent';
  label: string;
}

export interface StatCardProps {
  icon?: React.ElementType;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: StatCardTrend;
  color?: StatCardColor;
  variant?: StatCardVariant;
  className?: string;
}

const colorClasses: Record<StatCardColor, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-600', border: 'border-primary-400' },
  success: { bg: 'bg-success-50', text: 'text-success-600', border: 'border-success-400' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-600', border: 'border-warning-400' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-600', border: 'border-danger-400' },
  info: { bg: 'bg-info-50', text: 'text-info-600', border: 'border-info-400' },
  neutral: { bg: 'bg-neutral-100', text: 'text-neutral-600', border: 'border-neutral-400' },
};

const trendClasses: Record<StatCardTrend['direction'], string> = {
  up: 'text-success-600',
  down: 'text-danger-600',
  flat: 'text-neutral-400',
  urgent: 'text-warning-600',
};

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  color = 'primary',
  variant = 'icon',
  className,
}) => {
  const c = colorClasses[color];

  return (
    <div
      className={cn(
        'rounded-xl bg-white border border-neutral-200 shadow-card p-4',
        variant === 'accent-border' && 'border-l-4',
        variant === 'accent-border' && c.border,
        className
      )}
    >
      <div className="flex items-start gap-4">
        {variant === 'icon' && Icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', c.bg)}>
            <Icon className={cn('h-5 w-5', c.text)} />
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-800">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>}
          {trend && <p className={cn('mt-1 text-xs font-medium', trendClasses[trend.direction])}>{trend.label}</p>}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
