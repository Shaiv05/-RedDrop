const express = require("express");
const router = express.Router();
const {
  registerDonor,
  listDonors,
  setDonorAvailability,
} = require("../controllers/donorController");
const authMiddleware = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", authMiddleware, asyncHandler(listDonors));
router.post("/register", authMiddleware, asyncHandler(registerDonor));
router.post("/public-register", asyncHandler(registerDonor));
router.patch("/:donorId/availability", authMiddleware, asyncHandler(setDonorAvailability));

module.exports = router;
