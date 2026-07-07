# LifeLink Architecture

## System Overview

LifeLink is a Blood and Organ Donor Matching System that connects donors with hospitals and patients in need.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │ Dashboard│  │   Chat   │  │  Search  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Axios)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Express.js)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │  Donors  │  │ Requests │  │   Chat   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Hospital │  │  Search  │  │ Dashboard│  │   SSE    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (MongoDB)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   User   │  │  Donor   │  │ Hospital │  │ Request  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │Notification│ │ Message  │  │ CallLog  │                     │
│  └──────────┘  └──────────┘  └──────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### User
- `email` (unique)
- `phone` (unique, sparse)
- `password` (hashed)
- `googleId` (for OAuth)
- `role` (donor/hospital/admin)
- `profileComplete` (boolean)
- `profile` (embedded document)
- `blockedIds` (array)
- `fcmToken` (for push notifications)

### Donor
- `user` (ref to User)
- `donorType` (blood/organ)
- `bloodGroup`
- `organType`
- `available` (boolean)
- `location` (GeoJSON)

### Hospital
- `user` (ref to User)
- `hospitalName`
- `phone`
- `city`
- `address`

### Request
- `requestType` (blood/organ)
- `bloodGroup`
- `organType`
- `units`
- `city`
- `hospital` (ref to Hospital)
- `status` (Pending/Matched/Fulfilled/Cancelled)
- `matchedDonor` (ref to Donor)
- `isEmergency`
- `urgencyLevel`

### Message
- `sender` (ref to User)
- `receiver` (ref to User)
- `text`
- `read` (boolean)

### Notification
- `user` (ref to User)
- `title`
- `message`
- `type` (info/success/error/match/emergency)
- `read` (boolean)
- `redirect` (URL)

### CallLog
- `user` (ref to User)
- `contactId`
- `type` (incoming/outgoing)
- `status` (completed/missed)

---

## Authentication Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │────▶│ Backend │────▶│ MongoDB │
└─────────┘     └─────────┘     └─────────┘
     │               │
     │  1. POST /auth/login
     │──────────────▶│
     │               │  2. Validate credentials
     │               │──────────────▶
     │               │◀──────────────
     │  3. Return JWT
     │◀──────────────│
     │
     │  4. Request with JWT
     │──────────────▶│
     │               │  5. Verify JWT
     │               │  6. Return data
     │◀──────────────│
```

---

## Real-Time Communication

### SSE (Server-Sent Events)
- Endpoint: `/api/stream?token=<jwt>`
- Used for: Notifications, online status, chat events
- Events: `connect`, `online-users`, `new-notification`, `receive-message`, etc.

### Chat Flow
```
User A                    Backend                    User B
  │                         │                         │
  │  POST /chat/B/send      │                         │
  │────────────────────────▶│                         │
  │                         │  SSE: receive-message   │
  │                         │────────────────────────▶│
  │  SSE: message-sent      │                         │
  │◀────────────────────────│                         │
```

---

## Matching Algorithm

### Hospital-Initiated Request
1. Hospital creates request with blood group/organ type
2. System searches `Donor` collection for available matches
3. System also searches `User.profile` for profile-based donors
4. Matched donors receive notifications
5. First match is automatically assigned

### Donor-Initiated Request
1. Donor/user creates request
2. System searches `User.profile` for matching donors
3. Matching donors receive notifications

---

## Deployment

### Docker Compose (Local Development)
```bash
docker-compose up
```

Services:
- MongoDB: `localhost:27017`
- Backend: `localhost:5000`
- Frontend: `localhost:5173`

### Vercel (Frontend)
- Auto-deploys from `lifelink-frontend/` directory
- API proxy rewrites to backend

### Render (Backend)
- Deploys from `backend/` directory
- Environment variables configured in Render dashboard

---

## Security Features

1. **JWT Authentication** - Stateless token-based auth
2. **Field Allowlisting** - Prevents mass assignment attacks
3. **Rate Limiting** - Prevents brute force attacks
4. **CORS Configuration** - Restricts allowed origins
5. **Input Validation** - Joi schemas for API inputs
6. **Password Hashing** - bcrypt with 10+ rounds
7. **Non-root Docker** - Runs as appuser in containers
8. **Error Handling** - Never exposes stack traces in production
