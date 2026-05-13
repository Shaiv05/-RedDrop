const mongoose = require("mongoose");
const BLOOD_GROUPS = require("../utils/bloodGroups");

const emergencyHospitalSchema = new mongoose.Schema(
  {
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: "BloodRequest", default: null },
    hospitalName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, trim: true },
    bloodGroup: { type: String, required: true, enum: BLOOD_GROUPS },
    units: { type: Number, required: true, min: 1 },
    emergencyReason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["open", "fulfilled", "cancelled"],
      default: "open",
    },
  },
  { timestamps: true }
);

emergencyHospitalSchema.index({ status: 1, createdAt: -1 });
emergencyHospitalSchema.index({ hospital: 1, createdAt: -1 });

module.exports = mongoose.model("EmergencyHospital", emergencyHospitalSchema);
