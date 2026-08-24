import React, { useEffect, useState } from "react";
import { API_URL, getProfileImageUrl } from "../../config/api";
import { useAuthStore } from "../../store/authStore";
import { CheckIcon, XMarkIcon, ArrowRightIcon, MagnifyingGlassIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import toast from "react-hot-toast";
import { BookLoader } from "../../components/ui/Spinner";
import { formatDateStr } from "../../utils/date";

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

const convertTo12HourFormat = (time24: string) => {
  if (!time24) return "";
  if (time24.includes("AM") || time24.includes("PM")) return time24;
  const parts = time24.split(":");
  if (parts.length < 2) return time24;
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  if (isNaN(h) || isNaN(m)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const minFormatted = String(m).padStart(2, "0");
  const hourFormatted = String(h12).padStart(2, "0");
  return `${hourFormatted}:${minFormatted} ${period}`;
};

interface ShiftApprovalPageProps {
  isOdwOnly?: boolean;
}

const ShiftApprovalPage: React.FC<ShiftApprovalPageProps> = ({ isOdwOnly = false }) => {
  const { user, token } = useAuthStore();
  const [shiftRequests, setShiftRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});

  // Direct Manager Log Modal State
  const [showManagerLogModal, setShowManagerLogModal] = useState(false);
  const [teamEmployees, setTeamEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [modalRequestType, setModalRequestType] = useState<"WFH" | "Office" | "Shift">("WFH");
  const [modalFromDate, setModalFromDate] = useState<string>("");
  const [modalToDate, setModalToDate] = useState<string>("");
  const [modalRequestedShift, setModalRequestedShift] = useState<string>("General Shift");
  const [modalReason, setModalReason] = useState<string>("");
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [logModalType, setLogModalType] = useState<"Shift" | "WFH">("Shift");

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${BASE_URL}/employees/`);
      if (res.ok) {
        const data = await res.json();
        setTeamEmployees(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const handleManagerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !modalFromDate || !modalToDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setIsSubmittingLog(true);
      const res = await fetch(`${BASE_URL}/shifts/manager-submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_id: selectedEmployeeId,
          from_date: modalFromDate,
          to_date: modalToDate,
          request_type: modalRequestType,
          requested_work_mode: modalRequestType === "WFH" ? "WFH" : "Office",
          requested_shift: modalRequestType === "Shift" ? modalRequestedShift : "General Shift",
          reason: modalReason || "Logged directly by manager",
          manager_name: user?.full_name || "Manager"
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Shift/WFH entry logged & approved!");
        setShowManagerLogModal(false);
        setModalReason("");
        fetchShiftRequests();
      } else {
        toast.error(data.message || "Failed to log entry");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while logging shift entry.");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const toggleReason = (id: number) => {
    setExpandedReasons(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const fetchShiftRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/shifts/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to load shift requests");
      const data = await response.json();
      setShiftRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load shift requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftRequests();
    fetchEmployees();
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

  const safeManagerShiftRequests = shiftRequests.filter((req: any) => {
    if (isOdwOnly) {
      if (req.request_type !== "One Day Wages") return false;
    } else {
      if (req.request_type === "One Day Wages" || req.request_type === "WFH") return false;
    }

    const isManager = checkManagerMatch(req.reporting_manager, user?.full_name) ||
      user?.access_level?.toLowerCase() === "admin";
    if (!isManager) return false;

    if (statusFilter !== "All" && req.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const empName = (req.employee_name || "").toLowerCase();
      const empId = (req.employee_id || "").toString().toLowerCase();
      if (!empName.includes(q) && !empId.includes(q)) return false;
    }
    return true;
  });

  const handleUpdateShiftStatus = async (id: number, newStatus: string) => {
    try {
      setProcessingId(id);
      const endpoint = newStatus === "Approved" ? "approve" : "reject";
      const response = await fetch(`${BASE_URL}/shifts/${endpoint}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to update status");

      const label = isOdwOnly ? "ODW request" : "Shift request";
      toast.success(`${label} ${newStatus.toLowerCase()}`);
      fetchShiftRequests();
    } catch (error) {
      console.error(error);
      const label = isOdwOnly ? "ODW request" : "shift request";
      toast.error(`Failed to ${newStatus.toLowerCase()} ${label}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      setProcessingId(id);
      const response = await fetch(`${BASE_URL}/shifts/cancel/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || err.message || "Failed to cancel");
      }

      const label = isOdwOnly ? "ODW request" : "Shift request";
      toast.success(`${label} cancelled`);
      fetchShiftRequests();
    } catch (error: any) {
      console.error(error);
      const label = isOdwOnly ? "ODW request" : "shift request";
      toast.error(error.message || `Failed to cancel ${label}`);
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
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            {isOdwOnly ? "ODW Approval Requests" : "Shift Approval Requests"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {isOdwOnly
              ? "Manage and review One Day Wages applications from your team."
              : "Manage and review shift change applications from your team."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isOdwOnly && (
            <Button
              variant="primary"
              onClick={() => {
                setLogModalType("Shift");
                setModalRequestType("Shift");
                setShowManagerLogModal(true);
              }}
              className="flex items-center gap-2 font-semibold shadow-md"
            >
              + Log Shift Entry
            </Button>
          )}
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
                <th className="text-left p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Current Shift / Mode</th>
                <th className="text-left p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Requested Shift / Mode</th>
                <th className="text-left p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Date Range</th>
                <th className="text-left p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Reason</th>
                <th className="text-left p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Applied At</th>
                <th className="text-left p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Actioned At</th>
                <th className="text-center p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Status</th>
                <th className="text-center p-4 sticky top-0 z-20 bg-neutral-50 border-b border-neutral-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {safeManagerShiftRequests.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-neutral-400 font-medium bg-neutral-50/20">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <CheckIcon className="w-12 h-12 text-success-400" />
                      <p className="text-xs font-bold text-neutral-500">All caught up!</p>
                      <p className="text-[11px] text-neutral-450">
                        {isOdwOnly
                          ? "There are no pending ODW approval requests from your team."
                          : "There are no pending shift approval requests from your team."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                safeManagerShiftRequests.map((item: any) => {
                  const isApproved = item.status === "Approved";
                  const isRejected = item.status === "Rejected";

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-neutral-50/40 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <img
                              src={getProfileImageUrl(item.profile_image, item.employee_id)}
                              alt={item.employee_name}
                              className="w-8 h-8 rounded-full object-cover border border-neutral-100"
                              onError={(e) => {
                                e.currentTarget.src = "/default-avatar.png";
                              }}
                            />
                            <span className="text-sm font-bold text-neutral-850">{item.employee_name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-neutral-600 font-medium">
                          {item.employee_id || "-"}
                        </td>
                        <td className="p-4 text-sm text-neutral-650 font-normal">
                          {(() => {
                            const isWorkMode = item.request_type === "WFH" || item.request_type === "Office";
                            const isOneDayWages = item.request_type === "One Day Wages";
                            const label = item.request_type || "Shift";
                            return (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${isWorkMode
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : isOneDayWages
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}>
                                {label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-4 text-sm text-neutral-600 font-medium">
                          {item.request_type === "One Day Wages" ? (
                            <span className="font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">{convertTo12HourFormat(item.current_shift) || "—"}</span>
                          ) : (() => {
                            const curMode = item.current_work_mode || (item.current_shift?.toUpperCase() === "WFH" ? "WFH" : (item.request_type === "Office" ? "WFH" : "Office"));
                            const showCurSuffix = curMode && item.current_shift?.toUpperCase() !== curMode.toUpperCase();
                            return (
                              <>
                                {item.current_shift || "-"}
                                {showCurSuffix && (
                                  <span className="text-[10px] text-blue-500 font-semibold ml-1">
                                    ({curMode})
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td className="p-4 text-sm font-medium text-neutral-600">
                          {item.request_type === "One Day Wages" ? (
                            <span className="font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">{convertTo12HourFormat(item.requested_shift) || "—"}</span>
                          ) : (() => {
                            const reqMode = item.requested_work_mode || (item.request_type === "WFH" ? "WFH" : "Office");
                            const showReqSuffix = reqMode && item.requested_shift?.toUpperCase() !== reqMode.toUpperCase();
                            return (
                              <>
                                {(item.requested_shift || (item.request_type === "WFH" ? "General Shift" : "-"))}
                                {showReqSuffix && (
                                  <span className="text-[10px] text-blue-500 font-semibold ml-1">
                                    ({reqMode})
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td className="p-4 text-sm">
                          <div>
                            <p className="font-semibold text-neutral-800">{formatDateStr(item.from_date)}</p>
                            <p className="text-xs text-neutral-400 font-semibold mt-0.5 flex items-center gap-1">
                              <ArrowRightIcon className="w-3 h-3 text-neutral-350" /> to {formatDateStr(item.to_date)}
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-neutral-500 max-w-xs">
                          <div className="flex flex-col gap-1">
                            {item.reason ? (
                              <button
                                onClick={() => toggleReason(item.id)}
                                className="text-left text-neutral-600 hover:text-primary-600 transition-colors duration-150 flex items-center gap-1 focus:outline-none group/reason w-full"
                              >
                                <span className="truncate max-w-[150px]">{item.reason}</span>
                                {item.reason.length > 20 && (
                                  <span className="text-primary-500 group-hover/reason:text-primary-600 text-[10px] font-semibold flex items-center gap-0.5 shrink-0 ml-1">
                                    {expandedReasons[item.id] ? "Collapse" : "Expand"}
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                      className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedReasons[item.id] ? "rotate-180" : ""}`}
                                    >
                                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </button>
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                            {item.supportive_document && (
                              <a
                                href={`${BASE_URL}/shifts/${item.id}/document`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 self-start mt-0.5"
                              >
                                <PaperClipIcon className="w-3.5 h-3.5 text-neutral-500" />
                                View Attachment
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm font-medium text-neutral-600">
                          {formatDateTime(item.created_at)}
                        </td>
                        <td className="p-4 text-sm font-medium text-neutral-600">
                          {getActionedAtText(item)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(item.status)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isApproved ? "bg-success-600" :
                              isRejected ? "bg-danger-600" :
                                item.status === "Cancelled" ? "bg-neutral-400" :
                                  "bg-warning-500 animate-pulse"
                              }`} />
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {item.status === "Pending" ? (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleUpdateShiftStatus(item.id, "Approved")}
                                disabled={processingId === item.id}
                                className="!py-1 !px-2.5 !text-[10px] shadow-sm bg-success-600 hover:bg-success-700 border-success-600 text-white"
                              >
                                {processingId === item.id ? (
                                  <span className="w-3 h-3 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                                ) : (
                                  <CheckIcon className="w-3 h-3 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleUpdateShiftStatus(item.id, "Rejected")}
                                disabled={processingId === item.id}
                                className="!py-1 !px-2.5 !text-[10px] shadow-sm"
                              >
                                {processingId === item.id ? (
                                  <span className="w-3 h-3 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                                ) : (
                                  <XMarkIcon className="w-3 h-3 mr-1" />
                                )}
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-medium text-neutral-400">No actions required</span>
                          )}
                        </td>
                      </tr>
                      {expandedReasons[item.id] && item.reason && (
                        <tr className="bg-neutral-50/30">
                          <td colSpan={11} className="p-4 pl-10 pr-6 border-b border-neutral-200">
                            <div className="text-xs text-neutral-600 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-inner max-w-3xl">
                              <div className="flex items-center gap-1.5 mb-2 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-primary-500">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                                </svg>
                                <span>Reason for Shift Change Request</span>
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed text-neutral-700 font-medium pl-5">
                                {item.reason}
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
      {/* Manager Direct Log Shift / WFH Modal */}
      {showManagerLogModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            <div className={`px-6 py-4 flex items-center justify-between text-white ${logModalType === "WFH" ? "bg-purple-600" : "bg-primary-600"}`}>
              <h3 className="text-base font-bold">
                {logModalType === "WFH" ? "Log Direct WFH Request" : "Log Direct Shift Request"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowManagerLogModal(false);
                  setSelectedEmployeeId("");
                  setModalFromDate("");
                  setModalToDate("");
                  setModalRequestedShift("General Shift");
                  setModalReason("");
                }}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => {
              handleManagerSubmit(e);
              setTimeout(() => {
                setSelectedEmployeeId("");
                setModalFromDate("");
                setModalToDate("");
                setModalRequestedShift("General Shift");
                setModalReason("");
              }, 500);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Employee <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl text-xs bg-neutral-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select an Employee...</option>
                  {teamEmployees
                    .filter((emp) =>
                      user?.access_level?.toLowerCase() === "admin" ||
                      checkManagerMatch(emp.reporting_manager, user?.full_name)
                    )
                    .sort((a, b) => {
                      const nameA = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
                      const nameB = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
                      return nameA.localeCompare(nameB);
                    })
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id || emp.id})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Request Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {logModalType !== "Shift" && (
                    <button
                      type="button"
                      onClick={() => setModalRequestType("WFH")}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        modalRequestType === "WFH"
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                      }`}
                    >
                      🏠 WFH
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setModalRequestType("Office")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      modalRequestType === "Office"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                    }`}
                  >
                    🏢 Office Mode
                  </button>
                  {logModalType !== "WFH" && (
                    <button
                      type="button"
                      onClick={() => setModalRequestType("Shift")}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        modalRequestType === "Shift"
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                      }`}
                    >
                      ⏱️ Shift Change
                    </button>
                  )}
                </div>
              </div>

              {modalRequestType === "Shift" && (
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Target Shift Timing <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modalRequestedShift}
                    onChange={(e) => setModalRequestedShift(e.target.value)}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl text-xs bg-neutral-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="General Shift">General Shift (09:00 AM - 06:00 PM)</option>
                    <option value="First Shift">First Shift (07:00 AM - 04:00 PM)</option>
                    <option value="Second Shift">Second Shift (12:00 PM - 09:00 PM)</option>
                    <option value="Night Shift">Night Shift (10:00 PM - 06:00 AM)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    From Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={modalFromDate}
                    onChange={(e) => setModalFromDate(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    To Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={modalToDate}
                    onChange={(e) => setModalToDate(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Reason / Manager Note
                </label>
                <textarea
                  rows={2}
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="e.g. Employee forgot to submit WFH request on time..."
                  className="w-full p-2.5 border border-neutral-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowManagerLogModal(false);
                    setSelectedEmployeeId("");
                    setModalFromDate("");
                    setModalToDate("");
                    setModalRequestedShift("General Shift");
                    setModalReason("");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmittingLog ? "Submitting..." : "Log & Approve Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftApprovalPage;
