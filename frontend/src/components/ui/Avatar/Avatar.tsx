import React, { useState } from 'react';
import { cn } from '../utils/cn';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  src?: string;
  initials?: string;
  name?: string;
  size?: AvatarSize | number;
  colorSeed?: string;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const avatarPalette = [
  { bg: 'bg-primary-100', text: 'text-primary-700' },
  { bg: 'bg-secondary-100', text: 'text-secondary-700' },
  { bg: 'bg-success-100', text: 'text-success-700' },
  { bg: 'bg-warning-100', text: 'text-warning-700' },
  { bg: 'bg-danger-100', text: 'text-danger-700' },
];

function getInitials(name?: string, initials?: string): string {
  if (initials) return initials.slice(0, 2).toUpperCase();
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFromSeed(seed: string) {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return avatarPalette[sum % avatarPalette.length];
}

export const Avatar: React.FC<AvatarProps> = ({ src, initials, name, size = 'md', colorSeed, className }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const seed = colorSeed || name || initials || '?';
  const { bg, text } = colorFromSeed(seed);
  const sizeClass = typeof size === 'number' ? '' : sizeClasses[size];
  const style = typeof size === 'number' ? { width: size, height: size, fontSize: Math.max(10, size * 0.4) } : undefined;

  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        onError={() => setImageFailed(true)}
        className={cn('rounded-full object-cover flex-shrink-0', sizeClass, className)}
        style={style}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
        bg,
        text,
        sizeClass,
        className
      )}
      style={style}
    >
      {getInitials(name, initials)}
    </div>
  );
};

export default Avatar;
