import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles, Percent, Calendar, ArrowRight, Check } from 'lucide-react';
import { formatCurrency } from '../../core/formatters';

export interface EmiCalculationResult {
  tenureWeeks: number;
  tenureMonths: number;
  interestRate: number;
  interestAmount: number;
  totalOutstanding: number;
  emiAmount: number; // Weekly EMI
  totalEmis: number;
  remainingEmis: number;
  calculationType: 'flat' | 'reducing';
}

interface EmiTenureCalculatorProps {
  principal: number;
  processingFee: number;
  onApplyCalculation: (result: EmiCalculationResult) => void;
  defaultTenure?: number; // weeks (default 12)
  defaultInterestRate?: number; // default 0%
}

const PRESET_TENURES = [
  { weeks: 4, label: '4 Wks (1 Mo)' },
  { weeks: 6, label: '6 Wks' },
  { weeks: 8, label: '8 Wks (2 Mo)' },
  { weeks: 10, label: '10 Wks' },
  { weeks: 12, label: '12 Wks (3 Mo)' },
  { weeks: 16, label: '16 Wks (4 Mo)' },
  { weeks: 20, label: '20 Wks (5 Mo)' },
  { weeks: 26, label: '26 Wks (6 Mo)' },
];

const PRESET_RATES = [
  { rate: 0, label: '0% (Interest-Free)' },
  { rate: 5, label: '5%' },
  { rate: 10, label: '10%' },
  { rate: 12, label: '12%' },
];

export const EmiTenureCalculator: React.FC<EmiTenureCalculatorProps> = ({
  principal,
  processingFee,
  onApplyCalculation,
  defaultTenure = 12,
  defaultInterestRate = 0,
}) => {
  const [tenure, setTenure] = useState<number>(defaultTenure);
  const [isCustomTenure, setIsCustomTenure] = useState<boolean>(
    !PRESET_TENURES.some((p) => p.weeks === defaultTenure)
  );
  const [customTenureInput, setCustomTenureInput] = useState<string>(
    !PRESET_TENURES.some((p) => p.weeks === defaultTenure) ? String(defaultTenure) : '15'
  );

  const [interestRate, setInterestRate] = useState<number>(defaultInterestRate);
  const [isCustomRate, setIsCustomRate] = useState<boolean>(
    !PRESET_RATES.some((r) => r.rate === defaultInterestRate)
  );
  const [customRateInput, setCustomRateInput] = useState<string>(
    !PRESET_RATES.some((r) => r.rate === defaultInterestRate) ? String(defaultInterestRate) : '0'
  );

  const [calcType, setCalcType] = useState<'flat' | 'reducing'>('flat');

  // Compute live calculations in weeks
  const p = Math.max(0, Number(principal) || 0);
  const fee = Math.max(0, Number(processingFee) || 0);
  const n = Math.max(1, Number(tenure) || 1); // Number of weeks
  const r = Math.max(0, Number(interestRate) || 0);

  let interestAmount = 0;
  let emiAmount = 0;
  let totalOutstanding = 0;

  if (r === 0) {
    // 0% Interest-Free on-time product EMI
    interestAmount = 0;
    totalOutstanding = p + fee;
    emiAmount = Math.round(totalOutstanding / n);
  } else if (calcType === 'flat') {
    // Annualized to weeks: P * (r / 100) * (n / 52)
    interestAmount = Math.round(p * (r / 100) * (n / 52));
    totalOutstanding = p + interestAmount + fee;
    emiAmount = Math.round(totalOutstanding / n);
  } else {
    const weeklyRate = r / 52 / 100;
    if (weeklyRate === 0) {
      interestAmount = 0;
      totalOutstanding = p + fee;
      emiAmount = Math.round(totalOutstanding / n);
    } else {
      const factor = Math.pow(1 + weeklyRate, n);
      emiAmount = Math.round((p * weeklyRate * factor) / (factor - 1));
      interestAmount = Math.max(0, emiAmount * n - p);
      totalOutstanding = p + interestAmount + fee;
    }
  }

  // Notify parent on any change
  useEffect(() => {
    onApplyCalculation({
      tenureWeeks: n,
      tenureMonths: Math.ceil(n / 4),
      interestRate: r,
      interestAmount,
      totalOutstanding,
      emiAmount,
      totalEmis: n,
      remainingEmis: n,
      calculationType: calcType,
    });
  }, [p, fee, n, r, calcType, interestAmount, totalOutstanding, emiAmount]);

  const handleSelectPresetTenure = (weeks: number) => {
    setIsCustomTenure(false);
    setTenure(weeks);
  };

  const handleSelectCustomTenure = () => {
    setIsCustomTenure(true);
    const parsed = parseInt(customTenureInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setTenure(parsed);
    }
  };

  const handleCustomTenureChange = (val: string) => {
    setCustomTenureInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setTenure(parsed);
    }
  };

  const handleSelectPresetRate = (rateVal: number) => {
    setIsCustomRate(false);
    setInterestRate(rateVal);
  };

  const handleSelectCustomRate = () => {
    setIsCustomRate(true);
    const parsed = parseFloat(customRateInput);
    if (!isNaN(parsed) && parsed >= 0) {
      setInterestRate(parsed);
    }
  };

  const handleCustomRateChange = (val: string) => {
    setCustomRateInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      setInterestRate(parsed);
    }
  };

  return (
    <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#18181b] to-[#121215] border border-akr-gold/30 shadow-lg space-y-3.5">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-akr-gold/20 flex items-center justify-center text-akr-gold">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Weekly EMI & Product Schedule Calculator</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium">
                0% Interest-Free
              </span>
            </h4>
            <p className="text-[10px] text-zinc-400">
              Weekly installment plan: Zero interest charged when paid on schedule.
            </p>
          </div>
        </div>

        {/* Flat vs Reducing Toggle (only if interest > 0) */}
        {r > 0 && (
          <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-zinc-800 text-[10px]">
            <button
              type="button"
              onClick={() => setCalcType('flat')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                calcType === 'flat'
                  ? 'bg-akr-gold text-black font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Flat Rate
            </button>
            <button
              type="button"
              onClick={() => setCalcType('reducing')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                calcType === 'reducing'
                  ? 'bg-akr-gold text-black font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Reducing
            </button>
          </div>
        )}
      </div>

      {/* 1. Tenure Selection (Weeks) */}
      <div>
        <label className="flex items-center justify-between text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-akr-gold" />
            <span>Select Weekly Tenure (Number of Weeks) *</span>
          </span>
          <span className="text-akr-gold font-mono lowercase">
            {tenure} {tenure === 1 ? 'week' : 'weeks'}
          </span>
        </label>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {PRESET_TENURES.map((pItem) => {
            const isSelected = !isCustomTenure && tenure === pItem.weeks;
            return (
              <button
                key={pItem.weeks}
                type="button"
                onClick={() => handleSelectPresetTenure(pItem.weeks)}
                className={`
                  py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all border
                  ${
                    isSelected
                      ? 'bg-akr-gold text-black border-akr-gold shadow-md font-bold scale-[1.02]'
                      : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white'
                  }
                `}
              >
                {pItem.label}
              </button>
            );
          })}

          {/* Custom Weeks Option Button */}
          <button
            type="button"
            onClick={handleSelectCustomTenure}
            className={`
              py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all border col-span-1
              ${
                isCustomTenure
                  ? 'bg-akr-gold text-black border-akr-gold shadow-md font-bold scale-[1.02]'
                  : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white'
              }
            `}
          >
            Custom Wks...
          </button>
        </div>

        {/* Custom Weeks Input Field when Custom is Active */}
        {isCustomTenure && (
          <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-black/60 border border-akr-gold/40">
            <span className="text-[11px] text-zinc-300">Enter custom duration:</span>
            <input
              type="number"
              min={1}
              max={104}
              value={customTenureInput}
              onChange={(e) => handleCustomTenureChange(e.target.value)}
              placeholder="e.g. 8, 14, 20"
              className="w-24 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1 text-xs text-center font-bold focus:border-akr-gold outline-none"
            />
            <span className="text-xs text-zinc-400 font-medium">Weeks</span>
          </div>
        )}
      </div>

      {/* 2. Interest Rate Selection (%) - Default 0% */}
      <div>
        <label className="flex items-center justify-between text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
          <span className="flex items-center gap-1">
            <Percent className="w-3 h-3 text-akr-gold" />
            <span>Interest Rate (% - Default 0% Interest-Free) *</span>
          </span>
          <span className="text-emerald-400 font-mono font-bold">
            {interestRate === 0 ? '0% (Interest-Free)' : `${interestRate}% p.a.`}
          </span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {PRESET_RATES.map((rItem) => {
            const isSelected = !isCustomRate && interestRate === rItem.rate;
            return (
              <button
                key={rItem.rate}
                type="button"
                onClick={() => handleSelectPresetRate(rItem.rate)}
                className={`
                  py-1.5 px-1.5 rounded-lg text-xs font-semibold text-center transition-all border
                  ${
                    isSelected
                      ? 'bg-akr-gold text-black border-akr-gold shadow-md font-bold scale-[1.02]'
                      : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white'
                  }
                `}
              >
                {rItem.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Live Customer Quote / Pitch Box */}
      <div className="p-3 rounded-xl bg-black/70 border border-akr-gold/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-akr-gold tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Weekly Schedule & Customer Quote</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono font-semibold">
            {interestRate === 0 ? 'Zero Cost EMI' : `${interestRate}% Rate`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div>
            <span className="text-[9px] uppercase text-zinc-500 block">Weekly EMI</span>
            <span className="text-base font-extrabold text-white">
              {formatCurrency(emiAmount)}
            </span>
            <span className="text-[9px] text-zinc-400 block">per week</span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-zinc-500 block">Weekly Tenure</span>
            <span className="text-base font-extrabold text-akr-gold">
              {tenure} Wks
            </span>
            <span className="text-[9px] text-zinc-400 block">{tenure} Weekly Payments</span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-zinc-500 block">Total Interest</span>
            <span className="text-xs font-bold text-emerald-400">
              {interestAmount === 0 ? '₹0 (Free)' : formatCurrency(interestAmount)}
            </span>
            <span className="text-[9px] text-zinc-400 block">On-Time Repayment</span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-zinc-500 block">Total Payable</span>
            <span className="text-xs font-bold text-white">
              {formatCurrency(totalOutstanding)}
            </span>
            <span className="text-[9px] text-zinc-400 block">(No hidden fees)</span>
          </div>
        </div>

        {/* Plain-English Quote for Admin to tell the customer */}
        <div className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300 flex items-start gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-akr-gold flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Admin Pitch to Customer: </strong>
            Quote <span className="text-akr-gold font-bold">{formatCurrency(emiAmount)}/week</span> for{' '}
            <span className="text-white font-bold">{tenure} weeks</span>. Total repayment is{' '}
            <span className="text-white font-bold">{formatCurrency(totalOutstanding)}</span> at{' '}
            <strong className="text-emerald-400 font-bold">0% interest</strong>.
          </div>
        </div>
      </div>
    </div>
  );
};
