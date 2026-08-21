import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/api";
import { useAuthStore } from "../../store/authStore";
import { CheckIcon, XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import toast from "react-hot-toast";
import { BookLoader } from "../../components/ui/Spinner";
import { formatDateStr } from "../../utils/date";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";

const BASE_URL = `${API_URL}/api`;

const formatDateTime = (isoString: string | null | undefined) => {
  if (!isoString) return "—";
  try {
    const isMidnight = isoString.includes("T00:00:00");
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    if (isMidnight) {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    }
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch (e) {
    return "—";
  }
};

const getActionedAtText = (r: any) => {
  if (r.status === "Approved") return formatDateTime(r.approved_at);
  if (r.status === "Rejected") return formatDateTime(r.rejected_at);
  if (r.status === "Cancelled") return formatDateTime(r.cancelled_at);
  return "Pending";
};

const LeaveApprovalPage: React.FC = () => {
  const { user, token } = useAuthStore();
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedLeaveForCancel, setSelectedLeaveForCancel] = useState<any>(null);
  const [selectedDatesToCancel, setSelectedDatesToCancel] = useState<string[]>([]);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const handleOpenCancelModal = (leave: any) => {
    setSelectedLeaveForCancel(leave);
    setSelectedDatesToCancel([]);
    setIsCancelModalOpen(true);
  };

  const getDatesInRange = (startDateStr: string, endDateStr: string) => {
    const dates = [];
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    let curr = new Date(start);
    while (curr <= end) {
      dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  const getKolkataTodayString = () => {
    const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" } as const;
    const formatter = new Intl.DateTimeFormat("en-CA", options);
    return formatter.format(new Date());
  };

  const getKolkataDateType = (dateObj: Date, todayStr: string) => {
    const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" } as const;
    const formatter = new Intl.DateTimeFormat("en-CA", options);
    const dateStr = formatter.format(dateObj);

    if (dateStr < todayStr) return "Past";
    if (dateStr === todayStr) return "Today";
    return "Future";
  };

  const submitCancellation = async () => {
    if (!selectedLeaveForCancel || selectedDatesToCancel.length === 0) return;
    try {
      setIsSubmittingCancel(true);
      const res = await fetch(`${BASE_URL}/leaves/cancel-date/${selectedLeaveForCancel.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ dates: selectedDatesToCancel })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Leave dates cancelled successfully");
        setIsConfirmDialogOpen(false);
        setIsCancelModalOpen(false);
        fetchLeaves();
      } else {
        toast.error(data.error || "Failed to cancel leave dates");
      }
    } catch (error) {
      toast.error("Error cancelling leave dates");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const toggleReason = (id: number) => {
    setExpandedReasons(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/leaves/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load leaves");
      const data = await res.json();
      setLeaveRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const checkManagerMatch = (reportingManager: string | null | undefined, managerFullName: string | null | undefined) => {
    if (!reportingManager || !managerFullName) return false;
    const repManagerClean = reportingManager.trim().toLowerCase();
    const managerName = managerFullName.trim().toLowerCase();

    if (repManagerClean === managerName) return true;

    const repManagerParts = repManagerClean.split(/\s+/);
    const loggedManagerParts = managerName.split(/\s+/);

    if (repManagerParts.length === 1 && loggedManagerParts.length > 0) {
      if (loggedManagerParts[0] === repManagerParts[0]) return true;
    }

    if (loggedManagerParts.length === 1 && repManagerParts.length > 0) {
      if (repManagerParts[0] === loggedManagerParts[0]) return true;
    }

    return false;
  };

  const approvalLeaves = leaveRequests.filter((l: any) => {
    if (l.request_type === "Permission") return false;

    const isManager = checkManagerMatch(l.reporting_manager, user?.full_name) ||
      checkManagerMatch(l.handover_to, user?.full_name) ||
      user?.access_level?.toLowerCase() === "admin";
    if (!isManager) return false;

    if (statusFilter !== "All" && l.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const empName = (l.employee_name || "").toLowerCase();
      const empId = (l.employee_id || "").toString().toLowerCase();
      if (!empName.includes(q) && !empId.includes(q)) return false;
    }
    return true;
  });

  const handleApprove = async (id: number) => {
    try {
      setProcessingId(id);
      const res = await fetch(`${BASE_URL}/leaves/approve/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success("Leave approved");
        fetchLeaves();
      }
    } catch (error) {
      toast.error("Error approving leave");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    try {
      setProcessingId(id);
      const res = await fetch(`${BASE_URL}/leaves/reject/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success("Leave rejected");
        fetchLeaves();
      }
    } catch (error) {
      toast.error("Error rejecting leave");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      setProcessingId(id);
      const res = await fetch(`${BASE_URL}/leaves/cancel/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success("Leave cancelled");
        fetchLeaves();
      } else {
        const err = await res.json();
        toast.error(err.error || err.message || "Failed to cancel");
      }
    } catch (error) {
      toast.error("Error cancelling leave");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-success-50 text-success-700 border-success-200";
      case "Rejected": return "bg-danger-50 text-danger-700 border-danger-200";
      case "Cancelled": return "bg-neutral-50 text-neutral-600 border-neutral-300";
      default: return "bg-warning-50 text-warning-700 border-warning-200";
    }
  };

  if (loading) {
    return <BookLoader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-6">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Leave Approval Requests</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage and review leave requests from your team members.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all w-64 bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <Card padding="none" className="overflow-hidden border border-neutral-200 shadow-sm rounded-2xl bg-white">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-115px)]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 bg-neutral-50">
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                <th className="text-left p-4 pl-6 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Employee</th>
                <th className="text-left p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Emp ID</th>
                <th className="text-left p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Request Type</th>
                <th className="text-left p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Date Range / Details</th>
                <th className="text-left p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Reason</th>
                <th className="text-left p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Applied At</th>
                <th className="text-left p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Actioned At</th>
                <th className="text-center p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Status</th>
                <th className="text-center p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {approvalLeaves.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-neutral-400 font-medium bg-neutral-50/20">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <CheckIcon className="w-12 h-12 text-success-400" />
                      <p className="text-sm font-bold text-neutral-500">All caught up!</p>
                      <p className="text-xs text-neutral-400">There are no pending leave approval requests.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                approvalLeaves
                  .map((leave: any) => {
                    const leaveType = leave.request_type === "Permission" ? "Permission" : leave.leave_type;
                    const isPermission = leave.request_type === "Permission";

                    return (
                      <React.Fragment key={leave.id}>
                        <tr className="hover:bg-neutral-50/40 transition-colors">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                                {leave.employee_name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-bold text-neutral-850">{leave.employee_name}</span>
                            </div>
                          </td>

                          <td className="p-4 text-sm text-neutral-600 font-medium">
                            {leave.employee_id || "-"}
                          </td>

                          <td className="p-4 text-sm text-neutral-700 font-semibold">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${isPermission
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}>
                              {leaveType}
                            </span>
                          </td>

                          <td className="p-4 text-sm">
                            {isPermission ? (
                              <div>
                                <p className="font-semibold text-neutral-800">{formatDateStr(leave.permission_date)}</p>
                                <p className="text-xs text-neutral-400 font-semibold mt-0.5">
                                  {leave.from_time} to {leave.to_time}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="font-semibold text-neutral-800">{formatDateStr(leave.from_date)} to {formatDateStr(leave.to_date)}</p>
                                <p className="text-xs text-neutral-400 font-semibold mt-0.5">Duration: {leave.total_days || 0} days</p>
                              </div>
                            )}
                          </td>

                          <td className="p-4 text-sm text-neutral-500 max-w-xs">
                            {leave.reason ? (
                              <button
                                onClick={() => toggleReason(leave.id)}
                                className="text-left text-neutral-600 hover:text-primary-600 transition-colors duration-150 flex items-center gap-1 focus:outline-none group/reason w-full"
                              >
                                <span className="truncate max-w-[150px]">{leave.reason}</span>
                                {leave.reason.length > 20 && (
                                  <span className="text-primary-500 group-hover/reason:text-primary-600 text-[10px] font-semibold flex items-center gap-0.5 shrink-0 ml-1">
                                    {expandedReasons[leave.id] ? "Collapse" : "Expand"}
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                      className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedReasons[leave.id] ? "rotate-180" : ""}`}
                                    >
                                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </button>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>

                          <td className="p-4 text-sm text-neutral-600 font-medium">
                            {formatDateTime(leave.created_at)}
                          </td>

                          <td className="p-4 text-sm text-neutral-600 font-medium">
                            {getActionedAtText(leave)}
                          </td>

                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(leave.status)}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${leave.status === "Approved" ? "bg-success-600" :
                                leave.status === "Rejected" ? "bg-danger-600" :
                                  leave.status === "Cancelled" ? "bg-neutral-400" :
                                    "bg-warning-500 animate-pulse"
                                }`} />
                              {leave.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {leave.status === "Pending" ? (
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleApprove(leave.id)}
                                  disabled={processingId === leave.id}
                                  className="!py-1.5 !px-3 !text-xs shadow-sm bg-success-600 hover:bg-success-700 border-success-600 text-white"
                                >
                                  {processingId === leave.id ? (
                                    <span className="w-3.5 h-3.5 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                                  ) : (
                                    <CheckIcon className="w-3.5 h-3.5 mr-1" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleReject(leave.id)}
                                  disabled={processingId === leave.id}
                                  className="!py-1.5 !px-3 !text-xs shadow-sm"
                                >
                                  {processingId === leave.id ? (
                                    <span className="w-3.5 h-3.5 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                                  ) : (
                                    <XMarkIcon className="w-3.5 h-3.5 mr-1" />
                                  )}
                                  Reject
                                </Button>
                              </div>
                            ) : (leave.status === "Approved" && leave.request_type === "Leave") ? (
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleOpenCancelModal(leave)}
                                  disabled={processingId === leave.id}
                                  className="!py-1.5 !px-3 !text-xs shadow-sm"
                                >
                                  <XMarkIcon className="w-3.5 h-3.5 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] font-medium text-neutral-400">No actions required</span>
                            )}
                          </td>
                        </tr>
                        {expandedReasons[leave.id] && leave.reason && (
                          <tr className="bg-neutral-50/30">
                            <td colSpan={9} className="p-4 pl-10 pr-6 border-b border-neutral-200">
                              <div className="text-xs text-neutral-600 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-inner max-w-3xl">
                                <div className="flex items-center gap-1.5 mb-2 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-primary-500">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                                  </svg>
                                  <span>Reason for Request</span>
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed text-neutral-700 font-medium pl-5">
                                  {leave.reason}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Date-wise Leave Cancellation Modal */}
      {selectedLeaveForCancel && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title="Cancel Leave Date"
          size="md"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="danger"
                disabled={selectedDatesToCancel.length === 0}
                onClick={() => setIsConfirmDialogOpen(true)}
              >
                Cancel Selected Date
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-2">
              <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">Leave Request Details</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-neutral-500 font-medium text-xs">Employee:</span>
                  <p className="font-bold text-neutral-800">{selectedLeaveForCancel.employee_name}</p>
                </div>
                <div>
                  <span className="text-neutral-500 font-medium text-xs">Leave Type:</span>
                  <p className="font-bold text-neutral-800">{selectedLeaveForCancel.leave_type}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-neutral-500 font-medium text-xs">Approved Leave Period:</span>
                  <p className="font-bold text-neutral-800">
                    {new Date(selectedLeaveForCancel.from_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – {new Date(selectedLeaveForCancel.to_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-neutral-800 mb-2">Select date to cancel:</p>
              <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-200 max-h-60 overflow-y-auto bg-white">
                {(selectedLeaveForCancel.cancellable_dates || []).map((dateStr: string) => {
                  const todayStr = getKolkataTodayString();
                  const parts = dateStr.split("-");
                  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

                  const isAlreadyCancelled = selectedLeaveForCancel.cancelled_dates?.includes(dateStr);
                  const dateType = getKolkataDateType(d, todayStr);
                  const isDisabled = dateType === "Past" || isAlreadyCancelled;
                  const isSelected = selectedDatesToCancel.includes(dateStr);

                  const dateLabel = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

                  return (
                    <label
                      key={dateStr}
                      className={`flex items-center justify-between p-3.5 text-sm transition-colors cursor-pointer ${isDisabled
                          ? "bg-neutral-50/50 cursor-not-allowed opacity-75"
                          : isSelected
                            ? "bg-primary-50/30"
                            : "hover:bg-neutral-50/30"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="cancel-date-selection"
                          value={dateStr}
                          disabled={isDisabled}
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedDatesToCancel(prev => prev.filter(item => item !== dateStr));
                            } else {
                              setSelectedDatesToCancel(prev => [...prev, dateStr]);
                            }
                          }}
                          className="h-4 w-4 text-danger-600 focus:ring-danger-500 border-neutral-300 rounded disabled:opacity-50"
                        />
                        <span className={`font-semibold ${isDisabled ? "text-neutral-400 line-through" : "text-neutral-850"}`}>
                          {dateLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAlreadyCancelled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-400">
                            Already Cancelled ❌
                          </span>
                        ) : dateType === "Past" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-400">
                            Past ❌
                          </span>
                        ) : dateType === "Today" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success-700 bg-success-50 border border-success-200 px-2 py-0.5 rounded-full">
                            Today ✅
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-full">
                            Future ✅
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
                {(selectedLeaveForCancel.cancellable_dates || []).length === 0 && (
                  <div className="p-4 text-center text-neutral-450 text-xs">
                    No weekdays available for cancellation.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog */}
      {selectedLeaveForCancel && selectedDatesToCancel.length > 0 && (
        <ConfirmDialog
          isOpen={isConfirmDialogOpen}
          title="Cancel Leave Date"
          variant="warning"
          message={`Are you sure you want to cancel the leave for ${selectedDatesToCancel
            .map(dateStr => {
              const parts = dateStr.split("-");
              const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
              return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            })
            .join(", ")} for ${selectedLeaveForCancel.employee_name}?`}
          description="This will restore the applicable leave balance."
          confirmLabel="Confirm Cancellation"
          cancelLabel="Close"
          loading={isSubmittingCancel}
          onConfirm={submitCancellation}
          onCancel={() => setIsConfirmDialogOpen(false)}
        />
      )}
    </div>
  );
};

export default LeaveApprovalPage;
