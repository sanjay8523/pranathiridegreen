const router = require("express").Router();
const Booking = require("../models/Booking");
const Ride = require("../models/Ride");
const Payment = require("../models/Payment");
const auth = require("../middleware/auth");

// 1. CREATE BOOKING (Called after payment verification)
router.post("/", auth, async (req, res) => {
  try {
    const {
      rideId,
      passengerName,
      passengerPhone,
      passengerEmail,
      seatsBooked,
      totalAmount,
      paymentId,
    } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.availableSeats < seatsBooked) {
      return res.status(400).json({ error: "Not enough seats available" });
    }

    const booking = new Booking({
      ride: rideId,
      passenger: req.userId,
      passengerName,
      passengerPhone,
      passengerEmail,
      seatsBooked,
      totalAmount,
      paymentId,
      paymentStatus: "completed",
      escrowStatus: "held",
      escrowReleaseDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: "confirmed",
    });

    await booking.save();

    ride.availableSeats -= seatsBooked;
    if (ride.availableSeats === 0) {
      ride.status = "completed";
    }
    await ride.save();

    res.json({
      success: true,
      booking,
      message: "Booking confirmed! Payment held in escrow.",
    });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET BOOKINGS BY PASSENGER ID - PROTECTED
router.get("/passenger/:passengerId", auth, async (req, res) => {
  try {
    // Verify user can only see their own bookings
    if (req.params.passengerId !== req.userId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const bookings = await Booking.find({ passenger: req.params.passengerId })
      .populate({
        path: "ride",
        populate: {
          path: "driver",
          select: "name email phone rating totalRatings",
        },
      })
      .populate("paymentId")
      .sort({ createdAt: -1 });

    const formattedBookings = bookings.map((b) => ({
      id: b._id,
      driver: b.ride?.driver?.name,
      driverPhone: b.ride?.driver?.phone,
      driverRating: b.ride?.driver?.rating,
      origin: b.ride?.origin,
      destination: b.ride?.destination,
      date: b.ride?.date,
      time: b.ride?.time,
      seats: b.seatsBooked,
      amount: b.totalAmount,
      status: b.status,
      paymentStatus: b.paymentStatus,
      escrowStatus: b.escrowStatus,
      escrowReleaseDate: b.escrowReleaseDate,
      rated: b.rated,
      createdAt: b.createdAt,
    }));

    res.json(formattedBookings);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. GET BOOKING BY ID - PROTECTED
router.get("/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: "ride",
        populate: { path: "driver", select: "name email phone rating" },
      })
      .populate("passenger", "name email phone")
      .populate("paymentId");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check authorization
    const isPassenger = booking.passenger._id.toString() === req.userId;
    const isDriver = booking.ride.driver._id.toString() === req.userId;

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. CANCEL BOOKING - PROTECTED
router.put("/:id/cancel", auth, async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id).populate("ride");
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Only passenger can cancel
    if (booking.passenger.toString() !== req.userId) {
      return res
        .status(403)
        .json({ error: "Only passenger can cancel booking" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ error: "Booking already cancelled" });
    }

    if (booking.status === "completed") {
      return res.status(400).json({ error: "Cannot cancel completed booking" });
    }

    // Update booking
    booking.status = "cancelled";
    booking.cancellationReason = reason;
    booking.cancelledBy = req.userId;
    booking.cancelledAt = new Date();
    booking.paymentStatus = "refunded";
    booking.escrowStatus = "refunded";
    await booking.save();

    // Restore ride seats
    const ride = await Ride.findById(booking.ride._id);
    ride.availableSeats += booking.seatsBooked;
    ride.status = "active";
    await ride.save();

    // Update payment status
    if (booking.paymentId) {
      await Payment.findByIdAndUpdate(booking.paymentId, {
        status: "refunded",
        escrowStatus: "refunded",
      });
    }

    res.json({
      success: true,
      message: "Booking cancelled successfully. Refund will be processed.",
      booking,
    });
  } catch (err) {
    console.error("Cancellation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 5. COMPLETE BOOKING (Mark ride as completed) - PROTECTED
router.put("/:id/complete", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("ride");
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Only driver can mark as completed
    if (booking.ride.driver.toString() !== req.userId) {
      return res
        .status(403)
        .json({ error: "Only driver can complete booking" });
    }

    booking.status = "completed";
    await booking.save();

    res.json({
      success: true,
      message: "Booking marked as completed",
      booking,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET ALL BOOKINGS (Admin only)
router.get("/", auth, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("passenger", "name email")
      .populate({
        path: "ride",
        populate: { path: "driver", select: "name email" },
      })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
