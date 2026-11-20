import React, { useState, useMemo } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button/Button';
import { ClockIcon, CalendarDaysIcon, CheckCircleIcon, SparklesIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';

export interface Eligible12HourDay {
  date: string;
  total_hours: number;
  check_in?: string;
  check_out?: string;
  status?: string; // 'Approved', 'Pending', or 'Available'
  is_blocked?: boolean;
}

interface OvertimeODWCompensationModalProps {
  isOpen: boolean;
  qualifyingDays: Eligible12HourDay[];
  qualifyingCount: number;
  compensationDays: number; // e.g. 1.0, 1.5, 2.0
  cycleStart: string;
  cycleEnd: string;
  alreadyRequested?: boolean;
  existingStatus?: string;
  isLoading?: boolean;
  onSubmit: (reason: string, compensationDays: number, selectedDates?: string[]) => Promise<void>;
  onClose: () => void;
}

export const OvertimeODWCompensationModal: React.FC<OvertimeODWCompensationModalProps> = ({
  isOpen,
  qualifyingDays,
  qualifyingCount: initialCount,
  compensationDays: initialCompDays,
  cycleStart,
  cycleEnd,
  alreadyRequested = false,
  existingStatus,
  isLoading = false,
  onSubmit,
  onClose,
}) => {
  // Only non-blocked (unclaimed/available) dates should be selectable by default
  const availableDays = useMemo(() => {
    return qualifyingDays.filter((d) => !d.is_blocked && d.status !== 'Approved' && d.status !== 'Pending');
  }, [qualifyingDays]);

  const [selectedDateStrs, setSelectedDateStrs] = useState<string[]>(() =>
    availableDays.map((d) => d.date)
  );

  // Dynamic recalculation when employee checks/unchecks dates
  const selectedCount = selectedDateStrs.length;

  const dynamicCompDays = useMemo(() => {
    if (selectedCount >= 6) return 2.0;
    if (selectedCount >= 5) return 1.5;
    if (selectedCount >= 3) return 1.0;
    return 0.0;
  }, [selectedCount]);

  const [customReason, setCustomReason] = useState<string>("");

  const defaultReason = useMemo(() => {
    if (selectedCount >= 3) {
      return `Overtime Compensation: Selected ${selectedCount} days of 12+ hours (${selectedDateStrs.join(', ')}) in payroll cycle (${cycleStart} to ${cycleEnd}). Claiming ${dynamicCompDays} Day(s) ODW wage benefit.`;
    }
    return `Overtime Compensation: Selected ${selectedCount} days of 12+ hours in payroll cycle (${cycleStart} to ${cycleEnd}). Need minimum 3 days to claim benefit.`;
  }, [selectedCount, selectedDateStrs, dynamicCompDays, cycleStart, cycleEnd]);

  const activeReason = customReason !== "" ? customReason : defaultReason;

  const toggleDate = (item: Eligible12HourDay) => {
    if (alreadyRequested || item.is_blocked || item.status === 'Approved' || item.status === 'Pending') return;
    const dateStr = item.date;
    setSelectedDateStrs((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const toggleSelectAll = () => {
    if (alreadyRequested) return;
    if (selectedDateStrs.length === availableDays.length) {
      setSelectedDateStrs([]);
    } else {
      setSelectedDateStrs(availableDays.map((d) => d.date));
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEE, dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const getTierBadgeText = () => {
    if (selectedCount >= 6) return 'Tier 3: 6+ days (2.0 Days Salary)';
    if (selectedCount >= 5) return 'Tier 2: 5 days (1.5 Days Salary)';
    if (selectedCount >= 3) return 'Tier 1: 3 days (1.0 Day Salary)';
    return `${selectedCount} of 3 min days selected`;
  };

  const approvedDaysCount = qualifyingDays.filter((d) => d.status === 'Approved' || d.is_blocked).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Overtime Compensation (ODW Benefit)"
      eyebrow={{
        icon: SparklesIcon,
        label: "Payroll Cycle Benefit",
      }}
    >
      <div className="space-y-4">
        {/* Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 text-amber-700 border border-amber-300">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-neutral-900">
                  12-Hour Overtime Policy
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  dynamicCompDays > 0
                    ? 'bg-amber-200 text-amber-900 border-amber-300'
                    : 'bg-neutral-200 text-neutral-700 border-neutral-300'
                }`}>
                  {getTierBadgeText()}
                </span>
              </div>
              <p className="text-xs text-neutral-700 leading-relaxed">
                You worked 12+ hours on <strong>{qualifyingDays.length} days</strong> this cycle.
                {approvedDaysCount > 0 && (
                  <span className="text-emerald-800 font-semibold"> ({approvedDaysCount} day(s) already approved/credited).</span>
                )}
                {' '}You have selected <strong>{selectedCount} new day(s)</strong>.
                {dynamicCompDays > 0 ? (
                  <>
                    {' '}Under policy, your attendance stays <strong className="text-emerald-700">Present</strong>, and you qualify for <strong className="text-amber-800 font-extrabold">+{dynamicCompDays} Day(s) of additional ODW salary compensation</strong>!
                  </>
                ) : availableDays.length >= 3 ? (
                  <>
                    {' '}<span className="text-rose-600 font-bold">Select at least 3 days to qualify for 1.0 Day ODW benefit.</span>
                  </>
                ) : (
                  <>
                    {' '}<span className="text-neutral-500">All eligible dates have already been processed or fewer than 3 available dates remain.</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Policy Reference Box */}
        <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 text-xs">
          <p className="font-bold text-neutral-700 mb-1.5 flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4 text-primary-600" />
            Approved Overtime Compensation Tiers:
          </p>
          <div className="grid grid-cols-3 gap-2 text-[11px] text-center">
            <div className={`p-2 rounded-lg border transition-all ${selectedCount === 3 || selectedCount === 4 ? 'bg-amber-100/90 border-amber-400 font-extrabold text-amber-950 shadow-xs' : 'bg-white border-neutral-200 text-neutral-600'}`}>
              <div className="text-xs font-black">3 Days</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">= 1.0 Day Salary</div>
            </div>
            <div className={`p-2 rounded-lg border transition-all ${selectedCount === 5 ? 'bg-amber-100/90 border-amber-400 font-extrabold text-amber-950 shadow-xs' : 'bg-white border-neutral-200 text-neutral-600'}`}>
              <div className="text-xs font-black">5 Days</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">= 1.5 Days Salary</div>
            </div>
            <div className={`p-2 rounded-lg border transition-all ${selectedCount >= 6 ? 'bg-amber-100/90 border-amber-400 font-extrabold text-amber-950 shadow-xs' : 'bg-white border-neutral-200 text-neutral-600'}`}>
              <div className="text-xs font-black">6+ Days</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">= 2.0 Days Salary</div>
            </div>
          </div>
        </div>

        {/* Qualifying Days with CHECKBOXES */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDaysIcon className="w-4 h-4 text-primary-600" />
              Qualifying Days ({selectedCount} selected / {availableDays.length} available)
            </label>
            {availableDays.length > 0 && !alreadyRequested && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors cursor-pointer"
              >
                {selectedDateStrs.length === availableDays.length ? 'Unselect All' : 'Select All'}
              </button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-neutral-200 rounded-lg p-2 bg-neutral-50/50">
            {qualifyingDays.map((item) => {
              const isBlocked = item.is_blocked || item.status === 'Approved' || item.status === 'Pending';
              const isChecked = isBlocked ? false : selectedDateStrs.includes(item.date);

              return (
                <label
                  key={item.date}
                  onClick={() => toggleDate(item)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs select-none transition-all ${
                    isBlocked
                      ? 'bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed opacity-75'
                      : isChecked
                        ? 'bg-white border-primary-300 shadow-2xs cursor-pointer'
                        : 'bg-neutral-100/60 border-neutral-200 opacity-60 hover:opacity-90 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isBlocked || alreadyRequested}
                      onChange={() => {}} // Handled by container label onClick
                      className="w-4 h-4 text-primary-600 rounded border-neutral-300 focus:ring-primary-500 accent-primary-600 disabled:opacity-50"
                    />
                    <span className={`font-bold ${isBlocked ? 'text-neutral-500 line-through' : 'text-neutral-800'}`}>
                      {formatDateLabel(item.date)}
                    </span>
                    {item.check_in && item.check_out && (
                      <span className="text-[11px] text-neutral-400">
                        ({item.check_in} - {item.check_out})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.status === 'Approved' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
                        ODW Approved (Blocked)
                      </span>
                    )}
                    {item.status === 'Pending' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                        <ClockIcon className="w-3 h-3 text-amber-600" />
                        Pending Approval
                      </span>
                    )}
                    {!isBlocked && (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        isChecked
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                      }`}>
                        {item.total_hours} hrs • Present
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Reason / Claim Justification */}
        {availableDays.length >= 3 && !alreadyRequested && (
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Claim Summary for Manager
            </label>
            <textarea
              rows={2}
              value={activeReason}
              onChange={(e) => setCustomReason(e.target.value)}
              disabled={alreadyRequested}
              className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Close
          </Button>

          {alreadyRequested && availableDays.length === 0 ? (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                existingStatus === 'Approved'
                  ? 'bg-success-50 text-success-700 border-success-200'
                  : 'bg-warning-50 text-warning-700 border-warning-200'
              }`}>
                ODW Request Already Submitted ({existingStatus})
              </span>
            </div>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onSubmit(activeReason, dynamicCompDays, selectedDateStrs)}
              disabled={isLoading || dynamicCompDays <= 0}
              loading={isLoading}
              icon={CheckCircleIcon}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold"
            >
              {dynamicCompDays > 0
                ? `Apply for ${dynamicCompDays} Day(s) ODW Benefit (${selectedCount} Days)`
                : availableDays.length < 3
                  ? `All eligible dates processed`
                  : `Select at least 3 Days (${selectedCount}/3)`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
export default OvertimeODWCompensationModal;
