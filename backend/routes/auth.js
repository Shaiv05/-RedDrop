const express = require("express");
const router = express.Router();
const { register, login, me } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.get("/me", authMiddleware, asyncHandler(me));

module.exports = router;
