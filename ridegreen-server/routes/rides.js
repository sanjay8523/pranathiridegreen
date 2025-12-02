const router = require("express").Router();
const Ride = require("../models/Ride");
const Booking = require("../models/Booking");
const User = require("../models/User");
const auth = require("../middleware/auth");

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
      !fromCoords ||
      !toCoords ||
      !fromCoords.lat ||
      !fromCoords.lng ||
      !toCoords.lat ||
      !toCoords.lng
    ) {
      return res.status(400).json({ error: "Invalid coordinates provided" });
    }

    const newRide = new Ride({
      driver: req.userId,
      origin,
      destination,
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
      "name email phone rating totalRatings"
    );

    res.json(populatedRide);
  } catch (err) {
    console.error("Error posting ride:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET ALL ACTIVE RIDES WITH FILTERS
router.get("/", async (req, res) => {
  try {
    const {
      origin,
      destination,
      date,
      minSeats,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter query
    let filter = {
      status: "active",
      availableSeats: { $gt: 0 },
    };

    if (origin) {
      filter.origin = { $regex: origin, $options: "i" };
    }

    if (destination) {
      filter.destination = { $regex: destination, $options: "i" };
    }

    if (date) {
      filter.date = date;
    }

    if (minSeats) {
      filter.availableSeats = { $gte: parseInt(minSeats) };
    }

    if (maxPrice) {
      filter.price = { $lte: parseInt(maxPrice) };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const rides = await Ride.find(filter)
      .populate(
        "driver",
        "name email phone rating totalRatings profilePicture verified"
      )
      .sort(sort)
      .limit(100);

    res.json(rides);
  } catch (err) {
    console.error("Error fetching rides:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. SEARCH RIDES (Advanced)
router.get("/search", async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "Origin and destination required" });
    }

    const rides = await Ride.find({
      origin: { $regex: from, $options: "i" },
      destination: { $regex: to, $options: "i" },
      date: date || { $gte: new Date().toISOString().split("T")[0] },
      status: "active",
      availableSeats: { $gt: 0 },
    })
      .populate(
        "driver",
        "name email phone rating totalRatings profilePicture verified"
      )
      .sort({ createdAt: -1 });

    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET RIDES BY DRIVER ID
router.get("/driver/:driverId", async (req, res) => {
  try {
    const rides = await Ride.find({ driver: req.params.driverId })
      .populate("driver", "name email phone rating totalRatings")
      .sort({ createdAt: -1 });

    const ridesWithBookings = await Promise.all(
      rides.map(async (ride) => {
        const bookings = await Booking.find({
          ride: ride._id,
          status: { $in: ["confirmed", "completed"] },
        }).populate("passenger", "name email phone rating");

        return {
          ...ride.toObject(),
          bookings: bookings.map((b) => ({
            id: b._id,
            passenger: b.passengerName || b.passenger?.name,
            phone: b.passengerPhone,
            email: b.passengerEmail,
            seats: b.seatsBooked,
            amount: b.totalAmount,
            paid: b.paymentStatus === "completed",
            paymentStatus: b.paymentStatus,
            escrowStatus: b.escrowStatus,
            status: b.status,
          })),
          totalEarnings: bookings.reduce(
            (sum, b) =>
              sum + (b.paymentStatus === "completed" ? b.totalAmount : 0),
            0
          ),
        };
      })
    );

    res.json(ridesWithBookings);
  } catch (err) {
    console.error("Error fetching driver rides:", err);
    res.status(500).json({ error: err.message });
  }
});

// 5. GET SINGLE RIDE BY ID
router.get("/:id", async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate(
      "driver",
      "name email phone rating totalRatings profilePicture verified"
    );

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    res.json(ride);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. UPDATE RIDE - PROTECTED
router.put("/:id", auth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.driver.toString() !== req.userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this ride" });
    }

    const updatedRide = await Ride.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate("driver", "name email phone rating totalRatings");

    res.json(updatedRide);
  } catch (err) {
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
      return res
        .status(403)
        .json({ error: "Not authorized to cancel this ride" });
    }

    // Check if there are confirmed bookings
    const bookings = await Booking.find({
      ride: req.params.id,
      status: "confirmed",
    });

    if (bookings.length > 0) {
      return res.status(400).json({
        error:
          "Cannot cancel ride with confirmed bookings. Please contact passengers first.",
      });
    }

    ride.status = "cancelled";
    await ride.save();

    res.json({ success: true, message: "Ride cancelled successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
