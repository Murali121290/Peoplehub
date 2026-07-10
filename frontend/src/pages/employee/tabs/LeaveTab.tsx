import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  CalendarIcon, 
  ClockIcon, 
  CheckIcon, 
  XMarkIcon, 
  ArrowPathIcon, 
  PencilIcon, 
  UserIcon, 
  ShieldCheckIcon,
  DocumentArrowUpIcon,
  InformationCircleIcon,
  ArrowRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { getStatusColor } from '../utils/employeeHelpers';
import { leaveReasons } from '../data/employeeMockData';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Modal } from '../../../components/ui/Modal';

const permissionReasons = [
  "Personal Emergency",
  "Medical Appointment",
  "Accident",
  "Family Emergency",
  "Official Work",
];

interface LeaveTabProps {
  leaveRequests: any[];
  currentEmployee: any;
  employees: any[];
  approvalLeaves: any[];
  totalBalance: number;
  itemVariants: any;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onCancel: (id: number) => void;
  onSubmitLeave: (e: React.FormEvent, leaveForm: any, editingLeave: any) => void;
}

const LeaveTab: React.FC<LeaveTabProps> = ({
  leaveRequests, currentEmployee, employees, approvalLeaves,
  totalBalance, itemVariants, onApprove, onReject, onCancel, onSubmitLeave,
}) => {
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [editingLeave, setEditingLeave] = useState<any>(null);
  const [leaveTab, setLeaveTab] = useState("myRequests");
  const [activeRequestDetails, setActiveRequestDetails] = useState<number | null>(null);

  const [leaveForm, setLeaveForm] = useState({
    requestType: "Leave",
    leaveType: "",
    leaveDuration: "Full Day",
    fromDate: "",
    toDate: "",
    permissionDate: "",
    fromTime: "",
    toTime: "",
    totalDays: 0,
    reason: "",
    emergencyContact: "",
    reportingManager: "",
    handoverTo: "",
    attachment: null,
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const canApproveLeaves =
  ["admin", "manager", "hr"].includes(
    (user?.access_level || "").toLowerCase()
  );

  useEffect(() => {
    if (leaveForm.fromDate && leaveForm.toDate) {
      const fromDate = new Date(leaveForm.fromDate);
      const toDate = new Date(leaveForm.toDate);

      let totalDays =
        Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (leaveForm.leaveDuration === "First Half" || leaveForm.leaveDuration === "Second Half") {
        totalDays = 0.5;
      }

      setLeaveForm(prev => ({
        ...prev,
        totalDays: totalDays > 0 ? totalDays : 0
      }));
    }
  }, [leaveForm.fromDate, leaveForm.toDate, leaveForm.leaveDuration]);

  const resetLeaveForm = () => {
    setLeaveForm({
      requestType: "Leave",
      leaveType: "",
      leaveDuration: "Full Day",
      fromDate: "",
      toDate: "",
      permissionDate: "",
      fromTime: "",
      toTime: "",
      totalDays: 0,
      reason: "",
      emergencyContact: "",
      reportingManager: "",
      handoverTo: "",
      attachment: null,
    });
  };

  const editLeave = (leave: any) => {
    setLeaveForm({
      requestType: leave.request_type || "Leave",
      leaveType: leave.leave_type || "",
      leaveDuration: leave.leave_duration || "Full Day",
      fromDate: leave.from_date || "",
      toDate: leave.to_date || "",
      permissionDate: leave.permission_date || "",
      fromTime: leave.from_time || "",
      toTime: leave.to_time || "",
      totalDays: leave.total_days || 0,
      reason: leave.reason || "",
      emergencyContact: leave.emergency_contact || "",
      reportingManager: leave.reporting_manager || "",
      handoverTo: leave.handover_to || "",
      attachment: null,
    });
    setEditingLeave(leave);
    setShowLeaveForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    const payload = {
      ...leaveForm,
      request_type: leaveForm.requestType,
      permission_date: leaveForm.permissionDate,
      from_time: leaveForm.fromTime,
      to_time: leaveForm.toTime,
    };
    onSubmitLeave(e, payload, editingLeave);
    setShowLeaveForm(false);
    setEditingLeave(null);
    resetLeaveForm();
  };

  // Find active requests (Pending) for live status tracking
  const activeRequests = leaveRequests.filter(
    (req: any) => 
      Number(req.employee_id) === Number(currentEmployee?.id) && 
      req.status === "Pending"
  );

  return (
    <>
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            Leave & Permission Management
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Apply, track, and manage your leave requests and permission balances
          </p>
        </div>
        <Button 
          icon={PlusIcon} 
          onClick={() => setShowLeaveForm(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          Apply New Request
        </Button>
      </div>

      {/* Leave Balance Grid Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { 
            label: "Sick Leave", 
            value: currentEmployee?.sick_leave || 0, 
            total: 1.5, 
            bg: "from-blue-500/5 to-indigo-500/5 hover:from-blue-500/10 hover:to-indigo-500/10 border-blue-100", 
            iconBg: "bg-blue-500 text-white", 
            textCls: "text-blue-700",
            icon: ShieldCheckIcon,
            desc: "For medical recovery"
          },
          { 
            label: "Casual Leave", 
            value: currentEmployee?.casual_leave || 0, 
            total: 1.5, 
            bg: "from-amber-500/5 to-orange-500/5 hover:from-amber-500/10 hover:to-orange-500/10 border-amber-100", 
            iconBg: "bg-amber-500 text-white", 
            textCls: "text-amber-700",
            icon: ClockIcon,
            desc: "For urgent personal work"
          },
          { 
            label: "Earned Leave", 
            value: currentEmployee?.earned_leave || 0, 
            total: 1.5, 
            bg: "from-emerald-500/5 to-teal-500/5 hover:from-emerald-500/10 hover:to-teal-500/10 border-emerald-100", 
            iconBg: "bg-emerald-500 text-white", 
            textCls: "text-emerald-700",
            icon: CalendarIcon,
            desc: "Accrued vacation leaves"
          },
          { 
            label: "Total Balance", 
            value: totalBalance, 
            total: 45, 
            bg: "from-purple-500/5 to-pink-500/5 hover:from-purple-500/10 hover:to-pink-500/10 border-purple-100", 
            iconBg: "bg-purple-500 text-white", 
            textCls: "text-purple-700",
            icon: DocumentTextIcon,
            desc: "Cumulative leave count"
          },
        ].map((item) => {
          const used = Math.max(0, item.total - item.value);
          const percent = Math.min(100, Math.round((used / item.total) * 100));

          return (
            <Card key={item.label} className={`border border-neutral-200 bg-gradient-to-br ${item.bg} hover:shadow-md transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-500" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">{item.label}</p>
                  <h4 className="text-4xl font-extrabold text-neutral-850 mt-2 select-none tracking-tight">
                    {item.value} <span className="text-xs text-neutral-400 font-medium">/ {item.total} days</span>
                  </h4>
                </div>
                <div className={`p-2.5 rounded-xl ${item.iconBg} shadow-sm`}>
                  <item.icon className="w-5 h-5" />
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-5">
                <div className="flex justify-between items-center text-[10px] font-semibold text-neutral-400 mb-1">
                  <span>{percent}% CONSUMED</span>
                  <span>{used} days used</span>
                </div>
                <div className="w-full bg-neutral-200/60 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full bg-current ${item.textCls}`} 
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-neutral-400 mt-2.5 font-medium">{item.desc}</p>
            </Card>
          );
        })}
      </motion.div>

      {/* Navigation Tabs (My Requests / Approval Requests) */}
      <div className="flex gap-3 mb-6 p-1 bg-neutral-100 rounded-xl w-fit border border-neutral-200">
        <button
          onClick={() => setLeaveTab("myRequests")}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            leaveTab === "myRequests" 
              ? "bg-white text-primary-700 shadow-sm border border-neutral-200/50" 
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Leave Report
        </button>
        {canApproveLeaves && (
  <button
    onClick={() => setLeaveTab("approvalRequests")}
    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
      leaveTab === "approvalRequests"
        ? "bg-white text-primary-700 shadow-sm border border-neutral-200/50"
        : "text-neutral-500 hover:text-neutral-800"
    }`}
  >
    Approval Requests
  </button>
)}
      </div>

      {leaveTab === "myRequests" && (
        <>
          {/* Active Leave Request Timeline Widget */}
          {activeRequests.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card className="border border-warning-200 bg-gradient-to-r from-warning-50/20 to-neutral-50/30 rounded-2xl shadow-sm p-6">
                <div className="flex justify-between items-start mb-5 pb-3 border-b border-neutral-200/80">
                  <div className="flex items-center gap-3">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-warning-100 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-warning-500" />
                    </span>
                    <h3 className="text-md font-bold text-neutral-850">
                      Active Leave Request Tracking ({activeRequests.length})
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-neutral-400 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
                    Live Updates
                  </span>
                </div>

                <div className="space-y-6 divide-y divide-neutral-200/60">
                  {activeRequests.map((leave: any, idx) => {
                    const isPermission = leave.request_type === "Permission";
                    const isExpanded = activeRequestDetails === leave.id;
                    return (
                      <div key={leave.id} className={`${idx > 0 ? "pt-5" : ""}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="bg-primary-50 text-primary-600 p-2 rounded-xl mt-0.5 border border-primary-100">
                              <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-neutral-800">
                                {isPermission ? "Permission Request" : `${leave.leave_type} (${leave.leave_duration || 'Full Day'})`}
                              </p>
                              <p className="text-xs text-neutral-500 font-medium mt-0.5 flex items-center gap-1.5">
                                <ClockIcon className="w-3.5 h-3.5 text-neutral-400" />
                                {isPermission 
                                  ? `${leave.permission_date} @ ${leave.from_time} - ${leave.to_time}`
                                  : `${leave.from_date} to ${leave.to_date} (${leave.total_days} days)`
                                }
                              </p>
                            </div>
                          </div>

                          {/* Steps Horizontal Indicator */}
                          <div className="flex-1 max-w-xl mx-4 my-2 md:my-0">
                            <div className="flex items-center justify-between relative">
                              {/* Connector line */}
                              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-neutral-200 -translate-y-1/2 z-0" />
                              <div className="absolute top-1/2 left-0 w-1/2 h-0.5 bg-gradient-to-r from-success-500 to-warning-400 -translate-y-1/2 z-0" />

                              {[
                                { title: "Applied", desc: "Submitted successfully", completed: true, active: false },
                                { title: "Manager Review", desc: `Pending with ${leave.reporting_manager || "Manager"}`, completed: false, active: true },
                                { title: "Final Status", desc: "Awaiting approval", completed: false, active: false }
                              ].map((step, i) => (
                                <div key={step.title} className="flex flex-col items-center relative z-10">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all shadow-sm ${
                                    step.completed 
                                      ? "bg-success-500 border-success-500 text-white" 
                                      : step.active 
                                        ? "bg-white border-warning-500 text-warning-700 ring-4 ring-warning-100" 
                                        : "bg-white border-neutral-300 text-neutral-400"
                                  }`}>
                                    {step.completed ? <CheckIcon className="w-3.5 h-3.5" /> : (i + 1)}
                                  </div>
                                  <span className="text-[10px] font-bold mt-1.5 text-neutral-700 bg-white px-1.5">{step.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Quick details toggle */}
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setActiveRequestDetails(isExpanded ? null : leave.id)}
                              className="text-xs font-semibold text-neutral-600 border border-neutral-300 px-3 py-1.5 rounded-lg flex items-center gap-1"
                            >
                              {isExpanded ? "Hide Details" : "View Details"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="danger" 
                              onClick={() => onCancel(leave.id)}
                              className="bg-danger-50 text-danger-700 hover:bg-danger-100 border border-danger-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <XMarkIcon className="w-3.5 h-3.5" />
                              Cancel
                            </Button>
                          </div>
                        </div>

                        {/* Collapsible details drawer */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-4 pl-12 pr-6"
                            >
                              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <p className="text-neutral-400 font-bold uppercase tracking-wider mb-1">Reason for request</p>
                                  <p className="text-neutral-800 font-semibold">{leave.reason || "No reason specified."}</p>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between py-1 border-b border-neutral-200">
                                    <span className="text-neutral-500 font-medium">Reporting Manager:</span>
                                    <span className="text-neutral-800 font-bold">{leave.reporting_manager || "-"}</span>
                                  </div>
                                  {leave.handover_to && (
                                    <div className="flex justify-between py-1 border-b border-neutral-200">
                                      <span className="text-neutral-500 font-medium">Work Handover:</span>
                                      <span className="text-neutral-800 font-bold">{leave.handover_to}</span>
                                    </div>
                                  )}
                                  {leave.emergency_contact && (
                                    <div className="flex justify-between py-1 border-b border-neutral-200">
                                      <span className="text-neutral-500 font-medium">Emergency Contact:</span>
                                      <span className="text-neutral-800 font-bold">{leave.emergency_contact}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Leave History Table Section */}
          <Card padding="none" className="overflow-hidden border border-neutral-200 shadow-sm rounded-2xl bg-white">
            <div className="px-6 py-5 border-b border-neutral-200 bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-neutral-850">Leave & Permission History</h3>
                <p className="text-xs text-neutral-400 font-medium mt-0.5">Chronological record of all submitted requests</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
                  Total Requests: {leaveRequests.filter(r => Number(r.employee_id) === Number(currentEmployee?.id)).length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="text-left p-4 pl-6">Request details</th>
                    <th className="text-left p-4">Timeline / Date range</th>
                    <th className="text-center p-4">Duration</th>
                    <th className="text-center p-4">Status</th>
                    <th className="text-left p-4">Manager Review</th>
                    <th className="text-right p-4 pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/80">
                  {leaveRequests.filter((request: any) => Number(request.employee_id) === Number(currentEmployee?.id)).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-neutral-400 font-medium bg-neutral-50/20">
                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                          <CalendarIcon className="w-12 h-12 text-neutral-300" />
                          <p className="text-sm font-bold text-neutral-500">No leave requests found</p>
                          <p className="text-xs text-neutral-400">Click "Apply New Request" to request leaves or permissions.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    leaveRequests
                      .filter((request: any) => Number(request.employee_id) === Number(currentEmployee?.id))
                      .map((request: any) => {
                        const isPermission = request.request_type === "Permission";
                        const isApproved = request.status === "Approved";
                        const isRejected = request.status === "Rejected";
                        const isPending = request.status === "Pending";
                        const isCancelled = request.status === "Cancelled";

                        return (
                          <tr key={request.id} className="hover:bg-neutral-50/40 transition-colors">
                            {/* Request Details */}
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl border ${
                                  isPermission 
                                    ? "bg-purple-50 border-purple-100 text-purple-600" 
                                    : "bg-blue-50 border-blue-100 text-blue-600"
                                }`}>
                                  {isPermission ? <ClockIcon className="w-4 h-4" /> : <CalendarIcon className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-neutral-850">
                                    {isPermission ? "Permission Request" : request.leave_type}
                                  </p>
                                  <p className="text-xs text-neutral-400 font-medium truncate max-w-xs mt-0.5" title={request.reason}>
                                    Reason: {request.reason || "Not specified"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Timeline Date Range */}
                            <td className="p-4">
                              {isPermission ? (
                                <div>
                                  <p className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                                    {request.permission_date}
                                  </p>
                                  <p className="text-xs text-neutral-400 font-medium flex items-center gap-1 mt-0.5">
                                    <ClockIcon className="w-3 h-3 text-neutral-400" />
                                    {request.from_time} - {request.to_time}
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                                    {request.from_date}
                                  </p>
                                  <p className="text-xs text-neutral-400 font-medium flex items-center gap-1 mt-0.5">
                                    <ArrowRightIcon className="w-3 h-3 text-neutral-300" />
                                    to {request.to_date}
                                  </p>
                                </div>
                              )}
                            </td>

                            {/* Duration */}
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                isPermission 
                                  ? "bg-purple-50 text-purple-700 border-purple-200" 
                                  : "bg-neutral-100 text-neutral-700 border-neutral-200"
                              }`}>
                                {isPermission ? "Permission" : `${request.total_days} ${request.total_days === 1 ? 'day' : 'days'}`}
                              </span>
                              {!isPermission && request.leave_duration !== "Full Day" && (
                                <p className="text-[10px] text-neutral-400 font-semibold mt-1">{request.leave_duration}</p>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(request.status)}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  isApproved ? "bg-success-600" :
                                  isRejected ? "bg-danger-600" :
                                  isCancelled ? "bg-neutral-600" :
                                  "bg-warning-500 animate-pulse"
                                }`} />
                                {request.status}
                              </span>
                            </td>

                            {/* Manager Review */}
                            <td className="p-4 text-sm font-medium text-neutral-600">
                              <div className="flex items-center gap-1.5">
                                <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                                <span className="text-xs font-semibold text-neutral-700">{request.reporting_manager || "Manager"}</span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="p-4 text-right pr-6">
                              <div className="flex justify-end gap-2">
                                {isPending && (
                                  <>
                                    <button 
                                      onClick={() => editLeave(request)}
                                      className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-800 transition-colors border border-neutral-200"
                                      title="Edit Request"
                                    >
                                      <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => onCancel(request.id)}
                                      className="p-2 rounded-lg bg-danger-50 hover:bg-danger-100 text-danger-600 hover:text-danger-800 transition-colors border border-danger-100"
                                      title="Cancel Request"
                                    >
                                      <XMarkIcon className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {isApproved && (
                                  <Button 
                                    size="sm" 
                                    variant="danger" 
                                    onClick={() => onCancel(request.id)}
                                    className="bg-danger-50 hover:bg-danger-100 text-danger-700 text-xs font-semibold px-3 py-1.5 border border-danger-200 rounded-lg flex items-center gap-1"
                                  >
                                    Cancel Leave
                                  </Button>
                                )}
                                {isRejected && (
                                  <button 
                                    onClick={() => editLeave(request)}
                                    className="px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-100 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1"
                                  >
                                    <ArrowPathIcon className="w-3.5 h-3.5" /> Re-apply
                                  </button>
                                )}
                                {(isCancelled || (!isPending && !isApproved && !isRejected)) && (
                                  <span className="text-xs text-neutral-400 font-medium italic">No action</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {leaveTab === "approvalRequests" && canApproveLeaves && (
        <Card padding="none" className="overflow-hidden border border-neutral-200 shadow-sm rounded-2xl bg-white">
          <div className="px-6 py-5 border-b border-neutral-200 bg-neutral-50/50">
            <h3 className="text-lg font-bold text-neutral-850">Leave Approval Requests</h3>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">Manage and review leaves submitted by your team</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left p-4 pl-6">Employee</th>
                  <th className="text-left p-4">Request Type</th>
                  <th className="text-left p-4">Date Range / Details</th>
                  <th className="text-center p-4">Status</th>
                  <th className="text-right p-4 pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80">
                {approvalLeaves.filter((leave: any) => leave.status !== "Cancelled").length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-neutral-400 font-medium bg-neutral-50/20">
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <CheckIcon className="w-12 h-12 text-success-400" />
                        <p className="text-sm font-bold text-neutral-500">All caught up!</p>
                        <p className="text-xs text-neutral-400">There are no pending leave approval requests from your team.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  approvalLeaves
                    .filter((leave: any) => leave.status !== "Cancelled")
                    .map((leave: any) => {
                      const leaveType = leave.request_type === "Permission" ? "Permission" : leave.leave_type;
                      const isPermission = leave.request_type === "Permission";
                      
                      return (
                        <tr key={leave.id} className="hover:bg-neutral-50/40 transition-colors">
                          {/* Employee details */}
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                                {leave.employee_name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-bold text-neutral-850">{leave.employee_name}</span>
                            </div>
                          </td>

                          {/* Leave Type */}
                          <td className="p-4 text-sm text-neutral-700 font-semibold">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              isPermission 
                                ? "bg-purple-50 text-purple-700 border-purple-200" 
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                              {leaveType}
                            </span>
                          </td>

                          {/* Date Range / Details */}
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

                          {/* Status */}
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(leave.status)}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                leave.status === "Approved" ? "bg-success-600" :
                                leave.status === "Rejected" ? "bg-danger-600" :
                                "bg-warning-500 animate-pulse"
                              }`} />
                              {leave.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right pr-6">
                            <div className="flex justify-end gap-2">
                              {leave.status === "Pending" ? (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="success" 
                                    onClick={() => onApprove(leave.id)}
                                    className="bg-success-600 hover:bg-success-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1"
                                  >
                                    <CheckIcon className="w-3.5 h-3.5" /> Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="danger" 
                                    onClick={() => onReject(leave.id)}
                                    className="bg-danger-600 hover:bg-danger-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1"
                                  >
                                    <XMarkIcon className="w-3.5 h-3.5" /> Reject
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-neutral-400 font-medium italic">No action</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Leave Form Modal */}
      <Modal
        isOpen={showLeaveForm}
        onClose={() => setShowLeaveForm(false)}
        size="xl"
        title={editingLeave ? "Edit Leave Request" : "Apply Leave / Permission"}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Form Fields */}
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Request Type */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Request Type <span className="text-danger-500">*</span></label>
                <select
                  value={leaveForm.requestType}
                  onChange={(e) =>
                    setLeaveForm((prev) => ({
                      ...prev,
                      requestType: e.target.value,
                      reason: "",
                      leaveType: e.target.value === "Permission" ? "" : prev.leaveType,
                      leaveDuration: e.target.value === "Permission" ? "Full Day" : prev.leaveDuration,
                      fromDate: e.target.value === "Permission" ? "" : prev.fromDate,
                      toDate: e.target.value === "Permission" ? "" : prev.toDate,
                      totalDays: e.target.value === "Permission" ? 0 : prev.totalDays,
                      permissionDate: e.target.value === "Leave" ? "" : prev.permissionDate,
                      fromTime: e.target.value === "Leave" ? "" : prev.fromTime,
                      toTime: e.target.value === "Leave" ? "" : prev.toTime,
                    }))
                  }
                  className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-white text-sm text-neutral-600 placeholder-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer font-medium"
                >
                  <option value="Leave">Leave Request</option>
                  <option value="Permission">Hourly Permission</option>
                </select>
              </div>

              {/* Leave Type */}
              {leaveForm.requestType === "Leave" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Leave Type <span className="text-danger-500">*</span></label>
                  <select 
                    required 
                    value={leaveForm.leaveType}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-white text-sm text-neutral-600 placeholder-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer font-medium"
                  >
                    <option value="">Select Leave Type</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Earned Leave">Earned Leave</option>
                  </select>
                </div>
              )}
            </div>

            {/* Leave Duration */}
            {leaveForm.requestType === "Leave" && (
              <div className="bg-neutral-50/50 p-4 border border-neutral-200 rounded-xl">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Leave Duration</label>
                <div className="flex gap-4">
                  {["Full Day", "First Half", "Second Half"].map((dur) => (
                    <label key={dur} className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-neutral-700">
                      <input 
                        type="radio" 
                        name="leaveDuration" 
                        value={dur}
                        checked={leaveForm.leaveDuration === dur}
                        onChange={(e) => setLeaveForm({ ...leaveForm, leaveDuration: e.target.value })}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-100 cursor-pointer"
                      />
                      {dur}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Leave Request Date Range Picker */}
            {leaveForm.requestType === "Leave" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">From Date <span className="text-danger-500">*</span></label>
                  <div className="relative">
                    <input 
                      type="date" 
                      required 
                      value={leaveForm.fromDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                      className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:outline-none font-medium" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">To Date <span className="text-danger-500">*</span></label>
                  <div className="relative">
                    <input 
                      type="date" 
                      required 
                      value={leaveForm.toDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                      className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:outline-none font-medium" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Total Estimated Days</label>
                  <input 
                    readOnly 
                    value={leaveForm.totalDays || 0}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-neutral-100 text-sm text-neutral-500 font-semibold text-center select-none" 
                  />
                </div>
              </div>
            )}

            {/* Hourly Permission Date/Time Picker */}
            {leaveForm.requestType === "Permission" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-neutral-50/50 p-5 border border-neutral-200 rounded-xl">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Permission Date <span className="text-danger-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={leaveForm.permissionDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, permissionDate: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">From Time <span className="text-danger-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={leaveForm.fromTime}
                    onChange={(e) => setLeaveForm({ ...leaveForm, fromTime: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">To Time <span className="text-danger-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={leaveForm.toTime}
                    onChange={(e) => setLeaveForm({ ...leaveForm, toTime: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:outline-none font-medium"
                  />
                </div>
              </div>
            )}

            {/* Reporting Manager and Handover fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Reporting Manager</label>
                <input 
                  type="text" 
                  value={currentEmployee?.reporting_manager || "Admin"} 
                  readOnly
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-100 text-sm text-neutral-500 font-medium" 
                />
              </div>

              {leaveForm.requestType === "Leave" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Work Handover Partner</label>
                  <select 
                    value={leaveForm.handoverTo}
                    onChange={(e) => setLeaveForm({ ...leaveForm, handoverTo: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-white text-sm text-neutral-600 placeholder-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer font-medium"
                  >
                    <option value="">Select Employee</option>
                    {employees?.map((emp) => (
                      <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Emergency Contact Number <span className="text-danger-500">*</span></label>
              <input 
                type="text" 
                required 
                value={leaveForm.emergencyContact}
                onChange={(e) => setLeaveForm({ ...leaveForm, emergencyContact: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:outline-none placeholder-neutral-400 font-medium"
                placeholder="Enter telephone or mobile number" 
              />
            </div>

            {/* Reason selection */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Reason for application <span className="text-danger-500">*</span></label>
              <select 
                required 
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-white text-sm text-neutral-600 placeholder-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer font-medium"
              >
                <option value="">Select Reason</option>
                {leaveForm.requestType === "Permission" ? (
                  permissionReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))
                ) : leaveForm.leaveType ? (
                  leaveReasons[leaveForm.leaveType]?.map((reason: string) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))
                ) : (
                  <option value="" disabled>Select leave type first</option>
                )}
              </select>
            </div>

            {/* Document Upload */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Supportive Document / Attachment</label>
              <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-5 flex flex-col items-center justify-center bg-neutral-50/50 hover:bg-neutral-50 hover:border-primary-400 transition-colors cursor-pointer group">
                <input type="file" className="hidden" id="leave-file-input" />
                <label htmlFor="leave-file-input" className="cursor-pointer flex flex-col items-center">
                  <DocumentArrowUpIcon className="w-10 h-10 text-neutral-400 group-hover:text-primary-600 transition-colors mb-2" />
                  <span className="text-sm font-bold text-neutral-750">Click to upload files</span>
                  <span className="text-xs text-neutral-400 mt-1">Supports PDF, JPG, PNG up to 5MB</span>
                </label>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-neutral-200">
              <Button type="button" variant="outline" onClick={() => setShowLeaveForm(false)} className="rounded-xl px-5 py-2.5 text-sm font-semibold">
                Cancel
              </Button>
              <Button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl px-6 py-2.5 text-sm shadow-md hover:shadow-lg transition-all duration-200">
                {editingLeave ? "Update Request" : "Submit Request"}
              </Button>
            </div>
          </div>

          {/* Right Policy Side Panel */}
          <div className="space-y-6">
            {/* Live Leave Balance list */}
            <div className="bg-primary-50 border border-primary-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-extrabold text-sm mb-4 text-primary-900 flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 animate-bounce h-4 text-primary-700" />
                Leave Balance Summary
              </h3>
              <div className="space-y-3.5 text-xs">
                {[
                  { label: "Earned Leave", value: currentEmployee?.earned_leave || 0 },
                  { label: "Casual Leave", value: currentEmployee?.casual_leave || 0 },
                  { label: "Sick Leave", value: currentEmployee?.sick_leave || 0 },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-primary-100">
                    <span className="text-neutral-600 font-semibold">{item.label}</span>
                    <span className="font-extrabold text-primary-700 text-md">{item.value} days</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 text-sm">
                  <span className="font-bold text-primary-900">Total Balance</span>
                  <span className="font-extrabold text-primary-800">{totalBalance} days</span>
                </div>
              </div>
            </div>

            {/* Leave Policy description */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
              <h4 className="font-extrabold text-sm mb-3 text-emerald-900 flex items-center gap-1.5">
                <InformationCircleIcon className="w-4 h-4 text-emerald-700" />
                Leave Information
              </h4>
              <ul className="text-[11px] text-neutral-600 space-y-3 font-semibold leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span><strong>Earned Leave:</strong> Planned leaves (vacation, trips) requiring prior scheduling.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span><strong>Casual Leave:</strong> Personal work or unplanned immediate events.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span><strong>Sick Leave:</strong> Auto-approved or manager-approved medical recoveries.</span>
                </li>
              </ul>
            </div>

            {/* Guidelines info */}
            <div className="bg-warning-50 border border-warning-200 rounded-2xl p-5 shadow-sm">
              <h4 className="font-extrabold text-sm mb-3 text-warning-900 flex items-center gap-1.5">
                <InformationCircleIcon className="w-4 h-4 text-warning-700" />
                Quick Guidelines
              </h4>
              <ul className="text-[11px] text-neutral-600 space-y-2.5 font-semibold leading-relaxed">
                <li>• Apply at least 2 days in advance for planned leaves.</li>
                <li>• Ensure work handover partner is selected.</li>
                <li>• Keep emergency contact up to date.</li>
              </ul>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default LeaveTab;
