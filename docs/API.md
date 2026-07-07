# LifeLink API Documentation

## Base URL
- Development: `http://localhost:5000/api`
- Production: `https://blood-and-organ-donar-matching-system.onrender.com/api`

## Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Auth Routes (`/api/auth`)

### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "1234567890",
  "password": "password123"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "user": { "..." },
  "token": "jwt-token"
}
```

### POST `/api/auth/login`
Login with email/phone and password.

**Request Body:**
```json
{
  "identifier": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "user": { "..." },
  "token": "jwt-token"
}
```

### POST `/api/auth/google`
Login/Register with Google OAuth.

**Request Body:**
```json
{
  "credential": "google-id-token"
}
```

### POST `/api/auth/forgot-password`
Send OTP for password reset.

**Request Body:**
```json
{
  "identifier": "user@example.com"
}
```

### POST `/api/auth/reset-password`
Reset password with OTP.

**Request Body:**
```json
{
  "identifier": "user@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

### GET `/api/auth/me` (Protected)
Get current user profile.

### PUT `/api/auth/profile` (Protected)
Update user profile.

**Request Body:**
```json
{
  "name": "John Doe",
  "bloodGroup": "O+",
  "donateBlood": true,
  "lat": 18.5204,
  "lng": 73.8567,
  "city": "Pune"
}
```

### POST `/api/auth/delete` (Protected)
Delete user account.

### POST `/api/auth/block/:donorId` (Protected)
Block a donor.

### POST `/api/auth/unblock/:donorId` (Protected)
Unblock a donor.

---

## Donor Routes (`/api/donors`)

### POST `/api/donors` (Protected)
Register as a donor.

### GET `/api/donors` (Protected)
Get all donors (with pagination).

**Query Params:** `page`, `limit`

### GET `/api/donors/me` (Protected)
Get current donor profile.

### PUT `/api/donors/me` (Protected)
Update donor profile.

### GET `/api/donors/blood/:group` (Protected)
Get donors by blood group.

---

## Hospital Routes (`/api/hospitals`)

### POST `/api/hospitals` (Protected)
Register as a hospital.

### GET `/api/hospitals` (Protected)
Get all hospitals.

### GET `/api/hospitals/me` (Protected)
Get current hospital profile.

---

## Request Routes (`/api/requests`)

### POST `/api/requests` (Protected - Hospital)
Create a new donation request.

### GET `/api/requests` (Protected)
Get all requests.

### GET `/api/requests/mine` (Protected)
Get requests created by current user.

### POST `/api/requests/donor` (Protected)
Create a donor-initiated request.

### PATCH `/api/requests/:id` (Protected - Hospital)
Update request status.

---

## Search Routes (`/api/search`)

### GET `/api/search/donors` (Protected)
Search donors with filters.

**Query Params:** `type`, `query`, `lat`, `lng`

### GET `/api/search/:id` (Protected)
Get donor by ID.

---

## Notification Routes (`/api/notifications`)

### GET `/api/notifications` (Protected)
Get user notifications.

### DELETE `/api/notifications` (Protected)
Clear all notifications.

### PATCH `/api/notifications/:id/read` (Protected)
Mark notification as read.

### POST `/api/notifications/read-all` (Protected)
Mark all notifications as read.

---

## Chat Routes (`/api/chat`)

### GET `/api/chat` (Protected)
Get chat list with conversations.

### GET `/api/chat/:userId` (Protected)
Get chat history with a user.

### POST `/api/chat/:userId/send` (Protected)
Send a message.

**Request Body:**
```json
{
  "text": "Hello!"
}
```

### POST `/api/chat/:userId/read` (Protected)
Mark messages as read.

### POST `/api/chat/:userId/typing` (Protected)
Send typing indicator.

### POST `/api/chat/:userId/stop-typing` (Protected)
Stop typing indicator.

---

## Call Log Routes (`/api/calls`)

### GET `/api/calls` (Protected)
Get call logs.

### POST `/api/calls` (Protected)
Create a call log.

### DELETE `/api/calls/:id` (Protected)
Delete a call log.

---

## Dashboard Routes (`/api/dashboard`)

### GET `/api/dashboard/stats` (Protected)
Get dashboard statistics.

### GET `/api/dashboard/blood-distribution` (Protected)
Get blood group distribution.

### GET `/api/dashboard/monthly-trends` (Protected)
Get monthly donation trends.

### GET `/api/dashboard/organ-summary` (Protected)
Get organ donation summary.

---

## SSE Endpoint (`/api/stream`)

### GET `/api/stream?token=<jwt>`
Server-Sent Events endpoint for real-time notifications.

**Events:**
- `connect` - Connection established
- `online-users` - List of online user IDs
- `new-notification` - New notification received
- `new-request` - New donation request
- `receive-message` - New chat message
- `message-sent` - Message sent confirmation
- `user-typing` - User is typing
- `user-stop-typing` - User stopped typing
- `messages-read` - Messages marked as read
