const mongoose = require("mongoose");

const analyzedParameterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String, default: "" },
    referenceRange: { type: String, default: "" },
    status: { type: String, enum: ["normal", "high", "low", "borderline", "unknown"], default: "unknown" },
    explanation: { type: String, default: "" },
    confidence: { type: Number, default: 0 },
  },
  { _id: false }
);

const bloodReportAnalysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    extractionMethod: { type: String, default: "heuristic" },
    extractedTextPreview: { type: String, default: "" },
    labName: { type: String, default: "" },
    testDate: { type: Date, default: null },
    summary: { type: String, default: "" },
    parameters: { type: [analyzedParameterSchema], default: [] },
    insights: { type: [String], default: [] },
    dietSuggestions: { type: [String], default: [] },
    lifestyleSuggestions: { type: [String], default: [] },
    precautions: { type: [String], default: [] },
    donationEligibility: {
      status: { type: String, enum: ["eligible", "needs_review", "not_eligible"], default: "needs_review" },
      label: { type: String, default: "" },
      reasons: { type: [String], default: [] },
      nextStep: { type: String, default: "" },
    },
    disclaimer: { type: String, default: "" },
    analysisVersion: { type: String, default: "v1" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserBloodReportAnalysis", bloodReportAnalysisSchema);
