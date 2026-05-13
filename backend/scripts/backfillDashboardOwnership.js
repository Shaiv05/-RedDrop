require("dotenv").config();
const mongoose = require("mongoose");
const Hospital = require("../models/Hospital");
const BloodInventory = require("../models/BloodInventory");
const DonationRecord = require("../models/DonationRecord");
const ActivityLog = require("../models/ActivityLog");

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reddrop";

const main = async () => {
  await mongoose.connect(uri);

  const hospitals = await Hospital.find().select("name email licenseNumber").lean();
  const hospitalMap = new Map(hospitals.map((h) => [String(h._id), h]));

  const applySnapshot = async (Model, label) => {
    const docs = await Model.find().select("hospital").lean();
    let updated = 0;
    for (const doc of docs) {
      const h = hospitalMap.get(String(doc.hospital));
      if (!h) continue;
      await Model.updateOne(
        { _id: doc._id },
        {
          $set: {
            hospitalName: h.name,
            hospitalEmail: h.email,
            hospitalLicenseNumber: h.licenseNumber,
            dashboardScope: "hospital_dashboard",
          },
        }
      );
      updated += 1;
    }
    console.log(`${label} backfilled:`, updated);
  };

  await applySnapshot(BloodInventory, "bloodinventories");
  await applySnapshot(DonationRecord, "donationrecords");
  await applySnapshot(ActivityLog, "activitylogs");

  await mongoose.connection.close();
  console.log("Dashboard ownership backfill complete.");
};

main().catch(async (error) => {
  console.error("Backfill failed:", error.message);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
