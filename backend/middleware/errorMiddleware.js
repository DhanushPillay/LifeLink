const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  logger.error(`[Error] ${err.message}`, {
    statusCode,
    path: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  const message = process.env.NODE_ENV === "production"
    ? "An error occurred"
    : err.message;

  res.status(statusCode);
  res.json({
    message,
    stack: null,
  });
};

module.exports = { errorHandler };
