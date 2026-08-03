import React, { useState } from 'react';
import {
  ChevronDownIcon,
  PencilIcon,
  PlusIcon,
  UserGroupIcon,
  BriefcaseIcon,
  UserIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import Panel from '../components/Panel';

interface TeamOverviewTabProps {
  teamOverview: any[];
  teams: any[];
  onEditTeam: (team: any) => void;
  onCreateTeam: () => void;
}

const TeamOverviewTab: React.FC<TeamOverviewTabProps> = ({
  teamOverview,
  teams,
  onEditTeam,
  onCreateTeam,
}) => {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const getAvatarBg = (index: number) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500'];
    return colors[index % colors.length];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Panel>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Team Overview</h2>
          <p className="text-sm text-neutral-500 mt-1">{teamOverview.length} teams • {teamOverview.reduce((sum, t) => sum + (t.member_count || 0), 0)} total members</p>
        </div>
        <button
          onClick={onCreateTeam}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all"
        >
          <PlusIcon className="w-5 h-5" />
          Create Team
        </button>
      </div>

      {/* Teams Grid */}
      <div className="space-y-4">
        {teamOverview.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500">No teams created yet</p>
          </div>
        ) : (
          teamOverview.map((team: any, teamIdx: number) => {
            const teamEmployees = team.employees || [];
            const empCount = team.member_count ?? teamEmployees.length;
            const isTeamExpanded = expandedTeam === team.team_id;

            const rolesGroup = teamEmployees.reduce((acc: Record<string, any[]>, emp: any) => {
              const roleName = emp.designation || 'Unassigned';
              if (!acc[roleName]) {
                acc[roleName] = [];
              }
              acc[roleName].push(emp);
              return acc;
            }, {});

            const roleCount = Object.keys(rolesGroup).length;

            return (
              <div key={team.team_id} className="border border-neutral-200 rounded-xl overflow-hidden hover:border-neutral-300 transition-colors bg-white">
                {/* Team Header */}
                <div
                  onClick={() => setExpandedTeam(isTeamExpanded ? null : team.team_id)}
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg ${getAvatarBg(teamIdx)} text-white flex items-center justify-center font-bold text-lg`}>
                      {team.team_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">{team.team_name}</h3>
                      <p className="text-sm text-neutral-500 mt-0.5">
                        {empCount} {empCount === 1 ? 'member' : 'members'} • {roleCount} {roleCount === 1 ? 'role' : 'roles'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const fullTeam = teams.find((t) => t.id === team.team_id) || {
                          id: team.team_id,
                          name: team.team_name,
                          description: '',
                        };
                        onEditTeam(fullTeam);
                      }}
                      className="p-2 rounded-lg text-neutral-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      title="Edit Team"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <ChevronDownIcon
                      className={`w-5 h-5 text-neutral-400 transition-transform duration-300 ${isTeamExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {/* Team Details */}
                {isTeamExpanded && (
                  <div className="border-t border-neutral-100 bg-neutral-50/50 p-5 space-y-4">
                    {Object.entries(rolesGroup).length === 0 ? (
                      <p className="text-center py-6 text-neutral-500">No employees in this team</p>
                    ) : (
                      Object.entries(rolesGroup).map(([roleName, emps]) => {
                        const employees = emps as any[];
                        const roleKey = `${team.team_id}-${roleName}`;
                        const isRoleExpanded = expandedRole === roleKey;

                        return (
                          <div key={roleName} className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
                            {/* Role Header */}
                            <div
                              onClick={() => setExpandedRole(isRoleExpanded ? null : roleKey)}
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                                  <BriefcaseIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-semibold text-neutral-900">{roleName}</p>
                                  <p className="text-xs text-neutral-500 mt-0.5">{employees.length} {employees.length === 1 ? 'employee' : 'employees'}</p>
                                </div>
                              </div>
                              <ChevronDownIcon
                                className={`w-4 h-4 text-neutral-400 transition-transform duration-300 ${isRoleExpanded ? 'rotate-180' : ''}`}
                              />
                            </div>

                            {/* Employees List */}
                            {isRoleExpanded && (
                              <div className="border-t border-neutral-100 bg-neutral-50/50 p-4">
                                <div className="space-y-2">
                                  {employees.map((emp: any, empIdx: number) => (
                                    <div key={emp.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors">
                                      <div className={`w-8 h-8 rounded-full ${getAvatarBg(empIdx)} text-white flex items-center justify-center text-xs font-semibold flex-shrink-0`}>
                                        {getInitials(emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-neutral-900 truncate flex items-center gap-1.5">
                                          {emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}
                                          {emp.is_wfh && (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                              <HomeIcon className="w-3 h-3 text-blue-500" />
                                              WFH
                                            </span>
                                          )}
                                        </p>
                                        <p className="text-xs text-neutral-500 truncate">
                                          {emp.reporting_manager ? `Reports to: ${emp.reporting_manager}` : 'No reporting manager'}
                                        </p>
                                      </div>
                                      {emp.is_wfh ? (
                                        <HomeIcon className="w-4 h-4 text-blue-500 flex-shrink-0 animate-pulse" title="Working from Home" />
                                      ) : (
                                        <UserIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Panel>
  );
};

export default TeamOverviewTab;
