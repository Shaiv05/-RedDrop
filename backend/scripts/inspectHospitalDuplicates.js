const mongoose = require("mongoose");
const DonationRecord = require("../models/DonationRecord");
const Donor = require("../models/Donor");

const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/reddrop";

const run = async () => {
  await mongoose.connect(mongoUri);

  const donationDupes = await DonationRecord.aggregate([
    { $match: { dashboardScope: "hospital_dashboard" } },
    {
      $group: {
        _id: {
          hospital: "$hospital",
          donorName: "$donorName",
          bloodGroup: "$bloodGroup",
          donationDate: "$donationDate",
        },
        count: { $sum: 1 },
        ids: { $push: "$_id" },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  const donorDupes = await Donor.aggregate([
    {
      $group: {
        _id: {
          email: "$email",
        },
        count: { $sum: 1 },
        ids: { $push: "$_id" },
        names: { $push: "$name" },
        locations: { $push: "$location" },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  console.log("Donation duplicate groups:");
  console.log(JSON.stringify(donationDupes, null, 2));
  console.log("Donor duplicate groups:");
  console.log(JSON.stringify(donorDupes, null, 2));

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
