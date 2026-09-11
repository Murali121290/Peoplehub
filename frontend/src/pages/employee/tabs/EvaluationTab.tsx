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
  parseTargetExpression
} from '../../../services/scoreService';
import { useAuthStore } from '../../../store/authStore';
import {
  PlusIcon,
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
  EyeIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { ConfirmDialog } from '../../../components/ui/Modal/ConfirmDialog';

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
      periodStr = `Due Date: ${dueFmt}`;
      formTitle = `Performance Deliverables (Due: ${dueFmt}) - ${formTeamLabel}`;
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
  const [managerFilterDept, setManagerFilterDept] = useState<string>('all');
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
      } catch (e) {}

      // Auto-select active response for employee (strictly for the logged in user)
      const myResp = loadedResponses.find(isResponseForUser);

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
            } catch (e) {}
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
            } catch (e) {}
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

  // Check if an employee is in the user's reporting downline across all hierarchy tiers
  // (Used for Downline Teams view: Manager 1 sees Team Leads' squads; Manager 2/3/4 see full sub-manager trees)
  const isDownlineReport = (emp: any): boolean => {
    if (!emp) return false;
    if (isDirectReport(emp)) return true;
    if (isTeamLead) return false; // Team Leaders only have direct squad members
    if (isHrOrAdmin || isServiceManager) return true;

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
  const handleOpenMgrCreateModal = () => {
    if (!canCreateMetrics) {
      showAlert('Team Leads do not have permission to create and assign performance metrics. Please contact your Reporting Manager or HR.', 'Permission Denied', 'warning');
      return;
    }
    const defaultTeamVal = managerDepartments.length > 1 ? 'all_teams' : (managerDepartments[0] || 'all_teams');
    setMgrAssignTeamId(defaultTeamVal);

    // Initial selected employees = default to DESELECTED (empty array) so manager selects only intended employees
    setMgrAssignEmpIds([]);
    setMgrPeriodType('quarterly');
    setMgrPeriodQuarter(currentQuarter);
    setMgrPeriodYear(currentYear);
    syncPeriodAndFormName('quarterly', currentQuarter, currentYear, currentMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, defaultTeamVal);
    setMgrAssignCategories(DEFAULT_KPI_CATEGORIES);
    setIsMgrCreateModalOpen(true);
  };

  const handleMgrTeamChange = (newTeamId: string) => {
    setMgrAssignTeamId(newTeamId);
    // Default to deselected on team/department change
    setMgrAssignEmpIds([]);
    syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, newTeamId);
  };

  const handleMgrToggleEmp = (empId: string) => {
    setMgrAssignEmpIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleMgrToggleSelectAll = (teamEmps: any[]) => {
    const allIds = teamEmps.map(e => String(e.employee_id || e.id));
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

  const handleMgrDeleteCategory = (catId: string) => {
    if (mgrAssignCategories.length <= 1) {
      showAlert('At least one performance category is required.', 'Action Not Allowed');
      return;
    }
    setMgrAssignCategories(prev => prev.filter(c => c.id !== catId));
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
        startDate: startDate,
        endDate: endDate,
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
    if (isHrOrAdmin || isServiceManager) return true;

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
  const activeEmpResponse = (selectedResponseId && responses.find(r => r.id === selectedResponseId && isResponseForUser(r)))
    || responses.find(isResponseForUser);

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
    managerFilterDept !== 'all'
      ? managerDirectCycles.find(c => (c.teamName || '').toLowerCase() === managerFilterDept.toLowerCase())
      : undefined
  ) || managerDirectCycles.find(c => c.status === 'active') || managerDirectCycles[0];

  const activeCategories = activeCycle?.categories || DEFAULT_KPI_CATEGORIES;
  const managerTeamCategories = activeManagerCycle?.categories || activeCategories;

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

  const isMatrixLocked = filledCycleResponses.length > 0;
  const filledResponsesCount = filledCycleResponses.length;

  // Handlers for Manager Edit & Delete Deliverables Matrix
  const handleOpenMgrEditMatrixModal = () => {
    if (!activeManagerCycle) {
      showAlert('No active deliverables matrix found for this team. You can create one using "Create & Assign Metrics".', 'No Matrix Found');
      return;
    }
    if (isMatrixLocked) {
      showAlert(
        `This Deliverables Matrix cannot be edited because ${filledResponsesCount} team member(s) have already started or submitted their evaluations. Editing is locked to protect score data and maintain review consistency.`,
        'Deliverables Matrix Locked',
        'warning'
      );
      return;
    }

    setMgrEditCycleId(activeManagerCycle.id);
    setMgrEditFormName(activeManagerCycle.name || `Q${currentQuarter} Performance Metrics`);
    setMgrEditPeriod(activeManagerCycle.periodName || `Q${currentQuarter} ${currentYear} (${quarterLabel})`);
    setMgrEditTeamName(activeManagerCycle.teamName || effectiveTeamName || 'Your Team');
    setMgrEditCategories(JSON.parse(JSON.stringify(activeManagerCycle.categories || DEFAULT_KPI_CATEGORIES)));
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
    setMgrEditCategories(prev => prev.filter(c => c.id !== catId));
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
      await evaluationService.saveResponses(updatedResponses);

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

  const handleMgrDeleteMatrix = () => {
    if (!activeManagerCycle) {
      showAlert('No deliverables matrix found to delete.', 'No Matrix Found');
      return;
    }

    if (isMatrixLocked) {
      showAlert(
        `This Deliverables Matrix cannot be deleted because ${filledResponsesCount} team member(s) have already started or submitted their self-evaluations. Deletion is disabled to protect score integrity and historical records.`,
        'Deliverables Matrix Locked',
        'warning'
      );
      return;
    }

    showConfirm(
      `Are you sure you want to delete the Deliverables Matrix for "${activeManagerCycle.teamName || activeManagerCycle.name || 'this team'}" (${activeManagerCycle.periodName || 'this cycle'})? This action will remove the matrix and any unstarted employee draft templates from the database.`,
      async () => {
        try {
          const targetCycleId = activeManagerCycle.id;
          const targetTeamId = activeManagerCycle.teamId;
          const targetEmpIds = activeManagerCycle.employeeIds || [];
          const empIdsToDelete = Array.from(new Set([
            ...targetEmpIds,
            ...managerTeamResponses.map(r => String(r.employeeCode || r.employeeId || ''))
          ])).filter(Boolean);

          const updatedCycles = cycles.filter(c => c.id !== targetCycleId && (targetTeamId ? c.teamId !== targetTeamId : true));
          const updatedResponses = responses.filter(r => 
            r.cycleId !== targetCycleId && 
            (targetTeamId ? r.teamId !== targetTeamId : true) &&
            !empIdsToDelete.includes(String(r.employeeCode || r.employeeId || ''))
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
                teamName: activeManagerCycle.teamName,
                form: activeManagerCycle.name,
                managerId: activeManagerCycle.managerId || userId
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
    const { employeeName, employeeCode } = getEmployeeDisplayInfo(resp);
    showConfirm(
      `Are you sure you want to delete the evaluation record for ${employeeName || resp.employeeName} (${employeeCode || resp.employeeCode})? This will permanently remove the record from both the queue and database.`,
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
          const parsed = parseTargetExpression(kpi.targetFromManager, kpi.targetValue || 1);
          const maxTarget = parsed.threshold;
          // Disallow entering actual values greater than the target goal
          if (maxTarget > 0 && num > maxTarget) {
            cleanVal = maxTarget;
          }
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
  const selectedMgrCategories = selectedMgrCycle?.categories || managerTeamCategories;

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
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs">
          CALIBRATED / APPROVED
        </span>
      );
    }
    if (s.includes('service') || s.includes('sm') || s === 'sm final approval') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 bg-purple-50 text-purple-700 border-purple-200 shadow-2xs">
          SM FINAL APPROVAL
        </span>
      );
    }
    if (s.includes('manager') || s.includes('submitted') || s.includes('review')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 bg-blue-50 text-blue-700 border-blue-200/80 shadow-2xs">
          SUBMITTED TO MANAGER
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 bg-rose-50 text-rose-600 border-rose-200 shadow-2xs">
        ASSIGNED TO EMPLOYEE
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

      const key = String(employeeCode).trim().toLowerCase();
      const existing = map.get(key);
      const normalizedResponse: EvaluationResponse = {
        ...r,
        employeeCode,
        employeeName: employeeName || r.employeeName
      };

      if (!existing) {
        map.set(key, normalizedResponse);
      } else {
        if (
          r.status === 'manager_review' ||
          r.status === 'sm_final_approval' ||
          r.status === 'approved' ||
          (r.employeeOverallScore > 0 && existing.employeeOverallScore === 0) ||
          r.status !== 'employee_in_progress'
        ) {
          map.set(key, normalizedResponse);
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
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
    if (managerFilterDept !== 'all') {
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
        r.status === 'approved' || r.status === 'sm_final_approval' || r.managerScore != null
      );
      const completedCount = completedList.length;

      const submittedList = deptResponses.filter(r => 
        (r.status === 'manager_review' || (r.employeeOverallScore != null && r.employeeOverallScore > 0)) &&
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

  // Overall calculations across current scoped teams for the summary card
  const allTeamsTotalEmps = activeScopedResponsesForCards.length;
  const allTeamsCompletedCount = activeScopedResponsesForCards.filter(r => r.status === 'approved' || r.status === 'sm_final_approval' || r.managerScore != null).length;
  const allTeamsPendingCount = Math.max(0, allTeamsTotalEmps - allTeamsCompletedCount);
  const allTeamsSubmittedCount = activeScopedResponsesForCards.filter(r => (r.status === 'manager_review' || (r.employeeOverallScore != null && r.employeeOverallScore > 0)) && r.status !== 'approved' && r.managerScore == null).length;
  const allTeamsOverallProgress = allTeamsTotalEmps > 0 ? Math.min(100, Math.round((allTeamsCompletedCount / allTeamsTotalEmps) * 100)) : 0;
  
  const allTeamsMgrScored = activeScopedResponsesForCards.filter(r => r.managerScore != null && !isNaN(Number(r.managerScore)));
  const allTeamsMgrSum = allTeamsMgrScored.reduce((acc, r) => acc + Number(r.managerScore), 0);
  const allTeamsAvgMgrScore = allTeamsMgrScored.length > 0 ? Number((allTeamsMgrSum / allTeamsMgrScored.length).toFixed(1)) : null;

  // Executive Manager Intelligence & Calibration Stats
  const managerStats = useMemo(() => {
    const total = deduplicatedManagerResponses.length;
    const submitted = deduplicatedManagerResponses.filter(r => r.status === 'manager_review' || r.status === 'sm_final_approval' || r.status === 'approved' || (r.employeeOverallScore != null && r.employeeOverallScore > 0)).length;
    const approved = deduplicatedManagerResponses.filter(r => r.status === 'approved' || r.status === 'sm_final_approval' || r.managerScore != null).length;
    const pending = Math.max(0, total - approved);
    const validScores = deduplicatedManagerResponses
      .map(r => r.managerScore != null ? Number(r.managerScore) : (r.employeeOverallScore != null && r.employeeOverallScore > 0 ? Number(r.employeeOverallScore) : null))
      .filter((s): s is number => s !== null && !isNaN(s));
    const avgScore = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
    const submissionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, approved, pending, avgScore, submissionRate };
  }, [deduplicatedManagerResponses]);

  // Filter manager responses by search query and status pill
  const filteredManagerResponses = useMemo(() => {
    return deduplicatedManagerResponses.filter(r => {
      const { employeeCode, employeeName, teamName } = getEmployeeDisplayInfo(r);
      // Status filter
      if (mgrStatusFilter === 'pending') {
        const isPending = r.status === 'employee_in_progress' || (r.managerScore == null && r.status !== 'approved' && r.status !== 'sm_final_approval');
        if (!isPending) return false;
      } else if (mgrStatusFilter === 'submitted') {
        const isSubmitted = r.status === 'manager_review' || (r.employeeOverallScore != null && r.employeeOverallScore > 0 && r.managerScore == null);
        if (!isSubmitted) return false;
      } else if (mgrStatusFilter === 'approved') {
        const isApproved = r.status === 'approved' || r.status === 'sm_final_approval' || r.managerScore != null;
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
        `Self Remarks are mandatory for all deliverables. Please fill remarks for: ${missingRemarksKpi.slice(0, 3).join(', ')}${missingRemarksKpi.length > 3 ? ` and ${missingRemarksKpi.length - 3} more` : ''}.`,
        'Mandatory Deliverable Remarks Required',
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

    const targetCycle = cycles.find(c => c.id === r.cycleId) || activeManagerCycle;
    const targetCats = (targetCycle?.categories && targetCycle.categories.length > 0)
      ? targetCycle.categories
      : managerTeamCategories;

    targetCats.forEach(cat => {
      cat.kpis.forEach(kpi => {
        const respItem = r.kpiResponses?.[kpi.id];
        const actualVal = respItem?.managerActualValue !== undefined
          ? respItem.managerActualValue
          : (respItem?.actualValue ?? '');
        initialActuals[kpi.id] = actualVal;
        initialRemarks[kpi.id] = respItem?.managerRemarks || '';
      });
    });

    setMgrKpiActuals(initialActuals);
    setMgrKpiRemarks(initialRemarks);

    let totalScore = 0;
    targetCats.forEach(cat => {
      cat.kpis.forEach(kpi => {
        const actualVal = initialActuals[kpi.id];
        const calc = calculateKPIScore(kpi, actualVal);
        totalScore += calc.earnedScore;
      });
    });

    const calculatedScore = Number(totalScore.toFixed(2));
    setMgrScore(r.managerScore != null ? Number(r.managerScore) : calculatedScore);
    setMgrRemarks(r.managerRemarks || '');
  };

  const handleMgrRowActualChange = (kpi: KPIItem, newActualVal: string | number) => {
    const parsedTarget = parseTargetExpression(kpi.targetFromManager, kpi.targetValue || 1);
    const targetThreshold = parsedTarget.threshold;

    let sanitizedVal: string | number = newActualVal;
    if (newActualVal !== '') {
      const num = parseFloat(String(newActualVal));
      if (!isNaN(num)) {
        if (targetThreshold > 0 && num > targetThreshold && !parsedTarget.isLowerBetter) {
          sanitizedVal = targetThreshold;
        } else if (num < 0) {
          sanitizedVal = 0;
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
        `You have adjusted the target goal for: ${missingRemarksDeliverables.slice(0, 3).join(', ')}${missingRemarksDeliverables.length > 3 ? ` and ${missingRemarksDeliverables.length - 3} more` : ''}. Manager Remarks are mandatory to explain why the goal was modified.`,
        'Manager Remarks Required for Goal Adjustment',
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
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-800 border border-primary-200">
                Performance Management
              </span>
              <span className="text-xs text-neutral-400 font-bold">•</span>
              <span className="text-xs text-neutral-500 font-medium">
                Team deliverable matrix & performance scorecards
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              Performance Evaluations & Scorecards
            </h2>
          </div>

          {/* Sync Button */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => loadAllData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200/90 shadow-2xs transition cursor-pointer"
              title="Sync latest evaluations from server"
            >
              <ArrowPathIcon className={`w-4 h-4 text-primary-700 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          </div>
        </div>

        {/* Clean Segmented Navigation Tabs (Rendered when user has access to multiple roles) */}
        {(isHrOrAdmin || isServiceManager || isManager) && (
          <div className="bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 flex flex-wrap gap-1 items-center w-fit">
            {isHrOrAdmin && (
              <button
                type="button"
                onClick={() => setActiveRole('hr')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeRole === 'hr'
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
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
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeRole === 'manager'
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
              >
                <BriefcaseIcon className="w-3.5 h-3.5" />
                <span>{isTeamLead ? 'Team Lead Reviews' : 'Manager Reviews'}</span>
                {directResponsesCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeRole === 'manager'
                      ? 'bg-white text-primary-800'
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
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeRole === 'downline_teams'
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
              >
                <UserGroupIcon className="w-3.5 h-3.5" />
                <span>Downline Teams</span>
                {downlineResponsesCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeRole === 'downline_teams'
                      ? 'bg-white text-primary-800'
                      : 'bg-primary-100 text-primary-800'
                    }`}>
                    {downlineResponsesCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveRole('employee')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeRole === 'employee'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Employee Assessment</span>
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

          {employeeSubTab === 'worksheet' && (() => {
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

            const topStrengths = [...categoryPerformance].sort((a, b) => b.achievementRate - a.achievementRate).slice(0, 2);
            const focusAreas = [...categoryPerformance].sort((a, b) => a.achievementRate - b.achievementRate).slice(0, 2);

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
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* 1. Executive Performance Hero & Lifecycle Stepper */}
                <div className="bg-gradient-to-br from-white via-slate-50 to-primary-50/30 rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-6">
                  {/* Top Row: Cycle Header & Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/70">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-primary-600/20 shrink-0">
                        <SparklesIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">
                            {activeCycle?.name || 'Performance Evaluation Cycle'}
                          </h3>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-900 border border-primary-200">
                            {activeCycle?.periodName || 'Q3 2026'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Enterprise KPI Evaluation Matrix • 100% Total Deliverable Allocation
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setEmployeeSubTab('reports')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                      >
                        <DocumentChartBarIcon className="w-4 h-4 text-primary-600" />
                        <span>Official Report</span>
                      </button>
                    </div>
                  </div>

                  {/* 3-Stage Lifecycle Stepper */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Stage 1: Self Assessment */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      isEmpSubmitted
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-white border-primary-200 shadow-2xs'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Stage 1 • Self-Assessment
                        </span>
                        {isEmpSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" /> Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                            In Progress
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between">
                        <h4 className="text-xs font-bold text-slate-900">Deliverable Assessment</h4>
                        <span className="text-sm font-black text-primary-800">{selfScoreNum.toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Stage 2: Manager Calibration */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      activeEmpResponse?.status === 'approved' || activeEmpResponse?.managerScore !== undefined
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : isEmpSubmitted
                          ? 'bg-primary-50/40 border-primary-200'
                          : 'bg-slate-50/80 border-slate-200 opacity-75'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Stage 2 • Manager Review
                        </span>
                        {activeEmpResponse?.status === 'approved' || activeEmpResponse?.managerScore !== undefined ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckBadgeIcon className="w-3.5 h-3.5 text-emerald-600" /> Reviewed
                          </span>
                        ) : isEmpSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            <ClockIcon className="w-3.5 h-3.5 text-amber-600" /> Under Review
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Pending Submit</span>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between">
                        <h4 className="text-xs font-bold text-slate-900">Manager Calibration</h4>
                        <span className="text-sm font-black text-emerald-900">
                          {activeEmpResponse?.managerScore !== undefined ? `${Number(activeEmpResponse.managerScore).toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Stage 3: Official Executive Record */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      activeEmpResponse?.status === 'approved'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50/80 border-slate-200 opacity-75'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Stage 3 • Official Record
                        </span>
                        {activeEmpResponse?.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                            <CheckBadgeIcon className="w-3.5 h-3.5" /> Published
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Pending Approval</span>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between">
                        <h4 className="text-xs font-bold text-slate-900">Final Tier Rating</h4>
                        <span className="text-sm font-black text-primary-900">
                          {getRatingForScore(activeEmpResponse?.managerScore ?? selfScoreNum).grade} / 5.0
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Key Stat Cards Strip */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Self Score</span>
                        <strong className="text-lg font-black text-slate-900">{selfScoreNum.toFixed(1)}%</strong>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center font-black text-xs">
                        {getRatingForScore(selfScoreNum).grade}
                      </div>
                    </div>

                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Manager Score</span>
                        <strong className="text-lg font-black text-emerald-950">
                          {activeEmpResponse?.managerScore !== undefined ? `${Number(activeEmpResponse.managerScore).toFixed(1)}%` : 'Pending'}
                        </strong>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs">
                        {getRatingForScore(activeEmpResponse?.managerScore ?? selfScoreNum).grade}
                      </div>
                    </div>

                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Score Delta / Variance</span>
                        {scoreVariance !== null ? (
                          <strong className={`text-base font-black ${
                            scoreVariance > 0
                              ? 'text-emerald-600'
                              : scoreVariance < 0
                                ? 'text-amber-700'
                                : 'text-slate-700'
                          }`}>
                            {scoreVariance >= 0 ? `+${scoreVariance.toFixed(2)}%` : `${scoreVariance.toFixed(2)}%`}
                          </strong>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Calibration Pending</span>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                        <ArrowTrendingUpIcon className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Deliverables Progress</span>
                        <strong className="text-base font-black text-slate-900">{completedKpiCount} / {totalKpiCount} Completed</strong>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center">
                        <CheckCircleIcon className="w-4 h-4" />
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
                        placeholder="Search deliverable by name, metric, or remark..."
                        className="w-full h-8 pl-9 pr-7 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 rounded-xl focus:outline-none transition"
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
                        className={`px-3 py-1 rounded-lg transition ${
                          empFilterTab === 'all'
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
                          className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                            empFilterTab === 'adjusted'
                              ? 'bg-amber-100 text-amber-950 shadow-2xs font-black'
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
                <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xs overflow-hidden">
                  <div className="p-4 bg-slate-50/70 border-b border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Deliverable-Level Evaluation Breakdown
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {isEmpSubmitted 
                          ? 'Assessment is submitted and locked. Values reflect your submitted self-evaluation and official manager review.' 
                          : 'Enter your actual performance numbers in each metric. Earned Score updates dynamically.'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-primary-800 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200 shrink-0">
                      100% Total Deliverable Allocation
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-neutral-200">
                        <tr>
                          <th className="px-4 py-3 text-left">Deliverable Metric</th>
                          <th className="px-3 py-3 text-center">Target Goal</th>
                          <th className="px-3 py-3 text-center">Weight %</th>
                          <th className="px-3 py-3 text-center">Self Actual</th>
                          <th className="px-3 py-3 text-center">Self Score</th>
                          <th className="px-4 py-3 text-left">Self Remarks</th>
                          {isEmpSubmitted && (
                            <>
                              <th className="px-3 py-3 text-center bg-[#ebf8f2] text-slate-800 border-l border-emerald-100">Manager Actual</th>
                              <th className="px-3 py-3 text-center bg-[#ebf8f2] text-slate-800">Manager Score</th>
                              <th className="px-4 py-3 text-left bg-[#ebf8f2] text-slate-800">Manager Remarks</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 bg-white">
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
                              {/* Sleek Category Subheading Row matching Image 1 */}
                              <tr className="bg-slate-100/70 font-bold text-slate-800 border-t border-b border-slate-200/60">
                                <td colSpan={isEmpSubmitted ? 9 : 6} className="px-4 py-2.5 text-xs">
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

                                return (
                                  <tr key={kpi.id} className="hover:bg-slate-50/50 transition">
                                    {/* Deliverable Metric */}
                                    <td className="px-4 py-3 align-middle">
                                      <span className="font-bold text-neutral-900 text-xs">{kpi.name}</span>
                                    </td>

                                    {/* Target Goal */}
                                    <td className="px-3 py-3 text-center align-middle font-medium text-slate-600 text-xs">
                                      {kpi.targetFromManager || '—'} {kpi.unit || ''}
                                    </td>

                                    {/* Weight % */}
                                    <td className="px-3 py-3 text-center align-middle font-bold text-slate-700 text-xs">
                                      {kpi.targetScore}%
                                    </td>

                                    {/* Self Actual */}
                                    <td className="px-3 py-3 text-center align-middle text-xs">
                                      {isEmpSubmitted ? (
                                        <span className="font-bold text-slate-900">
                                          {val !== '' ? `${val} ${kpi.unit || ''}` : '—'}
                                        </span>
                                      ) : (
                                        <div className="flex items-center justify-center">
                                          <input
                                            type="number"
                                            min="0"
                                            max={targetThreshold > 0 ? targetThreshold : undefined}
                                            value={val}
                                            disabled={isSubmittingEmp}
                                            onChange={e => handleKPIChange(kpi, e.target.value)}
                                            placeholder="0"
                                            className="w-24 h-8 px-2 text-center font-bold text-xs rounded-lg transition shadow-2xs bg-white text-primary-900 border border-primary-300 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                          />
                                        </div>
                                      )}
                                    </td>

                                    {/* Self Score */}
                                    <td className="px-3 py-3 text-center align-middle text-xs">
                                      <span className="font-bold text-slate-900">
                                        {calc.earnedScore.toFixed(2)}%
                                      </span>
                                    </td>

                                    {/* Self Remarks */}
                                    <td className="px-4 py-3 align-middle text-xs">
                                      {isEmpSubmitted ? (
                                        <span className="text-slate-600 italic">
                                          {remarks || '—'}
                                        </span>
                                      ) : (
                                        <input
                                          type="text"
                                          value={remarks}
                                          disabled={isSubmittingEmp}
                                          onChange={e => handleKPIRemarksChange(kpi, e.target.value)}
                                          placeholder="Enter required remarks..."
                                          className={`w-full h-8 px-2.5 text-xs rounded-lg transition ${
                                            !remarks.trim()
                                              ? 'bg-amber-50/40 focus:bg-white border border-amber-300 focus:border-primary-500 text-slate-800 focus:outline-none'
                                              : 'bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-primary-500 text-slate-800 focus:outline-none'
                                          }`}
                                          required
                                        />
                                      )}
                                    </td>

                                    {/* Manager Reviewed Fields Display */}
                                    {isEmpSubmitted && (
                                      <>
                                        <td className="px-3 py-3 text-center align-middle bg-[#ebf8f2]/30 border-l border-emerald-100">
                                          {hasMgrActual && mgrActualVal !== '' ? (
                                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold transition ${
                                              isActualModifiedByMgr
                                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                            }`}>
                                              {mgrActualVal} {kpi.unit || ''}
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 font-medium">—</span>
                                          )}
                                        </td>

                                        <td className="px-3 py-3 text-center align-middle bg-[#ebf8f2]/30">
                                          <span className="font-bold text-slate-900 text-xs">
                                            {mgrEarnedScore !== null ? `${mgrEarnedScore.toFixed(2)}%` : '—'}
                                          </span>
                                        </td>

                                        <td className="px-4 py-3 align-middle bg-[#ebf8f2]/30 text-xs">
                                          <span className="text-slate-700 font-normal">
                                            {mgrRemarks || '—'}
                                          </span>
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
                  <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 font-semibold">Self Overall Score:</span>
                        <strong className="text-primary-800 text-sm font-black">{selfScoreNum.toFixed(1)}%</strong>
                      </div>
                      {activeEmpResponse?.managerScore !== undefined && (
                        <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-300 shadow-2xs">
                          <span className="text-emerald-800 font-bold">Manager Official Score:</span>
                          <strong className="text-emerald-950 text-sm font-black">{Number(activeEmpResponse.managerScore).toFixed(1)}%</strong>
                        </div>
                      )}
                      <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 font-semibold">Grade Tier:</span>
                        <strong className="text-primary-800 text-sm font-black">
                          {getRatingForScore(activeEmpResponse?.managerScore ?? selfScoreNum).grade} / 5.0
                        </strong>
                      </div>
                    </div>

                    {isEmpSubmitted ? (
                      <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-100/90 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-300 shadow-2xs">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-700" />
                        <span>Submitted to Manager (Locked)</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleEmployeeSubmit}
                        disabled={isSubmittingEmp}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-primary-600/20 transition cursor-pointer"
                      >
                        {isSubmittingEmp ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>Submit Self-Assessment to Manager</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Performance Strengths & Focus Areas Insights Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-gradient-to-br from-emerald-50/60 to-white rounded-3xl border border-emerald-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-black text-xs">
                      <SparklesIcon className="w-4 h-4 text-emerald-600" />
                      <span>Top Performance Strengths</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      High achievement categories demonstrating strongest execution consistency.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {topStrengths.map(s => (
                        <div key={s.id} className="flex items-center justify-between text-xs bg-white/90 px-3 py-1.5 rounded-xl border border-emerald-100">
                          <span className="font-bold text-slate-800 truncate">{s.name}</span>
                          <span className="font-black text-emerald-800 text-xs shrink-0 ml-2">
                            {s.effectiveScore.toFixed(2)}% / {s.targetWeight}% ({s.achievementRate.toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-primary-50/40 to-white rounded-3xl border border-primary-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center gap-2 text-primary-950 font-black text-xs">
                      <ArrowTrendingUpIcon className="w-4 h-4 text-primary-600" />
                      <span>Coaching & Growth Alignment</span>
                    </div>
                    <p className="text-[11px] text-primary-800">
                      Deliverable areas identified for performance optimization and lead mentorship.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {focusAreas.map(f => (
                        <div key={f.id} className="flex items-center justify-between text-xs bg-white/90 px-3 py-1.5 rounded-xl border border-primary-100">
                          <span className="font-bold text-slate-800 truncate">{f.name}</span>
                          <span className="font-black text-primary-800 text-xs shrink-0 ml-2">
                            {f.effectiveScore.toFixed(2)}% / {f.targetWeight}% ({f.achievementRate.toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

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
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b-2 border-primary-100 gap-4">
                <div>
                  <span className="text-xs uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 font-bold border border-primary-200">
                    Official Performance Record
                  </span>
                  <h2 className="text-2xl font-bold text-neutral-900 mt-2">
                    Executive Evaluation Report
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Employee: {activeEmpResponse ? (getEmployeeDisplayInfo(activeEmpResponse).employeeName || activeEmpResponse.employeeName) : ''} ({activeEmpResponse ? getEmployeeDisplayInfo(activeEmpResponse).employeeCode : ''}) • Cycle: {activeCycle?.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md shadow-primary-500/20 transition cursor-pointer"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
              </div>

              {/* 3-Score Rollup Grid */}
              <div className="p-6 bg-primary-50/40 rounded-2xl border border-primary-200 space-y-4">
                <span className="text-xs font-bold text-primary-800 uppercase tracking-wider block">
                  3-Way Score Alignment & Evaluation Progression
                </span>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs bg-white rounded-xl border border-neutral-200 overflow-hidden">
                    <thead className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200">
                      <tr>
                        <th className="px-4 py-3">Evaluation Tier</th>
                        <th className="px-4 py-3 text-center">Target</th>
                        <th className="px-4 py-3 text-center">Earned Score</th>
                        <th className="px-4 py-3 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-bold">
                      <tr>
                        <td className="px-4 py-3 text-neutral-900">Actual Score (Self)</td>
                        <td className="px-4 py-3 text-center text-neutral-500">100%</td>
                        <td className="px-4 py-3 text-center text-neutral-800">{activeEmpResponse?.employeeOverallScore != null ? `${Number(activeEmpResponse.employeeOverallScore).toFixed(1)}%` : '—'}</td>
                        <td className="px-4 py-3 text-center text-primary-700">{getRatingForScore(activeEmpResponse?.employeeOverallScore || 0).grade}</td>
                      </tr>
                      <tr className="bg-primary-50/30">
                        <td className="px-4 py-3 text-primary-900">Manager Rating (Official Final)</td>
                        <td className="px-4 py-3 text-center text-neutral-500">100%</td>
                        <td className="px-4 py-3 text-center text-primary-800 font-black">{activeEmpResponse?.managerScore != null ? `${Number(activeEmpResponse.managerScore).toFixed(1)}%` : 'Pending'}</td>
                        <td className="px-4 py-3 text-center text-primary-800 font-black">{getRatingForScore(activeEmpResponse?.managerScore ?? activeEmpResponse?.employeeOverallScore ?? 0).grade}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5-Star Rating Badge */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Final Performance Level</span>
                  <span className="text-base font-bold text-neutral-900">
                    {getRatingForScore(activeEmpResponse?.managerScore ?? activeEmpResponse?.serviceManagerScore ?? activeEmpResponse?.employeeOverallScore ?? 0).name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    s <= getRatingForScore(activeEmpResponse?.managerScore ?? activeEmpResponse?.serviceManagerScore ?? activeEmpResponse?.employeeOverallScore ?? 0).stars ? (
                      <StarSolid key={s} className="w-5 h-5 text-warning-500" />
                    ) : (
                      <StarIcon key={s} className="w-5 h-5 text-neutral-300" />
                    )
                  ))}
                </div>
              </div>

              {/* Detailed Performance Deliverables Breakdown */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                  Deliverable-Level Evaluation Breakdown
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-neutral-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-neutral-200">
                      <tr>
                        <th className="px-4 py-3">Deliverable Metric</th>
                        <th className="px-3 py-3 text-center">Target Goal</th>
                        <th className="px-3 py-3 text-center">Weight %</th>
                        <th className="px-3 py-3 text-center bg-primary-50/40">Self Actual</th>
                        <th className="px-3 py-3 text-center bg-primary-50/40">Self Score</th>
                        <th className="px-4 py-3">Self Remarks</th>
                        <th className="px-3 py-3 text-center bg-emerald-50/60 border-l border-emerald-100">Manager Actual</th>
                        <th className="px-3 py-3 text-center bg-emerald-50/60">Manager Score</th>
                        <th className="px-4 py-3 bg-emerald-50/60">Manager Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      {activeCategories.map((cat, catIdx) => (
                        <React.Fragment key={cat.id}>
                          <tr className="bg-slate-100/70 font-bold text-slate-800">
                            <td colSpan={9} className="px-4 py-2 text-xs">
                              {catIdx + 1}. {cat.name} ({cat.weightage}% Allocation)
                            </td>
                          </tr>
                          {cat.kpis.map(kpi => {
                            const respItem = getKpiResponseItem(kpi);
                            const selfVal = respItem?.actualValue !== undefined && respItem?.actualValue !== null && respItem?.actualValue !== ''
                              ? respItem.actualValue 
                              : (kpiInputs[kpi.id]?.actualValue ?? (kpi.name ? kpiInputs[kpi.name]?.actualValue : '') ?? '');
                            const selfScore = calculateKPIScore(kpi, selfVal).earnedScore;
                            const selfRemarks = respItem?.employeeRemarks || (kpiInputs[kpi.id]?.employeeRemarks ?? (kpi.name ? kpiInputs[kpi.name]?.employeeRemarks : '') ?? '') || '';
                            const hasMgrActual = respItem?.managerActualValue !== undefined && respItem?.managerActualValue !== null && respItem?.managerActualValue !== '';
                            const mgrVal = hasMgrActual ? respItem.managerActualValue : '';
                            const isAdjusted = hasMgrActual && String(mgrVal).trim() !== String(selfVal).trim();
                            const mgrScore = (respItem?.managerScore !== undefined && respItem?.managerScore !== null) 
                              ? Number(respItem.managerScore) 
                              : (hasMgrActual ? calculateKPIScore(kpi, mgrVal).earnedScore : null);
                            const mgrRemarks = respItem?.managerRemarks || '';

                            return (
                              <tr key={kpi.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 align-middle">
                                  <span className="font-bold text-neutral-900">{kpi.name}</span>
                                </td>
                                <td className="px-3 py-2.5 text-center align-middle font-medium text-slate-600">
                                  {kpi.targetFromManager || '—'} {kpi.unit || ''}
                                </td>
                                <td className="px-3 py-2.5 text-center align-middle font-bold text-slate-700">
                                  {kpi.targetScore}%
                                </td>
                                <td className="px-3 py-2.5 text-center align-middle bg-primary-50/20 font-bold text-primary-900">
                                  {selfVal !== '' ? `${selfVal} ${kpi.unit || ''}` : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-center align-middle bg-primary-50/20 font-black text-primary-800">
                                  {selfScore.toFixed(2)}%
                                </td>
                                <td className="px-4 py-2.5 align-middle text-slate-600 text-[11px] italic">
                                  {selfRemarks || '—'}
                                </td>
                                <td className="px-3 py-2.5 text-center align-middle bg-emerald-50/20 border-l border-emerald-100 font-bold">
                                  {hasMgrActual && mgrVal !== '' ? (
                                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                                      isAdjusted 
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                    }`}>
                                      {mgrVal} {kpi.unit || ''}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-center align-middle bg-emerald-50/20 font-black text-emerald-900">
                                  {mgrScore !== null ? `${mgrScore.toFixed(2)}%` : '—'}
                                </td>
                                <td className="px-4 py-2.5 align-middle bg-emerald-50/20 text-slate-700 text-[11px] font-medium">
                                  {mgrRemarks || '—'}
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
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MANAGER REVIEW & DOWNLINE TEAMS VIEW — PEOPLEHUB CLEAN PROFESSIONAL SUITE */}
      {/* ========================================================================= */}
      {(activeRole === 'manager' || activeRole === 'downline_teams') && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Action Header: Clean PeopleHub Header Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shrink-0 shadow-2xs">
                {activeRole === 'manager' ? (
                  <BriefcaseIcon className="w-5 h-5" />
                ) : (
                  <UserGroupIcon className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">
                    {activeRole === 'manager'
                      ? (isTeamLead ? 'Squad Performance & Evaluation Hub' : 'Team Performance & Calibration Hub')
                      : 'Downline Teams Performance Hub'}
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200/60">
                    {activeRole === 'manager'
                      ? (isTeamLead ? 'Team Leader Review Desk' : 'Direct Reporting Manager Desk')
                      : 'Downline Teams Desk'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {activeRole === 'manager'
                    ? `${managerStats.total} ${isTeamLead ? 'Squad Members' : 'Direct Reports'} • ${effectiveTeamName || (managerDepartments.length > 0 ? managerDepartments.join(', ') : (isTeamLead ? 'Direct Squad' : 'Direct Team'))}`
                    : `${managerStats.total} Downline Reports • Sub-Manager Teams`}
                </p>
              </div>
            </div>

            {canCreateMetrics && (
              <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleOpenMgrCreateModal}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                  <span>Create & Assign Metrics</span>
                </button>
              </div>
            )}
          </div>

          {/* PeopleHub Clean Metric Stat Cards (Matching Employee Attendance Style) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Stat 1: Direct Reports / Downline Reports */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                <UserGroupIcon className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {activeRole === 'manager' ? 'Direct Reports' : 'Downline Reports'}
                </span>
                <div className="text-2xl font-bold text-slate-800 leading-tight">{managerStats.total}</div>
                <p className="text-[11px] text-slate-400 truncate">
                  {activeRole === 'manager'
                    ? (managerDepartments.join(', ') || effectiveTeamName || 'Assigned Scope')
                    : 'Sub-Manager Teams'}
                </p>
              </div>
            </div>

            {/* Stat 2: Self Submissions */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckBadgeIcon className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Self Submissions</span>
                <div className="text-2xl font-bold text-slate-800 leading-tight">
                  {managerStats.submitted} <span className="text-xs font-normal text-slate-400">/ {managerStats.total}</span>
                </div>
                <p className="text-[11px] text-emerald-600 font-semibold">
                  {managerStats.submissionRate}% Submitted
                </p>
              </div>
            </div>

            {/* Stat 3: Pending Reviews */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                <ClockIcon className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Review</span>
                <div className="text-2xl font-bold text-slate-800 leading-tight">{managerStats.pending}</div>
                <p className="text-[11px] text-slate-400">
                  {managerStats.pending === 0 ? 'All reviews completed' : 'Awaiting calibration'}
                </p>
              </div>
            </div>

            {/* Stat 4: Team Avg Score */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                <ChartBarIcon className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Team Avg Score</span>
                <div className="text-2xl font-bold text-slate-800 leading-tight">
                  {managerStats.avgScore.toFixed(1)}%
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {getRatingForScore(managerStats.avgScore).name}
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Manager Team Deliverables Matrix & 100% Weightage Overview */}
          {activeRole === 'manager' && Boolean(activeManagerCycle) && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs transition-all space-y-3">
              {/* Top Row: Icon + Title & Badges (Left) | Period & Actions (Right) */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-teal-600 shrink-0">
                    <TableCellsIcon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {activeManagerCycle?.teamName || activeManagerCycle?.name || effectiveTeamName || 'Team'} — Deliverables Matrix
                      </h3>
                      {isMatrixLocked ? (
                        <span 
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs shrink-0"
                          title="Evaluations are in progress. Matrix editing and deletion are locked to preserve employee scores."
                        >
                          🔒 Locked ({filledResponsesCount} Active)
                        </span>
                      ) : (
                        <span 
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs shrink-0"
                          title="No evaluations started yet. Deliverables and weightages can be safely edited or deleted."
                        >
                          ✓ Editable
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      Active deliverables with 100% weightage allocation configured for this cycle
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap">
                  <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 shrink-0">
                    {activeManagerCycle?.periodName || periodName}
                  </span>

                  {/* Edit Matrix Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenMgrEditMatrixModal();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isMatrixLocked
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs'
                    }`}
                    title={isMatrixLocked ? 'Matrix is locked because evaluations are in progress' : 'Edit Deliverables and Weightages'}
                  >
                    <PencilSquareIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Matrix</span>
                  </button>

                  {/* Delete Matrix Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMgrDeleteMatrix();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isMatrixLocked
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 shadow-2xs'
                    }`}
                    title={isMatrixLocked ? 'Matrix is locked because evaluations are in progress' : 'Delete Deliverables Matrix'}
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowManagerDeliverablesMatrix(!showManagerDeliverablesMatrix)}
                    className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 transition shadow-2xs cursor-pointer"
                    title="Toggle Deliverables Details"
                  >
                    {showManagerDeliverablesMatrix ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Clean Category Weightage Strip */}
              <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 overflow-x-auto">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Weights:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {managerTeamCategories.map(c => (
                    <span key={c.id} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/70">
                      <span>{c.name}:</span>
                      <strong className="text-teal-700 font-bold">{c.weightage}%</strong>
                    </span>
                  ))}
                </div>
              </div>

              {showManagerDeliverablesMatrix && (
                <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {managerTeamCategories.map((cat, idx) => (
                      <div key={cat.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                          <span className="text-xs font-bold text-slate-900">
                            {idx + 1}. {cat.name}
                          </span>
                          <span className="text-[10px] font-bold text-primary-700 bg-primary-100/70 px-2.5 py-0.5 rounded-md border border-primary-200">
                            {cat.weightage}% Weight
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {cat.kpis.map(kpi => (
                            <div key={kpi.id} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-slate-200/70 shadow-2xs">
                              <span className="text-slate-800 font-medium truncate max-w-[180px]" title={kpi.name}>
                                {kpi.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-slate-400 font-medium">Target: <strong className="text-slate-700">{kpi.targetFromManager}</strong></span>
                                <span className="text-[10px] text-primary-700 font-bold bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100">{kpi.targetScore}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Manager Reviews Queue & Calibration Desk (or Downline Team Overview) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5">
            {/* Desk Header & Interactive Queue Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeRole === 'manager' ? 'Team Assessment Desk' : 'Downline Teams Performance Desk'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeRole === 'manager'
                    ? 'Review and calibrate self-assessments submitted by your direct reporting team'
                    : 'Click on any sub-manager team card below to view its specific member reports and scorecards in a popup modal.'}
                </p>
              </div>

              {activeRole === 'manager' && (
                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
                  {/* Department Selector */}
                  <div className="relative">
                    <select
                      value={managerFilterDept}
                      onChange={e => setManagerFilterDept(e.target.value)}
                      className="h-8 pl-3 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none cursor-pointer transition shadow-2xs appearance-none"
                    >
                      <option value="all">
                        All Departments ({deduplicatedManagerResponses.length} Reports)
                      </option>
                      {managerDepartments.map(dept => {
                        const deptCount = deduplicatedManagerResponses.filter(r => getEmployeeDisplayInfo(r).teamName.toLowerCase() === dept.toLowerCase()).length;
                        if (deptCount === 0) return null;
                        return (
                          <option key={dept} value={dept}>
                            {dept} ({deptCount})
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setMgrViewMode('table')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        mgrViewMode === 'table'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Executive Table View"
                    >
                      <TableCellsIcon className="w-3.5 h-3.5" />
                      <span>Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMgrViewMode('cards')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        mgrViewMode === 'cards'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Card Grid View"
                    >
                      <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                      <span>Cards</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {deduplicatedManagerResponses.length === 0 ? (
              <div className="py-14 px-4 text-center space-y-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-2xs">
                  <UserGroupIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-sm font-bold text-slate-800">
                    {activeRole === 'manager' ? 'Direct Reporting Queue is Empty' : 'Downline Teams Queue is Empty'}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {activeRole === 'manager'
                      ? 'No active performance evaluations are currently in your direct review queue.'
                      : 'No downline sub-manager team evaluations are currently found.'}
                  </p>
                </div>
                {activeRole === 'manager' && canCreateMetrics && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleOpenMgrCreateModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Create & Assign Metrics</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Section 2.1: Team-Wise Evaluation & Performance Cards */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        {activeRole === 'manager' ? 'Team Performance & Progress Overview' : 'Downline Teams & Sub-Managers Overview'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                        • {activeRole === 'downline_teams' ? 'Click a team card to open member reports in a popup' : 'Click a card to filter direct reports below'}
                      </span>
                    </div>
                    {activeRole === 'manager' && managerFilterDept !== 'all' && teamWiseCardsData.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setManagerFilterDept('all')}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>View All Teams</span>
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {/* All Teams Card - Shown ONLY when managing 2 or more distinct departments in Direct Manager view */}
                    {activeRole === 'manager' && teamWiseCardsData.length > 1 && (
                      <div
                        onClick={() => setManagerFilterDept('all')}
                        className={`relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                          managerFilterDept === 'all'
                            ? 'bg-gradient-to-br from-teal-50/70 to-emerald-50/40 border-teal-400 ring-2 ring-teal-400/20 shadow-xs'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 ${managerFilterDept === 'all' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <UserGroupIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">All Teams Overview</h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {allTeamsTotalEmps} Employees Total
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {allTeamsAvgMgrScore !== null && (
                            <span className="text-[10px] font-black text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded-md border border-teal-300 shadow-2xs">
                              {allTeamsAvgMgrScore}%
                            </span>
                          )}
                          {managerFilterDept === 'all' && (
                            <span className="text-[10px] font-bold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-md shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar & Rate */}
                      <div className="space-y-1 mb-2.5">
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
                          <span className="font-bold text-slate-800">{allTeamsOverallProgress}% ({allTeamsCompletedCount}/{allTeamsTotalEmps})</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${allTeamsOverallProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-1.5 text-[10px] font-medium pt-2 border-t border-slate-100">
                        <span className="flex-1 text-center py-0.5 px-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold" title="Calibrated / Approved">
                          {allTeamsCompletedCount} Done
                        </span>
                        <span className="flex-1 text-center py-0.5 px-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold" title="Pending Assessment">
                          {allTeamsPendingCount} Pending
                        </span>
                        <span className={`flex-1 text-center py-0.5 px-1 rounded-md border font-bold ${
                          allTeamsAvgMgrScore !== null 
                            ? 'bg-teal-50 text-teal-800 border-teal-200' 
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`} title="Overall Average Manager Score">
                          {allTeamsAvgMgrScore !== null ? `${allTeamsAvgMgrScore}%` : 'Pending'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Department / Team Cards */}
                  {teamWiseCardsData.map(team => {
                      const isSelected = managerFilterDept.toLowerCase() === team.department.toLowerCase() || (managerFilterDept === 'all' && teamWiseCardsData.length === 1);
                      return (
                        <div
                          key={team.department}
                          onClick={() => {
                            if (activeRole === 'downline_teams') {
                              setSelectedDownlineTeamModal(team);
                              setDownlineModalSearchQuery('');
                              setDownlineModalStatusFilter('all');
                            } else {
                              if (isSelected) {
                                setManagerFilterDept('all');
                              } else {
                                setManagerFilterDept(team.department);
                              }
                            }
                          }}
                          className={`relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                            isSelected && activeRole === 'manager'
                              ? 'bg-gradient-to-br from-teal-50/70 to-emerald-50/40 border-teal-400 ring-2 ring-teal-400/20 shadow-xs'
                              : 'bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`p-1.5 rounded-lg shrink-0 ${isSelected && activeRole === 'manager' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                <BriefcaseIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 truncate" title={team.department}>
                                  {team.department}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <p className="text-[11px] text-slate-500 font-medium">
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
                                <span className="text-[10px] font-black text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded-md border border-teal-300 shadow-2xs">
                                  {team.teamAvgMgrScore}%
                                </span>
                              )}
                              {isSelected && activeRole === 'manager' && (
                                <span className="text-[10px] font-bold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-md shrink-0">
                                  Active
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar & Rate */}
                          <div className="space-y-1 mb-2.5">
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
                              <span className="font-bold text-slate-800">
                                {team.completionPercentage}% ({team.completedCount}/{team.totalEmployees})
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${team.completionPercentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Status Badges */}
                          <div className="flex items-center gap-1.5 text-[10px] font-medium pt-2 border-t border-slate-100">
                            <span className="flex-1 text-center py-0.5 px-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold" title="Calibrated / Approved">
                              {team.completedCount} Done
                            </span>
                            <span className="flex-1 text-center py-0.5 px-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold" title="Pending Assessment">
                              {team.pendingCount} Pending
                            </span>
                            <span className={`flex-1 text-center py-0.5 px-1 rounded-md border font-bold ${
                              team.teamAvgMgrScore !== null 
                                ? 'bg-teal-50 text-teal-800 border-teal-200' 
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`} title="Department Average Manager Score">
                              {team.teamAvgMgrScore !== null ? `${team.teamAvgMgrScore}%` : 'Pending'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Individual Employee Evaluation Review Queue — ONLY shown in Direct Manager Reviews tab */}
                {activeRole === 'manager' && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    {/* Search & Status Filter Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/60 p-2.5 rounded-2xl border border-slate-200/80">
                      {/* Search Bar */}
                      <div className="relative w-full md:w-80">
                        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={mgrSearchQuery}
                          onChange={e => setMgrSearchQuery(e.target.value)}
                          placeholder="Search direct report, code, role..."
                          className="w-full h-8.5 pl-10 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition shadow-2xs"
                        />
                        {mgrSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setMgrSearchQuery('')}
                            className="p-1 rounded-full text-slate-400 hover:text-slate-600 absolute right-2 top-1/2 -translate-y-1/2"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Status Segment Filter Chips */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                        {[
                          { id: 'all', label: 'All', count: deduplicatedManagerResponses.length },
                          { id: 'pending', label: 'Pending Review', count: managerStats.pending },
                          { id: 'submitted', label: 'Submitted', count: managerStats.submitted },
                          { id: 'approved', label: 'Calibrated', count: managerStats.approved },
                        ].map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setMgrStatusFilter(tab.id as any)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                              mgrStatusFilter === tab.id
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              mgrStatusFilter === tab.id
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
                          const isCalibrated = r.managerScore != null || r.status === 'approved' || r.status === 'sm_final_approval';
                          const initials = (employeeName || 'EM').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                          return (
                            <div 
                              key={r.id} 
                              className="group relative bg-white hover:bg-slate-50/50 rounded-2xl p-5 border border-slate-200/90 hover:border-primary-300 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                            >
                              <div className="space-y-3.5">
                                {/* Card Top: Candidate Avatar & Info */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">
                                      {initials}
                                    </div>
                                    <div className="space-y-0.5">
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

                                {/* Designation */}
                                <div className="text-xs text-slate-500 italic flex items-center gap-1.5 flex-wrap">
                                  <span>{r.designation || 'Team Member'}</span>
                                </div>

                                {/* Score Comparison Gauge */}
                                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Self Score</span>
                                    <span className="text-sm font-bold text-slate-800">
                                      {r.employeeOverallScore != null ? `${Number(r.employeeOverallScore).toFixed(1)}%` : '0.0%'}
                                    </span>
                                  </div>
                                  <div className="space-y-0.5 border-l border-slate-200 pl-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Manager Score</span>
                                    <span className="text-sm font-bold text-primary-700">
                                      {r.managerScore != null ? `${Number(r.managerScore).toFixed(1)}%` : 'Pending'}
                                    </span>
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
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMgrResponseRow(r)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-200"
                                  title="Delete evaluation record from database"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Table View (Matching Image 1 Table Design) */
                      <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3.5">Employee</th>
                              <th className="px-4 py-3.5">Team / Department</th>
                              <th className="px-4 py-3.5 text-center">Self Score</th>
                              <th className="px-4 py-3.5 text-center">Manager Score</th>
                              <th className="px-4 py-3.5 text-center">Status</th>
                              <th className="px-4 py-3.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredManagerResponses.map(r => {
                              const { employeeCode, employeeName, teamName } = getEmployeeDisplayInfo(r);
                              const isCalibrated = r.managerScore != null || r.status === 'approved' || r.status === 'sm_final_approval';

                              return (
                                <tr key={r.id} className="hover:bg-slate-50/70 transition">
                                  <td className="px-4 py-3.5 font-bold text-slate-900">
                                    <div>
                                      <span className="font-bold text-slate-900">{employeeName || r.employeeName}</span>
                                      <span className="text-slate-400 font-medium ml-1.5">({employeeCode})</span>
                                    </div>
                                    <div className="text-[11px] font-normal text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                      <span>{r.designation || 'Team Member'}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/90 shadow-2xs">
                                      {teamName}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                                    {r.employeeOverallScore != null ? `${Number(r.employeeOverallScore).toFixed(1)}%` : '0.0%'}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span className={`font-bold text-xs px-2.5 py-1 rounded-lg ${
                                      r.managerScore != null 
                                        ? 'text-primary-800 bg-primary-50 border border-primary-200' 
                                        : 'text-slate-400 bg-slate-100'
                                    }`}>
                                      {r.managerScore != null ? `${Number(r.managerScore).toFixed(1)}%` : 'Pending'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    {renderStatusBadge(r.status)}
                                  </td>
                                  <td className="px-4 py-3.5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectMgrResponse(r)}
                                        className="px-3.5 py-1.5 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 shadow-2xs transition cursor-pointer"
                                      >
                                        {isCalibrated ? 'Recalibrate' : 'Review & Score'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMgrResponseRow(r)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-200"
                                        title="Delete evaluation record from database"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
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
                )}
              </>
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
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-teal-50/50 via-white to-slate-50/50 border-b border-slate-200/80 shrink-0">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    <BriefcaseIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {team.department} Team Members & Performance Reports
                      </h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-100/70 text-teal-800 border border-teal-200">
                        {team.totalEmployees} {team.totalEmployees === 1 ? 'Member' : 'Members'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      {team.subManagerName && (
                        <span>Reporting Manager: <strong className="text-slate-700">{team.subManagerName}</strong></span>
                      )}
                      <span>•</span>
                      <span>Avg Score: <strong className="text-teal-700">{team.teamAvgMgrScore !== null ? `${team.teamAvgMgrScore}%` : (team.teamAvgScore !== null ? `${team.teamAvgScore}% (Self)` : 'Pending')}</strong></span>
                      <span>•</span>
                      <span>Completion: <strong className="text-slate-700">{team.completionPercentage}%</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDownlineTeamModal(null)}
                  className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer shrink-0"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Search and Filters */}
              <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="relative w-full sm:w-80">
                  <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={downlineModalSearchQuery}
                    onChange={e => setDownlineModalSearchQuery(e.target.value)}
                    placeholder="Search member name, code, role..."
                    className="w-full h-8.5 pl-10 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition shadow-2xs"
                  />
                  {downlineModalSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDownlineModalSearchQuery('')}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 absolute right-2 top-1/2 -translate-y-1/2"
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
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                        downlineModalStatusFilter === tab.id
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        downlineModalStatusFilter === tab.id
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
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3.5">Team Member</th>
                          <th className="px-3 py-3.5 text-center">Self Score</th>
                          <th className="px-3 py-3.5 text-center">Manager Score</th>
                          <th className="px-3 py-3.5 text-center">Status</th>
                          <th className="px-4 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {teamResponses.map(r => {
                          const { employeeCode, employeeName } = getEmployeeDisplayInfo(r);
                          const isCalibrated = r.managerScore != null || r.status === 'approved' || r.status === 'sm_final_approval';
                          const initials = (employeeName || 'EM').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                          return (
                            <tr key={r.id} className="hover:bg-teal-50/20 transition group">
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200/80 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 group-hover:text-teal-800 transition">
                                      {employeeName || r.employeeName}
                                      <span className="text-slate-400 font-medium ml-1.5">({employeeCode})</span>
                                    </div>
                                    <div className="text-[11px] font-normal text-slate-500">
                                      {r.designation || 'Team Member'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3.5 text-center font-bold text-slate-700">
                                {r.employeeOverallScore != null ? `${Number(r.employeeOverallScore).toFixed(1)}%` : '0.0%'}
                              </td>
                              <td className="px-3 py-3.5 text-center">
                                <span className={`font-bold text-xs px-2.5 py-1 rounded-lg ${
                                  r.managerScore != null 
                                    ? 'text-teal-800 bg-teal-50 border border-teal-200' 
                                    : 'text-slate-400 bg-slate-100'
                                }`}>
                                  {r.managerScore != null ? `${Number(r.managerScore).toFixed(1)}%` : 'Pending'}
                                </span>
                              </td>
                              <td className="px-3 py-3.5 text-center">
                                {renderStatusBadge(r.status)}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleSelectMgrResponse(r)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
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
              <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500">
                  Showing <strong>{teamResponses.length}</strong> of <strong>{allCount}</strong> members in {team.department}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDownlineTeamModal(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200 shadow-2xs"
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

        const isAlreadyCalibrated = Boolean(
          selectedMgrResponse!.status === 'approved' ||
          selectedMgrResponse!.status === 'sm_final_approval' ||
          (selectedMgrResponse!.status as string) === 'completed' ||
          String(selectedMgrResponse!.status).toLowerCase().includes('approved') ||
          String(selectedMgrResponse!.status).toLowerCase().includes('calibrated') ||
          selectedMgrResponse!.managerReviewedAt ||
          (selectedMgrResponse!.managerScore != null && Number(selectedMgrResponse!.managerScore) > 0 && selectedMgrResponse!.status !== 'employee_in_progress')
        );

        const isReadOnly = activeRole === 'downline_teams' || isAlreadyCalibrated;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-slate-50/90 rounded-3xl border border-slate-200 shadow-2xl w-full max-w-[96vw] xl:max-w-[1480px] 2xl:max-w-[1620px] my-auto overflow-hidden flex flex-col max-h-[94vh]">
              
              {/* Modal Header: Candidate Profile Info & KPI Telemetry */}
              <div className="bg-white px-6 py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
                {/* Left: Employee Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-teal-500 to-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs ring-4 ring-teal-50">
                    {(employeeName || 'EM').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {employeeName}
                      </h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                        #{employeeCode}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200/70 shadow-2xs">
                        {teamName}
                      </span>
                      {renderStatusBadge(selectedMgrResponse!.status || (isAlreadyCalibrated ? 'approved' : 'manager_review'))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Designation: <strong className="text-slate-700 font-semibold">{selectedMgrResponse!.designation || 'Team Member'}</strong></span>
                      <span>•</span>
                      <span>Evaluation Period: <strong className="text-slate-700 font-semibold">{cyclePeriod}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right: Dual Score Telemetry Cards & Close Button */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-2.5">
                    {/* Self Score Card */}
                    <div className="bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200 text-center min-w-[85px] shadow-2xs">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Self Score</span>
                      <span className="text-sm font-black text-slate-800">{empScore.toFixed(1)}%</span>
                    </div>

                    {/* Manager Calibrated Score Card */}
                    <div className="bg-teal-50 px-4 py-2 rounded-2xl border border-teal-200 text-center min-w-[100px] shadow-2xs ring-2 ring-teal-500/10">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-teal-700 block">Manager Score</span>
                      <span className="text-sm font-black text-teal-900">{mgrScore.toFixed(1)}%</span>
                    </div>

                    {/* Grade Badge */}
                    <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200 text-center min-w-[120px] shadow-2xs">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 block">Resolved Grade</span>
                      <span className="text-xs font-bold text-emerald-800 block truncate">{rating.name} ({rating.grade})</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMgrResponseId('')}
                    className="w-9 h-9 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition shadow-2xs cursor-pointer ml-1"
                    title="Close Dialog"
                  >
                    <XMarkIcon className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Scrollable Structured Matrix Cards */}
              <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
                {/* Dual Score Telemetry for Mobile */}
                <div className="flex sm:hidden items-center justify-between gap-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-center">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">Self</span>
                    <span className="text-xs font-bold text-slate-800">{empScore.toFixed(1)}%</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] font-bold uppercase text-teal-700 block">Manager</span>
                    <span className="text-xs font-bold text-teal-900">{mgrScore.toFixed(1)}%</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] font-bold uppercase text-emerald-700 block">Grade</span>
                    <span className="text-xs font-bold text-emerald-800">{rating.name}</span>
                  </div>
                </div>

                {/* Categories Loop: Each category rendered as an elegant card */}
                {selectedMgrCategories.map(cat => {
                  let catTotalMgrEarned = 0;
                  cat.kpis.forEach(kpi => {
                    const respItem = selectedMgrResponse!.kpiResponses?.[kpi.id];
                    const empActual = respItem?.actualValue ?? '';
                    const curMgrActual = mgrKpiActuals[kpi.id] !== undefined ? mgrKpiActuals[kpi.id] : empActual;
                    catTotalMgrEarned += calculateKPIScore(kpi, curMgrActual).earnedScore;
                  });

                  return (
                    <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                      {/* Category Header Strip */}
                      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/70 flex items-center justify-center shrink-0">
                            <SparklesIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs text-slate-900">{cat.name}</h4>
                              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/80">
                                {cat.weightage}% Category Weight
                              </span>
                            </div>
                            {cat.description && (
                              <p className="text-[10px] text-slate-400 font-medium">{cat.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <span className="text-[11px] text-slate-500 font-medium">Category Score:</span>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                            {catTotalMgrEarned.toFixed(2)}% / {cat.weightage}%
                          </span>
                        </div>
                      </div>

                      {/* Category Deliverables Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[900px] table-auto">
                          <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100 text-[11px]">
                            <tr>
                              <th className="px-4 py-3 min-w-[200px]">Deliverable Specification</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[90px]">Target Goal</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[90px]">Target Score</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[100px]">Actual PM</th>
                              <th className="px-3 py-3 text-center whitespace-nowrap min-w-[95px]">Earned Score</th>
                              <th className="px-3 py-3 min-w-[130px] max-w-[160px]">Employee Remarks</th>
                              <th className="px-3 py-3 text-center min-w-[150px] bg-teal-50/30 text-teal-950 font-bold">
                                {isReadOnly ? 'Manager Goal & Score' : 'Calibrate Manager Goal'}
                              </th>
                              <th className="px-4 py-3 min-w-[190px] bg-slate-50/40 text-slate-700 font-bold">
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

                              return (
                                <tr key={kpi.id} className="hover:bg-slate-50/70 transition">
                                  {/* Deliverable Specification */}
                                  <td className="px-4 py-3 font-medium text-slate-800">
                                    <div className="font-bold text-slate-900">{kpi.name}</div>
                                    {kpi.description && (
                                      <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">{kpi.description}</div>
                                    )}
                                  </td>

                                  {/* Target Goal */}
                                  <td className="px-3 py-3 text-center text-slate-700 font-semibold text-[11px] whitespace-nowrap">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                                      {kpi.targetFromManager}
                                    </span>
                                  </td>

                                  {/* Target Score */}
                                  <td className="px-3 py-3 text-center font-bold text-slate-700 text-[11px] whitespace-nowrap">
                                    {kpi.targetScore}%
                                  </td>

                                  {/* Actual PM */}
                                  <td className="px-3 py-3 text-center font-bold text-teal-900 text-[11px] whitespace-nowrap">
                                    {empActual !== '' && empActual !== null && empActual !== undefined ? (
                                      <span className="px-2 py-0.5 bg-teal-50 text-teal-900 rounded-md border border-teal-200/80">
                                        {empActual} {kpi.unit}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>

                                  {/* Earned Score */}
                                  <td className="px-3 py-3 text-center font-bold text-teal-700 text-[11px] whitespace-nowrap">
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200/80">
                                      {calcEmp.earnedScore.toFixed(2)}%
                                    </span>
                                  </td>

                                  {/* Employee Remarks */}
                                  <td className="px-3 py-3 text-slate-600 text-[11px] max-w-[160px]">
                                    {respItem?.employeeRemarks ? (
                                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/80 text-[10px] text-slate-700 italic truncate" title={respItem.employeeRemarks}>
                                        "{respItem.employeeRemarks}"
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 italic text-[11px]">—</span>
                                    )}
                                  </td>

                                  {/* Manager Goal & Score Column */}
                                  <td className="px-3 py-3 text-center bg-teal-50/20">
                                    <div className="flex flex-col items-center justify-center gap-1.5">
                                      {isReadOnly ? (
                                        <div className="flex items-center justify-center gap-1 font-bold text-xs text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                          <span>{currentMgrActual !== '' && currentMgrActual !== null && currentMgrActual !== undefined ? currentMgrActual : (empActual || '—')}</span>
                                          {kpi.unit && <span className="text-[10px] text-slate-500 font-semibold">{kpi.unit}</span>}
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center gap-1">
                                          <input
                                            type="number"
                                            min="0"
                                            max={targetThreshold > 0 && !parsedTarget.isLowerBetter ? targetThreshold : undefined}
                                            value={currentMgrActual}
                                            onChange={e => handleMgrRowActualChange(kpi, e.target.value)}
                                            placeholder="0"
                                            className={`w-18 sm:w-20 h-7.5 px-2 text-center font-bold text-xs rounded-xl focus:outline-none transition ${isGoalModified
                                                ? 'bg-amber-50 text-amber-900 border-2 border-amber-400 focus:border-amber-600 shadow-2xs ring-2 ring-amber-400/20'
                                                : 'bg-white text-teal-950 border border-teal-300 focus:border-teal-500 shadow-2xs focus:ring-2 focus:ring-teal-500/20'
                                              }`}
                                          />
                                          {kpi.unit && <span className="text-[10px] text-slate-500 font-semibold">{kpi.unit}</span>}
                                        </div>
                                      )}

                                      <div className="flex items-center gap-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isGoalModified
                                            ? 'text-amber-800 bg-amber-100 border border-amber-200'
                                            : 'text-teal-800 bg-teal-50 border border-teal-200'
                                          }`}>
                                          {calcMgr.earnedScore.toFixed(2)}%
                                        </span>
                                        {isGoalModified && !isReadOnly && (
                                          <span className="text-[9px] font-bold uppercase text-amber-700 px-1 py-0.2 rounded bg-amber-50 border border-amber-200">
                                            Adjusted
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Manager Remarks Column */}
                                  <td className="px-4 py-3">
                                    {isReadOnly ? (
                                      <div className="text-xs text-slate-700 font-medium">
                                        {currentMgrRemark ? (
                                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-800 text-[11px] leading-relaxed italic">
                                            "{currentMgrRemark}"
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 italic text-[11px]">—</span>
                                        )}
                                      </div>
                                    ) : (
                                      <input
                                        type="text"
                                        value={currentMgrRemark}
                                        onChange={e => handleMgrRowRemarkChange(kpi.id, e.target.value)}
                                        placeholder={isGoalModified ? 'Required: reason for goal change...' : 'Add manager remarks...'}
                                        className={`w-full h-7.5 px-3 text-xs rounded-xl focus:outline-none transition ${isGoalModified && !currentMgrRemark.trim()
                                            ? 'bg-amber-50/90 border-2 border-amber-400 focus:border-amber-600 text-slate-900 placeholder:text-amber-700 font-medium ring-2 ring-amber-400/20'
                                            : 'bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-teal-500 text-slate-800 shadow-2xs focus:ring-2 focus:ring-teal-500/20'
                                          }`}
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
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/60">
                      <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                    </div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Overall Manager Evaluation Summary & Feedback
                    </label>
                  </div>
                  {isReadOnly ? (
                    <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs text-slate-800 leading-relaxed min-h-[64px] italic">
                      {mgrRemarks || 'No overall remarks provided.'}
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      value={mgrRemarks}
                      onChange={e => setMgrRemarks(e.target.value)}
                      placeholder="Enter comprehensive performance evaluation summary, key strengths, growth areas, and commendations..."
                      className="w-full p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition shadow-2xs"
                    />
                  )}
                </div>
              </div>

              {/* Modal Sticky Footer */}
              <div className="px-6 py-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-lg">
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 font-semibold">{isReadOnly ? 'Final Calibrated Score:' : 'Total Calibrated Score:'}</span>
                    <strong className="text-teal-900 text-sm font-black">{mgrScore.toFixed(1)}%</strong>
                  </div>
                  <div className="flex items-center gap-2.5 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-emerald-700 font-semibold">Resolved Grade:</span>
                    <strong className="text-emerald-900 text-xs font-bold">{rating.name} ({rating.grade})</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-end">
                  {isReadOnly ? (
                    <button
                      type="button"
                      onClick={() => setSelectedMgrResponseId('')}
                      className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                    >
                      Close Report
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedMgrResponseId('')}
                        className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200 shadow-2xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleManagerSubmit}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer"
                      >
                        <CheckCircleIcon className="w-4 h-4 stroke-[2.5]" />
                        <span>Submit Calibration & Approve</span>
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
            {/* Modal Header: Clean PeopleHub Header */}
            <div className="flex items-center justify-between p-5 bg-white border-b border-slate-200/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shrink-0">
                  <PlusIcon className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Assign Performance Metrics
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60">
                      Reporting Manager
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Configure period, direct reports, and deliverable targets
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
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/70">
                    {mgrAssignEmpIds.length} Selected
                  </span>
                </div>

                {/* Unified Configuration Container */}
                <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
                  {/* Row 1: Team & Period Frequency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 1. Target Department / Team */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Department / Team <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={mgrAssignTeamId}
                        onChange={e => handleMgrTeamChange(e.target.value)}
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs cursor-pointer"
                      >
                        <option value="all_teams">
                          All Subordinates ({managerDepartments.length > 0 ? managerDepartments.join(', ') : 'All Teams'})
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
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Frequency <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={mgrPeriodType}
                        onChange={e => {
                          const newType = e.target.value as any;
                          setMgrPeriodType(newType);
                          syncPeriodAndFormName(newType, mgrPeriodQuarter, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                        }}
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs cursor-pointer"
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
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Period / Stage <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={mgrPeriodQuarter}
                            onChange={e => {
                              const newQ = Number(e.target.value);
                              setMgrPeriodQuarter(newQ);
                              syncPeriodAndFormName(mgrPeriodType, newQ, mgrPeriodYear, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs cursor-pointer"
                          >
                            {QUARTERS_INFO.map(q => (
                              <option key={q.q} value={q.q}>
                                {q.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">Year</label>
                          <input
                            type="number"
                            value={mgrPeriodYear}
                            onChange={e => {
                              const newYr = Number(e.target.value);
                              setMgrPeriodYear(newYr);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, newYr, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs"
                          />
                        </div>
                      </>
                    )}

                    {mgrPeriodType === 'monthly' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Month <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={mgrPeriodMonth}
                            onChange={e => {
                              const newM = Number(e.target.value);
                              setMgrPeriodMonth(newM);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, mgrPeriodYear, newM, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs cursor-pointer"
                          >
                            {MONTH_NAMES.map((name, idx) => (
                              <option key={name} value={idx + 1}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">Year</label>
                          <input
                            type="number"
                            value={mgrPeriodYear}
                            onChange={e => {
                              const newYr = Number(e.target.value);
                              setMgrPeriodYear(newYr);
                              syncPeriodAndFormName(mgrPeriodType, mgrPeriodQuarter, newYr, mgrPeriodMonth, mgrPeriodFromDate, mgrPeriodToDate, mgrPeriodDueDate, mgrAssignTeamId);
                            }}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs"
                          />
                        </div>
                      </>
                    )}

                    {mgrPeriodType === 'weekly' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
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
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
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
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs"
                          />
                        </div>
                      </>
                    )}

                    {mgrPeriodType === 'daily' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
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
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 2: Form Title & Period Tag */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Form Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={mgrAssignFormName}
                        onChange={e => setMgrAssignFormName(e.target.value)}
                        placeholder="e.g. Q3 2026 KPI Assessment"
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Period Tag / Label
                      </label>
                      <input
                        type="text"
                        value={mgrAssignPeriod}
                        onChange={e => setMgrAssignPeriod(e.target.value)}
                        placeholder="e.g. Q3 2026 (Jul - Sep) - Stage 3"
                        className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs"
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
                            <span className="text-xs font-bold text-slate-800">
                              Assign Team & Squad Members
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
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
                                  className="w-36 sm:w-44 h-7 pl-2.5 pr-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
                                />
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleMgrToggleSelectAll(baseTeamMembers)}
                              className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                            >
                              {baseTeamMembers.length > 0 && baseTeamMembers.every((e: any) => mgrAssignEmpIds.includes(String(e.employee_id || e.id))) ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                        </div>

                        {filteredMembers.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2 text-center">
                            {baseTeamMembers.length === 0 ? 'No team members found under this department.' : 'No members match the search query.'}
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                            {filteredMembers.map((emp: any) => {
                              const empId = String(emp.employee_id || emp.id);
                              const isSelected = mgrAssignEmpIds.includes(empId);
                              const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || 'Employee';
                              const initials = (fullName.split(' ').filter(Boolean).map((n: string) => n[0]).join('') || 'E').slice(0, 2).toUpperCase();

                              return (
                                <button
                                  type="button"
                                  key={empId}
                                  onClick={() => handleMgrToggleEmp(empId)}
                                  className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition cursor-pointer select-none ${
                                    isSelected
                                      ? 'bg-teal-50/50 border-teal-400 ring-1 ring-teal-400/30 shadow-2xs'
                                      : 'bg-white border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-lg font-bold text-[10px] flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'bg-teal-600 text-white shadow-2xs'
                                      : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                                  }`}>
                                    {initials}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-xs truncate leading-tight ${isSelected ? 'font-bold text-teal-950' : 'font-medium text-slate-800'}`}>
                                      {fullName}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
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
                        Deliverable Metrics & Targets
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
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                    >
                      Reset Template
                    </button>
                    <button
                      type="button"
                      onClick={handleMgrAddCategory}
                      disabled={mgrTotalWeightage >= 100}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${mgrTotalWeightage >= 100
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-primary-50 text-primary-800 border border-primary-200 hover:bg-primary-100 cursor-pointer'
                        }`}
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Add Category</span>
                    </button>
                  </div>
                </div>

                {/* Weightage Status Alert */}
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 ${mgrTotalWeightage === 100 && areAllMgrCategoriesBalanced
                    ? 'bg-primary-50 border border-primary-200 text-primary-900'
                    : 'bg-amber-50 border border-amber-200 text-amber-900'
                  }`}>
                  <div className="flex items-center gap-2">
                    {mgrTotalWeightage === 100 && areAllMgrCategoriesBalanced ? (
                      <CheckCircleIcon className="w-4 h-4 text-primary-600 shrink-0" />
                    ) : (
                      <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      Total Category Weight: <strong>{mgrTotalWeightage}% / 100%</strong>
                      {!areAllMgrCategoriesBalanced && ' — Please balance deliverable scores.'}
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
                            <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {catIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={cat.name}
                              onChange={e => handleMgrUpdateCategoryName(cat.id, e.target.value)}
                              placeholder="Category name..."
                              className="font-bold text-xs text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-primary-600 focus:outline-none px-1 py-0.5 w-full max-w-md"
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
                                className="w-12 text-xs font-bold text-primary-800 text-center focus:outline-none"
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
                                <th className="px-3 py-2 w-36 text-center">Target</th>
                                <th className="px-3 py-2 w-28 text-center">Score %</th>
                                <th className="px-3 py-2 w-24 text-center">Unit</th>
                                <th className="px-2 py-2 w-10 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {cat.kpis.map(kpi => (
                                <tr key={kpi.id} className="hover:bg-slate-50/50 transition">
                                  <td className="px-3 py-2 align-middle">
                                    <input
                                      type="text"
                                      value={kpi.name}
                                      onChange={e => handleMgrUpdateKPI(cat.id, kpi.id, 'name', e.target.value)}
                                      placeholder="Deliverable description..."
                                      className="w-full h-8 px-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-primary-500 rounded-lg text-xs font-medium text-slate-800 focus:outline-none transition"
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-middle text-center">
                                    <input
                                      type="text"
                                      value={kpi.targetFromManager ?? ''}
                                      onChange={e => handleMgrUpdateKPI(cat.id, kpi.id, 'targetFromManager', e.target.value)}
                                      placeholder="e.g. 3, 11, 1950, <2"
                                      className="w-full h-8 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-primary-500 rounded-lg text-xs font-bold text-center text-primary-900 focus:outline-none transition"
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-middle text-center">
                                    <div className="flex items-center justify-center bg-slate-50/70 focus-within:bg-white border border-slate-200 focus-within:border-primary-500 rounded-lg px-2 h-8 transition">
                                      <input
                                        type="number"
                                        step="any"
                                        value={kpi.targetScore}
                                        onChange={e => handleMgrUpdateKPI(cat.id, kpi.id, 'targetScore', Number(e.target.value))}
                                        className="w-14 text-xs font-bold text-center text-slate-800 bg-transparent focus:outline-none p-0"
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
                                      className="w-full h-8 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-primary-500 rounded-lg text-xs font-medium text-center text-slate-700 focus:outline-none transition"
                                    />
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
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleMgrAddKPI(cat.id)}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-primary-800 bg-white hover:bg-primary-50 rounded-xl transition shadow-2xs border border-primary-200/80 cursor-pointer"
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
                  className={`flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-2xs transition-all cursor-pointer ${isMgrWeightageValid && areAllMgrCategoriesBalanced && mgrAssignEmpIds.length > 0 && !isAssigning
                      ? 'bg-primary-600 hover:bg-primary-700'
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
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <PencilSquareIcon className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Edit Deliverables Matrix
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Unlocked (0 Submissions)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {mgrEditTeamName || 'Team'} • Modify category weights and targets
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Form Title</label>
                  <input
                    type="text"
                    value={mgrEditFormName}
                    onChange={e => setMgrEditFormName(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-primary-500"
                    placeholder="Form title..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Period Tag</label>
                  <input
                    type="text"
                    value={mgrEditPeriod}
                    onChange={e => setMgrEditPeriod(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-primary-500"
                    placeholder="Period..."
                    required
                  />
                </div>
              </div>

              {/* Matrix Categories & Targets */}
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-600"></span>
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
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                    >
                      Reset Template
                    </button>
                    <button
                      type="button"
                      onClick={handleMgrAddEditCategory}
                      disabled={mgrEditTotalWeightage >= 100}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        mgrEditTotalWeightage >= 100
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-primary-50 text-primary-800 border border-primary-200 hover:bg-primary-100 cursor-pointer'
                      }`}
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Add Metric Category</span>
                    </button>
                  </div>
                </div>

                {/* Weightage Status Alert */}
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 ${
                  mgrEditTotalWeightage === 100 && areAllMgrEditCategoriesBalanced
                    ? 'bg-primary-50 border border-primary-200 text-primary-900'
                    : 'bg-amber-50 border border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-center gap-2">
                    {mgrEditTotalWeightage === 100 && areAllMgrEditCategoriesBalanced ? (
                      <CheckCircleIcon className="w-4 h-4 text-primary-600 shrink-0" />
                    ) : (
                      <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      Total Category Weightage: <strong>{mgrEditTotalWeightage}% / 100%</strong>
                      {!areAllMgrEditCategoriesBalanced && ' — Deliverable target scores must equal category weight.'}
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
                            <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {catIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={cat.name}
                              onChange={e => handleMgrUpdateEditCategoryName(cat.id, e.target.value)}
                              placeholder="Performance Metric Category Name..."
                              className="font-bold text-xs text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-primary-600 focus:outline-none px-1 py-0.5 w-full max-w-md"
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
                                className="w-12 text-xs font-black text-primary-800 text-center focus:outline-none"
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
                                <th className="px-3 py-2 text-left">Deliverable Name / Specification</th>
                                <th className="px-3 py-2 w-36 text-center">Target from Manager</th>
                                <th className="px-3 py-2 w-28 text-center">Target Score %</th>
                                <th className="px-3 py-2 w-24 text-center">Unit</th>
                                <th className="px-2 py-2 w-10 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {cat.kpis.map(kpi => (
                                <tr key={kpi.id} className="hover:bg-slate-50/50 transition">
                                  <td className="px-3 py-2 align-middle">
                                    <input
                                      type="text"
                                      value={kpi.name}
                                      onChange={e => handleMgrUpdateEditKPI(cat.id, kpi.id, 'name', e.target.value)}
                                      placeholder="Deliverable description..."
                                      className="w-full h-8 px-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-primary-500 rounded-lg text-xs font-medium text-slate-800 focus:outline-none transition"
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-middle text-center">
                                    <input
                                      type="text"
                                      value={kpi.targetFromManager ?? ''}
                                      onChange={e => handleMgrUpdateEditKPI(cat.id, kpi.id, 'targetFromManager', e.target.value)}
                                      placeholder="e.g. 3, 11, 1950, <2"
                                      className="w-full h-8 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-primary-500 rounded-lg text-xs font-bold text-center text-primary-900 focus:outline-none transition"
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-middle text-center">
                                    <div className="flex items-center justify-center bg-slate-50/70 focus-within:bg-white border border-slate-200 focus-within:border-primary-500 rounded-lg px-2 h-8 transition">
                                      <input
                                        type="number"
                                        step="any"
                                        value={kpi.targetScore}
                                        onChange={e => handleMgrUpdateEditKPI(cat.id, kpi.id, 'targetScore', Number(e.target.value))}
                                        className="w-14 text-xs font-bold text-center text-slate-800 bg-transparent focus:outline-none p-0"
                                      />
                                      <span className="text-[11px] text-slate-400 font-bold ml-0.5">%</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 align-middle text-center">
                                    <input
                                      type="text"
                                      value={kpi.unit}
                                      onChange={e => handleMgrUpdateEditKPI(cat.id, kpi.id, 'unit', e.target.value)}
                                      placeholder="projects"
                                      className="w-full h-8 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-primary-500 rounded-lg text-xs font-medium text-center text-slate-700 focus:outline-none transition"
                                    />
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
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleMgrAddEditKPI(cat.id)}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-primary-800 bg-white hover:bg-primary-50 rounded-xl transition shadow-2xs border border-primary-200/80 cursor-pointer"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Add Deliverable Row</span>
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
                  className={`flex items-center justify-center gap-2 px-8 py-3 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer ${
                    isMgrEditWeightageValid && areAllMgrEditCategoriesBalanced && !isSavingMatrixEdit
                      ? 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/25 transform hover:-translate-y-0.5'
                      : 'bg-slate-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  <SparklesIcon className="w-4 h-4 text-warning-300" />
                  <span>
                    {isSavingMatrixEdit ? 'Saving Matrix Changes...' : 'Save Matrix Changes'}
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
