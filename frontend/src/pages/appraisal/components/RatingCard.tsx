import React from "react";
import { Rating } from "../models/appraisal";
import { getRatingColor } from "../utils/appraisalUtils";

interface RatingCardProps {
  rating: Rating;
  score: number;
  comment: string;

  onRatingChange: (rating: Rating) => void;
  onScoreChange: (score: number) => void;
  onCommentChange: (comment: string) => void;

  disabled?: boolean;
}

const ratings: Rating[] = [
  "Excellent",
  "Good",
  "Average",
  "Needs Improvement",
];

const RatingCard: React.FC<RatingCardProps> = ({
  rating,
  score,
  comment,
  onRatingChange,
  onScoreChange,
  onCommentChange,
  disabled = false,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">

      <h2 className="text-xl font-semibold mb-6">
        Manager Evaluation
      </h2>

      {/* Rating */}

      <div className="mb-6">

        <label className="block font-medium mb-3">
          Rating
        </label>

        <div className="flex flex-wrap gap-3">

          {ratings.map((item) => (

            <button
              key={item}
              type="button"
              disabled={disabled}
              onClick={() => onRatingChange(item)}
              className={`
                px-5
                py-2
                rounded-lg
                border
                transition-all

                ${
                  rating === item
                    ? `${getRatingColor(item)} border-transparent`
                    : "bg-white border-gray-300 hover:bg-gray-100"
                }

                ${
                  disabled
                    ? "cursor-not-allowed opacity-70"
                    : ""
                }
              `}
            >
              {item}
            </button>

          ))}

        </div>

      </div>

      {/* Score */}

      <div className="mb-6">

        <label className="block font-medium mb-2">
          Score (1 - 10)
        </label>

        <input
          type="number"
          min={1}
          max={10}
          disabled={disabled}
          value={score}
          onChange={(e) =>
            onScoreChange(Number(e.target.value))
          }
          className="
            w-40
            border
            border-gray-300
            rounded-lg
            px-4
            py-2
            focus:outline-none
            focus:ring-2
            focus:ring-black
          "
        />

      </div>

      {/* Comment */}

      <div>

        <label className="block font-medium mb-2">
          Manager Comment
        </label>

        <textarea
          rows={5}
          disabled={disabled}
          value={comment}
          onChange={(e) =>
            onCommentChange(e.target.value)
          }
          placeholder="Write your review..."
          className="
            w-full
            border
            border-gray-300
            rounded-lg
            p-4
            resize-none
            focus:outline-none
            focus:ring-2
            focus:ring-black
          "
        />

      </div>

    </div>
  );
};

export default RatingCard;