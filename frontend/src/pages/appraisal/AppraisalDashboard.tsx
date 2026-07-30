import React, { useState } from "react";
import AppraisalTabBar from "./components/AppraisalTabBar";
import { AppraisalTab } from "./models/appraisal";
import DashboardTab from "./tabs/DashboardTab";
import EmployeeAppraisalTab from "./tabs/EmployeeAppraisalTab";
import ManagerReviewTab from "./tabs/ManagerReviewTab";
import ReportTab from "./tabs/ReportTab";
import HistoryTab from "./tabs/HistoryTab";

const AppraisalDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppraisalTab>("dashboard");

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab />;
      case "employee":
        return <EmployeeAppraisalTab />;
      case "manager":
        return <ManagerReviewTab />;
      case "report":
        return <ReportTab />;
      case "history":
        return <HistoryTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-850">Performance Appraisal</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Track achievements, submit appraisals, and review team performance.
          </p>
        </div>
      </div>

      <AppraisalTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="transition-all duration-300">
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default AppraisalDashboard;