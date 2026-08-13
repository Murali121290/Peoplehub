import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/api";
import { useAuthStore } from "../../store/authStore";
import { CheckIcon, XMarkIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import toast from "react-hot-toast";
import { BookLoader } from "../../components/ui/Spinner";

const BASE_URL = `${API_URL}/api`;

const RegularizationApprovalPage: React.FC = () => {
  const { user, token } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/attendance/pending-regularizations/${user?.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load requests");
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load time adjustments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleApprove = async (req: any) => {
    try {
      setProcessingId(req.id);
      const res = await fetch(`${BASE_URL}/attendance/approve/${req.employee_id}?date=${req.date}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success(`Time adjustment approved for ${req.employee_name}`);
        fetchRequests();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to approve request");
      }
    } catch (error) {
      toast.error("Error approving request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: any) => {
    try {
      setProcessingId(req.id);
      const res = await fetch(`${BASE_URL}/attendance/reject/${req.employee_id}?date=${req.date}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success(`Time adjustment rejected for ${req.employee_name}`);
        fetchRequests();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to reject request");
      }
    } catch (error) {
      toast.error("Error rejecting request");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusText = (managerStatus: string | null | undefined) => {
    const status = managerStatus || "Pending";
    if (status === "Clarification Provided") return "Pending";
    if (status === "Approved") return "Approved";
    if (status === "Need Clarification") return "Returned";
    if (status === "Rejected") return "Rejected";
    return status;
  };

  const getStatusColor = (managerStatus: string | null | undefined) => {
    const status = managerStatus || "Pending";
    if (status === "Clarification Provided") return "bg-warning-50 text-warning-700 border-warning-200";
    if (status === "Approved") return "bg-success-50 text-success-700 border-success-200";
    if (status === "Need Clarification" || status === "Rejected") return "bg-danger-50 text-danger-700 border-danger-200";
    return "bg-neutral-50 text-neutral-700 border-neutral-200";
  };

  const filteredRequests = requests.filter((req) => {
    const resolvedStatus = getStatusText(req.manager_status);
    if (statusFilter === "All") return true;
    return resolvedStatus.toLowerCase() === statusFilter.toLowerCase();
  });

  if (loading) {
    return <BookLoader />;
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-warning-50 text-warning-600 rounded-2xl border border-warning-100 shadow-inner">
            <CalendarDaysIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-800">Time Adjustment Requests</h2>
            <p className="text-xs text-neutral-500 font-medium mt-1">Approve or reject team member check-in/check-out regularization requests</p>
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-755 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-xs"
          >
            <option value="All">All Requests</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Returned">Returned</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <Card padding="none" className="border border-neutral-200/80 shadow-sm rounded-2xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/60 text-neutral-500 text-xs font-bold uppercase tracking-wider border-b border-neutral-200/80">
                <th className="p-4 pl-6">Employee</th>
                <th className="p-4">Employee ID</th>
                <th className="p-4">Date</th>
                <th className="p-4">Requested Shift Timing</th>
                <th className="p-4">Reason</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-neutral-400 font-medium bg-neutral-50/20">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <CheckIcon className="w-12 h-12 text-success-400" />
                      <p className="text-sm font-bold text-neutral-500">All caught up!</p>
                      <p className="text-xs text-neutral-400">There are no regularization requests matching this filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const resolvedStatus = getStatusText(req.manager_status);
                  const isPending = !req.manager_status || req.manager_status === "Clarification Provided" || req.manager_status === "Pending";

                  return (
                    <tr key={req.id} className="hover:bg-neutral-50/40 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                            {req.employee_name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-neutral-850">{req.employee_name}</span>
                        </div>
                      </td>

                      <td className="p-4 text-sm text-neutral-600 font-medium">
                        {req.employee_code || "-"}
                      </td>

                      <td className="p-4 text-sm text-neutral-800 font-bold">
                        {req.attendance_date_formatted}
                      </td>

                      <td className="p-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
                          {req.check_in} to {req.check_out}
                        </span>
                      </td>

                      <td className="p-4 text-sm text-neutral-500 max-w-xs truncate" title={req.reason}>
                        {req.reason || <span className="text-neutral-400">—</span>}
                      </td>

                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(req.manager_status)}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            resolvedStatus === "Approved" ? "bg-success-600" :
                            (resolvedStatus === "Returned" || resolvedStatus === "Rejected") ? "bg-danger-600" :
                            "bg-warning-500 animate-pulse"
                          }`} />
                          {resolvedStatus}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApprove(req)}
                              disabled={processingId === req.id}
                              className="!py-1.5 !px-3 !text-xs shadow-sm bg-success-600 hover:bg-success-700 border-success-600 text-white"
                            >
                              {processingId === req.id ? (
                                <span className="w-3.5 h-3.5 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                              ) : (
                                <CheckIcon className="w-3.5 h-3.5 mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleReject(req)}
                              disabled={processingId === req.id}
                              className="!py-1.5 !px-3 !text-xs shadow-sm"
                            >
                              {processingId === req.id ? (
                                <span className="w-3.5 h-3.5 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                              ) : (
                                <XMarkIcon className="w-3.5 h-3.5 mr-1" />
                              )}
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-neutral-400">No actions required</span>
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

export default RegularizationApprovalPage;
