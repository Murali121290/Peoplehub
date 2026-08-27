import React, { useState, useEffect, useRef } from "react";

interface TimePickerProps {
  value?: string; // Standard "HH:MM" 24h format, e.g. "14:30"
  onChange?: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
  error?: boolean;
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value = "",
  onChange,
  placeholder = "Select time",
  required = false,
  className = "",
  name,
  error = false,
  disabled = false,
}) => {
  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);

  const [hourVal, setHourVal] = useState("");
  const [minuteVal, setMinuteVal] = useState("");
  const [periodVal, setPeriodVal] = useState<"AM" | "PM">("AM");

  // Synchronize internal state with external value
  useEffect(() => {
    if (value) {
      const [h24, m] = value.split(":").map(Number);
      if (!isNaN(h24) && !isNaN(m)) {
        const pm = h24 >= 12;
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        setHourVal(String(h12));
        setMinuteVal(String(m).padStart(2, "0"));
        setPeriodVal(pm ? "PM" : "AM");
      }
    } else {
      setHourVal("");
      setMinuteVal("");
      setPeriodVal("AM");
    }
  }, [value]);

  const updateParent = (hStr: string, mStr: string, p: "AM" | "PM") => {
    // Only commit if we have a fully qualified 2-digit minute
    if (!hStr || mStr.length !== 2) return;

    let h = parseInt(hStr);
    let m = parseInt(mStr);
    if (isNaN(h) || isNaN(m)) return;

    let h24 = h % 12;
    if (p === "PM") h24 += 12;

    const formatted = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    if (onChange && formatted !== value) {
      onChange(formatted);
    }
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 2) val = val.slice(0, 2);

    let shouldAdvance = false;

    if (val.length === 1) {
      const firstDigit = parseInt(val);
      if (firstDigit >= 2 && firstDigit <= 9) {
        shouldAdvance = true;
      }
    } else if (val.length === 2) {
      let num = parseInt(val);
      if (num > 12) {
        val = "12";
      }
      shouldAdvance = true;
    }

    setHourVal(val);

    if (val && minuteVal) {
      updateParent(val, minuteVal, periodVal);
    }

    if (shouldAdvance) {
      setTimeout(() => {
        minuteInputRef.current?.focus();
        minuteInputRef.current?.select();
      }, 30);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 2) val = val.slice(0, 2);

    if (val.length === 2) {
      let num = parseInt(val);
      if (num > 59) {
        val = "59";
      }
    }

    setMinuteVal(val);

    if (hourVal && val) {
      updateParent(hourVal, val, periodVal);
    }
  };

  const handlePeriodChange = (newPeriod: "AM" | "PM") => {
    setPeriodVal(newPeriod);
    
    let finalMin = minuteVal;
    if (minuteVal && minuteVal.length === 1) {
      finalMin = String(parseInt(minuteVal)).padStart(2, "0");
      setMinuteVal(finalMin);
    }
    
    if (hourVal && finalMin) {
      let h = parseInt(hourVal);
      let m = parseInt(finalMin);
      if (!isNaN(h) && !isNaN(m)) {
        let h24 = h % 12;
        if (newPeriod === "PM") h24 += 12;
        const formattedTime = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        if (onChange) onChange(formattedTime);
      }
    }
  };

  const handleHourBlur = () => {
    let num = parseInt(hourVal);
    if (isNaN(num)) {
      setHourVal("");
      return;
    }
    num = Math.min(12, Math.max(1, num));
    const formatted = String(num);
    setHourVal(formatted);
    
    let finalMin = minuteVal;
    if (minuteVal && minuteVal.length === 1) {
      finalMin = String(parseInt(minuteVal)).padStart(2, "0");
      setMinuteVal(finalMin);
    }
    
    if (formatted && finalMin) {
      let h = num;
      let m = parseInt(finalMin);
      if (!isNaN(h) && !isNaN(m)) {
        let h24 = h % 12;
        if (periodVal === "PM") h24 += 12;
        const formattedTime = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        if (onChange) onChange(formattedTime);
      }
    }
  };

  const handleMinuteBlur = () => {
    let num = parseInt(minuteVal);
    if (isNaN(num)) {
      setMinuteVal("");
      return;
    }
    num = Math.min(59, Math.max(0, num));
    const formatted = String(num).padStart(2, "0");
    setMinuteVal(formatted);
    
    if (hourVal && formatted) {
      let h = parseInt(hourVal);
      let m = num;
      if (!isNaN(h) && !isNaN(m)) {
        let h24 = h % 12;
        if (periodVal === "PM") h24 += 12;
        const formattedTime = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        if (onChange) onChange(formattedTime);
      }
    }
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ":" || e.key === "Enter") {
      e.preventDefault();
      minuteInputRef.current?.focus();
      minuteInputRef.current?.select();
    }
  };

  return (
    <div 
      className={`w-full flex items-center h-[42px] border rounded-xl px-3 transition-all ${
        error ? "border-red-400" : "border-neutral-200"
      } ${
        disabled 
          ? "bg-neutral-100/60 cursor-not-allowed select-none opacity-80" 
          : "bg-white focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500"
      } ${className}`}
    >
      <input type="hidden" name={name} value={value} required={required} />
      <input
        ref={hourInputRef}
        type="text"
        placeholder="HH"
        value={hourVal}
        onChange={handleHourChange}
        onBlur={handleHourBlur}
        onKeyDown={handleHourKeyDown}
        disabled={disabled}
        className="w-8 text-center font-semibold text-neutral-700 bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-sm placeholder-neutral-300 disabled:cursor-not-allowed disabled:text-neutral-400"
      />
      <span className="text-neutral-400 font-bold select-none px-0.5">:</span>
      <input
        ref={minuteInputRef}
        type="text"
        placeholder="MM"
        value={minuteVal}
        onChange={handleMinuteChange}
        onBlur={handleMinuteBlur}
        disabled={disabled}
        className="w-8 text-center font-semibold text-neutral-700 bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-sm placeholder-neutral-300 disabled:cursor-not-allowed disabled:text-neutral-400"
      />
      <div className="w-[1px] h-5 bg-neutral-200 mx-2" />
      <select
        value={periodVal}
        onChange={(e) => handlePeriodChange(e.target.value as "AM" | "PM")}
        disabled={disabled}
        className="text-xs font-bold text-neutral-500 bg-transparent border-none focus:outline-none p-0 focus:ring-0 cursor-pointer uppercase select-none mr-1 disabled:cursor-not-allowed disabled:text-neutral-400"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

export const TimePickerModal = TimePicker;
export default TimePicker;
