import React from 'react';
import { cn } from '../utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  zebra?: boolean;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  rowKey?: (row: T, index: number) => string | number;
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export function Table<T extends Record<string, any>>({
  columns,
  data,
  zebra = true,
  onRowClick,
  emptyState,
  rowKey,
}: TableProps<T>) {
  if (!data.length && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  'px-4 py-3 font-medium text-neutral-500 uppercase text-xs tracking-wide',
                  alignClass[col.align ?? 'left']
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={rowKey ? rowKey(row, idx) : idx}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-neutral-100 last:border-b-0',
                zebra && idx % 2 === 1 && 'bg-neutral-25',
                onRowClick && 'cursor-pointer hover:bg-primary-50/50'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-neutral-700', alignClass[col.align ?? 'left'])}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
