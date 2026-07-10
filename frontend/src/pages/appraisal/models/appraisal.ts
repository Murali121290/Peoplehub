// ==========================================
// Appraisal Module Types
// ==========================================

export type AppraisalTab =
  | "dashboard"
  | "employee"
  | "manager"
  | "report"
  | "history";

export type AppraisalStatus =
  | "Open"
  | "Pending Review"
  | "Reviewed"
  | "Completed";

export type Rating =
  | "Excellent"
  | "Good"
  | "Average"
  | "Needs Improvement";

// ==========================================
// Dashboard
// ==========================================

export interface DashboardStats {
  totalEmployees: number;
  pendingReviews: number;
  completedReviews: number;
  averageScore: number;
}

// ==========================================
// Appraisal Cycle
// ==========================================

export interface AppraisalCycle {
  id: number;
  title: string;
  appraisalYear: number;
  startDate: string;
  endDate: string;
  status: AppraisalStatus;
}

// ==========================================
// Question
// ==========================================

export interface AppraisalQuestion {
  id: number;
  roleName: string;
  question: string;
}

// ==========================================
// Employee Answer
// ==========================================

export interface AppraisalAnswer {
  questionId: number;
  answer: string;
}

// ==========================================
// Employee Submission
// ==========================================

export interface EmployeeSubmission {
  userId: number;
  employeeId: number;
  cycleId: number;
  answers: AppraisalAnswer[];
}

// ==========================================
// Employee Details
// ==========================================

export interface Employee {
  id: number;
  employeeId: string;
  fullName: string;
  department: string;
  role: string;
}

// ==========================================
// Manager Review
// ==========================================

export interface ManagerReview {
  employeeId: number;
  managerId: number;
  cycleId: number;

  rating: Rating;

  score: number;

  managerComment: string;
}

// ==========================================
// Report
// ==========================================

export interface AppraisalReport {
  employee: Employee;

  cycle: AppraisalCycle;

  questions: AppraisalQuestion[];

  answers: AppraisalAnswer[];

  review: ManagerReview;

  status: AppraisalStatus;
}

// ==========================================
// Goal
// ==========================================

export interface Goal {
  id: number;
  title: string;
  description: string;
  progress: number;
}

// ==========================================
// Rating Option
// ==========================================

export interface RatingOption {
  label: Rating;
  score: number;
}