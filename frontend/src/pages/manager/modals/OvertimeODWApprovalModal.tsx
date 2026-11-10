import React, { useState, useMemo } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button/Button';
import {
  SparklesIcon,
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';

export interface OvertimeDayItem {
  date: string;
  total_hours: number;
  check_in?: string;
  check_out?: string;
  status?: string;
}

export interface OvertimeDetailData {
  requestId: number;
  employeeId: string | number;
  employeeName: string;
  requestedShift: string; // e.g. "1.5 Day(s) ODW"
  reason: string;
  status: string;
  fromDate?: string;
  toDate?: string;
  days: OvertimeDayItem[];
}

interface OvertimeODWApprovalModalProps {
  isOpen: boolean;
  data: OvertimeDetailData | null;
  isLoadingDays?: boolean;
  isProcessing?: boolean;
  onApprove: (id: number, approvedShift?: string, approvedReason?: string) => void;
  onReject: (id: number) => void;
  onClose: () => void;
}

export const OvertimeODWApprovalModal: React.FC<OvertimeODWApprovalModalProps> = ({
  isOpen,
  data,
  isLoadingDays = false,
  isProcessing = false,
  onApprove,
  onReject,
  onClose,
}) => {
  if (!data) return null;

  // State for which days the manager keeps selected (all pre-selected)
  const [selectedDateStrs, setSelectedDateStrs] = useState<string[]>(() =>
    (data.days || []).map((d) => d.date)
  );

  // Sync selectedDateStrs when days data loads
  React.useEffect(() => {
    if (data.days && data.days.length > 0) {
      setSelectedDateStrs(data.days.map((d) => d.date));
    }
  }, [data.days]);

  const selectedCount = selectedDateStrs.length;

  // Dynamic recalculation of tier & compensation when manager deselects
  const dynamicCompDays = useMemo(() => {
    if (selectedCount >= 6) return 2.0;
    if (selectedCount >= 5) return 1.5;
    if (selectedCount >= 3) return 1.0;
    return 0.0;
  }, [selectedCount]);

  const toggleDate = (dateStr: string) => {
    if (data.status !== 'Pending') return;
    setSelectedDateStrs((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const toggleSelectAll = () => {
    if (data.status !== 'Pending') return;
    if (selectedDateStrs.length === (data.days || []).length) {
      setSelectedDateStrs([]);
    } else {
      setSelectedDateStrs((data.days || []).map((d) => d.date));
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEE, dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const getTierText = () => {
    if (selectedCount >= 6) return 'Tier 3: 6+ days = +2.0 Days Salary';
    if (selectedCount >= 5) return 'Tier 2: 5 days = +1.5 Days Salary';
    if (selectedCount >= 3) return 'Tier 1: 3 days = +1.0 Day Salary';
    return `${selectedCount} of 3 min days selected`;
  };

  const handleApproveAction = () => {
    const approvedShift = `${dynamicCompDays} Day(s) ODW`;
    const approvedReason = `Overtime Compensation (Manager Approved): Selected ${selectedCount} days (${selectedDateStrs.join(', ')}). Approved ${dynamicCompDays} Day(s) ODW wage benefit.`;
    onApprove(data.requestId, approvedShift, approvedReason);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Review Overtime ODW Benefit Application"
      eyebrow={{
        icon: SparklesIcon,
        label: "Manager ODW Approval",
      }}
    >
      <div className="space-y-4">
        {/* Employee Summary Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 text-amber-700 border border-amber-300">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-neutral-900 flex items-center gap-2">
                  {data.employeeName}
                  <span className="text-[11px] font-bold text-neutral-500 bg-white/80 px-2 py-0.5 rounded border border-neutral-200">
                    ID: {data.employeeId}
                  </span>
                </h4>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Applied for: <strong className="text-neutral-900">{data.requestedShift}</strong>
                  {dynamicCompDays > 0 && dynamicCompDays !== parseFloat(data.requestedShift) && (
                    <span className="ml-1.5 text-amber-800 font-extrabold">
                      ➔ Revised: {dynamicCompDays} Day(s) ODW
                    </span>
                  )}
                </p>
              </div>
            </div>

            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shrink-0 ${
              dynamicCompDays > 0
                ? 'bg-amber-200 text-amber-900 border-amber-300'
                : 'bg-neutral-200 text-neutral-700 border-neutral-300'
            }`}>
              {getTierText()}
            </span>
          </div>
        </div>

        {/* 12-Hour Tier Rule Reference */}
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

        {/* Days Breakdown with CHECKBOXES (Manager can select / deselect) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDaysIcon className="w-4 h-4 text-primary-600" />
              Verified 12-Hour Present Days ({selectedCount}/{data.days?.length || 0})
            </label>
            {data.status === 'Pending' && (data.days?.length || 0) > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors cursor-pointer"
              >
                {selectedDateStrs.length === (data.days?.length || 0) ? 'Unselect All' : 'Select All'}
              </button>
            )}
          </div>

          {isLoadingDays ? (
            <div className="p-6 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading punch logs for claimed days...
            </div>
          ) : (data.days?.length || 0) === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200">
              No individual dates attached or logged for this request.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-neutral-200 rounded-lg p-2 bg-neutral-50/50">
              {data.days.map((item) => {
                const isChecked = selectedDateStrs.includes(item.date);
                return (
                  <label
                    key={item.date}
                    onClick={() => toggleDate(item.date)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                      isChecked
                        ? 'bg-white border-primary-300 shadow-2xs'
                        : 'bg-neutral-100/60 border-neutral-200 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by container label
                        disabled={data.status !== 'Pending'}
                        className="w-4 h-4 text-primary-600 rounded border-neutral-300 focus:ring-primary-500 cursor-pointer accent-primary-600"
                      />
                      <span className="font-bold text-neutral-800">{formatDateLabel(item.date)}</span>
                      {item.check_in && item.check_out && (
                        <span className="text-[11px] text-neutral-500">
                          ({item.check_in} - {item.check_out})
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      isChecked
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                    }`}>
                      {item.total_hours} hrs • {item.status || 'Present'}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Employee Note / Reason */}
        <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200">
          <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wide mb-1">
            Employee Claim Reason
          </label>
          <p className="text-xs text-neutral-800 leading-relaxed font-medium">
            {data.reason || 'No claim reason provided.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            Close
          </Button>

          {data.status === 'Pending' ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => onReject(data.requestId)}
                disabled={isProcessing}
                loading={isProcessing}
                icon={XCircleIcon}
              >
                Reject Request
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleApproveAction}
                disabled={isProcessing || dynamicCompDays <= 0}
                loading={isProcessing}
                icon={CheckCircleIcon}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {dynamicCompDays > 0
                  ? `Approve ${dynamicCompDays} Day(s) ODW (${selectedCount} Days)`
                  : `Select min 3 Days (${selectedCount}/3)`}
              </Button>
            </div>
          ) : (
            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
              data.status === 'Approved'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              Request is {data.status}
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
};
export default OvertimeODWApprovalModal;
