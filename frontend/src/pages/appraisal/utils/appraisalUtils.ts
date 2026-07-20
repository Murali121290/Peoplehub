import {
  Rating,
  DashboardStats,
} from "../models/appraisal";

/* ==========================================
   Rating Badge Color
========================================== */

export const getRatingColor = (
  rating: Rating
): string => {
  switch (rating) {
    case "Excellent":
      return "bg-green-100 text-green-700";

    case "Good":
      return "bg-blue-100 text-blue-700";

    case "Average":
      return "bg-yellow-100 text-yellow-700";

    case "Needs Improvement":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

/* ==========================================
   Status Badge Color
========================================== */

export const getStatusColor = (
  status: string
): string => {
  switch (status) {
    case "Open":
      return "bg-green-100 text-green-700";

    case "Pending Review":
      return "bg-yellow-100 text-yellow-700";

    case "Reviewed":
      return "bg-blue-100 text-blue-700";

    case "Completed":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

/* ==========================================
   Dashboard Completion Percentage
========================================== */

export const getCompletionPercentage = (
  stats: DashboardStats
): number => {
  if (stats.totalEmployees === 0) {
    return 0;
  }

  return Math.round(
    (stats.completedReviews / stats.totalEmployees) * 100
  );
};

/* ==========================================
   Employee Initials
========================================== */

export const getInitials = (
  fullName: string
): string => {
  return fullName
    .split(" ")
    .map((item) => item.charAt(0))
    .join("")
    .toUpperCase();
};

/* ==========================================
   Format Date
========================================== */

export const formatDate = (
  date: string
): string => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ==========================================
   Average Score
========================================== */

export const calculateAverageScore = (
  scores: number[]
): number => {
  if (scores.length === 0) {
    return 0;
  }

  const total = scores.reduce(
    (sum, score) => sum + score,
    0
  );

  return Number((total / scores.length).toFixed(1));
};

/* ==========================================
   Validate Employee Answers
========================================== */

export const validateAnswers = (
  answers: Record<number, string>
): boolean => {
  return Object.values(answers).every(
    (answer) => answer.trim() !== ""
  );
};