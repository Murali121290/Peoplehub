import React, { useMemo, useState } from "react";

import { employee } from "../data/mockData";
import { getQuestionsByRole } from "../utils/appraisalUtils";

const EmployeeAppraisalTab: React.FC = () => {
  const questions = useMemo(
    () => getQuestionsByRole(employee.department),
    []
  );

  const [answers, setAnswers] = useState<Record<number, string>>({});

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    questionId: number,
    value: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = () => {
    if (questions.length === 0) {
      alert("No appraisal questions found.");
      return;
    }

    const unanswered = questions.filter(
      (q) => !answers[q.id] || answers[q.id].trim() === ""
    );

    if (unanswered.length > 0) {
      alert("Please answer all questions.");
      return;
    }

    console.log({
      employeeId: employee.id,
      answers,
    });

    setSubmitted(true);

    alert("Appraisal submitted successfully.");
  };

  return (
    <div className="space-y-6">

      {/* Employee Information */}

      <div className="bg-white border rounded-xl shadow-sm p-6">

        <h2 className="text-xl font-semibold mb-4">
          Employee Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <p className="text-gray-500 text-sm">
              Employee
            </p>

            <p className="font-medium">
              {employee.fullName}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Employee ID
            </p>

            <p className="font-medium">
              {employee.employeeId}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Department
            </p>

            <p className="font-medium">
              {employee.department}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Role
            </p>

            <p className="font-medium">
              {employee.role}
            </p>
          </div>

        </div>

      </div>

      {/* Questions */}

      <div className="bg-white border rounded-xl shadow-sm p-6">

        <h2 className="text-xl font-semibold mb-6">
          Self Appraisal Questions
        </h2>

        <div className="space-y-6">

          {questions.map((question, index) => (

            <div
              key={question.id}
              className="border rounded-lg p-4"
            >

              <label className="font-medium block mb-3">

                {index + 1}. {question.question}

              </label>

              <textarea
                rows={4}
                className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter your answer..."
                value={answers[question.id] || ""}
                onChange={(e) =>
                  handleChange(
                    question.id,
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