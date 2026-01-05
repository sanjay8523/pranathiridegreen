const router = require("express").Router();
const Rating = require("../models/Rating");
const User = require("../models/User");
const Ride = require("../models/Ride");
const Booking = require("../models/Booking");
const auth = require("../middleware/auth");

// 1. CHECK IF USER CAN RATE
router.get("/can-rate/:bookingId", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate(
      "ride"
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status !== "completed") {
      return res.json({
        canRate: false,
        reason: "Ride must be completed before rating",
      });
    }

    if (booking.rated) {
      return res.json({
        canRate: false,
        reason: "You have already rated this ride",
      });
    }

    const isPassenger = booking.passenger.toString() === req.userId;
    const isDriver = booking.ride.driver.toString() === req.userId;

    if (!isPassenger && !isDriver) {
      return res.json({
        canRate: false,
        reason: "You are not authorized to rate this ride",
      });
    }

    const ratingType = isPassenger ? "driver" : "passenger";
    const ratedUserId = isPassenger
      ? booking.ride.driver.toString()
      : booking.passenger.toString();

    res.json({
      canRate: true,
      ratingType,
      ratedUserId,
      bookingId: booking._id,
    });
  } catch (err) {
    console.error("Error checking rating eligibility:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. SUBMIT RATING WITH REVIEW
router.post("/", auth, async (req, res) => {
  try {
    const { bookingId, ratedUserId, rating, review, tags } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const booking = await Booking.findById(bookingId).populate("ride");
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (!booking.ride) {
      return res.status(404).json({ error: "Ride no longer exists" });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({ error: "Can only rate completed rides" });
    }

    if (booking.rated) {
      return res.status(400).json({ error: "Already rated this ride" });
    }

    const isPassenger = booking.passenger.toString() === req.userId;
    const isDriver = booking.ride.driver.toString() === req.userId;

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const ratingType = isPassenger ? "driver" : "passenger";

    // Check for existing rating
    const existingRating = await Rating.findOne({
      booking: bookingId,
      ratedBy: req.userId,
      ratedUser: ratedUserId,
    });

    if (existingRating) {
      return res.status(400).json({ error: "Already rated this user" });
    }

    // Create rating
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

    // Update user's rating
    const allUserRatings = await Rating.find({ ratedUser: ratedUserId });
    const totalRatings = allUserRatings.length;
    const sumRatings = allUserRatings.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = Number((sumRatings / totalRatings).toFixed(1));

    await User.findByIdAndUpdate(ratedUserId, {
      rating: avgRating,
      totalRatings: totalRatings,
    });

    // Update ride rating if rating driver
    if (ratingType === "driver") {
      const rideRatings = await Rating.find({
        ride: booking.ride._id,
        ratingType: "driver",
      });
      const rideTotal = rideRatings.length;
      const rideSum = rideRatings.reduce((sum, r) => sum + r.rating, 0);
      const rideAvg = Number((rideSum / rideTotal).toFixed(1));

      await Ride.findByIdAndUpdate(booking.ride._id, {
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

// 3. GET RATINGS FOR A USER
router.get("/user/:userId", async (req, res) => {
  try {
    const ratings = await Rating.find({ ratedUser: req.params.userId })
      .populate("ratedBy", "name profilePicture")
      .populate("ride", "origin destination date")
      .sort({ createdAt: -1 })
      .limit(20);

    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    res.json({
      ratings,
      totalRatings: ratings.length,
      averageRating: Number(avgRating.toFixed(1)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
