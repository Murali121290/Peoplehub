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
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/react/24/outline";
import { BookLoader } from "../../components/ui/Spinner";
import { getProfileImageUrl } from "../../config/api";

const formatWorkingHours = (hoursVal: any) => {
  if (hoursVal == null || hoursVal === "" || hoursVal === 0 || hoursVal === "0" || hoursVal === "0.0") return "—";
  const num = Number(hoursVal);
  if (isNaN(num) || num <= 0) return "—";
  const hrs = Math.floor(num);
  const mins = Math.round((num - hrs) * 60);
  return `${hrs} h ${mins} m`;
};

interface AttendanceSummaryModalProps {
  reportingEmployees: any[];
  onClose: () => void;
  onViewEmployee: (emp: any) => void;
  onApproveAll: () => void;
  onRejectAll?: (reason?: string) => void;
  onApproveEmployee: (employeeId: number, date?: string) => void;
  onRejectEmployee: (employeeId: number, reason?: string, date?: string) => void;
  onNeedClarification?: (employeeId: number, reason?: string, date?: string) => void;
  onRefresh?: () => void;
}

const AttendanceSummaryModal: React.FC<AttendanceSummaryModalProps> = ({
  reportingEmployees,
  onClose,
  onViewEmployee,
  onApproveAll,
  onRejectAll,
  onApproveEmployee,
  onRejectEmployee,
  onNeedClarification,
  onRefresh,
}) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<"approve" | "reject" | null>(null);
  const [rejectReasonModal, setRejectReasonModal] = useState<{ open: boolean; empId?: number; date?: string; isBulk?: boolean }>({ open: false });
  const [rejectReasonText, setRejectReasonText] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [regularizationPopup, setRegularizationPopup] = useState<any | null>(null);
  const [missingTimingPopup, setMissingTimingPopup] = useState<any | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
    (e) => (!e.decision || e.decision === "Pending") && !e.employee_reply
  ).length;
  const clarificationProvidedCount = employees.filter(
    (e) => e.decision === "Clarification Provided" || !!e.employee_reply
  ).length;
  const needClarificationCount = employees.filter(
    (e) => (e.decision === "Need Clarification" || e.decision === "Rejected") && !e.employee_reply
  ).length;

  const handleApproveSingle = async (empId: number, date?: string, isConfirmedRegularization: boolean = false) => {
    const emp = employees.find(
      (e) => (e.employee_id === empId || e.id === empId) && (!date || e.summary_date === date)
    );
    if (!emp) return;

    // Check if regularization is pending (employee proposed check-in/out)
    const isPendingRegularization = emp.is_regularization && emp.decision !== "Approved" && emp.decision !== "Rejected" && emp.decision !== "Need Clarification";
    if (isPendingRegularization && !isConfirmedRegularization) {
      setRegularizationPopup(emp);
      return;
    }

    // Only check for missing timings if they are NOT regularizing and NOT on Leave
    const isLeave = emp.status === "Leave" || emp.attendance_status === "Leave";
    if (!isPendingRegularization && !isLeave) {
      const checkIn = emp.check_in;
      const checkOut = emp.check_out;
      const hasCheckIn = checkIn && checkIn !== "-" && checkIn !== "—";
      const hasCheckOut = checkOut && checkOut !== "-" && checkOut !== "—";

      if ((!hasCheckIn || !hasCheckOut) && !missingTimingPopup) {
        setMissingTimingPopup(emp);
        return;
      }
    }

    setIsActionLoading(true);
    try {
      await onApproveEmployee(empId, date);
      setEmployees((prev) =>
        prev.map((e) =>
          (e.employee_id === empId || e.id === empId) && (!date || e.summary_date === date)
            ? { ...e, decision: "Approved" }
            : e
        )
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const openRejectReasonModal = (empId?: number, isBulk: boolean = false, date?: string) => {
    setRejectReasonText("");
    setRejectReasonModal({ open: true, empId, isBulk, date });
  };

  const handleConfirmRejectionWithReason = async () => {
    const reason = rejectReasonText.trim();
    setIsActionLoading(true);
    try {
      if (rejectReasonModal.isBulk) {
        if (onRejectAll) {
          await onRejectAll(reason);
        } else {
          const pendingItems = employees.filter(
            (e) => !e.decision || e.decision === "Pending"
          );
          for (const e of pendingItems) {
            await onRejectEmployee(e.employee_id || e.id, reason, e.summary_date);
          }
        }
        setEmployees((prev) =>
          prev.map((e) =>
            !e.decision || e.decision === "Pending"
              ? { ...e, decision: "Rejected" }
              : e
          )
        );
      } else if (rejectReasonModal.empId != null) {
        const empId = rejectReasonModal.empId;
        const targetDate = rejectReasonModal.date;
        if (onNeedClarification) {
          await onNeedClarification(empId, reason, targetDate);
        } else {
          await onRejectEmployee(empId, reason, targetDate);
        }
        setEmployees((prev) =>
          prev.map((e) =>
            (e.employee_id === empId || e.id === empId) && (!targetDate || e.summary_date === targetDate)
              ? {
                ...e,
                decision: "Need Clarification",
                manager_status: "Need Clarification",
                employee_reply: null,
                clarification_comment: reason,
                clarification_history: [
                  ...(e.clarification_history || []),
                  {
                    id: `msg_${Date.now()}`,
                    sender_role: "manager",
                    sender_name: "Manager",
                    comment: reason,
                    timestamp: new Date().toISOString()
                  }
                ]
              }
              : e
          )
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsActionLoading(false);
      setRejectReasonModal({ open: false });
      setConfirmDialog(null);
    }
  };

  const handleConfirmAction = async () => {
    if (confirmDialog === "approve") {
      setIsActionLoading(true);
      try {
        if (onApproveAll) {
          await onApproveAll();
        } else {
          const pendingItems = employees.filter(
            (e) => !e.decision || e.decision === "Pending"
          );
          for (const e of pendingItems) {
            const isLeave = e.status === "Leave" || e.attendance_status === "Leave";
            const checkIn = e.check_in;
            const checkOut = e.check_out;
            const hasCheckIn = checkIn && checkIn !== "-" && checkIn !== "—";
            const hasCheckOut = checkOut && checkOut !== "-" && checkOut !== "—";
            if (!isLeave && (!hasCheckIn || !hasCheckOut)) {
              continue;
            }
            await onApproveEmployee(e.employee_id || e.id);
          }
          setEmployees((prev) =>
            prev.map((e) => {
              const isLeave = e.status === "Leave" || e.attendance_status === "Leave";
              const checkIn = e.check_in;
              const checkOut = e.check_out;
              const hasCheckIn = checkIn && checkIn !== "-" && checkIn !== "—";
              const hasCheckOut = checkOut && checkOut !== "-" && checkOut !== "—";
              if (!isLeave && (!hasCheckIn || !hasCheckOut)) {
                return e;
              }
              return (!e.decision || e.decision === "Pending") ? { ...e, decision: "Approved" } : e;
            })
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsActionLoading(false);
        setConfirmDialog(null);
      }
    } else if (confirmDialog === "reject") {
      setConfirmDialog(null);
      openRejectReasonModal(undefined, true);
    }
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
    if (decision === "Clarification Provided") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-300">
          <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5 text-sky-600" />
          Clarification Provided
        </span>
      );
    }
    if (decision === "Need Clarification" || decision === "Rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-600" />
          Need Clarification
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        Pending
      </span>
    );
  };

  useEffect(() => {
    if (employees.length > 0) {
      const activeCount = employees.filter(
        (e) => e.decision !== "Approved" && e.manager_status !== "Approved"
      ).length;
      if (activeCount === 0) {
        const timer = setTimeout(() => {
          onClose();
        }, 400); // 400ms delay for visual feedback of last item disappearing
        return () => clearTimeout(timer);
      }
    }
  }, [employees, onClose]);

  const sortedEmployees = React.useMemo(() => {
    return employees
      .filter((e) => e.decision !== "Approved" && e.manager_status !== "Approved" && !e.is_one_day_wages)
      .sort((a: any, b: any) =>
        (a.employee_name || "").localeCompare(b.employee_name || "", undefined, { sensitivity: 'base' })
      );
  }, [employees]);

  const oneDayWagesEmployees = React.useMemo(() => {
    return employees
      .filter((e) => e.decision !== "Approved" && e.manager_status !== "Approved" && e.is_one_day_wages)
      .sort((a: any, b: any) =>
        (a.employee_name || "").localeCompare(b.employee_name || "", undefined, { sensitivity: 'base' })
      );
  }, [employees]);

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-3 md:p-5 transition-all duration-300 overscroll-contain">
      {isActionLoading && <BookLoader />}
      <div className="bg-white rounded-[20px] shadow-2xl w-[1280px] max-w-[96vw] overflow-hidden border border-neutral-100 flex flex-col max-h-[calc(100vh-60px)] animate-in fade-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="px-5 md:px-7 py-4 border-b border-neutral-100 flex justify-between items-center bg-white flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="bg-teal-50 p-2.5 rounded-2xl text-teal-600 shadow-sm border border-teal-100">
              <UserGroupIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                Yesterday Attendance Summary
              </h2>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Review and approve attendance for {employees[0]?.summary_date_formatted ? <span className="font-bold text-teal-700">{employees[0].summary_date_formatted}</span> : "last working day"} before payroll processing.
                <span className="block mt-1 text-[11px] text-teal-600 font-medium bg-teal-50/50 inline-block px-2 py-0.5 rounded">
                  Note: Only employees with Short Working Hours (&lt; 8 hrs Weekdays, &lt; 7 hrs Weekends) or Absent status are shown here (Full hours/Approved leaves are auto-approved).
                </span>
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
        <div className="p-4 md:p-6 flex-1 flex flex-col bg-white overflow-hidden">
          <div className="overflow-auto rounded-2xl border border-neutral-200 shadow-sm bg-white max-h-[calc(100vh-270px)] overscroll-contain">
            <table className="w-full border-collapse min-w-[1000px] relative">
              <thead className="sticky top-0 z-30 bg-neutral-50 shadow-xs">
                <tr className="bg-neutral-50 text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
                  <th rowSpan={2} className="bg-neutral-50 border-b border-neutral-200 border-r border-neutral-200 text-left py-3.5 px-4 min-w-[160px]">Employee</th>
                  <th rowSpan={2} className="bg-neutral-50 border-b border-neutral-200 border-r border-neutral-200 text-left py-3.5 px-3 min-w-[120px]">Department</th>
                  <th colSpan={6} className="bg-blue-100/80 text-blue-800 font-extrabold border-b border-neutral-200 border-r-2 border-blue-200 text-center py-2 px-3">Web Site Entry</th>
                  <th colSpan={3} className="bg-purple-100/80 text-purple-800 font-extrabold border-b border-neutral-200 border-r-2 border-purple-200 text-center py-2 px-3">Biometric Card Entry</th>
                  <th rowSpan={2} className="bg-neutral-50 border-b border-neutral-200 border-r border-neutral-200 text-left py-3.5 px-3">Status</th>
                  <th rowSpan={2} className="bg-neutral-50 border-b border-neutral-200 border-r border-neutral-200 text-left py-3.5 px-3">Verification</th>
                  <th rowSpan={2} className="bg-neutral-50 border-b border-neutral-200 text-center py-3.5 px-3 min-w-[290px]">Actions</th>
                </tr>
                <tr className="bg-neutral-50 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="bg-blue-50 border-b border-neutral-200 border-r border-blue-200 py-2 px-2.5 text-center">Check In</th>
                  <th className="bg-blue-50 border-b border-neutral-200 border-r border-blue-200 py-2 px-2.5 text-center">Check Out</th>
                  <th className="bg-blue-50 border-b border-neutral-200 border-r border-blue-200 py-2 px-2.5 text-center">Break</th>
                  <th className="bg-blue-50 border-b border-neutral-200 border-r border-blue-200 py-2 px-2.5 text-center font-semibold text-teal-800">Permission</th>
                  <th className="bg-blue-50 border-b border-neutral-200 border-r border-blue-200 py-2 px-2.5 text-center">Working Hours</th>
                  <th className="bg-blue-50 border-b border-neutral-200 border-r-2 border-blue-200 py-2 px-2.5 text-center">Total Hours</th>
                  <th className="bg-purple-50 border-b border-neutral-200 border-r border-purple-200 py-2 px-2.5 text-center">Check In</th>
                  <th className="bg-purple-50 border-b border-neutral-200 border-r border-purple-200 py-2 px-2.5 text-center">Check Out</th>
                  <th className="bg-purple-50 border-b border-neutral-200 border-r-2 border-purple-200 py-2 px-2.5 text-center">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm font-medium">
                {sortedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-neutral-400 font-medium">
                      No yesterday attendance records found for approval.
                    </td>
                  </tr>
                ) : (
                  sortedEmployees.map((emp: any) => {
                    const isApproved = emp.decision === "Approved" || emp.manager_status === "Approved";
                    const isNeedClarification = emp.decision === "Need Clarification" || emp.manager_status === "Need Clarification";
                    const employeeReplied = !!emp.employee_reply;

                    // Disable both buttons if Approved OR while waiting for employee clarification response (but NOT if employee already replied)
                    const isApproveDisabled = isApproved || (isNeedClarification && !employeeReplied);
                    const isClarificationDisabled = isApproved || (isNeedClarification && !employeeReplied);

                    return (
                      <tr
                        key={emp.employee_id || emp.id}
                        className={`transition-colors ${emp.highlight_short_hours ? "bg-rose-50/40 hover:bg-rose-50/60" : "hover:bg-neutral-50/60"}`}
                      >
                        {/* Employee Info */}
                        <td className="py-3.5 px-4 border-r border-neutral-100">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getProfileImageUrl(emp.profile_image, emp.employee_id || emp.id)}
                              alt={emp.employee_name}
                              className="w-8 h-8 rounded-full object-cover border border-neutral-200 shadow-sm bg-neutral-50"
                            />
                            <div>
                              <p className="font-semibold text-neutral-800 text-xs">
                                {emp.employee_name}
                              </p>
                              <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                {emp.employee_code || `EMP${emp.employee_id}`}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 text-neutral-600 text-xs border-r border-neutral-100">
                          {emp.department || "General"}
                        </td>

                        {/* Web Entry Columns */}
                        <td className="py-3.5 px-3 bg-blue-50/5 text-xs text-neutral-700 font-semibold border-r border-blue-100/50">
                          {emp.check_in && emp.check_in !== "-" ? emp.check_in : "—"}
                          {emp.is_regularization && emp.regularization_check_in && (
                            <span className="block text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded mt-1 border border-amber-200">
                              Proposed: {emp.regularization_check_in}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 bg-blue-50/5 text-xs text-neutral-700 font-semibold border-r border-blue-100/50">
                          {emp.check_out && emp.check_out !== "-" ? emp.check_out : "—"}
                          {emp.is_regularization && emp.regularization_check_out && (
                            <span className="block text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded mt-1 border border-amber-200">
                              Proposed: {emp.regularization_check_out}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-2.5 bg-blue-50/5 text-xs text-center text-neutral-600 border-r border-blue-100/50">
                          {emp.total_break_minutes ? `${emp.total_break_minutes} min` : "0 min"}
                        </td>
                        <td
                          className="py-3.5 px-3 bg-blue-50/5 text-xs text-teal-700 font-bold border-r border-blue-100/50"
                          title={emp.permission_time || undefined}
                        >
                          {emp.permission_hours ? `${emp.permission_hours} hr${emp.permission_hours !== 1 ? "s" : ""}` : "—"}
                        </td>
                        <td className={`py-3.5 px-3 bg-blue-50/5 text-xs font-bold border-r border-blue-100/50 ${emp.highlight_short_hours ? "text-rose-600 bg-rose-50/50" : "text-neutral-800"}`}>
                          {formatWorkingHours(emp.working_hours)}
                        </td>
                        <td className="py-3.5 px-3 bg-blue-50/5 text-xs text-neutral-400 border-r-2 border-blue-200/50">
                          {formatWorkingHours(
                            (emp.working_hours || 0) +
                            (emp.total_break_minutes || 0) / 60
                          )}
                        </td>

                        {/* Card Entry Columns */}
                        <td className="py-3.5 px-3 bg-purple-50/5 text-xs text-neutral-400 border-r border-purple-100/50">{emp.card_check_in || "—"}</td>
                        <td className="py-3.5 px-3 bg-purple-50/5 text-xs text-neutral-400 border-r border-purple-100/50">{emp.card_check_out || "—"}</td>
                        <td className="py-3.5 px-3 bg-purple-50/5 text-xs text-neutral-400 border-r-2 border-purple-200/50">
                          {formatWorkingHours(emp.card_working_hours)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 border-r border-neutral-100">
                          {getStatusBadge(emp.status)}
                        </td>

                        {/* Verification Status */}
                        <td className="py-3.5 px-4 border-r border-neutral-100">
                          {getVerificationBadge(emp.employee_reply ? "Clarification Provided" : emp.decision)}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                            {/* View Button */}
                            <button
                              onClick={() => onViewEmployee(emp)}
                              className="h-8 px-2.5 py-1 border border-neutral-200 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 rounded-lg text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 shadow-xs flex items-center gap-1"
                              title="View Details & Chat History"
                            >
                              <EyeIcon className="w-3.5 h-3.5" />
                              View
                            </button>

                            {/* Approve Button */}
                            <button
                              disabled={isApproveDisabled}
                              onClick={() => handleApproveSingle(emp.employee_id || emp.id, emp.summary_date)}
                              title={isNeedClarification ? "Approval disabled while waiting for employee clarification response" : isApproved ? "Approved" : "Approve Attendance"}
                              className={`h-8 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1 ${isApproveDisabled
                                ? "bg-slate-50 text-neutral-400 border border-slate-200 cursor-not-allowed opacity-70"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:-translate-y-0.5 active:bg-emerald-200 shadow-xs"
                                }`}
                            >
                              <CheckIcon className={`w-3.5 h-3.5 ${isApproveDisabled ? "text-neutral-400" : "text-emerald-700"}`} />
                              Approve
                            </button>

                            {/* Need Clarification Button */}
                            <button
                              disabled={isClarificationDisabled}
                              onClick={() => openRejectReasonModal(emp.employee_id || emp.id, false, emp.summary_date)}
                              title={isNeedClarification ? "Clarification request already sent, waiting for employee response" : isApproved ? "Approved" : "Request Need Clarification"}
                              className={`h-8 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1 ${isClarificationDisabled
                                ? "bg-slate-50 text-neutral-400 border border-slate-200 cursor-not-allowed opacity-70"
                                : "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 hover:border-amber-400 hover:-translate-y-0.5 active:bg-amber-200 shadow-xs"
                                }`}
                            >
                              <ExclamationTriangleIcon className={`w-3.5 h-3.5 ${isClarificationDisabled ? "text-neutral-400" : "text-amber-600"}`} />
                              Need Clarification
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {oneDayWagesEmployees.length > 0 && (
              <div className="mt-8 border-t border-neutral-200 pt-6">
                <h3 className="text-sm font-bold text-neutral-850 mb-3 flex items-center gap-2">
                  <span className="text-base">⭐</span> Weekend / Holiday - One Day Wages Workers
                </h3>
                <table className="w-full border-collapse min-w-[1000px] relative">
                  <thead className="sticky top-0 z-30 bg-neutral-50 shadow-xs">
                    <tr className="bg-neutral-50 text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
                      <th rowSpan={2} className="bg-neutral-50 border-b border-neutral-200 border-r border-neutral-200 text-left py-3.5 px-4 min-w-[160px]">Employee</th>
                      <th rowSpan={2} className="bg-neutral-50 border-b border-neutral-200 border-r border-neutral-200 text-left py-3.5 px-3 min-w-[120px]">Department</th>
                      <th colSpan={6} className="bg-blue-100/80 text-blue-800 font-extrabold border-b border-neutral-200 border-r-2 border-blue-200 text-center py-2 px-3">Web Site Entry</th>
                      <th colSpan={3} className="bg-purple-100/80 text-purple-800 font-extrabold border-b border-neutral-200 border-r-2 border-purple-200 text-center py-2 px-3">Biometric Card Entry</th>
                      <th rowSpan={2} className="bg-neutral-50 border-b border-neutral-200 border-r border-neutral-200 text-left py-3.5 px-3">Status</th>
                      <th rowSpan={2} className="bg-neutral-50 border-b border-neutral-200 border-r border-neutral-200 text-left py-3.5 px-3">Verification</th>
                      <th rowSpan={2} className="bg-neutral-50 border-b border-neutral-200 text-center py-3.5 px-3 min-w-[290px]">Actions</th>
                    </tr>
                    <tr className="bg-neutral-50 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="bg-blue-50 border-b border-neutral-200 border-r border-blue-200 py-2 px-2.5 text-center">Check In</th>
                      <th className="bg-blue-50 border-b border-neutral-200 border-r border-blue-200 py-2 px-2.5 text-center">Check Out</th>
                      <th className="bg-blue-50 border-b border-neutral-200 border-r border-blue-200 py-2 px-2.5 text-center">Break</th>
                      <th className="bg-blue-50 border-b border-neutral-200 border-r border-blue-200 py-2 px-2.5 text-center font-semibold text-teal-800">Permission</th>
                      <th className="bg-blue-50 border-b border-neutral-200 border-r border-blue-200 py-2 px-2.5 text-center">Working Hours</th>
                      <th className="bg-blue-50 border-b border-neutral-200 border-r-2 border-blue-200 py-2 px-2.5 text-center">Total Hours</th>
                      <th className="bg-purple-50 border-b border-neutral-200 border-r border-purple-200 py-2 px-2.5 text-center">Check In</th>
                      <th className="bg-purple-50 border-b border-neutral-200 border-r border-purple-200 py-2 px-2.5 text-center">Check Out</th>
                      <th className="bg-purple-50 border-b border-neutral-200 border-r-2 border-purple-200 py-2 px-2.5 text-center">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-150">
                    {oneDayWagesEmployees.map((emp: any) => {
                      const isApproved = emp.decision === "Approved";
                      const isNeedClarification = emp.decision === "Need Clarification" || emp.decision === "Rejected";
                      const isApproveDisabled = isActionLoading || isApproved || isNeedClarification;
                      const isClarificationDisabled = isActionLoading || isApproved || isNeedClarification;

                      return (
                        <tr key={`${emp.id || emp.employee_id}-${emp.summary_date}`} className={`transition-all duration-150 border-b border-neutral-100 ${emp.highlight_short_hours ? "bg-rose-50/40 hover:bg-rose-50/60" : "hover:bg-neutral-50/50"}`}>
                          {/* Employee info */}
                          <td className="py-3.5 px-4 border-r border-neutral-100">
                            <div className="flex items-center gap-3">
                              <img
                                src={getProfileImageUrl(emp.profile_image, emp.employee_id || emp.id)}
                                alt={emp.employee_name}
                                className="w-9 h-9 rounded-full object-cover border border-neutral-200 shadow-xs"
                                onError={(e) => {
                                  e.currentTarget.src = "/default-avatar.png";
                                }}
                              />
                              <div>
                                <span className="font-extrabold text-neutral-800 block text-xs tracking-tight">{emp.employee_name}</span>
                                <span className="text-[10px] text-neutral-400 font-semibold mt-0.5 block">{emp.employee_code || "—"}</span>
                              </div>
                            </div>
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-3 border-r border-neutral-100">
                            <div className="text-xs text-neutral-600 font-medium">{emp.department || "—"}</div>
                            <div className="text-[9px] text-neutral-400 mt-0.5">{emp.designation || "—"}</div>
                          </td>

                          {/* Web Entry Columns */}
                          <td className="py-3.5 px-2.5 bg-blue-50/5 text-xs text-center text-neutral-600 border-r border-blue-100/50">{emp.check_in || "—"}</td>
                          <td className="py-3.5 px-2.5 bg-blue-50/5 text-xs text-center text-neutral-600 border-r border-blue-100/50">{emp.check_out || "—"}</td>
                          <td className="py-3.5 px-2.5 bg-blue-50/5 text-xs text-center text-neutral-600 border-r border-blue-100/50">
                            {emp.total_break_minutes ? `${emp.total_break_minutes} min` : "0 min"}
                          </td>
                          <td className="py-3.5 px-2.5 bg-blue-50/5 text-xs text-center text-teal-700 font-bold border-r border-blue-100/50">
                            {emp.permission_hours > 0 ? (
                              <span className="cursor-pointer underline decoration-dotted decoration-teal-500" title={emp.permission_time}>
                                {emp.permission_hours} hr{emp.permission_hours > 1 ? "s" : ""}
                              </span>
                            ) : "—"}
                          </td>
                          <td className={`py-3.5 px-3 bg-blue-50/5 text-xs font-bold border-r border-blue-100/50 ${emp.highlight_short_hours ? "text-rose-600 bg-rose-50/50" : "text-neutral-800"}`}>
                            {formatWorkingHours(emp.working_hours)}
                          </td>
                          <td className="py-3.5 px-2.5 bg-blue-50/5 text-xs text-center text-neutral-600 border-r-2 border-blue-200/50">
                            {formatWorkingHours(
                              (emp.working_hours || 0) +
                              (emp.total_break_minutes || 0) / 60
                            )}
                          </td>

                          {/* Card Entry Columns */}
                          <td className="py-3.5 px-3 bg-purple-50/5 text-xs text-neutral-400 border-r border-purple-100/50">{emp.card_check_in || "—"}</td>
                          <td className="py-3.5 px-3 bg-purple-50/5 text-xs text-neutral-400 border-r border-purple-100/50">{emp.card_check_out || "—"}</td>
                          <td className="py-3.5 px-3 bg-purple-50/5 text-xs text-neutral-400 border-r-2 border-purple-200/50">
                            {formatWorkingHours(emp.card_working_hours)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 border-r border-neutral-100">
                            {getStatusBadge(emp.status)}
                          </td>

                          {/* Verification Status */}
                          <td className="py-3.5 px-4 border-r border-neutral-100">
                            {getVerificationBadge(emp.employee_reply ? "Clarification Provided" : emp.decision)}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              <button
                                onClick={() => onViewEmployee(emp)}
                                className="h-8 px-2.5 py-1 border border-neutral-200 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 rounded-lg text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 shadow-xs flex items-center gap-1"
                                title="View Details & Chat History"
                              >
                                <EyeIcon className="w-3.5 h-3.5" />
                                View
                              </button>

                              <button
                                disabled={isApproveDisabled}
                                onClick={() => handleApproveSingle(emp.employee_id || emp.id, emp.summary_date)}
                                title={isNeedClarification ? "Approval disabled while waiting for employee clarification response" : isApproved ? "Approved" : "Approve Attendance"}
                                className={`h-8 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1 ${isApproveDisabled
                                  ? "bg-slate-50 text-neutral-400 border border-slate-200 cursor-not-allowed opacity-70"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:-translate-y-0.5 active:bg-emerald-200 shadow-xs"
                                  }`}
                              >
                                <CheckIcon className={`w-3.5 h-3.5 ${isApproveDisabled ? "text-neutral-400" : "text-emerald-700"}`} />
                                Approve
                              </button>

                              <button
                                disabled={isClarificationDisabled}
                                onClick={() => openRejectReasonModal(emp.employee_id || emp.id, false, emp.summary_date)}
                                title={isNeedClarification ? "Clarification request already sent, waiting for employee response" : isApproved ? "Approved" : "Request Need Clarification"}
                                className={`h-8 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1 ${isClarificationDisabled
                                  ? "bg-slate-50 text-neutral-400 border border-slate-200 cursor-not-allowed opacity-70"
                                  : "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 hover:border-amber-400 hover:-translate-y-0.5 active:bg-amber-200 shadow-xs"
                                  }`}
                              >
                                <ExclamationTriangleIcon className={`w-3.5 h-3.5 ${isClarificationDisabled ? "text-neutral-400" : "text-amber-600"}`} />
                                Need Clarification
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
            <span className="text-amber-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Need Clarification : {needClarificationCount}
            </span>
            <span className="text-neutral-300">|</span>
            <span className="text-sky-850 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              Clarification Provided : {clarificationProvidedCount}
            </span>
            <span className="text-neutral-300">|</span>
            <span className="text-blue-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Pending : {pendingCount}
            </span>
          </div>

          {/* Right: Approve All Button */}
          <div className="flex items-center gap-2">
            {/* <button
              disabled={pendingCount === 0 && employees.filter((e) => e.decision === "Need Clarification").length === 0}
              onClick={() => setConfirmDialog("approve")}
              className={`h-10 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${pendingCount === 0 && employees.filter((e) => e.decision === "Need Clarification").length === 0
                ? "bg-slate-50 text-neutral-400 border border-slate-200 cursor-not-allowed opacity-70"
                : "bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-0.5 active:bg-emerald-800 shadow-sm"
                }`}
            >
              <CheckCircleIcon className="w-4 h-4 text-white" />
              Approve All
            </button> */}
          </div>
        </div>

        {/* Confirmation Modal Overlay */}
        {confirmDialog && (
          <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-800">
                  Approve All Attendance
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Approve attendance for all remaining team members?
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
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs"
                >
                  Confirm Approve All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clarification Reason Modal */}
        {rejectReasonModal.open && (
          <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center z-[110] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-800">
                    Request Clarification
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Enter details regarding what clarification is needed from the employee.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Clarification Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectReasonText}
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  placeholder="Enter details of clarification required..."
                  className="w-full p-3 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-neutral-800 placeholder-neutral-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => setRejectReasonModal({ open: false })}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRejectionWithReason}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all shadow-xs"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Regularization Approval Modal */}
        {regularizationPopup && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-amber-600">
                <ExclamationTriangleIcon className="w-6 h-6" />
                <h3 className="text-lg font-bold text-neutral-900">Clarification Approval</h3>
              </div>
              <div className="text-sm text-neutral-600 flex flex-col gap-2">
                <p className="font-medium text-xs">Employee <strong>{regularizationPopup.employee_name}</strong> has proposed the following check-in/out times:</p>
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 flex flex-col gap-1 text-xs">
                  <div><span className="font-bold text-neutral-700">Proposed Check-in:</span> {regularizationPopup.regularization_check_in || "—"}</div>
                  <div><span className="font-bold text-neutral-700">Proposed Check-out:</span> {regularizationPopup.regularization_check_out || "—"}</div>
                  <div><span className="font-bold text-neutral-700">Reason:</span> {regularizationPopup.regularization_reason || regularizationPopup.employee_reply || "No reason provided"}</div>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Do you want to approve this timing or request reclarification?</p>
              </div>
              <div className="flex justify-end gap-2.5 mt-2">
                <button
                  onClick={() => setRegularizationPopup(null)}
                  className="py-2 px-3 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const emp = regularizationPopup;
                    setRegularizationPopup(null);
                    openRejectReasonModal(emp.employee_id || emp.id, false, emp.summary_date);
                  }}
                  className="py-2 px-3 border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl text-xs font-semibold transition"
                >
                  Need Reclarification
                </button>
                <button
                  onClick={async () => {
                    const emp = regularizationPopup;
                    setRegularizationPopup(null);
                    await handleApproveSingle(emp.employee_id || emp.id, emp.summary_date, true);
                  }}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Missing Timing Warning Modal */}
        {missingTimingPopup && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-rose-500">
                <ExclamationTriangleIcon className="w-6 h-6" />
                <h3 className="text-lg font-bold text-neutral-900">Missing Timing Warning</h3>
              </div>
              <p className="text-xs text-neutral-650">
                Employee <strong>{missingTimingPopup.employee_name}</strong> is missing check-in or check-out times. You cannot approve this directly.
              </p>
              <p className="text-[11px] text-neutral-500">
                Would you like to request clarification from the employee?
              </p>
              <div className="flex justify-end gap-2.5 mt-2">
                <button
                  onClick={() => setMissingTimingPopup(null)}
                  className="py-2 px-3 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const emp = missingTimingPopup;
                    setMissingTimingPopup(null);
                    openRejectReasonModal(emp.employee_id || emp.id, false, emp.summary_date);
                  }}
                  className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Request Clarification
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