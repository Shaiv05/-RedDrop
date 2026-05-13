const mongoose = require("mongoose");
const BLOOD_GROUPS = require("../utils/bloodGroups");

const bloodInventorySchema = new mongoose.Schema(
  {
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    hospitalName: { type: String, required: true, trim: true },
    hospitalEmail: { type: String, required: true, lowercase: true, trim: true },
    hospitalLicenseNumber: { type: String, required: true, trim: true },
    dashboardScope: { type: String, default: "hospital_dashboard", immutable: true },
    bloodGroup: { type: String, required: true, enum: BLOOD_GROUPS },
    units: { type: Number, required: true, min: 0, default: 0 },
    minLevel: { type: Number, required: true, min: 0, default: 5 },
  },
  { timestamps: true }
);

bloodInventorySchema.index({ hospital: 1, bloodGroup: 1 }, { unique: true });

module.exports = mongoose.model("BloodInventory", bloodInventorySchema);
