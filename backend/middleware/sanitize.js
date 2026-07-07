const mongoSanitize = require('express-mongo-sanitize');

const sanitize = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Sanitized suspicious key: ${key} from ${req.ip}`);
    }
  }
});

module.exports = sanitize;
