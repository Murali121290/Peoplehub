import React, { useState } from 'react';
import { ChevronDownIcon, Squares2X2Icon, PencilIcon, PlusIcon, HomeIcon } from '@heroicons/react/24/outline';
import Panel from '../components/Panel';
import { Card } from '../../../components/ui/Card';

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
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const statCards = [
    { label: "Total Employees", value: counts.total, sub: "All departments" },
    { label: "Active Today", value: counts.active, sub: "Working today" },
    { label: "On Leave", value: counts.onLeave, sub: "Away from work" },
    { label: "Pending Leaves", value: counts.pendingLeaves, sub: "Need approval" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        {statCards.map((card) => (
          <Card key={card.label} variant="default" padding="sm" className="shadow-md">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {card.label}
            </div>
            <div className="text-3xl font-extrabold text-neutral-800 mt-2">
              {card.value}
            </div>
            <div className="mt-1 text-xs text-neutral-400">{card.sub}</div>
          </Card>
        ))}
      </div>

      {/* Team Overview */}
      <Panel>
        <div className="text-lg font-bold text-neutral-800 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Squares2X2Icon className="w-5 h-5" />
            Team Overview
          </div>
          <button
            onClick={onCreateTeam}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all duration-150"
          >
            <PlusIcon className="w-4 h-4" />
            Create Team
          </button>
        </div>

        {teamOverview.map((team: any) => {
          const teamEmployees = team.employees || [];
          const empCount = team.member_count ?? teamEmployees.length;
          const totalTeamSalary = team.total_salary ?? 0;
          const isActive = selectedTeam === team.team_name;

          // Group employees in this team by designation
          const rolesGroup = teamEmployees.reduce((acc: Record<string, any[]>, emp: any) => {
            const roleName = emp.designation || "N/A";
            if (!acc[roleName]) {
              acc[roleName] = [];
            }
            acc[roleName].push(emp);
            return acc;
          }, {});

          return (
            <div key={team.team_id}>
              <div
                onClick={() => {
                  setSelectedTeam(isActive ? null : team.team_name);
                  setSelectedRole(null); // Reset selected role when changing team
                }}
                className={`flex justify-between items-center px-[18px] py-4 rounded-2xl mb-3 cursor-pointer transition-all ${isActive
                  ? "bg-primary-50 border-2 border-primary-500 shadow-md"
                  : "bg-neutral-50 border border-neutral-200 shadow-sm hover:border-neutral-300"
                  }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center font-bold text-base">
                    {team.team_name?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-neutral-800">{team.team_name}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{empCount} {empCount === 1 ? "Member" : "Members"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const fullTeam = teams.find((t) => t.id === team.team_id) || {
                        id: team.team_id,
                        name: team.team_name,
                        description: "",
                      };
                      onEditTeam(fullTeam);
                    }}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 border border-transparent hover:border-primary-100 transition-all mr-1.5"
                    title="Edit Team"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <div className="bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg text-sm font-semibold">
                    {empCount}
                  </div>
                  <ChevronDownIcon
                    className={`w-[18px] h-[18px] transition-transform ${isActive ? "rotate-180 text-primary-600" : "text-neutral-500"}`}
                  />
                </div>
              </div>

              {isActive && (
                <div className="mb-5 bg-white rounded-xl border border-neutral-200 animate-fadeIn overflow-hidden shadow-sm">
                  <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
                    <table className="w-full border-collapse text-left text-xs relative">
                      <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                          <th className="px-5 py-3 font-semibold bg-neutral-50">Employee Name</th>
                          <th className="px-5 py-3 font-semibold bg-neutral-50">Designation</th>
                          <th className="px-5 py-3 font-semibold bg-neutral-50">Reporting Manager</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamEmployees.map((emp: any, idx: number) => (
                          <tr key={emp.id || idx} className={`${idx !== teamEmployees.length - 1 ? "border-b border-neutral-100" : ""} hover:bg-primary-50/40 transition-colors`}>
                            <td className="px-5 py-3 text-neutral-800 font-semibold flex items-center gap-1.5">
                              {emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "—"}
                              {emp.is_wfh && (
                                <HomeIcon className="w-3.5 h-3.5 text-blue-500 inline-block animate-pulse" title="Working from Home" />
                              )}
                            </td>
                            <td className="px-5 py-3 text-neutral-600">
                              {emp.designation || "—"}
                            </td>
                            <td className="px-5 py-3 text-neutral-600">
                              {emp.reporting_manager || "—"}
                            </td>
                          </tr>
                        ))}
                        {teamEmployees.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-5 py-8 text-center text-neutral-500">
                              No members found in this team.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Panel>
    </div>
  );
};

export default DashboardTab;