import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  UserMinusIcon,
  CalendarIcon,
  ListBulletIcon,
  ArrowPathIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import StatCard from '../components/StatCard';
import { formatDateStr } from "../../../utils/date";
import { Attendance } from '../../../types/employee.types';
import { Card } from '../../../components/ui/Card';
import apiService from '../../../services/api';
import { BookLoader } from '../../../components/ui/Spinner';
import { toast } from 'react-hot-toast';

import { TimePicker } from '../../../components/ui/TimePicker';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const convertTo12HourFormat = (time24: string) => {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr);
  const m = parseInt(mStr);
  if (isNaN(h) || isNaN(m)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const minFormatted = String(m).padStart(2, "0");
  const hourFormatted = String(h12).padStart(2, "0");
  return `${hourFormatted}:${minFormatted} ${period}`;
};

interface AttendanceTabProps {
  attendanceData?: Attendance[];
  currentEmployee?: any;
}

interface DayDetails {
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  dayName: string;
  fullDayName: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  status: "Holiday" | "Leave" | "Weekly Off" | "Present" | "Half Day" | "Absent" | "Future";
  badgeLabel: string;
  badgeEmoji: string;
  checkIn: string;
  checkOut: string;
  cardCheckIn?: string;
  cardCheckOut?: string;
  cardWorkingHours?: number;
  workingHours: number; // in hours float
  workingHoursFormatted: string; // e.g. "9h 13m"
  lunchMinutes: number;
  teaMinutes: number;
  holidayName?: string;
  holidayType?: string;
  leaveType?: string;
  leaveReason?: string;
  shift: string;
  lateBy: string;
  earlyOut: string;
  overtime: string;
  source: string;
  managerStatus: string;
  rawAttendanceRecord?: any;
  rawLeaveRecord?: any;
  baseWorkingHours?: number;
  rawPermissionRecord?: any;
  halfDayDuration?: string;
  isOneDayWages?: boolean;
  wagesStatus?: string | null;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({ attendanceData: initialAttendanceProp = [], currentEmployee }) => {
  const today = new Date();
  const getInitialPayrollMonth = () => {
    let m = today.getMonth() + 1;
    if (today.getDate() >= 25) {
      m += 1;
    }
    return m === 13 ? 1 : m;
  };
  const getInitialPayrollYear = () => {
    let y = today.getFullYear();
    let m = today.getMonth() + 1;
    if (today.getDate() >= 25 && m === 12) {
      y += 1;
    }
    return y;
  };
  const [selectedMonth, setSelectedMonth] = useState<number>(getInitialPayrollMonth());
  const [selectedYear, setSelectedYear] = useState<number>(getInitialPayrollYear());
  const [viewMode, setViewMode] = useState<"calendar" | "grid">("calendar");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Fetched data
  const [monthlyAttendance, setMonthlyAttendance] = useState<any[]>([]);
  const [monthlySchedule, setMonthlySchedule] = useState<any[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

   // Absent day resolution states
  const [resolvingCell, setResolvingCell] = useState<DayDetails | null>(null);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolverBalances, setResolverBalances] = useState<any[]>([]);
  const [isBalancesLoading, setIsBalancesLoading] = useState<boolean>(false);
  const [resolveReason, setResolveReason] = useState<string>("");

  // Weekend / Holiday resolution states (One Day Wages)
  const [resolvingWeekendCell, setResolvingWeekendCell] = useState<DayDetails | null>(null);
  const [wagesReason, setWagesReason] = useState<string>("");
  const [isSubmittingWages, setIsSubmittingWages] = useState<boolean>(false);
  const [fromTime, setFromTime] = useState<string>("09:00");
  const [toTime, setToTime] = useState<string>("18:00");

  // Attendance regularization edit states
  const [regularizingCell, setRegularizingCell] = useState<DayDetails | null>(null);
  const [regCheckIn, setRegCheckIn] = useState("09:00");
  const [regCheckOut, setRegCheckOut] = useState("18:00");
  const [regReason, setRegReason] = useState("");
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  useEffect(() => {
    setResolveReason("");
  }, [resolvingCell]);

  useEffect(() => {
    setWagesReason("");
    setFromTime("09:00");
    setToTime("18:00");
  }, [resolvingWeekendCell]);

  useEffect(() => {
    if (regularizingCell) {
      const parseTimeTo24h = (timeStr: string, defaultTime: string) => {
        if (!timeStr || timeStr === "-" || timeStr === "—") return defaultTime;
        const trimStr = timeStr.trim();
        const matches = trimStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (!matches) return defaultTime;
        let hrs = parseInt(matches[1], 10);
        const mins = matches[2];
        const ampm = matches[3];
        if (ampm) {
          if (ampm.toUpperCase() === "PM" && hrs < 12) hrs += 12;
          if (ampm.toUpperCase() === "AM" && hrs === 12) hrs = 0;
        }
        return `${String(hrs).padStart(2, "0")}:${mins}`;
      };

      setRegCheckIn(parseTimeTo24h(regularizingCell.checkIn, "09:00"));
      setRegCheckOut(parseTimeTo24h(regularizingCell.checkOut, "18:00"));
      setRegReason("");
    }
  }, [regularizingCell]);

  // Load user info
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : {};
  const userId = localStorage.getItem("user_id") || user.id || user.user_id;
  const employeeId = user.employee_id || user.id;

  const fetchMonthData = async () => {
    setIsLoading(true);
    try {
      let prevMonth = selectedMonth - 1;
      let prevYear = selectedYear;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const startDateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-25`;

      const [attendanceRes, currentHolidaysRes, nextHolidaysRes, leavesRes] = await Promise.all([
        userId 
          ? apiService.get(`/attendance/history/${userId}`, { params: { start_date: startDateStr } }).catch(() => ({ data: [] })) 
          : Promise.resolve({ data: [] }),
        apiService.get(`/employee/holidays`, { params: { month: prevMonth, year: prevYear } }).catch(() => ({ data: {} })),
        apiService.get(`/employee/holidays`, { params: { month: selectedMonth, year: selectedYear } }).catch(() => ({ data: {} })),
        apiService.get(`/leaves/`).catch(() => ({ data: [] }))
      ]);

      const attData = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
      setMonthlyAttendance(attData);

      const currentSched = currentHolidaysRes.data?.current_month_schedule || [];
      const nextSched = nextHolidaysRes.data?.current_month_schedule || [];
      const combinedSched = [...currentSched, ...nextSched];
      setMonthlySchedule(combinedSched);

      const allLeaves = Array.isArray(leavesRes.data) ? leavesRes.data : [];
      const myApprovedLeaves = allLeaves.filter((l: any) => {
        if ((l.status !== "Approved" && l.status !== "Pending") || (l.request_type !== "Leave" && l.request_type !== "Permission")) return false;
        const leaveEmpId = String(l.employee_id || "");
        
        // Match against database ID, user ID, and company employee_id
        const empId = currentEmployee ? String(currentEmployee.id) : String(employeeId);
        const empUserId = currentEmployee ? String(currentEmployee.user_id) : String(userId);
        const empCompanyId = currentEmployee ? String(currentEmployee.employee_id) : "";
        
        return (
          leaveEmpId === empId || 
          (empCompanyId && leaveEmpId === empCompanyId)
        );
      });
      setApprovedLeaves(myApprovedLeaves);
    } catch (err) {
      console.error("Error loading attendance month data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthData();

    const handleRefresh = () => fetchMonthData();
    window.addEventListener("refreshAttendance", handleRefresh);
    window.addEventListener("refreshTeamStatus", handleRefresh);
    return () => {
      window.removeEventListener("refreshAttendance", handleRefresh);
      window.removeEventListener("refreshTeamStatus", handleRefresh);
    };
  }, [selectedMonth, selectedYear, userId]);

  // Fetch balances when cell is selected for resolution
  useEffect(() => {
    const targetEmpId = currentEmployee?.id || employeeId;
    if (!resolvingCell || !targetEmpId) return;
    const fetchBalances = async () => {
      setIsBalancesLoading(true);
      try {
        const res = await apiService.get(`/leaves/balances/${targetEmpId}`);
        setResolverBalances(res.data);
      } catch (err) {
        console.error("Failed to load balances", err);
      } finally {
        setIsBalancesLoading(false);
      }
    };
    fetchBalances();
  }, [resolvingCell, currentEmployee, employeeId]);


  const submitResolveAbsent = async (action: string) => {
    const targetEmpId = currentEmployee?.id || employeeId;
    if (!resolvingCell || !targetEmpId) return;

    if (!resolveReason.trim()) {
      toast.error("Please enter a reason for resolving this absent day");
      return;
    }
    
    if (action !== "LOP") {
      const balObj = resolverBalances.find(b => b.leave_type.toLowerCase() === action.toLowerCase());
      const balance = balObj ? (balObj.available ?? 0) : 0;
      if (balance < 1) {
        toast.error(`No ${action} balance available`);
        return;
      }
    }

    setIsResolving(true);
    try {
      const res = await apiService.post("/leaves/resolve-absent", {
        employee_id: targetEmpId,
        date: resolvingCell.dateStr,
        action,
        reason: resolveReason.trim()
      });
      if (res.data.success) {
        toast.success(res.data.message || "Attendance updated successfully");
        setResolvingCell(null);
        fetchMonthData();
      } else {
        toast.error(res.data.error || "Failed to resolve absent day");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Error resolving absent day";
      toast.error(errorMsg);
    } finally {
      setIsResolving(false);
    }
  };

  const submitResolveWeekend = async () => {
    const targetEmpId = currentEmployee?.id || employeeId;
    if (!resolvingWeekendCell || !targetEmpId) return;

    if (!fromTime || !toTime) {
      toast.error("Please enter both check-in (From) and check-out (To) times");
      return;
    }

    if (fromTime >= toTime) {
      toast.error("From Time must be earlier than To Time");
      return;
    }

    if (!wagesReason.trim()) {
      toast.error("Please enter a reason for claiming One Day Wages");
      return;
    }

    setIsSubmittingWages(true);
    try {
      const userStr = localStorage.getItem("user");
      const userObj = userStr ? JSON.parse(userStr) : {};

      const payload = {
        employee_id: targetEmpId,
        employee_name: currentEmployee ? `${currentEmployee.first_name} ${currentEmployee.last_name}` : userObj.name || "Employee",
        current_shift: fromTime,
        requested_shift: toTime,
        current_work_mode: currentEmployee?.work_mode || "Office",
        requested_work_mode: currentEmployee?.work_mode || "Office",
        request_type: "One Day Wages",
        from_date: resolvingWeekendCell.dateStr,
        to_date: resolvingWeekendCell.dateStr,
        reporting_manager: currentEmployee?.reporting_manager || "Admin",
        reason: `[Claimed Hours: ${fromTime} - ${toTime}] | ${wagesReason.trim()}`
      };

      const res = await apiService.post("/shifts/", payload);
      if (res.data.success || res.status === 200 || res.status === 201) {
        toast.success("One Day Wages request submitted for manager approval.");
        setResolvingWeekendCell(null);
        fetchMonthData();
      } else {
        toast.error(res.data.message || "Failed to submit One Day Wages request");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Error submitting request";
      toast.error(errorMsg);
    } finally {
      setIsSubmittingWages(false);
    }
  };

  const submitRegularizationRequest = async () => {
    const targetEmpId = currentEmployee?.id || employeeId;
    if (!regularizingCell || !targetEmpId) return;

    if (!regCheckIn || !regCheckOut) {
      toast.error("Please enter both check-in and check-out times");
      return;
    }

    if (regCheckIn >= regCheckOut) {
      toast.error("Check-in Time must be earlier than Check-out Time");
      return;
    }

    if (!regReason.trim()) {
      toast.error("Please enter a reason for the adjustment request");
      return;
    }

    setIsSubmittingReg(true);
    try {
      const res = await apiService.put(`/attendance/submit-regularization/${targetEmpId}`, {
        date: regularizingCell.dateStr,
        check_in: regCheckIn,
        check_out: regCheckOut,
        reason: regReason.trim()
      });
      if (res.data.success || res.status === 200) {
        toast.success("Adjustment request submitted to manager for approval");
        setRegularizingCell(null);
        fetchMonthData();
      } else {
        toast.error(res.data.error || "Failed to submit adjustment request");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Error submitting adjustment request";
      toast.error(errorMsg);
    } finally {
      setIsSubmittingReg(false);
    }
  };


  const handleCellClick = (cell: DayDetails) => {
    const today = new Date();
    const isCurrentPayrollMonthView = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
    if (
      isCurrentPayrollMonthView &&
      cell.status === "Absent" &&
      !cell.leaveType &&
      !cell.isToday &&
      cell.dateStr < todayKey
    ) {
      setResolvingCell(cell);
    } else if (
      isCurrentPayrollMonthView &&
      (cell.status === "Weekly Off" || cell.status === "Holiday") &&
      !cell.isToday &&
      cell.dateStr <= todayKey
    ) {
      setResolvingWeekendCell(cell);
    }
  };

  // Format decimal hours to "Xh Ym"
  const formatHoursMinutes = (hoursDecimal: number): string => {
    if (!hoursDecimal || hoursDecimal <= 0) return "0h";
    const hrs = Math.floor(hoursDecimal);
    const mins = Math.round((hoursDecimal - hrs) * 60);
    if (mins === 0) return `${hrs}h`;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  // Helper: Get YYYY-MM-DD string
  const getTodayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayKey = getTodayKey();

  // Navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleTodayClick = () => {
    const now = new Date();
    let m = now.getMonth() + 1;
    let y = now.getFullYear();
    if (now.getDate() >= 25) {
      m += 1;
      if (m === 13) {
        m = 1;
        y += 1;
      }
    }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  // Start date: 25th of previous month
  const startDate = new Date(selectedYear, selectedMonth - 2, 25);
  // End date: 24th of current month
  const endDate = new Date(selectedYear, selectedMonth - 1, 24);
  const firstDayOfWeek = startDate.getDay();

  // Build daily data map
  const daysDataList: DayDetails[] = [];

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-12
    const day = currentDate.getDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(currentDate);
    const dayOfWeekIdx = dateObj.getDay();
    const dayName = WEEKDAYS[dayOfWeekIdx];
    const fullDayName = FULL_WEEKDAYS[dayOfWeekIdx];
    const isToday = dateStr === todayKey;
    const isFuture = dateStr > todayKey;

    // Check Priority Rules:
    const schedDay = monthlySchedule.find((s: any) => s.date === dateStr);

    // 1. Published Official Company Holiday (added/updated by HR)
    const isCompanyHoliday = Boolean(
      schedDay?.is_holiday &&
      schedDay?.holiday_type !== "Weekly Off" &&
      !schedDay?.name?.includes("Weekly Off")
    );
    const holidayName = isCompanyHoliday ? (schedDay?.name || schedDay?.holiday_name || "Company Holiday") : undefined;
    const holidayType = isCompanyHoliday ? (schedDay?.holiday_type || "Holiday") : undefined;

    // 2. Approved Leave
    const matchedLeave = approvedLeaves.find((l: any) => {
      if (l.request_type !== "Leave") return false;
      return l.from_date <= dateStr && l.to_date >= dateStr;
    });

    // Approved Permission
    const matchedPermission = approvedLeaves.find((l: any) => {
      if (l.request_type !== "Permission") return false;
      return l.permission_date === dateStr;
    });

    // 3. Weekly Off (Sunday or Saturday Off)
    const isWeeklyOff = Boolean(
      schedDay?.is_weekend ||
      schedDay?.holiday_type === "Weekly Off" ||
      schedDay?.name?.includes("Weekly Off") ||
      dayOfWeekIdx === 0
    );

    // 4. Attendance Record (Present / Half Day)
    const attRec = monthlyAttendance.find((a: any) => a.date === dateStr);

    let status: DayDetails["status"] = "Absent";
    let badgeLabel = "Absent";
    let badgeEmoji = "";
    let checkIn = "-";
    let checkOut = "-";
    let cardCheckIn = "-";
    let cardCheckOut = "-";
    let cardWorkingHours = 0;
    let workingHours = 0;
    let baseWorkingHours = 0;
    let workingHoursFormatted = "0h";
    let lunchMinutes = 0;
    let teaMinutes = 0;
    let leaveType = undefined;
    let leaveReason = undefined;
    let shift = user.shift_timing || "General Shift";
    let lateBy = "00:00";
    let earlyOut = "00:00";
    let overtime = "00:00";
    let source = "Web App";
    let managerStatus = "Approved";
    let halfDayDuration: string | undefined = undefined;

    let permissionHours = 0;
    if (matchedPermission && matchedPermission.status === "Approved" && matchedPermission.from_time && matchedPermission.to_time) {
      const [fH, fM] = matchedPermission.from_time.split(":");
      const [tH, tM] = matchedPermission.to_time.split(":");
      const fMins = parseInt(fH) * 60 + parseInt(fM);
      const tMins = parseInt(tH) * 60 + parseInt(tM);
      permissionHours = Math.max(0, tMins - fMins) / 60;
    }

    if (attRec) {
      checkIn = attRec.checkIn || attRec.check_in || "-";
      checkOut = attRec.checkOut || attRec.check_out || "-";
      cardCheckIn = attRec.cardCheckIn || attRec.card_check_in || "-";
      cardCheckOut = attRec.cardCheckOut || attRec.card_check_out || "-";
      cardWorkingHours = Number(attRec.cardWorkingHours || attRec.card_working_hours || 0);
      baseWorkingHours = Number(attRec.workingHours || attRec.working_hours || 0);
      
      const hasCheckedIn = checkIn !== "-" && checkIn !== "";
      if (hasCheckedIn) {
        workingHours = baseWorkingHours + permissionHours;
      } else {
        workingHours = baseWorkingHours;
      }

      workingHoursFormatted = formatHoursMinutes(workingHours);
      lunchMinutes = Number(attRec.lunchMinutes || attRec.lunch_minutes || 0);
      teaMinutes = Number(attRec.teaMinutes || attRec.tea_minutes || 0);
      if (attRec.shift) shift = attRec.shift;
      if (attRec.managerStatus) managerStatus = attRec.managerStatus;

      // Overtime calculation sample (>8h)
      if (workingHours > 8) {
        const otVal = workingHours - 8;
        overtime = formatHoursMinutes(otVal);
      }
    }

    const wagesStatus = attRec?.wages_status || null;
    const hasWorkedAndApproved = (checkIn !== "-" && checkIn !== "") && (managerStatus === "Approved") && (attRec?.status !== "Leave");
    const isOneDayWages = wagesStatus === "Approved" || ((isWeeklyOff || isCompanyHoliday) && wagesStatus !== "Rejected" && wagesStatus !== "Pending" && hasWorkedAndApproved);

    if (isCompanyHoliday && !isOneDayWages) {
      status = "Holiday";
      badgeLabel = holidayName || "Company Holiday";
      badgeEmoji = "";
    } else if (isWeeklyOff && !isOneDayWages) {
      status = "Weekly Off";
      badgeLabel = "Week Off";
      badgeEmoji = "";
    } else if (matchedLeave && !isOneDayWages) {
      const isLopLeave = matchedLeave.leave_type?.toLowerCase() === "loss of pay" || matchedLeave.leave_type?.toLowerCase() === "lop" || matchedLeave.leave_type?.toLowerCase() === "unpaid leave";
      if (isLopLeave) {
        status = "Absent";
        badgeLabel = (matchedLeave.leave_type || "Loss of Pay") + (matchedLeave.status === "Pending" ? " (Pending)" : "");
        badgeEmoji = "";
      } else {
        const isPending = matchedLeave.status === "Pending";
        status = "Leave";
        const isHalfDay = matchedLeave.total_days != null && Number(matchedLeave.total_days) <= 0.5;
        let durationStr = "";
        halfDayDuration = undefined;
        if (isHalfDay) {
          if (matchedLeave.reason?.includes("First Half")) {
            durationStr = " (First Half)";
            halfDayDuration = "First Half";
          } else if (matchedLeave.reason?.includes("Second Half")) {
            durationStr = " (Second Half)";
            halfDayDuration = "Second Half";
          } else {
            durationStr = " (Half Day)";
            halfDayDuration = "Half Day";
          }
        }
        badgeLabel = (matchedLeave.leave_type || "Leave") + durationStr + (isPending ? " (Pending)" : "");
        badgeEmoji = "";
      }
      leaveType = matchedLeave.leave_type;
      leaveReason = matchedLeave.reason;
    } else if (attRec && (attRec.status?.toLowerCase() === "present" || (checkIn !== "-" && checkIn !== ""))) {
      // If the database status is explicitly set to something else (e.g. Leave, Absent, Weekly Off, Holiday) by the manager/system, respect it.
      const dbStatus = attRec.status;
      if (dbStatus && dbStatus !== "Present" && dbStatus !== "Half Day") {
        status = dbStatus as any;
        badgeLabel = dbStatus;
        badgeEmoji = "";
      } else {
        // Present vs Half Day vs Absent thresholds — applies to both checked-out and still-active sessions
        if (workingHours > 0 && workingHours < 4) {
          status = "Absent";
          badgeLabel = "Absent";
          badgeEmoji = "";
        } else if (workingHours >= 4 && workingHours < 8) {
          status = "Half Day";
          badgeLabel = "Half Day";
          badgeEmoji = "";
        } else if (workingHours >= 8) {
          status = "Present";
          badgeLabel = "Present";
          badgeEmoji = "";
        } else {
          // workingHours is 0 (checked in but didn't check out on a past day, or checked in today but has 0 hours so far)
          if (isToday) {
            status = "Half Day";
            badgeLabel = "Half Day";
            badgeEmoji = "";
          } else {
            status = (attRec.status === "Present" || attRec.status === "Half Day" || attRec.status === "Absent") ? (attRec.status as any) : "Absent";
            badgeLabel = status;
            badgeEmoji = "";
          }
        }
      }
    } else if (isFuture) {
      status = "Future";
      badgeLabel = "Upcoming";
      badgeEmoji = "";
    } else {
      // Past working day with no attendance
      status = "Absent";
      badgeLabel = "Absent";
      badgeEmoji = "";
    }



    daysDataList.push({
      dateStr,
      dayNum: day,
      dayName,
      fullDayName,
      isCurrentMonth: true,
      isToday,
      status,
      badgeLabel,
      badgeEmoji,
      checkIn,
      checkOut,
      cardCheckIn,
      cardCheckOut,
      cardWorkingHours,
      workingHours,
      workingHoursFormatted,
      lunchMinutes,
      teaMinutes,
      holidayName,
      holidayType,
      leaveType,
      leaveReason,
      shift,
      lateBy,
      earlyOut,
      overtime,
      source,
      managerStatus,
      rawAttendanceRecord: attRec,
      rawLeaveRecord: matchedLeave,
      baseWorkingHours: baseWorkingHours,
      rawPermissionRecord: matchedPermission,
      halfDayDuration,
      isOneDayWages,
      wagesStatus
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Monthly Summary Calculations
  const presentCount = daysDataList.filter(d => d.status === "Present" && d.dateStr <= todayKey).length;
  const absentCount = daysDataList.filter(d => d.status === "Absent" && d.dateStr <= todayKey).length;
  const leaveCount = daysDataList.filter(d => d.status === "Leave" && d.dateStr <= todayKey).length;
  const halfDayCount = daysDataList.filter(d => d.status === "Half Day" && d.dateStr <= todayKey).length;
  const weeklyOffCount = daysDataList.filter(d => d.status === "Weekly Off" && d.dateStr <= todayKey).length;
  const holidayCount = daysDataList.filter(d => d.status === "Holiday" && d.dateStr <= todayKey).length;
  
  const totalPresentDays = presentCount + leaveCount + (halfDayCount * 0.5) + weeklyOffCount + holidayCount;
  
  const totalWorkedAndAbsent = presentCount + halfDayCount + absentCount;
  const attendancePercentage = totalWorkedAndAbsent > 0
    ? Math.round(((presentCount + (halfDayCount * 0.5)) / totalWorkedAndAbsent) * 100)
    : 100;

  // Filtered Grid View records (reversed to show newest days first, only up to today's date)
  const filteredGridDays = daysDataList.filter(d => {
    if (d.dateStr > todayKey) return false;
    if (d.status === "Future") return false;
    if (statusFilter === "All") return true;
    return d.status.toLowerCase() === statusFilter.toLowerCase();
  }).reverse();

  // Calendar Grid Padding Slots
  const calendarCells: (DayDetails | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (const dayObj of daysDataList) {
    calendarCells.push(dayObj);
  }

  return (
    <div className="space-y-6 relative">
      {isLoading && <BookLoader />}
      {/* Page Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-500/10 rounded-xl text-primary-500">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-850">Employee Attendance</h2>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">Track daily check-in, check-out, working hours, and monthly attendance timeline</p>
          </div>
        </div>
      </div>


      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl">
        <StatCard icon={CheckCircleIcon} title="Present Days" value={totalPresentDays} subtitle="" trend="normal" color="green" />
        <StatCard icon={UserMinusIcon} title="Absent Days (LOP)" value={absentCount} subtitle="" trend="normal" color="red" />
        <StatCard icon={CalendarDaysIcon} title="Paid Leave" value={leaveCount} subtitle="" trend="normal" color="purple" />
      </div>

      {/* Main Content Card */}
      <Card padding="none" className="border border-neutral-200 shadow-sm rounded-2xl bg-white">
        {/* Toolbar Header */}
        <div className="p-5 border-b border-neutral-200 bg-neutral-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-t-2xl">
          {/* Left: Active Month Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-neutral-850">
                {`${startDate.getDate()} ${startDate.toLocaleDateString("en-IN", { month: "short" })} - ${endDate.getDate()} ${endDate.toLocaleDateString("en-IN", { month: "short" })}, ${endDate.getFullYear()}`}
              </h3>
            </div>
            {isLoading && (
              <span className="flex items-center text-xs text-neutral-400 gap-1">
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> Syncing...
              </span>
            )}
          </div>

          {/* Right: Navigation Controls & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Today Button */}
            <button
              onClick={handleTodayClick}
              className="px-3.5 py-1.5 text-xs font-bold text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 shadow-xs transition-colors"
            >
              Today
            </button>

            {/* Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-xs"
            >
              {MONTH_NAMES.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>{mName}</option>
              ))}
            </select>

            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-xs"
            >
              {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Status Filter (for Grid view & highlighting) */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-xs"
            >
              <option value="All">All Status</option>
              <option value="Present">🟢 Present</option>
              <option value="Absent">🔴 Absent</option>
              <option value="Half Day">🟠 Half Day</option>
              <option value="Leave">🟣 Leave</option>
              <option value="Holiday">🔵 Holiday</option>
              <option value="Weekly Off">⚫ Weekly Off</option>
            </select>

            {/* View Switcher Toggle */}
            <div className="flex items-center bg-neutral-100 border border-neutral-200/60 p-1 rounded-xl text-xs font-bold shrink-0">
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${viewMode === "calendar"
                  ? "bg-white text-primary-500 shadow-sm border border-neutral-200 font-extrabold"
                  : "text-neutral-600 hover:text-neutral-900"
                  }`}
              >
                <CalendarIcon className="w-4 h-4" /> Calendar View
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${viewMode === "grid"
                  ? "bg-white text-primary-500 shadow-sm border border-neutral-200 font-extrabold"
                  : "text-neutral-600 hover:text-neutral-900"
                  }`}
              >
                <ListBulletIcon className="w-4 h-4" /> Grid View
              </button>
            </div>
          </div>
        </div>

        {/* Mode 1: Calendar View */}
        {viewMode === "calendar" ? (
          <div className="p-5 max-w-[1000px] mx-auto space-y-4 relative z-10">
            {/* 7-Column Weekday Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-2 text-center text-[12px] font-bold text-neutral-700 uppercase tracking-widest">
                  {wd}
                </div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 gap-2">
              {calendarCells.map((cell, idx) => {
                if (!cell) {
                  return (
                    <div key={`empty-${idx}`} className="h-[80px] rounded-xl bg-transparent" />
                  );
                }

                // Color themes based on status
                let badgeClass = "bg-neutral-100 text-neutral-700 border-neutral-200";

                switch (cell.status) {
                  case "Present":
                    badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    break;
                  case "Absent":
                    badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                    break;
                  case "Half Day":
                    badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                    break;
                  case "Leave":
                    badgeClass = "bg-primary-500/10 text-primary-500 border-primary-500/20";
                    break;
                  case "Holiday":
                    badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                    break;
                  case "Weekly Off":
                    badgeClass = "bg-neutral-50 text-neutral-600 border-neutral-200";
                    break;
                  case "Future":
                    badgeClass = "bg-white text-neutral-300 border-neutral-100";
                    break;
                }

                const today = new Date();
                const isCurrentPayrollMonthView = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
                const isClickableAbsent = isCurrentPayrollMonthView &&
                                          cell.status === "Absent" &&
                                          !cell.leaveType &&
                                          !cell.isToday &&
                                          cell.dateStr < todayKey;
                const isClickableWeekend = isCurrentPayrollMonthView &&
                                           (cell.status === "Weekly Off" || cell.status === "Holiday") &&
                                           !cell.isToday &&
                                           cell.dateStr <= todayKey;
                const isClickable = isClickableAbsent || isClickableWeekend;
                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => handleCellClick(cell)}
                    className={`h-[80px] p-2 flex flex-col justify-between rounded-xl border relative group transition-all duration-200 hover:z-50 ${
                      isClickable
                        ? `cursor-pointer hover:shadow-md active:scale-95 ${
                            isClickableAbsent ? "hover:border-rose-450" : "hover:border-primary-400"
                          }`
                        : "cursor-default"
                    } ${cell.isToday
                        ? "border-primary-500 shadow-sm bg-white"
                        : cell.status === "Future"
                          ? "border-neutral-200 bg-neutral-50/40"
                          : "border-neutral-300 bg-white hover:border-neutral-400 hover:shadow-sm"
                      }`}
                  >
                    {/* Top Row: Date Number */}
                    <div className="flex justify-between items-center w-full">
                      <span className={`text-[12px] font-bold flex items-center justify-center rounded-full ${cell.isToday
                          ? "bg-primary-500 text-white w-6 h-6 shadow-sm"
                          : cell.status === "Future"
                            ? "text-neutral-400"
                            : "text-neutral-900"
                        }`}>
                        {cell.dayNum}
                      </span>
                      {cell.halfDayDuration && (
                        <span className="text-[8px] font-extrabold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 uppercase tracking-wide shrink-0">
                          {cell.halfDayDuration === "First Half" ? "1st Half" : cell.halfDayDuration === "Second Half" ? "2nd Half" : "Half"}
                        </span>
                      )}
                    </div>

                    {/* Status Tag */}
                    {cell.status !== "Future" && (
                      <div className="mt-1 w-full flex justify-start">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 w-full ${badgeClass}`}>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeClass.includes("emerald") ? "bg-emerald-500" : badgeClass.includes("rose") ? "bg-rose-500" : badgeClass.includes("amber") ? "bg-amber-500" : badgeClass.includes("blue") ? "bg-blue-500" : badgeClass.includes("primary") ? "bg-primary-500" : "bg-neutral-400"}`}></div>
                          <span className="truncate">
                            {cell.halfDayDuration ? cell.leaveType || "Leave" : cell.badgeLabel || cell.status}
                            {cell.isOneDayWages && " (Wages)"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Advanced Light Theme Hover Card Tooltip */}
                    {cell.status !== "Future" && (
                      <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100 absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-64 bg-white text-neutral-800 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-neutral-200 z-[100]">
                        {/* Tooltip Tail */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r border-b border-neutral-200" />

                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
                          <div>
                            <h5 className="text-[13px] font-extrabold text-neutral-800">
                              {parseInt(cell.dateStr.split('-')[2])} {MONTH_NAMES[parseInt(cell.dateStr.split('-')[1]) - 1]} {cell.dateStr.split('-')[0]}
                            </h5>
                            <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mt-0.5">{cell.fullDayName}</p>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2 py-1 border rounded-lg ${badgeClass}`}>
                            {cell.badgeLabel || cell.status}
                            {cell.isOneDayWages && " (Wages)"}
                          </span>
                        </div>

                        {/* Details Breakdown */}
                        {cell.isOneDayWages && (
                          <div className="space-y-1 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-700 mb-3">
                            <span className="text-[9px] uppercase font-bold text-amber-500 block">One Day Wages</span>
                            <p className="font-extrabold text-[12px]">
                              Status: {cell.wagesStatus || "Pending"}
                            </p>
                          </div>
                        )}
                        {cell.rawPermissionRecord && (
                          <div className="space-y-1 bg-purple-50 p-2.5 rounded-xl border border-purple-200 text-purple-700 mb-3">
                            <span className="text-[9px] uppercase font-bold text-purple-500 block">Approved Permission</span>
                            {cell.rawPermissionRecord.from_time && cell.rawPermissionRecord.to_time ? (
                              <p className="font-extrabold text-[12px]">
                                {cell.rawPermissionRecord.from_time.substring(0, 5)} - {cell.rawPermissionRecord.to_time.substring(0, 5)}
                              </p>
                            ) : (
                              <p className="font-extrabold text-[12px]">Approved (No Time Specified)</p>
                            )}
                            {cell.rawPermissionRecord.reason && (
                              <p className="text-[10px] text-purple-600 font-semibold mt-0.5">
                                Reason: {cell.rawPermissionRecord.reason}
                              </p>
                            )}
                          </div>
                        )}

                        {cell.status === "Present" || cell.status === "Half Day" ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">Check-In</span>
                                <span className="font-extrabold text-emerald-600 text-[12px]">{cell.checkIn}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">Check-Out</span>
                                <span className="font-extrabold text-primary-500 text-[12px]">{cell.checkOut}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">Lunch Break</span>
                                <span className="font-extrabold text-neutral-700 text-[12px]">{cell.lunchMinutes} mins</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">Tea Break</span>
                                <span className="font-extrabold text-neutral-700 text-[12px]">{cell.teaMinutes} mins</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center px-1">
                               <span className="text-[11px] text-neutral-500 font-bold">Total Hours</span>
                               <span className="text-[12px] font-extrabold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                                 {formatHoursMinutes(cell.workingHours + ((cell.lunchMinutes || 0) + (cell.teaMinutes || 0)) / 60)}
                               </span>
                             </div>
                             
                             {/* Show breakdown of actual work hours and permission hours if present */}
                             {cell.rawPermissionRecord && cell.rawPermissionRecord.from_time && cell.rawPermissionRecord.to_time ? (
                               <>
                                 <div className="flex justify-between items-center px-1">
                                   <span className="text-[11px] text-neutral-500 font-bold">Actual Work Hours</span>
                                   <span className="text-[12px] font-extrabold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                                     {formatHoursMinutes(cell.baseWorkingHours ?? cell.workingHours)}
                                   </span>
                                 </div>
                                 {(() => {
                                   const [fH, fM] = cell.rawPermissionRecord.from_time.split(":");
                                   const [tH, tM] = cell.rawPermissionRecord.to_time.split(":");
                                   const mins = Math.max(0, (parseInt(tH)*60+parseInt(tM)) - (parseInt(fH)*60+parseInt(fM)));
                                   return (
                                     <div className="flex justify-between items-center px-1 text-purple-600">
                                       <span className="text-[11px] font-bold">Permission Hours</span>
                                       <span className="text-[12px] font-extrabold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                         +{formatHoursMinutes(mins / 60)}
                                       </span>
                                     </div>
                                   );
                                 })()}
                               </>
                             ) : null}

                             <div className="flex justify-between items-center px-1">
                               <span className="text-[11px] text-neutral-500 font-bold">Total Working Hours</span>
                               <span className="text-[12px] font-extrabold text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-md">{cell.workingHoursFormatted}</span>
                             </div>
                            {cell.overtime && cell.overtime !== "00:00" && cell.overtime !== "0h" && cell.overtime !== "0.0h" && (
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[11px] text-neutral-500 font-bold">Overtime</span>
                                <span className="font-bold text-emerald-600 text-[11px]">+{cell.overtime}</span>
                              </div>
                            )}
                            {((cell.rawAttendanceRecord?.check_in_ip) || (cell.rawAttendanceRecord?.check_out_ip)) && (
                              <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 mt-2 text-[10px]">
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">In IP</span>
                                  <span className="font-extrabold text-neutral-600 truncate block" title={cell.rawAttendanceRecord.check_in_ip}>{cell.rawAttendanceRecord.check_in_ip || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">Out IP</span>
                                  <span className="font-extrabold text-neutral-600 truncate block" title={cell.rawAttendanceRecord.check_out_ip}>{cell.rawAttendanceRecord.check_out_ip || "-"}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : cell.status === "Holiday" ? (
                          <div className="space-y-3">
                            <div className="space-y-1 bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-blue-900">
                              <span className="text-[10px] uppercase font-bold text-blue-500 block">Company Holiday</span>
                              <p className="font-bold text-[13px] text-blue-800">{cell.holidayName}</p>
                            </div>
                            {cell.checkIn !== "-" && cell.checkIn !== "" && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                                  <div>
                                    <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">Check-In</span>
                                    <span className="font-extrabold text-emerald-600 text-[12px]">{cell.checkIn}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">Check-Out</span>
                                    <span className="font-extrabold text-primary-500 text-[12px]">{cell.checkOut}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[11px] text-neutral-500 font-bold">Total Working Hours</span>
                                  <span className="text-[12px] font-extrabold text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-md">{cell.workingHoursFormatted}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : cell.status === "Leave" ? (
                          <div className="space-y-3">
                            <div className="space-y-1 bg-primary-500/10 p-3 rounded-xl border border-primary-500/20 text-primary-500">
                              <span className="text-[10px] uppercase font-bold text-primary-500 block">Approved Leave</span>
                              <p className="font-bold text-[13px] text-primary-500">{cell.leaveType}</p>
                              {(() => {
                                const isHalf = cell.rawLeaveRecord?.total_days != null && Number(cell.rawLeaveRecord?.total_days) <= 0.5;
                                if (isHalf) {
                                  const isFirst = cell.leaveReason?.includes("First Half") || cell.rawLeaveRecord?.from_time?.startsWith("09:00");
                                  const isSecond = cell.leaveReason?.includes("Second Half") || cell.rawLeaveRecord?.from_time?.startsWith("13:30");
                                  const timeString = cell.rawLeaveRecord?.from_time && cell.rawLeaveRecord?.to_time
                                    ? ` (${cell.rawLeaveRecord.from_time.substring(0, 5)} - ${cell.rawLeaveRecord.to_time.substring(0, 5)})`
                                    : "";
                                  return (
                                    <span className="text-[10px] font-bold block mt-1">
                                      Session: {isFirst ? "First Half" : isSecond ? "Second Half" : "Half Day"}{timeString}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            {cell.checkIn !== "-" && cell.checkIn !== "" && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                                  <div>
                                    <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">Check-In</span>
                                    <span className="font-extrabold text-emerald-600 text-[12px]">{cell.checkIn}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">Check-Out</span>
                                    <span className="font-extrabold text-primary-500 text-[12px]">{cell.checkOut}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[11px] text-neutral-500 font-bold">Total Working Hours</span>
                                  <span className="text-[12px] font-extrabold text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-md">{cell.workingHoursFormatted}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : cell.status === "Weekly Off" ? (
                          <div className="space-y-3">
                            <div className="text-[12px] text-neutral-500 text-center py-3 bg-neutral-50 rounded-xl font-bold border border-neutral-100">
                              Week Off ({cell.fullDayName})
                            </div>
                            {cell.checkIn !== "-" && cell.checkIn !== "" && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                                  <div>
                                    <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">Check-In</span>
                                    <span className="font-extrabold text-emerald-600 text-[12px]">{cell.checkIn}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-0.5">Check-Out</span>
                                    <span className="font-extrabold text-primary-500 text-[12px]">{cell.checkOut}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[11px] text-neutral-500 font-bold">Total Working Hours</span>
                                  <span className="text-[12px] font-extrabold text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-md">{cell.workingHoursFormatted}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1 bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-rose-900">
                            <span className="text-[10px] uppercase font-bold text-rose-500 block">Absent</span>
                            <p className="font-bold text-[12px] text-rose-700">No Check-In Record • 0h</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold text-neutral-500 pt-5 mt-2 border-t border-neutral-100">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Present</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Absent</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Half Day</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary-500"></div> Leave</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Holiday</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-neutral-400"></div> Weekly Off</span>
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-white border-2 border-primary-500"></div> Today</span>
            </div>
          </div>
        ) : (
          /* Mode 2: Grid View */
          <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-white shadow-xs">
                {/* Group Headers */}
                <tr className="border-b border-neutral-300 text-neutral-500 text-[10px] font-extrabold uppercase tracking-widest bg-neutral-50/40">
                  <th rowSpan={2} className="p-3 pl-6 border-r border-neutral-300 text-left">Date</th>
                  <th rowSpan={2} className="p-3 border-r border-neutral-300 text-left">Day</th>
                  
                  <th colSpan={3} className="p-2.5 text-center border-r border-b-2 border-cyan-500 bg-cyan-50/20 text-cyan-700 text-[11px] font-black">
                    Web Site Entry
                  </th>
                  
                  <th colSpan={3} className="p-2.5 text-center border-r border-b-2 border-violet-500 bg-violet-50/25 text-violet-700 text-[11px] font-black">
                    Biometric Card Entry
                  </th>
                  
                  <th rowSpan={2} className="p-3 border-r border-neutral-300 text-center text-neutral-600 font-extrabold">
                    Breaks <div className="text-[9px] text-neutral-400 font-bold normal-case">(L/T)</div>
                  </th>
                  
                  <th rowSpan={2} className="p-3 border-r border-neutral-300 text-center">Status</th>
                  <th rowSpan={2} className="p-3 border-r border-neutral-300 text-left">Shift</th>
                  <th rowSpan={2} className="p-3 text-center pr-6">Overtime</th>
                </tr>
                {/* Sub Headers */}
                <tr className="border-b border-neutral-300 text-neutral-500 text-[10px] font-extrabold uppercase tracking-wider bg-white">
                  {/* Web Site Entry columns */}
                  <th className="p-2 text-center text-cyan-600">Check-In</th>
                  <th className="p-2 text-center text-cyan-600">Check-Out</th>
                  <th className="p-2 text-center text-cyan-600 border-r border-neutral-300">Hours</th>
                  {/* Biometric Card Entry columns */}
                  <th className="p-2 text-center text-violet-600">Check-In</th>
                  <th className="p-2 text-center text-violet-600">Check-Out</th>
                  <th className="p-2 text-center text-violet-600 border-r border-neutral-300">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-300 text-xs font-semibold text-neutral-700 bg-white">
                {filteredGridDays.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-10 text-center text-neutral-400 font-semibold bg-neutral-50/20">
                      No attendance records matching status filter "{statusFilter}".
                    </td>
                  </tr>
                ) : (
                  filteredGridDays.map((dayObj) => (
                    <tr
                      key={dayObj.dateStr}
                      className="hover:bg-primary-500/5 transition-colors border-b border-neutral-300"
                    >
                      <td className="p-3 pl-6 font-bold text-neutral-900 border-r border-neutral-300">{formatDateStr(dayObj.dateStr)}</td>
                      <td className="p-3 text-neutral-500 border-r border-neutral-300 font-bold">{dayObj.dayName}</td>
                      
                      {/* Web Site Entry */}
                      <td
                        onClick={() => {
                          const cellDate = new Date(dayObj.dateStr + "T00:00:00");
                          const todayMidnight = new Date();
                          todayMidnight.setHours(23, 59, 59, 999);
                          if (cellDate <= todayMidnight) {
                            setRegularizingCell(dayObj);
                          }
                        }}
                        title="Click to request time adjustment"
                        className="p-3 text-center text-neutral-800 font-bold cursor-pointer hover:bg-cyan-50/50 hover:text-cyan-750 transition-all underline decoration-dotted decoration-cyan-500/60"
                      >
                        {dayObj.checkIn}
                      </td>
                      <td
                        onClick={() => {
                          const cellDate = new Date(dayObj.dateStr + "T00:00:00");
                          const todayMidnight = new Date();
                          todayMidnight.setHours(23, 59, 59, 999);
                          if (cellDate <= todayMidnight) {
                            setRegularizingCell(dayObj);
                          }
                        }}
                        title="Click to request time adjustment"
                        className="p-3 text-center text-neutral-800 font-bold cursor-pointer hover:bg-cyan-50/50 hover:text-cyan-750 transition-all underline decoration-dotted decoration-cyan-500/60"
                      >
                        {dayObj.checkOut}
                      </td>
                      <td className="p-3 text-center text-cyan-600 font-black border-r border-neutral-300">
                        {(dayObj.checkIn !== "-" && dayObj.checkOut !== "-") ? dayObj.workingHoursFormatted : "—"}
                      </td>
                      
                      {/* Biometric Card Entry */}
                      <td className="p-3 text-center text-neutral-800 font-bold">{dayObj.cardCheckIn || "-"}</td>
                      <td className="p-3 text-center text-neutral-800 font-bold">{dayObj.cardCheckOut || "-"}</td>
                      <td className="p-3 text-center text-violet-650 font-black border-r border-neutral-300">
                        {(dayObj.cardCheckIn !== "-" && dayObj.cardCheckOut !== "-") ? formatHoursMinutes(dayObj.cardWorkingHours || 0) : "—"}
                      </td>
                      
                      {/* Breaks */}
                      <td className="p-3 text-center font-bold text-neutral-600 border-r border-neutral-300">
                        {(dayObj.lunchMinutes || dayObj.teaMinutes) ? `${dayObj.lunchMinutes}m / ${dayObj.teaMinutes}m` : "—"}
                      </td>
                      
                      {/* Status */}
                      <td 
                        onClick={() => {
                          const today = new Date();
                          const isCurrentPayrollMonthView = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
                          const isClickableAbsent = isCurrentPayrollMonthView &&
                                                    dayObj.status === "Absent" &&
                                                    !dayObj.leaveType &&
                                                    !dayObj.isToday &&
                                                    dayObj.dateStr < todayKey;
                          const isClickableWeekend = isCurrentPayrollMonthView &&
                                                     (dayObj.status === "Weekly Off" || dayObj.status === "Holiday") &&
                                                     !dayObj.isToday &&
                                                     dayObj.dateStr <= todayKey;
                          if (isClickableAbsent || isClickableWeekend) {
                            handleCellClick(dayObj);
                          }
                        }}
                        title={
                          (() => {
                            const today = new Date();
                            const isCurrentPayrollMonthView = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
                            const isClickableAbsent = isCurrentPayrollMonthView &&
                                                      dayObj.status === "Absent" &&
                                                      !dayObj.leaveType &&
                                                      !dayObj.isToday &&
                                                      dayObj.dateStr < todayKey;
                            const isClickableWeekend = isCurrentPayrollMonthView &&
                                                       (dayObj.status === "Weekly Off" || dayObj.status === "Holiday") &&
                                                       !dayObj.isToday &&
                                                       dayObj.dateStr <= todayKey;
                            if (isClickableAbsent) return "Click to apply leave / regularize absent day";
                            if (isClickableWeekend) return "Click to request wages for non-working day";
                            return undefined;
                          })()
                        }
                        className={
                          (() => {
                            const today = new Date();
                            const isCurrentPayrollMonthView = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
                            const isClickableAbsent = isCurrentPayrollMonthView &&
                                                      dayObj.status === "Absent" &&
                                                      !dayObj.leaveType &&
                                                      !dayObj.isToday &&
                                                      dayObj.dateStr < todayKey;
                            const isClickableWeekend = isCurrentPayrollMonthView &&
                                                       (dayObj.status === "Weekly Off" || dayObj.status === "Holiday") &&
                                                       !dayObj.isToday &&
                                                       dayObj.dateStr <= todayKey;
                            const isClickable = isClickableAbsent || isClickableWeekend;
                            return `p-3 text-center border-r border-neutral-300 transition-colors ${
                              isClickable ? "cursor-pointer hover:bg-neutral-50" : ""
                            }`;
                          })()
                        }
                      >
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          {(() => {
                            const today = new Date();
                            const isCurrentPayrollMonthView = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
                            const isClickableAbsent = isCurrentPayrollMonthView &&
                                                      dayObj.status === "Absent" &&
                                                      !dayObj.leaveType &&
                                                      !dayObj.isToday &&
                                                      dayObj.dateStr < todayKey;
                            const isClickableWeekend = isCurrentPayrollMonthView &&
                                                       (dayObj.status === "Weekly Off" || dayObj.status === "Holiday") &&
                                                       !dayObj.isToday &&
                                                       dayObj.dateStr <= todayKey;
                            const isClickable = isClickableAbsent || isClickableWeekend;
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all duration-200 ${
                                isClickable ? "hover:scale-105 active:scale-95 shadow-xs" : ""
                              } ${dayObj.status === "Present" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                                dayObj.status === "Absent" ? `bg-rose-100 text-rose-800 border-rose-300 ${isClickable ? "hover:border-rose-450 hover:bg-rose-150" : ""}` :
                                  dayObj.status === "Half Day" ? "bg-amber-100 text-amber-800 border-amber-300" :
                                    dayObj.status === "Leave" ? "bg-primary-500/15 text-primary-500 border-primary-500/30" :
                                      dayObj.status === "Holiday" ? `bg-blue-100 text-blue-800 border-blue-300 ${isClickable ? "hover:border-blue-450 hover:bg-blue-150" : ""}` :
                                        `bg-neutral-200 text-neutral-700 border-neutral-300 ${isClickable ? "hover:border-neutral-400 hover:bg-neutral-250" : ""}`
                                }`}>
                                <span>{dayObj.badgeEmoji}</span>
                                <span>{dayObj.badgeLabel || dayObj.status}</span>
                              </span>
                            );
                          })()}
                          {dayObj.isOneDayWages && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                              dayObj.wagesStatus === "Approved"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-neutral-50 text-neutral-600 border-neutral-200"
                            }`}>
                              Wages: {dayObj.wagesStatus || "Pending"}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Shift */}
                      <td className="p-3 text-neutral-750 font-extrabold border-r border-neutral-300 truncate max-w-[170px]">{dayObj.shift}</td>
                      
                      {/* Overtime */}
                      <td className="p-3 text-center pr-6 font-bold text-emerald-700">{dayObj.overtime}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* LOP/Leave Resolver Modal */}
      {resolvingCell && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-neutral-200 shadow-2xl animate-scaleIn">
            <h3 className="text-[16px] font-extrabold text-neutral-900 mb-2">Resolve Absent Day</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Choose how to log your absence on <strong className="text-neutral-850 font-bold">{resolvingCell.dayNum} {MONTH_NAMES[selectedMonth - 1]}</strong>:
            </p>

            {/* Reason Text Area */}
            <div className="mb-4 text-left">
              <label className="block text-xs font-bold text-neutral-700 mb-1">Reason for Absence</label>
              <textarea
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                placeholder="Enter reason for resolving..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none placeholder-neutral-400 bg-neutral-50/50 font-semibold"
                rows={3}
              />
            </div>

             <div className="space-y-3">
              <button
                onClick={() => submitResolveAbsent("LOP")}
                disabled={isResolving}
                className="w-full text-left px-4 py-3 rounded-xl border border-rose-250 bg-rose-50/50 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all flex justify-between items-center"
              >
                <span>Loss of Pay (LOP)</span>
                <span className="text-[10px] text-rose-500 uppercase tracking-wide">Deducted Pay</span>
              </button>

              {isBalancesLoading ? (
                <div className="text-center py-4 text-xs text-neutral-450 animate-pulse font-semibold">
                  Loading available leave categories...
                </div>
              ) : resolverBalances.length === 0 ? (
                <div className="text-center py-2 text-xs text-neutral-500 font-semibold">
                  No leave balances allocated.
                </div>
              ) : (
                resolverBalances.map((balObj: any) => {
                  const leaveType = balObj.leave_type;
                  const availableVal = balObj.available ?? 0;
                  return (
                    <button
                      key={balObj.id || leaveType}
                      onClick={() => submitResolveAbsent(leaveType)}
                      disabled={isResolving}
                      className="w-full text-left px-4 py-3 rounded-xl border border-primary-200 bg-neutral-50 hover:bg-neutral-100/70 text-neutral-800 text-xs font-bold transition-all flex justify-between items-center"
                    >
                      <span>{leaveType}</span>
                      <span className="text-[10px] text-neutral-500 font-semibold">{availableVal} Left</span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setResolvingCell(null)}
                disabled={isResolving}
                className="px-4 py-2 border border-neutral-200 rounded-lg text-xs text-neutral-600 font-bold hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekend / Holiday Wages Resolver Modal */}
      {resolvingWeekendCell && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-neutral-200 shadow-2xl animate-scaleIn">
            <h3 className="text-[16px] font-extrabold text-neutral-900 mb-2">Resolve Weekend / Holiday</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Choose how to log <strong className="text-neutral-850 font-bold">{resolvingWeekendCell.dayNum} {MONTH_NAMES[selectedMonth - 1]}</strong>:
            </p>

            {/* Time Selection Fields */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-left">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">From Time</label>
                <TimePicker
                  value={fromTime}
                  onChange={(val) => setFromTime(val)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">To Time</label>
                <TimePicker
                  value={toTime}
                  onChange={(val) => setToTime(val)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Reason Text Area */}
            <div className="mb-4 text-left">
              <label className="block text-xs font-bold text-neutral-700 mb-1">Reason for Claiming One Day Wages</label>
              <textarea
                value={wagesReason}
                onChange={(e) => setWagesReason(e.target.value)}
                placeholder="Enter justification for working on weekend/holiday..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none placeholder-neutral-400 bg-neutral-50/50 font-semibold"
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={submitResolveWeekend}
                disabled={isSubmittingWages}
                className="w-full text-center px-4 py-3 rounded-xl border border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold transition-all flex justify-center items-center"
              >
                {isSubmittingWages ? "Submitting..." : "Claim One Day Wages"}
              </button>

              <button
                onClick={() => setResolvingWeekendCell(null)}
                disabled={isSubmittingWages}
                className="w-full text-center px-4 py-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-bold transition-all flex justify-center items-center"
              >
                Keep as Weekoff / Holiday
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Regularization / Time Adjustment Modal */}
      {regularizingCell && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-neutral-200 shadow-2xl animate-scaleIn">
            <h3 className="text-[16px] font-extrabold text-neutral-900 mb-2">Request Time Adjustment</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Submit check-in/check-out corrections for <strong className="text-neutral-850 font-bold">{formatDateStr(regularizingCell.dateStr)}</strong>:
            </p>

            {/* Time Pickers */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-left">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Check-In</label>
                <TimePicker
                  value={regCheckIn}
                  onChange={(val) => setRegCheckIn(val)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Check-Out</label>
                <TimePicker
                  value={regCheckOut}
                  onChange={(val) => setRegCheckOut(val)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Reason Text Area */}
            <div className="mb-4 text-left">
              <label className="block text-xs font-bold text-neutral-700 mb-1">Reason for Adjustment</label>
              <textarea
                value={regReason}
                onChange={(e) => setRegReason(e.target.value)}
                placeholder="Enter justification for time change request..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none placeholder-neutral-400 bg-neutral-50/50 font-semibold"
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={submitRegularizationRequest}
                disabled={isSubmittingReg}
                className="w-full text-center px-4 py-3 rounded-xl border border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold transition-all flex justify-center items-center"
              >
                {isSubmittingReg ? "Submitting..." : "Submit Adjustment Request"}
              </button>

              <button
                onClick={() => setRegularizingCell(null)}
                disabled={isSubmittingReg}
                className="w-full text-center px-4 py-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-bold transition-all flex justify-center items-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTab;

