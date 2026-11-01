/**
 * Payment Gateway Service
 * Integrates Razorpay Standard Checkout for customer-side weekly EMI payments.
 */

import { consumerApi } from '../core/api';
import { PaymentMode, PaymentResult } from '../core/types';

export interface RazorpayCheckoutParams {
  consumer: {
    id: string;
    name: string;
    email?: string;
    mobile?: string;
  };
  planId: string | 'all';
  planTitle?: string;
  amount: number;
  method?: PaymentMode;
  onDismiss?: () => void;
}

export interface InitiatePaymentParams {
  consumerId: string;
  planId: string | 'all';
  amount: number;
  method: PaymentMode;
  simulateFailure?: boolean;
}

export const paymentGateway = {
  /**
   * Open Real Razorpay Checkout modal
   */
  openRazorpayCheckout: async (params: RazorpayCheckoutParams): Promise<PaymentResult> => {
    // 1. Create order on backend
    const orderData = await consumerApi.createRazorpayOrder({
      planId: params.planId,
      amount: params.amount,
    });

    const razorpayKey =
      orderData.keyId ||
      import.meta.env.VITE_RAZORPAY_KEY_ID ||
      'rzp_test_Tut4fI6v9dhbjs';

    return new Promise((resolve, reject) => {
      // Check if Razorpay SDK loaded
      if (typeof (window as any).Razorpay === 'undefined') {
        reject(
          new Error(
            'Razorpay Checkout SDK failed to load. Please check your internet connection and refresh.'
          )
        );
        return;
      }

      const options = {
        key: razorpayKey,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'AKR Credit Capital',
        description: `Weekly EMI Repayment - ${params.planTitle || orderData.planTitle || 'EMI Plan'}`,
        image: '/logo.svg',
        order_id: orderData.orderId,
        prefill: {
          name: params.consumer.name,
          email: params.consumer.email || '',
          contact: params.consumer.mobile || '',
          method:
            params.method === 'UPI'
              ? 'upi'
              : params.method === 'CARD'
              ? 'card'
              : params.method === 'NETBANKING'
              ? 'netbanking'
              : undefined,
        },
        theme: {
          color: '#D4AF37', // AKR Gold
        },
        modal: {
          ondismiss: () => {
            if (params.onDismiss) params.onDismiss();
            reject(new Error('Payment window closed by user'));
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // Verify on backend
            const verification = await consumerApi.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: params.planId,
              amount: params.amount,
              mode: params.method || 'UPI',
            });

            resolve({
              success: true,
              status: 'success',
              transactionRef: verification.transactionRef,
              amount: verification.amount,
              mode: params.method || 'UPI',
              date: verification.paidAt || new Date().toISOString(),
              receiptNumber: verification.paymentId,
              message: verification.message || 'Payment completed successfully!',
              payments: [],
            });
          } catch (err: any) {
            reject(new Error(err.message || 'Payment signature verification failed'));
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (failResponse: any) => {
        reject(new Error(failResponse.error?.description || 'Payment failed'));
      });
      rzp.open();
    });
  },

  // Fallback simulator method for dev/test without popup if needed
  initiatePayment: async (params: InitiatePaymentParams): Promise<PaymentResult> => {
    return consumerApi.initiatePayment({
      planId: params.planId,
      amount: params.amount,
      mode: params.method,
      simulateFailure: params.simulateFailure,
    });
  },
};
