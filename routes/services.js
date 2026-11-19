import express from "express";
import { ObjectId } from "mongodb";
import { verifyToken, verifyTechnician } from "../middlewares/verifyToken.js";
import { bookingsCollection, servicesCollection, usersCollection } from "../db.js";


const router = express.Router();

// Attach the average rating and review count (from reviewed bookings) to services
const attachRatings = async (services) => {
  const withRatings = [];
  for (const service of services) {
    const reviewedBookings = await bookingsCollection
      .find({ serviceId: service._id.toString(), rating: { $exists: true } })
      .toArray();
    const reviewCount = reviewedBookings.length;
    const averageRating = reviewCount
      ? Math.round(
          (reviewedBookings.reduce((sum, booking) => sum + booking.rating, 0) /
            reviewCount) *
            10
        ) / 10
      : 0;
    withRatings.push({ ...service, averageRating, reviewCount });
  }
  return withRatings;
};

// Public: approved + available services, with server-side search, filter, sort and pagination
router.get("/", async (req, res) => {
  const { search, category, serviceMode, sort, page, limit } = req.query;

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

  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.max(Number(limit) || 9, 1);

  const total = await servicesCollection.countDocuments(query);
  const services = await servicesCollection
    .find(query)
    .sort(sortOption)
    .skip((currentPage - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  const servicesWithRatings = await attachRatings(services);

  res.send({
    services: servicesWithRatings,
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage,
  });
});

// Public: 6 latest approved + available services (for the home page)
router.get("/featured", async (req, res) => {
  const services = await servicesCollection
    .find({ approvalStatus: "approved", isAvailable: true })
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();
  res.send(await attachRatings(services));
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
    // Attach a short technician summary (name, photo, area, bio)
  const technician = await usersCollection.findOne({ email: service.technicianEmail });

  const [serviceWithRating] = await attachRatings([service]);

  // Customer reviews for this service (latest first)
  const reviewedBookings = await bookingsCollection
    .find({ serviceId: id, rating: { $exists: true } })
    .sort({ reviewedAt: -1 })
    .toArray();
  const reviews = reviewedBookings.map((booking) => ({
    customerName: booking.customerName,
    rating: booking.rating,
    review: booking.review || "",
    reviewedAt: booking.reviewedAt,
  }));

  res.send({
    ...serviceWithRating,
    reviews,
    technician: technician
      ? {
          name: technician.name,
          email: technician.email,
          image: technician.image || "",
          area: technician.area || "",
          bio: technician.bio || "",
        }
      : null,
  });
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
