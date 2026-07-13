import { API_URL } from "../../../config/api";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface AttendanceCardProps {
  isCheckedIn: boolean;
  checkInTime: Date | null;
  timer: string;
  totalLunchSeconds: number;
  totalTeaSeconds: number;
  isLunchBreak: boolean;
  isTeaBreak: boolean;
  lunchStartTime: Date | null;
  teaStartTime: Date | null;
  currentEmployee: any;
  user: any;
  onCheckInOut: () => void;
  onLunchBreak: () => void;
  onTeaBreak: () => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function fmtHMS(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function timerToWorked(t: string): string {
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "—";
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─────────────────────────────────────────────
// HoverActionButton
// ─────────────────────────────────────────────
interface HoverActionButtonProps {
  idleContent: React.ReactNode;
  hoverContent: React.ReactNode;
  idleCls: string;
  hoverCls: string;
  onClick: () => void;
  disabled?: boolean;
}

const HoverActionButton: React.FC<HoverActionButtonProps> = ({
  idleContent, hoverContent, idleCls, hoverCls, onClick, disabled = false,
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      onHoverStart={() => { if (!disabled) setHovered(true); }}
      onHoverEnd={() => setHovered(false)}
      onClick={() => { if (!disabled) onClick(); }}
      disabled={disabled}
      whileTap={disabled ? {} : { scale: 0.96 }}
      className="relative overflow-hidden w-full rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
      style={{ minHeight: "52px" }}
    >
      <AnimatePresence mode="wait">
        {!hovered ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`flex items-center justify-center gap-2 px-4 py-3 text-white text-sm font-bold w-full ${idleCls}`}
          >
            {idleContent}
          </motion.div>
        ) : (
          <motion.div
            key="hover"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`flex items-center justify-center gap-2 px-4 py-3 text-white text-sm font-bold w-full ${hoverCls}`}
          >
            {hoverContent}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// ─────────────────────────────────────────────
// DoneButton
// ─────────────────────────────────────────────
const DoneButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-800 text-white text-sm font-bold shadow-md select-none"
    style={{ minHeight: "52px" }}
  >
    {children}
  </motion.div>
);

// ─────────────────────────────────────────────
// AttendanceCard
// ─────────────────────────────────────────────
const AttendanceCard: React.FC<AttendanceCardProps> = ({
  isCheckedIn, checkInTime, timer, totalLunchSeconds, totalTeaSeconds,
  isLunchBreak, isTeaBreak, lunchStartTime, teaStartTime,
  currentEmployee, user, onCheckInOut, onLunchBreak, onTeaBreak,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Keep existing scroll-to-highlight logic
  useEffect(() => {
    if (!isCheckedIn && localStorage.getItem("highlightCheckIn") === "true") {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
  }, [isCheckedIn]);

  const shouldHighlight = !isCheckedIn && localStorage.getItem("highlightCheckIn") === "true";

  // Live lunch break timer
  const [liveLunchSec, setLiveLunchSec] = useState(0);
  useEffect(() => {
    if (!isLunchBreak || !lunchStartTime) { setLiveLunchSec(0); return; }
    const tick = () => setLiveLunchSec(Math.floor((Date.now() - lunchStartTime.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isLunchBreak, lunchStartTime]);

  // Live tea break timer
  const [liveTeaSec, setLiveTeaSec] = useState(0);
  useEffect(() => {
    if (!isTeaBreak || !teaStartTime) { setLiveTeaSec(0); return; }
    const tick = () => setLiveTeaSec(Math.floor((Date.now() - teaStartTime.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isTeaBreak, teaStartTime]);

  // Derived states
  const isCheckedOut = !isCheckedIn && timer !== "00:00:00";
  const lunchDone = !isLunchBreak && totalLunchSeconds > 0;
  const teaDone = !isTeaBreak && totalTeaSeconds > 0;

  const imgSrc = currentEmployee?.id
    ? `${API_URL}/api/employees/image/${currentEmployee.id}`
    : "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const fallback = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const statusBadgeCls = isLunchBreak
    ? "bg-amber-50 border-amber-200 text-amber-700"
    : isTeaBreak
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : isCheckedIn
        ? "bg-green-50 border-green-200 text-green-700"
        : isCheckedOut
          ? "bg-gray-100 border-gray-200 text-gray-500"
          : "bg-gray-50 border-gray-200 text-gray-400";

  const dotCls = isLunchBreak
    ? "bg-amber-400 animate-pulse"
    : isTeaBreak
      ? "bg-emerald-400 animate-pulse"
      : isCheckedIn
        ? "bg-green-500 animate-pulse"
        : "bg-gray-400";

  const statusLabel = isLunchBreak
    ? "Lunch Break"
    : isTeaBreak
      ? "Tea Break"
      : isCheckedIn
        ? "On Shift"
        : isCheckedOut
          ? "Completed"
          : "Off Shift";

  return (
    <div ref={cardRef} className="w-full">
      <div
        className={
          "w-full bg-white rounded-2xl border shadow-lg overflow-hidden transition-all duration-300 " +
          (shouldHighlight
            ? "ring-4 ring-blue-500 ring-offset-2 border-blue-300"
            : "border-gray-200")
        }
      >
        {/* ── Employee Header ── */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm flex-shrink-0">
              <img
                src={imgSrc}
                alt="profile"
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = fallback; }}
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {user?.full_name || "Employee Name"}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {currentEmployee?.role || user?.role || "Employee"}
                </span>
                <span className="text-gray-300 text-xs">|</span>
                <span className="text-xs text-gray-400">{user?.access_level || "Access Level"}</span>
              </div>
            </div>
          </div>
          <motion.div
            layout
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors duration-300 ${statusBadgeCls}`}
          >
            <span className={`w-2 h-2 rounded-full ${dotCls}`} />
            {statusLabel}
          </motion.div>
        </div>

        {/* ── Stats row ── */}

        {/* ── Total break row ── */}
        <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Break Time</p>
          <p className="text-sm font-bold text-gray-700">{Math.floor((totalLunchSeconds + totalTeaSeconds) / 60)} min</p>
        </div>

        {/* ── Active break alerts ── */}
        <AnimatePresence>
          {(isLunchBreak || isTeaBreak) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-6 py-3 border-b border-gray-100 flex flex-col gap-2">
                {isLunchBreak && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <span className="text-sm">🍱</span>
                    <p className="text-xs text-amber-700 flex-1">
                      Lunch break active — hover the button and click <strong>Stop Lunch</strong> to resume.
                    </p>
                  </div>
                )}
                {isTeaBreak && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    <span className="text-sm">☕</span>
                    <p className="text-xs text-emerald-700 flex-1">
                      Tea break active — hover the button and click <strong>Stop Tea</strong> to resume.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action Buttons ── */}
        <div className="px-6 py-5 grid grid-cols-3 gap-3">

          {/* Working Hours / Check-In-Out */}
          {isCheckedOut ? (
            <DoneButton>
              <span className="text-green-400">✅</span>
              <span>Worked {timerToWorked(timer)}</span>
            </DoneButton>
          ) : !isCheckedIn ? (
            <HoverActionButton
              idleContent={<span className="tracking-wide">Check In</span>}
              hoverContent={<span className="tracking-wide">Check In</span>}
              idleCls="bg-gradient-to-br from-blue-500 to-blue-700"
              hoverCls="bg-gradient-to-br from-blue-600 to-blue-800"
              onClick={() => { localStorage.removeItem("highlightCheckIn"); onCheckInOut(); }}
            />
          ) : (
            <HoverActionButton
              idleContent={
                <span className="flex items-center gap-2 font-mono">
                  <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse inline-block" />
                  {timer.includes("NaN") ? "00:00:00" : timer}
                </span>
              }
              hoverContent={
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-200 inline-block" />
                  Check Out
                </span>
              }
              idleCls="bg-gradient-to-br from-green-500 to-green-700"
              hoverCls="bg-gradient-to-br from-red-500 to-red-700"
              onClick={() => { localStorage.removeItem("highlightCheckIn"); onCheckInOut(); }}
            />
          )}

          {/* Lunch Break */}
          {lunchDone ? (
            <DoneButton>
              <span className="text-green-400">✅</span>
              <span>Lunch {fmtHMS(totalLunchSeconds)}</span>
            </DoneButton>
          ) : isLunchBreak ? (
            <HoverActionButton
              idleContent={<span className="font-mono">🍱 {fmtHMS(liveLunchSec)}</span>}
              hoverContent={<span>⏹ Stop Lunch</span>}
              idleCls="bg-gradient-to-br from-amber-500 to-amber-600"
              hoverCls="bg-gradient-to-br from-red-500 to-red-700"
              onClick={onLunchBreak}
            />
          ) : (
            <HoverActionButton
              idleContent={<span>🍱 Lunch Break</span>}
              hoverContent={<span>🍱 Lunch Break</span>}
              idleCls={isCheckedIn ? "bg-gradient-to-br from-amber-400 to-amber-500" : "bg-gray-300"}
              hoverCls={isCheckedIn ? "bg-gradient-to-br from-amber-500 to-amber-600" : "bg-gray-300"}
              onClick={onLunchBreak}
              disabled={!isCheckedIn}
            />
          )}

          {/* Tea Break */}
          {teaDone ? (
            <DoneButton>
              <span className="text-green-400">✅</span>
              <span>Tea {fmtHMS(totalTeaSeconds)}</span>
            </DoneButton>
          ) : isTeaBreak ? (
            <HoverActionButton
              idleContent={<span className="font-mono">☕ {fmtHMS(liveTeaSec)}</span>}
              hoverContent={<span>⏹ Stop Tea</span>}
              idleCls="bg-gradient-to-br from-emerald-500 to-emerald-600"
              hoverCls="bg-gradient-to-br from-red-500 to-red-700"
              onClick={onTeaBreak}
            />
          ) : (
            <HoverActionButton
              idleContent={<span>☕ Tea Break</span>}
              hoverContent={<span>☕ Tea Break</span>}
              idleCls={isCheckedIn ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gray-300"}
              hoverCls={isCheckedIn ? "bg-gradient-to-br from-emerald-600 to-emerald-700" : "bg-gray-300"}
              onClick={onTeaBreak}
              disabled={!isCheckedIn}
            />
          )}

        </div>
      </div>
    </div>
  );
};

export default AttendanceCard;
