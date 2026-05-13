const mongoose = require("mongoose");
const BLOOD_GROUPS = require("../utils/bloodGroups");

const userDonationRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true, trim: true },
    hospitalName: { type: String, required: true, trim: true },
    bloodGroup: { type: String, required: true, enum: BLOOD_GROUPS },
    unitsDonated: { type: Number, required: true, min: 1 },
    donationDate: { type: Date, required: true },
  },
  { timestamps: true }
);

userDonationRecordSchema.index({ user: 1, donationDate: -1 });

module.exports = mongoose.model("UserDonationRecord", userDonationRecordSchema);
