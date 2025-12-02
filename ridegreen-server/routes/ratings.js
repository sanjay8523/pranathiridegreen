const router = require("express").Router();
const Rating = require("../models/Rating");
const User = require("../models/User");
const Ride = require("../models/Ride");
const Booking = require("../models/Booking");
const auth = require("../middleware/auth");

// 1. SUBMIT RATING
router.post("/", auth, async (req, res) => {
  try {
    const { rideId, bookingId, ratedUserId, rating, review, tags } = req.body;

    // Verify booking exists and belongs to user
    const booking = await Booking.findById(bookingId).populate("ride");
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if user is part of this ride
    const isPassenger = booking.passenger.toString() === req.userId;
    const isDriver = booking.ride.driver.toString() === req.userId;

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ error: "You are not part of this ride" });
    }

    // Determine rating type
    const ratingType = isPassenger ? "driver" : "passenger";

    // Check if already rated
    const existingRating = await Rating.findOne({
      booking: bookingId,
      ratedBy: req.userId,
      ratedUser: ratedUserId,
    });

    if (existingRating) {
      return res
        .status(400)
        .json({ error: "You have already rated this user" });
    }

    // Create rating
    const newRating = new Rating({
      ride: rideId,
      booking: bookingId,
      ratedBy: req.userId,
      ratedUser: ratedUserId,
      ratingType,
      rating,
      review,
      tags,
    });

    await newRating.save();

    // Update user's average rating
    const userRatings = await Rating.find({ ratedUser: ratedUserId });
    const avgRating =
      userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length;

    await User.findByIdAndUpdate(ratedUserId, {
      rating: avgRating,
      totalRatings: userRatings.length,
    });

    // Update ride's average rating if rating driver
    if (ratingType === "driver") {
      const rideRatings = await Rating.find({
        ride: rideId,
        ratingType: "driver",
      });
      const rideAvgRating =
        rideRatings.reduce((sum, r) => sum + r.rating, 0) / rideRatings.length;

      await Ride.findByIdAndUpdate(rideId, {
        rating: rideAvgRating,
        totalRatings: rideRatings.length,
      });
    }

    // Mark booking as rated
    booking.rated = true;
    await booking.save();

    res.json({
      success: true,
      message: "Rating submitted successfully",
      rating: newRating,
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
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET RATINGS FOR A RIDE
router.get("/ride/:rideId", async (req, res) => {
  try {
    const ratings = await Rating.find({ ride: req.params.rideId })
      .populate("ratedBy", "name profilePicture")
      .populate("ratedUser", "name profilePicture")
      .sort({ createdAt: -1 });

    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. CHECK IF USER CAN RATE
router.get("/can-rate/:bookingId", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate(
      "ride"
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const isPassenger = booking.passenger.toString() === req.userId;
    const isDriver = booking.ride.driver.toString() === req.userId;

    if (!isPassenger && !isDriver) {
      return res.json({ canRate: false, reason: "Not part of this ride" });
    }

    if (booking.status !== "completed") {
      return res.json({ canRate: false, reason: "Ride not completed yet" });
    }

    // Check if already rated
    const ratedUserId = isPassenger ? booking.ride.driver : booking.passenger;
    const existingRating = await Rating.findOne({
      booking: req.params.bookingId,
      ratedBy: req.userId,
      ratedUser: ratedUserId,
    });

    if (existingRating) {
      return res.json({ canRate: false, reason: "Already rated" });
    }

    res.json({
      canRate: true,
      ratedUserId,
      ratingType: isPassenger ? "driver" : "passenger",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
