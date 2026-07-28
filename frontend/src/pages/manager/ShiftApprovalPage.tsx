import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/api";
import { useAuthStore } from "../../store/authStore";
import { CheckIcon, XMarkIcon, ArrowRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import toast from "react-hot-toast";

const BASE_URL = `${API_URL}/api`;

const ShiftApprovalPage: React.FC = () => {
  const { user, token } = useAuthStore();
  const [shiftRequests, setShiftRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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

      toast.success(`Shift request ${newStatus.toLowerCase()}`);
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

      toast.success("Shift request cancelled");
      fetchShiftRequests();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to cancel request");
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
    return <div className="p-8 flex justify-center"><div className="h-8 w-8 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Shift Approval Requests</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage and review shift change applications from your team.</p>
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500 text-[10px] font-semibold uppercase tracking-wider">
                <th className="text-left p-4 pl-6">Employee</th>
                <th className="text-left p-4">Emp ID</th>
                <th className="text-left p-4">Current Shift</th>
                <th className="text-left p-4">Requested Shift</th>
                <th className="text-left p-4">Date Range</th>
                <th className="text-left p-4">Reason</th>
                <th className="text-center p-4">Status</th>
                <th className="text-center p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {safeManagerShiftRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-neutral-400 font-medium bg-neutral-50/20">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <CheckIcon className="w-12 h-12 text-success-400" />
                      <p className="text-xs font-bold text-neutral-500">All caught up!</p>
                      <p className="text-[11px] text-neutral-400">There are no pending shift approval requests from your team.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                safeManagerShiftRequests.map((item: any) => {
                  const isApproved = item.status === "Approved";
                  const isRejected = item.status === "Rejected";

                  return (
                    <tr key={item.id} className="hover:bg-neutral-50/40 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                            {item.employee_name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-neutral-800">{item.employee_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-medium text-neutral-600">
                        {item.employee_id || "-"}
                      </td>
                      <td className="p-4 text-xs text-neutral-600">{item.current_shift || "-"}</td>
                      <td className="p-4 text-xs font-medium text-neutral-800">
                        {item.request_type === "WFH" ? "Work From Home" : (item.requested_shift || "-")}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-xs font-medium text-neutral-800">{item.from_date}</p>
                          <p className="text-[11px] text-neutral-450 font-normal mt-0.5 flex items-center gap-1">
                            <ArrowRightIcon className="w-3 h-3 text-neutral-350" /> to {item.to_date}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-neutral-500 max-w-xs relative group">
                        <div className="truncate cursor-help">{item.reason || "-"}</div>
                        {item.reason && item.reason.length > 20 && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-50 w-72 p-3 bg-neutral-100 text-neutral-800 text-xs rounded-xl shadow-xl border border-neutral-300 whitespace-normal break-words transition-all duration-200">
                            <p className="font-semibold mb-1 text-neutral-500">Full Reason:</p>
                            {item.reason}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-neutral-100"></div>
                          </div>
                        )}
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
                          (() => {
                            const startDate = item.from_date || item.shift_date || item.to_date || "";
                            const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
                            const isFinished = startDate && startDate < today;

                            if (isFinished) {
                              return <span className="text-[10px] font-medium text-neutral-400">Out of Date</span>;
                            }

                            return (
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
                            );
                          })()
                        ) : item.status === "Approved" && ((item.shift_date || "") >= new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]) ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleCancel(item.id)}
                              disabled={processingId === item.id}
                              className="!py-1 !px-2.5 !text-[10px] shadow-sm"
                            >
                              {processingId === item.id ? (
                                <span className="w-3 h-3 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                              ) : (
                                <XMarkIcon className="w-3 h-3 mr-1" />
                              )}
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-neutral-400">No actions required</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ShiftApprovalPage;
