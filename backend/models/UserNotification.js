const mongoose = require("mongoose");

const userNotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userName: { type: String, trim: true, default: "" },
    audience: {
      type: String,
      enum: ["all_users", "specific_user"],
      default: "specific_user",
      index: true,
    },
    type: {
      type: String,
      enum: ["event", "request_status", "donation", "eligibility", "profile", "system"],
      default: "system",
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    details: { type: String, trim: true, default: "" },
    hospitalName: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    eventDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

userNotificationSchema.index({ audience: 1, user: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model("UserNotification", userNotificationSchema);
