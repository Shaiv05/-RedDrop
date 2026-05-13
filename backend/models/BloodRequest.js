const mongoose = require("mongoose");
const BLOOD_GROUPS = require("../utils/bloodGroups");

const bloodRequestSchema = new mongoose.Schema(
  {
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    hospitalName: { type: String, required: true, trim: true },
    bloodGroup: { type: String, required: true, enum: BLOOD_GROUPS },
    units: { type: Number, required: true, min: 1 },
    patientNote: { type: String, default: "Emergency" },
    isUrgent: { type: Boolean, default: false },
    neededBy: { type: Date, default: null },
    status: {
      type: String,
      enum: ["open", "fulfilled", "cancelled"],
      default: "open",
    },
    responders: [
      {
        donor: { type: mongoose.Schema.Types.ObjectId, ref: "Donor", required: true },
        message: { type: String, default: "" },
        respondedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

bloodRequestSchema.index({ bloodGroup: 1, isUrgent: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);
