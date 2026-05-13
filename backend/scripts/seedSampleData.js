const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const { upsertSampleData } = require("../services/seedService");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const seed = async () => {
  try {
    await connectDB();
    const { donorCount, hospitalCount, requestCount } = await upsertSampleData();
    console.log(`Seed complete: ${donorCount} donors, ${hospitalCount} hospitals, ${requestCount} requests`);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seed();
