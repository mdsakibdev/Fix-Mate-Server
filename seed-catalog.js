// FixMate full catalog script — run from the server folder:  node seed-catalog.js
// Rebuilds the services collection with a fresh catalog of 35 services:
// exactly 5 services in each of the 7 categories, all approved & available.
// It ONLY touches the services collection. Users, bookings and payments
// are NOT changed. Every image below was checked by hand to match its
// category and the work it shows.

import "dotenv/config";
import { MongoClient } from "mongodb";

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

const E = "evrahim@gmail.com"; // Technician 1
const R = "rahim@gmail.com"; // Technician 2

const serviceData = [
  // ---------- Smartphone (5) ----------
  { title: "iPhone Screen Replacement", category: "Smartphone", basePrice: 79, estimatedDuration: "1-2 hours", serviceMode: "Shop Drop-off", serviceArea: "Dhanmondi, Dhaka", technicianEmail: E, image: img("1585060544812-6b45742d762f"), description: "Original-quality display replacement for iPhone models with a full touch and brightness check after fitting." },
  { title: "Samsung Battery Replacement", category: "Smartphone", basePrice: 49, estimatedDuration: "1 hour", serviceMode: "Shop Drop-off", serviceArea: "Mirpur, Dhaka", technicianEmail: R, image: img("1511707171634-5f897ff02aa9"), description: "Genuine battery replacement for Samsung phones, including a battery health report before and after the swap." },
  { title: "Charging Port Repair", category: "Smartphone", basePrice: 35, estimatedDuration: "45 minutes", serviceMode: "Shop Drop-off", serviceArea: "Uttara, Dhaka", technicianEmail: E, image: img("1512499617640-c74ae3a79d37"), description: "Faulty charging port cleaning, repair or replacement so your phone charges fast and stays connected every time." },
  { title: "Back Glass Replacement", category: "Smartphone", basePrice: 45, estimatedDuration: "1 hour", serviceMode: "Shop Drop-off", serviceArea: "Gulshan, Dhaka", technicianEmail: R, image: img("1596558450268-9c27524ba856"), description: "Cracked back glass replacement with a precise fit and finish that makes your phone look new again." },
  { title: "Camera Lens Replacement", category: "Smartphone", basePrice: 55, estimatedDuration: "1 hour", serviceMode: "Shop Drop-off", serviceArea: "Banani, Dhaka", technicianEmail: E, image: img("1574944985070-8f3ebc6b79d2"), description: "Scratched or broken camera lens replacement with full focus and picture quality testing after the repair." },

  // ---------- Laptop & PC (5) ----------
  { title: "Laptop SSD Upgrade", category: "Laptop & PC", basePrice: 99, estimatedDuration: "2-3 hours", serviceMode: "Shop Drop-off", serviceArea: "Uttara, Dhaka", technicianEmail: E, image: img("1591799264318-7e6ef8ddb7ea"), description: "Upgrade your old hard disk to a fast SSD with full data transfer, Windows setup and speed testing included." },
  { title: "PC Virus Removal & Tune-Up", category: "Laptop & PC", basePrice: 39, estimatedDuration: "1-2 hours", serviceMode: "Home Visit", serviceArea: "Banani, Dhaka", technicianEmail: R, image: img("1496181133206-80ce9b88a853"), description: "Complete virus and malware removal, startup cleanup and system tune-up so your PC runs like new again." },
  { title: "Laptop Screen Replacement", category: "Laptop & PC", basePrice: 119, estimatedDuration: "1-2 hours", serviceMode: "Shop Drop-off", serviceArea: "Dhanmondi, Dhaka", technicianEmail: R, image: img("1601524909162-ae8725290836"), description: "Cracked or flickering laptop screen replacement with original-quality panels for all major brands." },
  { title: "Data Recovery Service", category: "Laptop & PC", basePrice: 79, estimatedDuration: "2-3 hours", serviceMode: "Shop Drop-off", serviceArea: "Mirpur, Dhaka", technicianEmail: E, image: img("1597852074816-4726e331f141"), description: "Recover lost photos, documents and files from damaged hard drives, SSDs and memory cards." },
  { title: "RAM Upgrade & Performance Boost", category: "Laptop & PC", basePrice: 59, estimatedDuration: "1 hour", serviceMode: "Shop Drop-off", serviceArea: "Uttara, Dhaka", technicianEmail: R, image: img("1593640408182-31c70c8268f5"), description: "RAM upgrade with compatibility check and speed testing so your laptop handles heavy work smoothly." },

  // ---------- AC (5) ----------
  { title: "AC Gas Refill & Servicing", category: "AC", basePrice: 59, estimatedDuration: "1-2 hours", serviceMode: "Home Visit", serviceArea: "Dhanmondi, Dhaka", technicianEmail: E, image: img("1581092160607-ee22621dd758"), description: "Full AC servicing with gas pressure check and refill, filter cleaning and cooling performance test." },
  { title: "AC Deep Cleaning", category: "AC", basePrice: 45, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Mirpur, Dhaka", technicianEmail: R, image: img("1615874959474-d609969a20ed"), description: "Deep foam cleaning of indoor and outdoor units, drain line flush and odour removal for fresh, healthy air." },
  { title: "AC Installation & Setup", category: "AC", basePrice: 99, estimatedDuration: "2-3 hours", serviceMode: "Home Visit", serviceArea: "Gulshan, Dhaka", technicianEmail: E, image: img("1581091226825-a6a2a5aee158"), description: "New AC installation with proper wall mounting, copper piping, vacuuming and cooling setup." },
  { title: "AC Leak Repair", category: "AC", basePrice: 69, estimatedDuration: "1-2 hours", serviceMode: "Home Visit", serviceArea: "Mohammadpur, Dhaka", technicianEmail: R, image: img("1530124566582-a618bc2615dc"), description: "Gas leak detection and repair with full pressure testing so your AC keeps cooling without losing gas." },
  { title: "AC PCB Board Repair", category: "AC", basePrice: 75, estimatedDuration: "1-2 hours", serviceMode: "Home Visit", serviceArea: "Banani, Dhaka", technicianEmail: E, image: img("1555664424-778a1e5e1b48"), description: "AC circuit board diagnosis and repair for power, sensor and cooling control problems." },

  // ---------- Refrigerator (5) ----------
  { title: "Refrigerator Compressor Repair", category: "Refrigerator", basePrice: 129, estimatedDuration: "3-4 hours", serviceMode: "Home Visit", serviceArea: "Uttara, Dhaka", technicianEmail: E, image: img("1556911220-bff31c812dba"), description: "Compressor diagnosis, repair or replacement with gas recharge and a cooling guarantee check after the job." },
  { title: "Fridge Door Gasket Replacement", category: "Refrigerator", basePrice: 35, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Banani, Dhaka", technicianEmail: R, image: img("1571175443880-49e1d25b2bc5"), description: "Replace worn-out door gaskets to stop cold air leakage, reduce electricity bills and keep food fresh longer." },
  { title: "Fridge Cooling Problem Repair", category: "Refrigerator", basePrice: 65, estimatedDuration: "1-2 hours", serviceMode: "Home Visit", serviceArea: "Dhanmondi, Dhaka", technicianEmail: R, image: img("1584568694244-14fbdf83bd30"), description: "Complete diagnosis and repair when your fridge runs but does not cool — fan, thermostat and gas checks included." },
  { title: "Refrigerator Gas Refill", category: "Refrigerator", basePrice: 55, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Mirpur, Dhaka", technicianEmail: E, image: img("1581094271901-8022df4466f9"), description: "Refrigerant gas refill with leak check and cooling performance test for all fridge models." },
  { title: "Deep Freezer Repair", category: "Refrigerator", basePrice: 85, estimatedDuration: "2-3 hours", serviceMode: "Home Visit", serviceArea: "Uttara, Dhaka", technicianEmail: R, image: img("1536353284924-9220c464e262"), description: "Deep freezer repair for cooling, compressor and thermostat problems with a full freeze test after the job." },

  // ---------- TV (5) ----------
  { title: "LED TV Display Repair", category: "TV", basePrice: 149, estimatedDuration: "2-3 days", serviceMode: "Shop Drop-off", serviceArea: "Dhanmondi, Dhaka", technicianEmail: E, image: img("1593359677879-a4bb92f829d1"), description: "Panel and backlight repair for LED TVs of all brands, with a picture quality test before delivery." },
  { title: "Smart TV Wall Mounting", category: "TV", basePrice: 29, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Mirpur, Dhaka", technicianEmail: R, image: img("1593784991095-a205069470b6"), description: "Safe wall mounting for TVs up to 65 inches with bracket fitting, cable management and angle adjustment." },
  { title: "TV Backlight Repair", category: "TV", basePrice: 89, estimatedDuration: "2-3 hours", serviceMode: "Shop Drop-off", serviceArea: "Mirpur, Dhaka", technicianEmail: E, image: img("1518770660439-4636190af475"), description: "Dim or dark screen backlight repair and LED strip replacement with full picture testing." },
  { title: "Smart TV Software Setup", category: "TV", basePrice: 25, estimatedDuration: "30 minutes", serviceMode: "Home Visit", serviceArea: "Banani, Dhaka", technicianEmail: R, image: img("1588508065123-287b28e013da"), description: "Smart TV first-time setup, Wi-Fi connection, app installation and software update at your home." },
  { title: "TV Motherboard Repair", category: "TV", basePrice: 95, estimatedDuration: "2-3 hours", serviceMode: "Shop Drop-off", serviceArea: "Dhanmondi, Dhaka", technicianEmail: E, image: img("1581092918056-0c4c3acd3789"), description: "TV main board diagnosis and repair for no-power, no-picture and HDMI problems." },

  // ---------- Washing Machine (5) ----------
  { title: "Washing Machine Motor Repair", category: "Washing Machine", basePrice: 89, estimatedDuration: "2-3 hours", serviceMode: "Home Visit", serviceArea: "Uttara, Dhaka", technicianEmail: E, image: img("1626806787461-102c1bfaaea1"), description: "Motor repair and replacement for front-load and top-load machines, including a full wash cycle test." },
  { title: "Washer Drum Deep Cleaning", category: "Washing Machine", basePrice: 40, estimatedDuration: "1-2 hours", serviceMode: "Home Visit", serviceArea: "Banani, Dhaka", technicianEmail: R, image: img("1545173168-9f1947eebb7f"), description: "Complete drum descaling and deep cleaning to remove odour, mould and detergent build-up." },
  { title: "Washer Water Leakage Repair", category: "Washing Machine", basePrice: 49, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Mohammadpur, Dhaka", technicianEmail: R, image: img("1676210134188-4c05dd172f89"), description: "Leak detection and repair for hoses, seals and drain pumps so your floor stays dry." },
  { title: "Washing Machine Installation", category: "Washing Machine", basePrice: 39, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Gulshan, Dhaka", technicianEmail: E, image: img("1604335399105-a0c585fd81a1"), description: "New washing machine installation with water inlet, drainage setup and a test wash cycle." },
  { title: "Washer Spin Problem Repair", category: "Washing Machine", basePrice: 59, estimatedDuration: "1-2 hours", serviceMode: "Home Visit", serviceArea: "Mirpur, Dhaka", technicianEmail: R, image: img("1610557892470-55d9e80c0bce"), description: "Repair for drums that will not spin or drain properly — belt, motor and pump checks included." },

  // ---------- Electrical (5) ----------
  { title: "Home Wiring Inspection", category: "Electrical", basePrice: 55, estimatedDuration: "2 hours", serviceMode: "Home Visit", serviceArea: "Dhanmondi, Dhaka", technicianEmail: E, image: img("1621905252507-b35492cc74b4"), description: "Full home electrical safety inspection covering wiring, circuit breakers, earthing and load capacity." },
  { title: "Ceiling Fan Installation", category: "Electrical", basePrice: 25, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Mirpur, Dhaka", technicianEmail: R, image: img("1565151443833-29bf2ba5dd8d"), description: "New ceiling fan installation or replacement with safe wiring, regulator fitting and balance check." },
  { title: "Switch & Socket Replacement", category: "Electrical", basePrice: 19, estimatedDuration: "30 minutes", serviceMode: "Home Visit", serviceArea: "Uttara, Dhaka", technicianEmail: E, image: img("1621905251189-08b45d6a269e"), description: "Faulty switch, socket and regulator replacement with safe wiring and load testing." },
  { title: "IPS & UPS Installation", category: "Electrical", basePrice: 65, estimatedDuration: "2 hours", serviceMode: "Home Visit", serviceArea: "Dhanmondi, Dhaka", technicianEmail: R, image: img("1619489646924-b4fce76b1db5"), description: "IPS and UPS installation with battery setup and safe wiring for uninterrupted power backup." },
  { title: "Circuit Breaker Repair", category: "Electrical", basePrice: 45, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Banani, Dhaka", technicianEmail: E, image: img("1621905251918-48416bd8575a"), description: "Circuit breaker repair and replacement to stop frequent tripping and protect your home wiring." },
];

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db("fix-mate");
  const users = db.collection("user");
  const servicesCol = db.collection("services");

  // Find the two technicians by email so names always match the accounts
  const techE = await users.findOne({ email: E });
  const techR = await users.findOne({ email: R });
  if (!techE || !techR) {
    console.log("❌ Technician accounts not found. Both Evrahim and Rahim must exist first.");
    await client.close();
    return;
  }
  const techName = { [E]: techE.name, [R]: techR.name };
  console.log(`Technicians: ${techE.name} (${E}), ${techR.name} (${R})`);

  // Remove ALL old services (bookings and payments stay untouched)
  const removed = await servicesCol.deleteMany({});
  console.log(`🗑️  Removed ${removed.deletedCount} old services.`);

  // Insert the fresh catalog of 35
  const services = serviceData.map((item) => ({
    ...item,
    technicianName: techName[item.technicianEmail],
    approvalStatus: "approved",
    isAvailable: true,
    catalogBatch: "v2",
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  const result = await servicesCol.insertMany(services);
  console.log(`✅ ${result.insertedCount} new services added (all approved).`);

  // Show the count per category
  const counts = {};
  for (const s of services) counts[s.category] = (counts[s.category] || 0) + 1;
  for (const [category, count] of Object.entries(counts)) {
    console.log(`   ${category}: ${count}`);
  }

  console.log("🎉 Catalog rebuilt! Refresh the website to see all 35 services.");
  await client.close();
}

main().catch((err) => {
  console.error("Catalog build failed:", err);
  process.exit(1);
});
