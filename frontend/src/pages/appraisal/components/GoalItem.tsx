import React from "react";

interface GoalItemProps {
  title: string;
  description: string;
  progress: number;
}

const GoalItem: React.FC<GoalItemProps> = ({
  title,
  description,
  progress,
}) => {
  const getProgressColor = () => {
    if (progress >= 80) {
      return "bg-green-500";
    }

    if (progress >= 60) {
      return "bg-blue-500";
    }

    if (progress >= 40) {
      return "bg-yellow-500";
    }

    return "bg-red-500";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-all">

      <div className="flex items-center justify-between mb-3">

        <div>

          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            {description}
          </p>

        </div>

        <div className="text-lg font-bold text-gray-700">
          {progress}%
        </div>

      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">

        <div
          className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

    </div>
  );
};

export default GoalItem;