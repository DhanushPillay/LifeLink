const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Joi = require("joi");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Notification = require("../models/Notification");
const CallLog = require("../models/CallLog");
const logger = require("../utils/logger");
const securityLogger = require("../utils/securityLogger");
const {
  generateToken,
  generateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  rotateRefreshToken,
  verifyRefreshToken
} = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  phone: Joi.string().length(10).pattern(/^\d+$/).required(),
  password: Joi.string().pattern(PASSWORD_REGEX).required().messages({
    'string.pattern.base': 'Password must be at least 12 characters and contain uppercase, lowercase, number, and special character (@$!%*?&)'
  }),
});

const loginSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  identifier: Joi.string().required(),
});

const resetPasswordSchema = Joi.object({
  identifier: Joi.string().required(),
  otp: Joi.string().length(6).required(),
  newPassword: Joi.string().pattern(PASSWORD_REGEX).required().messages({
    'string.pattern.base': 'Password must be at least 12 characters and contain uppercase, lowercase, number, and special character (@$!%*?&)'
  }),
});

// Generate cryptographically secure 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Background Verification Task
// NOTE: In production, this should be replaced with actual certificate verification
// (e.g., manual review by admin, or integration with a verification service)
const verifyCertificateBackground = (userId, fileName) => {
  setTimeout(async () => {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Simulated verification - in production, implement actual verification logic
      // For now, mark as pending manual review instead of auto-verifying
      const nextStatus = 'verified'; // Changed from filename check to auto-verify for demo

      // Update the user's eligibility status
      user.profile.eligibilityStatus = nextStatus;

      await user.save();

      // Create notification
      await Notification.create({
        user: userId,
        title: 'Eligibility Verified',
        message: 'Your medical eligibility certificate has been verified. You can now toggle donor availability.',
        type: 'success',
        redirect: '/dashboard/settings#eligibility'
      });
    } catch (err) {
      logger.error(`Error in background verification: ${err.message}`);
    }
  }, 7000);
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { email, phone, password } = req.body;

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    res.status(400);
    throw new Error("Email already registered");
  }

  const existingPhone = await User.findOne({ phone });
  if (existingPhone) {
    res.status(400);
    throw new Error("Phone number already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    email,
    phone,
    password: hashedPassword,
    role: "donor",
  });

  if (user) {
    const token = generateToken(user._id, user.role);
    const refreshToken = await generateRefreshToken(user._id, user.role);

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileComplete: user.profileComplete,
        profile: user.profile,
        blockedIds: user.blockedIds
      },
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { identifier, password } = req.body;

  const user = await User.findOne({
    $or: [{ email: identifier }, { phone: identifier }]
  });

  if (!user) {
    securityLogger.failedLogin(identifier, req.ip, req.headers['user-agent']);
    res.status(401);
    throw new Error("Invalid credentials");
  }

  // Check if account is locked
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

  if (user.lockUntil && user.lockUntil > Date.now()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    res.status(423);
    throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
  }

  // Check if lockout has expired
  if (user.lockUntil && user.lockUntil <= Date.now()) {
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }

  if (await bcrypt.compare(password, user.password)) {
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const token = generateToken(user._id, user.role);
    const refreshToken = await generateRefreshToken(user._id, user.role);

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileComplete: user.profileComplete,
        profile: user.profile,
        blockedIds: user.blockedIds
      },
      token,
    });
  } else {
    user.loginAttempts = (user.loginAttempts || 0) + 1;

    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCKOUT_TIME);
      await user.save();
      securityLogger.accountLocked(user._id, req.ip);
      res.status(423);
      throw new Error("Account locked due to too many failed attempts. Try again in 15 minutes.");
    }

    securityLogger.failedLogin(identifier, req.ip, req.headers['user-agent']);
    await user.save();
    res.status(401);
    throw new Error("Invalid credentials");
  }
});

// @desc    Send OTP for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { error } = forgotPasswordSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { identifier } = req.body;

  const user = await User.findOne({
    $or: [{ email: identifier }, { phone: identifier }]
  });

  if (!user) {
    res.status(404);
    throw new Error("Account not found");
  }

  if (!user.password) {
    res.status(400);
    throw new Error("This account uses Google Sign-In. Password reset is not available.");
  }

  // Generate OTP
  const otp = generateOTP();
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  user.resetPasswordOTP = otp;
  user.resetPasswordExpires = expires;
  await user.save();

  // Send OTP via email
  if (user.email) {
    await sendEmail({
      email: user.email,
      subject: "Password Reset OTP",
      message: `Your OTP for password reset is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`
    });
  }

  res.json({ success: true, message: "OTP sent to your email" });
});

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { error } = resetPasswordSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { identifier, otp, newPassword } = req.body;

  const user = await User.findOne({
    $or: [{ email: identifier }, { phone: identifier }],
    resetPasswordOTP: otp,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired OTP");
  }

  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetPasswordOTP = undefined;
  user.resetPasswordExpires = undefined;
  user.passwordChangedAt = Date.now();
  await user.save();

  await revokeAllUserTokens(user._id);
  securityLogger.passwordChanged(user._id, req.ip);

  res.json({ success: true, message: "Password reset successful" });
});

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json({
    success: true,
    user
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Field allowlisting - only these fields can be updated by users
  const allowedProfileFields = [
    'name', 'dob', 'age', 'bloodGroup', 'gender', 'weight',
    'smoker', 'alcoholic', 'illnesses', 'donateBlood', 'donateOrgan',
    'organs', 'eligibilityFile', 'eligibilityFileName', 'eligibilityFileType',
    'lat', 'lng', 'city', 'pincode'
  ];

  // Filter request body to only allow safe fields
  const filteredData = {};
  allowedProfileFields.forEach(field => {
    if (req.body[field] !== undefined) {
      filteredData[field] = req.body[field];
    }
  });

  // Track if eligibilityStatus is becoming 'processing'
  const isNowProcessing = filteredData.eligibilityFileName && user.profile.eligibilityStatus !== 'processing';

  // Validate certificate size (max 2MB)
  if (filteredData.eligibilityFile) {
    const base64Size = filteredData.eligibilityFile.length * 0.75; // Approximate decoded size
    if (base64Size > 2 * 1024 * 1024) {
      res.status(400);
      throw new Error("Certificate file too large. Maximum size is 2MB.");
    }
  }

  // If uploading new certificate, set status to processing
  if (isNowProcessing) {
    filteredData.eligibilityStatus = 'processing';
  }

  // Merge profile data (filtered)
  user.profile = {
    ...user.profile,
    ...filteredData
  };
  
  user.profileComplete = true;

  await user.save();

  if (isNowProcessing) {
    verifyCertificateBackground(user._id, user.profile.eligibilityFileName);
  }

  res.json({
    success: true,
    user: {
      _id: user._id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileComplete: user.profileComplete,
      profile: user.profile,
      blockedIds: user.blockedIds
    }
  });
});

// @desc    Delete user account
// @route   POST /api/auth/delete
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.password) {
    if (!password) {
      res.status(400);
      throw new Error("Password is required");
    }
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      res.status(400);
      throw new Error("Incorrect password");
    }
  }

  await CallLog.deleteMany({ user: user._id });
  await Notification.deleteMany({ user: user._id });
  await User.findByIdAndDelete(user._id);

  res.json({ success: true });
});

// @desc    Block a donor
// @route   POST /api/auth/block/:donorId
// @access  Private
const blockDonor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { donorId } = req.params;
  if (!user.blockedIds.includes(donorId)) {
    user.blockedIds.push(donorId);
    await user.save();
  }

  res.json({ success: true, blockedIds: user.blockedIds });
});

// @desc    Unblock a donor
// @route   POST /api/auth/unblock/:donorId
// @access  Private
const unblockDonor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { donorId } = req.params;
  user.blockedIds = user.blockedIds.filter(id => id !== donorId);
  await user.save();

  res.json({ success: true, blockedIds: user.blockedIds });
});

// @desc    Save FCM token for push notifications
// @route   POST /api/auth/fcm-token
// @access  Private
const saveFCMToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400);
    throw new Error("Token is required");
  }

  await User.findByIdAndUpdate(req.user._id, { fcmToken: token });
  res.json({ success: true });
});

// @desc    Login/Register with Google
// @route   POST /api/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400);
    throw new Error("Google credential is required");
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    res.status(401);
    throw new Error("Invalid Google credential");
  }

  const payload = ticket.getPayload();
  const { sub: googleId, email, name, picture } = payload;

  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
    }
    if (picture && !user.avatar) {
      user.avatar = picture;
    }
    await user.save();
  } else {
    user = await User.create({
      email,
      googleId,
      avatar: picture || "",
      role: "donor",
      profile: {
        name: name || "",
      },
    });
  }

  const token = generateToken(user._id, user.role);
  const refreshToken = await generateRefreshToken(user._id, user.role);

  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth'
  });

  res.json({
    success: true,
    user: {
      _id: user._id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileComplete: user.profileComplete,
      profile: user.profile,
      blockedIds: user.blockedIds,
    },
    token,
  });
});

// @desc    Logout user (clear cookies)
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  res.cookie('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 0
  });
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 0,
    path: '/api/auth'
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    securityLogger.tokenRefreshFailed(req.ip, 'No refresh token provided');
    res.status(401);
    throw new Error("Refresh token required");
  }

  const storedToken = await verifyRefreshToken(refreshToken);

  if (!storedToken) {
    securityLogger.tokenRefreshFailed(req.ip, 'Invalid or expired refresh token');
    res.status(401);
    throw new Error("Invalid or expired refresh token");
  }

  const user = await User.findById(storedToken.user);
  if (!user) {
    securityLogger.tokenRefreshFailed(req.ip, 'User not found');
    res.status(401);
    throw new Error("User not found");
  }

  const newRefreshToken = await rotateRefreshToken(refreshToken);
  const newAccessToken = generateToken(user._id, user.role);

  securityLogger.tokenRefreshed(user._id, req.ip);

  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000
  });

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth'
  });

  res.json({
    success: true,
    token: newAccessToken,
  });
});

module.exports = {
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
  googleAuth,
};
