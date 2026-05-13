const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    age: { type: Number, min: 18, max: 65, default: null },
    bloodGroup: { type: String, default: "" },
    city: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    isAvailable: { type: Boolean, default: true },
    lastDonationDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
