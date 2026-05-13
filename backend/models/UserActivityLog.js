const mongoose = require("mongoose");

const userActivityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

userActivityLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("UserActivityLog", userActivityLogSchema);
