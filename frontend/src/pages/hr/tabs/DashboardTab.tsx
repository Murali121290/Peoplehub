import React from 'react';
import { Card } from '../../../components/ui/Card';
import TeamOverviewTab from './TeamOverviewTab';

interface DashboardTabProps {
  counts: {
    total: number;
    active: number;
    onLeave: number;
    pendingLeaves: number;
  };
  teamOverview: any[];
  teams: any[];
  onEditTeam: (team: any) => void;
  onCreateTeam: () => void;
}

const DashboardTab: React.FC<DashboardTabProps> = ({ counts, teamOverview, teams, onEditTeam, onCreateTeam }) => {

  const statCards = [
    { label: "Total Employees", value: counts.total, sub: "All departments" },
    { label: "Active Today", value: counts.active, sub: "Working today" },
    { label: "On Leave", value: counts.onLeave, sub: "Away from work" },
    { label: "Pending Leaves", value: counts.pendingLeaves, sub: "Need approval" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards - Compact */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {statCards.map((card) => (
          <Card key={card.label} variant="accent-left" accentColor="#46494C" padding="md" className="shadow-sm">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              {card.label}
            </div>
            <div className="text-2xl font-bold text-neutral-800 mt-2">
              {card.value}
            </div>
          </Card>
        ))}
      </div>

      {/* Team Overview */}
      <TeamOverviewTab
        teamOverview={teamOverview}
        teams={teams}
        onEditTeam={onEditTeam}
        onCreateTeam={onCreateTeam}
      />
    </div>
  );
};

export default DashboardTab;
