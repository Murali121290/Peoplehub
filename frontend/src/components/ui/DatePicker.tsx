import React, { useState, useEffect, useRef } from "react";

interface DatePickerProps {
  value?: string; // Standard "YYYY-MM-DD" format, e.g. "2026-11-17"
  onChange?: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
  error?: boolean;
  disabledDates?: string[];
  bookedDates?: string[];
  disablePast?: boolean;
  disableWeekends?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

const isCompanyWeekoff = (year: number, month: number, dayNum: number) => {
  const d = new Date(year, month, dayNum);
  const dayOfWeek = d.getDay();
  if (dayOfWeek === 0) return true; // Sunday
  if (dayOfWeek === 6) { // Saturday
    let satCount = 0;
    for (let day = 1; day <= dayNum; day++) {
      if (new Date(year, month, day).getDay() === 6) {
        satCount++;
      }
    }
    return satCount === 2 || satCount === 4;
  }
  return false;
};

type ViewMode = "calendar" | "yearMonth" | "keyboard";

export const DatePicker: React.FC<DatePickerProps> = ({
  value = "",
  onChange,
  placeholder = "Select date",
  required = false,
  className = "",
  name,
  error = false,
  disabledDates = [],
  bookedDates = [],
  disablePast = false,
  disableWeekends = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");

  const containerRef = useRef<HTMLDivElement>(null);

  // Selection state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());

  // Keyboard input state
  const [typedDate, setTypedDate] = useState("");

  // Year picker scroll — show a window of years around current viewYear
  const [yearPageStart, setYearPageStart] = useState<number>(new Date().getFullYear() - 4);

  // Sync state when external value changes
  useEffect(() => {
    setInputVal(value);
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(parsed.getTime())) {
          setSelectedDate(parsed);
          setViewMonth(parsed.getMonth());
          setViewYear(parsed.getFullYear());
          setTypedDate(value);
          setYearPageStart(parsed.getFullYear() - 4);
        }
      }
    } else {
      const today = new Date();
      setSelectedDate(today);
      setViewMonth(today.getMonth());
      setViewYear(today.getFullYear());
      setTypedDate("");
      setYearPageStart(today.getFullYear() - 4);
    }
  }, [value, isOpen]);

  // Click outside to close dropdown popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setViewMode("calendar");
  };

  const handleClose = () => {
    setIsOpen(false);
    setViewMode("calendar");
  };

  const selectDateAndClose = (dayNum: number) => {
    const finalDate = new Date(viewYear, viewMonth, dayNum);
    setSelectedDate(finalDate);

    const yyyy = finalDate.getFullYear();
    const mm = String(finalDate.getMonth() + 1).padStart(2, "0");
    const dd = String(finalDate.getDate()).padStart(2, "0");
    const formatted = `${yyyy}-${mm}-${dd}`;

    setInputVal(formatted);
    if (onChange) {
      onChange(formatted);
    }
    setIsOpen(false);
    setViewMode("calendar");
  };

  const handleOk = () => {
    let finalDate = selectedDate;

    if (viewMode === "keyboard") {
      const parts = typedDate.split("-");
      let parsed: Date;
      if (parts.length === 3) {
        parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        parsed = new Date(typedDate);
      }
      if (!isNaN(parsed.getTime())) {
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, "0");
        const dd = String(parsed.getDate()).padStart(2, "0");
        const formattedStr = `${yyyy}-${mm}-${dd}`;

        const isWeekoff = isCompanyWeekoff(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPast = parsed < today;
        const isHoliday = disabledDates.includes(formattedStr);
        const isBooked = bookedDates.includes(formattedStr);

        if (disableWeekends && isWeekoff) {
          alert("Selected date falls on a company weekly off (Sunday / 2nd or 4th Saturday).");
          return;
        }
        if (disablePast && isPast) {
          alert("Selected date cannot be in the past.");
          return;
        }
        if (isHoliday) {
          alert("Selected date is a company holiday.");
          return;
        }
        if (isBooked) {
          alert("Selected date already has a booked leave.");
          return;
        }

        finalDate = parsed;
      } else {
        alert("Invalid Date format. Please use YYYY-MM-DD.");
        return;
      }
    }

    const yyyy = finalDate.getFullYear();
    const mm = String(finalDate.getMonth() + 1).padStart(2, "0");
    const dd = String(finalDate.getDate()).padStart(2, "0");
    const formatted = `${yyyy}-${mm}-${dd}`;

    setInputVal(formatted);
    if (onChange) {
      onChange(formatted);
    }
    setIsOpen(false);
    setViewMode("calendar");
  };

  // Month navigation logic
  const handlePrevMonth = () => {
    const today = new Date();
    const minMonth = today.getMonth();
    const minYear = today.getFullYear();

    let targetMonth = viewMonth;
    let targetYear = viewYear;

    if (viewMonth === 0) {
      targetMonth = 11;
      targetYear = viewYear - 1;
    } else {
      targetMonth = viewMonth - 1;
    }

    if (disablePast) {
      if (targetYear < minYear || (targetYear === minYear && targetMonth < minMonth)) {
        return;
      }
    }

    setViewMonth(targetMonth);
    setViewYear(targetYear);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Toggle year/month picker
  const toggleYearMonthPicker = () => {
    if (viewMode === "yearMonth") {
      setViewMode("calendar");
    } else {
      setYearPageStart(viewYear - 4);
      setViewMode("yearMonth");
    }
  };

  // Calendar calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Grid items array
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  // Display value in input trigger
  const getDisplayValue = () => {
    if (!inputVal) return "";
    const parts = inputVal.split("-");
    if (parts.length !== 3) return "";
    const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(parsed.getTime())) return "";
    const dayName = WEEKDAY_NAMES[parsed.getDay()];
    const monthName = MONTH_NAMES[parsed.getMonth()].slice(0, 3);
    const dayNum = parsed.getDate();
    const yr = parsed.getFullYear();
    return `${dayName}, ${monthName} ${dayNum}, ${yr}`;
  };

  // Header display string in picker modal
  const getHeaderString = () => {
    const dayName = WEEKDAY_NAMES[selectedDate.getDay()];
    const monthName = MONTH_NAMES[selectedDate.getMonth()].slice(0, 3);
    const dayNum = selectedDate.getDate();
    return `${dayName}, ${monthName} ${dayNum}`;
  };

  const isSelected = (dayNum: number) => {
    return (
      selectedDate.getDate() === dayNum &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear
    );
  };

  const todayObj = new Date();
  const isAtMinMonth = disablePast && (
    viewYear < todayObj.getFullYear() ||
    (viewYear === todayObj.getFullYear() && viewMonth <= todayObj.getMonth())
  );

  // Year picker grid: show 12 years per page
  const YEARS_PER_PAGE = 12;
  const yearPageYears = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i);

  const handleSelectYear = (year: number) => {
    setViewYear(year);
    // Don't go back to calendar yet — show month picker within the same view
  };

  const handleSelectMonth = (monthIdx: number) => {
    // If disablePast: prevent going to past month
    if (disablePast) {
      if (viewYear < todayObj.getFullYear() ||
        (viewYear === todayObj.getFullYear() && monthIdx < todayObj.getMonth())) {
        return;
      }
    }
    setViewMonth(monthIdx);
    setViewMode("calendar");
  };

  return (
    <div ref={containerRef} className="relative w-full overflow-visible">
      {/* Input Trigger */}
      <div className="relative">
        <input
          type="text"
          name={name}
          readOnly
          required={required}
          onClick={handleOpen}
          value={getDisplayValue()}
          placeholder={placeholder}
          className={`w-full border rounded-xl px-4 py-2.5 pr-10 text-sm text-neutral-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white font-medium transition-all ${
            error ? "border-red-400" : "border-neutral-200"
          } ${className}`}
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
            />
          </svg>
        </div>
      </div>

      {/* Inline Dropdown Popover (Under Date Field) */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-[9999] bg-white rounded-2xl shadow-xl w-[290px] overflow-hidden border border-neutral-200 flex flex-col">
          {/* Header: SELECT DATE */}
          <div className="bg-primary-500 p-4 flex items-center justify-between text-white">
            <div>
              <p className="text-[10px] font-bold tracking-wider uppercase opacity-80">Select Date</p>
              <h3 className="text-xl font-bold mt-0.5 tracking-tight">{getHeaderString()}</h3>
            </div>
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "keyboard" ? "calendar" : viewMode === "calendar" || viewMode === "yearMonth" ? "keyboard" : "calendar")}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              title={viewMode === "keyboard" ? "Select date on calendar" : "Type date in text"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 21.75a.75.75 0 0 1-.343.203l-3.85.962a.75.75 0 0 1-.933-.933l.963-3.85a.75.75 0 0 1 .203-.342L16.862 4.487Zm0 0L19.5 7.125"
                />
              </svg>
            </button>
          </div>

          {/* Display Body */}
          {viewMode === "calendar" && (
            /* Calendar grid */
            <div className="p-3.5 flex flex-col">
              {/* Month/Year selector header — clicking opens year/month picker */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={toggleYearMonthPicker}
                  className="flex items-center gap-1 hover:bg-neutral-100 rounded-lg px-1.5 py-0.5 transition-colors group"
                >
                  <span className="text-sm font-bold text-neutral-800">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 text-neutral-500 group-hover:text-primary-500 transition-colors"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* Nav Arrows */}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    disabled={isAtMinMonth}
                    className={`p-1 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors ${
                      isAtMinMonth ? "opacity-30 cursor-not-allowed" : ""
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Weekdays labels */}
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-neutral-400 mb-1.5">
                {WEEKDAYS_SHORT.map((day, idx) => (
                  <div key={idx} className="w-8 h-8 flex items-center justify-center">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-neutral-800">
                {calendarDays.map((dayNum, idx) => {
                  if (dayNum === null) {
                    return <div key={idx} className="w-8 h-8" />;
                  }

                  const selected = isSelected(dayNum);
                  const todayStrLocal = `${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}`;
                  const isToday = `${viewYear}-${viewMonth}-${dayNum}` === todayStrLocal;

                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

                  const isWeekoff = isCompanyWeekoff(viewYear, viewMonth, dayNum);

                  const isPast = (() => {
                    const t = new Date();
                    t.setHours(0, 0, 0, 0);
                    const d = new Date(viewYear, viewMonth, dayNum);
                    return d < t;
                  })();

                  const isHoliday = disabledDates.includes(dateStr);
                  const isBooked = bookedDates.includes(dateStr);

                  const disabled = (disableWeekends && isWeekoff) || (disablePast && isPast) || isHoliday || isBooked;

                  return (
                    <button
                      type="button"
                      key={idx}
                      disabled={disabled}
                      onClick={() => !disabled && selectDateAndClose(dayNum)}
                      title={isBooked ? "Leave Booked" : isHoliday ? "Holiday" : isWeekoff ? "Weekly Off" : ""}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        selected
                          ? "bg-primary-500 text-white shadow-xs font-bold"
                          : isToday
                          ? "border border-primary-500 text-primary-500 font-bold"
                          : isBooked
                          ? "bg-rose-50 text-rose-600 border border-rose-100 cursor-not-allowed hover:bg-rose-50 font-semibold"
                          : disabled
                          ? "text-neutral-300 cursor-not-allowed hover:bg-transparent"
                          : "hover:bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "yearMonth" && (
            /* Year + Month Picker */
            <div className="p-3.5 flex flex-col">
              {/* Year navigation row */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setYearPageStart(yearPageStart - YEARS_PER_PAGE)}
                  className="p-1 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  {yearPageStart} – {yearPageStart + YEARS_PER_PAGE - 1}
                </span>
                <button
                  type="button"
                  onClick={() => setYearPageStart(yearPageStart + YEARS_PER_PAGE)}
                  className="p-1 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>

              {/* Year grid 4×3 */}
              <div className="grid grid-cols-4 gap-1 mb-3">
                {yearPageYears.map((yr) => {
                  const isCurrentViewYear = yr === viewYear;
                  const isPastYear = disablePast && yr < todayObj.getFullYear();
                  return (
                    <button
                      key={yr}
                      type="button"
                      disabled={isPastYear}
                      onClick={() => handleSelectYear(yr)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isCurrentViewYear
                          ? "bg-primary-500 text-white shadow-xs"
                          : isPastYear
                          ? "text-neutral-300 cursor-not-allowed"
                          : "hover:bg-primary-50 text-neutral-700 hover:text-primary-600"
                      }`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="border-t border-neutral-100 mb-2.5" />

              {/* Month grid 4×3 */}
              <div className="grid grid-cols-4 gap-1">
                {MONTH_NAMES.map((mName, mIdx) => {
                  const isCurrentViewMonth = mIdx === viewMonth;
                  const isPastMonth = disablePast && (
                    viewYear < todayObj.getFullYear() ||
                    (viewYear === todayObj.getFullYear() && mIdx < todayObj.getMonth())
                  );
                  return (
                    <button
                      key={mIdx}
                      type="button"
                      disabled={isPastMonth}
                      onClick={() => handleSelectMonth(mIdx)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isCurrentViewMonth
                          ? "bg-primary-100 text-primary-700 border border-primary-200"
                          : isPastMonth
                          ? "text-neutral-300 cursor-not-allowed"
                          : "hover:bg-neutral-100 text-neutral-600 hover:text-neutral-800"
                      }`}
                    >
                      {mName.slice(0, 3)}
                    </button>
                  );
                })}
              </div>

              {/* Done button */}
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className="mt-3 w-full py-1.5 rounded-xl text-xs font-bold text-primary-600 hover:bg-primary-50 border border-primary-100 transition-colors"
              >
                Back to Calendar
              </button>
            </div>
          )}

          {viewMode === "keyboard" && (
            /* Keyboard Numeric entry */
            <div className="p-5 flex flex-col justify-center items-center h-[230px]">
              <div className="w-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Enter Date (YYYY-MM-DD)
                </label>
                <input
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={typedDate}
                  onChange={(e) => setTypedDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none font-medium shadow-xs"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                Use standard ISO format, e.g., 2026-11-17
              </p>
            </div>
          )}

          {/* Actions Footer */}
          {viewMode === "keyboard" && (
            <div className="p-3 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOk}
                className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatePicker;
