/**
 * Pure domain types for AKR Credit Capital
 * Framework-free: Can be reused in React Native with zero modifications.
 */

export type UserType = 'consumer' | 'admin';
export type AdminRole = 'super_admin' | 'staff';

export type PlanCategory = 
  | 'PRODUCT_PURCHASE'
  | 'SAREE_EMI'
  | 'RETAIL_PURCHASE'
  | 'CUSTOM_STORE'
  | 'LOAN_EMI' 
  | 'CARD_EMI' 
  | 'CARD_BILL' 
  | 'OTHER';
export type PlanStatus = 'active' | 'closed';

export type PaymentMode = 
  | 'UPI' 
  | 'CARD' 
  | 'NETBANKING' 
  | 'CASH' 
  | 'CHEQUE' 
  | 'BANK_TRANSFER';

export type PaymentStatus = 'success' | 'failed' | 'pending';
export type PaymentSource = 'online' | 'offline';

export type DueStatus = 'Due Soon' | 'Overdue' | 'Clear' | 'Inactive';

export interface Consumer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  accountNumber: string;
  status: 'active' | 'inactive';
  passwordHash: string; // mock
  createdAt: string;
  cardApproved?: boolean; // Only approved users appear in admin consumers page
  creditLimit?: number; // Credit limit assigned by admin e.g. 50000
  cardStatus?: 'not_applied' | 'pending' | 'approved' | 'rejected';
  cardNumber?: string; // Formatted masked card number e.g. '5123 •••• •••• 8842'
  notificationPreferences?: {
    pushEnabled: boolean;
    smsEnabled: boolean;
    emailEnabled: boolean;
    emiReminders: boolean;
    promotionalOffers: boolean;
  };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt: string;
}

export interface PlanType {
  id: string;
  name: string;
  category: PlanCategory;
  icon: string; // Lucide icon identifier e.g. 'landmark', 'credit-card', 'receipt', 'wallet', 'shopping-bag'
  enabled: boolean;
}

export interface DuesPlan {
  id: string;
  consumerId: string;
  planTypeId: string;
  title: string;
  referenceNumber: string;
  status: PlanStatus;
  outstandingAmount: number;
  totalPaymentDue: number; // total product purchase amount
  principal: number;
  interest: number; // 0 for on-time weekly EMIs
  processingFee: number;
  emiAmount: number; // Weekly EMI amount
  nextEmiDate: string; // ISO date 'YYYY-MM-DD'
  totalEmis: number; // Total number of weekly EMIs
  remainingEmis: number; // Remaining weekly EMIs
  tenureWeeks?: number; // Tenure in weeks (e.g. 6, 10, 12)
  tenureMonths?: number; // Deprecated, kept for backward compatibility
  frequency?: 'weekly' | 'monthly'; // 'weekly' by default
  productName?: string; // e.g. "Kanchipuram Silk Bridal Saree"
  linkedCardTypeId?: string;
  overdueAmount?: number; // Manual late fee / overdue charge entered by Admin
  missedWeeks?: number; // Count of missed weekly EMIs (1, 2, etc.)
  missedMonths?: number; // Deprecated, kept for backward compatibility
  overdueRemarks?: string; // Admin note for overdue fee
  overdueAssignedAt?: string; // Timestamp when overdue fee was assigned
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  transactionRef: string;
  consumerId: string;
  planId: string;
  planTypeId: string;
  amount: number;
  mode: PaymentMode;
  status: PaymentStatus;
  reference: string; // UTR or receipt number
  source: PaymentSource;
  createdAt: string; // ISO timestamp
}

export interface CardType {
  id: string;
  name: string;
  imageUrl: string;
  features: string[];
  benefits: string[];
  charges: {
    joiningFee: number;
    annualFee: number;
    interestRate: string; // e.g. "3.5% p.m."
  };
  enabled: boolean;
}

export interface AppNotification {
  id: string;
  consumerId: string | null; // null for broadcast to all consumers
  title: string;
  message: string;
  type: 'emi_reminder' | 'payment_confirmation' | 'balance_update' | 'general';
  read: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  adminUser: string;
  action: string;
  consumerId: string;
  consumerName?: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
}

export interface ConsumerSession {
  userType: 'consumer';
  token: string;
  consumer: Consumer;
}

export interface AdminSession {
  userType: 'admin';
  role: AdminRole;
  token: string;
  admin: AdminUser;
}

export interface PaymentAllocation {
  planId: string;
  planTitle: string;
  allocatedAmount: number;
  remainingBalanceAfter: number;
}

export interface PaymentResult {
  success: boolean;
  status: PaymentStatus;
  transactionRef: string;
  amount: number;
  mode: PaymentMode;
  date: string;
  receiptNumber: string;
  message?: string;
  payments: Payment[];
}

export type CardRequestStatus = 'pending' | 'approved' | 'rejected';

export interface CardRequest {
  id: string;
  referenceNumber: string;
  consumerId?: string;
  cardTypeId: string;
  cardTypeName: string;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  panNumber: string;
  aadharNumber: string;
  panDocName?: string;
  panDocData?: string; // base64 preview or placeholder
  monthlyIncome?: number;
  status: CardRequestStatus;
  adminRemarks?: string;
  creditLimitApproved?: number;
  createdAt: string; // ISO string
  updatedAt: string;
}
