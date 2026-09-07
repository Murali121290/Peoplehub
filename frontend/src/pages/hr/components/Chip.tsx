import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import type { BadgeVariant } from '../../../components/ui/Badge';

interface ChipProps {
  type: string;
}

/**
 * Resolve a badge variant from a label string.
 * Priority: exact known keys → keyword matching → neutral fallback
 */
function resolveVariant(label: string): BadgeVariant {
  const key = (label || '').toLowerCase().trim();

  if (key === 'present' || key === 'checked out') return 'success';
  if (key.includes('grace') || key.startsWith('half day present')) return 'success';
  if (key === 'half day' || key === 'pending') return 'warning';
  if (key.startsWith('half day absent')) return 'warning';
  if (key === 'check-in' || key === 'check in' || key === 'checkin') return 'info';
  if (key === 'week off' || key === 'weekly off' || key === 'holiday') return 'neutral';

  // LOP / Absent → red
  if (
    key === 'absent' ||
    key.includes('loss of pay') ||
    /\blop\b/.test(key) ||
    key.includes('unpaid leave')
  ) return 'danger';

  // Any other leave type → info/blue
  if (
    key.includes('leave') ||
    key.includes('casual') ||
    key.includes('sick') ||
    key.includes('earned') ||
    key.includes('maternity') ||
    key.includes('paternity') ||
    key.includes('wfh') ||
    key.includes('permission') ||
    /\b(cl|sl|pl|el)\b/.test(key)
  ) return 'info';

  return 'neutral';
}

const Chip: React.FC<ChipProps> = ({ type }) => {
  const variant = resolveVariant(type);
  return (
    <Badge variant={variant} size="sm" className="tracking-wide">
      {type || 'Absent'}
    </Badge>
  );
};

export default Chip;

