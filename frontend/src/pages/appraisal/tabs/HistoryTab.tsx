import React from "react";

const appraisalHistory = [
  {
    id: 1,
    year: 2026,
    cycle: "2026 Annual Appraisal",
    rating: "Excellent",
    score: 10,
    status: "Completed",
    reviewedBy: "John Manager",
    reviewedDate: "08 Jul 2026",
  },
  {
    id: 2,
    year: 2025,
    cycle: "2025 Annual Appraisal",
    rating: "Good",
    score: 8,
    status: "Completed",
    reviewedBy: "John Manager",
    reviewedDate: "10 Jul 2025",
  },
  {
    id: 3,
    year: 2024,
    cycle: "2024 Annual Appraisal",
    rating: "Average",
    score: 6,
    status: "Completed",
    reviewedBy: "John Manager",
    reviewedDate: "15 Jul 2024",
  },
];

const HistoryTab: React.FC = () => {
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

            {appraisalHistory.map((item) => (

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