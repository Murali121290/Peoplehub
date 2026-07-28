import React, { useState } from 'react';
import {
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  ClockIcon,
  ChatBubbleLeftEllipsisIcon
} from '@heroicons/react/24/outline';
import { API_URL } from '../../config/api';

const BASE_URL = `${API_URL}/api`;

interface EmployeeClarificationModalProps {
  pendingItems: any[];
  employeeId: number;
  onSubmitted: () => void;
}

const EmployeeClarificationModal: React.FC<EmployeeClarificationModalProps> = ({
  pendingItems,
  employeeId,
  onSubmitted,
}) => {
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeItem = pendingItems[currentIndex] || pendingItems[0];
  if (!activeItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(
        `${BASE_URL}/attendance/reply-clarification/${employeeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reply: replyText.trim(),
            date: activeItem.attendance_date,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setReplyText("");
        onSubmitted();
      } else {
        alert(data.error || "Failed to submit clarification response");
      }
    } catch (err) {
      console.error("Submit clarification reply error:", err);
      alert("An error occurred while submitting your reply.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const history = activeItem.clarification_history || [];

  return (
    <div className="fixed inset-0 bg-neutral-900/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 overscroll-contain">
      <div className="bg-white rounded-[24px] shadow-2xl w-[540px] max-w-[95vw] max-h-[90vh] overflow-hidden border border-amber-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - Non Dismissable Warning */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-600 text-white px-6 py-4 flex items-center gap-3 shrink-0">
          <div className="bg-white/20 p-2.5 rounded-2xl text-white backdrop-blur-xs shadow-xs">
            <ExclamationTriangleIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight">
              Attendance Clarification Required
            </h2>
            <p className="text-xs text-amber-100 font-medium mt-0.5">
              Action Required: Please respond to your manager's inquiry
            </p>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Content Body */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Target Attendance Date & Manager Summary Breakdown Table */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900">
                  <ClockIcon className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Date: {activeItem.attendance_date_formatted || activeItem.attendance_date}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                  Action Mandatory
                </span>
              </div>

              {/* Manager Yesterday Summary Attendance Breakdown Table */}
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="text-[10px] font-extrabold uppercase tracking-wider">
                      <th colSpan={4} className="bg-blue-100/80 text-blue-900 py-1.5 px-2 border-b border-r border-neutral-200">
                        WEB SITE ENTRY
                      </th>
                      <th colSpan={3} className="bg-purple-100/80 text-purple-900 py-1.5 px-2 border-b border-neutral-200">
                        BIOMETRIC CARD ENTRY
                      </th>
                    </tr>
                    <tr className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50 border-b border-neutral-200">
                      <th className="py-1.5 px-1.5 border-r border-neutral-100">CHECK IN</th>
                      <th className="py-1.5 px-1.5 border-r border-neutral-100">CHECK OUT</th>
                      <th className="py-1.5 px-1.5 border-r border-neutral-100">BREAK</th>
                      <th className="py-1.5 px-1.5 border-r border-neutral-200">HOURS</th>
                      <th className="py-1.5 px-1.5 border-r border-neutral-100">CHECK IN</th>
                      <th className="py-1.5 px-1.5 border-r border-neutral-100">CHECK OUT</th>
                      <th className="py-1.5 px-1.5">HOURS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs font-semibold text-neutral-800">
                    <tr>
                      {/* Web Site Entry Columns */}
                      <td className="py-2.5 px-1.5 bg-blue-50/10 border-r border-neutral-100 font-extrabold text-neutral-800">
                        {activeItem.check_in || activeItem.checkIn || "—"}
                      </td>
                      <td className="py-2.5 px-1.5 bg-blue-50/10 border-r border-neutral-100 text-neutral-600">
                        {activeItem.check_out || activeItem.checkOut || "—"}
                      </td>
                      <td className="py-2.5 px-1.5 bg-blue-50/10 border-r border-neutral-100 text-neutral-600">
                        {activeItem.break_str || (activeItem.total_break_minutes ? `${activeItem.total_break_minutes} min` : "0 min")}
                      </td>
                      <td className="py-2.5 px-1.5 bg-blue-50/10 border-r border-neutral-200 font-extrabold text-neutral-900">
                        {activeItem.total_hours || activeItem.working_hours || "—"}
                      </td>

                      {/* Biometric Card Entry Columns */}
                      <td className="py-2.5 px-1.5 bg-purple-50/10 border-r border-neutral-100 text-neutral-600">
                        {activeItem.card_check_in || activeItem.cardCheckIn || "-"}
                      </td>
                      <td className="py-2.5 px-1.5 bg-purple-50/10 border-r border-neutral-100 text-neutral-600">
                        {activeItem.card_check_out || activeItem.cardCheckOut || "-"}
                      </td>
                      <td className="py-2.5 px-1.5 bg-purple-50/10 font-extrabold text-purple-900">
                        {activeItem.card_working_hours || activeItem.cardHours || "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Discussion Thread History */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                Clarification Discussion Thread
              </span>

              <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
                {history.length > 0 ? (
                  history.map((msg: any, idx: number) => {
                    const isManager = msg.sender_role === "manager";
                    return (
                      <div
                        key={msg.id || idx}
                        className={`p-3 rounded-xl border space-y-1 ${
                          isManager
                            ? "bg-amber-50/90 border-amber-200 text-amber-950"
                            : "bg-sky-50/90 border-sky-200 text-sky-950 ml-3"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {isManager ? (
                              <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5 text-sky-600" />
                            )}
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isManager ? "text-amber-800" : "text-sky-800"}`}>
                              {isManager
                                ? (msg.sender_name && msg.sender_name !== "Manager"
                                    ? `Manager (${msg.sender_name})`
                                    : (activeItem.reporting_manager ? `Manager (${activeItem.reporting_manager})` : "Manager"))
                                : (msg.sender_name && msg.sender_name !== "Employee" ? msg.sender_name : "You")}
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
                  })
                ) : (
                  <div className="bg-amber-50/90 border border-amber-200 p-3 rounded-xl text-amber-950 text-xs font-medium">
                    <span className="font-bold text-amber-800 block mb-1 uppercase text-[10px] tracking-wider">
                      Manager Request ({activeItem.reporting_manager || "Manager"})
                    </span>
                    {activeItem.last_manager_comment || activeItem.rejection_reason || "Please provide clarification for yesterday's attendance."}
                  </div>
                )}
              </div>
            </div>

            {/* Comment Textarea Input */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-100">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Your Response / Clarification Comment <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Enter explanation details (e.g. biometric reader issue, delayed checkout approval)..."
                className="w-full p-3 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-neutral-50/50 resize-none"
              />
            </div>
          </div>

          {/* Fixed Bottom Action Footer */}
          <div className="bg-neutral-50 border-t border-neutral-200 px-6 py-3 flex items-center justify-end shrink-0">
            <button
              type="submit"
              disabled={!replyText.trim() || isSubmitting}
              className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all duration-200 flex items-center gap-2 ${
                !replyText.trim() || isSubmitting
                  ? "bg-neutral-300 cursor-not-allowed"
                  : "bg-amber-600 hover:bg-amber-700 hover:-translate-y-0.5 active:bg-amber-800"
              }`}
            >
              <PaperAirplaneIcon className="w-4 h-4" />
              {isSubmitting ? "Submitting..." : "Submit Clarification Response"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeClarificationModal;
