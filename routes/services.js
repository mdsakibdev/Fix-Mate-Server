import express from "express";
import { ObjectId } from "mongodb";
import { servicesCollection } from "../db.js";
import { verifyToken, verifyTechnician } from "../middlewares/verifyToken.js";

const router = express.Router();

// Public: all approved + available services, with server-side search, filter, sort
router.get("/", async (req, res) => {
  const { search, category, serviceMode, sort } = req.query;

  const query = { approvalStatus: "approved", isAvailable: true };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }
  if (category) query.category = category;
  if (serviceMode) query.serviceMode = serviceMode;

  let sortOption = { createdAt: -1 };
  if (sort === "price-low") sortOption = { basePrice: 1 };
  if (sort === "price-high") sortOption = { basePrice: -1 };

  const services = await servicesCollection.find(query).sort(sortOption).toArray();
  res.send(services);
});

// Public: 6 latest approved + available services (for the home page)
router.get("/featured", async (req, res) => {
  const services = await servicesCollection
    .find({ approvalStatus: "approved", isAvailable: true })
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();
  res.send(services);
});

// Technician: my own services
router.get("/my", verifyToken, verifyTechnician, async (req, res) => {
  const services = await servicesCollection
    .find({ technicianEmail: req.user.email })
    .sort({ createdAt: -1 })
    .toArray();
  res.send(services);
});

// Public: one service details
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ message: "Service not found" });
  }
  const service = await servicesCollection.findOne({
    _id: new ObjectId(id),
    approvalStatus: "approved",
    isAvailable: true,
  });
  if (!service) {
    return res.status(404).send({ message: "Service not found" });
  }
  res.send(service);
});

// Technician: add a new service (starts as pending)
router.post("/", verifyToken, verifyTechnician, async (req, res) => {
  const {
    title,
    category,
    description,
    image,
    basePrice,
    estimatedDuration,
    serviceMode,
    serviceArea,
  } = req.body;

  if (!title || !category || !description || !image || !basePrice || !estimatedDuration || !serviceMode || !serviceArea) {
    return res.status(400).send({ message: "All fields are required" });
  }
  if (Number(basePrice) <= 0) {
    return res.status(400).send({ message: "Base price must be a positive number" });
  }

  const newService = {
    title,
    category,
    description,
    image,
    basePrice: Number(basePrice),
    estimatedDuration,
    serviceMode,
    serviceArea,
    technicianName: req.user.name,
    technicianEmail: req.user.email,
    approvalStatus: "pending",
    isAvailable: true,
    createdAt: new Date(),
  };

  const result = await servicesCollection.insertOne(newService);
  res.status(201).send({ message: "Service added, waiting for admin approval", insertedId: result.insertedId });
});

// Technician: toggle availability on/off
router.patch("/:id/availability", verifyToken, verifyTechnician, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ message: "Service not found" });
  }

  const result = await servicesCollection.updateOne(
    { _id: new ObjectId(id), technicianEmail: req.user.email },
    { $set: { isAvailable: Boolean(req.body.isAvailable) } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).send({ message: "Service not found" });
  }
  res.send({ message: "Availability updated" });
});

// Technician: update my service (approval goes back to pending after edit)
router.patch("/:id", verifyToken, verifyTechnician, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ message: "Service not found" });
  }

  const { title, category, description, image, basePrice, estimatedDuration, serviceMode, serviceArea } = req.body;

  if (!title || !category || !description || !image || !basePrice || !estimatedDuration || !serviceMode || !serviceArea) {
    return res.status(400).send({ message: "All fields are required" });
  }
  if (Number(basePrice) <= 0) {
    return res.status(400).send({ message: "Base price must be a positive number" });
  }

  const result = await servicesCollection.updateOne(
    { _id: new ObjectId(id), technicianEmail: req.user.email },
    {
      $set: {
        title,
        category,
        description,
        image,
        basePrice: Number(basePrice),
        estimatedDuration,
        serviceMode,
        serviceArea,
        approvalStatus: "pending",
      },
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).send({ message: "Service not found" });
  }
  res.send({ message: "Service updated, waiting for admin approval again" });
});

// Technician: delete my service
router.delete("/:id", verifyToken, verifyTechnician, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ message: "Service not found" });
  }

  const result = await servicesCollection.deleteOne({
    _id: new ObjectId(id),
    technicianEmail: req.user.email,
  });

  if (result.deletedCount === 0) {
    return res.status(404).send({ message: "Service not found" });
  }
  res.send({ message: "Service deleted" });
});


export default router;