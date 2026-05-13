const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, default: null, select: false },
    phone: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, trim: true, unique: true },
    emergencyReason: { type: String, trim: true, default: "" },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

hospitalSchema.index({ location: 1, name: 1 });

module.exports = mongoose.model("Hospital", hospitalSchema);
