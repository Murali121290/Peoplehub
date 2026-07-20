import React, { useState, useEffect } from "react";

import { appraisalService, employeeService } from "../../../services/api";

const EmployeeAppraisalTab: React.FC = () => {
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = localStorage.getItem("user_id");
        if (!userId) {
          setError("User ID not found");
          setLoading(false);
          return;
        }

        const empResponse = await employeeService.getDetails(parseInt(userId, 10));
        if (empResponse.data.success && empResponse.data.employee) {
          const emp = empResponse.data.employee;
          setEmployeeDetails(emp);
          
          const role = emp.role;
          const questionsResponse = await appraisalService.getQuestions(role);
          if (questionsResponse.data.success) {
            setQuestions(questionsResponse.data.questions || []);
          }
        }
      } catch (err: any) {
        console.error("Failed to load appraisal data", err);
        setError("Failed to load appraisal data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (
    questionId: number,
    value: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (questions.length === 0) {
      alert("No appraisal questions found.");
      return;
    }

    const unanswered = questions.filter(
      (q) => !answers[q.question_id] || answers[q.question_id].trim() === ""
    );

    if (unanswered.length > 0) {
      alert("Please answer all questions.");
      return;
    }

    try {
      const cycleResponse = await appraisalService.getActiveCycle();
      if (!cycleResponse.data.success || !cycleResponse.data.cycle) {
        alert("No active appraisal cycle found.");
        return;
      }
      
      // Need a submit endpoint in appraisalService
      const payload = {
        cycle_id: cycleResponse.data.cycle.id,
        answers: Object.entries(answers).map(([qId, ans]) => ({
          question_id: parseInt(qId, 10),
          answer: ans
        }))
      };
      
      const submitResponse = await appraisalService.submitAnswers(payload);
      if (submitResponse.data.success) {
        setSubmitted(true);
        alert("Appraisal submitted successfully.");
      } else {
        alert("Failed to submit: " + submitResponse.data.message);
      }
    } catch (err: any) {
      console.error(err);
      alert("Error submitting appraisal: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">

      {/* Employee Information */}

      <div className="bg-white border rounded-xl shadow-sm p-6">

        <h2 className="text-xl font-semibold mb-4">
          Employee Information
        </h2>

        {employeeDetails ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <p className="text-gray-500 text-sm">
              Employee Name
            </p>

            <p className="font-medium">
              {employeeDetails.first_name} {employeeDetails.last_name}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Employee ID
            </p>

            <p className="font-medium">
              EMP-{employeeDetails.id}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Department
            </p>

            <p className="font-medium">
              {employeeDetails.department}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Role
            </p>

            <p className="font-medium">
              {employeeDetails.role}
            </p>
          </div>

        </div>
        ) : (
          <p className="text-gray-500">Loading employee details...</p>
        )}

      </div>

      {/* Questions */}

      <div className="bg-white border rounded-xl shadow-sm p-6">

        <h2 className="text-xl font-semibold mb-6">
          Self Appraisal Questions
        </h2>

        <div className="space-y-6">

          {questions.map((question, index) => (

            <div
              key={question.question_id}
              className="border rounded-lg p-4"
            >

              <label className="font-medium block mb-3">

                {index + 1}. {question.question_text}

              </label>

              <textarea
                rows={4}
                className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter your answer..."
                value={answers[question.question_id] || ""}
                onChange={(e) =>
                  handleChange(
                    question.question_id,
                    e.target.value
                  )
                }
                disabled={submitted}
              />

            </div>

          ))}

        </div>

      </div>

      {/* Submit */}

      <div className="flex justify-end">

        <button
          onClick={handleSubmit}
          disabled={submitted}
          className={`px-6 py-3 rounded-lg text-white font-medium transition
            ${
              submitted
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:bg-gray-900"
            }`}
        >
          {submitted
            ? "Submitted"
            : "Submit Appraisal"}
        </button>

      </div>

    </div>
  );
};

export default EmployeeAppraisalTab;