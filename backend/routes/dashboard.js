const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const requireHospitalRole = require("../middleware/requireHospitalRole");
const asyncHandler = require("../middleware/asyncHandler");
const {
  getOverview,
  listInventory,
  addInventory,
  updateInventory,
  removeInventory,
  listDonations,
  createDonation,
  listNotifications,
  listActivities,
  getProfile,
  updateProfile,
  getReports,
} = require("../controllers/dashboardController");

router.get("/overview", authMiddleware, requireHospitalRole, asyncHandler(getOverview));
router.get("/inventory", authMiddleware, requireHospitalRole, asyncHandler(listInventory));
router.post("/inventory", authMiddleware, requireHospitalRole, asyncHandler(addInventory));
router.patch("/inventory/:inventoryId", authMiddleware, requireHospitalRole, asyncHandler(updateInventory));
router.delete("/inventory/:inventoryId", authMiddleware, requireHospitalRole, asyncHandler(removeInventory));
router.get("/donations", authMiddleware, requireHospitalRole, asyncHandler(listDonations));
router.post("/donations", authMiddleware, requireHospitalRole, asyncHandler(createDonation));
router.get("/notifications", authMiddleware, requireHospitalRole, asyncHandler(listNotifications));
router.get("/activities", authMiddleware, requireHospitalRole, asyncHandler(listActivities));
router.get("/profile", authMiddleware, requireHospitalRole, asyncHandler(getProfile));
router.patch("/profile", authMiddleware, requireHospitalRole, asyncHandler(updateProfile));
router.get("/reports", authMiddleware, requireHospitalRole, asyncHandler(getReports));

module.exports = router;
