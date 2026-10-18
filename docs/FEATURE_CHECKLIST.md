# AKR Credit Capital - Feature Traceability Checklist

This document maps every Scope of Work requirement from the CODTECH agreement (Sections 4 & 5) and the customer specifications to the delivered screens, routes, and test suites.

---

## 1. Scope of Work Section 4: Admin Panel

| S.No | SOW Requirement | Delivery Screen / Route | Test Coverage | Status |
|---|---|---|---|---|
| 4.1 | **Admin Authentication & Access Control** (Super Admin & Staff roles) | `/admin/login` | `e2e/acceptance.spec.ts` (Tests 1, 2, 3) | ✅ Complete |
| 4.2 | **Dashboard Overview** (Total consumers, outstanding, collections, upcoming EMIs, Recharts monthly bar & donut breakdown) | `/admin/dashboard` | `src/test/components.test.tsx` | ✅ Complete |
| 4.3 | **Report Exports** (Dues, Collections, EMI schedules to Excel/CSV and PDF) | `/admin/dashboard` (Export buttons via SheetJS & jsPDF) | Unit & E2E tested | ✅ Complete |
| 4.4 | **Consumer Management** (Search, filter by status, add, edit, deactivate, duplicate checks on email/mobile/account) | `/admin/consumers` | `src/core/validation`, Playwright E2E | ✅ Complete |
| 4.5 | **Consumer Detail & Plan Inspection** (Detailed dues, plan breakdown, payment ledger) | `/admin/consumers/:id` | Playwright E2E | ✅ Complete |
| 4.6 | **Dues & EMI Management** (Per-consumer multi-plan management, add plan, update outstanding, advance EMI dates) | `/admin/dues` | `src/core/domain/domain.test.ts`, E2E Test 5 | ✅ Complete |
| 4.7 | **Bulk CSV/Excel Upload** (Upsert by `account_number` + `plan_reference`, preview validation, downloadable sample template) | `/admin/dues` (Modal upload tab) | `src/core/validation`, Component tests | ✅ Complete |
| 4.8 | **EMI & Dues Types Master** (Add/edit plan types, enable/disable toggle, category icons) | `/admin/plan-types` | Domain tests, Admin layout | ✅ Complete |
| 4.9 | **Payments Ledger** (Filter by date, status, mode, consumer, plan type; export reports) | `/admin/payments` | E2E Test 5 | ✅ Complete |
| 4.10 | **Record Offline Payment** (Cash, cheque, bank transfer; plan selection; instant balance reduction) | `/admin/payments` (Offline entry modal) | `src/core/domain/domain.test.ts`, E2E Test 5 | ✅ Complete |
| 4.11 | **Card Types Management** (Add/edit/remove, data URL image upload, features, benefits, charges, enable/disable toggle) | `/admin/cards` | Admin layout & Consumer sync | ✅ Complete |
| 4.12 | **Push Notifications Dispatcher** (Send to single consumer or all; automated templates for balance, payment, EMI) | `/admin/notifications` | Consumer Notification sync | ✅ Complete |
| 4.13 | **Audit Activity Log** (Super Admin only; tracks timestamp, admin user, action, old/new values) | `/admin/activity-log` | E2E Test 3 (Staff RBAC guard) | ✅ Complete |

---

## 2. Scope of Work Section 5: Consumer Android App

| S.No | SOW Requirement | Delivery Screen / Route | Test Coverage | Status |
|---|---|---|---|---|
| 5.1 | **Splash Screen** (Brand gold shimmer animation, auto-session routing) | `/app/splash` | Unit & Router guards | ✅ Complete |
| 5.2 | **Consumer Login** (Phone 1: Email or 10-digit mobile number, password with eye toggle, Google sign-in mock) | `/app/login` | `src/test/components.test.tsx`, E2E Test 2 | ✅ Complete |
| 5.3 | **Sign Up Screen** (Full name, mobile, email, password, address, terms checkbox with Zod validation) | `/app/signup` | `src/core/validation` | ✅ Complete |
| 5.4 | **Forgot Password Flow** (Mobile/email prompt, 6-digit OTP verification `123456`, new password setup) | `/app/forgot-password` | Form validation & Mock handlers | ✅ Complete |
| 5.5 | **Home Screen** (Phone 2: Greeting, Total Outstanding card ₹24,850, Next EMI ₹4,250 on 25 Oct 2026, Due Soon badge, Quick Actions) | `/app/home` | E2E Test 4 & 5 | ✅ Complete |
| 5.6 | **Your Dues Multi-Plan List** (Horizontal carousel of individual dues plans with type icon, remaining amount, due date) | `/app/home` (`Your Dues` section) | `src/core/domain/domain.test.ts`, E2E Test 4 | ✅ Complete |
| 5.7 | **Pay Dues Screen** (Phone 3: Plan selector, breakdown: Principal + Interest + Fee = Total, Pay Next EMI / Full / Custom) | `/app/pay` | `src/core/domain/domain.test.ts`, E2E Test 4 | ✅ Complete |
| 5.8 | **Payment Gateway Placeholder** (`src/services/paymentGateway.ts`, simulated sheet for Success/Failure/Pending) | `/app/pay` (Modal simulation) | E2E Test 4 & 5 | ✅ Complete |
| 5.9 | **Payment Result Celebration** (Lottie/Confetti celebration, transaction reference, immediate balance deduction) | `/app/payment-result` | E2E Test 4 & 5 | ✅ Complete |
| 5.10 | **Payment History** (Phone 4: Grouped by month, status filters, plan type filters, download icons) | `/app/history` | Component tests, E2E Test 5 | ✅ Complete |
| 5.11 | **Tax Invoice & Receipt View** (Masked account, date, transaction ref, download PDF / print) | `/app/receipt/:id` | jsPDF export verification | ✅ Complete |
| 5.12 | **Cards Catalog Tab** (Admin-enabled cards: AKR Gold & AKR Platinum, visual credit card preview, features, charges) | `/app/cards` | Consumer layout tests | ✅ Complete |
| 5.13 | **Consumer Details / Profile** (Phone 5: Masked account `**** **** 4821`, EMI schedule per plan, editable fields) | `/app/profile` | Formatters & domain tests | ✅ Complete |
| 5.14 | **In-App Notifications** (Simulated push notifications for EMI reminders, payments, admin balance updates, unread dot) | `/app/notifications` | Store sync & notification dispatcher | ✅ Complete |

---

## 3. Non-Functional & Architecture Requirements

| Requirement | Implementation Details | Status |
|---|---|---|
| **Zero-Framework Domain Core** | `src/core/*` contains pure TS types, validation, formatters, and domain rules with 0 DOM/React imports for React Native reuse | ✅ 100% Complete |
| **Strict Identity & Route Separation** | Two storage keys (`akr_consumer_session`, `akr_admin_session`), 403 on cross-identity token usage in MSW, route guards block cross-access | ✅ 100% Complete |
| **Presentation Mode Flag** | `VITE_CONSUMER_PRESENTATION` defaults to `phone-frame` (centered 420px mobile frame) with seamless `responsive-web` switch | ✅ 100% Complete |
| **Realistic Latency & Network Simulation** | MSW adds 300–600ms artificial latency and DevToolbar includes a "Simulate Network Error" toggle | ✅ 100% Complete |
| **Pixel-Faithful Design System** | Tailwind theme configured with exact `#0B0B0C`, `#161617`, `#D4AF37`, Cormorant Garamond display font, and 16px/12px border radiuses | ✅ 100% Complete |
