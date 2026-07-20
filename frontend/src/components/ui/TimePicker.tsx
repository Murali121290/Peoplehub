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
  const calculateTimeFromAngle = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;

    let angle = Math.atan2(y, x);
    let degrees = angle * (180 / Math.PI) + 90; // Top is 0 degrees
    if (degrees < 0) degrees += 360;

    if (mode === "hour") {
      let hr = Math.round(degrees / 30);
      if (hr === 0) hr = 12;
      setHour(hr);
      setTypedHour(String(hr).padStart(2, "0"));
    } else {
      let min = Math.round(degrees / 6);
      if (min === 60) min = 0;
      setMinute(min);
      setTypedMinute(String(min).padStart(2, "0"));
    }
  };

  const handleDialStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    calculateTimeFromAngle(clientX, clientY);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const mX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const mY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      calculateTimeFromAngle(mX, mY);
    };

    const handleEnd = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);

      // Auto switch to minute selection after choosing hour
      if (mode === "hour") {
        setTimeout(() => setMode("minute"), 150);
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
  };

  // Convert 24h to 12h display
  const getDisplayTime = () => {
    if (!inputVal) return "";
    const [h24, m] = inputVal.split(":").map(Number);
    if (isNaN(h24) || isNaN(m)) return "";
    const pm = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const hh = String(h12).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${hh}:${mm} ${pm ? "PM" : "AM"}`;
  };

  // Dial angles
  const currentAngle = mode === "hour" ? hour * 30 : minute * 6;
  const radAngle = ((currentAngle - 90) * Math.PI) / 180;
  const handLength = 80;
  const endX = 112 + handLength * Math.cos(radAngle);
  const endY = 112 + handLength * Math.sin(radAngle);

  return (
    <div className="relative w-full">
      {/* Trigger Input */}
      <div className="relative">
        <input
          type="text"
          name={name}
          readOnly
          required={required}
          onClick={handleOpen}
          value={getDisplayTime()}
          placeholder={placeholder}
          className={`w-full border rounded-xl px-4 py-2.5 pr-10 text-sm text-neutral-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 bg-white font-medium transition-all ${
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

      {/* Picker Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-fadeIn">
          {/* Modal Container */}
          <div className="bg-white rounded-3xl shadow-2xl w-[320px] overflow-hidden border border-neutral-100 flex flex-col p-6 animate-scaleIn">
            
            {/* Header: SELECT TIME */}
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-4">
              Select Time
            </div>

            {/* Time Blocks Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1.5">
                {/* Hour display */}
                <button
                  type="button"
                  onClick={() => {
                    setMode("hour");
                    setInputMode("dial");
                  }}
                  className={`w-20 h-16 rounded-xl flex items-center justify-center text-4xl font-semibold transition-all ${
                    mode === "hour" && inputMode === "dial"
                      ? "bg-[#EBE3FC] text-[#6200EE]"
                      : "bg-[#F1F5F9] text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  {String(hour).padStart(2, "0")}
                </button>

                {/* Colon separator */}
                <span className="text-4xl font-semibold text-slate-800 px-0.5">:</span>

                {/* Minute display */}
                <button
                  type="button"
                  onClick={() => {
                    setMode("minute");
                    setInputMode("dial");
                  }}
                  className={`w-20 h-16 rounded-xl flex items-center justify-center text-4xl font-semibold transition-all ${
                    mode === "minute" && inputMode === "dial"
                      ? "bg-[#EBE3FC] text-[#6200EE]"
                      : "bg-[#F1F5F9] text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  {String(minute).padStart(2, "0")}
                </button>
              </div>

              {/* AM/PM Toggle Box */}
              <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col text-xs font-semibold h-16 w-12">
                <button
                  type="button"
                  onClick={() => setPeriod("AM")}
                  className={`flex-1 flex items-center justify-center transition-all ${
                    period === "AM"
                      ? "bg-[#EBE3FC] text-[#6200EE]"
                      : "bg-white text-slate-400 hover:bg-slate-50"
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
                      ? "bg-[#EBE3FC] text-[#6200EE]"
                      : "bg-white text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Selector Display Block (Dial or Keyboard) */}
            {inputMode === "dial" ? (
              /* Dial Dial picker */
              <div className="flex justify-center items-center py-2 mb-4">
                <div
                  ref={dialRef}
                  onMouseDown={handleDialStart}
                  onTouchStart={handleDialStart}
                  className="w-[224px] h-[224px] rounded-full bg-[#EAEAEA] relative cursor-pointer select-none"
                >
                  {/* Center Dot */}
                  <div className="absolute top-[108px] left-[108px] w-2 h-2 rounded-full bg-[#6200EE] z-20" />

                  {/* Clock Hand Line */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    <line
                      x1="112"
                      y1="112"
                      x2={endX}
                      y2={endY}
                      stroke="#6200EE"
                      strokeWidth="2"
                    />
                    <circle
                      cx={endX}
                      cy={endY}
                      r="16"
                      fill="#6200EE"
                    />
                  </svg>

                  {/* Clock Dial numbers */}
                  {mode === "hour"
                    ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hr) => {
                        const angle = ((hr * 30 - 90) * Math.PI) / 180;
                        const x = 112 + 80 * Math.cos(angle) - 12; // 12px offset for centering 24px box
                        const y = 112 + 80 * Math.sin(angle) - 12;
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
                        const x = 112 + 80 * Math.cos(angle) - 12;
                        const y = 112 + 80 * Math.sin(angle) - 12;
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
              <div className="flex flex-col items-center justify-center py-6 mb-4 h-[224px]">
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
                    className="w-16 h-16 border border-slate-300 rounded-xl text-3xl text-center focus:border-[#6200EE] focus:outline-none font-semibold text-slate-800 shadow-sm"
                  />
                  <span className="text-3xl font-semibold text-slate-800">:</span>
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
                    className="w-16 h-16 border border-slate-300 rounded-xl text-3xl text-center focus:border-[#6200EE] focus:outline-none font-semibold text-slate-800 shadow-sm"
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-2 font-medium">
                  Enter hours (1-12) and minutes (00-59)
                </div>
              </div>
            )}

            {/* Footer Buttons row */}
            <div className="flex justify-between items-center mt-auto pt-2">
              {/* Keyboard / Dial Switch button */}
              <button
                type="button"
                onClick={() => setInputMode(inputMode === "dial" ? "keyboard" : "dial")}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title={inputMode === "dial" ? "Enter time in text" : "Select time on dial"}
              >
                {inputMode === "dial" ? (
                  /* Keyboard Icon */
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
                      d="M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 20 18V8.25m-17 0V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 20 6v2.25m-17 0h17M5.25 9.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h4.5a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75V10.5a.75.75 0 0 1 .75-.75Z"
                    />
                  </svg>
                ) : (
                  /* Clock Icon */
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
                )}
              </button>

              {/* OK and CANCEL buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#6200EE] hover:bg-purple-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOk}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#6200EE] hover:bg-purple-50 rounded-lg transition-colors"
                >
                  OK
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
