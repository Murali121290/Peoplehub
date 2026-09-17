import React, { useState, useEffect, useMemo } from 'react';
import { API_URL } from '../../../config/api';
import {
  EvaluationCycle,
  EvaluationResponse,
  KPIResponseItem,
  KPICategory,
  KPIItem,
  RollupTier
} from '../../../types/evaluation.types';
import {
  evaluationService,
  DEFAULT_KPI_CATEGORIES
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
  ArrowDownTrayIcon,
  FolderIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import * as XLSX from 'xlsx';
import { ConfirmDialog } from '../../../components/ui/Modal/ConfirmDialog';

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
  // Role determination
  const normalizedRole = `${user?.access_level || user?.role || ''}`.toLowerCase();
  const isHrOrAdmin = normalizedRole.includes('hr') || normalizedRole.includes('admin') || normalizedRole.includes('super');
  const isManager = normalizedRole.includes('manager') || normalizedRole.includes('lead');
  const isServiceManager = normalizedRole.includes('service_manager') || normalizedRole.includes('service manager');

  const [activeRole, setActiveRole] = useState<'hr' | 'manager' | 'downline_teams' | 'employee'>(
    isHrOrAdmin ? 'hr' : (isManager || isServiceManager) ? 'manager' : 'employee'
  );

  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [dbTeams, setDbTeams] = useState<any[]>([]);
  const [cycles, setCycles] = useState<EvaluationCycle[]>([]);
  const [responses, setResponses] = useState<EvaluationResponse[]>([]);
  const [toastMessage, setToastMessage] = useState<string>('');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  const quarterLabel = currentQuarter === 1 ? 'Jan - Mar' : currentQuarter === 2 ? 'Apr - Jun' : currentQuarter === 3 ? 'Jul - Sep' : 'Oct - Dec';

  // HR Form State
  const [cycleName, setCycleName] = useState(`Q${currentQuarter} Performance Evaluation`);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedSmId, setSelectedSmId] = useState<string>('');
  const [selectedMgrId, setSelectedMgrId] = useState<string>('');
  const [periodName, setPeriodName] = useState(`Q${currentQuarter} ${currentYear} (${quarterLabel})`);
  const [startDate, setStartDate] = useState(`${currentYear}-${String((currentQuarter - 1) * 3 + 1).padStart(2, '0')}-01`);
  const [endDate, setEndDate] = useState(new Date(currentYear, currentQuarter * 3, 0).toISOString().split('T')[0]);
  const [hrCategories, setHrCategories] = useState<KPICategory[]>(DEFAULT_KPI_CATEGORIES);

  // Manager Create & Assign Metrics Modal State
  const [isMgrCreateModalOpen, setIsMgrCreateModalOpen] = useState<boolean>(false);
  const [mgrAssignTeamId, setMgrAssignTeamId] = useState<string>('');
  const [mgrAssignEmpIds, setMgrAssignEmpIds] = useState<string[]>([]);
  const [mgrAssignFormName, setMgrAssignFormName] = useState<string>(`Q${currentQuarter} KPI Assessment - PM Team`);
  const [mgrAssignPeriod, setMgrAssignPeriod] = useState<string>(`Q${currentQuarter} ${currentYear} (${quarterLabel}) - Stage ${currentQuarter}`);
  const [mgrAssignCategories, setMgrAssignCategories] = useState<KPICategory[]>(DEFAULT_KPI_CATEGORIES);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [mgrModalEmpSearch, setMgrModalEmpSearch] = useState<string>('');

  // Dynamic Frequency & Period Configuration State
  const [mgrPeriodType, setMgrPeriodType] = useState<'quarterly' | 'monthly' | 'weekly' | 'daily'>('quarterly');
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
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const QUARTERS_INFO = [
    { q: 1, stage: 1, label: 'Jan - Mar', name: 'Stage 1 (Q1: Jan - Mar)' },
    { q: 2, stage: 2, label: 'Apr - Jun', name: 'Stage 2 (Q2: Apr - Jun)' },
    { q: 3, stage: 3, label: 'Jul - Sep', name: 'Stage 3 (Q3: Jul - Sep)' },
    { q: 4, stage: 4, label: 'Oct - Dec', name: 'Stage 4 (Q4: Oct - Dec)' }
  ];

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const dt = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const yyyy = dt.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return dateStr;
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
    pTeamId = mgrAssignTeamId
  ) => {
    const managerDisplayName = user?.full_name || `${userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim() || 'Manager';
    const formTeamLabel = pTeamId === 'all_teams' ? `${managerDisplayName}'s Team` : (pTeamId || 'Team');

    let periodStr = '';
    let formTitle = '';

    if (pType === 'quarterly') {
      const qInfo = QUARTERS_INFO.find(q => q.q === pQuarter) || QUARTERS_INFO[2];
      periodStr = `Q${pQuarter} ${pYear} (${qInfo.label}) - Stage ${pQuarter}`;
      formTitle = `Q${pQuarter} Performance Metrics - ${formTeamLabel}`;
    } else if (pType === 'monthly') {
      const mName = MONTH_NAMES[pMonth - 1] || 'September';
      periodStr = `${mName} ${pYear}`;
      formTitle = `${mName} ${pYear} Performance Metrics - ${formTeamLabel}`;
    } else if (pType === 'weekly') {
      const fromFmt = formatDisplayDate(pFrom);
      const toFmt = formatDisplayDate(pTo);
      periodStr = `Weekly (${fromFmt} - ${toFmt})`;
      formTitle = `Weekly Performance Metrics (${fromFmt} - ${toFmt}) - ${formTeamLabel}`;
    } else if (pType === 'daily') {
      const dueFmt = formatDisplayDate(pDue);
      periodStr = `Daily (${dueFmt})`;
      formTitle = `Daily Deliverables (${dueFmt}) - ${formTeamLabel}`;
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
  const [kpiInputs, setKpiInputs] = useState<Record<string, KPIResponseItem>>({});
  const [empRemarks, setEmpRemarks] = useState('');
  const [employeeSubTab, setEmployeeSubTab] = useState<'worksheet' | 'reports'>('worksheet');
  const [isSubmittingEmp, setIsSubmittingEmp] = useState<boolean>(false);
  const [empSearchQuery, setEmpSearchQuery] = useState<string>('');
  const [empFilterTab, setEmpFilterTab] = useState<'all' | 'adjusted' | 'pending'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedAuditCategories, setExpandedAuditCategories] = useState<Record<string, boolean>>({});
  const [expandedPeriodBreakdowns, setExpandedPeriodBreakdowns] = useState<Record<string, boolean>>({});

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
  const [reportViewTab, setReportViewTab] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'top_weekly' | 'top_monthly' | 'top_quarterly' | 'top_annual'>('all');
  const [reportDateInPeriod, setReportDateInPeriod] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [reportFilterDept, setReportFilterDept] = useState<string>('all');
  const [reportFilterTeam, setReportFilterTeam] = useState<string>('all');
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
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `${d.getFullYear()}-Q${q}`;
  });

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
  const rawUserId = String(user?.id || userAny?.employee_id || '').trim();
  const rawUserCode = String(userAny?.employee_id || user?.id || '').trim();

  // Match the user in dbEmployees with strict priority to avoid ID collision
  const currentDbUser = dbEmployees.find(e => {
    if (userEmail && e.email && e.email.toLowerCase() === userEmail) return true;
    if (userAny?.employee_id && String(e.employee_id).toLowerCase() === String(userAny.employee_id).toLowerCase()) return true;
    if (user?.id && e.user_id && String(e.user_id) === String(user.id)) return true;
    if (rawUserCode && String(e.employee_id) === rawUserCode) return true;
    return false;
  });

  const myCanonicalCode = String(currentDbUser?.employee_id || userAny?.employee_id || (user?.id && !isNaN(Number(user.id)) && Number(user.id) > 1000 ? user.id : '') || rawUserCode).trim();
  const userId = myCanonicalCode;
  const userCode = myCanonicalCode;
  const userDraftKey = `peoplehub_eval_draft_${myCanonicalCode || userEmail || 'guest'}`;

  const effectiveTeamName = (currentDbUser?.team || currentDbUser?.department || userAny?.team || userAny?.department || '').trim();
  const effectiveTeamId = String(currentDbUser?.team_id || userAny?.team_id || '');

  // Team Lead restriction: Team Leads can review direct reports, but cannot Create & Assign Metrics
  const userDesignation = `${userAny?.designation || currentDbUser?.designation || userAny?.job_title || currentDbUser?.job_title || ''}`.toLowerCase();
  const userAccessRole = `${user?.access_level || user?.role || currentDbUser?.role || ''}`.toLowerCase();

  const isTeamLead = (
    userAccessRole.includes('team_lead') ||
    userAccessRole.includes('team lead') ||
    userAccessRole === 'lead' ||
    userDesignation.includes('team lead') ||
    userDesignation.includes('team_lead') ||
    (userDesignation.includes('lead') && !userDesignation.includes('manager'))
  ) && !isHrOrAdmin && !userAccessRole.includes('manager') && !isServiceManager;

  const canCreateMetrics = (isHrOrAdmin || isManager || isServiceManager) && !isTeamLead;

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
      const [remoteData, emps, tms] = await Promise.all([
        evaluationService.fetchRemoteEvaluationData(),
        evaluationService.fetchDBEmployees(),
        evaluationService.fetchDBTeams()
      ]);

      setDbEmployees(emps);
      setDbTeams(tms);

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

  const resolveManagersForTeam = (teamId: string, teamsList: any[], empsList: any[]) => {
    const team = teamsList.find(t => t.id === teamId || t.name === teamId) || teamsList[0];
    const teamName = (team?.name || '').toLowerCase();

    // 1. Resolve Service Manager strictly by DB access level
    let sm = empsList.find(e => {
      const access = String(e.access_level || e.role || '').toLowerCase();
      return access.includes('service_manager') || access.includes('service manager');
    });

    // 2. Resolve Team Manager strictly by access_level and team from DB
    const teamEmps = empsList.filter(e => {
      const tName = team?.name || '';
      return (e.team || e.department || '').toLowerCase() === tName.toLowerCase() || (team?.id && e.team_id === team.id);
    });

    const mgr = teamEmps.find(e => {
      const access = String(e.access_level || e.role || '').toLowerCase();
      return access.includes('manager') || access.includes('lead') || access.includes('admin') || access.includes('service_manager') || access.includes('service manager');
    }) || empsList.find(e => {
      const access = String(e.access_level || e.role || '').toLowerCase();
      return access.includes('manager') || access.includes('lead') || access.includes('admin');
    }) || teamEmps[0] || empsList[0];

    if (sm) {
      setSelectedSmId(String(sm.id || sm.employee_id));
    } else if (mgr) {
      setSelectedSmId(String(mgr.id || mgr.employee_id));
    }

    if (mgr) {
      setSelectedMgrId(String(mgr.id || mgr.employee_id));
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

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    resolveManagersForTeam(teamId, dbTeams, dbEmployees);

    // If an existing cycle exists for this selected team, load its deliverables matrix
    const teamObj = dbTeams.find(t => t.id === teamId || t.name === teamId);
    const existingTeamCycle = cycles.find(c =>
      String(c.teamId) === String(teamId) ||
      (teamObj && (c.teamName || '').toLowerCase() === (teamObj.name || '').toLowerCase())
    );

    if (existingTeamCycle && existingTeamCycle.categories && existingTeamCycle.categories.length > 0) {
      setHrCategories(existingTeamCycle.categories);
      setCycleName(existingTeamCycle.name || `Q${currentQuarter} Performance Evaluation`);
      setPeriodName(existingTeamCycle.periodName || `Q${currentQuarter} ${currentYear} (${quarterLabel})`);
    } else {
      setHrCategories(DEFAULT_KPI_CATEGORIES);
    }
  };

  // Determine active team details for HR creation
  const selectedTeam = dbTeams.find(t => t.id === selectedTeamId || t.name === selectedTeamId) || dbTeams[0];
  const teamEmployees = dbEmployees.filter(e => {
    if (!isEmployeeActive(e)) return false;
    const teamName = selectedTeam?.name || '';
    return (e.team || e.department || '').toLowerCase() === teamName.toLowerCase() || (selectedTeam?.id && e.team_id === selectedTeam.id);
  });

  // Filter team managers strictly by access_level (Manager, Team Lead, Service Manager, Admin)
  const isManagerAccessLevel = (emp: any) => {
    const access = String(emp.access_level || emp.role || '').toLowerCase();
    return access.includes('manager') || access.includes('lead') || access.includes('admin') || access.includes('service_manager') || access.includes('service manager');
  };

  const teamManagers = teamEmployees.filter(isManagerAccessLevel);

  const resolvedServiceManager = dbEmployees.find(e => String(e.id) === selectedSmId || String(e.employee_id) === selectedSmId)
    || dbEmployees.find(e => {
      const access = String(e.access_level || e.role || '').toLowerCase();
      return access.includes('service_manager') || access.includes('service manager');
    })
    || dbEmployees[0];

  const resolvedManager = dbEmployees.find(e => String(e.id) === selectedMgrId || String(e.employee_id) === selectedMgrId)
    || teamManagers[0]
    || teamEmployees[0]
    || dbEmployees[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

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

  const handleUpdateCategoryName = (catId: string, name: string) => {
    setHrCategories(prev => prev.map(c => c.id === catId ? { ...c, name } : c));
  };

  const handleUpdateCategoryWeight = (catId: string, weight: number) => {
    const newWeight = Math.max(0, Math.min(100, Number(weight) || 0));
    setHrCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const oldWeight = Number(c.weightage) || 1;
      const count = c.kpis.length;
      if (count === 0) return { ...c, weightage: newWeight };

      // Scale KPI target scores proportionally to match new category weight
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

      return { ...c, weightage: newWeight, kpis: updatedKpis };
    }));
  };

  const handleAutoBalanceCategory = (catId: string) => {
    setHrCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const count = c.kpis.length;
      if (count === 0) return c;
      const weight = Number(c.weightage) || 0;
      const baseScore = Math.floor((weight / count) * 100) / 100;
      const remainder = Number((weight - (baseScore * (count - 1))).toFixed(2));

      return {
        ...c,
        kpis: c.kpis.map((k, i) => ({
          ...k,
          targetScore: i === count - 1 ? remainder : baseScore,
          weightage: i === count - 1 ? remainder : baseScore
        }))
      };
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
      name: 'New Performance Category',
      description: 'Custom evaluation criteria',
      weightage: remaining > 0 ? remaining : 10,
      kpis: [
        {
          id: `kpi_${Date.now()}_1`,
          name: 'New Deliverable / Metric',
          description: 'Standard deliverable description',
          targetScore: remaining > 0 ? remaining : 10,
          weightage: remaining > 0 ? remaining : 10,
          targetFromManager: '1',
          targetValue: 1,
          unit: 'units',
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
    setHrCategories(prev => prev.filter(c => c.id !== catId));
  };

  const handleAddKPI = (catId: string) => {
    setHrCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const currentSum = c.kpis.reduce((s, k) => s + (Number(k.targetScore) || 0), 0);
      const remaining = Math.max(0, Number((c.weightage - currentSum).toFixed(2)));
      const newScore = remaining > 0 ? remaining : 5;

      const newKPI: KPIItem = {
        id: `kpi_${Date.now()}_${c.kpis.length + 1}`,
        name: 'New Deliverable Description',
        description: 'Deliverable specification',
        targetScore: newScore,
        weightage: newScore,
        targetFromManager: '1',
        targetValue: 1,
        unit: 'projects',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      };
      return { ...c, kpis: [...c.kpis, newKPI] };
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
      return {
        ...c,
        kpis: c.kpis.filter(k => k.id !== kpiId)
      };
    }));
  };

  // 1. HR Submit Cycle Handler
  const handleHRCycleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) {
      showAlert('Please select a team', 'Selection Required');
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
      ? teamEmployees.map(e => String(e.id || e.employee_id))
      : dbEmployees.map(e => String(e.id || e.employee_id));

    const allManagerNames = teamManagers.length > 0
      ? teamManagers.map(m => `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.name || '').filter(Boolean).join(', ')
      : (resolvedManager ? `${resolvedManager.first_name || ''} ${resolvedManager.last_name || ''}`.trim() || resolvedManager.name || '' : '');

    const allManagerIds = teamManagers.length > 0
      ? teamManagers.map(m => String(m.id || m.employee_id)).filter(Boolean).join(',')
      : String(resolvedManager?.id || resolvedManager?.employee_id || '');

    const smName = resolvedServiceManager
      ? `${resolvedServiceManager.first_name || ''} ${resolvedServiceManager.last_name || ''}`.trim() || resolvedServiceManager.name || ''
      : '';
    const smId = resolvedServiceManager ? String(resolvedServiceManager.id || resolvedServiceManager.employee_id || '') : '';

    const newCycle = await evaluationService.createCycleFromHR({
      name: cycleName,
      teamId: selectedTeam?.id || selectedTeam?.name || '',
      teamName: selectedTeam?.name || '',
      managerId: allManagerIds,
      managerName: allManagerNames,
      serviceManagerId: smId,
      serviceManagerName: smName,
      employeeIds,
      startDate,
      endDate,
      periodName,
      categories: hrCategories
    });

    await loadAllData();
    showToast(`Evaluation cycle "${newCycle.name}" submitted! Performance deliverables matrix and 100% weightage allocated strictly for ${selectedTeam.name}.`);
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
    const myCode = clean(myCanonicalCode || currentDbUser?.employee_id || userAny?.employee_id || userId || userCode || '');
    const empCode = clean(emp.employee_id || emp.id || '');
    if (myCode && empCode && myCode === empCode) return false;
    const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim().toLowerCase();
    const myName = (user?.full_name || `${currentDbUser?.first_name || ''} ${currentDbUser?.last_name || ''}` || '').trim().toLowerCase();
    if (empName && myName && empName === myName) return false;

    // Collect all valid IDs for the logged-in manager / team lead from DB / session
    const mgrIds = [
      String(userId || ''),
      String(userCode || ''),
      String(currentDbUser?.id || ''),
      String(currentDbUser?.employee_id || ''),
      String(userAny?.id || ''),
      String(userAny?.employee_id || '')
    ].filter(Boolean);

    // 1. Check direct reporting manager ID or team lead ID in DB
    const empReportingMgrId = String(emp.reporting_manager_id || emp.manager_id || emp.team_lead_id || emp.lead_id || '').trim();
    if (empReportingMgrId && mgrIds.includes(empReportingMgrId)) {
      return true;
    }

    // 2. Check direct reporting manager or team lead exact name in DB
    const empReportingMgrName = (emp.reporting_manager || emp.team_lead || emp.lead || '').trim().toLowerCase();
    if (empReportingMgrName) {
      const mgrFullNames = [
        user?.full_name,
        userAny?.name,
        `${currentDbUser?.first_name || ''} ${currentDbUser?.last_name || ''}`.trim(),
        `${userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim(),
        userAny?.username
      ].filter(Boolean).map(n => String(n).toLowerCase().trim());

      const nameMatched = mgrFullNames.some(name => {
        if (!name) return false;
        if (empReportingMgrName === name) return true;
        const cleanEmpMgr = empReportingMgrName.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim();
        const cleanMgr = name.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim();
        return cleanEmpMgr === cleanMgr;
      });
      if (nameMatched) return true;
    }

    // 3. For Team Leaders leading a specific department/squad: Match members of the squad
    if (isTeamLead) {
      const empDept = String(emp.department || emp.team || '').trim().toLowerCase();
      const myDept = String(effectiveTeamName || '').trim().toLowerCase();
      const empCode = String(emp.employee_id || emp.id || '').trim().toLowerCase();
      const myCode = String(userId || userCode || '').trim().toLowerCase();

      if (myDept && empDept && (empDept === myDept || empDept.includes(myDept) || myDept.includes(empDept)) && empCode !== myCode) {
        // Exclude other managers
        const empDesig = String(emp.designation || '').toLowerCase();
        const empRole = String(emp.role || '').toLowerCase();
        if (!empDesig.includes('manager') && !empRole.includes('manager') && !empDesig.includes('lead') && !empRole.includes('lead')) {
          return true;
        }
      }
    }

    return false;
  };

  // Helper to check if an employee in DB is specifically a Team Lead (not a full manager or service manager)
  const isTeamLeadEmp = (emp: any): boolean => {
    if (!emp) return false;
    const desig = String(emp.designation || '').toLowerCase();
    const role = String(emp.role || emp.access_level || '').toLowerCase();
    const isLeadText = desig.includes('team lead') || desig.includes('team leader') || desig.includes('lead') || role.includes('team_lead') || role.includes('lead');
    const isMgrText = (desig.includes('manager') && !desig.includes('team leader')) || (role.includes('manager') && !role.includes('team_lead')) || role.includes('admin') || role.includes('service_manager') || role.includes('service manager');
    return isLeadText && !isMgrText;
  };

  // Helper to check if an employee is a full Manager
  const isManagerEmp = (emp: any): boolean => {
    if (!emp) return false;
    const desig = String(emp.designation || '').toLowerCase();
    const role = String(emp.role || emp.access_level || '').toLowerCase();
    return (desig.includes('manager') && !desig.includes('team leader')) ||
      (role.includes('manager') && !role.includes('team_lead')) ||
      role.includes('admin') || role.includes('service_manager');
  };

  const isDownlineReport = (emp: any): boolean => {
    if (!emp) return false;

    // A user is NEVER their own subordinate downline report
    const clean = (v: any) => String(v || '').trim().toLowerCase().replace(/^emp-?/i, '');
    const myCode = clean(myCanonicalCode || currentDbUser?.employee_id || userAny?.employee_id || userId || userCode || '');
    const empCode = clean(emp.employee_id || emp.id || '');
    if (myCode && empCode && myCode === empCode) return false;
    const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim().toLowerCase();
    const myName = (user?.full_name || `${currentDbUser?.first_name || ''} ${currentDbUser?.last_name || ''}` || '').trim().toLowerCase();
    if (empName && myName && empName === myName) return false;

    if (isDirectReport(emp)) return true;
    if (isTeamLead) return false; // Team Leaders only have direct squad members
    if (isHrOrAdmin) return true;

    // Collect manager/lead references to trace up the hierarchy
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
          if (currentMgrId && (String(e.id) === currentMgrId || String(e.employee_id) === currentMgrId)) return true;
          if (currentMgrRef) {
            const eFullName = `${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase();
            const cleanE = eFullName.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim();
            const cleanMgr = currentMgrRef.replace(/\s*\(\w+\)\s*$/, '').replace(/\./g, '').trim();
            return cleanE === cleanMgr || (e.username && e.username.toLowerCase() === currentMgrRef);
          }
          return false;
        });

        if (!intermediateMgr) break;

        if (isDirectReport(intermediateMgr)) {
          return true;
        }

        currentMgrRef = (intermediateMgr.reporting_manager || intermediateMgr.team_lead || intermediateMgr.lead || '').trim().toLowerCase();
        currentMgrId = String(intermediateMgr.reporting_manager_id || intermediateMgr.manager_id || intermediateMgr.team_lead_id || intermediateMgr.lead_id || '').trim();
      }
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
          if (currentMgrId && (String(e.id) === currentMgrId || String(e.employee_id) === currentMgrId)) return true;
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
      return activeEmps.filter(e => isDownlineReport(e) && !isDirectReport(e));
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
      String(userId || ''),
      String(userCode || ''),
      String(currentDbUser?.id || ''),
      String(currentDbUser?.employee_id || ''),
      String(userAny?.id || ''),
      String(userAny?.employee_id || '')
    ].filter(Boolean);

    return activeCandidates.filter(e => {
      const eId = String(e.employee_id || e.id || '');
      if (myIds.includes(eId)) return false;
      return isAssignableSubordinate(e);
    });
  }, [dbEmployees, user, userId, currentDbUser, userAny, isHrOrAdmin, isServiceManager]);

  // Manager's distinct departments strictly from direct and downline reports
  const managerDepartments: string[] = useMemo(() => {
    const depts = new Set<string>();
    const sourceList = activeRole === 'downline_teams'
      ? dbEmployees.filter(e => isEmployeeActive(e) && isDownlineReport(e) && !isDirectReport(e))
      : managerAssignableEmployees;
    sourceList.forEach((e: any) => {
      const d = (e.department || e.team || '').trim();
      if (d) depts.add(d);
    });
    return Array.from(depts).filter(Boolean);
  }, [managerAssignableEmployees, dbEmployees, activeRole]);

  // =========================================================================
  // MANAGER METRICS CREATION & TEAM ASSIGNMENT HANDLERS
  // =========================================================================
  const handleOpenMgrCreateModal = (targetDept?: string) => {
    if (!canCreateMetrics) {
      showAlert('Team Leads do not have permission to create and assign performance metrics. Please contact your Reporting Manager or HR.', 'Permission Denied', 'warning');
      return;
    }
    const defaultTeamVal = targetDept || (managerDepartments.length > 1 ? 'all_teams' : (managerDepartments[0] || 'all_teams'));
    setMgrAssignTeamId(defaultTeamVal);

    // Initial selected employees = only employees NOT already assigned for this stage/period
    setMgrPeriodType('quarterly');
    setMgrPeriodQuarter(currentQuarter);
    setMgrPeriodYear(currentYear);
    syncPeriodAndFormName('quarterly', currentQuarter, currentYear, currentMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, defaultTeamVal);
    setMgrAssignCategories(DEFAULT_KPI_CATEGORIES);

    const baseTeamMembers = (defaultTeamVal === 'all_teams'
      ? managerAssignableEmployees
      : managerAssignableEmployees.filter((e: any) => (e.department || e.team || '').toLowerCase() === defaultTeamVal.toLowerCase())
    ).filter(isEmployeeActive);
    const unassignedMembers = baseTeamMembers.filter((e: any) => {
      const empId = String(e.employee_id || e.id);
      return !isEmpAlreadyAssignedForPeriod(empId, undefined, 'quarterly', currentQuarter, currentYear);
    });
    setMgrAssignEmpIds(unassignedMembers.map((e: any) => String(e.employee_id || e.id)).filter(Boolean));
    setIsMgrCreateModalOpen(true);
  };

  const handleMgrTeamChange = (newTeamId: string) => {
    setMgrAssignTeamId(newTeamId);
    // Only pre-select unassigned team members
    const baseTeamMembers = (newTeamId === 'all_teams'
      ? managerAssignableEmployees
      : managerAssignableEmployees.filter((e: any) => (e.department || e.team || '').toLowerCase() === newTeamId.toLowerCase())
    ).filter(isEmployeeActive);
    const unassignedMembers = baseTeamMembers.filter((e: any) => {
      const empId = String(e.employee_id || e.id);
      return !isEmpAlreadyAssignedForPeriod(empId);
    });
    setMgrAssignEmpIds(unassignedMembers.map((e: any) => String(e.employee_id || e.id)).filter(Boolean));
    syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, newTeamId);
  };

  // Helper to check if an employee is already assigned metrics for a specific evaluation period
  const isEmpAlreadyAssignedForPeriod = (
    empId: string,
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
    const cleanEmpId = String(empId).trim().toLowerCase();

    // Check in cycles
    const hasInCycles = cycles.some(c => {
      const empList = (c.employeeIds || []).map(id => String(id).trim().toLowerCase());
      if (!empList.includes(cleanEmpId)) return false;

      const cType = String((c as any).frequency || '').toLowerCase();
      if (pType && cType && pType !== cType) return false;

      if (pType === 'weekly' && pFrom && pTo) {
        if (c.startDate === pFrom && c.endDate === pTo) return true;
        const fromFmt = formatDisplayDate(pFrom).toLowerCase();
        const toFmt = formatDisplayDate(pTo).toLowerCase();
        const cText = `${c.periodName || ''} ${c.name || ''} ${c.description || ''}`.toLowerCase();
        if (fromFmt && toFmt && cText.includes(fromFmt) && cText.includes(toFmt)) return true;
        return false;
      }
      if (pType === 'daily' && pDue) {
        if (c.startDate === pDue) return true;
        const dueFmt = formatDisplayDate(pDue).toLowerCase();
        const cText = `${c.periodName || ''} ${c.name || ''} ${c.description || ''}`.toLowerCase();
        if (dueFmt && cText.includes(dueFmt)) return true;
        return false;
      }
      if (pType === 'monthly') {
        const mName = (MONTH_NAMES[pMonth - 1] || '').toLowerCase();
        const yStr = `${pYear}`;
        const cText = `${c.periodName || ''} ${c.name || ''} ${c.description || ''}`.toLowerCase();
        if (mName && cText.includes(mName) && cText.includes(yStr)) return true;
        return false;
      }
      if (pType === 'quarterly') {
        const qStr = `q${pQuarter}`;
        const stageStr = `stage ${pQuarter}`;
        const yStr = `${pYear}`;
        const cText = `${c.periodName || ''} ${c.name || ''} ${c.description || ''}`.toLowerCase();
        if ((cText.includes(qStr) || cText.includes(stageStr)) && cText.includes(yStr)) return true;
        return false;
      }
      return false;
    });
    if (hasInCycles) return true;

    // Check in responses
    const hasInResponses = responses.some(r => {
      const cleanEmpCode = String(r.employeeCode || r.employeeId || '').trim().toLowerCase();
      if (cleanEmpCode !== cleanEmpId) return false;

      const rType = String(r.frequency || (r as any).periodType || '').toLowerCase();
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
      return false;
    });

    return hasInResponses;
  };

  // Auto-deselect any employee that is already assigned whenever period or modal opens
  useEffect(() => {
    if (isMgrCreateModalOpen) {
      setMgrAssignEmpIds(prev => prev.filter(id => !isEmpAlreadyAssignedForPeriod(id)));
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
    if (isEmpAlreadyAssignedForPeriod(empId)) {
      showToast('This team member is already assigned for this evaluation period and cannot be booked again.');
      return;
    }
    setMgrAssignEmpIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleMgrToggleSelectAll = (teamEmps: any[]) => {
    const activeEmps = (teamEmps || []).filter(isEmployeeActive);
    const assignableEmps = activeEmps.filter(e => !isEmpAlreadyAssignedForPeriod(String(e.employee_id || e.id)));
    const assignableIds = assignableEmps.map(e => String(e.employee_id || e.id)).filter(Boolean);

    if (assignableIds.length === 0) {
      showToast('All team members under this selection are already assigned for this evaluation period.');
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
        effectiveStartDate = `${mgrPeriodYear}-${String((mgrPeriodQuarter - 1) * 3 + 1).padStart(2, '0')}-01`;
        effectiveEndDate = new Date(mgrPeriodYear, mgrPeriodQuarter * 3, 0).toISOString().split('T')[0];
      }

      const currentMgrEmpCode = String(myCanonicalCode || currentDbUser?.employee_id || userAny?.employee_id || user?.id || '');
      const smObj = dbEmployees.find(e => String(e.id) === String(selectedSmId) || String(e.employee_id) === String(selectedSmId));
      const resolvedSmCode = smObj?.employee_id || selectedSmId;

      const activeAssignEmpIds = mgrAssignEmpIds.filter(id => {
        const emp = dbEmployees.find(e => String(e.employee_id || e.id) === id);
        return emp ? isEmployeeActive(emp) : true;
      });

      // Filter out any employees already assigned for this period
      const unassignedToBook = activeAssignEmpIds.filter(id => !isEmpAlreadyAssignedForPeriod(id));

      if (unassignedToBook.length === 0) {
        showAlert('All selected team members are already assigned for this evaluation period. No duplicate assignments can be created.', 'Already Assigned');
        setIsAssigning(false);
        return;
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
        frequency: mgrPeriodType
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
      mgrIds.includes(String(currentDbUser.id)) ||
      mgrIds.includes(String(currentDbUser.employee_id)) ||
      empIds.includes(String(currentDbUser.id)) ||
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

  // 2. Team-scoped Manager Responses: Direct reports + Downline reports from DB
  const managerTeamResponses = responses.filter(r => {
    // A user's own evaluation response must NEVER appear in their managerial queues
    if (isResponseForUser(r)) return false;

    if (isHrOrAdmin) return true;

    const mgrIds = [
      String(userId || ''),
      String(userCode || ''),
      String(currentDbUser?.id || ''),
      String(currentDbUser?.employee_id || ''),
      String(userAny?.id || ''),
      String(userAny?.employee_id || '')
    ].filter(Boolean);

    // 1. Direct match by managerId on response (from kpi_evaluations table in DB)
    if (r.managerId && mgrIds.includes(String(r.managerId))) {
      return true;
    }

    // 2. Direct match by cycle manager or service manager
    const respCycle = cycles.find(c => c.id === r.cycleId);
    if (respCycle) {
      const cycleMgrIds = (respCycle.managerId || '').split(',').map(s => s.trim());
      if (mgrIds.some(id => cycleMgrIds.includes(id))) {
        return true;
      }
      if (String(respCycle.serviceManagerId) === userId || String(respCycle.serviceManagerId) === userCode) {
        return true;
      }
    }

    // 3. Look up the actual employee in DB for this response and check hierarchy
    const empInDb = dbEmployees.find((e: any) =>
      String(e.employee_id || '') === String(r.employeeCode || r.employeeId || '') ||
      String(e.id || '') === String(r.employeeId || '') ||
      (e.user_id && String(e.user_id) === String(r.employeeId || '')) ||
      (`${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase() === (r.employeeName || '').trim().toLowerCase())
    );

    if (empInDb) {
      return isDownlineReport(empInDb);
    }

    return false;
  });

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
    activeEmpResponse ||
    responses.some(isResponseForUser) ||
    cycles.some(c => {
      if (!c.employeeIds || c.employeeIds.length === 0) return false;
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

  // Check if current manager is the direct creator / assigned reporting manager of a cycle
  const isDirectManagerOfCycle = (c: EvaluationCycle) => {
    if (isHrOrAdmin) return true;
    const mgrIds = [
      String(userId || ''),
      String(userCode || ''),
      String(currentDbUser?.id || ''),
      String(currentDbUser?.employee_id || ''),
      String(userAny?.id || ''),
      String(userAny?.employee_id || '')
    ].filter(Boolean);

    const cycleMgrIds = (c.managerId || '').split(',').map(s => s.trim());
    if (mgrIds.some(id => cycleMgrIds.includes(id))) {
      return true;
    }

    const currentMgrName = (user?.full_name || `${userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim() || userAny?.name || '').toLowerCase();
    const cycleMgrName = (c.managerName || '').toLowerCase();
    if (currentMgrName && cycleMgrName && (
      currentMgrName === cycleMgrName ||
      currentMgrName.replace(/\s*\(\w+\)\s*$/, '').trim() === cycleMgrName.replace(/\s*\(\w+\)\s*$/, '').trim()
    )) {
      return true;
    }

    return false;
  };

  // Direct cycles created by this manager specifically
  const managerDirectCycles = cycles.filter(isDirectManagerOfCycle);

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
                const e = dbEmployees.find(emp => String(emp.id) === String(empId) || String(emp.employee_id) === String(empId));
                return {
                  id: empId,
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
          const targetEmpIds = cycleToDelete.employeeIds || [];
          const empIdsToDelete = Array.from(new Set([
            ...targetEmpIds,
            ...responses
              .filter(r =>
                (targetCycleId && r.cycleId === targetCycleId) ||
                (targetTeamId && r.teamId === targetTeamId) ||
                (targetTeamName && (r.department || '').toLowerCase() === targetTeamName.toLowerCase())
              )
              .map(r => String(r.employeeCode || r.employeeId || ''))
          ])).filter(Boolean);

          const updatedCycles = cycles.filter(c => c.id !== targetCycleId);
          const updatedResponses = responses.filter(r =>
            r.cycleId !== targetCycleId &&
            !(targetTeamName && (r.department || '').toLowerCase() === targetTeamName.toLowerCase() && ((r.status as string) === 'draft' || (r.status as string) === 'self_eval' || !r.employeeSubmittedAt))
          );

          setCycles(updatedCycles);
          setResponses(updatedResponses);

          await evaluationService.saveCycles(updatedCycles);
          await evaluationService.saveResponses(updatedResponses);

          // Call backend delete endpoint with full context
          try {
            const token = localStorage.getItem('token') || '';
            await fetch(`${API_URL}/api/performance/evaluation/cycles/${encodeURIComponent(targetCycleId)}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({
                employeeIds: empIdsToDelete,
                teamId: targetTeamId,
                teamName: cycleToDelete.teamName,
                form: cycleToDelete.name,
                managerId: cycleToDelete.managerId || userId
              })
            });
          } catch (delErr) {
            console.warn('Sync delete to backend:', delErr);
          }

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

          // 1. Call backend delete with specific response ID
          try {
            const token = localStorage.getItem('token') || '';
            const deleteUrl = `${API_URL}/api/performance/evaluation/responses/${encodeURIComponent(respId)}`;
            await fetch(deleteUrl, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({
                respId,
                cycleId: resp.cycleId
              })
            });
          } catch (delErr) {
            console.warn('Backend delete error:', delErr);
          }

          // 2. Remove ONLY this single response by ID from local state & cache
          const updatedResponses = responses.filter(r => r.id !== respId);
          setResponses(updatedResponses);
          evaluationService.saveResponsesLocal(updatedResponses);

          await loadAllData();
          showToast(`Evaluation record deleted successfully.`);
        } catch (err: any) {
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

    // 2. Check activeEmpResponse with non-empty values
    if (activeEmpResponse?.kpiResponses && hasValue(activeEmpResponse.kpiResponses[kpi.id])) return activeEmpResponse.kpiResponses[kpi.id];
    if (activeEmpResponse?.kpiResponses && kpi.name && hasValue(activeEmpResponse.kpiResponses[kpi.name])) return activeEmpResponse.kpiResponses[kpi.name];

    // 3. Name-based search across sources with non-empty values
    const cleanName = (kpi.name || '').trim().toLowerCase();
    const sources = isEmpSubmitted
      ? [activeEmpResponse?.kpiResponses, kpiInputs]
      : [kpiInputs, activeEmpResponse?.kpiResponses];

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

    // 4. In-memory KPI object fallback (if values are on kpi directly)
    if (kpi.actualValue !== undefined || kpi.actual_value !== undefined || kpi.earnedScore !== undefined || kpi.earned_score !== undefined) {
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
          managerActualValue: kpi.managerActualValue ?? kpi.manager_actual_pm,
          managerScore: kpi.managerScore ?? kpi.manager_score,
          managerRemarks: kpi.managerRemarks ?? kpi.manager_remark
        };
      }
    }

    // 5. Local draft storage fallback
    try {
      const draft = localStorage.getItem(userDraftKey);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (hasValue(parsed?.kpiInputs?.[kpi.id])) return parsed.kpiInputs[kpi.id];
        if (cleanName && parsed?.kpiInputs) {
          for (const [k, v] of Object.entries(parsed.kpiInputs as Record<string, any>)) {
            if ((k.toLowerCase().trim() === cleanName || v?.name?.toLowerCase().trim() === cleanName) && hasValue(v)) {
              return v;
            }
          }
        }
      }
    } catch (e) { }

    // 6. Return existing item from kpiInputs or activeEmpResponse even if empty
    if (kpiInputs && kpiInputs[kpi.id]) return kpiInputs[kpi.id];
    if (kpiInputs && kpi.name && kpiInputs[kpi.name]) return kpiInputs[kpi.name];
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

      if (isDifferentResp || isEmpSubmitted) {
        setKpiInputs(activeEmpResponse.kpiResponses || {});
        setEmpRemarks(activeEmpResponse.employeeRemarks || '');
      } else if (activeEmpResponse.kpiResponses && Object.keys(activeEmpResponse.kpiResponses).length > 0) {
        setKpiInputs(prev => {
          const merged = { ...activeEmpResponse.kpiResponses };
          for (const [k, v] of Object.entries(prev)) {
            if (v && (v.actualValue !== '' || v.employeeRemarks !== '')) {
              merged[k] = v;
            }
          }
          return merged;
        });
        if (activeEmpResponse.employeeRemarks) {
          setEmpRemarks(activeEmpResponse.employeeRemarks);
        }
      }
    } else if (!activeEmpResponse) {
      setKpiInputs({});
      setEmpRemarks('');
    }
  }, [activeEmpResponse?.id, activeEmpResponse?.status, activeEmpResponse?.updatedAt, activeEmpResponse?.managerReviewedAt, isEmpSubmitted]);

  // 3. Employee Input Change & Live Recalculation
  const handleKPIChange = (kpi: any, val: string | number) => {
    if (isEmpSubmitted) return;
    let cleanVal: string | number = val;

    if (val !== '' && val !== undefined && val !== null) {
      const num = typeof val === 'string' ? parseFloat(val) : Number(val);
      if (!isNaN(num)) {
        if (num < 0) {
          cleanVal = 0;
        } else {
          // Allow full entered value (even exceeding target) for both positive and negative metrics
          cleanVal = num;
        }
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
        employeeRemarks: prev[kpi.id]?.employeeRemarks || (kpi.name ? prev[kpi.name]?.employeeRemarks : '') || ''
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

  // Selected SM review response object & cycle
  const selectedSmResponse = responses.find(r => r.id === selectedSmResponseId);
  const selectedSmCycle = selectedSmResponse ? cycles.find(c => c.id === selectedSmResponse.cycleId) : undefined;
  const selectedSmCategories = selectedSmCycle?.categories || activeCategories;

  // Helper to resolve canonical display info for any evaluation response
  const getEmployeeDisplayInfo = (r: EvaluationResponse) => {
    const cleanId = (v: any) => String(v || '').trim().toLowerCase().replace(/^emp-?/i, '');
    const rId = cleanId(r.employeeId);
    const rCode = cleanId(r.employeeCode);
    const rName = (r.employeeName || '').trim().toLowerCase();

    const empInDb = dbEmployees.find((e: any) => {
      const eId = cleanId(e.id);
      const eCode = cleanId(e.employee_id);
      const eUserId = cleanId(e.user_id);

      if (eCode && (eCode === rCode || eCode === rId)) return true;
      if (eId && (eId === rId || eId === rCode)) return true;
      if (eUserId && (eUserId === rId || eUserId === rCode)) return true;

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

    return { employeeCode, employeeName, teamName, departmentName, empInDb };
  };

  // Helper to render distinct status badges across all lifecycle stages
  const renderStatusBadge = (status: string) => {
    const s = String(status || '').toLowerCase().replace(/[_\s]+/g, ' ').trim();

    if (s.includes('approved') || s.includes('calibrated') || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Calibrated & Approved</span>
        </span>
      );
    }
    if (s.includes('service') || s.includes('sm') || s === 'sm final approval') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          <span>SM Approved</span>
        </span>
      );
    }
    if (s.includes('manager') || s.includes('submitted') || s.includes('review')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200/80 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 animate-pulse" />
          <span>Submitted to Manager</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
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
    return allDeduplicatedManagerResponses.filter(r => {
      const { empInDb } = getEmployeeDisplayInfo(r);
      return isDirectReport(empInDb);
    }).length;
  }, [allDeduplicatedManagerResponses, dbEmployees, userId, userCode, currentDbUser]);

  const downlineResponsesCount = useMemo(() => {
    return allDeduplicatedManagerResponses.filter(r => {
      const { empInDb } = getEmployeeDisplayInfo(r);
      return !isDirectReport(empInDb);
    }).length;
  }, [allDeduplicatedManagerResponses, dbEmployees, userId, userCode, currentDbUser]);

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
      // Strictly direct reports for Manager Reviews tab (e.g. employees directly reporting to logged in user)
      list = list.filter(r => {
        const { empInDb } = getEmployeeDisplayInfo(r);
        return isDirectReport(empInDb);
      });
    } else if (activeRole === 'downline_teams') {
      // Strictly sub-manager downline team reports (e.g. Murali's team members)
      list = list.filter(r => {
        const { empInDb } = getEmployeeDisplayInfo(r);
        return !isDirectReport(empInDb);
      });
    }

    // Apply Department Filter
    if (managerFilterDept && managerFilterDept !== 'all') {
      const target = managerFilterDept.trim().toLowerCase();
      list = list.filter(r => {
        const { empInDb, teamName } = getEmployeeDisplayInfo(r);
        const empDept = (empInDb?.department || empInDb?.team || teamName || '').trim().toLowerCase();
        return empDept === target;
      });
    }

    return list;
  }, [allDeduplicatedManagerResponses, managerFilterDept, activeRole, dbEmployees]);

  // Scoped responses for team cards according to active tab
  const activeScopedResponsesForCards = useMemo(() => {
    if (activeRole === 'manager') {
      return allDeduplicatedManagerResponses.filter(r => isDirectReport(getEmployeeDisplayInfo(r).empInDb));
    }
    if (activeRole === 'downline_teams') {
      return allDeduplicatedManagerResponses.filter(r => !isDirectReport(getEmployeeDisplayInfo(r).empInDb));
    }
    return allDeduplicatedManagerResponses;
  }, [allDeduplicatedManagerResponses, activeRole, dbEmployees, userId, userCode, currentDbUser]);

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
    return p.includes('quarter') || p.includes('stage') || /q[1-4]/i.test(p);
  };

  const isYearlyResponse = (r: EvaluationResponse) => {
    const respCycle = cycles.find(c => c.id === r.cycleId);
    const f = String(r.frequency || (r as any).periodType || (respCycle as any)?.frequency || '').toLowerCase();
    if (f === 'yearly' || f === 'annual') return true;
    if (f && f !== 'yearly' && f !== 'annual') return false;
    const p = `${r.periodName || ''} ${(r as any).form || ''} ${(r as any).description || ''} ${respCycle?.name || ''} ${respCycle?.periodName || ''}`.toLowerCase();
    return p.includes('annual') || p.includes('yearly') || p.includes('year');
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

    activeScopedResponsesForCards.forEach(r => {
      const isPending = (r.status as string) === 'manager_review' || (r.status as string) === 'Submitted to Manager' || r.managerScore == null;
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
      } else {
        quarterly++;
        if (isPending) quarterlyPending++;
      }
    });

    return {
      all,
      allPending,
      daily,
      dailyPending,
      weekly,
      weeklyPending,
      monthly,
      monthlyPending,
      quarterly,
      quarterlyPending,
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
      { q: 1, label: 'Jan - Mar' },
      { q: 2, label: 'Apr - Jun' },
      { q: 3, label: 'Jul - Sep' },
      { q: 4, label: 'Oct - Dec' }
    ];

    // From active responses
    activeScopedResponsesForCards.forEach(r => {
      const d = getResponseDate(r);
      if (d) {
        const y = d.getFullYear();
        const q = Math.ceil((d.getMonth() + 1) / 3);
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
        const q = Math.ceil((d.getMonth() + 1) / 3);
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
          const rQuarter = Math.ceil((range.startDate.getMonth() + 1) / 3);
          return range.startDate.getFullYear() === qY && rQuarter === qNum;
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
          const rQuarter = Math.ceil((range.startDate.getMonth() + 1) / 3);
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
    reportFilterState,
    reportFilterDate,
    reportDateInPeriod,
    selectedWeekPeriod,
    selectedReportMonthKey,
    selectedReportQuarterKey,
    reportViewTab,
    dbEmployees
  ]);

  // Hierarchical Department -> Team -> Employee grouping strictly from database records
  const groupedReportHierarchy = useMemo(() => {
    const deptMap = new Map<string, Map<string, any[]>>();

    reportFilteredResponses.forEach((r, idx) => {
      const { employeeCode, employeeName, teamName, departmentName, empInDb } = getEmployeeDisplayInfo(r);
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
      const selfScoreNum = r.employeeOverallScore != null
        ? Number(r.employeeOverallScore)
        : ((r as any).earned_score != null && !isNaN(Number((r as any).earned_score)) ? Number((r as any).earned_score) : null);

      const dateScoreDisplay = selfScoreNum != null && selfScoreNum > 0
        ? `${selfScoreNum.toFixed(1)}%`
        : '—';

      // Manager score strictly from DB
      const mgrScoreNum = r.managerScore != null
        ? Number(r.managerScore)
        : ((r as any).manager_score != null && !isNaN(Number((r as any).manager_score)) ? Number((r as any).manager_score) : null);

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
          const qNum = Math.ceil((range.startDate.getMonth() + 1) / 3);
          dateText = `Q${qNum} ${range.startDate.getFullYear()}`;
        }
      } else if (isYearlyResponse(r)) {
        freqLabel = 'Annual';
        freqColor = 'bg-indigo-50 text-indigo-900 border-indigo-300';
        if (range.startDate) {
          dateText = `${range.startDate.getFullYear()}`;
        }
      }

      if (!dateText) {
        dateText = respCycle?.periodName || respCycle?.name || (r as any).periodName || (r as any).form || 'Evaluation Period';
      }

      const memberItem = {
        response: r,
        employeeName,
        employeeCode,
        departmentName,
        teamName,
        initials,
        avatarBg,
        dateScoreDisplay,
        averageScoreDisplay,
        isCalibrated,
        periodInfo: {
          freqLabel,
          freqColor,
          dateText
        },
        designation: r.designation || empInDb?.designation || empInDb?.job_title || 'Team Member',
        rank: reportViewTab.startsWith('top_') ? idx + 1 : undefined
      };

      if (!deptMap.has(departmentName)) {
        deptMap.set(departmentName, new Map<string, any[]>());
      }
      const teamMap = deptMap.get(departmentName)!;
      if (!teamMap.has(teamName)) {
        teamMap.set(teamName, []);
      }
      teamMap.get(teamName)!.push(memberItem);
    });

    const result: Array<{
      departmentName: string;
      totalPeople: number;
      teams: Array<{
        teamName: string;
        members: any[];
      }>;
    }> = [];

    deptMap.forEach((teamMap, deptName) => {
      let deptTotal = 0;
      const teams: Array<{ teamName: string; members: any[] }> = [];

      teamMap.forEach((members, tName) => {
        deptTotal += members.length;
        // Sort: Submitted to Manager / pending review evaluations appear at the top
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
          return 0;
        });
        teams.push({ teamName: tName, members: sortedMembers });
      });

      result.push({
        departmentName: deptName,
        totalPeople: deptTotal,
        teams
      });
    });

    return result;
  }, [reportFilteredResponses, reportViewTab, dbEmployees]);

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
      const activeQuarter = !isNaN(m) ? Math.ceil(m / 3) : Math.ceil((new Date().getMonth() + 1) / 3);
      const activeYear = !isNaN(y) ? y : new Date().getFullYear();
      return `Q${activeQuarter} ${activeYear}`;
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
    const qNum = Math.ceil((activeDate.getMonth() + 1) / 3);
    const qMonthsLabel = qNum === 1 ? 'Jan - Mar' : qNum === 2 ? 'Apr - Jun' : qNum === 3 ? 'Jul - Sep' : 'Oct - Dec';

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
      let qTitle = `Q${qNum} ${activeDate.getFullYear()}`;
      if (selectedReportQuarterKey && selectedReportQuarterKey !== 'all') {
        const found = availableQuarters.find(q => q.key === selectedReportQuarterKey);
        if (found) qTitle = found.label;
      }
      return {
        title: `Top Performers — Quarterly (${qTitle})`,
        badge: 'ranked by score'
      };
    }
    return {
      title: `Top Performers — Annual (${activeDate.getFullYear()})`,
      badge: 'ranked by score'
    };
  }, [reportViewTab, reportDateInPeriod, selectedWeekPeriod, selectedReportMonthKey, selectedReportQuarterKey, availableWeeklyPeriods, availableMonths, availableQuarters, reportFilteredResponses]);

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
      return true;
    });

    if (responsesInTab.length > 0) {
      const sample = responsesInTab[0];
      const range = getEvaluationDateRange(sample);
      if (range.startDate) {
        const pad = (n: number) => String(n).padStart(2, '0');
        const qNum = Math.ceil((range.startDate.getMonth() + 1) / 3);
        setReportDateInPeriod(`${range.startDate.getFullYear()}-${pad(range.startDate.getMonth() + 1)}-${pad(range.startDate.getDate())}`);
        setSelectedReportMonthKey(`${range.startDate.getFullYear()}-${pad(range.startDate.getMonth() + 1)}`);
        setSelectedReportQuarterKey(`${range.startDate.getFullYear()}-Q${qNum}`);
        setReportFilterDate('all');
      }
    }
  };

  // Pastel header colors for Team headers inside Top Performers card (matching reference UI)
  const getTeamHeaderColor = (name: string) => {
    const palettes = [
      { bg: 'bg-[#f3edf5]', text: 'text-[#5e2b6b]', sub: 'text-[#7a3b8c]' },
      { bg: 'bg-[#eef5ee]', text: 'text-[#2c592e]', sub: 'text-[#38733b]' },
      { bg: 'bg-[#edf4fb]', text: 'text-[#245480]', sub: 'text-[#2e689e]' },
      { bg: 'bg-[#fdf0f4]', text: 'text-[#8c2e4f]', sub: 'text-[#ab3b63]' },
      { bg: 'bg-[#fcf7ee]', text: 'text-[#7a5214]', sub: 'text-[#96651d]' },
      { bg: 'bg-[#f0f9f8]', text: 'text-[#165a54]', sub: 'text-[#1d756d]' }
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
    return palettes[Math.abs(hash) % palettes.length];
  };

  // Top Performers Active Year & Quarter Info
  const [topPerfYearStr, topPerfMonthStr] = (selectedReportMonthKey || reportDateInPeriod || '').split('-');
  const topPerformersYear = parseInt(topPerfYearStr, 10) || new Date().getFullYear();
  const topPerformersMonth = parseInt(topPerfMonthStr, 10) ? parseInt(topPerfMonthStr, 10) - 1 : new Date().getMonth();
  const topPerformersQ = Math.floor(topPerformersMonth / 3) + 1;

  const topPerformersQuarterRangeText = useMemo(() => {
    if (topPerformersQ === 1) return `1 Jan - 31 Mar ${topPerformersYear}`;
    if (topPerformersQ === 2) return `1 Apr - 30 Jun ${topPerformersYear}`;
    if (topPerformersQ === 3) return `1 Jul - 30 Sep ${topPerformersYear}`;
    return `1 Oct - 31 Dec ${topPerformersYear}`;
  }, [topPerformersQ, topPerformersYear]);

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
        : (r.employeeOverallScore != null ? Number(r.employeeOverallScore) : null);

      if (scoreVal == null || scoreVal <= 0) return;

      const empKey = `${employeeCode || employeeName}`;
      if (!empMap.has(empKey)) {
        empMap.set(empKey, { employeeName, employeeCode, departmentName, teamName, scores: [] });
      }
      empMap.get(empKey)!.scores.push(scoreVal);
    });

    // Group unique employees by Department and Team with calculated average score
    const teamMap = new Map<string, { departmentName: string; teamName: string; members: Array<{ name: string; code: string; score: number; rank: number }> }>();

    empMap.forEach(emp => {
      const avgScore = emp.scores.reduce((a, b) => a + b, 0) / emp.scores.length;
      const key = `${emp.departmentName}___${emp.teamName}`;
      if (!teamMap.has(key)) {
        teamMap.set(key, { departmentName: emp.departmentName, teamName: emp.teamName, members: [] });
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
        members: sorted
      };
    });
  };

  // Top Performers — Weekly (All weeks of the active month + Month Summary Column)
  const topPerformersWeeklyColumns = useMemo(() => {
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (n: number) => String(n).padStart(2, '0');

    // Filter responses for the active month
    const curMonthResponses = activeScopedResponsesForCards.filter(r => {
      const range = getEvaluationDateRange(r);
      if (!range.startDate) return false;
      return range.startDate.getFullYear() === topPerformersYear && range.startDate.getMonth() === topPerformersMonth;
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

  // Top Performers — Monthly multi-column data (matching Image 1 layout)
  const topPerformersMonthlyColumns = useMemo(() => {
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const qMonthsIndices = [(topPerformersQ - 1) * 3, (topPerformersQ - 1) * 3 + 1, (topPerformersQ - 1) * 3 + 2];
    const yearShort = String(topPerformersYear).slice(-2);

    return qMonthsIndices.map(mIdx => {
      const monthLabel = `${monthNamesShort[mIdx]}'${yearShort}`;

      // Find all responses (weekly / monthly) falling in this month
      const monthResponses = activeScopedResponsesForCards.filter(r => {
        const range = getEvaluationDateRange(r);
        if (!range.startDate) return false;
        return range.startDate.getFullYear() === topPerformersYear && range.startDate.getMonth() === mIdx;
      });

      const groups = computeTopPerformersGroups(monthResponses, reportFilterDept, reportFilterTeam, mgrSearchQuery);

      return {
        key: `month_${mIdx}`,
        label: monthLabel,
        subLabel: undefined as string | undefined,
        isSummaryYear: mIdx === topPerformersMonth,
        totalEvaluations: monthResponses.length,
        groups
      };
    });
  }, [activeScopedResponsesForCards, topPerformersQ, topPerformersMonth, topPerformersYear, reportFilterDept, reportFilterTeam, mgrSearchQuery]);

  // Top Performers — Quarterly (3 Months of the Quarter + Quarter Summary Column, matching reference UI)
  const topPerformersQuarterlyColumns = useMemo(() => {
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const qMonthsIndices = [(topPerformersQ - 1) * 3, (topPerformersQ - 1) * 3 + 1, (topPerformersQ - 1) * 3 + 2];
    const yearShort = String(topPerformersYear).slice(-2);

    // 1. Three monthly columns of this quarter
    const months = qMonthsIndices.map(mIdx => {
      const monthLabel = `${monthNamesShort[mIdx]}'${yearShort}`;

      const monthResponses = activeScopedResponsesForCards.filter(r => {
        const range = getEvaluationDateRange(r);
        if (!range.startDate) return false;
        return range.startDate.getFullYear() === topPerformersYear && range.startDate.getMonth() === mIdx;
      });

      const groups = computeTopPerformersGroups(monthResponses, reportFilterDept, reportFilterTeam, mgrSearchQuery);

      return {
        key: `quarter_month_${mIdx}`,
        label: monthLabel,
        subLabel: undefined as string | undefined,
        isSummaryYear: false,
        totalEvaluations: monthResponses.length,
        groups
      };
    });

    // 2. Fourth column: Quarter Summary Column (e.g. Q3 2026 (quarter))
    const quarterResponses = activeScopedResponsesForCards.filter(r => {
      const range = getEvaluationDateRange(r);
      if (!range.startDate) return false;
      const rQ = Math.ceil((range.startDate.getMonth() + 1) / 3);
      return range.startDate.getFullYear() === topPerformersYear && rQ === topPerformersQ;
    });

    const quarterGroups = computeTopPerformersGroups(quarterResponses, reportFilterDept, reportFilterTeam, mgrSearchQuery);

    const quarterColumn = {
      key: `quarter_summary_Q${topPerformersQ}`,
      label: `Q${topPerformersQ} ${topPerformersYear} (quarter)`,
      subLabel: undefined as string | undefined,
      isSummaryYear: true,
      totalEvaluations: quarterResponses.length,
      groups: quarterGroups
    };

    return [...months, quarterColumn];
  }, [activeScopedResponsesForCards, topPerformersQ, topPerformersYear, reportFilterDept, reportFilterTeam, mgrSearchQuery]);

  // Top Performers — Annual (12 months + Year Summary Column, matching reference screenshot)
  const topPerformersAnnualColumns = useMemo(() => {
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearShort = String(topPerformersYear).slice(-2);

    const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(mIdx => {
      const monthLabel = `${monthNamesShort[mIdx]}'${yearShort}`;

      const monthResponses = activeScopedResponsesForCards.filter(r => {
        const range = getEvaluationDateRange(r);
        if (!range.startDate) return false;
        return range.startDate.getFullYear() === topPerformersYear && range.startDate.getMonth() === mIdx;
      });

      const groups = computeTopPerformersGroups(monthResponses, reportFilterDept, reportFilterTeam, mgrSearchQuery);

      return {
        key: `annual_month_${mIdx}`,
        label: monthLabel,
        subLabel: undefined as string | undefined,
        isSummaryYear: false,
        totalEvaluations: monthResponses.length,
        groups
      };
    });

    // 13th Column: Overall Year Summary (e.g. 2026 (year))
    const yearResponses = activeScopedResponsesForCards.filter(r => {
      const range = getEvaluationDateRange(r);
      if (!range.startDate) return false;
      return range.startDate.getFullYear() === topPerformersYear;
    });

    const yearGroups = computeTopPerformersGroups(yearResponses, reportFilterDept, reportFilterTeam, mgrSearchQuery);

    const yearColumn = {
      key: `annual_summary_${topPerformersYear}`,
      label: `${topPerformersYear} (year)`,
      subLabel: undefined as string | undefined,
      isSummaryYear: true,
      totalEvaluations: yearResponses.length,
      groups: yearGroups
    };

    return [...months, yearColumn];
  }, [activeScopedResponsesForCards, topPerformersYear, reportFilterDept, reportFilterTeam, mgrSearchQuery]);

  const reportTabs = activeRole === 'downline_teams'
    ? [
        { id: 'top_weekly', label: 'Top performers — Weekly' },
        { id: 'top_monthly', label: 'Top performers — Monthly' },
        { id: 'top_quarterly', label: 'Top performers — Quarterly' },
        { id: 'top_annual', label: 'Top performers — Annual' },
      ]
    : [
        { id: 'all', label: 'All', count: frequencyCounts.all, pending: frequencyCounts.allPending },
        { id: 'daily', label: 'Daily', count: frequencyCounts.daily, pending: frequencyCounts.dailyPending },
        { id: 'weekly', label: 'Weekly', count: frequencyCounts.weekly, pending: frequencyCounts.weeklyPending },
        { id: 'monthly', label: 'Monthly', count: frequencyCounts.monthly, pending: frequencyCounts.monthlyPending },
        { id: 'quarterly', label: 'Quarterly', count: frequencyCounts.quarterly, pending: frequencyCounts.quarterlyPending },
        { id: 'top_weekly', label: 'Top performers — Weekly' },
        { id: 'top_monthly', label: 'Top performers — Monthly' },
        { id: 'top_quarterly', label: 'Top performers — Quarterly' },
        { id: 'top_annual', label: 'Top performers — Annual' },
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

    managerTeamResponses.forEach(r => {
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

  const allDailyGroupsForManager = useMemo(() => buildGroupedByEmployee(isDailyResponse), [managerTeamResponses]);
  const allWeeklyGroupsForManager = useMemo(() => buildGroupedByEmployee(isWeeklyResponse), [managerTeamResponses]);
  const allMonthlyGroupsForManager = useMemo(() => buildGroupedByEmployee(isMonthlyResponse), [managerTeamResponses]);
  const allQuarterlyGroupsForManager = useMemo(() => buildGroupedByEmployee(isQuarterlyResponse), [managerTeamResponses]);

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

    // Validate that Self Remarks are filled for all deliverable rows
    const missingRemarksKpi: string[] = [];
    const payloadKpiInputs: Record<string, KPIResponseItem> = { ...kpiInputs };

    activeCategories.forEach(cat => {
      cat.kpis.forEach(k => {
        const item = getKpiResponseItem(k);
        const rem = (item?.employeeRemarks || '').trim();
        if (!rem) {
          missingRemarksKpi.push(`"${k.name}"`);
        }
        if (item) {
          payloadKpiInputs[k.id] = { ...item, kpiId: k.id, name: k.name };
          if (k.name) payloadKpiInputs[k.name] = { ...item, kpiId: k.id, name: k.name };
        }
      });
    });

    if (missingRemarksKpi.length > 0) {
      showAlert(
        'Please enter remarks for all deliverables before submitting.',
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
    let sanitizedVal: string | number = newActualVal;
    if (newActualVal !== '') {
      const num = parseFloat(String(newActualVal));
      if (!isNaN(num)) {
        if (num < 0) {
          sanitizedVal = 0;
        } else {
          sanitizedVal = num;
        }
      }
    }

    setMgrKpiActuals(prev => {
      const updated = { ...prev, [kpi.id]: sanitizedVal };
      let sum = 0;
      selectedMgrCategories.forEach(cat => {
        cat.kpis.forEach(k => {
          const val = updated[k.id] !== undefined ? updated[k.id] : (selectedMgrResponse?.kpiResponses?.[k.id]?.actualValue ?? '');
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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-primary-50 border border-primary-200 rounded-2xl flex items-center gap-2 text-primary-800 text-xs font-bold animate-in fade-in shadow-xs">
          <CheckCircleIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Navigation Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 shrink-0">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Employee Rewards & Recognition System
              </h2>
            </div>
          </div>

          {/* Sync Button */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => loadAllData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
              title="Sync latest evaluations from server"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 text-teal-700 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          </div>
        </div>

        {/* Clean Segmented Navigation Tabs */}
        {(isHrOrAdmin || isServiceManager || isManager) && (
          <div className="bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 flex flex-wrap gap-1 items-center w-fit">
            {isHrOrAdmin && (
              <button
                type="button"
                onClick={() => setActiveRole('hr')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${activeRole === 'hr'
                  ? 'bg-teal-700 text-white shadow-xs'
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
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${activeRole === 'manager'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
              >
                <BriefcaseIcon className="w-3.5 h-3.5" />
                <span>{isTeamLead ? 'Team Lead Reviews' : 'Direct Reviews'}</span>
                {directResponsesCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${activeRole === 'manager'
                    ? 'bg-white/20 text-white'
                    : 'bg-teal-100 text-teal-800'
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
                  if (!['top_weekly', 'top_monthly', 'top_quarterly', 'top_annual'].includes(reportViewTab)) {
                    setReportViewTab('top_weekly');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${activeRole === 'downline_teams'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
              >
                <UserGroupIcon className="w-3.5 h-3.5" />
                <span>Department Oversight</span>
                {downlineResponsesCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${activeRole === 'downline_teams'
                    ? 'bg-white/20 text-white'
                    : 'bg-teal-100 text-teal-800'
                    }`}>
                    {downlineResponsesCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveRole('employee')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${activeRole === 'employee'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>My Evaluation</span>
              {myEvaluationsCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${activeRole === 'employee'
                  ? 'bg-white/20 text-white'
                  : myPendingEvaluationsCount > 0
                    ? 'bg-teal-100 text-teal-800 ring-2 ring-teal-400 animate-pulse'
                    : 'bg-teal-100 text-teal-800'
                  }`}>
                  {myEvaluationsCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. HR CREATION VIEW (Strictly accessible to HR / Admin) */}
      {/* ========================================================================= */}
      {activeRole === 'hr' && isHrOrAdmin && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/90 shadow-sm space-y-8 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-neutral-200/80 gap-4">
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
                Create Performance Evaluation Cycle
              </h3>
              <p className="text-xs text-neutral-500 font-medium">
                Configure evaluation timelines, target team scope, and 100% deliverable weightage matrix for each team.
              </p>
            </div>

            {/* Total Weightage Status Badge */}
            <div className="flex items-center gap-3 bg-neutral-50 p-3 px-4 rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Weight</span>
                <span className={`text-base font-black ${totalWeightage === 100
                  ? 'text-primary-700'
                  : totalWeightage > 100
                    ? 'text-danger-600'
                    : 'text-warning-600'
                  }`}>
                  {totalWeightage}% / 100%
                </span>
              </div>
              <div className="w-24 h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${totalWeightage === 100
                    ? 'bg-primary-600'
                    : totalWeightage > 100
                      ? 'bg-danger-500'
                      : 'bg-warning-500'
                    }`}
                  style={{ width: `${Math.min(100, totalWeightage)}%` }}
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleHRCycleCreate} className="space-y-8">
            {/* Section 1: Basic Cycle Parameters */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-600"></span>
                1. Cycle Parameters & Timeline
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 bg-slate-50/60 focus-within:bg-white border border-slate-200 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Evaluation Title</label>
                  <input
                    type="text"
                    value={cycleName}
                    onChange={e => setCycleName(e.target.value)}
                    placeholder="e.g. Performance Evaluation"
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div className="p-3.5 bg-slate-50/60 focus-within:bg-white border border-slate-200 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Team (From DB)</label>
                  <select
                    value={selectedTeamId}
                    onChange={e => handleTeamChange(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-primary-800 focus:outline-none cursor-pointer"
                  >
                    {dbTeams.map(t => (
                      <option key={t.id || t.name} value={t.id || t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 bg-slate-50/60 focus-within:bg-white border border-slate-200 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Review Period</label>
                  <input
                    type="text"
                    value={periodName}
                    onChange={e => setPeriodName(e.target.value)}
                    placeholder="e.g. Q3 2026"
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="p-3.5 bg-slate-50/60 focus-within:bg-white border border-slate-200 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Team Leadership & Workforce Scope (Dynamic from DB via Access Level) */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-600"></span>
                2. Team Managers & Scope
              </span>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Card: Team Leadership & Reviewers (7 columns) */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary-50 border border-primary-200/80 flex items-center justify-center text-primary-700">
                          <UserGroupIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                            Team Leadership & Reviewers
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Automatic broadcast to all managers & leads in <span className="font-semibold text-slate-700">{selectedTeam?.name || 'Selected Team'}</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-primary-800 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200/80 shrink-0">
                        {teamManagers.length} {teamManagers.length === 1 ? 'Manager / Lead' : 'Managers & Leads'}
                      </span>
                    </div>

                    {/* Manager Cards Grid */}
                    <div className="mt-3.5 max-h-[220px] overflow-y-auto pr-1 space-y-2">
                      {teamManagers.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {teamManagers.map(mgr => (
                            <div
                              key={mgr.id || mgr.employee_id}
                              className="flex items-center justify-between gap-2.5 p-2.5 bg-slate-50/70 hover:bg-primary-50/40 border border-slate-200/80 hover:border-primary-200 rounded-xl transition group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-primary-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                                  {(mgr.first_name?.[0] || 'M')}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-primary-900">
                                    {mgr.first_name} {mgr.last_name}
                                  </p>
                                  <span className="inline-block text-[9px] font-semibold text-primary-700 bg-primary-50 border border-primary-200/60 px-1.5 py-0.5 rounded capitalize">
                                    {mgr.access_level || mgr.role || 'Manager'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[9px] font-semibold text-primary-700 bg-primary-50/80 px-1.5 py-0.5 rounded border border-primary-200/70 shrink-0">
                                Reviewer
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                          <p className="text-xs text-slate-500">
                            No team members with Manager/Lead access level found directly under {selectedTeam?.name || 'this team'}.
                          </p>
                          <p className="text-[11px] text-primary-700 font-semibold mt-1">
                            Company executive reviewers will automatically supervise this cycle.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-primary-800 font-medium">
                    <CheckBadgeIcon className="w-4 h-4 text-primary-600 shrink-0" />
                    <span>No single manager selection required — All {teamManagers.length} leadership members receive review permissions automatically.</span>
                  </div>
                </div>

                {/* Right Card: Team Workforce Scope (5 columns) */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary-50 border border-primary-200/80 flex items-center justify-center text-primary-700">
                          <BriefcaseIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                            Workforce in Scope
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Target Employee Population
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-primary-800 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200/80 shrink-0">
                        {selectedTeam?.name || 'Selected Team'}
                      </span>
                    </div>

                    {/* Stats Metric */}
                    <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-primary-800">
                          {teamEmployees.length || dbEmployees.slice(0, 5).length}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          Total Active Members
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70">
                        <div className="p-2 bg-white rounded-xl border border-slate-200">
                          <span className="block text-[10px] text-slate-500 font-semibold">Leadership / Reviewers</span>
                          <span className="text-sm font-black text-primary-800">{teamManagers.length}</span>
                        </div>
                        <div className="p-2 bg-white rounded-xl border border-slate-200">
                          <span className="block text-[10px] text-slate-500 font-semibold">Team Associates</span>
                          <span className="text-sm font-black text-primary-800">
                            {Math.max(0, (teamEmployees.length || dbEmployees.slice(0, 5).length) - teamManagers.length)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Direct Database Integration: When HR creates this cycle, this entire roster will automatically receive their customized KPI scorecard upon cycle release.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Performance Deliverables & Metrics Matrix */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-600"></span>
                  3. Performance Deliverables Matrix & 100% Weightage Allocation
                </span>

                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={totalWeightage >= 100}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${totalWeightage >= 100
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-white text-primary-800 border border-primary-300 hover:bg-primary-50 shadow-2xs'
                    }`}
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add Performance Category</span>
                </button>
              </div>

              {/* Status Alert */}
              {totalWeightage === 100 && areAllCategoriesBalanced ? (
                <div className="p-3.5 bg-primary-50/80 border border-primary-200/80 rounded-xl text-xs font-semibold text-primary-900 flex items-center gap-2.5">
                  <CheckCircleIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  <span><strong>100% Weightage & Deliverable Targets Balanced!</strong> All category weights total 100% and deliverable target scores match category weights perfectly.</span>
                </div>
              ) : totalWeightage === 100 && !areAllCategoriesBalanced ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center gap-2.5">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span><strong>Deliverable Target Score Mismatch:</strong> Category weights equal 100%, but some categories have deliverable target scores that do not sum to their category weight. Click <strong>"Auto-Balance Targets"</strong> on mismatched categories.</span>
                </div>
              ) : totalWeightage < 100 ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center gap-2.5">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span><strong>Allocation Incomplete:</strong> You have <strong>{100 - totalWeightage}% remaining</strong> to reach the required 100% total weightage.</span>
                </div>
              ) : (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-900 flex items-center gap-2.5">
                  <ExclamationTriangleIcon className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <span><strong>Over-Allocated:</strong> Total weightage exceeds 100% by <strong>{totalWeightage - 100}%</strong>. Please reduce category weights.</span>
                </div>
              )}

              {/* Category Cards with Deliverable Tables */}
              <div className="space-y-4">
                {hrCategories.map((cat, catIdx) => {
                  const catTargetSum = cat.kpis.reduce((s, k) => s + (Number(k.targetScore) || 0), 0);
                  const isCatBalanced = Math.abs(catTargetSum - Number(cat.weightage)) < 0.05;

                  return (
                    <div key={cat.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-primary-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                            {catIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={cat.name}
                            onChange={e => handleUpdateCategoryName(cat.id, e.target.value)}
                            placeholder="Category Title"
                            className="flex-1 h-9 px-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          {/* Category Weight Pill with clean flex alignment */}
                          <div className="flex items-center gap-2 bg-primary-50/80 px-3 py-1.5 rounded-xl border border-primary-200/80">
                            <label className="text-[11px] font-bold text-primary-900 whitespace-nowrap">Category Weight:</label>
                            <div className="flex items-center bg-white border border-primary-300 rounded-lg px-2 h-7 focus-within:ring-2 focus-within:ring-primary-500">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={cat.weightage}
                                onChange={e => handleUpdateCategoryWeight(cat.id, Number(e.target.value))}
                                className="w-10 text-xs font-black text-primary-900 text-center bg-transparent focus:outline-none p-0"
                              />
                              <span className="text-[11px] text-primary-700 font-bold ml-0.5">%</span>
                            </div>
                          </div>

                          {/* Target Score Sum Indicator Badge */}
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border transition ${isCatBalanced
                            ? 'bg-primary-50 text-primary-800 border-primary-200/80'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                            <span>Target Sum: {catTargetSum.toFixed(2).replace(/\.00$/, '')}% / {cat.weightage}%</span>
                            {isCatBalanced ? (
                              <CheckCircleIcon className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                            ) : (
                              <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            )}
                          </div>

                          {/* Auto-Balance Button */}
                          <button
                            type="button"
                            onClick={() => handleAutoBalanceCategory(cat.id)}
                            className="px-2.5 py-1 text-[10px] font-bold text-primary-700 hover:text-primary-900 bg-white hover:bg-primary-50 border border-primary-200/90 rounded-lg transition shadow-2xs whitespace-nowrap"
                            title="Distribute Category Weight equally among deliverables"
                          >
                            Auto-Balance Targets
                          </button>

                          {/* Delete Category Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                            title="Delete Category"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Deliverables Table with clean vertical and horizontal alignment */}
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2.5 text-left font-semibold text-slate-700">Deliverable Description / Metric</th>
                              <th className="px-3 py-2.5 w-36 text-center font-semibold text-slate-700">Target from Manager</th>
                              <th className="px-3 py-2.5 w-32 text-center font-semibold text-slate-700">Target Score %</th>
                              <th className="px-3 py-2.5 w-28 text-center font-semibold text-slate-700">Unit</th>
                              <th className="px-3 py-2.5 w-12 text-center font-semibold text-slate-700"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {cat.kpis.map(kpi => (
                              <tr key={kpi.id} className="hover:bg-slate-50/50 transition">
                                <td className="px-3 py-2 align-middle">
                                  <input
                                    type="text"
                                    value={kpi.name}
                                    onChange={e => handleUpdateKPI(cat.id, kpi.id, 'name', e.target.value)}
                                    placeholder="Describe deliverable specification..."
                                    className="w-full h-8 px-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-primary-500 rounded-lg text-xs font-medium text-slate-800 focus:outline-none transition"
                                  />
                                </td>
                                <td className="px-3 py-2 align-middle text-center">
                                  <input
                                    type="text"
                                    value={kpi.targetFromManager ?? ''}
                                    onChange={e => handleUpdateKPI(cat.id, kpi.id, 'targetFromManager', e.target.value)}
                                    placeholder="e.g. 3, 1950, <2"
                                    className="w-full h-8 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-primary-500 rounded-lg text-xs font-bold text-center text-primary-900 focus:outline-none transition"
                                  />
                                </td>
                                <td className="px-3 py-2 align-middle text-center">
                                  <div className="flex items-center justify-center bg-slate-50/70 focus-within:bg-white border border-slate-200 focus-within:border-primary-500 rounded-lg px-2 h-8 transition">
                                    <input
                                      type="number"
                                      step="any"
                                      value={kpi.targetScore}
                                      onChange={e => handleUpdateKPI(cat.id, kpi.id, 'targetScore', Number(e.target.value))}
                                      placeholder="10"
                                      className="w-14 text-xs font-bold text-center text-slate-800 bg-transparent focus:outline-none p-0"
                                    />
                                    <span className="text-[11px] text-slate-400 font-bold ml-0.5">%</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 align-middle text-center">
                                  <input
                                    type="text"
                                    value={kpi.unit || ''}
                                    onChange={e => handleUpdateKPI(cat.id, kpi.id, 'unit', e.target.value)}
                                    placeholder="projects"
                                    className="w-full h-8 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-primary-500 rounded-lg text-xs text-center text-slate-600 focus:outline-none transition"
                                  />
                                </td>
                                <td className="px-3 py-2 align-middle text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteKPI(cat.id, kpi.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition inline-flex items-center justify-center"
                                    title="Delete Deliverable"
                                  >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleAddKPI(cat.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-800 bg-primary-50 hover:bg-primary-100 rounded-xl transition shadow-2xs border border-primary-200/60"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          <span>Add Deliverable Description</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit & Forward Action Bar */}
            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Ready to Release Evaluation Cycle?</span>
                <span className="text-slate-500">
                  Target Team: <strong className="text-slate-800">{selectedTeam?.name}</strong> • Dispatched strictly to: <strong className="text-primary-800">{teamManagers.length} Team Managers & Leads</strong> • Scope: <strong className="text-slate-800">{teamEmployees.length || dbEmployees.slice(0, 5).length} Members</strong>
                </span>
              </div>

              <button
                type="submit"
                disabled={!isWeightageValid || !areAllCategoriesBalanced}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-bold text-white shadow-xs transition ${isWeightageValid && areAllCategoriesBalanced
                  ? 'bg-primary-600 hover:bg-primary-700 cursor-pointer shadow-primary-600/20'
                  : 'bg-slate-300 cursor-not-allowed opacity-60'
                  }`}
              >
                <SparklesIcon className="w-4 h-4 text-warning-300" />
                <span>Submit & Forward to {selectedTeam?.name} Management</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3 & 6. EMPLOYEE SELF-ASSESSMENT & REPORT */}
      {/* ========================================================================= */}
      {activeRole === 'employee' && (
        <div className="space-y-5">
          {/* Sub Tab Navigation */}
          <div className="bg-white border border-neutral-200/90 rounded-2xl p-1.5 shadow-2xs w-fit">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEmployeeSubTab('worksheet')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${employeeSubTab === 'worksheet'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}
              >
                <ClipboardDocumentListIcon className="w-4 h-4" />
                <span>Self-Assessment Worksheet</span>
              </button>

              <button
                type="button"
                onClick={() => setEmployeeSubTab('reports')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${employeeSubTab === 'reports'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}
              >
                <DocumentChartBarIcon className="w-4 h-4" />
                <span>Official Performance Report</span>
              </button>
            </div>
          </div>

          {employeeSubTab === 'worksheet' && ((() => {
            if (!isEmployeeExplicitlyAssigned || !activeEmpResponse) {
              return (
                <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-2xs p-8 sm:p-12 text-center space-y-5 animate-in fade-in duration-200 max-w-2xl mx-auto my-6">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
                    <ClipboardDocumentListIcon className="w-8 h-8 text-primary-600" />
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      No Active KPI Assignment
                    </div>
                    <h3 className="text-xl font-black text-slate-900">
                      No Performance Evaluation Assigned
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      You are not currently enrolled in an active KPI performance evaluation cycle. Your reporting manager or HR has not assigned a deliverables matrix to your profile for this period.
                    </p>
                  </div>

                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 max-w-md mx-auto text-left space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Employee Name:</span>
                      <strong className="text-slate-800">{user?.full_name || `${userAny?.first_name || ''} ${userAny?.last_name || ''}`.trim() || 'Employee'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 font-medium">Employee Code:</span>
                      <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">#{myCanonicalCode || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 font-medium">Department:</span>
                      <span className="font-bold text-slate-700">{effectiveTeamName || 'General'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 font-medium">Evaluation Status:</span>
                      <span className="text-amber-700 font-bold text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Not Assigned</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    When your reporting manager assigns KPI deliverables to you in the performance cycle, your interactive self-assessment worksheet will activate automatically.
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
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* 1. Ultra-Compact Executive Tracking Progress Header */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
                  {/* Cycle Info & Summary Pill Badges */}
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap sm:flex-nowrap">
                      <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs shrink-0">
                        <SparklesIcon className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 truncate">
                          {activeCycle?.name || 'Performance Evaluation Cycle'}
                        </h3>
                        {/* Period Selector Dropdown (Allows switching between previous & latest periods) */}
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs shrink-0">
                          <CalendarDaysIcon className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Period:</span>
                          <select
                            value={selectedResponseId || activeEmpResponse?.id || ''}
                            onChange={(e) => {
                              const newId = e.target.value;
                              setSelectedResponseId(newId);
                              setSelectedReportResponseId(newId);
                            }}
                            className="bg-transparent text-[11px] font-extrabold text-teal-900 border-none outline-none cursor-pointer pr-1"
                          >
                            {allUserResponses.length > 0 ? (
                              allUserResponses.map((r, idx) => {
                                const c = cycles.find(cy => cy.id === r.cycleId);
                                const label = c?.periodName || c?.name || (r as any).periodName || `Cycle ${idx + 1}`;
                                const isLatest = idx === 0;
                                const isSubmitted = r.status === 'manager_review' || r.status === 'approved' || r.status === 'sm_final_approval' || Boolean(r.employeeSubmittedAt);
                                const statusLabel = isSubmitted ? 'Submitted' : 'In Progress';
                                return (
                                  <option key={r.id} value={r.id}>
                                    {label} {isLatest ? '(Latest)' : ''} — {statusLabel}
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

                    {/* Summary Pill Badges + Fill Form & Report Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs flex-wrap xl:flex-nowrap shrink-0 py-0.5">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 whitespace-nowrap">
                        <span className="text-[10px] text-slate-500 font-medium">Self Score:</span>
                        <strong className="text-teal-900 font-bold">{selfScoreNum.toFixed(1)}%</strong>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 whitespace-nowrap">
                        <span className="text-[10px] text-slate-500 font-medium">Mgr Score:</span>
                        <strong className="text-teal-950 font-bold">
                          {activeEmpResponse && (activeEmpResponse.status === 'approved' || activeEmpResponse.status === 'sm_final_approval' || (activeEmpResponse.managerReviewedAt && activeEmpResponse.status !== 'manager_review')) && activeEmpResponse.managerScore != null
                            ? `${Number(activeEmpResponse.managerScore).toFixed(1)}%`
                            : 'Pending'}
                        </strong>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 whitespace-nowrap">
                        <span className="text-[10px] text-slate-500 font-medium">Progress:</span>
                        <strong className="text-slate-900 font-bold">{completedKpiCount}/{totalKpiCount}</strong>
                      </div>

                      {/* Fill Form Button (Opens/Expands all category dropdowns) */}
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
                        className="flex items-center gap-1.5 px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer whitespace-nowrap"
                        title="Click to open/expand all categories and fill the evaluation form"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5 text-white" />
                        <span>{activeCategories.length > 0 && activeCategories.every(c => expandedCategories[c.id]) ? 'Collapse Form' : 'Fill Form'}</span>
                        <ChevronDownIcon className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${activeCategories.length > 0 && activeCategories.every(c => expandedCategories[c.id]) ? 'rotate-180' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setEmployeeSubTab('reports')}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer whitespace-nowrap"
                      >
                        <DocumentChartBarIcon className="w-3.5 h-3.5 text-teal-700" />
                        <span>Official Report</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Process Tracker Line */}
                  <div className="relative py-2 px-6 max-w-xl mx-auto">
                    {/* Base Track Line */}
                    <div className="absolute left-10 right-10 top-5 h-0.5 bg-slate-200" />

                    {/* Active Progress Fill Line */}
                    <div
                      className="absolute left-10 top-5 h-0.5 bg-emerald-500 transition-all duration-500"
                      style={{
                        width: activeEmpResponse?.status === 'approved'
                          ? 'calc(100% - 5rem)'
                          : (activeEmpResponse?.status === 'sm_final_approval' || (activeEmpResponse?.managerReviewedAt && activeEmpResponse?.status !== 'manager_review'))
                            ? 'calc(75% - 2.5rem)'
                            : isEmpSubmitted
                              ? 'calc(50% - 2.5rem)'
                              : '0%'
                      }}
                    />

                    <div className="flex items-center justify-between relative z-10">
                      {/* Step 1: Submitted */}
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${isEmpSubmitted
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-50'
                          : 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                          }`}>
                          {isEmpSubmitted ? <CheckIcon className="w-4 h-4 stroke-[3]" /> : '1'}
                        </div>
                        <span className="text-xs font-bold text-slate-800">Submitted</span>
                      </div>

                      {/* Step 2: Manager Review */}
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        {(() => {
                          const isManagerDone = activeEmpResponse?.status === 'approved' || activeEmpResponse?.status === 'sm_final_approval' || (Boolean(activeEmpResponse?.managerReviewedAt) && activeEmpResponse?.status !== 'manager_review');
                          return (
                            <>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isManagerDone
                                ? 'bg-emerald-500 text-white ring-4 ring-emerald-50 shadow-2xs'
                                : isEmpSubmitted
                                  ? 'bg-amber-50 text-amber-700 border-2 border-amber-500 ring-4 ring-amber-100 shadow-2xs'
                                  : 'bg-white text-slate-400 border-2 border-slate-300'
                                }`}>
                                {isManagerDone ? (
                                  <CheckIcon className="w-4 h-4 stroke-[3]" />
                                ) : (
                                  '2'
                                )}
                              </div>
                              <span className="text-xs font-bold text-slate-800">Manager Review</span>
                            </>
                          );
                        })()}
                      </div>

                      {/* Step 3: Final Status */}
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${activeEmpResponse?.status === 'approved'
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-50 shadow-2xs'
                          : 'bg-white text-slate-400 border-2 border-slate-300'
                          }`}>
                          {activeEmpResponse?.status === 'approved' ? (
                            <CheckBadgeIcon className="w-4.5 h-4.5 text-white" />
                          ) : (
                            '3'
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-800">Final Status</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Assigned Evaluation Periods Navigation */}
                {allUserResponses.length > 1 && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between gap-2 px-0.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <CalendarDaysIcon className="w-4 h-4 text-teal-700" />
                        <span>Manager Assigned Evaluation Periods</span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          {allUserResponses.length} Periods
                        </span>
                      </div>
                      {allUserResponses.some(r => !r.employeeSubmittedAt && r.status !== 'manager_review' && r.status !== 'approved' && r.status !== 'sm_final_approval') && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Pending Self-Assessment
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                      {allUserResponses.map((r, idx) => {
                        const c = cycles.find(cy => cy.id === r.cycleId);
                        const periodTitle = c?.periodName || c?.name || (r as any).periodName || (r as any).form || `Period ${idx + 1}`;
                        const isSelected = (selectedResponseId || activeEmpResponse?.id) === r.id;
                        const isSubmitted = r.status === 'manager_review' || r.status === 'approved' || r.status === 'sm_final_approval' || Boolean(r.employeeSubmittedAt);
                        const isApproved = r.status === 'approved' || (r.managerScore != null && r.status !== 'manager_review');
                        const scoreVal = r.managerScore != null ? `${Number(r.managerScore).toFixed(1)}%` : (r.employeeOverallScore != null ? `${Number(r.employeeOverallScore).toFixed(1)}%` : null);

                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setSelectedResponseId(r.id);
                              setSelectedReportResponseId(r.id);
                            }}
                            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 border text-left ${isSelected
                              ? 'bg-teal-50/90 border-teal-500 text-teal-950 shadow-xs ring-1 ring-teal-500'
                              : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                              }`}
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-bold ${isSelected ? 'text-teal-950' : 'text-slate-800'}`}>
                                  {periodTitle}
                                </span>
                                {idx === 0 && (
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded">
                                    Latest
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {isApproved ? (
                                  <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Approved {scoreVal ? `(${scoreVal})` : ''}
                                  </span>
                                ) : isSubmitted ? (
                                  <span className="text-[10px] font-semibold text-sky-700 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                    Submitted to Manager
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Pending Self-Assessment
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-teal-600 ml-1 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}


                {/* 2. Smart Deliverables Toolbar: Search & Filters */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={empSearchQuery}
                        onChange={e => setEmpSearchQuery(e.target.value)}
                        placeholder="Search deliverable..."
                        className="w-full h-8 pl-9 pr-7 text-xs bg-white border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-xl focus:outline-none transition shadow-2xs"
                      />
                      {empSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setEmpSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setEmpFilterTab('all')}
                        className={`px-3 py-1 rounded-lg transition ${empFilterTab === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        All ({totalKpiCount})
                      </button>
                      {adjustedKpiCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setEmpFilterTab('adjusted')}
                          className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${empFilterTab === 'adjusted'
                            ? 'bg-amber-100 text-amber-950 shadow-2xs font-bold'
                            : 'text-amber-800 hover:text-amber-950'
                            }`}
                        >
                          <span>Adjusted ({adjustedKpiCount})</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Deliverable-Level Evaluation Breakdown Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Table Header Bar */}
                  <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-teal-500" />
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Deliverable Breakdown
                      </h4>
                      {isEmpSubmitted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                          <CheckCircleIcon className="w-3 h-3 text-teal-600" />
                          Submitted & Locked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                        title="Click to open/collapse all deliverable categories"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5 text-white" />
                        <span>{activeCategories.length > 0 && activeCategories.every(c => expandedCategories[c.id]) ? 'Collapse Form' : 'Fill Form'}</span>
                        <ChevronDownIcon className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${activeCategories.length > 0 && activeCategories.every(c => expandedCategories[c.id]) ? 'rotate-180' : ''}`} />
                      </button>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/70">
                        {filteredCategories.length} Categories
                      </span>
                      <span className="text-[11px] font-extrabold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/90 shadow-2xs">
                        100% Total WeightAge
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-200/90 bg-white">
                    {filteredCategories.map((cat, catIdx) => {
                      const catEarned = cat.kpis.reduce((sum, k) => {
                        const respItem = getKpiResponseItem(k);
                        const val = respItem?.actualValue ?? (kpiInputs[k.id]?.actualValue ?? '');
                        return sum + calculateKPIScore(k, val).earnedScore;
                      }, 0);

                      const catMgrEarned = cat.kpis.reduce((sum, k) => {
                        const respItem = getKpiResponseItem(k);
                        if (respItem?.managerScore !== undefined && respItem?.managerScore !== null) return sum + Number(respItem.managerScore);
                        if (respItem?.managerActualValue !== undefined && respItem?.managerActualValue !== '') return sum + calculateKPIScore(k, respItem.managerActualValue).earnedScore;
                        return sum;
                      }, 0);
                      const isExpanded = Boolean(expandedCategories[cat.id]);

                      return (
                        <div key={cat.id} className="bg-white">
                          {/* Modern Category Subheading Banner (Muted Dull Slate Theme) */}
                          <div
                            onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                            className="bg-slate-100/90 hover:bg-slate-200/70 text-slate-800 px-4 py-2.5 cursor-pointer transition-colors duration-150 select-none group flex items-center justify-between gap-3 w-full"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="p-1 rounded-md text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200/70 transition-colors shrink-0"
                                title={isExpanded ? "Collapse category details" : "Expand category details"}
                              >
                                <ChevronDownIcon className={`w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                              </span>
                              <span className="w-5 h-5 rounded-md bg-slate-300/90 text-slate-700 border border-slate-300 flex items-center justify-center font-bold text-[11px] shadow-2xs shrink-0">
                                {catIdx + 1}
                              </span>
                              <span className="font-semibold text-xs text-slate-800 group-hover:text-slate-900 transition-colors truncate">
                                {cat.name}
                              </span>
                              <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200/90 px-2 py-0.5 rounded-full shadow-2xs shrink-0">
                                {cat.matchingKpis.length} {cat.matchingKpis.length === 1 ? 'deliverable' : 'deliverables'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200/90 px-2.5 py-0.5 rounded-full shadow-2xs whitespace-nowrap">
                                Earned: <strong className="text-slate-800 font-bold">{catEarned.toFixed(2)}%</strong> / {cat.weightage}%
                              </span>
                              <span className="text-[11px] font-bold text-slate-700 bg-slate-200/80 border border-slate-300/80 px-2.5 py-0.5 rounded-full shadow-2xs whitespace-nowrap">
                                {cat.weightage}% WeightAge
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-teal-50 text-teal-800 border border-teal-200/90 shadow-2xs group-hover:bg-teal-100 transition">
                                <PencilSquareIcon className="w-3 h-3 text-teal-700" />
                                <span>{isExpanded ? 'Hide' : 'Fill Form'}</span>
                                <ChevronDownIcon className={`w-3 h-3 text-teal-700 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
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
                                    <th className="px-2 py-2.5 text-center whitespace-nowrap">Weight</th>
                                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Self Actual</th>
                                    <th className="px-2.5 py-2.5 text-center whitespace-nowrap">Self Score</th>
                                    <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Self Remarks</th>
                                    {isEmpSubmitted && (
                                      <>
                                        <th className="px-3 py-2.5 text-center bg-teal-50/50 text-teal-950 border-l border-teal-200/60 whitespace-nowrap font-extrabold">Mgr Actual</th>
                                        <th className="px-2.5 py-2.5 text-center bg-teal-50/50 text-teal-950 whitespace-nowrap font-extrabold">Mgr Score</th>
                                        <th className="px-3.5 py-2.5 text-left bg-teal-50/50 text-teal-950 whitespace-nowrap font-extrabold">Mgr Remarks</th>
                                      </>
                                    )}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {cat.matchingKpis.map((kpi) => {
                                    const respItem = getKpiResponseItem(kpi);
                                    const val = respItem?.actualValue !== undefined && respItem?.actualValue !== null && respItem?.actualValue !== ''
                                      ? respItem.actualValue
                                      : (kpiInputs[kpi.id]?.actualValue ?? (kpi.name ? kpiInputs[kpi.name]?.actualValue : '') ?? '');
                                    const calc = calculateKPIScore(kpi, val);
                                    const remarks = respItem?.employeeRemarks !== undefined && respItem?.employeeRemarks !== null
                                      ? respItem.employeeRemarks
                                      : (kpiInputs[kpi.id]?.employeeRemarks ?? (kpi.name ? kpiInputs[kpi.name]?.employeeRemarks : '') ?? '');
                                    const parsedTarget = parseTargetExpression(kpi.targetFromManager, kpi.targetValue || 1);
                                    const targetThreshold = parsedTarget.threshold;

                                    // Manager reviewed values
                                    const hasMgrActual = respItem?.managerActualValue !== undefined && respItem?.managerActualValue !== null && respItem?.managerActualValue !== '';
                                    const mgrActualVal = hasMgrActual ? respItem.managerActualValue : (mgrKpiActuals[kpi.id] ?? '');
                                    const isActualModifiedByMgr = hasMgrActual && String(mgrActualVal).trim() !== String(val).trim();
                                    const mgrCalc = calculateKPIScore(kpi, hasMgrActual ? mgrActualVal : val);
                                    const mgrEarnedScore = (respItem?.managerScore !== undefined && respItem?.managerScore !== null)
                                      ? Number(respItem.managerScore)
                                      : (hasMgrActual ? mgrCalc.earnedScore : null);
                                    const mgrRemarks = respItem?.managerRemarks ?? mgrKpiRemarks[kpi.id] ?? '';

                                    const isNeg = isNegativeKpi(kpi);

                                    return (
                                      <tr
                                        key={kpi.id}
                                        className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-b-0"
                                      >
                                        {/* 1. Deliverable Name & Description */}
                                        <td className="px-4 py-3 align-middle max-w-[240px]">
                                          <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-bold text-xs text-slate-900 leading-snug">
                                                {kpi.name}
                                              </span>
                                            </div>
                                            {kpi.description && (
                                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                                {kpi.description}
                                              </p>
                                            )}
                                          </div>
                                        </td>

                                        {/* 2. Target Goal */}
                                        <td className="px-2.5 py-3 align-middle text-center whitespace-nowrap">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                            {(() => {
                                              const t = String(kpi.targetFromManager || '').trim();
                                              const u = String(kpi.unit || '').trim();
                                              if (!t) return targetThreshold;
                                              if (!u || t.toLowerCase().includes(u.toLowerCase())) return t;
                                              return `${t} ${u}`;
                                            })()}
                                          </span>
                                        </td>

                                        {/* 3. Weight */}
                                        <td className="px-2 py-3 align-middle text-center whitespace-nowrap">
                                          <span className="text-xs font-bold text-slate-700">
                                            {kpi.weightage || kpi.targetScore}%
                                          </span>
                                        </td>

                                        {/* 4. Self Actual */}
                                        <td className="px-3 py-3 align-middle text-center text-xs whitespace-nowrap">
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

                                            if (isEmpSubmitted) {
                                              if (val === '' || val === undefined || val === null) {
                                                return <span className="text-slate-400 font-medium">—</span>;
                                              }
                                              // All negative deliverables (delays, misses, escalations) use the red rose pill
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
                                                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                                                  }`}>
                                                  <span>{val} {kpi.unit || ''}</span>
                                                  {calc.earnedScore === 0 && (
                                                    <span className="text-[9px] bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                      Not Met
                                                    </span>
                                                  )}
                                                </span>
                                              );
                                            }

                                            return (
                                              <div className="flex flex-col items-center justify-center gap-1">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={val}
                                                  disabled={isSubmittingEmp}
                                                  onChange={e => handleKPIChange(kpi, e.target.value)}
                                                  placeholder="0"
                                                  className={`w-24 h-8 px-2 text-center font-bold text-xs rounded-xl transition shadow-2xs focus:outline-none ${isNeg && isOverTarget
                                                      ? 'bg-rose-50 text-rose-950 border-2 border-rose-400 ring-2 ring-rose-400/20 font-black'
                                                      : !isNeg && calc.earnedScore === 0 && val !== ''
                                                        ? 'bg-rose-50 text-rose-950 border-2 border-rose-400 ring-2 ring-rose-400/20 font-black'
                                                        : isOverTarget
                                                          ? 'bg-emerald-50 text-emerald-950 border-2 border-emerald-500 ring-2 ring-emerald-400/30 font-black'
                                                          : isMetTarget
                                                            ? 'bg-teal-50/80 text-teal-950 border-2 border-teal-400 font-bold focus:border-teal-600'
                                                            : 'bg-white text-slate-900 border border-slate-200 focus:border-teal-600'
                                                    }`}
                                                />
                                                {isNeg && isOverTarget && (
                                                  <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded uppercase tracking-wider animate-in fade-in">
                                                    Exceeded Limit
                                                  </span>
                                                )}
                                                {!isNeg && isOverTarget && (
                                                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wider animate-in fade-in">
                                                    Exceeded Target
                                                  </span>
                                                )}
                                                {!isNeg && !isMetTarget && calc.earnedScore === 0 && numericVal !== null && val !== '' && (
                                                  <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded uppercase tracking-wider animate-in fade-in">
                                                    Not Met
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </td>

                                        {/* Self Score */}
                                        <td className="px-2.5 py-3 text-center align-middle whitespace-nowrap">
                                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-black shadow-2xs ${calc.earnedScore > 0
                                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/90'
                                              : 'bg-rose-50 text-rose-900 border border-rose-200/90'
                                            }`}>
                                            {calc.earnedScore.toFixed(2)}%
                                          </span>
                                        </td>

                                        {/* Self Remarks */}
                                        <td className="px-3.5 py-3 align-middle text-xs min-w-[130px] max-w-[200px]">
                                          {isEmpSubmitted ? (
                                            <ExpandableRemarkView text={remarks} fallback="—" />
                                          ) : (
                                            <ExpandableRemarkInput
                                              value={remarks}
                                              disabled={isSubmittingEmp}
                                              onChange={val => handleKPIRemarksChange(kpi, val)}
                                              placeholder="Enter remarks..."
                                              required={true}
                                              className={
                                                !remarks.trim()
                                                  ? 'bg-amber-50/40 focus:bg-white border border-amber-300 focus:border-teal-600 text-slate-800 focus:outline-none shadow-2xs'
                                                  : 'bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-teal-600 text-slate-800 focus:outline-none shadow-2xs'
                                              }
                                            />
                                          )}
                                        </td>

                                        {/* Manager Reviewed Fields Display */}
                                        {isEmpSubmitted && (
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

                                            <td className="px-2.5 py-3 text-center align-middle bg-teal-50/30 whitespace-nowrap">
                                              <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-black shadow-2xs ${mgrEarnedScore !== null && mgrEarnedScore > 0
                                                  ? 'bg-teal-100 text-teal-950 border border-teal-300'
                                                  : mgrEarnedScore !== null
                                                    ? 'bg-rose-50 text-rose-900 border border-rose-200/90'
                                                    : 'bg-slate-50 text-slate-500 border border-slate-200/60'
                                                }`}>
                                                {mgrEarnedScore !== null ? `${mgrEarnedScore.toFixed(2)}%` : '—'}
                                              </span>
                                            </td>

                                            <td className="px-3.5 py-3 align-middle bg-teal-50/30 text-xs min-w-[130px] max-w-[200px]">
                                              <ExpandableRemarkView text={mgrRemarks} fallback="—" />
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
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 font-semibold">Self Overall Score:</span>
                        <strong className="text-teal-900 text-sm font-black">{selfScoreNum.toFixed(1)}%</strong>
                      </div>
                      {activeEmpResponse?.managerScore !== undefined && (
                        <div className="flex items-center gap-2.5 bg-teal-50 px-4 py-2.5 rounded-xl border border-teal-200 shadow-2xs">
                          <span className="text-teal-800 font-bold">Manager Official Score:</span>
                          <strong className="text-teal-950 text-sm font-black">{Number(activeEmpResponse.managerScore).toFixed(1)}%</strong>
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 font-semibold">Grade Tier:</span>
                        <strong className="text-teal-900 text-sm font-black bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/70">
                          {(() => {
                            const r = getRatingForScore(activeEmpResponse?.managerScore ?? selfScoreNum);
                            return `Grade ${r.letterGrade || r.grade}`;
                          })()}
                        </strong>
                      </div>
                    </div>

                    {isEmpSubmitted ? (
                      <div className="flex items-center gap-2 px-5 py-2.5 bg-teal-50 text-teal-800 rounded-xl text-xs font-bold border border-teal-200 shadow-2xs">
                        <CheckCircleIcon className="w-4 h-4 text-teal-700" />
                        <span>Submitted to Manager (Locked)</span>
                      </div>
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

            return (
              <div className="space-y-8 animate-in fade-in duration-200">
                {/* Executive Overview Header */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-700 text-white shadow-xs">
                        <CheckBadgeIcon className="w-3.5 h-3.5" />
                        Evaluation History
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {allEmpResponses.length} {allEmpResponses.length === 1 ? 'Record' : 'Records'}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      Evaluation History & Scorecards
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Official performance scorecards and evaluation records.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEmployeeSubTab('worksheet')}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <PencilSquareIcon className="w-4 h-4 text-slate-500" />
                      <span>Back to Worksheet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <PrinterIcon className="w-4 h-4" />
                      <span>Print PDF</span>
                    </button>
                  </div>
                </div>

                {/* Stack of Full Executive Scorecards — One per Stage Response in DB */}
                <div className="space-y-8">
                  {allEmpResponses.map((r, idx) => {
                    const itemCycle = cycles.find(cy => cy.id === r.cycleId);
                    const itemTitle = itemCycle?.name || itemCycle?.periodName || (r as any).periodName || `Performance Evaluation Stage ${allEmpResponses.length - idx}`;
                    const itemCategories = (itemCycle?.categories && itemCycle.categories.length > 0) ? itemCycle.categories : activeCategories;

                    // Resolve descriptive period time from cycle, response, or DB fields
                    const resolvePeriodTime = () => {
                      // 1. Check description from DB for embedded period (e.g. "Performance evaluation for Media (Daily (14 Sep 2026))")
                      const desc = String(itemCycle?.description || (r as any).description || '').trim();
                      if (desc.includes('(') && desc.includes(')')) {
                        const extracted = desc.substring(desc.lastIndexOf('(') + 1, desc.lastIndexOf(')')).trim();
                        if (extracted && extracted.toLowerCase() !== (itemCycle?.name || '').toLowerCase()) {
                          return extracted;
                        }
                      }

                      // 2. Check if single day (Daily) by dates: startDate === endDate
                      if (itemCycle?.startDate && itemCycle?.endDate && itemCycle.startDate === itemCycle.endDate) {
                        return `Daily (${formatDisplayDate(itemCycle.startDate)})`;
                      }

                      // 3. Check cycle.periodName or (r as any).periodName
                      let rawPeriod = String(itemCycle?.periodName || (r as any).periodName || (r as any).reviewPeriod || '').trim();

                      // If rawPeriod has a specific period format (Daily, Weekly, Monthly, Due Date, Q1-Q4, Stage)
                      const isDescriptive = rawPeriod && rawPeriod.toLowerCase() !== (itemCycle?.name || '').toLowerCase() && (
                        rawPeriod.toLowerCase().includes('daily') ||
                        rawPeriod.toLowerCase().includes('due') ||
                        rawPeriod.toLowerCase().includes('week') ||
                        rawPeriod.toLowerCase().includes('stage') ||
                        rawPeriod.includes('(') ||
                        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(rawPeriod)
                      );

                      if (isDescriptive) {
                        return rawPeriod;
                      }

                      // 4. Date range if present
                      const hasCycleDates = Boolean(itemCycle?.startDate && itemCycle?.endDate);
                      const formattedDates = hasCycleDates
                        ? `${formatDisplayDate(itemCycle!.startDate)} – ${formatDisplayDate(itemCycle!.endDate)}`
                        : '';

                      // 5. Check for Quarter in title / form name / rawPeriod
                      const textToCheck = `${itemTitle} ${rawPeriod} ${itemCycle?.name || ''}`;
                      const qMatch = textToCheck.match(/Q([1-4])/i);
                      if (qMatch) {
                        const qNum = parseInt(qMatch[1]);
                        const qLabels: Record<number, string> = { 1: 'Jan - Mar', 2: 'Apr - Jun', 3: 'Jul - Sep', 4: 'Oct - Dec' };
                        const yr = (itemCycle?.startDate ? new Date(itemCycle.startDate).getFullYear() : (r.createdAt ? new Date(r.createdAt).getFullYear() : currentYear)) || currentYear;
                        return `Q${qNum} ${yr} (${qLabels[qNum]})`;
                      }

                      if (formattedDates) {
                        return formattedDates;
                      }

                      if (rawPeriod && rawPeriod.toLowerCase() !== (itemCycle?.name || '').toLowerCase()) {
                        return rawPeriod;
                      }

                      if (r.createdAt) {
                        return formatDisplayDate(r.createdAt);
                      }

                      return `Q${currentQuarter} ${currentYear} (${quarterLabel})`;
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
                    const itemSelfRating = getRatingForScore(itemSelfScore);
                    const itemIsApproved = r.status === 'approved' || r.status === 'sm_final_approval';
                    // Audit breakdown table is hidden by default; user can toggle it open
                    const isAuditOpen = historyAuditBreakdownOpen[r.id] === true;

                    return (
                      <div key={r.id || idx} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6 animate-in fade-in duration-200">
                        {/* Executive Stage Header Banner — Clean & Minimized */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-200/80 gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80 shadow-2xs">
                                <CalendarDaysIcon className="w-3 h-3 text-teal-700 shrink-0" />
                                <span>Period: <strong className="text-teal-950 font-black">{itemPeriodTime}</strong></span>
                              </span>

                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${itemIsApproved
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                {itemIsApproved ? '● Published' : '○ In Review'}
                              </span>
                            </div>

                            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                              {itemTitle}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const summary = `PERFORMANCE REPORT: ${itemTitle}\nPeriod: ${itemPeriodTime}\nSelf Score: ${itemSelfScore.toFixed(1)}%\nManager Score: ${itemMgrScore !== null ? `${itemMgrScore.toFixed(1)}%` : 'Pending'}\nFinal Grade: ${itemRating.letterGrade || itemRating.grade} (${itemRating.name})`;
                                navigator.clipboard.writeText(summary);
                                alert('Performance Summary copied!');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition cursor-pointer"
                            >
                              <ClipboardDocumentListIcon className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Summary</span>
                            </button>
                          </div>
                        </div>

                        {/* Hero Executive Scorecard & Consensus Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                          {/* Dark Green Hero Card */}
                          <div
                            onClick={() => setHistoryAuditBreakdownOpen(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                            className="lg:col-span-5 bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-5 relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-teal-400/60 transition-all duration-200 group"
                            title={isAuditOpen ? "Click to collapse Deliverable Audit Breakdown" : "Click to view detailed Deliverable Audit Breakdown"}
                          >
                            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

                            <div className="flex items-center justify-between z-10">
                              <span className="text-[10px] uppercase font-bold text-teal-200 tracking-wider flex items-center gap-1">
                                <SparklesIcon className="w-3.5 h-3.5 text-teal-300" />
                                Final Performance Scorecard
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-700/80 text-teal-100 border border-teal-600/50">
                                {itemRating.name}
                              </span>
                            </div>

                            <div className="space-y-2 z-10">
                              <div className="flex items-baseline gap-3">
                                <span className="text-5xl font-black tracking-tight text-white">
                                  {itemRating.letterGrade || itemRating.grade}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-2xl font-black text-teal-100">
                                  {itemFinalScore.toFixed(1)}%
                                </div>
                                <span className="text-xs text-teal-200/80 font-medium">Cumulative Score</span>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-teal-700/60 flex items-center justify-between z-10">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(s => (
                                  s <= itemRating.stars ? (
                                    <StarSolid key={s} className="w-4 h-4 text-amber-400 drop-shadow-xs" />
                                  ) : (
                                    <StarIcon key={s} className="w-4 h-4 text-teal-700" />
                                  )
                                ))}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] font-extrabold text-teal-200 group-hover:text-white transition">
                                <span>{isAuditOpen ? 'Hide Audit Breakdown' : 'View Audit Breakdown'}</span>
                                {isAuditOpen ? (
                                  <ChevronUpIcon className="w-3.5 h-3.5 text-teal-300" />
                                ) : (
                                  <ChevronDownIcon className="w-3.5 h-3.5 text-teal-300" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Evaluation Score Alignment Box */}
                          <div className="lg:col-span-7 bg-slate-50/90 rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                              <div className="flex items-center gap-2">
                                <ChartBarIcon className="w-4 h-4 text-teal-700" />
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                  Evaluation Score Alignment
                                </h3>
                              </div>
                            </div>

                            {/* Dual Metric KPI Stat Cards */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* Self Score Card */}
                              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                                  <span>Self Score</span>
                                  <span className="text-slate-400">Submitted</span>
                                </div>
                                <div className="flex items-baseline justify-between">
                                  <span className="text-2xl font-black text-slate-900">{itemSelfScore.toFixed(1)}%</span>
                                  <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                                    Grade {itemSelfRating.letterGrade || itemSelfRating.grade}
                                  </span>
                                </div>
                              </div>

                              {/* Manager Final Card */}
                              <div className="bg-white rounded-xl p-3.5 border border-teal-200/80 space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold text-teal-900 uppercase">
                                  <span>Manager Final</span>
                                  <span className={itemMgrScore !== null ? 'text-emerald-600 font-extrabold' : 'text-amber-600 font-extrabold'}>
                                    {itemMgrScore !== null ? 'Published' : 'In Review'}
                                  </span>
                                </div>
                                <div className="flex items-baseline justify-between">
                                  <span className="text-2xl font-black text-teal-950">
                                    {itemMgrScore !== null ? `${itemMgrScore.toFixed(1)}%` : '—'}
                                  </span>
                                  <span className="text-xs font-bold text-teal-900 bg-teal-100/70 px-2 py-0.5 rounded-md border border-teal-300/80">
                                    Grade {itemRating.letterGrade || itemRating.grade}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Consensus Status Bar */}
                            <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-500 text-[11px] font-bold">Consensus Status:</span>
                              {itemMgrScore !== null ? (
                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${Math.abs(itemMgrScore - itemSelfScore) <= 2
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : itemMgrScore > itemSelfScore
                                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}>
                                  {itemMgrScore === itemSelfScore
                                    ? '100% Aligned Consensus'
                                    : `${itemMgrScore > itemSelfScore ? '+' : ''}${(itemMgrScore - itemSelfScore).toFixed(1)}% Manager Adjustment`}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Awaiting Manager Official Scoring</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Detailed Performance Deliverables Breakdown Table */}
                        {isAuditOpen && (
                          <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                <TableCellsIcon className="w-4 h-4 text-teal-700" />
                                Deliverable Audit Breakdown ({itemTitle} • {itemPeriodTime})
                              </h3>
                              <button
                                type="button"
                                onClick={() => setHistoryAuditBreakdownOpen(prev => ({ ...prev, [r.id]: false }))}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 transition cursor-pointer"
                              >
                                Close Breakdown ▲
                              </button>
                            </div>

                            <div className="rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-200/90 bg-white">
                              {itemCategories.map((cat, catIdx) => {
                                const catEarned = cat.kpis.reduce((sum, k) => {
                                  const selfRes = r.kpiResponses?.[k.id];
                                  return sum + (selfRes?.earnedScore !== undefined ? Number(selfRes.earnedScore) : 0);
                                }, 0);
                                const isCatExpanded = Boolean(expandedAuditCategories[`${r.id}_${cat.id || catIdx}`]);

                                return (
                                  <div key={cat.id} className="bg-white">
                                    {/* Modern Category Subheading Banner (Muted Dull Slate Theme) */}
                                    <div
                                      onClick={() => setExpandedAuditCategories(prev => ({ ...prev, [`${r.id}_${cat.id || catIdx}`]: !prev[`${r.id}_${cat.id || catIdx}`] }))}
                                      className="bg-slate-100/90 hover:bg-slate-200/70 text-slate-800 px-4 py-2.5 cursor-pointer transition-colors duration-150 select-none group flex items-center justify-between gap-3 w-full"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span
                                          className="p-1 rounded-md text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200/70 transition-colors shrink-0"
                                          title={isCatExpanded ? "Collapse category details" : "Expand category details"}
                                        >
                                          <ChevronDownIcon className={`w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-transform duration-200 ${isCatExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                        </span>
                                        <span className="w-5 h-5 rounded-md bg-slate-300/90 text-slate-700 border border-slate-300 flex items-center justify-center font-bold text-[11px] shadow-2xs shrink-0">
                                          {catIdx + 1}
                                        </span>
                                        <span className="font-semibold text-xs text-slate-800 group-hover:text-slate-900 transition-colors truncate">
                                          {cat.name}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200/90 px-2 py-0.5 rounded-full shadow-2xs shrink-0">
                                          {cat.kpis.length} {cat.kpis.length === 1 ? 'deliverable' : 'deliverables'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200/90 px-2.5 py-0.5 rounded-full shadow-2xs whitespace-nowrap">
                                          Earned: <strong className="text-slate-800 font-bold">{catEarned.toFixed(2)}%</strong> / {cat.weightage}%
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-700 bg-slate-200/80 border border-slate-300/80 px-2.5 py-0.5 rounded-full shadow-2xs whitespace-nowrap">
                                          {cat.weightage}% WeightAge
                                        </span>
                                      </div>
                                    </div>

                                    {/* Deliverables Table for Expanded Category */}
                                    {isCatExpanded && (
                                      <div className="overflow-x-auto border-t border-slate-200/80">
                                        <table className="w-full text-left text-xs border-collapse">
                                          <thead className="bg-slate-50/95 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider select-none">
                                            <tr>
                                              <th className="px-4 py-2.5 text-left whitespace-nowrap">Deliverable Metric</th>
                                              <th className="px-2.5 py-2.5 text-center whitespace-nowrap">Target</th>
                                              <th className="px-2 py-2.5 text-center whitespace-nowrap">Weight</th>
                                              <th className="px-3 py-2.5 text-center whitespace-nowrap">Self Actual</th>
                                              <th className="px-2.5 py-2.5 text-center whitespace-nowrap">Self Score</th>
                                              <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Self Remarks</th>
                                              <th className="px-3 py-2.5 text-center bg-teal-50/50 text-teal-950 border-l border-teal-200/60 whitespace-nowrap font-extrabold">Mgr Actual</th>
                                              <th className="px-2.5 py-2.5 text-center bg-teal-50/50 text-teal-950 whitespace-nowrap font-extrabold">Mgr Score</th>
                                              <th className="px-3.5 py-2.5 text-left bg-teal-50/50 text-teal-950 whitespace-nowrap font-extrabold">Mgr Remarks</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 bg-white">
                                            {cat.kpis.map((kpi) => {
                                              const selfRes = r.kpiResponses?.[kpi.id];
                                              const selfActual = selfRes?.actualValue !== undefined && selfRes?.actualValue !== null && selfRes?.actualValue !== ''
                                                ? selfRes.actualValue
                                                : '—';
                                              const selfScore = selfRes?.earnedScore !== undefined ? selfRes.earnedScore : 0;
                                              const selfRemarks = selfRes?.employeeRemarks || '';

                                              const mgrActual = selfRes?.managerActualValue !== undefined && selfRes?.managerActualValue !== null && selfRes?.managerActualValue !== ''
                                                ? selfRes.managerActualValue
                                                : '—';
                                              const mgrScore = selfRes?.managerScore !== undefined && selfRes?.managerScore !== null
                                                ? Number(selfRes.managerScore)
                                                : null;
                                              const mgrRemarks = selfRes?.managerRemarks || '';
                                              const isNeg = isNegativeKpi(kpi);

                                              return (
                                                <tr key={kpi.id} className={`transition ${isNeg ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-slate-50/80'}`}>
                                                  <td className="px-4 py-2.5 align-middle max-w-[240px]">
                                                    <span className={`text-xs ${isNeg ? 'font-bold text-rose-600' : 'font-bold text-slate-800'}`}>{kpi.name}</span>
                                                    {kpi.description && (
                                                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{kpi.description}</div>
                                                    )}
                                                  </td>
                                                  <td className={`px-2.5 py-2.5 text-center align-middle font-bold text-xs whitespace-nowrap ${isNeg ? 'text-rose-600' : 'text-slate-600'}`}>
                                                    {(() => {
                                                      const t = String(kpi.targetFromManager !== undefined && kpi.targetFromManager !== '' ? kpi.targetFromManager : (kpi.targetValue ?? '')).trim();
                                                      const u = String(kpi.unit || '').trim();
                                                      if (!t) return '—';
                                                      if (!u || t.toLowerCase().includes(u.toLowerCase())) return t;
                                                      return `${t} ${u}`;
                                                    })()}
                                                  </td>
                                                  <td className="px-2 py-2.5 text-center align-middle font-semibold text-slate-600 whitespace-nowrap">
                                                    {kpi.weightage || Math.round(cat.weightage / Math.max(1, cat.kpis.length))}%
                                                  </td>
                                                  <td className="px-3 py-2.5 text-center align-middle text-slate-800 whitespace-nowrap">
                                                    {(() => {
                                                      if (selfActual === '—') return <span className="text-slate-400 font-bold">—</span>;
                                                      const parsedT = parseTargetExpression(kpi.targetFromManager, kpi.targetValue || 1);
                                                      const numSelf = parseFloat(String(selfActual));
                                                      const isOverT = !isNaN(numSelf) && (isNeg ? numSelf > parsedT.threshold : (parsedT.threshold > 0 && numSelf > parsedT.threshold));
                                                      const isMetT = !isNaN(numSelf) && (isNeg ? numSelf <= parsedT.threshold : (parsedT.threshold > 0 && numSelf >= parsedT.threshold));

                                                      return (
                                                        <span className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full border text-xs ${isNeg && isOverT
                                                          ? 'bg-rose-50 text-rose-900 border-rose-300'
                                                          : isOverT
                                                            ? 'bg-emerald-50 text-emerald-950 border border-emerald-400 shadow-2xs'
                                                            : isMetT && !isNeg
                                                              ? 'bg-teal-50 text-teal-900 border border-teal-300'
                                                              : 'bg-slate-50 text-slate-900 border-slate-200'
                                                          }`}>
                                                          <span>{selfActual} {kpi.unit || ''}</span>
                                                          {isOverT && !isNeg && <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded-full">EXCEEDED</span>}
                                                          {isOverT && isNeg && <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-800 bg-rose-200/80 px-1.5 py-0.5 rounded-full">EXCEEDED TARGET</span>}
                                                        </span>
                                                      );
                                                    })()}
                                                  </td>
                                                  <td className="px-2.5 py-2.5 text-center align-middle font-extrabold text-slate-900 whitespace-nowrap">
                                                    {selfScore.toFixed(2)}%
                                                  </td>
                                                  <td className="px-3.5 py-2.5 align-middle text-xs min-w-[130px] max-w-[200px]">
                                                    <ExpandableRemarkView text={selfRemarks} fallback="—" />
                                                  </td>
                                                  <td className="px-3 py-2.5 text-center align-middle bg-teal-50/30 font-bold text-slate-900 border-l border-teal-100 whitespace-nowrap">
                                                    {(() => {
                                                      if (mgrActual === '—') return <span className="text-slate-400 font-bold">—</span>;
                                                      const parsedT = parseTargetExpression(kpi.targetFromManager, kpi.targetValue || 1);
                                                      const numMgr = parseFloat(String(mgrActual));
                                                      const isOverT = !isNaN(numMgr) && (isNeg ? numMgr > parsedT.threshold : (parsedT.threshold > 0 && numMgr > parsedT.threshold));
                                                      const isMetT = !isNaN(numMgr) && (isNeg ? numMgr <= parsedT.threshold : (parsedT.threshold > 0 && numMgr >= parsedT.threshold));
                                                      const isModified = String(mgrActual).trim() !== String(selfActual).trim();

                                                      return (
                                                        <span className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full border text-xs shadow-2xs ${isModified
                                                          ? 'bg-amber-100/90 text-amber-950 border-amber-300'
                                                          : isNeg && isOverT
                                                            ? 'bg-rose-50 text-rose-900 border-rose-300'
                                                            : isOverT
                                                              ? 'bg-teal-100/80 text-teal-950 border-teal-300'
                                                              : isMetT && !isNeg
                                                                ? 'bg-teal-50 text-teal-900 border-teal-300'
                                                                : 'bg-slate-50 text-slate-900 border-slate-200'
                                                          }`}>
                                                          <span>{mgrActual} {kpi.unit || ''}</span>
                                                          {isOverT && !isNeg && !isModified && <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded-full">EXCEEDED</span>}
                                                          {isOverT && isNeg && !isModified && <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-800 bg-rose-200/80 px-1.5 py-0.5 rounded-full">EXCEEDED TARGET</span>}
                                                        </span>
                                                      );
                                                    })()}
                                                  </td>
                                                  <td className="px-2.5 py-2.5 text-center align-middle bg-teal-50/30 whitespace-nowrap font-bold text-slate-900">
                                                    {mgrScore !== null ? `${mgrScore.toFixed(2)}%` : '—'}
                                                  </td>
                                                  <td className="px-3.5 py-2.5 align-middle bg-teal-50/30 text-xs min-w-[130px] max-w-[200px]">
                                                    <ExpandableRemarkView text={mgrRemarks} fallback="—" />
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
                          </div>
                        )}

                        {/* Leadership Feedback Box */}
                        {r.managerRemarks && (
                          <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200/80 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-teal-900 uppercase tracking-wider">
                              <SparklesIcon className="w-4 h-4 text-teal-700" />
                              Leadership Feedback ({itemTitle})
                            </div>
                            <p className="text-xs text-slate-700 italic leading-relaxed pl-5 border-l-2 border-teal-600 font-medium">
                              "{r.managerRemarks}"
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Official Performance Rating & Grading Scale Reference Matrix */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                        <AcademicCapIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">Performance Rating & Grading Scale</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Official benchmark rubric for score ranges, performance criteria, and grade tiers (Grade A to Grade E)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0 self-start sm:self-auto">
                      5-Level Standard
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 w-48 font-bold text-slate-800 whitespace-nowrap">Rating</th>
                          <th className="px-4 py-3 font-bold text-slate-800">Measure / Criteria</th>
                          <th className="px-4 py-3 w-32 text-center font-bold text-slate-800 whitespace-nowrap">Grade</th>
                          <th className="px-4 py-3 w-36 text-center font-bold text-slate-800 whitespace-nowrap">Scores</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {getRatingScale().map((tier, tierIdx) => {
                          const latestResp = allEmpResponses[0];
                          const latestScore = (latestResp?.managerScore != null
                            ? Number(latestResp.managerScore)
                            : Number(latestResp?.employeeOverallScore ?? 0));
                          const isCurrentTier = latestResp && latestScore >= tier.minScore && latestScore <= tier.maxScore;

                          return (
                            <tr
                              key={tier.letterGrade || tier.grade || tierIdx}
                              className={`transition-colors ${isCurrentTier
                                ? 'bg-teal-50/70 font-semibold'
                                : 'hover:bg-slate-50/60'
                                }`}
                            >
                              {/* Rating Name + Stars */}
                              <td className="px-4 py-3.5 align-top">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-black text-xs ${(tier.letterGrade === 'A' || tier.grade === 5 || tier.grade === 'A') ? 'text-emerald-800' :
                                      (tier.letterGrade === 'B' || tier.grade === 4 || tier.grade === 'B') ? 'text-teal-800' :
                                        (tier.letterGrade === 'C' || tier.grade === 3 || tier.grade === 'C') ? 'text-blue-800' :
                                          (tier.letterGrade === 'D' || tier.grade === 2 || tier.grade === 'D') ? 'text-amber-800' :
                                            'text-rose-800'
                                      }`}>
                                      {tier.name}
                                    </span>
                                    {isCurrentTier && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-teal-700 text-white uppercase tracking-wider">
                                        Your Level
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-0.5 text-amber-400">
                                    {[1, 2, 3, 4, 5].map(s => (
                                      s <= tier.stars ? (
                                        <StarSolid key={s} className="w-3.5 h-3.5 fill-amber-400" />
                                      ) : (
                                        <StarIcon key={s} className="w-3.5 h-3.5 text-slate-200" />
                                      )
                                    ))}
                                  </div>
                                </div>
                              </td>

                              {/* Measure Description */}
                              <td className="px-4 py-3.5 text-slate-600 leading-relaxed align-top text-[11px]">
                                {tier.description}
                              </td>

                              {/* Grade */}
                              <td className="px-4 py-3.5 text-center align-top whitespace-nowrap">
                                <div className="inline-flex items-center justify-center px-3 py-1 rounded-lg font-black text-xs bg-slate-100 text-slate-900 border border-slate-200 shadow-2xs">
                                  {tier.letterGrade || tier.grade}
                                </div>
                              </td>

                              {/* Score Range */}
                              <td className="px-4 py-3.5 text-center align-top whitespace-nowrap">
                                <span className="font-mono font-bold text-xs text-slate-800 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                                  {tier.scoreRangeText}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()))}
        </div>
      )}
      {/* 4. MANAGER REVIEW & DOWNLINE TEAMS VIEW — PEOPLEHUB CLEAN PROFESSIONAL SUITE */}
      {/* ========================================================================= */}
      {(activeRole === 'manager' || activeRole === 'downline_teams') && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Action Header: Clean Software Engineering Style Header Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                {activeRole === 'manager' ? (
                  <BriefcaseIcon className="w-5 h-5" />
                ) : (
                  <UserGroupIcon className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {activeRole === 'manager'
                      ? (isTeamLead ? 'Squad Evaluation' : 'Direct Reviews')
                      : 'Department Oversight'}
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/80 uppercase">
                    {activeRole === 'manager'
                      ? (isTeamLead ? 'Squad Desk' : 'Reviewer Desk')
                      : 'Oversight Desk'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium hidden md:inline">•</span>
                  <span className="text-xs font-medium text-slate-500 truncate">
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
                  className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
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
                    className="flex items-center gap-2 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                    <span>Assign Metrics</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Manager Reviews Queue & Calibration Desk (or Downline Team Overview) */}
          <div className="space-y-5">
            {/* Section 2.2: Advanced Filter Toolbar & Grouped Evaluation Report Table (Matching User Design) */}
            {(activeRole === 'manager' || activeRole === 'downline_teams') && (
              <div className="space-y-4 animate-in fade-in duration-200">

                {/* Row 1: Mode Navigation Pills + Date In Period (Date slightly at top & left side) */}
                <div className="flex flex-col gap-2.5 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                  {/* Top Line: Date in Period set on the left side + Month & Week dropdowns for Weekly */}
                  {activeRole !== 'downline_teams' && (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      {reportViewTab === 'weekly' ? (
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Month dropdown */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-700 font-semibold whitespace-nowrap flex items-center gap-1.5">
                              <CalendarDaysIcon className="w-4 h-4 text-teal-600" />
                              Month:
                            </span>
                            <div className="relative">
                              <select
                                value={selectedReportMonthKey}
                                onChange={e => handleReportMonthChange(e.target.value)}
                                className="h-8.5 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition cursor-pointer appearance-none shadow-2xs"
                              >
                                {availableMonths.map(m => (
                                  <option key={m.key} value={m.key}>
                                    {m.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          {/* Week dropdown (From Date - To Date) */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-700 font-semibold whitespace-nowrap">
                              Week:
                            </span>
                            <div className="relative">
                              <select
                                value={selectedWeekPeriod}
                                onChange={e => {
                                  const val = e.target.value;
                                  setSelectedWeekPeriod(val);
                                  if (val !== 'all') {
                                    setReportDateInPeriod(val);
                                  }
                                }}
                                className="h-8.5 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition cursor-pointer appearance-none shadow-2xs"
                              >
                                <option value="all">All Weeks ({frequencyCounts.weekly})</option>
                                {weeksForSelectedMonth.map(w => (
                                  <option key={w.startStr} value={w.startStr}>
                                    {w.label} {w.count ? `(${w.count})` : ''}
                                  </option>
                                ))}
                              </select>
                              <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      ) : (reportViewTab === 'monthly' || reportViewTab === 'top_monthly') ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-700 font-semibold whitespace-nowrap flex items-center gap-1.5">
                            <CalendarDaysIcon className="w-4 h-4 text-teal-600" />
                            Month:
                          </span>
                          <div className="relative">
                            <select
                              value={selectedReportMonthKey}
                              onChange={e => handleReportMonthChange(e.target.value)}
                              className="h-8.5 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition cursor-pointer appearance-none shadow-2xs"
                            >
                              <option value="all">All Months ({frequencyCounts.monthly})</option>
                              {availableMonths.map(m => (
                                <option key={m.key} value={m.key}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      ) : (reportViewTab === 'quarterly' || reportViewTab === 'top_quarterly') ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-700 font-semibold whitespace-nowrap flex items-center gap-1.5">
                            <CalendarDaysIcon className="w-4 h-4 text-teal-600" />
                            Quarter:
                          </span>
                          <div className="relative">
                            <select
                              value={selectedReportQuarterKey}
                              onChange={e => handleReportQuarterChange(e.target.value)}
                              className="h-8.5 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition cursor-pointer appearance-none shadow-2xs"
                            >
                              <option value="all">All Quarters ({frequencyCounts.quarterly})</option>
                              {availableQuarters.map(q => (
                                <option key={q.key} value={q.key}>
                                  {q.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      ) : reportViewTab === 'daily' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-700 font-semibold whitespace-nowrap flex items-center gap-1.5">
                            <CalendarDaysIcon className="w-4 h-4 text-teal-600" />
                            Date:
                          </span>
                          <div className="w-48">
                            <DatePicker
                              value={reportDateInPeriod}
                              onChange={(newDate: string) => {
                                setReportDateInPeriod(newDate);
                                setSelectedWeekPeriod('');
                              }}
                              placeholder="Select date"
                              align="left"
                              className="!h-8.5 !py-1.5 !px-3 !text-xs !rounded-lg border-slate-200 shadow-2xs font-medium"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                            <CalendarDaysIcon className="w-4 h-4 text-teal-600" />
                            {reportViewTab === 'top_annual' ? 'Annual Cycle:' : 'Period Scope:'}
                          </span>
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200">
                            {reportViewTab === 'top_annual' ? 'Full Year Performance' : `All Cycles (${frequencyCounts.all} records)`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode Navigation Pills */}
                  <div className={`flex items-center gap-1.5 flex-wrap ${activeRole !== 'downline_teams' ? 'pt-2 border-t border-slate-100' : ''}`}>
                    {reportTabs.map(tab => {
                      const isActive = (activeRole === 'downline_teams' && !['top_weekly', 'top_monthly', 'top_quarterly', 'top_annual'].includes(reportViewTab) && tab.id === 'top_weekly') || reportViewTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleSwitchReportTab(tab.id as any)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${isActive
                              ? 'bg-teal-700 text-white shadow-xs font-bold'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
                            }`}
                        >
                          <span>{tab.label}</span>
                          {tab.count !== undefined && (
                            <span
                              className={`inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold transition-colors ${isActive
                                  ? 'bg-white/20 text-white'
                                  : tab.count > 0
                                    ? tab.pending && tab.pending > 0
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                                      : 'bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              title={tab.pending ? `${tab.pending} pending review` : `${tab.count} evaluations`}
                            >
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 2: Search Input + Department + Team + Date + State Dropdowns + Clear + People Counter */}
                {activeRole !== 'downline_teams' && (
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center gap-2 flex-1 flex-wrap min-w-0">
                      {/* Search name or code */}
                      <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={mgrSearchQuery}
                          onChange={e => setMgrSearchQuery(e.target.value)}
                          placeholder="Search name or employee code..."
                          className="w-full h-8.5 pl-9 pr-7 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition shadow-2xs"
                        />
                        {mgrSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setMgrSearchQuery('')}
                            className="p-1 rounded-full text-slate-400 hover:text-slate-600 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* All departments dropdown */}
                      <div className="relative">
                        <select
                          value={reportFilterDept}
                          onChange={e => {
                            setReportFilterDept(e.target.value);
                            setReportFilterTeam('all');
                            setManagerFilterDept(e.target.value === 'all' ? '' : e.target.value);
                          }}
                          className="h-8.5 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition cursor-pointer appearance-none shadow-2xs"
                        >
                          <option value="all">All departments</option>
                          {availableFilterDepartments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* All teams dropdown */}
                      <div className="relative">
                        <select
                          value={reportFilterTeam}
                          onChange={e => setReportFilterTeam(e.target.value)}
                          className="h-8.5 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition cursor-pointer appearance-none shadow-2xs"
                        >
                          <option value="all">All teams</option>
                          {availableFilterTeams.map(team => (
                            <option key={team} value={team}>{team}</option>
                          ))}
                        </select>
                        <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* All dates / Week Days dropdown */}
                      <div className="relative">
                        <select
                          value={reportFilterDate}
                          onChange={e => setReportFilterDate(e.target.value)}
                          className="h-8.5 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition cursor-pointer appearance-none shadow-2xs"
                        >
                          <option value="all">All dates</option>
                          {availableFilterDates.map(day => (
                            <option key={day.dateStr} value={day.dateStr}>
                              {day.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Any state dropdown */}
                      <div className="relative">
                        <select
                          value={reportFilterState}
                          onChange={e => setReportFilterState(e.target.value as any)}
                          className="h-8.5 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition cursor-pointer appearance-none shadow-2xs"
                        >
                          <option value="all">Any state</option>
                          <option value="pending">Pending Review</option>
                          <option value="submitted">Submitted</option>
                          <option value="approved">Calibrated / Approved</option>
                        </select>
                        <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Clear button */}
                      {(reportFilterDept !== 'all' || reportFilterTeam !== 'all' || reportFilterDate !== 'all' || reportFilterState !== 'all' || mgrSearchQuery.trim() !== '' || Boolean(managerFilterDept)) && (
                        <button
                          type="button"
                          onClick={() => {
                            setReportFilterDept('all');
                            setReportFilterTeam('all');
                            setReportFilterDate('all');
                            setReportFilterState('all');
                            setMgrSearchQuery('');
                            setManagerFilterDept('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>

                    {/* People Count */}
                    <div className="text-xs font-bold text-slate-800 shrink-0 self-end lg:self-auto">
                      {reportFilteredResponses.length} of {activeScopedResponsesForCards.length} people
                    </div>
                  </div>
                )}

                {/* Report Section Header */}
                <div className="flex items-center gap-3 pt-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    {reportHeaderInfo.title}
                  </h4>
                  <span className="px-3 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    {reportHeaderInfo.badge}
                  </span>
                </div>

                {/* Report Content: Top Performers (Image 1) OR Empty state OR Cards OR Grouped Table */}
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
                        {reportViewTab === 'top_weekly' || reportViewTab === 'top_monthly'
                          ? topPerformersQuarterRangeText
                          : reportViewTab === 'top_quarterly'
                            ? topPerformersQuarterRangeText
                            : `1 Jan - 31 Dec ${topPerformersYear}`}
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
                              ? 'border-2 border-[#a28089] shadow-md ring-1 ring-[#a28089]/20'
                              : 'border border-slate-200/80'
                            }`}
                        >
                          {/* Column Header */}
                          <div className={`px-4 py-2.5 font-bold text-xs flex items-center justify-between ${(col as any).isSummaryYear
                              ? 'bg-[#a28089] text-white'
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
                                    {/* Team Header Banner with pastel colors matching Image 1 */}
                                    <div className={`px-2.5 py-1.5 rounded-lg ${color.bg} space-y-0.5`}>
                                      <div className={`text-[9px] font-bold uppercase tracking-wider ${color.sub}`}>
                                        {group.departmentName}
                                      </div>
                                      <div className={`text-xs font-extrabold ${color.text}`}>
                                        Team: {group.teamName}
                                      </div>
                                    </div>

                                    {/* Member Rows */}
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
                ) : reportFilteredResponses.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <UserGroupIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800 capitalize">
                        No {reportViewTab === 'all' ? 'Evaluations' : reportViewTab.replace('top_', 'Top ') + ' Evaluations'} Found
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        No team member evaluations match the current filters {reportDateInPeriod ? `for ${reportDateInPeriod}` : ''}.
                      </p>
                    </div>

                    {/* Quick navigation helpers: direct buttons so user doesn't have to search manually */}
                    <div className="flex items-center justify-center gap-2 flex-wrap max-w-lg mx-auto pt-1">
                      {reportViewTab !== 'all' && frequencyCounts.all > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSwitchReportTab('all')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#a28089] text-white rounded-lg text-xs font-semibold shadow-2xs hover:bg-[#8e6e76] cursor-pointer transition"
                        >
                          <span>View All Scoped Evaluations ({frequencyCounts.all})</span>
                        </button>
                      )}

                      {reportViewTab !== 'quarterly' && frequencyCounts.quarterly > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSwitchReportTab('quarterly')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs hover:bg-slate-50 cursor-pointer transition"
                        >
                          <span>Jump to Quarterly ({frequencyCounts.quarterly})</span>
                        </button>
                      )}

                      {reportViewTab !== 'monthly' && frequencyCounts.monthly > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSwitchReportTab('monthly')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs hover:bg-slate-50 cursor-pointer transition"
                        >
                          <span>Jump to Monthly ({frequencyCounts.monthly})</span>
                        </button>
                      )}

                      {reportViewTab !== 'weekly' && frequencyCounts.weekly > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSwitchReportTab('weekly')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs hover:bg-slate-50 cursor-pointer transition"
                        >
                          <span>Jump to Weekly ({frequencyCounts.weekly})</span>
                        </button>
                      )}

                      {reportViewTab !== 'daily' && frequencyCounts.daily > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSwitchReportTab('daily')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs hover:bg-slate-50 cursor-pointer transition"
                        >
                          <span>Jump to Daily ({frequencyCounts.daily})</span>
                        </button>
                      )}

                      {/* Reset Filters button */}
                      <button
                        type="button"
                        onClick={() => {
                          setReportFilterDept('all');
                          setReportFilterTeam('all');
                          setReportFilterDate('all');
                          setReportFilterState('all');
                          setMgrSearchQuery('');
                          setManagerFilterDept('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs hover:bg-slate-50 cursor-pointer"
                      >
                        <span>Reset Filters</span>
                      </button>
                    </div>
                  </div>
                ) : mgrViewMode === 'cards' ? (
                  /* Cards Mode */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reportFilteredResponses.map(r => {
                      const { employeeCode, employeeName, teamName, departmentName } = getEmployeeDisplayInfo(r);
                      const isCalibrated = r.managerScore != null && (r.status as string) !== 'manager_review' && (r.status as string) !== 'Submitted to Manager';
                      const initials = (employeeName || 'EM').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();

                      return (
                        <div
                          key={r.id}
                          className="group relative bg-white hover:bg-slate-50/50 rounded-2xl p-5 border border-slate-200/90 hover:border-teal-300 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-900 transition">
                                    {employeeName || r.employeeName}
                                  </h4>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                      #{employeeCode}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                                      {departmentName} • {teamName}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {renderStatusBadge(r.status)}
                            </div>

                            <div className="text-xs text-slate-500 italic flex items-center gap-1.5 flex-wrap">
                              <span>{r.designation || 'Team Member'}</span>
                              {(r.periodName || (r as any).form) && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60 text-[10px] not-italic">
                                    {r.periodName || (r as any).form}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Self Score</span>
                                <span className="text-sm font-bold text-slate-800">
                                  {r.employeeOverallScore != null ? `${Number(r.employeeOverallScore).toFixed(1)}%` : '0.0%'}
                                </span>
                              </div>
                              <div className="space-y-0.5 border-l border-slate-200 pl-2.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Manager Score</span>
                                <span className="text-sm font-bold text-teal-700">
                                  {r.managerScore != null ? `${Number(r.managerScore).toFixed(1)}%` : 'Pending'}
                                </span>
                              </div>
                              <div className="space-y-0.5 border-l border-slate-200 pl-2.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Grade</span>
                                {r.managerScore != null ? (
                                  (() => {
                                    const cardRating = getRatingForScore(Number(r.managerScore));
                                    return (
                                      <div className="leading-tight">
                                        <span className="text-sm font-black text-emerald-800 block leading-tight">{cardRating.letterGrade || cardRating.grade}</span>
                                        <span className="text-[9px] font-medium text-emerald-700 block truncate leading-tight" title={cardRating.name}>{cardRating.name}</span>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleSelectMgrResponse(r)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                            >
                              <PencilSquareIcon className="w-3.5 h-3.5" />
                              <span>{isCalibrated ? 'Recalibrate' : 'Review & Score'}</span>
                            </button>
                              {!isCalibrated && r.managerScore == null && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMgrResponseRow(r)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-200"
                                  title="Delete evaluation record"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Grouped Report Table Matching Image 2 Exactly */
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
                      <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-white text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-4 w-[30%]">NAME OF THE EMPLOYEE</th>
                          <th className="py-3 px-4 text-center w-[24%]">EVALUATION PERIOD / DATE</th>
                          <th className="py-3 px-4 text-center w-[12%]">{reportViewTab === 'all' ? 'SELF SCORE' : formattedDateColumnHeader}</th>
                          <th className="py-3 px-4 text-center w-[12%]">AVERAGE SCORE</th>
                          <th className="py-3 px-4 text-center w-[11%]">STATUS</th>
                          <th className="py-3 px-4 text-right w-[11%]">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedReportHierarchy.map(deptGroup => (
                          <React.Fragment key={deptGroup.departmentName}>
                            {/* Department Group Banner */}
                            <tr>
                              <td colSpan={6} className="p-0">
                                <div className="bg-[#a28089] text-white px-4 py-2.5 flex items-center gap-2 font-bold text-xs">
                                  <FolderIcon className="w-4 h-4 text-white" />
                                  <span>{deptGroup.departmentName}</span>
                                  <span className="font-normal opacity-90">{deptGroup.totalPeople} people</span>
                                </div>
                              </td>
                            </tr>

                            {/* Teams inside Department */}
                            {deptGroup.teams.map((teamGroup, tIdx) => {
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
                              const teamPendingCount = teamGroup.members.filter(m =>
                                (m.response.status === 'manager_review' || m.response.status === 'Submitted to Manager' || String(m.response.status || '').toLowerCase().includes('submitted')) &&
                                m.response.managerScore == null
                              ).length;

                              return (
                                <React.Fragment key={teamGroup.teamName}>
                                  {/* Team Sub-banner with Deliverables Matrix Controls */}
                                  <tr>
                                    <td colSpan={6} className="p-0">
                                      <div className={`px-4 py-2 flex items-center justify-between gap-3 font-bold text-xs ${tIdx % 2 === 0
                                          ? 'bg-[#f3edf5] text-[#5e2b6b]'
                                          : 'bg-[#eef5ee] text-[#2c592e]'
                                        }`}>
                                        <div className="flex items-center gap-2 min-w-0">
                                          <UserGroupIcon className="w-4 h-4 shrink-0" />
                                          <span className="truncate">Team: {teamGroup.teamName}</span>
                                          <span className="text-[11px] font-normal opacity-80 shrink-0">
                                            ({teamGroup.members.length} {teamGroup.members.length === 1 ? 'person' : 'people'})
                                          </span>
                                          {teamPendingCount > 0 && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs animate-pulse shrink-0">
                                              <BellAlertIcon className="w-3 h-3 text-white" />
                                              <span>{teamPendingCount} Submissions Awaiting Approval</span>
                                            </span>
                                          )}
                                        </div>

                                        {(activeRole === 'manager' || activeRole === 'downline_teams' || canCreateMetrics) && (
                                          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                            {teamCycle ? (
                                              <>
                                                {/* Matrix Status Badge */}
                                                <span
                                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 shadow-2xs ${cycleLockedInfo.isLocked
                                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                                    }`}
                                                  title={
                                                    cycleLockedInfo.isLocked
                                                      ? `Locked (${cycleLockedInfo.activeCount} active evaluations in progress)`
                                                      : 'Active Deliverables Matrix (Editable)'
                                                  }
                                                >
                                                  <span className={`w-1.5 h-1.5 rounded-full ${cycleLockedInfo.isLocked ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                                  <span>{cycleLockedInfo.isLocked ? 'Locked' : 'Matrix: 100%'}</span>
                                                </span>

                                                {/* Edit Matrix */}
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenMgrEditMatrixModal(teamCycle)}
                                                  disabled={cycleLockedInfo.isLocked}
                                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${cycleLockedInfo.isLocked
                                                      ? 'bg-white/50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                                      : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 shadow-2xs'
                                                    }`}
                                                  title={cycleLockedInfo.isLocked ? 'Matrix locked because evaluations are in progress' : 'Edit Deliverables Matrix'}
                                                >
                                                  <PencilSquareIcon className="w-3.5 h-3.5 text-slate-500" />
                                                  <span>Edit</span>
                                                </button>

                                                {/* Delete Matrix */}
                                                <button
                                                  type="button"
                                                  onClick={() => handleMgrDeleteMatrix(teamCycle)}
                                                  disabled={cycleLockedInfo.isLocked}
                                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${cycleLockedInfo.isLocked
                                                      ? 'bg-white/50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 shadow-2xs'
                                                    }`}
                                                  title={cycleLockedInfo.isLocked ? 'Matrix locked because evaluations are in progress' : 'Delete Deliverables Matrix'}
                                                >
                                                  <TrashIcon className="w-3.5 h-3.5" />
                                                  <span>Delete</span>
                                                </button>
                                              </>
                                            ) : (
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-medium opacity-70">No Matrix Configured</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenMgrCreateModal(teamGroup.teamName)}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-teal-700 bg-white hover:bg-teal-50 border border-teal-300 shadow-2xs transition cursor-pointer"
                                                >
                                                  <span>+ Assign Matrix</span>
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Member Rows in Team */}
                                  {teamGroup.members.map(member => {
                                    const isSubmittedPending = Boolean(
                                      (member.response.status === 'manager_review' || member.response.status === 'Submitted to Manager' || String(member.response.status || '').toLowerCase().includes('submitted')) &&
                                      member.response.managerScore == null
                                    );

                                    return (
                                      <tr
                                        key={member.response.id || member.employeeCode}
                                        className={`border-b border-slate-100 hover:bg-slate-50/80 transition ${isSubmittedPending ? 'bg-teal-50/20 border-l-4 border-l-teal-600' : 'bg-white'
                                          }`}
                                      >
                                        {/* 1. Name of the employee with avatar */}
                                        <td className="py-3.5 px-4">
                                          <div className="flex items-center gap-3">
                                            <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${member.avatarBg}`}>
                                              {member.initials}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                                {member.rank && (
                                                  <span className="font-bold text-xs text-amber-600 mr-0.5">
                                                    {member.rank === 1 ? '🥇 #1' : member.rank === 2 ? '🥈 #2' : member.rank === 3 ? '🥉 #3' : `#${member.rank}`}
                                                  </span>
                                                )}
                                                <span className={`font-semibold text-xs ${isSubmittedPending ? 'text-teal-950 font-bold' : 'text-slate-900'}`}>
                                                  {member.employeeName}
                                                </span>
                                                <span className="text-xs text-slate-400 font-normal">
                                                  (Emp Code {member.employeeCode})
                                                </span>
                                                {isSubmittedPending && (
                                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300 shrink-0 inline-flex items-center gap-1 shadow-2xs animate-pulse">
                                                    <SparklesIcon className="w-3 h-3 text-teal-700" />
                                                    <span>Ready for Review</span>
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </td>

                                        {/* 2. Evaluation Period / Date Badge */}
                                        <td className="py-3.5 px-4 text-center">
                                          <div className="inline-flex flex-col items-center gap-0.5">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border shadow-2xs ${member.periodInfo?.freqColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                              <CalendarDaysIcon className="w-3 h-3 shrink-0" />
                                              <span>{member.periodInfo?.freqLabel || 'Evaluation'}</span>
                                            </span>
                                            <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                                              {member.periodInfo?.dateText}
                                            </span>
                                          </div>
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
                                          {renderStatusBadge(member.response.status)}
                                        </td>

                                        {/* 6. Action Button */}
                                        <td className="py-3.5 px-4 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => handleSelectMgrResponse(member.response)}
                                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs ${isSubmittedPending
                                                  ? 'bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white ring-2 ring-teal-500/30'
                                                  : member.isCalibrated
                                                    ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                                                    : 'bg-teal-700 hover:bg-teal-800 text-white'
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
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
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
                                <div className="flex items-center gap-3">
                                  <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-teal-700 to-slate-800 text-white font-medium text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                    {initials}
                                  </div>
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
                                      {r.designation && r.designation.toLowerCase() !== 'team member' && (
                                        <>
                                          <span className="text-slate-300">•</span>
                                          <span className="text-slate-500 font-normal">{r.designation}</span>
                                        </>
                                      )}
                                    </div>
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
                                {renderStatusBadge(r.status)}
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
        const { employeeCode, employeeName, teamName } = getEmployeeDisplayInfo(selectedMgrResponse!);
        const empScore = selectedMgrResponse!.employeeOverallScore != null ? Number(selectedMgrResponse!.employeeOverallScore) : 0;
        const rating = getRatingForScore(mgrScore);
        const cycleForResp = cycles.find(c => c.id === selectedMgrResponse!.cycleId);
        const cyclePeriod = cycleForResp?.periodName || (selectedMgrResponse as any)?.periodName || 'Active Cycle';

        const rawStatus = String(selectedMgrResponse!.status || '').toLowerCase().trim();
        const isPendingManagerReview = Boolean(
          rawStatus === 'manager_review' ||
          rawStatus === 'submitted to manager' ||
          rawStatus.includes('submitted')
        );

        const isAlreadyCalibrated = Boolean(
          rawStatus === 'approved' ||
          rawStatus === 'sm_final_approval' ||
          rawStatus === 'completed' ||
          rawStatus.includes('calibrated') ||
          (selectedMgrResponse!.managerScore != null && !isPendingManagerReview)
        );

        const isReadOnly = activeRole === 'downline_teams' || selectedMgrResponse!.status === 'sm_final_approval';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-[96vw] xl:max-w-[1440px] my-auto overflow-hidden flex flex-col max-h-[92vh]">

              {/* Modal Header: Candidate Profile Info & KPI Telemetry */}
              <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
                {/* Left: Employee Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-700 to-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {(employeeName || 'EM').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
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
                      {renderStatusBadge(selectedMgrResponse!.status)}
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
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Self Score</span>
                      <span className="text-xs font-bold text-slate-700">{empScore.toFixed(1)}%</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 block">
                        {isPendingManagerReview ? 'Calibrated Score' : 'Manager Score'}
                      </span>
                      <span className="text-sm font-black text-teal-900">{mgrScore.toFixed(1)}%</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 block">Grade</span>
                      <span className="text-sm font-black text-emerald-800 block leading-tight">{rating.letterGrade || rating.grade}</span>
                      <span className="text-[10px] font-medium text-emerald-700 block leading-tight">{rating.name}</span>
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
                    <span className="text-[9px] uppercase text-slate-400 block font-semibold">Self</span>
                    <span className="text-xs font-bold text-slate-800">{empScore.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-teal-700 block font-semibold">Manager</span>
                    <span className="text-xs font-bold text-teal-900">{mgrScore.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-emerald-700 block font-semibold">Grade</span>
                    <span className="text-xs font-black text-emerald-800 block leading-tight">{rating.letterGrade || rating.grade}</span>
                    <span className="text-[9px] font-medium text-emerald-700 block leading-tight">{rating.name}</span>
                  </div>
                </div>

                {/* Categories Loop */}
                {selectedMgrCategories.map(cat => {
                  let catTotalMgrEarned = 0;
                  cat.kpis.forEach(kpi => {
                    const respItem = selectedMgrResponse!.kpiResponses?.[kpi.id];
                    const empActual = respItem?.actualValue ?? '';
                    const curMgrActual = mgrKpiActuals[kpi.id] !== undefined ? mgrKpiActuals[kpi.id] : empActual;
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
                        <table className="w-full text-left text-xs min-w-[880px] table-auto">
                          <thead className="bg-white text-slate-400 font-semibold border-b border-slate-100 text-[11px] uppercase tracking-wider">
                            <tr>
                              <th className="px-5 py-3 min-w-[200px]">Deliverable</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[85px]">Target</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[85px]">Weight</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[95px]">Actual PM</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[95px]">Earned</th>
                              <th className="px-4 py-3 min-w-[160px] max-w-[220px]">Employee Remarks</th>
                              <th className="px-3 py-3 text-center min-w-[150px] bg-slate-50/50 text-slate-700">
                                {isReadOnly ? 'Manager Goal & Score' : 'Manager Calibration'}
                              </th>
                              <th className="px-5 py-3 min-w-[190px]">
                                Manager Remarks
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {cat.kpis.map(kpi => {
                              const respItem = selectedMgrResponse!.kpiResponses?.[kpi.id];
                              const empActual = respItem?.actualValue ?? '';
                              const currentMgrActual = mgrKpiActuals[kpi.id] !== undefined ? mgrKpiActuals[kpi.id] : empActual;
                              const calcEmp = calculateKPIScore(kpi, empActual);
                              const calcMgr = calculateKPIScore(kpi, currentMgrActual);
                              const currentMgrRemark = mgrKpiRemarks[kpi.id] ?? (respItem?.managerRemarks || '');
                              const isGoalModified = String(currentMgrActual).trim() !== String(empActual).trim();
                              const parsedTarget = parseTargetExpression(kpi.targetFromManager, kpi.targetValue || 1);
                              const targetThreshold = parsedTarget.threshold;

                              const isNeg = isNegativeKpi(kpi);

                              return (
                                <tr key={kpi.id} className={`transition-colors ${isNeg ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-slate-50/50'}`}>
                                  {/* Deliverable Specification */}
                                  <td className="px-5 py-3.5">
                                    <div className={`text-xs ${isNeg ? 'font-bold text-rose-600' : 'font-semibold text-slate-900'}`}>
                                      {kpi.name}
                                    </div>
                                    {kpi.description && (
                                      <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">{kpi.description}</div>
                                    )}
                                  </td>

                                  {/* Target Goal (Clean text, no bulky box) */}
                                  <td className={`px-3 py-3.5 text-center font-bold text-xs whitespace-nowrap ${isNeg ? 'text-rose-600' : 'text-slate-700'}`}>
                                    {kpi.targetFromManager}
                                  </td>

                                  {/* Target Score */}
                                  <td className="px-3 py-3.5 text-center text-slate-600 font-medium text-xs whitespace-nowrap">
                                    {kpi.targetScore}%
                                  </td>

                                  {/* Actual PM (Clean text with unit + Highlight if exceeding target) */}
                                  <td className="px-3 py-3.5 text-center text-xs whitespace-nowrap">
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
                                  </td>

                                  {/* Earned Score (Clean green font) */}
                                  <td className="px-3 py-3.5 text-center font-bold text-teal-700 font-mono text-xs whitespace-nowrap">
                                    {calcEmp.earnedScore.toFixed(2)}%
                                  </td>

                                  {/* Employee Remarks */}
                                  <td className="px-4 py-3.5 text-slate-600 text-[11px]">
                                    <ExpandableRemarkView text={respItem?.employeeRemarks || ''} fallback="—" />
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
                                                  min="0"
                                                  value={currentMgrActual}
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

                                  {/* Manager Remarks Column */}
                                  <td className="px-5 py-3.5 min-w-[200px]">
                                    {isReadOnly ? (
                                      <ExpandableRemarkView text={currentMgrRemark} fallback="—" />
                                    ) : (
                                      <ExpandableRemarkInput
                                        value={currentMgrRemark}
                                        onChange={val => handleMgrRowRemarkChange(kpi.id, val)}
                                        placeholder={isGoalModified ? 'Reason for goal change...' : 'Add manager remarks...'}
                                        className={isGoalModified && !currentMgrRemark.trim()
                                          ? 'bg-amber-50/90 border-2 border-amber-400 focus:border-amber-600 text-slate-900 placeholder:text-amber-700'
                                          : 'bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-500 text-slate-800'}
                                      />
                                    )}
                                  </td>
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
                    <span>Overall Manager Evaluation Summary & Feedback</span>
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
                      placeholder="Enter comprehensive performance evaluation summary, key strengths, growth areas, and commendations..."
                      className="w-full p-3.5 bg-slate-50/50 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition resize-none placeholder:text-slate-400"
                    />
                  )}
                </div>
              </div>

              {/* Modal Sticky Footer */}
              <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Total Score:</span>
                  <span className="font-bold text-slate-900 text-sm">{mgrScore.toFixed(1)}%</span>
                  <span className="text-slate-300 mx-1">•</span>
                  <span className="text-slate-500">Grade:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80 text-xs inline-flex items-center gap-1.5">
                    <strong className="font-black text-emerald-950">{rating.letterGrade || rating.grade}</strong>
                    <span className="text-[11px] text-emerald-700 font-medium">({rating.name})</span>
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

                      {(() => {
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
      {/* 5. MANAGER CREATE & ASSIGN METRICS MODAL DIALOG */}
      {/* ========================================================================= */}
      {isMgrCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-6xl xl:max-w-7xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <PlusIcon className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Assign Performance Metrics
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/80">
                      Reporting Manager
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Configure period, direct reports & deliverable targets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMgrCreateModalOpen(false);
                  setMgrModalEmpSearch('');
                }}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleMgrSubmitAssignment} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Step 1: Target Team, Frequency & Period Configuration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
                      Step 1
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">
                      Team & Evaluation Period
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/80">
                    {mgrAssignEmpIds.length} Selected
                  </span>
                </div>

                {/* Unified Configuration Container */}
                <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
                  {/* Row 1: Team & Period Frequency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 1. Target Department / Team */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Department / Team <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={mgrAssignTeamId}
                        onChange={e => handleMgrTeamChange(e.target.value)}
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs cursor-pointer"
                      >
                        {managerDepartments.length > 1 && (
                          <option value="all_teams">
                            All Subordinates
                          </option>
                        )}
                        {managerDepartments.map(dept => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                        {managerDepartments.length === 0 && (
                          <option value="all_teams">All Subordinates</option>
                        )}
                      </select>
                    </div>

                    {/* 2. Frequency / Period Type Selector */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Frequency <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={mgrPeriodType}
                        onChange={e => {
                          const newType = e.target.value as any;
                          setMgrPeriodType(newType);
                          syncPeriodAndFormName(newType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                        }}
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs cursor-pointer"
                      >
                        <option value="quarterly">Quarterly (Stage 1 - 4)</option>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly (Date Range)</option>
                        <option value="daily">Daily (Due Date)</option>
                      </select>
                    </div>

                    {/* 3. Dynamic Sub-period Inputs */}
                    {mgrPeriodType === 'quarterly' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Period / Stage <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={mgrPeriodQuarter}
                            onChange={e => {
                              const newQ = Number(e.target.value);
                              setMgrPeriodQuarter(newQ);
                              syncPeriodAndFormName(mgrPeriodType, newQ, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs cursor-pointer"
                          >
                            {QUARTERS_INFO.map(q => (
                              <option key={q.q} value={q.q}>
                                {q.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">Year</label>
                          <input
                            type="number"
                            value={mgrPeriodYear}
                            onChange={e => {
                              const newYr = Number(e.target.value);
                              setMgrPeriodYear(newYr);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, newYr, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs"
                          />
                        </div>
                      </>
                    )}

                    {mgrPeriodType === 'monthly' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Month <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={mgrPeriodMonth}
                            onChange={e => {
                              const newM = Number(e.target.value);
                              setMgrPeriodMonth(newM);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, newM, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs cursor-pointer"
                          >
                            {MONTH_NAMES.map((name, idx) => (
                              <option key={name} value={idx + 1}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">Year</label>
                          <input
                            type="number"
                            value={mgrPeriodYear}
                            onChange={e => {
                              const newYr = Number(e.target.value);
                              setMgrPeriodYear(newYr);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, newYr, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs"
                          />
                        </div>
                      </>
                    )}

                    {mgrPeriodType === 'weekly' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            From Date <span className="text-rose-500">*</span>
                          </label>
                          <DatePicker
                            value={mgrPeriodFromDate}
                            onChange={(newFrom: string) => {
                              setMgrPeriodFromDate(newFrom);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, newFrom, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            placeholder="Select From Date"
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            To Date <span className="text-rose-500">*</span>
                          </label>
                          <DatePicker
                            value={mgrPeriodToDate}
                            onChange={(newTo: string) => {
                              setMgrPeriodToDate(newTo);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, newTo, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            placeholder="Select To Date"
                            className="w-full"
                          />
                        </div>
                      </>
                    )}

                    {mgrPeriodType === 'daily' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Due Date <span className="text-rose-500">*</span>
                        </label>
                        <DatePicker
                          value={mgrPeriodDueDate}
                          onChange={(newDue: string) => {
                            setMgrPeriodDueDate(newDue);
                            syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, newDue, mgrAssignTeamId);
                          }}
                          placeholder="Select Due Date"
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Clean Inline Editable Form Title Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 py-2 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <label className="text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
                        <PencilSquareIcon className="w-3.5 h-3.5 text-teal-600" />
                        <span>Form Title:</span>
                      </label>
                      <input
                        type="text"
                        value={mgrAssignFormName}
                        onChange={e => setMgrAssignFormName(e.target.value)}
                        placeholder="Evaluation Form Title"
                        className="flex-1 min-w-[220px] h-7 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 shadow-2xs transition"
                      />
                    </div>
                    {mgrAssignPeriod && (
                      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                        <span className="text-[10px] text-slate-400 font-normal">Period:</span>
                        <span className="text-[11px] font-normal text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                          {mgrAssignPeriod}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Subordinates Multi-Select Box */}
                  {(() => {
                    const baseTeamMembers = (mgrAssignTeamId === 'all_teams'
                      ? managerAssignableEmployees
                      : managerAssignableEmployees.filter((e: any) => (e.department || e.team || '').toLowerCase() === mgrAssignTeamId.toLowerCase())
                    ).filter(isEmployeeActive);

                    const filteredMembers = mgrModalEmpSearch.trim()
                      ? baseTeamMembers.filter((e: any) => {
                        const q = mgrModalEmpSearch.toLowerCase();
                        const name = `${e.first_name || ''} ${e.last_name || ''} ${e.name || ''}`.toLowerCase();
                        const id = String(e.employee_id || e.id || '').toLowerCase();
                        const des = String(e.designation || e.role || '').toLowerCase();
                        return name.includes(q) || id.includes(q) || des.includes(q);
                      })
                      : baseTeamMembers;

                    const alreadyAssignedCount = baseTeamMembers.filter((m: any) => isEmpAlreadyAssignedForPeriod(String(m.employee_id || m.id))).length;
                    const assignableMembers = baseTeamMembers.filter((m: any) => !isEmpAlreadyAssignedForPeriod(String(m.employee_id || m.id)));
                    const activeSelectedCount = mgrAssignEmpIds.filter(id => assignableMembers.some((m: any) => String(m.employee_id || m.id) === id)).length;

                    return (
                      <div className="pt-3 border-t border-slate-200/70 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-800">
                              Assign Members
                            </span>
                            <span className="text-[10px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                              {activeSelectedCount} of {assignableMembers.length} available selected
                            </span>
                            {alreadyAssignedCount > 0 && (
                              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs flex items-center gap-1">
                                <span>🔒</span>
                                <span>{alreadyAssignedCount} already booked ({mgrPeriodType === 'quarterly' ? `Stage ${mgrPeriodQuarter}` : 'this period'})</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {baseTeamMembers.length > 4 && (
                              <div className="relative">
                                <input
                                  type="text"
                                  value={mgrModalEmpSearch}
                                  onChange={e => setMgrModalEmpSearch(e.target.value)}
                                  placeholder="Search member..."
                                  className="w-36 sm:w-44 h-7 pl-2.5 pr-2 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20"
                                />
                              </div>
                            )}

                            <button
                              type="button"
                              disabled={assignableMembers.length === 0}
                              onClick={() => handleMgrToggleSelectAll(baseTeamMembers)}
                              className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border shadow-2xs transition cursor-pointer ${assignableMembers.length === 0
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : 'text-teal-700 hover:text-teal-800 bg-white border-teal-200 hover:bg-teal-50/50'
                                }`}
                            >
                              {(() => {
                                if (assignableMembers.length === 0) return 'All Booked';
                                const assignableIds = assignableMembers.map((e: any) => String(e.employee_id || e.id)).filter(Boolean);
                                const allSelected = assignableIds.length > 0 && assignableIds.every((id: string) => mgrAssignEmpIds.includes(id));
                                return allSelected ? 'Deselect All' : 'Select All';
                              })()}
                            </button>
                          </div>
                        </div>

                        {filteredMembers.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2 text-center">
                            {baseTeamMembers.length === 0 ? 'No team members found under this department.' : 'No members match search query.'}
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                            {filteredMembers.map((emp: any) => {
                              const empId = String(emp.employee_id || emp.id);
                              const isAlreadyAssigned = isEmpAlreadyAssignedForPeriod(empId);
                              const isSelected = !isAlreadyAssigned && mgrAssignEmpIds.includes(empId);
                              const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || 'Employee';

                              return (
                                <button
                                  type="button"
                                  key={empId}
                                  disabled={isAlreadyAssigned}
                                  onClick={() => handleMgrToggleEmp(empId)}
                                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition select-none ${isAlreadyAssigned
                                      ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                                      : isSelected
                                        ? 'bg-teal-50/70 border-teal-500 ring-1 ring-teal-500/30 text-teal-950 shadow-2xs cursor-pointer'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 cursor-pointer'
                                    }`}
                                  title={
                                    isAlreadyAssigned
                                      ? `${fullName} is already assigned metrics for ${mgrAssignPeriod || 'this period'} and cannot be booked again.`
                                      : `Click to toggle assignment for ${fullName}`
                                  }
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${isAlreadyAssigned ? 'bg-slate-300' : isSelected ? 'bg-teal-600' : 'bg-slate-300'
                                      }`} />
                                    <span className={`text-xs truncate ${isAlreadyAssigned
                                        ? 'font-normal text-slate-400'
                                        : isSelected
                                          ? 'font-medium text-teal-950'
                                          : 'font-normal text-slate-700'
                                      }`}>
                                      {fullName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      #{empId}
                                    </span>
                                    {isAlreadyAssigned ? (
                                      <span className="text-[9px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 shadow-2xs flex items-center gap-1">
                                        <span>🔒</span>
                                        <span>{mgrPeriodType === 'quarterly' ? `Stage ${mgrPeriodQuarter}` : 'Booked'}</span>
                                      </span>
                                    ) : isSelected ? (
                                      <span className="text-[9px] font-semibold text-teal-800 bg-teal-100/80 px-1.5 py-0.5 rounded">
                                        Selected
                                      </span>
                                    ) : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Step 2: Performance Metrics, Descriptions & Target Scores */}
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
                        Step 2
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        Deliverables & Targets
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Configure category weights and deliverable targets (100% total weightage).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMgrAssignCategories(DEFAULT_KPI_CATEGORIES)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
                    >
                      Reset Template
                    </button>
                    <button
                      type="button"
                      onClick={handleMgrAddCategory}
                      disabled={mgrTotalWeightage >= 100}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${mgrTotalWeightage >= 100
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
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 ${mgrTotalWeightage === 100 && areAllMgrCategoriesBalanced
                  ? 'bg-teal-50 border border-teal-200 text-teal-900'
                  : 'bg-amber-50 border border-amber-200 text-amber-900'
                  }`}>
                  <div className="flex items-center gap-2">
                    {mgrTotalWeightage === 100 && areAllMgrCategoriesBalanced ? (
                      <CheckCircleIcon className="w-4 h-4 text-teal-600 shrink-0" />
                    ) : (
                      <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      Total Category Weight: <strong>{mgrTotalWeightage}% / 100%</strong>
                      {!areAllMgrCategoriesBalanced && ' — Balance deliverable scores.'}
                    </span>
                  </div>
                </div>

                {/* Categories & KPIs List */}
                <div className="space-y-4">
                  {mgrAssignCategories.map((cat, catIdx) => {
                    const catSum = cat.kpis.reduce((sum, k) => sum + (Number(k.targetScore) || 0), 0);
                    const isBalanced = Math.abs(catSum - Number(cat.weightage)) <= 0.05;

                    return (
                      <div key={cat.id} className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                        {/* Category Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
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
                            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                              <span className="text-[11px] font-bold text-slate-500">Weight:</span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={cat.weightage}
                                onChange={e => handleMgrUpdateCategoryWeight(cat.id, Number(e.target.value))}
                                className="w-12 text-xs font-bold text-teal-800 text-center focus:outline-none"
                              />
                              <span className="text-[11px] font-bold text-slate-400">%</span>
                            </div>

                            {!isBalanced && (
                              <button
                                type="button"
                                onClick={() => handleMgrAutoBalanceCategory(cat.id)}
                                className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition cursor-pointer"
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
                                        onChange={e => handleMgrUpdateKPI(cat.id, kpi.id, 'name', e.target.value)}
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
                                        onChange={e => handleMgrUpdateKPI(cat.id, kpi.id, 'targetFromManager', e.target.value)}
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
                                          onChange={e => handleMgrUpdateKPI(cat.id, kpi.id, 'targetScore', Number(e.target.value))}
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
                                        onChange={e => handleMgrUpdateKPI(cat.id, kpi.id, 'unit', e.target.value)}
                                        placeholder="units"
                                        className="w-full h-8 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-teal-600 rounded-lg text-xs font-medium text-center text-slate-700 focus:outline-none transition"
                                      />
                                    </td>
                                    <td className="px-3 py-2 align-middle text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleMgrUpdateKPI(cat.id, kpi.id, 'scoringDirection', isNeg ? 'higher_is_better' : 'lower_is_better')}
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
                                        onClick={() => handleMgrDeleteKPI(cat.id, kpi.id)}
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
                            onClick={() => handleMgrAddKPI(cat.id)}
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
                  onClick={() => setIsMgrCreateModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!isMgrWeightageValid || !areAllMgrCategoriesBalanced || mgrAssignEmpIds.length === 0 || isAssigning}
                  className={`flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${isMgrWeightageValid && areAllMgrCategoriesBalanced && mgrAssignEmpIds.length > 0 && !isAssigning
                    ? 'bg-teal-700 hover:bg-teal-800 shadow-teal-900/10'
                    : 'bg-slate-300 cursor-not-allowed opacity-60'
                    }`}
                >
                  <CheckCircleIcon className="w-4 h-4 stroke-[2]" />
                  <span>
                    {isAssigning ? 'Assigning...' : `Assign to ${mgrAssignEmpIds.length} Direct Reports`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-linear-to-r from-teal-50/80 via-white to-amber-50/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ArrowPathIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      Rollup & Convert Evaluations
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Multi-tier conversion ladder with Option B soft archiving and automatic score averaging.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Conversion Tier Tabs */}
              <div className="p-3 bg-slate-50/80 border-b border-slate-200/80 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max">
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
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${isActive
                          ? 'bg-teal-700 text-white shadow-xs'
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
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
                {convertingTarget ? (
                  <>
                    {/* Multiple Employees Selector if applicable */}
                    {currentTierGroups.length > 1 && (
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Select Team Member to Convert ({currentTierConfig.label})
                        </label>
                        <select
                          value={convertingTarget.employeeId + (convertingTarget.weekStart || '')}
                          onChange={e => {
                            const found = currentTierGroups.find(g => (g.employeeId + (g.weekStart || '')) === e.target.value);
                            if (found) setConvertingTarget(found);
                          }}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs"
                        >
                          {currentTierGroups.map((g, idx) => (
                            <option key={g.employeeId + (g.weekStart || '') + idx} value={g.employeeId + (g.weekStart || '')}>
                              {g.employeeName} (#{g.employeeCode}){g.weekLabel ? ` [${g.weekLabel}]` : ''} — {g.count} {currentTierConfig.fromName.toLowerCase()} records ({g.avgScore}% avg)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Employee & Summary Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/90 rounded-2xl border border-slate-200 gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Target Member & Scope
                        </span>
                        <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                          <span>{convertingTarget.employeeName}</span>
                          <span className="text-xs font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            #{convertingTarget.employeeCode}
                          </span>
                          {convertingTarget.weekLabel && (
                            <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                              Week: {convertingTarget.weekLabel}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-medium block">
                          {convertingTarget.teamName} • Target: <strong className="text-teal-900">{currentTierConfig.toName} Record</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Rolled-Up {currentTierConfig.toName} Score
                          </span>
                          <span className="text-lg font-black text-teal-700 font-mono">
                            {convertingTarget.avgScore.toFixed(2)}%
                          </span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                          {getRatingForScore(convertingTarget.avgScore).name}
                        </span>
                      </div>
                    </div>

                    {/* Math Formula Card */}
                    <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200/80 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-teal-950 uppercase tracking-wider">
                        <SparklesIcon className="w-4 h-4 text-teal-700" />
                        <span>{currentTierConfig.formulaLabel}</span>
                      </div>
                      <div className="text-xs text-slate-700 space-y-1 font-medium leading-relaxed">
                        <p>
                          <strong>Total Percentage:</strong> {convertingTarget.records.map(r => `${Number(r.employeeOverallScore || 0).toFixed(1)}%`).join(' + ')} = <strong className="font-mono text-teal-900">{convertingTarget.records.reduce((acc, r) => acc + Number(r.employeeOverallScore || 0), 0).toFixed(1)}%</strong>
                        </p>
                        <p>
                          <strong>No. of {currentTierConfig.fromName} Evaluations:</strong> {convertingTarget.count}
                        </p>
                        <p className="pt-1 text-teal-950 font-bold border-t border-teal-200/60 font-mono">
                          {currentTierConfig.toName} Score = {convertingTarget.records.reduce((acc, r) => acc + Number(r.employeeOverallScore || 0), 0).toFixed(1)}% ÷ {convertingTarget.count} = {convertingTarget.avgScore.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {/* Records Being Consolidated Table */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block">
                        {convertingTarget.count} {currentTierConfig.fromName} Records Being Consolidated
                      </span>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2">Evaluation Period / Description</th>
                              <th className="px-3 py-2 text-center">Self Score</th>
                              <th className="px-3 py-2 text-center">Manager Score</th>
                              <th className="px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {convertingTarget.records.map((r, idx) => (
                              <tr key={r.id || idx} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 font-medium text-slate-800">
                                  {r.periodName || (r as any).form || `${currentTierConfig.fromName} Record ${idx + 1}`}
                                </td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-slate-800">
                                  {r.employeeOverallScore != null ? `${Number(r.employeeOverallScore).toFixed(1)}%` : '0.0%'}
                                </td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-teal-800">
                                  {r.managerScore != null ? `${Number(r.managerScore).toFixed(1)}%` : '—'}
                                </td>
                                <td className="px-3 py-2">
                                  {renderStatusBadge(r.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Option B Architecture Notice */}
                    <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                      <CheckCircleIcon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <p className="font-medium leading-relaxed">
                        <strong>Option B Soft Archive:</strong> 1 consolidated {currentTierConfig.toName} row will be created. The {convertingTarget.count} {currentTierConfig.fromName.toLowerCase()} records will be soft-archived in PostgreSQL, meaning they will disappear from active review queues while preserving full historical audit logs.
                      </p>
                    </div>
                  </>
                ) : (
                  /* Empty state when no records exist for the selected tier */
                  <div className="py-8 text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
                      <CalendarDaysIcon className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5 max-w-md mx-auto">
                      <h4 className="text-base font-extrabold text-slate-900">
                        No Active {currentTierConfig.fromName} Records to Convert
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        There are currently 0 un-archived {currentTierConfig.fromName.toLowerCase()} evaluation records ready for {currentTierConfig.label} conversion.
                      </p>
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs text-slate-600 space-y-1.5 font-medium mt-2">
                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                          <SparklesIcon className="w-4 h-4 text-teal-700" />
                          How {currentTierConfig.label} Conversion works:
                        </p>
                        <p>
                          1. Assign a <strong>{currentTierConfig.fromName} Deliverables Matrix</strong> to your squad.
                        </p>
                        <p>
                          2. As employees submit and you calibrate scores, their {currentTierConfig.fromName.toLowerCase()} evaluations accumulate.
                        </p>
                        <p>
                          3. Clicking <strong>Convert to {currentTierConfig.toName}</strong> aggregates the scores ({currentTierConfig.formulaDesc}), creates 1 consolidated {currentTierConfig.toName} entry, and soft-archives the source records!
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsConvertModalOpen(false);
                          setMgrPeriodType(currentTierConfig.createFreq);
                          handleOpenMgrCreateModal();
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                      >
                        <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                        <span>{currentTierConfig.createLabel}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  disabled={isConverting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
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
