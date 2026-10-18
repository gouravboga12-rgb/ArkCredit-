/**
 * Pure domain types for AKR Credit Capital
 * Framework-free: Can be reused in React Native with zero modifications.
 */

export type UserType = 'consumer' | 'admin';
export type AdminRole = 'super_admin' | 'staff';

export type PlanCategory = 'LOAN_EMI' | 'CARD_EMI' | 'CARD_BILL' | 'OTHER';
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
  icon: string; // Lucide icon identifier e.g. 'landmark', 'credit-card', 'receipt', 'wallet'
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
  totalPaymentDue: number; // total original loan / bill amount
  principal: number;
  interest: number;
  processingFee: number;
  emiAmount: number;
  nextEmiDate: string; // ISO date 'YYYY-MM-DD'
  totalEmis: number;
  remainingEmis: number;
  tenureMonths: number;
  linkedCardTypeId?: string;
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
