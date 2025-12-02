const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  origin: {
    type: String,
    required: true,
  },
  destination: {
    type: String,
    required: true,
  },
  fromCoords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  toCoords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  seats: {
    type: Number,
    required: true,
  },
  availableSeats: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    default: "active",
    enum: ["active", "completed", "cancelled"],
  },
  verified: {
    type: Boolean,
    default: true,
  },
  rating: {
    type: Number,
    default: 0,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  vehicleInfo: {
    model: String,
    number: String,
    color: String,
  },
  preferences: {
    smokingAllowed: { type: Boolean, default: false },
    petsAllowed: { type: Boolean, default: false },
    musicAllowed: { type: Boolean, default: true },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for search optimization
RideSchema.index({ origin: 1, destination: 1, date: 1 });
RideSchema.index({ status: 1, availableSeats: 1 });

module.exports = mongoose.model("Ride", RideSchema);
