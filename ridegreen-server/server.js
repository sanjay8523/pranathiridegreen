const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const socketIO = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Socket.IO Setup
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });

// Start Escrow Scheduler
const { startEscrowScheduler } = require("./utils/escrowScheduler");
startEscrowScheduler();

// Socket.IO Connection Handling
io.on("connection", (socket) => {
  console.log("👤 User connected:", socket.id);

  socket.on("join_ride", (rideId) => {
    socket.join(`ride_${rideId}`);
    console.log(`User ${socket.id} joined ride ${rideId}`);
  });

  socket.on("send_message", (data) => {
    io.to(`ride_${data.rideId}`).emit("receive_message", data);
  });

  socket.on("booking_update", (data) => {
    io.to(`ride_${data.rideId}`).emit("booking_notification", data);
  });

  socket.on("disconnect", () => {
    console.log("👋 User disconnected:", socket.id);
  });
});

// Make io accessible to routes
app.set("io", io);

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/rides", require("./routes/rides"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/ratings", require("./routes/ratings"));

// Health Check
app.get("/", (req, res) => {
  res.json({
    message: "RideGreen API is running 🚗",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res
    .status(500)
    .json({ error: "Something went wrong!", message: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO enabled`);
  console.log(`⏰ Escrow scheduler active`);
});
