import React from 'react';
import { cn } from '../utils/cn';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardVariant = 'default' | 'flat' | 'accent-left';

export interface CardProps {
  padding?: CardPadding;
  variant?: CardVariant;
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onClick?: () => void;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  variant = 'default',
  accentColor,
  className,
  style,
  children,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-neutral-200',
        variant === 'default' && 'shadow-card',
        variant === 'flat' && 'shadow-none',
        variant === 'accent-left' && 'border-l-4',
        paddingClasses[padding],
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        ...(variant === 'accent-left' && accentColor ? { borderLeftColor: accentColor } : undefined),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default Card;
