const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Validation helper
const validatePassword = (password) => {
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  if (/[^A-Za-z0-9]/.test(password)) {
    return "Password must not contain special characters";
  }
  return null;
};

const validateName = (name) => {
  if (name.length < 3) {
    return "Name must be at least 3 characters long";
  }
  if (!/^[A-Za-z\s]+$/.test(name)) {
    return "Name must contain only letters and spaces";
  }
  return null;
};

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate name
    const nameError = validateName(name);
    if (nameError) {
      return res.status(400).json({ error: nameError });
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: "User already exists" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      name,
      email,
      password: hashedPassword,
      phone: phone || "",
      rating: 0,
      totalRatings: 0,
      ridesCompleted: 0,
    });
    await user.save();

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        rating: user.rating,
        totalRatings: user.totalRatings,
        ridesCompleted: user.ridesCompleted,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User does not exist" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        rating: user.rating,
        totalRatings: user.totalRatings,
        ridesCompleted: user.ridesCompleted,
        profilePicture: user.profilePicture,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
