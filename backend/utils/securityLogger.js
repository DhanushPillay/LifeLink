const logger = require('./logger');

const securityLogger = {
  failedLogin: (identifier, ip, userAgent) => {
    logger.warn('Failed login attempt', {
      event: 'FAILED_LOGIN',
      identifier,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  accountLocked: (userId, ip) => {
    logger.warn('Account locked due to failed attempts', {
      event: 'ACCOUNT_LOCKED',
      userId,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  passwordChanged: (userId, ip) => {
    logger.info('Password changed', {
      event: 'PASSWORD_CHANGED',
      userId,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  tokenRefreshed: (userId, ip) => {
    logger.info('Token refreshed', {
      event: 'TOKEN_REFRESHED',
      userId,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  tokenRefreshFailed: (ip, reason) => {
    logger.warn('Token refresh failed', {
      event: 'TOKEN_REFRESH_FAILED',
      ip,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  corsViolation: (origin, ip) => {
    logger.warn('CORS violation', {
      event: 'CORS_VIOLATION',
      origin,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  rateLimitHit: (ip, path) => {
    logger.warn('Rate limit exceeded', {
      event: 'RATE_LIMIT_HIT',
      ip,
      path,
      timestamp: new Date().toISOString(),
    });
  },

  suspiciousInput: (ip, key, value) => {
    logger.warn('Suspicious input detected', {
      event: 'SUSPICIOUS_INPUT',
      ip,
      key,
      timestamp: new Date().toISOString(),
    });
  },

  unauthorizedAccess: (userId, path, ip) => {
    logger.warn('Unauthorized access attempt', {
      event: 'UNAUTHORIZED_ACCESS',
      userId,
      path,
      ip,
      timestamp: new Date().toISOString(),
    });
  },
};

module.exports = securityLogger;
