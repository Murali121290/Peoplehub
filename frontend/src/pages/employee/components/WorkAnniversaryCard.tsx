import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_URL } from "../../../config/api";

interface AnniversaryEmployee {
  id: number;
  employee_id: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  designation: string;
  department: string;
  joining_date: string;
  years_completed: number;
  profile_image: boolean;
}

interface AnniversaryResponse {
  success: boolean;
  count: number;
  employees: AnniversaryEmployee[];
}

const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/149/149071.png";

function getOrdinal(years: number) {
  if (years % 100 >= 11 && years % 100 <= 13) {
    return `${years}th`;
  }

  switch (years % 10) {
    case 1:
      return `${years}st`;
    case 2:
      return `${years}nd`;
    case 3:
      return `${years}rd`;
    default:
      return `${years}th`;
  }
}

const WorkAnniversaryCard: React.FC = () => {
  const [employees, setEmployees] = useState<AnniversaryEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [pause, setPause] = useState(false);

  const currentEmployee = useMemo(() => {
    if (!employees.length) return null;
    return employees[currentIndex];
  }, [employees, currentIndex]);

  const fetchAnniversaries = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get<AnniversaryResponse>(
        `${API_URL}/api/work-anniversary/today`
      );

      if (response.data.success) {
        setEmployees(response.data.employees);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load work anniversaries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnniversaries();
  }, []);

  useEffect(() => {
    if (employees.length <= 1) return;

    if (pause) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === employees.length - 1 ? 0 : prev + 1
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [employees, pause]);

  const profileImage = currentEmployee?.profile_image
    ? `${API_URL}/api/employees/image/${currentEmployee.id}`
    : DEFAULT_AVATAR;

  if (loading) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5 animate-pulse">

          <div className="flex items-center gap-3">

            <div className="w-16 h-16 rounded-full bg-gray-200"></div>

            <div className="flex-1">

              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>

              <div className="h-3 bg-gray-100 rounded w-24"></div>

            </div>

          </div>

          <div className="mt-6 space-y-3">

            <div className="h-3 rounded bg-gray-200"></div>

            <div className="h-3 rounded bg-gray-100"></div>

            <div className="h-3 rounded bg-gray-200"></div>

            <div className="h-3 rounded bg-gray-100"></div>

          </div>

        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-red-200 shadow-lg p-6">

          <h2 className="font-bold text-red-600 text-lg">
            Work Anniversary
          </h2>

          <p className="text-sm text-gray-600 mt-3">
            {error}
          </p>

          <button
            onClick={fetchAnniversaries}
            className="mt-5 w-full rounded-xl bg-black text-white py-2 text-sm font-semibold hover:bg-gray-800 transition"
          >
            Retry
          </button>

        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="w-full max-w-sm ml-auto mr-[10px]">

        <motion.div

          initial={{ opacity: 0, y: 15 }}

          animate={{ opacity: 1, y: 0 }}

          className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
        >

          <div className="px-5 py-4 border-b">

            <h2 className="text-lg font-bold text-gray-900">
              🎉 Today's Work Anniversaries
            </h2>

          </div>

          <div className="px-6 py-10 text-center">

            <div className="text-6xl mb-5">
              📅
            </div>

            <h3 className="font-bold text-lg text-gray-800">
              No Work Anniversaries Today
            </h3>

            <p className="text-sm text-gray-500 mt-3 leading-6">

              There are no employees celebrating
              their work anniversary today.

            </p>

            <div className="mt-5 rounded-xl bg-gray-50 p-4">

              <p className="text-sm text-gray-600">

                💙 Every milestone matters.
                We'll celebrate the next one soon!

              </p>

            </div>

          </div>

        </motion.div>

      </div>
    );
  }

  return (
        <div
      className="w-full max-w-sm ml-auto mr-[10px]"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}

        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-gray-50 to-white">

          <div>

            <h2 className="text-lg font-bold text-gray-900">
              🎉 Today's Work Anniversaries
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              {employees.length} Celebration
              {employees.length > 1 ? "s" : ""}
            </p>

          </div>

          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">

            🎊

          </div>

        </div>

        <AnimatePresence mode="wait">

          <motion.div
            key={currentEmployee?.id}
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            exit={{
              opacity: 0,
              y: -20
            }}
            transition={{
              duration: 0.3
            }}
            className="p-6"
          >

            <div className="flex flex-col items-center">

              <img
                src={profileImage}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    DEFAULT_AVATAR;
                }}
                className="w-24 h-24 rounded-full object-cover border-4 border-yellow-300 shadow-lg"
              />

              <h3 className="mt-4 text-xl font-bold text-gray-900 text-center">

                {currentEmployee?.full_name}

              </h3>
<p className="text-base font-semibold text-gray-700">

    {currentEmployee?.designation}

</p>

<p className="text-sm text-gray-500 mt-1">

    {currentEmployee?.department}

</p>

            </div>

            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">

    <div className="flex items-center justify-center gap-2">

        <span className="text-2xl">🏆</span>

        <span className="text-lg font-bold text-gray-900">

            {currentEmployee?.years_completed ?? 0} Year
            {(currentEmployee?.years_completed ?? 0) > 1 ? "s" : ""}

        </span>

    </div>

    <div className="text-center mt-3">

        <p className="text-gray-600 text-sm">

            Celebrating another successful year
            with S4Carlisle Publishing Services.

        </p>

    </div>

</div>

            <div className="mt-5 rounded-xl bg-gray-50 border border-gray-200 p-4">

              <div className="flex justify-between">

                <span className="text-sm text-gray-500">

                  Joined

                </span>

                <span className="font-semibold text-gray-900">

                  {currentEmployee?.joining_date}

                </span>

              </div>

              <div className="flex justify-between mt-3">

                <span className="text-sm text-gray-500">

                  Years Completed

                </span>

                <span className="font-bold text-green-600">

                  {currentEmployee?.years_completed}

                  {" "}
                  Year
                  {currentEmployee?.years_completed !== 1
                    ? "s"
                    : ""}

                </span>

              </div>

            </div>

            {employees.length > 1 && (

              <div className="flex justify-center gap-2 mt-6">

                {employees.map((_, index) => (

                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`transition-all duration-300 rounded-full ${
                      index === currentIndex
                        ? "w-8 h-2 bg-black"
                        : "w-2 h-2 bg-gray-300"
                    }`}
                  />

                ))}

              </div>

            )}

          </motion.div>

        </AnimatePresence>

      </motion.div>

    </div>
  );
};

export default WorkAnniversaryCard;