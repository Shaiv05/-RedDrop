const mongoose = require("mongoose");
const Donor = require("../models/Donor");

const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/reddrop";

const normalizeField = (value = "") =>
  String(value)
    .trim()
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .toLowerCase();

const donorKey = (donor) =>
  [
    normalizeField(donor.name),
    donor.bloodGroup,
    normalizeField(donor.location),
    donor.lastDonationDate ? new Date(donor.lastDonationDate).toISOString().slice(0, 10) : "",
  ].join("|");

const run = async () => {
  await mongoose.connect(mongoUri);

  const donors = await Donor.find().sort({ createdAt: -1 }).lean();
  const seen = new Set();
  const removeIds = [];

  for (const donor of donors) {
    const key = donorKey(donor);
    if (seen.has(key)) {
      removeIds.push(donor._id);
    } else {
      seen.add(key);
    }
  }

  let deleted = 0;
  if (removeIds.length > 0) {
    const result = await Donor.deleteMany({ _id: { $in: removeIds } });
    deleted = result.deletedCount || 0;
  }

  console.log(`Duplicate donor records removed: ${deleted}`);
  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
