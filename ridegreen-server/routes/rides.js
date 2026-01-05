const router = require("express").Router();
const Ride = require("../models/Ride");
const Booking = require("../models/Booking");
const User = require("../models/User");
const auth = require("../middleware/auth");

// Enhanced location normalization
const normalizeLocation = (location) => {
  return location
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
};

// 1. POST A RIDE (Driver) - PROTECTED
router.post("/", auth, async (req, res) => {
  try {
    const {
      origin,
      destination,
      fromCoords,
      toCoords,
      date,
      time,
      price,
      seats,
      vehicleInfo,
      preferences,
    } = req.body;

    if (
      !fromCoords?.lat ||
      !fromCoords?.lng ||
      !toCoords?.lat ||
      !toCoords?.lng
    ) {
      return res.status(400).json({ error: "Invalid coordinates provided" });
    }

    const newRide = new Ride({
      driver: req.userId,
      origin: normalizeLocation(origin),
      destination: normalizeLocation(destination),
      fromCoords,
      toCoords,
      date,
      time,
      price,
      seats,
      availableSeats: seats,
      vehicleInfo,
      preferences,
      verified: true,
    });

    const savedRide = await newRide.save();
    const populatedRide = await Ride.findById(savedRide._id).populate(
      "driver",
      "name email phone rating totalRatings profilePicture verified"
    );

    res.json(populatedRide);
  } catch (err) {
    console.error("Error posting ride:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET ALL ACTIVE RIDES - WITH EXACT LOCATION MATCHING
router.get("/", async (req, res) => {
  try {
    const { origin, destination, date } = req.query;

    let filter = {
      status: "active",
      availableSeats: { $gt: 0 },
    };

    // Exact location matching
    if (origin) {
      filter.origin = normalizeLocation(origin);
    }

    if (destination) {
      filter.destination = normalizeLocation(destination);
    }

    if (date) {
      filter.date = date;
    }

    const rides = await Ride.find(filter)
      .populate(
        "driver",
        "name email phone rating totalRatings profilePicture verified ridesCompleted"
      )
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(rides);
  } catch (err) {
    console.error("Error fetching rides:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. GET RIDES BY DRIVER ID
router.get("/driver/:driverId", async (req, res) => {
  try {
    const rides = await Ride.find({ driver: req.params.driverId })
      .populate(
        "driver",
        "name email phone rating totalRatings profilePicture verified ridesCompleted"
      )
      .sort({ createdAt: -1 });

    const ridesWithBookings = await Promise.all(
      rides.map(async (ride) => {
        const bookings = await Booking.find({
          ride: ride._id,
          status: { $in: ["confirmed", "completed", "pending"] },
        }).populate("passenger", "name email phone rating profilePicture");

        return {
          ...ride.toObject(),
          bookings: bookings.map((b) => ({
            id: b._id,
            passengerId: b.passenger?._id,
            passenger: b.passengerName || b.passenger?.name,
            passengerEmail: b.passengerEmail || b.passenger?.email,
            phone: b.passengerPhone,
            email: b.passengerEmail,
            seats: b.seatsBooked,
            amount: b.totalAmount,
            paid: b.paymentStatus === "completed",
            paymentStatus: b.paymentStatus,
            escrowStatus: b.escrowStatus,
            status: b.status,
            rated: b.rated || false,
            createdAt: b.createdAt,
          })),
          totalEarnings: bookings
            .filter((b) => b.paymentStatus === "completed")
            .reduce((sum, b) => sum + b.totalAmount, 0),
          totalPassengers: bookings.filter(
            (b) => b.status === "confirmed" || b.status === "completed"
          ).length,
        };
      })
    );

    res.json(ridesWithBookings);
  } catch (err) {
    console.error("Error fetching driver rides:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4. GET SINGLE RIDE BY ID
router.get("/:id", async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate(
      "driver",
      "name email phone rating totalRatings profilePicture verified ridesCompleted createdAt"
    );

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    const bookingsCount = await Booking.countDocuments({
      ride: ride._id,
      status: { $in: ["confirmed", "completed"] },
    });

    res.json({
      ...ride.toObject(),
      bookingsCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. UPDATE RIDE - PROTECTED
router.put("/:id", auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.driver.toString() !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (req.body.origin) {
      req.body.origin = normalizeLocation(req.body.origin);
    }
    if (req.body.destination) {
      req.body.destination = normalizeLocation(req.body.destination);
    }

    const updatedRide = await Ride.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate(
      "driver",
      "name email phone rating totalRatings profilePicture verified"
    );

    res.json(updatedRide);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. MARK RIDE AS COMPLETED - PROTECTED
router.put("/:id/complete", auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.driver.toString() !== req.userId) {
      return res.status(403).json({ error: "Only driver can complete ride" });
    }

    ride.status = "completed";
    await ride.save();

    // Update bookings to completed
    await Booking.updateMany(
      { ride: req.params.id, status: "confirmed" },
      { $set: { status: "completed" } }
    );

    // Increment driver's completed rides
    await User.findByIdAndUpdate(req.userId, {
      $inc: { ridesCompleted: 1 },
    });

    res.json({
      success: true,
      message: "Ride marked as completed",
      ride,
    });
  } catch (err) {
    console.error("Error completing ride:", err);
    res.status(500).json({ error: err.message });
  }
});

// 7. CANCEL RIDE - PROTECTED
router.delete("/:id", auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.driver.toString() !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const bookings = await Booking.find({
      ride: req.params.id,
      status: "confirmed",
    });

    if (bookings.length > 0) {
      return res.status(400).json({
        error: "Cannot cancel ride with confirmed bookings",
      });
    }

    ride.status = "cancelled";
    await ride.save();

    res.json({ success: true, message: "Ride cancelled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
