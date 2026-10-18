# AKR Credit Capital - Mocked Services & Production Replacement Guide

This document lists all mocked infrastructure components in the prototype and provides a concise, production-ready replacement blueprint for each service.

---

## Summary of Mocked Services

1. **REST API Backend & Data Persistence (MSW + Zustand Store)**
2. **Payment Gateway (Mock Gateway Sheet in `src/services/paymentGateway.ts`)**
3. **Consumer & Admin Authentication (Mock JWT & Passwords)**
4. **Google Sign-In OAuth**
5. **SMS & Email OTP Delivery**
6. **Push Notifications Engine**
7. **File Storage for Card Images**

---

### 1. REST API Backend (Mock Service Worker)
- **Current Mock Implementation:** Mock Service Worker (`src/mocks/handlers.ts`) intercepts browser `fetch` calls to `/api/consumer/*` and `/api/admin/*` and syncs them to localStorage via a persisted Zustand store with 300–600ms latency.
- **How to Replace in Production:**
  1. Set environment variable `VITE_ENABLE_MOCKS=false` and set `VITE_API_BASE_URL=https://api.akrcredit.com`.
  2. Implement backend REST controllers in Node.js/NestJS, Spring Boot, or Python FastAPI following the exact shapes in `docs/API_CONTRACT.md`.
  3. Delete `src/mocks/` or keep it exclusively for offline unit/storybook tests. All frontend hooks in `src/core/api` will seamlessly connect to the production server without any UI refactoring.

---

### 2. Payment Gateway (Razorpay)
- **Current Mock Implementation:** `src/services/paymentGateway.ts` presents an interactive bottom sheet with "Simulate Success", "Simulate Failure", and "Simulate Pending" buttons. On success, it calls `/api/consumer/dues/pay` to update outstanding balances.
- **How to Replace in Production:**
  1. Install `razorpay` on the backend and load the Razorpay Checkout script in the web app or `@razorpay/react-native` in React Native.
  2. In `initiatePayment`, make a call to your backend `/api/payments/create-order` to generate a Razorpay `order_id` with currency `INR` and receipt ID.
  3. Launch `new window.Razorpay(options).open()`.
  4. On the client `handler` callback, send `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` to your backend verification endpoint (`/api/payments/verify`) which computes the HMAC-SHA256 hash using your Razorpay Key Secret. Update the consumer plan only upon webhook/signature validation.

---

### 3. Authentication & Session Management
- **Current Mock Implementation:** `consumerAuthService.ts` and `adminAuthService.ts` issue mock JWT tokens (`mock-jwt-consumer-...` and `mock-jwt-admin-...`) stored in separate `localStorage` keys (`akr_consumer_session` and `akr_admin_session`).
- **How to Replace in Production:**
  1. Replace with OAuth 2.0 / OpenID Connect or secure JWT issuance with HttpOnly, Secure, SameSite cookies.
  2. On the consumer side, validate phone number via OTP or password via bcrypt/argon2.
  3. On the admin side, enforce multi-factor authentication (MFA/TOTP) with strict RBAC claims (`role: super_admin | staff`) encoded into signed JWT access and refresh tokens.
  4. In React Native, persist the tokens in `expo-secure-store` or `react-native-keychain` rather than localStorage.

---

### 4. Google Sign-In
- **Current Mock Implementation:** Clicking "Continue with Google" simulates an OAuth handshake with a 600ms loading state and logs in as demo consumer Rahul Sharma.
- **How to Replace in Production:**
  1. Register an OAuth 2.0 Web Client ID in the Google Cloud Console.
  2. On the web prototype, integrate `@react-oauth/google` with `<GoogleLogin onSuccess={(credentialResponse) => ...} />`.
  3. On React Native, install `@react-native-google-signin/google-signin`.
  4. Send the returned Google ID token to backend endpoint `POST /api/consumer/auth/google`, where your server verifies the token with `google-auth-library`, checks or creates the consumer record in PostgreSQL/MongoDB, and returns your application session JWT.

---

### 5. SMS & Email OTP Delivery
- **Current Mock Implementation:** The Forgot Password screen prompts for an OTP and accepts any 6 digits with a hint `123456`.
- **How to Replace in Production:**
  1. Integrate an SMS gateway provider such as Twilio, AWS SNS, MSG91, or Fast2SMS with DLT-registered templates for Indian numbers (+91).
  2. For email, configure AWS SES, SendGrid, or Postmark.
  3. Backend endpoint `POST /api/consumer/auth/otp/send` generates a cryptographically secure 6-digit code, hashes it with a 5-minute TTL in Redis, and dispatches the SMS/email.
  4. Endpoint `POST /api/consumer/auth/otp/verify` verifies the hash and issues a temporary password-reset token.

---

### 6. Push Notifications
- **Current Mock Implementation:** Notifications triggered by admin updates, payments, or manual dispatches are appended to the Zustand store and rendered in `/app/notifications` with an unread badge counter.
- **How to Replace in Production:**
  1. On Android/React Native, configure Firebase Cloud Messaging (FCM) using `@react-native-firebase/messaging` or Expo Notifications.
  2. In the consumer app, request push permissions upon login and register the device FCM token via `POST /api/consumer/device-token`.
  3. On the backend, use `firebase-admin` SDK to broadcast notifications to consumer device tokens when EMIs are due (cron job), payments succeed, or admin announcements are sent.

---

### 7. File Storage for Card Images
- **Current Mock Implementation:** Admin card management encodes uploaded PNG/JPEG images as Base64 Data URLs and stores them directly in the entity state.
- **How to Replace in Production:**
  1. Set up an Amazon S3 bucket, Cloudflare R2, or Google Cloud Storage bucket with a CDN (CloudFront / Cloudflare).
  2. In `POST /api/admin/cards/upload-url`, request a presigned PUT URL from S3.
  3. Upload the image directly from the browser/app to S3, and store the resulting public HTTPS CDN URL in the database record.
