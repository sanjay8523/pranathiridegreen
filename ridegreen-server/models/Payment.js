const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ride",
    required: true,
  },
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  razorpayOrderId: {
    type: String,
    required: true,
  },
  razorpayPaymentId: {
    type: String,
  },
  razorpaySignature: {
    type: String,
  },
  status: {
    type: String,
    enum: ["created", "authorized", "captured", "failed", "refunded"],
    default: "created",
  },
  escrowStatus: {
    type: String,
    enum: ["held", "released", "refunded"],
    default: "held",
  },
  escrowReleaseDate: {
    type: Date,
  },
  releasedAt: {
    type: Date,
  },
  currency: {
    type: String,
    default: "INR",
  },
  method: {
    type: String,
    default: "razorpay",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Payment", PaymentSchema);
