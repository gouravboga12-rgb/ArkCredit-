import React from 'react';
import { Check, Calendar, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { DuesPlan } from '../../core/types';
import { formatCurrency, formatDisplayDate } from '../../core/formatters';

interface DuePaymentCardProps {
  plan: DuesPlan;
  onPayNow: (planId: string) => void;
  className?: string;
}

export const DuePaymentCard: React.FC<DuePaymentCardProps> = ({
  plan,
  onPayNow,
  className = '',
}) => {
  // Determine due timing status
  const isPaidOnTime = plan.status === 'closed' || plan.outstandingAmount === 0;
  const isDueSoon = plan.status === 'active' && plan.outstandingAmount > 0;
  
  // Format clean due date
  const displayDueDate = plan.nextEmiDate ? formatDisplayDate(plan.nextEmiDate) : 'On Schedule';
  const displayEmi = plan.emiAmount > 0 ? plan.emiAmount : plan.outstandingAmount;

  return (
    <div
      className={`
        bg-gradient-to-b from-[#18181D] to-[#121215] text-white rounded-2xl p-4 sm:p-5
        shadow-xl border border-akr-border/80 relative overflow-hidden transition-all duration-200
        hover:border-akr-gold/40 hover:shadow-2xl
        ${className}
      `}
    >
      {/* Top Header: Title & Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            <span>{plan.title || 'EMI Payment'}</span>
          </h4>
          <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
            Ref: {plan.referenceNumber}
          </p>
        </div>

        {/* Status Badge */}
        <div>
          {isPaidOnTime ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PAID ON TIME</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>PAID ON TIME</span>
            </span>
          )}
        </div>
      </div>

      {/* Middle Grid: Due Date, Green Checkmark, and Payment Amount */}
      <div className="flex items-center justify-between py-3 border-t border-b border-akr-border/70 my-2">
        {/* Left: Due Date */}
        <div className="text-left">
          <span className="text-[11px] font-medium text-zinc-400 block mb-0.5">
            Due Date
          </span>
          <span className="text-sm sm:text-base font-extrabold text-white font-mono tracking-tight block">
            {displayDueDate}
          </span>
        </div>

        {/* Center: Prominent Green Checkmark Badge */}
        <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm flex-shrink-0">
          <Check className="w-4 h-4 stroke-[3]" />
        </div>

        {/* Right: Payment Amount */}
        <div className="text-right">
          <span className="text-[11px] font-medium text-zinc-400 block mb-0.5">
            Payment
          </span>
          <span className="text-base sm:text-lg font-black text-white font-sans tracking-tight block">
            {formatCurrency(displayEmi)}
          </span>
        </div>
      </div>

      {/* Bottom Row: Additional Date/Details & Prominent "Pay Now" Button */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-left">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            Total Outstanding
          </span>
          <span className="text-xs font-bold text-akr-gold">
            {formatCurrency(plan.outstandingAmount)}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">
            {plan.totalEmis - plan.remainingEmis}/{plan.totalEmis} EMIs Paid
          </span>
        </div>

        {/* "Pay Now" Action Button */}
        <div>
          {plan.outstandingAmount > 0 ? (
            <button
              type="button"
              onClick={() => onPayNow(plan.id)}
              className="
                bg-gradient-to-r from-akr-gold via-amber-400 to-akr-gold-dark
                hover:brightness-110 active:scale-95 text-black px-5 sm:px-6 py-2.5 rounded-xl
                font-extrabold text-xs shadow-gold-glow flex items-center gap-1.5
                transition-all duration-150 cursor-pointer select-none
              "
            >
              <span>Pay Now</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          ) : (
            <span className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/30">
              Cleared ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
