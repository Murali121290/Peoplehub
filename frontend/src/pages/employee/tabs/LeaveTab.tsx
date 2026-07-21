import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
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
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { getStatusColor } from '../utils/employeeHelpers';

import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Modal } from '../../../components/ui/Modal';
import { TimePicker } from '../../../components/ui/TimePicker';
import { DatePicker } from '../../../components/ui/DatePicker';

const leaveReasons: Record<string, string[]> = {
  "Sick Leave": ["Fever", "Headache", "Cold", "Food Poisoning", "Medical Checkup", "Hospital Visit"],
  "Casual Leave": ["Personal Work", "Family Function", "Marriage", "Bank Work", "Travel"],
  "Earned Leave": ["Vacation", "Family Trip", "Festival", "Personal Time"],
  "Unpaid Leave": ["Emergency", "Personal Reasons", "Extended Vacation"],
};

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

  const BASE_URL = `${import.meta.env.VITE_API_URL || ""}/api`;

  const [leavePolicies, setLeavePolicies] = useState<any[]>([]);
  const [employeeBalances, setEmployeeBalances] = useState<any[]>([]);

  const fetchPoliciesAndBalances = async () => {
    try {
      const resPolicies = await axios.get(`${BASE_URL}/leaves/policies`);
      setLeavePolicies(resPolicies.data);
      if (currentEmployee?.id) {
        const resBalances = await axios.get(`${BASE_URL}/leaves/balances/${currentEmployee.id}`);
        setEmployeeBalances(resBalances.data);
      }
    } catch (err) {
      console.error("Failed to load policies or balances", err);
    }
  };

  useEffect(() => {
    fetchPoliciesAndBalances();
  }, [currentEmployee, leaveRequests]);
  const [validationError, setValidationError] = useState<{
    title: string;
    message: string;
    type: "limit" | "insufficient";
  } | null>(null);

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
    reportingManager: "",
    handoverTo: "",
    attachment: null,
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const canApproveLeaves =
  ["admin", "manager", "hr"].includes(
    (user?.access_level || "").toLowerCase()
  );



  // ── Timeline & Calendar View States ─────────────────────────────────────
  const todayObj = new Date();
  const [timelineViewMode, setTimelineViewMode] = useState<"calendar" | "grid">("calendar");
  const [selectedMonth, setSelectedMonth] = useState<number>(todayObj.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(todayObj.getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const [monthlyHolidaysData, setMonthlyHolidaysData] = useState<any[]>([]);
  const [monthlyScheduleData, setMonthlyScheduleData] = useState<any[]>([]);
  const [allYearHolidays, setAllYearHolidays] = useState<any[]>([]);
  const [selectedDateEventsModal, setSelectedDateEventsModal] = useState<any | null>(null);

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Fetch published holidays for the selected month & year
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE_URL}/employee/holidays?month=${selectedMonth}&year=${selectedYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setMonthlyHolidaysData(data.current_month_holidays || []);
        setMonthlyScheduleData(data.current_month_schedule || []);
        if (data.published_holidays) {
          setAllYearHolidays(data.published_holidays);
        }
      } catch (err) {
        console.error("Failed to fetch holidays for timeline:", err);
      }
    };
    fetchHolidays();
  }, [selectedMonth, selectedYear]);

  // Filter employee's own leave requests
  const myRequests = React.useMemo(() => {
    return leaveRequests.filter((req: any) => Number(req.employee_id) === Number(currentEmployee?.id));
  }, [leaveRequests, currentEmployee]);

  const filteredTimelineRequests = React.useMemo(() => {
    return myRequests.filter((req: any) => {
      const matchStatus = statusFilter === "All" || req.status === statusFilter;
      const matchType = typeFilter === "All" || req.leave_type === typeFilter;
      return matchStatus && matchType;
    });
  }, [myRequests, statusFilter, typeFilter]);

  // Generate 35-42 days grid for monthly calendar
  const calendarGridDays = React.useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay();

    const prevMonthNum = selectedMonth - 1 === 0 ? 12 : selectedMonth - 1;
    const prevMonthYear = selectedMonth - 1 === 0 ? selectedYear - 1 : selectedYear;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonthNum, 0).getDate();

    const days: any[] = [];

    // Previous month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateStr = `${prevMonthYear}-${String(prevMonthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ day: dayNum, dateStr, isCurrentMonth: false, year: prevMonthYear, month: prevMonthNum });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: true, year: selectedYear, month: selectedMonth });
    }

    // Next month leading days to round up to complete weeks
    const nextMonthNum = selectedMonth + 1 > 12 ? 1 : selectedMonth + 1;
    const nextMonthYear = selectedMonth + 1 > 12 ? selectedYear + 1 : selectedYear;
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remaining = totalSlots - days.length;

    for (let n = 1; n <= remaining; n++) {
      const dateStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      days.push({ day: n, dateStr, isCurrentMonth: false, year: nextMonthYear, month: nextMonthNum });
    }

    return days;
  }, [selectedYear, selectedMonth]);

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
      reportingManager: leave.reporting_manager || "",
      handoverTo: leave.handover_to || "",
      attachment: null,
    });
    setEditingLeave(leave);
    setShowLeaveForm(true);
  };

  // Helper to fetch available balance for a category
  const getAvailableBalance = (leaveType: string, defaultLimit: number) => {
    const bal = employeeBalances.find(b => b.leave_type.toLowerCase() === leaveType.toLowerCase());
    if (bal !== undefined) return bal.available;
    
    // Fallback for standard types
    if (leaveType.toLowerCase() === "sick leave") return currentEmployee?.sick_leave ?? defaultLimit;
    if (leaveType.toLowerCase() === "casual leave") return currentEmployee?.casual_leave ?? defaultLimit;
    if (["earned leave", "privilege leave"].includes(leaveType.toLowerCase())) return currentEmployee?.privilege_leave ?? currentEmployee?.earned_leave ?? defaultLimit;
    
    return defaultLimit;
  };

  // Helper to fetch pending days
  const getPendingDays = (leaveType: string) => {
    return leaveRequests
      .filter((req: any) => 
        Number(req.employee_id) === Number(currentEmployee?.id) && 
        req.status === "Pending" && 
        (req.leave_type || "").toLowerCase() === leaveType.toLowerCase()
      )
      .reduce((sum: number, req: any) => sum + (Number(req.total_days) || 0), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (leaveForm.requestType === "Leave") {
      const type = (leaveForm.leaveType || "").trim().toLowerCase();
      const requested = leaveForm.totalDays || 0;
      
      const matchedPolicy = leavePolicies.find(p => p.leave_type.toLowerCase() === type);
      const yearlyMax = matchedPolicy ? matchedPolicy.yearly_limit : (type === "privilege leave" || type === "earned leave" ? 15 : 6);
      const available = getAvailableBalance(leaveForm.leaveType, yearlyMax) - getPendingDays(leaveForm.leaveType);
      const displayType = matchedPolicy ? matchedPolicy.leave_type : leaveForm.leaveType;

      if (type) {
        if (available <= 0) {
          setValidationError({
            type: "limit",
            title: "Leave Limit Reached",
            message: `You have already used all ${yearlyMax} ${displayType} days for this year. Please select another leave type or contact HR.`
          });
          return;
        }

        if (requested > available) {
          setValidationError({
            type: "insufficient",
            title: "Insufficient Leave Balance",
            message: `Requested: ${requested} Days, Available: ${available} Days. Please reduce the requested leave duration.`
          });
          return;
        }
      }
    }

    const payload = {
      ...leaveForm,
      request_type: leaveForm.requestType,
      leave_type: leaveForm.leaveType === "Earned Leave" ? "Privilege Leave" : leaveForm.leaveType,
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
          <h1 className="text-xl font-bold text-neutral-800 tracking-tight flex items-center gap-2">
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
      {/* Leave Balance Grid Section */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {(() => {
          const userGender = (currentEmployee?.gender || "").trim().toLowerCase();
          const policiesList = leavePolicies.filter(pol => {
            const polGender = (pol.applicable_gender || "All").trim().toLowerCase();
            return polGender === "all" || polGender === userGender;
          });

          const dynamicCards = policiesList.map((pol) => {
            const available = getAvailableBalance(pol.leave_type, pol.yearly_limit);
            const pending = getPendingDays(pol.leave_type);
            const realAvailable = Math.max(0, available - pending);
            const used = Math.max(0, pol.yearly_limit - available);
            
            let icon = CalendarIcon;
            let iconWrap = "bg-blue-50";
            let iconColor = "text-blue-600";
            let note = "Annual leaves";
            
            if (pol.leave_type.toLowerCase() === "sick leave") {
              icon = ShieldCheckIcon;
              iconWrap = "bg-emerald-50";
              iconColor = "text-emerald-600";
              note = "For medical recovery";
            } else if (pol.leave_type.toLowerCase() === "casual leave") {
              icon = ClockIcon;
              iconWrap = "bg-amber-50";
              iconColor = "text-amber-600";
              note = "For personal work";
            } else if (["privilege leave", "earned leave"].includes(pol.leave_type.toLowerCase())) {
              icon = CalendarIcon;
              iconWrap = "bg-blue-50";
              iconColor = "text-blue-600";
              note = "Accrued vacation leaves";
            }
            
            return {
              label: pol.leave_type,
              value: realAvailable,
              total: pol.yearly_limit,
              used,
              icon,
              iconWrap,
              iconColor,
              note
            };
          });

          const totalAvailable = dynamicCards.reduce((sum, c) => sum + c.value, 0);
          const totalLimit = dynamicCards.reduce((sum, c) => sum + c.total, 0);
          const totalUsed = dynamicCards.reduce((sum, c) => sum + c.used, 0);

          const allCards = [
            ...dynamicCards,
            {
              label: "Total Balance",
              value: totalAvailable,
              total: totalLimit,
              used: totalUsed,
              icon: DocumentTextIcon,
              iconWrap: "bg-slate-100",
              iconColor: "text-slate-600",
              note: "Cumulative leave count"
            }
          ];

          return allCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.label}
                className="rounded-2xl border border-gray-200 bg-[#F8FAFC] p-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center"
              >
                <h4 className="text-[14px] font-semibold text-slate-800 mb-4 tracking-wide">{item.label}</h4>

                <div className={`flex h-[3rem] w-[3rem] items-center justify-center rounded-[14px] ${item.iconWrap} mb-5`}>
                  <Icon className={`h-5 w-5 ${item.iconColor}`} />
                </div>

                <div className="w-full space-y-2.5 mt-auto px-1">
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-slate-600 font-medium">Available</span>
                    <span className="font-semibold text-emerald-600">{item.value}</span>
                  </div>
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-slate-600 font-medium">Booked</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900">{item.used}</span>
                      <InformationCircleIcon className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
                    </div>
                  </div>
                </div>
              </Card>
            );
          });
        })()}
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

          {/* ── Leave Timeline Section (Calendar View & Grid View) ── */}
          <div className="bg-white border border-[#E5E7EB] shadow-sm rounded-xl overflow-hidden mb-6">
            {/* Header & Filter Controls (Sticky) */}
            <div className="sticky top-0 z-30 bg-white p-5 border-b border-[#E5E7EB] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#1F7A8C]/10 rounded-xl text-[#1F7A8C]">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-neutral-850">Leave &amp; Holiday Timeline</h3>
                </div>
              </div>

              {/* Controls: Mode Switcher & Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* View Switcher */}
                <div className="flex bg-neutral-100 border border-neutral-200/50 p-1 rounded-xl text-[13px] font-semibold">
                  <button
                    onClick={() => setTimelineViewMode("calendar")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      timelineViewMode === "calendar"
                        ? "bg-white text-[#1F7A8C] shadow-sm border border-neutral-200 font-bold"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" /> Calendar View
                  </button>
                  <button
                    onClick={() => setTimelineViewMode("grid")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      timelineViewMode === "grid"
                        ? "bg-white text-[#1F7A8C] shadow-sm border border-neutral-200 font-bold"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    <ListBulletIcon className="w-4 h-4" /> Grid View
                  </button>
                </div>

                {/* Year Selector */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-[13px] font-medium text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#1F7A8C] shadow-sm"
                >
                  {[todayObj.getFullYear() - 1, todayObj.getFullYear(), todayObj.getFullYear() + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                {/* Month Selector */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-[13px] font-medium text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#1F7A8C] shadow-sm"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1}>{mName}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-[13px] font-medium text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#1F7A8C] shadow-sm"
                >
                  <option value="All">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                {/* Leave Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-[13px] font-medium text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#1F7A8C] shadow-sm"
                >
                  <option value="All">All Leave Types</option>
                  {leavePolicies.filter(pol => {
                    const polGender = (pol.applicable_gender || "All").trim().toLowerCase();
                    const userGender = (currentEmployee?.gender || "").trim().toLowerCase();
                    return polGender === "all" || polGender === userGender;
                  }).map(pol => (
                    <option key={pol.id} value={pol.leave_type}>{pol.leave_type}</option>
                  ))}
                  <option value="Permission">Permission</option>
                </select>
              </div>
            </div>

            {/* ── Mode 1: Calendar View ── */}
            {timelineViewMode === "calendar" ? (
              <div className="p-6">
                {/* Navigation Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                  <div>
                    <h4 className="text-xl font-bold text-neutral-900">
                      {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                    </h4>
                    <p className="text-xs text-neutral-500 font-medium mt-1">Click any date to view leave and holiday details.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedMonth(todayObj.getMonth() + 1);
                        setSelectedYear(todayObj.getFullYear());
                      }}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-colors"
                    >
                      Today
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (selectedMonth === 1) {
                            setSelectedMonth(12);
                            setSelectedYear(prev => prev - 1);
                          } else {
                            setSelectedMonth(prev => prev - 1);
                          }
                        }}
                        className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
                      >
                        <ChevronLeftIcon className="w-5 h-5" />
                      </button>

                      <span className="text-sm font-semibold w-28 text-center text-neutral-800">
                        {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                      </span>

                      <button
                        onClick={() => {
                          if (selectedMonth === 12) {
                            setSelectedMonth(1);
                            setSelectedYear(prev => prev + 1);
                          } else {
                            setSelectedMonth(prev => prev + 1);
                          }
                        }}
                        className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
                      >
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-5 text-xs font-semibold text-neutral-600 mb-6 px-1">
                  <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></div> Approved</span>
                  <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#E11D48]"></div> Rejected</span>
                  <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#EAB308]"></div> Pending</span>
                  <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]"></div> Cancelled</span>
                  <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#F97316]"></div> Half Day</span>
                  <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#A855F7]"></div> Holiday</span>
                  <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#111827]"></div> Weekly Off</span>
                </div>

                {/* 7-column Calendar Header */}
                <div className="grid grid-cols-7 border-t border-l border-neutral-200">
                  {WEEKDAYS.map((wd) => (
                    <div key={wd} className="py-2.5 text-[11px] font-bold text-neutral-500 text-center uppercase tracking-wider border-b border-r border-neutral-200 bg-white">
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid Cells */}
                <div className="grid grid-cols-7 border-l border-neutral-200 bg-neutral-200 gap-px">
                  {calendarGridDays.map((cell, idx) => {
                    const dateStr = cell.dateStr;
                    const isTodayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
                    const isToday = dateStr === isTodayStr;

                    // Matched Leaves
                    const leavesOnDate = filteredTimelineRequests.filter((req: any) => {
                      if (req.request_type === "Permission") return req.permission_date === dateStr;
                      return req.from_date <= dateStr && req.to_date >= dateStr;
                    });

                    // Matched Holiday & Weekly Off
                    const scheduleDay = monthlyScheduleData.find((s: any) => s.date === dateStr);
                    const holidayOnDate = monthlyHolidaysData.find((h: any) => h.date === dateStr) || (scheduleDay?.is_holiday ? { name: scheduleDay.holiday_name, holiday_type: scheduleDay.holiday_type } : null);
                    const isWeeklyOff = scheduleDay?.is_weekend;

                    return (
                      <div
                        key={dateStr || `empty-${idx}`}
                        onClick={() => {
                          if (!dateStr) return;
                          setSelectedDateEventsModal({
                            dateStr,
                            formattedDate: `${cell.day} ${MONTH_NAMES[cell.month - 1]} ${cell.year}`,
                            leaves: leavesOnDate,
                            holiday: holidayOnDate,
                            scheduleDay,
                          });
                        }}
                        className={`min-h-[85px] p-2 transition-colors flex flex-col justify-start relative group ${
                          !cell.isCurrentMonth
                            ? "bg-neutral-50/50 text-neutral-400"
                            : isToday
                            ? "bg-[#1F7A8C]/10 ring-1 ring-inset ring-[#1F7A8C] z-10"
                            : "bg-white"
                        } ${dateStr ? "cursor-pointer hover:bg-neutral-50 hover:ring-1 hover:ring-inset hover:ring-[#1F7A8C]/30 hover:z-20" : ""}`}
                      >
                        {/* Day Header */}
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday ? "bg-[#1F7A8C] text-white font-bold" : "text-neutral-700"
                          }`}>
                            {cell.day}
                          </span>
                          
                          {isWeeklyOff && (
                            <span className="text-[10px] text-neutral-400 font-bold uppercase mt-1 mr-1">{scheduleDay?.holiday_type || "SUN"}</span>
                          )}
                        </div>

                        {/* Events list */}
                        <div className="flex flex-col gap-1 w-full flex-1">
                          {/* Leaves */}
                          {leavesOnDate.slice(0, 1).map((l: any) => {
                            const isApproved = l.status === "Approved";
                            const isRejected = l.status === "Rejected";
                            const isPending = l.status === "Pending";
                            const isHalfDay = l.leave_duration === "First Half" || l.leave_duration === "Second Half";

                            const dotColor = isHalfDay ? "bg-[#F97316]" : isApproved ? "bg-[#16A34A]" : isRejected ? "bg-[#E11D48]" : isPending ? "bg-[#EAB308]" : "bg-[#94A3B8]";

                            return (
                              <div
                                key={l.id}
                                className="flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] font-semibold text-neutral-700 truncate w-full"
                              >
                                <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`}></div>
                                <span className="truncate">{l.leave_type || "Leave"}</span>
                              </div>
                            );
                          })}

                          {/* Holiday */}
                          {holidayOnDate && leavesOnDate.length === 0 && (
                            <div className="flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] font-semibold text-neutral-700 truncate w-full">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${
                                holidayOnDate.holiday_type?.toLowerCase().includes("national") ? "bg-blue-500" :
                                holidayOnDate.holiday_type?.toLowerCase().includes("company") ? "bg-emerald-500" :
                                "bg-purple-500"
                              }`}></div>
                              <span className="truncate">{holidayOnDate.name}</span>
                            </div>
                          )}

                          {/* More indicator */}
                          {leavesOnDate.length > 1 && (
                            <div className="text-[10px] font-bold text-neutral-500 pl-2 mt-0.5">
                              +{leavesOnDate.length - 1} More
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ── Mode 2: Grid View ── */
              <div className="bg-white">
                {/* Section 1: Employee Leave History */}
                <div className="pt-6 px-6 pb-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[16px] font-semibold text-neutral-900">📋 Employee Leave History</h4>
                    <span className="text-[13px] font-medium text-neutral-500">
                      {filteredTimelineRequests.length} Record{filteredTimelineRequests.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="w-full">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] text-neutral-500 text-[12px] font-semibold uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold">Date</th>
                          <th className="py-3 px-4 font-semibold">Day</th>
                          <th className="py-3 px-4 font-semibold">Leave Type</th>
                          <th className="py-3 px-4 font-semibold text-center">Status</th>
                          <th className="py-3 px-4 font-semibold text-center">Duration</th>
                          <th className="py-3 px-4 font-semibold">Manager Review</th>
                          <th className="py-3 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-[14px]">
                        {filteredTimelineRequests.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12">
                              <div className="flex flex-col items-center justify-center text-center">
                                <span className="text-3xl mb-2">📅</span>
                                <p className="text-[14px] font-semibold text-neutral-700">No leave records found.</p>
                                <p className="text-[13px] text-neutral-500 mt-1">Apply a leave request to see your history here.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredTimelineRequests.map((req: any) => {
                            const isPermission = req.request_type === "Permission";
                            const startDateStr = isPermission ? req.permission_date : req.from_date;
                            const dateObj = startDateStr ? new Date(startDateStr) : null;
                            const dayName = dateObj ? WEEKDAYS[dateObj.getDay()] : "—";

                            const isApproved = req.status === "Approved";
                            const isRejected = req.status === "Rejected";
                            const isPending = req.status === "Pending";
                            const isCancelled = req.status === "Cancelled";

                            // Dot style badge
                            const badgeColor = isApproved ? "bg-green-100 text-green-700" :
                                               isRejected ? "bg-red-100 text-red-700" :
                                               isCancelled ? "bg-gray-100 text-gray-700" :
                                               "bg-amber-100 text-amber-700";
                            const dotColor = isApproved ? "bg-green-500" :
                                             isRejected ? "bg-red-500" :
                                             isCancelled ? "bg-gray-500" :
                                             "bg-amber-500";

                            return (
                              <tr key={req.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors cursor-pointer">
                                <td className="py-3 px-4 font-medium text-neutral-900">
                                  {isPermission ? req.permission_date : `${req.from_date} to ${req.to_date}`}
                                </td>
                                <td className="py-3 px-4 text-neutral-500">{dayName}</td>
                                <td className="py-3 px-4 font-medium text-neutral-900">
                                  {isPermission ? "Permission Request" : req.leave_type}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium ${badgeColor}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                                    {req.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center text-neutral-700">
                                  {isPermission ? "Permission" : `${req.total_days} ${req.total_days === 1 ? "Day" : "Days"}`}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-col">
                                    <span className="text-neutral-900 font-medium">{req.reporting_manager || "Manager"}</span>
                                    <span className="text-[13px] text-neutral-500 truncate max-w-[200px]">{req.reason || "No reason"}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {isPending && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onCancel(req.id); }}
                                      className="text-[13px] text-red-600 font-medium hover:underline"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <hr className="border-[#E5E7EB] my-2 mx-6" />

                {/* Section 2: Upcoming & Published Holidays Schedule (Read-Only) */}
                <div className="pt-4 px-6 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[16px] font-semibold text-neutral-900">✨ Upcoming Holidays</h4>
                    <span className="text-[12px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                      Read Only
                    </span>
                  </div>

                  <div className="w-full">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] text-neutral-500 text-[12px] font-semibold uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold">Date</th>
                          <th className="py-3 px-4 font-semibold">Day</th>
                          <th className="py-3 px-4 font-semibold">Holiday Name</th>
                          <th className="py-3 px-4 font-semibold">Holiday Type</th>
                        </tr>
                      </thead>
                      <tbody className="text-[14px]">
                        {allYearHolidays.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-12">
                               <div className="flex flex-col items-center justify-center text-center">
                                <span className="text-3xl mb-2">🏝️</span>
                                <p className="text-[14px] font-semibold text-neutral-700">No holidays published.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          allYearHolidays.map((h: any) => {
                            const hDate = new Date(h.date);
                            const dayName = WEEKDAYS[hDate.getDay()] || h.day || "—";

                            const typeLower = (h.holiday_type || "").toLowerCase();
                            const badgeColor = typeLower.includes("national") ? "bg-blue-100 text-blue-700" :
                                               typeLower.includes("festival") ? "bg-purple-100 text-purple-700" :
                                               typeLower.includes("weekly off") ? "bg-gray-100 text-gray-700" :
                                               "bg-green-100 text-green-700";
                            const dotColor = typeLower.includes("national") ? "bg-blue-500" :
                                             typeLower.includes("festival") ? "bg-purple-500" :
                                             typeLower.includes("weekly off") ? "bg-gray-500" :
                                             "bg-green-500";

                            return (
                              <tr key={h.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors cursor-pointer">
                                <td className="py-3 px-4 font-medium text-neutral-900">{h.date}</td>
                                <td className="py-3 px-4 text-neutral-500">{dayName}</td>
                                <td className="py-3 px-4 font-medium text-neutral-900">
                                  {h.name}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium ${badgeColor}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                                    {h.holiday_type || "Company Holiday"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side Drawer for Date Events */}
          <AnimatePresence>
            {selectedDateEventsModal && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedDateEventsModal(null)}
                  className="fixed inset-0 z-40 bg-neutral-900/20 backdrop-blur-[2px]"
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed inset-y-0 right-0 z-50 w-full md:w-[400px] bg-white shadow-2xl border-l border-neutral-200 flex flex-col"
                >
                  <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
                    <h3 className="text-xl font-bold text-neutral-800">{selectedDateEventsModal.formattedDate}</h3>
                    <button
                      onClick={() => setSelectedDateEventsModal(null)}
                      className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Employee Leave Section */}
                    <div>
                      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-100 pb-2">Employee Leave</h4>
                      {selectedDateEventsModal.leaves.length === 0 ? (
                        <p className="text-sm text-neutral-500">None</p>
                      ) : (
                        <div className="space-y-6">
                          {selectedDateEventsModal.leaves.map((l: any) => {
                            const isApproved = l.status === "Approved";
                            const isRejected = l.status === "Rejected";
                            const isPending = l.status === "Pending";
                            
                            const textColor = isApproved ? "text-emerald-600" : isRejected ? "text-rose-600" : isPending ? "text-amber-600" : "text-neutral-500";

                            return (
                              <div key={l.id} className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-neutral-800">{l.leave_type}</span>
                                  <span className={`text-xs font-bold ${textColor}`}>{l.status}</span>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-neutral-500">Duration</span>
                                    <span className="text-neutral-800 font-medium">{l.total_days} Day{l.total_days > 1 ? "s" : ""}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-neutral-500">Manager</span>
                                    <span className="text-neutral-800 font-medium">{l.reporting_manager || "HR Manager"}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Company Holiday Section */}
                    <div>
                      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-100 pb-2">Holiday</h4>
                      {selectedDateEventsModal.holiday ? (
                        <div className="space-y-3">
                          <p className="text-sm font-bold text-neutral-800">{selectedDateEventsModal.holiday.name}</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-500">Type</span>
                            <span className="text-neutral-800 font-medium">{selectedDateEventsModal.holiday.holiday_type || "Company Holiday"}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500">None</p>
                      )}
                    </div>

                    {/* Weekly Off Section */}
                    <div>
                      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 border-b border-neutral-100 pb-2">Weekly Off</h4>
                      <p className="text-sm font-medium text-neutral-800">
                        {selectedDateEventsModal.scheduleDay?.is_weekend ? selectedDateEventsModal.scheduleDay.holiday_type || "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
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
                    {leavePolicies.filter(pol => {
                      const polGender = (pol.applicable_gender || "All").trim().toLowerCase();
                      const userGender = (currentEmployee?.gender || "").trim().toLowerCase();
                      return polGender === "all" || polGender === userGender;
                    }).map(pol => (
                      <option key={pol.id} value={pol.leave_type}>{pol.leave_type}</option>
                    ))}
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
                  <DatePicker
                    required
                    value={leaveForm.fromDate}
                    onChange={(val) => setLeaveForm({ ...leaveForm, fromDate: val })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">To Date <span className="text-danger-500">*</span></label>
                  <DatePicker
                    required
                    value={leaveForm.toDate}
                    onChange={(val) => setLeaveForm({ ...leaveForm, toDate: val })}
                  />
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
                  <DatePicker
                    required
                    value={leaveForm.permissionDate}
                    onChange={(val) => setLeaveForm({ ...leaveForm, permissionDate: val })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">From Time <span className="text-danger-500">*</span></label>
                  <TimePicker
                    required
                    value={leaveForm.fromTime}
                    onChange={(val) => setLeaveForm({ ...leaveForm, fromTime: val })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">To Time <span className="text-danger-500">*</span></label>
                  <TimePicker
                    required
                    value={leaveForm.toTime}
                    onChange={(val) => setLeaveForm({ ...leaveForm, toTime: val })}
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
                {leavePolicies.filter(pol => {
                  const polGender = (pol.applicable_gender || "All").trim().toLowerCase();
                  const userGender = (currentEmployee?.gender || "").trim().toLowerCase();
                  return polGender === "all" || polGender === userGender;
                }).map((pol) => {
                  const available = getAvailableBalance(pol.leave_type, pol.yearly_limit);
                  return (
                    <div key={pol.id} className="flex justify-between items-center py-2 border-b border-primary-100">
                      <span className="text-neutral-600 font-semibold">{pol.leave_type}</span>
                      <span className="font-extrabold text-primary-700 text-md">{available} days</span>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pt-3 text-sm">
                  <span className="font-bold text-primary-900">Total Balance</span>
                  <span className="font-extrabold text-primary-800">
                    {leavePolicies.filter(pol => {
                      const polGender = (pol.applicable_gender || "All").trim().toLowerCase();
                      const userGender = (currentEmployee?.gender || "").trim().toLowerCase();
                      return polGender === "all" || polGender === userGender;
                    }).reduce((sum, pol) => sum + getAvailableBalance(pol.leave_type, pol.yearly_limit), 0)} days
                  </span>
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
                  <span><strong>Privilege Leave:</strong> Planned leaves (vacation, trips) requiring prior scheduling.</span>
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

      {/* Leave Balance Validation Modal */}
      <Modal
        isOpen={validationError !== null}
        onClose={() => setValidationError(null)}
        size="md"
        title={validationError?.title || ""}
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-200">
            <XMarkIcon className="w-8 h-8 text-red-600 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-neutral-800">
            {validationError?.title}
          </h3>
          <p className="text-sm text-neutral-500 font-semibold leading-relaxed">
            {validationError?.message}
          </p>
          <div className="pt-4 border-t border-neutral-100 flex justify-center">
            <Button
              onClick={() => setValidationError(null)}
              className="bg-danger-605 hover:bg-danger-700 text-white font-semibold rounded-xl px-6 py-2.5 text-sm shadow-md transition-all duration-200"
            >
              Okay, I understand
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default LeaveTab;
