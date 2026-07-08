const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const sanitize = require("./middleware/sanitize");
const { doubleCsrfProtection } = require("./middleware/csrf");
const requestId = require("./middleware/requestId");
const { errorHandler } = require("./middleware/errorMiddleware");
const { initSSE } = require("./sse");
const { initFirebase } = require("./utils/push");
const logger = require("./utils/logger");

dotenv.config();

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  logger.error("FATAL ERROR: MONGO_URI and JWT_SECRET are required in .env");
  process.exit(1);
}

const app = express();

app.set('trust proxy', process.env.TRUST_PROXY || 1);

app.use(helmet());

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

app.use(requestId);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
});
app.use("/api", limiter);

// CORS configuration with allowlist (always enforced - no bypass in development)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(new Error('Not allowed by CORS - no origin'));
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(sanitize);

app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

const connectDB = require("./config/db");
connectDB();

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/donors", doubleCsrfProtection, require("./routes/donorRoutes"));
app.use("/api/hospitals", doubleCsrfProtection, require("./routes/hospitalRoutes"));
app.use("/api/requests", doubleCsrfProtection, require("./routes/requestRoutes"));
app.use("/api/dashboard", doubleCsrfProtection, require("./routes/dashboardRoutes"));
app.use("/api/search", doubleCsrfProtection, require("./routes/searchRoutes"));
app.use("/api/notifications", doubleCsrfProtection, require("./routes/notificationRoutes"));
app.use("/api/calls", doubleCsrfProtection, require("./routes/callLogRoutes"));
app.use("/api/chat", doubleCsrfProtection, require("./routes/chatRoutes"));

initSSE(app);

app.use((req, res, next) => {
  res.status(404);
  const error = new Error(`Route Not Found - ${req.originalUrl}`);
  next(error);
});

app.use(errorHandler);

const server = http.createServer(app);

initFirebase();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

