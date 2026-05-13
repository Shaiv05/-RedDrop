const express = require("express");
const router = express.Router();
const {
  createRequest,
  listRequests,
  respondToRequest,
  updateRequestStatus,
} = require("../controllers/requestController");
const authMiddleware = require("../middleware/authMiddleware");
const requireHospitalRole = require("../middleware/requireHospitalRole");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", optionalAuthMiddleware, asyncHandler(listRequests));
router.post("/", authMiddleware, asyncHandler(createRequest));
router.post("/:requestId/respond", authMiddleware, asyncHandler(respondToRequest));
router.patch("/:requestId/status", authMiddleware, requireHospitalRole, asyncHandler(updateRequestStatus));

module.exports = router;
