const mongoose = require("mongoose");
const BLOOD_GROUPS = require("../utils/bloodGroups");

const donationRecordSchema = new mongoose.Schema(
  {
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    hospitalName: { type: String, required: true, trim: true },
    hospitalEmail: { type: String, required: true, lowercase: true, trim: true },
    hospitalLicenseNumber: { type: String, required: true, trim: true },
    dashboardScope: { type: String, default: "hospital_dashboard", immutable: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: "BloodRequest", default: null },
    donorName: { type: String, required: true, trim: true },
    bloodGroup: { type: String, required: true, enum: BLOOD_GROUPS },
    unitsDonated: { type: Number, required: true, min: 1 },
    donationDate: { type: Date, required: true },
  },
  { timestamps: true }
);

donationRecordSchema.index({ hospital: 1, donationDate: -1 });

module.exports = mongoose.model("DonationRecord", donationRecordSchema);
