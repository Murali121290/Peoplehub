import {
  DashboardStats,
  AppraisalCycle,
  AppraisalQuestion,
  Employee,
  RatingOption,
  Goal,
} from "../models/appraisal";

// ==========================================
// Dashboard Statistics
// ==========================================

export const dashboardStats: DashboardStats = {
  totalEmployees: 42,
  pendingReviews: 8,
  completedReviews: 34,
  averageScore: 8.7,
};

// ==========================================
// Current Appraisal Cycle
// ==========================================

export const appraisalCycle: AppraisalCycle = {
  id: 1,
  title: "2026 Annual Appraisal",
  appraisalYear: 2026,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "Open",
};

// ==========================================
// Rating Options
// ==========================================

export const ratingOptions: RatingOption[] = [
  {
    label: "Excellent",
    score: 10,
  },
  {
    label: "Good",
    score: 8,
  },
  {
    label: "Average",
    score: 6,
  },
  {
    label: "Needs Improvement",
    score: 4,
  },
];

// ==========================================
// Employee Goals
// ==========================================

export const goals: Goal[] = [
  {
    id: 1,
    title: "Improve Productivity",
    description: "Complete assigned tasks before deadlines.",
    progress: 80,
  },
  {
    id: 2,
    title: "Quality Improvement",
    description: "Reduce document corrections.",
    progress: 70,
  },
];

// ==========================================
// Sample Employee
// ==========================================

export const employee: Employee = {
  id: 1,
  employeeId: "EMP001",
  fullName: "Selva Bharath",
  department: "Production",
  role: "Production Editor",
};

// ==========================================
// Production Questions
// ==========================================

export const productionQuestions: AppraisalQuestion[] = [
  {
    id: 1,
    roleName: "Production",
    question: "How many projects did you complete during this appraisal period?",
  },
  {
    id: 2,
    roleName: "Production",
    question: "How did you ensure quality while meeting deadlines?",
  },
  {
    id: 3,
    roleName: "Production",
    question: "Describe a challenge you faced and how you solved it.",
  },
  {
    id: 4,
    roleName: "Production",
    question: "How did you contribute to your team?",
  },
  {
    id: 5,
    roleName: "Production",
    question: "Which skill would you like to improve next year?",
  },
];

// ==========================================
// Editor Questions
// ==========================================

export const editorQuestions: AppraisalQuestion[] = [
  {
    id: 6,
    roleName: "Editor",
    question: "How did you improve document quality?",
  },
  {
    id: 7,
    roleName: "Editor",
    question: "How do you ensure grammar and formatting accuracy?",
  },
  {
    id: 8,
    roleName: "Editor",
    question: "Describe an editing challenge you solved.",
  },
  {
    id: 9,
    roleName: "Editor",
    question: "How do you manage editing deadlines?",
  },
  {
    id: 10,
    roleName: "Editor",
    question: "Which editing skill do you want to improve?",
  },
];

// ==========================================
// Copywriter Questions
// ==========================================

export const copywriterQuestions: AppraisalQuestion[] = [
  {
    id: 11,
    roleName: "Copywriter",
    question: "How do you ensure content meets client requirements?",
  },
  {
    id: 12,
    roleName: "Copywriter",
    question: "Describe your best writing achievement.",
  },
  {
    id: 13,
    roleName: "Copywriter",
    question: "How do you handle client revisions?",
  },
  {
    id: 14,
    roleName: "Copywriter",
    question: "How do you improve content quality?",
  },
  {
    id: 15,
    roleName: "Copywriter",
    question: "Which writing skill would you like to improve?",
  },
];