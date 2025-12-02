const router = require("express").Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const Ride = require("../models/Ride");
const auth = require("../middleware/auth");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. CREATE RAZORPAY ORDER
router.post("/create-order", auth, async (req, res) => {
  try {
    const {
      rideId,
      seatsBooked,
      passengerName,
      passengerPhone,
      passengerEmail,
    } = req.body;

    // Get ride details
    const ride = await Ride.findById(rideId).populate("driver");
    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.availableSeats < seatsBooked) {
      return res.status(400).json({ error: "Not enough seats available" });
    }

    const amount = ride.price * seatsBooked;

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        rideId: ride._id.toString(),
        passengerId: req.userId,
        seatsBooked: seatsBooked,
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Create booking with pending status
    const booking = new Booking({
      ride: rideId,
      passenger: req.userId,
      passengerName,
      passengerPhone,
      passengerEmail,
      seatsBooked,
      totalAmount: amount,
      paymentStatus: "pending",
      status: "pending",
    });

    await booking.save();

    // Create payment record
    const payment = new Payment({
      booking: booking._id,
      ride: rideId,
      passenger: req.userId,
      driver: ride.driver._id,
      amount: amount,
      razorpayOrderId: razorpayOrder.id,
      status: "created",
      escrowReleaseDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
    });

    await payment.save();

    // Update booking with payment reference
    booking.paymentId = payment._id;
    await booking.save();

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: amount,
      currency: "INR",
      bookingId: booking._id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. VERIFY PAYMENT
router.post("/verify-payment", auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Update payment record
    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });
    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "captured";
    await payment.save();

    // Update booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    booking.paymentStatus = "completed";
    booking.status = "confirmed";
    booking.escrowStatus = "held";
    booking.escrowReleaseDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await booking.save();

    // Update ride seats
    const ride = await Ride.findById(booking.ride);
    ride.availableSeats -= booking.seatsBooked;
    if (ride.availableSeats === 0) {
      ride.status = "completed";
    }
    await ride.save();

    res.json({
      success: true,
      message: "Payment verified successfully!",
      bookingId: booking._id,
      paymentId: payment._id,
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. RAZORPAY WEBHOOK (For production - automatic payment updates)
router.post("/webhook", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body.event;
    const payloadData = req.body.payload.payment.entity;

    if (event === "payment.captured") {
      const payment = await Payment.findOne({
        razorpayOrderId: payloadData.order_id,
      });

      if (payment && payment.status !== "captured") {
        payment.status = "captured";
        payment.razorpayPaymentId = payloadData.id;
        await payment.save();

        const booking = await Booking.findById(payment.booking);
        booking.paymentStatus = "completed";
        booking.status = "confirmed";
        await booking.save();
      }
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4. GET PAYMENT DETAILS
router.get("/:paymentId", auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate("booking")
      .populate("ride")
      .populate("passenger", "name email")
      .populate("driver", "name email");

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
