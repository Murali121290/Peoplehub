import React from 'react';
import {
  SparklesIcon, CheckBadgeIcon, CheckCircleIcon, ChartBarIcon,
  ClockIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import StatCard from '../components/StatCard';
import { performanceData, teamRanking } from '../data/employeeMockData';
import { Card } from '../../../components/ui/Card';

const BADGE_COLOR_CLASSES: Record<string, { bg: string; icon: string }> = {
  yellow: { bg: 'bg-warning-100', icon: 'text-warning-600' },
  green: { bg: 'bg-success-100', icon: 'text-success-600' },
  blue: { bg: 'bg-primary-100', icon: 'text-primary-600' },
  purple: { bg: 'bg-info-100', icon: 'text-info-600' },
};

const PerformanceTab: React.FC = () => {
  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-neutral-800">Performance</h2>
        <p className="text-sm text-neutral-500">Track your performance metrics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={SparklesIcon} title="Efficiency Score" value={`${performanceData.efficiencyScore}%`} subtitle="Your score" trend="positive" color="blue" />
        <StatCard icon={CheckBadgeIcon} title="Quality Score" value={`${performanceData.qualityScore}%`} subtitle="Your score" trend="positive" color="green" />
        <StatCard icon={CheckCircleIcon} title="Tasks Completed" value={performanceData.tasksCompleted} subtitle="This month" trend="+8%" color="purple" />
        <StatCard icon={ChartBarIcon} title="Productivity" value={`${performanceData.productivity}%`} subtitle="Your score" trend="positive" color="yellow" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-neutral-800 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            {[
              { label: "Efficiency", value: performanceData.efficiencyScore, color: "bg-primary-600" },
              { label: "Quality", value: performanceData.qualityScore, color: "bg-success-600" },
              { label: "Productivity", value: performanceData.productivity, color: "bg-info-600" },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">{metric.label}</span>
                  <span className="text-sm font-semibold text-neutral-800">{metric.value}%</span>
                </div>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div className={`${metric.color} h-2 rounded-full transition-all`} style={{ width: `${metric.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-neutral-800 mb-4">Team Ranking</h3>
          <div className="space-y-3">
            {teamRanking.map((member) => (
              <div key={member.rank} className="flex items-center gap-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  member.rank === 1 ? 'bg-warning-500' : member.rank === 2 ? 'bg-neutral-400' :
                  member.rank === 3 ? 'bg-warning-700' : 'bg-primary-500'
                }`}>{member.rank}</div>
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                  {member.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-800">{member.name}</p>
                  <p className="text-xs text-neutral-500">{member.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-800">{member.score}</p>
                  <p className="text-xs text-neutral-500">score</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Achievement Badges</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "Top Performer", icon: SparklesIcon, color: "yellow" },
            { name: "Quality Expert", icon: CheckBadgeIcon, color: "green" },
            { name: "Fast Deliverer", icon: ClockIcon, color: "blue" },
            { name: "Team Player", icon: UserGroupIcon, color: "purple" },
          ].map((badge) => {
            const colorClasses = BADGE_COLOR_CLASSES[badge.color] ?? BADGE_COLOR_CLASSES.blue;
            return (
              <div key={badge.name} className="flex flex-col items-center p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors">
                <div className={`w-12 h-12 ${colorClasses.bg} rounded-full flex items-center justify-center mb-2`}>
                  <badge.icon className={`w-6 h-6 ${colorClasses.icon}`} />
                </div>
                <p className="text-xs font-medium text-neutral-800 text-center">{badge.name}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
};

export default PerformanceTab;
