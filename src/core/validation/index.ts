/**
 * Core validation schemas using Zod
 * 100% Framework-free - reusable in React Native.
 */

import { z } from 'zod';

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Consumer Login Schema
 * Accepts a Customer ID / Account Number, Email, OR 10-digit Indian Mobile Number.
 */
export const consumerLoginSchema = z.object({
  identifier: z.string().trim().min(1, 'Please enter your Account ID, email or mobile number').refine((val) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    const isMobile = INDIAN_MOBILE_REGEX.test(val);
    const isAccountId = val.trim().length >= 3;
    return isEmail || isMobile || isAccountId;
  }, {
    message: 'Enter a valid Account ID, email address, or 10-digit mobile number',
  }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type ConsumerLoginFormData = z.infer<typeof consumerLoginSchema>;

/**
 * Consumer Sign Up Schema
 */
export const consumerSignUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  mobile: z.string().trim().regex(INDIAN_MOBILE_REGEX, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  address: z.string().optional(),
  agreeTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Terms and Conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ConsumerSignUpFormData = z.infer<typeof consumerSignUpSchema>;

/**
 * Consumer Forgot Password Request
 */
export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, 'Please enter your registered email or mobile number').refine((val) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    const isMobile = INDIAN_MOBILE_REGEX.test(val);
    return isEmail || isMobile;
  }, {
    message: 'Enter a valid email or 10-digit mobile number',
  }),
});

/**
 * 6-Digit OTP Schema
 */
export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

/**
 * Reset Password Schema
 */
export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * Admin Login Schema
 */
export const adminLoginSchema = z.object({
  email: z.string().trim().email('Enter a valid corporate email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

/**
 * Consumer Profile Edit Schema (Consumer-side: name, email, address only)
 */
export const consumerProfileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Enter a valid email address'),
  address: z.string().trim().min(5, 'Address must be at least 5 characters'),
});

/**
 * Admin Consumer Management Form Schema
 */
export const adminConsumerFormSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  mobile: z.string().trim().regex(INDIAN_MOBILE_REGEX, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().trim().email('Enter a valid email address'),
  address: z.string().trim().min(5, 'Address must be at least 5 characters'),
  accountNumber: z.string().trim().min(4, 'Account / Customer ID must be at least 4 characters'),
  status: z.enum(['active', 'inactive']),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

export type AdminConsumerFormData = z.infer<typeof adminConsumerFormSchema>;

/**
 * Admin Dues Plan Form Schema
 */
export const adminDuesPlanFormSchema = z.object({
  planTypeId: z.string().min(1, 'Please select a plan type'),
  title: z.string().trim().min(2, 'Plan title is required (e.g. Loan EMI)'),
  referenceNumber: z.string().trim().min(2, 'Reference number is required'),
  principal: z.coerce.number().min(0, 'Principal amount cannot be negative'),
  interest: z.coerce.number().min(0, 'Interest cannot be negative'),
  processingFee: z.coerce.number().min(0, 'Processing fee cannot be negative'),
  emiAmount: z.coerce.number().min(0, 'EMI amount cannot be negative'),
  nextEmiDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  totalEmis: z.coerce.number().int().min(1, 'Total EMIs must be at least 1'),
  remainingEmis: z.coerce.number().int().min(0, 'Remaining EMIs cannot be negative'),
  tenureMonths: z.coerce.number().int().min(1, 'Tenure must be at least 1 month'),
  linkedCardTypeId: z.string().optional(),
});

export type AdminDuesPlanFormData = z.infer<typeof adminDuesPlanFormSchema>;

/**
 * Record Offline Payment Form Schema
 */
export const offlinePaymentFormSchema = z.object({
  consumerId: z.string().min(1, 'Please select a consumer'),
  planId: z.string().min(1, 'Please select the specific dues plan'),
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  mode: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER']),
  reference: z.string().trim().min(3, 'Reference / Receipt / Cheque number is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export type OfflinePaymentFormData = z.infer<typeof offlinePaymentFormSchema>;

/**
 * Card Type Form Schema
 */
export const cardTypeFormSchema = z.object({
  name: z.string().trim().min(2, 'Card name is required'),
  imageUrl: z.string().min(1, 'Card image is required'),
  features: z.string().min(1, 'Enter features separated by commas'),
  benefits: z.string().min(1, 'Enter benefits separated by commas'),
  joiningFee: z.coerce.number().min(0, 'Joining fee cannot be negative'),
  annualFee: z.coerce.number().min(0, 'Annual fee cannot be negative'),
  interestRate: z.string().trim().min(1, 'Interest rate is required (e.g. 3.5% p.m.)'),
  enabled: z.boolean(),
});

/**
 * Notification Form Schema
 */
export const adminNotificationFormSchema = z.object({
  consumerId: z.string().optional(), // empty string or undefined means all consumers
  title: z.string().trim().min(3, 'Notification title is required'),
  message: z.string().trim().min(5, 'Message content is required'),
  type: z.enum(['emi_reminder', 'payment_confirmation', 'balance_update', 'general']),
});

/**
 * Bulk Dues CSV/Excel Row Schema
 */
export const bulkDuesRowSchema = z.object({
  account_number: z.string().trim().min(1, 'account_number is required'),
  plan_type: z.string().trim().min(1, 'plan_type is required'),
  plan_reference: z.string().trim().min(1, 'plan_reference is required'),
  outstanding: z.coerce.number().min(0, 'outstanding must be a valid number >= 0'),
  principal: z.coerce.number().min(0, 'principal must be a valid number >= 0'),
  interest: z.coerce.number().min(0, 'interest must be a valid number >= 0'),
  processing_fee: z.coerce.number().min(0, 'processing_fee must be a valid number >= 0'),
  emi_amount: z.coerce.number().min(0, 'emi_amount must be a valid number >= 0'),
  next_emi_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'next_emi_date must be YYYY-MM-DD'),
  total_emis: z.coerce.number().int().min(1, 'total_emis must be an integer >= 1'),
  remaining_emis: z.coerce.number().int().min(0, 'remaining_emis must be an integer >= 0'),
  tenure_months: z.coerce.number().int().min(1, 'tenure_months must be an integer >= 1'),
});

export type BulkDuesRow = z.infer<typeof bulkDuesRowSchema>;
