import React from 'react';
import { Download, CheckCircle2, ChevronRight, IndianRupee, CreditCard, Receipt } from 'lucide-react';
import { formatCurrency, formatDisplayDate } from '../../core/formatters';
import { StatusBadge } from './StatusBadge';
import { PaymentMode } from '../../core/types';

interface ListRowProps {
  title: string;
  subtitle?: string;
  date: string;
  amount: number;
  status?: string;
  mode?: PaymentMode;
  iconType?: 'check' | 'rupee' | 'card' | 'receipt';
  onDownload?: () => void;
  onClick?: () => void;
  className?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  date,
  amount,
  status = 'Success',
  mode,
  iconType = 'rupee',
  onDownload,
  onClick,
  className = '',
}) => {
  const renderIcon = () => {
    switch (iconType) {
      case 'check':
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'card':
        return (
          <div className="w-10 h-10 rounded-full bg-[#2A2312] text-[#F3D98B] border border-[#D4AF37]/30 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        );
      case 'receipt':
        return (
          <div className="w-10 h-10 rounded-full bg-[#2A2312] text-[#F3D98B] border border-[#D4AF37]/30 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        );
      case 'rupee':
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-[#2A2312] text-[#F3D98B] border border-[#D4AF37]/30 flex items-center justify-center flex-shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center justify-between p-3.5 rounded-card bg-akr-surface/90 border border-akr-border/60
        hover:border-akr-border transition-all duration-200 group
        ${onClick ? 'cursor-pointer hover:bg-akr-surface-card' : ''}
        ${className}
      `}
    >
      <div className="flex items-center gap-3 min-w-0">
        {renderIcon()}
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-white truncate group-hover:text-akr-gold-light transition-colors">
            {title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-akr-text-muted mt-0.5">
            <span>{formatDisplayDate(date)}</span>
            {mode && (
              <>
                <span>•</span>
                <span className="uppercase text-[10px] bg-akr-bg px-1.5 py-0.5 rounded border border-akr-border/40">
                  {mode}
                </span>
              </>
            )}
            {subtitle && (
              <>
                <span>•</span>
                <span className="truncate">{subtitle}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <div className="text-right">
          <div className="text-sm font-bold text-white tracking-tight">
            {formatCurrency(amount)}
          </div>
          {status && (
            <div className="mt-0.5 flex justify-end">
              <StatusBadge status={status} size="sm" />
            </div>
          )}
        </div>

        {onDownload ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            aria-label="Download Receipt"
            className="w-8 h-8 rounded-full bg-akr-bg text-akr-text-muted hover:text-akr-gold hover:border-akr-gold border border-akr-border flex items-center justify-center transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        ) : onClick ? (
          <ChevronRight className="w-4 h-4 text-akr-text-dim group-hover:text-akr-gold transition-colors" />
        ) : null}
      </div>
    </div>
  );
};
