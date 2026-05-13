const mongoose = require("mongoose");
const DonationRecord = require("../models/DonationRecord");

const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/reddrop";

const buildKey = (record) =>
  [
    String(record.hospital),
    record.donorName,
    record.bloodGroup,
    new Date(record.donationDate).toISOString(),
  ].join("|");

const run = async () => {
  await mongoose.connect(mongoUri);

  const records = await DonationRecord.find({ dashboardScope: "hospital_dashboard" })
    .sort({ createdAt: 1 })
    .lean();

  const seen = new Set();
  const removeIds = [];

  for (const record of records) {
    const key = buildKey(record);
    if (seen.has(key)) {
      removeIds.push(record._id);
    } else {
      seen.add(key);
    }
  }

  let deleted = 0;
  if (removeIds.length > 0) {
    const result = await DonationRecord.deleteMany({ _id: { $in: removeIds } });
    deleted = result.deletedCount || 0;
  }

  console.log(`Duplicate hospital dashboard donation records removed: ${deleted}`);
  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
