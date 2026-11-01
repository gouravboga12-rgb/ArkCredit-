import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { Download, CheckCircle2, ArrowLeft, Loader2, AlertCircle, FileText } from 'lucide-react';
import { useStore } from '../../store';
import { Payment } from '../../core/types';
import { consumerApi } from '../../core/api';
import { formatCurrency, formatDisplayDate, maskAccount } from '../../core/formatters';
import { AkrLogo } from '../../assets/logo';
import { PageHeader, GoldButton, StatusBadge, OutlineGoldButton } from '../../components/ui';

export const ReceiptScreen: React.FC = () => {
  const params = useParams();
  const rawId = params.paymentId || (params as any)['*'] || '';
  const paymentId = decodeURIComponent(rawId);
  const navigate = useNavigate();

  const duesPlans = useStore((state) => state.duesPlans || []);
  const consumers = useStore((state) => state.consumers || []);
  const consumerSession = useStore((state) => state.consumerSession);

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadReceipt() {
      if (!paymentId) {
        if (isMounted) {
          setError('No payment identifier provided.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      // 1. Check local store first (for instantaneous render)
      const currentPayments = useStore.getState().payments || [];
      const localFound = currentPayments.find(
        (p) =>
          p.id === paymentId ||
          p.transactionRef === paymentId ||
          p.reference === paymentId ||
          (paymentId.includes('/') && p.reference?.endsWith(paymentId.split('/').pop() || ''))
      );
      if (localFound && isMounted) {
        setPayment(localFound);
        setLoading(false);
      }

      // 2. Fetch fresh live verified receipt from server
      try {
        const livePayment = await consumerApi.getPaymentReceipt(encodeURIComponent(paymentId));
        if (isMounted && livePayment) {
          setPayment(livePayment);
          setLoading(false);
          return;
        }
      } catch (err) {
        // Fallback: fetch consumer payment history
        try {
          const history = await consumerApi.getPaymentHistory();
          const matched = history.find(
            (p) =>
              p.id === paymentId ||
              p.transactionRef === paymentId ||
              p.reference === paymentId ||
              (paymentId.includes('/') && p.reference?.endsWith(paymentId.split('/').pop() || ''))
          );
          if (isMounted) {
            if (matched) {
              setPayment(matched);
            } else if (!localFound) {
              setError('Payment transaction receipt not found.');
            }
          }
        } catch {
          if (isMounted && !localFound) {
            setError('Unable to load receipt details. Please verify your connection.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadReceipt();

    return () => {
      isMounted = false;
    };
  }, [paymentId]);

  const consumer =
    consumers.find((c) => c.id === payment?.consumerId) || consumerSession?.consumer;
  const consumerName = payment?.consumerName || consumer?.name || 'Consumer';
  const consumerAccount = payment?.consumerAccountNumber || consumer?.accountNumber || '';

  const plan = duesPlans.find((p) => p.id === payment?.planId);
  const planTitle =
    payment?.planTitle ||
    plan?.title ||
    (payment?.planId === 'all' ? 'All Overdue EMIs' : 'Weekly EMI Repayment');

  const handleDownloadPdf = () => {
    if (!payment) return;
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(212, 175, 55); // Gold
      doc.text('AKR CREDIT CAPITAL', 105, 25, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text('BUILDING POSSIBILITIES TOGETHER', 105, 32, { align: 'center' });
      doc.text('Official Payment Acknowledgement & Receipt', 105, 38, { align: 'center' });

      doc.setDrawColor(212, 175, 55);
      doc.line(20, 44, 190, 44);

      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');

      let y = 55;
      const addRow = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 25, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 110, y);
        y += 9;
      };

      addRow('Receipt Number:', payment.reference || payment.transactionRef || payment.id);
      addRow('Transaction ID:', payment.transactionRef || payment.id);
      addRow('Date & Time:', formatDisplayDate(payment.createdAt, true));
      addRow('Account Holder:', consumerName);
      addRow('Account Number:', maskAccount(consumerAccount));
      addRow('Plan / Dues Title:', planTitle);
      addRow('Payment Mode:', payment.mode || 'ONLINE');
      addRow('Status:', (payment.status || 'SUCCESS').toUpperCase());
      addRow('Amount Paid:', formatCurrency(payment.amount));

      doc.line(20, y + 2, 190, y + 2);
      y += 12;

      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(
        'This is a computer generated receipt. For queries, contact support@akrcredit.com.',
        105,
        y,
        { align: 'center' }
      );

      doc.save(`AKR_Receipt_${payment.reference || payment.id}.pdf`);
    } catch {
      window.print();
    }
  };

  if (loading && !payment) {
    return (
      <div className="flex-1 flex flex-col justify-between bg-akr-bg text-white pb-6 relative">
        <PageHeader title="Receipt" onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-akr-gold/15 border border-akr-gold/30 flex items-center justify-center text-akr-gold animate-spin">
            <Loader2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">Retrieving Payment Receipt</h4>
            <p className="text-xs text-zinc-400">Fetching verified transaction from secure gateway...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div className="flex-1 flex flex-col justify-between bg-akr-bg text-white pb-6 relative">
        <PageHeader title="Receipt" onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">Receipt Not Found</h4>
            <p className="text-xs text-zinc-400">{error}</p>
          </div>
          <div className="pt-2 w-full space-y-2">
            <GoldButton onClick={() => navigate('/app/history')}>
              View Payment History
            </GoldButton>
            <OutlineGoldButton onClick={() => navigate('/app/home')}>
              Back to Home
            </OutlineGoldButton>
          </div>
        </div>
      </div>
    );
  }

  if (!payment) return null;

  return (
    <div className="flex-1 flex flex-col justify-between bg-akr-bg text-white pb-6 relative overflow-y-auto">
      <div>
        <PageHeader title="Transaction Receipt" onBack={() => navigate(-1)} />

        <div className="p-4">
          {/* Printable Receipt Card */}
          <div
            id="printable-receipt"
            className="
              p-6 rounded-card bg-akr-surface border border-akr-gold/50 shadow-2xl text-left
              relative overflow-hidden
            "
          >
            {/* Top Logo & Watermark */}
            <div className="flex items-center justify-between pb-4 border-b border-akr-border/80">
              <AkrLogo size="sm" variant="image" />
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-mono">
                  Receipt #
                </span>
                <span className="text-xs font-bold text-akr-gold font-mono">
                  {payment.reference || payment.transactionRef || payment.id}
                </span>
              </div>
            </div>

            {/* Success Checkmark & Total Amount */}
            <div className="py-5 text-center border-b border-akr-border/80">
              <div className="w-12 h-12 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-600/40 flex items-center justify-center mx-auto mb-2 shadow-emerald-900/30 shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Amount Paid
              </span>
              <div className="text-3xl font-extrabold text-white font-sans mt-0.5">
                {formatCurrency(payment.amount)}
              </div>
              <div className="mt-2">
                <StatusBadge status={payment.status || 'success'} size="sm" />
              </div>
            </div>

            {/* Detailed Row Items */}
            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-akr-text-muted">Account Holder</span>
                <span className="font-bold text-white">{consumerName}</span>
              </div>

              {consumerAccount ? (
                <div className="flex justify-between items-center">
                  <span className="text-akr-text-muted">Account Number</span>
                  <span className="font-mono text-zinc-300">
                    {maskAccount(consumerAccount)}
                  </span>
                </div>
              ) : null}

              <div className="flex justify-between items-center">
                <span className="text-akr-text-muted">Dues Plan</span>
                <span className="font-semibold text-akr-gold-light text-right max-w-[60%] truncate">
                  {planTitle}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-akr-text-muted">Payment Mode</span>
                <span className="font-semibold text-white uppercase">{payment.mode || 'ONLINE'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-akr-text-muted">Transaction Ref</span>
                <span className="font-mono text-[11px] text-zinc-300">
                  {payment.transactionRef || payment.id}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-akr-text-muted">Date & Time</span>
                <span className="text-zinc-300">
                  {formatDisplayDate(payment.createdAt, true)}
                </span>
              </div>
            </div>

            {/* Bottom Security Watermark */}
            <div className="pt-4 border-t border-akr-border/80 text-center text-[10px] text-zinc-500">
              Generated via AKR Credit Capital Secure Switch • Verified
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 space-y-2.5">
            <GoldButton onClick={handleDownloadPdf} icon={<Download className="w-4 h-4" />}>
              Download PDF Receipt
            </GoldButton>
            <OutlineGoldButton onClick={() => navigate('/app/history')} icon={<FileText className="w-4 h-4" />}>
              View All Payment History
            </OutlineGoldButton>
          </div>
        </div>
      </div>
    </div>
  );
};
