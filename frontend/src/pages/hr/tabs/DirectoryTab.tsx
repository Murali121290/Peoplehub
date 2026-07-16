import React from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import Panel from '../components/Panel';
import Btn from '../components/Btn';
import { Badge } from '../../../components/ui/Badge';

interface DirectoryTabProps {
  filteredEmps: any[];
  search: string;
  onEditEmployee: (employee: any) => void;
  onSearchChange: (val: string) => void;
  onAddEmployee: () => void;
  BASE_URL: string;
}

const DirectoryTab: React.FC<DirectoryTabProps> = ({
  filteredEmps,
  search,
  onSearchChange,
  onEditEmployee,
  onAddEmployee,
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
          <Btn onClick={onAddEmployee}>
            <PlusIcon className="h-3.5 w-3.5" /> Add Employee
          </Btn>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-100 shadow-sm">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b-2 border-neutral-200 bg-white text-neutral-500">
              {["Employee", "Role", "Reporting Manager", "Team/Designation","Shift", "Status"].map((h) => (
                <th key={h} className="px-4 py-4 text-xs font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmps.map((emp, index) => (
             <tr
    key={emp.id}
    onClick={() => onEditEmployee(emp)}
                className={`cursor-pointer border-b border-neutral-200 transition-colors duration-150 hover:bg-primary-50 ${
                  index % 2 === 0 ? "bg-neutral-100" : "bg-white"
                }`}
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-[13px] font-bold text-white">
                      {(emp.first_name?.[0] || "E") + (emp.last_name?.[0] || "")}
                    </div>
                    <div className="text-sm font-semibold text-neutral-800">{emp.first_name} {emp.last_name}</div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[13px] font-medium text-neutral-800">{emp.role || "N/A"}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[13px] text-neutral-500">{emp.reporting_manager || "—"}</span>
                </td>
                <td className="px-4 py-3.5">
  <span className="text-[13px] font-medium text-neutral-800">
    {emp.department || "N/A"}
  </span>
</td>
                <td className="px-4 py-3.5">
                  {emp.shift_timing || "-"}
                </td>
                <td className="px-4 py-3.5">
                  {emp.status === "Present" ? (
                    <Badge variant="success">Present</Badge>
                  ) : (
                    <Badge variant="danger">Absent</Badge>
                  )}
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
