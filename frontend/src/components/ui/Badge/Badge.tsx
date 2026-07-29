import React from 'react';
import { cn } from '../utils/cn';

export type BadgeStatus =
  | 'active' | 'pending' | 'approved' | 'rejected'
  | 'present' | 'absent' | 'late' | 'onLeave' | 'inactive' | 'halfDay';
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  status?: BadgeStatus;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const statusMeta: Record<BadgeStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Active', variant: 'success' },
  approved: { label: 'Approved', variant: 'success' },
  present: { label: 'Present', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  late: { label: 'Late', variant: 'warning' },
  halfDay: { label: 'Half Day', variant: 'warning' },
  rejected: { label: 'Rejected', variant: 'danger' },
  absent: { label: 'Absent', variant: 'danger' },
  onLeave: { label: 'On Leave', variant: 'info' },
  inactive: { label: 'Inactive', variant: 'neutral' },
};

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-50 text-success-700 border-success-200',
  warning: 'bg-warning-50 text-warning-700 border-warning-200',
  danger: 'bg-danger-50 text-danger-700 border-danger-200',
  info: 'bg-info-50 text-info-700 border-info-200',
  neutral: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  neutral: 'bg-neutral-400',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[11px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export const Badge: React.FC<BadgeProps> = ({ status, variant, size = 'md', dot = false, className, children }) => {
  const resolvedVariant = variant ?? (status ? statusMeta[status].variant : 'neutral');
  const label = children ?? (status ? statusMeta[status].label : null);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        variantClasses[resolvedVariant],
        sizeClasses[size],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotClasses[resolvedVariant])} />}
      {label}
    </span>
  );
};

export default Badge;
