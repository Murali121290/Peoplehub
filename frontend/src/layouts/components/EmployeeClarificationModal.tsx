import React, { useState } from 'react';
import {
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  ClockIcon,
  ChatBubbleLeftEllipsisIcon
} from '@heroicons/react/24/outline';
import { API_URL } from '../../config/api';
import { TimePicker } from '../../components/ui/TimePicker';
import { toast } from 'react-hot-toast';
import { formatDateStr } from '../../utils/date';

const BASE_URL = `${API_URL}/api`;

interface EmployeeClarificationModalProps {
  pendingItems: any[];
  userId: number;
  onSubmitted: () => void;
}

const EmployeeClarificationModal: React.FC<EmployeeClarificationModalProps> = ({
  pendingItems,
  userId,
  onSubmitted,
}) => {
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Form states for resolution
  const [selectedMode, setSelectedMode] = useState<'regularization' | 'leave' | 'lop' | null>(null);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [balances, setBalances] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchBalances = async () => {
      try {
        const response = await fetch(`${BASE_URL}/leaves/balances/${userId}`);
        const data = await response.json();
        if (Array.isArray(data)) {

          
          // setBalances(data);
          // if (data.length > 0) {
          //   setLeaveType(data[0].leave_type);
          // }


          const filtered = data.filter((b: any) => b.leave_type && b.leave_type.toLowerCase() !== 'permission');
          setBalances(filtered);
          if (filtered.length > 0) {
            setLeaveType(filtered[0].leave_type);
          }
        }
      } catch (err) {
        console.error("Failed to fetch leave balances in modal:", err);
      }
    };
    if (userId) {
      fetchBalances();
    }
  }, [userId]);

  const activeItem = pendingItems[currentIndex] || pendingItems[0];
  if (!activeItem) return null;

  const checkIn = activeItem.check_in || activeItem.checkIn;
  const checkOut = activeItem.check_out || activeItem.checkOut;
  const status = activeItem.status || activeItem.attendance_status;

  // Convert 12-hour (AM/PM) time representation to 24-hour time representation
  const convertTo24h = (time12h: string): string => {
    if (!time12h || time12h === "—" || time12h === "-") return "";
    const cleanTime = time12h.trim();
    const parts = cleanTime.split(/\s+/);
    if (parts.length < 2) {
      return cleanTime;
    }
    const [timeStr, modifier] = parts;
    const timeParts = timeStr.split(":");
    if (timeParts.length < 2) return "";
    let hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1];
    if (hours === 12) {
      hours = 0;
    }
    if (modifier && modifier.toUpperCase() === "PM") {
      hours += 12;
    }
    return `${hours.toString().padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  };

  const isForgotCheckoutRequest = React.useMemo(() => {
    const hasCheckIn = !!checkIn && checkIn !== "—" && checkIn !== "-";
    const hasCheckOut = !!checkOut && checkOut !== "—" && checkOut !== "-";
    return hasCheckIn && !hasCheckOut;
  }, [checkIn, checkOut]);

  // For absent days: show regularization/leave/lop options instead of generic comment
  const isAbsentDay = status === "Absent";

  const handleResolve = async (mode: 'regularization' | 'leave' | 'lop') => {
    if (isSubmitting) return;

    let endpoint = "";
    let bodyObj: any = { date: activeItem.attendance_date };

    if (mode === 'regularization') {
      const finalCheckIn = isForgotCheckoutRequest ? convertTo24h(checkIn) : checkInTime;
      if (!finalCheckIn || !checkOutTime) {
        toast.error("Please enter both check-in and check-out times.");
        return;
      }
      endpoint = `${BASE_URL}/attendance/submit-regularization/${userId}`;
      bodyObj.check_in = finalCheckIn;
      bodyObj.check_out = checkOutTime;
      bodyObj.reason = replyText.trim();
    } else if (mode === 'leave') {
      endpoint = `${BASE_URL}/attendance/apply-leave/${userId}`;
      bodyObj.leave_type = leaveType;
      bodyObj.reason = replyText.trim();
    } else if (mode === 'lop') {
      endpoint = `${BASE_URL}/attendance/accept-lop/${userId}`;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setReplyText("");
        setCheckInTime("");
        setCheckOutTime("");
        setSelectedMode(null);
        if (currentIndex >= pendingItems.length - 1) {
          setCurrentIndex(Math.max(0, pendingItems.length - 2));
        }
        onSubmitted();
      } else {
        toast.error(data.error || "Failed to submit resolution");
      }
    } catch (err) {
      console.error("Resolution submit error:", err);
      toast.error("An error occurred while submitting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitGeneric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(
        `${BASE_URL}/attendance/reply-clarification/${userId}`,
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
        toast.success(data.message || "Clarification response submitted successfully!");
        setReplyText("");
        if (currentIndex >= pendingItems.length - 1) {
          setCurrentIndex(Math.max(0, pendingItems.length - 2));
        }
        onSubmitted();
      } else {
        toast.error(data.error || "Failed to submit clarification response");
      }
    } catch (err) {
      console.error("Submit clarification reply error:", err);
      toast.error("An error occurred while submitting your reply.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const history = activeItem.clarification_history || [];

  return (
    <div className="fixed inset-0 bg-neutral-900/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 overscroll-contain">
      <div className="bg-white rounded-[24px] shadow-2xl w-[560px] max-w-[95vw] max-h-[90vh] overflow-hidden border border-amber-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
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

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Target Attendance Date & Manager Summary Breakdown Table */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900">
                <ClockIcon className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Date: {activeItem.attendance_date_formatted || formatDateStr(activeItem.attendance_date)}
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
                      {checkIn || "—"}
                    </td>
                    <td className="py-2.5 px-1.5 bg-blue-50/10 border-r border-neutral-100 text-neutral-600">
                      {checkOut || "—"}
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
                  const isSystem = msg.sender_role === "system";
                  return (
                    <div
                      key={msg.id || idx}
                      className={`p-3 rounded-xl border space-y-1 ${
                        isSystem
                          ? "bg-rose-50/90 border-rose-200 text-rose-950"
                          : isManager
                            ? "bg-amber-50/90 border-amber-200 text-amber-950"
                            : "bg-sky-50/90 border-sky-200 text-sky-950 ml-3"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isSystem ? (
                            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          ) : isManager ? (
                            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          ) : (
                            <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          )}
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isSystem ? "text-rose-800" : isManager ? "text-amber-800" : "text-sky-800"}`}>
                            {isSystem
                              ? "System Alert"
                              : isManager
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

          {/* ── CONDITIONAL RESOLUTION OPTIONS ── */}
          {isForgotCheckoutRequest ? (
            <div className="space-y-4 pt-3 border-t border-neutral-100 animate-in slide-in-from-bottom-2 duration-200">
              <span className="text-[11px] font-bold text-neutral-550 uppercase tracking-wider block">
                Forgot Checkout Punch Resolution
              </span>
              <div className="bg-amber-50/75 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ClockIcon className="w-4 h-4 text-amber-600 animate-pulse" />
                  Manager requested your checkout time. Please supply it below:
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-1">CHECK-IN TIME (READ-ONLY)</label>
                    <input
                      type="text"
                      disabled
                      value={checkIn || "—"}
                      className="w-full p-2 border border-neutral-200 rounded-xl text-xs bg-neutral-100 text-neutral-500 font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">CHECK-OUT TIME *</label>
                    <TimePicker
                      required
                      value={checkOutTime}
                      onChange={(val) => setCheckOutTime(val)}
                      className="w-full text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">REASON / REMARK *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Forgot to checkout in portal / card reader issue"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-2.5 border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white text-neutral-800"
                  />
                </div>
                <button
                  type="button"
                  disabled={isSubmitting || !checkOutTime || !replyText.trim()}
                  onClick={() => handleResolve('regularization')}
                  className={`w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-all ${
                    isSubmitting || !checkOutTime || !replyText.trim()
                      ? "bg-neutral-300 cursor-not-allowed"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Punch-Out Clarification"}
                </button>
              </div>
            </div>
          ) : isAbsentDay ? (
            <div className="space-y-4 pt-3 border-t border-neutral-100">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                Choose a Resolution Option
              </span>

              {selectedMode === null ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMode('regularization')}
                    className="flex flex-col items-center justify-center p-3.5 border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-900 rounded-2xl transition-all text-center gap-1.5"
                  >
                    <ClockIcon className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-bold">I Was Present</span>
                    <span className="text-[9px] text-blue-600 font-medium">(Regularization)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMode('leave')}
                    className="flex flex-col items-center justify-center p-3.5 border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-900 rounded-2xl transition-all text-center gap-1.5"
                  >
                    <PaperAirplaneIcon className="w-5 h-5 text-amber-600" />
                    <span className="text-xs font-bold">Apply Leave</span>
                    <span className="text-[9px] text-amber-600 font-medium">(Paid Leave)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMode('lop')}
                    className="flex flex-col items-center justify-center p-3.5 border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-900 rounded-2xl transition-all text-center gap-1.5"
                  >
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    <span className="text-xs font-bold">Accept LOP</span>
                    <span className="text-[9px] text-red-600 font-medium">(Loss of Pay)</span>
                  </button>
                </div>
              ) : (
                <div className="relative animate-in slide-in-from-bottom-2 duration-200">
                  {/* Back button to choose other mode */}
                  <button
                    type="button"
                    onClick={() => setSelectedMode(null)}
                    className="absolute -top-1.5 right-0 text-[11px] font-bold text-neutral-500 hover:text-neutral-800 underline"
                  >
                    Change option
                  </button>

                  {/* Regularization Form */}
                  {selectedMode === 'regularization' && (
                    <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-3">
                      <div className="text-xs font-extrabold text-blue-900">🕐 Regularization Request Details</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-1">CHECK-IN TIME *</label>
                          <TimePicker
                            required
                            value={checkInTime}
                            onChange={(val) => setCheckInTime(val)}
                            className="w-full text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 mb-1">CHECK-OUT TIME *</label>
                          <TimePicker
                            required
                            value={checkOutTime}
                            onChange={(val) => setCheckOutTime(val)}
                            className="w-full text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">REASON / REMARK *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Card reader issue / forgot checkin"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="w-full p-2.5 border border-blue-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleResolve('regularization')}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                      >
                        {isSubmitting ? "Submitting..." : "Submit Regularization Request"}
                      </button>
                    </div>
                  )}

                  {/* Leave Form */}
                  {selectedMode === 'leave' && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                      <div className="text-xs font-extrabold text-amber-900">📋 Apply Paid Leave for this Date</div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1 font-bold">LEAVE TYPE *</label>
                        <select
                          value={leaveType}
                          onChange={(e) => setLeaveType(e.target.value)}
                          className="w-full p-2 border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        >
                          {balances.length > 0 ? (
                            balances.map((b) => (
                              <option key={b.id} value={b.leave_type}>
                                {b.leave_type} (Available: {b.available})
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="Casual Leave">Casual Leave</option>
                              <option value="Sick Leave">Sick Leave</option>
                              <option value="Privilege Leave">Privilege Leave</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 mb-1">REASON / REMARK *</label>
                        <textarea
                          required
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Please provide a reason for your leave request..."
                          className="w-full p-2.5 border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white resize-none"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isSubmitting || !replyText.trim()}
                        onClick={() => handleResolve('leave')}
                        className={`w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-all ${
                          !replyText.trim() || isSubmitting
                            ? "bg-neutral-300 cursor-not-allowed"
                            : "bg-amber-600 hover:bg-amber-700"
                        }`}
                      >
                        {isSubmitting ? "Applying..." : "Apply Leave Response"}
                      </button>
                    </div>
                  )}

                  {/* LOP Form */}
                  {selectedMode === 'lop' && (
                    <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 space-y-3">
                      <div className="text-xs font-extrabold text-red-900">❌ Confirm Loss of Pay (LOP)</div>
                      <p className="text-xs text-red-750 font-medium leading-relaxed">
                        By confirming, this date will be recorded as LOP (unpaid absence). It will be processed for salary deduction.
                      </p>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleResolve('lop')}
                        className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                      >
                        {isSubmitting ? "Confirming LOP..." : "I Accept Loss of Pay"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Generic/Present Comment Textarea Input (Old Default) */
            <form onSubmit={handleSubmitGeneric} className="space-y-4 pt-2 border-t border-neutral-100 flex flex-col">
              <div className="space-y-1.5">
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
              <div className="bg-neutral-50 border-t border-neutral-200 py-3 flex items-center justify-end shrink-0">
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
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeClarificationModal;
