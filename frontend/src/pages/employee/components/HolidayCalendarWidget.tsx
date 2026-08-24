import React, { useState, useEffect } from "react";
import { Card } from "../../../components/ui/Card";
import {
  CalendarIcon,
  ListBulletIcon,
  ClockIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import apiService from "../../../services/api";
import { formatDateStr } from "../../../utils/date";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const HolidayCalendarWidget: React.FC = () => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const [schedule, setSchedule] = useState<any[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([]);
  const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([]);
  const [selectedDateEventsModal, setSelectedDateEventsModal] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchHolidayCalendar();
  }, [selectedMonth, selectedYear]);

  const fetchHolidayCalendar = async () => {
    setIsLoading(true);
    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : {};

      const [holidaysRes, leavesRes] = await Promise.all([
        apiService.get(`/employee/holidays`, {
          params: { month: selectedMonth, year: selectedYear }
        }),
        apiService.get(`/leaves/`).catch(() => ({ data: [] }))
      ]);

      setSchedule(holidaysRes.data.current_month_schedule || []);
      setUpcomingHolidays(holidaysRes.data.upcoming_holidays || []);

      const myEmpId = user.employee_id || user.id;
      const allLeaves = Array.isArray(leavesRes.data) ? leavesRes.data : [];
      const myLeaves = allLeaves.filter((l: any) => 
        String(l.employee_id) === String(myEmpId) || 
        String(l.employee_id) === String(user.id)
      );
      setEmployeeLeaves(myLeaves);
    } catch (err) {
      console.error("Error fetching holidays/leaves for profile widget:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Generate calendar grid alignment
  const firstDayIndex = schedule.length > 0 
    ? new Date(schedule[0].date).getDay() 
    : 0;

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (const day of schedule) {
    calendarDays.push(day);
  }

  const getHolidayTypeBadge = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("national")) return "bg-red-50 text-red-700 border-red-100";
    if (t.includes("weekly off")) return "bg-slate-50 text-slate-600 border-slate-100";
    if (t.includes("festival")) return "bg-violet-50 text-violet-700 border-violet-100";
    return "bg-amber-50 text-amber-700 border-amber-100";
  };

  const getHolidayDotColor = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("national")) return "bg-red-500";
    if (t.includes("weekly off")) return "bg-slate-400";
    if (t.includes("festival")) return "bg-violet-500";
    return "bg-amber-500";
  };

  const todayStr = today.toISOString().split("T")[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      {/* Main Calendar View / List widget */}
      <Card className="lg:col-span-2 shadow-sm rounded-2xl border border-neutral-200 p-6 flex flex-col min-h-[460px] bg-white">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-100 pb-5 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-500/10 rounded-xl text-primary-500">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-md font-bold text-neutral-850">Leave &amp; Holiday Timeline</h3>
              <p className="text-xs text-neutral-400 font-medium mt-0.5">Interactive calendar of your leave requests and company holiday schedule</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Nav Arrows */}
            <div className="flex items-center gap-1.5 border border-neutral-200 rounded-xl p-1 bg-white">
              <button 
                onClick={handlePrevMonth} 
                className="p-1.5 rounded-lg hover:bg-neutral-50 text-neutral-500 transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-neutral-700 min-w-[100px] text-center">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>
              <button 
                onClick={handleNextMonth} 
                className="p-1.5 rounded-lg hover:bg-neutral-50 text-neutral-500 transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            {/* View switcher */}
            <div className="flex bg-neutral-100 border border-neutral-200/50 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("calendar")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "calendar" 
                    ? "bg-white text-primary-500 shadow-xs" 
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
                title="Calendar view"
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "list" 
                    ? "bg-white text-primary-500 shadow-xs" 
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
                title="List view"
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        {viewMode === "calendar" && !isLoading && (
          <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-neutral-500 mb-4 px-2">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success-600"></div> Approved</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-danger-600"></div> Rejected</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-warning-500"></div> Pending</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-neutral-400"></div> Cancelled</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-600"></div> Half-Day</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary-500"></div> Holiday</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-neutral-300"></div> Weekly Off</span>
          </div>
        )}

        {/* Calendar layout */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-neutral-400">
            <svg className="animate-spin h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : viewMode === "calendar" ? (
          <div className="flex-1 flex flex-col">
            {/* Weekdays */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
              {WEEKDAY_NAMES.map(day => (
                <div key={day} className="py-2">{day}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 flex-1 border-t border-l border-neutral-100 rounded-b-xl overflow-hidden">
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="bg-neutral-50/30 border-r border-b border-neutral-100 min-h-[64px]" />;
                }

                const isTodayDate = day.date === todayStr;
                const isHoliday = day.is_holiday;
                const isWeeklyOff = isHoliday && day.holiday_type?.toLowerCase().includes("weekly off");
                const parsedDate = new Date(day.date);
                const dayNum = parsedDate.getDate();

                // Leaves on this date
                const leavesOnDate = employeeLeaves.filter((l: any) => {
                  if (l.request_type === "Permission") return l.permission_date === day.date;
                  const isCancelled = l.cancelled_dates?.includes(day.date);
                  return l.from_date <= day.date && l.to_date >= day.date && !isCancelled;
                });

                return (
                  <div
                    key={day.date}
                    onClick={() => {
                      setSelectedDateEventsModal({
                        dateStr: day.date,
                        formattedDate: `${dayNum} ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`,
                        leaves: leavesOnDate,
                        holiday: isHoliday ? day : null,
                      });
                    }}
                    className={`border-r border-b border-neutral-100 p-1.5 min-h-[85px] flex flex-col justify-between transition-all cursor-pointer relative group hover:bg-neutral-50/80 ${isTodayDate ? "ring-2 ring-primary-500 ring-inset" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[11px] font-bold ${
                        isTodayDate 
                          ? "bg-primary-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-xs font-extrabold" 
                          : "text-neutral-700"
                      }`}>
                        {dayNum}
                      </span>
                      {isWeeklyOff && (
                        <span className="text-[9px] uppercase font-bold text-neutral-400 mt-0.5 tracking-wider">{day.holiday_type}</span>
                      )}
                    </div>

                    {/* Events list: Leaves & Holidays */}
                    <div className="space-y-1 mt-auto pb-0.5 w-full">
                      {isHoliday && !isWeeklyOff && (
                        <div className="text-[9px] font-bold px-1.5 py-1 rounded-[4px] truncate flex items-center gap-1.5 bg-primary-500/15 text-primary-500 fill-primary-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></div>
                          <span className="truncate">{day.name}</span>
                        </div>
                      )}

                      {leavesOnDate.slice(0, 2).map((l: any) => {
                        const isApproved = l.status === "Approved";
                        const isRejected = l.status === "Rejected";
                        const isPending = l.status === "Pending";
                        const isHalfDay = l.leave_duration === "First Half" || l.leave_duration === "Second Half";

                        const badgeClass = isHalfDay
                          ? "bg-orange-100 text-orange-600 fill-orange-600"
                          : isApproved
                          ? "bg-success-100 text-success-600 fill-success-600"
                          : isRejected
                          ? "bg-danger-100 text-danger-600 fill-danger-600"
                          : isPending
                          ? "bg-warning-100 text-warning-600 fill-warning-600"
                          : "bg-neutral-100 text-neutral-500 fill-neutral-500";

                        return (
                          <div
                            key={l.id}
                            className={`text-[9px] font-bold px-1.5 py-1 rounded-[4px] truncate flex items-center gap-1.5 ${badgeClass}`}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></div>
                            <span className="truncate">{l.leave_type || "Leave"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List Mode */
          <div className="flex-1 overflow-y-auto space-y-6 max-h-[600px] pr-2">
            {/* Section 1: Employee Leave History */}
            <div className="border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-white px-5 py-3.5 border-b border-neutral-200 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <CalendarIcon className="w-4 h-4 text-neutral-500" />
                  <h4 className="text-sm font-bold text-neutral-800">Employee Leave History</h4>
                </div>
                <span className="text-xs font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 rounded-full">{employeeLeaves.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-100">
                    <tr>
                      <th className="py-3 px-5 font-bold uppercase tracking-wider text-[10px]">Date</th>
                      <th className="py-3 px-5 font-bold uppercase tracking-wider text-[10px]">Day</th>
                      <th className="py-3 px-5 font-bold uppercase tracking-wider text-[10px]">Leave Type</th>
                      <th className="py-3 px-5 font-bold uppercase tracking-wider text-[10px]">Status</th>
                      <th className="py-3 px-5 font-bold uppercase tracking-wider text-[10px]">Duration</th>
                      <th className="py-3 px-5 font-bold uppercase tracking-wider text-[10px]">Manager Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {employeeLeaves.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-neutral-400">No leave history available.</td></tr>
                    ) : (
                      employeeLeaves.map((l: any) => {
                        const d = new Date(l.from_date);
                        const dayName = FULL_WEEKDAYS[d.getDay()];
                        const isApproved = l.status === "Approved";
                        const isRejected = l.status === "Rejected";
                        const isPending = l.status === "Pending";
                        const isHalfDay = l.leave_duration === "First Half" || l.leave_duration === "Second Half";

                        const badgeClass = isHalfDay
                          ? "bg-orange-100 text-orange-600 border-orange-300"
                          : isApproved
                          ? "bg-success-100 text-success-600 border-success-300"
                          : isRejected
                          ? "bg-danger-100 text-danger-600 border-danger-300"
                          : isPending
                          ? "bg-warning-100 text-warning-600 border-warning-300"
                          : "bg-neutral-100 text-neutral-500 border-neutral-300";

                        return (
                          <tr key={l.id} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-neutral-800">{formatDateStr(l.from_date)}</td>
                            <td className="py-3.5 px-5 font-medium text-neutral-500">{dayName}</td>
                            <td className="py-3.5 px-5 font-medium text-neutral-800">{l.leave_type}</td>
                            <td className="py-3.5 px-5">
                              <span className={`px-2.5 py-1 rounded-[6px] border text-[10px] font-bold flex items-center w-fit gap-1.5 ${badgeClass}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                {isHalfDay ? "Half-Day" : l.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 font-medium text-neutral-700">{l.total_days} {l.total_days === 1 ? "Day" : "Days"}</td>
                            <td className="py-3.5 px-5 font-medium text-neutral-500">{l.reporting_manager || "HR Manager"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Upcoming Holidays */}
            <div className="border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-white px-5 py-3.5 border-b border-neutral-200 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <SparklesIcon className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-bold text-neutral-800">Upcoming Holidays</h4>
                </div>
                <span className="text-[10px] font-bold text-neutral-500 border border-neutral-200 bg-neutral-50 px-2 py-0.5 rounded-md">Read-only</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-100">
                    <tr>
                      <th className="py-3 px-5 font-bold uppercase tracking-wider text-[10px]">Date</th>
                      <th className="py-3 px-5 font-bold uppercase tracking-wider text-[10px]">Day</th>
                      <th className="py-3 px-5 font-bold uppercase tracking-wider text-[10px]">Holiday Name</th>
                      <th className="py-3 px-5 font-bold uppercase tracking-wider text-[10px]">Holiday Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {schedule.filter(d => d.is_holiday).length === 0 ? (
                      <tr><td colSpan={4} className="py-8 text-center text-neutral-400">No holidays scheduled for this month.</td></tr>
                    ) : (
                      schedule.filter(d => d.is_holiday && !d.holiday_type?.toLowerCase().includes("weekly off")).map((h: any) => {
                        const d = new Date(h.date);
                        const dayName = FULL_WEEKDAYS[d.getDay()];
                        return (
                          <tr key={h.date} className="hover:bg-purple-50/20 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-neutral-800">{formatDateStr(h.date)}</td>
                            <td className="py-3.5 px-5 font-medium text-neutral-500">{dayName}</td>
                            <td className="py-3.5 px-5 font-medium text-neutral-800 flex items-center gap-2">
                              {h.name}
                            </td>
                            <td className="py-3.5 px-5">
                              <span className={`px-2.5 py-1 rounded-[6px] border text-[10px] font-bold ${
                                h.holiday_type?.toLowerCase().includes("national") ? "bg-purple-100 text-purple-600 border-purple-200" :
                                h.holiday_type?.toLowerCase().includes("festival") ? "bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200" :
                                "bg-neutral-100 text-neutral-600 border-neutral-200"
                              }`}>
                                {h.holiday_type}
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
      </Card>

      {/* Sidebar upcoming holidays stack card */}
      <Card className="shadow-sm rounded-2xl border border-neutral-200 p-6 bg-gradient-to-br from-white to-neutral-50/30 flex flex-col">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-4 mb-4">
          <ClockIcon className="w-5 h-5 text-primary-500" />
          <h3 className="text-md font-bold text-neutral-850">Upcoming Holidays</h3>
        </div>

        <div className="flex-1 flex flex-col justify-start">
          {upcomingHolidays.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-400 gap-2">
              <SparklesIcon className="w-8 h-8 text-neutral-300" />
              <p className="text-xs font-bold text-neutral-500">No upcoming holidays</p>
              <p className="text-[10px] text-neutral-400">All caught up with published holiday lists.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingHolidays.map((item, index) => {
                const isUpcomingToday = item.days_remaining === "Today";
                return (
                  <div 
                    key={`${item.date}-${index}`} 
                    className={`p-3.5 rounded-xl border transition-all duration-200 hover:shadow-xs flex flex-col gap-1.5 bg-white ${
                      isUpcomingToday 
                        ? "border-indigo-200 bg-indigo-50/10" 
                        : "border-neutral-200/60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-neutral-850 max-w-[70%] leading-tight" title={item.name}>
                        {item.name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isUpcomingToday
                          ? "bg-indigo-100 text-indigo-800 animate-pulse"
                          : "bg-neutral-100 text-neutral-600"
                      }`}>
                        {item.days_remaining}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium">
                      <span>{formatDateStr(item.date)} ({item.day})</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {item.holiday_type?.replace(" Holiday", "")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Selected Date Events Modal */}
      {selectedDateEventsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-neutral-800">{selectedDateEventsModal.formattedDate}</h3>
              </div>
              <button
                onClick={() => setSelectedDateEventsModal(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Employee Leave Section */}
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Employee Leave Details</h4>
                {selectedDateEventsModal.leaves.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    No leave requests on this date.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEventsModal.leaves.map((l: any) => (
                      <div key={l.id} className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-neutral-800">{l.leave_type}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-indigo-100 text-indigo-800 border-indigo-200">
                            {l.status}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-600 space-y-1 font-medium">
                          <p><strong>Duration:</strong> {l.total_days} day(s) ({l.leave_duration || "Full Day"})</p>
                          <p><strong>Manager:</strong> {l.reporting_manager || "Manager"}</p>
                          <p><strong>Reason:</strong> {l.reason || "N/A"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-neutral-100" />

              {/* Company Holiday Section */}
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Company Holiday</h4>
                {selectedDateEventsModal.holiday ? (
                  <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-purple-900 flex items-center gap-1.5">
                        🎉 {selectedDateEventsModal.holiday.name}
                      </p>
                      <p className="text-xs text-purple-700 font-semibold mt-0.5">
                        {selectedDateEventsModal.holiday.holiday_type || "Company Holiday"}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-purple-200 text-purple-800 text-[10px] font-extrabold">
                      Published
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 italic bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    None
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex justify-end">
              <button
                onClick={() => setSelectedDateEventsModal(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-xl text-xs shadow-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayCalendarWidget;
