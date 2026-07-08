import React, { useMemo } from "react";

import { employee } from "../data/mockData";
import { appraisalCycle } from "../data/mockData";
import { getQuestionsByRole } from "../utils/appraisalUtils";
import { getRatingColor } from "../utils/appraisalUtils";

const ReportTab: React.FC = () => {
  const questions = useMemo(
    () => getQuestionsByRole(employee.department),
    []
  );

  const managerReview = {
    rating: "Excellent",
    score: 10,
    managerComment:
      "Excellent performance throughout the appraisal period. Keep up the good work.",
    reviewedBy: "John Manager",
    reviewedDate: "08 Jul 2026",
  };

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="bg-white rounded-xl border shadow-sm p-6">

        <h2 className="text-2xl font-bold">
          Employee Appraisal Report
        </h2>

        <p className="text-gray-500 mt-2">
          Annual Performance Review
        </p>

      </div>

      {/* Employee Details */}

      <div className="bg-white rounded-xl border shadow-sm p-6">

        <h3 className="text-lg font-semibold mb-5">
          Employee Details
        </h3>

        <div className="grid grid-cols-2 gap-5">

          <div>
            <p className="text-gray-500 text-sm">
              Employee Name
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

      {/* Appraisal Cycle */}

      <div className="bg-white rounded-xl border shadow-sm p-6">

        <h3 className="text-lg font-semibold mb-5">
          Appraisal Cycle
        </h3>

        <div className="grid grid-cols-2 gap-5">

          <div>

            <p className="text-sm text-gray-500">
              Title
            </p>

            <p className="font-medium">
              {appraisalCycle.title}
            </p>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Year
            </p>

            <p className="font-medium">
              {appraisalCycle.appraisalYear}
            </p>

          </div>

        </div>

      </div>

      {/* Questions */}

      <div className="bg-white rounded-xl border shadow-sm p-6">

        <h3 className="text-lg font-semibold mb-6">
          Questions & Answers
        </h3>

        <div className="space-y-5">

          {questions.map((question, index) => (

            <div
              key={question.id}
              className="border rounded-lg p-4"
            >

              <p className="font-medium mb-3">

                {index + 1}. {question.question}

              </p>

              <div className="bg-gray-100 rounded-lg p-4">

                Employee Answer...

              </div>

            </div>

          ))}

        </div>

      </div>

      {/* Manager Review */}

      <div className="bg-white rounded-xl border shadow-sm p-6">

        <h3 className="text-lg font-semibold mb-6">
          Manager Review
        </h3>

        <div className="grid grid-cols-2 gap-5">

          <div>

            <p className="text-sm text-gray-500">
              Rating
            </p>

            <span
              className={`inline-block px-4 py-2 rounded-full mt-2 font-medium ${getRatingColor(
                managerReview.rating as any
              )}`}
            >
              {managerReview.rating}
            </span>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Score
            </p>

            <p className="text-2xl font-bold">
              {managerReview.score}/10
            </p>

          </div>

          <div className="col-span-2">

            <p className="text-sm text-gray-500">
              Manager Comment
            </p>

            <div className="bg-gray-100 rounded-lg p-4 mt-2">

              {managerReview.managerComment}

            </div>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Reviewed By
            </p>

            <p className="font-medium">
              {managerReview.reviewedBy}
            </p>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Reviewed Date
            </p>

            <p className="font-medium">
              {managerReview.reviewedDate}
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default ReportTab;