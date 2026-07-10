import { useMemo, useState } from "react";

import { employee } from "../data/mockData";
import { getQuestionsByRole } from "../utils/appraisalUtils";

export const useAppraisal = () => {
  // ==========================================
  // Questions
  // ==========================================

  const questions = useMemo(() => {
    return getQuestionsByRole(employee.department);
  }, []);

  // ==========================================
  // Answers
  // ==========================================

  const [answers, setAnswers] = useState<Record<number, string>>({});

  // ==========================================
  // Loading
  // ==========================================

  const [loading, setLoading] = useState(false);

  // ==========================================
  // Submitted
  // ==========================================

  const [submitted, setSubmitted] = useState(false);

  // ==========================================
  // Rating
  // ==========================================

  const [rating, setRating] = useState<
    "Excellent" | "Good" | "Average" | "Needs Improvement"
  >("Good");

  // ==========================================
  // Score
  // ==========================================

  const [score, setScore] = useState(8);

  // ==========================================
  // Manager Comment
  // ==========================================

  const [managerComment, setManagerComment] = useState("");

  // ==========================================
  // Update Answer
  // ==========================================

  const updateAnswer = (
    questionId: number,
    value: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // ==========================================
  // Validate Answers
  // ==========================================

  const validateAnswers = () => {
    return questions.every(
      (question) =>
        answers[question.id] &&
        answers[question.id].trim() !== ""
    );
  };

  // ==========================================
  // Submit Employee Appraisal
  // ==========================================

  const submitAppraisal = async () => {
    if (!validateAnswers()) {
      alert("Please answer all questions.");
      return;
    }

    try {
      setLoading(true);

      // API Call Here

      console.log({
        employeeId: employee.id,
        answers,
      });

      setSubmitted(true);

      alert("Appraisal submitted successfully.");
    } catch (error) {
      console.error(error);
      alert("Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Submit Manager Review
  // ==========================================

  const submitReview = async () => {
    if (managerComment.trim() === "") {
      alert("Please enter manager comments.");
      return;
    }

    try {
      setLoading(true);

      console.log({
        employeeId: employee.id,
        rating,
        score,
        managerComment,
      });

      alert("Review submitted successfully.");
    } catch (error) {
      console.error(error);
      alert("Review submission failed.");
    } finally {
      setLoading(false);
    }
  };

  return {
    employee,

    questions,

    answers,
    updateAnswer,

    loading,

    submitted,

    rating,
    setRating,

    score,
    setScore,

    managerComment,
    setManagerComment,

    submitAppraisal,

    submitReview,
  };
};

export default useAppraisal;