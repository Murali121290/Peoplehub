import React from "react";
import { AppraisalTab } from "../models/appraisal";

interface AppraisalTabBarProps {
  activeTab: AppraisalTab;
  onTabChange: (tab: AppraisalTab) => void;
}

const tabs: {
  id: AppraisalTab;
  label: string;
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
  },
  {
    id: "employee",
    label: "Employee Appraisal",
  },
  {
    id: "manager",
    label: "Manager Review",
  },
  {
    id: "report",
    label: "Reports",
  },
  {
    id: "history",
    label: "History",
  },
];

const AppraisalTabBar: React.FC<AppraisalTabBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 mb-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${
                activeTab === tab.id
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AppraisalTabBar;