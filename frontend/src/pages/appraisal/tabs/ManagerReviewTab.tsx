import React, { useState, useEffect } from "react";
import { appraisalService } from "../../../services/api";
import { getRatingColor } from "../utils/appraisalUtils";

const ratings = [
  "Excellent",
  "Good",
  "Average",
  "Needs Improvement",
] as const;

const ManagerReviewTab: React.FC = () => {
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [employeeAppraisal, setEmployeeAppraisal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState<"Excellent" | "Good" | "Average" | "Needs Improvement">("Good");
  const [score, setScore] = useState(8);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      const res = await appraisalService.getPendingAppraisals();
      if (res.data.success) {
        setPendingReviews(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load pending reviews", err);
      setError("Failed to load pending reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReview = async (review: any) => {
    setSelectedReview(review);
    setSubmitted(false);
    setRating("Good");
    setScore(8);
    setComment("");
    
    try {
      const res = await appraisalService.getEmployeeAppraisal(review.employee_id);
      if (res.data.success) {
        setEmployeeAppraisal(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load employee appraisal", err);
      alert("Failed to load employee answers.");
    }
  };

  const handleSubmit = async () => {
    if (comment.trim() === "") {
      alert("Please enter manager comments.");
      return;
    }

    try {
      const managerId = localStorage.getItem("user_id") || "1"; // Fallback to 1 if not set
      
      const payload = {
        employee_id: selectedReview.employee_id,
        cycle_id: selectedReview.cycle_id,
        manager_id: parseInt(managerId, 10),
        rating,
        score,
        manager_comment: comment
      };

      const res = await appraisalService.submitReview(payload);
      if (res.data.success) {
        setSubmitted(true);
        alert("Review submitted successfully.");
        // Refresh list
        setSelectedReview(null);
        setEmployeeAppraisal(null);
        fetchPendingReviews();
      } else {
        alert("Failed to submit review: " + res.data.message);
      }
    } catch (err: any) {
      console.error(err);
      alert("Error submitting review: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <div className="p-6 text-center">Loading pending reviews...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  if (!selectedReview) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4">Pending Appraisals</h2>
        {pendingReviews.length === 0 ? (
          <p className="text-gray-500">No pending appraisals to review.</p>
        ) : (
          <div className="space-y-4">
            {pendingReviews.map((review) => (
              <div key={`${review.employee_id}-${review.cycle_id}`} className="bg-white rounded-xl border shadow-sm p-6 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{review.employee_name}</h3>
                  <p className="text-gray-500 text-sm">Designation: {review.role}</p>
                  <p className="text-gray-500 text-sm">Cycle: {review.cycle_name}</p>
                  <p className="text-gray-500 text-sm">Submitted: {review.submission_date}</p>
                </div>
                <button
                  onClick={() => handleSelectReview(review)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Back button */}
      <button 
        onClick={() => { setSelectedReview(null); setEmployeeAppraisal(null); }}
        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-4 inline-block"
      >
        &larr; Back to pending list
      </button>

      {/* Employee Information */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Employee Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Employee</p>
            <p className="font-medium">{selectedReview.employee_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Employee ID</p>
            <p className="font-medium">EMP-{selectedReview.employee_id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Designation</p>
            <p className="font-medium">{selectedReview.role}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Cycle</p>
            <p className="font-medium">{selectedReview.cycle_name}</p>
          </div>
        </div>
      </div>

      {/* Employee Answers */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-5">Employee Answers</h2>
        {!employeeAppraisal ? (
          <p className="text-gray-500">Loading answers...</p>
        ) : (
          <div className="space-y-5">
            {employeeAppraisal.map((answer: any, index: number) => (
              <div key={answer.question_id || index} className="border rounded-lg p-4">
                <p className="font-medium mb-3">
                  {index + 1}. {answer.question_text || `Question ${answer.question_id}`}
                </p>
                <div className="bg-gray-100 rounded-lg p-4 text-gray-700 whitespace-pre-wrap">
                  {answer.answer}
                </div>
              </div>
            ))}
            {employeeAppraisal.length === 0 && (
              <p className="text-gray-500">No answers found.</p>
            )}
          </div>
        )}
      </div>

      {/* Manager Review Form */}
      {employeeAppraisal && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-5">Manager Review</h2>
          <div className="space-y-5">
            <div>
              <label className="block font-medium mb-2">Rating</label>
              <div className="flex flex-wrap gap-3">
                {ratings.map((item) => (
                  <button
                    key={item}
                    onClick={() => setRating(item)}
                    className={`px-5 py-2 rounded-lg border transition ${
                      rating === item
                        ? `${getRatingColor(item)} border-transparent text-white`
                        : "bg-white border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium mb-2">Score (1 - 10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-32 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Manager Comments</label>
              <textarea
                rows={5}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter review comments..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      {employeeAppraisal && (
        <div className="flex justify-end">
          <button
            disabled={submitted}
            onClick={handleSubmit}
            className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
              submitted ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-900"
            }`}
          >
            {submitted ? "Review Submitted" : "Submit Review"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ManagerReviewTab;