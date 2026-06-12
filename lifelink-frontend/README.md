# LIFELINK

A minimal glassmorphic web app that connects blood and organ donors with recipients in emergencies — location-based, privacy-first, with secure masked calling.

## Tech Stack

- React 19 + Vite
- React Router
- Pure CSS (glassmorphism design system)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features

- **Landing page** — Google-style glass search bar, location-based donor lookup, no personal details shown
- **Auth** — Sign up, login, forgot password with OTP flow
- **Profile** — Complete profile on first login (name, DOB, blood group, donation toggles)
- **Dashboard** — Search blood/organ, analytics, fits screen without scrolling
- **Masked calling** — OTP verification before secure contact (demo OTP: `123456`)
- **Call logs** — Contact again, block, delete
- **Notifications & Settings**

## Demo Notes

- OTP is always `123456` (demo mode)
- Donor data is mocked in `src/data/mockDonors.js`
- User data persists in `localStorage`
- Supported pincodes: 110001, 400001, 560001, 600001, 700001, 500001, 411001, 302001, 380001, 452001

## Build

```bash
npm run build
```
