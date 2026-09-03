import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/api";
import { useAuthStore } from "../../store/authStore";
import { CheckIcon, XMarkIcon, ArrowRightIcon, MagnifyingGlassIcon, HomeIcon } from "@heroicons/react/24/outline";
import { ConfirmDialog } from "../../components/ui/Modal";
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

const getKolkataTodayString = () => {
  const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" } as const;
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  return formatter.format(new Date());
};

const WFHApprovalPage: React.FC = () => {
  const { user, token } = useAuthStore();
  const [shiftRequests, setShiftRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});
  
  // WFH Cancellation Confirmation State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);

  // Direct Manager Log Modal State
  const [showManagerLogModal, setShowManagerLogModal] = useState(false);
  const [teamEmployees, setTeamEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [modalFromDate, setModalFromDate] = useState<string>("");
  const [modalToDate, setModalToDate] = useState<string>("");
  const [modalReason, setModalReason] = useState<string>("");
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  const toggleReason = (id: number) => {
    setExpandedReasons(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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
          request_type: "WFH",
          requested_work_mode: "WFH",
          requested_shift: "General Shift",
          reason: modalReason || "Logged directly by manager",
          manager_name: user?.full_name || "Manager"
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "WFH entry logged & approved!");
        setShowManagerLogModal(false);
        setModalReason("");
        fetchShiftRequests();
      } else {
        toast.error(data.message || "Failed to log entry");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while logging WFH entry.");
    } finally {
      setIsSubmittingLog(false);
    }
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
      toast.error("Failed to load WFH requests");
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

  const getRecursiveReportingIdentifiers = (
    managerId: number | string | undefined | null,
    allEmps: any[]
  ) => {
    if (!managerId || !Array.isArray(allEmps) || allEmps.length === 0) {
      return { ids: new Set<string>(), names: new Set<string>() };
    }

    const currentMgr = allEmps.find((e: any) =>
      Number(e.id) === Number(managerId) ||
      Number(e.user_id) === Number(managerId) ||
      String(e.employee_id || "").trim() === String(managerId).trim()
    );

    const targetNames = new Set<string>();
    if (currentMgr) {
      const fName = `${currentMgr.first_name || ""} ${currentMgr.last_name || ""}`.trim();
      if (fName) targetNames.add(fName.toLowerCase());
    }

    const ids = new Set<string>();
    const names = new Set<string>();
    const queue: string[] = Array.from(targetNames);

    if (queue.length === 0) {
      return { ids, names };
    }

    const visitedNames = new Set<string>(queue);

    while (queue.length > 0) {
      const parentName = queue.shift()!;

      allEmps.forEach((e: any) => {
        const repMgr = (e.reporting_manager || "").trim().toLowerCase();
        if (repMgr && (repMgr === parentName || repMgr.includes(parentName) || parentName.includes(repMgr))) {
          if (e.id) ids.add(String(e.id));
          if (e.user_id) ids.add(String(e.user_id));
          if (e.employee_id) ids.add(String(e.employee_id).trim());

          const childName = `${e.first_name || ""} ${e.last_name || ""}`.trim().toLowerCase();
          if (childName && !visitedNames.has(childName)) {
            visitedNames.add(childName);
            names.add(childName);
            queue.push(childName);
          }
        }
      });
    }

    return { ids, names };
  };

  const safeManagerShiftRequests = shiftRequests.filter((req: any) => {
    // Only display WFH requests
    if (req.request_type !== "WFH") return false;

    const reportingSet = getRecursiveReportingIdentifiers(user?.id, teamEmployees);
    const reqEmpId = String(req.employee_id || "").trim();
    const reqUserDbId = String(req.user_id || req.employee_db_id || "").trim();
    const reqRepMgr = String(req.reporting_manager || "").trim().toLowerCase();

    const isDirectManager = checkManagerMatch(req.reporting_manager, user?.full_name);
    const isRecursiveReport = reportingSet.ids.has(reqEmpId) || reportingSet.ids.has(reqUserDbId) || (reqRepMgr ? reportingSet.names.has(reqRepMgr) : false);
    const isAdmin = user?.access_level?.toLowerCase() === "admin";

    const isManager = isDirectManager || isRecursiveReport || isAdmin;
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

      toast.success(`WFH request ${newStatus.toLowerCase()}`);
      fetchShiftRequests();
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${newStatus.toLowerCase()} request`);
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

      toast.success("WFH request cancelled");
      fetchShiftRequests();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to cancel request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelClick = (id: number) => {
    setCancelTargetId(id);
    setIsConfirmOpen(true);
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
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 shadow-inner">
            <HomeIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-800">WFH Approval Requests</h2>
            <p className="text-xs text-neutral-500 font-medium mt-1">Manage and review Work From Home applications from your team.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="primary"
            onClick={() => setShowManagerLogModal(true)}
            className="flex items-center gap-2 !py-1.5 !px-3 !text-xs font-bold shadow-md bg-purple-600 hover:bg-purple-700 border-purple-600 text-white"
          >
            + Log WFH Entry
          </Button>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-neutral-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all w-64 bg-white shadow-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-755 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-xs"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <Card padding="none" className="border border-neutral-200/80 shadow-sm rounded-2xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/60 text-neutral-500 text-xs font-bold uppercase tracking-wider border-b border-neutral-200/80">
                <th className="p-4 pl-6">Employee</th>
                <th className="p-4">Emp ID</th>
                <th className="p-4">Request Type</th>
                <th className="p-4">Requested Shift</th>
                <th className="p-4">Date Range</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Applied At</th>
                <th className="p-4">Actioned At</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {safeManagerShiftRequests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-neutral-400 font-medium bg-neutral-50/20">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <CheckIcon className="w-12 h-12 text-success-400" />
                      <p className="text-xs font-bold text-neutral-500">All caught up!</p>
                      <p className="text-[11px] text-neutral-400">There are no pending WFH approval requests from your team.</p>
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
                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                              {item.employee_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-neutral-850">{item.employee_name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-neutral-600 font-medium">
                          {item.employee_id || "-"}
                        </td>
                        <td className="p-4 text-sm text-neutral-700 font-semibold">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200">
                            Work From Home
                          </span>
                        </td>
                        <td className="p-4 text-sm text-neutral-600 font-medium">
                          {item.requested_shift || "General Shift"}
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
                                  <span className="w-3.5 h-3.5 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
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
                                  <span className="w-3.5 h-3.5 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                                ) : (
                                  <XMarkIcon className="w-3 h-3 mr-1" />
                                )}
                                Reject
                              </Button>
                            </div>
                          ) : (item.status === "Approved" && (!item.to_date || item.to_date >= getKolkataTodayString())) ? (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleCancelClick(item.id)}
                                disabled={processingId === item.id}
                                className="!py-1 !px-2.5 !text-[10px] shadow-sm"
                              >
                                <XMarkIcon className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-medium text-neutral-400">No actions required</span>
                          )}
                        </td>
                      </tr>
                      {expandedReasons[item.id] && item.reason && (
                        <tr className="bg-neutral-50/30">
                          <td colSpan={10} className="p-4 pl-10 pr-6 border-b border-neutral-200">
                            <div className="text-xs text-neutral-600 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-inner max-w-3xl">
                              <div className="flex items-center gap-1.5 mb-2 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-primary-500">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                                </svg>
                                <span>Reason for WFH Request</span>
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

      {/* Manager Direct Log WFH Modal */}
      {showManagerLogModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-purple-600 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="text-base font-bold">Log Direct WFH Request</h3>
              <button
                type="button"
                onClick={() => {
                  setShowManagerLogModal(false);
                  setSelectedEmployeeId("");
                  setModalFromDate("");
                  setModalToDate("");
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
      {/* WFH Cancellation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Confirm Cancellation"
        message="Are you sure you want to cancel this approved WFH request?"
        onConfirm={async () => {
          setIsConfirmOpen(false);
          if (cancelTargetId !== null) {
            await handleCancel(cancelTargetId);
          }
          setCancelTargetId(null);
        }}
        onCancel={() => {
          setIsConfirmOpen(false);
          setCancelTargetId(null);
        }}
        variant="danger"
        confirmLabel="Yes, Cancel"
        cancelLabel="No, Keep"
      />
    </div>
  );
};

export default WFHApprovalPage;
