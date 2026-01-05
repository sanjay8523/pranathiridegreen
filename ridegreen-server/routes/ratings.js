const router = require("express").Router();
const Rating = require("../models/Rating");
const User = require("../models/User");
const Ride = require("../models/Ride");
const Booking = require("../models/Booking");
const auth = require("../middleware/auth");

// 1. SUBMIT RATING WITH REVIEW
router.post("/", auth, async (req, res) => {
  try {
    const { bookingId, ratedUserId, rating, review, tags } = req.body;

    // Basic Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }
    if (!bookingId || !ratedUserId) {
      return res
        .status(400)
        .json({ error: "Missing bookingId or ratedUserId" });
    }

    // Verify booking exists and FETCH THE RIDE ID from it
    const booking = await Booking.findById(bookingId).populate("ride");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (!booking.ride) {
      return res
        .status(404)
        .json({
          error: "The ride associated with this booking no longer exists.",
        });
    }

    // Check if booking is completed
    if (booking.status !== "completed") {
      return res.status(400).json({ error: "Can only rate completed rides" });
    }

    // Determine rating type (Is the logged-in user the passenger or driver?)
    const isPassenger = booking.passenger.toString() === req.userId;
    const isDriver = booking.ride.driver.toString() === req.userId;

    if (!isPassenger && !isDriver) {
      return res
        .status(403)
        .json({ error: "You are not authorized to rate this ride" });
    }

    const ratingType = isPassenger ? "driver" : "passenger";

    // Check for existing rating to prevent duplicates
    const existingRating = await Rating.findOne({
      booking: bookingId,
      ratedBy: req.userId,
      ratedUser: ratedUserId,
    });

    if (existingRating) {
      return res
        .status(400)
        .json({ error: "You have already rated this user for this ride" });
    }

    // Create rating - CRITICAL: We use booking.ride._id to satisfy the 'required' constraint
    const newRating = new Rating({
      ride: booking.ride._id,
      booking: bookingId,
      ratedBy: req.userId,
      ratedUser: ratedUserId,
      ratingType,
      rating,
      review: review || "",
      tags: tags || [],
    });

    await newRating.save();

    // Update the User's overall rating
    const allUserRatings = await Rating.find({ ratedUser: ratedUserId });
    const totalRatings = allUserRatings.length;
    const sumRatings = allUserRatings.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = Number((sumRatings / totalRatings).toFixed(2));

    await User.findByIdAndUpdate(ratedUserId, {
      rating: avgRating,
      totalRatings: totalRatings,
    });

    // If rating a driver, update the Ride's rating too
    if (ratingType === "driver") {
      const rideId = booking.ride._id;
      const rideRatings = await Rating.find({
        ride: rideId,
        ratingType: "driver",
      });
      const rideTotal = rideRatings.length;
      const rideSum = rideRatings.reduce((sum, r) => sum + r.rating, 0);
      const rideAvg = Number((rideSum / rideTotal).toFixed(2));

      await Ride.findByIdAndUpdate(rideId, {
        rating: rideAvg,
        totalRatings: rideTotal,
      });
    }

    // Mark booking as rated
    booking.rated = true;
    await booking.save();

    res.json({
      success: true,
      message: "Rating submitted successfully",
      newAverageRating: avgRating,
    });
  } catch (err) {
    console.error("Rating error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET RATINGS FOR A USER
router.get("/user/:userId", async (req, res) => {
  try {
    const ratings = await Rating.find({ ratedUser: req.params.userId })
      .populate("ratedBy", "name profilePicture")
      .populate("ride", "origin destination date")
      .sort({ createdAt: -1 });

    res.json({
      ratings,
      totalRatings: ratings.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET PENDING RATINGS FOR USER
router.get("/pending/user", auth, async (req, res) => {
  try {
    const passengerBookings = await Booking.find({
      passenger: req.userId,
      status: "completed",
      rated: false,
    }).populate({
      path: "ride",
      populate: { path: "driver", select: "name profilePicture rating" },
    });

    const driverRides = await Ride.find({
      driver: req.userId,
      status: "completed",
    });
    const driverRideIds = driverRides.map((r) => r._id);

    const driverBookings = await Booking.find({
      ride: { $in: driverRideIds },
      status: "completed",
      rated: false,
    }).populate("passenger", "name profilePicture rating");

    const pending = [
      ...passengerBookings.map((b) => ({
        bookingId: b._id,
        userToRate: {
          id: b.ride.driver._id,
          name: b.ride.driver.name,
          profilePicture: b.ride.driver.profilePicture,
        },
        ratingType: "driver",
        rideDetails: { origin: b.ride.origin, destination: b.ride.destination },
      })),
      ...driverBookings.map((b) => ({
        bookingId: b._id,
        userToRate: {
          id: b.passenger._id,
          name: b.passenger.name,
          profilePicture: b.passenger.profilePicture,
        },
        ratingType: "passenger",
      })),
    ];

    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
