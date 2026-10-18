/**
 * Payment Gateway Service
 * 
 * TODO: Replace with Razorpay Checkout (order creation on backend, signature verification on webhook).
 * When integrating real Razorpay:
 * 1. Call POST /api/payments/razorpay/create-order to obtain order_id and key_id.
 * 2. Open Razorpay standard checkout dialog using window.Razorpay.
 * 3. On handler callback, send razorpay_payment_id, razorpay_order_id, and razorpay_signature to POST /api/payments/razorpay/verify.
 * 4. Update local payment state on verified webhook callback.
 */

import { consumerApi } from '../core/api';
import { PaymentMode, PaymentResult } from '../core/types';

export interface InitiatePaymentParams {
  consumerId: string;
  planId: string | 'all';
  amount: number;
  method: PaymentMode;
  simulateFailure?: boolean;
}

export const paymentGateway = {
  // REPLACE WITH API (Razorpay Checkout)
  initiatePayment: async (params: InitiatePaymentParams): Promise<PaymentResult> => {
    // Calls the typed REST endpoint intercepted by MSW
    return consumerApi.initiatePayment({
      planId: params.planId,
      amount: params.amount,
      mode: params.method,
      simulateFailure: params.simulateFailure,
    });
  },
};
