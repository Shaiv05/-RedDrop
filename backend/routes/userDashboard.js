const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const requireUserRole = require("../middleware/requireUserRole");
const asyncHandler = require("../middleware/asyncHandler");
const {
  getUserDashboard,
  updateUserProfile,
  createUserBloodRequest,
  createUserDonationRecord,
  analyzeUserBloodReport,
  deleteUserBloodReportAnalysis,
} = require("../controllers/userDashboardController");

router.use(authMiddleware, requireUserRole);

router.get("/", asyncHandler(getUserDashboard));
router.patch("/profile", asyncHandler(updateUserProfile));
router.post("/requests", asyncHandler(createUserBloodRequest));
router.post("/donations", asyncHandler(createUserDonationRecord));
router.post("/blood-report-analyzer", asyncHandler(analyzeUserBloodReport));
router.delete("/blood-report-analyzer/:analysisId", asyncHandler(deleteUserBloodReportAnalysis));

module.exports = router;
