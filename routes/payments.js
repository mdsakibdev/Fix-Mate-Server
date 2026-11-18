import express from "express";
import Stripe from "stripe";
import { ObjectId } from "mongodb";
import { bookingsCollection, paymentsCollection } from "../db.js";
import { verifyToken, verifyCustomer } from "../middlewares/verifyToken.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Save the payment once and mark the booking as paid
const savePayment = async (booking, session) => {
  const existing = await paymentsCollection.findOne({ transactionId: session.id });
  if (!existing) {
    await paymentsCollection.insertOne({
      bookingId: booking._id.toString(),
      serviceTitle: booking.serviceTitle,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      technicianEmail: booking.technicianEmail,
      amount: session.amount_total / 100,
      transactionId: session.id,
      status: "paid",
      createdAt: new Date(),
    });
  }
  await bookingsCollection.updateOne(
    { _id: booking._id },
    { $set: { paymentStatus: "paid" } }
  );
};

// Customer: create a Stripe Checkout session for a completed booking
router.post("/create-checkout-session", verifyToken, verifyCustomer, async (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId || !ObjectId.isValid(bookingId)) {
    return res.status(404).send({ message: "Booking not found" });
  }
  const booking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });
  if (!booking) {
    return res.status(404).send({ message: "Booking not found" });
  }
  if (booking.customerEmail !== req.user.email) {
    return res.status(403).send({ message: "You can only pay for your own booking" });
  }
  if (booking.status !== "completed") {
    return res.status(400).send({ message: "You can pay only after the job is completed" });
  }
  if (booking.paymentStatus === "paid") {
    return res.status(400).send({ message: "This booking is already paid" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: booking.serviceTitle },
          unit_amount: Math.round(booking.finalAmount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}`,
    cancel_url: `${CLIENT_URL}/payment/cancel`,
    metadata: { bookingId },
  });

  res.send({ url: session.url });
});

// Customer: verify the payment on the success page (payment saved only once)
router.get("/verify", verifyToken, verifyCustomer, async (req, res) => {
  const { session_id, bookingId } = req.query;

  if (!session_id || !bookingId || !ObjectId.isValid(bookingId)) {
    return res.status(400).send({ message: "Missing payment information" });
  }
  const booking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });
  if (!booking) {
    return res.status(404).send({ message: "Booking not found" });
  }
  if (booking.customerEmail !== req.user.email) {
    return res.status(403).send({ message: "This booking is not yours" });
  }

  const session = await stripe.checkout.sessions.retrieve(session_id);
  if (session.payment_status !== "paid") {
    return res.send({ paid: false });
  }

  await savePayment(booking, session);
  res.send({ paid: true });
});

// Customer: my payment history
router.get("/my", verifyToken, verifyCustomer, async (req, res) => {
  const payments = await paymentsCollection
    .find({ customerEmail: req.user.email })
    .sort({ createdAt: -1 })
    .toArray();
  res.send(payments);
});

export default router;
