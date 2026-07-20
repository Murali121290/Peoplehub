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
  workingHours: number; // in hours float
  workingHoursFormatted: string; // e.g. "9h 13m"
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

const AttendanceTab: React.FC<AttendanceTabProps> = ({ attendanceData: initialAttendanceProp = [] }) => {
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
  const [selectedDayDetails, setSelectedDayDetails] = useState<DayDetails | null>(null);

  // Load user info
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : {};
  const userId = localStorage.getItem("user_id") || user.id || user.user_id;
  const employeeId = user.employee_id || user.id;

  const fetchMonthData = async () => {
    setIsLoading(true);
    try {
      const [attendanceRes, holidaysRes, leavesRes] = await Promise.all([
        userId ? apiService.get(`/attendance/history/${userId}`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        apiService.get(`/employee/holidays`, { params: { month: selectedMonth, year: selectedYear } }).catch(() => ({ data: {} })),
        apiService.get(`/leaves/`).catch(() => ({ data: [] }))
      ]);

      const attData = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
      setMonthlyAttendance(attData);

      const sched = holidaysRes.data?.current_month_schedule || [];
      setMonthlySchedule(sched);

      const allLeaves = Array.isArray(leavesRes.data) ? leavesRes.data : [];
      const myApprovedLeaves = allLeaves.filter((l: any) => 
        (String(l.employee_id) === String(employeeId) || String(l.employee_id) === String(userId)) &&
        l.status === "Approved"
      );
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

  // Compute all days for the calendar month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0 (Sun) - 6 (Sat)

  // Build daily data map
  const daysDataList: DayDetails[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(selectedYear, selectedMonth - 1, day);
    const dayOfWeekIdx = dateObj.getDay();
    const dayName = WEEKDAYS[dayOfWeekIdx];
    const fullDayName = FULL_WEEKDAYS[dayOfWeekIdx];
    const isToday = dateStr === todayKey;
    const isFuture = dateStr > todayKey;

    // Check Priority Rules:
    // 1. Published Holiday
    const schedDay = monthlySchedule.find((s: any) => s.date === dateStr);
    const isHoliday = schedDay?.is_holiday;
    const holidayName = schedDay?.holiday_name || "Company Holiday";
    const holidayType = schedDay?.holiday_type || "Holiday";

    // 2. Approved Leave
    const matchedLeave = approvedLeaves.find((l: any) => {
      if (l.request_type === "Permission") return l.permission_date === dateStr;
      return l.from_date <= dateStr && l.to_date >= dateStr;
    });

    // 3. Weekly Off
    const isWeeklyOff = schedDay?.is_weekend;

    // 4. Attendance Record (Present / Half Day)
    const attRec = monthlyAttendance.find((a: any) => a.date === dateStr);

    let status: DayDetails["status"] = "Absent";
    let badgeLabel = "Absent";
    let badgeEmoji = "🔴";
    let checkIn = "-";
    let checkOut = "-";
    let workingHours = 0;
    let workingHoursFormatted = "0h";
    let leaveType = undefined;
    let leaveReason = undefined;
    let shift = user.shift_timing || "General Shift (09:00 AM - 06:00 PM)";
    let lateBy = "00:00";
    let earlyOut = "00:00";
    let overtime = "00:00";
    let source = "Web App";
    let managerStatus = "Approved";

    if (attRec) {
      checkIn = attRec.checkIn || attRec.check_in || "-";
      checkOut = attRec.checkOut || attRec.check_out || "-";
      workingHours = Number(attRec.workingHours || attRec.working_hours || 0);
      workingHoursFormatted = formatHoursMinutes(workingHours);
      if (attRec.shift) shift = attRec.shift;
      if (attRec.managerStatus) managerStatus = attRec.managerStatus;

      // Overtime calculation sample (>8h)
      if (workingHours > 8) {
        const otVal = workingHours - 8;
        overtime = formatHoursMinutes(otVal);
      }
    }

    if (isHoliday) {
      status = "Holiday";
      badgeLabel = holidayName;
      badgeEmoji = "🔵";
    } else if (matchedLeave) {
      status = "Leave";
      badgeLabel = matchedLeave.leave_type || "Approved Leave";
      badgeEmoji = "🟣";
      leaveType = matchedLeave.leave_type;
      leaveReason = matchedLeave.reason;
    } else if (isWeeklyOff) {
      status = "Weekly Off";
      badgeLabel = schedDay?.holiday_type || fullDayName;
      badgeEmoji = "⚫";
    } else if (attRec && (attRec.status?.toLowerCase() === "present" || (checkIn !== "-" && checkIn !== ""))) {
      // Present vs Half Day threshold (4 hrs)
      if (workingHours > 0 && workingHours < 4) {
        status = "Half Day";
        badgeLabel = "Half Day";
        badgeEmoji = "🟠";
      } else {
        status = "Present";
        badgeLabel = "Present";
        badgeEmoji = "🟢";
      }
    } else if (isFuture) {
      status = "Future";
      badgeLabel = "Upcoming";
      badgeEmoji = "⚪";
    } else {
      // Past working day with no attendance
      status = "Absent";
      badgeLabel = "Absent";
      badgeEmoji = "🔴";
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
      workingHours,
      workingHoursFormatted,
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
  }

  // Monthly Summary Calculations
  const presentCount = daysDataList.filter(d => d.status === "Present").length;
  const absentCount = daysDataList.filter(d => d.status === "Absent").length;
  const leaveCount = daysDataList.filter(d => d.status === "Leave").length;
  const halfDayCount = daysDataList.filter(d => d.status === "Half Day").length;
  const weeklyOffCount = daysDataList.filter(d => d.status === "Weekly Off").length;
  const totalWorkedAndAbsent = presentCount + halfDayCount + absentCount;
  const attendancePercentage = totalWorkedAndAbsent > 0
    ? Math.round(((presentCount + (halfDayCount * 0.5)) / totalWorkedAndAbsent) * 100)
    : 100;

  // Filtered Grid View records
  const filteredGridDays = daysDataList.filter(d => {
    if (d.status === "Future") return false;
    if (statusFilter === "All") return true;
    return d.status.toLowerCase() === statusFilter.toLowerCase();
  });

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
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
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
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              viewMode === "calendar"
                ? "bg-white text-indigo-700 shadow-sm border border-neutral-200 font-extrabold"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <CalendarIcon className="w-4 h-4" /> Calendar View
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              viewMode === "grid"
                ? "bg-white text-indigo-700 shadow-sm border border-neutral-200 font-extrabold"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <ListBulletIcon className="w-4 h-4" /> Grid View
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard icon={CheckCircleIcon} title="Present Days" value={presentCount} subtitle={`${MONTH_NAMES[selectedMonth - 1]}`} trend="positive" color="green" />
        <StatCard icon={UserMinusIcon} title="Absent Days" value={absentCount} subtitle={`${MONTH_NAMES[selectedMonth - 1]}`} trend="negative" color="red" />
        <StatCard icon={CalendarDaysIcon} title="Leave Days" value={leaveCount} subtitle={`${MONTH_NAMES[selectedMonth - 1]}`} trend="normal" color="purple" />
        <StatCard icon={ClockIcon} title="Half Days" value={halfDayCount} subtitle={`${MONTH_NAMES[selectedMonth - 1]}`} trend="warning" color="yellow" />
        <StatCard icon={CalendarIcon} title="Weekly Offs" value={weeklyOffCount} subtitle={`${MONTH_NAMES[selectedMonth - 1]}`} trend="normal" color="blue" />
        <StatCard icon={ChartBarIcon} title="Attendance %" value={`${attendancePercentage}%`} subtitle={`${MONTH_NAMES[selectedMonth - 1]}`} trend="positive" color="blue" />
      </div>

      {/* Main Content Card */}
      <Card padding="none" className="overflow-hidden border border-neutral-200 shadow-sm rounded-2xl bg-white">
        {/* Toolbar Header */}
        <div className="p-5 border-b border-neutral-200 bg-neutral-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Active Month Title */}
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-neutral-850">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </h3>
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
              className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-xs"
            >
              {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-xs"
            >
              {MONTH_NAMES.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>{mName}</option>
              ))}
            </select>

            {/* Status Filter (for Grid view & highlighting) */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-xs"
            >
              <option value="All">All Statuses</option>
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
          <div className="p-6 space-y-6">
            {/* 7-Column Weekday Header */}
            <div className="grid grid-cols-7 border-t border-l border-neutral-200">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-2.5 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider border-b border-r border-neutral-200 bg-neutral-50/50">
                  {wd}
                </div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 border-l border-neutral-200 bg-neutral-200 gap-px">
              {calendarCells.map((cell, idx) => {
                if (!cell) {
                  return (
                    <div key={`empty-${idx}`} className="bg-neutral-50/30 min-h-[120px] p-2 border-r border-b border-neutral-200 opacity-40" />
                  );
                }

                // Color themes based on status
                let cellBgClass = "bg-white border-neutral-200";
                let badgeClass = "bg-neutral-100 text-neutral-700 border-neutral-200";

                switch (cell.status) {
                  case "Present":
                    cellBgClass = "bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70";
                    badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
                    break;
                  case "Absent":
                    cellBgClass = "bg-rose-50/70 border-rose-200 hover:bg-rose-100/70";
                    badgeClass = "bg-rose-100 text-rose-800 border-rose-300 font-bold";
                    break;
                  case "Half Day":
                    cellBgClass = "bg-amber-50/70 border-amber-200 hover:bg-amber-100/70";
                    badgeClass = "bg-amber-100 text-amber-800 border-amber-300 font-bold";
                    break;
                  case "Leave":
                    cellBgClass = "bg-purple-50/70 border-purple-200 hover:bg-purple-100/70";
                    badgeClass = "bg-purple-100 text-purple-800 border-purple-300 font-bold";
                    break;
                  case "Holiday":
                    cellBgClass = "bg-blue-50/70 border-blue-200 hover:bg-blue-100/70";
                    badgeClass = "bg-blue-100 text-blue-800 border-blue-300 font-bold";
                    break;
                  case "Weekly Off":
                    cellBgClass = "bg-neutral-100/70 border-neutral-200 hover:bg-neutral-200/50";
                    badgeClass = "bg-neutral-200 text-neutral-700 border-neutral-300 font-bold";
                    break;
                  case "Future":
                    cellBgClass = "bg-white text-neutral-400";
                    badgeClass = "bg-neutral-50 text-neutral-400 border-neutral-200";
                    break;
                }

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => setSelectedDayDetails(cell)}
                    className={`min-h-[125px] p-2.5 transition-all flex flex-col justify-between cursor-pointer border-r border-b relative group ${cellBgClass} ${
                      cell.isToday ? "ring-2 ring-indigo-500 ring-inset z-10" : ""
                    }`}
                  >
                    {/* Top Row: Date Number & Badge */}
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-extrabold w-7 h-7 flex items-center justify-center rounded-full ${
                        cell.isToday ? "bg-indigo-600 text-white shadow-xs" : "text-neutral-800"
                      }`}>
                        {cell.dayNum}
                      </span>

                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${badgeClass} truncate max-w-[110px]`}>
                        <span className="truncate">{cell.badgeLabel}</span>
                      </span>
                    </div>

                    {/* Middle / Bottom Content: Check-in/out & Hours */}
                    <div className="mt-2 space-y-1 text-xs">
                      {cell.status === "Present" || cell.status === "Half Day" ? (
                        <>
                          <div className="flex justify-between text-neutral-600 font-medium text-[11px]">
                            <span>IN: <strong className="text-neutral-900">{cell.checkIn}</strong></span>
                          </div>
                          <div className="flex justify-between text-neutral-600 font-medium text-[11px]">
                            <span>OUT: <strong className="text-neutral-900">{cell.checkOut}</strong></span>
                          </div>
                          <div className="pt-1 text-right border-t border-black/5 font-extrabold text-indigo-700 text-[11px]">
                            {cell.workingHoursFormatted}
                          </div>
                        </>
                      ) : cell.status === "Absent" ? (
                        <div className="py-2 text-center text-[11px]">
                          <p className="font-bold text-rose-700">No Check-In</p>
                          <p className="text-[10px] text-rose-500 font-semibold mt-0.5">0h</p>
                        </div>
                      ) : cell.status === "Leave" ? (
                        <div className="py-1 text-[11px]">
                          <p className="font-bold text-purple-900 truncate">{cell.badgeLabel}</p>
                          <p className="text-[10px] text-purple-600 font-medium">Approved Leave</p>
                        </div>
                      ) : cell.status === "Holiday" ? (
                        <div className="py-1 text-[11px]">
                          <p className="font-bold text-blue-900 truncate">{cell.holidayName}</p>
                          <p className="text-[10px] text-blue-600 font-medium">{cell.holidayType || "Holiday"}</p>
                        </div>
                      ) : cell.status === "Weekly Off" ? (
                        <div className="py-1 text-center text-[11px] text-neutral-500 font-semibold">
                          {cell.badgeLabel}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-neutral-600 pt-3 border-t border-neutral-100">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></div> Present</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#E11D48]"></div> Absent</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></div> Half Day</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#9333EA]"></div> Leave</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></div> Holiday</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#64748B]"></div> Weekly Off</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200"></div> Today</span>
            </div>
          </div>
        ) : (
          /* Mode 2: Grid View */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-6">Date</th>
                  <th className="p-3.5">Day</th>
                  <th className="p-3.5">Check-In</th>
                  <th className="p-3.5">Check-Out</th>
                  <th className="p-3.5 text-center">Working Hours</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5">Shift</th>
                  <th className="p-3.5 text-center">Late By</th>
                  <th className="p-3.5 text-center">Early Out</th>
                  <th className="p-3.5 text-center pr-6">Overtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs font-medium text-neutral-700">
                {filteredGridDays.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-neutral-400 font-semibold bg-neutral-50/20">
                      No attendance records matching status filter "{statusFilter}".
                    </td>
                  </tr>
                ) : (
                  filteredGridDays.map((dayObj) => (
                    <tr
                      key={dayObj.dateStr}
                      onClick={() => setSelectedDayDetails(dayObj)}
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 pl-6 font-bold text-neutral-900">{dayObj.dateStr}</td>
                      <td className="p-3.5 text-neutral-500">{dayObj.dayName}</td>
                      <td className="p-3.5 font-semibold text-neutral-800">{dayObj.checkIn}</td>
                      <td className="p-3.5 font-semibold text-neutral-800">{dayObj.checkOut}</td>
                      <td className="p-3.5 text-center font-bold text-indigo-700">
                        {dayObj.workingHoursFormatted}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          dayObj.status === "Present" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                          dayObj.status === "Absent" ? "bg-rose-100 text-rose-800 border-rose-300" :
                          dayObj.status === "Half Day" ? "bg-amber-100 text-amber-800 border-amber-300" :
                          dayObj.status === "Leave" ? "bg-purple-100 text-purple-800 border-purple-300" :
                          dayObj.status === "Holiday" ? "bg-blue-100 text-blue-800 border-blue-300" :
                          "bg-neutral-200 text-neutral-700 border-neutral-300"
                        }`}>
                          <span>{dayObj.badgeEmoji}</span>
                          <span>{dayObj.status}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-neutral-600 font-medium truncate max-w-[150px]">{dayObj.shift}</td>
                      <td className="p-3.5 text-center text-neutral-500">{dayObj.lateBy}</td>
                      <td className="p-3.5 text-center text-neutral-500">{dayObj.earlyOut}</td>
                      <td className="p-3.5 text-center pr-6 font-bold text-emerald-700">{dayObj.overtime}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Centered Popup Details Modal */}
      <AnimatePresence>
        {selectedDayDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
                <div>
                  <h3 className="text-lg font-bold text-neutral-850">
                    {selectedDayDetails.dayNum} {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </h3>
                  <p className="text-xs text-neutral-400 font-semibold mt-0.5">{selectedDayDetails.fullDayName}</p>
                </div>
                <button
                  onClick={() => setSelectedDayDetails(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body Details */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Status Badge */}
                <div className="p-3.5 rounded-xl border flex items-center justify-between bg-neutral-50/50 border-neutral-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Attendance Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                    selectedDayDetails.status === "Present" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                    selectedDayDetails.status === "Absent" ? "bg-rose-100 text-rose-800 border-rose-300" :
                    selectedDayDetails.status === "Half Day" ? "bg-amber-100 text-amber-800 border-amber-300" :
                    selectedDayDetails.status === "Leave" ? "bg-purple-100 text-purple-800 border-purple-300" :
                    selectedDayDetails.status === "Holiday" ? "bg-blue-100 text-blue-800 border-blue-300" :
                    "bg-neutral-200 text-neutral-800 border-neutral-300"
                  }`}>
                    <span>{selectedDayDetails.status}</span>
                  </span>
                </div>

                {/* Details Breakdown */}
                {selectedDayDetails.status === "Absent" ? (
                  <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 text-rose-900 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider border-b border-rose-200/80 pb-2 text-rose-800">Absent Details</h4>
                    <div className="flex justify-between text-xs">
                      <span className="text-rose-600 font-medium">Check-In</span>
                      <span className="font-bold">Not Available</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-rose-600 font-medium">Check-Out</span>
                      <span className="font-bold">Not Available</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-rose-600 font-medium">Working Hours</span>
                      <span className="font-bold">0h</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-rose-600 font-medium">Reason</span>
                      <span className="font-bold">No Attendance Record</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/40">
                        <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Check-In</span>
                        <span className="text-neutral-900 font-extrabold text-sm">{selectedDayDetails.checkIn}</span>
                      </div>
                      <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/40">
                        <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Check-Out</span>
                        <span className="text-neutral-900 font-extrabold text-sm">{selectedDayDetails.checkOut}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/20 flex justify-between items-center">
                      <span className="font-bold text-neutral-700">Total Working Hours</span>
                      <span className="text-sm font-extrabold text-indigo-700">{selectedDayDetails.workingHoursFormatted}</span>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-neutral-100">
                      <div className="flex justify-between py-1 border-b border-neutral-100">
                        <span className="text-neutral-500 font-medium">Shift</span>
                        <span className="font-bold text-neutral-800">{selectedDayDetails.shift}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-neutral-100">
                        <span className="text-neutral-500 font-medium">Late By</span>
                        <span className="font-bold text-neutral-800">{selectedDayDetails.lateBy}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-neutral-100">
                        <span className="text-neutral-500 font-medium">Early Out</span>
                        <span className="font-bold text-neutral-800">{selectedDayDetails.earlyOut}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-neutral-100">
                        <span className="text-neutral-500 font-medium">Overtime</span>
                        <span className="font-bold text-emerald-700">{selectedDayDetails.overtime}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-neutral-100">
                        <span className="text-neutral-500 font-medium">Attendance Source</span>
                        <span className="font-bold text-neutral-800">{selectedDayDetails.source}</span>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-neutral-500 font-medium">Manager Status</span>
                        <span className="font-bold text-neutral-800">{selectedDayDetails.managerStatus}</span>
                      </div>
                    </div>

                    {selectedDayDetails.holidayName && (
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-blue-600">Company Holiday</span>
                        <p className="text-xs font-bold">{selectedDayDetails.holidayName}</p>
                      </div>
                    )}

                    {selectedDayDetails.leaveType && (
                      <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-purple-600">Approved Leave</span>
                        <p className="text-xs font-bold">{selectedDayDetails.leaveType}</p>
                        {selectedDayDetails.leaveReason && (
                          <p className="text-[11px] text-purple-700 italic">"{selectedDayDetails.leaveReason}"</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AttendanceTab;
