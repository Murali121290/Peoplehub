import React, { useState, useMemo, useEffect } from 'react';
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

// Custom Premium Scrollable Dropdown Selector
const CustomSelect: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
}> = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    document.addEventListener("click", handleClose);
    return () => document.removeEventListener("click", handleClose);
  }, [isOpen]);

  return (
    <div className="relative w-full text-left" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded border border-neutral-200 bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700 outline-none hover:border-neutral-300"
        style={{ textTransform: "none" }}
      >
        <span className="truncate">{value === "All" ? placeholder : value}</span>
        <span className="ml-1 text-[8px] text-neutral-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`cursor-pointer px-2.5 py-1.5 text-[11px] text-neutral-700 hover:bg-neutral-100 truncate ${
                opt === value ? "bg-primary-50 font-bold text-primary-700" : ""
              }`}
              style={{ textTransform: "none" }}
              title={opt}
            >
              {opt === "All" ? placeholder : opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
  // Local Filter States
  const [desigFilter, setDesigFilter] = useState("All");
  const [managerFilter, setManagerFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [shiftFilter, setShiftFilter] = useState("All");
  const [workModeFilter, setWorkModeFilter] = useState("All");
  const [todayShiftFilter, setTodayShiftFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Dynamic filter lists from searched list
  const uniqueDesignations = useMemo(() => {
    const s = new Set<string>();
    filteredEmps.forEach(e => { if (e.designation) s.add(e.designation); });
    return ["All", ...Array.from(s)];
  }, [filteredEmps]);

  const uniqueManagers = useMemo(() => {
    const s = new Set<string>();
    filteredEmps.forEach(e => { if (e.reporting_manager) s.add(e.reporting_manager); });
    return ["All", ...Array.from(s)];
  }, [filteredEmps]);

  const uniqueTeams = useMemo(() => {
    const s = new Set<string>();
    filteredEmps.forEach(e => { if (e.department) s.add(e.department); });
    return ["All", ...Array.from(s)];
  }, [filteredEmps]);

  const uniqueShifts = useMemo(() => {
    const s = new Set<string>();
    filteredEmps.forEach(e => { if (e.shift_timing) s.add(e.shift_timing); });
    return ["All", ...Array.from(s)];
  }, [filteredEmps]);

  const uniqueWorkModes = useMemo(() => {
    const s = new Set<string>();
    filteredEmps.forEach(e => { if (e.work_mode) s.add(e.work_mode); });
    return ["All", ...Array.from(s)];
  }, [filteredEmps]);

  const uniqueTodayShifts = useMemo(() => {
    const s = new Set<string>();
    filteredEmps.forEach(e => {
      const shift = e.today_shift || e.shift_timing || "General Shift";
      s.add(shift);
    });
    return ["All", ...Array.from(s)];
  }, [filteredEmps]);

  const uniqueStatuses = useMemo(() => {
    const s = new Set<string>();
    filteredEmps.forEach(e => { if (e.status) s.add(e.status); });
    return ["All", ...Array.from(s)];
  }, [filteredEmps]);

  // Apply filters
  const displayedEmps = useMemo(() => {
    return filteredEmps.filter((emp) => {
      const matchDesig = desigFilter === "All" || emp.designation === desigFilter;
      const matchMgr = managerFilter === "All" || emp.reporting_manager === managerFilter;
      const matchTeam = teamFilter === "All" || emp.department === teamFilter;
      const matchShift = shiftFilter === "All" || emp.shift_timing === shiftFilter;
      const matchWorkMode = workModeFilter === "All" || (emp.work_mode || "Office") === workModeFilter;
      const matchTodayShift = todayShiftFilter === "All" || (emp.today_shift || emp.shift_timing || "General Shift") === todayShiftFilter;
      const matchStatus = statusFilter === "All" || emp.status === statusFilter;
      return matchDesig && matchMgr && matchTeam && matchShift && matchWorkMode && matchTodayShift && matchStatus;
    });
  }, [filteredEmps, desigFilter, managerFilter, teamFilter, shiftFilter, workModeFilter, todayShiftFilter, statusFilter]);

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

      <div className="overflow-x-auto overflow-y-auto max-h-[600px] rounded-xl border border-neutral-200 bg-neutral-100 shadow-sm">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b-2 border-neutral-200 text-neutral-500">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide min-w-[100px]">Employee ID</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide min-w-[150px]">Employee</th>
              
              {/* Designation Filter */}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide min-w-[160px]">
                <div className="flex flex-col gap-1.5">
                  <span>Designation</span>
                  <CustomSelect
                    value={desigFilter}
                    onChange={setDesigFilter}
                    options={uniqueDesignations}
                    placeholder="All"
                  />
                </div>
              </th>

              {/* Reporting Manager Filter */}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide min-w-[170px]">
                <div className="flex flex-col gap-1.5">
                  <span>Reporting Manager</span>
                  <CustomSelect
                    value={managerFilter}
                    onChange={setManagerFilter}
                    options={uniqueManagers}
                    placeholder="All"
                  />
                </div>
              </th>

              {/* Team Filter */}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide min-w-[140px]">
                <div className="flex flex-col gap-1.5">
                  <span>Team</span>
                  <CustomSelect
                    value={teamFilter}
                    onChange={setTeamFilter}
                    options={uniqueTeams}
                    placeholder="All"
                  />
                </div>
              </th>

              {/* Shift Filter */}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide min-w-[140px]">
                <div className="flex flex-col gap-1.5">
                  <span>Shift</span>
                  <CustomSelect
                    value={shiftFilter}
                    onChange={setShiftFilter}
                    options={uniqueShifts}
                    placeholder="All"
                  />
                </div>
              </th>

              {/* Work Mode Filter */}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide min-w-[120px]">
                <div className="flex flex-col gap-1.5">
                  <span>Work Mode</span>
                  <CustomSelect
                    value={workModeFilter}
                    onChange={setWorkModeFilter}
                    options={uniqueWorkModes}
                    placeholder="All"
                  />
                </div>
              </th>

              {/* Today Shift Filter */}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide min-w-[140px]">
                <div className="flex flex-col gap-1.5">
                  <span>Today Shift</span>
                  <CustomSelect
                    value={todayShiftFilter}
                    onChange={setTodayShiftFilter}
                    options={uniqueTodayShifts}
                    placeholder="All"
                  />
                </div>
              </th>

              {/* Status Filter */}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide min-w-[120px]">
                <div className="flex flex-col gap-1.5">
                  <span>Status</span>
                  <CustomSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={uniqueStatuses}
                    placeholder="All"
                  />
                </div>
              </th>

              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide min-w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedEmps.map((emp, index) => (
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
        {displayedEmps.length === 0 && (
          <div className="px-5 py-12 text-center text-neutral-500">
            <div className="mb-1.5 text-[15px] font-semibold text-neutral-800">No employees found</div>
            <div className="mb-4 text-[13px]">Try adjusting your search or filter terms</div>
          </div>
        )}
      </div>
      {displayedEmps.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-[13px] text-neutral-500">
          <span>Showing <strong className="text-neutral-800">{displayedEmps.length}</strong> {displayedEmps.length === 1 ? "employee" : "employees"}</span>
          <span>Last updated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      )}
    </Panel>
  );
};

export default DirectoryTab;
