import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import type { BadgeStatus } from '../../../components/ui/Badge';

interface ChipProps {
  type: string;
}

const STATUS_MAP: Record<string, BadgeStatus> = {
  active: 'active',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  present: 'present',
  absent: 'absent',
  late: 'late',
  on_leave: 'onLeave',
  cancelled: 'inactive',
  half_day: 'halfDay',
  'half day': 'halfDay',
};

const LABELS: Record<string, string> = {
  active: 'ACTIVE',
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  present: 'PRESENT',
  absent: 'ABSENT',
  late: 'LATE',
  on_leave: 'ON LEAVE',
  cancelled: 'CANCELLED',
  half_day: 'HALF DAY',
  'half day': 'HALF DAY',
};

const Chip: React.FC<ChipProps> = ({ type }) => {
  const key = (type || '').toLowerCase();
  const status = STATUS_MAP[key] ?? 'absent';
  const label = LABELS[key] ?? LABELS.absent;

  return (
    <Badge status={status} size="sm" className="tracking-wide">
      {label}
    </Badge>
  );
};

export default Chip;
