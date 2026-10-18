# AKR Credit Capital — Consumer Dues & EMI Management App

> **Tagline:** Building Possibilities Together  
> **Client Brand:** AKR Credit Capital  
> **Built by:** CODTECH PRIVATE LIMITED  
> **Project Type:** High-Fidelity Prototype & Interactive Showcase (with typed REST contracts for React Native handover)

---

## 1. Overview & Prototype Purpose

This repository contains a full-stack, mobile-first prototype designed to showcase the complete consumer repayment and business administration workflows of **AKR Credit Capital**.

It serves two distinct purposes:
1. **Customer Showcase:** A clickable, interactive experience faithfully recreating the 5-phone black & gold design mockup and Scope of Work modules.
2. **Developer Handover Foundation:** Cleanly decoupled architecture with typed domain calculations (`src/core/domain`), zero-framework data models (`src/core/types`), and real browser-intercepted REST endpoints (`/api/consumer/*` and `/api/admin/*` via MSW) that allow a future developer or AI agent to swap the mock layer for a production backend without modifying the UI components.

> [!NOTE]  
> **Exclusion Notice:** Per the CODTECH Scope of Work document, a customer-facing public marketing website is an exclusion. Serving the consumer app UI inside a web browser here is strictly for prototype demonstration purposes. The primary final consumer target is an Android application (to be ported to React Native).

---

## 2. Quick Start

### Prerequisites
- Node.js `v20+` or `v22+`
- npm `10+`

### Installation & Launch
```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev
```

Visit: **`http://localhost:5173`**

### Available Scripts
- `npm run dev` — Launches Vite dev server at port 5173 with MSW active
- `npm run build` — Typechecks and builds production distribution bundle
- `npm run typecheck` — Runs strict TypeScript compiler check (`tsc --noEmit`)
- `npm run test` — Executes Vitest domain & component unit tests
- `npm run test:e2e` — Runs Playwright end-to-end acceptance tests

---

## 3. Demo Credentials

The prototype enforces **strict identity separation** between consumer and administrative accounts. An account from one portal can never sign in to the other portal.

### Consumer App (`/app/login`)
- **Email:** `rahul@example.com`
- **Mobile Number:** `9876543210`
- **Password:** `Demo@123`
- *Features Google Sign-In button for instant 1-click authentication.*

### Admin Panel (`/admin/login`)
- **Super Admin:** `admin@akr.com` / `Admin@123` (Full system access: deletions, activity log, user management)
- **Staff Admin:** `staff@akr.com` / `Staff@123` (Dues updates, offline payment recording, notification dispatch)

---

## 4. Route Map & Architecture

```
/                             Landing Page (Entry portal & architecture overview)
├── /app                      Consumer Android App Showcase (Centered 420px Phone Frame)
│   ├── /app/splash           Splash screen with brand shimmer
│   ├── /app/login            Consumer sign-in (Email or 10-digit Mobile)
│   ├── /app/signup           Consumer registration with Zod validation
│   ├── /app/forgot-password  3-step password recovery (Email/Mobile -> OTP -> New Pass)
│   ├── /app/home             Home dashboard (₹24,850 dues, active plans, quick actions)
│   ├── /app/pay              Pay Dues (Plan selector, breakdown, UPI/Card/NetBanking)
│   ├── /app/history          Payment History grouped by month headers
│   ├── /app/receipt/:id      Transaction Receipt (PDF export & share)
│   ├── /app/cards            Live catalogue of enabled credit cards
│   ├── /app/profile          Consumer details, EMI schedule modal, profile edit
│   └── /app/notifications    In-app alerts, EMI reminders, payment confirmations
│
└── /admin                    Responsive Business Administration Panel
    ├── /admin/login          Secure admin sign-in
    ├── /admin/dashboard      Financial KPIs, collections charts, upcoming EMIs
    ├── /admin/consumers      Consumer directory, duplicate checks, profile drawer
    ├── /admin/dues           Multi-plan management & Bulk CSV/Excel upsert
    ├── /admin/plan-types     Master instrument types (Loan EMI, Card EMI, etc.)
    ├── /admin/payments       Collections ledger & Record Offline Payment
    ├── /admin/cards          Credit card catalogue management & live visibility toggle
    ├── /admin/notifications  Push notification dispatcher (Broadcast & Targeted)
    └── /admin/activity-log   Audit trail (Super Admin only)
```

---

## 5. Consumer Presentation Modes

Controlled via `.env` flag: `VITE_CONSUMER_PRESENTATION`:

| Value | Behavior |
| :--- | :--- |
| `phone-frame` *(Default)* | On desktop screens, renders a centered 420px luxury smartphone frame with status bar (9:41, wifi, battery) and punch-hole camera. Renders full-screen automatically on mobile browsers. |
| `responsive-web` | Removes the phone frame wrapper and lets the consumer layout adapt responsively to full desktop and tablet widths. |

---

## 6. Real-Time Cross-Portal Data Synchronization

Both the Consumer App and Admin Panel read and write to the same persisted storage layer (`akr_credit_capital_data_store`):
1. **Instant Dues Updates:** When an admin edits Rahul Sharma's loan EMI date or adds a new Card EMI plan, the change is reflected **immediately** upon opening or refreshing the Consumer App.
2. **Instant Payment Reconciliation:** When a consumer completes a simulated payment in the mobile app, the payment appears **immediately** in the Admin Payments Ledger (`/admin/payments`) and updates the dashboard metrics.
3. **Card Visibility Switch:** Toggling a card's "Enabled" switch in the admin panel instantly adds or hides that card from the consumer app's Cards tab.

---

## 7. Resetting Demo Data

A floating **Demo Toolbar** is available on all screens (toggleable via `VITE_DEMO_TOOLBAR`):
- Click **"Reset All Demo Data"** to clear storage and reseed default data (25 consumers, Rahul Sharma's 3 plans totaling ₹24,850, 6 months of payments, and cards).
- Use the **"Simulate Network Error"** toggle to test network resilience and UI error states.

---

## 8. Documentation Index

For in-depth specifications, consult the documents in `/docs`:
- [`docs/SCREENS.md`](file:///docs/SCREENS.md) — Screen-by-screen breakdown and mockup mapping
- [`docs/API_CONTRACT.md`](file:///docs/API_CONTRACT.md) — Formal REST specification for `/api/consumer/*` and `/api/admin/*`
- [`docs/FEATURE_CHECKLIST.md`](file:///docs/FEATURE_CHECKLIST.md) — CODTECH Scope of Work traceability matrix
- [`docs/MOCKED_SERVICES.md`](file:///docs/MOCKED_SERVICES.md) — Exhaustive list of mocked services and production replacement guides
- [`docs/REACT_NATIVE_MIGRATION.md`](file:///docs/REACT_NATIVE_MIGRATION.md) — Component & library migration guide to React Native
- [`docs/RAZORPAY_INTEGRATION.md`](file:///docs/RAZORPAY_INTEGRATION.md) — Step-by-step Razorpay payment gateway integration guide
- [`docs/DUES_PLANS.md`](file:///docs/DUES_PLANS.md) — Multi-plan data models, Pay All allocation algorithm, and CSV format
- [`docs/DELIVERY_OPTIONS.md`](file:///docs/DELIVERY_OPTIONS.md) — Standalone deployment guide for consumer mobile, admin web, and unified delivery
