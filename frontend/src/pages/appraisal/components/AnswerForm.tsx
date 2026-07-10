import React, { useState } from "react";
import { AppraisalQuestion } from "../models/appraisal";
import QuestionCard from "./QuestionCard";

interface AnswerFormProps {
  questions: AppraisalQuestion[];
  onSubmit: (answers: Record<number, string>) => void;
}

const AnswerForm: React.FC<AnswerFormProps> = ({
  questions,
  onSubmit,
}) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  const handleAnswerChange = (
    questionId: number,
    value: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [questionId]: "",
    }));
  };

  const validate = () => {
    const validationErrors: Record<number, string> = {};

    questions.forEach((question) => {
      if (!answers[question.id] || answers[question.id].trim() === "") {
        validationErrors[question.id] = "Answer is required.";
      }
    });

    setErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    onSubmit(answers);
  };

  return (
    <div className="space-y-6">

      {questions.map((question, index) => (

        <div key={question.id}>

          <QuestionCard
            questionNumber={index + 1}
            question={question.question}
            answer={answers[question.id] || ""}
            editable
            onChange={(value) =>
              handleAnswerChange(question.id, value)
            }
          />

          {errors[question.id] && (
            <p className="text-red-500 text-sm mt-2">
              {errors[question.id]}
            </p>
          )}

        </div>

      ))}

      <div className="flex justify-end">

        <button
          onClick={handleSubmit}
          className="
            px-6
            py-3
            bg-black
            text-white
            rounded-lg
            hover:bg-gray-900
            transition
          "
        >
          Submit Appraisal
        </button>

      </div>

    </div>
  );
};

export default AnswerForm;