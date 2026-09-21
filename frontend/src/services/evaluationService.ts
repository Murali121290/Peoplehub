import { API_URL } from '../config/api';
import { getEmployees } from './employeesCache';
import { 
  EvaluationCycle, 
  EvaluationResponse, 
  KPICategory, 
  KPIItem,
  KPIResponseItem,
  EvaluationStage,
  RatingLevel
} from '../types/evaluation.types';
import { calculateOverallScore, setRatingScale, getRatingScale } from './scoreService';

const CYCLES_STORAGE_KEY = 'peoplehub_evaluation_cycles_v2';
const RESPONSES_STORAGE_KEY = 'peoplehub_evaluation_responses_v2';
const RATING_SCALE_STORAGE_KEY = 'peoplehub_rating_scale_v2';

// Initialize rating scale from localStorage if available
try {
  const cachedScale = localStorage.getItem(RATING_SCALE_STORAGE_KEY);
  if (cachedScale) {
    setRatingScale(JSON.parse(cachedScale));
  }
} catch (e) {
  // ignore
}

export interface ManagerKpiTemplateRecord {
  id?: number;
  manager_id: string;
  manager_name?: string;
  template_key: string;
  template_name: string;
  team_id?: string;
  team_name?: string;
  categories: KPICategory[];
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_KPI_CATEGORIES: KPICategory[] = [
  {
    id: 'cat_productivity',
    name: 'Productivity (Number of Active Projects)',
    description: 'Project volume, complexity handling, and throughput page counts',
    weightage: 30,
    kpis: [
      {
        id: 'kpi_proj_simple',
        name: 'Simple Projects',
        description: 'Standard quick turnaround projects completed',
        targetScore: 3.33,
        weightage: 3.33,
        targetFromManager: '3',
        targetValue: 3,
        unit: 'projects',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      },
      {
        id: 'kpi_proj_moderate',
        name: 'Moderate Projects',
        description: 'Multi-step intermediate complexity deliverables',
        targetScore: 3.33,
        weightage: 3.33,
        targetFromManager: '11',
        targetValue: 11,
        unit: 'projects',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      },
      {
        id: 'kpi_proj_complex',
        name: 'Complex Projects',
        description: 'High difficulty customized client assignments',
        targetScore: 3.34,
        weightage: 3.34,
        targetFromManager: '1',
        targetValue: 1,
        unit: 'projects',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      },
      {
        id: 'kpi_pages_first_pass',
        name: 'Number of Pages (First pass)',
        description: 'Total volume of pages processed in initial review pass',
        targetScore: 10,
        weightage: 10,
        targetFromManager: '1950',
        targetValue: 1950,
        unit: 'pages',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      },
      {
        id: 'kpi_pages_final',
        name: 'Number of Pages (Final pages)',
        description: 'Total approved production-ready output pages delivered',
        targetScore: 10,
        weightage: 10,
        targetFromManager: '1950',
        targetValue: 1950,
        unit: 'pages',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      }
    ]
  },
  {
    id: 'cat_customer_engagement',
    name: 'Customer Engagement',
    description: 'Client communication, SLA compliance, issue escalations, and satisfaction',
    weightage: 30,
    kpis: [
      {
        id: 'kpi_appreciations',
        name: 'Client Appreciations',
        description: 'Direct praise, positive feedback, or awards from customers',
        targetScore: 5,
        weightage: 5,
        targetFromManager: '1',
        targetValue: 1,
        unit: 'appreciations',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: false
      },
      {
        id: 'kpi_effective_comm',
        name: 'Effective Communication (Mail reply within 24 hrs)',
        description: 'Timely and polite response to all client and stakeholder emails',
        targetScore: 10,
        weightage: 10,
        targetFromManager: '<2 delays',
        targetValue: 2,
        unit: 'delays',
        scoringDirection: 'lower_is_better',
        measurementType: 'number',
        isRequired: true
      },
      {
        id: 'kpi_ontime_status',
        name: 'Ontime Status Reporting / Daily Update',
        description: 'Daily standup and task tracking sheet consistency',
        targetScore: 5,
        weightage: 5,
        targetFromManager: '0 misses',
        targetValue: 0,
        unit: 'misses',
        scoringDirection: 'lower_is_better',
        measurementType: 'number',
        isRequired: true
      },
      {
        id: 'kpi_escalations',
        name: 'Escalations Avoidance',
        description: 'Zero unresolved operational or delivery escalations',
        targetScore: 5,
        weightage: 5,
        targetFromManager: '0',
        targetValue: 0,
        unit: 'escalations',
        scoringDirection: 'lower_is_better',
        measurementType: 'number',
        isRequired: true
      },
      {
        id: 'kpi_proactive_problem_solving',
        name: 'Proactive & Problem Solving',
        description: 'Anticipates bottlenecks and implements proactive solutions',
        targetScore: 5,
        weightage: 5,
        targetFromManager: '1 initiative',
        targetValue: 1,
        unit: 'initiatives',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      }
    ]
  },
  {
    id: 'cat_cross_functional',
    name: 'Cross-functional Coordination',
    description: 'Process governance, inter-departmental alignment, and independence',
    weightage: 20,
    kpis: [
      {
        id: 'kpi_process_compliance',
        name: 'Process Compliance',
        description: 'Strict adherence to ISO, security, and quality checklist protocols',
        targetScore: 10,
        weightage: 10,
        targetFromManager: '100%',
        targetValue: 1,
        unit: 'checklists',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      },
      {
        id: 'kpi_supervision_needed',
        name: 'Internal Communication / Extent of Supervision Needed',
        description: 'Autonomous execution without requiring constant follow-ups',
        targetScore: 10,
        weightage: 10,
        targetFromManager: '<2 followups',
        targetValue: 2,
        unit: 'followups',
        scoringDirection: 'lower_is_better',
        measurementType: 'number',
        isRequired: true
      }
    ]
  },
  {
    id: 'cat_collaborative',
    name: 'Collaborative Approach',
    description: 'Knowledge sharing, mentoring, innovation, and attendance compliance',
    weightage: 20,
    kpis: [
      {
        id: 'kpi_mentoring_innovation',
        name: 'Mentoring / Continuous Improvement / Innovation',
        description: 'Sharing best practices, training peers, and improving workflows',
        targetScore: 10,
        weightage: 10,
        targetFromManager: '2 sessions',
        targetValue: 2,
        unit: 'sessions',
        scoringDirection: 'higher_is_better',
        measurementType: 'number',
        isRequired: true
      },
      {
        id: 'kpi_leave_notification',
        name: 'Leave / WFH Prior Notification Adherence',
        description: 'Advance notice for leaves/WFH without unplanned absences',
        targetScore: 10,
        weightage: 10,
        targetFromManager: '0 unplanned',
        targetValue: 0,
        unit: 'unplanned',
        scoringDirection: 'lower_is_better',
        measurementType: 'number',
        isRequired: true
      }
    ]
  }
];

export const evaluationService = {
  // DB Fetchers
  async fetchDBEmployees(): Promise<any[]> {
    try {
      return await getEmployees();
    } catch (e) {
      console.warn('Failed to fetch DB employees, checking fallback cache', e);
      return [];
    }
  },

  async fetchDBTeams(): Promise<any[]> {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/teams`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch teams');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.teams) ? data.teams : []);
      return list;
    } catch (e) {
      // If teams API not available, construct dynamic teams from employee departments/teams
      const employees = await this.fetchDBEmployees();
      const teamMap = new Map<string, any>();
      employees.forEach(emp => {
        const teamName = emp.team || emp.department || 'General Team';
        if (!teamMap.has(teamName)) {
          teamMap.set(teamName, {
            id: `team_${teamName.toLowerCase().replace(/\s+/g, '_')}`,
            name: teamName,
            manager_name: emp.reporting_manager || 'Team Lead'
          });
        }
      });
      return Array.from(teamMap.values());
    }
  },

  // Multi-user Backend API + LocalStorage Synchronization
  async fetchRemoteEvaluationData(): Promise<{ cycles: EvaluationCycle[]; responses: EvaluationResponse[] }> {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/performance/evaluation/data`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const serverCycles = Array.isArray(data.cycles) ? data.cycles : [];
        const serverResponses = Array.isArray(data.responses) ? data.responses : [];
        const serverRatingScale = Array.isArray(data.ratingScale) ? data.ratingScale : null;

        if (serverRatingScale && serverRatingScale.length > 0) {
          setRatingScale(serverRatingScale);
          localStorage.setItem(RATING_SCALE_STORAGE_KEY, JSON.stringify(serverRatingScale));
        }
        
        // Save server data to localStorage
        this.saveCyclesLocal(serverCycles);
        this.saveResponsesLocal(serverResponses);
        return { cycles: serverCycles, responses: serverResponses };
      }
    } catch (e) {
      console.warn('Evaluation backend API offline, using local storage cache', e);
    }
    return { cycles: this.getCycles(), responses: this.getResponses() };
  },

  async fetchRatingScale(): Promise<RatingLevel[]> {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/performance/rating-scale`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.ratingScale) && data.ratingScale.length > 0) {
          setRatingScale(data.ratingScale);
          localStorage.setItem(RATING_SCALE_STORAGE_KEY, JSON.stringify(data.ratingScale));
          return getRatingScale();
        }
      }
    } catch (e) {
      console.warn('Failed to fetch rating scale from backend, using active scale', e);
    }
    return getRatingScale();
  },

  async saveRatingScale(scale: RatingLevel[]): Promise<void> {
    setRatingScale(scale);
    localStorage.setItem(RATING_SCALE_STORAGE_KEY, JSON.stringify(scale));
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/performance/rating-scale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ratingScale: scale })
      });
    } catch (err) {
      console.warn('Failed to save rating scale to backend', err);
    }
  },

  getCycles(): EvaluationCycle[] {
    try {
      const data = localStorage.getItem(CYCLES_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCyclesLocal(cycles: EvaluationCycle[]): void {
    localStorage.setItem(CYCLES_STORAGE_KEY, JSON.stringify(cycles));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('evaluationUpdated'));
    }
  },

  async saveCycles(cycles: EvaluationCycle[]): Promise<void> {
    this.saveCyclesLocal(cycles);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/performance/evaluation/cycles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(cycles)
      });
    } catch (err) {
      console.warn('Failed to save cycles to backend', err);
    }
  },

  getResponses(): EvaluationResponse[] {
    try {
      const data = localStorage.getItem(RESPONSES_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveResponsesLocal(responses: EvaluationResponse[]): void {
    localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(responses));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('evaluationUpdated'));
    }
  },

  async saveResponses(responses: EvaluationResponse[]): Promise<void> {
    this.saveResponsesLocal(responses);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/performance/evaluation/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(responses)
      });
    } catch (err) {
      console.warn('Failed to save responses to backend', err);
    }
  },

  // Workflow Actions
  async createCycleFromHR(cycleData: {
    name: string;
    description?: string;
    teamId: string;
    teamName: string;
    managerId: string;
    managerName: string;
    serviceManagerId?: string;
    serviceManagerName?: string;
    employeeIds: string[];
    startDate: string;
    endDate: string;
    periodName: string;
    categories?: KPICategory[];
  }): Promise<EvaluationCycle> {
    const cycles = this.getCycles();
    const newCycle: EvaluationCycle = {
      id: `cycle_${Date.now()}`,
      name: cycleData.name,
      description: cycleData.description || 'Employee Performance Evaluation',
      teamId: cycleData.teamId,
      teamName: cycleData.teamName,
      managerId: cycleData.managerId,
      managerName: cycleData.managerName,
      serviceManagerId: cycleData.serviceManagerId || cycleData.managerId,
      serviceManagerName: cycleData.serviceManagerName || cycleData.managerName,
      employeeIds: cycleData.employeeIds,
      startDate: cycleData.startDate,
      endDate: cycleData.endDate,
      periodName: cycleData.periodName,
      status: 'pending_sm_launch_approval',
      categories: cycleData.categories || DEFAULT_KPI_CATEGORIES,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    cycles.unshift(newCycle);
    await this.saveCycles(cycles);
    return newCycle;
  },

  async approveCycleByServiceManager(cycleId: string, allEmployees: any[]): Promise<EvaluationCycle> {
    const cycles = this.getCycles();
    const index = cycles.findIndex(c => c.id === cycleId);
    if (index === -1) throw new Error('Cycle not found');

    const cycle = cycles[index];
    cycle.status = 'active';
    cycle.updatedAt = new Date().toISOString();
    cycles[index] = cycle;
    await this.saveCycles(cycles);

    // Initialize individual employee self-assessment responses
    const responses = this.getResponses();
    cycle.employeeIds.forEach(empId => {
      const existing = responses.find(r => r.cycleId === cycle.id && r.employeeId === String(empId));
      if (!existing) {
        const emp = allEmployees.find(e => String(e.id) === String(empId) || String(e.employee_id) === String(empId));
        const initialKpiResponses: Record<string, KPIResponseItem> = {};
        
        cycle.categories.forEach(cat => {
          cat.kpis.forEach(kpi => {
            initialKpiResponses[kpi.id] = {
              kpiId: kpi.id,
              actualValue: '',
              achievementPercentage: 0,
              earnedScore: 0,
              employeeRemarks: ''
            };
          });
        });

        const empCode = String(emp?.employee_id || emp?.id || empId);
        const newResp: EvaluationResponse = {
          id: `resp_${Date.now()}_${empCode}`,
          cycleId: cycle.id,
          teamId: cycle.teamId,
          employeeId: empCode,
          employeeName: emp ? `${emp.first_name} ${emp.last_name}` : `Employee #${empCode}`,
          employeeCode: empCode,
          designation: emp?.designation || 'Team Member',
          status: 'employee_in_progress',
          kpiResponses: initialKpiResponses,
          employeeOverallScore: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        responses.push(newResp);
      }
    });

    await this.saveResponses(responses);
    return cycle;
  },

  async submitEmployeeEvaluation(
    responseId: string,
    kpiResponses: Record<string, KPIResponseItem>,
    employeeRemarks?: string
  ): Promise<EvaluationResponse> {
    const remoteData = await this.fetchRemoteEvaluationData();
    const responses = remoteData.responses && remoteData.responses.length > 0 ? remoteData.responses : this.getResponses();
    let index = responses.findIndex(r => r.id === responseId);
    if (index === -1) {
      index = responses.findIndex(r => r.id.includes(responseId) || responseId.includes(r.id));
    }
    if (index === -1) {
      const localResponses = this.getResponses();
      index = localResponses.findIndex(r => r.id === responseId);
      if (index !== -1) {
        responses.push(localResponses[index]);
        index = responses.length - 1;
      }
    }
    if (index === -1) throw new Error('Evaluation response not found');

    const cycles = remoteData.cycles && remoteData.cycles.length > 0 ? remoteData.cycles : this.getCycles();
    const cycle = cycles.find(c => c.id === responses[index].cycleId);
    const categories = cycle?.categories || DEFAULT_KPI_CATEGORIES;

    const { overallScore } = calculateOverallScore(categories, kpiResponses);

    // Embed filled values into categories structure
    const updatedCategories = categories.map(cat => ({
      ...cat,
      kpis: cat.kpis.map(kpi => {
        const item = kpiResponses[kpi.id] || (kpi.name ? kpiResponses[kpi.name] : null);
        if (item) {
          return {
            ...kpi,
            actualValue: item.actualValue ?? '',
            actual_value: item.actualValue ?? '',
            achievementPercentage: item.achievementPercentage ?? 0,
            earnedScore: item.earnedScore ?? 0,
            earned_score: item.earnedScore ?? 0,
            employeeRemarks: item.employeeRemarks ?? '',
            employee_remark: item.employeeRemarks ?? ''
          };
        }
        return kpi;
      })
    }));

    const updated: EvaluationResponse = {
      ...responses[index],
      kpiResponses,
      employeeOverallScore: overallScore,
      employeeRemarks: employeeRemarks || '',
      employeeSubmittedAt: new Date().toISOString(),
      status: 'manager_review',
      updatedAt: new Date().toISOString()
    };

    // Save only this single updated response — do NOT send the full responses array.
    // Sending the full array would overwrite the server-side JSON store with the frontend's
    // potentially stale localStorage, wiping monthly/quarterly assignments.
    await this.saveResponses([updated]);

    // Update localStorage: patch only the changed entry (or append if missing)
    const localResponses = this.getResponses();
    const localIdx = localResponses.findIndex(r => r.id === updated.id);
    if (localIdx >= 0) {
      localResponses[localIdx] = updated;
    } else {
      localResponses.push(updated);
    }
    this.saveResponsesLocal(localResponses);

    // Also sync to Postgres kpi_evaluations table
    try {
      const token = localStorage.getItem('token') || '';
      const rawRecId = String(updated.id || '').replace('resp_', '').replace('eval_', '').trim();
      await fetch(`${API_URL}/api/performance/kpi-evaluations/submit-employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: rawRecId && !isNaN(Number(rawRecId)) ? Number(rawRecId) : updated.id,
          employee_id: updated.employeeCode || updated.employeeId,
          form: (updated as any).form || updated.periodName || '',
          periodName: updated.periodName || (updated as any).form || '',
          employee_overall_score: overallScore,
          earned_score: String(overallScore),
          employee_remark: employeeRemarks || '',
          metrics_data: updatedCategories,
          categories: updatedCategories,
          responses: kpiResponses,
          kpiResponses: kpiResponses
        })
      });
    } catch (e) {
      console.warn('Postgres kpi_evaluations sync skipped:', e);
    }

    return updated;
  },

  async submitManagerReview(
    responseId: string,
    managerData: {
      kpiResponses: Record<string, KPIResponseItem>;
      managerScore?: number;
      managerRemarks?: string;
    }
  ): Promise<EvaluationResponse> {
    const responses = this.getResponses();
    const index = responses.findIndex(r => r.id === responseId);
    if (index === -1) throw new Error('Evaluation response not found');

    const current = responses[index];
    const cycles = this.getCycles();
    const cycle = cycles.find(c => c.id === current.cycleId);
    const categories: KPICategory[] = (current as any).categories && Array.isArray((current as any).categories) && (current as any).categories.length > 0
      ? (current as any).categories
      : (cycle?.categories || DEFAULT_KPI_CATEGORIES);

    const { overallScore } = calculateOverallScore(categories, managerData.kpiResponses);
    const finalScore = managerData.managerScore !== undefined ? managerData.managerScore : overallScore;

    // Embed filled manager values into categories structure
    const updatedCategories = categories.map(cat => ({
      ...cat,
      kpis: cat.kpis.map(kpi => {
        const item = managerData.kpiResponses[kpi.id] || (kpi.name ? managerData.kpiResponses[kpi.name] : null);
        if (item) {
          return {
            ...kpi,
            actualValue: item.actualValue ?? '',
            actual_value: item.actualValue ?? '',
            achievementPercentage: item.achievementPercentage ?? 0,
            earnedScore: item.earnedScore ?? 0,
            earned_score: item.earnedScore ?? 0,
            employeeRemarks: item.employeeRemarks ?? '',
            employee_remark: item.employeeRemarks ?? '',
            managerActualValue: item.managerActualValue ?? '',
            manager_actual_pm: item.managerActualValue ?? '',
            managerScore: item.managerScore ?? null,
            manager_score: item.managerScore ?? null,
            managerRemarks: item.managerRemarks ?? '',
            manager_remark: item.managerRemarks ?? ''
          };
        }
        return kpi;
      })
    }));

    const updated: EvaluationResponse = {
      ...current,
      categories: updatedCategories,
      kpiResponses: managerData.kpiResponses,
      managerScore: finalScore,
      serviceManagerScore: finalScore,
      managerRemarks: managerData.managerRemarks || '',
      managerReviewedAt: new Date().toISOString(),
      serviceManagerApprovedAt: new Date().toISOString(),
      status: 'approved',
      updatedAt: new Date().toISOString()
    };

    responses[index] = updated;
    // Send only the single updated response — do NOT send the full array (would overwrite server JSON store)
    await this.saveResponses([updated]);
    const localResponses2 = this.getResponses();
    const localIdx2 = localResponses2.findIndex(r => r.id === updated.id);
    if (localIdx2 >= 0) { localResponses2[localIdx2] = updated; } else { localResponses2.push(updated); }
    this.saveResponsesLocal(localResponses2);

    // Also sync to Postgres kpi_evaluations table
    try {
      const token = localStorage.getItem('token') || '';
      const recId = String(updated.id || '').replace('resp_', '').trim();
      await fetch(`${API_URL}/api/performance/kpi-evaluations/review-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: recId && !isNaN(Number(recId)) ? Number(recId) : updated.id,
          employee_id: updated.employeeCode || updated.employeeId,
          form: (updated as any).form || updated.periodName,
          manager_score: finalScore,
          manager_approve_score: String(finalScore),
          manager_remark: managerData.managerRemarks || '',
          metrics_data: updatedCategories,
          categories: updatedCategories,
          responses: managerData.kpiResponses,
          kpiResponses: managerData.kpiResponses
        })
      });
    } catch (e) {
      console.warn('Postgres kpi_evaluations review sync skipped:', e);
    }

    return updated;
  },

  async approveServiceManagerReview(
    responseId: string,
    smData: {
      serviceManagerScore?: number;
      serviceManagerRemarks?: string;
    }
  ): Promise<EvaluationResponse> {
    const responses = this.getResponses();
    const index = responses.findIndex(r => r.id === responseId);
    if (index === -1) throw new Error('Evaluation response not found');

    const current = responses[index];
    const finalScore = smData.serviceManagerScore !== undefined 
      ? smData.serviceManagerScore 
      : (current.managerScore || current.employeeOverallScore);

    const updated: EvaluationResponse = {
      ...current,
      serviceManagerScore: finalScore,
      serviceManagerRemarks: smData.serviceManagerRemarks || '',
      serviceManagerApprovedAt: new Date().toISOString(),
      status: 'approved',
      updatedAt: new Date().toISOString()
    };

    responses[index] = updated;
    // Send only the single updated response — do NOT send the full array (would overwrite server JSON store)
    await this.saveResponses([updated]);
    const localResponses3 = this.getResponses();
    const localIdx3 = localResponses3.findIndex(r => r.id === updated.id);
    if (localIdx3 >= 0) { localResponses3[localIdx3] = updated; } else { localResponses3.push(updated); }
    this.saveResponsesLocal(localResponses3);

    // Also sync to Postgres kpi_evaluations table
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API_URL}/api/performance/kpi-evaluations/approve-service-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          employee_id: updated.employeeCode || updated.employeeId,
          service_manager_score: String(finalScore),
          remark: smData.serviceManagerRemarks || '',
          decision: 'Approved'
        })
      });
    } catch (e) {
      console.warn('Postgres kpi_evaluations approve sync skipped:', e);
    }

    return updated;
  },

  async returnEvaluation(
    responseId: string,
    reason: string,
    returnTo: 'employee' | 'manager',
    byRole: 'manager' | 'service_manager'
  ): Promise<EvaluationResponse> {
    const responses = this.getResponses();
    const index = responses.findIndex(r => r.id === responseId);
    if (index === -1) throw new Error('Evaluation response not found');

    const updated: EvaluationResponse = {
      ...responses[index],
      status: returnTo === 'employee' ? 'returned_to_employee' : 'returned_to_manager',
      returnReason: reason,
      returnedByRole: byRole,
      updatedAt: new Date().toISOString()
    };

    responses[index] = updated;
    await this.saveResponses(responses);
    return updated;
  },

  async triggerEvaluationRollup(): Promise<{ success: boolean; message: string; rolled_up_count: number }> {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`${API_URL}/api/performance/kpi-evaluations/rollup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) throw new Error('Rollup failed');
    return res.json();
  },

  async convertDailyToWeekly(params: {
    employeeId?: string;
    weekStart?: string;
    weekEnd?: string;
    recordIds?: (string | number)[];
  }): Promise<{ success: boolean; message: string; weekly_evaluation?: any }> {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`${API_URL}/api/performance/kpi-evaluations/convert-daily-to-weekly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        employee_id: params.employeeId,
        week_start: params.weekStart,
        week_end: params.weekEnd,
        record_ids: params.recordIds
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Conversion to weekly failed');
    }
    return res.json();
  },

  async convertEvaluations(params: {
    employeeId?: string;
    fromFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    toFrequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    recordIds?: (string | number)[];
  }): Promise<{ success: boolean; message: string; evaluation?: any; weekly_evaluation?: any }> {
    const token = localStorage.getItem('token') || '';
    const res = await fetch(`${API_URL}/api/performance/kpi-evaluations/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        employee_id: params.employeeId,
        from_frequency: params.fromFrequency,
        to_frequency: params.toFrequency,
        record_ids: params.recordIds
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Conversion from ${params.fromFrequency} to ${params.toFrequency} failed`);
    }
    return res.json();
  },


  async createAndAssignKpiMetrics(data: {
    formName: string;
    teamId: string;
    teamName: string;
    managerId: string;
    managerName: string;
    serviceManagerId?: string;
    serviceManagerName?: string;
    employeeIds: string[];
    periodName: string;
    startDate: string;
    endDate: string;
    categories: KPICategory[];
    allEmployees: any[];
    frequency?: string;
    templateKey?: string;
    templateName?: string;
  }): Promise<{ cycle: EvaluationCycle; responses: EvaluationResponse[] }> {
    const targetEmployees = data.allEmployees.filter(e => 
      data.employeeIds.includes(String(e.id)) || 
      data.employeeIds.includes(String(e.employee_id))
    );

    // 1. Assign to PostgreSQL kpi_evaluations table (strictly 1 row per employee)
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API_URL}/api/performance/kpi-evaluations/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          form: data.formName,
          team_id: data.teamId,
          team_name: data.teamName,
          periodName: data.periodName,
          frequency: data.frequency || 'quarterly',
          startDate: data.startDate,
          endDate: data.endDate,
          reporting_manager: data.managerName,
          reporting_manager_id: data.managerId,
          service_manager: data.serviceManagerName,
          service_manager_id: data.serviceManagerId,
          template_key: data.templateKey || 'form_1',
          template_name: data.templateName || '',
          employees: targetEmployees.map(e => ({
            id: e.employee_id || e.id,
            name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.name
          })),
          categories: data.categories
        })
      });
    } catch (dbErr) {
      console.warn('Sync to kpi_evaluations Postgres table skipped or offline:', dbErr);
    }

    // 2. Fetch fresh, official data directly from DB
    const remoteData = await this.fetchRemoteEvaluationData();
    const cycle = remoteData.cycles.find(c => c.name === data.formName || (c as any).form === data.formName) || remoteData.cycles[0];
    return { 
      cycle: cycle || { 
        id: `cycle_${Date.now()}`, 
        name: data.formName, 
        teamId: data.teamId, 
        teamName: data.teamName, 
        managerId: data.managerId, 
        managerName: data.managerName, 
        employeeIds: data.employeeIds, 
        startDate: data.startDate, 
        endDate: data.endDate, 
        periodName: data.periodName, 
        status: 'active', 
        categories: data.categories, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      }, 
      responses: remoteData.responses 
    };
  },

  // Fetch Manager Templates (Form 1..4) from PostgreSQL DB
  async getManagerTemplates(managerId: string): Promise<{
    templates: ManagerKpiTemplateRecord[];
    active_key: string;
  }> {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/api/performance/kpi-templates/manager?manager_id=${encodeURIComponent(managerId)}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.templates)) {
        return {
          templates: data.templates,
          active_key: data.active_key || 'form_1'
        };
      }
    } catch (e) {
      console.warn('Failed to fetch manager KPI templates from DB:', e);
    }
    return { templates: [], active_key: 'form_1' };
  },

  // Save/Upsert a specific form template for a manager in PostgreSQL DB
  async saveManagerTemplate(payload: {
    manager_id: string;
    manager_name?: string;
    template_key: string;
    template_name?: string;
    team_id?: string;
    team_name?: string;
    categories: KPICategory[];
    is_default?: boolean;
  }): Promise<{ success: boolean; template?: ManagerKpiTemplateRecord; error?: string }> {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/api/performance/kpi-templates/manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to save template' };
    }
  },

  // Rename a template
  async renameManagerTemplate(managerId: string, templateKey: string, newName: string): Promise<{ success: boolean; template?: ManagerKpiTemplateRecord; error?: string }> {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/api/performance/kpi-templates/manager/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          manager_id: managerId,
          template_key: templateKey,
          template_name: newName
        })
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to rename template' };
    }
  },

  // Get system default categories from DB
  async getSystemDefaultKpiTemplate(): Promise<KPICategory[]> {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/api/performance/kpi-templates/system-default`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        return data.categories;
      }
    } catch (e) {
      console.warn('Failed to fetch system default template from DB:', e);
    }
    return DEFAULT_KPI_CATEGORIES;
  }
};

