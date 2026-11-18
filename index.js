import express from "express";
import cors from "cors";
import "dotenv/config";
import servicesRouter from "./routes/services.js";
import adminRouter from "./routes/admin.js";
import bookingsRouter from "./routes/bookings.js";
import paymentsRouter from "./routes/payments.js";




const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send({ message: "FixMate server is running" });
});

// routes
app.use("/api/services", servicesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/payments", paymentsRouter);




app.listen(port, () => {
  console.log(`FixMate server is running on port ${port}`);
});
