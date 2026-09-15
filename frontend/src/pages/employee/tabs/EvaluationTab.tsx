import React, { useState, useEffect, useMemo } from 'react';
import { API_URL } from '../../../config/api';
import {
  EvaluationCycle,
  EvaluationResponse,
  KPIResponseItem,
  KPICategory,
  KPIItem
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
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
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
    return <span className="text-slate-400 italic text-[11px]">{fallback}</span>;
  }

  const isLong = text.length > 25 || text.includes('\n');

  if (!isLong) {
    return (
      <div className="bg-slate-50/90 px-3.5 py-1 rounded-full border border-slate-200/80 text-xs text-slate-700 italic break-words inline-block">
        "{text}"
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 text-[11px] text-slate-700 max-w-[240px]">
      <div className={`bg-slate-50/90 p-2 rounded-xl border border-slate-200/80 italic text-slate-700 transition-all ${isExpanded ? "break-words leading-relaxed max-h-60 overflow-y-auto" : "line-clamp-2"
        }`}>
        "{text}"
      </div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 hover:text-teal-900 bg-teal-50 hover:bg-teal-100/90 px-2 py-0.5 rounded-md border border-teal-200 transition cursor-pointer self-end"
      >
        <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
        {isExpanded ? (
          <ChevronUpIcon className="w-2.5 h-2.5 stroke-[2.5]" />
        ) : (
          <ChevronDownIcon className="w-2.5 h-2.5 stroke-[2.5]" />
        )}
      </button>
    </div>
  );
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
      return dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

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
        const isSubmitted = resp.status === 'manager_review' || resp.status === 'approved' || resp.status === 'sm_final_approval' || Boolean(resp.employeeSubmittedAt);
        if (isSubmitted) {
          setKpiInputs(resp.kpiResponses || {});
          setEmpRemarks(resp.employeeRemarks || '');
        } else if (resp.kpiResponses && Object.keys(resp.kpiResponses).length > 0) {
          setKpiInputs(prev => (Object.keys(prev).length > 0 ? prev : (resp.kpiResponses || {})));
          setEmpRemarks(prev => prev || (resp.employeeRemarks || ''));
        }
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
    // Auto-sync every 5 seconds while preserving in-progress employee inputs
    const interval = setInterval(() => {
      evaluationService.fetchRemoteEvaluationData().then(data => {
        if (data?.cycles) setCycles(data.cycles);
        if (data?.responses) {
          setResponses(prev => {
            return data.responses.map(remoteResp => {
              const localResp = prev.find(p => p.id === remoteResp.id);
              if (remoteResp.status === 'employee_in_progress' && localResp?.kpiResponses && Object.keys(localResp.kpiResponses).length > 0) {
                return {
                  ...remoteResp,
                  kpiResponses: localResp.kpiResponses,
                  employeeRemarks: localResp.employeeRemarks || remoteResp.employeeRemarks
                };
              }
              return remoteResp;
            });
          });
        }
      }).catch(() => { });
    }, 5000);
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
  const isAssignableSubordinate = (emp: any): boolean => {
    if (!emp) return false;
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

  // Manager's direct reporting team members strictly scoped from DB
  const managerDirectReports: any[] = useMemo(() => {
    if (activeRole === 'downline_teams') {
      return dbEmployees.filter(e => isDownlineReport(e) && !isDirectReport(e));
    }
    return dbEmployees.filter(isDirectReport);
  }, [dbEmployees, user, userId, currentDbUser, activeRole]);

  // All subordinates eligible for metric assignment by the manager (Direct Reports + Downline Reports under Team Leads)
  const managerAssignableEmployees: any[] = useMemo(() => {
    if (isHrOrAdmin || isServiceManager) {
      return dbEmployees;
    }
    const myIds = [
      String(userId || ''),
      String(userCode || ''),
      String(currentDbUser?.id || ''),
      String(currentDbUser?.employee_id || ''),
      String(userAny?.id || ''),
      String(userAny?.employee_id || '')
    ].filter(Boolean);

    return dbEmployees.filter(e => {
      const eId = String(e.employee_id || e.id || '');
      if (myIds.includes(eId)) return false;
      return isAssignableSubordinate(e);
    });
  }, [dbEmployees, user, userId, currentDbUser, userAny, isHrOrAdmin, isServiceManager]);

  // Manager's distinct departments strictly from direct and downline reports
  const managerDepartments: string[] = useMemo(() => {
    const depts = new Set<string>();
    const sourceList = activeRole === 'downline_teams'
      ? dbEmployees.filter(e => isDownlineReport(e) && !isDirectReport(e))
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

    // Initial selected employees = default to ALL eligible subordinates selected
    const baseTeamMembers = defaultTeamVal === 'all_teams'
      ? managerAssignableEmployees
      : managerAssignableEmployees.filter((e: any) => (e.department || e.team || '').toLowerCase() === defaultTeamVal.toLowerCase());
    setMgrAssignEmpIds(baseTeamMembers.map((e: any) => String(e.employee_id || e.id)).filter(Boolean));
    setMgrPeriodType('quarterly');
    setMgrPeriodQuarter(currentQuarter);
    setMgrPeriodYear(currentYear);
    syncPeriodAndFormName('quarterly', currentQuarter, currentYear, currentMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, defaultTeamVal);
    setMgrAssignCategories(DEFAULT_KPI_CATEGORIES);
    setIsMgrCreateModalOpen(true);
  };

  const handleMgrTeamChange = (newTeamId: string) => {
    setMgrAssignTeamId(newTeamId);
    // Default to all selected on team/department change
    const baseTeamMembers = newTeamId === 'all_teams'
      ? managerAssignableEmployees
      : managerAssignableEmployees.filter((e: any) => (e.department || e.team || '').toLowerCase() === newTeamId.toLowerCase());
    setMgrAssignEmpIds(baseTeamMembers.map((e: any) => String(e.employee_id || e.id)).filter(Boolean));
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
    const cleanTag = (periodStr || '').trim().toLowerCase();

    const matchesPeriod = (cPeriodRaw: string) => {
      const cPeriod = (cPeriodRaw || '').trim().toLowerCase();
      if (!cPeriod) return false;

      // 1. Direct tag match or exact substring match
      if (cleanTag && (cPeriod === cleanTag || cPeriod.includes(cleanTag) || cleanTag.includes(cPeriod))) {
        return true;
      }

      // 2. Frequency-specific precise match
      if (pType === 'quarterly') {
        const qStr = `q${pQuarter}`;
        const yStr = `${pYear}`;
        if (cPeriod.includes(qStr) && cPeriod.includes(yStr)) return true;
      } else if (pType === 'monthly') {
        const mName = (MONTH_NAMES[pMonth - 1] || '').toLowerCase();
        const yStr = `${pYear}`;
        if (mName && cPeriod.includes(mName) && cPeriod.includes(yStr)) return true;
      } else if (pType === 'daily' && pDue) {
        const dueFmt = formatDisplayDate(pDue).toLowerCase();
        if (dueFmt && cPeriod.includes(dueFmt)) return true;
        if (cPeriod.includes(pDue.toLowerCase())) return true;
      } else if (pType === 'weekly' && pFrom && pTo) {
        const fromFmt = formatDisplayDate(pFrom).toLowerCase();
        const toFmt = formatDisplayDate(pTo).toLowerCase();
        if (fromFmt && toFmt && cPeriod.includes(fromFmt) && cPeriod.includes(toFmt)) return true;
      }

      return false;
    };

    // Check in cycles
    const hasInCycles = cycles.some(c => {
      const empList = (c.employeeIds || []).map(id => String(id).trim().toLowerCase());
      const isEmpIn = empList.includes(String(empId).trim().toLowerCase());
      if (!isEmpIn) return false;
      return matchesPeriod(c.periodName || c.name || '');
    });
    if (hasInCycles) return true;

    // Check in responses
    const hasInResponses = responses.some(r => {
      const cleanEmpCode = String(r.employeeCode || r.employeeId || '').trim().toLowerCase();
      if (cleanEmpCode !== String(empId).trim().toLowerCase()) return false;

      const rCycle = cycles.find(c => c.id === r.cycleId);
      const rPeriod = rCycle?.periodName || rCycle?.name || (r as any).periodName || '';
      return matchesPeriod(rPeriod);
    });

    return hasInResponses;
  };

  const handleMgrToggleEmp = (empId: string) => {
    setMgrAssignEmpIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleMgrToggleSelectAll = (teamEmps: any[]) => {
    const allIds = teamEmps.map(e => String(e.employee_id || e.id)).filter(Boolean);
    const allSelected = allIds.length > 0 && allIds.every(id => mgrAssignEmpIds.includes(id));
    if (allSelected) {
      setMgrAssignEmpIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setMgrAssignEmpIds(prev => Array.from(new Set([...prev, ...allIds])));
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

      await evaluationService.createAndAssignKpiMetrics({
        formName: mgrAssignFormName,
        teamId: mgrAssignTeamId,
        teamName: selectedTeamName,
        managerId: String(user?.id || userAny?.employee_id || ''),
        managerName: currentMgrName,
        serviceManagerId: selectedSmId,
        serviceManagerName: 'Service Manager',
        employeeIds: mgrAssignEmpIds,
        periodName: mgrAssignPeriod,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        categories: mgrAssignCategories,
        allEmployees: dbEmployees
      });

      setIsMgrCreateModalOpen(false);
      await loadAllData();
      showToast(`Performance Metrics successfully assigned to ${mgrAssignEmpIds.length} team member(s)!`);
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
      const timeA = new Date(a.createdAt || a.employeeSubmittedAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.employeeSubmittedAt || b.updatedAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });

    // Deduplicate so each evaluation period appears ONCE for the employee, prioritizing records with full categories
    const periodMap = new Map<string, EvaluationResponse>();
    rawList.forEach(r => {
      const pKey = (r.periodName || (r as any).form || '').trim().toLowerCase();
      const key = pKey || r.id;
      const existing = periodMap.get(key);
      if (!existing) {
        periodMap.set(key, r);
      } else {
        const hasCats = (resp: any) => Boolean(resp.categories?.length > 0 || resp.metrics_data?.length > 0);
        const isDb = (resp: any) => String(resp.id || '').startsWith('resp_') && /\d+/.test(String(resp.id || ''));
        if (hasCats(r) && !hasCats(existing)) {
          periodMap.set(key, r);
        } else if (isDb(r) && !isDb(existing)) {
          periodMap.set(key, r);
        }
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
      `Are you sure you want to delete the evaluation record for ${employeeName || resp.employeeName} (${employeeCode || resp.employeeCode})?`,
      async () => {
        try {
          const respId = resp.id;
          const empCode = String(resp.employeeCode || resp.employeeId || '');
          const empName = resp.employeeName || employeeName || '';

          // 1. Call backend delete with full identifiers so DB rows are completely purged
          try {
            const token = localStorage.getItem('token') || '';
            const deleteUrl = `${API_URL}/api/performance/evaluation/responses/${encodeURIComponent(respId)}?employeeCode=${encodeURIComponent(empCode)}&employeeName=${encodeURIComponent(empName)}&employeeId=${encodeURIComponent(String(resp.employeeId || ''))}`;
            await fetch(deleteUrl, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({
                respId,
                employeeCode: empCode,
                employeeId: resp.employeeId,
                employeeName: empName,
                cycleId: resp.cycleId
              })
            });
          } catch (delErr) {
            console.warn('Backend delete error:', delErr);
          }

          // 2. Remove from local state & cache
          const updatedResponses = responses.filter(r => r.id !== respId && String(r.employeeCode || r.employeeId || '') !== empCode);
          setResponses(updatedResponses);
          evaluationService.saveResponsesLocal(updatedResponses);

          await loadAllData();
          showToast(`Evaluation for ${employeeName || empCode} permanently deleted from DB.`);
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
    ) : anySubmittedUserResponse
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
  useEffect(() => {
    if (activeEmpResponse && isResponseForUser(activeEmpResponse)) {
      if (activeEmpResponse.kpiResponses && Object.keys(activeEmpResponse.kpiResponses).length > 0) {
        if (isEmpSubmitted) {
          setKpiInputs(activeEmpResponse.kpiResponses);
        } else {
          setKpiInputs(prev => {
            const merged = { ...activeEmpResponse.kpiResponses };
            for (const [k, v] of Object.entries(prev)) {
              if (v && (v.actualValue !== '' || v.employeeRemarks !== '')) {
                merged[k] = v;
              }
            }
            return merged;
          });
        }
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

    const employeeCode = empInDb?.employee_id || r.employeeCode || r.employeeId || '8888';
    const employeeName = empInDb ? `${empInDb.first_name || ''} ${empInDb.last_name || ''}`.trim() : (r.employeeName || `Employee #${employeeCode}`);

    // Exact canonical department resolution: Prefer employee's actual department from DB
    const dbDept = (empInDb?.department || empInDb?.team || '').trim();
    let teamName = dbDept;
    if (!teamName) {
      const respDept = (r.department || '').trim();
      if (respDept && respDept !== 'all_teams' && !respDept.includes(',')) {
        teamName = respDept;
      } else if (r.teamId && r.teamId !== 'all_teams' && !r.teamId.includes(',')) {
        teamName = r.teamId.trim();
      } else {
        teamName = 'Editorial Services';
      }
    }
    return { employeeCode, employeeName, teamName, empInDb };
  };

  // Helper to render distinct status badges across all lifecycle stages
  const renderStatusBadge = (status: string) => {
    const s = String(status || '').toLowerCase().replace(/[_\s]+/g, ' ').trim();

    if (s.includes('approved') || s.includes('calibrated') || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Calibrated & Approved</span>
        </span>
      );
    }
    if (s.includes('service') || s.includes('sm') || s === 'sm final approval') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          <span>SM Approved</span>
        </span>
      );
    }
    if (s.includes('manager') || s.includes('submitted') || s.includes('review')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 shadow-2xs shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 animate-pulse" />
          <span>Submitted to Manager</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs shrink-0">
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

      // Distinct key per employee and evaluation period (so multiple assigned metrics in different periods appear distinctly, but duplicates in the same period are merged)
      const rawPeriod = (r.periodName || (r as any).form || '').trim().toLowerCase();
      let canonicalPeriod = rawPeriod;
      if (rawPeriod.includes('(') && rawPeriod.includes(')')) {
        const parts = rawPeriod.split('(');
        canonicalPeriod = parts[parts.length - 1].replace(')', '').trim();
      }
      const key = `${String(employeeCode).trim().toLowerCase()}_${canonicalPeriod || r.cycleId || r.id}`;
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

          const newResp: EvaluationResponse = {
            id: `resp_${Date.now()}_${user?.id || 'emp'}`,
            cycleId: cycleToUse.id,
            teamId: cycleToUse.teamId,
            employeeId: String(userAny?.employee_id || currentDbUser?.employee_id || user?.id || 'emp_1'),
            employeeName: currentEmpName,
            employeeCode: currentEmpCode,
            designation: userAny?.designation || currentDbUser?.designation || 'Team Member',
            status: 'manager_review',
            kpiResponses: payloadKpiInputs,
            employeeOverallScore: liveEmployeeScore.overallScore,
            employeeRemarks: aggregatedRemarks,
            employeeSubmittedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          const updatedResponses = [newResp, ...responses];
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
                Evaluation & Report
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
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs shrink-0">
                        <SparklesIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs font-bold text-slate-900 whitespace-nowrap">
                            {activeCycle?.name || 'Performance Evaluation Cycle'}
                          </h3>
                          {/* Period Selector Dropdown (Allows switching between previous & latest periods) */}
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
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
                    </div>

                    {/* Summary Pill Badges - Single Line Non-Wrapping Row */}
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs flex-nowrap overflow-x-auto shrink-0 py-0.5">
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
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                        Deliverable Breakdown
                      </h4>
                      {isEmpSubmitted && (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                          Submitted & Locked
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/80 shrink-0">
                      100% Allocation
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Deliverable</th>
                          <th className="px-3 py-3 text-center whitespace-nowrap">Target</th>
                          <th className="px-3 py-3 text-center whitespace-nowrap">Weight</th>
                          <th className="px-3 py-3 text-center whitespace-nowrap">Self Actual</th>
                          <th className="px-3 py-3 text-center whitespace-nowrap">Self Score</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Self Remarks</th>
                          {isEmpSubmitted && (
                            <>
                              <th className="px-3 py-3 text-center bg-teal-50/50 text-slate-800 border-l border-teal-100 whitespace-nowrap">Mgr Actual</th>
                              <th className="px-3 py-3 text-center bg-teal-50/50 text-slate-800 whitespace-nowrap">Mgr Score</th>
                              <th className="px-4 py-3 text-left bg-teal-50/50 text-slate-800 whitespace-nowrap">Mgr Remarks</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
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

                          return (
                            <React.Fragment key={cat.id}>
                              {/* Category Subheading Row */}
                              <tr className="bg-slate-100/80 font-bold text-slate-900 border-t border-b border-slate-200/80">
                                <td colSpan={isEmpSubmitted ? 9 : 6} className="px-4 py-2 text-xs">
                                  {catIdx + 1}. {cat.name} ({cat.weightage}% Allocation)
                                </td>
                              </tr>

                              {/* KPI Metric Rows */}
                              {cat.matchingKpis.map((kpi) => {
                                const respItem = getKpiResponseItem(kpi);
                                const val = respItem?.actualValue !== undefined && respItem?.actualValue !== null && respItem?.actualValue !== ''
                                  ? respItem.actualValue
                                  : (kpiInputs[kpi.id]?.actualValue ?? (kpi.name ? kpiInputs[kpi.name]?.actualValue : '') ?? '');
                                const calc = calculateKPIScore(kpi, val);
                                const remarks = respItem?.employeeRemarks !== undefined && respItem?.employeeRemarks !== null
                                  ? respItem.employeeRemarks
                                  : (kpiInputs[kpi.id]?.employeeRemarks ?? (kpi.name ? kpiInputs[kpi.name]?.employeeRemarks : '') ?? '');
                                const targetThreshold = parseTargetExpression(kpi.targetFromManager, kpi.targetValue || 1).threshold;

                                // Manager reviewed values
                                const hasMgrActual = respItem?.managerActualValue !== undefined && respItem?.managerActualValue !== null && respItem?.managerActualValue !== '';
                                const mgrActualVal = hasMgrActual ? respItem.managerActualValue : '';
                                const isActualModifiedByMgr = hasMgrActual && String(mgrActualVal).trim() !== String(val).trim();
                                const mgrCalc = calculateKPIScore(kpi, hasMgrActual ? mgrActualVal : val);
                                const mgrEarnedScore = (respItem?.managerScore !== undefined && respItem?.managerScore !== null)
                                  ? Number(respItem.managerScore)
                                  : (hasMgrActual ? mgrCalc.earnedScore : null);
                                const mgrRemarks = respItem?.managerRemarks || '';

                                const isNeg = isNegativeKpi(kpi);

                                return (
                                  <tr key={kpi.id} className={`transition ${isNeg ? 'bg-rose-50/25 hover:bg-rose-50/50' : 'hover:bg-slate-50/50'}`}>
                                    {/* Deliverable Metric */}
                                    <td className="px-4 py-3 align-middle">
                                      <span className={`text-xs ${isNeg ? 'font-bold text-rose-600' : 'font-semibold text-slate-900'}`}>{kpi.name}</span>
                                    </td>

                                    {/* Target Goal */}
                                    <td className={`px-3 py-3 text-center align-middle font-bold text-xs whitespace-nowrap ${isNeg ? 'text-rose-600' : 'text-slate-700'}`}>
                                      {(() => {
                                        const t = String(kpi.targetFromManager || '').trim();
                                        const u = String(kpi.unit || '').trim();
                                        if (!t) return '—';
                                        if (!u || t.toLowerCase().includes(u.toLowerCase())) return t;
                                        return `${t} ${u}`;
                                      })()}
                                    </td>

                                    {/* Weight % */}
                                    <td className="px-3 py-3 text-center align-middle font-bold text-slate-700 text-xs whitespace-nowrap">
                                      {kpi.targetScore}%
                                    </td>

                                    {/* Self Actual */}
                                    <td className="px-3 py-3 text-center align-middle text-xs whitespace-nowrap">
                                      {(() => {
                                        const numericVal = val !== '' && val !== undefined && val !== null ? Number(val) : null;
                                        const isOverTarget = numericVal !== null && !isNaN(numericVal) && (
                                          isNeg ? numericVal > targetThreshold : (targetThreshold > 0 && numericVal > targetThreshold)
                                        );
                                        const isMetTarget = numericVal !== null && !isNaN(numericVal) && (
                                          isNeg ? numericVal <= targetThreshold : (targetThreshold > 0 && numericVal >= targetThreshold)
                                        );

                                        return isEmpSubmitted ? (
                                          <span className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full border text-xs transition ${
                                            isNeg && isOverTarget
                                              ? 'bg-rose-50 text-rose-900 border-rose-300'
                                              : isOverTarget
                                                ? 'bg-emerald-50 text-emerald-950 border border-emerald-400 shadow-2xs'
                                                : isMetTarget && !isNeg
                                                  ? 'bg-teal-50 text-teal-900 border border-teal-300'
                                                  : 'bg-slate-50 text-slate-900 border-slate-200'
                                          }`}>
                                            <span>{val !== '' ? `${val} ${kpi.unit || ''}` : '—'}</span>
                                            {isOverTarget && !isNeg && <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded-full">EXCEEDED</span>}
                                            {isOverTarget && isNeg && <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-800 bg-rose-200/80 px-1.5 py-0.5 rounded-full">OVER LIMIT</span>}
                                          </span>
                                        ) : (
                                          <div className="flex flex-col items-center justify-center gap-1">
                                            <input
                                              type="number"
                                              min="0"
                                              value={val}
                                              disabled={isSubmittingEmp}
                                              onChange={e => handleKPIChange(kpi, e.target.value)}
                                              placeholder="0"
                                              className={`w-24 h-8 px-2 text-center font-bold text-xs rounded-xl transition shadow-2xs focus:outline-none ${
                                                isNeg && isOverTarget
                                                  ? 'bg-rose-50 text-rose-950 border-2 border-rose-500 ring-2 ring-rose-400/30 font-black'
                                                  : isOverTarget
                                                    ? 'bg-emerald-50 text-emerald-950 border-2 border-emerald-500 ring-2 ring-emerald-400/30 font-black'
                                                    : isMetTarget && !isNeg
                                                      ? 'bg-teal-50/80 text-teal-950 border-2 border-teal-400 font-bold focus:border-teal-600'
                                                      : 'bg-white text-teal-950 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600'
                                              }`}
                                            />
                                            {isOverTarget && !isNeg && (
                                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded uppercase tracking-wider animate-in fade-in">
                                                Exceeded Target
                                              </span>
                                            )}
                                            {isOverTarget && isNeg && (
                                              <span className="text-[9px] font-black text-rose-700 bg-rose-100/90 px-1.5 py-0.2 rounded uppercase tracking-wider animate-in fade-in">
                                                Over Limit
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>

                                    {/* Self Score */}
                                    <td className="px-3 py-3 text-center align-middle text-xs whitespace-nowrap">
                                      <span className="font-bold text-slate-900">
                                        {calc.earnedScore.toFixed(2)}%
                                      </span>
                                    </td>

                                    {/* Self Remarks */}
                                    <td className="px-4 py-3 align-middle text-xs min-w-[200px] max-w-[260px]">
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
                                          {hasMgrActual && mgrActualVal !== '' ? (
                                            <span className={`inline-flex items-center justify-center px-3.5 py-1 rounded-full text-xs font-bold transition shadow-2xs ${isActualModifiedByMgr
                                                ? 'bg-amber-100/90 text-amber-950 border border-amber-300'
                                                : 'bg-teal-100/80 text-teal-950 border border-teal-300'
                                              }`}>
                                              {mgrActualVal} {kpi.unit || ''}
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 font-medium">—</span>
                                          )}
                                        </td>

                                        <td className="px-3 py-3 text-center align-middle bg-teal-50/30 whitespace-nowrap">
                                          <span className="font-bold text-slate-900 text-xs">
                                            {mgrEarnedScore !== null ? `${mgrEarnedScore.toFixed(2)}%` : '—'}
                                          </span>
                                        </td>

                                        <td className="px-4 py-3 align-middle bg-teal-50/30 text-xs min-w-[200px] max-w-[260px]">
                                          <ExpandableRemarkView text={mgrRemarks} fallback="—" />
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Scorecard Summary Footer */}
                  <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 font-medium">Self Overall Score:</span>
                        <strong className="text-teal-900 text-sm font-extrabold">{selfScoreNum.toFixed(1)}%</strong>
                      </div>
                      {activeEmpResponse?.managerScore !== undefined && (
                        <div className="flex items-center gap-2 bg-teal-50 px-3.5 py-2 rounded-xl border border-teal-200 shadow-2xs">
                          <span className="text-teal-800 font-bold">Manager Official Score:</span>
                          <strong className="text-teal-950 text-sm font-extrabold">{Number(activeEmpResponse.managerScore).toFixed(1)}%</strong>
                        </div>
                      )}
                      <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 font-medium">Grade Tier:</span>
                        <strong className="text-teal-900 text-sm font-extrabold">
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

                            <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="px-4 py-2.5 whitespace-nowrap">Deliverable Metric</th>
                                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Target</th>
                                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Weight</th>
                                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Self Actual</th>
                                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Self Score</th>
                                    <th className="px-4 py-2.5 whitespace-nowrap">Self Remarks</th>
                                    <th className="px-3 py-2.5 text-center bg-teal-50/50 text-slate-800 border-l border-teal-100 whitespace-nowrap">Mgr Actual</th>
                                    <th className="px-3 py-2.5 text-center bg-teal-50/50 text-slate-800 whitespace-nowrap">Mgr Score</th>
                                    <th className="px-4 py-2.5 bg-teal-50/50 text-slate-800 whitespace-nowrap">Mgr Remarks</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {itemCategories.map((cat, catIdx) => (
                                    <React.Fragment key={cat.id}>
                                      <tr className="bg-slate-100/90 font-black text-slate-900 border-t border-b border-slate-200/90">
                                        <td colSpan={9} className="px-4 py-2 text-xs uppercase tracking-wider text-slate-800">
                                          {catIdx + 1}. {cat.name} ({cat.weightage}% Weight)
                                        </td>
                                      </tr>
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
                                            <td className="px-4 py-2.5 align-middle">
                                              <span className={`text-xs ${isNeg ? 'font-bold text-rose-600' : 'font-bold text-slate-800'}`}>{kpi.name}</span>
                                              {kpi.description && (
                                                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{kpi.description}</div>
                                              )}
                                            </td>
                                            <td className={`px-3 py-2.5 text-center align-middle font-bold text-xs whitespace-nowrap ${isNeg ? 'text-rose-600' : 'text-slate-600'}`}>
                                              {(() => {
                                                const t = String(kpi.targetFromManager !== undefined && kpi.targetFromManager !== '' ? kpi.targetFromManager : (kpi.targetValue ?? '')).trim();
                                                const u = String(kpi.unit || '').trim();
                                                if (!t) return '—';
                                                if (!u || t.toLowerCase().includes(u.toLowerCase())) return t;
                                                return `${t} ${u}`;
                                              })()}
                                            </td>
                                            <td className="px-3 py-2.5 text-center align-middle font-semibold text-slate-600 whitespace-nowrap">
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
                                                  <span className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full border text-xs ${
                                                    isNeg && isOverT
                                                      ? 'bg-rose-50 text-rose-900 border-rose-300'
                                                      : isOverT
                                                        ? 'bg-emerald-50 text-emerald-950 border border-emerald-400 shadow-2xs'
                                                        : isMetT && !isNeg
                                                          ? 'bg-teal-50 text-teal-900 border border-teal-300'
                                                          : 'bg-slate-50 text-slate-900 border-slate-200'
                                                  }`}>
                                                    <span>{selfActual} {kpi.unit || ''}</span>
                                                    {isOverT && !isNeg && <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded-full">EXCEEDED</span>}
                                                    {isOverT && isNeg && <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-800 bg-rose-200/80 px-1.5 py-0.5 rounded-full">OVER LIMIT</span>}
                                                  </span>
                                                );
                                              })()}
                                            </td>
                                            <td className="px-3 py-2.5 text-center align-middle font-extrabold text-slate-900 whitespace-nowrap">
                                              {selfScore.toFixed(2)}%
                                            </td>
                                            <td className="px-4 py-2.5 align-middle text-xs min-w-[180px] max-w-[240px]">
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
                                                  <span className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full border text-xs shadow-2xs ${
                                                    isModified
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
                                                    {isOverT && isNeg && !isModified && <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-800 bg-rose-200/80 px-1.5 py-0.5 rounded-full">OVER LIMIT</span>}
                                                  </span>
                                                );
                                              })()}
                                            </td>
                                            <td className="px-3 py-2.5 text-center align-middle bg-teal-50/30 whitespace-nowrap font-bold text-slate-900">
                                              {mgrScore !== null ? `${mgrScore.toFixed(2)}%` : '—'}
                                            </td>
                                            <td className="px-4 py-2.5 align-middle bg-teal-50/30 text-xs min-w-[180px] max-w-[240px]">
                                              <ExpandableRemarkView text={mgrRemarks} fallback="—" />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </React.Fragment>
                                  ))}
                                </tbody>
                              </table>
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
                              className={`transition-colors ${
                                isCurrentTier
                                  ? 'bg-teal-50/70 font-semibold'
                                  : 'hover:bg-slate-50/60'
                              }`}
                            >
                              {/* Rating Name + Stars */}
                              <td className="px-4 py-3.5 align-top">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-black text-xs ${
                                      (tier.letterGrade === 'A' || tier.grade === 5 || tier.grade === 'A') ? 'text-emerald-800' :
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

            {canCreateMetrics && (
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenMgrCreateModal()}
                  className="flex items-center gap-2 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                  <span>Assign Metrics</span>
                </button>
              </div>
            )}
          </div>

          {/* Executive Stat Cards & Team Performance Race Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
            {/* Left: 4 Stat Cards in 2x2 Grid (8 Columns) */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Stat 1: Direct Reports */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                <div className="flex flex-col justify-between min-w-0">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {activeRole === 'manager' ? 'Direct Reports' : 'Department Reports'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-2xl font-extrabold text-slate-800 leading-tight">
                      {managerStats.total}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">reports</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-1 truncate">
                    {activeRole === 'manager'
                      ? (managerDepartments.join(', ') || effectiveTeamName || 'Assigned Scope')
                      : 'Sub-Manager Squads'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0 ml-3">
                  <UserGroupIcon className="w-5 h-5" />
                </div>
              </div>

              {/* Stat 2: Self Submissions */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                <div className="flex flex-col justify-between min-w-0">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Self Submissions
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-2xl font-extrabold text-slate-800 leading-tight">
                      {managerStats.submitted}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">/ {managerStats.total}</span>
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                    {managerStats.submissionRate}% Submitted
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 ml-3">
                  <CheckBadgeIcon className="w-5 h-5" />
                </div>
              </div>

              {/* Stat 3: Pending Review */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                <div className="flex flex-col justify-between min-w-0">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Pending Review
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-2xl font-extrabold text-slate-800 leading-tight">
                      {managerStats.pending}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">pending</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-1">
                    {managerStats.pending === 0 ? 'All reviews completed' : 'Awaiting calibration'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 ml-3">
                  <ClockIcon className="w-5 h-5" />
                </div>
              </div>

              {/* Stat 4: Team Avg Score */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
                <div className="flex flex-col justify-between min-w-0">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Team Avg Score
                  </span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-2xl font-extrabold text-slate-800 leading-tight">
                      {managerStats.avgScore.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-1 truncate">
                    {getRatingForScore(managerStats.avgScore).name}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 ml-3">
                  <ChartBarIcon className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Right: Top 3 Teams Leaderboard Card (4 Columns) */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                      <FireIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 tracking-tight">Team Performance Race</h4>
                      <span className="text-[10px] text-slate-400 font-medium block">Top 3 Performing Teams</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 uppercase">
                    RACING
                  </span>
                </div>

                {topThreeTeams.length > 0 ? (
                  <div className="space-y-2.5">
                    {topThreeTeams.map((team, idx) => {
                      const scoreVal = team.teamAvgScore ?? team.teamAvgMgrScore ?? team.completionPercentage ?? 0;
                      const rankBadges = [
                        { icon: '🥇', label: '#1', bg: 'bg-amber-50 text-amber-800 border-amber-300', bar: 'bg-amber-500' },
                        { icon: '🥈', label: '#2', bg: 'bg-slate-100 text-slate-700 border-slate-300', bar: 'bg-slate-500' },
                        { icon: '🥉', label: '#3', bg: 'bg-amber-100/60 text-amber-900 border-amber-300/80', bar: 'bg-teal-500' },
                      ];
                      const badge = rankBadges[idx] || rankBadges[2];

                      return (
                        <div key={team.department} className="p-2 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.bg}`}>
                                {badge.icon} {badge.label}
                              </span>
                              <span className="text-xs font-bold text-slate-800 truncate" title={team.department}>
                                {team.department}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-900 shrink-0">
                              {scoreVal.toFixed(1)}%
                            </span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${badge.bar}`}
                              style={{ width: `${Math.min(100, Math.max(8, scoreVal))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-5 text-center space-y-1">
                    <div className="text-xl">🏆</div>
                    <p className="text-xs font-bold text-slate-700">No Team Rankings Yet</p>
                    <p className="text-[10px] text-slate-400">Rankings update as teams are evaluated</p>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center justify-between">
                <span>Scope: {teamWiseCardsData.length} Teams</span>
                <span className="font-semibold text-teal-700">Live Rankings</span>
              </div>
            </div>
          </div>

          {/* Section 2: Manager Reviews Queue & Calibration Desk (or Downline Team Overview) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5">
            {/* Desk Header & Interactive Queue Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-teal-700 shrink-0">
                  <ClipboardDocumentCheckIcon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    {activeRole === 'manager' ? 'Direct Reviews Desk' : 'Department Oversight'}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    {activeRole === 'manager' ? 'Monitor progress & calibrate individual scores' : 'Extended oversight of sub-manager squads'}
                  </span>
                </div>
              </div>

              {activeRole === 'manager' && (
                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
                  {/* Department Selector */}
                  <div className="relative">
                    <select
                      value={managerFilterDept}
                      onChange={e => setManagerFilterDept(e.target.value)}
                      className="h-8.5 pl-3 pr-8 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition cursor-pointer appearance-none shadow-2xs"
                    >
                      <option value="">Select Team / Department</option>
                      <option value="all">All Teams ({teamWiseCardsData.length})</option>
                      {teamWiseCardsData.map(t => (
                        <option key={t.department} value={t.department}>
                          {t.department} ({t.totalEmployees})
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setMgrViewMode('table')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${mgrViewMode === 'table'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      <TableCellsIcon className="w-3.5 h-3.5" />
                      <span>Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMgrViewMode('cards')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${mgrViewMode === 'cards'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      <DocumentChartBarIcon className="w-3.5 h-3.5" />
                      <span>Cards</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2.1: Team Cards Overview */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Team Performance & Progress Overview
                  </h4>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">• Click a card to filter direct reports below</span>
                </div>
                {Boolean(managerFilterDept) && (
                  <button
                    type="button"
                    onClick={() => setManagerFilterDept('')}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* All Teams Overview Card */}
                {teamWiseCardsData.length > 1 && (
                  <div
                    onClick={() => setManagerFilterDept(managerFilterDept === 'all' ? '' : 'all')}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${managerFilterDept === 'all'
                        ? 'bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/50 border-teal-400 ring-2 ring-teal-400/25 shadow-sm'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${managerFilterDept === 'all' ? 'bg-teal-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600'}`}>
                          <UserGroupIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">All Teams Overview</h4>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {allTeamsTotalEmps} Employees Total
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {allTeamsAvgMgrScore !== null && (
                          <span className="text-[10px] font-mono font-extrabold text-teal-900 bg-teal-100/90 px-2 py-0.5 rounded-md border border-teal-300 shadow-2xs">
                            {allTeamsAvgMgrScore}%
                          </span>
                        )}
                        {managerFilterDept === 'all' && (
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Rate */}
                    <div className="space-y-1.5 mb-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Avg Manager Score</span>
                        <span className="font-extrabold text-slate-800">
                          {allTeamsAvgMgrScore !== null ? (
                            <span className="text-teal-700 font-black">{allTeamsAvgMgrScore}%</span>
                          ) : (
                            <span className="text-slate-400 font-normal">Pending</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Completion Rate</span>
                        <span className="font-mono font-bold text-slate-800">{allTeamsOverallProgress}% ({allTeamsCompletedCount}/{allTeamsTotalEmps})</span>
                      </div>
                      <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${allTeamsOverallProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-medium pt-1">
                      <span className="text-center py-1 px-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold" title="Calibrated / Approved">
                        {allTeamsCompletedCount} Done
                      </span>
                      <span className="text-center py-1 px-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold" title="Pending Assessment">
                        {allTeamsPendingCount} Pending
                      </span>
                      <span className={`text-center py-1 px-1 rounded-lg border font-mono font-extrabold ${allTeamsAvgMgrScore !== null
                          ? 'bg-teal-50 text-teal-900 border-teal-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`} title="Overall Average Manager Score">
                        {allTeamsAvgMgrScore !== null ? `${allTeamsAvgMgrScore}%` : 'Pending'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Department / Team Cards */}
                {teamWiseCardsData.map(team => {
                  const isSelected = Boolean(managerFilterDept) && (
                    managerFilterDept.toLowerCase() === team.department.toLowerCase() ||
                    managerFilterDept === 'all'
                  );

                  // Resolve team cycle
                  const teamCycle = managerDirectCycles.find(c =>
                    (c.teamName || '').toLowerCase() === team.department.toLowerCase()
                  ) || cycles.find(c => (c.teamName || '').toLowerCase() === team.department.toLowerCase());

                  const cycleLockedInfo = getCycleLockedInfo(teamCycle);

                  return (
                    <div
                      key={team.department}
                      onClick={() => {
                        if (activeRole === 'downline_teams') {
                          setSelectedDownlineTeamModal(team);
                          setDownlineModalSearchQuery('');
                          setDownlineModalStatusFilter('all');
                        } else {
                          if (managerFilterDept.toLowerCase() === team.department.toLowerCase()) {
                            setManagerFilterDept('');
                          } else {
                            setManagerFilterDept(team.department);
                          }
                        }
                      }}
                      className={`relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${isSelected && activeRole === 'manager'
                          ? 'bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/50 border-teal-400 ring-2 ring-teal-400/25 shadow-sm'
                          : 'bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected && activeRole === 'manager' ? 'bg-teal-700 text-white shadow-xs' : 'bg-teal-50 text-teal-700 border border-teal-200/70'}`}>
                              <BriefcaseIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate" title={team.department}>
                                {team.department}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <p className="text-[11px] text-slate-400 font-medium">
                                  {team.totalEmployees} {team.totalEmployees === 1 ? 'Employee' : 'Employees'}
                                </p>
                                {team.subManagerName && (
                                  <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200/80">
                                    Manager: {team.subManagerName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {team.teamAvgMgrScore !== null && (
                              <span className="text-[10px] font-mono font-extrabold text-teal-900 bg-teal-100/90 px-2 py-0.5 rounded-md border border-teal-300 shadow-2xs">
                                {team.teamAvgMgrScore}%
                              </span>
                            )}
                            {isSelected && activeRole === 'manager' && (
                              <span className="text-[10px] font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar & Rate */}
                        <div className="space-y-1.5 mb-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Avg Manager Score</span>
                            <span className="font-extrabold text-slate-800">
                              {team.teamAvgMgrScore !== null ? (
                                <span className="text-teal-700 font-black">{team.teamAvgMgrScore}%</span>
                              ) : team.teamAvgScore !== null ? (
                                <span className="text-slate-600 font-bold">{team.teamAvgScore}% (Self)</span>
                              ) : (
                                <span className="text-slate-400 font-normal">Pending</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Completion Rate</span>
                            <span className="font-mono font-bold text-slate-800">
                              {team.completionPercentage}% ({team.completedCount}/{team.totalEmployees})
                            </span>
                          </div>
                          <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${team.completionPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-medium pt-1">
                          <span className="text-center py-1 px-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold" title="Calibrated / Approved">
                            {team.completedCount} Done
                          </span>
                          <span className="text-center py-1 px-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold" title="Pending Assessment">
                            {team.pendingCount} Pending
                          </span>
                          <span className={`text-center py-1 px-1 rounded-lg border font-mono font-extrabold ${team.teamAvgMgrScore !== null
                              ? 'bg-teal-50 text-teal-900 border-teal-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`} title="Department Average Manager Score">
                            {team.teamAvgMgrScore !== null ? `${team.teamAvgMgrScore}%` : 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* Direct Deliverables Matrix Controls on Each Team Card */}
                      {activeRole === 'manager' && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                          {teamCycle ? (
                            <>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${cycleLockedInfo.isLocked
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    }`}
                                  title={cycleLockedInfo.isLocked ? `Locked (${cycleLockedInfo.activeCount} active evaluations in progress)` : 'Active Deliverables Matrix (Editable)'}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${cycleLockedInfo.isLocked ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                  <span>{cycleLockedInfo.isLocked ? `Locked (${cycleLockedInfo.activeCount})` : 'Matrix: 100%'}</span>
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 ml-auto">
                                {/* Edit Matrix */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenMgrEditMatrixModal(teamCycle);
                                  }}
                                  disabled={cycleLockedInfo.isLocked}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${cycleLockedInfo.isLocked
                                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                      : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs'
                                    }`}
                                  title={cycleLockedInfo.isLocked ? 'Matrix locked because evaluations are in progress' : 'Edit Deliverables Matrix'}
                                >
                                  <PencilSquareIcon className="w-3 h-3 text-slate-500" />
                                  <span>Edit</span>
                                </button>

                                {/* Delete Matrix */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMgrDeleteMatrix(teamCycle);
                                  }}
                                  disabled={cycleLockedInfo.isLocked}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${cycleLockedInfo.isLocked
                                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 shadow-2xs'
                                    }`}
                                  title={cycleLockedInfo.isLocked ? 'Matrix locked because evaluations are in progress' : 'Delete Deliverables Matrix'}
                                >
                                  <TrashIcon className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="w-full flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-medium text-[10px]">No Matrix Configured</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenMgrCreateModal(team.department);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition cursor-pointer"
                              >
                                <span>+ Assign Matrix</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual Employee Evaluation Review Queue — ONLY shown in Direct Manager Reviews tab when a team card is selected */}
            {activeRole === 'manager' && (
              Boolean(managerFilterDept) ? (
                <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                  {/* Search & Status Filter Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                    {/* Search Bar & Selected Team Pill */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="relative flex-1 max-w-sm">
                        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={mgrSearchQuery}
                          onChange={e => setMgrSearchQuery(e.target.value)}
                          placeholder={`Search ${managerFilterDept === 'all' ? 'all reports' : managerFilterDept}...`}
                          className="w-full h-9 pl-10 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition shadow-2xs"
                        />
                        {mgrSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setMgrSearchQuery('')}
                            className="p-1 rounded-full text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {managerFilterDept && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/70 shrink-0">
                          <BuildingOfficeIcon className="w-3.5 h-3.5 text-teal-600" />
                          <span>{managerFilterDept}</span>
                          <button
                            type="button"
                            onClick={() => setManagerFilterDept('')}
                            className="ml-1 p-0.5 rounded-full hover:bg-teal-200/60 text-teal-600 hover:text-teal-900 transition cursor-pointer"
                            title="Clear team selection"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Status Segment Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                      {[
                        { id: 'all', label: 'All', count: queueStats.total },
                        { id: 'pending', label: 'Pending Review', count: queueStats.pending },
                        { id: 'submitted', label: 'Submitted', count: queueStats.submitted },
                        { id: 'approved', label: 'Calibrated', count: queueStats.approved },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setMgrStatusFilter(tab.id as any)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${mgrStatusFilter === tab.id
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                            }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${mgrStatusFilter === tab.id
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-600'
                            }`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Queue Content — Switch between Table and Cards Mode */}
                  {filteredManagerResponses.length === 0 ? (
                    <div className="py-12 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <UserGroupIcon className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">No evaluation records found</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          No direct report evaluation submissions match your current filters.
                        </p>
                      </div>
                    </div>
                  ) : mgrViewMode === 'cards' ? (
                    /* Cards Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredManagerResponses.map(r => {
                        const { employeeCode, employeeName, teamName, empInDb } = getEmployeeDisplayInfo(r);
                        const isCalibrated = r.managerScore != null && (r.status as string) !== 'manager_review' && (r.status as string) !== 'Submitted to Manager';
                        const initials = (employeeName || 'EM').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                        return (
                          <div
                            key={r.id}
                            className="group relative bg-white hover:bg-slate-50/50 rounded-2xl p-5 border border-slate-200/90 hover:border-primary-300 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              {/* Card Header */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary-800 transition">
                                      {employeeName || r.employeeName}
                                    </h4>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                        #{employeeCode}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                                        {teamName}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {renderStatusBadge(r.status)}
                              </div>

                              {/* Designation & Metric Form */}
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

                              {/* Score Comparison Gauge */}
                              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Self Score</span>
                                  <span className="text-sm font-bold text-slate-800">
                                    {r.employeeOverallScore != null ? `${Number(r.employeeOverallScore).toFixed(1)}%` : '0.0%'}
                                  </span>
                                </div>
                                <div className="space-y-0.5 border-l border-slate-200 pl-2.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Manager Score</span>
                                  <span className="text-sm font-bold text-primary-700">
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

                            {/* Card Bottom Actions */}
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectMgrResponse(r)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                              >
                                <PencilSquareIcon className="w-3.5 h-3.5" />
                                <span>{isCalibrated ? 'Recalibrate' : 'Review & Score'}</span>
                              </button>
                              {!isCalibrated && r.managerScore == null && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMgrResponseRow(r)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-200"
                                  title="Delete evaluation record from database"
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
                    /* Table View */
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
                          <tr>
                            <th className="px-5 py-3.5">Employee</th>
                            <th className="px-4 py-3.5">Team / Department</th>
                            <th className="px-4 py-3.5 text-center">Self Score</th>
                            <th className="px-4 py-3.5 text-center">Manager Score</th>
                            <th className="px-4 py-3.5 text-center">Status</th>
                            <th className="px-5 py-3.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredManagerResponses.map(r => {
                            const { employeeCode, employeeName, teamName } = getEmployeeDisplayInfo(r);
                            const isCalibrated = r.managerScore != null && (r.status as string) !== 'manager_review' && (r.status as string) !== 'Submitted to Manager';
                            const initials = (employeeName || 'EM').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                            return (
                              <tr key={r.id} className="hover:bg-slate-50/70 transition-colors group">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8.5 h-8.5 rounded-xl bg-linear-to-br from-slate-700 to-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                      {initials}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-xs text-slate-900 group-hover:text-teal-900 transition">
                                          {employeeName || r.employeeName}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-400 font-mono">
                                          #{employeeCode}
                                        </span>
                                      </div>
                                      <div className="text-[11px] font-normal text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                        <span>{r.designation || 'Team Member'}</span>
                                        {(r.periodName || (r as any).form) && (
                                          <>
                                            <span className="text-slate-300">•</span>
                                            <span className="font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200/60 text-[10px]">
                                              {r.periodName || (r as any).form}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100/80 text-slate-700 border border-slate-200/80 shadow-2xs">
                                    <BuildingOfficeIcon className="w-3 h-3 text-slate-400" />
                                    <span>{teamName}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <span className="font-mono text-xs font-semibold text-slate-800">
                                    {r.employeeOverallScore != null ? `${Number(r.employeeOverallScore).toFixed(1)}%` : '0.0%'}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  {r.managerScore != null ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/80 font-mono shadow-2xs">
                                      {Number(r.managerScore).toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200/60">
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-center">
                                  {renderStatusBadge(r.status)}
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectMgrResponse(r)}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-all hover:shadow cursor-pointer"
                                    >
                                      <PencilSquareIcon className="w-3.5 h-3.5" />
                                      <span>{isCalibrated ? 'Recalibrate' : 'Review & Score'}</span>
                                    </button>
                                    {!isCalibrated && r.managerScore == null && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMgrResponseRow(r)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-200"
                                        title="Delete evaluation record from database"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    )}
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
              ) : null
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
                    <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 font-bold flex items-center justify-center shrink-0 shadow-2xs">
                      <BriefcaseIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {team.department} Team Performance Overview
                        </h3>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200/70 shadow-2xs">
                          {team.totalEmployees} {team.totalEmployees === 1 ? 'Member' : 'Members'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        {team.subManagerName && (
                          <span>Reporting Manager: <strong className="text-slate-700 font-semibold">{team.subManagerName}</strong></span>
                        )}
                        <span className="text-slate-300">•</span>
                        <span>Avg Team Score: <strong className="text-teal-700 font-bold">{team.teamAvgMgrScore !== null ? `${team.teamAvgMgrScore}%` : (team.teamAvgScore !== null ? `${team.teamAvgScore}% (Self)` : 'Pending')}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDownlineTeamModal(null)}
                    className="w-8.5 h-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0 shadow-2xs"
                  >
                    <XMarkIcon className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>

                {/* Team Progress Telemetry Bar */}
                <div className="mt-4 pt-3.5 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Headcount</span>
                    <span className="text-sm font-bold text-slate-800">{allCount}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-semibold text-teal-600 block">Completion Rate</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold text-teal-900">{team.completionPercentage}%</span>
                      <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${team.completionPercentage}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-semibold text-amber-600 block">Pending / In Progress</span>
                    <span className="text-sm font-bold text-amber-800">{pendingCount}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-semibold text-emerald-600 block">Calibrated / Final</span>
                    <span className="text-sm font-bold text-emerald-800">{approvedCount}</span>
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${downlineModalStatusFilter === tab.id
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                        }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${downlineModalStatusFilter === tab.id
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
                    <h5 className="text-xs font-bold text-slate-700">No member records match criteria</h5>
                    <p className="text-[11px] text-slate-400">Try changing the search query or status filter.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
                        <tr>
                          <th className="px-5 py-3.5">Team Member</th>
                          <th className="px-4 py-3.5 text-center">Self Score</th>
                          <th className="px-4 py-3.5 text-center">Manager Score</th>
                          <th className="px-4 py-3.5 text-center">Status</th>
                          <th className="px-5 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {teamResponses.map(r => {
                          const { employeeCode, employeeName } = getEmployeeDisplayInfo(r);
                          const isCalibrated = r.managerScore != null || r.status === 'approved' || r.status === 'sm_final_approval';
                          const initials = (employeeName || 'EM').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                          return (
                            <tr key={r.id} className="hover:bg-slate-50/70 transition-colors group">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-teal-700 to-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-xs text-slate-900 group-hover:text-teal-900 transition">
                                        {employeeName || r.employeeName}
                                      </span>
                                      <span className="text-[10px] font-medium text-slate-400 font-mono">
                                        #{employeeCode}
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                                      {r.designation || 'Team Member'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="font-mono text-xs font-semibold text-slate-800">
                                  {r.employeeOverallScore != null ? `${Number(r.employeeOverallScore).toFixed(1)}%` : '0.0%'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                {r.managerScore != null ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/80 font-mono shadow-2xs">
                                    {Number(r.managerScore).toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200/60">
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
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-all hover:shadow cursor-pointer"
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
                  Showing <strong>{teamResponses.length}</strong> of <strong>{allCount}</strong> members in {team.department}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDownlineTeamModal(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-200 shadow-2xs"
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

        const isPendingManagerReview = Boolean(
          selectedMgrResponse!.status === 'manager_review' ||
          (selectedMgrResponse!.status as string) === 'Submitted to Manager' ||
          String(selectedMgrResponse!.status || '').toLowerCase().includes('submitted') ||
          String(selectedMgrResponse!.status || '').toLowerCase().includes('manager_review') ||
          selectedMgrResponse!.managerScore == null
        );

        const isAlreadyCalibrated = !isPendingManagerReview && Boolean(
          selectedMgrResponse!.status === 'approved' ||
          selectedMgrResponse!.status === 'sm_final_approval' ||
          (selectedMgrResponse!.status as string) === 'completed' ||
          String(selectedMgrResponse!.status).toLowerCase().includes('approved') ||
          String(selectedMgrResponse!.status).toLowerCase().includes('calibrated')
        ) && selectedMgrResponse!.managerScore != null;

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
                      {renderStatusBadge(isPendingManagerReview ? 'manager_review' : (selectedMgrResponse!.status || (isAlreadyCalibrated ? 'approved' : 'manager_review')))}
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
                                        const isOver = !isNaN(num) && (isNeg ? num > targetThreshold : (targetThreshold > 0 && num > targetThreshold));
                                        const isMet = !isNaN(num) && (isNeg ? num <= targetThreshold : (targetThreshold > 0 && num >= targetThreshold));

                                        return (
                                          <span className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full border text-xs shadow-2xs ${
                                            isNeg && isOver
                                              ? 'bg-rose-50 text-rose-900 border-rose-300'
                                              : isOver
                                                ? 'bg-emerald-50 text-emerald-950 border border-emerald-400'
                                                : isMet && !isNeg
                                                  ? 'bg-teal-50 text-teal-900 border border-teal-300'
                                                  : 'bg-slate-50 text-slate-900 border-slate-200'
                                          }`}>
                                            <span>{empActual} {kpi.unit}</span>
                                            {isOver && !isNeg && <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded-full">EXCEEDED</span>}
                                            {isOver && isNeg && <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-800 bg-rose-200/80 px-1.5 py-0.5 rounded-full">OVER LIMIT</span>}
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
                                              <span className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full border text-xs shadow-2xs ${
                                                isGoalModified
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
                                                  className={`w-16 h-8 px-2 text-center font-bold text-xs rounded-full transition shadow-2xs focus:outline-none ${
                                                    isGoalModified
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
                                                    OVER LIMIT
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

                <div className="flex items-center gap-2.5 justify-end">
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
                      <button
                        type="button"
                        onClick={handleManagerSubmit}
                        className="flex items-center justify-center gap-2 px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <CheckCircleIcon className="w-4 h-4 stroke-[2.2]" />
                        <span>{isAlreadyCalibrated ? 'Update & Recalibrate' : 'Submit Calibration & Approve'}</span>
                      </button>
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
                        <option value="all_teams">
                          All Subordinates
                        </option>
                        {managerDepartments.map(dept => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
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
                          <input
                            type="date"
                            value={mgrPeriodFromDate}
                            onChange={e => {
                              const newFrom = e.target.value;
                              setMgrPeriodFromDate(newFrom);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, newFrom, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            To Date <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={mgrPeriodToDate}
                            onChange={e => {
                              const newTo = e.target.value;
                              setMgrPeriodToDate(newTo);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, newTo, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs"
                          />
                        </div>
                      </>
                    )}

                    {mgrPeriodType === 'daily' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Due Date <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={mgrPeriodDueDate}
                          onChange={e => {
                            const newDue = e.target.value;
                            setMgrPeriodDueDate(newDue);
                            syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, newDue, mgrAssignTeamId);
                          }}
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 2: Form Title & Period Tag */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Form Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={mgrAssignFormName}
                        onChange={e => setMgrAssignFormName(e.target.value)}
                        placeholder="e.g. Q3 2026 KPI Assessment"
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Period Tag / Label
                      </label>
                      <input
                        type="text"
                        value={mgrAssignPeriod}
                        onChange={e => setMgrAssignPeriod(e.target.value)}
                        placeholder="e.g. Q3 2026 (Jul - Sep) - Stage 3"
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Row 3: Subordinates Multi-Select Box */}
                  {(() => {
                    const baseTeamMembers = mgrAssignTeamId === 'all_teams'
                      ? managerAssignableEmployees
                      : managerAssignableEmployees.filter((e: any) => (e.department || e.team || '').toLowerCase() === mgrAssignTeamId.toLowerCase());

                    const filteredMembers = mgrModalEmpSearch.trim()
                      ? baseTeamMembers.filter((e: any) => {
                        const q = mgrModalEmpSearch.toLowerCase();
                        const name = `${e.first_name || ''} ${e.last_name || ''} ${e.name || ''}`.toLowerCase();
                        const id = String(e.employee_id || e.id || '').toLowerCase();
                        const des = String(e.designation || e.role || '').toLowerCase();
                        return name.includes(q) || id.includes(q) || des.includes(q);
                      })
                      : baseTeamMembers;

                    return (
                      <div className="pt-3 border-t border-slate-200/70 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              Assign Members
                            </span>
                            <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                              {mgrAssignEmpIds.length} of {baseTeamMembers.length} selected
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {baseTeamMembers.length > 4 && (
                              <div className="relative">
                                <input
                                  type="text"
                                  value={mgrModalEmpSearch}
                                  onChange={e => setMgrModalEmpSearch(e.target.value)}
                                  placeholder="Search member..."
                                  className="w-36 sm:w-44 h-7 pl-2.5 pr-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                                />
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleMgrToggleSelectAll(baseTeamMembers)}
                              className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs hover:bg-teal-50/50 transition cursor-pointer"
                            >
                              {(() => {
                                const allIds = baseTeamMembers.map((e: any) => String(e.employee_id || e.id)).filter(Boolean);
                                const allSelected = allIds.length > 0 && allIds.every((id: string) => mgrAssignEmpIds.includes(id));
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
                              const isSelected = mgrAssignEmpIds.includes(empId);
                              const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || 'Employee';
                              const initials = (fullName.split(' ').filter(Boolean).map((n: string) => n[0]).join('') || 'E').slice(0, 2).toUpperCase();

                              return (
                                <button
                                  type="button"
                                  key={empId}
                                  onClick={() => handleMgrToggleEmp(empId)}
                                  className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition select-none cursor-pointer ${isSelected
                                      ? 'bg-teal-50/70 border-teal-600 ring-1 ring-teal-600/30 shadow-2xs'
                                      : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                  title={`Click to toggle assignment for ${fullName}${isAlreadyAssigned ? ` (Already assigned for ${mgrAssignPeriod || 'this period'})` : ''}`}
                                >
                                  <div className={`w-7 h-7 rounded-lg font-bold text-[10px] flex items-center justify-center shrink-0 ${isSelected
                                      ? 'bg-teal-700 text-white shadow-2xs'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                                    }`}>
                                    {isSelected ? '✓' : initials}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <p className={`text-xs truncate leading-tight ${isSelected ? 'font-bold text-teal-950' : 'font-medium text-slate-800'
                                        }`}>
                                        {fullName}
                                      </p>
                                      {isAlreadyAssigned && (
                                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                                          {mgrPeriodQuarter ? `Stage ${mgrPeriodQuarter}` : 'Assigned'}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] truncate leading-tight mt-0.5 text-slate-400">
                                      #{empId} • {emp.designation || emp.role || emp.department || 'Member'}
                                    </p>
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
                                        className={`w-full h-8 px-2.5 rounded-lg text-xs font-semibold focus:outline-none transition border ${
                                          isNeg
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
                                        className={`w-full h-8 px-2 rounded-lg text-xs font-bold text-center focus:outline-none transition border ${
                                          isNeg
                                            ? 'bg-rose-50/50 text-rose-700 border-rose-200 focus:bg-white focus:border-rose-500'
                                            : 'bg-slate-50/70 text-teal-900 border-slate-200 focus:bg-white focus:border-teal-600'
                                        }`}
                                      />
                                    </td>
                                    <td className="px-3 py-2 align-middle text-center">
                                      <div className={`flex items-center justify-center focus-within:bg-white border rounded-lg px-2 h-8 transition ${
                                        isNeg ? 'bg-rose-50/40 border-rose-200 focus-within:border-rose-500' : 'bg-slate-50/70 border-slate-200 focus-within:border-teal-600'
                                      }`}>
                                        <input
                                          type="number"
                                          step="any"
                                          value={kpi.targetScore}
                                          onChange={e => handleMgrUpdateKPI(cat.id, kpi.id, 'targetScore', Number(e.target.value))}
                                          className={`w-14 text-xs font-bold text-center bg-transparent focus:outline-none p-0 ${
                                            isNeg ? 'text-rose-700' : 'text-slate-800'
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
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition shadow-2xs cursor-pointer whitespace-nowrap ${
                                          isNeg
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
                                        className={`w-full h-8 px-2.5 rounded-lg text-xs font-semibold focus:outline-none transition border ${
                                          isNeg
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
                                        className={`w-full h-8 px-2 rounded-lg text-xs font-bold text-center focus:outline-none transition border ${
                                          isNeg
                                            ? 'bg-rose-50/50 text-rose-700 border-rose-200 focus:bg-white focus:border-rose-500'
                                            : 'bg-slate-50/70 text-teal-900 border-slate-200 focus:bg-white focus:border-teal-600'
                                        }`}
                                      />
                                    </td>
                                    <td className="px-3 py-2 align-middle text-center">
                                      <div className={`flex items-center justify-center focus-within:bg-white border rounded-lg px-2 h-8 transition ${
                                        isNeg ? 'bg-rose-50/40 border-rose-200 focus-within:border-rose-500' : 'bg-slate-50/70 border-slate-200 focus-within:border-teal-600'
                                      }`}>
                                        <input
                                          type="number"
                                          step="any"
                                          value={kpi.targetScore}
                                          onChange={e => handleMgrUpdateEditKPI(cat.id, kpi.id, 'targetScore', Number(e.target.value))}
                                          className={`w-14 text-xs font-bold text-center bg-transparent focus:outline-none p-0 ${
                                            isNeg ? 'text-rose-700' : 'text-slate-800'
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
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition shadow-2xs cursor-pointer whitespace-nowrap ${
                                          isNeg
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
