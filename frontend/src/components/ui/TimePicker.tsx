import React, { useState, useEffect, useRef } from "react";

interface TimePickerProps {
  value?: string; // Standard "HH:MM" 24h format, e.g. "14:30"
  onChange?: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
  error?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value = "",
  onChange,
  placeholder = "Select time",
  required = false,
  className = "",
  name,
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const [inputMode, setInputMode] = useState<"dial" | "keyboard">("dial");

  const containerRef = useRef<HTMLDivElement>(null);

  // Temporary picker state
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  // Keyboard input temp state
  const [typedHour, setTypedHour] = useState("12");
  const [typedMinute, setTypedMinute] = useState("00");

  const dialRef = useRef<HTMLDivElement>(null);

  // Synchronize internal state with external value
  useEffect(() => {
    setInputVal(value);
    if (value) {
      const [h24, m] = value.split(":").map(Number);
      if (!isNaN(h24) && !isNaN(m)) {
        const pm = h24 >= 12;
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        setHour(h12);
        setMinute(m);
        setPeriod(pm ? "PM" : "AM");
        setTypedHour(String(h12).padStart(2, "0"));
        setTypedMinute(String(m).padStart(2, "0"));
      }
    } else {
      // Default to 12:00 AM
      setHour(12);
      setMinute(0);
      setPeriod("AM");
      setTypedHour("12");
      setTypedMinute("00");
    }
  }, [value, isOpen]);

  // Click outside listener to dismiss popover dropdown
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
    setMode("hour");
    setInputMode("dial");
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOk = () => {
    let finalHour = hour;
    let finalMinute = minute;

    if (inputMode === "keyboard") {
      let h = Math.min(12, Math.max(1, parseInt(typedHour) || 12));
      let m = Math.min(59, Math.max(0, parseInt(typedMinute) || 0));
      finalHour = h;
      finalMinute = m;
    }

    // Convert to 24h
    let h24 = finalHour % 12;
    if (period === "PM") {
      h24 += 12;
    }

    const hh = String(h24).padStart(2, "0");
    const mm = String(finalMinute).padStart(2, "0");
    const formatted = `${hh}:${mm}`;

    setInputVal(formatted);
    if (onChange) {
      onChange(formatted);
    }
    setIsOpen(false);
  };

  // Radial dial trigonometry calculations
  const handleDialSelect = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Angle in degrees from top (12 o'clock), clockwise (0..360)
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    if (mode === "hour") {
      // 12 sectors of 30deg
      let val = Math.round(deg / 30);
      if (val === 0) val = 12;
      setHour(val);
      setTypedHour(String(val).padStart(2, "0"));
    } else {
      // 60 sectors of 6deg
      let val = Math.round(deg / 6);
      if (val === 60) val = 0;
      setMinute(val);
      setTypedMinute(String(val).padStart(2, "0"));
    }
  };

  const handleDialStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    handleDialSelect(clientX, clientY);

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      const cx = "touches" in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = "touches" in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
      handleDialSelect(cx, cy);
    };

    const handleEnd = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);

      // Auto advance from hour to minute dial
      if (mode === "hour") {
        setMode("minute");
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);
  };

  // Convert current selected hour/minute into hand end position (radius = 80px)
  const getHandPosition = () => {
    let angleDeg = 0;
    if (mode === "hour") {
      angleDeg = (hour % 12) * 30 - 90;
    } else {
      angleDeg = minute * 6 - 90;
    }
    const rad = (angleDeg * Math.PI) / 180;
    const endX = 112 + 80 * Math.cos(rad);
    const endY = 112 + 80 * Math.sin(rad);
    return { endX, endY };
  };

  const { endX, endY } = getHandPosition();

  // Display value in input trigger
  const getDisplayTime = () => {
    if (!inputVal) return "";
    const [h24, m] = inputVal.split(":").map(Number);
    if (isNaN(h24) || isNaN(m)) return "";
    const pm = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const periodStr = pm ? "PM" : "AM";
    const mm = String(m).padStart(2, "0");
    return `${h12}:${mm} ${periodStr}`;
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
          value={getDisplayTime()}
          placeholder={placeholder}
          className={`w-full border rounded-xl px-4 py-2.5 pr-10 text-sm text-neutral-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1F7A8C]/20 focus:border-[#1F7A8C] bg-white font-medium transition-all ${
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
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
      </div>

      {/* Inline Dropdown Popover (Under Time Field) */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-[9999] bg-white rounded-2xl shadow-xl w-[310px] overflow-hidden border border-neutral-200 flex flex-col p-4">
          {/* Header: SELECT TIME */}
          <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-3">
            Select Time
          </div>

          {/* Time Blocks Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              {/* Hour display */}
              <button
                type="button"
                onClick={() => {
                  setMode("hour");
                  setInputMode("dial");
                }}
                className={`w-16 h-14 rounded-xl flex items-center justify-center text-3xl font-bold transition-all ${
                  mode === "hour" && inputMode === "dial"
                    ? "bg-[#1F7A8C]/15 text-[#1F7A8C] ring-2 ring-[#1F7A8C]"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                }`}
              >
                {String(hour).padStart(2, "0")}
              </button>

              {/* Colon separator */}
              <span className="text-3xl font-bold text-slate-800 px-0.5">:</span>

              {/* Minute display */}
              <button
                type="button"
                onClick={() => {
                  setMode("minute");
                  setInputMode("dial");
                }}
                className={`w-16 h-14 rounded-xl flex items-center justify-center text-3xl font-bold transition-all ${
                  mode === "minute" && inputMode === "dial"
                    ? "bg-[#1F7A8C]/15 text-[#1F7A8C] ring-2 ring-[#1F7A8C]"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                }`}
              >
                {String(minute).padStart(2, "0")}
              </button>
            </div>

            {/* AM/PM Toggle Box */}
            <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col text-xs font-bold h-14 w-12">
              <button
                type="button"
                onClick={() => setPeriod("AM")}
                className={`flex-1 flex items-center justify-center transition-all ${
                  period === "AM"
                    ? "bg-[#1F7A8C] text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                AM
              </button>
              <div className="h-[1px] bg-slate-200" />
              <button
                type="button"
                onClick={() => setPeriod("PM")}
                className={`flex-1 flex items-center justify-center transition-all ${
                  period === "PM"
                    ? "bg-[#1F7A8C] text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Selector Display Block (Dial or Keyboard) */}
          {inputMode === "dial" ? (
            /* Dial Dial picker */
            <div className="flex justify-center items-center py-1 mb-2">
              <div
                ref={dialRef}
                onMouseDown={handleDialStart}
                onTouchStart={handleDialStart}
                className="w-[210px] h-[210px] rounded-full bg-slate-100 relative cursor-pointer select-none"
              >
                {/* Center Dot */}
                <div className="absolute top-[101px] left-[101px] w-2 h-2 rounded-full bg-[#1F7A8C] z-20" />

                {/* Clock Hand Line */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  <line
                    x1="105"
                    y1="105"
                    x2={endX * (210 / 224)}
                    y2={endY * (210 / 224)}
                    stroke="#1F7A8C"
                    strokeWidth="2"
                  />
                  <circle
                    cx={endX * (210 / 224)}
                    cy={endY * (210 / 224)}
                    r="14"
                    fill="#1F7A8C"
                  />
                </svg>

                {/* Clock Dial numbers */}
                {mode === "hour"
                  ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hr) => {
                      const angle = ((hr * 30 - 90) * Math.PI) / 180;
                      const x = 105 + 74 * Math.cos(angle) - 12;
                      const y = 105 + 74 * Math.sin(angle) - 12;
                      const isSelected = hr === hour;

                      return (
                        <div
                          key={hr}
                          style={{ left: `${x}px`, top: `${y}px` }}
                          className={`absolute w-6 h-6 flex items-center justify-center text-xs font-semibold pointer-events-none rounded-full z-15 ${
                            isSelected ? "text-white" : "text-slate-800"
                          }`}
                        >
                          {hr}
                        </div>
                      );
                    })
                  : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((min) => {
                      const angle = (((min / 5) * 30 - 90) * Math.PI) / 180;
                      const x = 105 + 74 * Math.cos(angle) - 12;
                      const y = 105 + 74 * Math.sin(angle) - 12;
                      const isSelected = min === minute;

                      return (
                        <div
                          key={min}
                          style={{ left: `${x}px`, top: `${y}px` }}
                          className={`absolute w-6 h-6 flex items-center justify-center text-[11px] font-semibold pointer-events-none rounded-full z-15 ${
                            isSelected ? "text-white" : "text-slate-800"
                          }`}
                        >
                          {String(min).padStart(2, "0")}
                        </div>
                      );
                    })}
              </div>
            </div>
          ) : (
            /* Keyboard Input Mode */
            <div className="flex flex-col items-center justify-center py-4 mb-2 h-[210px]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={2}
                  value={typedHour}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setTypedHour(val);
                    const numeric = parseInt(val);
                    if (numeric >= 1 && numeric <= 12) {
                      setHour(numeric);
                    }
                  }}
                  onBlur={() => {
                    let numeric = Math.min(12, Math.max(1, parseInt(typedHour) || 12));
                    setTypedHour(String(numeric).padStart(2, "0"));
                    setHour(numeric);
                  }}
                  className="w-14 h-14 border border-slate-300 rounded-xl text-2xl text-center focus:border-[#1F7A8C] focus:outline-none font-semibold text-slate-800 shadow-xs"
                />
                <span className="text-2xl font-bold text-slate-800">:</span>
                <input
                  type="text"
                  maxLength={2}
                  value={typedMinute}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setTypedMinute(val);
                    const numeric = parseInt(val);
                    if (numeric >= 0 && numeric <= 59) {
                      setMinute(numeric);
                    }
                  }}
                  onBlur={() => {
                    let numeric = Math.min(59, Math.max(0, parseInt(typedMinute) || 0));
                    setTypedMinute(String(numeric).padStart(2, "0"));
                    setMinute(numeric);
                  }}
                  className="w-14 h-14 border border-slate-300 rounded-xl text-2xl text-center focus:border-[#1F7A8C] focus:outline-none font-semibold text-slate-800 shadow-xs"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                Enter hours (1-12) and minutes (00-59)
              </p>
            </div>
          )}

          {/* Footer Buttons row */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-auto">
            {/* Keyboard / Dial Switch button */}
            <button
              type="button"
              onClick={() => setInputMode(inputMode === "dial" ? "keyboard" : "dial")}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title={inputMode === "dial" ? "Enter time in text" : "Select time on dial"}
            >
              {inputMode === "dial" ? (
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
                    d="M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 20 18V8.25m-17 0V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 20 6v2.25m-17 0h17M5.25 9.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h4.5a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75V10.5a.75.75 0 0 1 .75-.75Z"
                  />
                </svg>
              ) : (
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
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              )}
            </button>

            {/* OK and CANCEL buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1F7A8C] hover:bg-[#1F7A8C]/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOk}
                className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1F7A8C] hover:bg-[#1F7A8C]/10 rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default TimePicker;

// ─────────────────────────────────────────────────────────────────────────────
// TimePickerModal: Same clock dial UI rendered as centered popup overlay
// ─────────────────────────────────────────────────────────────────────────────
export const TimePickerModal: React.FC<TimePickerProps> = ({
  value = "",
  onChange,
  placeholder = "Select time",
  required = false,
  className = "",
  name,
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const [inputMode, setInputMode] = useState<"dial" | "keyboard">("dial");

  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [typedHour, setTypedHour] = useState("12");
  const [typedMinute, setTypedMinute] = useState("00");

  const dialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputVal(value);
    if (value) {
      const [h24, m] = value.split(":").map(Number);
      if (!isNaN(h24) && !isNaN(m)) {
        const pm = h24 >= 12;
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        setHour(h12);
        setMinute(m);
        setPeriod(pm ? "PM" : "AM");
        setTypedHour(String(h12).padStart(2, "0"));
        setTypedMinute(String(m).padStart(2, "0"));
      }
    } else {
      setHour(12);
      setMinute(0);
      setPeriod("AM");
      setTypedHour("12");
      setTypedMinute("00");
    }
  }, [value, isOpen]);

  const handleOpen = () => { setIsOpen(true); setMode("hour"); setInputMode("dial"); };
  const handleClose = () => setIsOpen(false);

  const handleOk = () => {
    let finalHour = hour;
    let finalMinute = minute;
    if (inputMode === "keyboard") {
      finalHour = Math.min(12, Math.max(1, parseInt(typedHour) || 12));
      finalMinute = Math.min(59, Math.max(0, parseInt(typedMinute) || 0));
    }
    let h24 = finalHour % 12;
    if (period === "PM") h24 += 12;
    const hh = String(h24).padStart(2, "0");
    const mm = String(finalMinute).padStart(2, "0");
    const formatted = `${hh}:${mm}`;
    setInputVal(formatted);
    if (onChange) onChange(formatted);
    setIsOpen(false);
  };

  const handleDialSelect = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    if (mode === "hour") {
      let val = Math.round(deg / 30);
      if (val === 0) val = 12;
      setHour(val);
      setTypedHour(String(val).padStart(2, "0"));
    } else {
      let val = Math.round(deg / 6);
      if (val === 60) val = 0;
      setMinute(val);
      setTypedMinute(String(val).padStart(2, "0"));
    }
  };

  const handleDialStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    handleDialSelect(clientX, clientY);
    const handleMove = (ev: MouseEvent | TouchEvent) => {
      const cx = "touches" in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = "touches" in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
      handleDialSelect(cx, cy);
    };
    const handleEnd = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      if (mode === "hour") setMode("minute");
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);
  };

  const getHandPosition = () => {
    let angleDeg = mode === "hour" ? (hour % 12) * 30 - 90 : minute * 6 - 90;
    const rad = (angleDeg * Math.PI) / 180;
    return { endX: 112 + 80 * Math.cos(rad), endY: 112 + 80 * Math.sin(rad) };
  };

  const { endX, endY } = getHandPosition();

  const getDisplayTime = () => {
    if (!inputVal) return "";
    const [h24, m] = inputVal.split(":").map(Number);
    if (isNaN(h24) || isNaN(m)) return "";
    const pm = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${pm ? "PM" : "AM"}`;
  };

  return (
    <div className="relative w-full">
      {/* Input Trigger */}
      <div className="relative">
        <input
          type="text"
          name={name}
          readOnly
          required={required}
          onClick={handleOpen}
          value={getDisplayTime()}
          placeholder={placeholder}
          className={`w-full border rounded-xl px-4 py-2.5 pr-10 text-sm text-neutral-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1F7A8C]/20 focus:border-[#1F7A8C] bg-white font-medium transition-all ${
            error ? "border-red-400" : "border-neutral-200"
          } ${className}`}
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
      </div>

      {/* Centered Popup Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-[320px] overflow-hidden border border-neutral-100 flex flex-col p-6">
            {/* Header */}
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-4">Select Time</div>

            {/* Time Blocks */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setMode("hour"); setInputMode("dial"); }}
                  className={`w-20 h-16 rounded-xl flex items-center justify-center text-4xl font-bold transition-all ${
                    mode === "hour" && inputMode === "dial"
                      ? "bg-[#1F7A8C]/15 text-[#1F7A8C] ring-2 ring-[#1F7A8C]"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  {String(hour).padStart(2, "0")}
                </button>
                <span className="text-4xl font-bold text-slate-800 px-0.5">:</span>
                <button
                  type="button"
                  onClick={() => { setMode("minute"); setInputMode("dial"); }}
                  className={`w-20 h-16 rounded-xl flex items-center justify-center text-4xl font-bold transition-all ${
                    mode === "minute" && inputMode === "dial"
                      ? "bg-[#1F7A8C]/15 text-[#1F7A8C] ring-2 ring-[#1F7A8C]"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  {String(minute).padStart(2, "0")}
                </button>
              </div>

              {/* AM/PM */}
              <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col text-xs font-bold h-16 w-12">
                <button
                  type="button"
                  onClick={() => setPeriod("AM")}
                  className={`flex-1 flex items-center justify-center transition-all ${
                    period === "AM" ? "bg-[#1F7A8C] text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >AM</button>
                <div className="h-[1px] bg-slate-200" />
                <button
                  type="button"
                  onClick={() => setPeriod("PM")}
                  className={`flex-1 flex items-center justify-center transition-all ${
                    period === "PM" ? "bg-[#1F7A8C] text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >PM</button>
              </div>
            </div>

            {/* Clock Dial or Keyboard */}
            {inputMode === "dial" ? (
              <div className="flex justify-center items-center py-2 mb-4">
                <div
                  ref={dialRef}
                  onMouseDown={handleDialStart}
                  onTouchStart={handleDialStart}
                  className="w-[224px] h-[224px] rounded-full bg-slate-100 relative cursor-pointer select-none"
                >
                  <div className="absolute top-[108px] left-[108px] w-2 h-2 rounded-full bg-[#1F7A8C] z-20" />
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    <line x1="112" y1="112" x2={endX} y2={endY} stroke="#1F7A8C" strokeWidth="2" />
                    <circle cx={endX} cy={endY} r="16" fill="#1F7A8C" />
                  </svg>
                  {mode === "hour"
                    ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hr) => {
                        const angle = ((hr * 30 - 90) * Math.PI) / 180;
                        const x = 112 + 80 * Math.cos(angle) - 12;
                        const y = 112 + 80 * Math.sin(angle) - 12;
                        return (
                          <div key={hr} style={{ left: `${x}px`, top: `${y}px` }} className={`absolute w-6 h-6 flex items-center justify-center text-xs font-semibold pointer-events-none rounded-full ${hr === hour ? "text-white" : "text-slate-800"}`}>
                            {hr}
                          </div>
                        );
                      })
                    : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((min) => {
                        const angle = (((min / 5) * 30 - 90) * Math.PI) / 180;
                        const x = 112 + 80 * Math.cos(angle) - 12;
                        const y = 112 + 80 * Math.sin(angle) - 12;
                        return (
                          <div key={min} style={{ left: `${x}px`, top: `${y}px` }} className={`absolute w-6 h-6 flex items-center justify-center text-[11px] font-semibold pointer-events-none rounded-full ${min === minute ? "text-white" : "text-slate-800"}`}>
                            {String(min).padStart(2, "0")}
                          </div>
                        );
                      })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 mb-4 h-[224px]">
                <div className="flex items-center gap-2">
                  <input type="text" maxLength={2} value={typedHour}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setTypedHour(v); const n = parseInt(v); if (n >= 1 && n <= 12) setHour(n); }}
                    onBlur={() => { const n = Math.min(12, Math.max(1, parseInt(typedHour) || 12)); setTypedHour(String(n).padStart(2, "0")); setHour(n); }}
                    className="w-16 h-16 border border-slate-300 rounded-xl text-3xl text-center focus:border-[#1F7A8C] focus:outline-none font-semibold text-slate-800"
                  />
                  <span className="text-3xl font-bold text-slate-800">:</span>
                  <input type="text" maxLength={2} value={typedMinute}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setTypedMinute(v); const n = parseInt(v); if (n >= 0 && n <= 59) setMinute(n); }}
                    onBlur={() => { const n = Math.min(59, Math.max(0, parseInt(typedMinute) || 0)); setTypedMinute(String(n).padStart(2, "0")); setMinute(n); }}
                    className="w-16 h-16 border border-slate-300 rounded-xl text-3xl text-center focus:border-[#1F7A8C] focus:outline-none font-semibold text-slate-800"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">Enter hours (1-12) and minutes (00-59)</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center pt-2">
              <button type="button" onClick={() => setInputMode(inputMode === "dial" ? "keyboard" : "dial")}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title={inputMode === "dial" ? "Enter time in text" : "Select time on dial"}
              >
                {inputMode === "dial" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 20 18V8.25m-17 0V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 20 6v2.25m-17 0h17M5.25 9.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h4.5a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75V10.5a.75.75 0 0 1 .75-.75Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={handleClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#1F7A8C] hover:bg-[#1F7A8C]/10 rounded-lg transition-colors">Cancel</button>
                <button type="button" onClick={handleOk} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#1F7A8C] hover:bg-[#1F7A8C]/10 rounded-lg transition-colors">OK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
