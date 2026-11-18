import express from "express";
import { ObjectId } from "mongodb";
import { servicesCollection } from "../db.js";
import { verifyToken, verifyAdmin } from "../middlewares/verifyToken.js";

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

export default router;
