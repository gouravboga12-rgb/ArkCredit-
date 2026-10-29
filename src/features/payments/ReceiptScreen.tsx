import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { Download, CheckCircle2, ArrowLeft, Printer } from 'lucide-react';
import { useStore } from '../../store';
import { Payment } from '../../core/types';
import { formatCurrency, formatDisplayDate, maskAccount } from '../../core/formatters';
import { AkrLogo } from '../../assets/logo';
import { PageHeader, GoldButton, StatusBadge } from '../../components/ui';

export const ReceiptScreen: React.FC = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();

  const payments = useStore((state) => state.payments);
  const duesPlans = useStore((state) => state.duesPlans);
  const consumers = useStore((state) => state.consumers);
  const consumerSession = useStore((state) => state.consumerSession);

  const [payment, setPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (paymentId) {
      const found = payments.find((p) => p.id === paymentId);
      if (found) {
        setPayment(found);
      } else {
        // Fallback to first payment if not found
        setPayment(payments[0] || null);
      }
    }
  }, [paymentId, payments]);

  if (!payment) {
    return (
      <div className="flex-1 flex flex-col justify-between bg-akr-bg text-white p-6 text-center">
        <PageHeader title="Receipt" onBack={() => navigate(-1)} />
        <div className="my-auto">
          <p className="text-sm text-zinc-400">Loading receipt details...</p>
        </div>
      </div>
    );
  }

  const consumer = consumers.find((c) => c.id === payment.consumerId) || consumerSession?.consumer;
  const plan = duesPlans.find((p) => p.id === payment.planId);

  const handleDownloadPdf = () => {
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

      addRow('Receipt Number:', payment.reference || payment.transactionRef);
      addRow('Transaction ID:', payment.transactionRef);
      addRow('Date & Time:', formatDisplayDate(payment.createdAt, true));
      addRow('Account Holder:', consumer?.name || 'Consumer');
      addRow('Account Number:', maskAccount(consumer?.accountNumber));
      addRow('Plan Title:', plan?.title || 'EMI / Dues Payment');
      addRow('Payment Mode:', payment.mode);
      addRow('Status:', payment.status.toUpperCase());
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
                  {payment.reference || payment.id}
                </span>
              </div>
            </div>

            {/* Success Checkmark & Total Amount */}
            <div className="py-5 text-center border-b border-akr-border/80">
              <div className="w-12 h-12 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-600/40 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Amount Paid
              </span>
              <div className="text-3xl font-extrabold text-white font-sans mt-0.5">
                {formatCurrency(payment.amount)}
              </div>
              <div className="mt-2">
                <StatusBadge status={payment.status} size="sm" />
              </div>
            </div>

            {/* Detailed Row Items */}
            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-akr-text-muted">Account Holder</span>
                <span className="font-bold text-white">{consumer?.name || 'Consumer'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-akr-text-muted">Account Number</span>
                <span className="font-mono text-zinc-300">
                  {maskAccount(consumer?.accountNumber)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-akr-text-muted">Dues Plan</span>
                <span className="font-semibold text-akr-gold-light">
                  {plan?.title || 'EMI Payment'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-akr-text-muted">Payment Mode</span>
                <span className="font-semibold text-white uppercase">{payment.mode}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-akr-text-muted">Transaction Ref</span>
                <span className="font-mono text-[11px] text-zinc-300">
                  {payment.transactionRef}
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
          <div className="mt-5">
            <GoldButton onClick={handleDownloadPdf} icon={<Download className="w-4 h-4" />}>
              Download PDF Receipt
            </GoldButton>
          </div>
        </div>
      </div>
    </div>
  );
};
