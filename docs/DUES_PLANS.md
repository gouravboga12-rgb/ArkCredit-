# AKR Credit Capital - Multi-Dues Plans & Allocation Specification

This document details the multi-dues architecture implemented in the AKR Credit Capital platform.

---

## 1. Problem Solved

A consumer can hold multiple financial products simultaneously under the same identity:
1. **Loan EMI** (Personal / Business Loan)
2. **Card EMI** (Purchases converted into installments on an AKR Credit Card)
3. **Credit Card Bill** (Monthly revolving retail card dues)
4. **Other Dues** (Documentation charges, annual maintenance fees, service charges)

The **Admin Team** controls the master list of product types, creates plans for consumers, and updates balances. The **Consumer App** automatically aggregates the totals and allows consumers to pay a single plan or "Pay All" dues in one seamless transaction.

---

## 2. Entities & Schema

### `PlanType` (Admin Master List)
Located in `src/core/types/index.ts`:
```typescript
export interface PlanType {
  id: string;
  name: string; // e.g. "Loan EMI", "Card EMI", "Credit Card Bill", "Other Dues"
  category: 'LOAN_EMI' | 'CARD_EMI' | 'CARD_BILL' | 'OTHER';
  icon: string; // Icon name e.g. "Coins", "CreditCard", "Receipt", "FileText"
  enabled: boolean;
}
```
- A disabled `PlanType` cannot be selected when creating a new plan in the Admin panel.
- Existing plans that use a disabled `PlanType` remain completely visible to consumers until settled.

---

### `DuesPlan` (Consumer Financial Account)
```typescript
export interface DuesPlan {
  id: string;
  consumerId: string;
  planTypeId: string;
  title: string;              // e.g. "Two Wheeler Loan EMI", "AKR Gold Card Purchase"
  referenceNumber: string;    // Unique reference e.g. "LN-8821", "CRD-4821-EMI"
  status: 'active' | 'closed';
  outstandingAmount: number;  // Must strictly equal principal + interest + processingFee
  totalPaymentDue: number;    // Usually equals next EMI or immediate dues
  principal: number;
  interest: number;
  processingFee: number;
  emiAmount: number;          // 0 for non-installment dues (e.g. Other Dues)
  nextEmiDate: string;        // ISO 8601 date e.g. "2026-10-25"
  totalEmis: number;
  remainingEmis: number;
  tenureMonths: number;
  linkedCardTypeId?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Arithmetic Integrity & Rules

Implemented in `src/core/domain/index.ts`:

1. **Breakdown Equivalence:**
   $$\text{Outstanding Amount} = \text{Principal} + \text{Interest} + \text{Processing Fee}$$
   Every breakdown displayed in the app or entered in the Admin panel verifies that the parts sum precisely to the total.

2. **Consumer Total Outstanding:**
   $$\text{Total Outstanding} = \sum_{\text{active plans}} \text{plan.outstandingAmount}$$

3. **Earliest Next EMI Determination:**
   The Home Outstanding card displays the earliest upcoming due date among active plans with an EMI > 0, summing the EMI amounts due on that specific date.

4. **Paying an EMI on a Plan:**
   - Deducts the paid amount from `plan.outstandingAmount`.
   - Decrements `remainingEmis` by 1.
   - Advances `nextEmiDate` forward by exactly 1 month.
   - If `outstandingAmount` reaches 0, `plan.status` transitions automatically to `'closed'`.

---

## 4. "Pay All" Allocation Mechanics

When a consumer selects **"Pay All Dues"** in the Pay Dues screen (`/app/pay`):

1. **Sorting:** All active plans are sorted in ascending order by their `nextEmiDate` (earliest due date first).
2. **Sequential Deduction:** Funds are allocated to settle the earliest due plans first.
3. **Transaction Reference Sharing:** One single `transactionRef` (e.g. `TXN-AKR-1729238491`) is generated for the checkout session.
4. **Per-Plan Ledger Records:** In the store and backend, one distinct `Payment` record is created for each funded plan, all sharing the same `transactionRef`.
   - This ensures the admin ledger can accurately attribute payments to each loan/card account while the consumer receives a consolidated receipt.

---

## 5. Bulk Upload Specification (CSV / Excel)

The Admin Panel supports updating or creating dues plans in bulk via CSV or Excel (`.xlsx`) at `/admin/dues`.

### Required Columns

| Column Header | Type | Description / Constraints |
|---|---|---|
| `account_number` | String | Consumer account number e.g. `AKR-4821` |
| `plan_type` | String | Must match an existing enabled `PlanType.name` |
| `plan_reference` | String | Unique identifier for this plan e.g. `LN-1092` |
| `outstanding` | Number | Total outstanding balance |
| `principal` | Number | Principal portion |
| `interest` | Number | Interest portion |
| `processing_fee`| Number | Processing fees (can be 0) |
| `emi_amount` | Number | Monthly installment |
| `next_emi_date` | String | `YYYY-MM-DD` |
| `total_emis` | Integer | Total installments |
| `remaining_emis`| Integer | Remaining installments |
| `tenure_months` | Integer | Total loan tenure |

### Upsert Behavior
- If `account_number` + `plan_reference` exists, the plan is updated.
- If it does not exist, a new `DuesPlan` is created under that consumer.
- Any row with an unrecognized `account_number` or disabled `plan_type` is flagged with a row-level error in the preview modal prior to commit.
