
import { MongoClient } from "mongodb";
import "dotenv/config";

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
console.log("Connected to MongoDB");

const db = client.db("fix-mate");

// BetterAuth creates this collection as "user" (singular)
export const usersCollection = db.collection("user");
export const servicesCollection = db.collection("services");
export const bookingsCollection = db.collection("bookings");
export const paymentsCollection = db.collection("payments");