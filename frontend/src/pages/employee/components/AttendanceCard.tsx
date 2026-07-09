import React from "react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

interface AttendanceCardProps {
  isCheckedIn: boolean;
  checkInTime: Date | null;
  timer: string;
  totalLunchSeconds: number;
  totalTeaSeconds: number;
  isLunchBreak: boolean;
  isTeaBreak: boolean;
  currentEmployee: any;
  user: any;
  onCheckInOut: () => void;
  onLunchBreak: () => void;
  onTeaBreak: () => void;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({
  isCheckedIn,
  checkInTime,
  timer,
  totalLunchSeconds,
  totalTeaSeconds,
  isLunchBreak,
  isTeaBreak,
  currentEmployee,
  user,
  onCheckInOut,
  onLunchBreak,
  onTeaBreak,
}) => {
  return (
    <Card padding="none" className="w-full max-w-10xl overflow-hidden">
      {/* Employee Header */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center gap-4 h-[10px]">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-neutral-200 flex-shrink-0">
            <img
              src={
                currentEmployee?.id
                  ? `http://localhost:5001/api/employees/image/${currentEmployee.id}`
                  : "https://cdn-icons-png.flaticon.com/512/149/149071.png"
              }
              alt="profile"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                  "https://cdn-icons-png.flaticon.com/512/149/149071.png";
              }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-800">
              {user?.full_name || "Employee Name"}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                {currentEmployee?.role || user?.role || "Employee"}
              </span>
              <span className="text-neutral-300 text-xs">|</span>
              <span className="text-xs text-neutral-500">
                {user?.access_level || "Access Level"}
              </span>
            </div>
          </div>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
            isCheckedIn
              ? "bg-success-50 border-success-200 text-success-700"
              : "bg-neutral-50 border-neutral-200 text-neutral-500"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${isCheckedIn ? "bg-success-500" : "bg-neutral-400"}`}
          />
          {isCheckedIn ? "On Shift" : "Off Shift"}
        </div>
      </div>

      {/* Three Column Stats */}
      <div className="grid grid-cols-3 divide-x divide-neutral-100 border-b border-neutral-100">
        <div className="px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">
            Working Hours
          </p>
          <p className="text-2xl font-bold font-mono text-neutral-800 leading-none tracking-tight">
            {timer}
          </p>
          <p className="text-xs text-neutral-400 mt-2">
            {isCheckedIn && checkInTime ? (
              <>Since{' '}
                <span className="text-neutral-700 font-medium">
                  {checkInTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </>
            ) : timer !== "00:00:00" ? (
              'Today’s tracked working hours.'
            ) : (
              'Check in today to start tracking hours.'
            )}
          </p>
        </div>

        <div className="px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">
            Lunch Break
          </p>
          <p className="text-2xl font-bold font-mono text-neutral-800 leading-none">
            {Math.floor(totalLunchSeconds / 60)}
            <span className="text-lg font-medium text-neutral-400 ml-1">min</span>
          </p>
          <p className="text-xs text-neutral-400 mt-2">
            {isCheckedIn ? (
              isLunchBreak ? (
                <span className="text-warning-600 font-medium">
                  ● Break running
                </span>
              ) : (
                'Lunch break duration'
              )
            ) : totalLunchSeconds > 0 ? (
              'Today’s lunch break total.'
            ) : (
              'Check in to track lunch duration.'
            )}
          </p>
        </div>

        <div className="px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">
            Tea Break
          </p>
          <p className="text-2xl font-bold font-mono text-neutral-800 leading-none">
            {Math.floor(totalTeaSeconds / 60)}
            <span className="text-lg font-medium text-neutral-400 ml-1">min</span>
          </p>
          <p className="text-xs text-neutral-400 mt-2">
            {isCheckedIn ? (
              isTeaBreak ? (
                <span className="text-success-600 font-medium">
                  ● Break running
                </span>
              ) : (
                'Tea break duration'
              )
            ) : totalTeaSeconds > 0 ? (
              'Today’s tea break total.'
            ) : (
              'Check in to track tea duration.'
            )}
          </p>
        </div>
      </div>

      {/* Total Break Row */}
      <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
          Total Break Time
        </p>
        <p className="text-sm font-bold text-neutral-800">
          {Math.floor((totalLunchSeconds + totalTeaSeconds) / 60)} min
        </p>
      </div>

      {/* Active Break Alerts */}
      {(isLunchBreak || isTeaBreak) && (
        <div className="px-6 py-3 border-b border-neutral-100 flex flex-col gap-2">
          {isLunchBreak && (
            <div className="flex items-center gap-2 bg-warning-50 border border-warning-200 rounded-xl px-3 py-2">
              <span className="text-sm">🍱</span>
              <p className="text-xs text-warning-700 flex-1">
                Lunch break is active — click <strong>Stop Lunch</strong> before
                resuming work.
              </p>
            </div>
          )}
          {isTeaBreak && (
            <div className="flex items-center gap-2 bg-success-50 border border-success-200 rounded-xl px-3 py-2">
              <span className="text-sm">☕</span>
              <p className="text-xs text-success-700 flex-1">
                Tea break is active — click <strong>Stop Tea</strong> before
                resuming work.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-6 py-4 grid grid-cols-3 gap-3">
        <Button
          variant={isCheckedIn ? "danger" : "primary"}
          size="lg"
          fullWidth
          onClick={onCheckInOut}
        >
          {isCheckedIn ? "Check Out" : "Check In"}
        </Button>

        <Button
          variant={!isCheckedIn ? "outline" : isLunchBreak ? "danger" : "warning"}
          size="lg"
          fullWidth
          disabled={!isCheckedIn}
          onClick={onLunchBreak}
        >
          {!isCheckedIn
            ? "🔒 Check In Required"
            : isLunchBreak
              ? "⏹ Stop Lunch"
              : "🍱 Lunch Break"}
        </Button>

        <Button
          variant={!isCheckedIn ? "outline" : isTeaBreak ? "danger" : "success"}
          size="lg"
          fullWidth
          disabled={!isCheckedIn}
          onClick={onTeaBreak}
        >
          {!isCheckedIn
            ? "🔒 Check In Required"
            : isTeaBreak
              ? "⏹ Stop Tea"
              : "☕ Tea Break"}
        </Button>
      </div>
    </Card>
  );
};

export default AttendanceCard;
