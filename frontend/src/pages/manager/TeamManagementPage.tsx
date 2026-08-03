import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/api";
import { useAuthStore } from "../../store/authStore";
import LeaveApprovalPage from "./LeaveApprovalPage";
import ShiftApprovalPage from "./ShiftApprovalPage";
import WFHApprovalPage from "./WFHApprovalPage";
import PermissionApprovalPage from "./PermissionApprovalPage";

const BASE_URL = `${API_URL}/api`;

interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: "leave", label: "Leave Approval", icon: "📋" },
  { id: "shift", label: "Shift Approval", icon: "⏱️" },
  { id: "wfh", label: "WFH Approval", icon: "🏠" },
  { id: "permission", label: "Permission Approval", icon: "🔐" }
];

const TeamManagementPage: React.FC = () => {
  const { user, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState("leave");
  const [notificationCounts, setNotificationCounts] = useState({
    leave: 0,
    shift: 0,
    wfh: 0,
    permission: 0
  });

  const checkManagerMatch = (reportingManager: string | null | undefined, managerFullName: string | null | undefined): boolean => {
    if (!reportingManager || !managerFullName) return false;
    const repManagerClean = reportingManager.trim().toLowerCase();
    const managerName = managerFullName.trim().toLowerCase();

    if (repManagerClean === managerName) return true;
    const repParts = repManagerClean.split(/\s+/);
    const mgParts = managerName.split(/\s+/);

    if (repParts.length === 1 && mgParts.length > 0 && mgParts[0] === repParts[0]) return true;
    if (mgParts.length === 1 && repParts.length > 0 && repParts[0] === mgParts[0]) return true;
    return false;
  };

  const fetchNotificationCounts = async () => {
    try {
      const isAdmin = user?.access_level?.toLowerCase() === "admin";

      // Fetch shift/WFH requests
      const shiftResponse = await fetch(`${BASE_URL}/shifts/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!shiftResponse.ok) return;
      const allRequests = await shiftResponse.json();

      if (!Array.isArray(allRequests)) return;

      const filterByManager = (req: any): boolean => {
        return isAdmin || checkManagerMatch(req.reporting_manager, user?.full_name);
      };

      // Count pending shift requests (excluding WFH)
      const shiftCount = allRequests.filter((req: any) =>
        req.request_type !== "WFH" && filterByManager(req) && req.status === "Pending"
      ).length;

      // Count pending WFH requests
      const wfhCount = allRequests.filter((req: any) =>
        req.request_type === "WFH" && filterByManager(req) && req.status === "Pending"
      ).length;

      // Fetch leave requests
      let leaveCount = 0;
      try {
        const leaveResponse = await fetch(`${BASE_URL}/leaves/`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json();
          if (Array.isArray(leaveData)) {
            leaveCount = leaveData.filter((req: any) =>
              filterByManager(req) && req.status === "Pending"
            ).length;
          }
        }
      } catch (error) {
        console.error("Failed to fetch leave counts", error);
      }

      setNotificationCounts({
        leave: leaveCount,
        shift: shiftCount,
        wfh: wfhCount,
        permission: 0
      });
    } catch (error) {
      console.error("Failed to fetch notification counts", error);
    }
  };

  useEffect(() => {
    fetchNotificationCounts();
    const interval = setInterval(fetchNotificationCounts, 30000);
    return () => clearInterval(interval);
  }, [user, token]);

  const getTabComponent = () => {
    switch (activeTab) {
      case "leave":
        return <LeaveApprovalPage />;
      case "shift":
        return <ShiftApprovalPage />;
      case "wfh":
        return <WFHApprovalPage />;
      case "permission":
        return <PermissionApprovalPage />;
      default:
        return <LeaveApprovalPage />;
    }
  };

  const getPendingCount = (tabId: string): number => {
    return notificationCounts[tabId as keyof typeof notificationCounts] || 0;
  };

  const getTotalPendingCount = (): number => {
    return Object.values(notificationCounts).reduce((sum, count) => sum + count, 0);
  };

  // Export total count for sidebar access
  React.useEffect(() => {
    const totalCount = getTotalPendingCount();
    window.dispatchEvent(new CustomEvent("teamManagementNotificationCount", { detail: totalCount }));
  }, [notificationCounts]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600/10 via-primary-500/5 to-transparent border-b border-neutral-200 sticky top-0 z-40">

        {/* Tab Navigation */}
        <div className="border-t border-neutral-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const pendingCount = getPendingCount(tab.id);

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 relative ${
                      isActive
                        ? "border-primary-600 text-primary-700 bg-primary-50/30"
                        : "border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50/50"
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {pendingCount > 0 && (
                      <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger-500 text-xs font-bold text-white shadow-lg ring-2 ring-white">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-6">
        {getTabComponent()}
      </div>
    </div>
  );
};

export default TeamManagementPage;
