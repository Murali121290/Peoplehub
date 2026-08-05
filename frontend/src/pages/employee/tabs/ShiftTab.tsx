import React, { useState, useEffect } from "react";
import { API_URL } from "../../../config/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
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
import { Modal, ConfirmDialog } from "../../../components/ui/Modal";
import { DatePicker } from "../../../components/ui/DatePicker";
import { getStatusColor } from '../utils/employeeHelpers';

interface ShiftTabProps {
  currentEmployee: any;
  shiftRequests: any[];
  managerShiftRequests: any[];
  leaveRequests: any[];
  onSubmitShift: (form: any) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onCancelShift: (id: number) => void;
}

const ShiftTab: React.FC<ShiftTabProps> = ({
  currentEmployee,
  shiftRequests,
  managerShiftRequests,
  leaveRequests,
  onSubmitShift,
  onApprove,
  onReject,
  onCancelShift,
}) => {
  const [requestType, setRequestType] = useState("Shift");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [shiftTab, setShiftTab] = useState("my");
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [activeRequestDetails, setActiveRequestDetails] = useState<number | null>(null);
  const [shiftOptions, setShiftOptions] = useState<string[]>([]);
  const [cancelRequestId, setCancelRequestId] = useState<number | null>(null);
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});

  const toggleReason = (id: number) => {
    setExpandedReasons(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  useEffect(() => {
    fetch(`${API_URL}/api/shifts/options`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setShiftOptions(data.filter((s: string) => s.toUpperCase() !== "WFH" && s.toLowerCase() !== "work from home"));
        }
      })
      .catch((err) => console.error("Failed to load shift options", err));
  }, []);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const canApproveShifts = ["admin", "manager", "hr"].includes(
    (user?.access_level || "").toLowerCase()
  );


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

  const hasLeaveOverlap = (startStr: string, endStr: string) => {
    if (!leaveRequests || !leaveRequests.length || !currentEmployee) return false;
    const start = new Date(startStr);
    const end = new Date(endStr);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return leaveRequests.some((leave: any) => {
      // 1. Only check approved leaves
      if (leave.status !== "Approved" || leave.request_type !== "Leave") return false;

      // 2. Match by employee identifier variations
      const leaveEmpId = String(leave.employee_id || "");
      if (
        leaveEmpId !== String(currentEmployee.id) &&
        leaveEmpId !== String(currentEmployee.employee_id)
      ) return false;

      if (!leave.from_date || !leave.to_date) return false;
      const leaveStart = new Date(leave.from_date);
      const leaveEnd = new Date(leave.to_date);
      leaveStart.setHours(0, 0, 0, 0);
      leaveEnd.setHours(0, 0, 0, 0);

      // Overlap formula: (startA <= endB) && (endA >= startB)
      return (start <= leaveEnd) && (end >= leaveStart);
    });
  };

  const handleSubmit = () => {
    if (!fromDate) {
      toast.error("Please select a date");
      return;
    }

    const todayStr = new Date().toLocaleDateString("en-CA");
    if (fromDate < todayStr) {
      toast.error("Cannot apply for a shift change for a past date.");
      return;
    }

    if (hasLeaveOverlap(fromDate, fromDate)) {
      toast.error("You cannot request a shift change or WFH during your approved leave dates.");
      return;
    }

    onSubmitShift({
      employee_id: currentEmployee.employee_id || currentEmployee.id,
      employee_name: `${currentEmployee.first_name} ${currentEmployee.last_name}`,
      current_shift: currentEmployee.shift_timing || "General Shift",
      reporting_manager: currentEmployee.reporting_manager || "Admin",
      requested_shift: (requestType === "WFH" || requestType === "Office") ? (currentEmployee.shift_timing || "General Shift") : shiftForm.requestedShift,
      current_work_mode: currentEmployee.work_mode || "Office",
      requested_work_mode: requestType === "WFH" ? "WFH" : requestType === "Office" ? "Office" : (currentEmployee.work_mode || "Office"),
      request_type: requestType,
      from_date: fromDate,
      to_date: toDate,
      reason: shiftForm.reason,
    });

    resetForm();
    setShowShiftForm(false);
  };

  const activeShiftRequests = Array.isArray(shiftRequests)
    ? shiftRequests.filter((req: any) => {
        if (req.status !== "Pending") return false;
        const startDate = req.from_date || req.shift_date || req.to_date || "";
        const todayStr = new Date().toLocaleDateString("en-CA");
        if (startDate && startDate < todayStr) return false;
        return true;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 tracking-tight flex items-center gap-2">
            Shift & Work Mode Requests
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

      {/* Removed Navigation Switch Tabs */}

      {/* Active Shift Request Timeline Widget */}
      {activeShiftRequests.length > 0 && (
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
                const isOffice = req.request_type === "Office";
                const isExpanded = activeRequestDetails === req.id;
                return (
                  <div key={req.id} className={`${idx > 0 ? "pt-5" : ""}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-xl border ${(isWFH || isOffice)
                            ? "bg-purple-50 border-purple-100 text-purple-600"
                            : "bg-blue-50 border-blue-100 text-blue-600"
                          }`}>
                          {(isWFH || isOffice) ? <HomeIcon className="w-5 h-5" /> : <BriefcaseIcon className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-800">
                            {isWFH ? "Work From Home Request" : isOffice ? "Work From Office Request" : `Shift Change Request`}
                          </p>
                          <p className="text-xs text-neutral-500 font-medium mt-0.5 flex items-center gap-1.5">
                            <ClockIcon className="w-3.5 h-3.5 text-neutral-400" />
                            {(isWFH || isOffice)
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
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all shadow-sm ${step.completed
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
                        {req.status === "Pending" && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setCancelRequestId(req.id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-danger-600 hover:bg-danger-700 text-white shadow-sm border border-danger-600"
                          >
                            Cancel
                          </Button>
                        )}
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
      {true && (
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
                <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-500 text-[10px] font-semibold uppercase tracking-wider">
                  <th className="text-left p-4 pl-6">Type</th>
                  <th className="text-left p-4">Current Shift</th>
                  <th className="text-left p-4">Requested Shift</th>
                  <th className="text-left p-4">Date Range</th>
                  <th className="text-left p-4">Applied At</th>
                  <th className="text-left p-4">Actioned At</th>
                  <th className="text-left p-4">Reason</th>
                  <th className="text-center p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80">
                {!Array.isArray(shiftRequests) || shiftRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-neutral-400 font-medium bg-neutral-50/20">
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <CalendarIcon className="w-12 h-12 text-neutral-300" />
                        <p className="text-xs font-bold text-neutral-500">No shift requests found</p>
                        <p className="text-[11px] text-neutral-400">Click "Request Shift / WFH" to apply for schedule updates.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  shiftRequests.map((item: any) => {
                    const isApproved = item.status === "Approved";
                    const isRejected = item.status === "Rejected";
                    const isWorkMode = item.request_type === "WFH" || item.request_type === "Office" || item.requested_work_mode === "WFH" || item.requested_work_mode === "Office";

                    const formatDateTime = (isoString: string | null | undefined) => {
                      if (!isoString) return "—";
                      try {
                        const isMidnight = isoString.includes("T00:00:00");
                        const d = new Date(isoString);
                        if (isNaN(d.getTime())) return "—";
                        if (isMidnight) {
                          return d.toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          });
                        }
                        return d.toLocaleString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true
                        });
                      } catch (e) {
                        return "—";
                      }
                    };

                    const getActionedAtText = (r: any) => {
                      if (r.status === "Approved") return formatDateTime(r.approved_at);
                      if (r.status === "Rejected") return formatDateTime(r.rejected_at);
                      if (r.status === "Cancelled") return formatDateTime(r.cancelled_at);
                      return "Pending";
                    };

                    return (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-neutral-50/40 transition-colors">
                          <td className="p-4 pl-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${isWorkMode
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}>
                              {item.request_type || "Shift"}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-normal text-neutral-600">
                            {item.current_shift || "-"}
                            {item.current_work_mode && <span className="text-[10px] text-blue-500 font-semibold ml-1">({item.current_work_mode})</span>}
                          </td>
                          <td className="p-4 text-xs font-medium text-neutral-800">
                            {item.requested_shift || "-"}
                            {item.requested_work_mode && <span className="text-[10px] text-blue-500 font-semibold ml-1">({item.requested_work_mode})</span>}
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="text-xs font-medium text-neutral-800">{item.from_date}</p>
                              <p className="text-[11px] text-neutral-450 font-normal mt-0.5 flex items-center gap-1">
                                <ArrowRightIcon className="w-3 h-3 text-neutral-350" /> to {item.to_date}
                              </p>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-medium text-neutral-800">
                            {formatDateTime(item.created_at)}
                          </td>
                          <td className="p-4 text-xs font-medium text-neutral-800">
                            {getActionedAtText(item)}
                          </td>
                          <td className="p-4 text-xs text-neutral-500 max-w-xs">
                            {item.reason ? (
                              <button
                                onClick={() => toggleReason(item.id)}
                                className="text-left text-neutral-600 hover:text-primary-600 transition-colors duration-150 flex items-center gap-1 focus:outline-none group/reason w-full"
                              >
                                <span className="truncate max-w-[150px]">{item.reason}</span>
                                {item.reason.length > 20 && (
                                  <span className="text-primary-500 group-hover/reason:text-primary-600 text-[10px] font-semibold flex items-center gap-0.5 shrink-0 ml-1">
                                    {expandedReasons[item.id] ? "Collapse" : "Expand"}
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                      className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedReasons[item.id] ? "rotate-180" : ""}`}
                                    >
                                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </button>
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(item.status)}`}>
                              <span className={`h-1 w-1 rounded-full ${isApproved ? "bg-success-600" :
                                  isRejected ? "bg-danger-600" :
                                    "bg-warning-500 animate-pulse"
                                }`} />
                              {item.status}
                            </span>
                          </td>
                        </tr>
                        {expandedReasons[item.id] && item.reason && (
                          <tr className="bg-neutral-50/30">
                            <td colSpan={8} className="p-4 pl-10 pr-6 border-b border-neutral-200">
                              <div className="text-xs text-neutral-600 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-inner max-w-3xl">
                                <div className="flex items-center gap-1.5 mb-2 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-primary-500">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                                  </svg>
                                  <span>Reason for Shift Change Request</span>
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed text-neutral-700 font-medium pl-5">
                                  {item.reason}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
                  <option value="Office">Work From Office (Office)</option>
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
                    {(shiftOptions.length > 0
                      ? shiftOptions
                      : ["General Shift", "First Shift", "Second Shift", "Night Shift"]
                    ).map((shift) => (
                      <option key={shift} value={shift}>
                        {shift}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Single Date Selector */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Date <span className="text-danger-500">*</span></label>
                <DatePicker
                  required
                  value={fromDate}
                  onChange={(val) => {
                    setFromDate(val);
                    setToDate(val);
                  }}
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
                  <span className="text-primary-700 font-extrabold">07 AM - 04 PM</span>
                </li>
                <li className="flex justify-between py-1 border-b border-primary-100">
                  <span>General Shift:</span>
                  <span className="text-primary-700 font-extrabold">09 AM - 06 PM</span>
                </li>
                <li className="flex justify-between py-1 border-b border-primary-100">
                  <span>Second Shift:</span>
                  <span className="text-primary-700 font-extrabold">12 PM - 09 PM</span>
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

      <ConfirmDialog
        isOpen={cancelRequestId !== null}
        title="Cancel Shift/WFH Request"
        message="Are you sure you want to cancel this request?"
        description="This action cannot be undone."
        variant="danger"
        confirmLabel="Yes, Cancel"
        cancelLabel="No, Keep It"
        onConfirm={() => {
          if (cancelRequestId !== null) {
            onCancelShift(cancelRequestId);
            setCancelRequestId(null);
          }
        }}
        onCancel={() => setCancelRequestId(null)}
      />
    </div>
  );
};

export default ShiftTab;