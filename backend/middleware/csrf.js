const { doubleCsrf } = require("csrf-csrf");

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET,
  cookieName: "csrf-token",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  },
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  ignoredPaths: ["/api/auth/refresh"],
});

module.exports = { generateCsrfToken: generateToken, doubleCsrfProtection };
