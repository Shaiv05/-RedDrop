const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { submitContactMessage } = require("../controllers/contactController");

router.post("/", asyncHandler(submitContactMessage));

module.exports = router;
