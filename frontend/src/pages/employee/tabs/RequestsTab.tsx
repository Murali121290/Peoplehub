import React, { useState } from "react";
import {
  CalendarDaysIcon,
  ClockIcon,
  HomeIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import LeaveTab from "./LeaveTab";
import ShiftTab from "./ShiftTab";

interface RequestsTabProps {
  leaveRequests: any[];
  currentEmployee: any;
  employees: any[];
  approvalLeaves: any[];
  totalBalance: number;
  itemVariants: any;
  onApproveLeave: (id: number) => void;
  onRejectLeave: (id: number) => void;
  onCancelLeave: (id: number) => void;
  onSubmitLeave: (e: React.FormEvent, leaveForm: any, editingLeave: any) => void;

  shiftRequests: any[];
  managerShiftRequests: any[];
  onSubmitShift: (form: any) => void;
  onApproveShift: (id: number) => void;
  onRejectShift: (id: number) => void;
  onCancelShift: (id: number) => void;
}

const RequestsTab: React.FC<RequestsTabProps> = ({
  leaveRequests,
  currentEmployee,
  employees,
  approvalLeaves,
  totalBalance,
  itemVariants,
  onApproveLeave,
  onRejectLeave,
  onCancelLeave,
  onSubmitLeave,

  shiftRequests,
  managerShiftRequests,
  onSubmitShift,
  onApproveShift,
  onRejectShift,
  onCancelShift,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"leave" | "permission" | "shift" | "wfh" | "odw">("leave");

  const subTabs = [
    { id: "leave", label: "Leave Requests", icon: CalendarDaysIcon },
    { id: "permission", label: "Permissions", icon: ShieldCheckIcon },
    { id: "shift", label: "Shift Changes", icon: ClockIcon },
    { id: "wfh", label: "WFH Requests", icon: HomeIcon },
    { id: "odw", label: "ODW", icon: CalendarDaysIcon },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Sub Tab Navigation */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-2.5 shadow-sm max-w-4xl">
        <div className="flex flex-wrap gap-1">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-205 whitespace-nowrap ${
                  isActive
                    ? "bg-primary-600 text-white shadow-md shadow-primary-500/20"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render component based on selected sub-tab */}
      <div className="mt-6">
        {activeSubTab === "leave" && (
          <LeaveTab
            mode="leave"
            leaveRequests={leaveRequests}
            currentEmployee={currentEmployee}
            employees={employees}
            approvalLeaves={approvalLeaves}
            totalBalance={totalBalance}
            itemVariants={itemVariants}
            onApprove={onApproveLeave}
            onReject={onRejectLeave}
            onCancel={onCancelLeave}
            onSubmitLeave={onSubmitLeave}
          />
        )}
        {activeSubTab === "permission" && (
          <LeaveTab
            mode="permission"
            leaveRequests={leaveRequests}
            currentEmployee={currentEmployee}
            employees={employees}
            approvalLeaves={approvalLeaves}
            totalBalance={totalBalance}
            itemVariants={itemVariants}
            onApprove={onApproveLeave}
            onReject={onRejectLeave}
            onCancel={onCancelLeave}
            onSubmitLeave={onSubmitLeave}
          />
        )}
        {activeSubTab === "shift" && (
          <ShiftTab
            mode="shift"
            currentEmployee={currentEmployee}
            shiftRequests={shiftRequests}
            managerShiftRequests={managerShiftRequests}
            leaveRequests={leaveRequests}
            onSubmitShift={onSubmitShift}
            onApprove={onApproveShift}
            onReject={onRejectShift}
            onCancelShift={onCancelShift}
          />
        )}
        {activeSubTab === "wfh" && (
          <ShiftTab
            mode="wfh"
            currentEmployee={currentEmployee}
            shiftRequests={shiftRequests}
            managerShiftRequests={managerShiftRequests}
            leaveRequests={leaveRequests}
            onSubmitShift={onSubmitShift}
            onApprove={onApproveShift}
            onReject={onRejectShift}
            onCancelShift={onCancelShift}
          />
        )}
        {activeSubTab === "odw" && (
          <ShiftTab
            mode="odw"
            currentEmployee={currentEmployee}
            shiftRequests={shiftRequests}
            managerShiftRequests={managerShiftRequests}
            leaveRequests={leaveRequests}
            onSubmitShift={onSubmitShift}
            onApprove={onApproveShift}
            onReject={onRejectShift}
            onCancelShift={onCancelShift}
          />
        )}
      </div>
    </div>
  );
};

export default RequestsTab;
