import React from 'react';
import { Check, Calendar, ArrowRight, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
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
  const isCleared = plan.status === 'closed' || plan.outstandingAmount === 0;
  const isOverdue =
    !isCleared &&
    (Boolean(plan.overdueAmount && plan.overdueAmount > 0) ||
      Boolean(plan.nextEmiDate && new Date(plan.nextEmiDate) < new Date()));
  const isDueSoon = !isCleared && !isOverdue && plan.status === 'active';
  
  // Format clean due date
  const displayDueDate = plan.nextEmiDate ? formatDisplayDate(plan.nextEmiDate) : 'On Schedule';
  const displayEmi = plan.emiAmount > 0 ? plan.emiAmount : plan.outstandingAmount;

  return (
    <div
      className={`
        bg-gradient-to-b ${isOverdue ? 'from-[#221010] to-[#150d0d] border-red-500/50 shadow-red-950/40' : 'from-[#18181D] to-[#121215] border-akr-border/80'} 
        text-white rounded-2xl p-4 sm:p-5
        shadow-xl border relative overflow-hidden transition-all duration-200
        hover:border-akr-gold/40 hover:shadow-2xl
        ${className}
      `}
    >
      {/* Top Header: Title & Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            <span>{plan.title || 'EMI Payment'}</span>
            {isOverdue && (
              <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-700/60 font-semibold px-2 py-0.5 rounded-full">
                {plan.missedWeeks || plan.missedMonths || 1} wk missed
              </span>
            )}
          </h4>
          <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
            Ref: {plan.referenceNumber}
          </p>
        </div>

        {/* Status Badge */}
        <div>
          {isCleared ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CLEARED</span>
            </span>
          ) : isOverdue ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-red-400 uppercase bg-red-500/15 px-2.5 py-0.5 rounded-full border border-red-500/40 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>OVERDUE</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-amber-400 uppercase bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>ON SCHEDULE</span>
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

        {/* Center: Status Icon Badge */}
        <div
          className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-sm flex-shrink-0 ${
            isOverdue
              ? 'bg-red-500/20 border-red-500/50 text-red-400'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
          }`}
        >
          {isOverdue ? (
            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <Check className="w-4 h-4 stroke-[3]" />
          )}
        </div>

        {/* Right: Payment Amount */}
        <div className="text-right">
          <span className="text-[11px] font-medium text-zinc-400 block mb-0.5">
            {isOverdue ? 'Overdue Weekly EMI' : 'Weekly Payment'}
          </span>
          <span className="text-base sm:text-lg font-black text-white font-sans tracking-tight block">
            {formatCurrency(displayEmi * (plan.missedWeeks || plan.missedMonths || 1))}
          </span>
          {Boolean(plan.overdueAmount && plan.overdueAmount > 0) && (
            <span className="text-[10px] text-red-400 font-semibold block">
              +{formatCurrency(plan.overdueAmount)} Late Fee
            </span>
          )}
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
            {plan.totalEmis - plan.remainingEmis}/{plan.totalEmis} Weeks Paid
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
