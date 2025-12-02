const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const User = require("../models/User");

// This function should be called by a cron job (e.g., every hour)
const releaseEscrowPayments = async () => {
  try {
    console.log("🔄 Running escrow release scheduler...");
    const now = new Date();

    // Find payments ready to be released
    const paymentsToRelease = await Payment.find({
      escrowStatus: "held",
      escrowReleaseDate: { $lte: now },
      status: "captured",
    }).populate("driver booking");

    console.log(`Found ${paymentsToRelease.length} payments to release`);

    for (const payment of paymentsToRelease) {
      try {
        // Check if booking is completed
        const booking = await Booking.findById(payment.booking);
        if (booking.status === "completed" || booking.status === "confirmed") {
          // Release funds to driver
          payment.escrowStatus = "released";
          payment.releasedAt = new Date();
          await payment.save();

          // Update driver's wallet
          await User.findByIdAndUpdate(payment.driver._id, {
            $inc: { walletBalance: payment.amount },
          });

          // Update booking
          booking.escrowStatus = "released";
          await booking.save();

          console.log(
            `✅ Released ₹${payment.amount} to driver ${payment.driver._id}`
          );
        }
      } catch (err) {
        console.error(`Error releasing payment ${payment._id}:`, err);
      }
    }
    console.log("✅ Escrow release completed");
  } catch (err) {
    console.error("❌ Escrow scheduler error:", err);
  }
};

// Run every hour
const startEscrowScheduler = () => {
  console.log("🚀 Starting escrow scheduler...");

  // Run immediately on startup
  releaseEscrowPayments();

  // Then run every hour
  setInterval(releaseEscrowPayments, 60 * 60 * 1000); // 1 hour
};

module.exports = { releaseEscrowPayments, startEscrowScheduler };
