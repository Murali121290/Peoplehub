import React, { useState, useEffect } from "react";
import StatCard from "../components/StatCard";
import { getCompletionPercentage } from "../utils/appraisalUtils";
import { appraisalService } from "../../../services/api";

const DashboardTab: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [cycle, setCycle] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, cycleResponse] = await Promise.all([
          appraisalService.getDashboardStats(),
          appraisalService.getActiveCycle()
        ]);
        
        if (statsResponse.data.success) {
          setStats(statsResponse.data.stats);
        }
        if (cycleResponse.data.success && cycleResponse.data.cycle) {
          setCycle(cycleResponse.data.cycle);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-6 text-center">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">

      {/* Dashboard Statistics */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        <StatCard
          title="Total Employees"
          value={stats?.totalEmployees || 0}
        />

        <StatCard
          title="Pending Reviews"
          value={stats?.pendingReviews || 0}
        />

        <StatCard
          title="Completed Reviews"
          value={stats?.completedReviews || 0}
        />

        <StatCard
          title="Average Score"
          value={stats?.averageScore || 0}
        />

      </div>

      {/* Current Appraisal Cycle */}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

        <h2 className="text-xl font-semibold mb-4">
          Current Appraisal Cycle
        </h2>

        {cycle ? (
        <div className="grid grid-cols-2 gap-6">

          <div>

            <p className="text-sm text-gray-500">
              Title
            </p>

            <p className="font-medium">
              {cycle.title}
            </p>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Year
            </p>

            <p className="font-medium">
              {cycle.appraisalYear}
            </p>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              Start Date
            </p>

            <p className="font-medium">
              {cycle.startDate}
            </p>

          </div>

          <div>

            <p className="text-sm text-gray-500">
              End Date
            </p>

            <p className="font-medium">
              {cycle.endDate}
            </p>

          </div>

        </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No active appraisal cycle found.</p>
        )}

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
              width: `${getCompletionPercentage(stats)}%`,
            }}
          />

        </div>

        <p className="mt-3 text-gray-600">

          {getCompletionPercentage(stats)}%

          Employees Completed

        </p>

      </div>

    </div>
  );
};

export default DashboardTab;