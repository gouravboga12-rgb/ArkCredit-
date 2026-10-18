# AKR Credit Capital: Prototype Build Brief

You are a senior full-stack frontend engineer. I want you to build a clickable, fully working prototype of a consumer dues and EMI management product for **AKR Credit Capital** (tagline: *Building Possibilities Together*). It is being built by CODTECH Private Limited.

This prototype has two jobs:

1. **Show the customer** exactly how the product will look and behave.
2. **Act as a working reference** that another developer can pick up and continue with their own AI coding agent, without having to rebuild features.

Please read this whole brief before writing any code.

---

## 1. Files I have attached (treat them as the source of truth)

- **The Scope of Work PDF** (CODTECH). Follow section 4 (Admin Panel) and section 5 (Consumer Android App) exactly. Don't invent features outside it, apart from the prototype helpers I describe below.
- **The 5-phone template image** (Login, Home, Pay Dues, Payment History, Consumer Details). Reproduce this design faithfully: the black-and-gold theme, the card styles, the spacing, the information hierarchy and the bottom navigation.
- **The AKR Credit Capital logo** (gold on black). Use it on the splash screen, the login screen and the app header. If I haven't supplied a transparent PNG or SVG yet, use a gold text placeholder in the same style and keep it easy to swap (`src/assets/logo`).

---

## 2. What the product is

There are two sides:

- **Consumer side.** Customers log in, see their outstanding amount and next EMI, pay dues, view payment history and receipts, browse card types, and manage their profile and notifications.
- **Admin side.** The business team logs in to a web panel to manage consumers, update each consumer's outstanding amount, total payment due, next EMI date and EMI amount, view payments, manage card types, and see dashboards and reports. Whatever the admin changes shows up instantly on the consumer side.

### How each side is delivered in real life

- **Admin:** a website only. It's never an app.
- **Consumer:** an **Android app first**. Later, the next developer may also offer it as a website. That is their decision, not mine, so the consumer side must work well both as an app-style UI and as a responsive website.

### How I want it delivered in this prototype

For the prototype, **both sides run inside one website** so the customer can see everything in one place. This is only a showcase choice. To support that:

- Build the consumer side **mobile-first and fully responsive** (360px up to 1280px and wider).
- Add one config flag, `VITE_CONSUMER_PRESENTATION`, with two values:
  - `phone-frame`: on desktop, show the consumer app inside a centered phone frame about 420px wide. On a real phone, show it full screen. **This is the default for the demo.**
  - `responsive-web`: no frame; the layout adapts (bottom navigation on mobile, top bar or sidebar on wide screens).
- The phone frame must be a thin wrapper component that can be deleted without touching any screen.
- Keep the consumer and admin code **decoupled** so the next developer can ship only the consumer app, only the admin website, or both.
- Put all pure logic (types, validation, business rules, API client, formatters) in a shared `src/core` folder that has **no React or browser dependencies**, so it can be reused in React Native.

Note: the Scope of Work lists a "customer-facing website" as an exclusion. Showing the consumer UI in the browser is only for this demo. Please say so in the README.

---

## 2A. Multiple EMIs and dues per consumer (important)

A consumer can have **several different EMIs or dues at the same time**: a loan EMI, a card EMI, a credit card bill, or any other type. The **admin decides** which types exist, which ones each consumer has, and the amounts. The consumer app must show exactly those and let the consumer pay them, with every payment updating the right one.

- **Plan types** (an admin-managed list): Loan EMI, Card EMI, Credit Card Bill and Other Dues, to start with. The admin can add, edit and disable types without any code change.
- **Dues plans:** one dues item belonging to one consumer and one plan type. Each plan has its own outstanding amount, breakdown (principal, interest, processing fee), EMI amount, next EMI date, total and remaining EMIs, tenure, an optional linked card, a reference number and a status (active or closed). A consumer can have zero, one or many active plans.
- **Totals are derived.** The consumer's total outstanding is the sum of their active plans. The "Next EMI" on Home is the plan (or plans) with the earliest next EMI date, shown as the combined amount due that day.
- **Paying is always against a specific plan**, or "Pay All", which spreads the payment across plans (earliest due date first) and creates one payment record per plan with a shared transaction reference.
- A plan whose outstanding reaches zero is closed automatically and disappears from Pay Dues.
- Anything the admin creates, edits, closes or reassigns shows up in the consumer app immediately, sends a balance-update notification and is written to the Activity Log.

---

## 3. Tech stack

- React 18, Vite, TypeScript (strict mode)
- Tailwind CSS, with design tokens in `tailwind.config.js` (no hardcoded colors in components)
- `react-router-dom` v6
- Zustand (persisted to localStorage) as the data store behind the mock API
- `react-hook-form` and `zod` for forms
- `lucide-react` for icons
- `recharts` for admin charts
- `papaparse` and `xlsx` (SheetJS) for CSV and Excel
- `date-fns` for dates
- **MSW (Mock Service Worker)** to fake the backend
- Vitest, React Testing Library and Playwright for tests

---

## 4. How the fake backend must work (important)

I don't want the UI to talk straight to the store. Instead:

1. Build a typed **API client** in `src/core/api` that makes real `fetch()` calls to REST endpoints under `/api/consumer/*` and `/api/admin/*`.
2. Intercept those calls in the browser with **MSW handlers** backed by the persisted store.
3. Use realistic status codes (200, 201, 400, 401, 403, 404, 409, 422) and error bodies.
4. Add 300-600ms artificial latency, plus a dev switch to simulate network errors so the loading and error states can be tested.
5. Enable MSW only when `VITE_ENABLE_MOCKS=true`.

The goal: the next developer deletes the MSW handlers, sets `VITE_API_BASE_URL` to the real server, and the whole UI keeps working, because the request and response shapes are already the final contract. Document every endpoint in `docs/API_CONTRACT.md`.

---

## 5. Two completely separate account types (important)

Consumer accounts and admin accounts are different identity types. **An account of one type must never be able to sign in to, or open any page of, the other side.**

**Routes**

- `/` is a public prototype landing page with two buttons: "Open Consumer App" (goes to `/app/login`) and "Open Admin Panel" (goes to `/admin/login`).
- `/app/*` is the consumer app only. Its pages are `/app/login`, `/app/signup`, `/app/forgot-password`, and the rest.
- `/admin/*` is the admin panel only. Its login is `/admin/login`. Everything else under `/admin/*` needs a logged-in admin.

**Separate authentication**

- Keep two separate user lists (`consumers` and `adminUsers`). Never merge them.
- Use two auth services: `consumerAuthService` and `adminAuthService`.
- Use two session storage keys (for example `akr_consumer_session` and `akr_admin_session`). Logging out of one must not log out the other.
- Each session carries `userType` (`consumer` or `admin`), and admins also carry `role` (`super_admin` or `staff`).
- Tokens are mock JWT-style, sent in an `Authorization` header. The server side rejects a consumer token on `/api/admin/*` and an admin token on `/api/consumer/*` with a 403.

**Route guards**

- Create `ConsumerRoute` and `AdminRoute` wrapper components.
- `ConsumerRoute` redirects to `/app/login` when there's no consumer session. `AdminRoute` redirects to `/admin/login` when there's no admin session (never to the consumer login).
- Guards run on every navigation, including typed URLs and the browser back and forward buttons.
- A logged-in user who visits their own login page is redirected to their own home.

**Cross-login rules**

- Admin credentials on `/app/login` must fail with the normal "Invalid credentials" message. Don't reveal that the account exists on the other side. Same the other way round.
- "Continue with Google" exists **only** on the consumer side.
- Admin login has no Google option and no sign-up. Admins are created only by a Super Admin inside the panel.

**Roles**

- `super_admin`: full access, including deleting consumers and card types, managing admin users, and viewing the activity log.
- `staff`: can view and update dues, record payments and manage notifications, but can't delete consumers or card types or manage admins.
- Enforce this in the route guards too, not only by hiding menu items.

**UI and data separation**

- Use different layout components: `ConsumerLayout` and `AdminLayout`. Neither reuses the other.
- No admin links anywhere inside `/app/*`, and no consumer navigation inside `/admin/*`.
- A consumer can only read and write their own records. The consumer ID comes from the session, never from a URL parameter.
- Add an ESLint rule (`no-restricted-imports`) so consumer feature code can't import admin code.
- In the future real backend these become separate API namespaces, `/api/consumer/*` and `/api/admin/*`. Document this in the API contract.

---

## 6. Design system

A premium dark fintech look in black and gold.

- Colors: background `#0B0B0C`, surface `#161617`, light surface `#F7F5F0`, gold `#D4AF37` with a gold gradient (`#F3D98B` to `#C99A2E`), success `#2E9E5B`, warning `#E0A526`, danger `#D64545`.
- Rounded corners: 16px on cards, 12px on buttons.
- Fonts: a serif display font (Cormorant Garamond or Playfair Display) for the brand and headings, and Inter for everything else. Amounts are bold and large.
- Currency is INR with Indian number formatting, for example ₹24,850.

Build these reusable components: GoldButton, OutlineGoldButton, GoogleButton, InputField (with icon, password eye toggle and error state), StatusBadge (Success, Pending, Failed, Due Soon), AmountCard, ListRow, BottomNav (Home, Payments, Cards, Profile), PageHeader, CardTypeCard (credit-card style with a VISA mark and feature bullets), Modal or BottomSheet, Toast, EmptyState and Skeleton loaders.

The admin panel uses the same branding. A light content area is fine for readability. On desktop it has a sidebar; on mobile it has a collapsible drawer and stacked cards instead of wide tables.

---

## 7. Consumer app screens

Bottom tabs: **Home, Payments, Cards, Profile**. Pay Dues, Payment History, Receipt and Consumer Details are stack screens.

1. **Splash.** Logo on black with a gold shimmer for about 1.5 seconds, then go to login (or home if a session exists).

2. **Login** (first phone in the template).
   - One identifier field that accepts either an email or a 10-digit mobile number. Validate whichever format is entered.
   - Password field with a show/hide eye.
   - Buttons and links: Sign In (gold), Continue with Google (mocked: logs in as the demo consumer after a short loading state), Forgot Password?, and Create Account (outline gold).
   - Check credentials against the mock consumers. Show inline errors. Persist the session. Inactive consumers cannot log in.

3. **Sign up.** Full name, mobile number, email, password, confirm password, address (optional) and a terms checkbox, validated with zod. On submit, add a new consumer (active, outstanding ₹0) and go to Home. Also include Continue with Google.

4. **Forgot password.** Enter email or mobile, then a mock OTP screen (accept any 6 digits and show the hint 123456), then a new-password screen, then a success message back to login.

5. **Home** (second phone in the template).
   - Header: small logo, notification bell with a red dot, profile avatar.
   - Greeting: "Hello, {firstName}" with "Your financial journey matters to us."
   - Outstanding card with a gold border: the **total** outstanding across all plans, a "Due Soon" pill when any plan's next EMI is within 7 days, the next EMI amount and due date. The chevron opens Pay Dues.
   - **Your Dues:** a horizontal list of the consumer's active plans (type icon, plan title, outstanding, next EMI and date, Due Soon pill). Tapping one opens Pay Dues with that plan preselected.
   - Quick Actions (four round gold icons): Pay Now, Payment History, Cards, and More. More opens a bottom sheet with Consumer Details, Notifications and Support.
   - Recent Activity: the last 3 transactions with icon, title (EMI Payment or Card Payment), date, amount and status badge, plus a "View All" link.

6. **Pay Dues** (third phone in the template).
   - **Plan selector** at the top: every active plan (with its type and outstanding) plus a "Pay All Dues" option.
   - Summary for the selection: outstanding, next EMI and due date.
   - Payment Breakdown for the selected plan: Principal, Interest, Processing Fee, Total. The breakdown must always add up. For "Pay All", show an allocation summary instead.
   - Amount selector: Pay Next EMI, Pay Full Outstanding (for that plan), or Custom Amount (validated, never more than the plan's outstanding).
   - Payment method: UPI, Debit/Credit Card, Net Banking.
   - A Pay Now button and the security note ("Your payment is secure and encrypted", "100% Safe & Trusted").

7. **Payment flow (placeholder for Razorpay).**
   - Do **not** integrate Razorpay yet. Create `src/services/paymentGateway.ts` exposing `initiatePayment({ consumerId, amount, method })` that returns a `Promise<PaymentResult>`.
   - The mock shows a clearly labelled "Mock Payment Gateway" sheet with three buttons: Simulate Success, Simulate Failure, Simulate Pending.
   - The result creates a Payment record. On success it reduces the outstanding amount and, if an EMI was paid, advances the next EMI date. Failed and pending payments never change balances.
   - That record must immediately appear in Admin > Payments, in the consumer's Recent Activity and Payment History, and trigger a payment-confirmation notification.
   - Then show a result screen: a success animation with a tick, the amount and reference number, with Download Receipt and Back to Home. Failure offers a retry.
   - Make Pay Now safe against double taps.
   - Leave a clear TODO: "Replace with Razorpay Checkout (order creation on backend, signature verification on webhook)."

8. **Payment History** (fourth phone in the template).
   - Filter dropdowns: "All Transactions" (by status and by plan type), and "Last 6 Months" (1, 3, 6 months, 1 year, custom). Each row is titled with its plan, for example "Loan EMI Payment" or "Card EMI Payment", with the plan reference.
   - Rows grouped under month headers (October 2026, September 2026, and so on). Each row shows an icon, title, date, amount, status badge and a download icon.
   - The download icon opens the Receipt screen and downloads a PDF or printable receipt.
   - Show date, amount, mode and status for every payment, and an empty state when nothing matches.

9. **Receipt.** Logo, receipt number, consumer name, masked account, date and time, mode, amount and status, with a download or share button.

10. **Cards tab.** Lists every enabled card type from the admin-managed data, with image, name, features and charges. Tapping one opens a detail screen with the full image, features, benefits, fees, joining and annual charges, and an "Enquire Now" button that shows a toast.

11. **Consumer Details / Profile** (fifth phone in the template).
    - Account block: masked account number (**** **** 4821) with a copy icon, and the account holder name.
    - EMI Schedule with a **plan selector**: next EMI amount and date with a Due Soon pill, total EMIs, remaining EMIs, EMI amount and tenure for the selected plan, plus a combined summary. "View All" opens the full schedule (paid and upcoming).
    - Dues Summary: total outstanding across plans, next due, and a per-plan list.
    - Your Cards: a horizontal carousel with dots.
    - Profile & Notifications: Profile Information (editable: name, email, address; read-only: mobile and account number), Notification Preferences (toggles) and Logout.

12. **Notifications.** An in-app list that simulates push notifications: EMI reminders, due reminders, payment confirmations and balance updates. Unread dot and "mark all as read".

---

## 8. Admin panel modules

The admin has a secure-looking login at `/admin/login` (email and password, mock auth). The sidebar has: **Dashboard, Consumers, Dues & EMI Updates, EMI & Dues Types, Payments, Card Types, Notifications, Activity Log.**

1. **Dashboard.** Summary cards for total consumers, total outstanding, total dues collected and upcoming EMIs (next 7 days). A bar chart of collections per month and a donut of outstanding vs collected. An upcoming EMI list. Working Excel and PDF export buttons for dues, collections and EMI schedules.

2. **Consumer Management.** A table (cards on mobile) with search by name, mobile and account number, and a due-status filter (Due Soon, Overdue, Clear, Inactive). Add, edit, view and deactivate consumers (name, mobile, email, address, account or reference number), with duplicate checks on mobile, email and account number. The consumer detail page shows profile, dues, EMI and payment history.

3. **Dues & EMI Updates.**
   - A per-consumer page listing **all of that consumer's plans**. The admin can add a plan (choose a plan type, title, reference, outstanding, principal, interest, processing fee, EMI amount, next EMI date, total and remaining EMIs, tenure, and an optional linked card), edit it, close it, or delete it (super admin only).
   - **Bulk update by CSV or Excel upload** with the columns `account_number, plan_type, plan_reference, outstanding, principal, interest, processing_fee, emi_amount, next_emi_date, total_emis, remaining_emis, tenure_months`. Rows update or create by account number plus plan reference. Drag and drop, preview table with row-level errors (including an unknown plan type), confirm to apply, and a downloadable sample template.
   - Every change appears in the consumer app immediately, is written to the Activity Log (date, time, admin user), and sends a balance-update notification.

4. **Payments.** All online payments with status (success, failed, pending), filters by date range, status, mode, consumer and plan type, per-consumer history, and downloadable reports that include the plan. Add a **Record Offline Payment** form (consumer, amount, mode: cash, cheque or bank transfer, reference, date) that **requires choosing the plan**, reduces that plan's outstanding amount and logs the entry.

5. **Card Types.** Add, edit and remove card types (name, image upload stored as a data URL in the prototype, features, benefits, charges) with an Enable/Disable toggle. Disabled cards disappear from the consumer app immediately. Seed it with **AKR Gold Card** (Higher Limits, Exclusive Rewards, Global Acceptance) and **AKR Platinum** (Premium Benefits, Travel Privileges, Lounge Access).

6. **Notifications.** Send a manual notification to one consumer or everyone (title and message), plus automatic templates for upcoming EMI, payment confirmation and balance update. Delivery is mocked and the message appears in the consumer's Notifications screen.

7. **Activity Log.** A read-only audit table (timestamp, admin user, action, consumer, old value, new value), filterable.

8. **EMI & Dues Types.** Manage the plan type list (Loan EMI, Card EMI, Credit Card Bill, Other Dues, or your own): add, edit, enable or disable, pick an icon and a category. A disabled type can't be assigned to new plans but doesn't affect plans already assigned.

---

## 9. Data

Define these as TypeScript interfaces in `src/core/types` and mirror them in `docs/API_CONTRACT.md`:

- **Consumer:** id, name, mobile, email, address, accountNumber, status (active or inactive), passwordHash (mock), createdAt
- **PlanType:** id, name, category (LOAN_EMI, CARD_EMI, CARD_BILL, OTHER), icon, enabled
- **DuesPlan:** id, consumerId, planTypeId, title, referenceNumber, status (active or closed), outstandingAmount, totalPaymentDue, principal, interest, processingFee, emiAmount, nextEmiDate, totalEmis, remainingEmis, tenureMonths, linkedCardTypeId (optional), createdAt, updatedAt
- **Payment:** id, transactionRef, consumerId, planId, planTypeId, amount, mode (UPI, CARD, NETBANKING, CASH, CHEQUE, BANK_TRANSFER), status (success, failed, pending), reference, source (online or offline), createdAt. "Pay All" creates one Payment per plan with the same transactionRef.
- **CardType:** id, name, imageUrl, features[], benefits[], charges, enabled
- **Notification:** id, consumerId (or null for everyone), title, message, type, read, createdAt
- **ActivityLog:** id, adminUser, action, consumerId, oldValue, newValue, createdAt
- **AdminUser:** id, name, email, role (super_admin or staff)

**Seed data.** About 25 consumers, plus the plan types (Loan EMI, Card EMI, Credit Card Bill, Other Dues). The lead demo consumer is **Rahul Sharma** (account ending 4821) with **three active plans**, so the combined figures match the template:

- Loan EMI: principal 13,500 + interest 3,000 + fee 500 = outstanding ₹17,000, EMI ₹2,750 due 25 Oct 2026, 36-month tenure with 18 remaining.
- Card EMI (an AKR Gold Card purchase): principal 5,350 + interest 1,000 = outstanding ₹6,350, EMI ₹1,500 due 25 Oct 2026.
- Other Dues (service charges): ₹1,500, no EMI.

Total outstanding is **₹24,850** and the next EMI is **₹4,250 on 25 Oct 2026**, as in the template. Note that the template's own breakdown (18,500 + 4,850 + 500) adds up to 23,850, not 24,850, so don't copy that arithmetic. Breakdowns must always add up. Add six months of payments across the plans (EMI payments, plus card bill payments of ₹2,500, ₹1,800, ₹3,200 and ₹2,750).

**Demo credentials** (show them on the login screens):

- Consumer: `rahul@example.com` or `9876543210`, password `Demo@123`. Works **only** on `/app/login`.
- Super admin: `admin@akr.com` / `Admin@123`. Works **only** on `/admin/login`.
- Staff admin: `staff@akr.com` / `Staff@123`. Works **only** on `/admin/login`.

**Demo helpers.** A dev-only "Reset demo data" button. A dev-only toolbar (controlled by `VITE_DEMO_TOOLBAR`) with shortcuts to `/app/login` and `/admin/login`. It must never auto-log anyone in across account types.

---

## 10. Everything must really work

This is a prototype, but it has to be a **working reference**, not just pictures. The next developer should only need to replace the mocked infrastructure, never re-design or rebuild features.

- No dead buttons, no "coming soon", no hardcoded screens, no lorem ipsum. Every number comes from the data layer.
- Implement the business rules **once**, in `src/core/domain`, and unit test them. They work per dues plan:
  - a plan's outstanding = principal + interest + processing fee (breakdowns always add up)
  - the consumer's total outstanding = the sum of their active plans
  - paying an EMI on a plan reduces that plan's outstanding amount and its remaining EMIs by one
  - that plan's next EMI date moves forward by one month
  - a custom payment can't exceed that plan's outstanding amount
  - "Pay All" spreads the money across plans (earliest due date first) and creates one payment per plan with a shared transaction reference
  - a plan that reaches zero is closed
  - "due soon" means any plan's next EMI is within 7 days
  - "overdue" means a plan's next EMI date is in the past and it still has an outstanding amount
  - failed or pending payments never change balances
- Full form validation with clear messages: email OR 10-digit Indian mobile, password strength, duplicate checks, amount ranges and CSV row validation.
- Lists support search, filter, sorting and pagination where it makes sense, with loading, empty and error states.
- Handle edge cases: zero outstanding ("All dues cleared"), inactive consumer login, disabled cards hidden from the app, expired session, double-tap on Pay Now, and retry after a failed payment.
- Exports really work: CSV, Excel and PDF for dues, collections and EMI schedules, and receipt downloads.
- Accessibility: labels, visible focus states, 44px minimum touch targets, good contrast.

**Only these things may stay mocked**, and each needs a one-paragraph "how to replace" note: the REST backend (MSW), Google sign-in, Razorpay payments, push notifications, SMS/email OTP and file storage for card images.

---

## 11. Project structure

```
src/
  core/        types, domain rules, validation, formatters, API client (no React/DOM imports)
  app/         router, providers, guards (ConsumerRoute, AdminRoute), layouts (ConsumerLayout, AdminLayout, PhoneFrame)
  features/
    auth/consumer, home, payments, cards, profile, notifications     (consumer app)
    admin/auth, dashboard, consumers, dues, payments, cards, notifications, activity-log
  components/ui/   design-system components
  mocks/           MSW handlers and seed data
  assets/
docs/
```

Rules: UI components never talk to the store or MSW directly, only through hooks that call the API client. Keep text, colors and spacing tokenised. Add short comments only where a decision matters, and mark every mocked piece with `REPLACE WITH API`.

---

## 12. Tests

- **Unit (Vitest):** the domain rules, EMI calculation, CSV validation, formatters and due status.
- **Component (React Testing Library):** login, pay dues, bulk upload and the consumer form.
- **End-to-end (Playwright):**
  - consumer logs in, pays an EMI (mock success), and the payment shows up in Admin > Payments
  - admin changes the EMI date and the consumer app shows the new date
  - route separation: `/admin/dashboard` while logged out redirects to `/admin/login`; `/admin/dashboard` as a consumer redirects to `/admin/login` with no admin data shown; `/app/home` as an admin-only session redirects to `/app/login`; admin credentials fail on `/app/login` and consumer credentials fail on `/admin/login`; logging out on one side doesn't log out the other; a staff admin can't open super-admin routes by typing the URL
  - bulk CSV upload
  - the admin adds a Card EMI plan to a consumer and it appears under "Your Dues"; the consumer pays one plan and only that plan changes; "Pay All" allocates correctly; a disabled plan type can't be assigned
  - disabling and enabling a card type
- npm scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`. All must pass.

---

## 13. Documentation to generate

- `README.md`: what this is, how to run it (`npm i`, `npm run dev`), demo credentials, route map, how the two sides share data, how to reset demo data, and how to run both consumer presentation modes.
- `docs/SCREENS.md`: each screen, its purpose, its data source and the matching template image.
- `docs/API_CONTRACT.md`: every REST endpoint (auth, consumers, dues, payments, cards, notifications, bulk upload, reports) with request and response JSON, split into `/api/consumer/*` and `/api/admin/*`.
- `docs/FEATURE_CHECKLIST.md`: every Scope of Work item mapped to its route or screen and the test that covers it.
- `docs/MOCKED_SERVICES.md`: everything still mocked and exactly how to replace it.
- `docs/REACT_NATIVE_MIGRATION.md`: component-by-component mapping (div to View, Tailwind to NativeWind, react-router to React Navigation, localStorage to AsyncStorage or SecureStore) and the web-only parts to replace.
- `docs/RAZORPAY_INTEGRATION.md`: where the mock gateway sits and the steps to replace it (backend order creation, Razorpay Checkout, webhook verification, status updates).
- `docs/DUES_PLANS.md`: how plan types and dues plans work, the Pay All allocation rules and the CSV columns.
- `docs/DELIVERY_OPTIONS.md`: how to ship (a) the consumer side as a React Native app only, (b) the admin side as a website only, or (c) the consumer side on the web too.

---

## 14. Out of scope

- No iOS app.
- No separate marketing or customer-facing website. The consumer UI appears in the browser only as part of this demo.
- No real SMS, email, Google OAuth, push notifications or payment processing.
- No features beyond the Scope of Work, except the prototype helpers and the multiple dues plans above.
- No automatic conversion of card purchases into EMIs. The admin creates Card EMI plans manually.

---

## 15. Order of work

1. Scaffold Vite, React, TypeScript and Tailwind. Set the design tokens and fonts.
2. Build `src/core`: types, domain rules with unit tests, validation and the API client. Then the MSW handlers and seed data.
3. Build the two separate auth systems, session keys and route guards **before any screens**.
4. Build the design-system components, the landing page and the phone frame.
5. Build the consumer screens in this order: auth, home, pay dues with the mock gateway and result screen, payment history and receipt, cards, profile and consumer details, notifications.
6. Build the admin panel: login, layout, consumers, dues updates with bulk upload, payments with offline entry, card types, dashboard with exports, notifications, activity log.
7. Check that admin changes appear in the consumer app, and that consumer payments appear in the admin panel.
8. Run lint, typecheck, unit, component and Playwright tests. Fill in the feature checklist and the mocked-services doc.
9. Do a responsive pass at 360px, 414px, 768px and 1280px.

---

## 16. Definition of done

- Every item in Scope of Work sections 4 and 5 is implemented and ticked in `docs/FEATURE_CHECKLIST.md`.
- All the tests above pass, including route separation, the payment flow and admin-to-consumer sync.
- No console errors. ESLint and Prettier are configured.
- A new developer can remove MSW, point `VITE_API_BASE_URL` at a real backend, and see every feature keep working with no UI changes.

When you finish, give me a short summary of what you built, any assumptions you made, and the exact list of mocked services from `docs/MOCKED_SERVICES.md`.
