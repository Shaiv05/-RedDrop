const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    hospitalName: { type: String, required: true, trim: true },
    hospitalEmail: { type: String, required: true, lowercase: true, trim: true },
    hospitalLicenseNumber: { type: String, required: true, trim: true },
    dashboardScope: { type: String, default: "hospital_dashboard", immutable: true },
    type: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ hospital: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
