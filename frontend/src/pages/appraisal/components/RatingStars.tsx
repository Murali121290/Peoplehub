import React from "react";

interface RatingStarsProps {
  score: number;
  maxScore?: number;
  showText?: boolean;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  score,
  maxScore = 10,
  showText = true,
}) => {
  const filledStars = Math.round(score / 2);

  return (
    <div className="flex items-center gap-2">

      <div className="flex">

        {[1, 2, 3, 4, 5].map((star) => (

          <svg
            key={star}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={
              star <= filledStars
                ? "#FACC15"
                : "#E5E7EB"
            }
            className="w-6 h-6"
          >
            <path
              fillRule="evenodd"
              d="M12 2.5l2.92 5.92 6.54.95-4.73 4.61 1.12 6.52L12 17.77l-5.85 3.08 1.12-6.52L2.54 9.37l6.54-.95L12 2.5z"
              clipRule="evenodd"
            />
          </svg>

        ))}

      </div>

      {showText && (
        <span className="text-sm font-medium text-gray-700">
          {score}/{maxScore}
        </span>
      )}

    </div>
  );
};

export default RatingStars;