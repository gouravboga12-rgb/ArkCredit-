import React from 'react';
import { Check, Sparkles, ShieldCheck } from 'lucide-react';
import { CardType } from '../../core/types';
import { formatCurrency } from '../../core/formatters';

interface CardTypeCardProps {
  card: CardType;
  onEnquire?: () => void;
  onCardClick?: () => void;
  className?: string;
  compact?: boolean;
}

export const CardTypeCard: React.FC<CardTypeCardProps> = ({
  card,
  onEnquire,
  onCardClick,
  className = '',
  compact = false,
}) => {
  const isGold = card.name.toLowerCase().includes('gold');

  return (
    <div
      onClick={onCardClick}
      className={`
        rounded-card overflow-hidden bg-akr-surface border border-akr-border/80 p-4 transition-all duration-300
        hover:border-akr-gold/60 hover:shadow-card-dark
        ${onCardClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Visual Credit Card */}
      <div
        className={`
          relative w-full aspect-[1.586/1] rounded-xl p-4 flex flex-col justify-between overflow-hidden shadow-xl
          ${
            isGold
              ? 'bg-gradient-to-tr from-[#1E1708] via-[#3D2F10] to-[#6E551E] border border-[#D4AF37]/50'
              : 'bg-gradient-to-tr from-[#121316] via-[#242831] to-[#3B4252] border border-zinc-500/40'
          }
        `}
      >
        {/* Subtle decorative wave overlay */}
        <div className="absolute inset-0 bg-gold-card-sheen opacity-60 pointer-events-none" />

        {/* Card Header: AKR Logo & Chip */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-serif font-bold text-sm tracking-wider text-[#F3D98B]">
              AKR
            </span>
            <span className="text-[7px] uppercase tracking-widest text-zinc-300">
              Credit Capital
            </span>
          </div>

          {/* EMV Chip */}
          <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-200 to-amber-500 border border-amber-600/60 flex items-center justify-center opacity-90 shadow-inner">
            <div className="w-6 h-4 border border-amber-700/40 rounded-sm" />
          </div>
        </div>

        {/* Center: Card Name */}
        <div className="relative z-10 my-auto">
          <h3 className="font-serif text-lg font-bold tracking-wide text-white drop-shadow">
            {card.name}
          </h3>
          <p className="text-[10px] text-zinc-300 font-mono tracking-widest mt-0.5">
            •••• •••• •••• 8842
          </p>
        </div>

        {/* Card Footer: Cardholder & VISA Mark */}
        <div className="relative z-10 flex items-end justify-between">
          <div className="text-[9px] uppercase tracking-wider text-zinc-300 font-mono">
            <div>VALID THRU</div>
            <div className="font-semibold text-white">10/30</div>
          </div>

          <div className="flex items-center">
            <span className="font-sans font-black italic text-lg tracking-tighter text-white drop-shadow">
              VISA
            </span>
          </div>
        </div>
      </div>

      {/* Features & Charges */}
      {!compact && (
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            {card.features.slice(0, 3).map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300">
                <div className="w-4 h-4 rounded-full bg-akr-gold/15 text-akr-gold flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="pt-2.5 border-t border-akr-border/60 flex items-center justify-between text-xs">
            <div>
              <span className="text-akr-text-muted text-[10px] uppercase block">Joining Fee</span>
              <span className="font-bold text-white">
                {card.charges.joiningFee === 0 ? 'FREE' : formatCurrency(card.charges.joiningFee)}
              </span>
            </div>
            <div>
              <span className="text-akr-text-muted text-[10px] uppercase block">Annual Fee</span>
              <span className="font-bold text-white">
                {card.charges.annualFee === 0 ? 'FREE' : formatCurrency(card.charges.annualFee)}
              </span>
            </div>
            <div>
              <span className="text-akr-text-muted text-[10px] uppercase block">Interest Rate</span>
              <span className="font-bold text-akr-gold-light">{card.charges.interestRate}</span>
            </div>
          </div>

          {onEnquire && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEnquire();
              }}
              className="w-full mt-2 py-2.5 rounded-button text-xs font-semibold bg-akr-surface-card border border-akr-gold/40 text-akr-gold hover:bg-akr-gold hover:text-black transition-all duration-200"
            >
              Enquire Now
            </button>
          )}
        </div>
      )}
    </div>
  );
};
