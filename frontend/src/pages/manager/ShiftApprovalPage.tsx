import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/api";
import { useAuthStore } from "../../store/authStore";
import { CheckIcon, XMarkIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import toast from "react-hot-toast";

const BASE_URL = `${API_URL}/api`;

const ShiftApprovalPage: React.FC = () => {
  const { user, token } = useAuthStore();
  const [shiftRequests, setShiftRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

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

  const safeManagerShiftRequests = shiftRequests.filter(
    (req: any) => req.reporting_manager === user?.full_name || user?.access_level?.toLowerCase() === "admin"
  );

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-success-50 text-success-700 border-success-200";
      case "Rejected": return "bg-danger-50 text-danger-700 border-danger-200";
      default: return "bg-warning-50 text-warning-700 border-warning-200";
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="h-8 w-8 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Shift Approval Requests</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage and review shift change applications from your team.</p>
      </div>
      
      <Card padding="none" className="overflow-hidden border border-neutral-200 shadow-sm rounded-2xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500 text-[10px] font-semibold uppercase tracking-wider">
                <th className="text-left p-4 pl-6">Employee</th>
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
                  <td colSpan={7} className="p-10 text-center text-neutral-400 font-medium bg-neutral-50/20">
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
                      <td className="p-4 text-xs text-neutral-600">{item.current_shift || "-"}</td>
                      <td className="p-4 text-xs font-medium text-neutral-800">{item.requested_shift || "WFH"}</td>
                      <td className="p-4">
                        <div>
                          <p className="text-xs font-medium text-neutral-800">{item.from_date}</p>
                          <p className="text-[11px] text-neutral-450 font-normal mt-0.5 flex items-center gap-1">
                            <ArrowRightIcon className="w-3 h-3 text-neutral-350" /> to {item.to_date}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-neutral-500 truncate max-w-xs" title={item.reason}>{item.reason || "-"}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(item.status)}`}>
                          <span className={`h-1 w-1 rounded-full ${
                            isApproved ? "bg-success-600" :
                            isRejected ? "bg-danger-600" :
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
                          <span className="text-[10px] font-medium text-neutral-400">No actions available</span>
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
