import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  CheckIcon,
  EyeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface AttendanceSummaryModalProps {
  reportingEmployees: any[];
  onClose: () => void;
  onViewEmployee: (emp: any) => void;
  onApproveAll: () => void;
  onApproveEmployee: (employeeId: number) => void;
  onRejectEmployee: (employeeId: number) => void;
  onRefresh?: () => void;
}

const AttendanceSummaryModal: React.FC<AttendanceSummaryModalProps> = ({
  reportingEmployees,
  onClose,
  onViewEmployee,
  onApproveAll,
  onApproveEmployee,
  onRejectEmployee,
  onRefresh,
}) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<"approve" | "reject" | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setEmployees(
      reportingEmployees.map((emp) => ({
        ...emp,
        decision: emp.decision || emp.manager_status || "Pending",
      }))
    );
  }, [reportingEmployees]);

  const approvedCount = employees.filter((e) => e.decision === "Approved").length;
  const rejectedCount = employees.filter((e) => e.decision === "Rejected").length;
  const pendingCount = employees.filter(
    (e) => !e.decision || e.decision === "Pending"
  ).length;

  const handleApproveSingle = (empId: number) => {
    onApproveEmployee(empId);
    setEmployees((prev) =>
      prev.map((e) =>
        (e.employee_id === empId || e.id === empId)
          ? { ...e, decision: "Approved" }
          : e
      )
    );
  };

  const handleRejectSingle = (empId: number) => {
    onRejectEmployee(empId);
    setEmployees((prev) =>
      prev.map((e) =>
        (e.employee_id === empId || e.id === empId)
          ? { ...e, decision: "Rejected" }
          : e
      )
    );
  };

  const handleConfirmAction = () => {
    if (confirmDialog === "approve") {
      const pendingItems = employees.filter(
        (e) => !e.decision || e.decision === "Pending"
      );
      pendingItems.forEach((e) => {
        onApproveEmployee(e.employee_id || e.id);
      });
      setEmployees((prev) =>
        prev.map((e) =>
          !e.decision || e.decision === "Pending"
            ? { ...e, decision: "Approved" }
            : e
        )
      );
    } else if (confirmDialog === "reject") {
      const pendingItems = employees.filter(
        (e) => !e.decision || e.decision === "Pending"
      );
      pendingItems.forEach((e) => {
        onRejectEmployee(e.employee_id || e.id);
      });
      setEmployees((prev) =>
        prev.map((e) =>
          !e.decision || e.decision === "Pending"
            ? { ...e, decision: "Rejected" }
            : e
        )
      );
    }
    setConfirmDialog(null);
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "present") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Present
        </span>
      );
    }
    if (s === "absent") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Absent
        </span>
      );
    }
    if (s === "late") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Late
        </span>
      );
    }
    if (s === "half day") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          Half Day
        </span>
      );
    }
    if (s === "leave") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Leave
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
        {status || "Pending"}
      </span>
    );
  };

  const getVerificationBadge = (decision: string) => {
    if (decision === "Approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
          Approved
        </span>
      );
    }
    if (decision === "Rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircleIcon className="w-3.5 h-3.5 text-rose-600" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Pending
      </span>
    );
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[112px] bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 md:p-6 transition-all duration-300">
      <div className="bg-white rounded-[20px] shadow-2xl w-[1100px] max-w-full overflow-hidden border border-neutral-100 flex flex-col max-h-[calc(100vh-136px)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 md:px-8 py-5 border-b border-neutral-100 flex justify-between items-center bg-white flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="bg-teal-50 p-2.5 rounded-2xl text-teal-600 shadow-sm border border-teal-100">
              <UserGroupIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                Yesterday Attendance Summary
              </h2>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Review and approve yesterday's attendance before payroll processing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshClick}
              title="Refresh Data"
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 border border-neutral-200 transition-all duration-200"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? "animate-spin text-teal-600" : ""}`} />
            </button>
            <button
              onClick={onClose}
              title="Close Modal"
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 border border-neutral-200 transition-all duration-200"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Employee Table */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-sm bg-white">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="text-left py-3.5 px-5">Employee</th>
                  <th className="text-left py-3.5 px-5">Department</th>
                  <th className="text-left py-3.5 px-5">Status</th>
                  <th className="text-left py-3.5 px-5">Check In</th>
                  <th className="text-left py-3.5 px-5">Check Out</th>
                  <th className="text-left py-3.5 px-5">Working Hours</th>
                  <th className="text-left py-3.5 px-5">Verification</th>
                  <th className="text-center py-3.5 px-5 w-[260px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm font-medium">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-400 font-medium">
                      No yesterday attendance records found for approval.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp: any) => {
                    const isApproved = emp.decision === "Approved";
                    const isRejected = emp.decision === "Rejected";

                    return (
                      <tr
                        key={emp.employee_id || emp.id}
                        className="hover:bg-neutral-50/60 transition-colors"
                      >
                        {/* Employee Info */}
                        <td className="py-3.5 px-5">
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
                              <p className="font-semibold text-neutral-800 text-xs md:text-sm">
                                {emp.employee_name}
                              </p>
                              <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                {emp.employee_code || `EMP${emp.employee_id}`}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-5 text-neutral-600 text-xs">
                          {emp.department || "General"}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-5">
                          {getStatusBadge(emp.status)}
                        </td>

                        {/* Check In */}
                        <td className="py-3.5 px-5 text-neutral-600 text-xs font-mono">
                          {emp.check_in || "—"}
                        </td>

                        {/* Check Out */}
                        <td className="py-3.5 px-5 text-neutral-600 text-xs font-mono">
                          {emp.check_out || "—"}
                        </td>

                        {/* Working Hours */}
                        <td className="py-3.5 px-5">
                          <span className="font-bold text-neutral-700 text-xs">
                            {emp.working_hours ? `${emp.working_hours} hrs` : "0 hrs"}
                          </span>
                        </td>

                        {/* Verification Status */}
                        <td className="py-3.5 px-5">
                          {getVerificationBadge(emp.decision)}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Button */}
                            <button
                              onClick={() => onViewEmployee(emp)}
                              className="h-9 px-3 py-1.5 border border-neutral-200 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 rounded-xl text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 shadow-xs flex items-center gap-1.5"
                              title="View Details"
                            >
                              <EyeIcon className="w-3.5 h-3.5" />
                              View
                            </button>

                            {/* Approve Button */}
                            <button
                              disabled={isApproved}
                              onClick={() => handleApproveSingle(emp.employee_id || emp.id)}
                              className={`h-9 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                                isApproved
                                  ? "bg-[#F8FAFC] text-neutral-400 border border-[#E2E8F0] cursor-not-allowed opacity-70"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:-translate-y-0.5 active:bg-emerald-200 active:translate-y-0 shadow-xs"
                              }`}
                            >
                              <CheckIcon className="w-3.5 h-3.5 text-emerald-700" />
                              Approve
                            </button>

                            {/* Reject Button */}
                            <button
                              disabled={isRejected}
                              onClick={() => handleRejectSingle(emp.employee_id || emp.id)}
                              className={`h-9 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                                isRejected
                                  ? "bg-[#F8FAFC] text-neutral-400 border border-[#E2E8F0] cursor-not-allowed opacity-70"
                                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 hover:-translate-y-0.5 active:bg-rose-200 active:translate-y-0 shadow-xs"
                              }`}
                            >
                              <XMarkIcon className="w-3.5 h-3.5 text-rose-700" />
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

        {/* Footer */}
        <div className="px-6 md:px-8 py-4 border-t border-neutral-100 flex flex-col md:flex-row justify-between items-center bg-neutral-50/50 flex-shrink-0 gap-4">
          {/* Left: Close */}
          <button
            onClick={onClose}
            className="h-10 px-4 py-2 border border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-neutral-800 rounded-xl text-xs font-semibold hover:bg-white transition-all duration-200 shadow-xs"
          >
            Close
          </button>

          {/* Center: Real-time Footer Summary */}
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full border border-neutral-200 shadow-xs text-xs font-bold">
            <span className="text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Approved : {approvedCount}
            </span>
            <span className="text-neutral-300">|</span>
            <span className="text-rose-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Rejected : {rejectedCount}
            </span>
            <span className="text-neutral-300">|</span>
            <span className="text-amber-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Pending : {pendingCount}
            </span>
          </div>

          {/* Right: Approve All & Reject All */}
          <div className="flex items-center gap-2">
            {/* Reject All Button */}
            <button
              disabled={pendingCount === 0}
              onClick={() => setConfirmDialog("reject")}
              className={`h-10 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                pendingCount === 0
                  ? "bg-[#F8FAFC] text-neutral-400 border border-[#E2E8F0] cursor-not-allowed opacity-70"
                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 hover:-translate-y-0.5 active:bg-rose-200 active:translate-y-0 shadow-xs"
              }`}
            >
              <XCircleIcon className="w-4 h-4 text-rose-700" />
              {pendingCount === 0 ? "All Employees Processed" : "Reject All"}
            </button>

            {/* Approve All Button */}
            <button
              disabled={pendingCount === 0}
              onClick={() => setConfirmDialog("approve")}
              className={`h-10 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                pendingCount === 0
                  ? "bg-[#F8FAFC] text-neutral-400 border border-[#E2E8F0] cursor-not-allowed opacity-70"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:-translate-y-0.5 active:bg-emerald-200 active:translate-y-0 shadow-xs"
              }`}
            >
              <CheckCircleIcon className="w-4 h-4 text-emerald-700" />
              {pendingCount === 0 ? "All Employees Processed" : "Approve All"}
            </button>
          </div>
        </div>

        {/* Confirmation Modal Overlay */}
        {confirmDialog && (
          <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100">
                <ExclamationTriangleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-800">
                  {confirmDialog === "approve" ? "Approve All Pending" : "Reject All Pending"}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  {confirmDialog === "approve"
                    ? "Approve all remaining pending employees?"
                    : "Reject all remaining pending employees?"}
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    confirmDialog === "approve"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  }`}
                >
                  {confirmDialog === "approve" ? "Approve" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AttendanceSummaryModal;