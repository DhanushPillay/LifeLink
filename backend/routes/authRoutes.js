const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/authMiddleware");
const {
  registerUser,
  loginUser,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  deleteAccount,
  blockDonor,
  unblockDonor,
  saveFCMToken,
  googleAuth
} = require("../controllers/authController");

const router = express.Router();

// Stricter rate limiting for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: "Too many attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: "Too many password reset attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 registrations per window
  message: "Too many registration attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 Google auth attempts per window
  message: "Too many Google auth attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", registerLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/logout", protect, logout);
router.post("/refresh", refreshAccessToken);
router.post("/google", googleLimiter, googleAuth);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPassword);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.post("/delete", protect, deleteAccount);
router.post("/block/:donorId", protect, blockDonor);
router.post("/unblock/:donorId", protect, unblockDonor);
router.post("/fcm-token", protect, saveFCMToken);

module.exports = router;
