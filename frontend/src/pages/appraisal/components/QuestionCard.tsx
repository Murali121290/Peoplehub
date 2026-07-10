import React from "react";

interface QuestionCardProps {
  questionNumber: number;
  question: string;
  answer?: string;
  editable?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  questionNumber,
  question,
  answer = "",
  editable = false,
  placeholder = "Enter your answer...",
  onChange,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">

      {/* Question */}

      <div className="mb-4">

        <h3 className="text-lg font-semibold text-gray-900">

          Question {questionNumber}

        </h3>

        <p className="text-gray-700 mt-2">

          {question}

        </p>

      </div>

      {/* Answer */}

      {editable ? (

        <textarea
          rows={5}
          value={answer}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          className="
            w-full
            rounded-lg
            border
            border-gray-300
            p-4
            focus:outline-none
            focus:ring-2
            focus:ring-black
            resize-none
          "
        />

      ) : (

        <div className="bg-gray-100 rounded-lg p-4 min-h-[120px]">

          <p className="text-gray-700 whitespace-pre-wrap">

            {answer || "No answer submitted."}

          </p>

        </div>

      )}

    </div>
  );
};

export default QuestionCard;