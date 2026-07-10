import React from 'react';
import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ElementType;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-300 disabled:bg-primary-300',
  secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 focus-visible:ring-secondary-300 disabled:bg-secondary-300',
  outline: 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 focus-visible:ring-neutral-200 disabled:text-neutral-300',
  ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 focus-visible:ring-neutral-200 disabled:text-neutral-300',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 focus-visible:ring-danger-200 disabled:bg-danger-200',
  success: 'bg-success-500 text-white hover:bg-success-600 focus-visible:ring-success-200 disabled:bg-success-200',
  warning: 'bg-warning-50 text-warning-700 border border-warning-300 hover:bg-warning-100 focus-visible:ring-warning-200 disabled:text-warning-300',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-4',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <svg className={cn('animate-spin', iconSizeClasses[size])} viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        Icon && iconPosition === 'left' && <Icon className={iconSizeClasses[size]} />
      )}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon className={iconSizeClasses[size]} />}
    </button>
  );
};

export default Button;
