import React from 'react';
import { cn } from '../utils/cn';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label, className }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <div
        className={cn('animate-spin rounded-full border-primary-200 border-t-primary-500', sizeClasses[size])}
      />
      {label && <p className="text-xs text-neutral-500">{label}</p>}
    </div>
  );
};

export default Spinner;
