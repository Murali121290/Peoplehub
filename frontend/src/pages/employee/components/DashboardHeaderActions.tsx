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
  hasCheckedOutToday: boolean;
  isOnLeave?: boolean;
  isShiftChanged?: boolean;
  isShiftLocked?: boolean;
  shiftLockLabel?: string;
  shiftLockTime?: string;
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
  hasCheckedOutToday,
  isOnLeave = false,
  isShiftChanged = false,
  isShiftLocked = false,
  shiftLockLabel = "Shift Locked",
  shiftLockTime,
  onCheckInOut,
  onLunchBreak,
  onTeaBreak,
  onOpenNotifications,
}) => {
  const [isHoveringCheck, setIsHoveringCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  React.useEffect(() => {
    const handleCountUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setNotifCount(customEvent.detail || 0);
    };
    window.addEventListener("systemNotificationsCount", handleCountUpdate);
    window.dispatchEvent(new Event("requestSystemNotificationsCount"));
    return () => {
      window.removeEventListener("systemNotificationsCount", handleCountUpdate);
    };
  }, []);

  // Derived states
  const isCheckedOut = hasCheckedOutToday || (!isCheckedIn && timer !== "00:00:00");
  const lunchDone = !isLunchBreak && totalLunchSeconds > 0;
  const teaBreakDisabled = !isCheckedIn || isLunchBreak;
  const lunchBreakDisabled = !isCheckedIn || isTeaBreak || lunchDone;
  const teaDone = !isTeaBreak && totalTeaSeconds > 0;

  const handleCheckAction = async () => {
    setIsLoading(true);
    await onCheckInOut();
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div className="flex items-center gap-2">
      <BreakButton
        icon={<UtensilsCrossed className="w-4 h-4" />}
        durationText={isLunchBreak && lunchTimer ? lunchTimer : "for 30 mins"}
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
        whileHover={(!isLoading && !isCheckedOut && !isOnLeave && !isShiftLocked) ? { scale: 1.02 } : {}}
        whileTap={(!isLoading && !isCheckedOut && !isOnLeave && !isShiftLocked) ? { scale: 0.98 } : {}}
        onClick={(isOnLeave || isShiftLocked) ? undefined : handleCheckAction}
        disabled={isLoading || isCheckedOut || isOnLeave || isShiftLocked}
        title={isOnLeave ? "You are on approved leave today" : isShiftLocked ? `${shiftLockLabel}${shiftLockTime ? ` — allowed after ${shiftLockTime}` : ""}` : undefined}
        className={`flex items-center gap-3 px-4 h-[36px] rounded-full border transition-colors duration-200 whitespace-nowrap ml-2 bg-white
          ${isOnLeave
            ? "border-violet-300 text-violet-500 bg-violet-50 cursor-not-allowed opacity-80"
            : isShiftLocked
              ? "border-rose-300 text-rose-500 bg-rose-50/50 cursor-not-allowed opacity-80"
              : isCheckedOut
                ? "border-emerald-400 text-emerald-500 bg-emerald-50 cursor-not-allowed opacity-80"
                : isCheckedIn
                  ? "border-rose-400 text-rose-500 hover:bg-rose-50"
                  : "border-emerald-400 text-emerald-500 hover:bg-emerald-50"
          }`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isOnLeave ? (
          <>
            <span className="text-base"></span>
            <span className="text-[13px] font-semibold text-violet-600">On Leave</span>
          </>
        ) : isShiftLocked ? (
          <>
            <span className="text-[13px] font-semibold text-rose-500">{shiftLockLabel}</span>
            {shiftLockTime && (
              <>
                <div className="w-[1px] h-4 bg-gray-200"></div>
                <span className="text-[11.5px] text-gray-500 font-mono">{shiftLockTime}</span>
              </>
            )}
          </>
        ) : isCheckedOut ? (
          <>
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-[13px] font-semibold text-emerald-500">Day Complete</span>
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
            <span className="text-[13px] font-medium pl-1">{isShiftChanged ? "Shift Change" : "Check In"}</span>
            <div className="w-[1px] h-4 bg-gray-200"></div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </>
        )}
      </motion.button>

      {/* Celebrations Icon */}
      <button
        onClick={onOpenNotifications}
        className="relative flex items-center justify-center w-[36px] h-[36px] bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors ml-2 shadow-sm"
        title="Celebrations"
      >
        <span className="text-rose-500">🎁</span>
      </button>

      {/* Notifications Bell */}
      <button
        id="notifications-bell"
        onClick={() => window.dispatchEvent(new Event("toggleSystemNotifications"))}
        className="relative flex items-center justify-center w-[36px] h-[36px] bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors ml-2 shadow-sm"
        title="System Notifications"
      >
        <span className="text-yellow-500">🔔</span>
        {/* Optional notification dot */}
        {notifCount > 0 && (
          <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
        )}
      </button>
    </div>
  );
};

export default DashboardHeaderActions;
