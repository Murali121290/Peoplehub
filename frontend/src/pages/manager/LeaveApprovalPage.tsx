import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/api";
import { useAuthStore } from "../../store/authStore";
import { CheckIcon, XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import toast from "react-hot-toast";

const BASE_URL = `${API_URL}/api`;

const LeaveApprovalPage: React.FC = () => {
  const { user, token } = useAuthStore();
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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

  const approvalLeaves = leaveRequests.filter((l: any) => {
    const isManager = l.reporting_manager === user?.full_name || 
                      l.handover_to === user?.full_name || 
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
    return <div className="p-8 flex justify-center"><div className="h-8 w-8 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
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
            <option value="All">All Statuses</option>
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
              <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                <th className="text-left p-4 pl-6">Employee</th>
                <th className="text-left p-4">Emp ID</th>
                <th className="text-left p-4">Request Type</th>
                <th className="text-left p-4">Date Range / Details</th>
                <th className="text-center p-4">Status</th>
                <th className="text-center p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {approvalLeaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-neutral-400 font-medium bg-neutral-50/20">
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
                      <tr key={leave.id} className="hover:bg-neutral-50/40 transition-colors">
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
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            isPermission 
                              ? "bg-purple-50 text-purple-700 border-purple-200" 
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {leaveType}
                          </span>
                        </td>

                        <td className="p-4 text-sm">
                          {isPermission ? (
                            <div>
                              <p className="font-semibold text-neutral-800">{leave.permission_date || "-"}</p>
                              <p className="text-xs text-neutral-400 font-semibold mt-0.5">
                                {leave.from_time} to {leave.to_time}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-semibold text-neutral-800">{leave.from_date || "-"} to {leave.to_date || "-"}</p>
                              <p className="text-xs text-neutral-400 font-semibold mt-0.5">Duration: {leave.total_days || 0} days</p>
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(leave.status)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              leave.status === "Approved" ? "bg-success-600" :
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
                          ) : leave.status === "Approved" && ((leave.permission_date || leave.from_date || "") >= new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]) ? (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleCancel(leave.id)}
                                disabled={processingId === leave.id}
                                className="!py-1.5 !px-3 !text-xs shadow-sm"
                              >
                                {processingId === leave.id ? (
                                  <span className="w-3.5 h-3.5 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                                ) : (
                                  <XMarkIcon className="w-3.5 h-3.5 mr-1" />
                                )}
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium text-neutral-400">No actions available</span>
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

export default LeaveApprovalPage;
