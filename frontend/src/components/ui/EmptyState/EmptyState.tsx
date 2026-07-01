import React from 'react';
import { cn } from '../utils/cn';

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, className }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
          <Icon className="h-6 w-6 text-neutral-400" />
        </div>
      )}
      <p className="text-sm font-medium text-neutral-600">{title}</p>
      {description && <p className="mt-1 text-xs text-neutral-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
