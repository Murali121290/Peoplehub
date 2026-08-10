import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const ApprovalNavigationTabs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { name: "Leave Approval", path: "/manager/leave-approval" },
    { name: "Permission Approval", path: "/manager/permission-approval" },
    { name: "Shift Approval", path: "/manager/shift-approval" },
    { name: "ODW Approval", path: "/manager/odw-approval" },
    { name: "WFH Approval", path: "/manager/wfh-approval" },
  ];

  return (
    <div className="flex border-b border-neutral-200 mb-6 gap-2">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
              isActive
                ? "border-primary-600 text-primary-700 font-extrabold"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            {tab.name}
          </button>
        );
      })}
    </div>
  );
};

export default ApprovalNavigationTabs;
