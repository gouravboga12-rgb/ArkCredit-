# Screens Documentation & Mockup Mapping

This document provides a breakdown of every screen in the AKR Credit Capital application, its business purpose, data dependencies, and its exact mapping to the attached 5-phone visual template.

---

## Consumer Android App Screens

### 1. Splash Screen (`/app/splash`)
- **Visual Match:** Initial brand entry.
- **Purpose:** Brand reinforcement with luxury gold shimmer and animated pulse. Automatically routes to `/app/home` if an active consumer session exists in storage, or `/app/login` after 1.5 seconds.
- **Data Source:** `useStore.consumerSession`.

### 2. Login Screen (`/app/login`)
- **Visual Match:** **Phone 1 in template** ("Welcome Back").
- **Purpose:** Consumer authentication.
- **Fields:** Single identifier field supporting either email address or 10-digit Indian mobile number (`^[6-9]\d{9}$`), password with eye reveal toggle.
- **Actions:**
  - "Sign In" (Gold button)
  - "Continue with Google" (Simulates fast 1-click login as demo consumer Rahul Sharma)
  - "Forgot Password?" (Navigates to `/app/forgot-password`)
  - "Create Account" (Outline gold button navigating to `/app/signup`)
- **Data Source:** Intercepted by `POST /api/consumer/auth/login`.

### 3. Sign Up Screen (`/app/signup`)
- **Visual Match:** Consumer onboarding.
- **Purpose:** Full registration workflow collecting Full Name, 10-digit Mobile Number, Email, Password, Confirm Password, Optional Address, and Terms checkbox.
- **Validation:** Zod schema with phone number regex, email format, and password confirmation matching.
- **Data Source:** Intercepted by `POST /api/consumer/auth/signup`.

### 4. Forgot Password Flow (`/app/forgot-password`)
- **Visual Match:** Account recovery.
- **Purpose:** 3-step security verification:
  1. Identifier entry (email or mobile)
  2. 6-Digit OTP verification (accepts any 6 digits; hints `123456`)
  3. New password creation and confirmation.
- **Data Source:** `POST /api/consumer/auth/forgot-password`, `POST /api/consumer/auth/verify-otp`, `POST /api/consumer/auth/reset-password`.

### 5. Home Screen (`/app/home`)
- **Visual Match:** **Phone 2 in template**.
- **Purpose:** Primary financial dashboard.
- **Components & Hierarchy:**
  - **Header:** Small AKR Credit Capital logo, notification bell with red unread indicator, and profile initial avatar.
  - **Greeting:** "Hello, Rahul Sharma 👋" with tagline "Your financial journey matters to us."
  - **Outstanding Amount Card:** Signature card with gold border and ambient glow. Renders total outstanding balance of **₹24,850**, "Due Soon" badge, Next EMI amount **₹4,250**, due date **25 Oct 2026**, and chevron opening Pay Dues.
  - **Your Active Dues:** Horizontal list of consumer's multi-plan portfolio (Personal Loan EMI ₹17,000, AKR Gold Card EMI ₹6,350, Annual Service Maintenance ₹1,500). Tapping any card opens Pay Dues preselected on that plan.
  - **Quick Actions:** 4 circular icons matching Phone 2:
    - *Pay Now* (Direct to repayment)
    - *Payment History* (Direct to ledger)
    - *Cards* (Direct to credit cards catalogue)
    - *More* (Opens bottom sheet with Consumer Details, Notifications, and Priority Support)
  - **Recent Activity:** Last 3 transactions with green checkmark circles, title, date, amount, and "Success" pill, with "View All" link to Payment History.
  - **Bottom Navigation:** Fixed tabs (Home, Payments, Cards, Profile).
- **Data Source:** `GET /api/consumer/dues` and `GET /api/consumer/payments`.

### 6. Pay Dues Screen (`/app/pay`)
- **Visual Match:** **Phone 3 in template**.
- **Purpose:** Full settlement and repayment flow.
- **Sections:**
  - **Plan Selector:** Dynamic chips allowing consumer to pay individual plans or choose "Pay All Dues".
  - **Top Summary:** Total Outstanding ₹24,850, Next EMI ₹4,250, Due Date 25 Oct 2026.
  - **Payment Breakdown:** Principal, Interest, Processing Fee, Total (Breakdowns always add up mathematically). For "Pay All", renders live allocation preview.
  - **Amount Options:** Radio buttons for "Pay Next EMI", "Pay Full Outstanding", or "Custom Amount" (validated against balance cap).
  - **Payment Methods:** Selectable cards for UPI, Debit/Credit Card, and Net Banking.
  - **Security Notes:** "Your payment is secure and encrypted" and "100% Safe & Trusted".
  - **Mock Payment Gateway Sheet:** Razorpay placeholder dialog with "Simulate Success", "Simulate Failure", and "Simulate Pending".
  - **Celebration Result Screen:** Animated success checkmark, confetti explosion, transaction ref, and "Download Receipt" CTA.
- **Data Source:** `POST /api/consumer/payments/initiate`.

### 7. Payment History Screen (`/app/history`)
- **Visual Match:** **Phone 4 in template**.
- **Purpose:** Historical repayment ledger.
- **Features:**
  - Filters row: Transaction type dropdown (All, EMI Payment, Card Payment) and Date range (Last 1 month, 3 months, 6 months, 1 year, All).
  - Search input filtering by UTR reference or amount.
  - Grouped under monthly headers (October 2026, September 2026, August 2026) matching Phone 4.
  - Each item shows transaction icon, plan title, date, amount, "Success" status badge, and receipt download icon.
- **Data Source:** `GET /api/consumer/payments`.

### 8. Receipt Screen (`/app/receipt/:id`)
- **Visual Match:** Official proof of payment.
- **Features:** Printable luxury receipt card with AKR logo, receipt number, consumer name, masked account number, payment mode, transaction ref, and timestamp. Includes 1-click **Download PDF** button powered by `jspdf`.
- **Data Source:** `useStore.payments` and `useStore.consumers`.

### 9. Cards Screen (`/app/cards`)
- **Visual Match:** Expands Phone 5 "Your Cards" carousel into full tab.
- **Features:** Shows all enabled credit card types (AKR Gold Card, AKR Platinum) with metallic gradients, VISA marks, features list, fees, and "Enquire Now" toast interaction. Disabled cards in admin panel disappear immediately.
- **Data Source:** `GET /api/consumer/cards`.

### 10. Consumer Details / Profile Screen (`/app/profile`)
- **Visual Match:** **Phone 5 in template**.
- **Sections:**
  - **Account Block:** Masked account number `**** **** 4821` with copy button, account holder name, and gold wave graphic.
  - **EMI Schedule:** Next EMI amount ₹4,250, due date 25 Oct 2026 with "Due Soon" badge, Total EMIs, Remaining 18, and Loan Tenure 36 Months. "View All" button opens full multi-plan schedule modal.
  - **Dues Summary:** Total Outstanding ₹24,850, Next Due, and individual plan breakdown.
  - **Your Cards Carousel:** Horizontal cards carousel with indicator dots.
  - **Profile Information:** Modal allowing editing of name, email, and address (mobile and account number remain strictly read-only for KYC integrity).
  - **Notification Preferences:** Toggle switches for Push, SMS, and Email alerts.
  - **Sign Out:** Secure consumer logout button.
- **Data Source:** `GET /api/consumer/dues`, `GET /api/consumer/cards`, and `PUT /api/consumer/profile`.

### 11. Notifications Screen (`/app/notifications`)
- **Visual Match:** In-app alert notification center.
- **Features:** Lists EMI reminders, payment confirmation receipts, and balance update alerts. Features unread dots, time formatting, and "Mark all read" button.
- **Data Source:** `GET /api/consumer/notifications` and `PUT /api/consumer/notifications/read-all`.

---

## Admin Web Panel Modules

1. **Dashboard (`/admin/dashboard`):** Real-time financial metrics, collections trend bar chart, portfolio settlement ratio pie chart, and 1-click Excel exports for dues and collections.
2. **Consumer Management (`/admin/consumers`):** Searchable and filterable directory (desktop table, mobile cards). Supports registering new consumers, duplicate prevention, editing, deactivation, and detailed profile modal.
3. **Dues & EMI Management (`/admin/dues`):** Individualized multi-plan management. Supports adding plans, editing balances, and bulk CSV/Excel upsert with drag-and-drop file upload, preview, and sample template download.
4. **EMI & Dues Types (`/admin/plan-types`):** Master configuration of loan, card, and bill categories.
5. **Payments Ledger (`/admin/payments`):** Real-time audit of all transactions and "Record Offline Payment" form requiring plan selection.
6. **Card Management (`/admin/cards`):** Product management with image upload and live visibility toggle.
7. **Notification Center (`/admin/notifications`):** Push alert dispatcher with pre-built automated templates.
8. **Activity Log (`/admin/activity-log`):** Immutable audit trail (Super Admin only) tracking all operations.
