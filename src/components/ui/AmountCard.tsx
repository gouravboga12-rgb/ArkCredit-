import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDisplayDate } from '../../core/formatters';

interface AmountCardProps {
  totalOutstanding: number;
  nextEmiAmount: number;
  nextEmiDate: string;
  isDueSoon?: boolean;
  isOverdue?: boolean;
  overdueAmount?: number;
  onPayClick?: () => void;
  className?: string;
}

export const AmountCard: React.FC<AmountCardProps> = ({
  totalOutstanding,
  nextEmiAmount,
  nextEmiDate,
  isDueSoon = false,
  isOverdue = false,
  overdueAmount = 0,
  onPayClick,
  className = '',
}) => {
  return (
    <div
      onClick={onPayClick}
      className={`
        relative overflow-hidden rounded-card p-5 bg-akr-surface-card 
        ${isOverdue ? 'border-2 border-red-500/60 shadow-[0_4px_25px_rgba(239,68,68,0.2)]' : 'border border-akr-gold/40 shadow-[0_4px_25px_rgba(0,0,0,0.6)]'}
        cursor-pointer group transition-all duration-300
        hover:border-akr-gold hover:shadow-[0_4px_30px_rgba(212,175,55,0.15)]
        ${className}
      `}
    >
      {/* Background subtle sheen */}
      <div className={`absolute top-0 right-0 w-48 h-48 ${isOverdue ? 'bg-red-500/10' : 'bg-akr-gold/5'} rounded-full blur-3xl pointer-events-none`} />

      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase font-medium text-akr-text-muted tracking-wider">
          Outstanding Amount
        </span>
        {isOverdue ? (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/80 text-red-400 border border-red-500/50 shadow-sm animate-pulse flex items-center gap-1">
            <span>⚠️</span> OVERDUE
          </span>
        ) : isDueSoon ? (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#3A3018] text-[#F3D98B] border border-[#D4AF37]/40 shadow-sm animate-pulse">
            Due Soon
          </span>
        ) : null}
      </div>

      {/* Main Outstanding Amount */}
      <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-5 font-sans">
        {formatCurrency(totalOutstanding)}
      </div>

      {/* Bottom Row: Next EMI & Due Date with Chevron */}
      <div className="pt-3.5 border-t border-akr-border/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg bg-akr-surface flex items-center justify-center ${isOverdue ? 'text-red-400' : 'text-akr-gold'} border border-akr-border/80`}>
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-akr-text-muted uppercase">
              {isOverdue ? 'Overdue Weekly EMI' : 'Next Weekly EMI'}
            </div>
            <div className={`font-semibold ${isOverdue ? 'text-red-400' : 'text-white'}`}>
              {nextEmiAmount > 0 ? formatCurrency(nextEmiAmount) : 'No EMI'}
              {isOverdue && overdueAmount > 0 && (
                <span className="text-[10px] text-red-400 font-normal ml-1">
                  (+{formatCurrency(overdueAmount)} fee)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-akr-text-muted uppercase">Due Date</div>
            <div className="font-semibold text-white">
              {nextEmiDate ? formatDisplayDate(nextEmiDate) : 'N/A'}
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-akr-surface flex items-center justify-center text-akr-gold group-hover:translate-x-0.5 transition-transform">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
