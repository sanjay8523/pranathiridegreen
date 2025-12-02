const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "No authentication token, access denied" });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (!verified) {
      return res.status(401).json({ error: "Token verification failed" });
    }

    req.userId = verified.id;
    next();
  } catch (err) {
    res.status(500).json({ error: "Authentication error: " + err.message });
  }
};

module.exports = auth;
