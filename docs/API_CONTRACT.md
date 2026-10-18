# API Contract & Endpoint Specification

This document details the final REST API specification for **AKR Credit Capital**. The frontend prototype communicates with these exact endpoints via its typed API client (`src/core/api`), which is intercepted by Mock Service Worker (MSW).

When transitioning to a production backend (Node.js/Express, Python/FastAPI, or Java/Spring Boot):
1. Disable MSW (`VITE_ENABLE_MOCKS=false`).
2. Point `VITE_API_BASE_URL` to your real backend URL.
3. The frontend components will continue to function without changes.

---

## 1. Authentication & Security Principles

- **Namespaces:** Separated into `/api/consumer/*` (Consumer identity) and `/api/admin/*` (Administrative identity).
- **Authorization Header:** All protected endpoints require a Bearer token:
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```
- **Access Control Matrix:**
  - Consumer JWT tokens received on `/api/admin/*` endpoints must return **`403 Forbidden`**.
  - Admin JWT tokens received on `/api/consumer/*` endpoints must return **`403 Forbidden`**.
  - Requests missing tokens on protected endpoints must return **`401 Unauthorized`**.

---

## 2. Consumer Endpoints (`/api/consumer/*`)

### `POST /api/consumer/auth/login`
- **Description:** Authenticates a consumer using either their registered email address OR 10-digit mobile number.
- **Request Body:**
  ```json
  {
    "identifier": "rahul@example.com", // or "9876543210"
    "password": "Demo@123"
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "userType": "consumer",
      "token": "jwt_token_sample",
      "consumer": {
        "id": "c_rahul_4821",
        "name": "Rahul Sharma",
        "mobile": "9876543210",
        "email": "rahul@example.com",
        "accountNumber": "AKR10004821",
        "status": "active"
      }
    }
    ```
  - `401 Unauthorized`: `{"error": "Invalid email/mobile number or password"}`
  - `403 Forbidden`: `{"error": "Your account is inactive. Please contact support."}`

---

### `POST /api/consumer/auth/google`
- **Description:** Authenticates or links a consumer via Google OAuth 2.0 token.
- **Responses:** `200 OK` (Consumer Session object).

---

### `POST /api/consumer/auth/signup`
- **Description:** Registers a new consumer with an initial ₹0 dues balance and active status.
- **Request Body:**
  ```json
  {
    "fullName": "Pooja Reddy",
    "mobile": "9845012345",
    "email": "pooja.reddy@example.com",
    "password": "SecurePassword123",
    "address": "45 MG Road, Bengaluru"
  }
  ```
- **Responses:**
  - `201 Created`: Returns ConsumerSession.
  - `409 Conflict`: `{"error": "Email or mobile number is already registered"}`

---

### `GET /api/consumer/dues`
- **Headers:** `Authorization: Bearer <consumer_token>`
- **Description:** Retrieves all active and closed dues plans, calculated total outstanding, and the earliest upcoming EMI details.
- **Response:**
  ```json
  {
    "totalOutstanding": 24850,
    "nextEmiAmount": 4250,
    "nextEmiDate": "2026-10-25",
    "isDueSoon": true,
    "dueStatus": "Due Soon",
    "plans": [
      {
        "id": "plan_rahul_loan",
        "consumerId": "c_rahul_4821",
        "planTypeId": "pt_loan_emi",
        "title": "Personal Loan EMI",
        "referenceNumber": "LN-2024-8842",
        "status": "active",
        "outstandingAmount": 17000,
        "principal": 13500,
        "interest": 3000,
        "processingFee": 500,
        "emiAmount": 2750,
        "nextEmiDate": "2026-10-25",
        "totalEmis": 36,
        "remainingEmis": 18,
        "tenureMonths": 36
      },
      {
        "id": "plan_rahul_card",
        "consumerId": "c_rahul_4821",
        "planTypeId": "pt_card_emi",
        "title": "AKR Gold Card EMI",
        "referenceNumber": "CD-EMI-4019",
        "status": "active",
        "outstandingAmount": 6350,
        "principal": 5350,
        "interest": 1000,
        "processingFee": 0,
        "emiAmount": 1500,
        "nextEmiDate": "2026-10-25",
        "totalEmis": 6,
        "remainingEmis": 4,
        "tenureMonths": 6,
        "linkedCardTypeId": "card_gold"
      },
      {
        "id": "plan_rahul_other",
        "consumerId": "c_rahul_4821",
        "planTypeId": "pt_other_dues",
        "title": "Annual Service Maintenance",
        "referenceNumber": "OTH-9011",
        "status": "active",
        "outstandingAmount": 1500,
        "principal": 1500,
        "interest": 0,
        "processingFee": 0,
        "emiAmount": 0,
        "nextEmiDate": "2026-10-25",
        "totalEmis": 0,
        "remainingEmis": 0,
        "tenureMonths": 0
      }
    ]
  }
  ```

---

### `POST /api/consumer/payments/initiate`
- **Headers:** `Authorization: Bearer <consumer_token>`
- **Description:** Executes payment against a specific plan or allocates across active plans ("all").
- **Request Body:**
  ```json
  {
    "planId": "all", // or specific planId e.g. "plan_rahul_loan"
    "amount": 4250,
    "mode": "UPI" // or "CARD", "NETBANKING"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "status": "success",
    "transactionRef": "TXN-AKR-20261025-4411",
    "amount": 4250,
    "mode": "UPI",
    "date": "2026-10-25T14:30:00.000Z",
    "receiptNumber": "REC-20261025-4411",
    "payments": [...]
  }
  ```

---

## 3. Administrative Endpoints (`/api/admin/*`)

### `POST /api/admin/auth/login`
- **Description:** Authenticates administrative users.
- **Request Body:**
  ```json
  {
    "email": "admin@akr.com",
    "password": "Admin@123"
  }
  ```
- **Responses:**
  - `200 OK`: Returns AdminSession with role claim (`super_admin` or `staff`).
  - `401 Unauthorized`: Invalid credentials.

---

### `GET /api/admin/dashboard`
- **Headers:** `Authorization: Bearer <admin_token>`
- **Response:**
  ```json
  {
    "totalConsumers": 25,
    "activeConsumers": 24,
    "totalOutstanding": 145000,
    "totalCollected": 120000,
    "upcomingPlansCount": 8
  }
  ```

---

### `POST /api/admin/dues/bulk`
- **Headers:** `Authorization: Bearer <admin_token>`
- **Description:** Upserts dues plans using parsed CSV or Excel rows.
- **Request Body:**
  ```json
  {
    "rows": [
      {
        "accountNumber": "AKR10004821",
        "planType": "Loan EMI",
        "planReference": "LN-2024-8842",
        "outstanding": 17000,
        "principal": 13500,
        "interest": 3000,
        "processingFee": 500,
        "emiAmount": 2750,
        "nextEmiDate": "2026-10-25",
        "totalEmis": 36,
        "remainingEmis": 18,
        "tenureMonths": 36
      }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "successCount": 1,
    "errors": []
  }
  ```

---

### `POST /api/admin/payments/offline`
- **Headers:** `Authorization: Bearer <admin_token>`
- **Description:** Records branch cash, cheque, or bank transfer payments directly against a plan.
- **Request Body:**
  ```json
  {
    "consumerId": "c_sneha_1109",
    "planId": "plan_sneha_1",
    "amount": 2050,
    "mode": "CASH",
    "reference": "CASH-REC-8842",
    "date": "2026-10-05"
  }
  ```
- **Response:** Returns `201 Created` with PaymentResult.
