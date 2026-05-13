const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["feedback", "query", "problem"],
    },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ email: 1 });

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
