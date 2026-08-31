import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/api";
import { useAuthStore } from "../../store/authStore";
import LeaveApprovalPage from "./LeaveApprovalPage";
import ShiftApprovalPage from "./ShiftApprovalPage";
import WFHApprovalPage from "./WFHApprovalPage";
import PermissionApprovalPage from "./PermissionApprovalPage";
import RegularizationApprovalPage from "./RegularizationApprovalPage";
import { socket } from "../../services/socket";
import {
  CalendarDaysIcon,
  ShieldCheckIcon,
  ClockIcon,
  HomeIcon,
  BriefcaseIcon
} from "@heroicons/react/24/outline";

const BASE_URL = `${API_URL}/api`;

interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  activeClass: string;
  badgeClass: string;
}

const TABS: TabConfig[] = [
  {
    id: "leave",
    label: "Leave Approval",
    icon: CalendarDaysIcon,
    activeClass: "border-success-600 text-success-700 bg-success-50/40",
    badgeClass: "bg-success-600 ring-success-100"
  },
  {
    id: "permission",
    label: "Permission Approval",
    icon: ShieldCheckIcon,
    activeClass: "border-indigo-600 text-indigo-700 bg-indigo-50/40",
    badgeClass: "bg-indigo-600 ring-indigo-100"
  },
  {
    id: "shift",
    label: "Shift Approval",
    icon: ClockIcon,
    activeClass: "border-blue-600 text-blue-700 bg-blue-50/40",
    badgeClass: "bg-blue-600 ring-blue-100"
  },
  {
    id: "wfh",
    label: "WFH Approval",
    icon: HomeIcon,
    activeClass: "border-purple-600 text-purple-700 bg-purple-50/40",
    badgeClass: "bg-purple-600 ring-purple-100"
  },
  {
    id: "odw",
    label: "ODW Approval",
    icon: BriefcaseIcon,
    activeClass: "border-amber-600 text-amber-700 bg-amber-50/40",
    badgeClass: "bg-amber-600 ring-amber-100"
  },
  {
    id: "regularization",
    label: "Regularization Approval",
    icon: ClockIcon,
    activeClass: "border-warning-600 text-warning-700 bg-warning-50/40",
    badgeClass: "bg-warning-600 ring-warning-100"
  }
];

const TeamManagementPage: React.FC = () => {
  const { user, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState("leave");
  const [notificationCounts, setNotificationCounts] = useState({
    leave: 0,
    shift: 0,
    odw: 0,
    wfh: 0,
    permission: 0,
    regularization: 0
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

      // Count pending shift requests (excluding WFH and ODW)
      const shiftCount = allRequests.filter((req: any) => {
        return req.request_type !== "WFH" && req.request_type !== "One Day Wages" && filterByManager(req) && req.status === "Pending";
      }).length;

      // Count pending ODW requests
      const odwCount = allRequests.filter((req: any) => {
        return req.request_type === "One Day Wages" && filterByManager(req) && req.status === "Pending";
      }).length;

      // Count pending WFH requests
      const wfhCount = allRequests.filter((req: any) => {
        return req.request_type === "WFH" && filterByManager(req) && req.status === "Pending";
      }).length;

      // Fetch leave requests
      let leaveCount = 0;
      let permissionCount = 0;
      try {
        const leaveResponse = await fetch(`${BASE_URL}/leaves/`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json();
          if (Array.isArray(leaveData)) {
            // Count pending leave requests (excluding permissions)
            leaveCount = leaveData.filter((req: any) => {
              if (req.request_type === "Permission") return false;
              return filterByManager(req) && req.status === "Pending";
            }).length;

            // Count pending permission requests
            permissionCount = leaveData.filter((req: any) => {
              if (req.request_type !== "Permission") return false;
              return filterByManager(req) && req.status === "Pending";
            }).length;
          }
        }
      } catch (error) {
        console.error("Failed to fetch leave counts", error);
      }

      // Fetch pending regularizations
      let regularizationCount = 0;
      try {
        const regRes = await fetch(`${BASE_URL}/attendance/pending-regularizations/${user?.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (regRes.ok) {
          const regData = await regRes.json();
          if (Array.isArray(regData)) {
            regularizationCount = regData.filter((r: any) => {
              const status = r.manager_status || "Pending";
              return status === "Clarification Provided" || status === "Pending";
            }).length;
          }
        }
      } catch (error) {
        console.error("Failed to fetch regularization counts", error);
      }

      setNotificationCounts({
        leave: leaveCount,
        shift: shiftCount,
        odw: odwCount,
        wfh: wfhCount,
        permission: permissionCount,
        regularization: regularizationCount
      });
    } catch (error) {
      console.error("Failed to fetch notification counts", error);
    }
  };

  useEffect(() => {
    fetchNotificationCounts();

    const handleSocketUpdate = () => {
      fetchNotificationCounts();
    };

    socket.on("leave_update", handleSocketUpdate);
    socket.on("shift_update", handleSocketUpdate);
    socket.on("attendance_update", handleSocketUpdate);

    const interval = setInterval(fetchNotificationCounts, 60000);
    return () => {
      clearInterval(interval);
      socket.off("leave_update", handleSocketUpdate);
      socket.off("shift_update", handleSocketUpdate);
      socket.off("attendance_update", handleSocketUpdate);
    };
  }, [user, token]);

  const getTabComponent = () => {
    switch (activeTab) {
      case "leave":
        return <LeaveApprovalPage />;
      case "shift":
        return <ShiftApprovalPage isOdwOnly={false} />;
      case "odw":
        return <ShiftApprovalPage isOdwOnly={true} />;
      case "wfh":
        return <WFHApprovalPage />;
      case "permission":
        return <PermissionApprovalPage />;
      case "regularization":
        return <RegularizationApprovalPage />;
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
      <div className="bg-gradient-to-r from-primary-800/10 via-primary-700/5 to-transparent border-b border-neutral-200 sticky top-0 z-40">

        {/* Tab Navigation */}
        <div className="border-t border-neutral-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const pendingCount = getPendingCount(tab.id);

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 rounded-t-xl transition-all duration-200 flex items-center gap-2 relative ${
                      isActive
                        ? `${tab.activeClass} font-extrabold shadow-sm`
                        : "border-transparent text-neutral-600 hover:text-primary-600 hover:bg-primary-50/10"
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? "" : "text-neutral-400"}`} />
                    <span>{tab.label}</span>
                    {pendingCount > 0 && (
                      <span className={`ml-1.5 flex h-5 px-2 min-w-[20px] items-center justify-center rounded-full text-[10px] font-extrabold text-white shadow-md ring-2 transition-all ${
                        isActive 
                          ? `${tab.badgeClass}` 
                          : "bg-primary-500 ring-white"
                      }`}>
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
