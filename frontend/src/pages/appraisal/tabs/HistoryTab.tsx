import React, { useState, useEffect } from "react";
import { appraisalService } from "../../../services/api";

const HistoryTab: React.FC = () => {
  const [appraisalHistory, setAppraisalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const employeeId = localStorage.getItem("employee_id");
        if (!employeeId) {
          setError("No employee ID found.");
          setLoading(false);
          return;
        }
        const response = await appraisalService.getAppraisalHistory(employeeId);
        if (response.data.success) {
          setAppraisalHistory(response.data.history || []);
        } else {
          setError(response.data.message || "Failed to fetch history");
        }
      } catch (err: any) {
        console.error("Error fetching appraisal history:", err);
        setError(err.response?.data?.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

      <div className="flex justify-between items-center mb-6">

        <div>

          <h2 className="text-2xl font-bold">
            Appraisal History
          </h2>

          <p className="text-gray-500">
            Previous appraisal records
          </p>

        </div>

      </div>

      <div className="overflow-x-auto">

        <table className="min-w-full border border-gray-200">

          <thead className="bg-gray-100">

            <tr>

              <th className="px-4 py-3 text-left">
                Year
              </th>

              <th className="px-4 py-3 text-left">
                Appraisal Cycle
              </th>

              <th className="px-4 py-3 text-left">
                Rating
              </th>

              <th className="px-4 py-3 text-center">
                Score
              </th>

              <th className="px-4 py-3 text-center">
                Status
              </th>

              <th className="px-4 py-3 text-left">
                Reviewed By
              </th>

              <th className="px-4 py-3 text-left">
                Reviewed Date
              </th>

              <th className="px-4 py-3 text-center">
                Action
              </th>

            </tr>

          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Loading appraisal history...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-red-500">
                  {error}
                </td>
              </tr>
            ) : appraisalHistory.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No appraisal history found.
                </td>
              </tr>
            ) : appraisalHistory.map((item: any) => (

              <tr
                key={item.id}
                className="border-t hover:bg-gray-50"
              >

                <td className="px-4 py-3">
                  {item.year}
                </td>

                <td className="px-4 py-3">
                  {item.cycle}
                </td>

                <td className="px-4 py-3">

                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium
                    ${
                      item.rating === "Excellent"
                        ? "bg-green-100 text-green-700"
                        : item.rating === "Good"
                        ? "bg-blue-100 text-blue-700"
                        : item.rating === "Average"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.rating}
                  </span>

                </td>

                <td className="px-4 py-3 text-center">
                  {item.score}/10
                </td>

                <td className="px-4 py-3 text-center">

                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">

                    {item.status}

                  </span>

                </td>

                <td className="px-4 py-3">
                  {item.reviewedBy}
                </td>

                <td className="px-4 py-3">
                  {item.reviewedDate}
                </td>

                <td className="px-4 py-3 text-center">

                  <button
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
                  >
                    View Report
                  </button>

                </td>

              </tr>

            ))}
          </tbody>

        </table>

      </div>

    </div>
  );
};

export default HistoryTab;