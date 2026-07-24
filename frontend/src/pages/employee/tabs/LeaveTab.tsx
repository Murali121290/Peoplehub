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
  ExclamationTriangleIcon,
  UserMinusIcon
} from '@heroicons/react/24/outline';
import { getStatusColor } from '../utils/employeeHelpers';

import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Modal } from '../../../components/ui/Modal';
import { TimePicker } from '../../../components/ui/TimePicker';
import { DatePicker } from '../../../components/ui/DatePicker';

const leaveReasons: Record<string, string[]> = {
  "Sick Leave": ["Fever", "Headache", "Cold", "Food Poisoning", "Medical Checkup", "Hospital Visit", "Others"],
  "Casual Leave": ["Personal Work", "Family Function", "Marriage", "Bank Work", "Travel", "Others"],
  "Earned Leave": ["Vacation", "Family Trip", "Festival", "Personal Time", "Others"],
  "Privilege Leave": ["Vacation", "Family Trip", "Festival", "Personal Time", "Planned Leave", "Others"],
  "Unpaid Leave": ["Emergency", "Personal Reasons", "Extended Vacation", "Others"],
  "Comp Off": ["Worked on Holiday", "Worked on Weekend", "Extra Hours Compensation", "Others"],
  "Maternity Leave": ["Maternity", "Post-natal Care", "Others"],
  "Paternity Leave": ["Paternity", "Child Care", "Others"],
};

// Generic fallback reasons shown when a leave type has no specific reason list
const genericLeaveReasons = ["Emergency", "Personal Reasons", "Family Reasons", "Medical", "Travel", "Others"];

const permissionReasons = [
  "Personal Emergency",
  "Medical Appointment",
  "Accident",
  "Family Emergency",
  "Official Work",
  "Others",
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
    type: "limit" | "insufficient" | "confirm";
    onConfirm?: () => void;
  } | null>(null);

  interface LeaveFormState {
    requestType: "Leave" | "Permission";
    leaveType: string;
    leaveDuration: string;
    fromDate: string;
    toDate: string;
    permissionDate: string;
    fromTime: string;
    toTime: string;
    totalDays: number;
    reason: string;
    reportingManager: string;
    handoverTo: string;
    attachment: any;
  }

  const [leaveForm, setLeaveForm] = useState<LeaveFormState>({
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
    const [selectedMonth, setSelectedMonth] = useState<number>(todayObj.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(todayObj.getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const [monthlyHolidaysData, setMonthlyHolidaysData] = useState<any[]>([]);
  const [monthlyScheduleData, setMonthlyScheduleData] = useState<any[]>([]);
  const [allYearHolidays, setAllYearHolidays] = useState<any[]>([]);
  
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

  // Collect all dates where the employee already has a pending or approved leave request
  const myAppliedLeaveDates = React.useMemo(() => {
    const dates = new Set<string>();
    myRequests.forEach((req: any) => {
      if (req.status === "Approved" || req.status === "Pending") {
        if (req.request_type === "Leave" && req.from_date && req.to_date) {
          let curr = new Date(req.from_date);
          const end = new Date(req.to_date);
          while (curr <= end) {
            const yyyy = curr.getFullYear();
            const mm = String(curr.getMonth() + 1).padStart(2, "0");
            const dd = String(curr.getDate()).padStart(2, "0");
            const dateStr = `${yyyy}-${mm}-${dd}`;
            dates.add(dateStr);
            curr.setDate(curr.getDate() + 1);
          }
        }
      }
    });
    return Array.from(dates);
  }, [myRequests]);

  // Calculate active permission cycle and balance
  const permissionBalanceInfo = React.useMemo(() => {
    // Helper to parse YYYY-MM-DD safely at local midnight
    const parseLocalDate = (dateStr: string) => {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
      return new Date(dateStr);
    };

    // Helper to compute cycle boundaries for any reference date
    const getCycleBounds = (refDate: Date) => {
      const year = refDate.getFullYear();
      const month = refDate.getMonth();
      const day = refDate.getDate();
      let startYear = year, startMonth = month, endYear = year, endMonth = month;
      if (day >= 25) {
        startMonth = month;
        endMonth = month + 1;
        if (endMonth > 11) { endMonth = 0; endYear = year + 1; }
      } else {
        startMonth = month - 1;
        endMonth = month;
        if (startMonth < 0) { startMonth = 11; startYear = year - 1; }
      }
      return {
        cycleStart: new Date(startYear, startMonth, 25),
        cycleEnd: new Date(endYear, endMonth, 24, 23, 59, 59),
      };
    };

    const formatCycleDate = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const limitMinutes = 120;

    const formatDuration = (totalMins: number) => {
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return `${hrs} hr${hrs !== 1 ? "s" : ""} ${String(mins).padStart(2, "0")} min${mins !== 1 ? "s" : ""}`;
    };

    const calcApprovedMinutes = (cycleStart: Date, cycleEnd: Date) => {
      let mins = 0;
      myRequests
        .filter((req: any) => {
          if (req.request_type !== "Permission" || req.status !== "Approved") return false;
          if (!req.permission_date || !req.from_time || !req.to_time) return false;
          const pd = parseLocalDate(req.permission_date);
          return pd >= cycleStart && pd <= cycleEnd;
        })
        .forEach((req: any) => {
          const [fh, fm] = req.from_time.split(":").map(Number);
          const [th, tm] = req.to_time.split(":").map(Number);
          if (!isNaN(fh) && !isNaN(fm) && !isNaN(th) && !isNaN(tm)) {
            const diff = (th * 60 + tm) - (fh * 60 + fm);
            if (diff > 0) mins += diff;
          }
        });
      return mins;
    };

    // --- Determine which cycle to DISPLAY on the card ---
    // Strategy: find the cycle that has approved permissions closest to / including the latest approved permission.
    // If there's an approved permission in a future cycle, show that cycle instead of the current one.
    const today = new Date();
    const { cycleStart: todayCycleStart, cycleEnd: todayCycleEnd } = getCycleBounds(today);

    // Find the latest approved permission date
    let latestPermDate: Date | null = null;
    myRequests.forEach((req: any) => {
      if (req.request_type === "Permission" && req.status === "Approved" && req.permission_date) {
        const pd = parseLocalDate(req.permission_date);
        if (!latestPermDate || pd > latestPermDate) latestPermDate = pd;
      }
    });

    // Use the latest approved permission date's cycle for display if it's different from today's cycle
    let displayCycleStart = todayCycleStart;
    let displayCycleEnd = todayCycleEnd;
    if (latestPermDate) {
      const { cycleStart: lpCycleStart, cycleEnd: lpCycleEnd } = getCycleBounds(latestPermDate);
      // Show the latest permission's cycle if it has any approved minutes (even if future)
      const lpMins = calcApprovedMinutes(lpCycleStart, lpCycleEnd);
      if (lpMins > 0) {
        displayCycleStart = lpCycleStart;
        displayCycleEnd = lpCycleEnd;
      }
    }

    // If a permission date is actively selected in the form, show THAT cycle
    if (leaveForm.requestType === "Permission" && leaveForm.permissionDate) {
      const parsed = parseLocalDate(leaveForm.permissionDate);
      if (!isNaN(parsed.getTime())) {
        const { cycleStart: formCs, cycleEnd: formCe } = getCycleBounds(parsed);
        displayCycleStart = formCs;
        displayCycleEnd = formCe;
      }
    }

    const cycleStr = `${formatCycleDate(displayCycleStart)} - ${formatCycleDate(displayCycleEnd)}`;
    const approvedMinutes = calcApprovedMinutes(displayCycleStart, displayCycleEnd);
    const remainingMinutes = Math.max(0, limitMinutes - approvedMinutes);

    return {
      cycleStr,
      limitStr: formatDuration(limitMinutes),
      approvedStr: formatDuration(approvedMinutes),
      remainingStr: formatDuration(remainingMinutes),
      remainingMinutes,
      approvedMinutes,
      // Also expose a helper for validation: get remaining for any given permission date
      getRemainingForDate: (permDateStr: string) => {
        if (!permDateStr) return remainingMinutes;
        const parsed = parseLocalDate(permDateStr);
        if (isNaN(parsed.getTime())) return remainingMinutes;
        const { cycleStart: cs, cycleEnd: ce } = getCycleBounds(parsed);
        const used = calcApprovedMinutes(cs, ce);
        return Math.max(0, limitMinutes - used);
      },
    };
  }, [myRequests, leaveForm.requestType, leaveForm.permissionDate]);

  const todayStr = new Date().toISOString().split("T")[0];

  const upcomingLeaveRequests = React.useMemo(() => {
    return myRequests.filter((req: any) => {
      const matchStatus = statusFilter === "All" || req.status === statusFilter;
      const matchType = typeFilter === "All" || req.leave_type === typeFilter;
      if (!matchStatus || !matchType) return false;

      const dateStr = req.request_type === "Permission" ? req.permission_date : req.from_date;
      return (req.status === "Pending" || req.status === "Approved") && dateStr >= todayStr;
    }).sort((a: any, b: any) => 
      new Date(a.from_date || a.permission_date).getTime() - 
      new Date(b.from_date || b.permission_date).getTime()
    );
  }, [myRequests, statusFilter, typeFilter, todayStr]);

  const leaveHistoryRequests = React.useMemo(() => {
    // Convert past holidays into the format of leave requests so they show in history
    const pastHolidays = allYearHolidays.filter((h: any) => h.date < todayStr).map((h: any) => ({
      ...h,
      id: `hol-${h.id}`,
      request_type: "Holiday",
      from_date: h.date,
      to_date: h.date,
      leave_type: h.holiday_type || "Holiday",
      reason: h.name,
      status: "Approved",
      total_days: 1,
      reporting_manager: "Company",
    }));

    const filteredPastHolidays = pastHolidays.filter((h: any) => {
      const matchStatus = statusFilter === "All" || h.status === statusFilter;
      const matchType = typeFilter === "All" || h.leave_type === typeFilter;
      return matchStatus && matchType;
    });

    const requests = myRequests.filter((req: any) => {
      const matchStatus = statusFilter === "All" || req.status === statusFilter;
      const matchType = typeFilter === "All" || req.leave_type === typeFilter;
      if (!matchStatus || !matchType) return false;

      const dateStr = req.request_type === "Permission" ? req.permission_date : req.from_date;
      return (req.status === "Cancelled" || req.status === "Rejected") || dateStr < todayStr;
    });

    const combined = [...requests, ...filteredPastHolidays];
    // Descending order for history
    return combined.sort((a: any, b: any) => 
      new Date(b.from_date || b.permission_date || b.date).getTime() - 
      new Date(a.from_date || a.permission_date || a.date).getTime()
    );
  }, [myRequests, statusFilter, typeFilter, allYearHolidays, todayStr]);

  const upcomingEvents = React.useMemo(() => {
    const holidays = allYearHolidays.filter((h: any) => h.date >= todayStr).map((h: any) => ({
      ...h,
      id: `hol-${h.id}`,
      request_type: "Holiday",
      from_date: h.date,
      to_date: h.date,
      leave_type: h.holiday_type || "Holiday",
      reason: h.name,
      status: "Approved",
      total_days: 1,
      reporting_manager: "Company",
    }));

    const filteredHolidays = holidays.filter((h: any) => {
      const matchStatus = statusFilter === "All" || h.status === statusFilter;
      const matchType = typeFilter === "All" || h.leave_type === typeFilter;
      return matchStatus && matchType;
    });

    const combined = [...upcomingLeaveRequests, ...filteredHolidays];
    return combined.sort((a: any, b: any) => 
      new Date(a.from_date || a.permission_date || a.date).getTime() - 
      new Date(b.from_date || b.permission_date || b.date).getTime()
    );
  }, [allYearHolidays, upcomingLeaveRequests, statusFilter, typeFilter, todayStr]);

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

      let totalDays = 0;
      let curr = new Date(fromDate);
      const holidayDates = new Set(allYearHolidays.map((h: any) => h.date));

      while (curr <= toDate) {
        const dayOfWeek = curr.getDay(); // 0 = Sunday, 6 = Saturday
        const yyyy = curr.getFullYear();
        const mm = curr.getMonth();
        const dd = curr.getDate();
        const dateStr = `${yyyy}-${String(mm + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

        const isWeekoff = (() => {
          if (dayOfWeek === 0) return true; // Sunday
          if (dayOfWeek === 6) { // Saturday
            let satCount = 0;
            for (let d = 1; d <= dd; d++) {
              if (new Date(yyyy, mm, d).getDay() === 6) {
                satCount++;
              }
            }
            return satCount === 2 || satCount === 4;
          }
          return false;
        })();

        if (!isWeekoff && !holidayDates.has(dateStr)) {
          totalDays++;
        }

        curr.setDate(curr.getDate() + 1);
      }

      if (leaveForm.leaveDuration === "First Half" || leaveForm.leaveDuration === "Second Half") {
        totalDays = totalDays > 0 ? 0.5 : 0;
      }

      setLeaveForm(prev => ({
        ...prev,
        totalDays: totalDays > 0 ? totalDays : 0
      }));
    }
  }, [leaveForm.fromDate, leaveForm.toDate, leaveForm.leaveDuration, allYearHolidays]);

  const resetLeaveForm = () => {
    setLeaveForm({
      requestType: "Leave" as "Leave" | "Permission",
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
      requestType: (leave.request_type || "Leave") as "Leave" | "Permission",
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

    const submitPayload = () => {
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
          const lop = requested - available;
          setValidationError({
            type: "confirm",
            title: "Insufficient Leave Balance",
            message: `Requested: ${requested} Days, Available: ${available} Days. So ${lop} day${lop > 1 ? "s are" : " is"} LOP. Are you sure you want to apply for leave?`,
            onConfirm: () => {
              setValidationError(null);
              submitPayload();
            }
          });
          return;
        }
      }
    } else if (leaveForm.requestType === "Permission") {
      if (!leaveForm.permissionDate || !leaveForm.fromTime || !leaveForm.toTime) {
        setValidationError({
          type: "insufficient",
          title: "Missing Required Fields",
          message: "Please fill in the permission date, from time, and to time."
        });
        return;
      }

      const [fh, fm] = leaveForm.fromTime.split(":").map(Number);
      const [th, tm] = leaveForm.toTime.split(":").map(Number);
      const requestedMinutes = (th * 60 + tm) - (fh * 60 + fm);

      if (requestedMinutes <= 0) {
        setValidationError({
          type: "insufficient",
          title: "Invalid Permission Duration",
          message: "From time must be earlier than To time."
        });
        return;
      }

      // Use cycle-accurate remaining for the selected permission date
      const remainingForDate = permissionBalanceInfo.getRemainingForDate(leaveForm.permissionDate);
      if (requestedMinutes > remainingForDate) {
        setValidationError({
          type: "insufficient",
          title: "Insufficient Permission Balance",
          message: `Requested permission duration is ${Math.floor(requestedMinutes / 60)} hrs ${requestedMinutes % 60} mins (${requestedMinutes} minutes). Your remaining monthly permission balance is only ${Math.floor(remainingForDate / 60)} hrs ${remainingForDate % 60} mins (${remainingForDate} minutes). Please select a shorter duration.`
        });
        return;
      }
    }

    submitPayload();
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4"
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
            const realAvailable = available;
            const used = myRequests
              .filter((req: any) => 
                (req.status === "Approved" || req.status === "Pending") && 
                req.request_type === "Leave" &&
                (req.leave_type || "").toLowerCase() === pol.leave_type.toLowerCase()
              )
              .reduce((sum: number, req: any) => sum + (Number(req.total_days) || 0), 0);
            
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

          let totalLop = 0;
          policiesList.forEach(pol => {
            const totalRequested = myRequests
              .filter((req: any) => 
                (req.status === "Approved" || req.status === "Pending") && 
                req.request_type === "Leave" &&
                (req.leave_type || "").toLowerCase() === pol.leave_type.toLowerCase()
              )
              .reduce((sum: number, req: any) => sum + (Number(req.total_days) || 0), 0);
            
            if (totalRequested > pol.yearly_limit) {
              totalLop += (totalRequested - pol.yearly_limit);
            }
          });

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
            },
            {
              label: "Loss of Pay (LOP)",
              value: 0,
              total: 0,
              used: totalLop,
              icon: UserMinusIcon,
              iconWrap: "bg-red-50",
              iconColor: "text-red-600",
              note: "Excess leave taken",
              isLopCard: true
            }
          ];

          return allCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.label}
                className="rounded-2xl border border-gray-200 bg-slate-50 p-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4 w-full">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconWrap}`}>
                    <Icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <h4 className="text-[14px] font-semibold text-slate-800 tracking-wide leading-tight">{item.label}</h4>
                </div>

                <div className="w-full space-y-1.5 mt-auto px-1">
                  {(item as any).isLopCard ? (
                    <div className="flex justify-between items-center text-[14px]">
                      <span className="text-slate-600 font-medium">Accumulated</span>
                      <span className="font-semibold text-red-600">{item.used} {item.used === 1 ? "day" : "days"}</span>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </Card>
            );
          });
        })()}
      </motion.div>

      {/* Removed Navigation Tabs (My Requests / Approval Requests) */}
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
          <div className="bg-white border border-neutral-200 shadow-sm rounded-xl overflow-hidden mb-6">
            {/* Header & Filter Controls */}
            <div className="bg-white p-5 border-b border-neutral-200 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary-500/10 rounded-xl text-primary-500">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-neutral-850">Leave &amp; Holiday Timeline</h3>
                </div>
              </div>

              {/* Removed Filters per user request */}
            </div>

            
            {/* ── Mode 2: Grid View ── */}
            <div className="bg-white">


                {/* Section 1: Employee Leave History */}
                <div className="pt-6 px-6 pb-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[16px] font-semibold text-neutral-900">📋 Employee Leave History</h4>
                    <span className="text-[13px] font-medium text-neutral-500">
                      {leaveHistoryRequests.length} Record{leaveHistoryRequests.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="w-full overflow-x-auto overflow-y-auto max-h-[400px] border border-neutral-200 rounded-lg mb-4">
                    <table className="w-full border-collapse text-left min-w-[800px]">
                      <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <tr className="border-b border-neutral-200 text-neutral-500 text-[12px] font-semibold uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold">Date</th>
                          <th className="py-3 px-4 font-semibold">Day</th>
                          <th className="py-3 px-4 font-semibold">Leave Type</th>
                          <th className="py-3 px-4 font-semibold text-center">Status</th>
                          <th className="py-3 px-4 font-semibold text-center">Duration</th>
                          <th className="py-3 px-4 font-semibold">Manager Review</th>
                        </tr>
                      </thead>
                      <tbody className="text-[14px]">
                        {leaveHistoryRequests.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12">
                              <div className="flex flex-col items-center justify-center text-center">
                                <span className="text-3xl mb-2">📅</span>
                                <p className="text-[14px] font-semibold text-neutral-700">No leave records found.</p>
                                <p className="text-[13px] text-neutral-500 mt-1">Apply a leave request to see your history here.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          leaveHistoryRequests.map((req: any) => {
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
                              <tr key={req.id} className="border-b border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer">
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
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <hr className="border-neutral-200 my-2 mx-6" />

                {/* Section 2: Upcoming & Published Holidays Schedule (Read-Only) */}
                <div className="pt-4 px-6 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[16px] font-semibold text-neutral-900">✨ Upcoming Leaves & Holidays</h4>
                    <span className="text-[13px] font-medium text-neutral-500">
                      {upcomingEvents.length} Record{upcomingEvents.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="w-full overflow-x-auto overflow-y-auto max-h-[400px] border border-neutral-200 rounded-lg">
                    <table className="w-full border-collapse text-left min-w-[800px]">
                      <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <tr className="border-b border-neutral-200 text-neutral-500 text-[12px] font-semibold uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold">Date</th>
                          <th className="py-3 px-4 font-semibold">Day</th>
                          <th className="py-3 px-4 font-semibold">Leave Type</th>
                          <th className="py-3 px-4 font-semibold text-center">Status</th>
                          <th className="py-3 px-4 font-semibold text-center">Duration</th>
                          <th className="py-3 px-4 font-semibold">Manager Review</th>
                        </tr>
                      </thead>
                      <tbody className="text-[14px]">
                        {upcomingEvents.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12">
                               <div className="flex flex-col items-center justify-center text-center">
                                <span className="text-3xl mb-2">🏝️</span>
                                <p className="text-[14px] font-semibold text-neutral-700">No upcoming leaves or holidays.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          upcomingEvents.map((req: any) => {
                            const isPermission = req.request_type === "Permission";
                            const startDateStr = isPermission ? req.permission_date : req.from_date;
                            const dateObj = startDateStr ? new Date(startDateStr) : null;
                            const dayName = dateObj ? WEEKDAYS[dateObj.getDay()] : req.day || "—";

                            const isApproved = req.status === "Approved";
                            const isPending = req.status === "Pending";
                            
                            const isHoliday = req.request_type === "Holiday";
                            
                            const typeLower = (req.leave_type || "").toLowerCase();
                            
                            // Color logic: if holiday, make it slightly different (e.g. blue for national, purple for festival)
                            // If leave request, use standard Green/Amber
                            let badgeColor = "bg-amber-100 text-amber-700";
                            let dotColor = "bg-amber-500";
                            
                            if (isHoliday) {
                              badgeColor = typeLower.includes("national") ? "bg-blue-100 text-blue-700" :
                                           typeLower.includes("festival") ? "bg-purple-100 text-purple-700" :
                                           typeLower.includes("weekly off") ? "bg-gray-100 text-gray-700" :
                                           "bg-green-100 text-green-700";
                              dotColor = typeLower.includes("national") ? "bg-blue-500" :
                                         typeLower.includes("festival") ? "bg-purple-500" :
                                         typeLower.includes("weekly off") ? "bg-gray-500" :
                                         "bg-green-500";
                            } else {
                              if (isApproved) {
                                badgeColor = "bg-green-100 text-green-700";
                                dotColor = "bg-green-500";
                              }
                            }

                            return (
                              <tr key={req.id} className="border-b border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer">
                                <td className="py-3 px-4 font-medium text-neutral-900">
                                  {isPermission ? req.permission_date : isHoliday ? req.from_date : `${req.from_date} to ${req.to_date}`}
                                </td>
                                <td className="py-3 px-4 text-neutral-500">{dayName}</td>
                                <td className="py-3 px-4 font-medium text-neutral-900">
                                  {isPermission ? "Permission Request" : req.leave_type}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium ${badgeColor}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                                    {isHoliday ? "Holiday" : req.status}
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
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

        </>

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
                      requestType: e.target.value as "Leave" | "Permission",
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
                    disablePast={true}
                    disableWeekends={true}
                    disabled={!leaveForm.leaveType}
                    disabledDates={allYearHolidays.map((h: any) => h.date)}
                    bookedDates={myAppliedLeaveDates}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">To Date <span className="text-danger-500">*</span></label>
                  <DatePicker
                    required
                    value={leaveForm.toDate}
                    onChange={(val) => setLeaveForm({ ...leaveForm, toDate: val })}
                    disablePast={true}
                    disableWeekends={true}
                    minDate={leaveForm.fromDate}
                    disabled={!leaveForm.leaveType}
                    disabledDates={allYearHolidays.map((h: any) => h.date)}
                    bookedDates={myAppliedLeaveDates}
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
                    disablePast={true}
                    disableWeekends={true}
                    disabledDates={allYearHolidays.map((h: any) => h.date)}
                    bookedDates={myAppliedLeaveDates}
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
                      <option key={emp.id} value={`${emp.first_name || ""} ${emp.last_name || ""}`.trim()}>
                        {`${emp.first_name || ""} ${emp.last_name || ""}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Reason selection */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Reason for Application <span className="text-danger-500">*</span></label>
              <select
                required
                value={leaveForm.reason === "Others" || (leaveForm.reason && ![
                  ...(leaveForm.requestType === "Permission" ? permissionReasons : (leaveReasons[leaveForm.leaveType] || genericLeaveReasons))
                ].includes(leaveForm.reason)) ? "Others" : leaveForm.reason}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "Others") {
                    setLeaveForm({ ...leaveForm, reason: "Others" });
                  } else {
                    setLeaveForm({ ...leaveForm, reason: val });
                  }
                }}
                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 bg-white text-sm text-neutral-600 placeholder-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer font-medium"
              >
                <option value="">Select Reason</option>
                {leaveForm.requestType === "Permission" ? (
                  permissionReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))
                ) : leaveForm.leaveType ? (
                  (leaveReasons[leaveForm.leaveType] || genericLeaveReasons).map((reason: string) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))
                ) : (
                  <option value="" disabled>Select leave type first</option>
                )}
              </select>

              {/* Custom reason text input shown when Others is selected */}
              {(leaveForm.reason === "Others" || (
                leaveForm.reason &&
                ![
                  ...(leaveForm.requestType === "Permission" ? permissionReasons : (leaveReasons[leaveForm.leaveType] || genericLeaveReasons)),
                  ""
                ].includes(leaveForm.reason)
              )) && (
                <div className="mt-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Please specify your reason <span className="text-danger-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    autoFocus
                    placeholder="Type your reason here…"
                    value={leaveForm.reason === "Others" ? "" : leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value || "Others" })}
                    className="w-full border border-primary-300 rounded-xl px-4 py-2.5 bg-white text-sm text-neutral-700 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all resize-none font-medium"
                  />
                </div>
              )}
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
                {(() => {
                  const validPolicies = leavePolicies.filter(pol => {
                    const polGender = (pol.applicable_gender || "All").trim().toLowerCase();
                    const userGender = (currentEmployee?.gender || "").trim().toLowerCase();
                    return polGender === "all" || polGender === userGender;
                  });

                  const totalAvailable = validPolicies.reduce((sum, pol) => sum + getAvailableBalance(pol.leave_type, pol.yearly_limit), 0);
                  
                  const isLeaveRequest = leaveForm.requestType === "Leave";
                  const activeLeaveType = leaveForm.leaveType;
                  const requestedDays = isLeaveRequest && activeLeaveType ? (leaveForm.totalDays || 0) : 0;

                  let deductionFromTotal = 0;
                  let lopDays = 0;

                  if (requestedDays > 0 && activeLeaveType) {
                    const activePol = validPolicies.find(p => p.leave_type === activeLeaveType);
                    const rawAvail = activePol ? getAvailableBalance(activePol.leave_type, activePol.yearly_limit) : getAvailableBalance(activeLeaveType, 0);
                    const avail = rawAvail;
                    
                    deductionFromTotal = Math.min(avail, requestedDays);
                    if (requestedDays > avail) {
                      lopDays = requestedDays - avail;
                    }
                  }

                  const projectedTotal = totalAvailable - deductionFromTotal;

                  return (
                    <>
                      {validPolicies.map((pol) => {
                        const rawAvail = getAvailableBalance(pol.leave_type, pol.yearly_limit);
                        const available = rawAvail;
                        const isActive = isLeaveRequest && pol.leave_type === activeLeaveType;
                        
                        return (
                          <div key={pol.id} className="flex justify-between items-start py-2 border-b border-primary-100">
                            <span className="text-neutral-600 font-semibold">{pol.leave_type}</span>
                            <div className="flex flex-col items-end">
                              <span className="font-extrabold text-primary-700 text-md">{available} days</span>
                              {isActive && requestedDays > 0 && (
                                <span className="text-amber-600 font-semibold text-[11px] mt-0.5 whitespace-nowrap">
                                  Booked {requestedDays} {requestedDays === 1 ? "day" : "days"}{" "}
                                  <span className="text-primary-700 ml-1">
                                    {available - requestedDays}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      <div className="flex justify-between items-center pt-3 text-sm">
                        <span className="font-bold text-primary-900">Total Balance</span>
                        <div className="flex items-center gap-2 font-extrabold text-primary-800">
                          <span className={requestedDays > 0 ? "line-through opacity-50" : ""}>{totalAvailable} days</span>
                          {requestedDays > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-primary-700">{projectedTotal} days</span>
                              {lopDays > 0 && (
                                <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-[11px]">
                                  Lop {lopDays}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Permission Balance Summary card */}
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-extrabold text-sm mb-1 text-violet-900 flex items-center gap-1.5">
                <ClockIcon className="w-4 h-4 text-violet-700 animate-pulse" />
                Permission Balance Summary
              </h3>
              <p className="text-[10px] text-violet-600 font-bold mb-4">
                Cycle: {permissionBalanceInfo.cycleStr}
              </p>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-violet-100">
                  <span className="text-neutral-600 font-semibold">Monthly Limit</span>
                  <span className="font-extrabold text-violet-850 text-neutral-700">{permissionBalanceInfo.limitStr}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-violet-100">
                  <span className="text-neutral-600 font-semibold">Approved Permission</span>
                  <span className="font-extrabold text-violet-850 text-neutral-700">{permissionBalanceInfo.approvedStr}</span>
                </div>
                <div className="flex justify-between items-center pt-2.5 text-sm">
                  <span className="font-bold text-violet-950">Remaining Balance</span>
                  <span className="font-extrabold text-violet-900">
                    {permissionBalanceInfo.remainingStr}
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
          <div className="pt-4 border-t border-neutral-100 flex justify-center gap-3">
            {validationError?.type === "confirm" ? (
              <>
                <Button
                  type="button"
                  onClick={() => setValidationError(null)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl px-6 py-2.5 text-sm transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={validationError.onConfirm}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl px-6 py-2.5 text-sm shadow-md transition-all duration-200"
                >
                  Confirm
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={() => setValidationError(null)}
                className="bg-danger-605 hover:bg-danger-700 text-white font-semibold rounded-xl px-6 py-2.5 text-sm shadow-md transition-all duration-200"
              >
                Okay, I understand
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default LeaveTab;
