const mongoose = require("mongoose");
const BLOOD_GROUPS = require("../utils/bloodGroups");

const userBloodRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true, trim: true },
    patientName: { type: String, required: true, trim: true },
    bloodGroup: { type: String, required: true, enum: BLOOD_GROUPS },
    units: { type: Number, required: true, min: 1 },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", default: null },
    hospitalName: { type: String, required: true, trim: true },
    city: { type: String, trim: true, default: "" },
    reason: { type: String, trim: true, default: "" },
    patientCondition: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

userBloodRequestSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("UserBloodRequest", userBloodRequestSchema);
