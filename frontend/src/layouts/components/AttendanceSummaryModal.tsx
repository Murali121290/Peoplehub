import React from "react";
import {
  XMarkIcon,
  CheckIcon,
  EyeIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface AttendanceSummaryModalProps {
  reportingEmployees: any[];
  onClose: () => void;
  onViewEmployee: (emp: any) => void;
  onApproveAll: () => void;
  onApproveEmployee: (employeeId: number) => void;
  onRejectEmployee: (employeeId: number) => void;
}

const AttendanceSummaryModal: React.FC<AttendanceSummaryModalProps> = ({
  reportingEmployees,
  onClose,
  onViewEmployee,
  onApproveAll,
  onApproveEmployee,
  onRejectEmployee,
}) => {
  const presentCount = reportingEmployees.filter((e) => e.status === "Present").length;
  const absentCount = reportingEmployees.filter((e) => e.status === "Absent").length;
  const lateCount = reportingEmployees.filter((e) => e.status === "Late").length;

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-[850px] max-w-full overflow-hidden border border-neutral-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modern Premium Header */}
        <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-gradient-to-r from-neutral-50 to-white">
          <div className="flex items-center gap-3.5">
            <div className="bg-primary-50 p-2.5 rounded-2xl text-primary-600 shadow-sm border border-primary-100">
              <UserGroupIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-800 tracking-tight">
                Yesterday's Attendance Summary
              </h2>
              <p className="text-xs text-neutral-400 font-medium mt-0.5">
                Review and approve yesterday's check-in status log for your team
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-all duration-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Quick Stat Counters */}
        <div className="grid grid-cols-3 gap-4 px-8 py-4 bg-neutral-50/50 border-b border-neutral-100">
          <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Present</p>
              <h4 className="text-lg font-bold text-emerald-700 mt-0.5">{presentCount}</h4>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/60 text-emerald-600 flex items-center justify-center font-bold">
              ✓
            </div>
          </div>

          <div className="bg-rose-50/30 border border-rose-100/50 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Absent / Rejected</p>
              <h4 className="text-lg font-bold text-rose-700 mt-0.5">{absentCount}</h4>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-100/60 text-rose-650 flex items-center justify-center font-bold">
              ✗
            </div>
          </div>

          <div className="bg-indigo-50/30 border border-indigo-100/50 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Total Actions</p>
              <h4 className="text-lg font-bold text-indigo-700 mt-0.5">{reportingEmployees.length}</h4>
            </div>
            <div className="w-8 h-8 rounded-xl bg-indigo-100/60 text-indigo-650 flex items-center justify-center font-bold">
              Σ
            </div>
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="p-8 overflow-y-auto flex-1 bg-white">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-sm bg-white">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-neutral-50/60 border-b border-neutral-200 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="text-left py-3.5 px-5">Team Employee</th>
                  <th className="text-left py-3.5 px-5">Marked Status</th>
                  <th className="text-left py-3.5 px-5">Check In</th>
                  <th className="text-left py-3.5 px-5">Check Out</th>
                  <th className="text-left py-3.5 px-5">Hours</th>
                  <th className="text-center py-3.5 px-5 pr-6 w-[260px]">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm font-medium">
                {reportingEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      No pending items to verify.
                    </td>
                  </tr>
                ) : (
                  reportingEmployees.map((emp: any, idx: number) => {
                    const isPresent = emp.status === "Present";
                    const isAbsent = emp.status === "Absent";
                    const isLate = emp.status === "Late";

                    return (
                      <tr
                        key={emp.employee_id}
                        className="hover:bg-neutral-50/40 transition-colors"
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                emp.profile_image
                                  ? `data:image/jpeg;base64,${emp.profile_image}`
                                  : "/default-avatar.png"
                              }
                              alt={emp.employee_name}
                              className="w-9 h-9 rounded-full object-cover border border-neutral-200 shadow-sm bg-neutral-50"
                            />
                            <div>
                              <p className="font-semibold text-neutral-800 text-[13.5px]">
                                {emp.employee_name}
                              </p>
                              <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                                {emp.designation || "Staff"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                              isPresent
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                : isAbsent
                                ? "bg-rose-50 border-rose-100 text-rose-700"
                                : "bg-warning-50 border-warning-100 text-warning-700"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isPresent
                                  ? "bg-emerald-500"
                                  : isAbsent
                                  ? "bg-rose-500"
                                  : "bg-warning-500"
                              }`}
                            />
                            {emp.status}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-neutral-500 text-xs">
                          {emp.check_in || "—"}
                        </td>
                        <td className="py-4 px-5 text-neutral-500 text-xs">
                          {emp.check_out || "—"}
                        </td>
                        <td className="py-4 px-5">
                          <span className="font-bold text-neutral-700 text-xs">
                            {emp.working_hours || "0h"}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-center pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onViewEmployee(emp)}
                              className="px-2.5 py-1.5 border border-neutral-200 hover:border-neutral-300 text-neutral-500 hover:text-neutral-700 rounded-lg text-xs font-semibold hover:bg-neutral-50 transition-all flex items-center gap-1"
                              title="View Details"
                            >
                              <EyeIcon className="w-3.5 h-3.5" />
                              View
                            </button>

                            <button
                              onClick={() => onApproveEmployee(emp.employee_id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-1"
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                              Approve
                            </button>

                            <button
                              onClick={() => onRejectEmployee(emp.employee_id)}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-1"
                            >
                              <XMarkIcon className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clean Modern Footer */}
        <div className="px-8 py-5 border-t border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-neutral-200 hover:border-neutral-300 text-neutral-500 hover:text-neutral-700 rounded-xl text-xs font-semibold hover:bg-neutral-100 transition-all"
          >
            Close Summary
          </button>

          <button
            onClick={onApproveAll}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
          >
            <CheckCircleIcon className="w-4 h-4" />
            Approve All Pending
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummaryModal;