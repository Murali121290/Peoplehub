import React, { useState, useEffect } from "react";
import { Card } from "../../../components/ui/Card";
import {
  CalendarIcon,
  ListBulletIcon,
  ClockIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import apiService from "../../../services/api";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const HolidayCalendarWidget: React.FC = () => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const [schedule, setSchedule] = useState<any[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchHolidayCalendar();
  }, [selectedMonth, selectedYear]);

  const fetchHolidayCalendar = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.get(`/employee/holidays`, {
        params: {
          month: selectedMonth,
          year: selectedYear
        }
      });
      setSchedule(res.data.current_month_schedule || []);
      setUpcomingHolidays(res.data.upcoming_holidays || []);
    } catch (err) {
      console.error("Error fetching holidays:", err);
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
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-md font-bold text-neutral-850">Holiday & Weekly Off Calendar</h3>
              <p className="text-xs text-neutral-400 font-medium mt-0.5">Check upcoming company schedules and holidays</p>
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
                    ? "bg-white text-indigo-600 shadow-xs" 
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
                    ? "bg-white text-indigo-600 shadow-xs" 
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
                title="List view"
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar layout */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-neutral-400">
            <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
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
                  return <div key={`empty-${idx}`} className="bg-neutral-50/30 border-r border-b border-neutral-100 min-h-[56px]" />;
                }

                const isTodayDate = day.date === todayStr;
                const isHoliday = day.is_holiday;
                const parsedDate = new Date(day.date);
                const dayNum = parsedDate.getDate();

                return (
                  <div
                    key={day.date}
                    className={`border-r border-b border-neutral-100 p-2 min-h-[64px] flex flex-col justify-between transition-colors relative group hover:bg-neutral-50/50 ${
                      isHoliday 
                        ? day.holiday_type?.toLowerCase().includes("weekly off")
                          ? "bg-slate-50/40"
                          : "bg-violet-50/20"
                        : ""
                    } ${isTodayDate ? "ring-2 ring-indigo-500 ring-inset" : ""}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold ${
                        isTodayDate 
                          ? "bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-xs" 
                          : isHoliday 
                          ? day.holiday_type?.toLowerCase().includes("weekly off")
                            ? "text-slate-400"
                            : "text-violet-600"
                          : "text-neutral-700"
                      }`}>
                        {dayNum}
                      </span>
                      {isHoliday && (
                        <span className={`w-1.5 h-1.5 rounded-full ${getHolidayDotColor(day.holiday_type)}`} />
                      )}
                    </div>
                    {isHoliday && (
                      <div className="mt-1 text-[9px] font-bold text-neutral-600 truncate max-w-full" title={`${day.name} (${day.holiday_type})`}>
                        {day.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List Mode */
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Holiday Name</th>
                  <th className="py-3 px-4">Holiday Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100/50">
                {schedule.filter(day => day.is_holiday).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-xs text-neutral-400 font-medium">
                      No holidays or weekly offs scheduled for this month.
                    </td>
                  </tr>
                ) : (
                  schedule.filter(day => day.is_holiday).map(day => {
                    const isTodayDate = day.date === todayStr;
                    return (
                      <tr key={day.date} className={`hover:bg-neutral-50/50 text-xs transition-colors ${isTodayDate ? "bg-indigo-50/20 font-semibold" : ""}`}>
                        <td className="py-3.5 px-4 text-neutral-700 font-medium">
                          {day.date}
                          {isTodayDate && (
                            <span className="ml-2 bg-indigo-100 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded-md font-bold">Today</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-500">{day.day}</td>
                        <td className="py-3.5 px-4 text-neutral-800 font-bold">{day.name}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getHolidayTypeBadge(day.holiday_type)}`}>
                            {day.holiday_type}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Sidebar upcoming holidays stack card */}
      <Card className="shadow-sm rounded-2xl border border-neutral-200 p-6 bg-gradient-to-br from-white to-neutral-50/30 flex flex-col">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-4 mb-4">
          <ClockIcon className="w-5 h-5 text-indigo-600" />
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
                      <span>{item.date} ({item.day})</span>
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
    </div>
  );
};

export default HolidayCalendarWidget;
