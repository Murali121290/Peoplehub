import React from 'react';
import { cn } from '../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  badgeCount?: number;
}

export type TabsVariant = 'underline' | 'pill' | 'sidebar';

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: TabsVariant;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ items, activeId, onChange, variant = 'underline', className }) => {
  return (
    <div
      className={cn(
        'flex gap-1',
        variant === 'sidebar' ? 'flex-col' : 'flex-row flex-wrap',
        variant === 'underline' && 'border-b border-neutral-200',
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative inline-flex items-center gap-2 whitespace-nowrap font-medium transition-colors',
              variant === 'underline' &&
                cn(
                  'px-4 py-3 text-sm border-b-2 -mb-px',
                  isActive ? 'border-primary-500 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'
                ),
              variant === 'pill' &&
                cn(
                  'px-4 py-2 text-sm rounded-lg',
                  isActive ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                ),
              variant === 'sidebar' &&
                cn(
                  'px-3 py-2.5 text-sm rounded-lg justify-start',
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-50'
                )
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {item.label}
            {!!item.badgeCount && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1 text-[11px] font-semibold text-white">
                {item.badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
