import React from "react";
import StatCard from "../components/StatCard";
import {
  dashboardStats,
  appraisalCycle,
  goals,
} from "../data/mockData";
import { getCompletionPercentage } from "../utils/appraisalUtils";

const DashboardTab: React.FC = () => {
  return (
    <div className="space-y-6">

      {/* Dashboard Statistics */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        <StatCard
          title="Total Employees"
          value={dashboardStats.totalEmployees}
        />

        <StatCard
          title="Pending Reviews"
          value={dashboardStats.pendingReviews}
        />

        <StatCard
          title="Completed Reviews"
          value={dashboardStats.completedReviews}
        />

        <StatCard
          title="Average Score"
          value={dashboardStats.averageScore}
        />

      </div>

      {/* Current Appraisal Cycle */}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

        <h2 className="text-xl font-semibold mb-4">
          Current Appraisal Cycle
        </h2>

        <div className="grid grid-cols-2 gap-6">

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

          <div>

            <p className="text-sm text-gray-500">
              Start Date
            </p>

            <p className="font-medium">
              {appraisalCycle.startDate}
            </p>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              End Date
            </p>

            <p className="font-medium">
              {appraisalCycle.endDate}
            </p>

          </div>

        </div>

      </div>

      {/* Completion */}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

        <h2 className="text-xl font-semibold mb-4">
          Appraisal Progress
        </h2>

        <div className="w-full bg-gray-200 rounded-full h-4">

          <div
            className="bg-black h-4 rounded-full"
            style={{
              width: `${getCompletionPercentage(dashboardStats)}%`,
            }}
          />

        </div>

        <p className="mt-3 text-gray-600">

          {getCompletionPercentage(dashboardStats)}%

          Employees Completed

        </p>

      </div>

      {/* Employee Goals */}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

        <h2 className="text-xl font-semibold mb-4">
          Goals
        </h2>

        <div className="space-y-5">

          {goals.map((goal) => (

            <div key={goal.id}>

              <div className="flex justify-between mb-2">

                <span className="font-medium">

                  {goal.title}

                </span>

                <span>

                  {goal.progress}%

                </span>

              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">

                <div
                  className="bg-black h-2 rounded-full"
                  style={{
                    width: `${goal.progress}%`,
                  }}
                />

              </div>

              <p className="text-gray-500 text-sm mt-2">

                {goal.description}

              </p>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
};

export default DashboardTab;