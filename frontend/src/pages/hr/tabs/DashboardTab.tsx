import React, { useState } from 'react';
import { ChevronDownIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
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
}

const DashboardTab: React.FC<DashboardTabProps> = ({ counts, teamOverview }) => {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const statCards = [
    { label: "Total Employees", value: counts.total, sub: "All departments" },
    { label: "Active Today", value: counts.active, sub: "Working today" },
    { label: "On Leave", value: counts.onLeave, sub: "Away from work" },
    { label: "Pending Leaves", value: counts.pendingLeaves, sub: "Need approval" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {statCards.map((card) => (
          <Card key={card.label} variant="accent-left" accentColor="#46494C" padding="lg" className="shadow-md">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {card.label}
            </div>
            <div className="text-4xl font-extrabold text-neutral-800 mt-3">
              {card.value}
            </div>
            <div className="mt-2 text-sm text-neutral-400">{card.sub}</div>
          </Card>
        ))}
      </div>

      {/* Team Overview */}
      <Panel>
        <div className="text-lg font-bold text-neutral-800 mb-5 flex items-center gap-2.5">
          <Squares2X2Icon className="w-5 h-5" />
          Team Overview
        </div>

        {teamOverview.map((team) => {
          const teamEmployees = team.employees || [];
          const empCount = team.member_count ?? teamEmployees.length;
          const totalTeamSalary = team.total_salary ?? 0;
          const isActive = selectedTeam === team.team_name;

          return (
            <div key={team.team_id}>
              <div
                onClick={() => setSelectedTeam(isActive ? null : team.team_name)}
                className={`flex justify-between items-center px-[18px] py-4 rounded-2xl mb-3 cursor-pointer transition-all ${isActive
                    ? "bg-primary-50 border-2 border-primary-500 shadow-md"
                    : "bg-neutral-50 border border-neutral-200 shadow-sm"
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
                  <div className="bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg text-sm font-semibold">
                    {empCount}
                  </div>
                  <ChevronDownIcon
                    className={`w-[18px] h-[18px] transition-transform ${isActive ? "rotate-180 text-primary-600" : "text-neutral-500"}`}
                  />
                </div>
              </div>

              {isActive && (
                <div className="mb-5 px-[18px] py-4 bg-neutral-50 rounded-xl border border-neutral-200 animate-fadeIn">
                  <div className="flex gap-3 mb-4 flex-wrap">
                    <span className="bg-primary-500 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold">
                      Members: {empCount}
                    </span>
                    <span className="bg-success-600 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold">
                      Total Salary: ₹{totalTeamSalary.toLocaleString()}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-neutral-50 border-b-2 border-neutral-200">
                          {["Employee Name", "Role", "Reporting Manager", "Salary"].map((h) => (
                            <th key={h} className="px-3.5 py-3 text-left font-semibold text-neutral-800 text-sm">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {teamEmployees.map((emp: any, idx: number) => (
                          <tr key={emp.id} className={`${idx !== teamEmployees.length - 1 ? "border-b border-neutral-100" : ""} ${idx % 2 === 0 ? "bg-white" : "bg-neutral-50"}`}>
                            <td className="px-3.5 py-3 text-neutral-800">{emp.name}</td>
                            <td className="px-3.5 py-3 text-neutral-800">{emp.role}</td>
                            <td className="px-3.5 py-3 text-neutral-800">{emp.reporting_manager}</td>
                            <td className="px-3.5 py-3 text-neutral-800 font-medium">₹{Number(emp.salary || 0).toLocaleString()}</td>
                          </tr>
                        ))}
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
