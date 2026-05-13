require("dotenv").config();
const mongoose = require("mongoose");

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reddrop";
const dashboardCollections = [
  "bloodinventories",
  "donationrecords",
  "activitylogs",
  "emergencyhospitals",
];

const main = async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const existing = await db.listCollections().toArray();
  const existingNames = new Set(existing.map((c) => c.name));

  for (const name of dashboardCollections) {
    if (existingNames.has(name)) {
      await db.collection(name).drop();
      console.log(`Dropped collection: ${name}`);
    } else {
      console.log(`Collection not found (skip): ${name}`);
    }
  }

  await mongoose.connection.close();
  console.log("Dashboard collection reset complete.");
};

main().catch(async (error) => {
  console.error("Reset failed:", error.message);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
