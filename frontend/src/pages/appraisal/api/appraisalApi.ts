import { apiService } from "../../../services/api";

/* ==========================================================
   Interfaces
========================================================== */

export interface AppraisalQuestionResponse {
  question_id: number;
  question_text: string;
}

export interface AppraisalQuestionListResponse {
  success: boolean;
  message: string;
  cycle_id: number;
  cycle_name: string;
  role: string;
  questions: AppraisalQuestionResponse[];
}

export interface AppraisalAnswerPayload {
  question_id: number;
  answer: string;
}

export interface SubmitAppraisalPayload {
  employee_id: number;
  cycle_id: number;
  answers: AppraisalAnswerPayload[];
}

export interface PendingAppraisal {
  employee_id: number;
  employee_name: string;
  role: string;
  cycle_id: number;
  cycle_name: string;
  submission_date: string;
}

export interface PendingAppraisalResponse {
  success: boolean;
  message: string;
  data: PendingAppraisal[];
}

export interface EmployeeAnswer {
  question_id: number;
  question_text: string;
  answer: string;
}

export interface EmployeeAppraisalResponse {
  success: boolean;
  message: string;
  employee_id: number;
  employee_name: string;
  role: string;
  cycle_id: number;
  cycle_name: string;
  answers: EmployeeAnswer[];
}

export interface ManagerReviewPayload {
  employee_id: number;
  cycle_id: number;
  manager_id: number;
  rating: "Excellent" | "Good" | "Average" | "Needs Improvement";
  score: number;
  manager_comment: string;
}

export interface AppraisalReportResponse {
  success: boolean;
  message: string;
  employee_id: number;
  employee_name: string;
  role: string;
  cycle_id: number;
  cycle_name: string;
  answers: EmployeeAnswer[];
  rating: string;
  score: number;
  manager_comment: string;
  reviewed_date: string;
}

/* ==========================================================
   Get Questions
========================================================== */

export const getAppraisalQuestions = async (
  role: string
): Promise<AppraisalQuestionListResponse> => {
  const response = await apiService.get(
    `/appraisal/questions/${encodeURIComponent(role)}`
  );

  return response.data;
};

/* ==========================================================
   Submit Employee Answers
========================================================== */

export const submitAppraisalAnswers = async (
  payload: SubmitAppraisalPayload
) => {
  const response = await apiService.post(
    "/appraisal/submit",
    payload
  );

  return response.data;
};

/* ==========================================================
   Pending Reviews
========================================================== */

export const getPendingAppraisals =
  async (): Promise<PendingAppraisalResponse> => {
    const response = await apiService.get(
      "/appraisal/pending"
    );

    return response.data;
  };

/* ==========================================================
   Employee Answers
========================================================== */

export const getEmployeeAppraisal = async (
  employeeId: number
): Promise<EmployeeAppraisalResponse> => {
  const response = await apiService.get(
    `/appraisal/employee/${employeeId}`
  );

  return response.data;
};

/* ==========================================================
   Manager Review
========================================================== */

export const submitManagerReview = async (
  payload: ManagerReviewPayload
) => {
  const response = await apiService.post(
    "/appraisal/review",
    payload
  );

  return response.data;
};

/* ==========================================================
   Final Report
========================================================== */

export const getAppraisalReport = async (
  employeeId: number
): Promise<AppraisalReportResponse> => {
  const response = await apiService.get(
    `/appraisal/report/${employeeId}`
  );

  return response.data;
};