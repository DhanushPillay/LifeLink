# LifeLink Codebase - File Analysis

## File Inventory

| File | Type | Size | Summary |
|------|------|------|---------|
| `backend/server.js` | JS | 72 lines | Express server bootstrap, middleware setup, route mounting |
| `backend/config/db.js` | JS | 14 lines | MongoDB connection via Mongoose |
| `backend/models/User.js` | JS | 85 lines | User schema with embedded profile, auth fields |
| `backend/models/Donor.js` | JS | 49 lines | Donor schema with geospatial index, references User |
| `backend/models/Hospital.js` | JS | 52 lines | Hospital schema with geospatial index, references User |
| `backend/models/Request.js` | JS | 63 lines | Donation request schema with status enum |
| `backend/models/Message.js` | JS | ~30 lines | Chat message schema (inferred) |
| `backend/models/Notification.js` | JS | ~30 lines | Notification schema (inferred) |
| `backend/models/CallLog.js` | JS | ~30 lines | Call log schema (inferred) |
| `backend/controllers/authController.js` | JS | 398 lines | Auth: register, login, Google OAuth, profile, password reset |
| `backend/controllers/donorController.js` | JS | 76 lines | Donor CRUD operations |
| `backend/controllers/searchController.js` | JS | 113 lines | Donor search: nearby geospatial + generic filter |
| `backend/controllers/requestController.js` | JS | 338 lines | Request creation, matching algorithm, notifications |
| `backend/controllers/chatController.js` | JS | 169 lines | Chat history, conversation list, read receipts |
| `backend/controllers/dashboardController.js` | JS | 72 lines | Dashboard stats, analytics aggregations |
| `backend/middleware/authMiddleware.js` | JS | 72 lines | JWT protect, role check, optional protect |
| `backend/socket.js` | JS | 141 lines | Socket.IO real-time chat with auth |
| `backend/sse.js` | JS | 79 lines | Server-Sent Events for notifications |
| `frontend/src/App.jsx` | JSX | 88 lines | React Router setup, route guards |
| `frontend/src/context/AuthContext.jsx` | JSX | 323 lines | Auth state, API calls, notifications, call logs |
| `frontend/src/context/SocketContext.jsx` | JSX | 134 lines | SSE connection with socket shim API |
| `frontend/src/pages/Dashboard.jsx` | JSX | 432 lines | Dashboard UI with stats, requests, actions |
| `frontend/src/pages/SearchPage.jsx` | JSX | 160 lines | Donor search with filters and contact modal |
| `frontend/src/pages/Chat.jsx` | JSX | 544 lines | Full chat UI with real-time messaging |
| `frontend/src/utils/helpers.js` | JS | 97 lines | Age calc, formatting, pincode coords, haversine |

## Per-File Key Findings

### Security Issues
- **CORS**: `server.js` allows ALL origins dynamically (`callback(null, true)`) — no origin whitelist
- **Rate limiting**: Global 500 req/15min on `/api/*` — no auth route-specific stricter limits
- **JWT**: Stored in localStorage (frontend), no refresh token mechanism, no token expiration handling beyond 401
- **Input validation**: Uses Joi for auth but no sanitization against NoSQL injection elsewhere
- **Certificate verification**: `authController.js` line 35 — fake verification (`!/fail|invalid/i.test(fileName)`) — no actual document processing
- **Password reset**: No email verification step — anyone can reset if they know identifier
- **BlockedIds**: Stored as strings, not ObjectIds — potential type mismatch bugs

### Data Architecture Issues
- **Model duplication**: `Donor` and `User` both store donor data. `Donor` has `bloodGroup`, `city`, `phone` but `User.profile` also has these. `searchController.js` uses `User` model, `requestController.js` uses `Donor` model — inconsistent
- **No geospatial on User**: `User.profile` has flat `lat`/`lng` fields, NOT a GeoJSON Point. `searchDonors` does haversine in JS instead of MongoDB `$near`
- **Donor model has geospatial index**: But `searchDonors` doesn't use it — queries `User` instead
- **No pagination**: `getDonors`, `getRequests`, `getChatHistory` return ALL records
- **No soft deletes**: Hard delete everywhere (`findByIdAndDelete`, `deleteMany`)

### Blood/Organ Matching Logic
- **No blood compatibility**: Direct string equality match only (`bloodGroup === query`). No O- universal donor, AB+ universal recipient logic
- **No organ compatibility**: Direct string match on organ type. No HLA typing, tissue matching, medical eligibility cross-check
- **Matching algorithm**: `Donor.findOne(matchCriteria)` — finds first match, not best match. No distance scoring, no availability recency
- **Emergency fallback**: Notifies ALL donors in city, not compatible ones

### Performance Issues
- **Synchronous notification loops**: `for...of` with async IIFEs inside — blocks response, no queue
- **No database indexing strategy**: Only 2dsphere indexes exist. No compound indexes for common queries
- **No caching**: Redis/caching layer absent. Dashboard stats recalculated every load
- **Message aggregation**: Chat list uses two separate aggregation pipelines then merges in JS

### Real-time Architecture
- **Redundant transports**: Both Socket.IO AND SSE active. Socket.IO for chat, SSE for notifications. Socket.IO never used for notifications despite being available
- **No message encryption**: Chat messages stored and transmitted in plaintext
- **No message persistence limits**: Chat history grows unbounded
- **SSE token in URL**: `token` query param exposed in URL/logs

### Frontend Issues
- **Hardcoded API URL**: `SocketContext.jsx` line 36 hardcodes production Render URL
- **No error boundaries**: No React error boundaries for crash isolation
- **No service worker**: No offline capability, no PWA features
- **No input debouncing**: Search calls API on every keystroke (with abort controller, but still wasteful)
- **Re-render issues**: `AuthContext` bundles auth + notifications + call logs — massive context, frequent re-renders
- **Accessibility**: No ARIA labels, no focus management on modals

## Cross-File Mapping

### Overlapping Data Concerns
- `User.profile` and `Donor` both store: name, bloodGroup, city, phone, location, availability
- `searchDonors` (User model) and `searchNearbyDonors` (Donor model) serve same purpose with different data sources
- `requestController` creates notifications via `emitToUser` (SSE) while `socket.js` has same capability (Socket.IO) — unused

### Complementary Gaps
- `Donor` has geospatial but `searchDonors` ignores it
- `User` has `eligibilityStatus` but `Request` matching doesn't check it
- `Hospital` has `verified` flag but no verification workflow exists
- `CallLog` exists but no actual calling mechanism (likely manual phone calls)

### Identified Gaps
1. No blood group compatibility matrix
2. No HLA/tissue typing for organ matching
3. No donor availability scheduling (only binary available/unavailable)
4. No donation history tracking (only `lastDonationDate` on Donor)
5. No cooldown periods between donations
6. No multi-factor authentication
7. No audit/logging for data access (compliance)
8. No backup/disaster recovery
9. No admin dashboard or moderation tools
10. No data export/deletion for GDPR
11. No rate limiting per-user (only global IP-based)
12. No API versioning
13. No health check endpoint
14. No input validation on profile fields (blood group can be any string)

## Consolidated Theme List

1. **Security Hardening** — Auth, CORS, injection prevention, encryption
2. **Data Model Refactoring** — Eliminate Donor/User duplication, proper geospatial
3. **Medical Matching Logic** — Blood compatibility, organ matching algorithms
4. **Performance & Scalability** — Pagination, caching, indexes, async queues
5. **Real-time Architecture** — Consolidate Socket.IO/SSE, message encryption
6. **Testing & DevOps** — Unit tests, integration tests, CI/CD, Docker
7. **Compliance & Ethics** — Healthcare data privacy, GDPR, audit trails
8. **Frontend Engineering** — Error boundaries, PWA, state management, a11y
9. **Notification System** — Queue-based delivery, retry logic, deduplication
10. **Operational Excellence** — Monitoring, logging, health checks, backups
