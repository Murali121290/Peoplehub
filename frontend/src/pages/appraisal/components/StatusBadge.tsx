import React from "react";

interface StatusBadgeProps {
  status:
    | "Open"
    | "Pending Review"
    | "Reviewed"
    | "Completed";
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
}) => {
  const getStatusStyle = () => {
    switch (status) {
      case "Open":
        return "bg-green-100 text-green-700";

      case "Pending Review":
        return "bg-yellow-100 text-yellow-700";

      case "Reviewed":
        return "bg-blue-100 text-blue-700";

      case "Completed":
        return "bg-purple-100 text-purple-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        px-3
        py-1
        rounded-full
        text-sm
        font-medium
        ${getStatusStyle()}
      `}
    >
      {status}
    </span>
  );
};

export default StatusBadge;