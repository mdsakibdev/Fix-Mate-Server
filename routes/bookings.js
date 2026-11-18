import express from "express";
import { ObjectId } from "mongodb";
import { bookingsCollection, servicesCollection } from "../db.js";
import { verifyToken, verifyCustomer, verifyTechnician } from "../middlewares/verifyToken.js";


const router = express.Router();

// Customer: send a repair request for a service
router.post("/", verifyToken, verifyCustomer, async (req, res) => {
  const { serviceId, phone, address, preferredDate, problemDescription } =
    req.body;

  if (
    !serviceId ||
    !phone ||
    !address ||
    !preferredDate ||
    !problemDescription
  ) {
    return res.status(400).send({ message: "All fields are required" });
  }
  if (problemDescription.trim().length > 500) {
    return res
      .status(400)
      .send({
        message: "Problem description cannot be more than 500 characters",
      });
  }

  if (!ObjectId.isValid(serviceId)) {
    return res.status(404).send({ message: "Service not found" });
  }

  const service = await servicesCollection.findOne({
    _id: new ObjectId(serviceId),
    approvalStatus: "approved",
    isAvailable: true,
  });
  if (!service) {
    return res.status(404).send({ message: "Service not found" });
  }

  // A customer cannot have two active requests for the same service
  const existing = await bookingsCollection.findOne({
    serviceId,
    customerEmail: req.user.email,
    status: { $in: ["requested", "accepted", "in-progress"] },
  });
  if (existing) {
    return res
      .status(400)
      .send({ message: "You already have an active request for this service" });
  }

  const newBooking = {
    serviceId,
    serviceTitle: service.title,
    serviceImage: service.image,
    category: service.category,
    basePrice: service.basePrice,
    technicianName: service.technicianName,
    technicianEmail: service.technicianEmail,
    customerName: req.user.name,
    customerEmail: req.user.email,
    customerPhone: phone,
    address,
    preferredDate,
    problemDescription,
    status: "requested",
    finalAmount: service.basePrice,
    paymentStatus: "unpaid",
    createdAt: new Date(),
  };

  const result = await bookingsCollection.insertOne(newBooking);
  res
    .status(201)
    .send({
      message: "Repair request sent successfully",
      insertedId: result.insertedId,
    });
});


// Customer: my bookings
router.get("/my", verifyToken, verifyCustomer, async (req, res) => {
  const bookings = await bookingsCollection
    .find({ customerEmail: req.user.email })
    .sort({ createdAt: -1 })
    .toArray();
  res.send(bookings);
});

// Customer: cancel a booking (only while the status is "requested")
router.patch("/:id/cancel", verifyToken, verifyCustomer, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ message: "Booking not found" });
  }

  const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
  if (!booking) {
    return res.status(404).send({ message: "Booking not found" });
  }
  if (booking.customerEmail !== req.user.email) {
    return res.status(403).send({ message: "You can only cancel your own booking" });
  }
  if (booking.status !== "requested") {
    return res.status(400).send({ message: "You can cancel only while the request is pending" });
  }

  await bookingsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "cancelled" } }
  );
  res.send({ message: "Booking cancelled" });
});


// Technician: bookings assigned to me
router.get("/technician", verifyToken, verifyTechnician, async (req, res) => {
  const bookings = await bookingsCollection
    .find({ technicianEmail: req.user.email })
    .sort({ createdAt: -1 })
    .toArray();
  res.send(bookings);
});

// Technician: move a booking through the status pipeline
const allowedTransitions = {
  requested: ["accepted", "rejected"],
  accepted: ["in-progress"],
  "in-progress": ["completed"],
};

router.patch("/:id/status", verifyToken, verifyTechnician, async (req, res) => {
  const { id } = req.params;
  const { status, finalAmount } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ message: "Booking not found" });
  }

  const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
  if (!booking) {
    return res.status(404).send({ message: "Booking not found" });
  }
  if (booking.technicianEmail !== req.user.email) {
    return res.status(403).send({ message: "This booking is not assigned to you" });
  }

  const nextAllowed = allowedTransitions[booking.status] || [];
  if (!nextAllowed.includes(status)) {
    return res
      .status(400)
      .send({ message: `You cannot change status from "${booking.status}" to "${status}"` });
  }

  const update = { status };
  if (status === "completed") {
    if (!finalAmount || Number(finalAmount) <= 0) {
      return res.status(400).send({ message: "Final amount is required to complete the job" });
    }
    update.finalAmount = Number(finalAmount);
  }

  await bookingsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  );
  res.send({ message: `Booking marked as ${status}` });
});


export default router;
