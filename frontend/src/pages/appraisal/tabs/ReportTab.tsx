import React, { useState, useEffect } from "react";
import { appraisalService } from "../../../services/api";
import { getRatingColor } from "../utils/appraisalUtils";

const ReportTab: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const employeeId = localStorage.getItem("employee_id");
        if (!employeeId) {
          setError("No employee ID found.");
          setLoading(false);
          return;
        }
        const response = await appraisalService.getEmployeeAppraisal(employeeId);
        if (response.data.success) {
          setReportData(response.data);
        } else {
          setError(response.data.message || "Failed to fetch report");
        }
      } catch (err: any) {
        console.error("Error fetching report:", err);
        setError(err.response?.data?.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading appraisal report...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">{error}</div>;
  }

  if (!reportData) {
    return <div className="p-6 text-center text-gray-500">No report data found.</div>;
  }

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
              {reportData.employee_name}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Employee ID
            </p>

            <p className="font-medium">
              EMP-{reportData.employee_id}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Department
            </p>

            <p className="font-medium">
              {reportData.department}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">
              Designation
            </p>

            <p className="font-medium">
              {reportData.role}
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
              {reportData.cycle_name || "N/A"}
            </p>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Year
            </p>

            <p className="font-medium">
              {reportData.cycle_year || "N/A"}
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

          {reportData.answers && reportData.answers.length > 0 ? (
            reportData.answers.map((ans: any, index: number) => (

            <div
              key={ans.question_id}
              className="border rounded-lg p-4"
            >

              <p className="font-medium mb-3">

                {index + 1}. {ans.question_text}

              </p>

              <div className="bg-gray-100 rounded-lg p-4">

                {ans.answer}

              </div>

            </div>

          ))
          ) : (
            <p className="text-gray-500 text-center">No questions or answers available.</p>
          )}

        </div>

      </div>

      {/* Manager Review */}
      {reportData.manager_review ? (
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
                reportData.manager_review.rating as any
              )}`}
            >
              {reportData.manager_review.rating}
            </span>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Score
            </p>

            <p className="text-2xl font-bold">
              {reportData.manager_review.score}/10
            </p>

          </div>

          <div className="col-span-2">

            <p className="text-sm text-gray-500">
              Manager Comment
            </p>

            <div className="bg-gray-100 rounded-lg p-4 mt-2">

              {reportData.manager_review.managerComment}

            </div>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Reviewed By
            </p>

            <p className="font-medium">
              {reportData.manager_review.reviewedBy}
            </p>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Reviewed Date
            </p>

            <p className="font-medium">
              {reportData.manager_review.reviewedDate}
            </p>

          </div>

        </div>

      </div>
      ) : (
      <div className="bg-white rounded-xl border shadow-sm p-6 text-center text-gray-500">
        This appraisal request has not been reviewed by a manager yet.
      </div>
      )}

    </div>
  );
};

export default ReportTab;