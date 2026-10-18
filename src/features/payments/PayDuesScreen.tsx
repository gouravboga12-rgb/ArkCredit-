import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Download,
  ArrowLeft,
  Smartphone,
  CreditCard,
  Landmark,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../../store';
import { consumerApi } from '../../core/api';
import { paymentGateway } from '../../services/paymentGateway';
import { DuesPlan, PaymentMode, PaymentResult } from '../../core/types';
import { formatCurrency, formatDisplayDate } from '../../core/formatters';
import { allocatePayAllAmount } from '../../core/domain';
import {
  PageHeader,
  GoldButton,
  OutlineGoldButton,
  BottomSheet,
  Skeleton,
  StatusBadge,
} from '../../components/ui';

export const PayDuesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPlanId = searchParams.get('planId');

  const consumerSession = useStore((state) => state.consumerSession);
  const consumer = consumerSession?.consumer;

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<DuesPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('all');
  const [paymentOption, setPaymentOption] = useState<'emi' | 'full' | 'custom'>('emi');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMode>('UPI');
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

  useEffect(() => {
    async function loadDues() {
      try {
        setLoading(true);
        const data = await consumerApi.getDues();
        setPlans(data.plans);
        if (preselectedPlanId && data.plans.some((p) => p.id === preselectedPlanId)) {
          setSelectedPlanId(preselectedPlanId);
        } else {
          setSelectedPlanId('all');
        }
      } catch (err) {
        console.error('Failed to load dues', err);
      } finally {
        setLoading(false);
      }
    }
    loadDues();
  }, [preselectedPlanId]);

  // Derived totals based on selection
  const isPayAll = selectedPlanId === 'all';
  const currentPlan = isPayAll ? null : plans.find((p) => p.id === selectedPlanId);

  const totalOutstanding = isPayAll
    ? plans.reduce((sum, p) => sum + p.outstandingAmount, 0)
    : currentPlan?.outstandingAmount || 0;

  const nextEmiAmount = isPayAll
    ? plans.reduce((sum, p) => sum + p.emiAmount, 0)
    : currentPlan?.emiAmount || 0;

  const nextEmiDate = isPayAll
    ? plans[0]?.nextEmiDate || ''
    : currentPlan?.nextEmiDate || '';

  // Calculate actual payable amount
  const payableAmount = (() => {
    if (paymentOption === 'emi') {
      return nextEmiAmount > 0 ? nextEmiAmount : totalOutstanding;
    }
    if (paymentOption === 'full') {
      return totalOutstanding;
    }
    const parsed = Number(customAmount);
    return isNaN(parsed) || parsed <= 0 ? 0 : Math.min(parsed, totalOutstanding);
  })();

  const allocations = isPayAll ? allocatePayAllAmount(payableAmount, plans) : [];

  const handleOpenGateway = () => {
    if (payableAmount <= 0) {
      alert('Payable amount must be greater than ₹0');
      return;
    }
    setIsGatewayOpen(true);
  };

  const handleExecutePaymentSimulation = async (status: 'success' | 'failure' | 'pending') => {
    if (!consumer) return;
    try {
      setIsProcessing(true);
      if (status === 'failure') {
        const res = await paymentGateway.initiatePayment({
          consumerId: consumer.id,
          planId: selectedPlanId,
          amount: payableAmount,
          method: selectedMethod,
          simulateFailure: true,
        }).catch((err) => ({
          success: false,
          status: 'failed' as const,
          transactionRef: `FAILED-${Date.now()}`,
          amount: payableAmount,
          mode: selectedMethod,
          date: new Date().toISOString(),
          receiptNumber: 'N/A',
          message: err.message || 'Payment simulation failed',
          payments: [],
        }));

        setPaymentResult(res);
      } else if (status === 'pending') {
        setPaymentResult({
          success: false,
          status: 'pending',
          transactionRef: `PENDING-${Date.now()}`,
          amount: payableAmount,
          mode: selectedMethod,
          date: new Date().toISOString(),
          receiptNumber: 'N/A',
          message: 'Payment verification is pending from bank.',
          payments: [],
        });
      } else {
        // Success
        const res = await paymentGateway.initiatePayment({
          consumerId: consumer.id,
          planId: selectedPlanId,
          amount: payableAmount,
          method: selectedMethod,
        });

        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#F3D98B', '#FFFFFF'],
        });

        setPaymentResult(res);
      }
    } catch (err: any) {
      alert(err.message || 'Payment processing error');
    } finally {
      setIsProcessing(false);
      setIsGatewayOpen(false);
    }
  };

  // If payment result is active, show the Result Screen
  if (paymentResult) {
    const isSuccess = paymentResult.status === 'success';

    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-akr-bg text-white text-center">
        <div className="my-auto py-6 animate-scaleUp">
          {/* Status Icon */}
          <div className="mb-4">
            {isSuccess ? (
              <div className="w-20 h-20 rounded-full bg-emerald-950/80 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center shadow-gold-glow animate-bounce">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
            ) : paymentResult.status === 'pending' ? (
              <div className="w-20 h-20 rounded-full bg-amber-950/80 border-2 border-amber-500 text-amber-400 mx-auto flex items-center justify-center">
                <Clock className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-red-950/80 border-2 border-red-500 text-red-400 mx-auto flex items-center justify-center">
                <XCircle className="w-10 h-10" />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-serif font-bold text-white mb-1">
            {isSuccess ? 'Payment Successful!' : paymentResult.status === 'pending' ? 'Payment Pending' : 'Payment Failed'}
          </h2>

          <p className="text-xs text-akr-text-muted mb-6">
            {isSuccess
              ? 'Your dues have been credited immediately.'
              : paymentResult.message || 'Payment could not be processed.'}
          </p>

          {/* Transaction Summary Card */}
          <div className="p-4 rounded-card bg-akr-surface border border-akr-border/80 text-left space-y-3 mb-6 max-w-sm mx-auto">
            <div className="flex justify-between items-center text-xs">
              <span className="text-akr-text-muted">Amount Paid</span>
              <span className="text-base font-bold text-akr-gold">
                {formatCurrency(paymentResult.amount)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-akr-text-muted">Payment Mode</span>
              <span className="font-semibold text-white uppercase">{paymentResult.mode}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-akr-text-muted">Transaction ID</span>
              <span className="font-mono text-[11px] text-zinc-300">
                {paymentResult.transactionRef}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-akr-text-muted">Date & Time</span>
              <span className="text-[11px] text-zinc-300">
                {formatDisplayDate(paymentResult.date, true)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 max-w-sm mx-auto">
            {isSuccess && paymentResult.payments.length > 0 && (
              <OutlineGoldButton
                onClick={() => navigate(`/app/receipt/${paymentResult.payments[0].id}`)}
                icon={<Download className="w-4 h-4" />}
              >
                Download Receipt
              </OutlineGoldButton>
            )}

            <GoldButton onClick={() => navigate('/app/home')}>
              {isSuccess ? 'Back to Home' : 'Retry Payment'}
            </GoldButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-akr-bg text-white pb-6 relative overflow-y-auto">
      <div>
        <PageHeader title="Pay Dues" onBack={() => navigate('/app/home')} />

        <div className="p-4 space-y-4">
          {/* Top Summary Card (Phone 3 in template) */}
          {loading ? (
            <Skeleton className="h-28 w-full rounded-card" />
          ) : (
            <div className="p-4 rounded-card bg-akr-surface-card border border-akr-gold/40 shadow-card-dark text-left">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-akr-text-muted tracking-wider block">
                    Total Outstanding
                  </span>
                  <div className="text-2xl font-extrabold text-white font-sans mt-0.5">
                    {formatCurrency(totalOutstanding)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-akr-text-muted tracking-wider block">
                    Next EMI
                  </span>
                  <div className="text-sm font-bold text-akr-gold">
                    {nextEmiAmount > 0 ? formatCurrency(nextEmiAmount) : 'No EMI'}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Due {nextEmiDate ? formatDisplayDate(nextEmiDate) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Plan Selector */}
          <div className="text-left">
            <label className="block text-xs font-bold text-akr-text-muted uppercase tracking-wider mb-2">
              Select Dues Plan
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedPlanId('all')}
                className={`
                  px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border
                  ${
                    selectedPlanId === 'all'
                      ? 'bg-akr-gold text-black border-akr-gold shadow-gold-glow'
                      : 'bg-akr-surface text-zinc-300 border-akr-border hover:border-akr-gold/40'
                  }
                `}
              >
                Pay All Dues ({plans.length})
              </button>

              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`
                    px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border
                    ${
                      selectedPlanId === p.id
                        ? 'bg-akr-gold text-black border-akr-gold shadow-gold-glow'
                        : 'bg-akr-surface text-zinc-300 border-akr-border hover:border-akr-gold/40'
                    }
                  `}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Breakdown Card (Phone 3 in template - Always adds up!) */}
          <div className="p-4 rounded-card bg-akr-surface border border-akr-border/80 text-left">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Payment Breakdown
            </h4>

            {isPayAll ? (
              <div className="space-y-2 text-xs">
                {allocations.map((alloc) => (
                  <div key={alloc.planId} className="flex justify-between items-center text-zinc-300">
                    <span className="truncate max-w-[200px]">{alloc.planTitle}</span>
                    <span className="font-semibold text-white">
                      {formatCurrency(alloc.allocatedAmount)}
                    </span>
                  </div>
                ))}
                <div className="pt-2.5 mt-2 border-t border-akr-border flex justify-between items-center font-bold text-sm">
                  <span className="text-white">Total Allocated</span>
                  <span className="text-akr-gold">{formatCurrency(payableAmount)}</span>
                </div>
              </div>
            ) : currentPlan ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Principal Amount</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(currentPlan.principal)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Interest</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(currentPlan.interest)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Processing Fee</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(currentPlan.processingFee)}
                  </span>
                </div>
                <div className="pt-2.5 mt-2 border-t border-akr-border flex justify-between items-center font-bold text-sm">
                  <span className="text-white">Total Outstanding</span>
                  <span className="text-akr-gold">
                    {formatCurrency(currentPlan.outstandingAmount)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Amount Options Selector */}
          <div className="text-left space-y-2">
            <label className="block text-xs font-bold text-akr-text-muted uppercase tracking-wider mb-1">
              Select Amount
            </label>

            <div className="space-y-2">
              {nextEmiAmount > 0 && (
                <label
                  onClick={() => setPaymentOption('emi')}
                  className={`
                    flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
                    ${
                      paymentOption === 'emi'
                        ? 'bg-akr-gold/10 border-akr-gold text-white'
                        : 'bg-akr-surface border-akr-border text-zinc-400'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    <input
                      type="radio"
                      name="amount_opt"
                      checked={paymentOption === 'emi'}
                      onChange={() => setPaymentOption('emi')}
                      className="accent-akr-gold"
                    />
                    <span>Pay Next EMI</span>
                  </div>
                  <span className="text-sm font-bold text-akr-gold">
                    {formatCurrency(nextEmiAmount)}
                  </span>
                </label>
              )}

              <label
                onClick={() => setPaymentOption('full')}
                className={`
                  flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
                  ${
                    paymentOption === 'full'
                      ? 'bg-akr-gold/10 border-akr-gold text-white'
                      : 'bg-akr-surface border-akr-border text-zinc-400'
                  }
                `}
              >
                <div className="flex items-center gap-2.5 text-xs font-semibold">
                  <input
                    type="radio"
                    name="amount_opt"
                    checked={paymentOption === 'full'}
                    onChange={() => setPaymentOption('full')}
                    className="accent-akr-gold"
                  />
                  <span>Pay Full Outstanding</span>
                </div>
                <span className="text-sm font-bold text-akr-gold">
                  {formatCurrency(totalOutstanding)}
                </span>
              </label>

              <label
                onClick={() => setPaymentOption('custom')}
                className={`
                  flex flex-col p-3 rounded-xl border cursor-pointer transition-all
                  ${
                    paymentOption === 'custom'
                      ? 'bg-akr-gold/10 border-akr-gold text-white'
                      : 'bg-akr-surface border-akr-border text-zinc-400'
                  }
                `}
              >
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="amount_opt"
                      checked={paymentOption === 'custom'}
                      onChange={() => setPaymentOption('custom')}
                      className="accent-akr-gold"
                    />
                    <span>Custom Amount</span>
                  </div>
                </div>

                {paymentOption === 'custom' && (
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-akr-gold font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder={`Max ${totalOutstanding}`}
                      value={customAmount}
                      max={totalOutstanding}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 bg-akr-bg border border-akr-border rounded-lg text-sm text-white focus:border-akr-gold outline-none"
                    />
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Payment Method Selector (Phone 3 in template) */}
          <div className="text-left space-y-2">
            <label className="block text-xs font-bold text-akr-text-muted uppercase tracking-wider mb-1">
              Select Payment Method
            </label>

            <div className="space-y-2">
              {/* UPI */}
              <div
                onClick={() => setSelectedMethod('UPI')}
                className={`
                  flex items-center justify-between p-3.5 rounded-card border cursor-pointer transition-all
                  ${
                    selectedMethod === 'UPI'
                      ? 'bg-akr-surface-card border-akr-gold ring-1 ring-akr-gold/40'
                      : 'bg-akr-surface border-akr-border/80'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-950/40 border border-orange-700/40 text-orange-400 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">UPI</h5>
                    <p className="text-[10px] text-zinc-400">Pay instantly using any UPI app</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'UPI' ? 'border-akr-gold bg-akr-gold' : 'border-zinc-600'}`}>
                  {selectedMethod === 'UPI' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
              </div>

              {/* Debit / Credit Card */}
              <div
                onClick={() => setSelectedMethod('CARD')}
                className={`
                  flex items-center justify-between p-3.5 rounded-card border cursor-pointer transition-all
                  ${
                    selectedMethod === 'CARD'
                      ? 'bg-akr-surface-card border-akr-gold ring-1 ring-akr-gold/40'
                      : 'bg-akr-surface border-akr-border/80'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-950/40 border border-blue-700/40 text-blue-400 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Debit / Credit Card</h5>
                    <p className="text-[10px] text-zinc-400">Visa, Mastercard, RuPay</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'CARD' ? 'border-akr-gold bg-akr-gold' : 'border-zinc-600'}`}>
                  {selectedMethod === 'CARD' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
              </div>

              {/* Net Banking */}
              <div
                onClick={() => setSelectedMethod('NETBANKING')}
                className={`
                  flex items-center justify-between p-3.5 rounded-card border cursor-pointer transition-all
                  ${
                    selectedMethod === 'NETBANKING'
                      ? 'bg-akr-surface-card border-akr-gold ring-1 ring-akr-gold/40'
                      : 'bg-akr-surface border-akr-border/80'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-950/40 border border-purple-700/40 text-purple-400 flex items-center justify-center">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Net Banking</h5>
                    <p className="text-[10px] text-zinc-400">All major Indian banks supported</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === 'NETBANKING' ? 'border-akr-gold bg-akr-gold' : 'border-zinc-600'}`}>
                  {selectedMethod === 'NETBANKING' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pay Now Button & Security Accents (Phone 3 in template) */}
      <div className="px-4 pt-2">
        <GoldButton
          onClick={handleOpenGateway}
          disabled={payableAmount <= 0}
        >
          Pay Now {payableAmount > 0 ? `• ${formatCurrency(payableAmount)}` : ''}
        </GoldButton>

        {/* Security Notes */}
        <div className="mt-3 flex flex-col items-center justify-center gap-1 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-akr-gold" />
            <span>Your payment is secure and encrypted</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Safe & Trusted</span>
          </div>
        </div>
      </div>

      {/* Mock Payment Gateway Bottom Sheet (Razorpay Simulator) */}
      <BottomSheet
        isOpen={isGatewayOpen}
        onClose={() => setIsGatewayOpen(false)}
        title="Mock Payment Gateway"
      >
        <div className="text-center p-2 space-y-4">
          <div className="p-3 rounded-xl bg-zinc-900 border border-akr-gold/40 text-xs text-zinc-300 leading-relaxed text-left">
            <p className="font-bold text-akr-gold mb-1 flex items-center gap-1.5">
              <span>⚠️</span> Prototype Mode: Razorpay Placeholder
            </p>
            <p>
              In production, this step invokes Razorpay Checkout with order verification.
              Select one of the simulated states below to test end-to-end reconciliation:
            </p>
          </div>

          <div className="p-4 rounded-xl bg-akr-bg border border-akr-border text-center">
            <span className="text-[10px] uppercase text-zinc-400">Payable Amount</span>
            <div className="text-2xl font-extrabold text-white font-sans mt-0.5">
              {formatCurrency(payableAmount)}
            </div>
            <span className="text-xs text-akr-gold uppercase font-semibold tracking-wider">
              Via {selectedMethod}
            </span>
          </div>

          <div className="space-y-2 pt-2">
            <GoldButton
              isLoading={isProcessing}
              onClick={() => handleExecutePaymentSimulation('success')}
            >
              Simulate Success (Complete Payment)
            </GoldButton>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleExecutePaymentSimulation('failure')}
              className="w-full py-3 rounded-button font-semibold text-xs text-red-400 bg-red-950/40 border border-red-800/60 hover:bg-red-900/60 transition-colors"
            >
              Simulate Failure
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleExecutePaymentSimulation('pending')}
              className="w-full py-3 rounded-button font-semibold text-xs text-amber-400 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/60 transition-colors"
            >
              Simulate Pending (Webhook Delay)
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
