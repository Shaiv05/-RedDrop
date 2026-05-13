const mongoose = require("mongoose");
const BLOOD_GROUPS = require("../utils/bloodGroups");

const donorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    bloodGroup: { type: String, required: true, enum: BLOOD_GROUPS },
    location: { type: String, required: true, trim: true },
    isAvailable: { type: Boolean, default: true },
    lastDonationDate: { type: Date, default: null },
  },
  { timestamps: true }
);

donorSchema.index({ bloodGroup: 1, location: 1, isAvailable: 1 });

module.exports = mongoose.model("Donor", donorSchema);
