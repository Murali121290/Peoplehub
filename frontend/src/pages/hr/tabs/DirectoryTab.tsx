import React from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import Panel from '../components/Panel';
import Btn from '../components/Btn';
import { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Spinner } from '../../../components/ui/Spinner';
import { Badge } from '../../../components/ui/Badge';

interface DirectoryTabProps {
  filteredEmps: any[];
  search: string;
  onSearchChange: (val: string) => void;
  onAddEmployee: () => void;
  BASE_URL: string;
}

const DirectoryTab: React.FC<DirectoryTabProps> = ({
  filteredEmps,
  search,
  onSearchChange,
  onAddEmployee,
  BASE_URL
}) => {


const [loadingEmployee, setLoadingEmployee] =
  useState(false);

  const [selectedEmployee, setSelectedEmployee] =
  useState<any>(null);

  const fetchEmployeeDetails = async (employeeId: number) => {
  try {
    setLoadingEmployee(true);

    console.log("BASE_URL =", BASE_URL);
    console.log(
      "URL =",
      `${BASE_URL}/employee-details/${employeeId}`
    );

    const response = await fetch(
      `${BASE_URL}/employee-details/${employeeId}`
    );

    const text = await response.text();

    console.log("Response Text:", text);

    const data = JSON.parse(text);

    setSelectedEmployee(data.employee);

  } catch (error) {
    console.error(error);
  } finally {
    setLoadingEmployee(false);
  }
};
  return (
    <Panel>

      {loadingEmployee && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-neutral-900/40">
          <div className="rounded-xl bg-white px-6 py-5 shadow-popover">
            <Spinner size="md" label="Loading Employee Details..." />
          </div>
        </div>
      )}

      <Modal
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        size="lg"
        title="Employee Details"
      >
        {selectedEmployee && (
          <>
            {/* Basic Information */}
            <div className="mb-5">
              <h3 className="mb-2.5 text-xs font-semibold uppercase text-neutral-600">
                Basic Information
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Name", value: selectedEmployee.name },
                  { label: "Role", value: selectedEmployee.role },
                  { label: "Designation", value: selectedEmployee.designation },
                  { label: "Manager", value: selectedEmployee.reporting_manager },
                  { label: "Shift", value: selectedEmployee.shift }
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5"
                  >
                    <div className="mb-0.5 text-[10px] font-semibold uppercase text-neutral-500">
                      {item.label}
                    </div>
                    <div className="text-[13px] font-semibold text-neutral-800">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="mb-5">
              <h3 className="mb-2.5 text-xs font-semibold uppercase text-neutral-600">
                Attendance Summary
              </h3>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-lg border border-success-200 bg-success-50 p-3 text-center">
                  <div className="mb-1 text-[10px] font-semibold text-success-700">
                    Present
                  </div>
                  <div className="text-2xl font-bold text-success-700">
                    {selectedEmployee.present_days || 0}
                  </div>
                </div>

                <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-center">
                  <div className="mb-1 text-[10px] font-semibold text-danger-700">
                    Absent
                  </div>
                  <div className="text-2xl font-bold text-danger-700">
                    {selectedEmployee.absent_days || 0}
                  </div>
                </div>

                <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-center">
                  <div className="mb-1 text-[10px] font-semibold text-warning-700">
                    Leave
                  </div>
                  <div className="text-2xl font-bold text-warning-700">
                    {selectedEmployee.leave_days || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Summary */}
            <div className="mb-5">
              <h3 className="mb-2.5 text-xs font-semibold uppercase text-neutral-600">
                Leave Summary
              </h3>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-lg border border-neutral-200 bg-white p-2.5 text-center">
                  <div className="mb-1 text-[9px] font-semibold text-neutral-400">
                    Total
                  </div>
                  <div className="text-lg font-bold text-neutral-500">
                    {selectedEmployee.total_leave_requests || 0}
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white p-2.5 text-center">
                  <div className="mb-1 text-[9px] font-semibold text-neutral-400">
                    Approved
                  </div>
                  <div className="text-lg font-bold text-success-700">
                    {selectedEmployee.approved_leaves || 0}
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white p-2.5 text-center">
                  <div className="mb-1 text-[9px] font-semibold text-neutral-400">
                    Rejected
                  </div>
                  <div className="text-lg font-bold text-danger-700">
                    {selectedEmployee.rejected_leaves || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Attendance Table */}
            <div>
              <h3 className="mb-2.5 text-xs font-semibold uppercase text-neutral-600">
                Recent Attendance
              </h3>

              <div className="overflow-hidden rounded-lg border border-neutral-200">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-neutral-50">
                    <tr>
                      {["Date", "In", "Out", "Status"].map((header) => (
                        <th
                          key={header}
                          className="border-b border-neutral-200 px-2 py-2.5 text-left text-[11px] font-semibold text-neutral-500"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEmployee.recent_attendance?.map((att: any, index: number) => (
                      <tr
                        key={index}
                        className={`border-b border-neutral-200 ${index % 2 === 0 ? "bg-white" : "bg-neutral-50"}`}
                      >
                        <td className="px-2 py-2.5 text-neutral-600">
                          {att.date}
                        </td>
                        <td className="px-2 py-2.5 text-neutral-600">
                          {att.check_in}
                        </td>
                        <td className="px-2 py-2.5 text-neutral-600">
                          {att.check_out}
                        </td>
                        <td className="px-2 py-2.5">
                          <Badge
                            size="sm"
                            variant={
                              att.status === "Present"
                                ? "success"
                                : att.status === "Absent"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {att.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </Modal>
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
                onClick={() =>
                  fetchEmployeeDetails(emp.user_id)
                }
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
                  <span className="text-[13px] font-medium text-neutral-800">{emp.designation || "N/A"}</span>
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
