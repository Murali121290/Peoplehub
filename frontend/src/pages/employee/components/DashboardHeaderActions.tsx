import React, { useState } from "react";
import { motion } from "framer-motion";
import { UtensilsCrossed, Coffee, BellOff, Clock3, ChevronDown, Check, LogOut } from "lucide-react";

interface DashboardHeaderActionsProps {
  isCheckedIn: boolean;
  timer: string;
  totalLunchSeconds: number;
  totalTeaSeconds: number;
  isLunchBreak: boolean;
  isTeaBreak: boolean;
  lunchTimer?: string;
  teaTimer?: string;
  onCheckInOut: () => void;
  onLunchBreak: () => void;
  onTeaBreak: () => void;
  onOpenNotifications: () => void;
}

const BreakButton: React.FC<{
  icon: React.ReactNode;
  durationText: string;
  isActive: boolean;
  disabled: boolean;
  onClick: () => void;
  activeColor: string;
  activeBg: string;
  inactiveIconColor?: string;
}> = ({ icon, durationText, isActive, disabled, onClick, activeColor, activeBg, inactiveIconColor }) => {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden h-[36px] rounded-full border flex items-center px-4 transition-colors duration-200 flex-shrink-0
        ${isActive
          ? `${activeBg} ${activeColor}`
          : disabled
            ? "bg-gray-50 border-gray-200 text-gray-400 opacity-70 cursor-not-allowed"
            : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-100"
        }
      `}
    >
      <div className="flex items-center gap-2">
        <div className={isActive ? "" : disabled ? "text-gray-400" : inactiveIconColor || "text-gray-500"}>
          {icon}
        </div>
        <span className="text-[13px] font-medium tracking-tight">{durationText}</span>
      </div>
    </motion.button>
  );
};

const DashboardHeaderActions: React.FC<DashboardHeaderActionsProps> = ({
  isCheckedIn,
  timer,
  totalLunchSeconds,
  totalTeaSeconds,
  isLunchBreak,
  isTeaBreak,
  lunchTimer,
  teaTimer,
  onCheckInOut,
  onLunchBreak,
  onTeaBreak,
  onOpenNotifications,
}) => {
  const [isHoveringCheck, setIsHoveringCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Derived states
  const isCheckedOut = !isCheckedIn && timer !== "00:00:00";
  const lunchDone = !isLunchBreak && totalLunchSeconds > 0;
  const teaBreakDisabled = !isCheckedIn || isLunchBreak;
  const lunchBreakDisabled = !isCheckedIn || isTeaBreak || lunchDone;

  const handleCheckAction = async () => {
    setIsLoading(true);
    await onCheckInOut();
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div className="flex items-center gap-2">
      <BreakButton
        icon={<UtensilsCrossed className="w-4 h-4" />}
        durationText={isLunchBreak && lunchTimer ? lunchTimer : "for 60 mins"}
        isActive={isLunchBreak}
        disabled={lunchBreakDisabled}
        onClick={onLunchBreak}
        activeColor="border-amber-400 text-amber-700"
        activeBg="bg-amber-50"
        inactiveIconColor="text-amber-500"
      />
      <BreakButton
        icon={<Coffee className="w-4 h-4" />}
        durationText={isTeaBreak && teaTimer ? teaTimer : "for 15 mins"}
        isActive={isTeaBreak}
        disabled={teaBreakDisabled}
        onClick={onTeaBreak}
        activeColor="border-yellow-400 text-yellow-700"
        activeBg="bg-yellow-50"
        inactiveIconColor="text-amber-500"
      />

      <motion.button
        onHoverStart={() => setIsHoveringCheck(true)}
        onHoverEnd={() => setIsHoveringCheck(false)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleCheckAction}
        disabled={isLoading}
        className={`flex items-center gap-3 px-4 h-[36px] rounded-full border transition-colors duration-200 whitespace-nowrap ml-2 bg-white
          ${isCheckedOut
            ? "border-emerald-400 text-emerald-500 hover:bg-emerald-50"
            : isCheckedIn
              ? "border-rose-400 text-rose-500 hover:bg-rose-50"
              : "border-emerald-400 text-emerald-500 hover:bg-emerald-50"
          }`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isCheckedOut ? (
          <>
            <span className="text-[13px] font-semibold text-emerald-500">Check In</span>
            <div className="w-[1px] h-4 bg-gray-200"></div>
            <span className="font-mono text-[13px] text-gray-500">{timer.includes("NaN") ? "00:00:00" : timer}</span>
          </>
        ) : isCheckedIn ? (
          <>
            <Clock3 className="w-4 h-4 opacity-70" />
            <span className="font-mono text-[13px] w-[60px] text-center">{timer.includes("NaN") ? "00:00:00" : timer}</span>
            <div className="w-[1px] h-4 bg-current opacity-20"></div>
            <span className="text-[13px] font-medium pr-1">Check Out</span>
          </>
        ) : (
          <>
            <span className="text-[13px] font-medium pl-1">Check In</span>
            <div className="w-[1px] h-4 bg-gray-200"></div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </>
        )}
      </motion.button>

      {/* Notifications Bell */}
      <button
        onClick={onOpenNotifications}
        className="relative flex items-center justify-center w-[36px] h-[36px] bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors ml-2 shadow-sm"
      >
        <span className="text-yellow-500">🔔</span>
        {/* Optional notification dot */}
        <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
      </button>
    </div>
  );
};

export default DashboardHeaderActions;
