import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  XMarkIcon,
  UserMinusIcon,
  CalendarIcon,
  ListBulletIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import StatCard from '../components/StatCard';
import { Attendance } from '../../../types/employee.types';
import { Card } from '../../../components/ui/Card';
import apiService from '../../../services/api';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({ attendanceData: initialAttendanceProp = [], currentEmployee }) => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [viewMode, setViewMode] = useState<"calendar" | "grid">("calendar");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Fetched data
  const [monthlyAttendance, setMonthlyAttendance] = useState<any[]>([]);
  const [monthlySchedule, setMonthlySchedule] = useState<any[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

      const [attendanceRes, currentHolidaysRes, prevHolidaysRes, leavesRes] = await Promise.all([
        userId 
          ? apiService.get(`/attendance/history/${userId}`, { params: { start_date: startDateStr } }).catch(() => ({ data: [] })) 
          : Promise.resolve({ data: [] }),
        apiService.get(`/employee/holidays`, { params: { month: selectedMonth, year: selectedYear } }).catch(() => ({ data: {} })),
        apiService.get(`/employee/holidays`, { params: { month: prevMonth, year: prevYear } }).catch(() => ({ data: {} })),
        apiService.get(`/leaves/`).catch(() => ({ data: [] }))
      ]);

      const attData = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
      setMonthlyAttendance(attData);

      const currentSched = currentHolidaysRes.data?.current_month_schedule || [];
      const prevSched = prevHolidaysRes.data?.current_month_schedule || [];
      const combinedSched = [...prevSched, ...currentSched];
      setMonthlySchedule(combinedSched);

      const allLeaves = Array.isArray(leavesRes.data) ? leavesRes.data : [];
      const myApprovedLeaves = allLeaves.filter((l: any) => {
        if (l.status !== "Approved" || l.request_type !== "Leave") return false;
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
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
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
      if (l.request_type === "Permission") return l.permission_date === dateStr;
      return l.from_date <= dateStr && l.to_date >= dateStr;
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
    let workingHours = 0;
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

    if (attRec) {
      checkIn = attRec.checkIn || attRec.check_in || "-";
      checkOut = attRec.checkOut || attRec.check_out || "-";
      cardCheckIn = attRec.cardCheckIn || attRec.card_check_in || "-";
      cardCheckOut = attRec.cardCheckOut || attRec.card_check_out || "-";
      workingHours = Number(attRec.workingHours || attRec.working_hours || 0);
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

    if (isCompanyHoliday) {
      status = "Holiday";
      badgeLabel = holidayName || "Company Holiday";
      badgeEmoji = "";
    } else if (isWeeklyOff) {
      status = "Weekly Off";
      badgeLabel = "Week Off";
      badgeEmoji = "";
    } else if (matchedLeave) {
      status = "Leave";
      badgeLabel = matchedLeave.leave_type || "Approved Leave";
      badgeEmoji = "";
      leaveType = matchedLeave.leave_type;
      leaveReason = matchedLeave.reason;
    } else if (attRec && (attRec.status?.toLowerCase() === "present" || (checkIn !== "-" && checkIn !== ""))) {
      // Present vs Half Day threshold (4 hrs) — applies to both checked-out and still-active sessions
      if (workingHours > 0 && workingHours < 4) {
        status = "Half Day";
        badgeLabel = "Half Day";
        badgeEmoji = "";
      } else {
        status = "Present";
        badgeLabel = "Present";
        badgeEmoji = "";
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
      rawAttendanceRecord: attRec
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Monthly Summary Calculations
  const presentCount = daysDataList.filter(d => d.status === "Present").length;
  const absentCount = daysDataList.filter(d => d.status === "Absent").length;
  const leaveCount = daysDataList.filter(d => d.status === "Leave").length;
  const halfDayCount = daysDataList.filter(d => d.status === "Half Day").length;
  const weeklyOffCount = daysDataList.filter(d => d.status === "Weekly Off").length;
  const holidayCount = daysDataList.filter(d => d.status === "Holiday").length;
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
    <div className="space-y-6">
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

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={CheckCircleIcon} title="Present Days" value={presentCount} subtitle="" trend="normal" color="green" />
        <StatCard icon={UserMinusIcon} title="Absent Days (LOP)" value={absentCount} subtitle="" trend="normal" color="red" />
        <StatCard icon={CalendarDaysIcon} title="Paid Leave" value={leaveCount} subtitle="" trend="normal" color="purple" />
        <StatCard icon={ClockIcon} title="Half Days" value={halfDayCount} subtitle="" trend="normal" color="yellow" />
        <StatCard icon={CheckCircleIcon} title="Holidays" value={holidayCount} subtitle="" trend="normal" color="blue" />
        <StatCard icon={CalendarDaysIcon} title="Weekends" value={weeklyOffCount} subtitle="" trend="normal" color="gray" />
      </div>

      {/* Main Content Card */}
      <Card padding="none" className="border border-neutral-200 shadow-sm rounded-2xl bg-white">
        {/* Toolbar Header */}
        <div className="p-5 border-b border-neutral-200 bg-neutral-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-t-2xl">
          {/* Left: Active Month Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-neutral-850">
                {new Date(selectedYear, selectedMonth - 2, 25).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(selectedYear, selectedMonth - 1, 24).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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

            {/* Prev / Next Month Arrows */}
            <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl p-0.5 shadow-xs">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
                title="Previous Month"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
                title="Next Month"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

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

            {/* Month Selector */}
            {/* <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-xs"
            >
              {MONTH_NAMES.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>{mName}</option>
              ))}
            </select> */}

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
          </div>
        </div>

        {/* Mode 1: Calendar View */}
        {viewMode === "calendar" ? (
          <div className="p-5 max-w-[1000px] mx-auto space-y-4 relative z-10">
            {/* 7-Column Weekday Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-2 text-center text-[12px] font-bold text-neutral-400 uppercase tracking-widest">
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

                return (
                  <div
                    key={cell.dateStr}
                    className={`h-[80px] p-2 flex flex-col justify-between rounded-xl border relative group cursor-default transition-all duration-200 hover:z-50 ${cell.isToday
                        ? "border-primary-500 shadow-sm bg-white"
                        : cell.status === "Future"
                          ? "border-transparent bg-transparent"
                          : "border-neutral-100 bg-white hover:border-neutral-200 hover:shadow-sm"
                      }`}
                  >
                    {/* Top Row: Date Number */}
                    <div className="flex justify-between items-start">
                      <span className={`text-[12px] font-bold flex items-center justify-center rounded-full ${cell.isToday
                          ? "bg-primary-500 text-white w-6 h-6 shadow-sm"
                          : cell.status === "Future"
                            ? "text-neutral-300"
                            : "text-neutral-700"
                        }`}>
                        {cell.dayNum}
                      </span>
                    </div>

                    {/* Status Tag */}
                    {cell.status !== "Future" && (
                      <div className="mt-1 w-full flex justify-start">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 w-full ${badgeClass}`}>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${badgeClass.includes("emerald") ? "bg-emerald-500" : badgeClass.includes("rose") ? "bg-rose-500" : badgeClass.includes("amber") ? "bg-amber-500" : badgeClass.includes("blue") ? "bg-blue-500" : badgeClass.includes("primary") ? "bg-primary-500" : "bg-neutral-400"}`}></div>
                          <span className="truncate">{cell.badgeLabel || cell.status}</span>
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
                          </span>
                        </div>

                        {/* Details Breakdown */}
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
                          </div>
                        ) : cell.status === "Holiday" ? (
                          <div className="space-y-1 bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-blue-900">
                            <span className="text-[10px] uppercase font-bold text-blue-500 block">Company Holiday</span>
                            <p className="font-bold text-[13px] text-blue-800">{cell.holidayName}</p>
                          </div>
                        ) : cell.status === "Leave" ? (
                          <div className="space-y-1 bg-primary-500/10 p-3 rounded-xl border border-primary-500/20 text-primary-500">
                            <span className="text-[10px] uppercase font-bold text-primary-500 block">Approved Leave</span>
                            <p className="font-bold text-[13px] text-primary-500">{cell.leaveType}</p>
                          </div>
                        ) : cell.status === "Weekly Off" ? (
                          <div className="text-[12px] text-neutral-500 text-center py-3 bg-neutral-50 rounded-xl font-bold border border-neutral-100">
                            Week Off ({cell.fullDayName})
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
                <tr className="border-b border-neutral-200 text-neutral-400 text-[10px] font-extrabold uppercase tracking-widest bg-neutral-50/40">
                  <th rowSpan={2} className="p-3 pl-6 border-r border-neutral-100 text-left">Date</th>
                  <th rowSpan={2} className="p-3 border-r border-neutral-100 text-left">Day</th>
                  
                  <th colSpan={3} className="p-2.5 text-center border-r border-b-2 border-cyan-500 bg-cyan-50/20 text-cyan-700 text-[11px] font-black">
                    Web Site Entry
                  </th>
                  
                  <th colSpan={2} className="p-2.5 text-center border-r border-b-2 border-violet-500 bg-violet-50/25 text-violet-700 text-[11px] font-black">
                    Biometric Card Entry
                  </th>
                  
                  <th rowSpan={2} className="p-3 border-r border-neutral-100 text-center text-neutral-600 font-extrabold">
                    Breaks <div className="text-[9px] text-neutral-400 font-bold normal-case">(L/T)</div>
                  </th>
                  
                  <th rowSpan={2} className="p-3 border-r border-neutral-100 text-center">Status</th>
                  <th rowSpan={2} className="p-3 border-r border-neutral-100 text-left">Shift</th>
                  <th rowSpan={2} className="p-3 text-center pr-6">Overtime</th>
                </tr>
                {/* Sub Headers */}
                <tr className="border-b border-neutral-200 text-neutral-500 text-[10px] font-extrabold uppercase tracking-wider bg-white">
                  {/* Web Site Entry columns */}
                  <th className="p-2 text-center text-cyan-600">Check-In</th>
                  <th className="p-2 text-center text-cyan-600">Check-Out</th>
                  <th className="p-2 text-center text-cyan-600 border-r border-neutral-100">Hours</th>
                  {/* Biometric Card Entry columns */}
                  <th className="p-2 text-center text-violet-600">Check-In</th>
                  <th className="p-2 text-center text-violet-600 border-r border-neutral-100">Check-Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs font-semibold text-neutral-700 bg-white">
                {filteredGridDays.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-10 text-center text-neutral-400 font-semibold bg-neutral-50/20">
                      No attendance records matching status filter "{statusFilter}".
                    </td>
                  </tr>
                ) : (
                  filteredGridDays.map((dayObj) => (
                    <tr
                      key={dayObj.dateStr}
                      className="hover:bg-primary-500/5 transition-colors border-b border-neutral-100"
                    >
                      <td className="p-3 pl-6 font-bold text-neutral-900 border-r border-neutral-100/50">{dayObj.dateStr}</td>
                      <td className="p-3 text-neutral-500 border-r border-neutral-100/50 font-bold">{dayObj.dayName}</td>
                      
                      {/* Web Site Entry */}
                      <td className="p-3 text-center text-neutral-800 font-bold">{dayObj.checkIn}</td>
                      <td className="p-3 text-center text-neutral-800 font-bold">{dayObj.checkOut}</td>
                      <td className="p-3 text-center text-cyan-600 font-black border-r border-neutral-100/50">
                        {dayObj.status === "Present" || dayObj.status === "Half Day" ? dayObj.workingHoursFormatted : "—"}
                      </td>
                      
                      {/* Biometric Card Entry */}
                      <td className="p-3 text-center text-neutral-800 font-bold">{dayObj.cardCheckIn || "-"}</td>
                      <td className="p-3 text-center text-neutral-800 font-bold border-r border-neutral-100/50">{dayObj.cardCheckOut || "-"}</td>
                      
                      {/* Breaks */}
                      <td className="p-3 text-center font-bold text-neutral-600 border-r border-neutral-100/50">
                        {(dayObj.lunchMinutes || dayObj.teaMinutes) ? `${dayObj.lunchMinutes}m / ${dayObj.teaMinutes}m` : "—"}
                      </td>
                      
                      {/* Status */}
                      <td className="p-3 text-center border-r border-neutral-100/50">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${dayObj.status === "Present" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                          dayObj.status === "Absent" ? "bg-rose-100 text-rose-800 border-rose-300" :
                            dayObj.status === "Half Day" ? "bg-amber-100 text-amber-800 border-amber-300" :
                              dayObj.status === "Leave" ? "bg-primary-500/15 text-primary-500 border-primary-500/30" :
                                dayObj.status === "Holiday" ? "bg-blue-100 text-blue-800 border-blue-300" :
                                  "bg-neutral-200 text-neutral-700 border-neutral-300"
                          }`}>
                          <span>{dayObj.badgeEmoji}</span>
                          <span>{dayObj.status}</span>
                        </span>
                      </td>
                      
                      {/* Shift */}
                      <td className="p-3 text-neutral-750 font-extrabold border-r border-neutral-100/50 truncate max-w-[170px]">{dayObj.shift}</td>
                      
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
    </div>
  );
};

export default AttendanceTab;
