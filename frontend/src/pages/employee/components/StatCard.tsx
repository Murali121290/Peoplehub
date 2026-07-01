import React from 'react';
import { StatCard as UIStatCard } from '../../../components/ui/StatCard';
import type { StatCardColor, StatCardTrend } from '../../../components/ui/StatCard';

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle: string;
  trend: string;
  color: string;
}

const colorMap: Record<string, StatCardColor> = {
  blue: 'primary',
  green: 'success',
  yellow: 'warning',
  purple: 'info',
  red: 'danger',
};

function resolveTrend(trend: string): StatCardTrend | undefined {
  if (!trend || trend === 'normal') return undefined;
  if (trend === 'urgent') return { direction: 'urgent', label: '⚠️ Needs attention' };
  if (trend === 'negative') return { direction: 'down', label: 'Trending down' };
  if (trend === 'positive') return { direction: 'up', label: 'Trending up' };
  if (trend.startsWith('+')) return { direction: 'up', label: trend };
  if (trend.startsWith('-')) return { direction: 'down', label: trend };
  return { direction: 'flat', label: trend };
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, trend, color }) => (
  <UIStatCard
    icon={icon}
    title={title}
    value={value}
    subtitle={subtitle}
    trend={resolveTrend(trend)}
    color={colorMap[color] ?? 'neutral'}
  />
);

export default StatCard;
