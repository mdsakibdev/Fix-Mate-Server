import express from "express";
import {
  bookingsCollection,
  paymentsCollection,
  servicesCollection,
  usersCollection,
} from "../db.js";
import {
  verifyToken,
  verifyAdmin,
  verifyCustomer,
  verifyTechnician,
} from "../middlewares/verifyToken.js";

const router = express.Router();

// Add up the amount field of a list of payments
const sumAmount = (payments) =>
  payments.reduce((sum, payment) => sum + payment.amount, 0);

// Customer: my booking and spending numbers
router.get("/customer", verifyToken, verifyCustomer, async (req, res) => {
  const email = req.user.email;

  const totalBookings = await bookingsCollection.countDocuments({
    customerEmail: email,
  });
  const activeBookings = await bookingsCollection.countDocuments({
    customerEmail: email,
    status: { $in: ["requested", "accepted", "in-progress"] },
  });
  const completedBookings = await bookingsCollection.countDocuments({
    customerEmail: email,
    status: "completed",
  });
  const myPayments = await paymentsCollection
    .find({ customerEmail: email })
    .toArray();

  res.send({
    totalBookings,
    activeBookings,
    completedBookings,
    totalSpent: sumAmount(myPayments),
  });
});

// Technician: my service, request and earning numbers
router.get("/technician", verifyToken, verifyTechnician, async (req, res) => {
  const email = req.user.email;

  const totalServices = await servicesCollection.countDocuments({
    technicianEmail: email,
  });
  const approvedServices = await servicesCollection.countDocuments({
    technicianEmail: email,
    approvalStatus: "approved",
  });
  const pendingApproval = await servicesCollection.countDocuments({
    technicianEmail: email,
    approvalStatus: "pending",
  });
  const totalRequests = await bookingsCollection.countDocuments({
    technicianEmail: email,
  });
  const pendingRequests = await bookingsCollection.countDocuments({
    technicianEmail: email,
    status: "requested",
  });
  const completedJobs = await bookingsCollection.countDocuments({
    technicianEmail: email,
    status: "completed",
  });
  const myPayments = await paymentsCollection
    .find({ technicianEmail: email })
    .toArray();

  res.send({
    totalServices,
    approvedServices,
    pendingApproval,
    totalRequests,
    pendingRequests,
    completedJobs,
    totalEarnings: sumAmount(myPayments),
  });
});

// Admin: whole platform numbers
router.get("/admin", verifyToken, verifyAdmin, async (req, res) => {
  const totalUsers = await usersCollection.countDocuments();
  const totalTechnicians = await usersCollection.countDocuments({
    role: "technician",
  });
  const totalServices = await servicesCollection.countDocuments();
  const pendingServices = await servicesCollection.countDocuments({
    approvalStatus: "pending",
  });
  const totalBookings = await bookingsCollection.countDocuments();
  const allPayments = await paymentsCollection.find().toArray();

  const bookingsByStatus = {
    requested: await bookingsCollection.countDocuments({ status: "requested" }),
    accepted: await bookingsCollection.countDocuments({ status: "accepted" }),
    "in-progress": await bookingsCollection.countDocuments({ status: "in-progress" }),
    completed: await bookingsCollection.countDocuments({ status: "completed" }),
    rejected: await bookingsCollection.countDocuments({ status: "rejected" }),
    cancelled: await bookingsCollection.countDocuments({ status: "cancelled" }),
  };

  res.send({
    totalUsers,
    totalTechnicians,
    totalServices,
    pendingServices,
    totalBookings,
    totalRevenue: sumAmount(allPayments),
    bookingsByStatus,
  });
});

export default router;
