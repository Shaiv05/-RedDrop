const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/reddrop";

  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoUri}`);
};

module.exports = connectDB;
