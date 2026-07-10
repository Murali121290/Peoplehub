import React, { useMemo, useState } from "react";

import { employee } from "../data/mockData";
import {
  getQuestionsByRole,
  getRatingColor,
} from "../utils/appraisalUtils";

const ratings = [
  "Excellent",
  "Good",
  "Average",
  "Needs Improvement",
] as const;

const ManagerReviewTab: React.FC = () => {
  const questions = useMemo(
    () => getQuestionsByRole(employee.department),
    []
  );

  const [rating, setRating] = useState<
    "Excellent" | "Good" | "Average" | "Needs Improvement"
  >("Good");

  const [score, setScore] = useState(8);

  const [comment, setComment] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (comment.trim() === "") {
      alert("Please enter manager comments.");
      return;
    }

    console.log({
      employeeId: employee.id,
      rating,
      score,
      comment,
    });

    setSubmitted(true);

    alert("Review submitted successfully.");
  };

  return (
    <div className="space-y-6">

      {/* Employee Information */}

      <div className="bg-white rounded-xl border shadow-sm p-6">

        <h2 className="text-xl font-semibold mb-4">
          Employee Information
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <div>
            <p className="text-sm text-gray-500">
              Employee
            </p>

            <p className="font-medium">
              {employee.fullName}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Employee ID
            </p>

            <p className="font-medium">
              {employee.employeeId}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Department
            </p>

            <p className="font-medium">
              {employee.department}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Role
            </p>

            <p className="font-medium">
              {employee.role}
            </p>
          </div>

        </div>

      </div>

      {/* Employee Answers */}

      <div className="bg-white rounded-xl border shadow-sm p-6">

        <h2 className="text-xl font-semibold mb-5">
          Employee Answers
        </h2>

        <div className="space-y-5">

          {questions.map((question, index) => (

            <div
              key={question.id}
              className="border rounded-lg p-4"
            >

              <p className="font-medium mb-3">

                {index + 1}. {question.question}

              </p>

              <div className="bg-gray-100 rounded-lg p-4 text-gray-700">

                Sample employee answer...

              </div>

            </div>

          ))}

        </div>

      </div>

      {/* Manager Review */}

      <div className="bg-white rounded-xl border shadow-sm p-6">

        <h2 className="text-xl font-semibold mb-5">
          Manager Review
        </h2>

        <div className="space-y-5">

          <div>

            <label className="block font-medium mb-2">
              Rating
            </label>

            <div className="flex flex-wrap gap-3">

              {ratings.map((item) => (

                <button
                  key={item}
                  onClick={() => setRating(item)}
                  className={`px-5 py-2 rounded-lg border transition ${
                    rating === item
                      ? `${getRatingColor(item)} border-transparent`
                      : "bg-white border-gray-300"
                  }`}
                >
                  {item}
                </button>

              ))}

            </div>

          </div>

          <div>

            <label className="block font-medium mb-2">
              Score (1 - 10)
            </label>

            <input
              type="number"
              min={1}
              max={10}
              value={score}
              onChange={(e) =>
                setScore(Number(e.target.value))
              }
              className="w-32 border rounded-lg p-3"
            />

          </div>

          <div>

            <label className="block font-medium mb-2">
              Manager Comments
            </label>

            <textarea
              rows={5}
              value={comment}
              onChange={(e) =>
                setComment(e.target.value)
              }
              className="w-full border rounded-lg p-3"
              placeholder="Enter review comments..."
            />

          </div>

        </div>

      </div>

      {/* Submit */}

      <div className="flex justify-end">

        <button
          disabled={submitted}
          onClick={handleSubmit}
          className={`px-6 py-3 rounded-lg text-white font-medium ${
            submitted
              ? "bg-gray-400"
              : "bg-black hover:bg-gray-900"
          }`}
        >
          {submitted
            ? "Review Submitted"
            : "Submit Review"}
        </button>

      </div>

    </div>
  );
};

export default ManagerReviewTab;