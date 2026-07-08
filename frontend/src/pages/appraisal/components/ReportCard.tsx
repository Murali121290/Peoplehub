import React from "react";
import {
  AppraisalQuestion,
  Rating,
} from "../models/appraisal";
import { getRatingColor } from "../utils/appraisalUtils";

interface ReportCardProps {
  employeeName: string;
  employeeId: string;
  department: string;
  role: string;

  appraisalYear: number;
  appraisalTitle: string;

  questions: AppraisalQuestion[];
  answers: Record<number, string>;

  rating: Rating;
  score: number;
  managerComment: string;

  reviewedBy: string;
  reviewedDate: string;
}

const ReportCard: React.FC<ReportCardProps> = ({
  employeeName,
  employeeId,
  department,
  role,

  appraisalYear,
  appraisalTitle,

  questions,
  answers,

  rating,
  score,
  managerComment,

  reviewedBy,
  reviewedDate,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">

      {/* Header */}

      <div className="border-b pb-4">

        <h1 className="text-2xl font-bold">
          Employee Appraisal Report
        </h1>

        <p className="text-gray-500 mt-2">
          {appraisalTitle}
        </p>

      </div>

      {/* Employee Information */}

      <div>

        <h2 className="text-lg font-semibold mb-4">
          Employee Information
        </h2>

        <div className="grid grid-cols-2 gap-5">

          <div>
            <p className="text-gray-500 text-sm">
              Employee Name
            </p>

            <p className="font-medium">
              {employeeName}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Employee ID
            </p>

            <p className="font-medium">
              {employeeId}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Department
            </p>

            <p className="font-medium">
              {department}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Role
            </p>

            <p className="font-medium">
              {role}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Appraisal Year
            </p>

            <p className="font-medium">
              {appraisalYear}
            </p>
          </div>

        </div>

      </div>

      {/* Questions */}

      <div>

        <h2 className="text-lg font-semibold mb-4">
          Questions & Answers
        </h2>

        <div className="space-y-5">

          {questions.map((question, index) => (

            <div
              key={question.id}
              className="border rounded-lg p-4"
            >

              <h3 className="font-medium">

                {index + 1}. {question.question}

              </h3>

              <div className="bg-gray-100 rounded-lg mt-3 p-4">

                {answers[question.id] ||
                  "No Answer"}

              </div>

            </div>

          ))}

        </div>

      </div>

      {/* Manager Review */}

      <div>

        <h2 className="text-lg font-semibold mb-4">
          Manager Review
        </h2>

        <div className="grid grid-cols-2 gap-5">

          <div>

            <p className="text-sm text-gray-500">
              Rating
            </p>

            <span
              className={`inline-block mt-2 px-4 py-2 rounded-full font-medium ${getRatingColor(
                rating
              )}`}
            >
              {rating}
            </span>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Score
            </p>

            <p className="text-2xl font-bold">
              {score}/10
            </p>

          </div>

          <div className="col-span-2">

            <p className="text-sm text-gray-500">
              Manager Comment
            </p>

            <div className="bg-gray-100 rounded-lg p-4 mt-2">

              {managerComment}

            </div>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Reviewed By
            </p>

            <p className="font-medium">
              {reviewedBy}
            </p>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Reviewed Date
            </p>

            <p className="font-medium">
              {reviewedDate}
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default ReportCard;