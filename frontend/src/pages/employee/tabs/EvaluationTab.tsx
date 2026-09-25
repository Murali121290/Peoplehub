import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { API_URL, getProfileImageUrl } from '../../../config/api';
import apiService from '../../../services/api';
import {
  EvaluationCycle,
  EvaluationResponse,
  KPIResponseItem,
  KPICategory,
  KPIItem,
  RollupTier,
  YearlyMonthRecord,
  YearlyMonthKPIEntry
} from '../../../types/evaluation.types';
import {
  evaluationService,
  DEFAULT_KPI_CATEGORIES,
  ManagerKpiTemplateRecord,
  FISCAL_MONTHS,
  initializeYearlyMonthlyRecords
} from '../../../services/evaluationService';
import {
  calculateKPIScore,
  calculateOverallScore,
  getRatingForScore,
  getRatingScale,
  parseTargetExpression,
  isNegativeKpi,
  DEFAULT_RATING_SCALE
} from '../../../services/scoreService';
import { useAuthStore } from '../../../store/authStore';
import { DatePicker } from '../../../components/ui/DatePicker';
import {
  PlusIcon,
  CheckIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  UserIcon,
  PrinterIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  StarIcon,
  TrashIcon,
  TableCellsIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  DocumentChartBarIcon,
  ClockIcon,
  CalendarDaysIcon,
  LockClosedIcon,
  PencilSquareIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  FunnelIcon,
  FireIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  ArrowDownTrayIcon,
  FolderIcon,
  BellAlertIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ArrowUturnLeftIcon,
  Square3Stack3DIcon,
  InboxStackIcon,
  TrophyIcon,
  InformationCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowLeftIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import * as XLSX from 'xlsx';
import { ConfirmDialog } from '../../../components/ui/Modal/ConfirmDialog';

/**
 * Determines if remarks are mandatory for an employee deliverable.
 * Remarks are mandatory when actual performance is High or Low compared to target:
 * - Standard KPIs: actual > target (High) or actual < target (Low).
 * - Low-target KPIs: actual > 0 (delays/misses/escalations occurred).
 * If target is met exactly / standard, remark is optional.
 */
/**
 * Determines if remarks are mandatory for an employee deliverable.
 * Remarks are mandatory when:
 * 1. The deliverable is Low Target or High / Exceeded Target compared to goal.
 * 2. Or the employee has selected / ticked the Insufficient checkbox.
 */
export const isKpiRemarkMandatory = (
  kpi: Partial<KPIItem> | null | undefined,
  val: string | number | undefined | null,
  isFlaggedByEmployee?: boolean
): boolean => {
  if (isFlaggedByEmployee) return true;
  if (!kpi || val === '' || val === undefined || val === null) {
    return false;
  }
  const numericVal = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(numericVal)) return false;

  const isNeg = isNegativeKpi(kpi);
  const parsedTarget = parseTargetExpression(kpi.targetFromManager, kpi.targetValue || 1);
  const targetThreshold = parsedTarget.threshold;

  if (isNeg) {
    // For low-target / negative KPIs (e.g. <2 delays, 0 misses, 0 escalations):
    // If any penalty occurred (> 0), remark is mandatory
    return numericVal > 0;
  } else {
    // For standard KPIs:
    // High (numericVal > targetThreshold) or Low (numericVal < targetThreshold) -> Mandatory
    return numericVal !== targetThreshold;
  }
};

export interface InsufficientStatusResult {
  status: 'not_filled' | 'insufficient' | 'met' | 'exceeded';
  label: string;
  badgeClass: string;
}

/**
 * Evaluates employee actual performance against target to determine status label:
 * - Insufficient: when actual is below target threshold (or penalty limits exceeded).
 * - Exceeded: when actual exceeds target threshold.
 * - Target Met: when actual matches target or is within allowed limits.
 */
export const computeMetricDeficitLabel = (
  kpi: Partial<KPIItem> | null | undefined,
  val: string | number | undefined | null
): string => {
  if (val === '' || val === undefined || val === null || String(val).trim() === '') {
    return 'Not Filled';
  }
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num)) return 'Not Filled';

  const isNeg = isNegativeKpi(kpi);
  const parsedTarget = parseTargetExpression(kpi?.targetFromManager, kpi?.targetValue || 1);
  const target = parsedTarget.threshold;
  const rawUnit = (kpi?.unit || '').trim();
  const unitSuffix = rawUnit ? ` ${rawUnit}` : '';

  if (isNeg) {
    if (num > target) {
      const excess = Math.round((num - target) * 100) / 100;
      return `Insufficient (+${excess}${unitSuffix})`;
    }
    return 'Target Met';
  }

  if (num < target) {
    const deficit = Math.round((target - num) * 100) / 100;
    return `Insufficient (-${deficit}${unitSuffix})`;
  } else if (num > target) {
    const surplus = Math.round((num - target) * 100) / 100;
    return `Exceeded (+${surplus}${unitSuffix})`;
  }
  return 'Target Met';
};

/**
 * Evaluates employee actual performance against target:
 * - When target is exceeded: displays Exceeded (+X).
 * - When target is deficient/penalized: displays Insufficient (-X) or Insufficient (+X).
 * - When target is met: displays Target Met.
 */
export const getInsufficientStatus = (
  kpi: Partial<KPIItem> | null | undefined,
  val: string | number | undefined | null,
  isFlaggedByEmployee?: boolean
): InsufficientStatusResult => {
  if (val === '' || val === undefined || val === null || String(val).trim() === '') {
    return {
      status: 'not_filled',
      label: 'Not Filled',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200'
    };
  }

  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num)) {
    return {
      status: 'not_filled',
      label: 'Not Filled',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200'
    };
  }

  const isNeg = isNegativeKpi(kpi);
  const parsedTarget = parseTargetExpression(kpi?.targetFromManager, kpi?.targetValue || 1);
  const target = parsedTarget.threshold;
  const rawUnit = (kpi?.unit || '').trim();
  const unitSuffix = rawUnit ? ` ${rawUnit}` : '';

  // 1. Standard KPI Exceeded Target (e.g. 11 vs 1 projects)
  if (!isNeg && num > target) {
    const surplus = Math.round((num - target) * 100) / 100;
    return isFlaggedByEmployee
      ? {
          status: 'exceeded',
          label: `Exceeded (+${surplus}${unitSuffix})`,
          badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300'
        }
      : {
          status: 'exceeded',
          label: 'High Target',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200'
        };
  }

  // 2. Standard KPI Below Target (Deficit / Low Target, e.g. 2 vs 3 projects)
  if (!isNeg && num < target) {
    const deficit = Math.round((target - num) * 100) / 100;
    return isFlaggedByEmployee
      ? {
          status: 'insufficient',
          label: `Insufficient (-${deficit}${unitSuffix})`,
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300'
        }
      : {
          status: 'insufficient',
          label: 'Low Target',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
        };
  }

  // 3. Negative / Low-Target KPI Limit Exceeded (e.g. 4 vs <2 delays)
  if (isNeg && num > target) {
    const excess = Math.round((num - target) * 100) / 100;
    return isFlaggedByEmployee
      ? {
          status: 'insufficient',
          label: `Insufficient (+${excess}${unitSuffix})`,
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-300'
        }
      : {
          status: 'insufficient',
          label: 'High Target',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200'
        };
  }

  // 4. Exactly met or within allowable limit
  return {
    status: 'met',
    label: 'Target Met',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200'
  };
};

const ExpandableRemarkInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}> = ({ value, onChange, placeholder = 'Remarks...', disabled = false, required = false, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const isLong = (value || '').length > 30 || (value || '').includes('\n');

  useEffect(() => {
    if (!value || !value.trim() || (!value.includes('\n') && value.length <= 30)) {
      setIsExpanded(false);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    if (!newVal || !newVal.trim() || (!newVal.includes('\n') && newVal.length <= 30)) {
      setIsExpanded(false);
    }
  };

  return (
    <div className="relative group w-full flex flex-col items-end">
      <textarea
        rows={isExpanded ? 3 : 1}
        value={value}
        disabled={disabled}
        required={required}
        onChange={handleChange}
        placeholder={placeholder}
        onFocus={() => {
          if (isLong && !isExpanded) setIsExpanded(true);
        }}
        className={`w-full py-1.5 px-3 text-xs rounded-xl transition-all duration-200 resize-none ${isExpanded ? 'min-h-[72px]' : 'h-8.5 overflow-hidden'
          } ${className}`}
      />
      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[10px] font-bold text-teal-800 hover:text-teal-900 bg-teal-50 hover:bg-teal-100/70 px-1.5 py-0.5 rounded-md border border-teal-200/80 shadow-2xs flex items-center gap-0.5 transition cursor-pointer mt-1"
        >
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          {isExpanded ? (
            <ChevronUpIcon className="w-2.5 h-2.5 stroke-[2.5]" />
          ) : (
            <ChevronDownIcon className="w-2.5 h-2.5 stroke-[2.5]" />
          )}
        </button>
      )}
    </div>
  );
};

const ExpandableRemarkView: React.FC<{
  text: string;
  fallback?: string;
}> = ({ text, fallback = '—' }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!text || !text.trim()) {
    return <span className="text-slate-400 font-medium text-xs">—</span>;
  }

  const cleanText = text.trim().replace(/^["']|["']$/g, '');
  const isLong = cleanText.length > 35 || cleanText.includes('\n');

  if (!isLong) {
    return (
      <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs text-slate-700 font-medium break-words inline-block max-w-[240px]">
        {cleanText}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 text-xs text-slate-700 max-w-[250px]">
      <div className={`w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-slate-700 font-medium transition-all ${isExpanded ? "break-words leading-relaxed max-h-60 overflow-y-auto shadow-2xs" : "line-clamp-2"
        }`}>
        {cleanText}
      </div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/80 px-2 py-0.5 rounded-md border border-teal-200 transition cursor-pointer self-end mt-0.5"
      >
        <span>{isExpanded ? 'Show less' : 'Show more'}</span>
        {isExpanded ? (
          <ChevronUpIcon className="w-2.5 h-2.5 stroke-[2.5]" />
        ) : (
          <ChevronDownIcon className="w-2.5 h-2.5 stroke-[2.5]" />
        )}
      </button>
    </div>
  );
};

const DeliverableRemarksHover: React.FC<{
  selfRemarks?: string;
  mgrRemarks?: string;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}> = ({ selfRemarks, mgrRemarks, children, align = 'left', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    maxHeight: number;
    isFlippedUp: boolean;
  }>({ left: 0, maxHeight: 320, isFlippedUp: false });
  const triggerRef = useRef<HTMLDivElement>(null);
  const enterTimeoutRef = useRef<any>(null);
  const leaveTimeoutRef = useRef<any>(null);

  const hasRemarks = Boolean(selfRemarks?.trim() || mgrRemarks?.trim());

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 340;

    let left = align === 'center'
      ? rect.left + rect.width / 2 - popoverWidth / 2
      : align === 'left'
        ? rect.left
        : rect.right - popoverWidth;

    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    left = Math.max(16, left);

    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - 16);
    const spaceAbove = Math.max(0, rect.top - 16);
    const isFlippedUp = (spaceBelow < 300 && spaceAbove > spaceBelow);

    if (isFlippedUp) {
      const bottom = Math.max(16, window.innerHeight - rect.top + 6);
      const maxHeight = Math.max(140, Math.min(420, spaceAbove - 12));
      setCoords({ bottom, left, maxHeight, isFlippedUp: true });
    } else {
      const top = Math.max(16, rect.bottom + 6);
      const maxHeight = Math.max(140, Math.min(420, spaceBelow - 12));
      setCoords({ top, left, maxHeight, isFlippedUp: false });
    }
  };

  const handleMouseEnter = () => {
    if (!hasRemarks) return;
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
    enterTimeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsOpen(true);
    }, 80);
  };

  const handleMouseLeave = () => {
    if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className.includes('w-') ? '' : 'w-full'} ${className}`}
    >
      {children}

      {isOpen && hasRemarks && typeof document !== 'undefined' && createPortal(
        <div
          onMouseEnter={() => { if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current); }}
          onMouseLeave={() => { leaveTimeoutRef.current = setTimeout(() => setIsOpen(false), 150); }}
          style={{
            position: 'fixed',
            ...(coords.isFlippedUp ? { bottom: `${coords.bottom}px` } : { top: `${coords.top}px` }),
            left: `${coords.left}px`,
            width: '340px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: `${coords.maxHeight}px`,
            zIndex: 999999,
          }}
          className="flex flex-col gap-2 p-3 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200/95 ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 pointer-events-auto text-left select-text overflow-y-auto overscroll-contain"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-[11px] font-bold text-slate-500 shrink-0">
            <span className="flex items-center gap-1.5 text-slate-800">
              <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5 text-teal-600" />
              <span>Deliverable Remarks</span>
            </span>
          </div>

          {selfRemarks?.trim() && (
            <div className="space-y-1 p-2 rounded-xl bg-primary-50/50 border border-primary-200/60 shrink-0">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary-600 text-white shadow-2xs">
                Employee Remark
              </span>
              <p className="text-slate-800 text-xs leading-relaxed font-normal whitespace-pre-wrap break-words">
                {selfRemarks.trim()}
              </p>
            </div>
          )}

          {mgrRemarks?.trim() && (
            <div className="space-y-1 p-2 rounded-xl bg-teal-50/60 border border-teal-200/70 shrink-0">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-700 text-white shadow-2xs">
                Manager Remark
              </span>
              <p className="text-slate-800 text-xs leading-relaxed font-medium whitespace-pre-wrap break-words">
                {mgrRemarks.trim()}
              </p>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

const SubmissionDatesHover: React.FC<{
  subDate?: string | null;
  approvedDate?: string | null;
  isSubmitted?: boolean;
  children: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
  nativeTitle?: string;
}> = ({ subDate, approvedDate, isSubmitted = false, children, align = 'left', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    isFlippedUp: boolean;
  }>({ left: 0, isFlippedUp: true });
  const triggerRef = useRef<HTMLDivElement>(null);
  const enterTimeoutRef = useRef<any>(null);
  const leaveTimeoutRef = useRef<any>(null);

  const hasContent = Boolean(subDate || approvedDate || isSubmitted !== undefined);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    const isFlippedUp = spaceAbove >= 70 || spaceAbove > spaceBelow;

    let left = align === 'center'
      ? rect.left + rect.width / 2
      : rect.left;

    if (align === 'center') {
      left = Math.max(120, Math.min(window.innerWidth - 120, left));
    } else {
      left = Math.max(16, Math.min(window.innerWidth - 240, left));
    }

    if (isFlippedUp) {
      const bottom = Math.max(10, window.innerHeight - rect.top + 6);
      setCoords({ bottom, left, isFlippedUp: true });
    } else {
      const top = Math.max(10, rect.bottom + 6);
      setCoords({ top, left, isFlippedUp: false });
    }
  };

  const handleMouseEnter = () => {
    if (!hasContent) return;
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
    enterTimeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsOpen(true);
    }, 30);
  };

  const handleMouseLeave = () => {
    if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 60);
  };

  useEffect(() => {
    return () => {
      if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex flex-col ${align === 'center' ? 'items-center justify-center' : 'items-start'} gap-0.5 cursor-pointer ${className}`}
    >
      {children}

      {isOpen && hasContent && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            ...(coords.isFlippedUp
              ? { bottom: `${coords.bottom}px` }
              : { top: `${coords.top}px` }),
            left: `${coords.left}px`,
            transform: align === 'center' ? 'translateX(-50%)' : 'none',
            zIndex: 999999,
          }}
          className="flex flex-col gap-1.5 p-2 bg-white/95 backdrop-blur-md text-slate-800 text-[11px] rounded-xl shadow-xl border border-slate-200/90 ring-1 ring-slate-900/5 whitespace-nowrap pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95"
        >
          {subDate ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50/90 text-amber-900 border border-amber-200/80 font-medium">
              <ClockIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Submitted: <strong className="text-amber-950 font-bold">{subDate}</strong></span>
            </div>
          ) : !isSubmitted ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              <ClockIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Status: <strong className="text-slate-800 font-bold">Pending Employee Submission</strong></span>
            </div>
          ) : null}
          {approvedDate && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50/90 text-emerald-900 border border-emerald-200/80 font-medium">
              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Approved: <strong className="text-emerald-950 font-bold">{approvedDate}</strong></span>
            </div>
          )}
          {coords.isFlippedUp ? (
            <div
              className={`absolute top-full -mt-px border-4 border-transparent border-t-white ${align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-4'
                }`}
            />
          ) : (
            <div
              className={`absolute bottom-full -mb-px border-4 border-transparent border-b-white ${align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-4'
                }`}
            />
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export const parseEvalDateTimestamp = (r: EvaluationResponse): number => {
  if (!r) return 0;
  const str = `${(r as any).periodName || ''} ${(r as any).form || ''} ${(r as any).name || ''} ${r.cycleId || ''}`;

  // 1. Match Month Day, Year e.g. "Sep 16, 2026" or "September 16, 2026"
  const m1 = str.match(/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m1) {
    const d = new Date(`${m1[1]} ${m1[2]}, ${m1[3]}`).getTime();
    if (!isNaN(d) && d > 0) return d;
  }

  // 2. Match YYYY-MM-DD
  const m2 = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) {
    const d = new Date(m2[0]).getTime();
    if (!isNaN(d) && d > 0) return d;
  }

  // 3. Match Month Year e.g. "September 2026"
  const m3 = str.match(/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i);
  if (m3) {
    const d = new Date(`${m3[1]} 1, ${m3[2]}`).getTime();
    if (!isNaN(d) && d > 0) return d;
  }

  // 4. Timestamp fields
  const time = new Date(r.serviceManagerApprovedAt || r.managerReviewedAt || r.employeeSubmittedAt || r.createdAt || r.updatedAt || 0).getTime();
  if (!isNaN(time) && time > 0) return time;

  // 5. Numeric ID fallback (e.g. resp_16 -> 16)
  const num = parseInt(String(r.id || '').replace(/\D/g, ''), 10) || 0;
  return num;
};

// Helper to format ISO date timestamps into clean readable dates with time in system local time (e.g. "18 Sep 2026, 11:51 AM")
export const formatEvalDateTime = (dateVal?: string | Date | null): string | null => {
  if (!dateVal) return null;
  let d: Date;
  if (typeof dateVal === 'string') {
    let s = dateVal.trim();
    if (s.includes(' ') && !s.includes('T')) {
      s = s.replace(' ', 'T');
    }
    if (s.includes('T') && !s.endsWith('Z') && !s.includes('+') && !s.slice(10).includes('-')) {
      s = s + 'Z';
    }
    d = new Date(s);
    if (isNaN(d.getTime())) {
      d = new Date(dateVal);
    }
  } else {
    d = new Date(dateVal);
  }
  if (isNaN(d.getTime()) || d.getTime() <= 0) return null;
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
};

// Helper to verify if an employee is currently active (filters out deactive/inactive employees)
export const isEmployeeActive = (emp: any): boolean => {
  if (!emp) return false;
  // Check boolean flag (false, 'false', 0, '0')
  if (emp.is_active === false || emp.is_active === 'false' || emp.is_active === 0 || emp.is_active === '0') {
    return false;
  }
  // Check text status string (e.g. Inactive, deactive, deactivated)
  const status = String(emp.status || '').toLowerCase().trim();
  if (status === 'inactive' || status === 'deactive' || status === 'deactivated' || status === 'disabled') {
    return false;
  }
  return true;
};

export const EvaluationTab: React.FC = () => {
  const { user } = useAuthStore();
  // Role determination strictly separated - strictly based on Access Level, ignoring job designation
  const rawAccessLevel = `${user?.access_level || localStorage.getItem('access_level') || ''}`.toLowerCase().trim();
  const rawRole = `${user?.role || localStorage.getItem('role') || ''}`.toLowerCase().trim();
  const isExplicitUser = rawAccessLevel === 'user' || rawAccessLevel === 'employee' || rawAccessLevel === 'standard';

  const isHrOrAdmin = !isExplicitUser && (
    rawAccessLevel === 'admin' ||
    rawAccessLevel === 'super_admin' ||
    rawAccessLevel === 'super admin' ||
    rawAccessLevel === 'hr' ||
    rawAccessLevel === 'hr_admin' ||
    (!rawAccessLevel && (rawRole === 'admin' || rawRole === 'super_admin' || rawRole === 'super admin' || rawRole === 'hr' || rawRole === 'hr_admin'))
  );

  const isServiceManager = !isExplicitUser && !isHrOrAdmin && (
    rawAccessLevel === 'service_manager' ||
    rawAccessLevel === 'servicemanager' ||
    rawAccessLevel === 'service manager' ||
    (!rawAccessLevel && (rawRole === 'service_manager' || rawRole === 'servicemanager' || rawRole === 'service manager'))
  );

  const isTeamLead = !isExplicitUser && !isHrOrAdmin && !isServiceManager && (
    rawAccessLevel === 'team_lead' ||
    rawAccessLevel === 'team lead' ||
    rawAccessLevel === 'lead' ||
    (!rawAccessLevel && (rawRole === 'team_lead' || rawRole === 'team lead' || rawRole === 'lead'))
  );

  const isManager = !isExplicitUser && !isHrOrAdmin && (
    rawAccessLevel === 'manager' ||
    (!rawAccessLevel && rawRole === 'manager') ||
    isServiceManager ||
    isTeamLead
  );

  const [activeRole, setActiveRole] = useState<'hr' | 'manager' | 'downline_teams' | 'employee'>(
    isHrOrAdmin ? 'hr' : (isManager || isServiceManager || isTeamLead) ? 'manager' : 'employee'
  );

  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [dbTeams, setDbTeams] = useState<any[]>([]);
  const [cycles, setCycles] = useState<EvaluationCycle[]>([]);
  const [responses, setResponses] = useState<EvaluationResponse[]>([]);
  const [dbApprovedLeaves, setDbApprovedLeaves] = useState<any[]>([]);
  const [dbHolidays, setDbHolidays] = useState<any[]>([]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = currentMonth >= 4 && currentMonth <= 6 ? 1 : currentMonth >= 7 && currentMonth <= 9 ? 2 : currentMonth >= 10 && currentMonth <= 12 ? 3 : 4;
  const quarterLabel = currentQuarter === 1 ? 'Apr - Jun' : currentQuarter === 2 ? 'Jul - Sep' : currentQuarter === 3 ? 'Oct - Dec' : 'Jan - Mar';

  // HR Form State
  const [cycleName, setCycleName] = useState(`Q${currentQuarter} Performance Evaluation`);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedSmId, setSelectedSmId] = useState<string>('');
  const [selectedMgrId, setSelectedMgrId] = useState<string>('');
  const [selectedMgrIds, setSelectedMgrIds] = useState<string[]>([]);
  const [isHrMgrDropdownOpen, setIsHrMgrDropdownOpen] = useState<boolean>(false);
  const [periodName, setPeriodName] = useState(`Q${currentQuarter} ${currentYear} (${quarterLabel})`);
  const [startDate, setStartDate] = useState(
    currentQuarter === 1 ? `${currentYear}-04-01` :
      currentQuarter === 2 ? `${currentYear}-07-01` :
        currentQuarter === 3 ? `${currentYear}-10-01` : `${currentYear}-01-01`
  );
  const [endDate, setEndDate] = useState(
    currentQuarter === 1 ? `${currentYear}-06-30` :
      currentQuarter === 2 ? `${currentYear}-09-30` :
        currentQuarter === 3 ? `${currentYear}-12-31` : `${currentYear}-03-31`
  );
  const [hrCategories, setHrCategories] = useState<KPICategory[]>([]);
  const [hrFrequency, setHrFrequency] = useState<'quarterly' | 'monthly' | 'weekly' | 'daily' | 'yearly'>('quarterly');
  const [hrMgrSearch, setHrMgrSearch] = useState<string>('');

  // HR Multi-Form Templates State (Form 1, Form 2, Form 3, Form 4)
  const [hrTemplates, setHrTemplates] = useState<ManagerKpiTemplateRecord[]>([]);
  const [activeHrTemplateKey, setActiveHrTemplateKey] = useState<string>('form_1');
  const [isHrRenamingTemplate, setIsHrRenamingTemplate] = useState<boolean>(false);
  const [hrRenameTemplateInput, setHrRenameTemplateInput] = useState<string>('');
  const [isHrSavingTemplate, setIsHrSavingTemplate] = useState<boolean>(false);
  const [isHrLoadingTemplates, setIsHrLoadingTemplates] = useState<boolean>(false);
  const [showHrTargetGuide, setShowHrTargetGuide] = useState<boolean>(false);

  // Manager Create & Assign Metrics Modal State
  const [isMgrCreateModalOpen, setIsMgrCreateModalOpen] = useState<boolean>(false);
  const [mgrAssignTeamId, setMgrAssignTeamId] = useState<string>('');
  const [mgrAssignEmpIds, setMgrAssignEmpIds] = useState<string[]>([]);
  const [mgrAssignFormName, setMgrAssignFormName] = useState<string>(`Q${currentQuarter} KPI Assessment - PM Team`);
  const [mgrAssignPeriod, setMgrAssignPeriod] = useState<string>(`Q${currentQuarter} ${currentYear} (${quarterLabel}) - Stage ${currentQuarter}`);
  const [mgrAssignCategories, setMgrAssignCategories] = useState<KPICategory[]>(DEFAULT_KPI_CATEGORIES);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [mgrModalEmpSearch, setMgrModalEmpSearch] = useState<string>('');
  const [mgrCustomizeMembers, setMgrCustomizeMembers] = useState<boolean>(false);

  // Manager Multi-Form Templates State (Form 1, Form 2, Form 3, Form 4)
  const [mgrTemplates, setMgrTemplates] = useState<ManagerKpiTemplateRecord[]>([]);
  const [activeTemplateKey, setActiveTemplateKey] = useState<string>('form_1');
  const [isRenamingTemplate, setIsRenamingTemplate] = useState<boolean>(false);
  const [renameTemplateInput, setRenameTemplateInput] = useState<string>('');
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);
  const [showTargetGuide, setShowTargetGuide] = useState<boolean>(false);

  // Dynamic Frequency & Period Configuration State
  const [mgrPeriodType, setMgrPeriodType] = useState<'quarterly' | 'monthly' | 'weekly' | 'daily' | 'yearly'>('quarterly');
  const [mgrPeriodQuarter, setMgrPeriodQuarter] = useState<number>(currentQuarter); // 1, 2, 3, 4 (Stage 1..4)
  const [mgrPeriodYear, setMgrPeriodYear] = useState<number>(currentYear);
  const [mgrPeriodMonth, setMgrPeriodMonth] = useState<number>(currentMonth);
  const [mgrPeriodFromDate, setMgrPeriodFromDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [mgrPeriodToDate, setMgrPeriodToDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7);
    const sunday = new Date(d.setDate(diff));
    return sunday.toISOString().split('T')[0];
  });
  const [mgrPeriodDueDate, setMgrPeriodDueDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const QUARTERS_INFO = [
    { q: 1, stage: 1, label: 'Apr - Jun', name: '(Q1: Apr - Jun)', months: 'April - June' },
    { q: 2, stage: 2, label: 'Jul - Sep', name: '(Q2: Jul - Sep)', months: 'July - September' },
    { q: 3, stage: 3, label: 'Oct - Dec', name: '(Q3: Oct - Dec)', months: 'October - December' },
    { q: 4, stage: 4, label: 'Jan - Mar', name: '(Q4: Jan - Mar)', months: 'January - March' }
  ];

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      let s = dateStr.trim();
      if (s.includes('T') && !s.endsWith('Z') && !s.includes('+') && !s.slice(10).includes('-')) {
        s = s + 'Z';
      }
      const dt = new Date(s + (s.includes('T') ? '' : 'T00:00:00'));
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const yyyy = dt.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  // Helper to adjust a candidate due date backward if it falls on a weekend (Saturday/Sunday), holiday, or approved leave
  const getAdjustedWorkingDueDate = (
    candidateDateStr: string,
    leaves: any[] = dbApprovedLeaves,
    holidays: any[] = dbHolidays
  ): string => {
    if (!candidateDateStr) return candidateDateStr;
    try {
      let cur = new Date(candidateDateStr + 'T00:00:00');
      if (isNaN(cur.getTime())) return candidateDateStr;

      // Maximum 15 day backtrack safety guard
      let safetyCounter = 0;
      while (safetyCounter < 15) {
        const dayOfWeek = cur.getDay(); // 0 = Sunday, 6 = Saturday
        const curIso = cur.toISOString().split('T')[0];

        // Check if weekend (Saturday or Sunday)
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Check if public/company holiday
        const isHoliday = holidays.some((h: any) => {
          const hDate = (h.date || h.holiday_date || h.start_date || '').split('T')[0];
          return hDate === curIso;
        });

        // Check if approved leave
        const isLeave = leaves.some((l: any) => {
          if (l.status !== 'Approved') return false;
          const from = (l.from_date || l.startDate || '').split('T')[0];
          const to = (l.to_date || l.endDate || l.from_date || '').split('T')[0];
          return curIso >= from && curIso <= to;
        });

        if (!isWeekend && !isHoliday && !isLeave) {
          return curIso;
        }

        // Shift 1 day backward to previous date
        cur.setDate(cur.getDate() - 1);
        safetyCounter++;
      }
      return candidateDateStr;
    } catch {
      return candidateDateStr;
    }
  };

  const syncPeriodAndFormName = (
    pType = mgrPeriodType,
    pQuarter = mgrPeriodQuarter,
    pYear = mgrPeriodYear,
    pMonth = mgrPeriodMonth,
    pFrom = mgrPeriodFromDate,
    pTo = mgrPeriodToDate,
    pDue = mgrPeriodDueDate,
    pTeamId = mgrAssignTeamId,
    leavesList = dbApprovedLeaves,
    holidaysList = dbHolidays
  ) => {
    const managerDisplayName = user?.full_name || `${userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim() || 'Manager';
    const formTeamLabel = pTeamId === 'all_teams' ? `${managerDisplayName}'s Team` : (pTeamId || 'Team');

    let periodStr = '';
    let formTitle = '';
    let autoDueDate = pDue;

    if (pType === 'quarterly') {
      const qInfo = QUARTERS_INFO.find(q => q.q === pQuarter) || QUARTERS_INFO[2];
      periodStr = `Q${pQuarter} ${pYear} (${qInfo.label}) - Stage ${pQuarter}`;
      formTitle = `Q${pQuarter} Performance Metrics - ${formTeamLabel}`;
      let rawCandidateDue = '';
      if (pQuarter === 1) rawCandidateDue = `${pYear}-07-05`;
      else if (pQuarter === 2) rawCandidateDue = `${pYear}-10-05`;
      else if (pQuarter === 3) rawCandidateDue = `${pYear + 1}-01-05`;
      else if (pQuarter === 4) rawCandidateDue = `${pYear}-04-05`;
      autoDueDate = getAdjustedWorkingDueDate(rawCandidateDue, leavesList, holidaysList);
      setMgrPeriodDueDate(autoDueDate);
    } else if (pType === 'monthly') {
      const mName = MONTH_NAMES[pMonth - 1] || 'September';
      periodStr = `${mName} ${pYear}`;
      formTitle = `${mName} ${pYear} Performance Metrics - ${formTeamLabel}`;
      const nextMonth = pMonth === 12 ? 1 : pMonth + 1;
      const nextYear = pMonth === 12 ? pYear + 1 : pYear;
      const rawCandidateDue = `${nextYear}-${String(nextMonth).padStart(2, '0')}-05`;
      autoDueDate = getAdjustedWorkingDueDate(rawCandidateDue, leavesList, holidaysList);
      setMgrPeriodDueDate(autoDueDate);
    } else if (pType === 'weekly') {
      const fromFmt = formatDisplayDate(pFrom);
      const toFmt = formatDisplayDate(pTo);
      periodStr = `Weekly (${fromFmt} - ${toFmt})`;
      formTitle = `Weekly Performance Metrics (${fromFmt} - ${toFmt}) - ${formTeamLabel}`;
      const rawCandidateDue = pTo || new Date().toISOString().split('T')[0];
      autoDueDate = getAdjustedWorkingDueDate(rawCandidateDue, leavesList, holidaysList);
      setMgrPeriodDueDate(autoDueDate);
    } else if (pType === 'daily') {
      const todayIso = new Date().toISOString().split('T')[0];
      const actualDue = pDue || todayIso;
      autoDueDate = getAdjustedWorkingDueDate(actualDue, leavesList, holidaysList);
      const dueFmt = formatDisplayDate(autoDueDate);
      periodStr = `Daily (${dueFmt})`;
      formTitle = `Daily Deliverables (${dueFmt}) - ${formTeamLabel}`;
      setMgrPeriodDueDate(autoDueDate);
    } else if (pType === 'yearly' || (pType as string) === 'annual') {
      periodStr = `FY ${pYear}-${pYear + 1} (April - March)`;
      formTitle = `FY ${pYear}-${pYear + 1} Performance Metrics - ${formTeamLabel}`;
      const rawCandidateDue = `${pYear + 1}-04-05`;
      autoDueDate = getAdjustedWorkingDueDate(rawCandidateDue, leavesList, holidaysList);
      setMgrPeriodDueDate(autoDueDate);
    }

    setMgrAssignPeriod(periodStr);
    setMgrAssignFormName(formTitle);
  };

  // Manager Edit Deliverables Matrix Modal State
  const [isMgrEditMatrixModalOpen, setIsMgrEditMatrixModalOpen] = useState<boolean>(false);
  const [mgrEditCycleId, setMgrEditCycleId] = useState<string>('');
  const [mgrEditFormName, setMgrEditFormName] = useState<string>('');
  const [mgrEditPeriod, setMgrEditPeriod] = useState<string>('');
  const [mgrEditTeamName, setMgrEditTeamName] = useState<string>('');
  const [mgrEditCategories, setMgrEditCategories] = useState<KPICategory[]>(DEFAULT_KPI_CATEGORIES);
  const [isSavingMatrixEdit, setIsSavingMatrixEdit] = useState<boolean>(false);

  // Employee Form State
  const [selectedResponseId, setSelectedResponseId] = useState<string>('');
  const [selectedReportResponseId, setSelectedReportResponseId] = useState<string>('');
  const [showReportAuditBreakdown, setShowReportAuditBreakdown] = useState<boolean>(false);
  const [historyAuditBreakdownOpen, setHistoryAuditBreakdownOpen] = useState<Record<string, boolean>>({});
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'published' | 'in_review'>('all');
  const [showRubricMatrix, setShowRubricMatrix] = useState<boolean>(false);
  const [kpiInputs, setKpiInputs] = useState<Record<string, KPIResponseItem>>({});
  const [empRemarks, setEmpRemarks] = useState('');
  const [employeeSubTab, setEmployeeSubTab] = useState<'worksheet' | 'reports'>('worksheet');
  const [isSubmittingEmp, setIsSubmittingEmp] = useState<boolean>(false);
  const [empSearchQuery, setEmpSearchQuery] = useState<string>('');
  const [empFilterTab, setEmpFilterTab] = useState<'all' | 'adjusted' | 'pending'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedAuditCategories, setExpandedAuditCategories] = useState<Record<string, boolean>>({});
  const [expandedPeriodBreakdowns, setExpandedPeriodBreakdowns] = useState<Record<string, boolean>>({});
  const [activeYearlyFiscalMonth, setActiveYearlyFiscalMonth] = useState<number>(6);
  const [activeMgrYearlyFiscalMonth, setActiveMgrYearlyFiscalMonth] = useState<number>(6);
  const [yearlyMonthKpiInputs, setYearlyMonthKpiInputs] = useState<Record<number, Record<string, YearlyMonthKPIEntry>>>({});
  const [yearlyMonthRemarks, setYearlyMonthRemarks] = useState<Record<number, string>>({});

  // Manager Form State
  const [selectedMgrResponseId, setSelectedMgrResponseId] = useState<string>('');
  const [mgrScore, setMgrScore] = useState<number>(0);
  const [mgrRemarks, setMgrRemarks] = useState<string>('');
  const [mgrKpiActuals, setMgrKpiActuals] = useState<Record<string, string | number>>({});
  const [mgrKpiRemarks, setMgrKpiRemarks] = useState<Record<string, string>>({});
  const [showManagerDeliverablesMatrix, setShowManagerDeliverablesMatrix] = useState<boolean>(false);
  const [managerFilterDept, setManagerFilterDept] = useState<string>('');
  const [mgrSearchQuery, setMgrSearchQuery] = useState<string>('');
  const [mgrStatusFilter, setMgrStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'approved'>('all');
  const [mgrViewMode, setMgrViewMode] = useState<'table' | 'cards'>('table');
  const [mgrHierarchyScope, setMgrHierarchyScope] = useState<'direct' | 'downline' | 'all'>('direct');
  const [selectedDownlineTeamModal, setSelectedDownlineTeamModal] = useState<any | null>(null);
  const [downlineModalSearchQuery, setDownlineModalSearchQuery] = useState<string>('');
  const [downlineModalStatusFilter, setDownlineModalStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'approved'>('all');
  const [raceLeaderboardType, setRaceLeaderboardType] = useState<'teams' | 'members'>('teams');
  const [selectedRaceTeam, setSelectedRaceTeam] = useState<string>('');

  // Report View Filter States (for Direct Reviews & Department Oversight matching user design)
  const [reportViewTab, setReportViewTab] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'top_weekly' | 'top_monthly' | 'top_quarterly' | 'top_annual'>('all');
  const [reportDateInPeriod, setReportDateInPeriod] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [reportFilterDept, setReportFilterDept] = useState<string>('all');
  const [reportFilterTeam, setReportFilterTeam] = useState<string>('all');
  const [reportFilterDesignation, setReportFilterDesignation] = useState<string>('all');
  const [reportFilterDate, setReportFilterDate] = useState<string>('all');
  const [reportFilterState, setReportFilterState] = useState<'all' | 'pending' | 'submitted' | 'approved'>('all');
  const [selectedWeekPeriod, setSelectedWeekPeriod] = useState<string>('all');
  const [selectedReportMonthKey, setSelectedReportMonthKey] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  });
  const [selectedReportQuarterKey, setSelectedReportQuarterKey] = useState<string>(() => {
    const d = new Date();
    const m = d.getMonth() + 1;
    const q = m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : m >= 10 && m <= 12 ? 3 : 4;
    return `${d.getFullYear()}-Q${q}`;
  });
  const [selectedReportYearKey, setSelectedReportYearKey] = useState<string>('all');

  // Department Oversight / Submissions States
  const [oversightSubView, setOversightSubView] = useState<'submissions' | 'top_performers'>('submissions');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<'all' | 'with_manager' | 'approved' | 'completed' | 'with_gm' | 'with_admin' | 'sent_back'>('all');
  const [submissionGroupBy, setSubmissionGroupBy] = useState<'none' | 'department' | 'team'>('team');
  const [expandedSubmissionGroups, setExpandedSubmissionGroups] = useState<Record<string, boolean>>({});
  const [expandedSubmissionDesigs, setExpandedSubmissionDesigs] = useState<Record<string, boolean>>({});
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState<string>('');

  // Department & Team Hierarchy Dropdown/Collapse States (Default: collapsed/hidden)
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [expandedDesignations, setExpandedDesignations] = useState<Record<string, boolean>>({});

  // Multi-tier Conversion Modal State (Option B: Soft Archive)
  const [isConvertModalOpen, setIsConvertModalOpen] = useState<boolean>(false);
  const [activeRollupTier, setActiveRollupTier] = useState<RollupTier>('quarterly_to_yearly');
  const [convertingTarget, setConvertingTarget] = useState<{
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    teamName: string;
    weekLabel?: string;
    weekStart?: string;
    weekEnd?: string;
    records: EvaluationResponse[];
    avgScore: number;
    avgMgrScore: number | null;
    count: number;
  } | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);

  // Service Manager State
  const [smSubTab, setSmSubTab] = useState<'launch_approvals' | 'final_approvals'>('launch_approvals');
  const [selectedSmResponseId, setSelectedSmResponseId] = useState<string>('');
  const [smScore, setSmScore] = useState<number>(0);
  const [smRemarks, setSmRemarks] = useState<string>('');
  const [editingSmCycleId, setEditingSmCycleId] = useState<string | null>(null);
  const [smCategories, setSmCategories] = useState<KPICategory[]>([]);

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // User & Team Scoping Resolver
  const userAny = user as any;
  const userEmail = (user?.email || '').trim().toLowerCase();
  const rawUserCode = String(userAny?.employee_id || user?.employee_id || userAny?.code || '').trim();

  // Match the user in dbEmployees with strict priority to avoid ID collision
  const currentDbUser = dbEmployees.find(e => {
    // 1. Explicit employee_id from auth store
    if (rawUserCode && String(e.employee_id).trim().toLowerCase() === rawUserCode.toLowerCase()) return true;
    // 2. Exact Email Match
    if (userEmail && e.email && e.email.trim().toLowerCase() === userEmail) return true;
    // 3. Exact Full Name Match (e.g. "Bharathi Sanjeev")
    const authFullName = (user?.full_name || userAny?.name || `${userAny?.first_name || ''} ${userAny?.last_name || ''}`).trim().toLowerCase();
    const dbFullName = `${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase();
    if (authFullName && dbFullName && authFullName.length >= 4 && authFullName === dbFullName) return true;
    // 4. Username match
    if ((userAny?.username || (user as any)?.username) && e.username && e.username.trim().toLowerCase() === (userAny?.username || (user as any)?.username).trim().toLowerCase()) return true;
    return false;
  });

  const myCanonicalCode = String(currentDbUser?.employee_id || rawUserCode || user?.employee_id || '').trim();
  const userId = myCanonicalCode;
  const userCode = myCanonicalCode;
  const userDraftKey = `peoplehub_eval_draft_${myCanonicalCode || userEmail || 'guest'}`;

  const effectiveTeamName = (currentDbUser?.team || currentDbUser?.department || userAny?.team || userAny?.department || '').trim();
  const effectiveTeamId = String(currentDbUser?.team_id || userAny?.team_id || '');

  // Canonical identifiers and team scoping resolved for current user

  // Helper to match an employee response strictly for the logged in user
  const isResponseForUser = (r: EvaluationResponse) => {
    if (!r) return false;
    const clean = (v: any) => String(v || '').trim().toLowerCase().replace(/^emp-?/i, '');
    const myCode = clean(myCanonicalCode || currentDbUser?.employee_id || userAny?.employee_id || '');
    const rEmpCode = clean(r.employeeCode);
    const rEmpId = clean(r.employeeId);

    // 1. Direct canonical employee code match (e.g. 2148 vs 2150)
    if (myCode && (myCode === rEmpCode || myCode === rEmpId)) {
      return true;
    }

    // 2. Strict exact full name match (only if both are valid and length >= 4)
    const rName = (r.employeeName || '').trim().toLowerCase();
    const myFullName = (
      (currentDbUser ? `${currentDbUser.first_name || ''} ${currentDbUser.last_name || ''}`.trim() : '') ||
      user?.full_name ||
      `${userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim() ||
      userAny?.name ||
      ''
    ).trim().toLowerCase();

    if (rName && myFullName && rName.length >= 4 && myFullName.length >= 4 && rName === myFullName) {
      return true;
    }

    return false;
  };

  // Load Data
  const loadAllData = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const [remoteData, emps, tms, leavesRes, holidaysRes] = await Promise.all([
        evaluationService.fetchRemoteEvaluationData(),
        evaluationService.fetchDBEmployees(),
        evaluationService.fetchDBTeams(),
        apiService.get('/leaves/').catch(() => ({ data: [] })),
        apiService.get('/employee/holidays', { params: { month: currentMonth, year: currentYear } }).catch(() => ({ data: {} }))
      ]);

      setDbEmployees(emps);
      setDbTeams(tms);

      const allLeaves = Array.isArray(leavesRes?.data) ? leavesRes.data : [];
      const loadedHolidays = Array.isArray(holidaysRes?.data?.current_month_schedule) ? holidaysRes.data.current_month_schedule : [];
      setDbApprovedLeaves(allLeaves);
      setDbHolidays(loadedHolidays);

      const firstTeam = tms[0];
      const initialTeamId = selectedTeamId || (firstTeam ? (firstTeam.id || firstTeam.name) : '');
      if (initialTeamId && !selectedTeamId) {
        setSelectedTeamId(initialTeamId);
      }

      // Auto-resolve SM and Manager for the initial team
      resolveManagersForTeam(initialTeamId, tms, emps);

      const loadedCycles = remoteData.cycles || evaluationService.getCycles();
      const loadedResponses = remoteData.responses || evaluationService.getResponses();
      setCycles(loadedCycles);
      setResponses(loadedResponses);

      // Auto-resolve HR deliverables matrix for the selected team
      const initialCats = resolveTeamCategories(initialTeamId, tms, loadedCycles);
      setHrCategories(initialCats);

      // Clean up legacy generic draft key if present to prevent cross-account pollution
      try {
        localStorage.removeItem('eval_draft_user');
      } catch (e) { }

      // Auto-select active response for employee (strictly for the logged in user, prioritizing pending active evaluations)
      const userResponses = loadedResponses.filter(isResponseForUser);
      const activePendingResp = userResponses.find(r => {
        const st = String(r.status || '');
        const isSubmitted = st === 'manager_review' || st === 'approved' || st === 'sm_final_approval' || Boolean(r.employeeSubmittedAt);
        return !isSubmitted;
      });
      const myResp = activePendingResp || userResponses[0];

      if (myResp) {
        setSelectedResponseId(myResp.id);
        const isSubmitted = myResp.status === 'manager_review' || myResp.status === 'approved' || myResp.status === 'sm_final_approval' || Boolean(myResp.employeeSubmittedAt);
        if (isSubmitted) {
          setKpiInputs(myResp.kpiResponses || {});
          setEmpRemarks(myResp.employeeRemarks || '');
        } else {
          setKpiInputs(prev => {
            if (Object.keys(prev).length > 0) return prev;
            if (myResp.kpiResponses && Object.keys(myResp.kpiResponses).length > 0) return myResp.kpiResponses;
            try {
              const draft = localStorage.getItem(userDraftKey);
              if (draft) {
                const parsed = JSON.parse(draft);
                if (parsed?.kpiInputs && Object.keys(parsed.kpiInputs).length > 0) return parsed.kpiInputs;
              }
            } catch (e) { }
            return {};
          });
          setEmpRemarks(prev => {
            if (prev) return prev;
            if (myResp.employeeRemarks) return myResp.employeeRemarks;
            try {
              const draft = localStorage.getItem(userDraftKey);
              if (draft) {
                const parsed = JSON.parse(draft);
                if (parsed?.empRemarks) return parsed.empRemarks;
              }
            } catch (e) { }
            return '';
          });
        }
      } else {
        // No saved evaluation response for this employee yet — start clean & empty!
        setSelectedResponseId('');
        setKpiInputs({});
        setEmpRemarks('');
      }
    } catch (err) {
      console.error('Error loading evaluation data', err);
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };

  // Sync inputs ONLY when selectedResponseId explicitly changes
  const prevResponseIdRef = React.useRef<string>('');
  useEffect(() => {
    if (selectedResponseId && selectedResponseId !== prevResponseIdRef.current) {
      prevResponseIdRef.current = selectedResponseId;
      const resp = responses.find(r => r.id === selectedResponseId && isResponseForUser(r));
      if (resp) {
        setKpiInputs(resp.kpiResponses || {});
        setEmpRemarks(resp.employeeRemarks || '');
      } else if (!selectedResponseId) {
        setKpiInputs({});
        setEmpRemarks('');
      }
    }
  }, [selectedResponseId]);

  const isStrictManager = (emp: any): boolean => {
    if (!emp || !isEmployeeActive(emp)) return false;
    const access = String(emp.access_level || '').toLowerCase().trim();
    const role = String(emp.role || '').toLowerCase().trim();

    // If access_level or role is 'user' or 'employee', strictly exclude them!
    if (access === 'user' || access === 'employee' || role === 'user' || role === 'employee') {
      return false;
    }

    return (
      access === 'manager' ||
      access === 'admin' ||
      access === 'super_admin' ||
      access === 'service_manager' ||
      access === 'service manager' ||
      access === 'team_lead' ||
      access === 'team lead' ||
      access === 'lead' ||
      role === 'manager' ||
      role === 'admin' ||
      role === 'super_admin' ||
      role === 'service_manager' ||
      role === 'service manager' ||
      role === 'team_lead' ||
      role === 'team lead' ||
      role === 'lead'
    );
  };

  const getManagersForTeam = (teamId: string, teamsList: any[], empsList: any[]): any[] => {
    if (!teamId && teamsList.length === 0) return [];
    const teamObj = teamsList.find(t => t.id === teamId || t.name === teamId || String(t.id) === String(teamId));
    const tName = (teamObj?.name || teamId || '').trim().toLowerCase();
    const tId = teamObj?.id ? String(teamObj.id) : '';

    // Active employees belonging to this team
    const teamEmps = empsList.filter(e => {
      if (!isEmployeeActive(e)) return false;
      const empTeam = (e.team || '').trim().toLowerCase();
      const empDept = (e.department || '').trim().toLowerCase();
      const empTeamId = e.team_id ? String(e.team_id) : '';
      return (tId && empTeamId === tId) || (tName && (empTeam === tName || empDept === tName));
    });

    // 1. Direct managers belonging to this team
    const directMgrs = teamEmps.filter(isStrictManager);

    // 2. Reporting managers specified in the employee records of this team's members
    const repNames = new Set(
      teamEmps
        .map(e => String(e.reporting_manager || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const reportingMgrs = empsList.filter(e => {
      if (!isStrictManager(e)) return false;
      const fullName = `${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase();
      const name = String(e.name || '').trim().toLowerCase();
      const code = String(e.employee_id || '').trim().toLowerCase();
      const email = String(e.email || '').trim().toLowerCase();
      return (
        (fullName && repNames.has(fullName)) ||
        (name && repNames.has(name)) ||
        (code && repNames.has(code)) ||
        (email && repNames.has(email))
      );
    });

    // 3. Manager/Lead explicitly set on team object
    const teamObjectMgrs: any[] = [];
    if (teamObj) {
      const tMgrId = String(teamObj.manager_id || teamObj.team_lead_id || teamObj.lead_id || '').trim().toLowerCase();
      const tMgrName = String(teamObj.manager_name || teamObj.team_lead_name || teamObj.manager || '').trim().toLowerCase();
      const match = empsList.find(e =>
        isStrictManager(e) && (
          (tMgrId && String(e.employee_id || '').trim().toLowerCase() === tMgrId) ||
          (tMgrName && (`${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase() === tMgrName || String(e.name || '').trim().toLowerCase() === tMgrName))
        )
      );
      if (match) teamObjectMgrs.push(match);
    }

    const teamSpecific = Array.from(
      new Map([...directMgrs, ...reportingMgrs, ...teamObjectMgrs].map(m => [String(m.employee_id || ''), m])).values()
    ).filter(isStrictManager);

    if (teamSpecific.length > 0) {
      return teamSpecific;
    }

    // 4. If no specific manager matched directly in team, check for managers in same department
    const deptMgrs = empsList.filter(e =>
      isStrictManager(e) && (
        (e.department && String(e.department).trim().toLowerCase() === tName) ||
        (e.team && String(e.team).trim().toLowerCase() === tName)
      )
    );
    if (deptMgrs.length > 0) {
      return deptMgrs;
    }

    // 5. Fallback: return only employees who strictly hold a Manager role (NEVER regular users)
    return empsList.filter(isStrictManager);
  };

  const resolveManagersForTeam = (teamId: string, teamsList: any[], empsList: any[]) => {
    // 1. Resolve Service Manager strictly by DB access level
    const sm = empsList.find(e => {
      const access = String(e.access_level || '').toLowerCase().trim();
      return access === 'service_manager' || access === 'service manager' || access === 'servicemanager';
    });

    // 2. Resolve Team Manager strictly for this team
    const teamMgrs = getManagersForTeam(teamId, teamsList, empsList);
    const allMgrIds = teamMgrs.map(m => String(m.employee_id || ''));
    const mgr = teamMgrs[0] || empsList[0];

    if (sm) {
      setSelectedSmId(String(sm.employee_id || ''));
    } else if (mgr) {
      setSelectedSmId(String(mgr.employee_id || ''));
    }

    if (allMgrIds.length > 0) {
      setSelectedMgrIds(allMgrIds);
    } else if (mgr) {
      setSelectedMgrIds([String(mgr.employee_id || '')]);
    }

    if (mgr) {
      setSelectedMgrId(String(mgr.employee_id || ''));
    }
  };

  useEffect(() => {
    loadAllData();
    // Auto-sync every 30 seconds while preserving in-progress employee inputs
    const interval = setInterval(() => {
      evaluationService.fetchRemoteEvaluationData().then(data => {
        if (data?.cycles) setCycles(data.cycles);
        if (data?.responses) {
          setResponses(prev => {
            const remoteIds = new Set(data.responses.map((r: any) => r.id));
            // Preserve locally-known "Assigned to Employee" or Draft responses that the server hasn't
            // returned yet (e.g. just assigned — DB sync may have a brief delay on first poll).
            const preservedLocal = prev.filter(p =>
              !remoteIds.has(p.id) &&
              ((p.status as string) === 'Assigned to Employee' || (p.status as string) === 'Draft' || (p.status as string) === 'employee_in_progress')
            );
            const merged = data.responses.map((remoteResp: any) => {
              const localResp = prev.find(p => p.id === remoteResp.id);
              if ((remoteResp.status === 'employee_in_progress' || (remoteResp.status as string) === 'Assigned to Employee') && localResp?.kpiResponses && Object.keys(localResp.kpiResponses).length > 0) {
                return {
                  ...remoteResp,
                  kpiResponses: localResp.kpiResponses,
                  employeeRemarks: localResp.employeeRemarks || remoteResp.employeeRemarks
                };
              }
              return remoteResp;
            });
            return [...merged, ...preservedLocal];
          });
        }
      }).catch(() => { });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const isProjectManagementTeam = (tName: string) => {
    const n = (tName || '').toLowerCase().trim();
    return n.includes('project manage') || n.includes('project management') || n === 'pm' || n.includes('pm team') || n.includes('project manager');
  };

  const resolveTeamCategories = (teamId: string, currentTeams: any[], currentCycles: EvaluationCycle[]): KPICategory[] => {
    const teamObj = currentTeams.find(t => String(t.id) === String(teamId) || String(t.name).toLowerCase() === String(teamId).toLowerCase() || t.id === teamId || t.name === teamId);
    const teamName = teamObj?.name || teamId || '';

    // 1. Check if an existing cycle exists with saved deliverables for this specific team
    const existingTeamCycle = currentCycles.find(c =>
      String(c.teamId) === String(teamId) ||
      (teamName && (c.teamName || '').toLowerCase() === teamName.toLowerCase())
    );

    if (existingTeamCycle && existingTeamCycle.categories && existingTeamCycle.categories.length > 0) {
      return JSON.parse(JSON.stringify(existingTeamCycle.categories));
    }

    // 2. If it's Project Management / PM team, provide PM default deliverables
    if (isProjectManagementTeam(teamName)) {
      return JSON.parse(JSON.stringify(DEFAULT_KPI_CATEGORIES));
    }

    // 3. For any other team without saved deliverables, start fresh and empty
    return [];
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);

    const teamMgrs = getManagersForTeam(teamId, dbTeams, dbEmployees);
    if (teamMgrs.length > 0) {
      const allIds = teamMgrs.map(m => String(m.employee_id || ''));
      setSelectedMgrIds(allIds);
      const firstMgr = teamMgrs[0];
      const newMgrId = String(firstMgr.employee_id || '');
      setSelectedMgrId(newMgrId);
      loadHrTemplates(newMgrId, teamId);
    } else {
      setSelectedMgrIds([]);
      setSelectedMgrId('');
      setHrTemplates([]);
      setHrCategories([]);
    }

    const teamObj = dbTeams.find(t => String(t.id) === String(teamId) || String(t.name).toLowerCase() === String(teamId).toLowerCase() || t.id === teamId || t.name === teamId);
    const teamName = teamObj?.name || teamId || '';

    const existingTeamCycle = cycles.find(c =>
      String(c.teamId) === String(teamId) ||
      (teamObj && (c.teamName || '').toLowerCase() === (teamObj.name || '').toLowerCase())
    );

    if (existingTeamCycle && existingTeamCycle.categories && existingTeamCycle.categories.length > 0) {
      setHrCategories(JSON.parse(JSON.stringify(existingTeamCycle.categories)));
      setCycleName(existingTeamCycle.name || `Q${currentQuarter} Performance Evaluation - ${teamName}`);
      setPeriodName(existingTeamCycle.periodName || `Q${currentQuarter} ${currentYear} (${quarterLabel})`);
    } else if (isProjectManagementTeam(teamName)) {
      setHrCategories(JSON.parse(JSON.stringify(DEFAULT_KPI_CATEGORIES)));
      setCycleName(`Q${currentQuarter} Performance Evaluation - ${teamName}`);
      setPeriodName(`Q${currentQuarter} ${currentYear} (${quarterLabel})`);
    } else {
      // Empty slate for other teams
      setHrCategories([]);
      setCycleName(`Q${currentQuarter} Performance Evaluation - ${teamName}`);
      setPeriodName(`Q${currentQuarter} ${currentYear} (${quarterLabel})`);
    }
  };

  const handleHrFrequencyChange = (freq: 'quarterly' | 'monthly' | 'weekly' | 'daily' | 'yearly') => {
    setHrFrequency(freq);
    const teamName = selectedTeam?.name || 'Team';
    if (freq === 'quarterly') {
      const qInfo = QUARTERS_INFO.find(q => q.q === currentQuarter) || QUARTERS_INFO[2];
      setCycleName(`Q${currentQuarter} Performance Evaluation - ${teamName}`);
      setPeriodName(`Q${currentQuarter} ${currentYear} (${qInfo.label})`);
    } else if (freq === 'monthly') {
      const mName = MONTH_NAMES[currentMonth - 1] || 'September';
      setCycleName(`${mName} ${currentYear} Performance Evaluation - ${teamName}`);
      setPeriodName(`${mName} ${currentYear}`);
    } else if (freq === 'weekly') {
      setCycleName(`Weekly Performance Evaluation - ${teamName}`);
      setPeriodName(`Weekly (${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)})`);
    } else if (freq === 'daily') {
      setCycleName(`Daily Deliverables - ${teamName}`);
      setPeriodName(`Daily (${formatDisplayDate(startDate)})`);
    } else if (freq === 'yearly') {
      setCycleName(`FY ${currentYear}-${currentYear + 1} Performance Evaluation - ${teamName}`);
      setPeriodName(`FY ${currentYear}-${currentYear + 1} (April - March)`);
      setStartDate(`${currentYear}-04-01`);
      setEndDate(`${currentYear + 1}-03-31`);
    }
  };

  const handleAutoBalanceAllCategories = () => {
    if (hrCategories.length === 0) return;
    const count = hrCategories.length;
    const baseWeight = Math.floor((100 / count) * 100) / 100;
    const remainder = Number((100 - (baseWeight * (count - 1))).toFixed(2));

    setHrCategories(prev => prev.map((cat, idx) => {
      const targetWeight = idx === count - 1 ? remainder : baseWeight;
      const kpiCount = cat.kpis.length || 1;
      const baseKpi = Math.floor((targetWeight / kpiCount) * 100) / 100;
      const kpiRem = Number((targetWeight - (baseKpi * (kpiCount - 1))).toFixed(2));

      return {
        ...cat,
        weightage: targetWeight,
        kpis: cat.kpis.map((kpi, kIdx) => {
          const score = kIdx === kpiCount - 1 ? kpiRem : baseKpi;
          return {
            ...kpi,
            targetScore: score,
            weightage: score
          };
        })
      };
    }));
  };

  // Determine active team details for HR creation
  const selectedTeam = dbTeams.find(t => String(t.id) === String(selectedTeamId) || String(t.name).toLowerCase() === String(selectedTeamId).toLowerCase() || t.id === selectedTeamId || t.name === selectedTeamId) || dbTeams[0];
  const teamEmployees = dbEmployees.filter(e => {
    if (!isEmployeeActive(e)) return false;
    const teamName = selectedTeam?.name || '';
    const teamIdStr = selectedTeam?.id ? String(selectedTeam.id) : '';
    const empTeam = (e.team || '').trim().toLowerCase();
    const empDept = (e.department || '').trim().toLowerCase();
    const empTeamId = e.team_id ? String(e.team_id) : '';
    return (teamIdStr && empTeamId === teamIdStr) || (teamName && (empTeam === teamName.toLowerCase() || empDept === teamName.toLowerCase()));
  });

  // Filter team managers strictly by access_level (Manager, Team Lead, Service Manager, Admin)
  const isManagerAccessLevel = (emp: any) => {
    if (!emp) return false;
    const access = String(emp.access_level || '').toLowerCase().trim();
    if (access === 'user' || access === 'employee' || access === 'standard') return false;
    return (
      access === 'manager' ||
      access === 'team_lead' ||
      access === 'team lead' ||
      access === 'lead' ||
      access === 'admin' ||
      access === 'super_admin' ||
      access === 'service_manager' ||
      access === 'servicemanager' ||
      access === 'service manager' ||
      access === 'hr'
    );
  };

  const teamManagers = teamEmployees.filter(isManagerAccessLevel);

  // Filter available managers strictly belonging to the selected team
  const availableTeamManagers = useMemo(() => {
    const activeTeamId = selectedTeamId || dbTeams[0]?.id || dbTeams[0]?.name;
    if (!activeTeamId) return [];
    return getManagersForTeam(activeTeamId, dbTeams, dbEmployees);
  }, [selectedTeamId, dbTeams, dbEmployees]);

  const activeDesignatedManager = availableTeamManagers.find(m => String(m.employee_id || '') === selectedMgrId) || availableTeamManagers[0];
  const activeDesignatedManagerName = activeDesignatedManager ? (activeDesignatedManager.name || `${activeDesignatedManager.first_name || ''} ${activeDesignatedManager.last_name || ''}`.trim() || 'Manager') : 'Manager';

  const resolvedServiceManager = dbEmployees.find(e => String(e.employee_id) === selectedSmId)
    || dbEmployees.find(e => {
      const access = String(e.access_level || '').toLowerCase().trim();
      return access === 'service_manager' || access === 'service manager' || access === 'servicemanager';
    })
    || dbEmployees[0];

  const resolvedManager = dbEmployees.find(e => String(e.employee_id) === selectedMgrId)
    || teamManagers[0]
    || teamEmployees[0]
    || dbEmployees[0];

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'error') {
      toast.error(msg);
    } else {
      toast.success(msg);
    }
  };

  const [mgrMemberFilterTab, setMgrMemberFilterTab] = useState<'all' | 'selected' | 'unselected'>('all');
  const [mgrWizardStep, setMgrWizardStep] = useState<1 | 2>(1);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    description?: string;
    variant?: 'danger' | 'warning' | 'info';
    confirmLabel?: string;
    cancelLabel?: string;
    hideCancel?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    confirmLabel: 'OK',
    cancelLabel: 'Cancel',
    hideCancel: false,
    onConfirm: () => { },
  });

  const showAlert = (message: string, title: string = 'Notice', variant: 'warning' | 'danger' | 'info' = 'warning') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      variant,
      confirmLabel: 'OK',
      hideCancel: true,
      onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
      onCancel: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
    });
  };

  const showConfirm = (
    message: string,
    onConfirmAction: () => void,
    title: string = 'Confirmation',
    variant: 'warning' | 'danger' | 'info' = 'warning',
    confirmLabel: string = 'Confirm'
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      variant,
      confirmLabel,
      cancelLabel: 'Cancel',
      hideCancel: false,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        onConfirmAction();
      },
      onCancel: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
    });
  };

  // HR Custom Categories & Metrics Builder State
  const totalWeightage = hrCategories.reduce((sum, cat) => sum + (Number(cat.weightage) || 0), 0);
  const isWeightageValid = totalWeightage === 100;

  // Check if all individual categories have their KPI target scores sum equal to their category weight
  const areAllCategoriesBalanced = hrCategories.every(cat => {
    const catSum = cat.kpis.reduce((s, k) => s + (Number(k.targetScore) || 0), 0);
    return Math.abs(catSum - Number(cat.weightage)) < 0.05;
  });

  const loadHrTemplates = async (mgrId: string, teamIdVal: string) => {
    if (!mgrId) return;
    setIsHrLoadingTemplates(true);
    try {
      const teamObj = dbTeams.find(t => String(t.id) === String(teamIdVal) || String(t.name).toLowerCase() === String(teamIdVal).toLowerCase() || t.id === teamIdVal || t.name === teamIdVal);
      const teamName = teamObj?.name || teamIdVal || '';
      const isPM = isProjectManagementTeam(teamName);
      const initialCatsForTeam = isPM ? JSON.parse(JSON.stringify(DEFAULT_KPI_CATEGORIES)) : [];

      const res = await evaluationService.getManagerTemplates(mgrId);
      const validTemplates: ManagerKpiTemplateRecord[] = (res?.templates || []).filter((t: any) => 
        (t.team_id || t.team_name) || (t.template_name && !t.template_name.match(/^Form [1-4]$/)) || (t.categories && t.categories.length > 0)
      );

      if (validTemplates.length > 0) {
        // 1. Check if manager already has a template explicitly designated for this team
        const teamMatching = validTemplates.find((t: any) => 
          (t.team_id && (String(t.team_id).toLowerCase() === String(teamIdVal).toLowerCase() || String(t.team_id) === String(teamObj?.id))) ||
          (t.team_name && t.team_name.toLowerCase() === teamName.toLowerCase()) ||
          (t.template_name && t.template_name.toLowerCase().includes(teamName.toLowerCase()))
        );

        if (teamMatching) {
          // Found existing form for this specific team!
          setHrTemplates(validTemplates);
          setActiveHrTemplateKey(teamMatching.template_key);
          if (teamMatching.categories && teamMatching.categories.length > 0) {
            setHrCategories(JSON.parse(JSON.stringify(teamMatching.categories)));
          }
        } else {
          // Manager has forms for other teams. Create a single new clean slot for this team!
          const nextNum = validTemplates.length + 1;
          const newKey = `form_${nextNum}`;
          const newName = teamName ? `${teamName}` : `Form ${nextNum}`;
          const newTpl: ManagerKpiTemplateRecord = {
            manager_id: mgrId,
            template_key: newKey,
            template_name: newName,
            team_id: teamIdVal,
            team_name: teamName,
            categories: initialCatsForTeam,
            is_default: false
          };
          setHrTemplates([...validTemplates, newTpl]);
          setActiveHrTemplateKey(newKey);
        }
      } else {
        // Clean single form initialization for this manager & team
        const form1Name = teamName ? `${teamName}` : 'Form 1';
        const defaultForms: ManagerKpiTemplateRecord[] = [
          { manager_id: mgrId, template_key: 'form_1', template_name: form1Name, is_default: true, categories: initialCatsForTeam, team_id: teamIdVal, team_name: teamName }
        ];
        setHrTemplates(defaultForms);
        setActiveHrTemplateKey('form_1');
      }
    } catch (err) {
      console.warn('Failed to load HR templates from DB:', err);
    } finally {
      setIsHrLoadingTemplates(false);
    }
  };

  useEffect(() => {
    if (selectedMgrId && activeRole === 'hr') {
      loadHrTemplates(selectedMgrId, selectedTeamId);
    }
  }, [selectedTeamId, activeRole]);

  const handleHrSelectTemplate = (targetKey: string) => {
    if (targetKey === activeHrTemplateKey) return;
    // Auto-preserve in memory
    setHrTemplates(prev => prev.map(t => {
      if (t.template_key === activeHrTemplateKey) {
        return { ...t, categories: JSON.parse(JSON.stringify(hrCategories)) };
      }
      return t;
    }));
    setActiveHrTemplateKey(targetKey);
    const targetTpl = hrTemplates.find(t => t.template_key === targetKey);
    if (targetTpl && targetTpl.categories && targetTpl.categories.length > 0) {
      setHrCategories(JSON.parse(JSON.stringify(targetTpl.categories)));
    } else {
      setHrCategories([]);
    }
  };

  const handleHrAddNewTemplate = () => {
    setHrTemplates(prev => prev.map(t => {
      if (t.template_key === activeHrTemplateKey) {
        return { ...t, categories: JSON.parse(JSON.stringify(hrCategories)) };
      }
      return t;
    }));

    const teamObj = dbTeams.find(t => String(t.id) === String(selectedTeamId) || String(t.name).toLowerCase() === String(selectedTeamId).toLowerCase() || t.id === selectedTeamId || t.name === selectedTeamId);
    const teamName = teamObj?.name || selectedTeamId || '';

    const nextNum = hrTemplates.length + 1;
    const newKey = `form_${nextNum}`;
    const newName = teamName ? `${teamName} (Form ${nextNum})` : `Form ${nextNum}`;
    const newTpl: ManagerKpiTemplateRecord = {
      manager_id: selectedMgrId,
      template_key: newKey,
      template_name: newName,
      categories: [],
      is_default: false,
      team_id: selectedTeamId,
      team_name: teamName
    };
    setHrTemplates(prev => [...prev, newTpl]);
    setActiveHrTemplateKey(newKey);
    setHrCategories([]);
    showToast(`Created new form slot: "${newName}".`);
  };

  const handleHrStartRenameTemplate = () => {
    const currentTpl = hrTemplates.find(t => t.template_key === activeHrTemplateKey);
    setHrRenameTemplateInput(currentTpl?.template_name || `Form ${activeHrTemplateKey.replace('form_', '')}`);
    setIsHrRenamingTemplate(true);
  };

  const handleHrConfirmRenameTemplate = async () => {
    const trimmed = hrRenameTemplateInput.trim();
    if (!trimmed) {
      setIsHrRenamingTemplate(false);
      return;
    }
    try {
      if (selectedMgrId) {
        await evaluationService.renameManagerTemplate(selectedMgrId, activeHrTemplateKey, trimmed);
      }
      setHrTemplates(prev => prev.map(t => t.template_key === activeHrTemplateKey ? { ...t, template_name: trimmed } : t));
      showToast(`Renamed to "${trimmed}"`);
    } catch (e) {
      setHrTemplates(prev => prev.map(t => t.template_key === activeHrTemplateKey ? { ...t, template_name: trimmed } : t));
    } finally {
      setIsHrRenamingTemplate(false);
    }
  };

  const handleHrDeleteTemplate = (templateKey: string) => {
    const targetTpl = hrTemplates.find(t => t.template_key === templateKey);
    const formLabel = targetTpl?.template_name || `Form ${templateKey.replace('form_', '')}`;

    if (hrTemplates.length <= 1) {
      showConfirm(
        `Clear all deliverables in "${formLabel}" and start fresh?`,
        () => {
          setHrCategories([]);
          showToast(`Cleared "${formLabel}".`);
        },
        'Clear Form',
        'warning',
        'Clear Form'
      );
      return;
    }

    showConfirm(
      `Are you sure you want to delete "${formLabel}"?`,
      async () => {
        try {
          const mgrIdsToDelete = selectedMgrIds.length > 0 ? selectedMgrIds : (selectedMgrId ? [selectedMgrId] : []);
          for (const mId of mgrIdsToDelete) {
            await evaluationService.deleteManagerTemplate(mId, templateKey);
          }
        } catch (e) {
          console.warn('Failed to delete template from DB:', e);
        }

        const remaining = hrTemplates.filter(t => t.template_key !== templateKey);
        setHrTemplates(remaining);

        if (activeHrTemplateKey === templateKey) {
          const nextTpl = remaining[0];
          if (nextTpl) {
            setActiveHrTemplateKey(nextTpl.template_key);
            setHrCategories(JSON.parse(JSON.stringify(nextTpl.categories || [])));
          } else {
            setActiveHrTemplateKey('form_1');
            setHrCategories([]);
          }
        }
        showToast(`Deleted "${formLabel}".`);
      },
      'Delete Form',
      'danger',
      'Delete Form'
    );
  };

  const handleToggleHrManager = (mgrId: string) => {
    setSelectedMgrIds(prev => {
      const exists = prev.includes(mgrId);
      let updated: string[];
      if (exists) {
        updated = prev.filter(id => id !== mgrId);
      } else {
        updated = [...prev, mgrId];
      }
      if (!exists && !selectedMgrId) {
        setSelectedMgrId(mgrId);
      } else if (exists && selectedMgrId === mgrId) {
        const nextMgr = updated[0] || '';
        setSelectedMgrId(nextMgr);
      }
      return updated;
    });
  };

  const handleSelectAllHrManagers = (selectAll: boolean) => {
    if (selectAll) {
      const allIds = availableTeamManagers.map(m => String(m.employee_id || ''));
      setSelectedMgrIds(allIds);
      if (allIds.length > 0 && (!selectedMgrId || !allIds.includes(selectedMgrId))) {
        setSelectedMgrId(allIds[0]);
      }
    } else {
      setSelectedMgrIds([]);
    }
  };

  const handleHrSaveActiveTemplate = async () => {
    const currentTpl = hrTemplates.find(t => t.template_key === activeHrTemplateKey);
    const formLabel = currentTpl?.template_name || `Form ${activeHrTemplateKey.replace('form_', '')}`;
    const teamName = selectedTeam?.name || selectedTeamId || '';

    setIsHrSavingTemplate(true);
    try {
      const chosenManagers = availableTeamManagers.filter(m => {
        const idVal = String(m.employee_id || '');
        return selectedMgrIds.includes(idVal) || idVal === selectedMgrId;
      });
      const finalMgrs = chosenManagers.length > 0 ? chosenManagers : (availableTeamManagers.length > 0 ? availableTeamManagers : [resolvedManager].filter(Boolean));

      // Strictly deduplicate managers by unique employee_id
      const uniqueMgrMap = new Map<string, any>();
      for (const m of finalMgrs) {
        const key = String(m.employee_id || '');
        if (key && !uniqueMgrMap.has(key)) {
          uniqueMgrMap.set(key, m);
        }
      }

      for (const targetMgr of uniqueMgrMap.values()) {
        const mgrCode = String(targetMgr.employee_id || '');
        const mgrDisplayName = targetMgr.name || `${targetMgr.first_name || ''} ${targetMgr.last_name || ''}`.trim() || 'Manager';
        const savePayload = {
          manager_id: mgrCode,
          manager_name: mgrDisplayName,
          template_key: activeHrTemplateKey,
          template_name: formLabel,
          team_id: String(selectedTeam?.id || selectedTeamId || ''),
          team_name: teamName,
          categories: hrCategories,
          is_default: true
        };

        await evaluationService.saveManagerTemplate(savePayload);
      }

      showToast(`Saved Deliverables & Targets for "${formLabel}" for selected manager(s)!`);
      setHrTemplates(prev => {
        const exists = prev.some(t => t.template_key === activeHrTemplateKey);
        if (exists) {
          return prev.map(t => t.template_key === activeHrTemplateKey ? {
            ...t,
            categories: JSON.parse(JSON.stringify(hrCategories)),
            template_name: formLabel,
            updated_at: new Date().toISOString()
          } : t);
        } else {
          return [...prev, {
            manager_id: selectedMgrId,
            template_key: activeHrTemplateKey,
            template_name: formLabel,
            categories: JSON.parse(JSON.stringify(hrCategories)),
            is_default: true,
            updated_at: new Date().toISOString()
          }];
        }
      });
    } catch (err: any) {
      showAlert('Failed to save template: ' + (err?.message || 'Network error'), 'Save Error', 'danger');
    } finally {
      setIsHrSavingTemplate(false);
    }
  };

  const handleHrResetTemplate = () => {
    showConfirm(
      'Are you sure you want to reset Deliverables & Targets for this form to system defaults?',
      async () => {
        try {
          const defaultCats = await evaluationService.getSystemDefaultKpiTemplate();
          setHrCategories(JSON.parse(JSON.stringify(defaultCats)));
          showToast('Reset to system default deliverables.');
        } catch (e) {
          setHrCategories(JSON.parse(JSON.stringify(DEFAULT_KPI_CATEGORIES)));
        }
      },
      'Reset Deliverables',
      'warning',
      'Reset to Defaults'
    );
  };

  const handleUpdateCategoryName = (catId: string, name: string) => {
    setHrCategories(prev => prev.map(c => c.id === catId ? { ...c, name } : c));
  };

  const handleUpdateCategoryWeight = (catId: string, weight: number) => {
    const newWeight = Math.max(0, Math.min(100, Number(weight) || 0));
    setHrCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const count = c.kpis.length;
      if (count === 0) return { ...c, weightage: newWeight };

      const perKpi = Number((newWeight / count).toFixed(2));
      let remaining = newWeight;
      const updatedKpis = c.kpis.map((k, i) => {
        if (i === count - 1) {
          const finalScore = Number(remaining.toFixed(2));
          return { ...k, targetScore: finalScore, weightage: finalScore };
        }
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      return { ...c, weightage: newWeight, kpis: updatedKpis };
    }));
  };

  const handleAutoBalanceCategory = (catId: string) => {
    setHrCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const count = c.kpis.length;
      if (count === 0) return c;
      const catWeight = Number(c.weightage) || 0;
      const perKpi = Number((catWeight / count).toFixed(2));
      let remaining = catWeight;

      const updatedKpis = c.kpis.map((k, idx) => {
        if (idx === count - 1) {
          const finalScore = Number(remaining.toFixed(2));
          return { ...k, targetScore: finalScore, weightage: finalScore };
        }
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      return { ...c, kpis: updatedKpis };
    }));
  };

  const handleAddCategory = () => {
    if (totalWeightage >= 100) {
      showAlert('Total weightage has already reached 100%. Please adjust existing weights before adding a new category.', 'Weightage Limit Exceeded');
      return;
    }
    const remaining = Math.max(0, 100 - totalWeightage);
    const newCat: KPICategory = {
      id: `cat_${Date.now()}`,
      name: `Performance Category ${hrCategories.length + 1}`,
      description: 'Custom evaluation criteria',
      weightage: remaining > 0 ? remaining : 10,
      kpis: [
        {
          id: `kpi_${Date.now()}_1`,
          name: '',
          description: '',
          targetScore: remaining > 0 ? remaining : 10,
          weightage: remaining > 0 ? remaining : 10,
          targetFromManager: '1',
          targetValue: 1,
          unit: 'projects',
          scoringDirection: 'higher_is_better',
          measurementType: 'number',
          isRequired: true
        }
      ]
    };
    setHrCategories(prev => [...prev, newCat]);
  };

  const handleDeleteCategory = (catId: string) => {
    if (hrCategories.length <= 1) {
      showAlert('At least one performance category is required.', 'Action Not Allowed');
      return;
    }
    setHrCategories(prev => rebalanceCategoriesAfterDelete(prev, catId));
  };

  const handleAddKPI = (catId: string) => {
    setHrCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const count = c.kpis.length + 1;
      const catWeight = Number(c.weightage) || 0;
      const perKpi = Number((catWeight / count).toFixed(2));
      let remaining = catWeight;

      const existingUpdated = c.kpis.map(k => {
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      const finalScore = Number(remaining.toFixed(2));
      const newKPI: KPIItem = {
        id: `kpi_${Date.now()}`,
        name: '',
        description: '',
        targetScore: finalScore,
        weightage: finalScore,
        targetFromManager: '1',
        targetValue: 1,
        unit: 'projects',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      };
      return { ...c, kpis: [...existingUpdated, newKPI] };
    }));
  };

  const handleUpdateKPI = (catId: string, kpiId: string, field: keyof KPIItem, val: any) => {
    setHrCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      return {
        ...c,
        kpis: c.kpis.map(k => k.id === kpiId ? { ...k, [field]: val } : k)
      };
    }));
  };

  const handleDeleteKPI = (catId: string, kpiId: string) => {
    setHrCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      if (c.kpis.length <= 1) {
        showAlert('Each category must have at least one deliverable description.', 'Validation Error');
        return c;
      }
      const filtered = c.kpis.filter(k => k.id !== kpiId);
      const count = filtered.length;
      const catWeight = Number(c.weightage) || 0;
      const perKpi = Number((catWeight / count).toFixed(2));
      let remaining = catWeight;

      const updatedKpis = filtered.map((k, idx) => {
        if (idx === count - 1) {
          const finalScore = Number(remaining.toFixed(2));
          return { ...k, targetScore: finalScore, weightage: finalScore };
        }
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      return { ...c, kpis: updatedKpis };
    }));
  };

  // 1. HR Submit Cycle Handler
  const handleHRCycleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) {
      showAlert('Please select a team', 'Selection Required');
      return;
    }

    if (!hrCategories || hrCategories.length === 0) {
      showAlert(`Please add at least one performance category and deliverable for ${selectedTeam?.name || 'this team'}.`, 'No Deliverables Defined');
      return;
    }

    if (totalWeightage !== 100) {
      showAlert(`Total category weightage must be exactly 100%. Currently it is ${totalWeightage}%. Please adjust before submitting.`, 'Weightage Mismatch');
      return;
    }

    // Validate that each category's target scores sum to category weight
    for (const cat of hrCategories) {
      const catSum = cat.kpis.reduce((s, k) => s + (Number(k.targetScore) || 0), 0);
      if (Math.abs(catSum - Number(cat.weightage)) > 0.05) {
        showAlert(`Category "${cat.name}" has Target Scores summing to ${catSum.toFixed(2)}%, but Category Weight is ${cat.weightage}%. The sum of Target Scores must equal Category Weight. Click "Auto-Balance Targets" or adjust manually.`, 'Balance Required');
        return;
      }
    }

    const employeeIds = teamEmployees.length > 0
      ? teamEmployees.map(e => String(e.employee_id || ''))
      : dbEmployees.map(e => String(e.employee_id || ''));

    const chosenManagers = availableTeamManagers.filter(m => {
      const idVal = String(m.employee_id || '');
      return selectedMgrIds.includes(idVal) || idVal === selectedMgrId;
    });

    const finalMgrs = chosenManagers.length > 0 ? chosenManagers : (availableTeamManagers.length > 0 ? availableTeamManagers : [resolvedManager].filter(Boolean));

    // Deduplicate managers strictly by unique employee_id
    const uniqueMgrMap = new Map<string, any>();
    for (const m of finalMgrs) {
      const key = String(m.employee_id || '');
      if (key && !uniqueMgrMap.has(key)) {
        uniqueMgrMap.set(key, m);
      }
    }

    const allManagerNames = Array.from(uniqueMgrMap.values())
      .map(m => m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || '')
      .filter(Boolean)
      .join(', ') || 'Team Managers';

    const allManagerIds = Array.from(uniqueMgrMap.values())
      .map(m => String(m.employee_id || ''))
      .filter(Boolean)
      .join(',');

    const smName = resolvedServiceManager
      ? (resolvedServiceManager.name || `${resolvedServiceManager.first_name || ''} ${resolvedServiceManager.last_name || ''}`.trim() || '')
      : '';
    const smId = resolvedServiceManager ? String(resolvedServiceManager.employee_id || '') : '';

    const currentTpl = hrTemplates.find(t => t.template_key === activeHrTemplateKey);
    const formTitle = currentTpl?.template_name || `Form ${activeHrTemplateKey.replace('form_', '')}`;

    await evaluationService.createCycleFromHR({
      name: formTitle || cycleName,
      teamId: String(selectedTeam?.id || selectedTeam?.name || selectedTeamId || ''),
      teamName: String(selectedTeam?.name || selectedTeamId || ''),
      managerId: allManagerIds,
      managerName: allManagerNames,
      serviceManagerId: smId,
      serviceManagerName: smName,
      employeeIds,
      startDate,
      endDate,
      periodName,
      frequency: 'quarterly',
      categories: hrCategories
    });

    // Also auto-transfer & save into each manager's templates so it appears directly on their desk
    try {
      for (const mgr of uniqueMgrMap.values()) {
        const mId = String(mgr.employee_id || '');
        const mName = mgr.name || `${mgr.first_name || ''} ${mgr.last_name || ''}`.trim() || 'Manager';
        const savePayload = {
          manager_name: mName,
          template_key: activeHrTemplateKey || 'form_1',
          template_name: formTitle,
          team_id: String(selectedTeam?.id || selectedTeam?.name || selectedTeamId || ''),
          team_name: String(selectedTeam?.name || selectedTeamId || ''),
          categories: hrCategories,
          is_default: true,
          manager_id: mId
        };
        await evaluationService.saveManagerTemplate(savePayload);
      }
    } catch (tplErr) {
      console.warn('Sync to manager templates:', tplErr);
    }

    await loadAllData();
    showToast('Successfully sent');
  };

  // 2. Service Manager Launch Approval & Matrix Editor Handlers
  const smTotalWeightage = smCategories.reduce((sum, cat) => sum + (Number(cat.weightage) || 0), 0);
  const isSmWeightageValid = smTotalWeightage === 100;
  const areAllSmCategoriesBalanced = smCategories.every(cat => {
    const catSum = cat.kpis.reduce((s, k) => s + (Number(k.targetScore) || 0), 0);
    return Math.abs(catSum - Number(cat.weightage)) < 0.05;
  });

  const handleSMStartEditCycle = (cycle: EvaluationCycle) => {
    if (editingSmCycleId === cycle.id) {
      setEditingSmCycleId(null);
    } else {
      setEditingSmCycleId(cycle.id);
      setSmCategories(JSON.parse(JSON.stringify(cycle.categories && cycle.categories.length > 0 ? cycle.categories : DEFAULT_KPI_CATEGORIES)));
    }
  };

  const handleSMAddCategory = () => {
    const remaining = Math.max(0, 100 - smTotalWeightage);
    const newCat: KPICategory = {
      id: `sm_cat_${Date.now()}`,
      name: `Performance Category ${smCategories.length + 1}`,
      description: 'Deliverable specification & performance standards',
      weightage: remaining,
      kpis: [
        {
          id: `sm_kpi_${Date.now()}_1`,
          name: 'Core Deliverable Metric',
          description: 'Key performance deliverable output',
          targetScore: remaining,
          weightage: remaining,
          targetFromManager: '1',
          targetValue: 1,
          unit: 'units',
          scoringDirection: 'higher_is_better',
          measurementType: 'number',
          isRequired: true
        }
      ]
    };
    setSmCategories(prev => [...prev, newCat]);
  };

  const handleSMDeleteCategory = (catId: string) => {
    if (smCategories.length <= 1) {
      showAlert('At least one performance category is required.', 'Action Not Allowed');
      return;
    }
    setSmCategories(prev => prev.filter(c => c.id !== catId));
  };

  const handleSMUpdateCategoryName = (catId: string, name: string) => {
    setSmCategories(prev => prev.map(c => c.id === catId ? { ...c, name } : c));
  };

  const handleSMUpdateCategoryWeight = (catId: string, weight: number) => {
    const newWeight = Math.max(0, Math.min(100, Number(weight) || 0));
    setSmCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const oldWeight = Number(c.weightage) || 1;
      const count = c.kpis.length;
      if (count === 0) return { ...c, weightage: newWeight };

      let remaining = newWeight;
      const updatedKpis = c.kpis.map((k, i) => {
        if (i === count - 1) {
          const finalScore = Number(remaining.toFixed(2));
          return { ...k, targetScore: finalScore, weightage: finalScore };
        }
        const scaled = Number(((Number(k.targetScore || 0) / oldWeight) * newWeight).toFixed(2));
        remaining -= scaled;
        return { ...k, targetScore: scaled, weightage: scaled };
      });

      return {
        ...c,
        weightage: newWeight,
        kpis: updatedKpis
      };
    }));
  };

  const handleSMAutoBalanceCategory = (catId: string) => {
    setSmCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const count = c.kpis.length;
      if (count === 0) return c;
      const catWeight = Number(c.weightage) || 0;
      const perKpi = Number((catWeight / count).toFixed(2));
      let remaining = catWeight;

      const updatedKpis = c.kpis.map((k, idx) => {
        if (idx === count - 1) {
          const finalScore = Number(remaining.toFixed(2));
          return { ...k, targetScore: finalScore, weightage: finalScore };
        }
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      return { ...c, kpis: updatedKpis };
    }));
  };

  const handleSMAddKPI = (catId: string) => {
    setSmCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const count = c.kpis.length + 1;
      const catWeight = Number(c.weightage) || 0;
      const perKpi = Number((catWeight / count).toFixed(2));
      let remaining = catWeight;

      const existingUpdated = c.kpis.map((k, idx) => {
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      const finalScore = Number(remaining.toFixed(2));
      const newKpi: KPIItem = {
        id: `sm_kpi_${Date.now()}`,
        name: '',
        description: '',
        targetScore: finalScore,
        weightage: finalScore,
        targetFromManager: '',
        targetValue: 0,
        unit: 'units',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      };

      return {
        ...c,
        kpis: [...existingUpdated, newKpi]
      };
    }));
  };

  const handleSMUpdateKPI = (catId: string, kpiId: string, field: string, val: any) => {
    setSmCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      return {
        ...c,
        kpis: c.kpis.map(k => k.id === kpiId ? { ...k, [field]: val } : k)
      };
    }));
  };

  const handleSMDeleteKPI = (catId: string, kpiId: string) => {
    setSmCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      if (c.kpis.length <= 1) {
        showAlert('Each category must have at least one deliverable description.', 'Validation Error');
        return c;
      }
      return {
        ...c,
        kpis: c.kpis.filter(k => k.id !== kpiId)
      };
    }));
  };

  const handleSMSaveMatrix = async (cycleId: string) => {
    if (smTotalWeightage !== 100) {
      showAlert(`Total category weightage must be exactly 100%. Currently it is ${smTotalWeightage}%. Please adjust before saving.`, 'Weightage Mismatch');
      return;
    }
    for (const cat of smCategories) {
      const catSum = cat.kpis.reduce((s, k) => s + (Number(k.targetScore) || 0), 0);
      if (Math.abs(catSum - Number(cat.weightage)) > 0.05) {
        showAlert(`Category "${cat.name}" has Target Scores summing to ${catSum.toFixed(2)}%, but Category Weight is ${cat.weightage}%. The sum of Target Scores must equal Category Weight. Click "Auto-Balance Targets" or adjust manually.`, 'Balance Required');
        return;
      }
    }
    const updatedCycles = cycles.map(c => c.id === cycleId ? { ...c, categories: smCategories } : c);
    await evaluationService.saveCycles(updatedCycles);
    await loadAllData();
    showToast('Deliverables Matrix updated and saved successfully for this cycle!');
  };

  const handleSMSaveAndApprove = async (cycleId: string) => {
    if (smTotalWeightage !== 100) {
      showAlert(`Total category weightage must be exactly 100%. Currently it is ${smTotalWeightage}%. Please adjust before approving.`, 'Weightage Mismatch');
      return;
    }
    for (const cat of smCategories) {
      const catSum = cat.kpis.reduce((s, k) => s + (Number(k.targetScore) || 0), 0);
      if (Math.abs(catSum - Number(cat.weightage)) > 0.05) {
        showAlert(`Category "${cat.name}" has Target Scores summing to ${catSum.toFixed(2)}%, but Category Weight is ${cat.weightage}%. The sum of Target Scores must equal Category Weight. Click "Auto-Balance Targets" or adjust manually.`, 'Balance Required');
        return;
      }
    }
    const updatedCycles = cycles.map(c => c.id === cycleId ? { ...c, categories: smCategories } : c);
    await evaluationService.saveCycles(updatedCycles);
    await evaluationService.approveCycleByServiceManager(cycleId, dbEmployees);
    setEditingSmCycleId(null);
    await loadAllData();
    showToast('Cycle approved and officially released with updated Deliverables Matrix to all team employees!');
  };

  const handleSMApproveLaunch = async (cycleId: string) => {
    await evaluationService.approveCycleByServiceManager(cycleId, dbEmployees);
    await loadAllData();
    showToast('Cycle approved and officially released to all team employees!');
  };



  // =========================================================================
  // MANAGER DIRECT REPORTS & SCOPED DEPARTMENTS RESOLVER
  // =========================================================================
  const isDirectReport = (emp: any): boolean => {
    if (!emp) return false;

    // A user is NEVER their own direct report
    const clean = (v: any) => String(v || '').trim().toLowerCase().replace(/^emp-?/i, '');
    const myEmpCode = clean(currentDbUser?.employee_id || rawUserCode || user?.employee_id || userAny?.employee_id || '');
    const empCode = clean(emp.employee_id || '');
    if (myEmpCode && empCode && myEmpCode === empCode) return false;
    const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim().toLowerCase();
    const myName = (user?.full_name || `${currentDbUser?.first_name || ''} ${currentDbUser?.last_name || ''}` || userAny?.name || '').trim().toLowerCase();
    if (empName && myName && empName === myName) return false;

    // Collect all valid IDs for the logged-in manager / team lead strictly from employee_id
    const mgrIds = [
      String(currentDbUser?.employee_id || ''),
      String(user?.employee_id || ''),
      String(userAny?.employee_id || ''),
      String((user as any)?.emp_id || ''),
      String((user as any)?.employeeId || '')
    ].filter(Boolean).map(id => id.toLowerCase().replace(/^emp-?/i, ''));

    // Collect all manager names for the logged-in manager
    const mgrFullNames = [
      user?.full_name,
      userAny?.name,
      userAny?.full_name,
      `${currentDbUser?.first_name || ''} ${currentDbUser?.last_name || ''}`.trim(),
      `${userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim(),
      `${(user as any)?.first_name || ''} ${(user as any)?.last_name || ''}`.trim(),
      userAny?.username,
      currentDbUser?.username,
      (user as any)?.username
    ].filter(Boolean).map(n => String(n).toLowerCase().trim());

    // 1. Check all candidate reporting manager IDs on the employee
    const candidateMgrIds = [
      emp.reporting_manager_id,
      emp.reportingManagerId,
      emp.manager_id,
      emp.managerId,
      emp.reporting_manager_code,
      emp.manager_code,
      emp.team_lead_id,
      emp.teamLeadId,
      emp.lead_id,
      emp.reports_to_id,
      emp.reports_to
    ].filter(Boolean).map(id => String(id).trim().toLowerCase().replace(/^emp-?/i, ''));

    if (candidateMgrIds.some(id => mgrIds.includes(id))) {
      return true;
    }

    // 2. Check all candidate reporting manager names on the employee
    const candidateMgrNames = [
      emp.reporting_manager,
      emp.reportingManager,
      emp.manager_name,
      emp.managerName,
      emp.manager,
      emp.team_lead,
      emp.teamLead,
      emp.lead,
      emp.lead_name,
      emp.leadName,
      emp.reports_to,
      emp.reportsTo
    ].filter(Boolean).map(n => String(n).trim().toLowerCase());

    const nameMatched = candidateMgrNames.some(empMgrName => {
      return mgrFullNames.some(name => {
        if (!name || !empMgrName) return false;
        if (empMgrName === name) return true;
        const cleanEmpMgr = empMgrName.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim();
        const cleanMgr = name.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim();
        if (cleanEmpMgr === cleanMgr || cleanEmpMgr.includes(cleanMgr) || cleanMgr.includes(cleanEmpMgr)) return true;

        // Check token intersection (e.g. "Bharathi Sanjeev" vs "Bharathi", or "Sanjeev, Bharathi")
        const mgrTokens = cleanMgr.split(/[\s,.-]+/).filter(p => p.length >= 3);
        const empMgrTokens = cleanEmpMgr.split(/[\s,.-]+/).filter(p => p.length >= 3);
        if (mgrTokens.length > 0 && empMgrTokens.length > 0) {
          if (mgrTokens.every(t => cleanEmpMgr.includes(t)) || empMgrTokens.every(t => cleanMgr.includes(t))) {
            return true;
          }
          if (mgrTokens.some(t => empMgrTokens.includes(t))) {
            return true;
          }
          if (mgrTokens[0] && empMgrTokens[0] && mgrTokens[0] === empMgrTokens[0] && mgrTokens[0].length >= 4) {
            return true;
          }
        }
        return false;
      });
    });

    if (nameMatched) return true;

    return false;
  };

  // Helper to flexibly match an employee against a selected Department / Team name
  const isEmpInSelectedTeam = (emp: any, selectedTeam: string): boolean => {
    if (!selectedTeam || selectedTeam === 'all_teams') return true;
    const target = selectedTeam.trim().toLowerCase();
    const dept = (emp.department || '').trim().toLowerCase();
    const team = (emp.team || emp.team_name || emp.sub_department || emp.teamName || '').trim().toLowerCase();

    if (dept === target || team === target) return true;
    if (dept && target && (dept.includes(target) || target.includes(dept))) return true;
    if (team && target && (team.includes(target) || target.includes(team))) return true;
    return false;
  };

  // Helper to check if an employee in DB is specifically a Team Lead (not a full manager or service manager)
  const isTeamLeadEmp = (emp: any): boolean => {
    if (!emp) return false;
    const access = String(emp.access_level || '').toLowerCase().trim();
    if (access === 'user' || access === 'employee' || access === 'standard') return false;
    return access === 'team_lead' || access === 'team lead' || access === 'lead';
  };

  // Helper to check if an employee is a full Manager
  const isManagerEmp = (emp: any): boolean => {
    if (!emp) return false;
    const access = String(emp.access_level || '').toLowerCase().trim();
    if (access === 'user' || access === 'employee' || access === 'standard') return false;
    return (
      access === 'manager' ||
      access === 'admin' ||
      access === 'super_admin' ||
      access === 'service_manager' ||
      access === 'servicemanager' ||
      access === 'service manager' ||
      access === 'hr'
    );
  };

  const isDownlineReport = (emp: any): boolean => {
    if (!emp) return false;

    // A user is NEVER their own subordinate downline report
    const clean = (v: any) => String(v || '').trim().toLowerCase().replace(/^emp-?/i, '');
    const myEmpCode = clean(currentDbUser?.employee_id || rawUserCode || user?.employee_id || userAny?.employee_id || '');
    const empCode = clean(emp.employee_id || '');
    if (myEmpCode && empCode && myEmpCode === empCode) return false;
    const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim().toLowerCase();
    const myName = (user?.full_name || `${currentDbUser?.first_name || ''} ${currentDbUser?.last_name || ''}` || userAny?.name || '').trim().toLowerCase();
    if (empName && myName && empName === myName) return false;

    if (isHrOrAdmin) return true;
    if (isDirectReport(emp)) return true;
    if (isTeamLead) return false; // Team Leaders only have direct squad members

    // Helper to check if a manager ID/Name matches the logged in user
    const mgrIds = [
      String(currentDbUser?.employee_id || ''),
      String(user?.employee_id || ''),
      String(userAny?.employee_id || ''),
      String((user as any)?.emp_id || ''),
      String((user as any)?.employeeId || '')
    ].filter(Boolean).map(id => id.toLowerCase().replace(/^emp-?/i, ''));

    const mgrFullNames = [
      user?.full_name,
      userAny?.name,
      userAny?.full_name,
      `${currentDbUser?.first_name || ''} ${currentDbUser?.last_name || ''}`.trim(),
      `${userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim(),
      userAny?.username,
      currentDbUser?.username
    ].filter(Boolean).map(n => String(n).toLowerCase().trim());

    const isMatchLoggedInUser = (mgrRef: string, mgrId: string) => {
      if (mgrId) {
        const cleanMgrId = mgrId.toLowerCase().replace(/^emp-?/i, '');
        if (mgrIds.includes(cleanMgrId)) return true;
      }
      if (mgrRef) {
        const cleanRef = mgrRef.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim().toLowerCase();
        const matched = mgrFullNames.some(name => {
          if (!name) return false;
          const cleanName = name.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim().toLowerCase();
          if (cleanRef === cleanName || cleanRef.includes(cleanName) || cleanName.includes(cleanRef)) return true;
          const parts = cleanName.split(/\s+/).filter(p => p.length >= 3);
          if (parts.length >= 2 && parts.every(p => cleanRef.includes(p))) return true;
          return false;
        });
        if (matched) return true;
      }
      return false;
    };

    // Recursive / iterative upwards traversal through all levels of the reporting tree
    const visited = new Set<string>();
    let currentLevel: any[] = [emp];

    while (currentLevel.length > 0) {
      const nextLevel: any[] = [];

      for (const curr of currentLevel) {
        const leads: { ref: string; id: string }[] = [
          {
            ref: (curr.reporting_manager || curr.manager_name || '').trim(),
            id: String(curr.reporting_manager_id || curr.manager_id || '').trim()
          },
          {
            ref: (curr.team_lead || curr.lead || '').trim(),
            id: String(curr.team_lead_id || curr.lead_id || '').trim()
          }
        ].filter(item => item.ref || item.id);

        for (const lead of leads) {
          if (isMatchLoggedInUser(lead.ref, lead.id)) {
            return true;
          }

          const visitKey = `${lead.ref}_${lead.id}`.toLowerCase();
          if (visited.has(visitKey)) continue;
          visited.add(visitKey);

          const intermediateMgr = dbEmployees.find(e => {
            const cleanLeadId = lead.id.toLowerCase().replace(/^emp-?/i, '');
            if (cleanLeadId) {
              const eEmpId = String(e.employee_id || '').toLowerCase().replace(/^emp-?/i, '');
              if (eEmpId === cleanLeadId) return true;
            }
            if (lead.ref) {
              const eFullName = `${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase();
              const cleanE = eFullName.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim();
              const cleanLead = lead.ref.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim().toLowerCase();
              if (cleanE === cleanLead || (e.username && e.username.toLowerCase() === cleanLead)) return true;
              const parts = cleanLead.split(/\s+/).filter(p => p.length >= 3);
              if (parts.length >= 2 && parts.every(p => cleanE.includes(p))) return true;
            }
            return false;
          });

          if (intermediateMgr) {
            if (isDirectReport(intermediateMgr)) {
              return true;
            }
            nextLevel.push(intermediateMgr);
          }
        }
      }

      currentLevel = nextLevel;
    }

    return false;
  };

  // Check if an employee is assignable for metric creation by the logged-in manager:
  // - Direct reports (Manager -> Employee)
  // - Squad members under Team Leads (Manager 1 -> Team Lead -> Employee)
  // - STOP traversal at intermediate Managers (so Manager 2/3/4 cannot assign metrics for Manager 1's team)
  // - Exclude deactivated/inactive employees
  const isAssignableSubordinate = (emp: any): boolean => {
    if (!emp || !isEmployeeActive(emp)) return false;
    if (isDirectReport(emp)) return true;
    if (isTeamLead) return false;
    if (isHrOrAdmin || isServiceManager) return true;

    const leadsToCheck: { ref: string; id: string }[] = [
      {
        ref: (emp.reporting_manager || '').trim().toLowerCase(),
        id: String(emp.reporting_manager_id || emp.manager_id || '').trim()
      },
      {
        ref: (emp.team_lead || emp.lead || '').trim().toLowerCase(),
        id: String(emp.team_lead_id || emp.lead_id || '').trim()
      }
    ].filter(item => item.ref || item.id);

    const visited = new Set<string>();

    for (const lead of leadsToCheck) {
      let currentMgrRef = lead.ref;
      let currentMgrId = lead.id;

      while (currentMgrRef || currentMgrId) {
        const key = `${currentMgrRef}_${currentMgrId}`;
        if (visited.has(key)) break;
        visited.add(key);

        const intermediateMgr = dbEmployees.find(e => {
          if (currentMgrId && String(e.employee_id) === currentMgrId) return true;
          if (currentMgrRef) {
            const eFullName = `${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase();
            const cleanE = eFullName.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim();
            const cleanMgr = currentMgrRef.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim();
            return cleanE === cleanMgr || (e.username && e.username.toLowerCase() === currentMgrRef);
          }
          return false;
        });

        if (!intermediateMgr) break;

        // If intermediateMgr is a direct report AND a Team Lead -> ALLOW (Manager 1 -> Team Lead -> Employee)
        if (isDirectReport(intermediateMgr)) {
          if (isTeamLeadEmp(intermediateMgr)) {
            return true;
          }
          // If intermediateMgr is a Manager, STOP: that subordinate Manager creates their own metrics
          return false;
        }

        // If intermediateMgr is a Manager (not our direct report), STOP
        if (isManagerEmp(intermediateMgr)) {
          break;
        }

        currentMgrRef = (intermediateMgr.reporting_manager || intermediateMgr.team_lead || intermediateMgr.lead || '').trim().toLowerCase();
        currentMgrId = String(intermediateMgr.reporting_manager_id || intermediateMgr.manager_id || intermediateMgr.team_lead_id || intermediateMgr.lead_id || '').trim();
      }
    }

    return false;
  };

  // Manager's direct reporting team members strictly scoped from DB (active members only)
  const managerDirectReports: any[] = useMemo(() => {
    const activeEmps = dbEmployees.filter(isEmployeeActive);
    if (activeRole === 'downline_teams') {
      return activeEmps.filter(e => isDownlineReport(e));
    }
    return activeEmps.filter(isDirectReport);
  }, [dbEmployees, user, userId, currentDbUser, activeRole]);

  // All subordinates eligible for metric assignment by the manager (Active Direct Reports + Downline Reports under Team Leads)
  const managerAssignableEmployees: any[] = useMemo(() => {
    const activeCandidates = dbEmployees.filter(isEmployeeActive);
    if (isHrOrAdmin || isServiceManager) {
      return activeCandidates;
    }
    const myIds = [
      String(currentDbUser?.employee_id || ''),
      String(user?.employee_id || ''),
      String(userAny?.employee_id || '')
    ].filter(Boolean).map(id => id.toLowerCase().replace(/^emp-?/i, ''));

    const myFullName = (user?.full_name || `${currentDbUser?.first_name || ''} ${currentDbUser?.last_name || ''}` || userAny?.name || '').trim().toLowerCase();

    return activeCandidates.filter(e => {
      const eId = String(e.employee_id || '').toLowerCase().replace(/^emp-?/i, '');
      if (myIds.includes(eId)) return false;
      const eFullName = `${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase();
      if (myFullName && eFullName && myFullName === eFullName) return false;
      return isAssignableSubordinate(e);
    });
  }, [dbEmployees, user, currentDbUser, userAny, isHrOrAdmin, isServiceManager]);

  // Manager's distinct departments strictly from direct and downline reports
  const managerDepartments: string[] = useMemo(() => {
    const depts = new Set<string>();
    const sourceList = activeRole === 'downline_teams'
      ? dbEmployees.filter(e => isEmployeeActive(e) && isDownlineReport(e))
      : managerAssignableEmployees;
    sourceList.forEach((e: any) => {
      const d = (e.department || '').trim();
      const t = (e.team || e.team_name || e.sub_department || e.teamName || '').trim();
      if (d) depts.add(d);
      if (t) depts.add(t);
    });
    return Array.from(depts).filter(Boolean);
  }, [managerAssignableEmployees, dbEmployees, activeRole]);

  // Check if current manager is the direct creator / assigned reporting manager of a cycle
  const isDirectManagerOfCycle = (c: EvaluationCycle) => {
    if (isHrOrAdmin) return true;
    if (!c) return false;
    const cleanStr = (s: any) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const myCleanIdList = [
      cleanStr(userId),
      cleanStr(userCode),
      cleanStr(myCanonicalCode),
      cleanStr(currentDbUser?.id),
      cleanStr(currentDbUser?.employee_id),
      cleanStr(userAny?.id),
      cleanStr(userAny?.employee_id),
      cleanStr(user?.id),
      cleanStr(user?.employee_id)
    ].filter(Boolean);

    const cycleMgrIds = (c.managerId || '').split(',').map(s => cleanStr(s)).filter(Boolean);
    if (myCleanIdList.some(id => cycleMgrIds.includes(id))) {
      return true;
    }

    const currentMgrName = cleanStr(
      user?.full_name ||
      (currentDbUser ? `${currentDbUser.first_name || ''} ${currentDbUser.last_name || ''}` : '') ||
      `${userAny?.first_name || ''} ${userAny?.last_name || ''}` ||
      userAny?.name ||
      ''
    );

    const cycleMgrNames = (c.managerName || '').split(',').map(s => cleanStr(s)).filter(Boolean);
    if (currentMgrName && currentMgrName.length >= 3) {
      if (cycleMgrNames.some(cn => cn === currentMgrName || cn.includes(currentMgrName) || currentMgrName.includes(cn))) {
        return true;
      }
    }

    const currentTeam = cleanStr(effectiveTeamName);
    const cycleTeam = cleanStr(c.teamName);
    const cycleTeamId = cleanStr(c.teamId);
    if (currentTeam && (currentTeam === cycleTeam || currentTeam === cycleTeamId || cycleTeam.includes(currentTeam))) {
      return true;
    }

    const myManagedDepts = (managerDepartments || []).map(d => cleanStr(d)).filter(Boolean);
    if (myManagedDepts.some(d => d === cycleTeam || d === cycleTeamId || cycleTeam.includes(d))) {
      return true;
    }

    return false;
  };

  const managerDirectCycles = useMemo(() => cycles.filter(isDirectManagerOfCycle), [cycles, userId, userCode, myCanonicalCode, currentDbUser, userAny, user, effectiveTeamName, managerDepartments, isHrOrAdmin]);

  // Strictly check if Admin / HR has assigned an evaluation cycle to this manager's team
  const hasAssignedCycleFromAdmin = useMemo(() => {
    if (isHrOrAdmin) return true;
    if (managerDirectCycles.length > 0) return true;

    const cleanStr = (s: any) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const myCleanIdList = [
      cleanStr(userId),
      cleanStr(userCode),
      cleanStr(myCanonicalCode),
      cleanStr(currentDbUser?.id),
      cleanStr(currentDbUser?.employee_id),
      cleanStr(userAny?.id),
      cleanStr(userAny?.employee_id),
      cleanStr(user?.id),
      cleanStr(user?.employee_id)
    ].filter(Boolean);

    const currentMgrName = cleanStr(
      user?.full_name ||
      (currentDbUser ? `${currentDbUser.first_name || ''} ${currentDbUser.last_name || ''}` : '') ||
      `${userAny?.first_name || ''} ${userAny?.last_name || ''}` ||
      userAny?.name ||
      ''
    );

    const myTeams = [
      cleanStr(effectiveTeamName),
      ...managerDepartments.map(d => cleanStr(d)),
      cleanStr(currentDbUser?.team),
      cleanStr(currentDbUser?.department),
      cleanStr(userAny?.team),
      cleanStr(userAny?.department)
    ].filter(Boolean);

    return cycles.some(c => {
      if (!c) return false;
      const cMgrIds = (c.managerId || '').split(',').map(s => cleanStr(s)).filter(Boolean);
      if (myCleanIdList.some(id => cMgrIds.includes(id))) return true;

      const cycleMgrNames = (c.managerName || '').split(',').map(s => cleanStr(s)).filter(Boolean);
      if (currentMgrName && currentMgrName.length >= 3) {
        if (cycleMgrNames.some(cn => cn === currentMgrName || cn.includes(currentMgrName) || currentMgrName.includes(cn))) {
          return true;
        }
      }

      const cTeam = cleanStr(c.teamName);
      const cTeamId = cleanStr(c.teamId);
      if (myTeams.some(t => t && (t === cTeam || t === cTeamId || cTeam.includes(t)))) return true;

      return false;
    });
  }, [isHrOrAdmin, managerDirectCycles, userId, userCode, myCanonicalCode, currentDbUser, userAny, user, effectiveTeamName, managerDepartments, cycles]);

  const canCreateMetrics = (isHrOrAdmin || ((isManager || isServiceManager) && hasAssignedCycleFromAdmin)) && !isTeamLead;

  // =========================================================================
  // MANAGER METRICS CREATION & TEAM ASSIGNMENT HANDLERS
  // =========================================================================
  const cleanEmpIdentifier = (v: any) => String(v || '').trim().toLowerCase().replace(/^emp-?/i, '');

  // Helper to reliably match an employee strictly by employee_id (and full name fallback) with an evaluation record
  const isEmpMatch = (empOrId: any, r: EvaluationResponse | any): boolean => {
    if (!empOrId || !r) return false;

    let targetEmpId = '';
    let targetEmpName = '';

    if (typeof empOrId === 'object' && empOrId !== null) {
      targetEmpId = cleanEmpIdentifier(empOrId.employee_id || empOrId.employeeCode || empOrId.employeeId);
      targetEmpName = `${empOrId.first_name || ''} ${empOrId.last_name || ''}`.trim().toLowerCase() || String(empOrId.name || empOrId.full_name || '').trim().toLowerCase();
    } else {
      const raw = String(empOrId).trim();
      targetEmpId = cleanEmpIdentifier(raw);
      const dbEmp = dbEmployees.find((e: any) => cleanEmpIdentifier(e.employee_id) === targetEmpId);
      if (dbEmp) {
        targetEmpName = `${dbEmp.first_name || ''} ${dbEmp.last_name || ''}`.trim().toLowerCase();
      }
    }

    const rEmpId = cleanEmpIdentifier(r.employee_id || r.employeeCode || r.employeeId);
    const rName = String(r.employeeName || r.employee_name || '').trim().toLowerCase();

    // 1. Strict employee_id match
    if (targetEmpId && rEmpId && targetEmpId === rEmpId) return true;

    // 2. Name match fallback
    if (rName && targetEmpName) {
      const cleanTarget = targetEmpName.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim();
      const cleanR = rName.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim();
      if (cleanTarget === cleanR || cleanTarget.includes(cleanR) || cleanR.includes(cleanTarget)) {
        return true;
      }
    }

    return false;
  };

  // Helper to check if an employee currently has an active evaluation that is PENDING
  // (either awaiting employee self-evaluation OR awaiting manager calibration & approval)
  const getEmpPendingEvaluation = (empId: string | any): EvaluationResponse | null => {
    if (!empId) return null;

    const pendingResp = responses.find(r => {
      if (!isEmpMatch(empId, r)) return false;

      // Ignore archived or soft-deleted records
      if ((r as any).is_archived || (r as any).status === 'Archived') return false;

      const s = String(r.status || '').toLowerCase().trim();
      const smStatus = String((r as any).service_manager_approve_status || '').toLowerCase().trim();

      // Check if evaluation is fully completed and calibrated
      const isCompleted =
        s === 'completed' ||
        s === 'sm_final_approval' ||
        (s === 'approved' && r.managerScore != null) ||
        smStatus === 'approved' ||
        (r.managerScore != null &&
          s !== 'manager_review' &&
          s !== 'submitted to manager' &&
          s !== 'submitted' &&
          s !== 'returned_to_manager');

      return !isCompleted;
    });

    return pendingResp || null;
  };

  const getPendingStatusLabel = (pendingResp: EvaluationResponse) => {
    const s = String(pendingResp.status || '').toLowerCase().trim();
    const isSubmittedByEmp = Boolean(pendingResp.employeeSubmittedAt) || Boolean((pendingResp as any).submitted_at);
    const isWithMgr = isSubmittedByEmp || s === 'manager_review' || s === 'submitted to manager' || s === 'submitted' || s === 'with_manager';

    if (isWithMgr) {
      return {
        badgeText: 'Pending Calibration',
        badgeColor: 'text-amber-800 bg-amber-100 border-amber-300',
        icon: '⏳',
        tooltip: `Employee has submitted their evaluation (${pendingResp.periodName || (pendingResp as any).form || 'Assessment'}), awaiting manager calibration. Please calibrate and score it before applying new metrics.`
      };
    }
    return {
      badgeText: 'Pending Self-Eval',
      badgeColor: 'text-orange-800 bg-orange-100 border-orange-300',
      icon: '⏳',
      tooltip: `Employee currently has an ongoing evaluation (${pendingResp.periodName || (pendingResp as any).form || 'Assessment'}) in progress. It must be completed before applying new metrics.`
    };
  };

  // Helper to check if an employee is already assigned metrics for a specific evaluation period
  const isEmpAlreadyAssignedForPeriod = (
    empId: string | any,
    periodStr = mgrAssignPeriod,
    pType = mgrPeriodType,
    pQuarter = mgrPeriodQuarter,
    pYear = mgrPeriodYear,
    pMonth = mgrPeriodMonth,
    pDue = mgrPeriodDueDate,
    pFrom = mgrPeriodFromDate,
    pTo = mgrPeriodToDate
  ) => {
    if (!empId) return false;

    // Check in responses (definitive source of active assigned evaluations)
    const hasInResponses = responses.some(r => {
      if (!isEmpMatch(empId, r)) return false;

      // Ignore archived or deleted records
      if ((r as any).is_archived || (r as any).status === 'Archived') return false;

      const rType = String(r.frequency || (r as any).periodType || '').toLowerCase();

      // If employee already has an active ongoing yearly evaluation with milestones
      if (rType === 'yearly' && (pType === 'monthly' || pType === 'quarterly' || pType === 'yearly')) {
        const s = String(r.status || '').toLowerCase().trim();
        const isCompleted = s === 'completed' || s === 'sm_final_approval' || (s === 'approved' && r.managerScore != null);
        if (!isCompleted) return true;
      }

      if (pType && rType && pType !== rType) return false;

      const rStart = (r as any).startDate || (r as any).start_date || (r as any).fromDate;
      const rEnd = (r as any).endDate || (r as any).end_date || (r as any).toDate;

      if (pType === 'weekly' && pFrom && pTo) {
        if (rStart === pFrom && rEnd === pTo) return true;
        const fromFmt = formatDisplayDate(pFrom).toLowerCase();
        const toFmt = formatDisplayDate(pTo).toLowerCase();
        const rText = `${r.periodName || ''} ${(r as any).form || ''} ${(r as any).description || ''}`.toLowerCase();
        if (fromFmt && toFmt && rText.includes(fromFmt) && rText.includes(toFmt)) return true;
        return false;
      }
      if (pType === 'daily' && pDue) {
        if (rStart === pDue) return true;
        const dueFmt = formatDisplayDate(pDue).toLowerCase();
        const rText = `${r.periodName || ''} ${(r as any).form || ''} ${(r as any).description || ''}`.toLowerCase();
        if (dueFmt && rText.includes(dueFmt)) return true;
        return false;
      }
      if (pType === 'monthly') {
        const mName = (MONTH_NAMES[pMonth - 1] || '').toLowerCase();
        const yStr = `${pYear}`;
        const rText = `${r.periodName || ''} ${(r as any).form || ''} ${(r as any).description || ''}`.toLowerCase();
        if (mName && rText.includes(mName) && rText.includes(yStr)) return true;
        return false;
      }
      if (pType === 'quarterly') {
        if ((r as any).quarter === pQuarter && (r as any).year === pYear) return true;
        const qStr = `q${pQuarter}`;
        const stageStr = `stage ${pQuarter}`;
        const yStr = `${pYear}`;
        const rText = `${r.periodName || ''} ${(r as any).form || ''} ${(r as any).description || ''}`.toLowerCase();
        if ((rText.includes(qStr) || rText.includes(stageStr)) && rText.includes(yStr)) return true;
        return false;
      }
      if (pType === 'yearly' || (pType as string) === 'annual') {
        const yStr = `${pYear}`;
        const rText = `${r.periodName || ''} ${(r as any).form || ''} ${(r as any).description || ''}`.toLowerCase();
        if ((rText.includes('annual') || rText.includes('yearly') || rType === 'yearly' || rType === 'annual') && rText.includes(yStr)) return true;
        return false;
      }
      return false;
    });

    if (hasInResponses) return true;

    // Check in cycles ONLY if the cycle has an active, non-archived response in state for this employee
    const hasInCycles = cycles.some(c => {
      const empList = (c.employeeIds || []).map(id => cleanEmpIdentifier(id));
      const cleanEmpId = cleanEmpIdentifier(empId);
      if (!empList.includes(cleanEmpId)) return false;

      // Verify if this employee actually has an active response belonging to this cycle
      const hasActiveRespForCycle = responses.some(r =>
        (r.cycleId === c.id || (r.frequency === c.frequency && (r as any).form === c.name)) &&
        isEmpMatch(empId, r) &&
        !(r as any).is_archived &&
        (r as any).status !== 'Archived'
      );
      if (!hasActiveRespForCycle) return false;

      const cType = String((c as any).frequency || '').toLowerCase();
      if (pType && cType && pType !== cType) return false;

      return true;
    });

    return hasInCycles;
  };

  const loadManagerDeskTemplates = async (mgrCode?: string, targetTeam?: string) => {
    const code = String(mgrCode || myCanonicalCode || currentDbUser?.employee_id || userAny?.employee_id || user?.id || '').trim();
    if (!code) return;

    const defaultTeamVal = targetTeam || mgrAssignTeamId || (managerDepartments.length > 1 ? 'all_teams' : (managerDepartments[0] || 'all_teams'));
    setIsLoadingTemplates(true);
    try {
      const res = await evaluationService.getManagerTemplates(code);
      const validTemplates = (res?.templates || []).filter((t: any) => 
        (t.team_id || t.team_name) || (t.template_name && !t.template_name.match(/^Form [1-4]$/)) || (t.categories && t.categories.length > 0)
      );

      const teamObj = dbTeams.find(t => String(t.id) === String(defaultTeamVal) || String(t.name).toLowerCase() === String(defaultTeamVal).toLowerCase() || t.id === defaultTeamVal || t.name === defaultTeamVal);
      const tIdStr = teamObj?.id ? String(teamObj.id).toLowerCase() : '';
      const tNameStr = (teamObj?.name || defaultTeamVal || '').toLowerCase();

      if (validTemplates.length > 0) {
        setMgrTemplates(validTemplates);
        const teamMatchingTpl = defaultTeamVal && defaultTeamVal !== 'all_teams'
          ? validTemplates.find((t: any) => 
              (t.team_id && (String(t.team_id).toLowerCase() === tIdStr || String(t.team_id).toLowerCase() === tNameStr)) ||
              (t.team_name && (t.team_name.toLowerCase() === tNameStr || t.team_name.toLowerCase() === tIdStr)) ||
              (t.template_name && t.template_name.toLowerCase().includes(tNameStr))
            )
          : null;
        const initialTpl = teamMatchingTpl ||
          validTemplates.find((t: any) => t.template_key === res?.active_key) ||
          validTemplates.find((t: any) => t.is_default) ||
          validTemplates[0];

        if (initialTpl) {
          setActiveTemplateKey(initialTpl.template_key);
          if (initialTpl.categories && initialTpl.categories.length > 0) {
            setMgrAssignCategories(JSON.parse(JSON.stringify(initialTpl.categories)));
          } else {
            const teamCycle = cycles.find(c =>
              (c.teamId && (String(c.teamId).toLowerCase() === tIdStr || String(c.teamId).toLowerCase() === tNameStr)) ||
              (c.teamName && c.teamName.toLowerCase() === tNameStr)
            );
            if (teamCycle?.categories && teamCycle.categories.length > 0) {
              setMgrAssignCategories(JSON.parse(JSON.stringify(teamCycle.categories)));
            } else {
              setMgrAssignCategories([]);
            }
          }
        }
      } else {
        const teamCycle = cycles.find(c =>
          (c.teamId && (String(c.teamId).toLowerCase() === tIdStr || String(c.teamId).toLowerCase() === tNameStr)) ||
          (c.teamName && c.teamName.toLowerCase() === tNameStr)
        );

        const initialCats = (teamCycle?.categories && teamCycle.categories.length > 0)
          ? JSON.parse(JSON.stringify(teamCycle.categories))
          : (isProjectManagementTeam(tNameStr) ? JSON.parse(JSON.stringify(DEFAULT_KPI_CATEGORIES)) : []);

        const defaultFormName = (teamCycle?.name) || (defaultTeamVal && defaultTeamVal !== 'all_teams' ? defaultTeamVal : 'Form 1');
        const initialForms: ManagerKpiTemplateRecord[] = [{
          manager_id: code,
          template_key: 'form_1',
          template_name: defaultFormName,
          categories: initialCats,
          is_default: true,
          team_id: defaultTeamVal,
          team_name: defaultTeamVal !== 'all_teams' ? defaultTeamVal : ''
        }];
        setMgrTemplates(initialForms);
        setActiveTemplateKey('form_1');
        setMgrAssignCategories(initialCats);
      }
    } catch (err) {
      console.warn('Failed to load manager templates from DB:', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    if (activeRole === 'manager' && (myCanonicalCode || currentDbUser?.employee_id || user?.id)) {
      loadManagerDeskTemplates(myCanonicalCode || currentDbUser?.employee_id || String(user?.id), mgrAssignTeamId);
    }
  }, [activeRole, myCanonicalCode, currentDbUser, mgrAssignTeamId, cycles.length]);

  const handleOpenMgrCreateModal = (targetDept?: string) => {
    if (!canCreateMetrics) {
      if (!hasAssignedCycleFromAdmin && !isHrOrAdmin) {
        showAlert('Admin has not assigned an evaluation cycle or deliverables template to your team yet. Please wait for Admin / HR to initiate the cycle.', 'Cycle Setup Pending', 'info');
      } else {
        showAlert('You do not have permission to create and assign performance metrics. Please contact your Reporting Manager or HR.', 'Permission Denied', 'warning');
      }
      return;
    }
    const defaultTeamVal = targetDept || (managerDepartments.length > 1 ? 'all_teams' : (managerDepartments[0] || 'all_teams'));
    setMgrAssignTeamId(defaultTeamVal);

    // Initial selected employees = only employees NOT already assigned for this stage/period AND with NO pending evaluation
    setMgrPeriodType('quarterly');
    setMgrPeriodQuarter(currentQuarter);
    setMgrPeriodYear(currentYear);
    syncPeriodAndFormName('quarterly', currentQuarter, currentYear, currentMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, defaultTeamVal);

    // Asynchronously load manager's saved templates from PostgreSQL DB
    const currentMgrEmpCode = String(myCanonicalCode || currentDbUser?.employee_id || userAny?.employee_id || user?.id || '');
    loadManagerDeskTemplates(currentMgrEmpCode, defaultTeamVal);

    const baseTeamMembers = managerAssignableEmployees.filter((e: any) =>
      isEmployeeActive(e) && isEmpInSelectedTeam(e, defaultTeamVal)
    );
    const unassignedMembers = baseTeamMembers.filter((e: any) => {
      return !isEmpAlreadyAssignedForPeriod(e, undefined, 'quarterly', currentQuarter, currentYear) && !getEmpPendingEvaluation(e);
    });
    setMgrAssignEmpIds(unassignedMembers.map((e: any) => String(e.employee_id || '')).filter(Boolean));
    setMgrCustomizeMembers(false);
    setMgrWizardStep(1);
    setIsMgrCreateModalOpen(true);
  };

  const handleMgrTeamChange = (newTeamId: string) => {
    setMgrAssignTeamId(newTeamId);

    const teamObj = dbTeams.find(t => String(t.id) === String(newTeamId) || String(t.name).toLowerCase() === String(newTeamId).toLowerCase() || t.id === newTeamId || t.name === newTeamId);
    const tIdStr = teamObj?.id ? String(teamObj.id).toLowerCase() : '';
    const tNameStr = (teamObj?.name || newTeamId || '').toLowerCase();

    // If a template is specifically linked to this department / team, auto-switch to it
    const matchingTpl = mgrTemplates.find(t => 
      (t.team_id && (String(t.team_id).toLowerCase() === tIdStr || String(t.team_id).toLowerCase() === tNameStr)) ||
      (t.team_name && (t.team_name.toLowerCase() === tNameStr || t.team_name.toLowerCase() === tIdStr)) ||
      (t.template_name && t.template_name.toLowerCase().includes(tNameStr))
    );
    if (matchingTpl && matchingTpl.categories && matchingTpl.categories.length > 0) {
      setActiveTemplateKey(matchingTpl.template_key);
      setMgrAssignCategories(JSON.parse(JSON.stringify(matchingTpl.categories)));
    } else {
      const teamCycle = cycles.find(c =>
        (c.teamId && (String(c.teamId).toLowerCase() === tIdStr || String(c.teamId).toLowerCase() === tNameStr)) ||
        (c.teamName && c.teamName.toLowerCase() === tNameStr)
      );
      if (teamCycle?.categories && teamCycle.categories.length > 0) {
        setMgrAssignCategories(JSON.parse(JSON.stringify(teamCycle.categories)));
      }
    }

    // Only pre-select unassigned team members who don't have pending evaluations
    const baseTeamMembers = managerAssignableEmployees.filter((e: any) =>
      isEmployeeActive(e) && isEmpInSelectedTeam(e, newTeamId)
    );
    const unassignedMembers = baseTeamMembers.filter((e: any) => {
      return !isEmpAlreadyAssignedForPeriod(e) && !getEmpPendingEvaluation(e);
    });
    setMgrAssignEmpIds(unassignedMembers.map((e: any) => String(e.employee_id || '')).filter(Boolean));
    setMgrCustomizeMembers(false);
    syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, newTeamId);
  };

  const handleSelectTemplate = (targetKey: string) => {
    if (targetKey === activeTemplateKey) return;
    const currentMgrEmpCode = String(myCanonicalCode || currentDbUser?.employee_id || userAny?.employee_id || user?.id || '');
    const currentMgrName = `${user?.full_name || userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim() || 'Reporting Manager';
    const selectedTeamName = mgrAssignTeamId === 'all_teams'
      ? (managerDepartments.join(', ') || 'All Direct Reports')
      : mgrAssignTeamId;
    const currentTpl = mgrTemplates.find(t => t.template_key === activeTemplateKey);
    const formLabel = currentTpl?.template_name || `Form ${activeTemplateKey.replace('form_', '')}`;

    // Auto-preserve current in-memory categories into mgrTemplates so switching back doesn't lose edits
    setMgrTemplates(prev => prev.map(t => {
      if (t.template_key === activeTemplateKey) {
        return { ...t, categories: JSON.parse(JSON.stringify(mgrAssignCategories)) };
      }
      return t;
    }));

    // Auto-save the outgoing form to PostgreSQL database in background so edits are never lost
    if (currentMgrEmpCode && mgrAssignCategories && mgrAssignCategories.length > 0) {
      evaluationService.saveManagerTemplate({
        manager_id: currentMgrEmpCode,
        manager_name: currentMgrName,
        template_key: activeTemplateKey,
        template_name: formLabel,
        team_id: mgrAssignTeamId,
        team_name: selectedTeamName,
        categories: mgrAssignCategories,
        is_default: true
      }).catch(err => console.warn('Background auto-save on tab switch:', err));
    }

    setActiveTemplateKey(targetKey);
    const targetTpl = mgrTemplates.find(t => t.template_key === targetKey);
    if (targetTpl && targetTpl.categories && targetTpl.categories.length > 0) {
      setMgrAssignCategories(JSON.parse(JSON.stringify(targetTpl.categories)));
    } else {
      setMgrAssignCategories(JSON.parse(JSON.stringify(DEFAULT_KPI_CATEGORIES)));
    }
  };

  const handleSaveActiveTemplate = async () => {
    const currentMgrEmpCode = String(myCanonicalCode || currentDbUser?.employee_id || userAny?.employee_id || user?.id || '');
    const currentMgrName = `${user?.full_name || userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim() || 'Reporting Manager';
    const selectedTeamName = mgrAssignTeamId === 'all_teams'
      ? (managerDepartments.join(', ') || 'All Direct Reports')
      : mgrAssignTeamId;
    const currentTpl = mgrTemplates.find(t => t.template_key === activeTemplateKey);
    const formLabel = currentTpl?.template_name || `Form ${activeTemplateKey.replace('form_', '')}`;
    setIsSavingTemplate(true);
    try {
      const res = await evaluationService.saveManagerTemplate({
        manager_id: currentMgrEmpCode,
        manager_name: currentMgrName,
        template_key: activeTemplateKey,
        template_name: formLabel,
        team_id: mgrAssignTeamId,
        team_name: selectedTeamName,
        categories: mgrAssignCategories,
        is_default: true
      });
      if (res.success) {
        showToast(`Saved Deliverables & Targets for "${formLabel}" to database!`);
        setMgrTemplates(prev => {
          const exists = prev.some(t => t.template_key === activeTemplateKey);
          if (exists) {
            return prev.map(t => t.template_key === activeTemplateKey ? {
              ...t,
              categories: JSON.parse(JSON.stringify(mgrAssignCategories)),
              template_name: formLabel,
              updated_at: new Date().toISOString()
            } : t);
          } else {
            return [...prev, {
              manager_id: currentMgrEmpCode,
              template_key: activeTemplateKey,
              template_name: formLabel,
              categories: JSON.parse(JSON.stringify(mgrAssignCategories)),
              is_default: true,
              updated_at: new Date().toISOString()
            }];
          }
        });
      } else {
        showAlert(res.error || 'Failed to save template to database', 'Save Error', 'danger');
      }
    } catch (err: any) {
      showAlert('Failed to save template: ' + (err?.message || 'Network error'), 'Save Error', 'danger');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleStartRenameTemplate = () => {
    const currentTpl = mgrTemplates.find(t => t.template_key === activeTemplateKey);
    setRenameTemplateInput(currentTpl?.template_name || `Form ${activeTemplateKey.replace('form_', '')}`);
    setIsRenamingTemplate(true);
  };

  const handleConfirmRenameTemplate = async () => {
    const trimmed = renameTemplateInput.trim();
    if (!trimmed) {
      setIsRenamingTemplate(false);
      return;
    }
    const currentMgrEmpCode = String(myCanonicalCode || currentDbUser?.employee_id || userAny?.employee_id || user?.id || '');
    try {
      await evaluationService.renameManagerTemplate(currentMgrEmpCode, activeTemplateKey, trimmed);
      setMgrTemplates(prev => prev.map(t => t.template_key === activeTemplateKey ? { ...t, template_name: trimmed } : t));
      showToast(`Renamed to "${trimmed}"`);
    } catch (e) {
      console.warn('Rename template notice:', e);
      setMgrTemplates(prev => prev.map(t => t.template_key === activeTemplateKey ? { ...t, template_name: trimmed } : t));
    } finally {
      setIsRenamingTemplate(false);
    }
  };

  const handleResetActiveTemplate = () => {
    showConfirm(
      'Are you sure you want to reset Deliverables & Targets for this form to system defaults?',
      async () => {
        try {
          const defaultCats = await evaluationService.getSystemDefaultKpiTemplate();
          setMgrAssignCategories(JSON.parse(JSON.stringify(defaultCats)));
          showToast('Reset to system default deliverables.');
        } catch (e) {
          setMgrAssignCategories(JSON.parse(JSON.stringify(DEFAULT_KPI_CATEGORIES)));
        }
      },
      'Reset Deliverables',
      'warning',
      'Reset to Defaults'
    );
  };

  const handleAddNewTemplate = () => {
    const currentMgrEmpCode = String(myCanonicalCode || currentDbUser?.employee_id || userAny?.employee_id || user?.id || '');
    const currentMgrName = `${user?.full_name || userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim() || 'Reporting Manager';
    const selectedTeamName = mgrAssignTeamId === 'all_teams'
      ? (managerDepartments.join(', ') || 'All Direct Reports')
      : mgrAssignTeamId;
    const currentTpl = mgrTemplates.find(t => t.template_key === activeTemplateKey);
    const formLabel = currentTpl?.template_name || `Form ${activeTemplateKey.replace('form_', '')}`;

    // Auto-preserve current in-memory categories
    setMgrTemplates(prev => prev.map(t => {
      if (t.template_key === activeTemplateKey) {
        return { ...t, categories: JSON.parse(JSON.stringify(mgrAssignCategories)) };
      }
      return t;
    }));

    // Auto-save current form before switching
    if (currentMgrEmpCode && mgrAssignCategories && mgrAssignCategories.length > 0) {
      evaluationService.saveManagerTemplate({
        manager_id: currentMgrEmpCode,
        manager_name: currentMgrName,
        template_key: activeTemplateKey,
        template_name: formLabel,
        team_id: mgrAssignTeamId,
        team_name: selectedTeamName,
        categories: mgrAssignCategories,
        is_default: true
      }).catch(err => console.warn('Background auto-save before new form:', err));
    }

    const nextNum = mgrTemplates.length + 1;
    const newKey = `form_${Date.now()}`;
    const newName = mgrAssignTeamId && mgrAssignTeamId !== 'all_teams' ? `${mgrAssignTeamId} (Form ${nextNum})` : `Form ${nextNum}`;
    const newTpl: ManagerKpiTemplateRecord = {
      manager_id: currentMgrEmpCode,
      template_key: newKey,
      template_name: newName,
      categories: [],
      is_default: false,
      team_id: mgrAssignTeamId,
      team_name: selectedTeamName
    };
    setMgrTemplates(prev => [...prev, newTpl]);
    setActiveTemplateKey(newKey);
    setMgrAssignCategories([]);
    showToast(`Created new form slot: "${newName}".`);
  };

  const handleDeleteTemplate = (templateKey: string) => {
    const targetTpl = mgrTemplates.find(t => t.template_key === templateKey);
    const formLabel = targetTpl?.template_name || `Form ${templateKey.replace('form_', '')}`;
    const currentMgrEmpCode = String(myCanonicalCode || currentDbUser?.employee_id || userAny?.employee_id || user?.id || '');

    if (mgrTemplates.length <= 1) {
      showConfirm(
        `Clear all deliverables in "${formLabel}" and start fresh?`,
        () => {
          setMgrAssignCategories([]);
          showToast(`Cleared "${formLabel}".`);
        },
        'Clear Form',
        'warning',
        'Clear Form'
      );
      return;
    }

    showConfirm(
      `Are you sure you want to delete "${formLabel}"?`,
      async () => {
        try {
          if (currentMgrEmpCode) {
            await evaluationService.deleteManagerTemplate(currentMgrEmpCode, templateKey);
          }
        } catch (e) {
          console.warn('Failed to delete template from DB:', e);
        }

        const remaining = mgrTemplates.filter(t => t.template_key !== templateKey);
        setMgrTemplates(remaining);

        if (activeTemplateKey === templateKey) {
          const nextTpl = remaining[0];
          if (nextTpl) {
            setActiveTemplateKey(nextTpl.template_key);
            setMgrAssignCategories(JSON.parse(JSON.stringify(nextTpl.categories || [])));
          } else {
            setActiveTemplateKey('form_1');
            setMgrAssignCategories([]);
          }
        }
        showToast(`Deleted "${formLabel}".`);
      },
      'Delete Form',
      'danger',
      'Delete Form'
    );
  };

  // Auto-deselect any employee that is already assigned or has a pending evaluation whenever period or modal opens
  useEffect(() => {
    if (isMgrCreateModalOpen) {
      setMgrAssignEmpIds(prev => prev.filter(id => {
        const empObj = dbEmployees.find(e => String(e.employee_id || '') === id) || id;
        return !isEmpAlreadyAssignedForPeriod(empObj) && !getEmpPendingEvaluation(empObj);
      }));
    }
  }, [
    isMgrCreateModalOpen,
    mgrPeriodType,
    mgrPeriodQuarter,
    mgrPeriodYear,
    mgrPeriodMonth,
    mgrPeriodDueDate,
    mgrPeriodFromDate,
    mgrPeriodToDate,
    mgrAssignPeriod,
    cycles,
    responses
  ]);

  const handleMgrToggleEmp = (empId: string) => {
    const emp = dbEmployees.find(e => String(e.employee_id || '') === empId);
    const empTarget = emp || empId;
    const pendingEval = getEmpPendingEvaluation(empTarget);
    if (pendingEval) {
      const fullName = emp ? (`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name) : 'This team member';
      const statusInfo = getPendingStatusLabel(pendingEval);
      showAlert(
        `Cannot assign new metrics to ${fullName}:\n\n${statusInfo.tooltip}`,
        'Pending Evaluation Exists'
      );
      return;
    }
    if (isEmpAlreadyAssignedForPeriod(empTarget)) {
      showToast('This team member is already assigned for this evaluation period and cannot be booked again.');
      return;
    }
    setMgrAssignEmpIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleMgrToggleSelectAll = (teamEmps: any[]) => {
    const activeEmps = (teamEmps || []).filter(isEmployeeActive);
    const assignableEmps = activeEmps.filter(e => {
      return !isEmpAlreadyAssignedForPeriod(e) && !getEmpPendingEvaluation(e);
    });
    const assignableIds = assignableEmps.map(e => String(e.employee_id || '')).filter(Boolean);

    if (assignableIds.length === 0) {
      showToast('No available team members to select. (Members are either already assigned or have pending evaluations)');
      return;
    }

    const allSelected = assignableIds.every(id => mgrAssignEmpIds.includes(id));
    if (allSelected) {
      setMgrAssignEmpIds(prev => prev.filter(id => !assignableIds.includes(id)));
    } else {
      setMgrAssignEmpIds(prev => Array.from(new Set([...prev, ...assignableIds])));
    }
  };

  const handleMgrAddCategory = () => {
    const currentTotal = mgrAssignCategories.reduce((sum, c) => sum + (Number(c.weightage) || 0), 0);
    const remaining = Math.max(0, 100 - currentTotal);
    const newCat: KPICategory = {
      id: `mgr_cat_${Date.now()}`,
      name: 'New Performance Metric',
      description: 'Define metric focus area',
      weightage: remaining,
      kpis: [
        {
          id: `mgr_kpi_${Date.now()}_1`,
          name: 'Metric Deliverable',
          description: 'Deliverable detail',
          targetScore: remaining,
          weightage: remaining,
          targetFromManager: '1',
          targetValue: 1,
          unit: 'units',
          scoringDirection: 'higher_is_better',
          measurementType: 'number',
          isRequired: true
        }
      ]
    };
    setMgrAssignCategories(prev => [...prev, newCat]);
  };

  const rebalanceCategoriesAfterDelete = (categories: KPICategory[], deletedCatId: string): KPICategory[] => {
    const filtered = categories.filter(c => c.id !== deletedCatId);
    if (filtered.length === 0) return filtered;

    const oldTotal = filtered.reduce((sum, c) => sum + (Number(c.weightage) || 0), 0);
    let accumulatedWeight = 0;

    return filtered.map((c, idx) => {
      let newWeight = 0;
      if (idx === filtered.length - 1) {
        newWeight = Math.max(1, Number((100 - accumulatedWeight).toFixed(2)));
      } else {
        if (oldTotal > 0) {
          newWeight = Math.max(1, Math.round(((Number(c.weightage) || 0) / oldTotal) * 100));
        } else {
          newWeight = Math.max(1, Math.floor(100 / filtered.length));
        }
        accumulatedWeight += newWeight;
      }

      const count = c.kpis ? c.kpis.length : 0;
      if (count > 0) {
        const perKpi = Number((newWeight / count).toFixed(2));
        let remaining = newWeight;
        const updatedKpis = c.kpis.map((k, i) => {
          if (i === count - 1) {
            const finalScore = Number(remaining.toFixed(2));
            return { ...k, targetScore: finalScore, weightage: finalScore };
          }
          remaining -= perKpi;
          return { ...k, targetScore: perKpi, weightage: perKpi };
        });
        return { ...c, weightage: newWeight, kpis: updatedKpis };
      }

      return { ...c, weightage: newWeight };
    });
  };

  const handleMgrDeleteCategory = (catId: string) => {
    if (mgrAssignCategories.length <= 1) {
      showAlert('At least one performance category is required.', 'Action Not Allowed');
      return;
    }
    setMgrAssignCategories(prev => rebalanceCategoriesAfterDelete(prev, catId));
  };

  const handleMgrUpdateCategoryName = (catId: string, name: string) => {
    setMgrAssignCategories(prev => prev.map(c => c.id === catId ? { ...c, name } : c));
  };

  const handleMgrUpdateCategoryWeight = (catId: string, weight: number) => {
    const newWeight = Math.max(0, Math.min(100, Number(weight) || 0));
    setMgrAssignCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const count = c.kpis.length;
      if (count === 0) return { ...c, weightage: newWeight };

      const perKpi = Number((newWeight / count).toFixed(2));
      let remaining = newWeight;
      const updatedKpis = c.kpis.map((k, i) => {
        if (i === count - 1) {
          const finalScore = Number(remaining.toFixed(2));
          return { ...k, targetScore: finalScore, weightage: finalScore };
        }
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      return { ...c, weightage: newWeight, kpis: updatedKpis };
    }));
  };

  const handleMgrAutoBalanceCategory = (catId: string) => {
    setMgrAssignCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const count = c.kpis.length;
      if (count === 0) return c;
      const catWeight = Number(c.weightage) || 0;
      const perKpi = Number((catWeight / count).toFixed(2));
      let remaining = catWeight;

      const updatedKpis = c.kpis.map((k, idx) => {
        if (idx === count - 1) {
          const finalScore = Number(remaining.toFixed(2));
          return { ...k, targetScore: finalScore, weightage: finalScore };
        }
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      return { ...c, kpis: updatedKpis };
    }));
  };

  const handleMgrAddKPI = (catId: string) => {
    setMgrAssignCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const count = c.kpis.length + 1;
      const catWeight = Number(c.weightage) || 0;
      const perKpi = Number((catWeight / count).toFixed(2));
      let remaining = catWeight;

      const existingUpdated = c.kpis.map(k => {
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      const finalScore = Number(remaining.toFixed(2));
      const newKpi: KPIItem = {
        id: `mgr_kpi_${Date.now()}`,
        name: '',
        description: '',
        targetScore: finalScore,
        weightage: finalScore,
        targetFromManager: '1',
        targetValue: 1,
        unit: 'units',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      };

      return { ...c, kpis: [...existingUpdated, newKpi] };
    }));
  };

  const handleMgrDeleteKPI = (catId: string, kpiId: string) => {
    setMgrAssignCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      if (c.kpis.length <= 1) {
        showAlert('A performance category must have at least one deliverable item.', 'Validation Error');
        return c;
      }
      const filtered = c.kpis.filter(k => k.id !== kpiId);
      const count = filtered.length;
      const catWeight = Number(c.weightage) || 0;
      const perKpi = Number((catWeight / count).toFixed(2));
      let remaining = catWeight;

      const updatedKpis = filtered.map((k, idx) => {
        if (idx === count - 1) {
          const finalScore = Number(remaining.toFixed(2));
          return { ...k, targetScore: finalScore, weightage: finalScore };
        }
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      return { ...c, kpis: updatedKpis };
    }));
  };

  const handleMgrUpdateKPI = (catId: string, kpiId: string, field: keyof KPIItem, value: any) => {
    setMgrAssignCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      return {
        ...c,
        kpis: c.kpis.map(k => {
          if (k.id !== kpiId) return k;
          return { ...k, [field]: value };
        })
      };
    }));
  };

  const mgrTotalWeightage = mgrAssignCategories.reduce((sum, c) => sum + (Number(c.weightage) || 0), 0);
  const isMgrWeightageValid = mgrTotalWeightage === 100;
  const areAllMgrCategoriesBalanced = mgrAssignCategories.every(cat => {
    const catSum = cat.kpis.reduce((sum, k) => sum + (Number(k.targetScore) || 0), 0);
    return Math.abs(catSum - Number(cat.weightage)) <= 0.05;
  });

  const handleMgrSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mgrAssignTeamId) {
      showAlert('Please select a target team.', 'Selection Required');
      return;
    }
    if (mgrAssignEmpIds.length === 0) {
      showAlert('Please select at least one team member to assign these metrics to.', 'Selection Required');
      return;
    }
    if (mgrTotalWeightage !== 100) {
      showAlert(`Total category weightage must equal exactly 100%. Currently it is ${mgrTotalWeightage}%.`, 'Weightage Mismatch');
      return;
    }
    for (const cat of mgrAssignCategories) {
      const catSum = cat.kpis.reduce((s, k) => s + (Number(k.targetScore) || 0), 0);
      if (Math.abs(catSum - Number(cat.weightage)) > 0.05) {
        showAlert(`Category "${cat.name}" has Target Scores summing to ${catSum.toFixed(2)}%, but Category Weight is ${cat.weightage}%. Please click "Auto-Balance Targets" or adjust.`, 'Balance Required');
        return;
      }
    }

    setIsAssigning(true);
    try {
      const selectedTeamName = mgrAssignTeamId === 'all_teams'
        ? (managerDepartments.join(', ') || 'All Direct Reports')
        : mgrAssignTeamId;
      const currentMgrName = `${user?.full_name || userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim() || 'Reporting Manager';

      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;
      if (mgrPeriodType === 'daily') {
        effectiveStartDate = mgrPeriodDueDate;
        effectiveEndDate = mgrPeriodDueDate;
      } else if (mgrPeriodType === 'weekly') {
        effectiveStartDate = mgrPeriodFromDate;
        effectiveEndDate = mgrPeriodToDate;
      } else if (mgrPeriodType === 'monthly') {
        effectiveStartDate = `${mgrPeriodYear}-${String(mgrPeriodMonth).padStart(2, '0')}-01`;
        effectiveEndDate = new Date(mgrPeriodYear, mgrPeriodMonth, 0).toISOString().split('T')[0];
      } else if (mgrPeriodType === 'quarterly') {
        if (mgrPeriodQuarter === 1) {
          effectiveStartDate = `${mgrPeriodYear}-04-01`;
          effectiveEndDate = `${mgrPeriodYear}-06-30`;
        } else if (mgrPeriodQuarter === 2) {
          effectiveStartDate = `${mgrPeriodYear}-07-01`;
          effectiveEndDate = `${mgrPeriodYear}-09-30`;
        } else if (mgrPeriodQuarter === 3) {
          effectiveStartDate = `${mgrPeriodYear}-10-01`;
          effectiveEndDate = `${mgrPeriodYear}-12-31`;
        } else {
          effectiveStartDate = `${mgrPeriodYear}-01-01`;
          effectiveEndDate = `${mgrPeriodYear}-03-31`;
        }
      } else if (mgrPeriodType === 'yearly' || (mgrPeriodType as string) === 'annual') {
        effectiveStartDate = `${mgrPeriodYear}-04-01`;
        effectiveEndDate = `${mgrPeriodYear + 1}-03-31`;
      }

      const currentMgrEmpCode = String(myCanonicalCode || currentDbUser?.employee_id || userAny?.employee_id || user?.employee_id || '');
      const smObj = dbEmployees.find(e => String(e.employee_id) === String(selectedSmId));
      const resolvedSmCode = smObj?.employee_id || selectedSmId;

      const activeAssignEmpIds = mgrAssignEmpIds.filter(id => {
        const emp = dbEmployees.find(e => String(e.employee_id || '') === id);
        return emp ? isEmployeeActive(emp) : true;
      });

      // Strictly verify no selected employee has a pending evaluation
      const blockedByPending = activeAssignEmpIds.filter(id => {
        const emp = dbEmployees.find(e => String(e.employee_id || '') === id);
        return Boolean(getEmpPendingEvaluation(emp || id));
      });
      if (blockedByPending.length > 0) {
        const blockedNames = blockedByPending.map(id => {
          const emp = dbEmployees.find(e => String(e.employee_id || '') === id);
          return emp ? (`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name) : id;
        });
        showAlert(
          `Cannot apply metrics: The following employee(s) currently have a pending evaluation that must be completed/calibrated first:\n\n• ${blockedNames.join('\n• ')}`,
          'Pending Evaluation Exists',
          'warning'
        );
        setIsAssigning(false);
        return;
      }

      // Filter out any employees already assigned for this period or having pending evaluations
      const unassignedToBook = activeAssignEmpIds.filter(id => {
        const emp = dbEmployees.find(e => String(e.employee_id || '') === id);
        return !isEmpAlreadyAssignedForPeriod(emp || id) && !getEmpPendingEvaluation(emp || id);
      });

      if (unassignedToBook.length === 0) {
        showAlert('All selected team members are already assigned for this evaluation period or have a pending evaluation.', 'Cannot Assign');
        setIsAssigning(false);
        return;
      }

      const activeTplObj = mgrTemplates.find(t => t.template_key === activeTemplateKey);
      const activeFormLabel = activeTplObj?.template_name || `Form ${activeTemplateKey.replace('form_', '')}`;

      // Auto-save active template configuration to PostgreSQL database so even if the manager forgot to click "Save Form", it is automatically stored permanently in that form
      try {
        await evaluationService.saveManagerTemplate({
          manager_id: currentMgrEmpCode,
          manager_name: currentMgrName,
          template_key: activeTemplateKey,
          template_name: activeFormLabel,
          team_id: mgrAssignTeamId,
          team_name: selectedTeamName,
          categories: mgrAssignCategories,
          is_default: true
        });
        setMgrTemplates(prev => {
          const exists = prev.some(t => t.template_key === activeTemplateKey);
          if (exists) {
            return prev.map(t => t.template_key === activeTemplateKey ? {
              ...t,
              categories: JSON.parse(JSON.stringify(mgrAssignCategories)),
              template_name: activeFormLabel,
              updated_at: new Date().toISOString()
            } : t);
          } else {
            return [...prev, {
              manager_id: currentMgrEmpCode,
              template_key: activeTemplateKey,
              template_name: activeFormLabel,
              categories: JSON.parse(JSON.stringify(mgrAssignCategories)),
              is_default: true,
              updated_at: new Date().toISOString()
            }];
          }
        });
      } catch (autoSaveErr) {
        console.warn('Auto-save template on assign notice:', autoSaveErr);
      }

      await evaluationService.createAndAssignKpiMetrics({
        formName: mgrAssignFormName,
        teamId: mgrAssignTeamId,
        teamName: selectedTeamName,
        managerId: currentMgrEmpCode,
        managerName: currentMgrName,
        serviceManagerId: resolvedSmCode,
        serviceManagerName: smObj ? (`${smObj.first_name || ''} ${smObj.last_name || ''}`.trim() || smObj.name) : 'Service Manager',
        employeeIds: unassignedToBook,
        periodName: mgrAssignPeriod,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        categories: mgrAssignCategories,
        allEmployees: dbEmployees.filter(isEmployeeActive),
        frequency: mgrPeriodType,
        templateKey: activeTemplateKey,
        templateName: activeFormLabel
      });

      setIsMgrCreateModalOpen(false);
      await loadAllData();
      showToast(`Performance Metrics successfully assigned to ${activeAssignEmpIds.length} team member(s)!`);
    } catch (err: any) {
      console.error('Error assigning metrics:', err);
      showAlert('Failed to assign metrics: ' + (err?.message || 'Unknown error'), 'Assignment Error', 'danger');
    } finally {
      setIsAssigning(false);
    }
  };
  // STRICT TEAM-SCOPING ACCESS CONTROL
  // =========================================================================
  // Helper to test if a cycle belongs strictly to the user's team
  const isCycleForUserTeam = (c: EvaluationCycle) => {
    if (isHrOrAdmin || isServiceManager) return true;
    const cycleTeamId = String(c.teamId || '');
    const cycleTeamName = (c.teamName || '').toLowerCase();
    const mgrIds = (c.managerId || '').split(',').map(s => s.trim());
    const empIds = (c.employeeIds || []).map(s => String(s).trim());

    const userReportingMgr = (currentDbUser?.reporting_manager || userAny?.reporting_manager || '').toLowerCase();
    const cycleMgrName = (c.managerName || '').toLowerCase();

    const isDirectUser = mgrIds.includes(userId) || mgrIds.includes(userCode) ||
      empIds.includes(userId) || empIds.includes(userCode) ||
      String(c.serviceManagerId) === userId || String(c.serviceManagerId) === userCode;

    const isMgrMatch = userReportingMgr && cycleMgrName && (
      userReportingMgr === cycleMgrName ||
      userReportingMgr.replace(/\s*\(\w+\)\s*$/, '').trim() === cycleMgrName.replace(/\s*\(\w+\)\s*$/, '').trim()
    );

    const isDbUserMatch = currentDbUser && (
      mgrIds.includes(String(currentDbUser.employee_id)) ||
      empIds.includes(String(currentDbUser.employee_id))
    );

    const isSameTeamName = (
      (effectiveTeamName && cycleTeamName && (cycleTeamName.includes(effectiveTeamName.toLowerCase()) || effectiveTeamName.toLowerCase().includes(cycleTeamName))) ||
      managerDepartments.some(d => cycleTeamName.includes(d.toLowerCase()) || d.toLowerCase().includes(cycleTeamName))
    );

    const isSameTeamId = effectiveTeamId && cycleTeamId && (
      cycleTeamId === effectiveTeamId ||
      cycleTeamId.toLowerCase() === effectiveTeamId.toLowerCase()
    );

    return isDirectUser || isMgrMatch || isDbUserMatch || isSameTeamName || isSameTeamId;
  };

  // 1. Team-scoped Cycles: An employee/manager only sees cycles created for their team (unless HR/Admin)
  const scopedCycles = cycles.filter(isCycleForUserTeam);

  // Helper to determine if an evaluation response is under the logged-in manager's review scope
  const isResponseUnderMyManagerReview = (r: EvaluationResponse): boolean => {
    if (!r) return false;
    // A user's own evaluation response must NEVER appear in their managerial queues
    if (isResponseForUser(r)) return false;

    if (isHrOrAdmin) return true;

    const mgrIds = [
      String(userId || ''),
      String(userCode || ''),
      String(myCanonicalCode || ''),
      String(currentDbUser?.employee_id || ''),
      String(userAny?.employee_id || ''),
      String(user?.employee_id || '')
    ].filter(Boolean).map(id => cleanEmpIdentifier(id));

    const mgrFullNames = [
      user?.full_name,
      userAny?.name,
      userAny?.full_name,
      `${currentDbUser?.first_name || ''} ${currentDbUser?.last_name || ''}`.trim(),
      `${userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim(),
      userAny?.username,
      currentDbUser?.username
    ].filter(Boolean).map(n => String(n).toLowerCase().trim());

    // 1. Look up the actual employee in DB for this response and check hierarchy
    const empInDb = dbEmployees.find((e: any) =>
      cleanEmpIdentifier(e.employee_id) === cleanEmpIdentifier(r.employeeCode) ||
      cleanEmpIdentifier(e.employee_id) === cleanEmpIdentifier(r.employeeId) ||
      (`${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase() === String(r.employeeName || '').trim().toLowerCase())
    );

    if (empInDb) {
      if (isDownlineReport(empInDb) || isAssignableSubordinate(empInDb) || isDirectReport(empInDb)) {
        return true;
      }
      // If employee exists in DB and is NOT under this manager's hierarchy, strictly exclude them
      return false;
    }

    // 2. Direct match by managerId / reportingManager on response (from kpi_evaluations table in DB)
    const respMgrIds = [
      cleanEmpIdentifier(r.managerId),
      cleanEmpIdentifier(r.reportingManagerId),
      cleanEmpIdentifier((r as any).reporting_manager_id),
      cleanEmpIdentifier((r as any).manager_id)
    ].filter(Boolean);

    if (respMgrIds.some(id => mgrIds.includes(id))) {
      return true;
    }

    const respMgrNames = [
      String((r as any).reportingManager || (r as any).reporting_manager || '').trim().toLowerCase(),
      String((r as any).managerName || (r as any).manager_name || '').trim().toLowerCase()
    ].filter(Boolean);

    if (respMgrNames.some(name => mgrFullNames.some(mName => mName && (name === mName || name.includes(mName) || mName.includes(name))))) {
      return true;
    }

    if (r.cycleId) {
      const cyc = cycles.find(c => c.id === r.cycleId);
      if (cyc && isDirectManagerOfCycle(cyc)) return true;
    }

    return false;
  };

  // 2. Team-scoped Manager Responses: Direct reports + Downline reports from DB
  const managerTeamResponses = responses.filter(isResponseUnderMyManagerReview);

  // 3. Service Manager Scoped Cycles & Responses
  const smTeamCycles = cycles.filter(c => {
    if (isHrOrAdmin) return true;
    const isAssignedSM = String(c.serviceManagerId) === userId || String(c.serviceManagerId) === userCode;
    return isAssignedSM || isCycleForUserTeam(c);
  });

  const smTeamResponses = responses.filter(r => {
    if (isHrOrAdmin) return true;
    const respCycle = cycles.find(c => c.id === r.cycleId);
    if (!respCycle) return false;
    const isAssignedSM = String(respCycle.serviceManagerId) === userId || String(respCycle.serviceManagerId) === userCode;
    return isAssignedSM || isCycleForUserTeam(respCycle);
  });


  // 4. Employee Active Cycle & Response (Strictly for the employee's own record)
  const allUserResponses = useMemo(() => {
    const rawList = responses.filter(isResponseForUser).sort((a, b) => {
      // 1. Pending evaluations requiring employee action sort first
      const aPending = (a.status as string) === 'employee_in_progress' || (a.status as string) === 'Draft' || (a.status as string) === 'Assigned to Employee' || (!a.employeeSubmittedAt && (a.status as string) !== 'manager_review' && (a.status as string) !== 'approved' && (a.status as string) !== 'sm_final_approval');
      const bPending = (b.status as string) === 'employee_in_progress' || (b.status as string) === 'Draft' || (b.status as string) === 'Assigned to Employee' || (!b.employeeSubmittedAt && (b.status as string) !== 'manager_review' && (b.status as string) !== 'approved' && (b.status as string) !== 'sm_final_approval');
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;

      // 2. Latest date descending (e.g. Sep 16 before Sep 15 before Sep 14)
      const dateA = parseEvalDateTimestamp(a);
      const dateB = parseEvalDateTimestamp(b);
      if (dateB !== dateA) return dateB - dateA;

      // 3. Highest ID descending (e.g. resp_16 before resp_15)
      const numA = parseInt(String(a.id || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.id || '').replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numB - numA;

      const timeA = new Date(a.createdAt || a.employeeSubmittedAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.employeeSubmittedAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    // Deduplicate so each distinct evaluation period / DB record appears ONCE
    const periodMap = new Map<string, EvaluationResponse>();
    rawList.forEach(r => {
      const pKey = (r.periodName || (r as any).form || '').trim().toLowerCase();
      const key = `${r.id}_${pKey}`;
      if (!periodMap.has(key)) {
        periodMap.set(key, r);
      }
    });

    return Array.from(periodMap.values());
  }, [responses, dbEmployees, userId, userCode, currentDbUser]);

  const activeEmpResponse = (selectedResponseId && allUserResponses.find(r => r.id === selectedResponseId))
    || allUserResponses[0];

  const isEmployeeExplicitlyAssigned = Boolean(
    (activeEmpResponse && (
      (Array.isArray((activeEmpResponse as any).categories) && (activeEmpResponse as any).categories.length > 0) ||
      (activeEmpResponse.kpiResponses && Object.keys(activeEmpResponse.kpiResponses).length > 0) ||
      activeEmpResponse.status === 'manager_review' ||
      activeEmpResponse.status === 'approved' ||
      activeEmpResponse.status === 'sm_final_approval' ||
      Boolean(activeEmpResponse.employeeSubmittedAt)
    )) ||
    cycles.some(c => {
      if (!c.employeeIds || c.employeeIds.length === 0) return false;
      if (!c.categories || c.categories.length === 0) return false;
      const cleanMyCode = String(myCanonicalCode || '').trim().toLowerCase().replace(/^emp-?/i, '');
      return c.employeeIds.some(id => {
        const cleanId = String(id || '').trim().toLowerCase().replace(/^emp-?/i, '');
        return cleanId === cleanMyCode;
      });
    })
  );

  const activeCycle = (activeEmpResponse ? cycles.find(c => c.id === activeEmpResponse.cycleId) : undefined)
    || scopedCycles.find(c => c.status === 'active')
    || scopedCycles[0]
    || cycles.find(c => c.status === 'active')
    || cycles[0];

  // Active Manager Cycle for viewing the team's Deliverables Matrix (strictly when created by this manager)
  const activeManagerCycle = (
    (managerFilterDept && managerFilterDept !== 'all')
      ? managerDirectCycles.find(c => (c.teamName || '').toLowerCase() === managerFilterDept.toLowerCase())
      : undefined
  ) || managerDirectCycles.find(c => c.status === 'active') || managerDirectCycles[0];

  // Resolve active categories for employee worksheet
  const activeCategories: KPICategory[] = useMemo(() => {
    // 1. Prefer categories explicitly attached to the employee's active response
    if (activeEmpResponse) {
      const respCats = (activeEmpResponse as any).categories || (activeEmpResponse as any).metrics_data;
      if (Array.isArray(respCats) && respCats.length > 0) {
        return respCats;
      }
      // If it has kpiResponses or metrics_data as a dictionary of KPIs, wrap into a category
      const mData = (activeEmpResponse as any).metrics_data || activeEmpResponse.kpiResponses;
      if (mData && typeof mData === 'object' && !Array.isArray(mData) && Object.keys(mData).length > 0) {
        const kpisList: KPIItem[] = [];
        const seenIds = new Set<string>();
        Object.entries(mData).forEach(([key, val]: [string, any]) => {
          if (!val || typeof val !== 'object') return;
          const kId = val.kpiId || val.id || key;
          if (seenIds.has(kId)) return;
          seenIds.add(kId);
          kpisList.push({
            id: kId,
            name: val.name || key,
            description: val.description || '',
            targetScore: val.targetScore || 100,
            weightage: val.weightage || 100,
            targetFromManager: val.targetFromManager || val.targetValue || '100%',
            targetValue: val.targetValue || 100,
            unit: val.unit || '%',
            scoringDirection: (val.scoringDirection || 'higher_is_better') as any,
            measurementType: (val.measurementType || 'numerical') as any,
            isRequired: true
          });
        });
        if (kpisList.length > 0) {
          return [{
            id: 'cat_deliverables',
            name: (activeEmpResponse as any).form || activeEmpResponse.periodName || 'Performance Deliverables',
            description: 'Deliverables evaluation items',
            weightage: 100,
            kpis: kpisList
          }];
        }
      }
    }
    // 2. Check activeCycle categories (ensuring non-empty array)
    if (activeCycle?.categories && Array.isArray(activeCycle.categories) && activeCycle.categories.length > 0) {
      return activeCycle.categories;
    }
    // 3. Fallback to default KPI categories
    return DEFAULT_KPI_CATEGORIES;
  }, [activeEmpResponse, activeCycle]);

  const managerTeamCategories = (activeManagerCycle?.categories && activeManagerCycle.categories.length > 0) ? activeManagerCycle.categories : activeCategories;

  // Responses strictly belonging to active manager cycle / team
  const activeCycleResponses = responses.filter(r =>
    (activeManagerCycle && r.cycleId === activeManagerCycle.id) ||
    (activeManagerCycle?.teamId && r.teamId === activeManagerCycle.teamId) ||
    (activeManagerCycle?.employeeIds && activeManagerCycle.employeeIds.includes(String(r.employeeId || r.employeeCode)))
  );

  // Check if ANY employee has started/filled KPI numbers or submitted evaluation
  const filledCycleResponses = activeCycleResponses.filter(r => {
    const isSubmitted =
      r.status === 'manager_review' ||
      r.status === 'sm_final_approval' ||
      r.status === 'approved' ||
      (r.status as string) === 'Submitted to Manager' ||
      Boolean(r.employeeSubmittedAt) ||
      (r.employeeOverallScore && r.employeeOverallScore > 0);

    const hasFilledValues =
      r.kpiResponses &&
      Object.values(r.kpiResponses).some(
        item => item && item.actualValue !== '' && item.actualValue !== null && item.actualValue !== undefined
      );

    return isSubmitted || hasFilledValues;
  });

  // Helper to determine if a specific evaluation cycle is locked (i.e. employees have started/submitted)
  const getCycleLockedInfo = (cycle?: EvaluationCycle) => {
    if (!cycle) return { isLocked: false, activeCount: 0 };
    const cycleResponses = responses.filter(r =>
      (cycle.id && r.cycleId === cycle.id) ||
      (cycle.teamId && r.teamId === cycle.teamId) ||
      (cycle.teamName && (r.department || '').toLowerCase() === cycle.teamName.toLowerCase()) ||
      (cycle.employeeIds && cycle.employeeIds.includes(String(r.employeeId || r.employeeCode)))
    );
    const activeFilled = cycleResponses.filter(r => {
      const isSubmitted =
        r.status === 'manager_review' ||
        r.status === 'sm_final_approval' ||
        r.status === 'approved' ||
        (r.status as string) === 'Submitted to Manager' ||
        Boolean(r.employeeSubmittedAt) ||
        (r.employeeOverallScore && r.employeeOverallScore > 0);
      const hasFilledValues =
        r.kpiResponses &&
        Object.values(r.kpiResponses).some(
          item => item && item.actualValue !== '' && item.actualValue !== null && item.actualValue !== undefined
        );
      return isSubmitted || hasFilledValues;
    });
    return { isLocked: activeFilled.length > 0, activeCount: activeFilled.length };
  };

  const isMatrixLocked = getCycleLockedInfo(activeManagerCycle).isLocked;
  const filledResponsesCount = getCycleLockedInfo(activeManagerCycle).activeCount;

  // Handlers for Manager Edit & Delete Deliverables Matrix
  const handleOpenMgrEditMatrixModal = (targetCycle?: EvaluationCycle) => {
    const cycleToEdit = targetCycle || activeManagerCycle;
    if (!cycleToEdit) {
      showAlert('No active deliverables matrix found for this team. You can create one using "Create & Assign Metrics".', 'No Matrix Found');
      return;
    }
    const { isLocked, activeCount } = getCycleLockedInfo(cycleToEdit);
    if (isLocked) {
      showAlert(
        `This Deliverables Matrix cannot be edited because ${activeCount} team member(s) have already started or submitted their evaluations. Editing is locked to protect score data and maintain review consistency.`,
        'Deliverables Matrix Locked',
        'warning'
      );
      return;
    }

    setMgrEditCycleId(cycleToEdit.id);
    setMgrEditFormName(cycleToEdit.name || `Q${currentQuarter} Performance Metrics`);
    setMgrEditPeriod(cycleToEdit.periodName || `Q${currentQuarter} ${currentYear} (${quarterLabel})`);
    setMgrEditTeamName(cycleToEdit.teamName || effectiveTeamName || 'Your Team');
    setMgrEditCategories(JSON.parse(JSON.stringify(cycleToEdit.categories || DEFAULT_KPI_CATEGORIES)));
    setIsMgrEditMatrixModalOpen(true);
  };

  const handleMgrAddEditCategory = () => {
    const currentTotal = mgrEditCategories.reduce((sum, c) => sum + (Number(c.weightage) || 0), 0);
    const remaining = Math.max(0, 100 - currentTotal);
    const newCat: KPICategory = {
      id: `mgr_cat_${Date.now()}`,
      name: 'New Performance Metric',
      description: 'Define metric focus area',
      weightage: remaining,
      kpis: [
        {
          id: `mgr_kpi_${Date.now()}_1`,
          name: 'Metric Deliverable',
          description: 'Deliverable detail',
          targetScore: remaining,
          weightage: remaining,
          targetFromManager: '1',
          targetValue: 1,
          unit: 'units',
          scoringDirection: 'higher_is_better',
          measurementType: 'number',
          isRequired: true
        }
      ]
    };
    setMgrEditCategories(prev => [...prev, newCat]);
  };

  const handleMgrDeleteEditCategory = (catId: string) => {
    if (mgrEditCategories.length <= 1) {
      showAlert('At least one performance category is required.', 'Action Not Allowed');
      return;
    }
    setMgrEditCategories(prev => rebalanceCategoriesAfterDelete(prev, catId));
  };

  const handleMgrUpdateEditCategoryName = (catId: string, name: string) => {
    setMgrEditCategories(prev => prev.map(c => c.id === catId ? { ...c, name } : c));
  };

  const handleMgrUpdateEditCategoryWeight = (catId: string, weight: number) => {
    const newWeight = Math.max(0, Math.min(100, Number(weight) || 0));
    setMgrEditCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const count = c.kpis.length;
      if (count === 0) return { ...c, weightage: newWeight };

      const perKpi = Number((newWeight / count).toFixed(2));
      let remaining = newWeight;
      const updatedKpis = c.kpis.map((k, i) => {
        if (i === count - 1) {
          const finalScore = Number(remaining.toFixed(2));
          return { ...k, targetScore: finalScore, weightage: finalScore };
        }
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      return { ...c, weightage: newWeight, kpis: updatedKpis };
    }));
  };

  const handleMgrAutoBalanceEditCategory = (catId: string) => {
    setMgrEditCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const count = c.kpis.length;
      if (count === 0) return c;
      const catWeight = Number(c.weightage) || 0;
      const perKpi = Number((catWeight / count).toFixed(2));
      let remaining = catWeight;

      const updatedKpis = c.kpis.map((k, idx) => {
        if (idx === count - 1) {
          const finalScore = Number(remaining.toFixed(2));
          return { ...k, targetScore: finalScore, weightage: finalScore };
        }
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      return { ...c, kpis: updatedKpis };
    }));
  };

  const handleMgrAddEditKPI = (catId: string) => {
    setMgrEditCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const count = c.kpis.length + 1;
      const catWeight = Number(c.weightage) || 0;
      const perKpi = Number((catWeight / count).toFixed(2));
      let remaining = catWeight;

      const existingUpdated = c.kpis.map(k => {
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      const finalScore = Number(remaining.toFixed(2));
      const newKpi: KPIItem = {
        id: `mgr_kpi_${Date.now()}`,
        name: '',
        description: '',
        targetScore: finalScore,
        weightage: finalScore,
        targetFromManager: '1',
        targetValue: 1,
        unit: 'units',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      };

      return { ...c, kpis: [...existingUpdated, newKpi] };
    }));
  };

  const handleMgrDeleteEditKPI = (catId: string, kpiId: string) => {
    setMgrEditCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      if (c.kpis.length <= 1) {
        showAlert('A performance category must have at least one deliverable item.', 'Validation Error');
        return c;
      }
      const filtered = c.kpis.filter(k => k.id !== kpiId);
      const count = filtered.length;
      const catWeight = Number(c.weightage) || 0;
      const perKpi = Number((catWeight / count).toFixed(2));
      let remaining = catWeight;

      const updatedKpis = filtered.map((k, idx) => {
        if (idx === count - 1) {
          const finalScore = Number(remaining.toFixed(2));
          return { ...k, targetScore: finalScore, weightage: finalScore };
        }
        remaining -= perKpi;
        return { ...k, targetScore: perKpi, weightage: perKpi };
      });

      return { ...c, kpis: updatedKpis };
    }));
  };

  const handleMgrUpdateEditKPI = (catId: string, kpiId: string, field: keyof KPIItem, value: any) => {
    setMgrEditCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      return {
        ...c,
        kpis: c.kpis.map(k => {
          if (k.id !== kpiId) return k;
          return { ...k, [field]: value };
        })
      };
    }));
  };

  const mgrEditTotalWeightage = mgrEditCategories.reduce((sum, c) => sum + (Number(c.weightage) || 0), 0);
  const isMgrEditWeightageValid = mgrEditTotalWeightage === 100;
  const areAllMgrEditCategoriesBalanced = mgrEditCategories.every(cat => {
    const catSum = cat.kpis.reduce((sum, k) => sum + (Number(k.targetScore) || 0), 0);
    return Math.abs(catSum - Number(cat.weightage)) <= 0.05;
  });

  const handleMgrSaveMatrixChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mgrEditCycleId) return;

    if (isMatrixLocked) {
      showAlert(
        `This Deliverables Matrix cannot be edited because ${filledResponsesCount} team member(s) have already started or submitted their evaluations.`,
        'Matrix Locked',
        'warning'
      );
      return;
    }

    if (mgrEditTotalWeightage !== 100) {
      showAlert(`Total category weightage must equal exactly 100%. Currently it is ${mgrEditTotalWeightage}%.`, 'Weightage Mismatch');
      return;
    }

    for (const cat of mgrEditCategories) {
      const catSum = cat.kpis.reduce((s, k) => s + (Number(k.targetScore) || 0), 0);
      if (Math.abs(catSum - Number(cat.weightage)) > 0.05) {
        showAlert(`Category "${cat.name}" has Target Scores summing to ${catSum.toFixed(2)}%, but Category Weight is ${cat.weightage}%. Please click "Auto-Balance Targets" or adjust.`, 'Balance Required');
        return;
      }
    }

    setIsSavingMatrixEdit(true);
    try {
      // 1. Update the cycle categories & metadata
      const updatedCycles = cycles.map(c => {
        if (c.id === mgrEditCycleId) {
          return {
            ...c,
            name: mgrEditFormName || c.name,
            periodName: mgrEditPeriod || c.periodName,
            categories: mgrEditCategories,
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      });

      // 2. Update all unstarted responses for this cycle so their template matches new categories
      const updatedResponses = responses.map(r => {
        if (r.cycleId === mgrEditCycleId && (r.status === 'employee_in_progress' || (r.status as string) === 'Draft')) {
          const newKpiResponses: Record<string, KPIResponseItem> = {};
          mgrEditCategories.forEach(cat => {
            cat.kpis.forEach(kpi => {
              newKpiResponses[kpi.id] = {
                kpiId: kpi.id,
                actualValue: '',
                achievementPercentage: 0,
                earnedScore: 0,
                employeeRemarks: ''
              };
            });
          });
          return {
            ...r,
            kpiResponses: newKpiResponses,
            updatedAt: new Date().toISOString()
          };
        }
        return r;
      });

      await evaluationService.saveCycles(updatedCycles);
      evaluationService.saveResponsesLocal(updatedResponses);

      // Sync to backend Postgres
      try {
        const targetCycle = updatedCycles.find(c => c.id === mgrEditCycleId);
        if (targetCycle) {
          const token = localStorage.getItem('token') || '';
          await fetch(`${API_URL}/api/performance/kpi-evaluations/assign`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              form: targetCycle.name,
              team_id: targetCycle.teamId,
              team_name: targetCycle.teamName,
              periodName: targetCycle.periodName,
              reporting_manager: targetCycle.managerName,
              reporting_manager_id: targetCycle.managerId,
              categories: mgrEditCategories,
              employees: (targetCycle.employeeIds || []).map(empId => {
                const e = dbEmployees.find(emp => String(emp.employee_id) === String(empId));
                return {
                  id: String(e?.employee_id || empId),
                  employee_id: String(e?.employee_id || empId),
                  name: e ? `${e.first_name || ''} ${e.last_name || ''}`.trim() : `Employee ${empId}`
                };
              })
            })
          });
        }
      } catch (dbErr) {
        console.warn('Sync updated matrix to Postgres skipped:', dbErr);
      }

      setIsMgrEditMatrixModalOpen(false);
      await loadAllData();
      showToast('Performance Deliverables Matrix updated successfully!');
    } catch (err: any) {
      console.error('Error updating matrix:', err);
      showAlert('Failed to update matrix: ' + (err?.message || 'Unknown error'), 'Update Error', 'danger');
    } finally {
      setIsSavingMatrixEdit(false);
    }
  };

  const handleMgrDeleteMatrix = (targetCycle?: EvaluationCycle) => {
    const cycleToDelete = targetCycle || activeManagerCycle;
    if (!cycleToDelete) {
      showAlert('No deliverables matrix found to delete.', 'No Matrix Found');
      return;
    }

    const { isLocked, activeCount } = getCycleLockedInfo(cycleToDelete);
    if (isLocked) {
      showAlert(
        `This Deliverables Matrix cannot be deleted because ${activeCount} team member(s) have already started or submitted their self-evaluations. Deletion is disabled to protect score integrity and historical records.`,
        'Deliverables Matrix Locked',
        'warning'
      );
      return;
    }

    showConfirm(
      `Are you sure you want to delete the Deliverables Matrix for "${cycleToDelete.teamName || cycleToDelete.name || 'this team'}"?`,
      async () => {
        try {
          const targetCycleId = cycleToDelete.id;
          const targetTeamId = cycleToDelete.teamId;
          const targetTeamName = cycleToDelete.teamName;
          const targetForm = cycleToDelete.name || (cycleToDelete as any).form || '';
          const targetEmpIds = cycleToDelete.employeeIds || [];

          // Find all responses belonging to this cycle / team matrix
          const matchingResponses = responses.filter(r =>
            (targetCycleId && r.cycleId === targetCycleId) ||
            (targetTeamId && r.teamId === targetTeamId) ||
            (targetTeamName && (r.department || '').toLowerCase() === targetTeamName.toLowerCase()) ||
            (targetTeamName && (r.teamName || '').toLowerCase() === targetTeamName.toLowerCase()) ||
            (targetForm && (r.form === targetForm || (r as any).performance_metrics === targetForm))
          );

          const empIdsToDelete = Array.from(new Set([
            ...targetEmpIds,
            ...matchingResponses.map(r => String(r.employeeCode || r.employeeId || ''))
          ])).filter(Boolean);

          const responseIdsToDelete = matchingResponses.map(r => r.id).filter(Boolean);
          const dbIdsToDelete = matchingResponses.map(r => (r as any).db_id).filter(id => id != null && !isNaN(Number(id))).map(Number);

          // 1. Update local state immediately for instant feedback
          const updatedCycles = cycles.filter(c =>
            c.id !== targetCycleId &&
            !(targetTeamName && (c.teamName || '').toLowerCase() === targetTeamName.toLowerCase() && (c.name === targetForm || !targetForm))
          );
          const updatedResponses = responses.filter(r => !matchingResponses.some(mr => mr.id === r.id));

          setCycles(updatedCycles);
          setResponses(updatedResponses);
          evaluationService.saveCyclesLocal(updatedCycles);
          evaluationService.saveResponsesLocal(updatedResponses);

          // 2. Call backend delete endpoint with comprehensive context
          const token = localStorage.getItem('token') || '';
          const res = await fetch(`${API_URL}/api/performance/evaluation/cycles/${encodeURIComponent(targetCycleId)}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              cycleId: targetCycleId,
              employeeIds: empIdsToDelete,
              responseIds: responseIdsToDelete,
              dbIds: dbIdsToDelete,
              teamId: targetTeamId,
              teamName: targetTeamName,
              form: targetForm,
              periodName: cycleToDelete.periodName,
              startDate: cycleToDelete.startDate,
              endDate: cycleToDelete.endDate,
              frequency: cycleToDelete.frequency,
              managerId: cycleToDelete.managerId || userId
            })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with status ${res.status}`);
          }

          // 3. Reload authoritative fresh data from server
          await loadAllData();
          showToast('Performance Deliverables Matrix and unstarted evaluations removed from DB successfully.');
        } catch (err: any) {
          console.error('Error deleting matrix:', err);
          showAlert('Failed to delete matrix: ' + (err?.message || 'Unknown error'), 'Delete Error', 'danger');
        }
      },
      'Delete Deliverables Matrix',
      'danger',
      'Delete Matrix'
    );
  };

  const handleDeleteMgrResponseRow = (resp: EvaluationResponse) => {
    const statusStr = String(resp.status || '');
    const isCalibrated = resp.managerScore != null && statusStr !== 'manager_review' && statusStr !== 'Submitted to Manager';
    if (isCalibrated || resp.managerScore != null || statusStr === 'Calibrated & Approved' || statusStr === 'Published' || statusStr === 'Completed' || statusStr === 'Approved') {
      showToast('Published and calibrated evaluation records cannot be deleted.');
      return;
    }
    const { employeeName, employeeCode } = getEmployeeDisplayInfo(resp);
    showConfirm(
      `Are you sure you want to delete this evaluation record for ${employeeName || resp.employeeName} (${employeeCode || resp.employeeCode})?`,
      async () => {
        try {
          const respId = resp.id;
          const cleanEmpCode = String(employeeCode || resp.employeeCode || resp.employeeId || '').trim().toLowerCase();

          // 1. Remove from local state & cache immediately
          const updatedResponses = responses.filter(r => r.id !== respId);
          setResponses(updatedResponses);
          evaluationService.saveResponsesLocal(updatedResponses);

          const targetCycleId = resp.cycleId;
          const updatedCycles = cycles.map(c => {
            if (c.id === targetCycleId || (c.name === (resp as any).form && c.frequency === resp.frequency)) {
              const otherResps = updatedResponses.filter(r =>
                (r.cycleId === c.id || (r.frequency === c.frequency && (r as any).form === c.name)) &&
                String(r.employeeCode || r.employeeId || '').trim().toLowerCase() === cleanEmpCode
              );
              if (otherResps.length === 0) {
                return {
                  ...c,
                  employeeIds: (c.employeeIds || []).filter(id => String(id).trim().toLowerCase() !== cleanEmpCode)
                };
              }
            }
            return c;
          }).filter(c => (c.employeeIds || []).length > 0 || updatedResponses.some(r => r.cycleId === c.id));
          setCycles(updatedCycles);
          evaluationService.saveCyclesLocal(updatedCycles);

          // 2. Call backend delete with specific response ID & full metadata
          const token = localStorage.getItem('token') || '';
          const deleteUrl = `${API_URL}/api/performance/evaluation/responses/${encodeURIComponent(respId)}`;
          const res = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              respId,
              db_id: (resp as any).db_id,
              cycleId: resp.cycleId,
              employeeCode: employeeCode || resp.employeeCode || resp.employeeId,
              employeeId: resp.employeeId,
              form: (resp as any).form || (resp as any).performance_metrics,
              teamName: resp.teamName || resp.department,
              teamId: resp.teamId,
              startDate: resp.startDate || resp.fromDate || resp.from_date || '',
              endDate: resp.endDate || resp.toDate || resp.to_date || '',
              frequency: resp.frequency
            })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with status ${res.status}`);
          }

          await loadAllData();
          showToast(`Evaluation record deleted successfully.`);
        } catch (err: any) {
          console.error('Error deleting evaluation record:', err);
          showAlert('Failed to delete evaluation record: ' + (err?.message || 'Unknown error'), 'Delete Error', 'danger');
        }
      },
      'Delete Evaluation Record',
      'danger',
      'Delete'
    );
  };

  const userResponses = responses.filter(isResponseForUser);
  const anySubmittedUserResponse = userResponses.find(r =>
    r.status === 'manager_review' ||
    r.status === 'sm_final_approval' ||
    r.status === 'approved' ||
    (r.status as string) === 'Submitted to Manager' ||
    String(r.status).toLowerCase().includes('manager') ||
    String(r.status).toLowerCase().includes('approved') ||
    Boolean(r.employeeSubmittedAt)
  );

  const isEmpSubmitted = Boolean(
    activeEmpResponse ? (
      activeEmpResponse.status === 'manager_review' ||
      activeEmpResponse.status === 'sm_final_approval' ||
      activeEmpResponse.status === 'approved' ||
      (activeEmpResponse.status as string) === 'Submitted to Manager' ||
      String(activeEmpResponse.status).toLowerCase().includes('manager') ||
      String(activeEmpResponse.status).toLowerCase().includes('approved') ||
      Boolean(activeEmpResponse.employeeSubmittedAt)
    ) : false
  );

  // Robust helper to retrieve filled / submitted response item for any KPI
  const getKpiResponseItem = (kpi: any): KPIResponseItem | undefined => {
    if (!kpi) return undefined;

    const hasValue = (item: any) =>
      item && (
        (item.actualValue !== undefined && item.actualValue !== null && item.actualValue !== '') ||
        (item.employeeRemarks !== undefined && item.employeeRemarks !== null && item.employeeRemarks !== '') ||
        (item.isInsufficient !== undefined && item.isInsufficient !== null) ||
        (item.managerActualValue !== undefined && item.managerActualValue !== null && item.managerActualValue !== '') ||
        (item.managerScore !== undefined && item.managerScore !== null) ||
        (item.managerRemarks !== undefined && item.managerRemarks !== null && item.managerRemarks !== '') ||
        (item.earnedScore !== undefined && item.earnedScore !== null && Number(item.earnedScore) > 0)
      );

    // If submitted, activeEmpResponse is authoritative
    if (isEmpSubmitted && activeEmpResponse?.kpiResponses) {
      if (hasValue(activeEmpResponse.kpiResponses[kpi.id])) return activeEmpResponse.kpiResponses[kpi.id];
      if (kpi.name && hasValue(activeEmpResponse.kpiResponses[kpi.name])) return activeEmpResponse.kpiResponses[kpi.name];
    }

    // 1. Check kpiInputs with non-empty values
    if (kpiInputs && hasValue(kpiInputs[kpi.id])) return kpiInputs[kpi.id];
    if (kpiInputs && kpi.name && hasValue(kpiInputs[kpi.name])) return kpiInputs[kpi.name];

    // If not submitted, do NOT fall back to template dummy values
    if (!isEmpSubmitted) {
      // Check local draft storage if available
      try {
        const draft = localStorage.getItem(userDraftKey);
        if (draft) {
          const parsed = JSON.parse(draft);
          if (hasValue(parsed?.kpiInputs?.[kpi.id])) return parsed.kpiInputs[kpi.id];
          const cleanName = (kpi.name || '').trim().toLowerCase();
          if (cleanName && parsed?.kpiInputs) {
            for (const [k, v] of Object.entries(parsed.kpiInputs as Record<string, any>)) {
              if ((k.toLowerCase().trim() === cleanName || v?.name?.toLowerCase().trim() === cleanName) && hasValue(v)) {
                return v;
              }
            }
          }
        }
      } catch (e) { }

      if (kpiInputs && kpiInputs[kpi.id]) return kpiInputs[kpi.id];
      if (kpiInputs && kpi.name && kpiInputs[kpi.name]) return kpiInputs[kpi.name];
      return undefined;
    }

    // 2. Check activeEmpResponse with non-empty values (when submitted)
    if (activeEmpResponse?.kpiResponses && hasValue(activeEmpResponse.kpiResponses[kpi.id])) return activeEmpResponse.kpiResponses[kpi.id];
    if (activeEmpResponse?.kpiResponses && kpi.name && hasValue(activeEmpResponse.kpiResponses[kpi.name])) return activeEmpResponse.kpiResponses[kpi.name];

    // 3. Name-based search across sources with non-empty values
    const cleanName = (kpi.name || '').trim().toLowerCase();
    const sources = [activeEmpResponse?.kpiResponses, kpiInputs];

    for (const src of sources) {
      if (!src) continue;
      for (const [key, item] of Object.entries(src)) {
        if (!item || !hasValue(item)) continue;
        const itemKpiName = (item.name || (item as any).kpiName || key || '').trim().toLowerCase();
        if (cleanName && (itemKpiName === cleanName || key.toLowerCase().trim() === cleanName)) {
          return item;
        }
        if (item.kpiId && String(item.kpiId) === String(kpi.id)) {
          return item;
        }
      }
    }

    // 4. In-memory KPI object fallback (only for historical / submitted records)
    if (isEmpSubmitted && (kpi.actualValue !== undefined || kpi.actual_value !== undefined || kpi.earnedScore !== undefined || kpi.earned_score !== undefined)) {
      const v = kpi.actualValue !== undefined ? kpi.actualValue : (kpi.actual_value ?? '');
      if (v !== '' || kpi.employeeRemarks || kpi.employee_remarks || kpi.managerActualValue || kpi.manager_score) {
        const c = calculateKPIScore(kpi, v);
        return {
          kpiId: kpi.id,
          name: kpi.name,
          actualValue: v,
          achievementPercentage: c.achievementPercentage,
          earnedScore: c.earnedScore,
          employeeRemarks: kpi.employeeRemarks || kpi.employee_remarks || kpi.employee_remark || '',
          isInsufficient: kpi.isInsufficient ?? kpi.is_insufficient ?? false,
          managerActualValue: kpi.managerActualValue ?? kpi.manager_actual_pm,
          managerScore: kpi.managerScore ?? kpi.manager_score,
          managerRemarks: kpi.managerRemarks ?? kpi.manager_remark
        };
      }
    }

    // 5. Return existing item from activeEmpResponse even if empty (for submitted records)
    if (activeEmpResponse?.kpiResponses?.[kpi.id]) return activeEmpResponse.kpiResponses[kpi.id];
    if (activeEmpResponse?.kpiResponses && kpi.name && activeEmpResponse.kpiResponses[kpi.name]) return activeEmpResponse.kpiResponses[kpi.name];

    return undefined;
  };

  const liveEmployeeScore = useMemo(() => {
    let sum = 0;
    activeCategories.forEach(cat => {
      cat.kpis.forEach(k => {
        const item = getKpiResponseItem(k);
        const val = item?.actualValue ?? '';
        sum += calculateKPIScore(k, val).earnedScore;
      });
    });
    const finalScore = (isEmpSubmitted && activeEmpResponse?.employeeOverallScore !== undefined && activeEmpResponse.employeeOverallScore !== null)
      ? Number(activeEmpResponse.employeeOverallScore)
      : Number(sum.toFixed(2));
    return { overallScore: finalScore };
  }, [activeCategories, kpiInputs, activeEmpResponse?.kpiResponses, activeEmpResponse?.employeeOverallScore, isEmpSubmitted]);

  // Keep kpiInputs in sync with activeEmpResponse when loaded or refreshed
  const lastActiveRespIdRef = React.useRef<string>('');
  useEffect(() => {
    if (activeEmpResponse && isResponseForUser(activeEmpResponse)) {
      const isDifferentResp = lastActiveRespIdRef.current !== activeEmpResponse.id;
      lastActiveRespIdRef.current = activeEmpResponse.id;

      if (isYearlyResponse(activeEmpResponse)) {
        const curRecords = activeEmpResponse.monthly_records || [];
        const initialYearlyInputs: Record<number, Record<string, YearlyMonthKPIEntry>> = {};
        const initialYearlyRemarks: Record<number, string> = {};
        curRecords.forEach(rec => {
          initialYearlyInputs[rec.monthIndex] = rec.kpiEntries || {};
          initialYearlyRemarks[rec.monthIndex] = rec.employeeRemarks || '';
        });
        setYearlyMonthKpiInputs(initialYearlyInputs);
        setYearlyMonthRemarks(initialYearlyRemarks);

        if (isDifferentResp) {
          const activeActionableMonth = FISCAL_MONTHS.slice(5).find(m => {
            const lockInfo = getYearlyMonthLockInfo(m.monthIndex, curRecords);
            return lockInfo.isEditable || lockInfo.isSubmitted;
          }) || FISCAL_MONTHS.find(m => m.monthIndex === 6);

          setActiveYearlyFiscalMonth(activeActionableMonth ? activeActionableMonth.monthIndex : 6);
        }
      }

      if (isEmpSubmitted) {
        setKpiInputs(activeEmpResponse.kpiResponses || {});
        setEmpRemarks(activeEmpResponse.employeeRemarks || '');
      } else if (isDifferentResp) {
        // Fresh or unsubmitted response: only restore if user explicitly has a saved local draft
        try {
          const draft = localStorage.getItem(userDraftKey);
          if (draft) {
            const parsed = JSON.parse(draft);
            if (parsed?.kpiInputs && Object.keys(parsed.kpiInputs).length > 0) {
              setKpiInputs(parsed.kpiInputs);
              setEmpRemarks(parsed.empRemarks || '');
              return;
            }
          }
        } catch (e) { }
        // Clean start without any auto-fill
        setKpiInputs({});
        setEmpRemarks('');
      }
    } else if (!activeEmpResponse) {
      setKpiInputs({});
      setEmpRemarks('');
    }
  }, [activeEmpResponse?.id, activeEmpResponse?.status, activeEmpResponse?.updatedAt, activeEmpResponse?.managerReviewedAt, isEmpSubmitted]);

  // 3. Employee Input Change & Live Recalculation
  const handleKPIChange = (kpi: any, val: string | number) => {
    if (isEmpSubmitted) return;
    let cleanVal: string | number = '';

    if (val !== '' && val !== undefined && val !== null) {
      // Only allow whole integer numbers (disallow decimal values)
      const num = typeof val === 'number' ? Math.floor(val) : parseInt(String(val), 10);
      if (!isNaN(num)) {
        cleanVal = num < 0 ? 0 : num;
      }
    }

    const calc = calculateKPIScore(kpi, cleanVal);
    setKpiInputs(prev => {
      const itemData: KPIResponseItem = {
        kpiId: kpi.id,
        name: kpi.name,
        actualValue: cleanVal,
        achievementPercentage: calc.achievementPercentage,
        earnedScore: calc.earnedScore,
        employeeRemarks: prev[kpi.id]?.employeeRemarks || (kpi.name ? prev[kpi.name]?.employeeRemarks : '') || '',
        isInsufficient: prev[kpi.id]?.isInsufficient ?? (kpi.name ? prev[kpi.name]?.isInsufficient : false)
      };

      const updated: Record<string, KPIResponseItem> = {
        ...prev,
        [kpi.id]: itemData
      };
      if (kpi.name) {
        updated[kpi.name] = itemData;
      }

      const targetId = selectedResponseId || activeEmpResponse?.id;
      // Instantly persist in local responses cache
      if (targetId) {
        setResponses(prevResponses => {
          const nextResponses = prevResponses.map(r =>
            r.id === targetId
              ? { ...r, kpiResponses: updated }
              : r
          );
          evaluationService.saveResponsesLocal(nextResponses);
          return nextResponses;
        });
      }

      try {
        localStorage.setItem(userDraftKey, JSON.stringify({ kpiInputs: updated, empRemarks, timestamp: Date.now() }));
      } catch (e) { }

      return updated;
    });
  };

  const handleKPIRemarksChange = (kpi: any, remarks: string) => {
    if (isEmpSubmitted) return;
    const kpiId = typeof kpi === 'string' ? kpi : kpi.id;
    const kpiName = typeof kpi === 'object' ? kpi.name : '';

    setKpiInputs(prev => {
      const current = prev[kpiId] || (kpiName ? prev[kpiName] : null) || {
        kpiId,
        name: kpiName,
        actualValue: '',
        achievementPercentage: 0,
        earnedScore: 0,
        employeeRemarks: ''
      };
      const updatedItem: KPIResponseItem = {
        ...current,
        employeeRemarks: remarks
      };
      const updated: Record<string, KPIResponseItem> = {
        ...prev,
        [kpiId]: updatedItem
      };
      if (kpiName) {
        updated[kpiName] = updatedItem;
      }

      const targetId = selectedResponseId || activeEmpResponse?.id;
      // Instantly persist in local responses cache
      if (targetId) {
        setResponses(prevResponses => {
          const nextResponses = prevResponses.map(r =>
            r.id === targetId
              ? { ...r, kpiResponses: updated }
              : r
          );
          evaluationService.saveResponsesLocal(nextResponses);
          return nextResponses;
        });
      }

      try {
        localStorage.setItem(userDraftKey, JSON.stringify({ kpiInputs: updated, empRemarks, timestamp: Date.now() }));
      } catch (e) { }

      return updated;
    });
  };

  const handleKPIToggleInsufficient = (kpi: any, isInsufficient: boolean) => {
    if (isEmpSubmitted) return;
    const kpiId = typeof kpi === 'string' ? kpi : kpi.id;
    const kpiName = typeof kpi === 'object' ? kpi.name : '';

    setKpiInputs(prev => {
      const current = prev[kpiId] || (kpiName ? prev[kpiName] : null) || {
        kpiId,
        name: kpiName,
        actualValue: '',
        achievementPercentage: 0,
        earnedScore: 0,
        employeeRemarks: ''
      };
      const updatedItem: KPIResponseItem = {
        ...current,
        isInsufficient
      };
      const updated: Record<string, KPIResponseItem> = {
        ...prev,
        [kpiId]: updatedItem
      };
      if (kpiName) {
        updated[kpiName] = updatedItem;
      }

      const targetId = selectedResponseId || activeEmpResponse?.id;
      if (targetId) {
        setResponses(prevResponses => {
          const nextResponses = prevResponses.map(r =>
            r.id === targetId
              ? { ...r, kpiResponses: updated }
              : r
          );
          evaluationService.saveResponsesLocal(nextResponses);
          return nextResponses;
        });
      }

      try {
        localStorage.setItem(userDraftKey, JSON.stringify({ kpiInputs: updated, empRemarks, timestamp: Date.now() }));
      } catch (e) { }

      return updated;
    });
  };

  const handleToggleAllCategoryInsufficient = (kpis: any[], isInsufficient: boolean) => {
    if (isEmpSubmitted) return;
    setKpiInputs(prev => {
      const updated = { ...prev };
      kpis.forEach(k => {
        const current = updated[k.id] || (k.name ? updated[k.name] : null) || {
          kpiId: k.id,
          name: k.name,
          actualValue: '',
          achievementPercentage: 0,
          earnedScore: 0,
          employeeRemarks: ''
        };
        const updatedItem = { ...current, isInsufficient };
        updated[k.id] = updatedItem;
        if (k.name) updated[k.name] = updatedItem;
      });

      const targetId = selectedResponseId || activeEmpResponse?.id;
      if (targetId) {
        setResponses(prevResponses => {
          const nextResponses = prevResponses.map(r =>
            r.id === targetId
              ? { ...r, kpiResponses: updated }
              : r
          );
          evaluationService.saveResponsesLocal(nextResponses);
          return nextResponses;
        });
      }

      try {
        localStorage.setItem(userDraftKey, JSON.stringify({ kpiInputs: updated, empRemarks, timestamp: Date.now() }));
      } catch (e) { }

      return updated;
    });
  };

  // Selected manager review response object & cycle
  const selectedMgrResponse = responses.find(r => r.id === selectedMgrResponseId);
  const selectedMgrCycle = selectedMgrResponse ? cycles.find(c => c.id === selectedMgrResponse.cycleId) : activeManagerCycle;

  // Resolve all assigned categories and deliverables for manager review
  const selectedMgrCategories: KPICategory[] = useMemo(() => {
    if (!selectedMgrResponse) return activeManagerCycle?.categories || managerTeamCategories;
    if ((selectedMgrResponse as any).categories && Array.isArray((selectedMgrResponse as any).categories) && (selectedMgrResponse as any).categories.length > 0) {
      return (selectedMgrResponse as any).categories;
    }
    if ((selectedMgrResponse as any).metrics_data && Array.isArray((selectedMgrResponse as any).metrics_data) && (selectedMgrResponse as any).metrics_data.length > 0) {
      return (selectedMgrResponse as any).metrics_data;
    }
    // If metrics_data or kpiResponses is a dictionary of KPIs, wrap them into a category
    const mData = (selectedMgrResponse as any).metrics_data || selectedMgrResponse.kpiResponses;
    if (mData && typeof mData === 'object' && !Array.isArray(mData)) {
      const kpisList: KPIItem[] = [];
      const seenIds = new Set<string>();
      Object.entries(mData).forEach(([key, val]: [string, any]) => {
        if (!val || typeof val !== 'object') return;
        const kId = val.kpiId || val.id || key;
        if (seenIds.has(kId)) return;
        seenIds.add(kId);
        kpisList.push({
          id: kId,
          name: val.name || key,
          description: val.description || '',
          targetScore: val.targetScore || 100,
          weightage: val.weightage || 100,
          targetFromManager: val.targetFromManager || val.targetValue || '100%',
          targetValue: val.targetValue || 100,
          unit: val.unit || '%',
          scoringDirection: (val.scoringDirection || 'higher_is_better') as any,
          measurementType: (val.measurementType || 'numerical') as any,
          isRequired: true
        });
      });
      if (kpisList.length > 0) {
        return [{
          id: 'cat_deliverables',
          name: (selectedMgrResponse as any).form || selectedMgrResponse.periodName || 'Performance Deliverables',
          description: 'Deliverables evaluation items',
          weightage: 100,
          kpis: kpisList
        }];
      }
    }
    if (selectedMgrCycle?.categories && selectedMgrCycle.categories.length > 0) {
      return selectedMgrCycle.categories;
    }
    return (managerTeamCategories && managerTeamCategories.length > 0) ? managerTeamCategories : DEFAULT_KPI_CATEGORIES;
  }, [selectedMgrResponse, selectedMgrCycle, managerTeamCategories, activeManagerCycle]);

  // Helper to determine if an evaluation response is a Yearly / Annual evaluation
  const isYearlyResponse = (r?: EvaluationResponse | null): boolean => {
    if (!r) return false;
    if (r.monthly_records && r.monthly_records.length > 0) return true;
    const respCycle = cycles.find(c => c.id === r.cycleId);
    const f = String(r.frequency || (r as any).periodType || (respCycle as any)?.frequency || '').toLowerCase();
    if (f === 'yearly' || f === 'annual') return true;
    if (f && f !== 'yearly' && f !== 'annual') return false;
    const p = `${r.periodName || ''} ${(r as any).form || ''} ${(r as any).description || ''} ${respCycle?.name || ''} ${respCycle?.periodName || ''}`.toLowerCase();
    return p.includes('annual') || p.includes('yearly') || p.includes('year') || p.includes('fy 20') || p.includes('fy20') || p.includes('financial year');
  };

  /**
   * Evaluates sequential month lock status for 12-Month Financial Year cycle:
   * - Current calendar month (e.g., September) is the ongoing milestone and is OPEN by default for deliverables entry.
   * - Future months (e.g. October..March) are strictly LOCKED until the preceding month (e.g. September) is completed AND approved by the Manager (status === 'manager_approved').
   * - Once Manager approves Month N, Month N+1 automatically unlocks for employee deliverables entry.
   */
  const getYearlyMonthLockInfo = (
    monthIndex: number,
    monthlyRecords: YearlyMonthRecord[] = []
  ) => {
    const currentCalMonth = new Date().getMonth() + 1; // 1-12
    const currentFiscalMonthIndex = currentCalMonth >= 4 ? currentCalMonth - 3 : currentCalMonth + 9;

    const currentMonthObj = FISCAL_MONTHS.find(m => m.monthIndex === monthIndex);
    const currentMonthName = currentMonthObj ? currentMonthObj.monthName : `Month ${monthIndex}`;
    const curRec = monthlyRecords.find(m => m.monthIndex === monthIndex);

    const isApproved = curRec?.status === 'manager_approved';
    const isSubmitted = curRec?.status === 'submitted_to_manager';
    const score = isApproved && curRec?.managerScore != null ? Number(curRec.managerScore) : null;

    const prevMonthObj = FISCAL_MONTHS.find(m => m.monthIndex === monthIndex - 1);
    const prevMonthName = prevMonthObj ? prevMonthObj.monthName : `Month ${monthIndex - 1}`;
    const prevRec = monthlyRecords.find(m => m.monthIndex === monthIndex - 1);
    const isPrevApproved = prevRec?.status === 'manager_approved';

    // 1. If this month is already approved by manager
    if (isApproved) {
      return {
        isLocked: false,
        isApproved: true,
        isSubmitted: false,
        isEditable: false,
        status: 'manager_approved' as const,
        statusLabel: 'Approved',
        currentMonthName,
        prevMonthName,
        score
      };
    }

    // 2. If this month is submitted and under manager review
    if (isSubmitted) {
      return {
        isLocked: false,
        isApproved: false,
        isSubmitted: true,
        isEditable: false,
        status: 'submitted_to_manager' as const,
        statusLabel: 'Submitted for Review',
        currentMonthName,
        prevMonthName,
        score: null
      };
    }

    // 3. Past Months prior to September rollout (Months 1-5: April - August):
    // Prior unapplied period before system rollout — does not block September or future evaluation.
    if (monthIndex < 6) {
      return {
        isLocked: false,
        isApproved: false,
        isSubmitted: false,
        isEditable: true,
        status: 'pending_employee' as const,
        statusLabel: 'Past Period',
        prevMonthName,
        currentMonthName,
        score: null
      };
    }

    // 4. Base Rollout Month: September (MonthIndex 6):
    // Active baseline month — OPEN by default for deliverables entry.
    if (monthIndex === 6) {
      return {
        isLocked: false,
        isApproved: false,
        isSubmitted: false,
        isEditable: true,
        status: 'pending_employee' as const,
        statusLabel: 'Open for Deliverables',
        prevMonthName,
        currentMonthName,
        score: null
      };
    }

    // 5. September Onwards (October, November, December, etc. - MonthIndex >= 7):
    // Strict Sequential Lock: If previous month (e.g. September) is pending / not approved,
    // subsequent month (e.g. October) will strictly NOT open and stays LOCKED!
    if (!isPrevApproved) {
      const isPrevSubmitted = prevRec?.status === 'submitted_to_manager';
      const lockReason = isPrevSubmitted
        ? `Waiting for Manager to review and approve your ${prevMonthName} milestone before ${currentMonthName} unlocks.`
        : `${currentMonthName} is locked. Please complete and submit your ${prevMonthName} milestone first. ${currentMonthName} will unlock once ${prevMonthName} is approved by your Manager.`;

      return {
        isLocked: true,
        isApproved: false,
        isSubmitted: false,
        isEditable: false,
        status: 'locked' as const,
        statusLabel: 'Locked',
        lockReason,
        prevMonthName,
        currentMonthName,
        score: null
      };
    }

    // Previous month has been approved by manager -> Next month unlocks and opens!
    return {
      isLocked: false,
      isApproved: false,
      isSubmitted: false,
      isEditable: true,
      status: 'pending_employee' as const,
      statusLabel: 'Open Milestone',
      prevMonthName,
      currentMonthName,
      score: null
    };
  };

  const handleYearlyMonthKpiChange = (kpi: any, val: string | number) => {
    const kpiId = typeof kpi === 'string' ? kpi : kpi.id;
    const kpiName = typeof kpi === 'object' ? kpi.name : '';
    setYearlyMonthKpiInputs(prev => {
      const monthInputs: Record<string, YearlyMonthKPIEntry> = prev[activeYearlyFiscalMonth] || {};
      const current = monthInputs[kpiId] || (kpiName ? monthInputs[kpiName] : null) || {};
      const calc = calculateKPIScore(kpi, val);
      const updatedItem: YearlyMonthKPIEntry = {
        ...current,
        actualValue: val,
        actual_value: val,
        earnedScore: calc.earnedScore,
        earned_score: calc.earnedScore
      };
      const nextMonthInputs: Record<string, YearlyMonthKPIEntry> = {
        ...monthInputs,
        [kpiId]: updatedItem
      };
      if (kpiName) nextMonthInputs[kpiName] = updatedItem;
      return {
        ...prev,
        [activeYearlyFiscalMonth]: nextMonthInputs
      };
    });
  };

  const handleYearlyMonthKpiRemarkChange = (kpi: any, remarks: string) => {
    const kpiId = typeof kpi === 'string' ? kpi : kpi.id;
    const kpiName = typeof kpi === 'object' ? kpi.name : '';
    setYearlyMonthKpiInputs(prev => {
      const monthInputs: Record<string, YearlyMonthKPIEntry> = prev[activeYearlyFiscalMonth] || {};
      const current = monthInputs[kpiId] || (kpiName ? monthInputs[kpiName] : null) || {};
      const updatedItem: YearlyMonthKPIEntry = {
        ...current,
        employeeRemarks: remarks,
        employee_remark: remarks
      };
      const nextMonthInputs: Record<string, YearlyMonthKPIEntry> = {
        ...monthInputs,
        [kpiId]: updatedItem
      };
      if (kpiName) nextMonthInputs[kpiName] = updatedItem;
      return {
        ...prev,
        [activeYearlyFiscalMonth]: nextMonthInputs
      };
    });
  };

  const handleYearlyMonthKpiInsufficient = (kpi: any, isInsufficient: boolean) => {
    const kpiId = typeof kpi === 'string' ? kpi : kpi.id;
    const kpiName = typeof kpi === 'object' ? kpi.name : '';
    setYearlyMonthKpiInputs(prev => {
      const monthInputs: Record<string, YearlyMonthKPIEntry> = prev[activeYearlyFiscalMonth] || {};
      const current = monthInputs[kpiId] || (kpiName ? monthInputs[kpiName] : null) || {};
      const updatedItem: YearlyMonthKPIEntry = {
        ...current,
        isInsufficient
      };
      const nextMonthInputs: Record<string, YearlyMonthKPIEntry> = {
        ...monthInputs,
        [kpiId]: updatedItem
      };
      if (kpiName) nextMonthInputs[kpiName] = updatedItem;
      return {
        ...prev,
        [activeYearlyFiscalMonth]: nextMonthInputs
      };
    });
  };

  const handleYearlyMonthSubmit = async (mIndex: number) => {
    if (!activeEmpResponse) return;
    const lockInfo = getYearlyMonthLockInfo(mIndex, activeEmpResponse.monthly_records || []);
    if (lockInfo.isLocked) {
      showAlert(lockInfo.lockReason || `Month ${mIndex} is locked until the previous month is approved by Manager.`, 'Milestone Locked', 'warning');
      return;
    }
    if (lockInfo.isApproved) {
      showAlert(`Deliverables for ${lockInfo.currentMonthName} have already been approved by your Manager.`, 'Already Approved');
      return;
    }
    if (lockInfo.isSubmitted) {
      showAlert(`Deliverables for ${lockInfo.currentMonthName} have already been submitted to your Manager for review.`, 'Already Submitted');
      return;
    }
    if (isSubmittingEmp) return;
    const targetMonthRecord = (activeEmpResponse.monthly_records || []).find(m => m.monthIndex === mIndex);
    const currentMonthEntries = yearlyMonthKpiInputs[mIndex] || targetMonthRecord?.kpiEntries || {};
    const missingRemarksKpi: string[] = [];
    const payloadEntries: Record<string, YearlyMonthKPIEntry> = {};

    activeCategories.forEach(cat => {
      cat.kpis.forEach(k => {
        const entry = currentMonthEntries[k.id] || (k.name ? currentMonthEntries[k.name] : null);
        const val = entry?.actualValue !== undefined && entry?.actualValue !== null ? entry.actualValue : (entry?.actual_value ?? '');
        const rem = (entry?.employeeRemarks || entry?.employee_remark || '').trim();
        const isInsufficient = Boolean(entry?.isInsufficient ?? (k as any)?.isInsufficient);

        const isMandatory = isKpiRemarkMandatory(k, val, isInsufficient);
        if (isMandatory && !rem) {
          missingRemarksKpi.push(`"${k.name}"`);
        }

        const calc = calculateKPIScore(k, val);
        payloadEntries[k.id] = {
          actualValue: val,
          actual_value: val,
          earnedScore: calc.earnedScore,
          earned_score: calc.earnedScore,
          employeeRemarks: rem,
          employee_remark: rem,
          isInsufficient
        };
        if (k.name) {
          payloadEntries[k.name] = payloadEntries[k.id];
        }
      });
    });

    if (missingRemarksKpi.length > 0) {
      showAlert(
        `Remarks are mandatory for deliverables that are higher/lower than target or selected. Please provide remarks for: ${missingRemarksKpi.join(', ')}`,
        'Remarks Required',
        'warning'
      );
      return;
    }

    const monthObj = FISCAL_MONTHS.find(m => m.monthIndex === mIndex);
    const monthName = monthObj ? monthObj.monthName : `Month ${mIndex}`;
    const remarks = yearlyMonthRemarks[mIndex] || `${monthName} Monthly Progress Actuals`;

    showConfirm(
      `Submit ${monthName} deliverables to your Manager for review and scoring?`,
      async () => {
        try {
          setIsSubmittingEmp(true);
          const updatedResp = await evaluationService.submitYearlyMonthActuals(
            activeEmpResponse.id,
            mIndex,
            payloadEntries,
            remarks
          );
          setResponses(prev => prev.map(r => r.id === updatedResp.id ? updatedResp : r));
          setSelectedResponseId(updatedResp.id);
          await loadAllData();
          showToast(`${monthName} deliverables successfully submitted to Manager!`);
        } catch (err: any) {
          showAlert(`Failed to submit monthly actuals: ${err?.message || 'Unknown error'}`, 'Submission Error');
        } finally {
          setIsSubmittingEmp(false);
        }
      },
      `Submit ${monthName} Milestone`,
      'info',
      'Submit to Manager'
    );
  };

  const switchMgrYearlyMonth = (mIndex: number) => {
    setActiveMgrYearlyFiscalMonth(mIndex);
    if (!selectedMgrResponse) return;
    const curMonthRec = (selectedMgrResponse.monthly_records || []).find(m => m.monthIndex === mIndex);
    const nextActuals: Record<string, string | number> = {};
    const nextRemarks: Record<string, string> = {};

    selectedMgrCategories.forEach(cat => {
      cat.kpis.forEach(kpi => {
        const entry = curMonthRec?.kpiEntries?.[kpi.id] || (kpi.name ? curMonthRec?.kpiEntries?.[kpi.name] : null);
        const empActual = entry?.actualValue ?? entry?.actual_value ?? '';
        const mgrActual = entry?.managerActualValue ?? entry?.manager_actual_pm ?? empActual;
        nextActuals[kpi.id] = mgrActual;
        nextRemarks[kpi.id] = entry?.managerRemarks ?? entry?.manager_remark ?? '';
      });
    });

    setMgrKpiActuals(nextActuals);
    setMgrKpiRemarks(nextRemarks);

    let totalScore = 0;
    selectedMgrCategories.forEach(cat => {
      cat.kpis.forEach(kpi => {
        const actualVal = nextActuals[kpi.id];
        const calc = calculateKPIScore(kpi, actualVal);
        totalScore += calc.earnedScore;
      });
    });
    setMgrScore(Number(totalScore.toFixed(2)));
    setMgrRemarks(curMonthRec?.managerRemarks || '');
  };

  const handleManagerYearlyMonthApprove = async (mIndex: number) => {
    if (!selectedMgrResponseId || !selectedMgrResponse) return;
    const monthObj = FISCAL_MONTHS.find(m => m.monthIndex === mIndex);
    const monthName = monthObj ? monthObj.monthName : `Month ${mIndex}`;

    const curMonthRec = (selectedMgrResponse.monthly_records || []).find(m => m.monthIndex === mIndex);
    const payloadEntries: Record<string, YearlyMonthKPIEntry> = {};

    selectedMgrCategories.forEach(cat => {
      cat.kpis.forEach(kpi => {
        const respEntry = curMonthRec?.kpiEntries?.[kpi.id] || (kpi.name ? curMonthRec?.kpiEntries?.[kpi.name] : null);
        const empActual = respEntry?.actualValue ?? respEntry?.actual_value ?? '';
        const mgrActual = mgrKpiActuals[kpi.id] !== undefined ? mgrKpiActuals[kpi.id] : empActual;
        const calc = calculateKPIScore(kpi, mgrActual);
        payloadEntries[kpi.id] = {
          actualValue: empActual,
          actual_value: empActual,
          managerActualValue: mgrActual,
          manager_actual_pm: mgrActual,
          managerScore: Number(calc.earnedScore.toFixed(2)),
          manager_score: Number(calc.earnedScore.toFixed(2)),
          managerRemarks: mgrKpiRemarks[kpi.id] || '',
          manager_remark: mgrKpiRemarks[kpi.id] || ''
        };
        if (kpi.name) {
          payloadEntries[kpi.name] = payloadEntries[kpi.id];
        }
      });
    });

    showConfirm(
      `Approve ${monthName} performance score and update Year-to-Date rolling average?`,
      async () => {
        try {
          const updatedResp = await evaluationService.approveYearlyMonthScore(
            selectedMgrResponse.id,
            mIndex,
            payloadEntries,
            mgrRemarks
          );
          setResponses(prev => prev.map(r => r.id === updatedResp.id ? updatedResp : r));
          await loadAllData();
          showToast(`${monthName} milestone score approved successfully!`);
          setSelectedMgrResponseId('');
        } catch (err: any) {
          showAlert(`Failed to approve month milestone: ${err?.message || 'Unknown error'}`, 'Approval Error');
        }
      },
      `Approve ${monthName} Milestone`,
      'info',
      'Approve & Save Milestone'
    );
  };

  // Helper to resolve canonical display info for any evaluation response
  const getEmployeeDisplayInfo = (r: EvaluationResponse) => {
    const cleanId = (v: any) => String(v || '').trim().toLowerCase().replace(/^emp-?/i, '');
    const rId = cleanId(r.employeeId);
    const rCode = cleanId(r.employeeCode);
    const rName = (r.employeeName || '').trim().toLowerCase();

    const empInDb = dbEmployees.find((e: any) => {
      const eCode = cleanId(e.employee_id);

      if (eCode && (eCode === rCode || eCode === rId)) return true;

      const eFullName = `${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase();
      if (eFullName && rName && (
        eFullName === rName ||
        eFullName.replace(/\s*\(\w+\)\s*$/, '').trim() === rName.replace(/\s*\(\w+\)\s*$/, '').trim()
      )) {
        return true;
      }
      return false;
    });

    const employeeCode = empInDb?.employee_id || r.employeeCode || r.employeeId || '';
    const employeeName = empInDb ? `${empInDb.first_name || ''} ${empInDb.last_name || ''}`.trim() : (r.employeeName || (employeeCode ? `Employee #${employeeCode}` : 'Employee'));

    // Match team in dbTeams table by team_id, name, or employee team
    const matchingTeam = dbTeams.find(t =>
      (empInDb?.team_id && String(t.id) === String(empInDb.team_id)) ||
      (empInDb?.team && t.name?.toLowerCase() === empInDb.team.toLowerCase()) ||
      (r.teamId && (String(t.id) === String(r.teamId) || t.name?.toLowerCase() === String(r.teamId).toLowerCase())) ||
      (Boolean((r as any).teamName) && t.name?.toLowerCase() === String((r as any).teamName).toLowerCase())
    );

    // Exact canonical department & team resolution strictly from PostgreSQL DB
    const dbDept = (empInDb?.department || matchingTeam?.department || '').trim();
    const dbTeam = (empInDb?.team || matchingTeam?.name || '').trim();
    const respDept = (r.department || '').trim();
    const respTeam = (r.teamId || '').trim();

    const departmentName = dbDept || (respDept && respDept !== 'all_teams' && !respDept.includes(',') ? respDept : '') || effectiveTeamName || dbTeam || 'Department';
    const teamName = dbTeam || (respTeam && respTeam !== 'all_teams' && !respTeam.includes(',') ? respTeam : '') || (respDept && respDept !== departmentName ? respDept : '') || departmentName || 'Team';

    const designation = (empInDb?.designation || (r as any).designation || empInDb?.job_title || (r as any).role || '').trim();

    const profileImage = empInDb?.profile_image
      ? getProfileImageUrl(empInDb.profile_image, empInDb.employee_id)
      : null;

    return { employeeCode, employeeName, teamName, departmentName, designation, empInDb, profileImage };
  };

  // Helper to render distinct status badges across all lifecycle stages
  const renderStatusBadge = (status: string, r?: EvaluationResponse) => {
    const s = String(status || '').toLowerCase().replace(/[_\s]+/g, ' ').trim();

    if (r && isYearlyResponse(r)) {
      const monthlyRecords = r.monthly_records || [];
      const approvedCount = monthlyRecords.filter(m => m.status === 'manager_approved').length;
      const submittedCount = monthlyRecords.filter(m => m.status === 'submitted_to_manager').length;
      if (submittedCount > 0) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <span>Milestone Submitted ({approvedCount}/12 Approved)</span>
          </span>
        );
      }
      if (approvedCount === 12) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>FY Completed & Calibrated</span>
          </span>
        );
      }
      if (approvedCount > 0) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-200/80 shadow-2xs shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
            <span>YTD Active ({approvedCount}/12 Approved)</span>
          </span>
        );
      }
    }

    if (s.includes('approved') || s.includes('calibrated') || s === 'completed' || s === 'sm final approval') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Calibrated & Approved</span>
        </span>
      );
    }
    if (s.includes('service') || s.includes('sm')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          <span>SM Approved</span>
        </span>
      );
    }
    if (
      s.includes('manager') ||
      s.includes('submitted') ||
      s.includes('review') ||
      s === 'with_manager' ||
      s === 'assigned to manager' ||
      (r && (Boolean(r.employeeSubmittedAt) || Boolean((r as any).submitted_at)))
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
          <span>Assigned to Manager</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
        <span>Assigned to Employee</span>
      </span>
    );
  };

  // Deduplicate all manager team responses across all departments (unfiltered)
  const allDeduplicatedManagerResponses = useMemo(() => {
    const map = new Map<string, EvaluationResponse>();

    managerTeamResponses.forEach(r => {
      const { employeeCode, employeeName, empInDb } = getEmployeeDisplayInfo(r);
      // Filter out orphan/ghost responses with no name
      if (!empInDb && !employeeName) return;

      // Filter out logged in user's own response
      if (isResponseForUser(r)) return;

      // Distinct key per employee and evaluation record (so multiple assigned metrics in different periods appear distinctly, but duplicates of the exact record are merged)
      const rawPeriod = (r.periodName || (r as any).form || '').trim().toLowerCase();
      let canonicalPeriod = rawPeriod;
      if (rawPeriod.includes('(') && rawPeriod.includes(')')) {
        const parts = rawPeriod.split('(');
        canonicalPeriod = parts[parts.length - 1].replace(')', '').trim();
      }
      const key = `${String(employeeCode).trim().toLowerCase()}_${r.id}_${canonicalPeriod}`;
      const existing = map.get(key);
      const normalizedResponse: EvaluationResponse = {
        ...r,
        employeeCode,
        employeeName: employeeName || r.employeeName
      };

      if (!existing) {
        map.set(key, normalizedResponse);
      } else {
        const hasMgr = (resp: any) => Boolean((resp as any).reporting_manager || (resp as any).managerName || (resp as any).manager_name);
        const hasCats = (resp: any) => Boolean((resp as any).categories?.length > 0 || (resp as any).metrics_data?.length > 0);
        const isDb = (resp: any) => String(resp.id || '').startsWith('resp_') && /\d+/.test(String(resp.id || ''));

        if (hasMgr(r) && !hasMgr(existing)) {
          map.set(key, normalizedResponse);
        } else if (hasCats(r) && !hasCats(existing)) {
          map.set(key, normalizedResponse);
        } else if (isDb(r) && !isDb(existing)) {
          map.set(key, normalizedResponse);
        } else if (!isDb(r) && isDb(existing)) {
          // Keep existing DB record
        } else {
          // Prioritize pending reviews requiring manager attention
          const rPending = (r.status as string) === 'manager_review' || (r.status as string) === 'Submitted to Manager' || r.managerScore == null;
          const exPending = (existing.status as string) === 'manager_review' || (existing.status as string) === 'Submitted to Manager' || existing.managerScore == null;
          if (rPending && !exPending) {
            map.set(key, normalizedResponse);
          } else if (
            r.status === 'approved' ||
            r.status === 'sm_final_approval' ||
            (r.employeeOverallScore > 0 && existing.employeeOverallScore === 0)
          ) {
            map.set(key, normalizedResponse);
          } else {
            const numA = parseInt(String(r.id || '').replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(String(existing.id || '').replace(/\D/g, ''), 10) || 0;
            if (numA > numB) {
              map.set(key, normalizedResponse);
            }
          }
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      // 1. Pending reviews (needing manager attention) ALWAYS sort to the top!
      const aPending = (a.status as string) === 'manager_review' || (a.status as string) === 'Submitted to Manager' || a.managerScore == null;
      const bPending = (b.status as string) === 'manager_review' || (b.status as string) === 'Submitted to Manager' || b.managerScore == null;
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;

      // 2. Sort by ID descending (newest first e.g. resp_12 before resp_11)
      const numA = parseInt(String(a.id || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.id || '').replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numB - numA;

      const infoA = getEmployeeDisplayInfo(a);
      const infoB = getEmployeeDisplayInfo(b);
      const teamComp = infoA.teamName.localeCompare(infoB.teamName);
      if (teamComp !== 0) return teamComp;
      return (infoA.employeeName || '').localeCompare(infoB.employeeName || '');
    });
  }, [managerTeamResponses, dbEmployees]);

  // Direct and Downline response partition counts
  const directResponsesCount = useMemo(() => {
    return allDeduplicatedManagerResponses.filter(isResponseUnderMyManagerReview).length;
  }, [allDeduplicatedManagerResponses, dbEmployees, userId, userCode, myCanonicalCode, currentDbUser]);

  const downlineResponsesCount = useMemo(() => {
    return allDeduplicatedManagerResponses.filter(r => {
      const { empInDb } = getEmployeeDisplayInfo(r);
      return isDownlineReport(empInDb) || isResponseUnderMyManagerReview(r);
    }).length;
  }, [allDeduplicatedManagerResponses, dbEmployees, userId, userCode, myCanonicalCode, currentDbUser]);

  // Helper to categorize submission lifecycle stage for the Submissions Overview Tab
  // Helper to categorize submission lifecycle stage for the Submissions Overview Tab
  const getSubmissionCategory = (r: EvaluationResponse): 'with_manager' | 'approved' | 'completed' | 'with_gm' | 'with_admin' | 'sent_back' | 'assigned_to_employee' => {
    const s = String(r.status || '').toLowerCase().trim();
    const smStatus = String((r as any).service_manager_approve_status || '').toLowerCase().trim();

    if (s.includes('sent') || s.includes('back') || s.includes('return') || s.includes('reject')) {
      return 'sent_back';
    }
    if (s.includes('admin') || s === 'admin_review' || s === 'with_admin') {
      return 'with_admin';
    }
    if (s === 'completed' || s === 'sm_final_approval') {
      return 'completed';
    }
    if (s === 'approved' || smStatus === 'approved' || s.includes('calibrated') || r.managerScore != null) {
      return 'approved';
    }
    if (s === 'sm_review' || s.includes('service') || s.includes('general')) {
      return 'with_gm';
    }

    // Check if truly submitted to manager
    const isSubmittedByEmp = Boolean(r.employeeSubmittedAt) || Boolean((r as any).submitted_at);
    const isExplicitMgrStatus = s === 'manager_review' || s === 'manager review' || s === 'with_manager' || s === 'with manager' || s === 'assigned to manager' || s === 'submitted';

    if (isSubmittedByEmp || isExplicitMgrStatus) {
      return 'with_manager';
    }

    return 'assigned_to_employee';
  };

  // Submissions summary counts for metric cards
  const submissionSummaryCounts = useMemo(() => {
    let all = allDeduplicatedManagerResponses;
    let withManager = 0;
    let withGm = 0;
    let withAdmin = 0;
    let approved = 0;
    let completed = 0;
    let sentBack = 0;
    let assignedToEmployee = 0;

    all.forEach(r => {
      const s = String(r.status || '').toLowerCase().trim();
      const isCompleted = s === 'completed' || s === 'sm_final_approval' || r.managerScore != null || s === 'approved';

      if (isCompleted) {
        completed++;
      } else {
        const cat = getSubmissionCategory(r);
        if (cat === 'with_manager') withManager++;
        else if (cat === 'with_gm') withGm++;
        else if (cat === 'with_admin') withAdmin++;
        else if (cat === 'sent_back') sentBack++;
        else if (cat === 'assigned_to_employee') assignedToEmployee++;
        else withManager++;
      }
    });

    return {
      all: all.length,
      withManager,
      withGm,
      withAdmin,
      approved,
      completed,
      sentBack,
      assignedToEmployee,
    };
  }, [allDeduplicatedManagerResponses]);

  // Filtered submissions list based on active status filter & search query
  const filteredSubmissionsList = useMemo(() => {
    let list = allDeduplicatedManagerResponses;

    if (submissionStatusFilter !== 'all') {
      if (submissionStatusFilter === 'completed') {
        list = list.filter(r => {
          const s = String(r.status || '').toLowerCase().trim();
          return s === 'completed' || s === 'sm_final_approval' || r.managerScore != null || s === 'approved';
        });
      } else if (submissionStatusFilter === 'with_manager') {
        list = list.filter(r => {
          const s = String(r.status || '').toLowerCase().trim();
          const isCompleted = s === 'completed' || s === 'sm_final_approval' || r.managerScore != null || s === 'approved';
          return !isCompleted && getSubmissionCategory(r) === 'with_manager';
        });
      } else {
        list = list.filter(r => getSubmissionCategory(r) === submissionStatusFilter);
      }
    }

    if (submissionSearchQuery.trim()) {
      const q = submissionSearchQuery.trim().toLowerCase();
      list = list.filter(r => {
        const { employeeName, employeeCode, teamName, departmentName } = getEmployeeDisplayInfo(r);
        return (
          (employeeName || '').toLowerCase().includes(q) ||
          (employeeCode || '').toLowerCase().includes(q) ||
          (teamName || '').toLowerCase().includes(q) ||
          (departmentName || '').toLowerCase().includes(q) ||
          (r.periodName || '').toLowerCase().includes(q) ||
          (r.frequency || '').toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [allDeduplicatedManagerResponses, submissionStatusFilter, submissionSearchQuery, dbEmployees]);

  // Grouped Submissions Data for Accordion Rows (Group by Team or Department)
  const submissionGroupedData = useMemo(() => {
    if (submissionGroupBy === 'none') {
      return [];
    }

    const groupMap = new Map<string, {
      groupName: string;
      items: EvaluationResponse[];
      allGroupItems: EvaluationResponse[];
      peopleSet: Set<string>;
    }>();

    // Populate all available responses in this manager/oversight scope
    allDeduplicatedManagerResponses.forEach(r => {
      const info = getEmployeeDisplayInfo(r);
      const groupKey = submissionGroupBy === 'team'
        ? (info.teamName || 'General Team')
        : (info.departmentName || 'General Department');

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          groupName: groupKey,
          items: [],
          allGroupItems: [],
          peopleSet: new Set<string>()
        });
      }

      const g = groupMap.get(groupKey)!;
      g.allGroupItems.push(r);
      const personIdentifier = String(info.employeeCode || r.employeeId || r.employeeName || '');
      if (personIdentifier) g.peopleSet.add(personIdentifier);
    });

    // Populate filtered items
    filteredSubmissionsList.forEach(r => {
      const info = getEmployeeDisplayInfo(r);
      const groupKey = submissionGroupBy === 'team'
        ? (info.teamName || 'General Team')
        : (info.departmentName || 'General Department');

      if (groupMap.has(groupKey)) {
        groupMap.get(groupKey)!.items.push(r);
      }
    });

    const result = Array.from(groupMap.values()).map(g => {
      const filteredPeopleSet = new Set<string>();
      let filteredScoreSum = 0;
      let filteredScoreCount = 0;
      let openCount = 0;
      let completedCount = 0;

      // Group filtered items by designation
      const desigMap = new Map<string, { designationName: string; items: EvaluationResponse[]; peopleSet: Set<string> }>();

      // Calculate totals across all items in group
      g.allGroupItems.forEach(r => {
        const s = String(r.status || '').toLowerCase().trim();
        const isCompleted = s === 'completed' || s === 'sm_final_approval' || r.managerScore != null || s === 'approved';
        if (isCompleted) {
          completedCount++;
        } else {
          openCount++;
        }
      });

      // Calculate stats for currently filtered items
      g.items.forEach(r => {
        const info = getEmployeeDisplayInfo(r);
        const personIdentifier = String(info.employeeCode || r.employeeId || r.employeeName || '');
        if (personIdentifier) filteredPeopleSet.add(personIdentifier);

        const score = r.managerScore != null ? Number(r.managerScore) : (r.employeeOverallScore != null ? Number(r.employeeOverallScore) : null);
        if (score != null && !isNaN(score) && score > 0) {
          filteredScoreSum += score;
          filteredScoreCount++;
        }

        const desigName = (
          info.designation ||
          (info.empInDb as any)?.designation ||
          (info.empInDb as any)?.job_title ||
          r.designation ||
          (r as any).role ||
          'General Staff'
        ).trim() || 'General Staff';

        if (!desigMap.has(desigName)) {
          desigMap.set(desigName, {
            designationName: desigName,
            items: [],
            peopleSet: new Set<string>()
          });
        }
        const dObj = desigMap.get(desigName)!;
        dObj.items.push(r);
        if (personIdentifier) dObj.peopleSet.add(personIdentifier);
      });

      const designations = Array.from(desigMap.values()).map(d => ({
        designationName: d.designationName,
        items: d.items,
        peopleCount: d.peopleSet.size || d.items.length
      })).sort((a, b) => a.designationName.localeCompare(b.designationName));

      const avgScore = filteredScoreCount > 0 ? (filteredScoreSum / filteredScoreCount) : 0;

      return {
        groupName: g.groupName,
        items: g.items,
        designations,
        totalItemsCount: g.allGroupItems.length,
        filteredCount: g.items.length,
        peopleCount: filteredPeopleSet.size || g.items.length,
        totalPeopleCount: g.peopleSet.size || g.allGroupItems.length,
        submittedCount: g.allGroupItems.length,
        openCount,
        completedCount,
        avgScore
      };
    });

    return result
      .filter(g => submissionStatusFilter === 'all' ? true : g.items.length > 0)
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [allDeduplicatedManagerResponses, filteredSubmissionsList, submissionGroupBy, submissionStatusFilter, dbEmployees]);

  const myEvaluationsCount = useMemo(() => {
    return allUserResponses.length;
  }, [allUserResponses]);

  const myPendingEvaluationsCount = useMemo(() => {
    return allUserResponses.filter(r => {
      const st = String(r.status || '');
      const isSubmitted = st === 'manager_review' ||
        st === 'approved' ||
        st === 'sm_final_approval' ||
        st === 'Calibrated & Approved' ||
        st === 'Completed' ||
        (r.status as string) === 'Submitted to Manager' ||
        Boolean(r.employeeSubmittedAt);
      return !isSubmitted;
    }).length;
  }, [allUserResponses]);

  // Filtered manager responses by selected department and active role tab (Direct Manager Reviews vs Downline Teams)
  const deduplicatedManagerResponses = useMemo(() => {
    let list = allDeduplicatedManagerResponses;

    if (activeRole === 'manager') {
      // Direct reports and assignable subordinates for Manager Reviews tab
      list = list.filter(isResponseUnderMyManagerReview);
    } else if (activeRole === 'downline_teams') {
      // All subordinate reports across the whole department tree (Direct + Indirect Downline)
      list = list.filter(r => {
        const { empInDb } = getEmployeeDisplayInfo(r);
        return isDownlineReport(empInDb) || isResponseUnderMyManagerReview(r);
      });
    }

    // Apply Department Filter
    if (managerFilterDept && managerFilterDept !== 'all') {
      const target = managerFilterDept.trim().toLowerCase();
      list = list.filter(r => {
        const { empInDb, teamName, departmentName } = getEmployeeDisplayInfo(r);
        const empDept = (empInDb?.department || empInDb?.team || teamName || departmentName || '').trim().toLowerCase();
        return empDept === target || empDept.includes(target) || target.includes(empDept);
      });
    }

    return list;
  }, [allDeduplicatedManagerResponses, managerFilterDept, activeRole, dbEmployees, userId, userCode, myCanonicalCode, currentDbUser]);

  // Scoped responses for team cards according to active tab
  const activeScopedResponsesForCards = useMemo(() => {
    if (activeRole === 'manager') {
      return allDeduplicatedManagerResponses.filter(isResponseUnderMyManagerReview);
    }
    if (activeRole === 'downline_teams') {
      return allDeduplicatedManagerResponses.filter(r => {
        const { empInDb } = getEmployeeDisplayInfo(r);
        return isDownlineReport(empInDb) || isResponseUnderMyManagerReview(r);
      });
    }
    return allDeduplicatedManagerResponses;
  }, [allDeduplicatedManagerResponses, activeRole, dbEmployees, userId, userCode, myCanonicalCode, currentDbUser]);

  // Team-wise computed statistics for interactive department cards
  const teamWiseCardsData = useMemo(() => {
    if (activeScopedResponsesForCards.length === 0) {
      return [];
    }

    const teamSet = new Set<string>();
    activeScopedResponsesForCards.forEach(r => {
      const { teamName } = getEmployeeDisplayInfo(r);
      if (teamName && teamName.trim()) teamSet.add(teamName.trim());
    });

    return Array.from(teamSet).map(deptName => {
      const target = deptName.trim().toLowerCase();
      const deptResponses = activeScopedResponsesForCards.filter(r => {
        const { empInDb, teamName } = getEmployeeDisplayInfo(r);
        const empDept = (empInDb?.department || empInDb?.team || teamName || '').trim().toLowerCase();
        return empDept === target;
      });

      const totalEmployees = deptResponses.length;
      const completedList = deptResponses.filter(r =>
        (r.status === 'approved' || r.status === 'sm_final_approval' || r.managerScore != null) &&
        (r.status as string) !== 'manager_review' &&
        (r.status as string) !== 'Submitted to Manager'
      );
      const completedCount = completedList.length;

      const submittedList = deptResponses.filter(r =>
        ((r.status as string) === 'manager_review' || (r.status as string) === 'Submitted to Manager' || (r.employeeOverallScore != null && r.employeeOverallScore > 0)) &&
        r.status !== 'approved' && r.status !== 'sm_final_approval' && r.managerScore == null
      );
      const submittedCount = submittedList.length;
      const pendingCount = Math.max(0, totalEmployees - completedCount);

      const completionPercentage = totalEmployees > 0
        ? Math.min(100, Math.round((completedCount / totalEmployees) * 100))
        : 0;

      const mgrScoredResponses = deptResponses.filter(r =>
        r.managerScore != null && !isNaN(Number(r.managerScore))
      );
      const mgrScoreSum = mgrScoredResponses.reduce((acc, r) => acc + Number(r.managerScore), 0);
      const teamAvgMgrScore = mgrScoredResponses.length > 0
        ? Number((mgrScoreSum / mgrScoredResponses.length).toFixed(1))
        : null;

      const scoredResponses = deptResponses.filter(r =>
        (r.managerScore != null && !isNaN(Number(r.managerScore))) ||
        (r.employeeOverallScore != null && Number(r.employeeOverallScore) > 0)
      );
      const totalScoreSum = scoredResponses.reduce((acc, r) => {
        const score = r.managerScore != null ? Number(r.managerScore) : Number(r.employeeOverallScore);
        return acc + score;
      }, 0);
      const teamAvgScore = scoredResponses.length > 0
        ? Number((totalScoreSum / scoredResponses.length).toFixed(1))
        : null;

      // Extract Sub-Manager name overseeing this team
      const sampleWithMgr = deptResponses.find(r => {
        const { empInDb } = getEmployeeDisplayInfo(r);
        const respCycle = cycles.find(c => c.id === r.cycleId);
        return empInDb?.reporting_manager || (r as any).managerName || respCycle?.managerName;
      });
      const sampleRespCycle = sampleWithMgr ? cycles.find(c => c.id === sampleWithMgr.cycleId) : null;
      const subManagerName = sampleWithMgr
        ? (getEmployeeDisplayInfo(sampleWithMgr).empInDb?.reporting_manager || (sampleWithMgr as any).managerName || sampleRespCycle?.managerName || '').trim()
        : '';

      const hasDownline = deptResponses.some(r => {
        const { empInDb } = getEmployeeDisplayInfo(r);
        return !isDirectReport(empInDb);
      });

      return {
        department: deptName,
        totalEmployees,
        completedCount,
        submittedCount,
        pendingCount,
        completionPercentage,
        teamAvgMgrScore,
        teamAvgScore,
        totalScoreSum,
        subManagerName,
        isDownlineTeam: hasDownline,
        responses: deptResponses
      };
    }).filter(t => t.totalEmployees > 0);
  }, [activeScopedResponsesForCards, dbEmployees, userId, userCode, currentDbUser]);

  // Top 3 Teams Leaderboard (Racing) by Average Score & Progress
  const topThreeTeams = useMemo(() => {
    if (!teamWiseCardsData || teamWiseCardsData.length === 0) return [];
    return [...teamWiseCardsData]
      .sort((a, b) => {
        const scoreA = a.teamAvgScore ?? a.teamAvgMgrScore ?? a.completionPercentage ?? 0;
        const scoreB = b.teamAvgScore ?? b.teamAvgMgrScore ?? b.completionPercentage ?? 0;
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }, [teamWiseCardsData]);

  // Active selected race team for team member top 3 prize leaderboard
  const effectiveRaceTeam = useMemo(() => {
    if (selectedRaceTeam && selectedRaceTeam !== 'all') return selectedRaceTeam;
    if (teamWiseCardsData.length > 0) return teamWiseCardsData[0].department;
    return managerDepartments[0] || effectiveTeamName || 'Team';
  }, [selectedRaceTeam, teamWiseCardsData, managerDepartments, effectiveTeamName]);

  // Top 3 Performing Team Members Leaderboard (Filtered by Selected Team for Prize Winners)
  const topPerformingMembers = useMemo(() => {
    if (!activeScopedResponsesForCards || activeScopedResponsesForCards.length === 0) return [];

    const targetDept = (effectiveRaceTeam || '').trim().toLowerCase();
    const filteredResponses = targetDept
      ? activeScopedResponsesForCards.filter(r => {
        const { empInDb, teamName } = getEmployeeDisplayInfo(r);
        const dept = (empInDb?.department || empInDb?.team || teamName || '').trim().toLowerCase();
        return dept === targetDept;
      })
      : activeScopedResponsesForCards;

    const memberMap = new Map<string, {
      employeeCode: string;
      employeeName: string;
      teamName: string;
      score: number;
      isManagerCalibrated: boolean;
      status: string;
    }>();

    filteredResponses.forEach(r => {
      const { employeeCode, employeeName, teamName, empInDb } = getEmployeeDisplayInfo(r);
      if (!empInDb && !employeeName) return;

      const scoreVal = r.managerScore != null && !isNaN(Number(r.managerScore))
        ? Number(r.managerScore)
        : (r.employeeOverallScore != null && !isNaN(Number(r.employeeOverallScore)) ? Number(r.employeeOverallScore) : 0);

      const isManagerCalibrated = r.managerScore != null;
      const key = String(employeeCode).trim().toLowerCase() || String(r.id);

      const existing = memberMap.get(key);
      if (!existing || scoreVal > existing.score || (isManagerCalibrated && !existing.isManagerCalibrated)) {
        memberMap.set(key, {
          employeeCode,
          employeeName,
          teamName: teamName || effectiveRaceTeam,
          score: scoreVal,
          isManagerCalibrated,
          status: r.status
        });
      }
    });

    return Array.from(memberMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [activeScopedResponsesForCards, effectiveRaceTeam, dbEmployees]);

  // Overall calculations across current scoped teams for the summary card
  const allTeamsTotalEmps = activeScopedResponsesForCards.length;
  const allTeamsCompletedCount = activeScopedResponsesForCards.filter(r =>
    (r.status === 'approved' || r.status === 'sm_final_approval' || r.managerScore != null) &&
    (r.status as string) !== 'manager_review' &&
    (r.status as string) !== 'Submitted to Manager'
  ).length;
  const allTeamsPendingCount = Math.max(0, allTeamsTotalEmps - allTeamsCompletedCount);
  const allTeamsSubmittedCount = activeScopedResponsesForCards.filter(r =>
    ((r.status as string) === 'manager_review' || (r.status as string) === 'Submitted to Manager' || (r.employeeOverallScore != null && r.employeeOverallScore > 0)) &&
    r.status !== 'approved' && r.managerScore == null
  ).length;
  const allTeamsOverallProgress = allTeamsTotalEmps > 0 ? Math.min(100, Math.round((allTeamsCompletedCount / allTeamsTotalEmps) * 100)) : 0;

  const allTeamsMgrScored = activeScopedResponsesForCards.filter(r => r.managerScore != null && !isNaN(Number(r.managerScore)));
  const allTeamsMgrSum = allTeamsMgrScored.reduce((acc, r) => acc + Number(r.managerScore), 0);
  const allTeamsAvgMgrScore = allTeamsMgrScored.length > 0 ? Number((allTeamsMgrSum / allTeamsMgrScored.length).toFixed(1)) : null;

  // Executive Manager Intelligence & Calibration Stats (Top Summary Cards)
  const managerStats = useMemo(() => {
    const baseList = activeScopedResponsesForCards;
    const total = baseList.length;
    const submitted = baseList.filter(r =>
      (r.status as string) === 'manager_review' ||
      (r.status as string) === 'Submitted to Manager' ||
      r.status === 'sm_final_approval' ||
      r.status === 'approved' ||
      (r.employeeOverallScore != null && r.employeeOverallScore > 0)
    ).length;
    const approved = baseList.filter(r =>
      (r.status === 'approved' || r.status === 'sm_final_approval' || r.managerScore != null) &&
      (r.status as string) !== 'manager_review' &&
      (r.status as string) !== 'Submitted to Manager'
    ).length;
    const pending = Math.max(0, total - approved);
    const validScores = baseList
      .map(r => r.managerScore != null ? Number(r.managerScore) : (r.employeeOverallScore != null && r.employeeOverallScore > 0 ? Number(r.employeeOverallScore) : null))
      .filter((s): s is number => s !== null && !isNaN(s));
    const avgScore = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
    const submissionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, approved, pending, avgScore, submissionRate };
  }, [activeScopedResponsesForCards]);

  // Queue status pill counts specifically for the active filtered table view
  const queueStats = useMemo(() => {
    const total = deduplicatedManagerResponses.length;
    const submitted = deduplicatedManagerResponses.filter(r =>
      (r.status as string) === 'manager_review' ||
      (r.status as string) === 'Submitted to Manager' ||
      r.status === 'sm_final_approval' ||
      r.status === 'approved' ||
      (r.employeeOverallScore != null && r.employeeOverallScore > 0)
    ).length;
    const approved = deduplicatedManagerResponses.filter(r =>
      (r.status === 'approved' || r.status === 'sm_final_approval' || r.managerScore != null) &&
      (r.status as string) !== 'manager_review' &&
      (r.status as string) !== 'Submitted to Manager'
    ).length;
    const pending = Math.max(0, total - approved);
    return { total, submitted, approved, pending };
  }, [deduplicatedManagerResponses]);

  // Filter manager responses by search query and status pill
  const filteredManagerResponses = useMemo(() => {
    return deduplicatedManagerResponses.filter(r => {
      const { employeeCode, employeeName, teamName } = getEmployeeDisplayInfo(r);
      // Status filter
      if (mgrStatusFilter === 'pending') {
        const isPending = r.status === 'employee_in_progress' ||
          (r.status as string) === 'manager_review' ||
          (r.status as string) === 'Submitted to Manager' ||
          (r.managerScore == null && r.status !== 'approved' && r.status !== 'sm_final_approval');
        if (!isPending) return false;
      } else if (mgrStatusFilter === 'submitted') {
        const isSubmitted = (r.status as string) === 'manager_review' ||
          (r.status as string) === 'Submitted to Manager' ||
          (r.employeeOverallScore != null && r.employeeOverallScore > 0 && r.managerScore == null);
        if (!isSubmitted) return false;
      } else if (mgrStatusFilter === 'approved') {
        const isApproved = (r.status === 'approved' || r.status === 'sm_final_approval' || r.managerScore != null) &&
          (r.status as string) !== 'manager_review' &&
          (r.status as string) !== 'Submitted to Manager';
        if (!isApproved) return false;
      }

      // Search query
      if (mgrSearchQuery.trim()) {
        const query = mgrSearchQuery.toLowerCase().trim();
        const matchesName = (employeeName || '').toLowerCase().includes(query);
        const matchesCode = String(employeeCode).toLowerCase().includes(query);
        const matchesTeam = (teamName || '').toLowerCase().includes(query);
        const matchesDesignation = (r.designation || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesTeam && !matchesDesignation) return false;
      }

      return true;
    });
  }, [deduplicatedManagerResponses, mgrStatusFilter, mgrSearchQuery, dbEmployees]);

  const isDailyResponse = (r: EvaluationResponse) => {
    const respCycle = cycles.find(c => c.id === r.cycleId);
    const f = String(r.frequency || (r as any).periodType || (respCycle as any)?.frequency || '').toLowerCase();
    if (f === 'daily') return true;
    if (f && f !== 'daily') return false;
    const p = `${r.periodName || ''} ${(r as any).form || ''} ${(r as any).description || ''} ${respCycle?.name || ''} ${respCycle?.periodName || ''}`.toLowerCase();
    return p.includes('daily');
  };

  const isWeeklyResponse = (r: EvaluationResponse) => {
    const respCycle = cycles.find(c => c.id === r.cycleId);
    const f = String(r.frequency || (r as any).periodType || (respCycle as any)?.frequency || '').toLowerCase();
    if (f === 'weekly') return true;
    if (f && f !== 'weekly') return false;
    const p = `${r.periodName || ''} ${(r as any).form || ''} ${(r as any).description || ''} ${respCycle?.name || ''} ${respCycle?.periodName || ''}`.toLowerCase();
    return p.includes('weekly') || p.includes('week');
  };

  const isMonthlyResponse = (r: EvaluationResponse) => {
    const respCycle = cycles.find(c => c.id === r.cycleId);
    const f = String(r.frequency || (r as any).periodType || (respCycle as any)?.frequency || '').toLowerCase();
    if (f === 'monthly') return true;
    if (f && f !== 'monthly') return false;
    const p = `${r.periodName || ''} ${(r as any).form || ''} ${(r as any).description || ''} ${respCycle?.name || ''} ${respCycle?.periodName || ''}`.toLowerCase();
    return (p.includes('monthly') || p.includes('month')) && !p.includes('weekly') && !p.includes('daily');
  };

  const isQuarterlyResponse = (r: EvaluationResponse) => {
    const respCycle = cycles.find(c => c.id === r.cycleId);
    const f = String(r.frequency || (r as any).periodType || (respCycle as any)?.frequency || '').toLowerCase();
    if (f === 'quarterly') return true;
    if (f && f !== 'quarterly') return false;
    const p = `${r.periodName || ''} ${(r as any).form || ''} ${(r as any).description || ''} ${respCycle?.name || ''} ${respCycle?.periodName || ''}`.toLowerCase();
    if (p.includes('annual') || p.includes('yearly')) return false;
    return p.includes('quarter') || p.includes('stage') || /q[1-4]/i.test(p);
  };



  // Dynamic notification counts of evaluations and pending reviews per frequency tab
  const frequencyCounts = useMemo(() => {
    let all = activeScopedResponsesForCards.length;
    let allPending = 0;
    let daily = 0;
    let dailyPending = 0;
    let weekly = 0;
    let weeklyPending = 0;
    let monthly = 0;
    let monthlyPending = 0;
    let quarterly = 0;
    let quarterlyPending = 0;
    let yearly = 0;
    let yearlyPending = 0;

    activeScopedResponsesForCards.forEach(r => {
      const isCompleted = r.managerScore != null || (r.status as string) === 'approved' || (r.status as string) === 'sm_final_approval';
      const isPending = !isCompleted;
      if (isPending) allPending++;

      if (isDailyResponse(r)) {
        daily++;
        if (isPending) dailyPending++;
      } else if (isWeeklyResponse(r)) {
        weekly++;
        if (isPending) weeklyPending++;
      } else if (isMonthlyResponse(r)) {
        monthly++;
        if (isPending) monthlyPending++;
      } else if (isQuarterlyResponse(r)) {
        quarterly++;
        if (isPending) quarterlyPending++;
      } else if (isYearlyResponse(r)) {
        yearly++;
        if (isPending) yearlyPending++;
      } else {
        quarterly++;
        if (isPending) quarterlyPending++;
      }
    });

    return {
      all,
      allPending,
      allCompleted: all - allPending,
      daily,
      dailyPending,
      dailyCompleted: daily - dailyPending,
      weekly,
      weeklyPending,
      weeklyCompleted: weekly - weeklyPending,
      monthly,
      monthlyPending,
      monthlyCompleted: monthly - monthlyPending,
      quarterly,
      quarterlyPending,
      quarterlyCompleted: quarterly - quarterlyPending,
      yearly,
      yearlyPending,
      yearlyCompleted: yearly - yearlyPending,
    };
  }, [activeScopedResponsesForCards, cycles]);

  const getEvaluationDateRange = (r: EvaluationResponse): { startDate: Date | null; endDate: Date | null } => {
    let start: Date | null = null;
    let end: Date | null = null;

    const rawStart = (r as any).startDate || (r as any).start_date || (r as any).fromDate || (r as any).from_date;
    if (rawStart) {
      const d = new Date(rawStart);
      if (!isNaN(d.getTime())) start = d;
    }

    const rawEnd = (r as any).endDate || (r as any).end_date || (r as any).toDate || (r as any).to_date;
    if (rawEnd) {
      const d = new Date(rawEnd);
      if (!isNaN(d.getTime())) end = d;
    }

    const text = `${r.periodName || ''} ${(r as any).form || ''} ${(r as any).description || ''}`;

    // 1. Match Quarter e.g. "Q3 2026", "Q3"
    const qMatch = text.match(/Q([1-4])/i);
    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      const qYearMatch = text.match(/20\d{2}/);
      const qYear = qYearMatch ? parseInt(qYearMatch[0], 10) : (start ? start.getFullYear() : 2026);
      if (!start) start = new Date(qYear, (qNum - 1) * 3, 1);
      if (!end) end = new Date(qYear, qNum * 3, 0);
    }

    // 2. Match Month Year e.g. "Sep 2026" or "September 2026"
    const mMatch = text.match(/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i);
    if (mMatch) {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const mIdx = months.indexOf(mMatch[1].toLowerCase().slice(0, 3));
      const mYear = parseInt(mMatch[2], 10);
      if (mIdx !== -1) {
        if (!start) start = new Date(mYear, mIdx, 1);
        if (!end) end = new Date(mYear, mIdx + 1, 0);
      }
    }

    // 3. Match Date Range e.g. "14 Sep 2026 - 20 Sep 2026"
    const rangeMatch = text.match(/(\d{1,2})\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})?\s*[-–]\s*(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})/i);
    if (rangeMatch) {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const endMonthIdx = months.indexOf(rangeMatch[4].toLowerCase().slice(0, 3));
      const endYear = parseInt(rangeMatch[5], 10);
      const startYear = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : endYear;
      if (!start) start = new Date(startYear, endMonthIdx, parseInt(rangeMatch[1], 10));
      if (!end) end = new Date(endYear, endMonthIdx, parseInt(rangeMatch[3], 10));
    }

    // 4. Match Single Date e.g. "15 Sep 2026"
    const singleMatch = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
    if (singleMatch && !start) {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const mIdx = months.indexOf(singleMatch[2].toLowerCase().slice(0, 3));
      if (mIdx !== -1) {
        start = new Date(Number(singleMatch[3]), mIdx, Number(singleMatch[1]));
        end = new Date(Number(singleMatch[3]), mIdx, Number(singleMatch[1]));
      }
    }

    // 5. Match slash format e.g. 15/09/2026
    const matchSlash = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (matchSlash && !start) {
      start = new Date(Number(matchSlash[3]), Number(matchSlash[2]) - 1, Number(matchSlash[1]));
      end = start;
    }

    // 6. Match dash format e.g. 2026-09-15
    const matchDash = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (matchDash && !start) {
      start = new Date(Number(matchDash[1]), Number(matchDash[2]) - 1, Number(matchDash[3]));
      end = start;
    }

    if (!start && r.createdAt) {
      const d = new Date(r.createdAt);
      if (!isNaN(d.getTime())) {
        start = d;
        end = d;
      }
    }

    if (start && !end) end = start;
    if (end && !start) start = end;

    return { startDate: start, endDate: end };
  };

  const getResponseDate = (r: EvaluationResponse): Date | null => {
    return getEvaluationDateRange(r).startDate;
  };

  const getMondayToSundayWeek = (d: Date) => {
    const day = d.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    const endStr = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const label = `${pad(monday.getDate())} ${months[monday.getMonth()]} - ${pad(sunday.getDate())} ${months[sunday.getMonth()]} ${sunday.getFullYear()}`;

    return { monday, sunday, startStr, endStr, weekKey: `${startStr}_${endStr}`, label };
  };

  // Active week calculation for reference UI
  const activeWeekInfo = useMemo(() => {
    const [y, m, d] = (reportDateInPeriod || '').split('-').map(Number);
    const baseDate = (!isNaN(y) && !isNaN(m) && !isNaN(d)) ? new Date(y, m - 1, d) : new Date();
    return getMondayToSundayWeek(baseDate);
  }, [reportDateInPeriod]);

  // Dynamically extract all available weekly evaluation periods (supporting standard Mon-Sun and custom ranges like Wed-Tue)
  const availableWeeklyPeriods = useMemo(() => {
    const weeklyResponses = activeScopedResponsesForCards.filter(isWeeklyResponse);
    const periodsMap = new Map<string, { label: string; startStr: string; endStr: string; count: number; monday: Date }>();
    const pad = (n: number) => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    weeklyResponses.forEach(r => {
      const range = getEvaluationDateRange(r);
      if (range.startDate) {
        const startStr = `${range.startDate.getFullYear()}-${pad(range.startDate.getMonth() + 1)}-${pad(range.startDate.getDate())}`;
        const endD = range.endDate || range.startDate;
        const endStr = `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(endD.getDate())}`;
        const label = `${pad(range.startDate.getDate())} ${months[range.startDate.getMonth()]} - ${pad(endD.getDate())} ${months[endD.getMonth()]} ${endD.getFullYear()}`;

        if (!periodsMap.has(startStr)) {
          periodsMap.set(startStr, {
            label,
            startStr,
            endStr,
            count: 0,
            monday: range.startDate
          });
        }
        periodsMap.get(startStr)!.count += 1;
      }
    });

    return Array.from(periodsMap.values()).sort((a, b) => b.monday.getTime() - a.monday.getTime());
  }, [activeScopedResponsesForCards, cycles]);

  // Dynamically extract all available months for filtering
  const availableMonths = useMemo(() => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthMap = new Map<string, { key: string; label: string; year: number; month: number }>();

    // From active responses
    activeScopedResponsesForCards.forEach(r => {
      const d = getResponseDate(r);
      if (d) {
        const y = d.getFullYear();
        const m = d.getMonth();
        const pad = (n: number) => String(n).padStart(2, '0');
        const key = `${y}-${pad(m + 1)}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, { key, label: `${months[m]} ${y}`, year: y, month: m });
        }
      }
    });

    // Also include months from cycles
    cycles.forEach(c => {
      const d = c.startDate ? new Date(c.startDate) : null;
      if (d && !isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = d.getMonth();
        const pad = (n: number) => String(n).padStart(2, '0');
        const key = `${y}-${pad(m + 1)}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, { key, label: `${months[m]} ${y}`, year: y, month: m });
        }
      }
    });

    // Include all 12 months for current year and previous/next year if needed
    const now = new Date();
    const curYear = now.getFullYear();
    for (let m = 0; m < 12; m++) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const key = `${curYear}-${pad(m + 1)}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { key, label: `${months[m]} ${curYear}`, year: curYear, month: m });
      }
    }

    return Array.from(monthMap.values()).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [activeScopedResponsesForCards, cycles]);

  // Compute all weekly periods (From date to To date) for the selected month (showing only actual evaluation weeks from DB)
  const weeksForSelectedMonth = useMemo(() => {
    const [yStr, mStr] = (selectedReportMonthKey || '').split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    if (isNaN(y) || isNaN(m)) return availableWeeklyPeriods;

    // Filter available weekly evaluation periods from DB that fall in / overlap this month
    return availableWeeklyPeriods.filter(wp => {
      const [wpY, wpM] = wp.startStr.split('-').map(Number);
      return wpY === y && (wpM - 1 === m || wp.monday.getMonth() === m);
    });
  }, [selectedReportMonthKey, availableWeeklyPeriods]);

  const handleReportMonthChange = (monthKey: string) => {
    setSelectedReportMonthKey(monthKey);
    if (monthKey !== 'all') {
      const [yStr, mStr] = monthKey.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      if (!isNaN(y) && !isNaN(m)) {
        const firstDay = new Date(y, m, 1);
        const dayOfWeek = firstDay.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const firstMon = new Date(y, m, 1 + diffToMonday);
        const pad = (n: number) => String(n).padStart(2, '0');
        const firstMonStr = `${firstMon.getFullYear()}-${pad(firstMon.getMonth() + 1)}-${pad(firstMon.getDate())}`;
        setReportDateInPeriod(firstMonStr);
        setSelectedWeekPeriod('all');
      }
    }
  };

  // Dynamically extract all available quarters for filtering
  const availableQuarters = useMemo(() => {
    const qMap = new Map<string, { key: string; label: string; year: number; quarter: number }>();
    const quarters = [
      { q: 1, label: 'Apr - Jun' },
      { q: 2, label: 'Jul - Sep' },
      { q: 3, label: 'Oct - Dec' },
      { q: 4, label: 'Jan - Mar' }
    ];

    const getQ = (month1Indexed: number) => {
      if (month1Indexed >= 4 && month1Indexed <= 6) return 1;
      if (month1Indexed >= 7 && month1Indexed <= 9) return 2;
      if (month1Indexed >= 10 && month1Indexed <= 12) return 3;
      return 4;
    };

    // From active responses
    activeScopedResponsesForCards.forEach(r => {
      const d = getResponseDate(r);
      if (d) {
        const y = d.getFullYear();
        const q = getQ(d.getMonth() + 1);
        const key = `${y}-Q${q}`;
        if (!qMap.has(key)) {
          const qObj = quarters.find(item => item.q === q) || quarters[0];
          qMap.set(key, { key, label: `Q${q} ${y} (${qObj.label})`, year: y, quarter: q });
        }
      }
    });

    // From cycles
    cycles.forEach(c => {
      const d = c.startDate ? new Date(c.startDate) : null;
      if (d && !isNaN(d.getTime())) {
        const y = d.getFullYear();
        const q = getQ(d.getMonth() + 1);
        const key = `${y}-Q${q}`;
        if (!qMap.has(key)) {
          const qObj = quarters.find(item => item.q === q) || quarters[0];
          qMap.set(key, { key, label: `Q${q} ${y} (${qObj.label})`, year: y, quarter: q });
        }
      }
    });

    // Current year all 4 quarters
    const now = new Date();
    const curYear = now.getFullYear();
    for (let q = 1; q <= 4; q++) {
      const key = `${curYear}-Q${q}`;
      if (!qMap.has(key)) {
        const qObj = quarters[q - 1];
        qMap.set(key, { key, label: `Q${q} ${curYear} (${qObj.label})`, year: curYear, quarter: q });
      }
    }

    return Array.from(qMap.values()).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.quarter - a.quarter;
    });
  }, [activeScopedResponsesForCards, cycles]);

  const handleReportQuarterChange = (qKey: string) => {
    setSelectedReportQuarterKey(qKey);
    if (qKey !== 'all') {
      const [yStr, qStr] = qKey.split('-Q');
      const y = parseInt(yStr, 10);
      const q = parseInt(qStr, 10);
      if (!isNaN(y) && !isNaN(q)) {
        const startMonth = (q - 1) * 3;
        const pad = (n: number) => String(n).padStart(2, '0');
        setReportDateInPeriod(`${y}-${pad(startMonth + 1)}-01`);
      }
    }
  };

  // Dynamically extract all available years for yearly filtering
  const availableYears = useMemo(() => {
    const ySet = new Set<number>();
    activeScopedResponsesForCards.forEach(r => {
      const d = getResponseDate(r);
      if (d) ySet.add(d.getFullYear());
    });
    cycles.forEach(c => {
      const d = c.startDate ? new Date(c.startDate) : null;
      if (d && !isNaN(d.getTime())) ySet.add(d.getFullYear());
    });
    ySet.add(new Date().getFullYear());
    return Array.from(ySet).sort((a, b) => b - a);
  }, [activeScopedResponsesForCards, cycles]);

  const handleReportYearChange = (yearKey: string) => {
    setSelectedReportYearKey(yearKey);
    if (yearKey !== 'all') {
      const y = parseInt(yearKey, 10);
      if (!isNaN(y)) {
        setReportDateInPeriod(`${y}-01-01`);
      }
    }
  };

  // Week days & actual evaluation dates dynamically extracted from database records
  const availableFilterDates = useMemo(() => {
    const datesMap = new Map<string, string>(); // dateStr -> formatted label

    // 1. Gather all actual evaluation dates present in the DB records
    activeScopedResponsesForCards.forEach(r => {
      const d = getResponseDate(r);
      if (d) {
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const label = `${d.getDate()} ${months[d.getMonth()]} (${dayNames[d.getDay()]})`;
        if (!datesMap.has(dateStr)) {
          datesMap.set(dateStr, label);
        }
      }
    });

    // 2. Include the calendar days of the active week period
    const monday = new Date(activeWeekInfo.monday);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
      const label = `${cur.getDate()} ${months[cur.getMonth()]} (${dayNames[i]})`;
      if (!datesMap.has(dateStr)) {
        datesMap.set(dateStr, label);
      }
    }

    return Array.from(datesMap.entries()).map(([dateStr, label]) => ({ dateStr, label }));
  }, [activeScopedResponsesForCards, activeWeekInfo]);

  // Available departments dynamically populated directly from database employees & teams within scope
  const availableFilterDepartments = useMemo(() => {
    const depts = new Set<string>();
    // From evaluation records in this role scope
    activeScopedResponsesForCards.forEach(r => {
      const { departmentName } = getEmployeeDisplayInfo(r);
      if (departmentName && departmentName.trim() && departmentName !== 'Department') {
        depts.add(departmentName.trim());
      }
    });
    // From direct / downline reports in DB for this manager
    managerDirectReports.forEach((e: any) => {
      const d = (e.department || '').trim();
      if (d) depts.add(d);
    });
    // Fallback to all manager departments if none yet
    if (depts.size === 0) {
      managerDepartments.forEach(d => depts.add(d));
    }
    return Array.from(depts).filter(Boolean).sort();
  }, [activeScopedResponsesForCards, managerDirectReports, managerDepartments, dbEmployees, dbTeams]);

  // Available teams dynamically populated directly from database employees & teams within scope
  const availableFilterTeams = useMemo(() => {
    const teams = new Set<string>();
    // From evaluation records in this role scope
    activeScopedResponsesForCards.forEach(r => {
      const { departmentName, teamName } = getEmployeeDisplayInfo(r);
      if (reportFilterDept !== 'all' && departmentName.toLowerCase() !== reportFilterDept.toLowerCase()) {
        return;
      }
      if (teamName && teamName.trim() && teamName !== 'Team') {
        teams.add(teamName.trim());
      }
    });
    // From direct / downline reports in DB for this manager
    managerDirectReports.forEach((e: any) => {
      const dept = (e.department || '').trim();
      if (reportFilterDept !== 'all' && dept.toLowerCase() !== reportFilterDept.toLowerCase()) {
        return;
      }
      const t = (e.team || '').trim();
      if (t) teams.add(t);
    });
    return Array.from(teams).filter(Boolean).sort();
  }, [activeScopedResponsesForCards, managerDirectReports, reportFilterDept, dbEmployees, dbTeams]);

  // Available designations dynamically populated directly from database employees & teams within scope
  const availableFilterDesignations = useMemo(() => {
    const desigs = new Set<string>();
    activeScopedResponsesForCards.forEach(r => {
      const { departmentName, teamName, empInDb } = getEmployeeDisplayInfo(r);
      if (reportFilterDept !== 'all' && departmentName.toLowerCase() !== reportFilterDept.toLowerCase()) {
        return;
      }
      if (reportFilterTeam !== 'all' && teamName.toLowerCase() !== reportFilterTeam.toLowerCase()) {
        return;
      }
      const d = (r.designation || empInDb?.designation || empInDb?.job_title || (r as any).role || '').trim();
      if (d) desigs.add(d);
    });
    managerDirectReports.forEach((e: any) => {
      const dept = (e.department || '').trim();
      const t = (e.team || '').trim();
      if (reportFilterDept !== 'all' && dept.toLowerCase() !== reportFilterDept.toLowerCase()) {
        return;
      }
      if (reportFilterTeam !== 'all' && t.toLowerCase() !== reportFilterTeam.toLowerCase()) {
        return;
      }
      const d = (e.designation || e.job_title || '').trim();
      if (d) desigs.add(d);
    });
    return Array.from(desigs).filter(Boolean).sort();
  }, [activeScopedResponsesForCards, managerDirectReports, reportFilterDept, reportFilterTeam, dbEmployees, dbTeams]);

  // Comprehensive report filtered responses from database
  const reportFilteredResponses = useMemo(() => {
    let list = [...activeScopedResponsesForCards];

    // 1. Search Query filter (Employee Name, Code, Team, Department, Designation)
    if (mgrSearchQuery.trim()) {
      const q = mgrSearchQuery.toLowerCase().trim();
      list = list.filter(r => {
        const { employeeCode, employeeName, teamName, departmentName, empInDb } = getEmployeeDisplayInfo(r);
        return (
          (employeeName || '').toLowerCase().includes(q) ||
          String(employeeCode).toLowerCase().includes(q) ||
          teamName.toLowerCase().includes(q) ||
          departmentName.toLowerCase().includes(q) ||
          (r.designation || empInDb?.designation || '').toLowerCase().includes(q)
        );
      });
    }

    // 2. Department filter directly matching DB values
    if (reportFilterDept !== 'all') {
      const targetDept = reportFilterDept.toLowerCase().trim();
      list = list.filter(r => {
        const { departmentName, empInDb } = getEmployeeDisplayInfo(r);
        const empDept = (empInDb?.department || departmentName || '').toLowerCase().trim();
        return empDept === targetDept;
      });
    }

    // 3. Team filter directly matching DB values
    if (reportFilterTeam !== 'all') {
      const targetTeam = reportFilterTeam.toLowerCase().trim();
      list = list.filter(r => {
        const { teamName, empInDb } = getEmployeeDisplayInfo(r);
        const empTeam = (empInDb?.team || teamName || '').toLowerCase().trim();
        return empTeam === targetTeam;
      });
    }

    // 4. Designation filter directly matching DB values
    if (reportFilterDesignation !== 'all') {
      const targetDesig = reportFilterDesignation.toLowerCase().trim();
      list = list.filter(r => {
        const { empInDb } = getEmployeeDisplayInfo(r);
        const empDesig = (r.designation || empInDb?.designation || empInDb?.job_title || (r as any).role || '').toLowerCase().trim();
        return empDesig === targetDesig;
      });
    }

    // 4. State filter
    if (reportFilterState === 'pending') {
      list = list.filter(r =>
        r.status === 'employee_in_progress' ||
        (r.status as string) === 'manager_review' ||
        (r.status as string) === 'Submitted to Manager' ||
        (r.managerScore == null && r.status !== 'approved' && r.status !== 'sm_final_approval')
      );
    } else if (reportFilterState === 'submitted') {
      list = list.filter(r =>
        (r.status as string) === 'manager_review' ||
        (r.status as string) === 'Submitted to Manager' ||
        (r.employeeOverallScore != null && r.employeeOverallScore > 0 && r.managerScore == null)
      );
    } else if (reportFilterState === 'approved') {
      list = list.filter(r =>
        (r.status === 'approved' || r.status === 'sm_final_approval' || r.managerScore != null) &&
        (r.status as string) !== 'manager_review' &&
        (r.status as string) !== 'Submitted to Manager'
      );
    }

    // 5. Date & Frequency Filter strictly matching reportViewTab and reportDateInPeriod
    const [targetY, targetM, targetD] = (reportDateInPeriod || '').split('-').map(Number);
    const hasTargetDate = !isNaN(targetY) && !isNaN(targetM) && !isNaN(targetD);
    const targetDateObj = hasTargetDate ? new Date(targetY, targetM - 1, targetD) : new Date();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const targetDateStr = hasTargetDate ? `${targetDateObj.getFullYear()}-${pad2(targetDateObj.getMonth() + 1)}-${pad2(targetDateObj.getDate())}` : '';
    const targetWeekBounds = getMondayToSundayWeek(targetDateObj);
    const targetQuarter = Math.ceil((targetDateObj.getMonth() + 1) / 3);
    const targetYear = targetDateObj.getFullYear();
    const targetMonth = targetDateObj.getMonth();

    if (reportViewTab === 'all') {
      // Display all evaluations across all frequencies
    } else if (reportViewTab === 'daily') {
      list = list.filter(r => {
        if (!isDailyResponse(r)) return false;
        if (!targetDateStr) return true;
        const range = getEvaluationDateRange(r);
        if (!range.startDate) return false;
        const rStartStr = `${range.startDate.getFullYear()}-${pad2(range.startDate.getMonth() + 1)}-${pad2(range.startDate.getDate())}`;
        const rEndStr = range.endDate ? `${range.endDate.getFullYear()}-${pad2(range.endDate.getMonth() + 1)}-${pad2(range.endDate.getDate())}` : rStartStr;
        return rStartStr <= targetDateStr && targetDateStr <= rEndStr;
      });
    } else if (reportViewTab === 'weekly') {
      list = list.filter(r => {
        if (!isWeeklyResponse(r)) return false;
        const range = getEvaluationDateRange(r);
        if (!range.startDate) return true;
        const rStartStr = `${range.startDate.getFullYear()}-${pad2(range.startDate.getMonth() + 1)}-${pad2(range.startDate.getDate())}`;
        const rWeekInfo = getMondayToSundayWeek(range.startDate);
        if (selectedWeekPeriod && selectedWeekPeriod !== 'all') {
          return rStartStr === selectedWeekPeriod || rWeekInfo.startStr === selectedWeekPeriod;
        }
        if (selectedReportMonthKey) {
          const [mY, mM] = selectedReportMonthKey.split('-').map(Number);
          if (!isNaN(mY) && !isNaN(mM)) {
            const rStartMon = range.startDate.getMonth();
            const rStartYear = range.startDate.getFullYear();
            const rEndMon = range.endDate ? range.endDate.getMonth() : rStartMon;
            const rEndYear = range.endDate ? range.endDate.getFullYear() : rStartYear;
            const targetM = mM - 1;
            const inMonth = (rStartYear === mY && rStartMon === targetM) || (rEndYear === mY && rEndMon === targetM);
            return inMonth;
          }
        }
        return true;
      });
    } else if (reportViewTab === 'monthly') {
      list = list.filter(r => {
        if (!isMonthlyResponse(r)) return false;
        if (selectedReportMonthKey && selectedReportMonthKey !== 'all') {
          const [mY, mM] = selectedReportMonthKey.split('-').map(Number);
          const range = getEvaluationDateRange(r);
          if (!range.startDate) return true;
          return range.startDate.getFullYear() === mY && range.startDate.getMonth() === (mM - 1);
        }
        return true;
      });
    } else if (reportViewTab === 'quarterly') {
      list = list.filter(r => {
        if (!isQuarterlyResponse(r)) return false;
        if (selectedReportQuarterKey && selectedReportQuarterKey !== 'all') {
          const [qY, qNum] = selectedReportQuarterKey.split('-Q').map(Number);
          const range = getEvaluationDateRange(r);
          if (!range.startDate) return true;
          const mNum = range.startDate.getMonth() + 1;
          const rQuarter = mNum >= 4 && mNum <= 6 ? 1 : mNum >= 7 && mNum <= 9 ? 2 : mNum >= 10 && mNum <= 12 ? 3 : 4;
          return range.startDate.getFullYear() === qY && rQuarter === qNum;
        }
        return true;
      });
    } else if (reportViewTab === 'yearly') {
      list = list.filter(r => {
        if (!isYearlyResponse(r)) return false;
        if (selectedReportYearKey && selectedReportYearKey !== 'all') {
          const yNum = Number(selectedReportYearKey);
          const range = getEvaluationDateRange(r);
          if (!range.startDate) return true;
          return range.startDate.getFullYear() === yNum;
        }
        return true;
      });
    } else if (reportViewTab === 'top_weekly') {
      list = list.filter(r => {
        if (selectedReportMonthKey && selectedReportMonthKey !== 'all') {
          const [mY, mM] = selectedReportMonthKey.split('-').map(Number);
          const range = getEvaluationDateRange(r);
          if (!range.startDate) return true;
          return range.startDate.getFullYear() === mY && range.startDate.getMonth() === (mM - 1);
        }
        return true;
      });
      list.sort((a, b) => {
        const scoreA = a.managerScore != null ? Number(a.managerScore) : Number(a.employeeOverallScore || 0);
        const scoreB = b.managerScore != null ? Number(b.managerScore) : Number(b.employeeOverallScore || 0);
        return scoreB - scoreA;
      });
    } else if (reportViewTab === 'top_monthly') {
      list = list.filter(r => {
        if (!isMonthlyResponse(r)) return false;
        if (selectedReportMonthKey && selectedReportMonthKey !== 'all') {
          const [mY, mM] = selectedReportMonthKey.split('-').map(Number);
          const range = getEvaluationDateRange(r);
          if (!range.startDate) return true;
          return range.startDate.getFullYear() === mY && range.startDate.getMonth() === (mM - 1);
        }
        return true;
      });
      list.sort((a, b) => {
        const scoreA = a.managerScore != null ? Number(a.managerScore) : Number(a.employeeOverallScore || 0);
        const scoreB = b.managerScore != null ? Number(b.managerScore) : Number(b.employeeOverallScore || 0);
        return scoreB - scoreA;
      });
    } else if (reportViewTab === 'top_quarterly') {
      list = list.filter(r => {
        if (!isQuarterlyResponse(r)) return false;
        if (selectedReportQuarterKey && selectedReportQuarterKey !== 'all') {
          const [qY, qNum] = selectedReportQuarterKey.split('-Q').map(Number);
          const range = getEvaluationDateRange(r);
          if (!range.startDate) return true;
          const mNum = range.startDate.getMonth() + 1;
          const rQuarter = mNum >= 4 && mNum <= 6 ? 1 : mNum >= 7 && mNum <= 9 ? 2 : mNum >= 10 && mNum <= 12 ? 3 : 4;
          return range.startDate.getFullYear() === qY && rQuarter === qNum;
        }
        return true;
      });
      list.sort((a, b) => {
        const scoreA = a.managerScore != null ? Number(a.managerScore) : Number(a.employeeOverallScore || 0);
        const scoreB = b.managerScore != null ? Number(b.managerScore) : Number(b.employeeOverallScore || 0);
        return scoreB - scoreA;
      });
    } else if (reportViewTab === 'top_annual') {
      list = list.filter(r => {
        if (!isYearlyResponse(r)) return false;
        if (!hasTargetDate) return true;
        const range = getEvaluationDateRange(r);
        if (!range.startDate) return true;
        return range.startDate.getFullYear() === targetYear;
      });
      list.sort((a, b) => {
        const scoreA = a.managerScore != null ? Number(a.managerScore) : Number(a.employeeOverallScore || 0);
        const scoreB = b.managerScore != null ? Number(b.managerScore) : Number(b.employeeOverallScore || 0);
        return scoreB - scoreA;
      });
    }

    // 6. Specific single day sub-filter (from Row 2 dropdown)
    if (reportFilterDate !== 'all') {
      list = list.filter(r => {
        const range = getEvaluationDateRange(r);
        if (!range.startDate) return true;
        const rStartStr = `${range.startDate.getFullYear()}-${pad2(range.startDate.getMonth() + 1)}-${pad2(range.startDate.getDate())}`;
        return rStartStr === reportFilterDate;
      });
    }

    return list;
  }, [
    activeScopedResponsesForCards,
    mgrSearchQuery,
    reportFilterDept,
    reportFilterTeam,
    reportFilterDesignation,
    reportFilterState,
    reportFilterDate,
    reportDateInPeriod,
    selectedWeekPeriod,
    selectedReportMonthKey,
    selectedReportQuarterKey,
    reportViewTab,
    dbEmployees
  ]);

  const groupedReportHierarchy = useMemo(() => {
    const teamMap = new Map<string, Map<string, any[]>>();

    reportFilteredResponses.forEach((r, idx) => {
      const { employeeCode, employeeName, teamName, departmentName, designation, empInDb, profileImage } = getEmployeeDisplayInfo(r);
      const isCalibrated = r.managerScore != null && (r.status as string) !== 'manager_review' && (r.status as string) !== 'Submitted to Manager';
      const initials = (employeeName || 'EM').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'EM';

      const avatarColors = [
        'bg-[#5a5720] text-white',
        'bg-[#4a3480] text-white',
        'bg-[#2e7d32] text-white',
        'bg-[#8d4218] text-white',
        'bg-[#0f2e5c] text-white',
        'bg-[#00796b] text-white',
        'bg-[#c2185b] text-white',
        'bg-[#455a64] text-white',
      ];
      const str = `${employeeName}_${employeeCode}`;
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
      const avatarBg = avatarColors[Math.abs(hash) % avatarColors.length];

      // Self score strictly from DB
      let selfScoreNum = r.employeeOverallScore != null
        ? Number(r.employeeOverallScore)
        : ((r as any).earned_score != null && !isNaN(Number((r as any).earned_score)) ? Number((r as any).earned_score) : null);

      // Manager score strictly from DB
      let mgrScoreNum = r.managerScore != null
        ? Number(r.managerScore)
        : ((r as any).manager_score != null && !isNaN(Number((r as any).manager_score)) ? Number((r as any).manager_score) : null);

      if (isYearlyResponse(r)) {
        const approvedMonths = (r.monthly_records || []).filter(m => m.status === 'manager_approved');
        if (approvedMonths.length > 0) {
          const ytdScore = approvedMonths.reduce((acc, m) => acc + (Number(m.managerScore) || 0), 0) / approvedMonths.length;
          mgrScoreNum = Number(ytdScore.toFixed(1));
        }
      }

      const dateScoreDisplay = selfScoreNum != null && selfScoreNum > 0
        ? `${selfScoreNum.toFixed(1)}%`
        : '—';

      const averageScoreDisplay = mgrScoreNum != null
        ? `${mgrScoreNum.toFixed(1)}%`
        : '—';

      const range = getEvaluationDateRange(r);
      const respCycle = cycles.find(cy => cy.id === r.cycleId);
      const monthsShortList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const pad2 = (n: number) => String(n).padStart(2, '0');

      let freqLabel = 'Evaluation';
      let freqColor = 'bg-slate-100 text-slate-700 border-slate-200';
      let dateText = '';

      if (isDailyResponse(r)) {
        freqLabel = 'Daily';
        freqColor = 'bg-amber-50 text-amber-900 border-amber-300';
        if (range.startDate) {
          dateText = `${range.startDate.getDate()} ${monthsShortList[range.startDate.getMonth()]} ${range.startDate.getFullYear()}`;
        }
      } else if (isWeeklyResponse(r)) {
        freqLabel = 'Weekly';
        freqColor = 'bg-blue-50 text-blue-900 border-blue-300';
        if (range.startDate) {
          const startD = range.startDate;
          const endD = range.endDate || range.startDate;
          dateText = `${pad2(startD.getDate())} ${monthsShortList[startD.getMonth()]} - ${pad2(endD.getDate())} ${monthsShortList[endD.getMonth()]} ${endD.getFullYear()}`;
        }
      } else if (isMonthlyResponse(r)) {
        freqLabel = 'Monthly';
        freqColor = 'bg-purple-50 text-purple-900 border-purple-300';
        if (range.startDate) {
          dateText = `${monthsShortList[range.startDate.getMonth()]} ${range.startDate.getFullYear()}`;
        }
      } else if (isQuarterlyResponse(r)) {
        freqLabel = 'Quarterly';
        freqColor = 'bg-emerald-50 text-emerald-900 border-emerald-300';
        if (range.startDate) {
          const mNum = range.startDate.getMonth() + 1;
          const qNum = mNum >= 4 && mNum <= 6 ? 1 : mNum >= 7 && mNum <= 9 ? 2 : mNum >= 10 && mNum <= 12 ? 3 : 4;
          dateText = `Q${qNum} ${range.startDate.getFullYear()}`;
        }
      } else if (isYearlyResponse(r)) {
        freqLabel = 'Annual (12-Mo)';
        freqColor = 'bg-teal-50 text-teal-900 border-teal-300';
        if (range.startDate && range.endDate) {
          dateText = `Apr ${range.startDate.getFullYear()} – Mar ${range.endDate.getFullYear()}`;
        } else if (range.startDate) {
          dateText = `FY ${range.startDate.getFullYear()}-${(range.startDate.getFullYear() + 1).toString().slice(-2)}`;
        }
      }

      if (!dateText) {
        dateText = respCycle?.periodName || respCycle?.name || (r as any).periodName || (r as any).form || 'Evaluation Period';
      }

      const designationName = (
        designation ||
        empInDb?.designation ||
        empInDb?.job_title ||
        r.designation ||
        (r as any).role ||
        'General Staff'
      ).trim() || 'General Staff';

      const memberItem = {
        response: r,
        employeeName,
        employeeCode,
        departmentName,
        teamName,
        initials,
        avatarBg,
        profileImage,
        dateScoreDisplay,
        averageScoreDisplay,
        isCalibrated,
        periodInfo: {
          freqLabel,
          freqColor,
          dateText
        },
        designation: designationName,
        rank: reportViewTab.startsWith('top_') ? idx + 1 : undefined
      };

      const effectiveTeam = teamName || departmentName || 'General Team';

      if (!teamMap.has(effectiveTeam)) {
        teamMap.set(effectiveTeam, new Map<string, any[]>());
      }
      const desigMap = teamMap.get(effectiveTeam)!;
      if (!desigMap.has(designationName)) {
        desigMap.set(designationName, []);
      }
      desigMap.get(designationName)!.push(memberItem);
    });

    const result: Array<{
      teamName: string;
      totalPeople: number;
      members: any[];
      designations: Array<{
        designationName: string;
        members: any[];
      }>;
    }> = [];

    teamMap.forEach((desigMap, tName) => {
      let teamTotal = 0;
      const designations: Array<{ designationName: string; members: any[] }> = [];
      const allMembers: any[] = [];

      desigMap.forEach((members, dName) => {
        if (members.length > 0) {
          teamTotal += members.length;
          allMembers.push(...members);
          const sortedMembers = [...members].sort((a, b) => {
            const isPendingA = Boolean(
              (a.response.status === 'manager_review' || a.response.status === 'Submitted to Manager' || String(a.response.status || '').toLowerCase().includes('submitted')) &&
              a.response.managerScore == null
            );
            const isPendingB = Boolean(
              (b.response.status === 'manager_review' || b.response.status === 'Submitted to Manager' || String(b.response.status || '').toLowerCase().includes('submitted')) &&
              b.response.managerScore == null
            );
            if (isPendingA && !isPendingB) return -1;
            if (!isPendingA && isPendingB) return 1;
            return a.employeeName.localeCompare(b.employeeName);
          });
          designations.push({
            designationName: dName,
            members: sortedMembers
          });
        }
      });

      if (teamTotal > 0 && allMembers.length > 0) {
        allMembers.sort((a, b) => {
          const isPendingA = Boolean(
            (a.response.status === 'manager_review' || a.response.status === 'Submitted to Manager' || String(a.response.status || '').toLowerCase().includes('submitted')) &&
            a.response.managerScore == null
          );
          const isPendingB = Boolean(
            (b.response.status === 'manager_review' || b.response.status === 'Submitted to Manager' || String(b.response.status || '').toLowerCase().includes('submitted')) &&
            b.response.managerScore == null
          );
          if (isPendingA && !isPendingB) return -1;
          if (!isPendingA && isPendingB) return 1;
          return a.employeeName.localeCompare(b.employeeName);
        });

        designations.sort((a, b) => a.designationName.localeCompare(b.designationName));
        result.push({
          teamName: tName,
          totalPeople: teamTotal,
          members: allMembers,
          designations
        });
      }
    });

    return result.sort((a, b) => a.teamName.localeCompare(b.teamName));
  }, [
    reportFilteredResponses,
    cycles,
    reportViewTab,
    dbEmployees,
    dbTeams,
    effectiveTeamName
  ]);

  const canShowReviewerTabs = isHrOrAdmin || isManager || isServiceManager || isTeamLead;

  // Formatted date column header dynamically derived from DB records & user selection
  const formattedDateColumnHeader = useMemo(() => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    if (reportFilterDate !== 'all') {
      const [y, m, d] = reportFilterDate.split('-').map(Number);
      if (!isNaN(d) && !isNaN(m)) return `${d} ${months[m - 1]}`;
      return reportFilterDate.toUpperCase();
    }

    const [y, m, d] = (reportDateInPeriod || '').split('-').map(Number);
    if (reportViewTab === 'all') {
      return 'SELF SCORE';
    }
    if (reportViewTab === 'daily' && !isNaN(d) && !isNaN(m)) {
      return `${d} ${months[m - 1]}`;
    }
    if (reportViewTab === 'weekly') {
      const mon = activeWeekInfo.monday;
      const sun = activeWeekInfo.sunday;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(mon.getDate())} ${months[mon.getMonth()]} - ${pad(sun.getDate())} ${months[sun.getMonth()]}`;
    }
    if (reportViewTab === 'monthly') {
      const activeMonth = !isNaN(m) ? m - 1 : new Date().getMonth();
      const activeYear = !isNaN(y) ? y : new Date().getFullYear();
      return `${months[activeMonth]} ${activeYear}`;
    }
    if (reportViewTab === 'quarterly') {
      const mVal = !isNaN(m) ? m : new Date().getMonth() + 1;
      const activeQuarter = mVal >= 4 && mVal <= 6 ? 1 : mVal >= 7 && mVal <= 9 ? 2 : mVal >= 10 && mVal <= 12 ? 3 : 4;
      const activeYear = !isNaN(y) ? y : new Date().getFullYear();
      return `Q${activeQuarter} ${activeYear}`;
    }
    if (reportViewTab === 'yearly') {
      const activeYear = !isNaN(y) ? y : new Date().getFullYear();
      return `${activeYear}`;
    }

    return 'SCORE';
  }, [reportFilterDate, reportDateInPeriod, reportViewTab, activeWeekInfo]);

  // Dynamic header info for the report title banner strictly respecting selected date & frequency
  const reportHeaderInfo = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const [y, m, d] = (reportDateInPeriod || '').split('-').map(Number);
    const activeDate = (!isNaN(y) && !isNaN(m) && !isNaN(d)) ? new Date(y, m - 1, d) : new Date();

    const weekInfo = getMondayToSundayWeek(activeDate);
    const curDateFormatted = `${activeDate.getDate()} ${months[activeDate.getMonth()]} ${activeDate.getFullYear()}`;
    const monthLabel = `${months[activeDate.getMonth()]} ${activeDate.getFullYear()}`;
    const mActive = activeDate.getMonth() + 1;
    const qNum = mActive >= 4 && mActive <= 6 ? 1 : mActive >= 7 && mActive <= 9 ? 2 : mActive >= 10 && mActive <= 12 ? 3 : 4;
    const qMonthsLabel = qNum === 1 ? 'Apr - Jun' : qNum === 2 ? 'Jul - Sep' : qNum === 3 ? 'Oct - Dec' : 'Jan - Mar';

    const totalCount = reportFilteredResponses.length;
    const completedCount = reportFilteredResponses.filter(r => r.managerScore != null).length;
    const countBadge = `${totalCount} ${totalCount === 1 ? 'person' : 'people'} (${completedCount} calibrated)`;

    if (reportViewTab === 'all') {
      return {
        title: 'All Evaluations Overview',
        badge: countBadge
      };
    }
    if (reportViewTab === 'daily') {
      return {
        title: `Daily Report — ${curDateFormatted}`,
        badge: countBadge
      };
    }
    if (reportViewTab === 'weekly') {
      let weekTitle = weekInfo.label;
      if (selectedWeekPeriod === 'all') {
        weekTitle = availableWeeklyPeriods.length > 1
          ? `All Active Weeks (${availableWeeklyPeriods.length} Periods)`
          : (availableWeeklyPeriods[0]?.label || weekInfo.label);
      } else {
        const found = availableWeeklyPeriods.find(p => p.startStr === selectedWeekPeriod);
        if (found) weekTitle = found.label;
      }
      return {
        title: `Weekly Report — ${weekTitle}`,
        badge: countBadge
      };
    }
    if (reportViewTab === 'monthly') {
      let mTitle = monthLabel;
      if (selectedReportMonthKey && selectedReportMonthKey !== 'all') {
        const found = availableMonths.find(m => m.key === selectedReportMonthKey);
        if (found) mTitle = found.label;
      } else if (selectedReportMonthKey === 'all') {
        mTitle = `All Months`;
      }
      return {
        title: `Monthly Report — ${mTitle}`,
        badge: countBadge
      };
    }
    if (reportViewTab === 'quarterly') {
      let qTitle = `Q${qNum} ${activeDate.getFullYear()} (${qMonthsLabel})`;
      if (selectedReportQuarterKey && selectedReportQuarterKey !== 'all') {
        const found = availableQuarters.find(q => q.key === selectedReportQuarterKey);
        if (found) qTitle = found.label;
      } else if (selectedReportQuarterKey === 'all') {
        qTitle = `All Quarters`;
      }
      return {
        title: `Quarterly Report — ${qTitle}`,
        badge: countBadge
      };
    }
    if (reportViewTab === 'yearly') {
      let yTitle = `${activeDate.getFullYear()}`;
      if (selectedReportYearKey && selectedReportYearKey !== 'all') {
        yTitle = selectedReportYearKey;
      } else if (selectedReportYearKey === 'all') {
        yTitle = `All Years`;
      }
      return {
        title: `Yearly Report — ${yTitle}`,
        badge: countBadge
      };
    }
    if (reportViewTab === 'top_weekly') {
      let mTitle = monthLabel;
      if (selectedReportMonthKey && selectedReportMonthKey !== 'all') {
        const found = availableMonths.find(m => m.key === selectedReportMonthKey);
        if (found) mTitle = found.label;
      }
      return {
        title: `Top Performers — Weekly (${mTitle})`,
        badge: 'ranked by score'
      };
    }
    if (reportViewTab === 'top_monthly') {
      let mTitle = monthLabel;
      if (selectedReportMonthKey && selectedReportMonthKey !== 'all') {
        const found = availableMonths.find(m => m.key === selectedReportMonthKey);
        if (found) mTitle = found.label;
      }
      return {
        title: `Top Performers — Monthly (${mTitle})`,
        badge: 'ranked by score'
      };
    }
    if (reportViewTab === 'top_quarterly') {
      const fyStart = mActive >= 4 ? activeDate.getFullYear() : activeDate.getFullYear() - 1;
      const qYear = qNum === 4 ? fyStart + 1 : fyStart;
      let qTitle = `Q${qNum} ${qYear}`;
      if (selectedReportQuarterKey && selectedReportQuarterKey !== 'all') {
        const found = availableQuarters.find(q => q.key === selectedReportQuarterKey);
        if (found) qTitle = found.label;
      }
      return {
        title: `Top Performers — Quarterly (${qTitle})`,
        badge: 'ranked by score'
      };
    }
    const fyAnnualStart = mActive >= 4 ? activeDate.getFullYear() : activeDate.getFullYear() - 1;
    return {
      title: `Top Performers — Annual (FY ${fyAnnualStart}-${fyAnnualStart + 1})`,
      badge: 'ranked by score'
    };
  }, [reportViewTab, reportDateInPeriod, selectedWeekPeriod, selectedReportMonthKey, selectedReportQuarterKey, selectedReportYearKey, availableWeeklyPeriods, availableMonths, availableQuarters, availableYears, reportFilteredResponses]);

  // Handle switching report tab with automatic period date sync so evaluations are immediately visible
  const handleSwitchReportTab = (tabId: string) => {
    setReportViewTab(tabId as any);
    if (tabId === 'all') {
      setReportFilterDate('all');
      setSelectedWeekPeriod('all');
      return;
    }
    if (tabId === 'weekly') {
      setSelectedWeekPeriod('all');
    }
    if (tabId.startsWith('top_')) {
      return;
    }

    const responsesInTab = activeScopedResponsesForCards.filter(r => {
      if (tabId === 'daily') return isDailyResponse(r);
      if (tabId === 'weekly') return isWeeklyResponse(r);
      if (tabId === 'monthly') return isMonthlyResponse(r);
      if (tabId === 'quarterly') return isQuarterlyResponse(r);
      if (tabId === 'yearly') return isYearlyResponse(r);
      return true;
    });

    if (responsesInTab.length > 0) {
      const sample = responsesInTab[0];
      const range = getEvaluationDateRange(sample);
      if (range.startDate) {
        const pad = (n: number) => String(n).padStart(2, '0');
        const mNum = range.startDate.getMonth() + 1;
        const qNum = mNum >= 4 && mNum <= 6 ? 1 : mNum >= 7 && mNum <= 9 ? 2 : mNum >= 10 && mNum <= 12 ? 3 : 4;
        setReportDateInPeriod(`${range.startDate.getFullYear()}-${pad(range.startDate.getMonth() + 1)}-${pad(range.startDate.getDate())}`);
        setSelectedReportMonthKey(`${range.startDate.getFullYear()}-${pad(range.startDate.getMonth() + 1)}`);
        setSelectedReportQuarterKey(`${range.startDate.getFullYear()}-Q${qNum}`);
        setSelectedReportYearKey(`${range.startDate.getFullYear()}`);
        setReportFilterDate('all');
      }
    }
  };

  // Pastel header colors for Team headers inside Top Performers card (matching reference UI)
  const getTeamHeaderColor = (name: string) => {
    const palettes = [
      { bg: 'bg-[#f3edf5]', text: 'text-[#5e2b6b]', sub: 'text-[#7a3b8c]', border: 'border-[#e3d7e7]' },
      { bg: 'bg-[#eef5ee]', text: 'text-[#2c592e]', sub: 'text-[#38733b]', border: 'border-[#d7e7d7]' },
      { bg: 'bg-[#edf4fb]', text: 'text-[#245480]', sub: 'text-[#2e689e]', border: 'border-[#d4e4f5]' },
      { bg: 'bg-[#fdf0f4]', text: 'text-[#8c2e4f]', sub: 'text-[#ab3b63]', border: 'border-[#f7d6e1]' },
      { bg: 'bg-[#fcf7ee]', text: 'text-[#7a5214]', sub: 'text-[#96651d]', border: 'border-[#f2e5cf]' },
      { bg: 'bg-[#f0f9f8]', text: 'text-[#165a54]', sub: 'text-[#1d756d]', border: 'border-[#d3ece9]' }
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
    return palettes[Math.abs(hash) % palettes.length];
  };

  // Top Performers Active Year & Quarter Info
  const [topPerfYearStr, topPerfMonthStr] = (selectedReportMonthKey || reportDateInPeriod || '').split('-');
  const topPerformersYear = parseInt(topPerfYearStr, 10) || new Date().getFullYear();
  const topPerformersMonth = parseInt(topPerfMonthStr, 10) ? parseInt(topPerfMonthStr, 10) - 1 : new Date().getMonth();
  const topPerformersMonth1Indexed = topPerformersMonth + 1;
  const topPerformersQ = topPerformersMonth1Indexed >= 4 && topPerformersMonth1Indexed <= 6 ? 1 : topPerformersMonth1Indexed >= 7 && topPerformersMonth1Indexed <= 9 ? 2 : topPerformersMonth1Indexed >= 10 && topPerformersMonth1Indexed <= 12 ? 3 : 4;
  const topPerformersFiscalYear = topPerformersMonth1Indexed >= 4 ? topPerformersYear : topPerformersYear - 1;

  const topPerformersQuarterRangeText = useMemo(() => {
    if (topPerformersQ === 1) return `1 Apr - 30 Jun ${topPerformersFiscalYear}`;
    if (topPerformersQ === 2) return `1 Jul - 30 Sep ${topPerformersFiscalYear}`;
    if (topPerformersQ === 3) return `1 Oct - 31 Dec ${topPerformersFiscalYear}`;
    return `1 Jan - 31 Mar ${topPerformersFiscalYear + 1}`;
  }, [topPerformersQ, topPerformersFiscalYear]);

  // Helper to deduplicate employees and compute their average score for a given set of evaluation responses (converting weekly cycles to monthly/quarterly averages)
  const computeTopPerformersGroups = (
    responses: typeof activeScopedResponsesForCards,
    filterDept: string,
    filterTeam: string,
    searchQ: string
  ) => {
    let filtered = responses;
    if (filterDept !== 'all') {
      filtered = filtered.filter(r => {
        const { departmentName, empInDb } = getEmployeeDisplayInfo(r);
        return (empInDb?.department || departmentName || '').toLowerCase().trim() === filterDept.toLowerCase().trim();
      });
    }
    if (filterTeam !== 'all') {
      filtered = filtered.filter(r => {
        const { teamName, empInDb } = getEmployeeDisplayInfo(r);
        return (empInDb?.team || teamName || '').toLowerCase().trim() === filterTeam.toLowerCase().trim();
      });
    }
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase().trim();
      filtered = filtered.filter(r => {
        const { employeeCode, employeeName, teamName, departmentName } = getEmployeeDisplayInfo(r);
        return (
          (employeeName || '').toLowerCase().includes(q) ||
          String(employeeCode).toLowerCase().includes(q) ||
          teamName.toLowerCase().includes(q) ||
          departmentName.toLowerCase().includes(q)
        );
      });
    }

    // Map unique employee to their array of scores across cycles in this period
    const empMap = new Map<string, { employeeName: string; employeeCode: string; departmentName: string; teamName: string; scores: number[] }>();

    filtered.forEach(r => {
      const { employeeName, employeeCode, departmentName, teamName } = getEmployeeDisplayInfo(r);
      const scoreVal = r.managerScore != null
        ? Number(r.managerScore)
        : ((r as any).manager_score != null
          ? Number((r as any).manager_score)
          : (r.employeeOverallScore != null ? Number(r.employeeOverallScore) : null));

      if (scoreVal == null || scoreVal <= 0) return;

      const empKey = `${employeeCode || employeeName}`;
      if (!empMap.has(empKey)) {
        empMap.set(empKey, { employeeName, employeeCode, departmentName, teamName, scores: [] });
      }
      empMap.get(empKey)!.scores.push(scoreVal);
    });

    // Group unique employees by Department and Team with calculated average score
    const teamMap = new Map<string, { departmentName: string; teamName: string; managerName: string; members: Array<{ name: string; code: string; score: number; rank: number }> }>();

    empMap.forEach(emp => {
      const avgScore = emp.scores.reduce((a, b) => a + b, 0) / emp.scores.length;
      const key = `${emp.departmentName}___${emp.teamName}`;
      if (!teamMap.has(key)) {
        // Find manager for this team
        const matchingDbTeam = dbTeams.find(t =>
          t.name?.toLowerCase() === emp.teamName.toLowerCase() ||
          String(t.id) === emp.teamName.toLowerCase()
        );
        const resolvedMgr = matchingDbTeam?.manager_name || matchingDbTeam?.manager || matchingDbTeam?.lead || matchingDbTeam?.reporting_manager || '';
        teamMap.set(key, { departmentName: emp.departmentName, teamName: emp.teamName, managerName: resolvedMgr, members: [] });
      }
      teamMap.get(key)!.members.push({
        name: emp.employeeName,
        code: emp.employeeCode,
        score: avgScore,
        rank: 1
      });
    });

    // Sort team members by average score descending and assign rank
    return Array.from(teamMap.values()).map(g => {
      const sorted = [...g.members].sort((a, b) => b.score - a.score);
      sorted.forEach((m, idx) => { m.rank = idx + 1; });
      return {
        departmentName: g.departmentName,
        teamName: g.teamName,
        managerName: g.managerName,
        members: sorted
      };
    });
  };

  // Top Performers — Weekly (All weeks of the active month + Month Summary Column)
  const topPerformersWeeklyColumns = useMemo(() => {
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (n: number) => String(n).padStart(2, '0');

    // Filter responses for the active month (including approved monthly records from 12-Month Financial Year cycles)
    const curMonthResponses: any[] = [];
    activeScopedResponsesForCards.forEach(r => {
      if (isYearlyResponse(r)) {
        const calMonth = topPerformersMonth + 1;
        const calYear = topPerformersYear;
        const rec = (r.monthly_records || []).find(m =>
          (m.calendarMonth === calMonth && (m.calendarYear === calYear || !m.calendarYear)) ||
          (m.monthIndex === (calMonth >= 4 ? calMonth - 3 : calMonth + 9))
        );
        if (rec && rec.status === 'manager_approved' && rec.managerScore != null && Number(rec.managerScore) > 0) {
          curMonthResponses.push({
            ...r,
            managerScore: Number(rec.managerScore)
          });
        }
        return;
      }

      const range = getEvaluationDateRange(r);
      if (!range.startDate) return;
      if (range.startDate.getFullYear() === topPerformersYear && range.startDate.getMonth() === topPerformersMonth) {
        curMonthResponses.push(r);
      }
    });

    const firstDate = new Date(topPerformersYear, topPerformersMonth, 1);
    const lastDate = new Date(topPerformersYear, topPerformersMonth + 1, 0);

    const dayOfWeek = firstDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    let currMon = new Date(topPerformersYear, topPerformersMonth, 1 + diffToMonday);

    const now = new Date();
    const isCurrentMonthNow = now.getFullYear() === topPerformersYear && now.getMonth() === topPerformersMonth;

    const weekCols: Array<{
      key: string;
      label: string;
      subLabel?: string;
      isSummaryYear: boolean;
      totalEvaluations: number;
      groups: Array<{
        departmentName: string;
        teamName: string;
        members: Array<{ name: string; code: string; score: number; rank: number }>;
      }>;
    }> = [];

    let weekNum = 1;
    while (currMon <= lastDate) {
      const currSun = new Date(currMon.getFullYear(), currMon.getMonth(), currMon.getDate() + 6);
      const startStr = `${currMon.getFullYear()}-${pad(currMon.getMonth() + 1)}-${pad(currMon.getDate())}`;
      const isCurrentWeek = isCurrentMonthNow && now >= currMon && now <= currSun;

      // Filter all responses falling in this week
      const weekResponses = curMonthResponses.filter(r => {
        const range = getEvaluationDateRange(r);
        if (!range.startDate) return false;
        const rStart = range.startDate;
        const rEnd = range.endDate || range.startDate;
        return (rStart >= currMon && rStart <= currSun) || (rEnd >= currMon && rEnd <= currSun);
      });

      const groups = computeTopPerformersGroups(weekResponses, reportFilterDept, reportFilterTeam, mgrSearchQuery);
      const weekLabel = `${currMon.getDate()} ${monthNamesShort[currMon.getMonth()]} - ${currSun.getDate()} ${monthNamesShort[currSun.getMonth()]}`;

      weekCols.push({
        key: `week_${startStr}`,
        label: `W${weekNum}: ${weekLabel}`,
        subLabel: undefined,
        isSummaryYear: isCurrentWeek,
        totalEvaluations: weekResponses.length,
        groups
      });

      weekNum++;
      currMon = new Date(currMon.getFullYear(), currMon.getMonth(), currMon.getDate() + 7);
    }

    // Month Summary Column (e.g. Sep'26 (month))
    const yearShort = String(topPerformersYear).slice(-2);
    const monthGroups = computeTopPerformersGroups(curMonthResponses, reportFilterDept, reportFilterTeam, mgrSearchQuery);
    const monthSummaryCol = {
      key: `week_month_summary_${topPerformersYear}_${topPerformersMonth}`,
      label: `${monthNamesShort[topPerformersMonth]}'${yearShort} (month)`,
      subLabel: undefined,
      isSummaryYear: !weekCols.some(w => w.isSummaryYear),
      totalEvaluations: curMonthResponses.length,
      groups: monthGroups
    };

    return [...weekCols, monthSummaryCol];
  }, [activeScopedResponsesForCards, topPerformersYear, topPerformersMonth, reportFilterDept, reportFilterTeam, mgrSearchQuery]);

  // Top Performers — Monthly multi-column data (All 12 Months of the Financial Year: Apr - Mar)
  const topPerformersMonthlyColumns = useMemo(() => {
    const startYear = topPerformersFiscalYear;
    const endYear = topPerformersFiscalYear + 1;
    const startYearShort = String(startYear).slice(-2);
    const endYearShort = String(endYear).slice(-2);

    return FISCAL_MONTHS.map(fMonth => {
      const calYear = fMonth.calendarMonth >= 4 ? startYear : endYear;
      const yrShort = fMonth.calendarMonth >= 4 ? startYearShort : endYearShort;
      const monthLabel = `${fMonth.shortName}'${yrShort}`;
      const mIdx = fMonth.calendarMonth - 1;

      const monthScopedItems: any[] = [];
      activeScopedResponsesForCards.forEach(r => {
        if (isYearlyResponse(r)) {
          const rec = (r.monthly_records || []).find(m =>
            m.monthIndex === fMonth.monthIndex ||
            (m.calendarMonth === fMonth.calendarMonth && (m.calendarYear === calYear || !m.calendarYear))
          );
          if (rec && rec.status === 'manager_approved' && rec.managerScore != null && Number(rec.managerScore) > 0) {
            monthScopedItems.push({
              ...r,
              managerScore: Number(rec.managerScore)
            });
          }
          return;
        }

        const range = getEvaluationDateRange(r);
        if (!range.startDate) return;
        if (range.startDate.getFullYear() === calYear && range.startDate.getMonth() === mIdx) {
          if (r.managerScore != null || r.employeeOverallScore != null) {
            monthScopedItems.push(r);
          }
        }
      });

      const groups = computeTopPerformersGroups(monthScopedItems, reportFilterDept, reportFilterTeam, mgrSearchQuery);
      const isCurrentActiveMonth = fMonth.calendarMonth === (topPerformersMonth + 1);

      return {
        key: `month_${fMonth.monthIndex}`,
        label: monthLabel,
        subLabel: undefined as string | undefined,
        isSummaryYear: isCurrentActiveMonth,
        totalEvaluations: monthScopedItems.length,
        groups
      };
    });
  }, [activeScopedResponsesForCards, topPerformersMonth, topPerformersFiscalYear, reportFilterDept, reportFilterTeam, mgrSearchQuery]);

  // Top Performers — Quarterly (Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar of the Financial Year)
  const topPerformersQuarterlyColumns = useMemo(() => {
    const quarters = [
      { q: 1, label: `Q1 ${topPerformersFiscalYear}`, subLabel: 'Apr - Jun', fiscalMonthIndices: [1, 2, 3], calMonths: [4, 5, 6], year: topPerformersFiscalYear },
      { q: 2, label: `Q2 ${topPerformersFiscalYear}`, subLabel: 'Jul - Sep', fiscalMonthIndices: [4, 5, 6], calMonths: [7, 8, 9], year: topPerformersFiscalYear },
      { q: 3, label: `Q3 ${topPerformersFiscalYear}`, subLabel: 'Oct - Dec', fiscalMonthIndices: [7, 8, 9], calMonths: [10, 11, 12], year: topPerformersFiscalYear },
      { q: 4, label: `Q4 ${topPerformersFiscalYear + 1}`, subLabel: 'Jan - Mar', fiscalMonthIndices: [10, 11, 12], calMonths: [1, 2, 3], year: topPerformersFiscalYear + 1 },
    ];

    return quarters.map(({ q, label, subLabel, fiscalMonthIndices, calMonths, year }) => {
      const quarterScopedItems: any[] = [];

      activeScopedResponsesForCards.forEach(r => {
        if (isYearlyResponse(r)) {
          const qApprovedRecords = (r.monthly_records || []).filter(
            m => fiscalMonthIndices.includes(m.monthIndex) && m.status === 'manager_approved' && m.managerScore != null && Number(m.managerScore) > 0
          );
          if (qApprovedRecords.length > 0) {
            const avgScore = qApprovedRecords.reduce((sum, m) => sum + Number(m.managerScore), 0) / qApprovedRecords.length;
            quarterScopedItems.push({
              ...r,
              managerScore: Number(avgScore.toFixed(1))
            });
          }
          return;
        }

        const range = getEvaluationDateRange(r);
        if (!range.startDate) return;
        const mNum = range.startDate.getMonth() + 1;
        const rYear = range.startDate.getFullYear();
        if (rYear === year && calMonths.includes(mNum)) {
          if (r.managerScore != null || r.employeeOverallScore != null) {
            quarterScopedItems.push(r);
          }
        }
      });

      const quarterGroups = computeTopPerformersGroups(quarterScopedItems, reportFilterDept, reportFilterTeam, mgrSearchQuery);

      return {
        key: `quarter_col_Q${q}`,
        label,
        subLabel,
        isSummaryYear: q === topPerformersQ,
        totalEvaluations: quarterScopedItems.length,
        groups: quarterGroups
      };
    });
  }, [activeScopedResponsesForCards, topPerformersQ, topPerformersFiscalYear, reportFilterDept, reportFilterTeam, mgrSearchQuery]);

  // Top Performers — Annual (12 Fiscal Months: Apr'26 - Mar'27 + FY 2026-2027 Summary Column)
  const topPerformersAnnualColumns = useMemo(() => {
    const startYear = topPerformersFiscalYear;
    const endYear = topPerformersFiscalYear + 1;
    const startYearShort = String(startYear).slice(-2);
    const endYearShort = String(endYear).slice(-2);

    const months = FISCAL_MONTHS.map(fMonth => {
      const calYear = fMonth.calendarMonth >= 4 ? startYear : endYear;
      const yrShort = fMonth.calendarMonth >= 4 ? startYearShort : endYearShort;
      const monthLabel = `${fMonth.shortName}'${yrShort}`;
      const mIdx = fMonth.calendarMonth - 1;

      const monthScopedItems: any[] = [];

      activeScopedResponsesForCards.forEach(r => {
        // 1. Check if yearly response with monthly_records
        if (isYearlyResponse(r)) {
          const rec = (r.monthly_records || []).find(m =>
            m.monthIndex === fMonth.monthIndex ||
            (m.calendarMonth === fMonth.calendarMonth && (m.calendarYear === calYear || !m.calendarYear))
          );
          if (rec && rec.status === 'manager_approved' && rec.managerScore != null && Number(rec.managerScore) > 0) {
            monthScopedItems.push({
              ...r,
              managerScore: Number(rec.managerScore)
            });
          }
          return;
        }

        // 2. Standalone monthly or other evaluations falling in this calendar month and year
        const range = getEvaluationDateRange(r);
        if (!range.startDate) return;
        if (range.startDate.getFullYear() === calYear && range.startDate.getMonth() === mIdx) {
          if (r.managerScore != null || r.employeeOverallScore != null) {
            monthScopedItems.push(r);
          }
        }
      });

      const groups = computeTopPerformersGroups(monthScopedItems, reportFilterDept, reportFilterTeam, mgrSearchQuery);

      return {
        key: `annual_fiscal_month_${fMonth.monthIndex}`,
        label: monthLabel,
        subLabel: undefined as string | undefined,
        isSummaryYear: false,
        totalEvaluations: monthScopedItems.length,
        groups
      };
    });

    // 13th Column: Overall Financial Year Summary (e.g. FY 2026-2027 (Annual))
    const yearScopedItems: any[] = [];

    activeScopedResponsesForCards.forEach(r => {
      if (isYearlyResponse(r)) {
        const approvedRecords = (r.monthly_records || []).filter(
          m => m.status === 'manager_approved' && m.managerScore != null && Number(m.managerScore) > 0
        );
        if (approvedRecords.length > 0) {
          const avgScore = approvedRecords.reduce((sum, m) => sum + Number(m.managerScore), 0) / approvedRecords.length;
          yearScopedItems.push({
            ...r,
            managerScore: Number(avgScore.toFixed(1))
          });
        } else if (r.managerScore != null && Number(r.managerScore) > 0) {
          yearScopedItems.push(r);
        }
        return;
      }

      // Standalone evaluations falling between 1 Apr startYear and 31 Mar endYear
      const range = getEvaluationDateRange(r);
      if (!range.startDate) return;
      const d = range.startDate;
      const fyStart = new Date(startYear, 3, 1); // 1 Apr
      const fyEnd = new Date(endYear, 2, 31, 23, 59, 59); // 31 Mar
      if (d >= fyStart && d <= fyEnd) {
        if (r.managerScore != null || r.employeeOverallScore != null) {
          yearScopedItems.push(r);
        }
      }
    });

    const yearGroups = computeTopPerformersGroups(yearScopedItems, reportFilterDept, reportFilterTeam, mgrSearchQuery);

    const yearColumn = {
      key: `annual_summary_${startYear}_${endYear}`,
      label: `FY ${startYear}-${endYear} (Annual)`,
      subLabel: undefined as string | undefined,
      isSummaryYear: true,
      totalEvaluations: yearScopedItems.length,
      groups: yearGroups
    };

    return [...months, yearColumn];
  }, [activeScopedResponsesForCards, topPerformersFiscalYear, reportFilterDept, reportFilterTeam, mgrSearchQuery]);

  const reportTabs = [
    { id: 'all', label: 'All', count: frequencyCounts.all, pending: frequencyCounts.allPending, completed: frequencyCounts.allCompleted },
    { id: 'daily', label: 'Daily', count: frequencyCounts.daily, pending: frequencyCounts.dailyPending, completed: frequencyCounts.dailyCompleted },
    { id: 'weekly', label: 'Weekly', count: frequencyCounts.weekly, pending: frequencyCounts.weeklyPending, completed: frequencyCounts.weeklyCompleted },
    { id: 'monthly', label: 'Monthly', count: frequencyCounts.monthly, pending: frequencyCounts.monthlyPending, completed: frequencyCounts.monthlyCompleted },
    { id: 'quarterly', label: 'Quarterly', count: frequencyCounts.quarterly, pending: frequencyCounts.quarterlyPending, completed: frequencyCounts.quarterlyCompleted },
    { id: 'yearly', label: 'Yearly', count: frequencyCounts.yearly, pending: frequencyCounts.yearlyPending, completed: frequencyCounts.yearlyCompleted },
  ];

  // Direct Excel Export using XLSX from database data
  const handleDownloadExcel = () => {
    if (reportFilteredResponses.length === 0) {
      alert('No evaluation records to export.');
      return;
    }

    const dataToExport = reportFilteredResponses.map((r, index) => {
      const { employeeCode, employeeName, teamName, departmentName, empInDb } = getEmployeeDisplayInfo(r);
      const isCalibrated = r.managerScore != null;
      const selfScoreNum = r.employeeOverallScore != null
        ? Number(r.employeeOverallScore)
        : ((r as any).earned_score != null && !isNaN(Number((r as any).earned_score)) ? Number((r as any).earned_score) : null);
      const mgrScoreNum = r.managerScore != null
        ? Number(r.managerScore)
        : ((r as any).manager_score != null && !isNaN(Number((r as any).manager_score)) ? Number((r as any).manager_score) : null);

      return {
        'S.No': index + 1,
        'Department': departmentName,
        'Team': teamName,
        'Employee Code': employeeCode,
        'Employee Name': employeeName,
        'Designation': r.designation || empInDb?.designation || empInDb?.job_title || 'Team Member',
        'Evaluation Period': r.periodName || (r as any).form || r.frequency || 'Performance Evaluation',
        'Employee Self Score': selfScoreNum != null && selfScoreNum > 0 ? `${selfScoreNum.toFixed(1)}%` : '—',
        'Manager / Calibrated Score': mgrScoreNum != null ? `${mgrScoreNum.toFixed(1)}%` : '—',
        'Status': isCalibrated ? 'Calibrated & Approved' : ((r.status === 'manager_review' || (r.status as string) === 'Submitted to Manager') ? 'Submitted to Manager' : 'Pending Review')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Evaluations');
    XLSX.writeFile(workbook, `Evaluation_Report_${reportViewTab}_${reportDateInPeriod}.xlsx`);
  };

  // Helper to group manager responses for any frequency by employee and strictly by calendar week (Monday to Sunday) for daily
  const buildGroupedByEmployee = (filterFn: (r: EvaluationResponse) => boolean) => {
    const map = new Map<string, {
      employeeId: string;
      employeeName: string;
      employeeCode: string;
      teamName: string;
      weekLabel?: string;
      weekStart?: string;
      weekEnd?: string;
      records: EvaluationResponse[];
    }>();

    activeScopedResponsesForCards.forEach(r => {
      if (!filterFn(r)) return;
      const { employeeCode, employeeName, teamName } = getEmployeeDisplayInfo(r);
      const empId = String(r.employeeId || employeeCode || employeeName);

      // For daily evaluations, group strictly by Monday-to-Sunday week
      let groupKey = empId;
      let weekInfo: ReturnType<typeof getMondayToSundayWeek> | null = null;
      if (isDailyResponse(r)) {
        const d = getResponseDate(r) || new Date();
        weekInfo = getMondayToSundayWeek(d);
        groupKey = `${empId}_week_${weekInfo.weekKey}`;
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          employeeId: empId,
          employeeName: employeeName || r.employeeName,
          employeeCode: employeeCode || '',
          teamName: teamName || '',
          weekLabel: weekInfo ? weekInfo.label : undefined,
          weekStart: weekInfo ? weekInfo.startStr : undefined,
          weekEnd: weekInfo ? weekInfo.endStr : undefined,
          records: []
        });
      }
      map.get(groupKey)!.records.push(r);
    });

    return Array.from(map.values()).map(group => {
      const validScores = group.records
        .map(r => Number(r.employeeOverallScore))
        .filter(s => !isNaN(s) && s > 0);
      const avgScore = validScores.length > 0
        ? Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2))
        : 0;

      const validMgrScores = group.records
        .map(r => r.managerScore != null ? Number(r.managerScore) : null)
        .filter((s): s is number => s !== null && !isNaN(s) && s > 0);
      const avgMgrScore = validMgrScores.length > 0
        ? Number((validMgrScores.reduce((a, b) => a + b, 0) / validMgrScores.length).toFixed(2))
        : null;

      return {
        ...group,
        avgScore,
        avgMgrScore,
        count: group.records.length
      };
    });
  };

  const allDailyGroupsForManager = useMemo(() => buildGroupedByEmployee(isDailyResponse), [activeScopedResponsesForCards]);
  const allWeeklyGroupsForManager = useMemo(() => buildGroupedByEmployee(isWeeklyResponse), [activeScopedResponsesForCards]);
  const allMonthlyGroupsForManager = useMemo(() => buildGroupedByEmployee(isMonthlyResponse), [activeScopedResponsesForCards]);
  const allQuarterlyGroupsForManager = useMemo(() => buildGroupedByEmployee(isQuarterlyResponse), [activeScopedResponsesForCards]);

  // Total convertible records available across all frequencies
  const totalConvertibleCount = useMemo(() => {
    return allDailyGroupsForManager.reduce((acc, g) => acc + g.count, 0) +
      allWeeklyGroupsForManager.reduce((acc, g) => acc + g.count, 0) +
      allMonthlyGroupsForManager.reduce((acc, g) => acc + g.count, 0) +
      allQuarterlyGroupsForManager.reduce((acc, g) => acc + g.count, 0);
  }, [allDailyGroupsForManager, allWeeklyGroupsForManager, allMonthlyGroupsForManager, allQuarterlyGroupsForManager]);

  const dailyGroupsByEmployee = allDailyGroupsForManager;

  const handleOpenConvertModal = (
    tierOrTarget?: RollupTier | {
      employeeId: string;
      employeeName: string;
      employeeCode: string;
      teamName: string;
      weekLabel?: string;
      weekStart?: string;
      weekEnd?: string;
      records: EvaluationResponse[];
      avgScore: number;
      avgMgrScore: number | null;
      count: number;
    },
    target?: {
      employeeId: string;
      employeeName: string;
      employeeCode: string;
      teamName: string;
      weekLabel?: string;
      weekStart?: string;
      weekEnd?: string;
      records: EvaluationResponse[];
      avgScore: number;
      avgMgrScore: number | null;
      count: number;
    }
  ) => {
    let chosenTier: RollupTier = activeRollupTier;
    let chosenTarget = target;

    if (typeof tierOrTarget === 'string') {
      chosenTier = tierOrTarget as RollupTier;
    } else if (tierOrTarget && typeof tierOrTarget === 'object') {
      chosenTarget = tierOrTarget;
      // Auto-detect tier from target record frequency
      const firstRec = chosenTarget.records?.[0];
      if (firstRec) {
        if (isDailyResponse(firstRec)) chosenTier = 'daily_to_weekly';
        else if (isWeeklyResponse(firstRec)) chosenTier = 'weekly_to_monthly';
        else if (isMonthlyResponse(firstRec)) chosenTier = 'monthly_to_quarterly';
        else if (isQuarterlyResponse(firstRec)) chosenTier = 'quarterly_to_yearly';
      }
    }

    if (!tierOrTarget) {
      if (allDailyGroupsForManager.length > 0) chosenTier = 'daily_to_weekly';
      else if (allWeeklyGroupsForManager.length > 0) chosenTier = 'weekly_to_monthly';
      else if (allMonthlyGroupsForManager.length > 0) chosenTier = 'monthly_to_quarterly';
      else if (allQuarterlyGroupsForManager.length > 0) chosenTier = 'quarterly_to_yearly';
    }
    setActiveRollupTier(chosenTier);

    if (!chosenTarget) {
      const groups = chosenTier === 'daily_to_weekly' ? allDailyGroupsForManager :
        chosenTier === 'weekly_to_monthly' ? allWeeklyGroupsForManager :
          chosenTier === 'monthly_to_quarterly' ? allMonthlyGroupsForManager : allQuarterlyGroupsForManager;
      if (groups.length > 0) chosenTarget = groups[0];
    }
    setConvertingTarget(chosenTarget || null);
    setIsConvertModalOpen(true);
  };

  const handleConfirmConvert = async () => {
    if (!convertingTarget) return;
    try {
      setIsConverting(true);
      const recordIds = convertingTarget.records.map(r => r.id);

      let fromF: 'daily' | 'weekly' | 'monthly' | 'quarterly' = 'daily';
      let toF: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'weekly';

      if (activeRollupTier === 'daily_to_weekly') {
        fromF = 'daily'; toF = 'weekly';
      } else if (activeRollupTier === 'weekly_to_monthly') {
        fromF = 'weekly'; toF = 'monthly';
      } else if (activeRollupTier === 'monthly_to_quarterly') {
        fromF = 'monthly'; toF = 'quarterly';
      } else if (activeRollupTier === 'quarterly_to_yearly') {
        fromF = 'quarterly'; toF = 'yearly';
      }

      const res = await evaluationService.convertEvaluations({
        employeeId: convertingTarget.employeeId,
        fromFrequency: fromF,
        toFrequency: toF,
        recordIds
      });

      showToast(res.message || `Successfully rolled up ${convertingTarget.count} ${fromF} evaluation(s) into ${toF} record!`);
      setIsConvertModalOpen(false);
      setConvertingTarget(null);
      await loadAllData();
    } catch (err: any) {
      showAlert(err.message || 'Failed to convert evaluations', 'Conversion Error', 'danger');
    } finally {
      setIsConverting(false);
    }
  };

  const handleConfirmConvertWeekly = handleConfirmConvert;


  // 4. Employee Submit to Manager
  const handleEmployeeSubmit = async () => {
    if (isEmpSubmitted) {
      showAlert('Your self-assessment has already been submitted to your manager and is locked.', 'Already Submitted');
      return;
    }
    if (isSubmittingEmp) return;

    // Validate that Self Remarks are filled for deliverable rows where performance is High or Low
    const missingRemarksKpi: string[] = [];
    const payloadKpiInputs: Record<string, KPIResponseItem> = { ...kpiInputs };

    activeCategories.forEach(cat => {
      cat.kpis.forEach(k => {
        const item = getKpiResponseItem(k);
        const inputItem = kpiInputs[k.id] || (k.name ? kpiInputs[k.name] : null);
        const val = inputItem?.actualValue !== undefined && inputItem?.actualValue !== null && inputItem?.actualValue !== ''
          ? inputItem.actualValue
          : (item?.actualValue !== undefined && item?.actualValue !== null ? item.actualValue : '');
        const rem = ((inputItem?.employeeRemarks !== undefined && inputItem?.employeeRemarks !== null ? inputItem.employeeRemarks : item?.employeeRemarks) || '').trim();

        const isInsufficient = inputItem?.isInsufficient !== undefined && inputItem?.isInsufficient !== null
          ? Boolean(inputItem.isInsufficient)
          : Boolean(item?.isInsufficient);

        const isMandatory = isKpiRemarkMandatory(k, val, isInsufficient);
        if (isMandatory && !rem) {
          missingRemarksKpi.push(`"${k.name}"`);
        }

        const resolvedItem: KPIResponseItem = {
          ...(item || {}),
          ...(inputItem || {}),
          kpiId: k.id,
          name: k.name,
          actualValue: val,
          achievementPercentage: inputItem?.achievementPercentage ?? item?.achievementPercentage ?? calculateKPIScore(k, val).achievementPercentage,
          earnedScore: inputItem?.earnedScore ?? item?.earnedScore ?? calculateKPIScore(k, val).earnedScore,
          employeeRemarks: rem,
          isInsufficient
        };

        payloadKpiInputs[k.id] = resolvedItem;
        if (k.name) payloadKpiInputs[k.name] = resolvedItem;
      });
    });

    if (missingRemarksKpi.length > 0) {
      showAlert(
        `Remarks are mandatory for deliverables that are higher/lower than target or selected. Please provide remarks for: ${missingRemarksKpi.join(', ')}`,
        'Remarks Required',
        'warning'
      );
      return;
    }

    const aggregatedRemarks = Object.values(payloadKpiInputs)
      .map(i => i.employeeRemarks?.trim())
      .filter(Boolean)
      .join('; ') || 'Completed self-assessment deliverables';

    const targetResponse = activeEmpResponse || responses.find(isResponseForUser);

    if (targetResponse) {
      showConfirm(
        'Submit your self-assessment to Manager?',
        async () => {
          try {
            setIsSubmittingEmp(true);
            const updatedResp = await evaluationService.submitEmployeeEvaluation(targetResponse.id, payloadKpiInputs, aggregatedRemarks);
            setResponses(prev => prev.map(r => r.id === targetResponse.id ? updatedResp : r));
            setSelectedResponseId(updatedResp.id);
            try {
              localStorage.removeItem(userDraftKey);
            } catch (e) { }
            await loadAllData();
            showToast('Self-assessment successfully submitted to Manager!');
          } catch (err: any) {
            showAlert(`Failed to submit evaluation: ${err?.message || 'Unknown error'}`, 'Submission Error');
          } finally {
            setIsSubmittingEmp(false);
          }
        },
        'Submit Evaluation',
        'info',
        'Submit to Manager'
      );
      return;
    }

    showConfirm(
      'Submit your self-assessment to Manager?',
      async () => {
        try {
          setIsSubmittingEmp(true);
          const cycleToUse = activeCycle || cycles[0] || {
            id: `cycle_${Date.now()}`,
            name: `Q${currentQuarter} Performance Evaluation`,
            teamId: effectiveTeamId || 'team_general',
            teamName: effectiveTeamName || 'Direct Reports',
            status: 'active',
            periodName: `Q${currentQuarter} ${currentYear} (${quarterLabel})`,
            startDate: startDate,
            endDate: endDate,
            categories: activeCategories,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          if (!cycles.some(c => c.id === cycleToUse.id)) {
            await evaluationService.saveCycles([cycleToUse, ...cycles]);
          }

          const currentEmpName = user?.full_name || `${userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim() || userAny?.name || 'Employee';
          const currentEmpCode = String(userAny?.employee_id || currentDbUser?.employee_id || user?.id || 'EMP001');

          const targetRespId = (activeEmpResponse as any)?.id || `resp_${Date.now()}_${user?.id || 'emp'}`;
          const newResp: EvaluationResponse = {
            id: targetRespId,
            cycleId: cycleToUse.id,
            teamId: cycleToUse.teamId,
            department: cycleToUse.teamName,
            form: (cycleToUse as any).form || cycleToUse.name || 'Performance Evaluation',
            periodName: cycleToUse.periodName || cycleToUse.name || '',
            description: cycleToUse.description || '',
            employeeId: String(userAny?.employee_id || currentDbUser?.employee_id || user?.id || 'emp_1'),
            employeeName: currentEmpName,
            employeeCode: currentEmpCode,
            designation: userAny?.designation || currentDbUser?.designation || 'Team Member',
            status: 'manager_review',
            categories: activeCategories,
            kpiResponses: payloadKpiInputs,
            employeeOverallScore: liveEmployeeScore.overallScore,
            employeeRemarks: aggregatedRemarks,
            employeeSubmittedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          const updatedResponses = [newResp, ...responses.filter(r => r.id !== newResp.id)];
          await evaluationService.saveResponses(updatedResponses);
          setResponses(updatedResponses);
          setSelectedResponseId(newResp.id);
          try {
            localStorage.removeItem(userDraftKey);
          } catch (e) { }
          await loadAllData();
          showToast('Self-assessment successfully submitted to Manager!');
        } catch (err: any) {
          showAlert(`Failed to submit evaluation: ${err?.message || 'Unknown error'}`, 'Submission Error');
        } finally {
          setIsSubmittingEmp(false);
        }
      },
      'Submit Evaluation',
      'info',
      'Submit to Manager'
    );
  };

  // Manager Review Selection & Row Handlers
  const handleSelectMgrResponse = (r: EvaluationResponse) => {
    setSelectedMgrResponseId(r.id);
    const initialActuals: Record<string, string | number> = {};
    const initialRemarks: Record<string, string> = {};

    const isPendingReview = (r.status as string) === 'manager_review' ||
      (r.status as string) === 'Submitted to Manager' ||
      String(r.status || '').toLowerCase().includes('submitted') ||
      r.managerScore == null;

    const targetCycle = cycles.find(c => c.id === r.cycleId) || activeManagerCycle;
    let targetCats: KPICategory[] = (
      (r as any).categories?.length > 0
        ? (r as any).categories
        : (r as any).metrics_data?.length > 0 && Array.isArray((r as any).metrics_data)
          ? (r as any).metrics_data
          : (targetCycle?.categories && targetCycle.categories.length > 0)
            ? targetCycle.categories
            : managerTeamCategories
    );
    if (!targetCats || targetCats.length === 0) {
      const mData = (r as any).metrics_data || r.kpiResponses;
      if (mData && typeof mData === 'object' && !Array.isArray(mData)) {
        const kpisList: KPIItem[] = [];
        const seenIds = new Set<string>();
        Object.entries(mData).forEach(([key, val]: [string, any]) => {
          if (!val || typeof val !== 'object') return;
          const kId = val.kpiId || val.id || key;
          if (seenIds.has(kId)) return;
          seenIds.add(kId);
          kpisList.push({
            id: kId,
            name: val.name || key,
            description: val.description || '',
            targetScore: val.targetScore || 100,
            weightage: val.weightage || 100,
            targetFromManager: val.targetFromManager || val.targetValue || '100%',
            targetValue: val.targetValue || 100,
            unit: val.unit || '%',
            scoringDirection: (val.scoringDirection || 'higher_is_better') as any,
            measurementType: (val.measurementType || 'numerical') as any,
            isRequired: true
          });
        });
        if (kpisList.length > 0) {
          targetCats = [{
            id: 'cat_deliverables',
            name: (r as any).form || r.periodName || 'Performance Deliverables',
            description: 'Deliverables evaluation items',
            weightage: 100,
            kpis: kpisList
          }];
        }
      }
    }
    if (!targetCats || targetCats.length === 0) {
      targetCats = DEFAULT_KPI_CATEGORIES;
    }

    if (isYearlyResponse(r)) {
      const curYearlyRecords = r.monthly_records || [];
      const submittedMonth = curYearlyRecords.find(m => m.status === 'submitted_to_manager');
      const firstActionableMonth = FISCAL_MONTHS.slice(5).find(m => {
        const lockInfo = getYearlyMonthLockInfo(m.monthIndex, curYearlyRecords);
        return lockInfo.isEditable || lockInfo.isSubmitted;
      }) || FISCAL_MONTHS.find(m => m.monthIndex === 6);

      const targetFMonth = submittedMonth ? submittedMonth.monthIndex : (firstActionableMonth ? firstActionableMonth.monthIndex : 6);
      setActiveMgrYearlyFiscalMonth(targetFMonth);

      const curMonthRec = (r.monthly_records || []).find(m => m.monthIndex === targetFMonth);
      targetCats.forEach((cat: KPICategory) => {
        cat.kpis.forEach((kpi: KPIItem) => {
          const entry = curMonthRec?.kpiEntries?.[kpi.id] || (kpi.name ? curMonthRec?.kpiEntries?.[kpi.name] : null);
          const empActual = entry?.actualValue ?? entry?.actual_value ?? '';
          const mgrActual = entry?.managerActualValue ?? entry?.manager_actual_pm ?? empActual;
          initialActuals[kpi.id] = mgrActual;
          initialRemarks[kpi.id] = entry?.managerRemarks ?? entry?.manager_remark ?? '';
        });
      });
      setMgrKpiActuals(initialActuals);
      setMgrKpiRemarks(initialRemarks);
      let totalScore = 0;
      targetCats.forEach((cat: KPICategory) => {
        cat.kpis.forEach((kpi: KPIItem) => {
          const actualVal = initialActuals[kpi.id];
          const calc = calculateKPIScore(kpi, actualVal);
          totalScore += calc.earnedScore;
        });
      });
      setMgrScore(Number(totalScore.toFixed(2)));
      setMgrRemarks(curMonthRec?.managerRemarks || '');
      return;
    }

    targetCats.forEach((cat: KPICategory) => {
      cat.kpis.forEach((kpi: KPIItem) => {
        const respItem = r.kpiResponses?.[kpi.id] || (kpi.name ? r.kpiResponses?.[kpi.name] : null);
        const empActual = respItem?.actualValue ?? '';
        let actualVal = empActual;
        if (!isPendingReview && respItem?.managerActualValue !== undefined && respItem?.managerActualValue !== '') {
          actualVal = respItem.managerActualValue;
        }
        initialActuals[kpi.id] = actualVal;
        initialRemarks[kpi.id] = respItem?.managerRemarks || '';
      });
    });

    setMgrKpiActuals(initialActuals);
    setMgrKpiRemarks(initialRemarks);

    let totalScore = 0;
    targetCats.forEach((cat: KPICategory) => {
      cat.kpis.forEach((kpi: KPIItem) => {
        const actualVal = initialActuals[kpi.id];
        const calc = calculateKPIScore(kpi, actualVal);
        totalScore += calc.earnedScore;
      });
    });

    const calculatedScore = Number(totalScore.toFixed(2));
    setMgrScore(isPendingReview ? calculatedScore : (r.managerScore != null ? Number(r.managerScore) : calculatedScore));
    setMgrRemarks(r.managerRemarks || '');
  };

  const handleMgrRowActualChange = (kpi: KPIItem, newActualVal: string | number) => {
    let sanitizedVal: string | number = '';
    if (newActualVal !== '' && newActualVal !== undefined && newActualVal !== null) {
      // Only allow whole integer numbers (disallow decimal values)
      const num = typeof newActualVal === 'number' ? Math.floor(newActualVal) : parseInt(String(newActualVal), 10);
      if (!isNaN(num)) {
        sanitizedVal = num < 0 ? 0 : num;
      }
    }

    setMgrKpiActuals(prev => {
      const updated = { ...prev, [kpi.id]: sanitizedVal };
      let sum = 0;
      const isYearly = isYearlyResponse(selectedMgrResponse);
      const curYearlyRec = isYearly ? (selectedMgrResponse?.monthly_records || []).find(m => m.monthIndex === activeMgrYearlyFiscalMonth) : null;

      selectedMgrCategories.forEach(cat => {
        cat.kpis.forEach(k => {
          const yearlyEntry = curYearlyRec?.kpiEntries?.[k.id] || (k.name ? curYearlyRec?.kpiEntries?.[k.name] : null);
          const fallbackEmpVal = isYearly
            ? (yearlyEntry?.actualValue ?? yearlyEntry?.actual_value ?? '')
            : (selectedMgrResponse?.kpiResponses?.[k.id]?.actualValue ?? '');
          const val = updated[k.id] !== undefined ? updated[k.id] : fallbackEmpVal;
          const calc = calculateKPIScore(k, val);
          sum += calc.earnedScore;
        });
      });
      setMgrScore(Number(sum.toFixed(2)));
      return updated;
    });
  };

  const handleMgrRowRemarkChange = (kpiId: string, text: string) => {
    setMgrKpiRemarks(prev => ({ ...prev, [kpiId]: text }));
  };

  // 5. Manager Review Submit
  const handleManagerSubmit = async () => {
    if (!selectedMgrResponseId) return;
    const resp = responses.find(r => r.id === selectedMgrResponseId);
    if (!resp) return;

    // Check if any deliverable had its goal/actual modified and requires a manager remark
    const missingRemarksDeliverables: string[] = [];
    selectedMgrCategories.forEach(cat => {
      cat.kpis.forEach(kpi => {
        const respItem = resp.kpiResponses?.[kpi.id];
        const empActual = String(respItem?.actualValue ?? '').trim();
        const currentMgrActual = String(mgrKpiActuals[kpi.id] !== undefined ? mgrKpiActuals[kpi.id] : empActual).trim();
        const currentRemark = (mgrKpiRemarks[kpi.id] || '').trim();

        // If manager adjusted the goal/actual away from employee's actual, remarks are required!
        if (currentMgrActual !== empActual && !currentRemark) {
          missingRemarksDeliverables.push(`"${kpi.name}"`);
        }
      });
    });

    if (missingRemarksDeliverables.length > 0) {
      showAlert(
        'Please enter remarks for all adjusted deliverables.',
        'Remarks Required',
        'warning'
      );
      return;
    }

    showConfirm(
      'Submit evaluation and publish official performance report for this employee?',
      async () => {
        const updatedKpiResponses: Record<string, KPIResponseItem> = { ...(resp.kpiResponses || kpiInputs) };
        selectedMgrCategories.forEach(cat => {
          cat.kpis.forEach(kpi => {
            const currentItem = updatedKpiResponses[kpi.id] || {
              kpiId: kpi.id,
              actualValue: '',
              achievementPercentage: 0,
              earnedScore: 0
            };
            const empActual = currentItem.actualValue ?? '';
            const mgrActual = mgrKpiActuals[kpi.id] !== undefined ? mgrKpiActuals[kpi.id] : empActual;
            const calc = calculateKPIScore(kpi, mgrActual);

            updatedKpiResponses[kpi.id] = {
              ...currentItem,
              managerActualValue: mgrActual,
              managerScore: Number(calc.earnedScore.toFixed(2)),
              managerRemarks: mgrKpiRemarks[kpi.id] || ''
            };
          });
        });

        await evaluationService.submitManagerReview(selectedMgrResponseId, {
          kpiResponses: updatedKpiResponses,
          managerScore: mgrScore,
          managerRemarks: mgrRemarks
        });
        setSelectedMgrResponseId('');
        await loadAllData();
        showToast('Evaluation approved! Official report published to employee.');
      },
      'Submit Evaluation',
      'info',
      'Submit & Publish'
    );
  };

  const handleManagerSubmitWithNext = async (nextResp?: EvaluationResponse) => {
    if (!selectedMgrResponseId) return;
    const resp = responses.find(r => r.id === selectedMgrResponseId);
    if (!resp) return;

    const missingRemarksDeliverables: string[] = [];
    selectedMgrCategories.forEach(cat => {
      cat.kpis.forEach(kpi => {
        const respItem = resp.kpiResponses?.[kpi.id];
        const empActual = String(respItem?.actualValue ?? '').trim();
        const currentMgrActual = String(mgrKpiActuals[kpi.id] !== undefined ? mgrKpiActuals[kpi.id] : empActual).trim();
        const currentRemark = (mgrKpiRemarks[kpi.id] || '').trim();

        if (currentMgrActual !== empActual && !currentRemark) {
          missingRemarksDeliverables.push(`"${kpi.name}"`);
        }
      });
    });

    if (missingRemarksDeliverables.length > 0) {
      showAlert(
        'Please enter remarks for all adjusted deliverables.',
        'Remarks Required',
        'warning'
      );
      return;
    }

    const updatedKpiResponses: Record<string, KPIResponseItem> = { ...(resp.kpiResponses || kpiInputs) };
    selectedMgrCategories.forEach(cat => {
      cat.kpis.forEach(kpi => {
        const currentItem = updatedKpiResponses[kpi.id] || {
          kpiId: kpi.id,
          actualValue: '',
          achievementPercentage: 0,
          earnedScore: 0
        };
        const empActual = currentItem.actualValue ?? '';
        const mgrActual = mgrKpiActuals[kpi.id] !== undefined ? mgrKpiActuals[kpi.id] : empActual;
        const calc = calculateKPIScore(kpi, mgrActual);

        updatedKpiResponses[kpi.id] = {
          ...currentItem,
          managerActualValue: mgrActual,
          managerScore: Number(calc.earnedScore.toFixed(2)),
          managerRemarks: mgrKpiRemarks[kpi.id] || ''
        };
      });
    });

    await evaluationService.submitManagerReview(selectedMgrResponseId, {
      kpiResponses: updatedKpiResponses,
      managerScore: mgrScore,
      managerRemarks: mgrRemarks
    });
    await loadAllData();
    showToast('Evaluation approved! Loading next pending submission...');
    if (nextResp) {
      handleSelectMgrResponse(nextResp);
    } else {
      setSelectedMgrResponseId('');
    }
  };

  // 6. Service Manager Final Approval
  const handleSMFinalApprove = async () => {
    if (!selectedSmResponseId) return;
    showConfirm(
      'Give final executive approval and publish official performance report?',
      async () => {
        await evaluationService.approveServiceManagerReview(selectedSmResponseId, {
          serviceManagerScore: smScore,
          serviceManagerRemarks: smRemarks
        });
        setSelectedSmResponseId('');
        await loadAllData();
        showToast('Evaluation approved! Official report is now published.');
      },
      'Publish Report',
      'info',
      'Approve & Publish'
    );
  };

  // Compute team leaderboard specifically for the logged-in user's team
  const teamLeaderboardInfo = (() => {
    let myTeamName = '';
    if (activeEmpResponse) {
      const info = getEmployeeDisplayInfo(activeEmpResponse);
      if (info.teamName && info.teamName !== 'Unassigned' && info.teamName !== 'General') {
        myTeamName = info.teamName;
      }
    }
    if (!myTeamName) {
      myTeamName = (user as any)?.team_name || (user as any)?.team || '';
    }
    if (!myTeamName) {
      const dbEmp = dbEmployees.find(e => String(e.employee_id) === String((user as any)?.employee_id || user?.employee_id));
      if (dbEmp?.team) myTeamName = dbEmp.team;
    }
    if (!myTeamName) return null;

    const cleanTeamName = myTeamName.trim();
    const myColor = getTeamHeaderColor(cleanTeamName);

    // Gather responses belonging to this team
    const teamResponses = responses.filter(r => {
      const info = getEmployeeDisplayInfo(r);
      const rTeam = (info.empInDb?.team || info.teamName || (r as any).team || '').trim();
      if (rTeam.toLowerCase() !== cleanTeamName.toLowerCase()) return false;

      if (activeEmpResponse?.periodName && r.periodName && activeEmpResponse.periodName === r.periodName) return true;
      if (activeCycle && r.cycleId && r.cycleId === activeCycle.id) return true;
      return true;
    });

    const empMap = new Map<string, { name: string; code: string; score: number; isMe: boolean }>();
    teamResponses.forEach(r => {
      const info = getEmployeeDisplayInfo(r);
      const rawScore = r.managerScore != null ? Number(r.managerScore) : (r.employeeOverallScore != null ? Number(r.employeeOverallScore) : 0);
      const isMe = isResponseForUser(r);
      const key = (info.employeeCode || info.employeeName || '').toLowerCase().trim();
      if (!key) return;
      if (!empMap.has(key) || rawScore > (empMap.get(key)?.score || 0)) {
        empMap.set(key, {
          name: info.employeeName,
          code: info.employeeCode,
          score: rawScore,
          isMe
        });
      }
    });

    if (activeEmpResponse) {
      const myInfo = getEmployeeDisplayInfo(activeEmpResponse);
      const myScore = activeEmpResponse.managerScore != null
        ? Number(activeEmpResponse.managerScore)
        : (activeEmpResponse.employeeOverallScore != null ? Number(activeEmpResponse.employeeOverallScore) : liveEmployeeScore.overallScore);
      const myKey = (myInfo.employeeCode || myInfo.employeeName || (user as any)?.first_name || 'me').toLowerCase().trim();
      if (!empMap.has(myKey) || myScore > (empMap.get(myKey)?.score || 0)) {
        empMap.set(myKey, {
          name: myInfo.employeeName || user?.full_name || `${(user as any)?.first_name || ''} ${(user as any)?.last_name || ''}`.trim() || 'You',
          code: myInfo.employeeCode || '',
          score: myScore,
          isMe: true
        });
      }
    }

    const membersList = Array.from(empMap.values())
      .sort((a, b) => b.score - a.score)
      .map((m, idx) => ({ ...m, rank: idx + 1 }));

    const myEntry = membersList.find(m => m.isMe);

    return {
      teamName: cleanTeamName,
      color: myColor,
      members: membersList,
      myRank: myEntry?.rank || null,
      myScore: myEntry?.score ?? (activeEmpResponse?.managerScore != null ? Number(activeEmpResponse.managerScore) : liveEmployeeScore.overallScore)
    };
  })();

  const periodDisplayLabel = (() => {
    const raw = activeEmpResponse?.periodName || activeCycle?.periodName || activeCycle?.name || '';
    if (raw.includes('(')) {
      const match = raw.match(/-\s*([A-Za-z]+)\)/);
      const yearMatch = raw.match(/\d{4}/);
      if (match && yearMatch) {
        return `${match[1]}'${yearMatch[0].slice(-2)}`;
      }
    }
    return raw || "Sep'26";
  })();

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Bar */}
      <div className={`bg-white rounded-2xl px-4 py-2 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all duration-200 ${
        activeRole === 'manager' && !hasAssignedCycleFromAdmin && reportFilteredResponses.length === 0
          ? 'filter blur-[3.5px] opacity-40 pointer-events-none select-none'
          : ''
      }`}>
        {/* Left: Title + Role navigation + Subtabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 shrink-0">
              <ChartBarIcon className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
              Employee Recognition & Rewards
            </h2>
          </div>

          {/* Center: Segmented Navigation Tabs for HR / Manager */}
          {canShowReviewerTabs && (
            <div className="bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 flex flex-wrap gap-1 items-center">
              {isHrOrAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveRole('hr')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${activeRole === 'hr'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span>HR Setup</span>
                </button>
              )}

              {(isHrOrAdmin || isManager || isServiceManager) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveRole('manager');
                    setManagerFilterDept('all');
                    if (reportViewTab.startsWith('top_')) {
                      setReportViewTab('all');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${activeRole === 'manager'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                >
                  <BriefcaseIcon className="w-3.5 h-3.5" />
                  <span>{isTeamLead ? 'Team Lead Reviews' : 'Direct Reviews'}</span>
                  {directResponsesCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${activeRole === 'manager'
                      ? 'bg-white/20 text-white'
                      : 'bg-primary-100 text-primary-800'
                      }`}>
                      {directResponsesCount}
                    </span>
                  )}
                </button>
              )}

              {!isTeamLead && (isHrOrAdmin || isServiceManager || isManager) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveRole('downline_teams');
                    setManagerFilterDept('all');
                    setOversightSubView('submissions');
                    setSubmissionStatusFilter('all');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${activeRole === 'downline_teams'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                >
                  <UserGroupIcon className="w-3.5 h-3.5" />
                  <span>Department Oversight</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveRole('employee')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${activeRole === 'employee'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>My Evaluation</span>
                {myEvaluationsCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${activeRole === 'employee'
                    ? 'bg-white/20 text-white'
                    : myPendingEvaluationsCount > 0
                      ? 'bg-primary-100 text-primary-800 ring-2 ring-primary-400 animate-pulse'
                      : 'bg-primary-100 text-primary-800'
                    }`}>
                    {myEvaluationsCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right: Team Standing Widget */}
        {activeRole === 'employee' && teamLeaderboardInfo && teamLeaderboardInfo.members.length > 0 && (
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="bg-slate-50/90 rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden w-64 sm:w-72">
              <div className="px-3 py-1.5 border-b border-slate-200/70 flex items-center justify-between bg-white/80">
                <span className="text-[11px] font-bold text-slate-800 tracking-tight">
                  {periodDisplayLabel}
                </span>
                <span className="inline-block px-2 py-0.2 rounded-full font-bold text-[9px] tracking-tight bg-teal-50 text-teal-800 border border-teal-200/80">
                  Top 3
                </span>
              </div>
              <div className="p-2 space-y-1 bg-white/50">
                {teamLeaderboardInfo.members.slice(0, 3).map((member: any) => {
                  const isMe = member.isMe;
                  const rank = member.rank;

                  return (
                    <div
                      key={member.code || member.name}
                      className="flex items-center justify-between text-[11px] py-0.5 px-1 rounded"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <span className="shrink-0 text-xs select-none leading-none">
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''}
                        </span>
                        <span className={`truncate text-xs ${isMe ? 'font-black text-slate-900' : 'font-medium text-slate-700'}`}>
                          {rank}. {member.name} {isMe && <span className="text-teal-800 font-bold ml-0.5">(You)</span>}
                        </span>
                      </div>
                      <span className={`font-mono text-xs font-bold shrink-0 ${isMe ? 'text-teal-900 font-black' : 'text-slate-800'}`}>
                        {member.score.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. HR CREATION & DISPATCH VIEW (Strictly accessible to HR / Admin) */}
      {/* ========================================================================= */}
      {activeRole === 'hr' && isHrOrAdmin && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-neutral-200/90 shadow-sm space-y-6 animate-in fade-in duration-200">
          {/* Top: Team & Manager Selection Bar */}
          <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 1. Target Team */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-600 transition">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">1. Select Team</label>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                    {teamEmployees.length} members
                  </span>
                </div>
                <select
                  value={selectedTeamId}
                  onChange={e => handleTeamChange(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {dbTeams.map(t => (
                    <option key={t.id || t.name} value={t.id || t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* 2. Select Manager for that Team (Multi-select) */}
              <div className="relative p-3 bg-white border border-slate-200 rounded-xl shadow-2xs transition">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">2. Select Responsible Manager(s)</label>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                    {availableTeamManagers.length === 0
                      ? 'None'
                      : selectedMgrIds.length === availableTeamManagers.length && availableTeamManagers.length > 1
                      ? `All Managers (${availableTeamManagers.length})`
                      : `${selectedMgrIds.length || 1} Selected`}
                  </span>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsHrMgrDropdownOpen(prev => !prev)}
                    className="w-full text-left bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-900 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="truncate">
                      {availableTeamManagers.length === 0 ? (
                        <span className="text-slate-400 font-normal">No manager found for this team</span>
                      ) : selectedMgrIds.length === availableTeamManagers.length && availableTeamManagers.length > 1 ? (
                        <span className="text-teal-900 font-bold">All Managers ({availableTeamManagers.length} selected)</span>
                      ) : selectedMgrIds.length === 0 ? (
                        <span className="text-slate-400 font-normal">Click to select manager(s)...</span>
                      ) : (
                        availableTeamManagers
                          .filter(m => selectedMgrIds.includes(String(m.employee_id || '')))
                          .map(m => m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Manager')
                          .join(', ')
                      )}
                    </span>
                    <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-500 shrink-0 ml-1 transition-transform ${isHrMgrDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isHrMgrDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsHrMgrDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
                        {availableTeamManagers.length > 1 && (
                          <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 mb-1">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedMgrIds.length === availableTeamManagers.length && availableTeamManagers.length > 0}
                                onChange={e => handleSelectAllHrManagers(e.target.checked)}
                                className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                              />
                              <span>Select All Managers ({availableTeamManagers.length})</span>
                            </label>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {selectedMgrIds.length}/{availableTeamManagers.length}
                            </span>
                          </div>
                        )}

                        {availableTeamManagers.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No manager found for this team.
                          </div>
                        ) : (
                          availableTeamManagers.map(m => {
                            const idVal = String(m.employee_id || '');
                            const isChecked = selectedMgrIds.includes(idVal);
                            const name = m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Manager';
                            const code = m.employee_id ? ` (Emp: ${m.employee_id})` : '';
                            const role = m.access_level || m.role || m.designation ? ` - ${m.access_level || m.role || m.designation}` : '';
                            return (
                              <div
                                key={idVal}
                                onClick={() => handleToggleHrManager(idVal)}
                                className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                                  isChecked ? 'bg-teal-50/80 text-teal-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                  />
                                  <span className="truncate">
                                    {name}<span className="text-slate-500 font-normal">{code}</span>
                                    <span className="text-teal-700 font-semibold">{role}</span>
                                  </span>
                                </div>
                                {isChecked && selectedMgrId === idVal && (
                                  <span className="text-[9px] bg-teal-200/80 text-teal-900 px-1.5 py-0.5 rounded font-bold shrink-0 ml-1">
                                    Active View
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 Deliverables & Targets Form Builder */}
          <form onSubmit={handleHRCycleCreate} className="space-y-4">
            {/* Form Builder Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-black tracking-wider uppercase">
                  STEP 2
                </span>
                <span className="text-sm sm:text-base font-black text-slate-900">
                  Deliverables & Targets
                </span>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${isWeightageValid && areAllCategoriesBalanced
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                  {isWeightageValid ? (
                    <CheckCircleIcon className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  ) : (
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  <span>Weight: {totalWeightage}% / 100%</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowHrTargetGuide(prev => !prev)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition shadow-2xs cursor-pointer"
                >
                  <InformationCircleIcon className="w-3.5 h-3.5 text-teal-600" />
                  <span>Syntax Guide {showHrTargetGuide ? '▲' : '▼'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleHrResetTemplate}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition shadow-2xs cursor-pointer"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={totalWeightage >= 100}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition shadow-2xs ${totalWeightage >= 100
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer shadow-teal-700/20'
                    }`}
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>+ Add Category</span>
                </button>
              </div>
            </div>

            {/* Team Form Selector Sub Bar */}
            {(() => {
              const defaultTeamName = selectedTeam?.name || selectedTeamId || 'Form 1';
              const displayedTemplates = (hrTemplates && hrTemplates.length > 0)
                ? hrTemplates
                : [{ template_key: 'form_1', template_name: defaultTeamName, is_default: true, categories: [] }];

              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-100/90 border border-slate-200/90 shadow-2xs">
                  {/* Left: Tab items */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 px-2 py-0.5 select-none flex items-center gap-1">
                      <BriefcaseIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Team Form:</span>
                    </span>

                    {displayedTemplates.map(t => {
                      const isActive = t.template_key === activeHrTemplateKey;
                      return (
                        <button
                          key={t.template_key}
                          type="button"
                          onClick={() => handleHrSelectTemplate(t.template_key)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer select-none ${isActive
                            ? 'bg-white text-teal-900 shadow-2xs border border-slate-200/90 ring-1 ring-teal-500/20'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                          <span>{t.template_name || `Form ${t.template_key.replace('form_', '')}`}</span>
                          {isActive && <CheckIcon className="w-3 h-3 text-teal-600" />}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleHrAddNewTemplate}
                      className="px-2 py-1 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:bg-white/80 rounded-lg transition cursor-pointer flex items-center gap-1"
                      title="Add another Form slot for this team"
                    >
                      <PlusIcon className="w-3 h-3" />
                      <span>+ New Form</span>
                    </button>

                    {isHrLoadingTemplates && (
                      <div className="flex items-center gap-1 text-[10px] text-teal-700 font-medium px-2 py-0.5">
                        <ArrowPathIcon className="w-3 h-3 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 px-1">
                    {isHrRenamingTemplate ? (
                      <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-teal-400 shadow-2xs">
                        <input
                          type="text"
                          value={hrRenameTemplateInput}
                          onChange={e => setHrRenameTemplateInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleHrConfirmRenameTemplate();
                            if (e.key === 'Escape') setIsHrRenamingTemplate(false);
                          }}
                          className="h-6 px-1.5 text-xs bg-transparent border-none text-slate-900 font-semibold focus:outline-none w-28 sm:w-36"
                          placeholder="e.g. Media 2"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleHrConfirmRenameTemplate}
                          className="px-2 py-0.5 text-[10px] font-bold text-white bg-teal-700 hover:bg-teal-800 rounded transition cursor-pointer"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsHrRenamingTemplate(false)}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 hover:bg-slate-100 rounded transition cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleHrStartRenameTemplate}
                        className="px-2 py-0.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition cursor-pointer flex items-center gap-1"
                        title="Rename this form"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>Rename</span>
                      </button>
                    )}

                    {/* Delete Form Button */}
                    <button
                      type="button"
                      onClick={() => handleHrDeleteTemplate(activeHrTemplateKey)}
                      className="px-2 py-0.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition cursor-pointer flex items-center gap-1 border border-rose-200/80"
                      title="Delete this form"
                    >
                      <TrashIcon className="w-3.5 h-3.5 text-rose-500" />
                      <span>Delete Form</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleHrSaveActiveTemplate}
                      disabled={isHrSavingTemplate}
                      className="flex items-center gap-1 px-2.5 py-0.5 bg-white hover:bg-slate-50 text-teal-800 border border-slate-200/90 rounded-md text-xs font-semibold transition shadow-2xs cursor-pointer disabled:opacity-50"
                      title="Save template directly to database"
                    >
                      {isHrSavingTemplate ? (
                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      ) : (
                        <CheckIcon className="w-3.5 h-3.5 text-teal-600" />
                      )}
                      <span>{isHrSavingTemplate ? 'Saving...' : 'Save Form'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Collapsible Syntax & Metric Types Guide */}
            {showHrTargetGuide && (
              <div className="rounded-xl bg-white border border-teal-200/90 shadow-sm p-3 space-y-2 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <InformationCircleIcon className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-bold text-slate-800 text-xs">Deliverable Syntax & Metric Types Guide</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHrTargetGuide(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs p-0.5 rounded hover:bg-slate-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-teal-50/50 border border-teal-100">
                    <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">+</span>
                    <div>
                      <div className="font-bold text-teal-950 text-[11px]">+ Standard Metric</div>
                      <div className="text-[10px] text-slate-500 font-normal">Higher is better • Output, Productivity & Goals</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-rose-50/50 border border-rose-100">
                    <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">−</span>
                    <div>
                      <div className="font-bold text-rose-950 text-[11px]">− Negative / Penalty Metric</div>
                      <div className="text-[10px] text-rose-600 font-normal">Lower is better • Errors, Escalations & Deductions</div>
                    </div>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-100 flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="font-bold text-slate-600 mr-1">Target Symbols:</span>
                  <code className="px-1 py-0.2 rounded bg-slate-100 text-slate-800 font-mono text-[10px]">&lt; N (e.g. &lt; 2 errors)</code>
                  <code className="px-1 py-0.2 rounded bg-slate-100 text-slate-800 font-mono text-[10px]">&lt;= N (e.g. &lt;= 3 max)</code>
                  <code className="px-1 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono text-[10px]">&gt;= N (e.g. &gt;= 95% SLA)</code>
                  <code className="px-1 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono text-[10px]">&gt; N (e.g. &gt; 10 targets)</code>
                  <code className="px-1 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200 font-mono text-[10px]">0 misses (Zero tolerance)</code>
                  <code className="px-1 py-0.2 rounded bg-slate-100 text-slate-800 font-mono text-[10px]">N (Exact number)</code>
                </div>
              </div>
            )}

            {/* Categories & KPIs List */}
            {hrCategories.length === 0 ? (
              <div className="p-8 bg-slate-50/80 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-teal-700">
                  <TableCellsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">No deliverables defined for this form</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Click Add Category or Reset to start defining metrics.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-3 py-1.5 text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 rounded-xl transition shadow-2xs cursor-pointer"
                >
                  + Add First Category
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {hrCategories.map((cat, catIdx) => {
                  const catSum = cat.kpis.reduce((sum, k) => sum + (Number(k.targetScore) || 0), 0);
                  const isBalanced = Math.abs(catSum - Number(cat.weightage)) <= 0.05;

                  return (
                    <div key={cat.id} className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 space-y-2.5">
                      {/* Category Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {catIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={cat.name}
                            onChange={e => handleUpdateCategoryName(cat.id, e.target.value)}
                            placeholder="Category Title..."
                            className="font-bold text-xs text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-teal-600 focus:outline-none px-1 py-0.5 w-full max-w-md"
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500">Weight:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={cat.weightage}
                              onChange={e => handleUpdateCategoryWeight(cat.id, Number(e.target.value))}
                              className="w-10 text-xs font-bold text-teal-800 text-center focus:outline-none"
                            />
                            <span className="text-[10px] font-bold text-slate-400">%</span>
                          </div>

                          {!isBalanced && (
                            <button
                              type="button"
                              onClick={() => handleAutoBalanceCategory(cat.id)}
                              className="px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition cursor-pointer"
                              title="Auto-balance target scores to match category weight"
                            >
                              Auto-Balance
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete category"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Deliverables Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                          <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                            <tr>
                              <th className="px-2.5 py-1.5 text-left">Deliverable Name</th>
                              <th className="px-2 py-1.5 w-28 text-center">Target</th>
                              <th className="px-2 py-1.5 w-20 text-center">Score %</th>
                              <th className="px-2 py-1.5 w-20 text-center">Unit</th>
                              <th className="px-2 py-1.5 w-24 text-center">Type</th>
                              <th className="px-1.5 py-1.5 w-8 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {cat.kpis.map(kpi => {
                              const isNeg = isNegativeKpi(kpi);
                              return (
                                <tr key={kpi.id} className={`transition ${isNeg ? 'bg-rose-50/25 hover:bg-rose-50/50' : 'hover:bg-slate-50/50'}`}>
                                  <td className="px-2.5 py-1.5 align-middle">
                                    <input
                                      type="text"
                                      value={kpi.name}
                                      onChange={e => handleUpdateKPI(cat.id, kpi.id, 'name', e.target.value)}
                                      placeholder="Deliverable description..."
                                      className={`w-full h-7 px-2 rounded-lg text-xs font-semibold focus:outline-none transition border ${isNeg
                                        ? 'bg-rose-50/50 text-rose-700 border-rose-200 focus:bg-white focus:border-rose-500'
                                        : 'bg-slate-50/70 text-slate-800 border-slate-200 focus:bg-white focus:border-teal-600'
                                        }`}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 align-middle text-center">
                                    <input
                                      type="text"
                                      value={kpi.targetFromManager ?? ''}
                                      onChange={e => handleUpdateKPI(cat.id, kpi.id, 'targetFromManager', e.target.value)}
                                      placeholder="e.g. 3, 11, 1950, <2"
                                      className={`w-full h-7 px-1.5 rounded-lg text-xs font-bold text-center focus:outline-none transition border ${isNeg
                                        ? 'bg-rose-50/50 text-rose-700 border-rose-200 focus:bg-white focus:border-rose-500'
                                        : 'bg-slate-50/70 text-teal-900 border-slate-200 focus:bg-white focus:border-teal-600'
                                        }`}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 align-middle text-center">
                                    <div className={`flex items-center justify-center focus-within:bg-white border rounded-lg px-1.5 h-7 transition ${isNeg ? 'bg-rose-50/40 border-rose-200 focus-within:border-rose-500' : 'bg-slate-50/70 border-slate-200 focus-within:border-teal-600'
                                      }`}>
                                      <input
                                        type="number"
                                        step="any"
                                        value={kpi.targetScore}
                                        onChange={e => handleUpdateKPI(cat.id, kpi.id, 'targetScore', Number(e.target.value))}
                                        className={`w-11 text-xs font-bold text-center bg-transparent focus:outline-none p-0 ${isNeg ? 'text-rose-700' : 'text-slate-800'
                                          }`}
                                      />
                                      <span className="text-[10px] text-slate-400 font-bold ml-0.5">%</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5 align-middle text-center">
                                    <input
                                      type="text"
                                      value={kpi.unit}
                                      onChange={e => handleUpdateKPI(cat.id, kpi.id, 'unit', e.target.value)}
                                      placeholder="units"
                                      className="w-full h-7 px-1.5 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-teal-600 rounded-lg text-xs font-medium text-center text-slate-700 focus:outline-none transition"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 align-middle text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateKPI(cat.id, kpi.id, 'scoringDirection', isNeg ? 'higher_is_better' : 'lower_is_better')}
                                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition shadow-2xs cursor-pointer whitespace-nowrap ${isNeg
                                        ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                        }`}
                                      title={isNeg ? 'Negative / Penalty metric (Lower is better). Click to switch to Standard.' : 'Standard metric (Higher is better). Click to switch to Negative.'}
                                    >
                                      {isNeg ? '− Negative' : '+ Standard'}
                                    </button>
                                  </td>
                                  <td className="px-1.5 py-1.5 align-middle text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteKPI(cat.id, kpi.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                      title="Delete deliverable"
                                    >
                                      <TrashIcon className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleAddKPI(cat.id)}
                          className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-teal-700 bg-white hover:bg-teal-50 rounded-lg transition shadow-2xs border border-teal-200/80 cursor-pointer"
                        >
                          <PlusIcon className="w-3 h-3" />
                          <span>+ Add Row</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Dispatch Action Bar */}
            <div className="p-4 bg-slate-50/95 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <PaperAirplaneIcon className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-slate-900 text-xs">Ready to Send Form to Manager?</span>
                </div>
                <p className="text-xs text-slate-500">
                  Target Team: <strong className="text-slate-800">{selectedTeam?.name || 'Selected Team'}</strong> • Receiver(s): <strong className="text-teal-800">{
                    availableTeamManagers.filter(m => selectedMgrIds.includes(String(m.employee_id || ''))).length > 0
                      ? availableTeamManagers.filter(m => selectedMgrIds.includes(String(m.employee_id || ''))).map(m => m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Manager').join(', ')
                      : activeDesignatedManagerName
                  }</strong> • Scope: <strong className="text-slate-800">{teamEmployees.length} Team Members</strong>
                </p>
              </div>

              <button
                type="submit"
                disabled={!isWeightageValid || !areAllCategoriesBalanced || hrCategories.length === 0}
                className={`flex items-center gap-2.5 px-7 py-3 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer ${isWeightageValid && areAllCategoriesBalanced && hrCategories.length > 0
                  ? 'bg-teal-700 hover:bg-teal-800 shadow-teal-700/20 active:scale-[0.99]'
                  : 'bg-slate-300 cursor-not-allowed opacity-60'
                  }`}
              >
                <PaperAirplaneIcon className="w-4 h-4 text-white" />
                <span>Send Metrics to Manager</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3 & 6. EMPLOYEE SELF-ASSESSMENT & REPORT */}
      {/* ========================================================================= */}
      {activeRole === 'employee' && (
        <div className="space-y-4">
          {/* Sub Tab Navigation (Worksheet vs Performance History) - only when assigned */}
          {(isEmployeeExplicitlyAssigned && activeEmpResponse) && (
            <div className="bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 w-fit">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEmployeeSubTab('worksheet')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    employeeSubTab === 'worksheet'
                      ? 'bg-primary-700 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                  }`}
                >
                  <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                  <span>Self-Assessment Worksheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEmployeeSubTab('reports')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    employeeSubTab === 'reports'
                      ? 'bg-primary-700 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                  }`}
                >
                  <DocumentChartBarIcon className="w-3.5 h-3.5" />
                  <span>Performance History</span>
                </button>
              </div>
            </div>
          )}

          {(employeeSubTab === 'worksheet' || (!isEmployeeExplicitlyAssigned || !activeEmpResponse)) && ((() => {
            if (!isEmployeeExplicitlyAssigned || !activeEmpResponse) {
              return (
                <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-2xs p-8 sm:p-12 text-center space-y-6 animate-in fade-in duration-200 max-w-2xl mx-auto my-6">
                  {/* Status Icon */}
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 shadow-2xs relative">
                    <ChartBarIcon className="w-8 h-8" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-white animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      <span>E2R is In Progress</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Performance Evaluation Setup in Progress
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Your Reporting Manager and HR are currently preparing and configuring the deliverables matrix for your team. Once your manager assigns the targets, your self-assessment worksheet will activate here automatically.
                    </p>
                  </div>

                  {/* 3-Step Process Stepper */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-lg mx-auto text-left">
                    <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider">Step 1</span>
                        <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center">✓</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800">HR Setup</div>
                      <div className="text-[10px] text-slate-400">Team configured</div>
                    </div>

                    <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-3 space-y-1 ring-1 ring-amber-300">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Step 2</span>
                        <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center animate-spin">⏳</span>
                      </div>
                      <div className="text-xs font-bold text-amber-950">Manager Review</div>
                      <div className="text-[10px] text-amber-700 font-medium">Setting deliverables</div>
                    </div>

                    <div className="bg-slate-50/60 rounded-2xl border border-slate-200/60 p-3 space-y-1 opacity-70">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Step 3</span>
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center">3</span>
                      </div>
                      <div className="text-xs font-bold text-slate-700">Self Assessment</div>
                      <div className="text-[10px] text-slate-400">Upcoming</div>
                    </div>
                  </div>

                  {/* Employee & Cycle Info Card */}
                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 max-w-md mx-auto text-left space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Employee Name:</span>
                      <strong className="text-slate-800">{user?.full_name || `${userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim() || 'Employee'}</strong>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 font-medium">Employee Code:</span>
                      <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">#{myCanonicalCode || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 font-medium">Team / Department:</span>
                      <span className="font-bold text-slate-700">{effectiveTeamName || 'General'}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 font-medium">Evaluation Cycle:</span>
                      <span className="font-bold text-teal-800">{activeCycle?.name || periodName}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 font-medium">Current Status:</span>
                      <span className="text-amber-800 font-bold text-[11px] bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">⏳ In Processing / Pending Assignment</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    You will receive an in-app alert as soon as your reporting manager finalizes and assigns the team matrix.
                  </p>
                </div>
              );
            }

            // Pre-calculate stats & deliverables
            const allKpis = activeCategories.flatMap(c => c.kpis);
            const totalKpiCount = allKpis.length;
            const completedKpiCount = allKpis.filter(k => {
              const respItem = getKpiResponseItem(k);
              const selfVal = String(respItem?.actualValue ?? '').trim();
              return selfVal !== '' || !k.isRequired;
            }).length;

            const adjustedKpiCount = allKpis.filter(k => {
              const respItem = getKpiResponseItem(k);
              const selfVal = String(respItem?.actualValue ?? '').trim();
              const mgrVal = String(respItem?.managerActualValue ?? '').trim();
              return respItem?.managerActualValue !== undefined && mgrVal !== '' && mgrVal !== selfVal;
            }).length;

            const selfScoreNum = liveEmployeeScore.overallScore;
            const empSelfScore = activeEmpResponse?.employeeOverallScore != null ? Number(activeEmpResponse.employeeOverallScore) : selfScoreNum;
            const mgrScoreNum = (isEmpSubmitted && activeEmpResponse?.managerScore !== undefined) ? Number(activeEmpResponse.managerScore) : null;
            const scoreVariance = mgrScoreNum !== null ? Number((mgrScoreNum - selfScoreNum).toFixed(2)) : null;

            // Category performance analysis
            const categoryPerformance = activeCategories.map(cat => {
              const catEarned = cat.kpis.reduce((sum, k) => {
                const respItem = getKpiResponseItem(k);
                const val = respItem?.actualValue ?? '';
                return sum + calculateKPIScore(k, val).earnedScore;
              }, 0);
              const catMgrEarned = cat.kpis.reduce((sum, k) => {
                const respItem = getKpiResponseItem(k);
                if (respItem?.managerScore !== undefined && respItem?.managerScore !== null) return sum + Number(respItem.managerScore);
                if (respItem?.managerActualValue !== undefined && respItem?.managerActualValue !== '') return sum + calculateKPIScore(k, respItem.managerActualValue).earnedScore;
                return sum;
              }, 0);
              const targetWeight = Number(cat.weightage) || 1;
              const effectiveScore = (isEmpSubmitted && activeEmpResponse?.status === 'approved' && activeEmpResponse?.managerScore !== undefined) ? catMgrEarned : catEarned;
              const achievementRate = (effectiveScore / targetWeight) * 100;
              return { ...cat, catEarned, catMgrEarned, effectiveScore, targetWeight, achievementRate };
            });

            // Filtered categories and KPIs
            const filteredCategories = activeCategories.map(cat => {
              const matchingKpis = cat.kpis.filter(kpi => {
                const respItem = getKpiResponseItem(kpi);
                const selfVal = String(respItem?.actualValue ?? '').trim();
                const mgrVal = String(respItem?.managerActualValue ?? '').trim();
                const isAdjusted = respItem?.managerActualValue !== undefined && mgrVal !== '' && mgrVal !== selfVal;

                if (empFilterTab === 'adjusted' && !isAdjusted) return false;
                if (empFilterTab === 'pending' && selfVal !== '') return false;

                if (empSearchQuery.trim()) {
                  const q = empSearchQuery.toLowerCase();
                  const matchName = kpi.name.toLowerCase().includes(q);
                  const matchDesc = (kpi.description || '').toLowerCase().includes(q);
                  const matchRem = (respItem?.employeeRemarks || '').toLowerCase().includes(q) || (respItem?.managerRemarks || '').toLowerCase().includes(q);
                  return matchName || matchDesc || matchRem;
                }
                return true;
              });

              return { ...cat, matchingKpis };
            }).filter(cat => cat.matchingKpis.length > 0 || !empSearchQuery.trim());

            return (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* 1. Ultra-Clean Executive Header & Workflow Ribbon */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  {/* Top Bar: Title, Period Selector & Score Badges */}
                  <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 border border-primary-200/60 flex items-center justify-center shrink-0">
                        <SparklesIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {activeCycle?.name || 'Performance Evaluation'}
                          </h3>
                          {/* Period Selector Dropdown */}
                          <div className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer">
                            <CalendarDaysIcon className="w-3.5 h-3.5 text-primary-700 shrink-0" />
                            <select
                              value={selectedResponseId || activeEmpResponse?.id || ''}
                              onChange={(e) => {
                                const newId = e.target.value;
                                setSelectedResponseId(newId);
                                setSelectedReportResponseId(newId);
                              }}
                              className="bg-transparent text-xs font-semibold text-primary-900 border-none outline-none cursor-pointer pr-1"
                            >
                              {allUserResponses.length > 0 ? (
                                allUserResponses.map((r, idx) => {
                                  const c = cycles.find(cy => cy.id === r.cycleId);
                                  const raw = c?.periodName || c?.name || (r as any).periodName || `Cycle ${idx + 1}`;
                                  // Clean up wordy phrases from the label
                                  const cleanLabel = raw.replace(/Executive Evaluation/gi, '').replace(/\s+/g, ' ').trim();
                                  const isLatest = idx === 0;
                                  return (
                                    <option key={r.id} value={r.id}>
                                      {cleanLabel} {isLatest ? '(Latest)' : ''}
                                    </option>
                                  );
                                })
                              ) : (
                                <option value="">{activeCycle?.periodName || activeCycle?.name || 'Q3 2026'}</option>
                              )}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Scores & Actions */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                      <div className="flex items-center divide-x divide-slate-200 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden text-xs">
                        <div className="px-2.5 py-1 flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-medium">Self</span>
                          <strong className="text-primary-950 font-bold">{selfScoreNum.toFixed(1)}%</strong>
                        </div>
                        <div className="px-2.5 py-1 flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-medium">Mgr</span>
                          <strong className="text-primary-950 font-bold">
                            {activeEmpResponse && (activeEmpResponse.status === 'approved' || activeEmpResponse.status === 'sm_final_approval' || (activeEmpResponse.managerReviewedAt && activeEmpResponse.status !== 'manager_review')) && activeEmpResponse.managerScore != null
                              ? `${Number(activeEmpResponse.managerScore).toFixed(1)}%`
                              : 'Pending'}
                          </strong>
                        </div>
                        <div className="px-2.5 py-1 flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-medium">KPIs</span>
                          <strong className="text-slate-800 font-bold">{completedKpiCount}/{totalKpiCount}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEmployeeSubTab('reports')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <DocumentChartBarIcon className="w-3.5 h-3.5 text-primary-700" />
                        <span>Report</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const allOpen = activeCategories.length > 0 && activeCategories.every(c => expandedCategories[c.id]);
                          const nextState: Record<string, boolean> = {};
                          activeCategories.forEach(c => {
                            nextState[c.id] = !allOpen;
                          });
                          setExpandedCategories(nextState);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5 text-white" />
                        <span>{activeCategories.length > 0 && activeCategories.every(c => expandedCategories[c.id]) ? 'Collapse All' : 'Expand All'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Sleek Compact Evaluation Tracking Strip */}
                  {(() => {
                    const isS1Done = Boolean(isEmpSubmitted);
                    const isS2Done = activeEmpResponse?.status === 'approved' || activeEmpResponse?.status === 'sm_final_approval' || (Boolean(activeEmpResponse?.managerReviewedAt) && activeEmpResponse?.status !== 'manager_review');
                    const isS2Active = isS1Done && !isS2Done;
                    const isS3Done = activeEmpResponse?.status === 'approved';
                    const isS3Active = !isS3Done && (activeEmpResponse?.status === 'sm_final_approval' || (Boolean(activeEmpResponse?.managerReviewedAt) && activeEmpResponse?.status !== 'manager_review'));

                    return (
                      <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${isS3Done
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isS2Active
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : isS3Active
                                  ? 'bg-primary-50 text-primary-800 border-primary-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isS3Done ? 'bg-emerald-500' : isS2Active ? 'bg-amber-500' : isS3Active ? 'bg-primary-500' : 'bg-slate-400'
                              }`} />
                            {isS3Done ? 'Approved' : isS2Active ? 'Under Review' : isS3Active ? 'Executive Sign-off' : 'In Progress'}
                          </span>
                        </div>

                        {/* Minimalist 3-Step Progress Trail */}
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <span className={`inline-flex items-center gap-1 font-semibold ${isS1Done ? 'text-emerald-700' : 'text-slate-700'}`}>
                            <span className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${isS1Done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                              {isS1Done ? '✓' : '1'}
                            </span>
                            <span>Self Review</span>
                          </span>

                          <span className="text-slate-300">→</span>

                          <span className={`inline-flex items-center gap-1 font-semibold ${isS2Done ? 'text-emerald-700' : isS2Active ? 'text-amber-700' : 'text-slate-400'
                            }`}>
                            <span className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${isS2Done
                                ? 'bg-emerald-600 text-white'
                                : isS2Active
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-200 text-slate-500'
                              }`}>
                              {isS2Done ? '✓' : '2'}
                            </span>
                            <span>Manager Review</span>
                          </span>

                          <span className="text-slate-300">→</span>

                          <span className={`inline-flex items-center gap-1 font-semibold ${isS3Done ? 'text-emerald-700' : 'text-slate-400'
                            }`}>
                            <span className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${isS3Done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                              }`}>
                              {isS3Done ? '✓' : '3'}
                            </span>
                            <span>Final Calibration</span>
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Proactive Employee Reminder Banner during Submission Window */}
                {(() => {
                  if (isEmpSubmitted) return null;
                  const today = new Date();
                  const todayStr = today.toISOString().split("T")[0];
                  const dueDateRaw = (activeCycle as any)?.dueDate || (activeCycle as any)?.due_date || activeCycle?.endDate;
                  const rawEndDateStr = dueDateRaw ? dueDateRaw.split("T")[0] : todayStr;
                  const endDateStr = getAdjustedWorkingDueDate(rawEndDateStr);
                  const diffTime = new Date(endDateStr).getTime() - new Date(todayStr).getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  if (diffDays >= 0 && diffDays <= 5) {
                    const formatDDMMYYYY = (isoStr: string) => {
                      try {
                        const d = new Date(isoStr + 'T00:00:00');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        return `${dd}/${mm}/${d.getFullYear()}`;
                      } catch { return isoStr; }
                    };
                    return (
                      <div className="p-3.5 bg-gradient-to-r from-amber-50 via-amber-100/40 to-emerald-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <ClockIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-amber-950">
                                Self-Assessment Submission Window Open
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/80 text-amber-900 uppercase">
                                {diffDays === 0 ? 'Due Today' : `Due in ${diffDays} Day${diffDays > 1 ? 's' : ''} (${formatDDMMYYYY(endDateStr)})`}
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-800 font-medium">
                              Please enter your actual deliverables and submit your self-assessment before the deadline.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 12-Month Financial Year Milestone Progress Stepper for Yearly Cadence */}
                {isYearlyResponse(activeEmpResponse) && (() => {
                  const curRecords = activeEmpResponse?.monthly_records || [];
                  const approvedMonths = curRecords.filter(m => m.status === 'manager_approved');
                  const ytdScore = approvedMonths.length > 0
                    ? Number((approvedMonths.reduce((acc, m) => acc + (Number(m.managerScore) || 0), 0) / approvedMonths.length).toFixed(1))
                    : null;
                  const quarters = [
                    { name: 'Q1 (Apr - Jun)', months: FISCAL_MONTHS.filter(m => m.quarter === 1) },
                    { name: 'Q2 (Jul - Sep)', months: FISCAL_MONTHS.filter(m => m.quarter === 2) },
                    { name: 'Q3 (Oct - Dec)', months: FISCAL_MONTHS.filter(m => m.quarter === 3) },
                    { name: 'Q4 (Jan - Mar)', months: FISCAL_MONTHS.filter(m => m.quarter === 4) }
                  ];

                  return (
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
                            <CalendarDaysIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">
                              12-Month Milestone Progress Tracking (April – March Cycle)
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Select any monthly milestone to view or fill your actuals, review manager scores, and track YTD average.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold text-slate-500">Year-To-Date (YTD) Score:</span>
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-900 border border-teal-300">
                            {ytdScore !== null ? `${ytdScore}% (${approvedMonths.length}/12 Approved)` : 'In Progress'}
                          </span>
                        </div>
                      </div>

                      {/* 4 Quarters Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {quarters.map(q => (
                          <div key={q.name} className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/70 space-y-2">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              {q.name}
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {q.months.map(m => {
                                const lockInfo = getYearlyMonthLockInfo(m.monthIndex, curRecords);
                                const isSelected = activeYearlyFiscalMonth === m.monthIndex;
                                const isApproved = lockInfo.isApproved;
                                const isSubmitted = lockInfo.isSubmitted;
                                const isLocked = lockInfo.isLocked;
                                const isActionable = lockInfo.isEditable && !lockInfo.isLocked;
                                const score = isApproved && lockInfo.score != null ? Number(lockInfo.score).toFixed(0) : null;

                                return (
                                  <button
                                    key={m.monthKey}
                                    type="button"
                                    onClick={() => setActiveYearlyFiscalMonth(m.monthIndex)}
                                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                                      isSelected
                                        ? isLocked
                                          ? 'bg-slate-700 text-white border-slate-800 ring-2 ring-slate-500/30'
                                          : isApproved
                                            ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-500/30'
                                            : isSubmitted
                                              ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-500/30'
                                              : 'bg-teal-700 text-white border-teal-800 ring-2 ring-teal-500/30'
                                        : isApproved
                                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                                          : isSubmitted
                                            ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 ring-1 ring-amber-300/60'
                                            : isActionable
                                              ? 'bg-teal-50/90 text-teal-900 border-teal-300 hover:bg-teal-100 ring-1 ring-teal-400/50'
                                              : isLocked
                                                ? 'bg-slate-100/90 text-slate-400 border-slate-200 hover:bg-slate-200/70'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span className="text-[11px] flex items-center gap-1">
                                      {isLocked && <LockClosedIcon className="w-2.5 h-2.5 stroke-[2.5]" />}
                                      {m.shortName}
                                    </span>
                                    <span className={`text-[9px] font-medium leading-none mt-0.5 ${
                                      isSelected
                                        ? 'text-white/90 font-bold'
                                        : isApproved
                                          ? 'text-emerald-700 font-bold'
                                          : isSubmitted
                                            ? 'text-amber-700 font-bold'
                                            : isActionable
                                              ? 'text-teal-700 font-bold'
                                              : isLocked
                                                ? 'text-slate-400'
                                                : 'text-slate-500 font-medium'
                                    }`}>
                                      {score !== null
                                        ? `${score}%`
                                        : isSubmitted
                                          ? 'Submitted'
                                          : isLocked
                                            ? 'Locked'
                                            : m.monthIndex === 6
                                              ? 'Pending'
                                              : m.monthIndex < 6
                                                ? 'Past'
                                                : 'Pending'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Active Month Milestone Status Banner */}
                      {(() => {
                        const lockInfo = getYearlyMonthLockInfo(activeYearlyFiscalMonth, curRecords);
                        if (lockInfo.isLocked) {
                          return (
                            <div className="p-3 bg-slate-100/90 border border-slate-200/90 text-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-slate-200/90 text-slate-600 flex items-center justify-center shrink-0">
                                  <LockClosedIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 block">
                                    {lockInfo.currentMonthName} Milestone is Locked
                                  </span>
                                  <span className="text-slate-600 text-[11px]">
                                    {lockInfo.lockReason}
                                  </span>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-md bg-slate-200 text-slate-700 font-bold text-[11px] shrink-0 inline-flex items-center gap-1">
                                <LockClosedIcon className="w-3 h-3" />
                                Locked
                              </span>
                            </div>
                          );
                        }
                        if (lockInfo.isSubmitted) {
                          return (
                            <div className="p-3 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                  <ClockIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-bold text-amber-950 block">
                                    {lockInfo.currentMonthName} Deliverables Submitted & Awaiting Manager Review
                                  </span>
                                  <span className="text-amber-800 text-[11px]">
                                    Your actuals have been submitted. Once your manager reviews and approves the score, the next month will automatically unlock.
                                  </span>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px] shrink-0 inline-flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                Under Review
                              </span>
                            </div>
                          );
                        }
                        if (lockInfo.isApproved) {
                          return (
                            <div className="p-3 bg-emerald-50/90 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                  <CheckCircleIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-bold text-emerald-950 block">
                                    {lockInfo.currentMonthName} Milestone Approved
                                  </span>
                                  <span className="text-emerald-800 text-[11px]">
                                    Manager Approved Score: <strong>{lockInfo.score}%</strong>. This monthly milestone is finalized.
                                  </span>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px] shrink-0 inline-flex items-center gap-1">
                                <CheckCircleIcon className="w-3 h-3" />
                                {lockInfo.score}% Approved
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div className="p-3 bg-teal-50/80 border border-teal-200 text-teal-950 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                                <CalendarDaysIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-teal-950 block">
                                  {lockInfo.currentMonthName} Milestone is Open
                                </span>
                                <span className="text-teal-800 text-[11px]">
                                  Please enter your actual deliverables and self-scores below, then click "Submit {lockInfo.currentMonthName} Deliverables to Manager".
                                </span>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-md bg-teal-100 text-teal-900 font-bold text-[11px] shrink-0 inline-flex items-center gap-1">
                              <SparklesIcon className="w-3 h-3 text-teal-700" />
                              Open
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* 2. Deliverable-Level Evaluation Breakdown Table with Integrated Toolbar */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  {/* Integrated Table Header Bar (Clean & Compact) */}
                  <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Left: Deliverable Title & Category Filters */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Deliverables {isYearlyResponse(activeEmpResponse) && (() => {
                          const mObj = FISCAL_MONTHS.find(m => m.monthIndex === activeYearlyFiscalMonth);
                          return `— ${mObj ? mObj.monthName : `Month ${activeYearlyFiscalMonth}`}`;
                        })()}
                      </h4>

                      {/* Filter Pills */}
                      <div className="inline-flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg text-xs">
                        <button
                          type="button"
                          onClick={() => setEmpFilterTab('all')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${empFilterTab === 'all'
                            ? 'bg-teal-700 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                          All ({totalKpiCount})
                        </button>
                        {adjustedKpiCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setEmpFilterTab('adjusted')}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${empFilterTab === 'adjusted'
                              ? 'bg-amber-100 text-amber-950 font-bold'
                              : 'text-amber-800 hover:text-amber-950'
                              }`}
                          >
                            <span>Adjusted ({adjustedKpiCount})</span>
                          </button>
                        )}
                      </div>

                      {(() => {
                        const isYearly = isYearlyResponse(activeEmpResponse);
                        const curRecords = activeEmpResponse?.monthly_records || [];
                        const lockInfo = isYearly ? getYearlyMonthLockInfo(activeYearlyFiscalMonth, curRecords) : null;
                        const isLocked = isYearly ? !lockInfo?.isEditable : isEmpSubmitted;

                        if (isLocked) {
                          return (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              isYearly && lockInfo?.isLocked
                                ? 'text-slate-700 bg-slate-100 border-slate-200'
                                : isYearly && lockInfo?.isSubmitted
                                  ? 'text-amber-800 bg-amber-50 border-amber-200'
                                  : 'text-teal-800 bg-teal-50 border-teal-200'
                            }`}>
                              {isYearly && lockInfo?.isLocked ? (
                                <>
                                  <LockClosedIcon className="w-3 h-3 text-slate-500" />
                                  Locked
                                </>
                              ) : isYearly && lockInfo?.isSubmitted ? (
                                <>
                                  <ClockIcon className="w-3 h-3 text-amber-600" />
                                  Under Review
                                </>
                              ) : (
                                <>
                                  <CheckCircleIcon className="w-3 h-3 text-teal-600" />
                                  {isYearly ? 'Approved' : 'Locked'}
                                </>
                              )}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Right: Search & Badges */}
                    <div className="flex items-center gap-2">
                      <div className="relative w-44 sm:w-52">
                        <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={empSearchQuery}
                          onChange={e => setEmpSearchQuery(e.target.value)}
                          placeholder="Search..."
                          className="w-full h-7 pl-8 pr-6 text-xs bg-white border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-lg focus:outline-none transition"
                        />
                        {empSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setEmpSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded-md border border-teal-200/80 shrink-0">
                        100% Weight
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-200/90 bg-white">
                    {filteredCategories.map((cat, catIdx) => {
                      const isYearly = isYearlyResponse(activeEmpResponse);
                      const curRecords = activeEmpResponse?.monthly_records || [];
                      const lockInfo = isYearly ? getYearlyMonthLockInfo(activeYearlyFiscalMonth, curRecords) : null;
                      const curYearlyRecord = isYearly ? curRecords.find(m => m.monthIndex === activeYearlyFiscalMonth) : null;
                      const isYearlyMonthSubmitted = Boolean(isYearly && (curYearlyRecord?.status === 'submitted_to_manager' || curYearlyRecord?.status === 'manager_approved'));
                      const isThisMonthLocked = isYearly ? (!lockInfo?.isEditable) : isEmpSubmitted;

                      const catEarned = cat.kpis.reduce((sum, k) => {
                        const yearlyEntry = curYearlyRecord?.kpiEntries?.[k.id] || (k.name ? curYearlyRecord?.kpiEntries?.[k.name] : null);
                        const val = isYearly
                          ? (!isYearlyMonthSubmitted
                              ? (yearlyMonthKpiInputs[activeYearlyFiscalMonth]?.[k.id]?.actualValue ?? (k.name ? yearlyMonthKpiInputs[activeYearlyFiscalMonth]?.[k.name]?.actualValue : '') ?? yearlyEntry?.actualValue ?? '')
                              : (yearlyEntry?.actualValue ?? ''))
                          : (getKpiResponseItem(k)?.actualValue ?? (kpiInputs[k.id]?.actualValue ?? ''));
                        return sum + calculateKPIScore(k, val).earnedScore;
                      }, 0);

                      const isExpanded = Object.keys(expandedCategories).length === 0 ? catIdx === 0 : Boolean(expandedCategories[cat.id]);

                      return (
                        <div key={cat.id} className="bg-white">
                          {/* Clean Category Bar */}
                          <div
                            onClick={() => {
                              setExpandedCategories(prev => {
                                const currentVal = Object.keys(prev).length === 0 ? catIdx === 0 : Boolean(prev[cat.id]);
                                return { ...prev, [cat.id]: !currentVal };
                              });
                            }}
                            className="bg-slate-50 hover:bg-slate-100/80 text-slate-800 px-4 py-2 cursor-pointer transition-colors duration-150 select-none group flex items-center justify-between gap-3 w-full"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="p-0.5 rounded text-slate-400 group-hover:text-slate-700 transition-colors shrink-0"
                              >
                                <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                              </span>
                              <span className="font-semibold text-xs text-slate-900 group-hover:text-teal-900 transition-colors truncate">
                                {catIdx + 1}. {cat.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({cat.matchingKpis.length})
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0 text-xs">
                              <span className="text-[11px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs whitespace-nowrap">
                                <strong className="text-teal-900 font-bold">{catEarned.toFixed(1)}%</strong> / {cat.weightage}%
                              </span>
                              <span className="text-[11px] font-medium text-teal-700 group-hover:text-teal-900 flex items-center gap-0.5">
                                {isExpanded ? 'Collapse' : 'Expand'}
                              </span>
                            </div>
                          </div>

                          {/* Deliverables Table for Expanded Category */}
                          {isExpanded && (
                            <div className="overflow-x-auto border-t border-slate-200/80">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50/95 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider select-none">
                                  <tr>
                                    <th className="px-4 py-2.5 text-left whitespace-nowrap">Deliverable Metric</th>
                                    <th className="px-2.5 py-2.5 text-center whitespace-nowrap">Target Goal</th>
                                    <th className="px-2.5 py-2.5 text-center whitespace-nowrap">Weight</th>
                                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Self Actual</th>
                                    <th className="px-2.5 py-2.5 text-center whitespace-nowrap">Self Score</th>
                                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Insufficient</th>
                                    {!isThisMonthLocked && (
                                      <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Self Remarks</th>
                                    )}
                                    {isThisMonthLocked && (
                                      <>
                                        <th className="px-3 py-2.5 text-center bg-teal-50/50 text-teal-950 border-l border-teal-200/60 whitespace-nowrap font-extrabold">Mgr Actual</th>
                                        <th className="px-2.5 py-2.5 text-center bg-teal-50/50 text-teal-950 whitespace-nowrap font-extrabold">Mgr Score</th>
                                      </>
                                    )}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {cat.matchingKpis.map((kpi) => {
                                    const respItem = getKpiResponseItem(kpi);
                                    const yearlyEntry = curYearlyRecord?.kpiEntries?.[kpi.id] || (kpi.name ? curYearlyRecord?.kpiEntries?.[kpi.name] : null);

                                    const rawVal = isYearly
                                      ? (!isYearlyMonthSubmitted
                                          ? (yearlyMonthKpiInputs[activeYearlyFiscalMonth]?.[kpi.id]?.actualValue ?? (kpi.name ? yearlyMonthKpiInputs[activeYearlyFiscalMonth]?.[kpi.name]?.actualValue : '') ?? yearlyEntry?.actualValue ?? '')
                                          : (yearlyEntry?.actualValue ?? ''))
                                      : (!isEmpSubmitted
                                          ? (kpiInputs[kpi.id]?.actualValue ?? (kpi.name ? kpiInputs[kpi.name]?.actualValue : '') ?? '')
                                          : (respItem?.actualValue !== undefined && respItem?.actualValue !== null && respItem?.actualValue !== ''
                                              ? respItem.actualValue
                                              : (kpiInputs[kpi.id]?.actualValue ?? (kpi.name ? kpiInputs[kpi.name]?.actualValue : '') ?? '')));
                                    const val = rawVal !== '' && rawVal !== undefined && rawVal !== null
                                      ? (typeof rawVal === 'number' ? Math.floor(rawVal) : (String(rawVal).includes('.') ? parseInt(String(rawVal), 10) : rawVal))
                                      : '';
                                    const calc = calculateKPIScore(kpi, val);
                                    const remarks = isYearly
                                      ? (!isYearlyMonthSubmitted
                                          ? (yearlyMonthKpiInputs[activeYearlyFiscalMonth]?.[kpi.id]?.employeeRemarks ?? (kpi.name ? yearlyMonthKpiInputs[activeYearlyFiscalMonth]?.[kpi.name]?.employeeRemarks : '') ?? yearlyEntry?.employeeRemarks ?? '')
                                          : (yearlyEntry?.employeeRemarks ?? ''))
                                      : (!isEmpSubmitted
                                          ? (kpiInputs[kpi.id]?.employeeRemarks ?? (kpi.name ? kpiInputs[kpi.name]?.employeeRemarks : '') ?? '')
                                          : (respItem?.employeeRemarks !== undefined && respItem?.employeeRemarks !== null
                                              ? respItem.employeeRemarks
                                              : (kpiInputs[kpi.id]?.employeeRemarks ?? (kpi.name ? kpiInputs[kpi.name]?.employeeRemarks : '') ?? '')));
                                    const parsedTarget = parseTargetExpression(kpi.targetFromManager, kpi.targetValue || 1);
                                    const targetThreshold = parsedTarget.threshold;

                                    // Manager reviewed values
                                    const hasMgrActual = isYearly
                                      ? (yearlyEntry?.managerActualValue !== undefined && yearlyEntry?.managerActualValue !== null && yearlyEntry?.managerActualValue !== '')
                                      : (respItem?.managerActualValue !== undefined && respItem?.managerActualValue !== null && respItem?.managerActualValue !== '');

                                    const mgrActualVal = isYearly
                                      ? (hasMgrActual ? yearlyEntry?.managerActualValue : '')
                                      : (hasMgrActual ? respItem?.managerActualValue : (mgrKpiActuals[kpi.id] ?? ''));

                                    const isActualModifiedByMgr = hasMgrActual && String(mgrActualVal).trim() !== String(val).trim();
                                    const mgrCalc = calculateKPIScore(kpi, hasMgrActual ? mgrActualVal : val);
                                    const mgrEarnedScore = isYearly
                                      ? (yearlyEntry?.managerScore !== undefined && yearlyEntry?.managerScore !== null ? Number(yearlyEntry.managerScore) : (hasMgrActual ? mgrCalc.earnedScore : null))
                                      : ((respItem?.managerScore !== undefined && respItem?.managerScore !== null)
                                          ? Number(respItem.managerScore)
                                          : (hasMgrActual ? mgrCalc.earnedScore : null));
                                    const mgrRemarks = isYearly
                                      ? (yearlyEntry?.managerRemarks || '')
                                      : (respItem?.managerRemarks ?? mgrKpiRemarks[kpi.id] ?? '');

                                    const isNeg = isNegativeKpi(kpi);
                                    const rawInsufficient = isYearly
                                      ? (yearlyMonthKpiInputs[activeYearlyFiscalMonth]?.[kpi.id]?.isInsufficient ?? yearlyEntry?.isInsufficient ?? false)
                                      : (!isEmpSubmitted
                                          ? (kpiInputs[kpi.id]?.isInsufficient ?? (kpi.name ? kpiInputs[kpi.name]?.isInsufficient : false))
                                          : (respItem?.isInsufficient !== undefined && respItem?.isInsufficient !== null
                                              ? respItem.isInsufficient
                                              : (kpiInputs[kpi.id]?.isInsufficient ?? (kpi.name ? kpiInputs[kpi.name]?.isInsufficient : ((kpi as any)?.isInsufficient ?? (kpi as any)?.is_insufficient ?? false)))));
                                    const isRowInsufficient = Boolean(rawInsufficient);
                                    const statusObj = getInsufficientStatus(kpi, val, isRowInsufficient);

                                    return (
                                      <tr
                                        key={kpi.id}
                                        className={`group/empRow transition-colors border-b last:border-b-0 ${isNeg
                                          ? 'bg-rose-50/25 hover:bg-rose-50/45 border-rose-100/80 border-l-4 border-l-rose-400'
                                          : 'hover:bg-slate-50/80 border-slate-100 border-l-4 border-l-transparent'
                                          }`}
                                      >
                                        {/* 1. Deliverable Name & Description */}
                                        <td className="px-4 py-3 align-middle max-w-[240px]">
                                          <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className={`font-bold text-xs leading-snug ${isNeg ? 'text-rose-950' : 'text-slate-900'}`}>
                                                {kpi.name}
                                              </span>
                                            </div>
                                            {kpi.description && (
                                              <p className={`text-[11px] line-clamp-2 leading-relaxed ${isNeg ? 'text-rose-600/80 font-medium' : 'text-slate-500'}`}>
                                                {kpi.description}
                                              </p>
                                            )}
                                          </div>
                                        </td>

                                        {/* 2. Target Goal */}
                                        <td className="px-2.5 py-3 align-middle text-center whitespace-nowrap">
                                          <div className="flex flex-col items-center justify-center gap-0.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border shadow-2xs ${isNeg
                                              ? 'bg-rose-100/70 text-rose-800 border-rose-200'
                                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                                              }`}>
                                              {(() => {
                                                const t = String(kpi.targetFromManager || '').trim();
                                                const u = String(kpi.unit || '').trim();
                                                if (!t) return targetThreshold;
                                                if (!u || t.toLowerCase().includes(u.toLowerCase())) return t;
                                                return `${t} ${u}`;
                                              })()}
                                            </span>
                                          </div>
                                        </td>

                                        {/* 3. Weight */}
                                        <td className="px-2 py-3 align-middle text-center whitespace-nowrap">
                                          <span className={`text-xs font-bold ${isNeg ? 'text-rose-900' : 'text-slate-700'}`}>
                                            {kpi.weightage || kpi.targetScore}%
                                          </span>
                                        </td>

                                        {/* 4. Self Actual */}
                                        <td className="px-3 py-3 align-middle text-center text-xs whitespace-nowrap">
                                          <div className="flex flex-col items-center justify-center gap-1">
                                            {(() => {
                                              const numericVal = val !== '' && val !== undefined && val !== null ? Number(val) : null;
                                              const isOverTarget = numericVal !== null && !isNaN(numericVal) && (
                                                isNeg
                                                  ? (parsedTarget.operator === '<' ? numericVal >= targetThreshold : (targetThreshold === 0 ? numericVal > 0 : numericVal > targetThreshold))
                                                  : (targetThreshold > 0 && numericVal > targetThreshold)
                                              );
                                              const isMetTarget = numericVal !== null && !isNaN(numericVal) && (
                                                isNeg
                                                  ? (parsedTarget.operator === '<' ? numericVal < targetThreshold : (targetThreshold === 0 ? numericVal === 0 : numericVal <= targetThreshold))
                                                  : (targetThreshold > 0 && numericVal >= targetThreshold)
                                              );
                                              const isLowTarget = !isNeg && numericVal !== null && !isNaN(numericVal) && val !== '' && targetThreshold > 0 && numericVal < targetThreshold;

                                              if (isThisMonthLocked) {
                                                if (val === '' || val === undefined || val === null) {
                                                  return <span className="text-slate-400 font-medium">—</span>;
                                                }
                                                if (isNeg) {
                                                  return (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-900 border border-rose-300 font-bold text-xs shadow-2xs">
                                                      <span>{val} {kpi.unit || ''}</span>
                                                      {isOverTarget && (
                                                        <span className="text-[9px] bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                          Exceeded
                                                        </span>
                                                      )}
                                                    </span>
                                                  );
                                                }
                                                if (isOverTarget) {
                                                  return (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-950 border border-emerald-400 font-bold text-xs shadow-2xs">
                                                      <span>{val} {kpi.unit || ''}</span>
                                                      <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                        Exceeded
                                                      </span>
                                                    </span>
                                                  );
                                                }
                                                if (isMetTarget) {
                                                  return (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-950 border border-teal-300 font-bold text-xs shadow-2xs">
                                                      <span>{val} {kpi.unit || ''}</span>
                                                    </span>
                                                  );
                                                }
                                                return (
                                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold text-xs shadow-2xs ${calc.earnedScore === 0
                                                    ? 'bg-rose-50 text-rose-900 border border-rose-300'
                                                    : 'bg-amber-50 text-amber-900 border border-amber-300'
                                                    }`}>
                                                    <span>{val} {kpi.unit || ''}</span>
                                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${calc.earnedScore === 0 ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'}`}>
                                                      {calc.earnedScore === 0 ? 'Not Met' : 'Low Target'}
                                                    </span>
                                                  </span>
                                                );
                                              }

                                              return (
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                  <input
                                                    type="number"
                                                    step="1"
                                                    min="0"
                                                    value={val}
                                                    disabled={isSubmittingEmp}
                                                    onKeyDown={e => {
                                                      if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
                                                        e.preventDefault();
                                                      }
                                                    }}
                                                    onChange={e => {
                                                      if (isYearly) {
                                                        handleYearlyMonthKpiChange(kpi, e.target.value);
                                                      } else {
                                                        handleKPIChange(kpi, e.target.value);
                                                      }
                                                    }}
                                                    placeholder="0"
                                                    className={`w-24 h-8 px-2 text-center font-bold text-xs rounded-xl transition shadow-2xs focus:outline-none ${isNeg && isOverTarget
                                                      ? 'bg-rose-100 text-rose-950 border-2 border-rose-500 ring-2 ring-rose-400/30 font-black'
                                                      : !isNeg && calc.earnedScore === 0 && val !== ''
                                                        ? 'bg-rose-50 text-rose-950 border-2 border-rose-400 ring-2 ring-rose-400/20 font-black'
                                                        : isOverTarget
                                                          ? 'bg-emerald-50 text-emerald-950 border-2 border-emerald-500 ring-2 ring-emerald-400/30 font-black'
                                                          : isLowTarget
                                                            ? 'bg-amber-50 text-amber-950 border-2 border-amber-400 ring-2 ring-amber-300/30 font-black'
                                                            : isMetTarget
                                                              ? 'bg-teal-50/80 text-teal-950 border-2 border-teal-400 font-bold focus:border-teal-600'
                                                              : isNeg
                                                                ? 'bg-rose-50/40 text-rose-950 border-2 border-rose-200/90 focus:border-rose-500 focus:bg-white placeholder:text-rose-300'
                                                                : 'bg-white text-slate-900 border border-slate-200 focus:border-teal-600'
                                                      }`}
                                                  />
                                                  {isNeg && isOverTarget && (
                                                    <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded uppercase tracking-wider animate-in fade-in">
                                                      Exceeded Limit
                                                    </span>
                                                  )}
                                                  {isNeg && isMetTarget && (
                                                    <span className="text-[9px] font-black text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded uppercase tracking-wider animate-in fade-in">
                                                      Within Limit
                                                    </span>
                                                  )}
                                                  {!isNeg && isOverTarget && (
                                                    <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded uppercase tracking-wider animate-in fade-in">
                                                      High Target
                                                    </span>
                                                  )}
                                                  {!isNeg && isLowTarget && (
                                                    <span className="text-[9px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded uppercase tracking-wider animate-in fade-in">
                                                      Low Target
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })()}

                                            {/* Emp and Mgr Remark Badges below Self Actual */}
                                            {isThisMonthLocked && (remarks?.trim() || mgrRemarks?.trim()) && (
                                              <DeliverableRemarksHover
                                                selfRemarks={remarks}
                                                mgrRemarks={mgrRemarks}
                                                align="center"
                                              >
                                                <div className="flex items-center justify-center gap-1 mt-0.5 flex-wrap cursor-pointer">
                                                  {remarks?.trim() && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary-50 text-primary-700 border border-primary-200 cursor-help shrink-0">
                                                      <ChatBubbleLeftEllipsisIcon className="w-2.5 h-2.5 text-primary-600" />
                                                      <span>Emp</span>
                                                    </span>
                                                  )}
                                                  {mgrRemarks?.trim() && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-200 cursor-help shrink-0">
                                                      <ChatBubbleLeftEllipsisIcon className="w-2.5 h-2.5 text-teal-600" />
                                                      <span>Mgr</span>
                                                    </span>
                                                  )}
                                                </div>
                                              </DeliverableRemarksHover>
                                            )}
                                          </div>
                                        </td>

                                        {/* Self Score */}
                                        <td
                                          className="px-2.5 py-3 text-center align-middle whitespace-nowrap"
                                        >
                                          <div className="inline-flex items-center justify-center gap-1">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-black shadow-2xs ${calc.earnedScore > 0
                                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/90'
                                              : 'bg-rose-50 text-rose-900 border border-rose-200/90'
                                              }`}>
                                              {calc.earnedScore.toFixed(2)}%
                                            </span>
                                            {isThisMonthLocked && remarks?.trim() && (
                                              <ChatBubbleLeftEllipsisIcon className="w-3 h-3 text-primary-500/70 shrink-0" />
                                            )}
                                          </div>
                                        </td>

                                        {/* Insufficient Status & Employee Toggle */}
                                        <td className="px-3 py-3 text-center align-middle whitespace-nowrap">
                                          {!isThisMonthLocked ? (
                                            (() => {
                                              const isTargetMetOrEmpty = statusObj.status === 'met' || statusObj.status === 'not_filled';
                                              return (
                                                <label
                                                  className={`inline-flex items-center justify-center gap-1.5 select-none ${
                                                    isTargetMetOrEmpty ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                                  }`}
                                                  title={isTargetMetOrEmpty ? 'Target met or not filled' : 'Click to flag variance details'}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    disabled={isTargetMetOrEmpty}
                                                    checked={!isTargetMetOrEmpty && Boolean(isRowInsufficient)}
                                                    onChange={e => {
                                                      if (isYearly) {
                                                        handleYearlyMonthKpiInsufficient(kpi, e.target.checked);
                                                      } else {
                                                        handleKPIToggleInsufficient(kpi, e.target.checked);
                                                      }
                                                    }}
                                                    className="w-4 h-4 text-primary-600 accent-primary-600 rounded border-slate-300 focus:ring-primary-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 transition"
                                                  />
                                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shadow-2xs border ${statusObj.badgeClass}`}>
                                                    {statusObj.label}
                                                  </span>
                                                </label>
                                              );
                                            })()
                                          ) : (
                                            <div className="inline-flex items-center justify-center">
                                              <span
                                                className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full border text-[10px] shadow-2xs ${statusObj.badgeClass}`}
                                              >
                                                {statusObj.label}
                                              </span>
                                            </div>
                                          )}
                                        </td>

                                        {/* Self Remarks: Only rendered when NOT submitted (when employee needs to edit) */}
                                        {!isThisMonthLocked && (
                                          <td className="px-3.5 py-3 align-middle text-xs min-w-[140px] max-w-[220px]">
                                            {(() => {
                                              const isMandatory = isKpiRemarkMandatory(kpi, val, isRowInsufficient);
                                              const hasRemark = Boolean(remarks && remarks.trim());

                                              return (
                                                <div className="flex flex-col gap-1">
                                                  <ExpandableRemarkInput
                                                    value={remarks}
                                                    disabled={isSubmittingEmp}
                                                    onChange={val => {
                                                      if (isYearly) {
                                                        handleYearlyMonthKpiRemarkChange(kpi, val);
                                                      } else {
                                                        handleKPIRemarksChange(kpi, val);
                                                      }
                                                    }}
                                                    placeholder={isMandatory ? 'Remark required (High/Low/Selected)...' : 'Remarks (Optional)...'}
                                                    required={isMandatory}
                                                    className={
                                                      isMandatory && !hasRemark
                                                        ? 'bg-amber-50/70 focus:bg-white border-2 border-amber-400 focus:border-amber-600 text-slate-900 focus:outline-none ring-2 ring-amber-200/50 shadow-2xs'
                                                        : hasRemark
                                                          ? 'bg-emerald-50/40 focus:bg-white border border-emerald-300 focus:border-teal-600 text-slate-900 focus:outline-none shadow-2xs'
                                                          : 'bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-teal-600 text-slate-800 focus:outline-none shadow-2xs'
                                                    }
                                                  />
                                                  {isMandatory && !hasRemark && (
                                                    <span className="text-[9px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded self-start tracking-wider uppercase animate-in fade-in">
                                                      Mandatory
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </td>
                                        )}

                                        {/* Manager Reviewed Fields Display */}
                                        {isThisMonthLocked && (
                                          <>
                                            <td className="px-3 py-3 text-center align-middle bg-teal-50/30 border-l border-teal-100 whitespace-nowrap">
                                              {hasMgrActual && mgrActualVal !== '' ? (() => {
                                                const numMgrVal = Number(mgrActualVal);
                                                const isMgrOver = isNeg && !isNaN(numMgrVal) && (parsedTarget.operator === '<' ? numMgrVal >= targetThreshold : (targetThreshold === 0 ? numMgrVal > 0 : numMgrVal > targetThreshold));
                                                if (isNeg) {
                                                  return (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-900 border border-rose-300 font-bold text-xs shadow-2xs">
                                                      <span>{mgrActualVal} {kpi.unit || ''}</span>
                                                      {isMgrOver && (
                                                        <span className="text-[9px] bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                          Exceeded
                                                        </span>
                                                      )}
                                                    </span>
                                                  );
                                                }
                                                return (
                                                  <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold transition shadow-2xs ${isActualModifiedByMgr
                                                    ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                                    : 'bg-teal-100 text-teal-950 border border-teal-300'
                                                    }`}>
                                                    {mgrActualVal} {kpi.unit || ''}
                                                  </span>
                                                );
                                              })() : (
                                                <span className="text-slate-400 font-medium">—</span>
                                              )}
                                            </td>

                                            <td
                                              className="px-2.5 py-3 text-center align-middle bg-teal-50/30 whitespace-nowrap"
                                            >
                                              <div className="inline-flex items-center justify-center gap-1">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-black shadow-2xs ${mgrEarnedScore !== null && mgrEarnedScore > 0
                                                  ? 'bg-teal-100 text-teal-950 border border-teal-300'
                                                  : mgrEarnedScore !== null
                                                    ? 'bg-rose-50 text-rose-900 border border-rose-200/90'
                                                    : 'bg-slate-50 text-slate-500 border border-slate-200/60'
                                                  }`}>
                                                  {mgrEarnedScore !== null ? `${mgrEarnedScore.toFixed(2)}%` : '—'}
                                                </span>
                                                {mgrRemarks?.trim() && (
                                                  <ChatBubbleLeftEllipsisIcon className="w-3 h-3 text-teal-600/70 shrink-0" />
                                                )}
                                              </div>
                                            </td>
                                          </>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Scorecard Summary Footer */}
                  <div className="p-5 bg-gradient-to-r from-slate-50 via-teal-50/20 to-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {(() => {
                      const isYearly = isYearlyResponse(activeEmpResponse);
                      const mObj = FISCAL_MONTHS.find(m => m.monthIndex === activeYearlyFiscalMonth);
                      const monthName = mObj ? mObj.monthName : `Month ${activeYearlyFiscalMonth}`;
                      const curYearlyRec = isYearly ? (activeEmpResponse?.monthly_records || []).find(m => m.monthIndex === activeYearlyFiscalMonth) : null;
                      const isYearlyMonthSubmitted = Boolean(isYearly && (curYearlyRec?.status === 'submitted_to_manager' || curYearlyRec?.status === 'manager_approved'));
                      const approvedMonthsList = (activeEmpResponse?.monthly_records || []).filter(m => m.status === 'manager_approved');
                      const ytdAvgScore = approvedMonthsList.length > 0
                        ? Number((approvedMonthsList.reduce((sum, m) => sum + (Number(m.managerScore) || 0), 0) / approvedMonthsList.length).toFixed(1))
                        : null;

                      let monthSelfSum = 0;
                      activeCategories.forEach(cat => {
                        cat.kpis.forEach(k => {
                          const yearlyEntry = curYearlyRec?.kpiEntries?.[k.id] || (k.name ? curYearlyRec?.kpiEntries?.[k.name] : null);
                          const val = isYearly
                            ? (!isYearlyMonthSubmitted
                                ? (yearlyMonthKpiInputs[activeYearlyFiscalMonth]?.[k.id]?.actualValue ?? (k.name ? yearlyMonthKpiInputs[activeYearlyFiscalMonth]?.[k.name]?.actualValue : '') ?? yearlyEntry?.actualValue ?? '')
                                : (yearlyEntry?.actualValue ?? ''))
                            : (getKpiResponseItem(k)?.actualValue ?? (kpiInputs[k.id]?.actualValue ?? ''));
                          monthSelfSum += calculateKPIScore(k, val).earnedScore;
                        });
                      });
                      const displayScore = isYearly ? Number(monthSelfSum.toFixed(1)) : selfScoreNum;

                      return (
                        <>
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <div className="flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
                              <span className="text-slate-500 font-semibold">{isYearly ? `${monthName} Self Score:` : 'Self Overall Score:'}</span>
                              <strong className="text-teal-900 text-sm font-black">{displayScore.toFixed(1)}%</strong>
                            </div>

                            {isYearly && curYearlyRec?.managerScore != null && (
                              <div className="flex items-center gap-2.5 bg-teal-50 px-4 py-2.5 rounded-xl border border-teal-200 shadow-2xs">
                                <span className="text-teal-800 font-bold">{monthName} Manager Score:</span>
                                <strong className="text-teal-950 text-sm font-black">{Number(curYearlyRec.managerScore).toFixed(1)}%</strong>
                              </div>
                            )}

                            {isYearly && (
                              <div className="flex items-center gap-2.5 bg-indigo-50/80 px-4 py-2.5 rounded-xl border border-indigo-200 shadow-2xs">
                                <span className="text-indigo-900 font-bold">YTD Rolling Average:</span>
                                <strong className="text-indigo-950 text-sm font-black">
                                  {ytdAvgScore !== null ? `${ytdAvgScore}%` : 'In Progress'}
                                </strong>
                              </div>
                            )}

                            {!isYearly && activeEmpResponse?.managerScore !== undefined && (
                              <div className="flex items-center gap-2.5 bg-teal-50 px-4 py-2.5 rounded-xl border border-teal-200 shadow-2xs">
                                <span className="text-teal-800 font-bold">Manager Official Score:</span>
                                <strong className="text-teal-950 text-sm font-black">{Number(activeEmpResponse.managerScore).toFixed(1)}%</strong>
                              </div>
                            )}

                            <div className="flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
                              <span className="text-slate-500 font-semibold">Performance Tier:</span>
                              <strong className="text-teal-900 text-sm font-black bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/70">
                                {(() => {
                                  const r = getRatingForScore((isYearly ? curYearlyRec?.managerScore : activeEmpResponse?.managerScore) ?? displayScore);
                                  return r.name;
                                })()}
                              </strong>
                            </div>
                          </div>

                          {isYearly ? (() => {
                            const curRecords = activeEmpResponse?.monthly_records || [];
                            const lockInfo = getYearlyMonthLockInfo(activeYearlyFiscalMonth, curRecords);
                            if (lockInfo.isLocked) {
                              return (
                                <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs">
                                  <LockClosedIcon className="w-4 h-4 text-slate-500" />
                                  <span>{monthName} is Locked (Pending Manager Approval of {lockInfo.prevMonthName || 'previous month'})</span>
                                </div>
                              );
                            }
                            if (lockInfo.isSubmitted) {
                              return (
                                <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 text-amber-900 rounded-xl text-xs font-bold border border-amber-200 shadow-2xs">
                                  <ClockIcon className="w-4 h-4 text-amber-700" />
                                  <span>{monthName} Deliverables Submitted to Manager (Under Review)</span>
                                </div>
                              );
                            }
                            if (lockInfo.isApproved) {
                              return (
                                <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-200 shadow-2xs">
                                  <CheckCircleIcon className="w-4 h-4 text-emerald-700" />
                                  <span>{monthName} Milestone Approved ({curYearlyRec?.managerScore != null ? `${Number(curYearlyRec.managerScore).toFixed(1)}%` : 'Approved'})</span>
                                </div>
                              );
                            }

                            const expandedCatIndices = filteredCategories
                              .map((cat, idx) => {
                                const isCatOpen = Object.keys(expandedCategories).length === 0 ? idx === 0 : Boolean(expandedCategories[cat.id]);
                                return isCatOpen ? idx : -1;
                              })
                              .filter(idx => idx !== -1);

                            const currentActiveCatIdx = expandedCatIndices.length > 0
                              ? Math.max(...expandedCatIndices)
                              : 0;

                            const allCatsOpen = filteredCategories.length > 0 && filteredCategories.every((cat, idx) => {
                              return Object.keys(expandedCategories).length === 0 ? idx === 0 : Boolean(expandedCategories[cat.id]);
                            });

                            const isLastCategory = filteredCategories.length <= 1 || currentActiveCatIdx >= filteredCategories.length - 1 || allCatsOpen;

                            return (
                              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                                {currentActiveCatIdx > 0 && !allCatsOpen && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const prevIdx = Math.max(currentActiveCatIdx - 1, 0);
                                      const prevCat = filteredCategories[prevIdx];
                                      if (prevCat) {
                                        setExpandedCategories({ [prevCat.id]: true });
                                      }
                                    }}
                                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                                  >
                                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                                    <span>Previous</span>
                                  </button>
                                )}

                                {!isLastCategory ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextIdx = Math.min(currentActiveCatIdx + 1, filteredCategories.length - 1);
                                      const nextCat = filteredCategories[nextIdx];
                                      if (nextCat) {
                                        setExpandedCategories({ [nextCat.id]: true });
                                      }
                                    }}
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/10 transition cursor-pointer"
                                  >
                                    <span>Next: {filteredCategories[Math.min(currentActiveCatIdx + 1, filteredCategories.length - 1)]?.name || 'Next Category'}</span>
                                    <ArrowRightIcon className="w-4 h-4 stroke-[2]" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleYearlyMonthSubmit(activeYearlyFiscalMonth)}
                                    disabled={isSubmittingEmp}
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/10 transition cursor-pointer"
                                  >
                                    {isSubmittingEmp ? (
                                      <>
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        <span>Submitting {monthName}...</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircleIcon className="w-4 h-4" />
                                        <span>Submit {monthName} Deliverables to Manager</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            );
                          })() : (
                            isEmpSubmitted ? (
                              <div className="flex items-center gap-2 px-5 py-2.5 bg-teal-50 text-teal-800 rounded-xl text-xs font-bold border border-teal-200 shadow-2xs">
                                <CheckCircleIcon className="w-4 h-4 text-teal-700" />
                                <span>Submitted to Manager (Locked)</span>
                              </div>
                            ) : (() => {
                              const expandedCatIndices = filteredCategories
                                .map((cat, idx) => {
                                  const isCatOpen = Object.keys(expandedCategories).length === 0 ? idx === 0 : Boolean(expandedCategories[cat.id]);
                                  return isCatOpen ? idx : -1;
                                })
                                .filter(idx => idx !== -1);

                              const currentActiveCatIdx = expandedCatIndices.length > 0
                                ? Math.max(...expandedCatIndices)
                                : 0;

                              const allCatsOpen = filteredCategories.length > 0 && filteredCategories.every((cat, idx) => {
                                return Object.keys(expandedCategories).length === 0 ? idx === 0 : Boolean(expandedCategories[cat.id]);
                              });

                              const isLastCategory = filteredCategories.length <= 1 || currentActiveCatIdx >= filteredCategories.length - 1 || allCatsOpen;

                              return (
                                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                                  {currentActiveCatIdx > 0 && !allCatsOpen && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const prevIdx = Math.max(currentActiveCatIdx - 1, 0);
                                        const prevCat = filteredCategories[prevIdx];
                                        if (prevCat) {
                                          setExpandedCategories({ [prevCat.id]: true });
                                        }
                                      }}
                                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                                    >
                                      <ArrowLeftIcon className="w-3.5 h-3.5" />
                                      <span>Previous</span>
                                    </button>
                                  )}

                                  {!isLastCategory ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextIdx = Math.min(currentActiveCatIdx + 1, filteredCategories.length - 1);
                                        const nextCat = filteredCategories[nextIdx];
                                        if (nextCat) {
                                          setExpandedCategories({ [nextCat.id]: true });
                                        }
                                      }}
                                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/10 transition cursor-pointer"
                                    >
                                      <span>Next: {filteredCategories[Math.min(currentActiveCatIdx + 1, filteredCategories.length - 1)]?.name || 'Next Category'}</span>
                                      <ArrowRightIcon className="w-4 h-4 stroke-[2]" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={handleEmployeeSubmit}
                                      disabled={isSubmittingEmp}
                                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/10 transition cursor-pointer"
                                    >
                                      {isSubmittingEmp ? (
                                        <>
                                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                          <span>Submitting...</span>
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircleIcon className="w-4 h-4" />
                                          <span>Submit Self-Assessment</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              );
                            })()
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })())}

          {/* Official Performance Report View */}
          {employeeSubTab === 'reports' && (!activeEmpResponse ? (
            <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-2xs p-8 sm:p-12 text-center space-y-5 animate-in fade-in duration-200 max-w-2xl mx-auto my-6">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
                <DocumentChartBarIcon className="w-8 h-8 text-slate-400" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  No Official Report
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  No Performance Report Available
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Official performance scorecards are generated and published only after a performance evaluation is assigned, submitted, and approved by your leadership team.
                </p>
              </div>
            </div>
          ) : ((() => {
            // Filter, deduplicate, and sort employee responses with latest report/cycle on top
            const rawUserResponses = responses.filter(isResponseForUser);
            const uniqueEmpResponses: EvaluationResponse[] = [];
            const seenKeys = new Set<string>();
            rawUserResponses.forEach(r => {
              const key = r.id || `${r.cycleId}_${(r as any).periodName || ''}`;
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueEmpResponses.push(r);
              }
            });

            const allEmpResponses = uniqueEmpResponses.sort((a, b) => {
              const timeA = new Date(a.serviceManagerApprovedAt || a.managerReviewedAt || a.employeeSubmittedAt || a.createdAt || 0).getTime();
              const timeB = new Date(b.serviceManagerApprovedAt || b.managerReviewedAt || b.employeeSubmittedAt || b.createdAt || 0).getTime();
              if (timeB !== timeA) return timeB - timeA;
              return (b.id || '').localeCompare(a.id || '');
            });

            // Calculate aggregate statistics for executive summary cards
            const totalRecords = allEmpResponses.length;
            const publishedCount = allEmpResponses.filter(r => r.status === 'approved' || r.status === 'sm_final_approval').length;
            const inReviewCount = totalRecords - publishedCount;

            let sumScores = 0;
            let validScoresCount = 0;
            allEmpResponses.forEach(r => {
              const rawSelf = r.employeeOverallScore != null ? Number(r.employeeOverallScore) : 0;
              const mgrSc = r.managerScore != null ? Number(r.managerScore) : (r.serviceManagerScore != null ? Number(r.serviceManagerScore) : null);
              const finalSc = mgrSc ?? rawSelf;
              if (finalSc > 0) {
                sumScores += finalSc;
                validScoresCount++;
              }
            });
            const avgHistoricalScore = validScoresCount > 0 ? sumScores / validScoresCount : 0;
            const latestResponse = allEmpResponses[0];
            const latestScore = latestResponse
              ? (latestResponse.managerScore != null
                ? Number(latestResponse.managerScore)
                : (latestResponse.serviceManagerScore != null
                  ? Number(latestResponse.serviceManagerScore)
                  : Number(latestResponse.employeeOverallScore ?? 0)))
              : 0;
            const latestRating = getRatingForScore(latestScore);

            const filteredHistoryResponses = allEmpResponses.filter(r => {
              const itemCycle = cycles.find(cy => cy.id === r.cycleId);
              const itemTitle = itemCycle?.name || itemCycle?.periodName || (r as any).periodName || '';
              const desc = itemCycle?.description || (r as any).description || '';
              const matchesSearch = !historySearchQuery.trim() ||
                itemTitle.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                desc.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                (r.periodName || '').toLowerCase().includes(historySearchQuery.toLowerCase());

              const isPublished = r.status === 'approved' || r.status === 'sm_final_approval';
              if (historyStatusFilter === 'published') return matchesSearch && isPublished;
              if (historyStatusFilter === 'in_review') return matchesSearch && !isPublished;
              return matchesSearch;
            });

            const getGradeBadgeColor = (gradeOrName: string | number) => {
              const g = String(gradeOrName).toUpperCase();
              if (g === 'A' || g === '5' || g.includes('OUTSTANDING')) return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
              if (g === 'B' || g === '4' || g.includes('EXCEED')) return 'bg-indigo-50 text-indigo-800 border border-indigo-200';
              if (g === 'C' || g === '3' || (g.includes('MEET') && !g.includes('NOT'))) return 'bg-blue-50 text-blue-800 border border-blue-200';
              if (g === 'D' || g === '2' || g.includes('IMPROVE')) return 'bg-amber-50 text-amber-800 border border-amber-200';
              return 'bg-rose-50 text-rose-800 border border-rose-200';
            };

            return (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* 1. Sleek Compact Header Bar */}
                <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AcademicCapIcon className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                        Evaluation History & Scorecards
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        {totalRecords} {totalRecords === 1 ? 'Record' : 'Records'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEmployeeSubTab('worksheet')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Back to Worksheet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition cursor-pointer"
                    >
                      <PrinterIcon className="w-3.5 h-3.5" />
                      <span>Print PDF</span>
                    </button>
                  </div>
                </div>

                {/* 2. Performance Scorecards Table */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  {/* Table Toolbar: Search + Filter Tabs */}
                  <div className="px-4 py-2.5 bg-slate-50/60 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="relative flex-1 max-w-sm">
                      <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search period or form..."
                        value={historySearchQuery}
                        onChange={e => setHistorySearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 text-slate-800 placeholder-slate-400 shadow-2xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {(['all', 'published', 'in_review'] as const).map(tabKey => {
                        const count = tabKey === 'all' ? totalRecords : tabKey === 'published' ? publishedCount : inReviewCount;
                        if (count === 0 && tabKey !== 'all') return null;
                        const label = tabKey === 'all' ? 'All' : tabKey === 'published' ? 'Published' : 'In Review';
                        const isActive = historyStatusFilter === tabKey;
                        return (
                          <button
                            key={tabKey}
                            type="button"
                            onClick={() => setHistoryStatusFilter(tabKey)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${isActive
                                ? 'bg-teal-700 text-white shadow-2xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                              }`}
                          >
                            {label} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider select-none">
                        <tr>
                          <th className="px-5 py-3 text-left">Evaluation Period & Form</th>
                          <th className="px-3 py-3 text-center">Status</th>
                          <th className="px-3 py-3 text-center">Self Score</th>
                          <th className="px-3 py-3 text-center">Manager Score</th>
                          <th className="px-3 py-3 text-center">Final Grade</th>
                          <th className="px-3 py-3 text-center">Consensus</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredHistoryResponses.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-10 text-slate-400 text-xs font-medium">
                              No evaluation records match your filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredHistoryResponses.map((r, idx) => {
                            const itemCycle = cycles.find(cy => cy.id === r.cycleId);
                            const itemTitle = itemCycle?.name || itemCycle?.periodName || (r as any).periodName || `Performance Evaluation Stage ${filteredHistoryResponses.length - idx}`;
                            const itemCategories = (itemCycle?.categories && itemCycle.categories.length > 0) ? itemCycle.categories : activeCategories;

                            const resolvePeriodTime = () => {
                              const desc = String(itemCycle?.description || (r as any).description || '').trim();
                              const rawPeriod = String(itemCycle?.periodName || (r as any).periodName || (r as any).reviewPeriod || '').trim();

                              if (itemCycle?.startDate && itemCycle?.endDate && itemCycle.startDate === itemCycle.endDate) {
                                return `Daily (${formatDisplayDate(itemCycle.startDate)})`;
                              }
                              if (itemCycle?.startDate && itemCycle?.endDate) {
                                return `${formatDisplayDate(itemCycle.startDate)} – ${formatDisplayDate(itemCycle.endDate)}`;
                              }
                              if (desc && desc.toLowerCase() !== (itemCycle?.name || '').toLowerCase()) {
                                return desc.replace(/^\(/, '').replace(/\)$/, '').trim();
                              }
                              if (rawPeriod && rawPeriod.toLowerCase() !== (itemCycle?.name || '').toLowerCase()) {
                                return rawPeriod.replace(/^\(/, '').replace(/\)$/, '').trim();
                              }
                              if (r.createdAt) {
                                return formatDisplayDate(r.createdAt);
                              }
                              return `Q${currentQuarter} ${currentYear}`;
                            };

                            const itemPeriodTime = resolvePeriodTime();

                            const rawSelf = r.employeeOverallScore != null ? Number(r.employeeOverallScore) : 0;
                            let itemSelfScore = rawSelf;
                            if (itemSelfScore === 0) {
                              if (r.managerScore != null && Number(r.managerScore) > 0) {
                                itemSelfScore = Number(r.managerScore);
                              } else if (r.kpiResponses && Object.keys(r.kpiResponses).length > 0) {
                                const kpis = Object.values(r.kpiResponses);
                                let tot = 0, cnt = 0;
                                kpis.forEach((item: any) => {
                                  if (typeof item === 'object' && item !== null) {
                                    const sc = item.earnedScore ?? item.earned_score ?? item.score;
                                    if (sc !== undefined && sc !== null && Number(sc) > 0) {
                                      tot += Number(sc);
                                      cnt++;
                                    }
                                  }
                                });
                                if (cnt > 0) itemSelfScore = tot / cnt;
                              }
                            }

                            const itemMgrScore = r.managerScore != null ? Number(r.managerScore) : (r.serviceManagerScore != null ? Number(r.serviceManagerScore) : null);
                            const itemFinalScore = itemMgrScore ?? itemSelfScore;
                            const itemRating = getRatingForScore(itemFinalScore);
                            const itemIsApproved = r.status === 'approved' || r.status === 'sm_final_approval';
                            const isAuditOpen = historyAuditBreakdownOpen[r.id] === true;

                            return (
                              <React.Fragment key={r.id || idx}>
                                <tr className={`hover:bg-slate-50/80 transition-colors ${isAuditOpen ? 'bg-teal-50/20' : ''}`}>
                                  {/* 1. Period & Title */}
                                  <td className="px-5 py-3 align-middle">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold text-xs text-slate-900">{itemTitle}</span>
                                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                                        <CalendarDaysIcon className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                        {itemPeriodTime}
                                      </span>
                                    </div>
                                  </td>

                                  {/* 2. Status */}
                                  <td className="px-3 py-3 align-middle text-center whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemIsApproved
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                      }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${itemIsApproved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                      {itemIsApproved ? 'Published' : 'In Review'}
                                    </span>
                                  </td>

                                  {/* 3. Self Score */}
                                  <td className="px-3 py-3 align-middle text-center whitespace-nowrap">
                                    <span className="font-mono font-bold text-xs text-slate-800">
                                      {itemSelfScore.toFixed(1)}%
                                    </span>
                                  </td>

                                  {/* 4. Manager Score */}
                                  <td className="px-3 py-3 align-middle text-center whitespace-nowrap">
                                    {itemMgrScore !== null ? (
                                      <span className="font-mono font-bold text-xs text-slate-800">
                                        {itemMgrScore.toFixed(1)}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-medium text-xs">Pending</span>
                                    )}
                                  </td>

                                  {/* 5. Final Grade Badge */}
                                  <td className="px-3 py-3 align-middle text-center whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-xs border ${getGradeBadgeColor(itemRating.name)}`}>
                                      <span className="font-bold">{itemRating.name}</span>
                                      <span className="opacity-90 font-mono text-[10px]">({itemFinalScore.toFixed(0)}%)</span>
                                    </span>
                                  </td>

                                  {/* 6. Consensus */}
                                  <td className="px-3 py-3 align-middle text-center whitespace-nowrap">
                                    {itemMgrScore !== null ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                                        {itemMgrScore === itemSelfScore
                                          ? '100% Aligned'
                                          : `${itemMgrScore > itemSelfScore ? '+' : ''}${(itemMgrScore - itemSelfScore).toFixed(1)}% Calibrated`}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-xs">—</span>
                                    )}
                                  </td>

                                  {/* 7. Actions */}
                                  <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const summary = `PERFORMANCE REPORT: ${itemTitle}\nPeriod: ${itemPeriodTime}\nSelf Score: ${itemSelfScore.toFixed(1)}%\nManager Score: ${itemMgrScore !== null ? `${itemMgrScore.toFixed(1)}%` : 'Pending'}\nFinal Grade: ${itemRating.name}`;
                                          navigator.clipboard.writeText(summary);
                                          alert('Performance Summary copied!');
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                        title="Copy Summary"
                                      >
                                        <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setHistoryAuditBreakdownOpen(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${isAuditOpen
                                            ? 'bg-teal-700 text-white shadow-2xs'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                          }`}
                                      >
                                        <span>{isAuditOpen ? 'Hide' : 'Details'}</span>
                                        <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${isAuditOpen ? 'rotate-180' : ''}`} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Collapsible Deliverable Audit Drawer */}
                                {isAuditOpen && (
                                  <tr>
                                    <td colSpan={7} className="p-4 bg-slate-50/70 border-y border-slate-200">
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                            <TableCellsIcon className="w-4 h-4 text-teal-700" />
                                            Deliverable Audit Breakdown ({itemTitle})
                                          </h4>
                                          <button
                                            type="button"
                                            onClick={() => setHistoryAuditBreakdownOpen(prev => ({ ...prev, [r.id]: false }))}
                                            className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 transition cursor-pointer"
                                          >
                                            Close ▲
                                          </button>
                                        </div>

                                        <div className="rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-200/90 bg-white">
                                          {itemCategories.map((cat, catIdx) => {
                                            const catEarned = cat.kpis.reduce((sum, k) => {
                                              const selfRes = r.kpiResponses?.[k.id];
                                              return sum + (selfRes?.earnedScore !== undefined ? Number(selfRes.earnedScore) : 0);
                                            }, 0);
                                            const isCatExpanded = Boolean(expandedAuditCategories[`${r.id}_${cat.id || catIdx}`]);

                                            return (
                                              <div key={cat.id} className="bg-white">
                                                <div
                                                  onClick={() => setExpandedAuditCategories(prev => ({ ...prev, [`${r.id}_${cat.id || catIdx}`]: !prev[`${r.id}_${cat.id || catIdx}`] }))}
                                                  className="bg-slate-50 hover:bg-slate-100/80 text-slate-800 px-4 py-2 cursor-pointer transition-colors duration-150 select-none group flex items-center justify-between gap-3 w-full"
                                                >
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <span className="p-0.5 rounded text-slate-400 group-hover:text-slate-700 transition-colors shrink-0">
                                                      <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-transform duration-200 ${isCatExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                                    </span>
                                                    <span className="font-semibold text-xs text-slate-900 truncate">
                                                      {catIdx + 1}. {cat.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                      ({cat.kpis.length})
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs whitespace-nowrap">
                                                      Earned: <strong className="text-teal-900 font-bold">{catEarned.toFixed(1)}%</strong> / {cat.weightage}%
                                                    </span>
                                                  </div>
                                                </div>

                                                {isCatExpanded && (
                                                  <div className="overflow-x-auto border-t border-slate-200/80">
                                                    <table className="w-full text-left text-xs border-collapse">
                                                      <thead className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider select-none">
                                                        <tr>
                                                          <th className="px-3.5 py-2 text-left font-bold">KPI Metric</th>
                                                          <th className="px-2 py-2 text-center font-bold">Weight</th>
                                                          <th className="px-2.5 py-2 text-center font-bold">Target</th>
                                                          <th className="px-3 py-2 text-center font-bold">Self Actual</th>
                                                          <th className="px-2.5 py-2 text-center font-bold">Self Score</th>
                                                          <th className="px-3 py-2 text-center font-bold bg-teal-50/60 text-teal-950 border-l border-teal-100">Mgr Actual</th>
                                                          <th className="px-2.5 py-2 text-center font-bold bg-teal-50/60 text-teal-950">Mgr Score</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-slate-100 bg-white">
                                                        {cat.kpis.map((kpi, kIdx) => {
                                                          const selfRes = r.kpiResponses?.[kpi.id];
                                                          const selfActual = selfRes?.actualValue !== undefined && selfRes?.actualValue !== null && selfRes?.actualValue !== ''
                                                            ? selfRes.actualValue
                                                            : '—';
                                                          const selfScore = selfRes?.earnedScore !== undefined ? Number(selfRes.earnedScore) : 0;
                                                          const selfRemarks = selfRes?.employeeRemarks || (selfRes as any)?.remarks || '';

                                                          const rAny = r as any;
                                                          const mgrActual = (rAny.managerKpiActuals && rAny.managerKpiActuals[kpi.id] !== undefined)
                                                            ? rAny.managerKpiActuals[kpi.id]
                                                            : (selfRes?.managerActualValue !== undefined && selfRes?.managerActualValue !== null && selfRes?.managerActualValue !== ''
                                                              ? selfRes.managerActualValue
                                                              : '—');
                                                          const mgrRemarks = (rAny.managerKpiRemarks && rAny.managerKpiRemarks[kpi.id] !== undefined)
                                                            ? rAny.managerKpiRemarks[kpi.id]
                                                            : (selfRes?.managerRemarks || '');
                                                          const mgrScore = selfRes?.managerScore !== undefined && selfRes?.managerScore !== null ? Number(selfRes.managerScore) : null;

                                                          const targetDisplay = (() => {
                                                            const t = String(kpi.targetFromManager !== undefined && kpi.targetFromManager !== '' ? kpi.targetFromManager : (kpi.targetValue ?? '')).trim();
                                                            const u = String(kpi.unit || '').trim();
                                                            if (!t) return '—';
                                                            if (!u || t.toLowerCase().includes(u.toLowerCase())) return t;
                                                            return `${t} ${u}`;
                                                          })();

                                                          return (
                                                            <tr
                                                              key={kpi.id || kIdx}
                                                              className="group/metricRow hover:bg-slate-50/80 transition-colors"
                                                            >
                                                              <td className="px-3.5 py-2 align-middle">
                                                                <div className="flex flex-col gap-0.5">
                                                                  <span className="font-semibold text-slate-800 text-xs">{kpi.name}</span>
                                                                  {kpi.description && (
                                                                    <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{kpi.description}</div>
                                                                  )}
                                                                </div>
                                                              </td>
                                                              <td className="px-2 py-2 text-center align-middle font-mono font-medium text-slate-600 whitespace-nowrap">
                                                                {kpi.weightage || Math.round(cat.weightage / Math.max(1, cat.kpis.length))}%
                                                              </td>
                                                              <td className="px-2.5 py-2 text-center align-middle font-mono text-slate-600 whitespace-nowrap">
                                                                {targetDisplay}
                                                              </td>
                                                              <td className="px-3 py-2 text-center align-middle text-slate-800 whitespace-nowrap font-medium">
                                                                <div className="flex flex-col items-center justify-center gap-1">
                                                                  <span>{selfActual} {kpi.unit || ''}</span>
                                                                  {(selfRemarks?.trim() || mgrRemarks?.trim()) && (
                                                                    <DeliverableRemarksHover
                                                                      selfRemarks={selfRemarks}
                                                                      mgrRemarks={mgrRemarks}
                                                                      align="center"
                                                                    >
                                                                      <div className="flex items-center justify-center gap-1 mt-0.5 flex-wrap cursor-pointer">
                                                                        {selfRemarks?.trim() && (
                                                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary-50 text-primary-700 border border-primary-200 cursor-help shrink-0">
                                                                            <ChatBubbleLeftEllipsisIcon className="w-2.5 h-2.5 text-primary-600" />
                                                                            <span>Emp</span>
                                                                          </span>
                                                                        )}
                                                                        {mgrRemarks?.trim() && (
                                                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-200 cursor-help shrink-0">
                                                                            <ChatBubbleLeftEllipsisIcon className="w-2.5 h-2.5 text-teal-600" />
                                                                            <span>Mgr</span>
                                                                          </span>
                                                                        )}
                                                                      </div>
                                                                    </DeliverableRemarksHover>
                                                                  )}
                                                                </div>
                                                              </td>
                                                              <td
                                                                className="px-2.5 py-2 text-center align-middle font-bold text-slate-900 whitespace-nowrap"
                                                              >
                                                                <div className="inline-flex items-center gap-1">
                                                                  <span>{selfScore.toFixed(1)}%</span>
                                                                  {selfRemarks?.trim() && <ChatBubbleLeftEllipsisIcon className="w-3 h-3 text-primary-500/70 shrink-0" />}
                                                                </div>
                                                              </td>
                                                              <td className="px-3 py-2 text-center align-middle bg-teal-50/30 font-medium text-slate-900 border-l border-teal-100 whitespace-nowrap">
                                                                {mgrActual !== '—' ? `${mgrActual} ${kpi.unit || ''}` : '—'}
                                                              </td>
                                                              <td
                                                                className="px-2.5 py-2 text-center align-middle bg-teal-50/30 whitespace-nowrap font-bold text-teal-950"
                                                              >
                                                                <div className="inline-flex items-center gap-1">
                                                                  <span>{mgrScore !== null ? `${mgrScore.toFixed(1)}%` : '—'}</span>
                                                                  {mgrRemarks?.trim() && <ChatBubbleLeftEllipsisIcon className="w-3 h-3 text-teal-600/70 shrink-0" />}
                                                                </div>
                                                              </td>
                                                            </tr>
                                                          );
                                                        })}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Leadership Feedback Box inside drawer */}
                                        {r.managerRemarks && (
                                          <div className="p-3 bg-teal-50 rounded-xl border border-teal-200/80 space-y-1">
                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-900 uppercase">
                                              <SparklesIcon className="w-3.5 h-3.5 text-teal-700" />
                                              Leadership Feedback
                                            </div>
                                            <p className="text-xs text-teal-950 leading-relaxed italic">
                                              "{r.managerRemarks}"
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Performance Rating & Grading Scale Rubric Card (Interactive & Sleek) */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                        <AcademicCapIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">Performance Rating & Grading Scale</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Official benchmark rubric for score ranges, criteria, and 5-tier grading</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRubricMatrix(!showRubricMatrix)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer self-start sm:self-auto"
                    >
                      <span>{showRubricMatrix ? 'Hide Full Matrix' : 'View Full Rubric Table'}</span>
                      <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${showRubricMatrix ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* 5-Card Grade Tier Ribbon */}
                  <div className="p-4 bg-slate-50/50">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                      {getRatingScale().map((tier, tierIdx) => {
                        const isCurrentTier = latestScore >= tier.minScore && latestScore <= tier.maxScore;
                        return (
                          <div
                            key={tier.name || tierIdx}
                            className={`p-3 rounded-xl border transition-all ${isCurrentTier
                                ? 'bg-teal-50/90 border-teal-500 shadow-xs ring-2 ring-teal-600/20'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <div className="flex items-center gap-0.5 text-amber-400">
                                {[1, 2, 3, 4, 5].map(s => (
                                  s <= tier.stars ? (
                                    <StarSolid key={s} className="w-2.5 h-2.5 fill-amber-400" />
                                  ) : (
                                    <StarIcon key={s} className="w-2.5 h-2.5 text-slate-200" />
                                  )
                                ))}
                              </div>
                              <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {tier.scoreRangeText}%
                              </span>
                            </div>
                            <div className="font-bold text-xs text-slate-900 leading-snug">{tier.name}</div>
                            {isCurrentTier && (
                              <div className="mt-2 text-[9px] font-black text-teal-800 bg-teal-100/80 px-1.5 py-0.5 rounded text-center uppercase tracking-wider">
                                Your Tier
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expanded Full Details Rubric Table */}
                  {showRubricMatrix && (
                    <div className="border-t border-slate-200 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-2.5 w-48">Rating Tier</th>
                            <th className="px-4 py-2.5">Measure / Evaluation Criteria</th>
                            <th className="px-4 py-2.5 w-32 text-center">Score Range</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {getRatingScale().map((tier, tierIdx) => {
                            const isCurrentTier = latestScore >= tier.minScore && latestScore <= tier.maxScore;
                            return (
                              <tr
                                key={tier.name || tierIdx}
                                className={`transition-colors ${isCurrentTier ? 'bg-teal-50/70 font-semibold' : 'hover:bg-slate-50/60'}`}
                              >
                                <td className="px-4 py-3 align-top">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-slate-900">{tier.name}</span>
                                    {isCurrentTier && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-teal-700 text-white uppercase">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600 leading-relaxed text-[11px] align-top">
                                  {tier.description}
                                </td>
                                <td className="px-4 py-3 text-center align-top whitespace-nowrap font-mono font-bold text-xs text-slate-800">
                                  {tier.scoreRangeText}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()))}
        </div>
      )}
      {/* ========================================================================= */}
      {/* 4. MANAGER REVIEW VIEW (DIRECT REVIEWS) */}
      {/* ========================================================================= */}
      {activeRole === 'manager' && (
        isMgrCreateModalOpen ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Unified Manager Assign Performance Metrics Card (Inline View) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
              {/* 1. Clean Modal Header */}
              <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-200/80 bg-white">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMgrCreateModalOpen(false);
                      setMgrModalEmpSearch('');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-xs font-medium transition cursor-pointer"
                    title="Return to Direct Reviews"
                  >
                    <ArrowLeftIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Back to Reviews</span>
                  </button>
                  <div className="h-4 w-px bg-slate-200" />
                  <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
                    Assign Performance Metrics
                  </h3>
                </div>

                {mgrAssignPeriod && (
                  <div className="flex items-center gap-1.5 bg-teal-50/70 border border-teal-200/80 px-2.5 py-1 rounded-lg">
                    <span className="text-[10px] text-teal-700 font-medium uppercase tracking-wider">Period:</span>
                    <span className="text-xs font-semibold text-teal-900">
                      {mgrAssignPeriod}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Sleek 2-Step Navigation Tab Bar */}
              <div className="px-5 pt-3 bg-white">
                <div className="grid grid-cols-2 gap-2 border-b border-slate-200/80 pb-3">
                  {/* Step 1 Tab */}
                  <button
                    type="button"
                    onClick={() => setMgrWizardStep(1)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl transition cursor-pointer text-left ${
                      mgrWizardStep === 1
                        ? 'bg-teal-50/80 border border-teal-200/90'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg text-xs font-semibold flex items-center justify-center shrink-0 transition ${
                      mgrWizardStep === 1
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      1
                    </span>
                    <div className="min-w-0">
                      <div className={`text-xs font-medium truncate ${mgrWizardStep === 1 ? 'text-teal-900 font-semibold' : 'text-slate-600'}`}>
                        Team & Period
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Timeline & assignees
                      </div>
                    </div>
                  </button>

                  {/* Step 2 Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      if (mgrAssignEmpIds.length === 0) {
                        showAlert('Please select at least one team member in Step 1 before proceeding to Deliverables & Targets.', 'Member Selection Required');
                        return;
                      }
                      setMgrWizardStep(2);
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-xl transition cursor-pointer text-left ${
                      mgrWizardStep === 2
                        ? 'bg-teal-50/80 border border-teal-200/90'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg text-xs font-semibold flex items-center justify-center shrink-0 transition ${
                      mgrWizardStep === 2
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      2
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-medium truncate ${mgrWizardStep === 2 ? 'text-teal-900 font-semibold' : 'text-slate-600'}`}>
                          Deliverables & Targets
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                          mgrTotalWeightage === 100 && areAllMgrCategoriesBalanced
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {mgrTotalWeightage}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        KPIs & criteria
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Form Body - Clean & Modern */}
              <form onSubmit={handleMgrSubmitAssignment} className="p-4 sm:p-5 space-y-4">
                {/* Step 1: Target Team, Frequency & Period Configuration */}
                {mgrWizardStep === 1 && (
                  <div className="space-y-3.5 animate-in fade-in duration-150">
                    <div className="bg-slate-50/60 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                      {/* Period Configuration Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* 1. Target Department / Team */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Department / Team <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={mgrAssignTeamId}
                            onChange={e => handleMgrTeamChange(e.target.value)}
                            className="w-full h-10 px-3 bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500/20 transition cursor-pointer"
                          >
                        {managerDepartments.length > 1 && (
                          <option value="all_teams">All Subordinates</option>
                        )}
                        {managerDepartments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                        {managerDepartments.length === 0 && (
                          <option value="all_teams">All Subordinates</option>
                        )}
                      </select>
                    </div>

                    {/* 2. Frequency Selector */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Cadence / Frequency <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={mgrPeriodType}
                        onChange={e => {
                          const newType = e.target.value as any;
                          setMgrPeriodType(newType);
                          syncPeriodAndFormName(newType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                        }}
                        className="w-full h-10 px-3 bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500/20 transition cursor-pointer"
                      >
                        <option value="quarterly">Quarterly</option>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="daily">Daily</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>

                    {/* 3. Sub-period Inputs */}
                    {mgrPeriodType === 'quarterly' && (
                      <>
                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Quarter / Stage <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={mgrPeriodQuarter}
                            onChange={e => {
                              const newQ = Number(e.target.value);
                              setMgrPeriodQuarter(newQ);
                              syncPeriodAndFormName(mgrPeriodType, newQ, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-10 px-3 bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500/20 transition cursor-pointer"
                          >
                            {QUARTERS_INFO.map(q => (
                              <option key={q.q} value={q.q}>{q.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Year</label>
                          <input
                            type="number"
                            value={mgrPeriodYear}
                            onChange={e => {
                              const newYr = Number(e.target.value);
                              setMgrPeriodYear(newYr);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, newYr, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-10 px-3 bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500/20 transition"
                          />
                        </div>
                      </>
                    )}

                    {mgrPeriodType === 'monthly' && (
                      <>
                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Month <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={mgrPeriodMonth}
                            onChange={e => {
                              const newM = Number(e.target.value);
                              setMgrPeriodMonth(newM);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, newM, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-10 px-3 bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500/20 transition cursor-pointer"
                          >
                            {MONTH_NAMES.map((name, idx) => (
                              <option key={name} value={idx + 1}>{name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Year</label>
                          <input
                            type="number"
                            value={mgrPeriodYear}
                            onChange={e => {
                              const newYr = Number(e.target.value);
                              setMgrPeriodYear(newYr);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, newYr, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-10 px-3 bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500/20 transition"
                          />
                        </div>
                      </>
                    )}

                    {mgrPeriodType === 'weekly' && (
                      <>
                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            From Date <span className="text-rose-500">*</span>
                          </label>
                          <DatePicker
                            value={mgrPeriodFromDate}
                            onChange={(newFrom: string) => {
                              setMgrPeriodFromDate(newFrom);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, newFrom, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            placeholder="Select From Date"
                            className="w-full font-medium text-slate-700"
                          />
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            To Date <span className="text-rose-500">*</span>
                          </label>
                          <DatePicker
                            value={mgrPeriodToDate}
                            onChange={(newTo: string) => {
                              setMgrPeriodToDate(newTo);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, newTo, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            placeholder="Select To Date"
                            className="w-full font-medium text-slate-700"
                          />
                        </div>
                      </>
                    )}

                    {mgrPeriodType === 'daily' && (
                      <div className="sm:col-span-2 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                          Due Date <span className="text-rose-500">*</span>
                        </label>
                        <DatePicker
                          value={mgrPeriodDueDate}
                          onChange={(newDue: string) => {
                            setMgrPeriodDueDate(newDue);
                            syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, newDue, mgrAssignTeamId);
                          }}
                          placeholder="Select Due Date"
                          className="w-full font-medium text-slate-700"
                        />
                      </div>
                    )}

                    {(mgrPeriodType === 'yearly' || (mgrPeriodType as string) === 'annual') && (
                      <div className="sm:col-span-2 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                          Evaluation Year <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={mgrPeriodYear}
                          onChange={e => {
                            const newYr = Number(e.target.value);
                            setMgrPeriodYear(newYr);
                            syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, newYr, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                          }}
                          className="w-full h-10 px-3 bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500/20 transition"
                        />
                      </div>
                    )}
                  </div>

                  {/* Inline Form Title Bar */}
                  <div className="flex items-center gap-3 px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
                    <label className="text-xs font-medium text-slate-600 shrink-0 flex items-center gap-1.5">
                      <PencilSquareIcon className="w-3.5 h-3.5 text-teal-600" />
                      <span>Form Title:</span>
                    </label>
                    <input
                      type="text"
                      value={mgrAssignFormName}
                      onChange={e => setMgrAssignFormName(e.target.value)}
                      placeholder="Evaluation Form Title"
                      className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-500/20 transition"
                    />
                  </div>

                  {/* Assign Members Section */}
                  {(() => {
                    const baseTeamMembers = managerAssignableEmployees.filter((e: any) =>
                      isEmployeeActive(e) && isEmpInSelectedTeam(e, mgrAssignTeamId)
                    );

                    const alreadyAssignedCount = baseTeamMembers.filter((m: any) => isEmpAlreadyAssignedForPeriod(m)).length;
                    const pendingEvalCount = baseTeamMembers.filter((m: any) => !isEmpAlreadyAssignedForPeriod(m) && Boolean(getEmpPendingEvaluation(m))).length;
                    const assignableMembers = baseTeamMembers.filter((m: any) => !isEmpAlreadyAssignedForPeriod(m) && !getEmpPendingEvaluation(m));
                    const activeSelectedCount = mgrAssignEmpIds.filter(id => assignableMembers.some((m: any) => String(m.employee_id || '') === id)).length;
                    const unselectedCount = assignableMembers.length - activeSelectedCount;

                    // Filter based on Search + Filter Tab ('all' | 'selected' | 'unselected')
                    const filteredMembers = baseTeamMembers.filter((e: any) => {
                      const empId = String(e.employee_id || '');
                      const isSelected = mgrAssignEmpIds.includes(empId);

                      if (mgrMemberFilterTab === 'selected' && !isSelected) return false;
                      if (mgrMemberFilterTab === 'unselected' && isSelected) return false;

                      if (mgrModalEmpSearch.trim()) {
                        const q = mgrModalEmpSearch.toLowerCase();
                        const name = `${e.first_name || ''} ${e.last_name || ''} ${e.name || ''}`.toLowerCase();
                        const id = empId.toLowerCase();
                        const des = String(e.designation || e.role || e.department || '').toLowerCase();
                        return name.includes(q) || id.includes(q) || des.includes(q);
                      }
                      return true;
                    });

                    return (
                      <div className="pt-2 border-t border-slate-200/80">
                        <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden transition-all duration-200">
                          {/* Top Header Row */}
                          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 ${
                            !mgrCustomizeMembers ? 'bg-white' : 'bg-slate-50/70 border-b border-slate-200/70'
                          }`}>
                            {/* Left: Summary info */}
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                !mgrCustomizeMembers
                                  ? 'bg-teal-50 text-teal-600 border border-teal-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                <UserGroupIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-slate-800">
                                    Assign Team Members
                                  </span>
                                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                    !mgrCustomizeMembers
                                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                                      : 'bg-white text-slate-700 border-slate-200 shadow-2xs'
                                  }`}>
                                    {!mgrCustomizeMembers
                                      ? `All (${assignableMembers.length}) Selected`
                                      : `${activeSelectedCount} of ${assignableMembers.length} Selected`}
                                  </span>

                                  {pendingEvalCount > 0 && (
                                    <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                      ⏳ {pendingEvalCount} pending eval
                                    </span>
                                  )}
                                  {alreadyAssignedCount > 0 && (
                                    <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                      🔒 {alreadyAssignedCount} booked
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                                  {!mgrCustomizeMembers
                                    ? `All active direct reports will receive this evaluation. Turn on toggle to exclude specific members.`
                                    : `Customize assignees below. Members marked with ✓ will receive this evaluation.`}
                                </p>
                              </div>
                            </div>

                            {/* Right: Master Toggle */}
                            <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0 bg-slate-50 sm:bg-transparent p-1.5 sm:p-0 rounded-lg">
                              <span className="text-xs font-medium text-slate-600 select-none">
                                Exclude Members
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={mgrCustomizeMembers}
                                onClick={() => {
                                  const nextVal = !mgrCustomizeMembers;
                                  setMgrCustomizeMembers(nextVal);
                                  if (!nextVal) {
                                    // When turned OFF: auto-select ALL assignable members
                                    const allIds = assignableMembers.map((e: any) => String(e.employee_id || '')).filter(Boolean);
                                    setMgrAssignEmpIds(allIds);
                                  }
                                }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  mgrCustomizeMembers ? 'bg-teal-600' : 'bg-slate-300 hover:bg-slate-400'
                                }`}
                                title={mgrCustomizeMembers ? 'Click to Auto-Select All & Collapse' : 'Click to Expand & Deselect Members'}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                    mgrCustomizeMembers ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Member Selection Body */}
                          {mgrCustomizeMembers && (
                            <div className="p-3.5 space-y-3 bg-white animate-in fade-in duration-150">
                              {/* Toolbar: Segmented Filter Tabs + Search + Deselect/Select All */}
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                {/* Left: Filter Tabs */}
                                <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs self-start">
                                  <button
                                    type="button"
                                    onClick={() => setMgrMemberFilterTab('all')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                      mgrMemberFilterTab === 'all'
                                        ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    All ({baseTeamMembers.length})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMgrMemberFilterTab('selected')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                      mgrMemberFilterTab === 'selected'
                                        ? 'bg-teal-600 text-white shadow-2xs font-semibold'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    Selected ({activeSelectedCount})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMgrMemberFilterTab('unselected')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                      mgrMemberFilterTab === 'unselected'
                                        ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    Excluded ({unselectedCount})
                                  </button>
                                </div>

                                {/* Right: Search & Select All */}
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={mgrModalEmpSearch}
                                      onChange={e => setMgrModalEmpSearch(e.target.value)}
                                      placeholder="Search member name or ID..."
                                      className="w-48 sm:w-60 h-9 px-3 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 shadow-2xs transition"
                                    />
                                    {mgrModalEmpSearch && (
                                      <button
                                        type="button"
                                        onClick={() => setMgrModalEmpSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    disabled={assignableMembers.length === 0}
                                    onClick={() => handleMgrToggleSelectAll(baseTeamMembers)}
                                    className={`h-9 text-xs font-medium px-3.5 rounded-lg border shadow-2xs transition cursor-pointer flex items-center justify-center ${
                                      assignableMembers.length === 0
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : 'text-teal-700 hover:text-teal-800 bg-white border-teal-200 hover:bg-teal-50/50'
                                    }`}
                                  >
                                    {(() => {
                                      if (assignableMembers.length === 0) return 'No Members';
                                      const assignableIds = assignableMembers.map((e: any) => String(e.employee_id || '')).filter(Boolean);
                                      const allSelected = assignableIds.length > 0 && assignableIds.every((id: string) => mgrAssignEmpIds.includes(id));
                                      return allSelected ? 'Deselect All' : 'Select All';
                                    })()}
                                  </button>
                                </div>
                              </div>

                              {/* Member Cards Grid */}
                              {filteredMembers.length === 0 ? (
                                <div className="p-6 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                                  {baseTeamMembers.length === 0
                                    ? 'No team members found under this department.'
                                    : 'No members match the current filter or search criteria.'}
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
                                  {filteredMembers.map((emp: any) => {
                                    const empId = String(emp.employee_id || '');
                                    const pendingEval = getEmpPendingEvaluation(emp);
                                    const isAlreadyAssigned = isEmpAlreadyAssignedForPeriod(emp);
                                    const isBlocked = Boolean(pendingEval) || isAlreadyAssigned;
                                    const isSelected = !isBlocked && mgrAssignEmpIds.includes(empId);
                                    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || 'Employee';
                                    const initial = fullName.charAt(0).toUpperCase() || 'E';
                                    const pendingStatus = pendingEval ? getPendingStatusLabel(pendingEval) : null;
                                    const designation = emp.designation || emp.role || emp.department || '';

                                    return (
                                      <div
                                        key={empId}
                                        onClick={() => !isBlocked && handleMgrToggleEmp(empId)}
                                        className={`group relative flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all duration-150 select-none ${
                                          isBlocked
                                            ? 'bg-slate-50/90 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                            : isSelected
                                              ? 'bg-teal-50/50 border-teal-400 ring-1 ring-teal-500/20 shadow-xs cursor-pointer hover:bg-teal-50/80 hover:border-teal-500'
                                              : 'bg-white border-slate-200/90 text-slate-600 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs cursor-pointer'
                                        }`}
                                        title={
                                          pendingEval && pendingStatus
                                            ? `${fullName}: ${pendingStatus.tooltip}`
                                            : isAlreadyAssigned
                                              ? `${fullName} is already assigned metrics for ${mgrAssignPeriod || 'this period'}.`
                                              : `Click to ${isSelected ? 'deselect' : 'select'} ${fullName}`
                                        }
                                      >
                                        {/* Left: Avatar + Member Info */}
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <span className={`w-7.5 h-7.5 rounded-full text-xs font-medium flex items-center justify-center shrink-0 transition-colors ${
                                            isBlocked
                                              ? 'bg-slate-200 text-slate-500'
                                              : isSelected
                                                ? 'bg-teal-600 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 border border-slate-200/70'
                                          }`}>
                                            {initial}
                                          </span>
                                          <div className="min-w-0">
                                            <div className={`text-xs truncate ${isBlocked ? 'text-slate-400 font-normal' : isSelected ? 'text-slate-900 font-medium' : 'text-slate-700 font-medium'}`}>
                                              {fullName}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                              <span className="font-mono text-slate-500 font-medium">#{empId}</span>
                                              {designation && (
                                                <>
                                                  <span className="text-slate-300">•</span>
                                                  <span className="truncate max-w-24 text-slate-500 font-normal">{designation}</span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Right: Checkmark Indicator or Status Badge */}
                                        <div className="shrink-0 flex items-center">
                                          {pendingEval && pendingStatus ? (
                                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md border ${pendingStatus.badgeColor}`}>
                                              {pendingStatus.badgeText}
                                            </span>
                                          ) : isAlreadyAssigned ? (
                                            <span className="text-[9px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                                              Booked
                                            </span>
                                          ) : isSelected ? (
                                            <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px] font-bold shadow-2xs">
                                              ✓
                                            </span>
                                          ) : (
                                            <span className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center hover:border-teal-400 transition" />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Step 1 Footer Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMgrCreateModalOpen(false);
                      setMgrModalEmpSearch('');
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={mgrAssignEmpIds.length === 0}
                    onClick={() => {
                      if (mgrAssignEmpIds.length === 0) {
                        showAlert('Please select at least one team member to assign metrics to.', 'Member Required');
                        return;
                      }
                      setMgrWizardStep(2);
                    }}
                    className={`flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-medium text-white rounded-xl shadow-2xs transition-all cursor-pointer ${
                      mgrAssignEmpIds.length > 0
                        ? 'bg-teal-600 hover:bg-teal-700'
                        : 'bg-slate-300 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span>Next: Deliverables & Targets</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PERFORMANCE METRICS, DESCRIPTIONS & TARGET SCORES */}
            {mgrWizardStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Summary Context Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-teal-50/70 border border-teal-200/80 shadow-2xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                      <span>Target:</span>
                      <span className="bg-white text-teal-800 px-2.5 py-0.5 rounded-lg border border-teal-200 font-bold">
                        {mgrAssignPeriod || 'Active Period'}
                      </span>
                    </span>
                    <span className="text-xs text-teal-800">
                      Assigning to <strong className="text-teal-950 font-bold">{mgrAssignEmpIds.length}</strong> team members
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMgrWizardStep(1)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 bg-white hover:bg-teal-50/50 px-2.5 py-1 rounded-lg border border-teal-200/80 shadow-2xs transition cursor-pointer self-start sm:self-auto"
                  >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    <span>Edit Step 1</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Step 2 Header with Integrated Weightage & Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/90 shadow-2xs">
                        Step 2
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        Deliverables & Targets
                      </h4>

                      {/* Integrated Total Weightage Badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs transition-colors ${mgrTotalWeightage === 100 && areAllMgrCategoriesBalanced
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}>
                        {mgrTotalWeightage === 100 && areAllMgrCategoriesBalanced ? (
                          <CheckCircleIcon className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <ExclamationTriangleIcon className="w-3 h-3 text-amber-600 shrink-0" />
                        )}
                        <span>
                          Weight: {mgrTotalWeightage}% / 100%
                          {!areAllMgrCategoriesBalanced && ' (Unbalanced)'}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {/* Collapsible Syntax Guide Toggle */}
                      <button
                        type="button"
                        onClick={() => setShowTargetGuide(prev => !prev)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition border shadow-2xs cursor-pointer ${showTargetGuide
                            ? 'bg-teal-50 text-teal-800 border-teal-300 ring-1 ring-teal-500/20'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        title="Show / hide Deliverable Metric Types & Supported Target Symbols guide"
                      >
                        <InformationCircleIcon className={`w-3.5 h-3.5 ${showTargetGuide ? 'text-teal-600' : 'text-slate-500'}`} />
                        <span>Syntax Guide</span>
                        <span className="text-[9px] text-slate-400">{showTargetGuide ? '▲' : '▼'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleMgrAddCategory}
                        disabled={mgrTotalWeightage >= 100}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs ${mgrTotalWeightage >= 100
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            : 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer shadow-teal-700/20'
                          }`}
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>Add Category</span>
                      </button>
                    </div>
                  </div>

                  {/* Team Form Selector Bar */}
                  {(() => {
                    const activeDeptName = mgrAssignTeamId === 'all_teams' ? '' : mgrAssignTeamId;
                    const validTemplates = (mgrTemplates && mgrTemplates.length > 0)
                      ? mgrTemplates.filter(t => (t.team_id || t.team_name) || (t.template_name && !t.template_name.match(/^Form [1-4]$/)) || (t.categories && t.categories.length > 0))
                      : [];

                    const defaultMgrFormName = activeDeptName || (selectedTeam?.name || 'Form 1');
                    const displayedTemplates = validTemplates.length > 0
                      ? validTemplates
                      : [{ template_key: 'form_1', template_name: defaultMgrFormName, is_default: true, categories: [] }];

                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-100/90 border border-slate-200/90 shadow-2xs">
                        {/* Left: Tab items */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 px-2 py-0.5 select-none flex items-center gap-1">
                            <BriefcaseIcon className="w-3.5 h-3.5 text-slate-500" />
                            <span>Team Form:</span>
                          </span>

                          {displayedTemplates.map(t => {
                            const isActive = t.template_key === activeTemplateKey;
                            return (
                              <button
                                key={t.template_key}
                                type="button"
                                onClick={() => handleSelectTemplate(t.template_key)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer select-none ${isActive
                                    ? 'bg-white text-teal-900 shadow-2xs border border-slate-200/90 ring-1 ring-teal-500/20'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                  }`}
                              >
                                <span>{t.template_name || `Form ${t.template_key.replace('form_', '')}`}</span>
                                {isActive && <CheckIcon className="w-3 h-3 text-teal-600" />}
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={handleAddNewTemplate}
                            className="px-2 py-1 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:bg-white/80 rounded-lg transition cursor-pointer flex items-center gap-1"
                            title="Add another Form slot for a new team"
                          >
                            <PlusIcon className="w-3 h-3" />
                            <span>New Form</span>
                          </button>

                          {isLoadingTemplates && (
                            <div className="flex items-center gap-1 text-[10px] text-teal-700 font-medium px-2 py-0.5">
                              <ArrowPathIcon className="w-3 h-3 animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 px-1">
                          {isRenamingTemplate ? (
                            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-teal-400 shadow-2xs">
                              <input
                                type="text"
                                value={renameTemplateInput}
                                onChange={e => setRenameTemplateInput(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleConfirmRenameTemplate();
                                  if (e.key === 'Escape') setIsRenamingTemplate(false);
                                }}
                                className="h-6 px-1.5 text-xs bg-transparent border-none text-slate-900 font-semibold focus:outline-none w-28 sm:w-36"
                                placeholder="e.g. Media 2"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={handleConfirmRenameTemplate}
                                className="px-2 py-0.5 text-[10px] font-bold text-white bg-teal-700 hover:bg-teal-800 rounded transition cursor-pointer"
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsRenamingTemplate(false)}
                                className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 hover:bg-slate-100 rounded transition cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleStartRenameTemplate}
                              className="px-2 py-0.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition cursor-pointer flex items-center gap-1"
                              title="Rename this form"
                            >
                              <PencilSquareIcon className="w-3.5 h-3.5 text-slate-500" />
                              <span>Rename</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(activeTemplateKey)}
                            className="px-2 py-0.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition cursor-pointer flex items-center gap-1"
                            title="Delete this form"
                          >
                            <TrashIcon className="w-3.5 h-3.5 text-rose-500" />
                            <span>Delete Form</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveActiveTemplate}
                            disabled={isSavingTemplate}
                            className="flex items-center gap-1 px-2.5 py-0.5 bg-white hover:bg-slate-50 text-teal-800 border border-slate-200/90 rounded-md text-xs font-semibold transition shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Click to manually save changes to this form"
                          >
                            {isSavingTemplate ? (
                              <ArrowPathIcon className="w-3.5 h-3.5 animate-spin text-teal-600" />
                            ) : (
                              <CheckIcon className="w-3.5 h-3.5 text-teal-600" />
                            )}
                            <span>{isSavingTemplate ? 'Saving...' : 'Save Form'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Collapsible Syntax & Metric Types Guide (Shown only when toggled) */}
                  {showTargetGuide && (
                    <div className="rounded-xl bg-white border border-teal-200/90 shadow-sm p-3 space-y-2 text-xs animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <InformationCircleIcon className="w-4 h-4 text-teal-600 shrink-0" />
                          <span className="font-bold text-slate-800 text-xs">Deliverable Syntax & Metric Types Guide</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowTargetGuide(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs p-0.5 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-teal-50/50 border border-teal-100">
                          <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">+</span>
                          <div>
                            <div className="font-bold text-teal-950 text-[11px]">+ Standard Metric</div>
                            <div className="text-[10px] text-slate-500 font-normal">Higher is better • Output, Productivity & Goals</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-rose-50/50 border border-rose-100">
                          <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">−</span>
                          <div>
                            <div className="font-bold text-rose-950 text-[11px]">− Negative / Penalty Metric</div>
                            <div className="text-[10px] text-rose-600 font-normal">Lower is better • Errors, Escalations & Deductions</div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-100 flex flex-wrap items-center gap-1 text-[11px]">
                        <span className="font-bold text-slate-600 mr-1">Target Symbols:</span>
                        <code className="px-1 py-0.2 rounded bg-slate-100 text-slate-800 font-mono text-[10px]">&lt; N (e.g. &lt; 2 errors)</code>
                        <code className="px-1 py-0.2 rounded bg-slate-100 text-slate-800 font-mono text-[10px]">&lt;= N (e.g. &lt;= 3 max)</code>
                        <code className="px-1 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono text-[10px]">&gt;= N (e.g. &gt;= 95% SLA)</code>
                        <code className="px-1 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono text-[10px]">&gt; N (e.g. &gt; 10 targets)</code>
                        <code className="px-1 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200 font-mono text-[10px]">0 misses (Zero tolerance)</code>
                        <code className="px-1 py-0.2 rounded bg-slate-100 text-slate-800 font-mono text-[10px]">N (Exact number)</code>
                      </div>
                    </div>
                  )}

                  {/* Categories & KPIs List */}
                  <div className="space-y-3">
                    {mgrAssignCategories.map((cat, catIdx) => {
                      const catSum = cat.kpis.reduce((sum, k) => sum + (Number(k.targetScore) || 0), 0);
                      const isBalanced = Math.abs(catSum - Number(cat.weightage)) <= 0.05;

                      return (
                        <div key={cat.id} className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
                          {/* Category Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {catIdx + 1}
                              </span>
                              <input
                                type="text"
                                value={cat.name}
                                onChange={e => handleMgrUpdateCategoryName(cat.id, e.target.value)}
                                placeholder="Category name..."
                                className="font-bold text-xs text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-teal-600 focus:outline-none px-1 py-0.5 w-full max-w-md"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500">Weight:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={cat.weightage}
                                  onChange={e => handleMgrUpdateCategoryWeight(cat.id, Number(e.target.value))}
                                  className="w-10 text-xs font-bold text-teal-800 text-center focus:outline-none"
                                />
                                <span className="text-[10px] font-bold text-slate-400">%</span>
                              </div>

                              {!isBalanced && (
                                <button
                                  type="button"
                                  onClick={() => handleMgrAutoBalanceCategory(cat.id)}
                                  className="px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition cursor-pointer"
                                >
                                  Auto-Balance
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleMgrDeleteCategory(cat.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Delete category"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Deliverables Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                              <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                                <tr>
                                  <th className="px-2.5 py-1.5 text-left">Deliverable Name</th>
                                  <th className="px-2 py-1.5 w-28 text-center">Target</th>
                                  <th className="px-2 py-1.5 w-20 text-center">Score %</th>
                                  <th className="px-2 py-1.5 w-20 text-center">Unit</th>
                                  <th className="px-2 py-1.5 w-24 text-center">Type</th>
                                  <th className="px-1.5 py-1.5 w-8 text-center"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {cat.kpis.map(kpi => {
                                  const isNeg = isNegativeKpi(kpi);
                                  return (
                                    <tr key={kpi.id} className={`transition ${isNeg ? 'bg-rose-50/25 hover:bg-rose-50/50' : 'hover:bg-slate-50/50'}`}>
                                      <td className="px-2.5 py-1.5 align-middle">
                                        <input
                                          type="text"
                                          value={kpi.name}
                                          onChange={e => handleMgrUpdateKPI(cat.id, kpi.id, 'name', e.target.value)}
                                          placeholder="Deliverable description..."
                                          className={`w-full h-7 px-2 rounded-lg text-xs font-semibold focus:outline-none transition border ${isNeg
                                            ? 'bg-rose-50/50 text-rose-700 border-rose-200 focus:bg-white focus:border-rose-500'
                                            : 'bg-slate-50/70 text-slate-800 border-slate-200 focus:bg-white focus:border-teal-600'
                                            }`}
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 align-middle text-center">
                                        <input
                                          type="text"
                                          value={kpi.targetFromManager ?? ''}
                                          onChange={e => handleMgrUpdateKPI(cat.id, kpi.id, 'targetFromManager', e.target.value)}
                                          placeholder="e.g. 3, 11, 1950, <2"
                                          className={`w-full h-7 px-1.5 rounded-lg text-xs font-bold text-center focus:outline-none transition border ${isNeg
                                            ? 'bg-rose-50/50 text-rose-700 border-rose-200 focus:bg-white focus:border-rose-500'
                                            : 'bg-slate-50/70 text-teal-900 border-slate-200 focus:bg-white focus:border-teal-600'
                                            }`}
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 align-middle text-center">
                                        <div className={`flex items-center justify-center focus-within:bg-white border rounded-lg px-1.5 h-7 transition ${isNeg ? 'bg-rose-50/40 border-rose-200 focus-within:border-rose-500' : 'bg-slate-50/70 border-slate-200 focus-within:border-teal-600'
                                          }`}>
                                          <input
                                            type="number"
                                            step="any"
                                            value={kpi.targetScore}
                                            onChange={e => handleMgrUpdateKPI(cat.id, kpi.id, 'targetScore', Number(e.target.value))}
                                            className={`w-11 text-xs font-bold text-center bg-transparent focus:outline-none p-0 ${isNeg ? 'text-rose-700' : 'text-slate-800'
                                              }`}
                                          />
                                          <span className="text-[10px] text-slate-400 font-bold ml-0.5">%</span>
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5 align-middle text-center">
                                        <input
                                          type="text"
                                          value={kpi.unit}
                                          onChange={e => handleMgrUpdateKPI(cat.id, kpi.id, 'unit', e.target.value)}
                                          placeholder="units"
                                          className="w-full h-7 px-1.5 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-teal-600 rounded-lg text-xs font-medium text-center text-slate-700 focus:outline-none transition"
                                        />
                                      </td>
                                      <td className="px-2 py-1.5 align-middle text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleMgrUpdateKPI(cat.id, kpi.id, 'scoringDirection', isNeg ? 'higher_is_better' : 'lower_is_better')}
                                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition shadow-2xs cursor-pointer whitespace-nowrap ${isNeg
                                            ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                            }`}
                                          title={isNeg ? 'Negative / Penalty metric (Lower is better). Click to switch to Standard.' : 'Standard metric (Higher is better). Click to switch to Negative.'}
                                        >
                                          {isNeg ? '− Negative' : '+ Standard'}
                                        </button>
                                      </td>
                                      <td className="px-1.5 py-1.5 align-middle text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleMgrDeleteKPI(cat.id, kpi.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                          title="Delete deliverable"
                                        >
                                          <TrashIcon className="w-3 h-3" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex justify-end pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleMgrAddKPI(cat.id)}
                              className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-teal-700 bg-white hover:bg-teal-50 rounded-lg transition shadow-2xs border border-teal-200/80 cursor-pointer"
                            >
                              <PlusIcon className="w-3 h-3" />
                              <span>Add Row</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                    </div>

                    {/* Step 2 Footer Navigation & Submission */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setMgrWizardStep(1)}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                      >
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        <span>Back to Step 1</span>
                      </button>

                      <button
                        type="submit"
                        disabled={!isMgrWeightageValid || !areAllMgrCategoriesBalanced || mgrAssignEmpIds.length === 0 || isAssigning}
                        className={`flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${isMgrWeightageValid && areAllMgrCategoriesBalanced && mgrAssignEmpIds.length > 0 && !isAssigning
                            ? 'bg-teal-700 hover:bg-teal-800 shadow-teal-900/15'
                            : 'bg-slate-300 cursor-not-allowed opacity-60'
                          }`}
                      >
                        <CheckCircleIcon className="w-4 h-4 stroke-[2]" />
                        <span>
                          {isAssigning ? 'Assigning...' : `Assign & Release to ${mgrAssignEmpIds.length} Direct Reports`}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Background Manager Desk (Blurred & Blocked when Admin Setup is pending) */}
            <div
              className={`space-y-4 animate-in fade-in duration-200 transition-all ${
                !hasAssignedCycleFromAdmin && reportFilteredResponses.length === 0
                  ? 'filter blur-[3.5px] opacity-40 pointer-events-none select-none'
                  : ''
              }`}
            >
              {/* Unified Manager Desk Card (Header + Frequency Navigation + Filters) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              {/* 1. Header Bar: Title, Scope, and Desk Actions */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 border border-primary-100/80 flex items-center justify-center shrink-0 shadow-2xs">
                    <BriefcaseIcon className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {isTeamLead ? 'Squad Evaluation' : 'Direct Reviews'}
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-primary-50 text-primary-800 border border-primary-200/80 uppercase">
                        {isTeamLead ? 'Squad Desk' : 'Reviewer Desk'}
                      </span>
                      <span className="text-xs text-slate-300 font-medium hidden md:inline">•</span>
                      <span className="text-xs font-semibold text-slate-600 truncate">
                        {effectiveTeamName || (managerDepartments.length > 0 ? managerDepartments.join(', ') : 'Team Scope')}
                      </span>
                    </div>
                  </div>
                </div>

              {activeRole === 'manager' && (
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenConvertModal()}
                    className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                    title="Rollup & Convert Evaluations across frequencies (Daily -> Weekly, Weekly -> Monthly, Monthly -> Quarterly, Quarterly -> Yearly)"
                  >
                    <ArrowPathIcon className="w-4 h-4 text-amber-700" />
                    <span>Rollup & Convert</span>
                    {totalConvertibleCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-200 text-amber-900">
                        {totalConvertibleCount}
                      </span>
                    )}
                  </button>

                  {canCreateMetrics && (
                    <button
                      type="button"
                      onClick={() => handleOpenMgrCreateModal()}
                      className="flex items-center gap-2 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                    >
                      <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                      <span>Assign Metrics</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Proactive Manager Reminder Banner during Last 8 Days of Month */}
            {(() => {
              const today = new Date();
              const todayDate = today.getDate();
              const currentMonth = today.getMonth();
              const currentYear = today.getFullYear();
              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
              const isLast8Days = todayDate >= (daysInMonth - 7);
              const currentMonthName = MONTH_NAMES[currentMonth];
              const currentPeriodKey = `${currentMonthName} ${currentYear}`.toLowerCase();

              const unassignedDirects = managerAssignableEmployees.filter((m: any) => 
                isEmployeeActive(m) && 
                !isEmpAlreadyAssignedForPeriod(m) && 
                !getEmpPendingEvaluation(m)
              );

              if (isLast8Days && unassignedDirects.length > 0 && canCreateMetrics) {
                const daysLeft = daysInMonth - todayDate;
                return (
                  <div className="mx-4 my-3 p-3.5 bg-gradient-to-r from-teal-50 via-teal-100/40 to-emerald-50 border border-teal-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <SparklesIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-teal-950">
                            Action Required: {currentMonthName} {currentYear} Team Deliverables
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-200/80 text-teal-900 uppercase">
                            {daysLeft === 0 ? 'Month End Today' : `${daysLeft} Day${daysLeft > 1 ? 's' : ''} Left`} ({unassignedDirects.length} unassigned)
                          </span>
                        </div>
                        <p className="text-[11px] text-teal-800 font-medium">
                          You have {unassignedDirects.length} direct report{unassignedDirects.length > 1 ? 's' : ''} without assigned performance metrics. Please assign deliverables before the month ends.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenMgrCreateModal()}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
                    >
                      Assign Metrics Now
                    </button>
                  </div>
                );
              }
              return null;
            })()}

            {/* 2. Frequency Tabs & Date in Period Bar */}
            <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
              {/* Frequency Segmented Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {reportTabs.map(tab => {
                  const isActive = reportViewTab === tab.id;
                  const totalCount = tab.count || 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSwitchReportTab(tab.id as any)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${isActive
                        ? 'bg-primary-700 text-white shadow-2xs font-bold'
                        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80'
                        }`}
                    >
                      <span>{tab.label}</span>
                      {totalCount > 0 && (
                        <span
                          className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold transition-colors ${isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                          {totalCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Date / Month / Week Selector inside Frequency */}
              <div className="flex items-center gap-2 flex-wrap text-xs font-medium">
                {reportViewTab === 'weekly' ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-semibold whitespace-nowrap flex items-center gap-1">
                        <CalendarDaysIcon className="w-3.5 h-3.5 text-primary-600" />
                        Month:
                      </span>
                      <select
                        value={selectedReportMonthKey}
                        onChange={e => handleReportMonthChange(e.target.value)}
                        className="h-8 pl-2.5 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 shadow-2xs"
                      >
                        {availableMonths.map(m => (
                          <option key={m.key} value={m.key}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-semibold whitespace-nowrap">Week:</span>
                      <select
                        value={selectedWeekPeriod}
                        onChange={e => {
                          const val = e.target.value;
                          setSelectedWeekPeriod(val);
                          if (val !== 'all') setReportDateInPeriod(val);
                        }}
                        className="h-8 pl-2.5 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 shadow-2xs"
                      >
                        <option value="all">All Weeks ({frequencyCounts.weekly})</option>
                        {weeksForSelectedMonth.map(w => (
                          <option key={w.startStr} value={w.startStr}>
                            {w.label} {w.count ? `(${w.count})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (reportViewTab === 'monthly' || reportViewTab === 'top_monthly') ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-semibold whitespace-nowrap flex items-center gap-1">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-primary-600" />
                      Month:
                    </span>
                    <select
                      value={selectedReportMonthKey}
                      onChange={e => handleReportMonthChange(e.target.value)}
                      className="h-8 pl-2.5 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 shadow-2xs"
                    >
                      <option value="all">All Months ({frequencyCounts.monthly})</option>
                      {availableMonths.map(m => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (reportViewTab === 'quarterly' || reportViewTab === 'top_quarterly') ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-semibold whitespace-nowrap flex items-center gap-1">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-primary-600" />
                      Quarter:
                    </span>
                    <select
                      value={selectedReportQuarterKey}
                      onChange={e => handleReportQuarterChange(e.target.value)}
                      className="h-8 pl-2.5 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 shadow-2xs"
                    >
                      <option value="all">All Quarters ({frequencyCounts.quarterly})</option>
                      {availableQuarters.map(q => (
                        <option key={q.key} value={q.key}>{q.label}</option>
                      ))}
                    </select>
                  </div>
                ) : reportViewTab === 'yearly' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-semibold whitespace-nowrap flex items-center gap-1">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-primary-600" />
                      Year:
                    </span>
                    <select
                      value={selectedReportYearKey}
                      onChange={e => handleReportYearChange(e.target.value)}
                      className="h-8 pl-2.5 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 shadow-2xs"
                    >
                      <option value="all">All Years ({frequencyCounts.yearly})</option>
                      {availableYears.map(y => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>
                ) : reportViewTab === 'daily' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-semibold whitespace-nowrap flex items-center gap-1">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-primary-600" />
                      Date:
                    </span>
                    <div className="w-40">
                      <DatePicker
                        value={reportDateInPeriod}
                        onChange={(newDate: string) => {
                          setReportDateInPeriod(newDate);
                          setSelectedWeekPeriod('');
                        }}
                        placeholder="Select date"
                        align="left"
                        className="!h-8 !py-1 !px-2.5 !text-xs !rounded-lg border-slate-200 shadow-2xs font-medium"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-500 font-medium bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    {reportViewTab === 'top_annual' ? 'Full Year Performance' : `All Cycles (${frequencyCounts.all} records)`}
                  </span>
                )}
              </div>
            </div>

            {/* 3. Search & Filter Controls Toolbar */}
            <div className="px-4 py-2.5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-1 flex-wrap min-w-0">
                {/* Search input */}
                <div className="relative flex-1 min-w-[170px] max-w-xs">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={mgrSearchQuery}
                    onChange={e => setMgrSearchQuery(e.target.value)}
                    placeholder="Search employee..."
                    className="w-full h-8 pl-8 pr-7 bg-slate-50/70 hover:bg-white border border-slate-200/90 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 transition shadow-2xs"
                  />
                  {mgrSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMgrSearchQuery('')}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Team Filter */}
                {availableFilterTeams.length > 1 && (
                  <select
                    value={reportFilterTeam}
                    onChange={e => {
                      setReportFilterTeam(e.target.value);
                      setReportFilterDesignation('all');
                    }}
                    className="h-8 pl-2 pr-6 bg-slate-50/70 hover:bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-primary-500 shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Teams</option>
                    {availableFilterTeams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                )}

                {/* Designation Filter */}
                <select
                  value={reportFilterDesignation}
                  onChange={e => setReportFilterDesignation(e.target.value)}
                  className="h-8 pl-2 pr-6 bg-slate-50/70 hover:bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-primary-500 shadow-2xs cursor-pointer max-w-[180px] truncate"
                >
                  <option value="all">All Designations</option>
                  {availableFilterDesignations.map(desig => (
                    <option key={desig} value={desig}>{desig}</option>
                  ))}
                </select>

                {/* State / Status Filter */}
                <select
                  value={reportFilterState}
                  onChange={e => setReportFilterState(e.target.value as any)}
                  className="h-8 pl-2 pr-6 bg-slate-50/70 hover:bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-primary-500 shadow-2xs cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Review</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                </select>

                {/* Clear */}
                {(reportFilterDept !== 'all' || reportFilterTeam !== 'all' || reportFilterDesignation !== 'all' || reportFilterDate !== 'all' || reportFilterState !== 'all' || mgrSearchQuery.trim() !== '' || Boolean(managerFilterDept)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setReportFilterDept('all');
                      setReportFilterTeam('all');
                      setReportFilterDesignation('all');
                      setReportFilterDate('all');
                      setReportFilterState('all');
                      setMgrSearchQuery('');
                      setManagerFilterDept('');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-danger-600 hover:text-danger-700 bg-danger-50 hover:bg-danger-100 rounded-md transition cursor-pointer"
                  >
                    <XMarkIcon className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* People Counter Badge */}
              <div className="text-[11px] font-bold text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/60 shrink-0 self-end md:self-auto">
                {reportFilteredResponses.length} {reportFilteredResponses.length === 1 ? 'person' : 'people'}
              </div>
            </div>
          </div>

          {/* Section 2: Grouped Evaluation Report Table or Top Performers View */}
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Report Content */}
            {reportViewTab.startsWith('top_') ? (
              /* Top Performers Multi-Column Layout (Matching Image 1 Reference UI) */
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4 animate-in fade-in duration-200">
                <div className="flex items-baseline gap-3 pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    {reportViewTab === 'top_weekly'
                      ? 'Top Performers - Weekly'
                      : reportViewTab === 'top_monthly'
                        ? 'Top Performers - Monthly'
                        : reportViewTab === 'top_quarterly'
                          ? 'Top Performers - Quarterly'
                          : 'Top Performers - Annual'}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {reportViewTab === 'top_weekly'
                      ? topPerformersQuarterRangeText
                      : `1 Apr ${topPerformersFiscalYear} - 31 Mar ${topPerformersFiscalYear + 1}`}
                  </span>
                </div>

                {/* Multi-column Side-Scroll Container */}
                <div className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth">
                  {(reportViewTab === 'top_weekly'
                    ? topPerformersWeeklyColumns
                    : reportViewTab === 'top_monthly'
                      ? topPerformersMonthlyColumns
                      : reportViewTab === 'top_quarterly'
                        ? topPerformersQuarterlyColumns
                        : topPerformersAnnualColumns
                  ).map(col => (
                    <div
                      key={col.key}
                      className={`min-w-[280px] max-w-[340px] flex-1 rounded-2xl overflow-hidden shadow-2xs bg-white flex flex-col shrink-0 ${(col as any).isSummaryYear
                        ? 'border-2 border-primary-600 shadow-md ring-1 ring-primary-600/20'
                        : 'border border-slate-200/80'
                        }`}
                    >
                      {/* Column Header */}
                      <div className={`px-4 py-2.5 font-bold text-xs flex items-center justify-between ${(col as any).isSummaryYear
                        ? 'bg-primary-800 text-white'
                        : 'bg-slate-50 text-slate-800 border-b border-slate-200/80'
                        }`}>
                        <span>{col.label}</span>
                        {col.subLabel && (
                          <span className="text-[10px] font-normal text-slate-400">{col.subLabel}</span>
                        )}
                      </div>

                      {/* Column Body */}
                      <div className="p-3 flex-1 flex flex-col justify-start space-y-3">
                        {col.groups.length === 0 ? (
                          <div className="py-14 text-center my-auto">
                            <p className="text-xs text-slate-400 font-medium italic">Nothing approved.</p>
                          </div>
                        ) : (
                          col.groups.map((group: any) => {
                            const color = getTeamHeaderColor(group.teamName);
                            return (
                              <div key={group.teamName} className="space-y-1.5">
                                <div className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border ${color.bg} ${color.text} ${color.border} flex items-center justify-between`}>
                                  <span>{group.teamName}</span>
                                  <span className="text-[10px] opacity-75">{group.members.length} people</span>
                                </div>
                                <div className="space-y-1">
                                  {group.members.map((member: any) => (
                                    <div
                                      key={member.employeeCode}
                                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition text-xs border border-slate-100"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-bold text-slate-700 text-[11px] shrink-0">
                                          {member.rank === 1 ? '🥇' : member.rank === 2 ? '🥈' : member.rank === 3 ? '🥉' : `#${member.rank}`}
                                        </span>
                                        <span className="font-semibold text-slate-900 truncate text-[11px]">{member.employeeName}</span>
                                      </div>
                                      <span className="font-mono font-bold text-xs text-primary-700 shrink-0">
                                        {member.averageScoreDisplay}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Clean, Modern Grouped Report Table */
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4 w-[30%]">
                        <div className="flex items-center justify-between gap-2">
                          <span>NAME OF THE EMPLOYEE</span>
                          <button
                            type="button"
                            onClick={() => {
                              const areAllExpanded = groupedReportHierarchy.length > 0 && groupedReportHierarchy.every(t =>
                                Boolean(expandedTeams[t.teamName])
                              );
                              if (areAllExpanded) {
                                setExpandedTeams({});
                              } else {
                                const nextTeams: Record<string, boolean> = {};
                                groupedReportHierarchy.forEach(t => {
                                  nextTeams[t.teamName] = true;
                                });
                                setExpandedTeams(nextTeams);
                              }
                            }}
                            className="text-[10px] font-bold normal-case tracking-normal text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-md border border-primary-200 transition cursor-pointer shadow-2xs"
                            title="Toggle expand/collapse for all teams"
                          >
                            {groupedReportHierarchy.length > 0 && groupedReportHierarchy.every(t =>
                              Boolean(expandedTeams[t.teamName])
                            ) ? 'Collapse All' : 'Expand All'}
                          </button>
                        </div>
                      </th>
                      <th className="py-3.5 px-4 text-center w-[24%]">EVALUATION PERIOD / DATE</th>
                      <th className="py-3.5 px-4 text-center w-[12%]">{reportViewTab === 'all' ? 'SELF SCORE' : formattedDateColumnHeader}</th>
                      <th className="py-3.5 px-4 text-center w-[12%]">AVERAGE SCORE</th>
                      <th className="py-3.5 px-4 text-center w-[11%]">STATUS</th>
                      <th className="py-3.5 px-4 text-right w-[11%]">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedReportHierarchy.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 px-4 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                            {mgrSearchQuery.trim() || reportFilterDesignation !== 'all' || reportFilterState !== 'all' || reportFilterTeam !== 'all' ? (
                              <>
                                <div className="w-13 h-13 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center mb-3 shadow-2xs">
                                  <ClipboardDocumentListIcon className="w-6 h-6 stroke-[1.5]" />
                                </div>
                                <h4 className="text-sm font-semibold text-slate-800 tracking-tight">
                                  No Matching Records Found
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed font-normal">
                                  No evaluation records match your search or filter criteria. Try resetting filters to see all records.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMgrSearchQuery('');
                                    setReportFilterDesignation('all');
                                    setReportFilterState('all');
                                    setReportFilterTeam('all');
                                    setReportFilterDept('all');
                                    setReportFilterDate('all');
                                    setManagerFilterDept('');
                                  }}
                                  className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
                                >
                                  <span>Reset Filters</span>
                                </button>
                              </>
                            ) : !hasAssignedCycleFromAdmin ? (
                              <>
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center mb-2.5 shadow-2xs">
                                  <ClockIcon className="w-6 h-6 stroke-[1.5]" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                                  E2R is Under Process
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed font-normal">
                                  Evaluation cycle setup is currently under process.
                                </p>
                              </>
                            ) : (
                              <>
                                <div className="w-13 h-13 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center mb-3 shadow-2xs">
                                  <ClipboardDocumentListIcon className="w-6 h-6 stroke-[1.5]" />
                                </div>
                                <h4 className="text-sm font-semibold text-slate-800 tracking-tight">
                                  Evaluation Cycle Assigned by Admin
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed font-normal">
                                  Admin has configured and assigned the evaluation matrix for your team. Review and assign deliverables to your direct reports to start the evaluation cycle.
                                </p>
                                {canCreateMetrics && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMgrCreateModal()}
                                    className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                                  >
                                    <PlusIcon className="w-4 h-4 stroke-[2]" />
                                    <span>Assign Metrics to Team</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      groupedReportHierarchy.map(teamGroup => {
                      const isTeamExpanded = Boolean(expandedTeams[teamGroup.teamName]);

                      const matchingDbTeam = dbTeams.find(t =>
                        t.name?.toLowerCase() === teamGroup.teamName.toLowerCase() ||
                        String(t.id) === teamGroup.teamName.toLowerCase()
                      );

                      const teamCycle = managerDirectCycles.find(c => {
                        const cName = (c.teamName || '').toLowerCase();
                        const cId = String(c.teamId || '').toLowerCase();
                        const tName = teamGroup.teamName.toLowerCase();
                        const dbTeamId = matchingDbTeam ? String(matchingDbTeam.id).toLowerCase() : '';
                        const dbTeamName = matchingDbTeam?.name?.toLowerCase() || '';

                        return (
                          cName === tName ||
                          cId === tName ||
                          (dbTeamId && (cId === dbTeamId || cName === dbTeamId)) ||
                          (dbTeamName && (cName === dbTeamName || cId === dbTeamName))
                        );
                      }) || cycles.find(c => {
                        const cName = (c.teamName || '').toLowerCase();
                        const cId = String(c.teamId || '').toLowerCase();
                        const tName = teamGroup.teamName.toLowerCase();
                        const dbTeamId = matchingDbTeam ? String(matchingDbTeam.id).toLowerCase() : '';
                        const dbTeamName = matchingDbTeam?.name?.toLowerCase() || '';

                        return (
                          cName === tName ||
                          cId === tName ||
                          (dbTeamId && (cId === dbTeamId || cName === dbTeamId)) ||
                          (dbTeamName && (cName === dbTeamName || cId === dbTeamName))
                        );
                      });

                      const cycleLockedInfo = getCycleLockedInfo(teamCycle);

                      return (
                        <React.Fragment key={teamGroup.teamName}>
                          {/* Clean Team Section Row */}
                          <tr className="border-t border-slate-200">
                            <td colSpan={6} className="p-0">
                              <div
                                onClick={() => setExpandedTeams(prev => ({ ...prev, [teamGroup.teamName]: !isTeamExpanded }))}
                                className="bg-slate-100/90 hover:bg-slate-200/70 text-slate-800 px-4 py-2.5 flex items-center justify-between font-bold text-xs cursor-pointer select-none transition-colors border-y border-slate-200/70"
                                title={isTeamExpanded ? `Click to collapse ${teamGroup.teamName}` : `Click to expand ${teamGroup.teamName} (${teamGroup.totalPeople} people)`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isTeamExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                  <FolderIcon className="w-4 h-4 text-primary-600 shrink-0" />
                                  <span className="text-sm font-bold tracking-tight text-slate-900">{teamGroup.teamName}</span>
                                  <span className="text-[11px] font-semibold bg-white text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-2xs">
                                    {teamGroup.totalPeople} {teamGroup.totalPeople === 1 ? 'person' : 'people'}
                                  </span>
                                  {(() => {
                                    const teamPendingCount = teamGroup.members.filter(m =>
                                      (m.response.status === 'manager_review' || m.response.status === 'Submitted to Manager' || String(m.response.status || '').toLowerCase().includes('submitted')) &&
                                      m.response.managerScore == null
                                    ).length;
                                    if (teamPendingCount === 0) return null;
                                    return (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50/90 text-amber-900 border border-amber-200/90 shadow-2xs shrink-0">
                                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                                        </span>
                                        <ClockIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>
                                          <strong className="font-semibold text-amber-950">{teamPendingCount}</strong>{' '}
                                          {teamPendingCount === 1 ? 'Submission Awaiting Approval' : 'Submissions Awaiting Approval'}
                                        </span>
                                      </span>
                                    );
                                  })()}
                                </div>

                                <div className="flex items-center gap-3">
                                  {(activeRole === 'manager' || activeRole === 'downline_teams' || canCreateMetrics) && (
                                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                      {teamCycle ? (
                                        <>
                                          {cycleLockedInfo.isLocked ? (
                                            /* Sleek Locked Badge */
                                            <span
                                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs"
                                              title={`Deliverables matrix is locked because ${cycleLockedInfo.activeCount} evaluation(s) are in progress`}
                                            >
                                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                              <span>Locked</span>
                                            </span>
                                          ) : (
                                            /* Editable Matrix Controls */
                                            <>
                                              <span
                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs"
                                                title="Active Deliverables Matrix (Editable)"
                                              >
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <span>Matrix: 100%</span>
                                              </span>

                                              <button
                                                type="button"
                                                onClick={() => handleOpenMgrEditMatrixModal(teamCycle)}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                                                title="Edit Deliverables Matrix"
                                              >
                                                <PencilSquareIcon className="w-3 h-3 text-slate-500" />
                                                <span>Edit</span>
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => handleMgrDeleteMatrix(teamCycle)}
                                                className={isHrOrAdmin ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-danger-50 hover:bg-danger-100 text-danger-600 border border-danger-200 shadow-2xs transition cursor-pointer" : "hidden"}
                                                title="Delete Deliverables Matrix"
                                              >
                                                <TrashIcon className="w-3 h-3" />
                                                <span>Delete</span>
                                              </button>
                                            </>
                                          )}
                                        </>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenMgrCreateModal(teamGroup.teamName)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-primary-700 bg-white hover:bg-primary-50 border border-primary-200 shadow-2xs transition cursor-pointer"
                                          >
                                            <span>+ Assign Matrix</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Members inside Team (Rendered directly when Team is Expanded) */}
                          {isTeamExpanded && teamGroup.members.map(member => {
                            const isSubmittedPending = Boolean(
                              (member.response.status === 'manager_review' || member.response.status === 'Submitted to Manager' || String(member.response.status || '').toLowerCase().includes('submitted')) &&
                              member.response.managerScore == null
                            );

                            return (
                              <tr
                                key={member.response.id || member.employeeCode}
                                className={`group/row border-b border-slate-100 hover:bg-slate-50/80 transition ${isSubmittedPending ? 'bg-primary-50/30 border-l-4 border-l-primary-600' : 'bg-white'
                                  }`}
                              >
                                {/* 1. Name of the employee */}
                                <td className="py-3.5 px-4 pl-8">
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                      {member.rank && (
                                        <span className="font-bold text-xs text-amber-600 mr-0.5">
                                          {member.rank === 1 ? '🥇 #1' : member.rank === 2 ? '🥈 #2' : member.rank === 3 ? '🥉 #3' : `#${member.rank}`}
                                        </span>
                                      )}
                                      <span className={`font-semibold text-xs ${isSubmittedPending ? 'text-primary-950 font-bold' : 'text-slate-900'}`}>
                                        {member.employeeName}
                                      </span>
                                      <span className="text-xs text-slate-400 font-normal">
                                        (Emp Code {member.employeeCode})
                                      </span>
                                      {isSubmittedPending && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary-100 text-primary-900 border border-primary-300 shrink-0 inline-flex items-center gap-1 shadow-2xs animate-pulse">
                                          <SparklesIcon className="w-3 h-3 text-primary-700" />
                                          <span>Ready for Review</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* 2. Evaluation Period / Date Badge with Hover Tooltip for Submission & Approved Dates */}
                                <td className="py-3.5 px-4 text-center">
                                  {(() => {
                                    const isEmpSubmitted = Boolean(
                                      member.response.employeeSubmittedAt ||
                                      (member.response as any).submitted_at ||
                                      (member.response as any).submittedAt ||
                                      (member.response as any).employee_submitted_at ||
                                      (member.response.status === 'manager_review' || member.response.status === 'Submitted to Manager' || member.response.status === 'approved' || member.response.status === 'sm_final_approval' || (member.response.employeeOverallScore != null && Number(member.response.employeeOverallScore) > 0))
                                    );
                                    const subDate = isEmpSubmitted
                                      ? formatEvalDateTime(member.response.employeeSubmittedAt || (member.response as any).submitted_at || (member.response as any).submittedAt || (member.response as any).employee_submitted_at || member.response.updatedAt || member.response.createdAt)
                                      : null;
                                    const approvedDate = (member.isCalibrated || member.response.serviceManagerApprovedAt || member.response.managerReviewedAt)
                                      ? formatEvalDateTime(member.response.serviceManagerApprovedAt || member.response.managerReviewedAt || (member.response as any).manager_reviewed_at || (member.response as any).approved_at || member.response.updatedAt)
                                      : null;
                                    const tooltipLines: string[] = [];
                                    if (subDate) tooltipLines.push(`Submitted: ${subDate}`);
                                    if (approvedDate) tooltipLines.push(`Approved: ${approvedDate}`);
                                    const nativeTooltip = tooltipLines.join(' | ');

                                    return (
                                      <SubmissionDatesHover
                                        subDate={subDate}
                                        approvedDate={approvedDate}
                                        isSubmitted={isEmpSubmitted}
                                        align="center"
                                        nativeTitle={nativeTooltip}
                                      >
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border shadow-2xs transition-transform hover:scale-105 ${member.periodInfo?.freqColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                          <CalendarDaysIcon className="w-3 h-3 shrink-0" />
                                          <span>{member.periodInfo?.freqLabel || 'Evaluation'}</span>
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap hover:text-primary-700 transition-colors">
                                          {member.periodInfo?.dateText}
                                        </span>
                                      </SubmissionDatesHover>
                                    );
                                  })()}
                                </td>

                                {/* 3. Date Score / Self Score */}
                                <td className="py-3.5 px-4 text-center">
                                  <span className="text-xs font-medium text-slate-700">
                                    {member.dateScoreDisplay}
                                  </span>
                                </td>

                                {/* 4. Average Score */}
                                <td className="py-3.5 px-4 text-center">
                                  <span className="text-xs font-semibold text-slate-800">
                                    {member.averageScoreDisplay}
                                  </span>
                                </td>

                                {/* 5. Status Badge */}
                                <td className="py-3.5 px-4 text-center">
                                  {renderStatusBadge(member.response.status, member.response)}
                                </td>

                                {/* 6. Action Button */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectMgrResponse(member.response)}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs ${isSubmittedPending
                                        ? 'bg-primary-600 hover:bg-primary-700 text-white ring-2 ring-primary-500/30'
                                        : member.isCalibrated
                                          ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                                          : 'bg-primary-600 hover:bg-primary-700 text-white'
                                        }`}
                                    >
                                      {isSubmittedPending ? (
                                        <>
                                          <SparklesIcon className="w-3.5 h-3.5 text-amber-300" />
                                          <span>Review & Score</span>
                                        </>
                                      ) : (
                                        <>
                                          <PencilSquareIcon className="w-3.5 h-3.5" />
                                          <span>{member.isCalibrated ? 'Recalibrate' : 'Review & Score'}</span>
                                        </>
                                      )}
                                    </button>
                                    {!member.isCalibrated && member.response.managerScore == null && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMgrResponseRow(member.response)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                        title="Delete evaluation record"
                                      >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })
                  )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

            {/* Overlaid E2R Under Process Card */}
            {!hasAssignedCycleFromAdmin && reportFilteredResponses.length === 0 && (
              <div className="absolute inset-0 z-20 flex items-start justify-center pt-8 pb-12 px-4 bg-slate-900/5 backdrop-blur-[1.5px] rounded-2xl pointer-events-auto">
                <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-neutral-200/90 shadow-2xl p-8 sm:p-10 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200 max-w-sm w-full mx-auto my-6 sticky top-8">
                  {/* Status Icon */}
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shadow-2xs relative">
                    <ClockIcon className="w-7 h-7 stroke-[1.5]" />
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white animate-pulse" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200/80 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      <span>E2R is Under Process</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Evaluation Under Process
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Evaluation cycle setup is currently under process. Once released by Admin / HR, the deliverables matrix will appear here.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 4.2. DEPARTMENT OVERSIGHT VIEW (SUBMISSIONS DASHBOARD + TOP PERFORMERS) */}
      {/* ========================================================================= */}
      {activeRole === 'downline_teams' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Title & Subtitle */}
          <div className="border-l-4 border-blue-600 pl-3.5 py-0.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Department Oversight</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Submitted evaluations with their current status — Pending, Approved, Returned, etc.
            </p>
          </div>

          {/* Overview Cards (4 Cards: All, With manager, Completed, Top Performers) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* 1. All */}
            <button
              type="button"
              onClick={() => {
                setOversightSubView('submissions');
                setSubmissionStatusFilter('all');
              }}
              className={`p-4 rounded-2xl bg-white border text-left transition-all cursor-pointer flex items-center justify-between shadow-2xs hover:shadow-xs ${oversightSubView === 'submissions' && submissionStatusFilter === 'all'
                ? 'border-slate-800 ring-2 ring-slate-800/20 shadow-xs'
                : 'border-slate-200/90 hover:border-slate-300'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Square3Stack3DIcon className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold text-slate-900 leading-none truncate">
                    {submissionSummaryCounts.all}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-1 truncate">All</div>
                </div>
              </div>
            </button>

            {/* 2. Assigned to Manager */}
            <button
              type="button"
              onClick={() => {
                setOversightSubView('submissions');
                setSubmissionStatusFilter('with_manager');
              }}
              className={`p-4 rounded-2xl bg-white border text-left transition-all cursor-pointer flex items-center justify-between shadow-2xs hover:shadow-xs ${oversightSubView === 'submissions' && submissionStatusFilter === 'with_manager'
                ? 'border-amber-500 ring-2 ring-amber-400/25 bg-amber-50/20 shadow-xs'
                : 'border-slate-200/90 hover:border-slate-300'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <PaperAirplaneIcon className="w-5 h-5 -rotate-45 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold text-slate-900 leading-none truncate">
                    {submissionSummaryCounts.withManager}
                  </div>
                  <div className="text-xs font-semibold text-amber-800 mt-1 truncate">Assigned to Manager</div>
                </div>
              </div>
            </button>

            {/* 3. Completed */}
            <button
              type="button"
              onClick={() => {
                setOversightSubView('submissions');
                setSubmissionStatusFilter('completed');
              }}
              className={`p-4 rounded-2xl bg-white border text-left transition-all cursor-pointer flex items-center justify-between shadow-2xs hover:shadow-xs ${oversightSubView === 'submissions' && submissionStatusFilter === 'completed'
                ? 'border-emerald-600 ring-2 ring-emerald-500/25 bg-emerald-50/20 shadow-xs'
                : 'border-slate-200/90 hover:border-slate-300'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ClipboardDocumentCheckIcon className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold text-slate-900 leading-none truncate">
                    {submissionSummaryCounts.completed}
                  </div>
                  <div className="text-xs font-semibold text-emerald-800 mt-1 truncate">Completed</div>
                </div>
              </div>
            </button>

            {/* 4. Top Performers */}
            <button
              type="button"
              onClick={() => {
                setOversightSubView('top_performers');
                if (!['top_weekly', 'top_monthly', 'top_quarterly', 'top_annual'].includes(reportViewTab)) {
                  setReportViewTab('top_weekly');
                }
              }}
              className={`p-4 rounded-2xl bg-white border text-left transition-all cursor-pointer flex items-center justify-between shadow-2xs hover:shadow-xs ${oversightSubView === 'top_performers'
                ? 'border-teal-700 ring-2 ring-teal-600/25 bg-teal-50/10 shadow-xs'
                : 'border-slate-200/90 hover:border-slate-300'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <TrophyIcon className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold text-slate-900 leading-none truncate">
                    Rankings
                  </div>
                  <div className="text-xs font-semibold text-amber-800 mt-1 truncate">Top Performers</div>
                </div>
              </div>
            </button>
          </div>

          {/* Sub-View Content */}
          {oversightSubView === 'submissions' ? (
            /* Submissions Grouping View */
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
                {/* Left: Section Title / Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 tracking-tight">Team Submissions Overview</span>
                  <span className="text-[11px] text-slate-400 font-medium">• Grouped by Teams</span>
                </div>

                {/* Right: Search & Submissions count badge */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={submissionSearchQuery}
                      onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                      placeholder="Search submissions..."
                      className="pl-9 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-teal-600 outline-none w-48 sm:w-60 transition"
                    />
                    {submissionSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setSubmissionSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    <span className="font-bold text-slate-700">{filteredSubmissionsList.length}</span> of{' '}
                    <span className="font-bold text-slate-700">{allDeduplicatedManagerResponses.length}</span> submissions
                  </div>
                </div>
              </div>

              {/* List / Accordion Rows */}
              {submissionGroupBy !== 'none' ? (
                <div className="space-y-3 pt-2">
                  {submissionGroupedData.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <BuildingOffice2Icon className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
                      <p className="text-sm font-semibold text-slate-600">No submissions found</p>
                      <p className="text-xs text-slate-400 mt-1">Try changing the status filter or search keyword.</p>
                    </div>
                  ) : (
                    submissionGroupedData.map((group, idx) => {
                      const rowThemes = [
                        { bg: 'bg-[#FEF9ED]', border: 'border-[#F4E7C7]', text: 'text-[#8C6D1F]', icon: 'text-[#B89028]' },
                        { bg: 'bg-[#FAF0F8]', border: 'border-[#EED7E9]', text: 'text-[#863870]', icon: 'text-[#B04C95]' },
                        { bg: 'bg-[#FDF0F5]', border: 'border-[#F4D6E4]', text: 'text-[#8C3660]', icon: 'text-[#B54A80]' },
                        { bg: 'bg-[#FDF8EE]', border: 'border-[#F0E4C3]', text: 'text-[#806B1F]', icon: 'text-[#A88C28]' },
                        { bg: 'bg-[#F5F1FA]', border: 'border-[#E2D8F2]', text: 'text-[#6E429B]', icon: 'text-[#9359CF]' },
                        { bg: 'bg-[#FAF8ED]', border: 'border-[#EFE5C5]', text: 'text-[#7D681C]', icon: 'text-[#A48824]' },
                        { bg: 'bg-[#F2F1FA]', border: 'border-[#DCD6F3]', text: 'text-[#55409E]', icon: 'text-[#7458D4]' },
                      ];
                      const theme = submissionStatusFilter === 'completed'
                        ? { bg: 'bg-[#ECFDF5]', border: 'border-[#A7F3D0]', text: 'text-[#065F46]', icon: 'text-[#059669]' }
                        : submissionStatusFilter === 'with_manager'
                          ? { bg: 'bg-[#FFFBEB]', border: 'border-[#FDE68A]', text: 'text-[#92400E]', icon: 'text-[#D97706]' }
                          : rowThemes[idx % rowThemes.length];
                      const isExpanded = Boolean(expandedSubmissionGroups[group.groupName]);

                      return (
                        <div
                          key={group.groupName}
                          className={`rounded-2xl border transition-all overflow-hidden ${theme.border} ${theme.bg}`}
                        >
                          {/* Group Header Bar */}
                          <div
                            onClick={() => {
                              setExpandedSubmissionGroups(prev => ({
                                ...prev,
                                [group.groupName]: !prev[group.groupName]
                              }));
                            }}
                            className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none hover:brightness-95 transition"
                          >
                            {/* Left: Chevron + Building + Group Name */}
                            <div className="flex items-center gap-3">
                              <ChevronRightIcon
                                className={`w-4 h-4 transition-transform duration-200 ${theme.text} ${isExpanded ? 'rotate-90' : ''
                                  }`}
                              />
                              <BuildingOffice2Icon className={`w-5 h-5 ${theme.icon}`} />
                              <span className={`text-sm font-bold tracking-tight ${theme.text}`}>
                                {group.groupName}
                              </span>
                            </div>

                            {/* Right: Telemetry Statistics */}
                            <div className="flex items-center gap-4 sm:gap-6 text-xs flex-wrap">
                              <span className="text-slate-600 font-medium">
                                <strong className="font-bold text-slate-800">{group.peopleCount}</strong> {group.peopleCount === 1 ? 'person' : 'people'}
                              </span>

                              {submissionStatusFilter === 'all' ? (
                                <>
                                  <span className="text-slate-600 font-medium">
                                    <strong className="font-bold text-slate-800">{group.submittedCount}</strong> submitted
                                  </span>
                                  <span className="text-slate-600 font-medium">
                                    <strong className={`font-bold ${group.openCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>{group.openCount}</strong> open
                                  </span>
                                  <span className="text-slate-600 font-medium">
                                    <strong className="font-bold text-emerald-700">{group.completedCount}</strong> completed
                                  </span>
                                </>
                              ) : submissionStatusFilter === 'with_manager' ? (
                                <span className="text-slate-600 font-medium">
                                  <strong className="font-bold text-amber-700">{group.filteredCount}</strong> assigned to manager
                                </span>
                              ) : submissionStatusFilter === 'completed' ? (
                                <span className="text-slate-600 font-medium">
                                  <strong className="font-bold text-emerald-700">{group.filteredCount}</strong> completed
                                </span>
                              ) : (
                                <span className="text-slate-600 font-medium">
                                  <strong className="font-bold text-slate-800">{group.filteredCount}</strong> submissions
                                </span>
                              )}

                              <span className="text-slate-600 font-medium">
                                avg <strong className="font-bold text-slate-900">{group.avgScore > 0 ? `${group.avgScore.toFixed(1)}%` : '—'}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Expanded Submissions Group (Rendered directly when Group is Expanded) */}
                          {isExpanded && (
                            <div className="px-5 pb-4 pt-3 border-t border-slate-200/60 bg-white/70 space-y-3">
                              {group.items.length === 0 ? (
                                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                                  No submissions in this category.
                                </div>
                              ) : (
                                <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                          <th className="px-4 py-2.5">Employee</th>
                                          <th className="px-4 py-2.5">Form / Period</th>
                                          <th className="px-3 py-2.5 text-center">Frequency</th>
                                          <th className="px-3 py-2.5 text-center">Self Score</th>
                                          <th className="px-3 py-2.5 text-center">Manager Score</th>
                                          <th className="px-4 py-2.5 text-center">Status</th>
                                          <th className="px-4 py-2.5 text-right">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {group.items.map(r => {
                                          const info = getEmployeeDisplayInfo(r);
                                          const isCalibrated = r.managerScore != null || r.status === 'approved' || r.status === 'sm_final_approval';

                                          return (
                                            <tr key={r.id} className="group/row hover:bg-slate-50/70 transition">
                                              <td className="px-4 py-3">
                                                <div>
                                                  <div className="font-bold text-slate-900">{info.employeeName}</div>
                                                  <div className="text-[11px] text-slate-500 font-medium">#{info.employeeCode}</div>
                                                </div>
                                              </td>
                                              <td className="px-4 py-3">
                                                {(() => {
                                                  const isEmpSubmitted = Boolean(
                                                    r.employeeSubmittedAt ||
                                                    (r as any).submitted_at ||
                                                    (r as any).submittedAt ||
                                                    (r as any).employee_submitted_at ||
                                                    (String(r.status || '') === 'manager_review' || String(r.status || '').toLowerCase().includes('submitted') || r.status === 'approved' || r.status === 'sm_final_approval' || (r.employeeOverallScore != null && Number(r.employeeOverallScore) > 0))
                                                  );
                                                  const subDate = isEmpSubmitted
                                                    ? formatEvalDateTime(r.employeeSubmittedAt || (r as any).submitted_at || (r as any).submittedAt || (r as any).employee_submitted_at || r.updatedAt || r.createdAt)
                                                    : null;
                                                  const approvedDate = (isCalibrated || r.serviceManagerApprovedAt || r.managerReviewedAt)
                                                    ? formatEvalDateTime(r.serviceManagerApprovedAt || r.managerReviewedAt || (r as any).manager_reviewed_at || (r as any).approved_at || r.updatedAt)
                                                    : null;
                                                  const tooltipLines: string[] = [];
                                                  if (subDate) tooltipLines.push(`Submitted: ${subDate}`);
                                                  if (approvedDate) tooltipLines.push(`Approved: ${approvedDate}`);
                                                  const nativeTooltip = tooltipLines.join(' | ');

                                                  return (
                                                    <SubmissionDatesHover
                                                      subDate={subDate}
                                                      approvedDate={approvedDate}
                                                      isSubmitted={isEmpSubmitted}
                                                      align="left"
                                                      nativeTitle={nativeTooltip}
                                                    >
                                                      <div className="font-semibold text-slate-800 hover:text-primary-700 transition-colors">
                                                        {r.periodName || (r as any).form || 'Performance Evaluation'}
                                                      </div>
                                                      <div className="text-[10px] text-slate-500 font-medium">{info.teamName}</div>
                                                    </SubmissionDatesHover>
                                                  );
                                                })()}
                                              </td>
                                              <td className="px-3 py-3 text-center">
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                                  {r.frequency || 'Quarterly'}
                                                </span>
                                              </td>
                                              <td className="px-3 py-3 text-center font-semibold text-slate-700">
                                                {r.employeeOverallScore != null && Number(r.employeeOverallScore) > 0
                                                  ? `${Number(r.employeeOverallScore).toFixed(1)}%`
                                                  : '—'}
                                              </td>
                                              <td className="px-3 py-3 text-center">
                                                {r.managerScore != null ? (
                                                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                                    {Number(r.managerScore).toFixed(1)}%
                                                  </span>
                                                ) : (
                                                  <span className="text-[11px] text-slate-400 font-medium">Pending</span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3 text-center">
                                                {renderStatusBadge(r.status, r)}
                                              </td>
                                              <td className="px-4 py-3 text-right">
                                                <button
                                                  type="button"
                                                  onClick={() => handleSelectMgrResponse(r)}
                                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                                                >
                                                  <EyeIcon className="w-3.5 h-3.5" />
                                                  <span>{isCalibrated ? 'View Report' : 'Review'}</span>
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* Flat Submissions Table when Group by: None */
                <div className="pt-2">
                  {filteredSubmissionsList.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <DocumentChartBarIcon className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
                      <p className="text-sm font-semibold text-slate-600">No submissions found</p>
                      <p className="text-xs text-slate-400 mt-1">Try changing the status filter or search keyword.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            <th className="px-4 py-3.5">Employee</th>
                            <th className="px-4 py-3.5">Department / Team</th>
                            <th className="px-4 py-3.5">Form / Period</th>
                            <th className="px-3 py-3.5 text-center">Frequency</th>
                            <th className="px-3 py-3.5 text-center">Self Score</th>
                            <th className="px-3 py-3.5 text-center">Manager Score</th>
                            <th className="px-4 py-3.5 text-center">Status</th>
                            <th className="px-4 py-3.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSubmissionsList.map(r => {
                            const info = getEmployeeDisplayInfo(r);
                            const isCalibrated = r.managerScore != null || r.status === 'approved' || r.status === 'sm_final_approval';

                            return (
                              <tr key={r.id} className="group/row hover:bg-slate-50/70 transition">
                                <td className="px-4 py-3.5">
                                  <div>
                                    <div className="font-bold text-slate-900 text-xs">{info.employeeName}</div>
                                    <div className="text-[10px] font-mono text-slate-400">#{info.employeeCode}</div>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="font-semibold text-slate-800">{info.teamName}</div>
                                  <div className="text-[10px] text-slate-400">{info.departmentName}</div>
                                </td>
                                <td className="px-4 py-3.5">
                                  {(() => {
                                    const isEmpSubmitted = Boolean(
                                      r.employeeSubmittedAt ||
                                      (r as any).submitted_at ||
                                      (r as any).submittedAt ||
                                      (r as any).employee_submitted_at ||
                                      (String(r.status || '') === 'manager_review' || String(r.status || '').toLowerCase().includes('submitted') || r.status === 'approved' || r.status === 'sm_final_approval' || (r.employeeOverallScore != null && Number(r.employeeOverallScore) > 0))
                                    );
                                    const subDate = isEmpSubmitted
                                      ? formatEvalDateTime(r.employeeSubmittedAt || (r as any).submitted_at || (r as any).submittedAt || (r as any).employee_submitted_at || r.updatedAt || r.createdAt)
                                      : null;
                                    const approvedDate = (isCalibrated || r.serviceManagerApprovedAt || r.managerReviewedAt)
                                      ? formatEvalDateTime(r.serviceManagerApprovedAt || r.managerReviewedAt || (r as any).manager_reviewed_at || (r as any).approved_at || r.updatedAt)
                                      : null;
                                    const tooltipLines: string[] = [];
                                    if (subDate) tooltipLines.push(`Submitted: ${subDate}`);
                                    if (approvedDate) tooltipLines.push(`Approved: ${approvedDate}`);
                                    const nativeTooltip = tooltipLines.join(' | ');

                                    return (
                                      <SubmissionDatesHover
                                        subDate={subDate}
                                        approvedDate={approvedDate}
                                        isSubmitted={isEmpSubmitted}
                                        align="left"
                                        nativeTitle={nativeTooltip}
                                      >
                                        <div className="font-semibold text-slate-800 hover:text-primary-700 transition-colors">
                                          {r.periodName || (r as any).form || 'Performance Evaluation'}
                                        </div>
                                      </SubmissionDatesHover>
                                    );
                                  })()}
                                </td>
                                <td className="px-3 py-3.5 text-center">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                    {r.frequency || 'Quarterly'}
                                  </span>
                                </td>
                                <td className="px-3 py-3.5 text-center font-semibold text-slate-700">
                                  {r.employeeOverallScore != null && Number(r.employeeOverallScore) > 0
                                    ? `${Number(r.employeeOverallScore).toFixed(1)}%`
                                    : '—'}
                                </td>
                                <td className="px-3 py-3.5 text-center">
                                  {r.managerScore != null ? (
                                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                      {Number(r.managerScore).toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 font-medium">Pending</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  {renderStatusBadge(r.status, r)}
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectMgrResponse(r)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                                  >
                                    <EyeIcon className="w-3.5 h-3.5" />
                                    <span>{isCalibrated ? 'View Report' : 'Review'}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Top Performers Multi-Column Layout (Image 2) */
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4 animate-in fade-in duration-200">
              {/* Top Performers Sub-navigation Mode Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-1 items-center flex-wrap">
                  {[
                    { id: 'top_weekly', label: 'Top performers — Weekly' },
                    { id: 'top_monthly', label: 'Top performers — Monthly' },
                    { id: 'top_quarterly', label: 'Top performers — Quarterly' },
                    { id: 'top_annual', label: 'Top performers — Annual' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setReportViewTab(tab.id as any)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${reportViewTab === tab.id
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    {reportViewTab === 'top_weekly'
                      ? topPerformersQuarterRangeText
                      : `1 Apr ${topPerformersFiscalYear} - 31 Mar ${topPerformersFiscalYear + 1}`}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    ranked by score
                  </span>
                </div>
              </div>

              {/* Multi-column Side-Scroll Container */}
              <div className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth">
                {(reportViewTab === 'top_weekly'
                  ? topPerformersWeeklyColumns
                  : reportViewTab === 'top_monthly'
                    ? topPerformersMonthlyColumns
                    : reportViewTab === 'top_quarterly'
                      ? topPerformersQuarterlyColumns
                      : topPerformersAnnualColumns
                ).map(col => (
                  <div
                    key={col.key}
                    className={`min-w-[280px] max-w-[340px] flex-1 rounded-2xl overflow-hidden shadow-2xs bg-white flex flex-col shrink-0 ${(col as any).isSummaryYear
                      ? 'border-2 border-[#029597] shadow-md ring-1 ring-[#029597]/20'
                      : 'border border-slate-200/80'
                      }`}
                  >
                    {/* Column Header */}
                    <div className={`px-4 py-2.5 font-bold text-xs flex items-center justify-between ${(col as any).isSummaryYear
                      ? 'bg-[#029597] text-white'
                      : 'bg-slate-50 text-slate-800 border-b border-slate-200/80'
                      }`}>
                      <span>{col.label}</span>
                      {col.subLabel && (
                        <span className="text-[10px] font-normal text-slate-400">{col.subLabel}</span>
                      )}
                    </div>

                    {/* Column Body */}
                    <div className="p-3 flex-1 flex flex-col justify-start space-y-3">
                      {col.groups.length === 0 ? (
                        <div className="py-14 text-center my-auto">
                          <p className="text-xs text-slate-400 font-medium italic">Nothing approved.</p>
                        </div>
                      ) : (
                        col.groups.map((group: any) => {
                          const color = getTeamHeaderColor(group.teamName);
                          return (
                            <div key={`${group.departmentName}_${group.teamName}`} className="space-y-2 pt-2 first:pt-0 border-t first:border-t-0 border-slate-100">
                              <div className={`px-2.5 py-1.5 rounded-lg ${color.bg}`}>
                                <div className={`text-xs font-extrabold ${color.text} tracking-tight truncate`}>
                                  Team: {group.teamName}
                                </div>
                              </div>

                              <div className="space-y-1.5 px-1">
                                {group.members.map((member: any) => (
                                  <div key={member.code || member.name} className="flex items-center justify-between text-xs py-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-xs font-bold text-slate-600 shrink-0 inline-flex items-center gap-1 whitespace-nowrap">
                                        {member.rank === 1 ? '🥇 1.' : member.rank === 2 ? '🥈 2.' : member.rank === 3 ? '🥉 3.' : <span className="text-slate-400">{member.rank}.</span>}
                                      </span>
                                      <span className="font-semibold text-slate-800 truncate text-xs" title={member.name}>
                                        {member.name}
                                      </span>
                                    </div>
                                    <span className="font-mono font-bold text-slate-900 shrink-0 ml-2">
                                      {member.score.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4.4. DOWNLINE TEAM MEMBERS & REPORTS MODAL POPUP */}
      {/* ========================================================================= */}
      {Boolean(selectedDownlineTeamModal) && (() => {
        const team = selectedDownlineTeamModal;
        const teamResponses: EvaluationResponse[] = (team.responses || []).filter((r: EvaluationResponse) => {
          const { employeeCode, employeeName } = getEmployeeDisplayInfo(r);

          // Status filter
          if (downlineModalStatusFilter === 'pending') {
            const isPending = r.status === 'employee_in_progress' || (r.managerScore == null && r.status !== 'approved' && r.status !== 'sm_final_approval');
            if (!isPending) return false;
          } else if (downlineModalStatusFilter === 'submitted') {
            const isSubmitted = r.status === 'manager_review' || (r.employeeOverallScore != null && r.employeeOverallScore > 0 && r.managerScore == null);
            if (!isSubmitted) return false;
          } else if (downlineModalStatusFilter === 'approved') {
            const isApproved = r.status === 'approved' || r.status === 'sm_final_approval' || r.managerScore != null;
            if (!isApproved) return false;
          }

          // Search query filter
          if (downlineModalSearchQuery.trim()) {
            const query = downlineModalSearchQuery.toLowerCase().trim();
            const matchesName = (employeeName || '').toLowerCase().includes(query);
            const matchesCode = String(employeeCode).toLowerCase().includes(query);
            const matchesDesignation = (r.designation || '').toLowerCase().includes(query);
            if (!matchesName && !matchesCode && !matchesDesignation) return false;
          }

          return true;
        });

        const allCount = (team.responses || []).length;
        const pendingCount = (team.responses || []).filter((r: any) => r.status === 'employee_in_progress' || (r.managerScore == null && r.status !== 'approved' && r.status !== 'sm_final_approval')).length;
        const submittedCount = (team.responses || []).filter((r: any) => (r.status === 'manager_review' || (r.employeeOverallScore != null && r.employeeOverallScore > 0)) && r.status !== 'approved' && r.managerScore == null).length;
        const approvedCount = (team.responses || []).filter((r: any) => r.status === 'approved' || r.status === 'sm_final_approval' || r.managerScore != null).length;

        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-teal-50/60 via-white to-slate-50/60 border-b border-slate-200/80 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
                      <BriefcaseIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-slate-800 truncate">
                          {team.department} Team Performance Overview
                        </h3>
                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/70 shadow-2xs">
                          {team.totalEmployees} {team.totalEmployees === 1 ? 'Member' : 'Members'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap font-normal">
                        {team.subManagerName && (
                          <span>Reporting Manager: <span className="text-slate-700 font-medium">{team.subManagerName}</span></span>
                        )}
                        <span className="text-slate-300">•</span>
                        <span>Avg Team Score: <span className="text-teal-700 font-semibold">{team.teamAvgMgrScore !== null ? `${team.teamAvgMgrScore}%` : (team.teamAvgScore !== null ? `${team.teamAvgScore}% (Self)` : 'Pending')}</span></span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDownlineTeamModal(null)}
                    className="w-8.5 h-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0 shadow-2xs"
                  >
                    <XMarkIcon className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>

                {/* Team Progress Telemetry Bar */}
                <div className="mt-4 pt-3.5 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-medium tracking-wide text-slate-400 block">Total Headcount</span>
                    <span className="text-sm font-semibold text-slate-800">{allCount}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-medium tracking-wide text-teal-600 block">Completion Rate</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold text-teal-800">{team.completionPercentage}%</span>
                      <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${team.completionPercentage}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-medium tracking-wide text-amber-600 block">Pending / In Progress</span>
                    <span className="text-sm font-semibold text-amber-700">{pendingCount}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-medium tracking-wide text-emerald-600 block">Calibrated / Final</span>
                    <span className="text-sm font-semibold text-emerald-700">{approvedCount}</span>
                  </div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="p-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="relative w-full sm:w-80">
                  <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={downlineModalSearchQuery}
                    onChange={e => setDownlineModalSearchQuery(e.target.value)}
                    placeholder="Search member name, code, role..."
                    className="w-full h-9 pl-10 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition shadow-2xs"
                  />
                  {downlineModalSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDownlineModalSearchQuery('')}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {[
                    { id: 'all', label: 'All', count: allCount },
                    { id: 'pending', label: 'Pending', count: pendingCount },
                    { id: 'submitted', label: 'Submitted', count: submittedCount },
                    { id: 'approved', label: 'Calibrated', count: approvedCount },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDownlineModalStatusFilter(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer ${downlineModalStatusFilter === tab.id
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                        }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${downlineModalStatusFilter === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                        }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Members List Table in Modal */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                {teamResponses.length === 0 ? (
                  <div className="py-12 text-center space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <UserGroupIcon className="w-8 h-8 mx-auto text-slate-400" />
                    <h5 className="text-xs font-semibold text-slate-700">No member records match criteria</h5>
                    <p className="text-[11px] text-slate-400">Try changing the search query or status filter.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-slate-400 font-medium text-[10px] uppercase tracking-wider border-b border-slate-200/80">
                        <tr>
                          <th className="px-5 py-3.5">Employee & Squad</th>
                          <th className="px-4 py-3.5 text-center">Self Score</th>
                          <th className="px-4 py-3.5 text-center">Manager Score</th>
                          <th className="px-4 py-3.5 text-center">Status</th>
                          <th className="px-5 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-normal">
                        {teamResponses.map(r => {
                          const { employeeCode, employeeName, teamName } = getEmployeeDisplayInfo(r);
                          const isCalibrated = r.managerScore != null || r.status === 'approved' || r.status === 'sm_final_approval';
                          const initials = (employeeName || 'EM').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                          return (
                            <tr key={r.id} className="hover:bg-slate-50/70 transition-colors group">
                              <td className="px-5 py-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-xs text-slate-800 group-hover:text-teal-900 transition">
                                      {employeeName || r.employeeName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      #{employeeCode}
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-normal text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200/70 shadow-2xs">
                                      <BuildingOfficeIcon className="w-3 h-3 text-teal-600" />
                                      <span>{teamName}</span>
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="font-normal text-xs text-slate-700">
                                  {r.employeeOverallScore != null ? `${Number(r.employeeOverallScore).toFixed(1)}%` : '0.0%'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                {r.managerScore != null ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200/80 shadow-2xs">
                                    {Number(r.managerScore).toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-normal bg-slate-100 text-slate-400 border border-slate-200/60">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                {renderStatusBadge(r.status, r)}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleSelectMgrResponse(r)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-medium shadow-2xs transition-all hover:shadow cursor-pointer"
                                >
                                  <EyeIcon className="w-3.5 h-3.5" />
                                  <span>{isCalibrated ? 'View Scorecard' : 'View Report'}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500">
                  Showing <span className="font-medium text-slate-700">{teamResponses.length}</span> of <span className="font-medium text-slate-700">{allCount}</span> members in {team.department}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDownlineTeamModal(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer border border-slate-200 shadow-2xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4.5. REVIEW & SCORE / CALIBRATION MODAL POPUP DIALOG (MODERN NEAT UI) */}
      {/* ========================================================================= */}
      {Boolean(selectedMgrResponseId && selectedMgrResponse) && (() => {
        const isYearly = isYearlyResponse(selectedMgrResponse);
        const curYearlyRecords = selectedMgrResponse!.monthly_records || [];
        const curYearlyRec = isYearly ? curYearlyRecords.find(m => m.monthIndex === activeMgrYearlyFiscalMonth) : null;
        const curFiscalMonthObj = FISCAL_MONTHS.find(m => m.monthIndex === activeMgrYearlyFiscalMonth);
        const curMonthName = curFiscalMonthObj ? curFiscalMonthObj.monthName : `Month ${activeMgrYearlyFiscalMonth}`;

        const approvedMonths = curYearlyRecords.filter(m => m.status === 'manager_approved');
        const ytdScore = approvedMonths.length > 0
          ? Number((approvedMonths.reduce((acc, m) => acc + (Number(m.managerScore) || 0), 0) / approvedMonths.length).toFixed(1))
          : null;

        const { employeeCode, employeeName, teamName } = getEmployeeDisplayInfo(selectedMgrResponse!);
        const empScore = isYearly
          ? (curYearlyRec?.employeeScore != null ? Number(curYearlyRec.employeeScore) : 0)
          : (selectedMgrResponse!.employeeOverallScore != null ? Number(selectedMgrResponse!.employeeOverallScore) : 0);
        const rating = getRatingForScore(mgrScore);
        const cycleForResp = cycles.find(c => c.id === selectedMgrResponse!.cycleId);
        const cyclePeriod = isYearly
          ? `${curMonthName} Milestone • ${cycleForResp?.periodName || (selectedMgrResponse as any)?.periodName || 'Annual Evaluation'}`
          : (cycleForResp?.periodName || (selectedMgrResponse as any)?.periodName || 'Active Cycle');

        const rawStatus = isYearly
          ? String(curYearlyRec?.status || 'pending_employee').toLowerCase().trim()
          : String(selectedMgrResponse!.status || '').toLowerCase().trim();

        const isPendingManagerReview = isYearly
          ? rawStatus === 'submitted_to_manager'
          : Boolean(
              rawStatus === 'manager_review' ||
              rawStatus === 'submitted to manager' ||
              rawStatus.includes('submitted')
            );

        const isAlreadyCalibrated = isYearly
          ? rawStatus === 'manager_approved'
          : Boolean(
              rawStatus === 'approved' ||
              rawStatus === 'sm_final_approval' ||
              rawStatus === 'completed' ||
              rawStatus.includes('calibrated') ||
              (selectedMgrResponse!.managerScore != null && !isPendingManagerReview)
            );

        const isReadOnly = (activeRole === 'downline_teams' && !isDirectReport(getEmployeeDisplayInfo(selectedMgrResponse!).empInDb) && !isHrOrAdmin) || selectedMgrResponse!.status === 'sm_final_approval';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-[96vw] xl:max-w-[1440px] my-auto overflow-hidden flex flex-col max-h-[92vh]">

              {/* Modal Header: Candidate Profile Info & KPI Telemetry */}
              <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
                {/* Left: Employee Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {employeeName}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400 font-medium">
                        #{employeeCode}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {teamName}
                      </span>
                      {renderStatusBadge(isYearly ? (curYearlyRec?.status || 'pending_employee') : selectedMgrResponse!.status, selectedMgrResponse!)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Designation: <strong className="text-slate-700 font-medium">{selectedMgrResponse!.designation || 'Team Member'}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>Cycle: <strong className="text-slate-700 font-medium">{cyclePeriod}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right: Unified Score Telemetry Strip & Close Button */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-4 bg-slate-50/90 px-4 py-2 rounded-xl border border-slate-200">
                    <div className="text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        {isYearly ? `${curFiscalMonthObj?.shortName || 'Month'} Self` : 'Self Score'}
                      </span>
                      <span className="text-xs font-bold text-slate-700">{empScore.toFixed(1)}%</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 block">
                        {isYearly ? `${curFiscalMonthObj?.shortName || 'Month'} Manager` : (isPendingManagerReview ? 'Calibrated Score' : 'Manager Score')}
                      </span>
                      <span className="text-sm font-black text-teal-900">{mgrScore.toFixed(1)}%</span>
                    </div>
                    {isYearly && (
                      <>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="text-left">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 block">YTD Avg Score</span>
                          <span className="text-sm font-black text-indigo-900">
                            {ytdScore !== null ? `${ytdScore}%` : '—'}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 block">Performance Tier</span>
                      <span className="text-xs font-bold text-emerald-900 block leading-tight">{rating.name}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMgrResponseId('')}
                    className="w-8.5 h-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    title="Close Dialog"
                  >
                    <XMarkIcon className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Scrollable Matrix */}
              <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">
                {/* Mobile Telemetry */}
                <div className="flex sm:hidden items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block font-semibold">{isYearly ? `${curFiscalMonthObj?.shortName} Self` : 'Self'}</span>
                    <span className="text-xs font-bold text-slate-800">{empScore.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-teal-700 block font-semibold">{isYearly ? `${curFiscalMonthObj?.shortName} Mgr` : 'Manager'}</span>
                    <span className="text-xs font-bold text-teal-900">{mgrScore.toFixed(1)}%</span>
                  </div>
                  {isYearly && (
                    <div>
                      <span className="text-[9px] uppercase text-indigo-700 block font-semibold">YTD Avg</span>
                      <span className="text-xs font-bold text-indigo-900">{ytdScore !== null ? `${ytdScore}%` : '—'}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[9px] uppercase text-emerald-700 block font-semibold">Tier</span>
                    <span className="text-xs font-bold text-emerald-900 block leading-tight">{rating.name}</span>
                  </div>
                </div>

                {/* 12-Month Stepper for Yearly Cadence */}
                {isYearly && (() => {
                  const quarters = [
                    { name: 'Q1 (Apr - Jun)', months: FISCAL_MONTHS.filter(m => m.quarter === 1) },
                    { name: 'Q2 (Jul - Sep)', months: FISCAL_MONTHS.filter(m => m.quarter === 2) },
                    { name: 'Q3 (Oct - Dec)', months: FISCAL_MONTHS.filter(m => m.quarter === 3) },
                    { name: 'Q4 (Jan - Mar)', months: FISCAL_MONTHS.filter(m => m.quarter === 4) }
                  ];

                  return (
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
                            <CalendarDaysIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">
                              12-Month Financial Year Milestone Reviews (April – March Cycle)
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Click any monthly milestone to review employee deliverables, calibrate scores, and maintain rolling YTD average.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold text-slate-500">Cumulative YTD Score:</span>
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-900 border border-teal-300">
                            {ytdScore !== null ? `${ytdScore}% (${approvedMonths.length}/12 Approved)` : '0/12 Approved'}
                          </span>
                        </div>
                      </div>

                      {/* 4 Quarters Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {quarters.map(q => (
                          <div key={q.name} className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/70 space-y-2">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              {q.name}
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {q.months.map(m => {
                                const rec = curYearlyRecords.find(r => r.monthIndex === m.monthIndex);
                                const isSelected = activeMgrYearlyFiscalMonth === m.monthIndex;
                                const isApproved = rec?.status === 'manager_approved';
                                const isSubmitted = rec?.status === 'submitted_to_manager';
                                const lockInfo = getYearlyMonthLockInfo(m.monthIndex, curYearlyRecords);
                                const isLocked = lockInfo.isLocked;
                                const score = isApproved && rec?.managerScore != null ? Number(rec.managerScore).toFixed(0) : null;

                                return (
                                  <button
                                    key={m.monthKey}
                                    type="button"
                                    onClick={() => switchMgrYearlyMonth(m.monthIndex)}
                                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                                      isSelected
                                        ? isLocked
                                          ? 'bg-slate-700 text-white border-slate-800 ring-2 ring-slate-500/30'
                                          : isApproved
                                            ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-500/30'
                                            : isSubmitted
                                              ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-500/30'
                                              : 'bg-teal-700 text-white border-teal-800 ring-2 ring-teal-500/30'
                                        : isApproved
                                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                                          : isSubmitted
                                            ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 ring-1 ring-amber-400'
                                            : isLocked
                                              ? 'bg-slate-100/90 text-slate-400 border-slate-200 hover:bg-slate-200/70'
                                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span className="text-[11px] flex items-center gap-1">
                                      {isLocked && <LockClosedIcon className="w-2.5 h-2.5 stroke-[2.5]" />}
                                      {m.shortName}
                                    </span>
                                    <span className={`text-[9px] font-medium leading-none mt-0.5 ${
                                      isSelected
                                        ? 'text-white/90 font-bold'
                                        : isApproved
                                          ? 'text-emerald-700 font-bold'
                                          : isSubmitted
                                            ? 'text-amber-700 font-bold'
                                            : isLocked
                                              ? 'text-slate-400'
                                              : 'text-slate-500 font-medium'
                                    }`}>
                                      {score !== null
                                        ? `${score}%`
                                        : isSubmitted
                                          ? 'Submitted'
                                          : isLocked
                                            ? 'Locked'
                                            : m.monthIndex === 6
                                              ? 'Pending'
                                              : m.monthIndex < 6
                                                ? 'Past'
                                                : 'Pending'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Active Month Milestone Status Banner */}
                      <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        curYearlyRec?.status === 'manager_approved'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : curYearlyRec?.status === 'submitted_to_manager'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                            : 'bg-slate-100/80 border-slate-200 text-slate-700'
                      }`}>
                        <div className="flex items-center gap-2">
                          <CalendarDaysIcon className="w-4 h-4 shrink-0" />
                          <span>
                            Viewing <strong>{curMonthName}{curYearlyRec?.calendarYear ? ` (${curYearlyRec.calendarYear})` : ''}</strong> milestone —{' '}
                            {curYearlyRec?.status === 'manager_approved'
                              ? `Approved with Manager Score of ${Number(curYearlyRec.managerScore || 0).toFixed(1)}%. You may recalibrate deliverable actuals below.`
                              : curYearlyRec?.status === 'submitted_to_manager'
                                ? `Submitted by employee with self-score of ${Number(curYearlyRec.employeeScore || 0).toFixed(1)}%. Ready for calibration.`
                                : 'Pending employee submission for this month.'}
                          </span>
                        </div>
                        {curYearlyRec?.employeeRemarks && (
                          <span className="text-[11px] italic bg-white/70 px-2.5 py-1 rounded-md border border-slate-200/50 max-w-sm truncate">
                            Emp Note: {curYearlyRec.employeeRemarks}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Categories Loop */}
                {selectedMgrCategories.map(cat => {
                  let catTotalMgrEarned = 0;
                  cat.kpis.forEach(kpi => {
                    const respItem = isYearly
                      ? (curYearlyRec?.kpiEntries?.[kpi.id] || (kpi.name ? curYearlyRec?.kpiEntries?.[kpi.name] : null))
                      : selectedMgrResponse!.kpiResponses?.[kpi.id];
                    const empActual = respItem?.actualValue ?? respItem?.actual_value ?? '';
                    const curMgrActual = mgrKpiActuals[kpi.id] !== undefined ? mgrKpiActuals[kpi.id] : (respItem?.managerActualValue ?? respItem?.manager_actual_pm ?? empActual);
                    catTotalMgrEarned += calculateKPIScore(kpi, curMgrActual).earnedScore;
                  });

                  return (
                    <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                      {/* Category Header Strip */}
                      <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <SparklesIcon className="w-4 h-4 text-teal-600 stroke-[2.2]" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs text-slate-900">{cat.name}</h4>
                              <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
                                {cat.weightage}% Weight
                              </span>
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{cat.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-start sm:self-center">
                          <span className="text-xs text-slate-500">Category Score:</span>
                          <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                            {catTotalMgrEarned.toFixed(2)}% / {cat.weightage}%
                          </span>
                        </div>
                      </div>

                      {/* Deliverables Table (Clean, neat columns without box clutter) */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[780px] table-auto">
                          <thead className="bg-white text-slate-400 font-semibold border-b border-slate-100 text-[11px] uppercase tracking-wider">
                            <tr>
                              <th className="px-5 py-3 min-w-[200px]">Deliverable</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[85px]">Target</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[85px]">Weight</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[95px]">Actual PM</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[95px]">Earned</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[130px]">Insufficient</th>
                              <th className="px-3 py-3 text-center min-w-[150px] bg-slate-50/50 text-slate-700">
                                {isReadOnly ? 'Manager Goal & Score' : 'Manager Calibration'}
                              </th>
                              {!isReadOnly && (
                                <th className="px-5 py-3 min-w-[190px]">
                                  Manager Remarks
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {cat.kpis.map(kpi => {
                              const respItem = isYearly
                                ? (curYearlyRec?.kpiEntries?.[kpi.id] || (kpi.name ? curYearlyRec?.kpiEntries?.[kpi.name] : null))
                                : selectedMgrResponse!.kpiResponses?.[kpi.id];
                              const empActual = respItem?.actualValue ?? respItem?.actual_value ?? '';
                              const currentMgrActual = mgrKpiActuals[kpi.id] !== undefined ? mgrKpiActuals[kpi.id] : (respItem?.managerActualValue ?? respItem?.manager_actual_pm ?? empActual);
                              const calcEmp = calculateKPIScore(kpi, empActual);
                              const calcMgr = calculateKPIScore(kpi, currentMgrActual);
                              const currentMgrRemark = mgrKpiRemarks[kpi.id] ?? (respItem?.managerRemarks ?? respItem?.manager_remark ?? '');
                              const isGoalModified = String(currentMgrActual).trim() !== String(empActual).trim();
                              const parsedTarget = parseTargetExpression(kpi.targetFromManager, kpi.targetValue || 1);
                              const targetThreshold = parsedTarget.threshold;

                              const isNeg = isNegativeKpi(kpi);
                              const empRemark = respItem?.employeeRemarks ?? respItem?.employee_remark ?? '';

                              return (
                                <tr
                                  key={kpi.id}
                                  className={`group/delivRow transition-colors border-b border-slate-100 last:border-b-0 ${isNeg ? 'bg-rose-50/25 hover:bg-rose-50/45 border-l-4 border-l-rose-400' : 'hover:bg-slate-50/50 border-l-4 border-l-transparent'}`}
                                >
                                  {/* Deliverable Specification */}
                                  <td className="px-5 py-3.5">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-xs ${isNeg ? 'font-bold text-rose-950' : 'font-semibold text-slate-900'}`}>
                                          {kpi.name}
                                        </span>
                                      </div>
                                      {kpi.description && (
                                        <div className={`text-[11px] mt-0.5 truncate max-w-xs ${isNeg ? 'text-rose-600/80 font-medium' : 'text-slate-400'}`}>{kpi.description}</div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Target Goal */}
                                  <td className="px-3 py-3.5 text-center font-bold text-xs whitespace-nowrap">
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${isNeg ? 'bg-rose-100/70 text-rose-800 border-rose-200 shadow-2xs' : 'text-slate-700'}`}>
                                        {kpi.targetFromManager}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Target Score */}
                                  <td className="px-3 py-3.5 text-center text-slate-600 font-medium text-xs whitespace-nowrap">
                                    {kpi.targetScore}%
                                  </td>

                                  {/* Actual PM (Clean text with unit + Highlight if exceeding target) */}
                                  <td className="px-3 py-3.5 text-center text-xs whitespace-nowrap">
                                    <div className="flex flex-col items-center justify-center gap-1">
                                      {empActual !== '' && empActual !== null && empActual !== undefined ? (
                                        (() => {
                                          const num = parseFloat(String(empActual));
                                          const isOver = !isNaN(num) && (
                                            isNeg
                                              ? (parsedTarget.operator === '<' ? num >= targetThreshold : (targetThreshold === 0 ? num > 0 : num > targetThreshold))
                                              : (targetThreshold > 0 && num > targetThreshold)
                                          );
                                          const isMet = !isNaN(num) && (
                                            isNeg
                                              ? (parsedTarget.operator === '<' ? num < targetThreshold : (targetThreshold === 0 ? num === 0 : num <= targetThreshold))
                                              : (targetThreshold > 0 && num >= targetThreshold)
                                          );

                                          return (
                                            <span className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full border text-xs shadow-2xs ${isNeg && isOver
                                              ? 'bg-rose-50 text-rose-900 border-rose-300'
                                              : isOver
                                                ? 'bg-emerald-50 text-emerald-950 border border-emerald-400'
                                                : isMet && !isNeg
                                                  ? 'bg-teal-50 text-teal-900 border border-teal-300'
                                                  : 'bg-slate-50 text-slate-900 border-slate-200'
                                              }`}>
                                              <span>{empActual} {kpi.unit}</span>
                                              {isOver && !isNeg && <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded-full">EXCEEDED</span>}
                                              {isOver && isNeg && <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-800 bg-rose-200/80 px-1.5 py-0.5 rounded-full">EXCEEDED TARGET</span>}
                                            </span>
                                          );
                                        })()
                                      ) : (
                                        <span className="text-slate-300 font-bold">—</span>
                                      )}

                                      {/* Emp and Mgr Remark Badges below Actual PM */}
                                      {(empRemark?.trim() || currentMgrRemark?.trim()) && (
                                        <DeliverableRemarksHover
                                          selfRemarks={empRemark}
                                          mgrRemarks={currentMgrRemark}
                                          align="center"
                                        >
                                          <div className="flex items-center justify-center gap-1 mt-0.5 flex-wrap cursor-pointer">
                                            {empRemark?.trim() && (
                                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary-50 text-primary-700 border border-primary-200 cursor-help shrink-0">
                                                <ChatBubbleLeftEllipsisIcon className="w-2.5 h-2.5 text-primary-600" />
                                                <span>Emp</span>
                                              </span>
                                            )}
                                            {currentMgrRemark?.trim() && (
                                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-200 cursor-help shrink-0">
                                                <ChatBubbleLeftEllipsisIcon className="w-2.5 h-2.5 text-teal-600" />
                                                <span>Mgr</span>
                                              </span>
                                            )}
                                          </div>
                                        </DeliverableRemarksHover>
                                      )}
                                    </div>
                                  </td>

                                  {/* Earned Score (Clean green font) */}
                                  <td className="px-3 py-3.5 text-center font-bold text-teal-700 font-mono text-xs whitespace-nowrap">
                                    {calcEmp.earnedScore.toFixed(2)}%
                                  </td>

                                  {/* Insufficient / Variance Column with Hover for Employee & Manager Remarks */}
                                  <td className="px-3 py-3.5 text-center whitespace-nowrap">
                                    {(() => {
                                      const isFlagged = respItem?.isInsufficient !== undefined && respItem?.isInsufficient !== null
                                        ? respItem.isInsufficient
                                        : (kpi?.isInsufficient ?? (kpi as any)?.is_insufficient ?? false);
                                      const status = getInsufficientStatus(kpi, empActual, isFlagged);
                                      return (
                                        <DeliverableRemarksHover
                                          selfRemarks={empRemark}
                                          mgrRemarks={currentMgrRemark}
                                          align="center"
                                          className="w-auto inline-flex justify-center"
                                        >
                                          <span
                                            className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full border text-[10px] shadow-2xs ${status.badgeClass} ${empRemark || currentMgrRemark ? 'cursor-help' : ''}`}
                                          >
                                            {status.label}
                                            {(empRemark || currentMgrRemark) && <ChatBubbleLeftEllipsisIcon className="w-3 h-3 ml-0.5 opacity-70 shrink-0" />}
                                          </span>
                                        </DeliverableRemarksHover>
                                      );
                                    })()}
                                  </td>

                                  {/* Manager Goal & Score Column */}
                                  <td className="px-3 py-3.5 text-center bg-slate-50/50">
                                    {(() => {
                                      const numMgr = parseFloat(String(currentMgrActual !== '' ? currentMgrActual : empActual));
                                      const isOverMgr = !isNaN(numMgr) && (isNeg ? numMgr > targetThreshold : (targetThreshold > 0 && numMgr > targetThreshold));
                                      const isMetMgr = !isNaN(numMgr) && (isNeg ? numMgr <= targetThreshold : (targetThreshold > 0 && numMgr >= targetThreshold));

                                      return (
                                        <div className="flex flex-col items-center justify-center gap-1">
                                          {isReadOnly ? (
                                            <div className="font-semibold text-xs text-slate-900">
                                              <span className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full border text-xs shadow-2xs ${isGoalModified
                                                ? 'bg-amber-100/90 text-amber-950 border-amber-300'
                                                : isNeg && isOverMgr
                                                  ? 'bg-rose-50 text-rose-900 border-rose-300'
                                                  : isOverMgr
                                                    ? 'bg-teal-100/80 text-teal-950 border-teal-300'
                                                    : 'bg-white text-slate-900 border-slate-200'
                                                }`}>
                                                <span>{currentMgrActual !== '' && currentMgrActual !== null && currentMgrActual !== undefined ? currentMgrActual : (empActual || '—')} {kpi.unit || ''}</span>
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center justify-center gap-1">
                                              <div className="flex items-center justify-center gap-1.5">
                                                <input
                                                  type="number"
                                                  step="1"
                                                  min="0"
                                                  value={currentMgrActual !== '' && currentMgrActual !== null && currentMgrActual !== undefined ? (typeof currentMgrActual === 'number' ? Math.floor(currentMgrActual) : (String(currentMgrActual).includes('.') ? parseInt(String(currentMgrActual), 10) : currentMgrActual)) : ''}
                                                  onKeyDown={e => {
                                                    if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
                                                      e.preventDefault();
                                                    }
                                                  }}
                                                  onChange={e => handleMgrRowActualChange(kpi, e.target.value)}
                                                  placeholder="0"
                                                  className={`w-16 h-8 px-2 text-center font-bold text-xs rounded-full transition shadow-2xs focus:outline-none ${isGoalModified
                                                    ? 'bg-amber-50 text-amber-950 border-2 border-amber-400 focus:border-amber-600 ring-2 ring-amber-200/50'
                                                    : isNeg && isOverMgr
                                                      ? 'bg-rose-50 text-rose-950 border-2 border-rose-500 ring-2 ring-rose-400/30 font-black'
                                                      : isOverMgr
                                                        ? 'bg-emerald-50 text-emerald-950 border-2 border-emerald-400 ring-2 ring-emerald-300/30 font-black'
                                                        : isMetMgr && !isNeg
                                                          ? 'bg-teal-50 text-teal-950 border-2 border-teal-300 font-bold'
                                                          : 'bg-white text-slate-900 border border-slate-300 focus:border-teal-500'
                                                    }`}
                                                />
                                                {kpi.unit && <span className="text-[11px] text-slate-500 font-semibold">{kpi.unit}</span>}
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <span className="text-[11px] font-bold text-teal-800 font-mono">
                                                  {calcMgr.earnedScore.toFixed(2)}%
                                                </span>
                                                {isGoalModified ? (
                                                  <span className="text-[9px] font-bold uppercase text-amber-800 px-1.5 py-0.2 rounded-full bg-amber-100 border border-amber-300">
                                                    ADJUSTED
                                                  </span>
                                                ) : isOverMgr && !isNeg ? (
                                                  <span className="text-[9px] font-bold uppercase text-emerald-800 px-1.5 py-0.2 rounded-full bg-emerald-100 border border-emerald-300">
                                                    EXCEEDED
                                                  </span>
                                                ) : isOverMgr && isNeg ? (
                                                  <span className="text-[9px] font-bold uppercase text-rose-800 px-1.5 py-0.2 rounded-full bg-rose-100 border border-rose-300">
                                                    EXCEEDED TARGET
                                                  </span>
                                                ) : null}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </td>

                                  {/* Manager Remarks Column (Only rendered when NOT read-only for editing) */}
                                  {!isReadOnly && (
                                    <td className="px-5 py-3.5 min-w-[200px]">
                                      <ExpandableRemarkInput
                                        value={currentMgrRemark}
                                        onChange={val => handleMgrRowRemarkChange(kpi.id, val)}
                                        placeholder={isGoalModified ? 'Reason for goal change...' : 'Add manager remarks...'}
                                        className={isGoalModified && !currentMgrRemark.trim()
                                          ? 'bg-amber-50/90 border-2 border-amber-400 focus:border-amber-600 text-slate-900 placeholder:text-amber-700'
                                          : 'bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-500 text-slate-800'}
                                      />
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* Scorecard Overall Manager Remarks Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <ClipboardDocumentListIcon className="w-4 h-4 text-teal-600" />
                    <span>{isYearly ? `${curMonthName} Milestone Manager Remarks & Feedback` : 'Overall Manager Evaluation Summary & Feedback'}</span>
                  </label>
                  {isReadOnly ? (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed min-h-[56px] italic">
                      {mgrRemarks || 'No overall remarks provided.'}
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      value={mgrRemarks}
                      onChange={e => setMgrRemarks(e.target.value)}
                      placeholder={isYearly ? `Enter monthly milestone performance feedback for ${curMonthName}...` : "Enter comprehensive performance evaluation summary, key strengths, growth areas, and commendations..."}
                      className="w-full p-3.5 bg-slate-50/50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition resize-none placeholder:text-slate-400"
                    />
                  )}
                </div>
              </div>

              {/* Modal Sticky Footer */}
              <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">{isYearly ? `${curFiscalMonthObj?.shortName || 'Month'} Score:` : 'Total Score:'}</span>
                  <span className="font-bold text-slate-900 text-sm">{mgrScore.toFixed(1)}%</span>
                  {isYearly && (
                    <>
                      <span className="text-slate-300 mx-1">•</span>
                      <span className="text-slate-500">YTD Score:</span>
                      <span className="font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 text-xs">
                        {ytdScore !== null ? `${ytdScore}%` : '—'}
                      </span>
                    </>
                  )}
                  <span className="text-slate-300 mx-1">•</span>
                  <span className="text-slate-500">Tier:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80 text-xs inline-flex items-center gap-1.5">
                    <strong className="font-bold text-emerald-950">{rating.name}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 justify-end flex-wrap">
                  {isReadOnly ? (
                    <button
                      type="button"
                      onClick={() => setSelectedMgrResponseId('')}
                      className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
                    >
                      Close Report
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedMgrResponseId('')}
                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-200"
                      >
                        Cancel
                      </button>

                      {isYearly ? (
                        <button
                          type="button"
                          onClick={() => handleManagerYearlyMonthApprove(activeMgrYearlyFiscalMonth)}
                          className="flex items-center justify-center gap-2 px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                          <CheckCircleIcon className="w-4 h-4 stroke-[2.2]" />
                          <span>{isAlreadyCalibrated ? `Update & Recalibrate ${curMonthName}` : `Approve & Save ${curMonthName} Milestone`}</span>
                        </button>
                      ) : (() => {
                        const otherPendingSubmittedList = (activeScopedResponsesForCards || []).filter(r =>
                          r.id !== selectedMgrResponseId &&
                          ((r.status as string) === 'manager_review' || (r.status as string) === 'Submitted to Manager' || String(r.status || '').toLowerCase().includes('submitted')) &&
                          r.managerScore == null
                        );

                        return (
                          <>
                            {otherPendingSubmittedList.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleManagerSubmitWithNext(otherPendingSubmittedList[0])}
                                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                              >
                                <SparklesIcon className="w-4 h-4 text-amber-300" />
                                <span>Submit & Next ({otherPendingSubmittedList.length} Left)</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={handleManagerSubmit}
                              className="flex items-center justify-center gap-2 px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                            >
                              <CheckCircleIcon className="w-4 h-4 stroke-[2.2]" />
                              <span>{isAlreadyCalibrated ? 'Update & Recalibrate' : 'Submit Calibration & Approve'}</span>
                            </button>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* ========================================================================= */}
      {/* MANAGER EDIT DELIVERABLES MATRIX MODAL */}
      {/* ========================================================================= */}
      {isMgrEditMatrixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <PencilSquareIcon className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Edit Deliverables Matrix
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/80">
                      Unlocked (0 Submissions)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {mgrEditTeamName || 'Team'} • Modify category weights & targets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMgrEditMatrixModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMgrSaveMatrixChanges} className="overflow-y-auto space-y-5 pt-4 pr-1 flex-1">
              {/* Form & Period Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Form Title</label>
                  <input
                    type="text"
                    value={mgrEditFormName}
                    onChange={e => setMgrEditFormName(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs"
                    placeholder="Form title..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Period Tag</label>
                  <input
                    type="text"
                    value={mgrEditPeriod}
                    onChange={e => setMgrEditPeriod(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs"
                    placeholder="Period..."
                    required
                  />
                </div>
              </div>

              {/* Matrix Categories & Targets */}
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                      Deliverables & Weights
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ensure weights total 100% and targets are balanced.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMgrEditCategories(DEFAULT_KPI_CATEGORIES)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
                    >
                      Reset Template
                    </button>
                    <button
                      type="button"
                      onClick={handleMgrAddEditCategory}
                      disabled={mgrEditTotalWeightage >= 100}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${mgrEditTotalWeightage >= 100
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
                        }`}
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Add Category</span>
                    </button>
                  </div>
                </div>

                {/* Weightage Status Alert */}
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 ${mgrEditTotalWeightage === 100 && areAllMgrEditCategoriesBalanced
                  ? 'bg-teal-50 border border-teal-200 text-teal-900'
                  : 'bg-amber-50 border border-amber-200 text-amber-900'
                  }`}>
                  <div className="flex items-center gap-2">
                    {mgrEditTotalWeightage === 100 && areAllMgrEditCategoriesBalanced ? (
                      <CheckCircleIcon className="w-4 h-4 text-teal-600 shrink-0" />
                    ) : (
                      <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      Total Category Weight: <strong>{mgrEditTotalWeightage}% / 100%</strong>
                      {!areAllMgrEditCategoriesBalanced && ' — Balance deliverable scores.'}
                    </span>
                  </div>
                </div>

                {/* Categories & KPIs List */}
                <div className="space-y-4">
                  {mgrEditCategories.map((cat, catIdx) => {
                    const catSum = cat.kpis.reduce((sum, k) => sum + (Number(k.targetScore) || 0), 0);
                    const isBalanced = Math.abs(catSum - Number(cat.weightage)) <= 0.05;

                    return (
                      <div key={cat.id} className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
                        {/* Category Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {catIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={cat.name}
                              onChange={e => handleMgrUpdateEditCategoryName(cat.id, e.target.value)}
                              placeholder="Category name..."
                              className="font-bold text-xs text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-teal-600 focus:outline-none px-1 py-0.5 w-full max-w-md"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                              <span className="text-[11px] font-bold text-slate-500">Weight:</span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={cat.weightage}
                                onChange={e => handleMgrUpdateEditCategoryWeight(cat.id, Number(e.target.value))}
                                className="w-12 text-xs font-bold text-teal-800 text-center focus:outline-none"
                              />
                              <span className="text-[11px] font-bold text-slate-400">%</span>
                            </div>

                            {!isBalanced && (
                              <button
                                type="button"
                                onClick={() => handleMgrAutoBalanceEditCategory(cat.id)}
                                className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition cursor-pointer"
                              >
                                Auto-Balance
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleMgrDeleteEditCategory(cat.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete category"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Deliverables Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                            <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2 text-left">Deliverable Name</th>
                                <th className="px-3 py-2 w-32 text-center">Target</th>
                                <th className="px-3 py-2 w-24 text-center">Score %</th>
                                <th className="px-3 py-2 w-24 text-center">Unit</th>
                                <th className="px-3 py-2 w-24 text-center">Type</th>
                                <th className="px-2 py-2 w-10 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {cat.kpis.map(kpi => {
                                const isNeg = isNegativeKpi(kpi);
                                return (
                                  <tr key={kpi.id} className={`transition ${isNeg ? 'bg-rose-50/25 hover:bg-rose-50/50' : 'hover:bg-slate-50/50'}`}>
                                    <td className="px-3 py-2 align-middle">
                                      <input
                                        type="text"
                                        value={kpi.name}
                                        onChange={e => handleMgrUpdateEditKPI(cat.id, kpi.id, 'name', e.target.value)}
                                        placeholder="Deliverable description..."
                                        className={`w-full h-8 px-2.5 rounded-lg text-xs font-semibold focus:outline-none transition border ${isNeg
                                          ? 'bg-rose-50/50 text-rose-700 border-rose-200 focus:bg-white focus:border-rose-500'
                                          : 'bg-slate-50/70 text-slate-800 border-slate-200 focus:bg-white focus:border-teal-600'
                                          }`}
                                      />
                                    </td>
                                    <td className="px-3 py-2 align-middle text-center">
                                      <input
                                        type="text"
                                        value={kpi.targetFromManager ?? ''}
                                        onChange={e => handleMgrUpdateEditKPI(cat.id, kpi.id, 'targetFromManager', e.target.value)}
                                        placeholder="e.g. 3, 11, 1950, <2"
                                        className={`w-full h-8 px-2 rounded-lg text-xs font-bold text-center focus:outline-none transition border ${isNeg
                                          ? 'bg-rose-50/50 text-rose-700 border-rose-200 focus:bg-white focus:border-rose-500'
                                          : 'bg-slate-50/70 text-teal-900 border-slate-200 focus:bg-white focus:border-teal-600'
                                          }`}
                                      />
                                    </td>
                                    <td className="px-3 py-2 align-middle text-center">
                                      <div className={`flex items-center justify-center focus-within:bg-white border rounded-lg px-2 h-8 transition ${isNeg ? 'bg-rose-50/40 border-rose-200 focus-within:border-rose-500' : 'bg-slate-50/70 border-slate-200 focus-within:border-teal-600'
                                        }`}>
                                        <input
                                          type="number"
                                          step="any"
                                          value={kpi.targetScore}
                                          onChange={e => handleMgrUpdateEditKPI(cat.id, kpi.id, 'targetScore', Number(e.target.value))}
                                          className={`w-14 text-xs font-bold text-center bg-transparent focus:outline-none p-0 ${isNeg ? 'text-rose-700' : 'text-slate-800'
                                            }`}
                                        />
                                        <span className="text-[11px] text-slate-400 font-bold ml-0.5">%</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 align-middle text-center">
                                      <input
                                        type="text"
                                        value={kpi.unit}
                                        onChange={e => handleMgrUpdateEditKPI(cat.id, kpi.id, 'unit', e.target.value)}
                                        placeholder="units"
                                        className="w-full h-8 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-teal-600 rounded-lg text-xs font-medium text-center text-slate-700 focus:outline-none transition"
                                      />
                                    </td>
                                    <td className="px-3 py-2 align-middle text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleMgrUpdateEditKPI(cat.id, kpi.id, 'scoringDirection', isNeg ? 'higher_is_better' : 'lower_is_better')}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition shadow-2xs cursor-pointer whitespace-nowrap ${isNeg
                                          ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                          }`}
                                        title={isNeg ? 'Negative / Penalty metric (Lower is better). Click to switch to Standard.' : 'Standard metric (Higher is better). Click to switch to Negative.'}
                                      >
                                        {isNeg ? '− Negative' : '+ Standard'}
                                      </button>
                                    </td>
                                    <td className="px-2 py-2 align-middle text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleMgrDeleteEditKPI(cat.id, kpi.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                        title="Delete deliverable"
                                      >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleMgrAddEditKPI(cat.id)}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-teal-700 bg-white hover:bg-teal-50 rounded-xl transition shadow-2xs border border-teal-200/80 cursor-pointer"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Add Row</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMgrEditMatrixModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!isMgrEditWeightageValid || !areAllMgrEditCategoriesBalanced || isSavingMatrixEdit}
                  className={`flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${isMgrEditWeightageValid && areAllMgrEditCategoriesBalanced && !isSavingMatrixEdit
                    ? 'bg-teal-700 hover:bg-teal-800 shadow-teal-900/10'
                    : 'bg-slate-300 cursor-not-allowed opacity-60'
                    }`}
                >
                  <CheckCircleIcon className="w-4 h-4 stroke-[2]" />
                  <span>
                    {isSavingMatrixEdit ? 'Saving...' : 'Save Matrix Changes'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MULTI-TIER EVALUATION CONVERT & ROLLUP MODAL (Option B: Soft Archive) */}
      {/* ========================================================================= */}
      {isConvertModalOpen && (() => {
        const ROLLUP_TIERS: {
          id: RollupTier;
          label: string;
          fromName: string;
          toName: string;
          badgeCount: number;
          formulaLabel: string;
          formulaDesc: string;
          createFreq: 'daily' | 'weekly' | 'monthly' | 'quarterly';
          createLabel: string;
        }[] = [
            {
              id: 'daily_to_weekly',
              label: 'Daily → Weekly',
              fromName: 'Daily',
              toName: 'Weekly',
              badgeCount: allDailyGroupsForManager.reduce((a, b) => a + b.count, 0),
              formulaLabel: 'Daily to Weekly Average (% ÷ Evaluated Days)',
              formulaDesc: 'Weekly Score = Sum of Daily % ÷ Number of Evaluated Days',
              createFreq: 'daily',
              createLabel: '+ Assign Daily Deliverables Matrix'
            },
            {
              id: 'weekly_to_monthly',
              label: 'Weekly → Monthly',
              fromName: 'Weekly',
              toName: 'Monthly',
              badgeCount: allWeeklyGroupsForManager.reduce((a, b) => a + b.count, 0),
              formulaLabel: 'Weekly to Monthly Average (% ÷ Active Weeks)',
              formulaDesc: 'Monthly Score = Sum of Weekly % ÷ Number of Active Weeks',
              createFreq: 'weekly',
              createLabel: '+ Assign Weekly Deliverables Matrix'
            },
            {
              id: 'monthly_to_quarterly',
              label: 'Monthly → Quarterly',
              fromName: 'Monthly',
              toName: 'Quarterly',
              badgeCount: allMonthlyGroupsForManager.reduce((a, b) => a + b.count, 0),
              formulaLabel: 'Monthly to Quarterly Average (% ÷ Months in Quarter)',
              formulaDesc: 'Quarterly Score = Sum of Monthly % ÷ Number of Months',
              createFreq: 'monthly',
              createLabel: '+ Assign Monthly Deliverables Matrix'
            },
            {
              id: 'quarterly_to_yearly',
              label: 'Quarterly → Yearly',
              fromName: 'Quarterly',
              toName: 'Yearly (Annual)',
              badgeCount: allQuarterlyGroupsForManager.reduce((a, b) => a + b.count, 0),
              formulaLabel: 'Quarterly to Annual Average (% ÷ Quarters in Year)',
              formulaDesc: 'Yearly Score = Sum of Quarterly % ÷ Number of Quarters',
              createFreq: 'quarterly',
              createLabel: '+ Assign Quarterly Deliverables Matrix'
            }
          ];

        const currentTierConfig = ROLLUP_TIERS.find(t => t.id === activeRollupTier) || ROLLUP_TIERS[0];
        const currentTierGroups = activeRollupTier === 'daily_to_weekly' ? allDailyGroupsForManager :
          activeRollupTier === 'weekly_to_monthly' ? allWeeklyGroupsForManager :
            activeRollupTier === 'monthly_to_quarterly' ? allMonthlyGroupsForManager : allQuarterlyGroupsForManager;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-teal-50/70 via-white to-amber-50/40 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ArrowPathIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                      Rollup & Convert Evaluations
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Consolidate evaluation cycles into higher-frequency summary records
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Conversion Tier Tabs */}
              <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-200/80 overflow-x-auto shrink-0">
                <div className="flex items-center gap-2 min-w-max">
                  {ROLLUP_TIERS.map(tier => {
                    const isActive = activeRollupTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          setActiveRollupTier(tier.id);
                          const groups = tier.id === 'daily_to_weekly' ? allDailyGroupsForManager :
                            tier.id === 'weekly_to_monthly' ? allWeeklyGroupsForManager :
                              tier.id === 'monthly_to_quarterly' ? allMonthlyGroupsForManager : allQuarterlyGroupsForManager;
                          setConvertingTarget(groups[0] || null);
                        }}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${isActive
                          ? 'bg-teal-700 text-white shadow-xs font-bold'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                          }`}
                      >
                        <span>{tier.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${isActive
                          ? 'bg-white/20 text-white'
                          : tier.badgeCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-400'
                          }`}>
                          {tier.badgeCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {convertingTarget ? (
                  <>
                    {/* Multiple Employees Selector if applicable */}
                    {currentTierGroups.length > 1 && (
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Select Team Member ({currentTierConfig.label})
                        </label>
                        <select
                          value={convertingTarget.employeeId + (convertingTarget.weekStart || '')}
                          onChange={e => {
                            const found = currentTierGroups.find(g => (g.employeeId + (g.weekStart || '')) === e.target.value);
                            if (found) setConvertingTarget(found);
                          }}
                          className="w-full h-9 px-3 bg-slate-50/70 hover:bg-white border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer shadow-2xs transition"
                        >
                          {currentTierGroups.map((g, idx) => (
                            <option key={g.employeeId + (g.weekStart || '') + idx} value={g.employeeId + (g.weekStart || '')}>
                              {g.employeeName} (#{g.employeeCode}){g.weekLabel ? ` [${g.weekLabel}]` : ''} — {g.count} {currentTierConfig.fromName.toLowerCase()} records ({g.avgScore}% avg)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 3-Column Summary Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Card 1: Target Member */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Target Member
                        </span>
                        <div className="mt-1">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {convertingTarget.employeeName}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            #{convertingTarget.employeeCode} • {convertingTarget.teamName}
                          </p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Target Record:</span>
                          <span className="font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/70">
                            {currentTierConfig.toName}
                          </span>
                        </div>
                      </div>

                      {/* Card 2: Source Aggregation Stats */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Cycle Summary
                        </span>
                        <div className="mt-1">
                          <div className="text-xs font-bold text-slate-800">
                            {convertingTarget.count} {currentTierConfig.fromName} {convertingTarget.count === 1 ? 'Evaluation' : 'Evaluations'}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Combined Total: <strong className="font-mono text-slate-800">{convertingTarget.records.reduce((acc, r) => acc + Number(r.employeeOverallScore || 0), 0).toFixed(1)}%</strong>
                          </p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 font-mono">
                          Average: {convertingTarget.records.reduce((acc, r) => acc + Number(r.employeeOverallScore || 0), 0).toFixed(1)}% ÷ {convertingTarget.count}
                        </div>
                      </div>

                      {/* Card 3: Rolled-Up Score */}
                      <div className="p-3.5 bg-gradient-to-br from-teal-50/70 to-emerald-50/70 rounded-2xl border border-teal-200/90 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider">
                            Rolled-Up Score
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-teal-800 border border-teal-200 shadow-2xs">
                            {getRatingForScore(convertingTarget.avgScore).name}
                          </span>
                        </div>
                        <div className="my-1">
                          <span className="text-2xl font-black text-teal-900 font-mono tracking-tight">
                            {convertingTarget.avgScore.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-[10px] text-teal-700 font-medium">
                          Calculated for {currentTierConfig.toName}
                        </div>
                      </div>
                    </div>

                    {/* Consolidated Records Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Consolidating {convertingTarget.count} {currentTierConfig.fromName} {convertingTarget.count === 1 ? 'Record' : 'Records'}
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2.5">Evaluation Period / Description</th>
                              <th className="px-4 py-2.5 text-center w-28">Self Score</th>
                              <th className="px-4 py-2.5 text-center w-32">Manager Score</th>
                              <th className="px-4 py-2.5 w-40">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {convertingTarget.records.map((r, idx) => (
                              <tr key={r.id || idx} className="hover:bg-slate-50/60 transition">
                                <td className="px-4 py-2.5 font-semibold text-slate-800">
                                  {r.periodName || (r as any).form || `${currentTierConfig.fromName} Record ${idx + 1}`}
                                </td>
                                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-700">
                                  {r.employeeOverallScore != null ? `${Number(r.employeeOverallScore).toFixed(1)}%` : '0.0%'}
                                </td>
                                <td className="px-4 py-2.5 text-center font-mono font-bold text-teal-800">
                                  {r.managerScore != null ? `${Number(r.managerScore).toFixed(1)}%` : '—'}
                                </td>
                                <td className="px-4 py-2.5">
                                  {renderStatusBadge(r.status, r)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Minimal Information Banner */}
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2">
                      <InformationCircleIcon className="w-4 h-4 text-amber-700 shrink-0" />
                      <p className="font-medium text-[11px] leading-tight">
                        Converting will create <strong>1 consolidated {currentTierConfig.toName} record</strong> and archive the source {currentTierConfig.fromName.toLowerCase()} entries into audit history.
                      </p>
                    </div>
                  </>
                ) : (
                  /* Empty state */
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
                      <CalendarDaysIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-sm mx-auto">
                      <h4 className="text-sm font-bold text-slate-900">
                        No Active {currentTierConfig.fromName} Records to Convert
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        There are currently no active {currentTierConfig.fromName.toLowerCase()} evaluation records ready for {currentTierConfig.label} rollup.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsConvertModalOpen(false);
                          setMgrPeriodType(currentTierConfig.createFreq);
                          handleOpenMgrCreateModal();
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                      >
                        <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                        <span>{currentTierConfig.createLabel}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  disabled={isConverting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
                {convertingTarget && (
                  <button
                    type="button"
                    onClick={handleConfirmConvert}
                    disabled={isConverting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60"
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${isConverting ? 'animate-spin' : ''}`} />
                    <span>{isConverting ? 'Converting...' : `Confirm & Convert to ${currentTierConfig.toName}`}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Website Confirmation & Alert Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        hideCancel={confirmDialog.hideCancel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel || (() => setConfirmDialog(prev => ({ ...prev, isOpen: false })))}
      />
    </div>
  );
};

export default EvaluationTab;
