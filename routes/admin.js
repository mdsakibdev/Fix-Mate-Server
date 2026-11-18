import express from "express";
import { ObjectId } from "mongodb";
import { verifyToken, verifyAdmin } from "../middlewares/verifyToken.js";
import { bookingsCollection, paymentsCollection, servicesCollection, usersCollection } from "../db.js";


const router = express.Router();

// Admin: all services (can filter with ?status=pending)
router.get("/services", verifyToken, verifyAdmin, async (req, res) => {
  const { status } = req.query;
  const query = {};
  if (status) query.approvalStatus = status;

  const services = await servicesCollection
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();
  res.send(services);
});

// Admin: approve or reject a service
router.patch("/services/:id/approval", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { approvalStatus } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ message: "Service not found" });
  }
  if (!["approved", "rejected"].includes(approvalStatus)) {
    return res.status(400).send({ message: "approvalStatus must be approved or rejected" });
  }

  const result = await servicesCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { approvalStatus } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).send({ message: "Service not found" });
  }
  res.send({ message: `Service ${approvalStatus}` });
});

// Admin: all users
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  const users = await usersCollection.find().sort({ createdAt: -1 }).toArray();
  res.send(users);
});

// Admin: change a user's role (but never your own)
router.patch("/users/:id/role", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ message: "User not found" });
  }
  if (!["customer", "technician", "admin"].includes(role)) {
    return res.status(400).send({ message: "Invalid role" });
  }

  const user = await usersCollection.findOne({ _id: new ObjectId(id) });
  if (!user) {
    return res.status(404).send({ message: "User not found" });
  }
  if (user.email === req.user.email) {
    return res.status(400).send({ message: "You cannot change your own role" });
  }

  await usersCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { role } }
  );
  res.send({ message: `Role updated to ${role}` });
});

// Admin: all bookings
router.get("/bookings", verifyToken, verifyAdmin, async (req, res) => {
  const bookings = await bookingsCollection.find().sort({ createdAt: -1 }).toArray();
  res.send(bookings);
});

// Admin: all payments + total revenue
router.get("/payments", verifyToken, verifyAdmin, async (req, res) => {
  const payments = await paymentsCollection.find().sort({ createdAt: -1 }).toArray();
  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  res.send({ payments, totalRevenue });
});


export default router;
