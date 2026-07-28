import React from 'react';
import {
  ClockIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';

const formatWorkingHours = (hoursVal: any) => {
  if (hoursVal == null || hoursVal === "" || hoursVal === 0 || hoursVal === "0" || hoursVal === "0.0") return "—";
  const num = Number(hoursVal);
  if (isNaN(num) || num <= 0) return "—";
  const hrs = Math.floor(num);
  const mins = Math.round((num - hrs) * 60);
  return `${hrs} hrs ${mins} mins`;
};

interface AttendanceDetailModalProps {
  selectedEmployee: any;
  onClose: () => void;
}

const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  selectedEmployee,
  onClose,
}) => {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const totalBreakMins =
    selectedEmployee.total_break_minutes != null && selectedEmployee.total_break_minutes !== 0
      ? selectedEmployee.total_break_minutes
      : (Number(selectedEmployee.lunch_minutes) || 0) + (Number(selectedEmployee.tea_minutes) || 0);

  const clarificationComment =
    selectedEmployee.rejection_reason || selectedEmployee.clarification_comment || null;

  const employeeReply = selectedEmployee.employee_reply || null;

  const initials = (selectedEmployee.employee_name || "E")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 overscroll-contain">
      <div className="bg-white rounded-[22px] shadow-2xl w-[480px] max-w-[92vw] overflow-hidden border border-neutral-100 flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-neutral-100 flex justify-between items-center bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-teal-50 p-2 rounded-xl text-teal-600 border border-teal-100">
              <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 tracking-tight">
                Attendance Details
              </h2>
              <p className="text-[11px] text-neutral-400 font-medium">
                Check-in, break breakdown & comments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close Modal"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 border border-neutral-200 transition-all duration-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 bg-white">
          {/* Employee Info Header (No Profile Logo) */}
          <div className="bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-teal-50/80 p-3.5 rounded-xl border border-teal-100 flex items-center justify-between shadow-2xs">
            <div>
              <h3 className="font-bold text-sm text-neutral-900 tracking-tight">
                {selectedEmployee.employee_name}
              </h3>
              <p className="text-[11px] font-medium text-neutral-500 mt-0.5">
                {selectedEmployee.designation || "Employee"}
              </p>
            </div>

            {selectedEmployee.department && (
              <span className="text-[10px] font-bold text-teal-800 bg-white/90 px-2.5 py-1 rounded-full border border-teal-200 shadow-2xs">
                {selectedEmployee.department}
              </span>
            )}
          </div>

          {/* Time & Break Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Check In */}
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 flex flex-col justify-between hover:bg-blue-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Check In
                </span>
                <ArrowRightOnRectangleIcon className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-base font-extrabold text-blue-950 mt-1.5">
                {selectedEmployee.check_in || "—"}
              </p>
            </div>

            {/* Check Out */}
            <div className="bg-purple-50/80 border border-purple-200/80 rounded-xl p-3 flex flex-col justify-between hover:bg-purple-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  Check Out
                </span>
                <ArrowLeftOnRectangleIcon className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <p className="text-base font-extrabold text-purple-950 mt-1.5">
                {selectedEmployee.check_out || "—"}
              </p>
            </div>

            {/* Lunch Break */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex flex-col justify-between hover:bg-amber-50 transition-colors">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                Lunch Break
              </span>
              <p className="text-sm font-bold text-amber-950 mt-1">
                {selectedEmployee.lunch_minutes || 0} min
              </p>
            </div>

            {/* Tea Break */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex flex-col justify-between hover:bg-amber-50 transition-colors">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                Tea Break
              </span>
              <p className="text-sm font-bold text-amber-950 mt-1">
                {selectedEmployee.tea_minutes || 0} min
              </p>
            </div>

            {/* Total Break */}
            <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-2.5 flex flex-col justify-between hover:bg-indigo-50 transition-colors">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                Total Break
              </span>
              <p className="text-sm font-extrabold text-indigo-950 mt-1">
                {totalBreakMins || 0} min
              </p>
            </div>

            {/* Total Hours */}
            <div className="bg-neutral-50/80 border border-neutral-200/80 rounded-xl p-2.5 flex flex-col justify-between hover:bg-neutral-50 transition-colors">
              <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider">
                Total Hours
              </span>
              <p className="text-sm font-extrabold text-neutral-950 mt-1">
                {formatWorkingHours(
                  (selectedEmployee.working_hours || 0) +
                  ((selectedEmployee.lunch_minutes || 0) + (selectedEmployee.tea_minutes || 0)) / 60
                )}
              </p>
            </div>

            {/* Working Hours */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2.5 flex flex-col justify-between hover:bg-emerald-50 transition-colors">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Working Hours
              </span>
              <p className="text-sm font-extrabold text-emerald-950 mt-1">
                {formatWorkingHours(selectedEmployee.working_hours)}
              </p>
            </div>
          </div>

          {/* Chronological Clarification Conversation Thread */}
          {((selectedEmployee.clarification_history && selectedEmployee.clarification_history.length > 0) ? (
            <div className="space-y-2 pt-1 border-t border-neutral-100">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                Clarification Discussion Thread
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedEmployee.clarification_history.map((msg: any, idx: number) => {
                  const isManager = msg.sender_role === "manager";
                  return (
                    <div
                      key={msg.id || idx}
                      className={`p-3 rounded-xl border space-y-1 shadow-2xs ${isManager
                        ? "bg-amber-50 border-amber-200/90 text-amber-950"
                        : "bg-sky-50 border-sky-200/90 text-sky-950 ml-3"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isManager ? (
                            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          ) : (
                            <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                          )}
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isManager ? "text-amber-800" : "text-sky-800"}`}>
                            {isManager
                              ? (msg.sender_name && msg.sender_name !== "Manager"
                                  ? `Manager (${msg.sender_name})`
                                  : (selectedEmployee.reporting_manager ? `Manager (${selectedEmployee.reporting_manager})` : "Manager"))
                              : (msg.sender_name && msg.sender_name !== "Employee"
                                  ? msg.sender_name
                                  : (selectedEmployee.employee_name || "Employee"))}
                          </span>
                        </div>
                        {msg.timestamp && (
                          <span className="text-[9px] text-neutral-400 font-medium">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium leading-relaxed pl-5 whitespace-pre-wrap">
                        {msg.comment}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Fallback Single Manager Comment */}
              {clarificationComment && (
                <div className="bg-amber-50 border border-amber-300/80 rounded-xl p-3 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                      Manager ({selectedEmployee.reporting_manager || "Manager"})
                    </span>
                  </div>
                  <p className="text-xs text-amber-950 font-medium leading-relaxed pl-5 whitespace-pre-wrap">
                    {clarificationComment}
                  </p>
                </div>
              )}

              {/* Fallback Single Employee Reply */}
              {employeeReply && (
                <div className="bg-sky-50 border border-sky-300/80 rounded-xl p-3 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-sky-600 flex-shrink-0" />
                    <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                      Employee ({selectedEmployee.employee_name || "Employee"})
                    </span>
                  </div>
                  <p className="text-xs text-sky-950 font-medium leading-relaxed pl-5 whitespace-pre-wrap">
                    {employeeReply}
                  </p>
                </div>
              )}
            </>
          ))}
        </div>

        {/* Compact Footer */}
        <div className="px-4 py-2.5 bg-neutral-50/80 border-t border-neutral-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetailModal;