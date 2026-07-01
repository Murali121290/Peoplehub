import React from 'react';
import { cn } from '../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({ error, className, ...rest }) => {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400',
        'focus:outline-none focus:ring-4',
        error
          ? 'border-danger-300 focus:border-danger-400 focus:ring-danger-100'
          : 'border-neutral-200 focus:border-primary-400 focus:ring-primary-100',
        'disabled:bg-neutral-50 disabled:text-neutral-400',
        className
      )}
      {...rest}
    />
  );
};

export default Textarea;
