// FixMate seed script — run from the server folder:  node seed.js
// Adds demo services (approved) and bookings in different statuses.
// It uses your REAL signed-up users: it needs at least 2 technicians
// and 1 customer in the database. Re-running is safe: old seeded
// data (marked with seeded: true) is removed first.

import "dotenv/config";
import { MongoClient } from "mongodb";

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

function dateAfter(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const serviceData = [
  { title: "iPhone Screen Replacement", category: "Smartphone", basePrice: 79, estimatedDuration: "1-2 hours", serviceMode: "Shop Drop-off", serviceArea: "Dhanmondi, Dhaka", image: img("1580910051074-3eb694886505"), description: "Original-quality display replacement for iPhone models with a full touch and brightness check after fitting." },
  { title: "Samsung Battery Replacement", category: "Smartphone", basePrice: 49, estimatedDuration: "1 hour", serviceMode: "Shop Drop-off", serviceArea: "Mirpur, Dhaka", image: img("1511707171634-5f897ff02aa9"), description: "Genuine battery replacement for Samsung phones, including a battery health report before and after the swap." },
  { title: "Laptop SSD Upgrade", category: "Laptop & PC", basePrice: 99, estimatedDuration: "2-3 hours", serviceMode: "Shop Drop-off", serviceArea: "Uttara, Dhaka", image: img("1591799264318-7e6ef8ddb7ea"), description: "Upgrade your old hard disk to a fast SSD with full data transfer, Windows setup and speed testing included." },
  { title: "PC Virus Removal & Tune-Up", category: "Laptop & PC", basePrice: 39, estimatedDuration: "1-2 hours", serviceMode: "Home Visit", serviceArea: "Banani, Dhaka", image: img("1496181133206-80ce9b88a853"), description: "Complete virus and malware removal, startup cleanup and system tune-up so your PC runs like new again." },
  { title: "AC Gas Refill & Servicing", category: "AC", basePrice: 59, estimatedDuration: "1-2 hours", serviceMode: "Home Visit", serviceArea: "Dhanmondi, Dhaka", image: img("1621905251189-08b45d6a269e"), description: "Full AC servicing with gas pressure check and refill, filter cleaning and cooling performance test." },
  { title: "AC Deep Cleaning", category: "AC", basePrice: 45, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Mirpur, Dhaka", image: img("1615874959474-d609969a20ed"), description: "Deep foam cleaning of indoor and outdoor units, drain line flush and odour removal for fresh, healthy air." },
  { title: "Refrigerator Compressor Repair", category: "Refrigerator", basePrice: 129, estimatedDuration: "3-4 hours", serviceMode: "Home Visit", serviceArea: "Uttara, Dhaka", image: img("1571175443880-49e1d25b2bc5"), description: "Compressor diagnosis, repair or replacement with gas recharge and a cooling guarantee check after the job." },
  { title: "Fridge Door Gasket Replacement", category: "Refrigerator", basePrice: 35, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Banani, Dhaka", image: img("1536353284924-9220c464e262"), description: "Replace worn-out door gaskets to stop cold air leakage, reduce electricity bills and keep food fresh longer." },
  { title: "LED TV Display Repair", category: "TV", basePrice: 149, estimatedDuration: "2-3 days", serviceMode: "Shop Drop-off", serviceArea: "Dhanmondi, Dhaka", image: img("1593359677879-a4bb92f829d1"), description: "Panel and backlight repair for LED TVs of all brands, with a picture quality test before delivery." },
  { title: "Smart TV Wall Mounting", category: "TV", basePrice: 29, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Mirpur, Dhaka", image: img("1593784991095-a205069470b6"), description: "Safe wall mounting for TVs up to 65 inches with bracket fitting, cable management and angle adjustment." },
  { title: "Washing Machine Motor Repair", category: "Washing Machine", basePrice: 89, estimatedDuration: "2-3 hours", serviceMode: "Home Visit", serviceArea: "Uttara, Dhaka", image: img("1626806787461-102c1bfaaea1"), description: "Motor repair and replacement for front-load and top-load machines, including a full wash cycle test." },
  { title: "Washer Drum Deep Cleaning", category: "Washing Machine", basePrice: 40, estimatedDuration: "1-2 hours", serviceMode: "Home Visit", serviceArea: "Banani, Dhaka", image: img("1545173168-9f1947eebb7f"), description: "Complete drum descaling and deep cleaning to remove odour, mould and detergent build-up." },
  { title: "Home Wiring Inspection", category: "Electrical", basePrice: 55, estimatedDuration: "2 hours", serviceMode: "Home Visit", serviceArea: "Dhanmondi, Dhaka", image: img("1621905252507-b35492cc74b4"), description: "Full home electrical safety inspection covering wiring, circuit breakers, earthing and load capacity." },
  { title: "Ceiling Fan Installation", category: "Electrical", basePrice: 25, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Mirpur, Dhaka", image: img("1530124566582-a618bc2615dc"), description: "New ceiling fan installation or replacement with safe wiring, regulator fitting and balance check." },
];

// status plan for the demo bookings (service title -> booking details)
const bookingPlan = [
  { title: "Samsung Battery Replacement", status: "requested", days: 2, problem: "My phone battery drains within two hours and the back panel is slightly swollen near the bottom edge." },
  { title: "AC Gas Refill & Servicing", status: "accepted", days: 3, problem: "The AC is running but not cooling the room at all, even at 16 degrees. It probably needs a gas refill." },
  { title: "Laptop SSD Upgrade", status: "in-progress", days: 1, problem: "My laptop takes almost five minutes to start and everything opens very slowly. I want to upgrade to an SSD." },
  { title: "Refrigerator Compressor Repair", status: "completed", finalAmount: 135, days: 5, problem: "The fridge stopped cooling two days ago and the compressor makes a clicking sound every few minutes." },
  { title: "LED TV Display Repair", status: "completed", finalAmount: 149, days: 7, problem: "Half of the TV screen has gone dark and there are vertical lines on the right side of the display." },
  { title: "Washing Machine Motor Repair", status: "rejected", days: 4, problem: "The washing machine drum does not spin anymore, it only makes a humming noise during the wash cycle." },
  { title: "iPhone Screen Replacement", status: "cancelled", days: 6, problem: "The screen is cracked after a drop and the touch is not working on the top part of the display." },
];

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db("fix-mate");
  const users = db.collection("user");
  const servicesCol = db.collection("services");
  const bookingsCol = db.collection("bookings");

  const technicians = await users.find({ role: "technician" }).toArray();
  if (technicians.length < 2) {
    console.log("❌ At least 2 technician accounts are needed. Sign up one more technician first, then run this again.");
    await client.close();
    return;
  }

  const customer = await users.findOne({ role: "customer" });
  if (!customer) {
    console.log("❌ No customer account found. Sign up a customer first, then run this again.");
    await client.close();
    return;
  }

  console.log(`Technicians: ${technicians.map((t) => t.email).join(", ")}`);
  console.log(`Customer: ${customer.email}`);

  // Remove old seeded data so re-running does not create duplicates
  await bookingsCol.deleteMany({ seeded: true });
  await servicesCol.deleteMany({ seeded: true });

  // Insert services, alternating between the technicians
  const services = serviceData.map((item, index) => {
    const tech = technicians[index % technicians.length];
    return {
      ...item,
      technicianName: tech.name,
      technicianEmail: tech.email,
      approvalStatus: "approved",
      isAvailable: true,
      seeded: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
  const serviceResult = await servicesCol.insertMany(services);
  console.log(`✅ ${serviceResult.insertedCount} services added (all approved).`);

  // Insert bookings for the customer in different statuses
  const bookings = bookingPlan.map((plan) => {
    const service = services.find((s) => s.title === plan.title);
    return {
      serviceId: serviceResult.insertedIds[services.indexOf(service)].toString(),
      serviceTitle: service.title,
      serviceImage: service.image,
      technicianName: service.technicianName,
      technicianEmail: service.technicianEmail,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: "01712345678",
      address: "House 12, Road 5, Dhanmondi, Dhaka",
      preferredDate: dateAfter(plan.days),
      problemDescription: plan.problem,
      status: plan.status,
      finalAmount: plan.finalAmount ?? service.basePrice,
      paymentStatus: "unpaid",
      seeded: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
  const bookingResult = await bookingsCol.insertMany(bookings);
  console.log(`✅ ${bookingResult.insertedCount} bookings added in different statuses.`);

  console.log("🎉 Seed complete! Refresh the website to see the demo data.");
  await client.close();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
