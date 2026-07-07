const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
};

const generateRefreshToken = async (id, role, replacedByToken = null) => {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: id,
    token,
    expiresAt,
    replacedByToken
  });

  return token;
};

const revokeRefreshToken = async (token) => {
  await RefreshToken.findOneAndUpdate(
    { token },
    { revokedAt: new Date() }
  );
};

const revokeAllUserTokens = async (userId) => {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { revokedAt: new Date() }
  );
};

const rotateRefreshToken = async (oldToken) => {
  const refreshToken = await RefreshToken.findOne({ token: oldToken });
  
  if (!refreshToken || !refreshToken.isActive()) {
    return null;
  }

  await RefreshToken.findOneAndUpdate(
    { token: oldToken },
    { revokedAt: new Date() }
  );

  const newToken = await generateRefreshToken(
    refreshToken.user,
    null,
    oldToken
  );

  return newToken;
};

const verifyRefreshToken = async (token) => {
  const refreshToken = await RefreshToken.findOne({ token });
  
  if (!refreshToken || !refreshToken.isActive()) {
    return null;
  }

  return refreshToken;
};

module.exports = {
  generateToken,
  generateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  rotateRefreshToken,
  verifyRefreshToken
};
