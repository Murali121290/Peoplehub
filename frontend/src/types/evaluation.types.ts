export type EvaluationStage =
  | 'pending_sm_launch_approval' // HR created cycle, waiting for Service Manager to approve & release
  | 'employee_in_progress'        // Released to employees, employees are filling self-evaluations
  | 'manager_review'              // Employee submitted, Manager is reviewing & scoring
  | 'sm_final_approval'          // Manager submitted, Service Manager is giving final sign-off
  | 'approved'                   // Service Manager approved & published, official report visible
  | 'returned_to_employee'       // Returned for revisions
  | 'returned_to_manager';

export interface KPIItem {
  id: string;
  name: string;
  description?: string;
  targetScore: number; // e.g. 10%
  weightage?: number;  // e.g. 30%
  targetFromManager?: string | number; // e.g. "3", "1950", "1", "<2"
  targetValue: number;
  unit?: string;
  scoringDirection: 'higher_is_better' | 'lower_is_better' | 'exact_target';
  measurementType: 'number' | 'percentage' | 'yes_no' | 'rating_1_5';
  isRequired: boolean;
  actualValue?: string | number;
  actual_value?: string | number;
  earnedScore?: number;
  earned_score?: number;
  employeeRemarks?: string;
  employee_remarks?: string;
  employee_remark?: string;
  isInsufficient?: boolean;
  is_insufficient?: boolean;
  managerActualValue?: string | number;
  manager_actual_pm?: string | number;
  managerScore?: number | null;
  manager_score?: number | null;
  managerRemarks?: string;
  manager_remark?: string;
}

export interface KPICategory {
  id: string;
  name: string;
  description?: string;
  weightage: number; // sum = 100% (30%, 30%, 20%, 20%)
  kpis: KPIItem[];
}

export interface KPITemplate {
  id: string;
  name: string;
  description: string;
  categories: KPICategory[];
}

export interface KPIResponseItem {
  kpiId: string;
  name?: string;
  actualValue: string | number;
  achievementPercentage: number;
  earnedScore: number;
  employeeRemarks?: string;
  isInsufficient?: boolean;
  managerActualValue?: string | number;
  managerScore?: number;
  managerRemarks?: string;
  serviceManagerRemarks?: string;
}

export interface EvaluationCycle {
  id: string;
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
  frequency?: string;
  status: 'pending_sm_launch_approval' | 'active' | 'completed';
  categories: KPICategory[];
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationResponse {
  id: string;
  cycleId: string;
  teamId: string;
  teamName?: string;
  department?: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  designation?: string;
  status: EvaluationStage;
  kpiResponses: Record<string, KPIResponseItem>;
  employeeOverallScore: number; // Self score %
  managerScore?: number;        // Manager score %
  serviceManagerScore?: number; // Final Service Manager score %
  employeeRemarks?: string;
  managerId?: string;
  reportingManagerId?: string;
  managerRemarks?: string;
  serviceManagerRemarks?: string;
  returnReason?: string;
  returnedByRole?: 'manager' | 'service_manager';
  employeeSubmittedAt?: string;
  managerReviewedAt?: string;
  serviceManagerApprovedAt?: string;
  periodName?: string;
  form?: string;
  description?: string;
  categories?: KPICategory[];
  metrics_data?: any;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | string;
  fromDate?: string;
  toDate?: string;
  from_date?: string;
  to_date?: string;
  is_archived?: boolean;
  converted_to_id?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RatingLevel {
  grade: string | number; // "A", "B", "C", "D", "E"
  letterGrade: string; // "A", "B", "C", "D", "E"
  scoreRangeText: string; // e.g. "91 to 100", "81 to 90", "66 to 80", "51 to 65", "Below 50"
  name: string;
  minScore: number;
  maxScore: number;
  stars: number;
  description: string;
}

export interface KpiEvaluationRecord {
  id?: number;
  form: string;
  performance_metrics: string;
  description?: string;
  target_score?: string;
  weightage?: string;
  target_from_manager?: string;
  actual_earned_mark?: string;
  earned_score?: string;
  employee_remark?: string;
  manager_actual_pm?: string;
  manager_approve_score?: string;
  manager_remark?: string;
  service_manager_approve_status?: string;
  service_manager_score?: string;
  remark?: string;
  employee_id?: string;
  employee_name?: string;
  reporting_manager?: string;
  reporting_manager_id?: string;
  manager_id?: string;
  service_manager?: string;
  service_manager_id?: string;
  status?: string;
  submitted_at?: string;
  reviewed_at?: string;
  approved_at?: string;
  created_at?: string;
  updated_at?: string;
}

export type RollupTier = 'daily_to_weekly' | 'weekly_to_monthly' | 'monthly_to_quarterly' | 'quarterly_to_yearly';

export interface ConvertEvaluationsPayload {
  employeeId?: string;
  fromFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  toFrequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  recordIds?: number[];
}

export interface ConvertEvaluationsResponse {
  success: boolean;
  message: string;
  evaluation?: EvaluationResponse;
  weekly_evaluation?: EvaluationResponse;
}

