import React from 'react';
import { MagnifyingGlassIcon, PlusIcon, KeyIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Panel from '../components/Panel';
import Btn from '../components/Btn';
import { Badge } from '../../../components/ui/Badge';

interface DirectoryTabProps {
  filteredEmps: any[];
  search: string;
  onEditEmployee: (employee: any) => void;
  onSearchChange: (val: string) => void;
  onAddEmployee: () => void;
  onResetPassword: (userId: string) => void;
  onResetAllPasswords: () => void;
  BASE_URL: string;
}

const DirectoryTab: React.FC<DirectoryTabProps> = ({
  filteredEmps,
  search,
  onSearchChange,
  onEditEmployee,
  onAddEmployee,
  onResetPassword,
  onResetAllPasswords,
  BASE_URL
}) => {

  return (
    <Panel>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 mb-1 text-[26px] font-bold text-neutral-800">Employee Directory</h1>
          <p className="m-0 text-sm text-neutral-500">View and manage all employees</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-[10px] border border-neutral-200 bg-neutral-100 px-3.5 py-2">
            <MagnifyingGlassIcon className="h-[18px] w-[18px] text-neutral-500" />
            <input
              placeholder="Search by name, dept, or role..."
              value={search}
              onChange={(e: any) => onSearchChange(e.target.value)}
              className="w-[250px] border-none bg-transparent text-[13px] text-neutral-800 outline-none placeholder:text-neutral-400"
            />
          </div>
          <button 
            onClick={onResetAllPasswords} 
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-red-700 active:bg-red-800"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" /> Reset All Passwords
          </button>
          <Btn onClick={onAddEmployee}>
            <PlusIcon className="h-3.5 w-3.5" /> Add Employee
          </Btn>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-100 shadow-sm">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b-2 border-neutral-200 bg-white text-neutral-500">
              {["Employee ID", "Employee", "Designation", "Reporting Manager", "Team", "Shift", "Work Mode", "Today Shift", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-4 text-xs font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmps.map((emp, index) => (
             <tr
                key={emp.id}
                className={`border-b border-neutral-200 transition-colors duration-150 hover:bg-primary-50 ${
                  index % 2 === 0 ? "bg-neutral-100" : "bg-white"
                }`}
              >
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onEditEmployee(emp)}>
                  <span className="text-[13px] font-medium text-neutral-800">{emp.employee_id || "—"}</span>
                </td>
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onEditEmployee(emp)}>
                  <div className="text-sm font-semibold text-neutral-800">{emp.first_name} {emp.last_name}</div>
                </td>
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onEditEmployee(emp)}>
                  <span className="text-[13px] font-medium text-neutral-800">{emp.designation || "N/A"}</span>
                </td>
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onEditEmployee(emp)}>
                  <span className="text-[13px] text-neutral-500">{emp.reporting_manager || "—"}</span>
                </td>
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onEditEmployee(emp)}>
                  <span className="text-[13px] font-medium text-neutral-800">
                    {emp.department || "N/A"}
                  </span>
                </td>
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onEditEmployee(emp)}>
                  {emp.shift_timing || "-"}
                </td>
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onEditEmployee(emp)}>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    emp.work_mode === "WFH" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-neutral-100 text-neutral-600 border-neutral-200"
                  }`}>
                    {emp.work_mode || "Office"}
                  </span>
                </td>
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onEditEmployee(emp)}>
                  {(() => {
                    const shift = emp.today_shift || emp.shift_timing || "General Shift";
                    const type = emp.today_shift_type || "permanent";
                    const chipClass =
                      type === "wfh"
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : type === "changed"
                        ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                        : "bg-neutral-100 text-neutral-600 border-neutral-200";
                    return (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chipClass}`}
                        title={type === "changed" ? `Shift changed today: ${shift}` : shift}>
                        {type === "wfh" && (
                          <img src="/wfh-icon.svg" alt="WFH" className="w-3 h-3" />
                        )}
                        {shift}
                        {type === "changed" && <span className="text-[9px]">↺</span>}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-3.5 cursor-pointer" onClick={() => onEditEmployee(emp)}>
                  {emp.status === "Present" ? (
                    <Badge variant="success">Present</Badge>
                  ) : (
                    <Badge variant="danger">Absent</Badge>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onResetPassword(emp.user_id); }}
                    className="flex items-center gap-1 text-red-600 hover:text-red-800 font-medium"
                    title="Reset Password to Welcome_PeopleHub"
                  >
                    <KeyIcon className="w-4 h-4" />
                    Reset
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredEmps.length === 0 && (
          <div className="px-5 py-12 text-center text-neutral-500">
            <div className="mb-1.5 text-[15px] font-semibold text-neutral-800">No employees found</div>
            <div className="mb-4 text-[13px]">Try adjusting your search terms</div>
          </div>
        )}
      </div>
      {filteredEmps.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-[13px] text-neutral-500">
          <span>Showing <strong className="text-neutral-800">{filteredEmps.length}</strong> {filteredEmps.length === 1 ? "employee" : "employees"}</span>
          <span>Last updated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      )}
    </Panel>
  );
};



export default DirectoryTab;
