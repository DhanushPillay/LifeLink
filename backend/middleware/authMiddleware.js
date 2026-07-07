const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const logger = require("../utils/logger");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Try cookie first, then header
  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized, user not found");
    }

    if (req.user.passwordChangedAt) {
      const changedTimestamp = parseInt(req.user.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        res.status(401);
        throw new Error("Password recently changed. Please log in again.");
      }
    }

    next();
  } catch (error) {
    if (error.message === "Password recently changed. Please log in again.") {
      throw error;
    }
    logger.error('Auth middleware error:', { error: error.message });
    res.status(401);
    throw new Error("Not authorized, token failed");
  }
});

const role = (...roles) => asyncHandler(async (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized, no user");
  }
  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error("Not authorized for this role");
  }
  next();
});

const optionalProtect = asyncHandler(async (req, res, next) => {
  let token;

  // Try cookie first, then header
  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    } catch (error) {
      // Token invalid but continue without user
    }
  }

  next();
});

module.exports = { protect, role, optionalProtect };
