import React, { useState } from "react";

import AppraisalTabBar from "./components/AppraisalTabBar";

import DashboardTab from "./tabs/DashboardTab";
import EmployeeAppraisalTab from "./tabs/EmployeeAppraisalTab";
import ManagerReviewTab from "./tabs/ManagerReviewTab";
import ReportTab from "./tabs/ReportTab";
import HistoryTab from "./tabs/HistoryTab";

import { AppraisalTab } from "./models/appraisal";

import "./styles/appraisal.css";

const AppraisalDashboard: React.FC = () => {
  const [activeTab, setActiveTab] =
    useState<AppraisalTab>("dashboard");

  const renderTab = () => {
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
    <div className="appraisal-container p-6 bg-gray-50 min-h-screen">

      <div className="mb-6">

        <h1 className="text-3xl font-bold text-gray-900">
          Employee Appraisal
        </h1>

        <p className="text-gray-500 mt-2">
          Annual Performance Appraisal Management System
        </p>

      </div>

      <AppraisalTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="fade-in">
        {renderTab()}
      </div>

    </div>
  );
};

export default AppraisalDashboard;