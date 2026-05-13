const express = require("express");
const router = express.Router();
const {
  registerHospital,
  listHospitals,
  listEmergencyHospitals,
} = require("../controllers/hospitalController");
const {
  registerHospitalAuth,
  loginHospitalAuth,
} = require("../controllers/hospitalAuthController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", optionalAuthMiddleware, asyncHandler(listHospitals));
router.get("/emergency", optionalAuthMiddleware, asyncHandler(listEmergencyHospitals));
router.post("/auth/register", asyncHandler(registerHospitalAuth));
router.post("/auth/login", asyncHandler(loginHospitalAuth));
router.post("/register", authMiddleware, asyncHandler(registerHospital));
router.post("/public-register", asyncHandler(registerHospital));

module.exports = router;
