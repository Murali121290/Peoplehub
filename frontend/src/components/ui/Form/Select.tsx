import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps {
  options: SelectOption[];
  value: string | number | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  name?: string;
  id?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  className,
  name,
  id,
}) => {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-9 text-sm text-neutral-800',
          'focus:outline-none focus:ring-4',
          error
            ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-100'
            : 'border-neutral-200 focus:border-primary-400 focus:ring-primary-100',
          'disabled:bg-neutral-50 disabled:text-neutral-400',
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
    </div>
  );
};

export default Select;
