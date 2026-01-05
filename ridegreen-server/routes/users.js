const router = require("express").Router();
const User = require("../models/User");
const Rating = require("../models/Rating");
const Ride = require("../models/Ride");
const Booking = require("../models/Booking");
const auth = require("../middleware/auth");

// GET USER PROFILE BY ID
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get rides posted by user
    const ridesPosted = await Ride.countDocuments({
      driver: req.params.userId,
    });

    // Get bookings made by user
    const bookingsMade = await Booking.countDocuments({
      passenger: req.params.userId,
    });

    // Get recent ratings
    const recentRatings = await Rating.find({ ratedUser: req.params.userId })
      .populate("ratedBy", "name profilePicture")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture,
        rating: user.rating || 0,
        totalRatings: user.totalRatings || 0,
        ridesCompleted: user.ridesCompleted || 0,
        verified: user.verified,
        createdAt: user.createdAt,
      },
      stats: {
        ridesPosted,
        bookingsMade,
        ridesCompleted: user.ridesCompleted || 0,
      },
      recentRatings,
    });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET CURRENT USER PROFILE (AUTHENTICATED)
router.get("/me/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const ridesPosted = await Ride.countDocuments({ driver: req.userId });
    const bookingsMade = await Booking.countDocuments({
      passenger: req.userId,
    });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture,
        rating: user.rating || 0,
        totalRatings: user.totalRatings || 0,
        ridesCompleted: user.ridesCompleted || 0,
        verified: user.verified,
        walletBalance: user.walletBalance || 0,
        createdAt: user.createdAt,
      },
      stats: {
        ridesPosted,
        bookingsMade,
        ridesCompleted: user.ridesCompleted || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE USER PROFILE
router.put("/me/profile", auth, async (req, res) => {
  try {
    const { name, phone, profilePicture } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (profilePicture) updateData.profilePicture = profilePicture;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      { new: true }
    ).select("-password");

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
