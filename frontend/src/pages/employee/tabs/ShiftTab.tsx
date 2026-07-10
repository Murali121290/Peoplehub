import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PlusIcon, 
  CalendarIcon, 
  ClockIcon, 
  CheckIcon, 
  XMarkIcon, 
  ArrowPathIcon, 
  UserIcon, 
  BriefcaseIcon,
  HomeIcon,
  InformationCircleIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Modal } from "../../../components/ui/Modal";
import { getStatusColor } from '../utils/employeeHelpers';

interface ShiftTabProps {
  currentEmployee: any;
  shiftRequests: any[];
  managerShiftRequests: any[];
  onSubmitShift: (form: any) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

const ShiftTab: React.FC<ShiftTabProps> = ({
  currentEmployee,
  shiftRequests,
  managerShiftRequests,
  onSubmitShift,
  onApprove,
  onReject,
}) => {
  const [requestType, setRequestType] = useState("Shift");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [shiftTab, setShiftTab] = useState("my");
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [activeRequestDetails, setActiveRequestDetails] = useState<number | null>(null);
  
  const [shiftForm, setShiftForm] = useState({
    requestedShift: "General Shift",
    reason: "",
  });

  const safeManagerShiftRequests = Array.isArray(managerShiftRequests)
    ? managerShiftRequests
    : [];

  const resetForm = () => {
    setFromDate("");
    setToDate("");
    setRequestType("Shift");
    setShiftForm({
      requestedShift: "General Shift",
      reason: "",
    });
  };

  const handleClose = () => {
    resetForm();
    setShowShiftForm(false);
  };

  const handleSubmit = () => {
    if (!fromDate || !toDate) {
      alert("Please select dates");
      return;
    }

    onSubmitShift({
      employee_id: currentEmployee.user_id || currentEmployee.id,
      employee_name: `${currentEmployee.first_name} ${currentEmployee.last_name}`,
      current_shift: currentEmployee.shift_timing || "General Shift",
      reporting_manager: currentEmployee.reporting_manager || "Admin",
      requested_shift: shiftForm.requestedShift,
      request_type: requestType,
      from_date: fromDate,
      to_date: toDate,
      reason: shiftForm.reason,
    });

    resetForm();
    setShowShiftForm(false);
  };

  const activeShiftRequests = Array.isArray(shiftRequests)
    ? shiftRequests.filter((req: any) => req.status === "Pending")
    : [];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            Shift & Schedule Requests
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Apply and manage shift change logs and Work From Home (WFH) schedules
          </p>
        </div>
        <Button 
          icon={PlusIcon} 
          onClick={() => setShowShiftForm(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          Request Shift / WFH
        </Button>
      </div>

      {/* Top Details Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
  {[
    {
      label: "Your Assigned Shift",
      value: currentEmployee?.shift_timing || "General Shift",
      subtext: "Standard: 09:00 AM - 06:00 PM",
      icon: BriefcaseIcon,
      metaIcon: ClockIcon,
      iconWrap: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Approving Manager",
      value: currentEmployee?.reporting_manager || "Admin",
      subtext: "Assigned reporting lead",
      icon: UserIcon,
      metaIcon: UserIcon,
      iconWrap: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Pending Requests",
      value: `${activeShiftRequests.length} Requests`,
      subtext: "Awaiting manager decision",
      icon: ArrowPathIcon,
      metaIcon: ArrowPathIcon,
      iconWrap: "bg-violet-50",
      iconColor: "text-violet-600",
    },
  ].map((item) => {
    const Icon = item.icon;
    const MetaIcon = item.metaIcon;

    return (
      <Card
        key={item.label}
        className="rounded-[18px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-all duration-300 hover:shadow-[0_6px_18px_rgba(15,23,42,0.08)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-400">
              {item.label}
            </p>

            <h4 className="mt-2 text-[26px] leading-tight font-bold tracking-tight text-slate-900 break-words">
              {item.value}
            </h4>

            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
              <MetaIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.subtext}</span>
            </p>
          </div>

          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconWrap}`}
          >
            <Icon className={`h-5 w-5 ${item.iconColor}`} />
          </div>
        </div>
      </Card>
    );
  })}
</div>

      {/* Navigation Switch Tabs */}
      <div className="flex gap-3 mb-6 p-1 bg-neutral-100 rounded-xl w-fit border border-neutral-200">
        <button
          onClick={() => setShiftTab("my")}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            shiftTab === "my" 
              ? "bg-white text-primary-700 shadow-sm border border-neutral-200/50" 
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          My Requests
        </button>
        <button
          onClick={() => setShiftTab("approval")}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            shiftTab === "approval" 
              ? "bg-white text-primary-700 shadow-sm border border-neutral-200/50" 
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          Approval Requests
        </button>
      </div>

      {/* Active Shift Request Timeline Widget */}
      {shiftTab === "my" && activeShiftRequests.length > 0 && (
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
                  Active Shift / Schedule Tracking ({activeShiftRequests.length})
                </h3>
              </div>
              <span className="text-xs font-semibold text-neutral-400 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
                Live Updates
              </span>
            </div>

            <div className="space-y-6 divide-y divide-neutral-200/60">
              {activeShiftRequests.map((req: any, idx) => {
                const isWFH = req.request_type === "WFH";
                const isExpanded = activeRequestDetails === req.id;
                return (
                  <div key={req.id} className={`${idx > 0 ? "pt-5" : ""}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-xl border ${
                          isWFH 
                            ? "bg-purple-50 border-purple-100 text-purple-600" 
                            : "bg-blue-50 border-blue-100 text-blue-600"
                        }`}>
                          {isWFH ? <HomeIcon className="w-5 h-5" /> : <BriefcaseIcon className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-800">
                            {isWFH ? "Work From Home Request" : `Shift Change Request`}
                          </p>
                          <p className="text-xs text-neutral-500 font-medium mt-0.5 flex items-center gap-1.5">
                            <ClockIcon className="w-3.5 h-3.5 text-neutral-400" />
                            {isWFH 
                              ? `Schedule: ${req.from_date} to ${req.to_date}`
                              : `Change: ${req.current_shift} ➔ ${req.requested_shift} (${req.from_date} to ${req.to_date})`
                            }
                          </p>
                        </div>
                      </div>

                      {/* Timeline steps */}
                      <div className="flex-1 max-w-xl mx-4 my-2 md:my-0">
                        <div className="flex items-center justify-between relative">
                          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-neutral-200 -translate-y-1/2 z-0" />
                          <div className="absolute top-1/2 left-0 w-1/2 h-0.5 bg-gradient-to-r from-success-500 to-warning-400 -translate-y-1/2 z-0" />

                          {[
                            { title: "Submitted", completed: true, active: false },
                            { title: "Manager Review", completed: false, active: true },
                            { title: "Final Status", completed: false, active: false }
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

                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setActiveRequestDetails(isExpanded ? null : req.id)}
                          className="text-xs font-semibold text-neutral-600 border border-neutral-300 px-3 py-1.5 rounded-lg"
                        >
                          {isExpanded ? "Hide Details" : "View Details"}
                        </Button>
                      </div>
                    </div>

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
                              <p className="text-neutral-800 font-semibold">{req.reason || "No reason specified."}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between py-1 border-b border-neutral-200">
                                <span className="text-neutral-500 font-medium">Reporting Manager:</span>
                                <span className="text-neutral-800 font-bold">{req.reporting_manager || "Admin"}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-neutral-200">
                                <span className="text-neutral-500 font-medium">From Date:</span>
                                <span className="text-neutral-800 font-bold">{req.from_date}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-neutral-200">
                                <span className="text-neutral-500 font-medium">To Date:</span>
                                <span className="text-neutral-800 font-bold">{req.to_date}</span>
                              </div>
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

      {/* Requests History Table */}
      {shiftTab === "my" && (
        <Card padding="none" className="overflow-hidden border border-neutral-200 shadow-sm rounded-2xl bg-white">
          <div className="px-6 py-5 border-b border-neutral-200 bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-neutral-850">Shift Request History</h3>
              <p className="text-xs text-neutral-400 font-medium mt-0.5">Chronological record of all submitted shift/WFH requests</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
                Total Requests: {Array.isArray(shiftRequests) ? shiftRequests.length : 0}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left p-4 pl-6">Type</th>
                  <th className="text-left p-4">Current Shift</th>
                  <th className="text-left p-4">Requested Shift</th>
                  <th className="text-left p-4">Date Range</th>
                  <th className="text-left p-4">Reason</th>
                  <th className="text-center p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80">
                {!Array.isArray(shiftRequests) || shiftRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-neutral-400 font-medium bg-neutral-50/20">
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <CalendarIcon className="w-12 h-12 text-neutral-300" />
                        <p className="text-sm font-bold text-neutral-500">No shift requests found</p>
                        <p className="text-xs text-neutral-400">Click "Request Shift / WFH" to apply for schedule updates.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  shiftRequests.map((item: any) => {
                    const isApproved = item.status === "Approved";
                    const isRejected = item.status === "Rejected";
                    const isWFH = item.request_type === "WFH";

                    return (
                      <tr key={item.id} className="hover:bg-neutral-50/40 transition-colors">
                        <td className="p-4 pl-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            isWFH 
                              ? "bg-purple-50 text-purple-700 border-purple-200" 
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {item.request_type || "Shift"}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-medium text-neutral-600">{item.current_shift || "-"}</td>
                        <td className="p-4 text-sm font-bold text-neutral-850">
                          {isWFH ? "Work From Home" : item.requested_shift}
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-sm font-semibold text-neutral-850">{item.from_date}</p>
                            <p className="text-xs text-neutral-400 font-medium mt-0.5 flex items-center gap-1">
                              <ArrowRightIcon className="w-3 h-3 text-neutral-300" /> to {item.to_date}
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-neutral-500 truncate max-w-xs" title={item.reason}>{item.reason || "-"}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              isApproved ? "bg-success-600" :
                              isRejected ? "bg-danger-600" :
                              "bg-warning-500 animate-pulse"
                            }`} />
                            {item.status}
                          </span>
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

      {/* Approval Requests history */}
      {shiftTab === "approval" && (
        <Card padding="none" className="overflow-hidden border border-neutral-200 shadow-sm rounded-2xl bg-white">
          <div className="px-6 py-5 border-b border-neutral-200 bg-neutral-50/50">
            <h3 className="text-lg font-bold text-neutral-850">Shift Approval Requests</h3>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">Manage and review shift change applications from your team</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left p-4 pl-6">Employee</th>
                  <th className="text-left p-4">Current Shift</th>
                  <th className="text-left p-4">Requested Shift</th>
                  <th className="text-left p-4">Date Range</th>
                  <th className="text-left p-4">Reason</th>
                  <th className="text-center p-4">Status</th>
                  <th className="text-right p-4 pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80">
                {safeManagerShiftRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-neutral-400 font-medium bg-neutral-50/20">
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <CheckIcon className="w-12 h-12 text-success-400" />
                        <p className="text-sm font-bold text-neutral-500">All caught up!</p>
                        <p className="text-xs text-neutral-400">There are no pending shift approval requests from your team.</p>
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
                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                              {item.employee_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-neutral-855">{item.employee_name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-neutral-600">{item.current_shift || "-"}</td>
                        <td className="p-4 text-sm font-bold text-neutral-850">{item.requested_shift || "WFH"}</td>
                        <td className="p-4">
                          <div>
                            <p className="text-sm font-semibold text-neutral-850">{item.from_date}</p>
                            <p className="text-xs text-neutral-400 font-semibold mt-0.5 flex items-center gap-1">
                              <ArrowRightIcon className="w-3 h-3 text-neutral-300" /> to {item.to_date}
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-neutral-500 truncate max-w-xs" title={item.reason}>{item.reason || "-"}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              isApproved ? "bg-success-600" :
                              isRejected ? "bg-danger-600" :
                              "bg-warning-500 animate-pulse"
                            }`} />
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex justify-end gap-2">
                            {item.status === "Pending" ? (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="success" 
                                  onClick={() => onApprove(item.id)}
                                  className="bg-success-600 hover:bg-success-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1"
                                >
                                  <CheckIcon className="w-3.5 h-3.5" /> Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="danger" 
                                  onClick={() => onReject(item.id)}
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

      {/* Apply Shift Request Form Modal */}
      <Modal
        isOpen={showShiftForm}
        onClose={handleClose}
        size="xl"
        title="Apply Shift / WFH Request"
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main form side */}
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Request Type Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Request Type <span className="text-danger-500">*</span></label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-white text-sm text-neutral-600 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer font-medium"
                >
                  <option value="Shift">Shift Change</option>
                  <option value="WFH">Work From Home (WFH)</option>
                </select>
              </div>

              {/* Requested Shift timing Selector */}
              {requestType === "Shift" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Target Requested Shift <span className="text-danger-500">*</span></label>
                  <select
                    value={shiftForm.requestedShift}
                    onChange={(e) =>
                      setShiftForm({ ...shiftForm, requestedShift: e.target.value })
                    }
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-white text-sm text-neutral-600 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer font-medium"
                  >
                    <option value="First Shift">First Shift (06:00 AM - 02:00 PM)</option>
                    <option value="General Shift">General Shift (09:00 AM - 06:00 PM)</option>
                    <option value="Second Shift">Second Shift (02:00 PM - 10:00 PM)</option>
                    <option value="Night Shift">Night Shift (10:00 PM - 06:00 AM)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Date Range selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">From Date <span className="text-danger-500">*</span></label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">To Date <span className="text-danger-500">*</span></label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Reason textarea */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Reason for application <span className="text-danger-500">*</span></label>
              <textarea
                placeholder="State your reason for shift change or Work From Home request..."
                value={shiftForm.reason}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, reason: e.target.value })
                }
                rows={4}
                required
                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-100 focus:border-primary-400 focus:outline-none placeholder-neutral-400 font-medium text-sm text-neutral-600"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-6 border-t border-neutral-200">
              <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl px-5 py-2.5 text-sm font-semibold">
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl px-6 py-2.5 text-sm shadow-md hover:shadow-lg transition-all duration-200">
                Submit Request
              </Button>
            </div>
          </div>

          {/* Right helper panel */}
          <div className="space-y-6">
            <div className="bg-primary-50 border border-primary-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-extrabold text-sm mb-4 text-primary-900 flex items-center gap-1.5">
                <InformationCircleIcon className="w-4 h-4 text-primary-700" />
                Shift Timings Reference
              </h3>
              <ul className="space-y-3.5 text-xs font-semibold text-neutral-700">
                <li className="flex justify-between py-1 border-b border-primary-100">
                  <span>First Shift:</span>
                  <span className="text-primary-700 font-extrabold">06 AM - 02 PM</span>
                </li>
                <li className="flex justify-between py-1 border-b border-primary-100">
                  <span>General Shift:</span>
                  <span className="text-primary-700 font-extrabold">09 AM - 06 PM</span>
                </li>
                <li className="flex justify-between py-1 border-b border-primary-100">
                  <span>Second Shift:</span>
                  <span className="text-primary-700 font-extrabold">02 PM - 10 PM</span>
                </li>
                <li className="flex justify-between py-1 border-b border-primary-100">
                  <span>Night Shift:</span>
                  <span className="text-primary-700 font-extrabold">10 PM - 06 AM</span>
                </li>
              </ul>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
              <h4 className="font-extrabold text-sm mb-3 text-emerald-900 flex items-center gap-1.5">
                <InformationCircleIcon className="w-4 h-4 text-emerald-700" />
                Shift Policy Info
              </h4>
              <p className="text-[11px] text-neutral-600 font-semibold leading-relaxed">
                All requests require Approval from your designated Reporting Manager. Once approved, timing slots are updated on the system dashboard automatically.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ShiftTab;