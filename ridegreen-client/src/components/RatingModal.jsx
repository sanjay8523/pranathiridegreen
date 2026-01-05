import React, { useState } from "react";
import { Star, X, Send } from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const RatingModal = ({ isOpen, onClose, ratingData, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const availableTags = [
    "punctual",
    "friendly",
    "clean_vehicle",
    "safe_driver",
    "good_company",
    "respectful",
    "helpful",
  ];
  const tagLabels = {
    punctual: "Punctual",
    friendly: "Friendly",
    clean_vehicle: "Clean Vehicle",
    safe_driver: "Safe Driver",
    good_company: "Good Company",
    respectful: "Respectful",
    helpful: "Helpful",
  };

  const handleSubmit = async () => {
    if (rating === 0) return alert("Please select a rating");

    setSubmitting(true);
    try {
      await api.post("/ratings", {
        bookingId: ratingData.bookingId,
        ratedUserId: ratingData.userToRate.id,
        rating,
        review,
        tags: selectedTags,
      });

      alert("Rating submitted successfully!");
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      console.error("Submission error:", error);
      alert(error.response?.data?.error || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoverRating(0);
    setReview("");
    setSelectedTags([]);
    onClose();
  };

  if (!isOpen || !ratingData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center rounded-t-3xl">
          <h2 className="text-2xl font-black text-gray-800">
            Rate Your Experience
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-2xl overflow-hidden">
              {ratingData.userToRate.profilePicture ? (
                <img
                  src={ratingData.userToRate.profilePicture}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                ratingData.userToRate.name?.[0] || "?"
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                {ratingData.userToRate.name}
              </h3>
              <p className="text-sm text-gray-600">
                {ratingData.ratingType === "driver"
                  ? "Your Driver"
                  : "Your Passenger"}
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              How would you rate your experience?
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={40}
                    className={
                      star <= (hoverRating || rating)
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-gray-300"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          {rating > 0 && (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  What did you like? (Optional)
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() =>
                        setSelectedTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag]
                        )
                      }
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                        selectedTags.includes(tag)
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {tagLabels[tag]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Write a review (Optional)
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your experience..."
                  maxLength={500}
                  rows={4}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-gray-800 outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </>
          )}

          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-xl font-bold text-lg shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              "Submitting..."
            ) : (
              <>
                <Send size={20} /> Submit Rating
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
