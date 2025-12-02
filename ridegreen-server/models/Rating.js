const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema({
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ride",
    required: true,
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  ratedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  ratingType: {
    type: String,
    enum: ["driver", "passenger"],
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    maxlength: 500,
  },
  tags: [
    {
      type: String,
      enum: [
        "punctual",
        "friendly",
        "clean_vehicle",
        "safe_driver",
        "good_company",
        "respectful",
        "helpful",
      ],
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate ratings
RatingSchema.index({ booking: 1, ratedBy: 1, ratedUser: 1 }, { unique: true });

module.exports = mongoose.model("Rating", RatingSchema);
