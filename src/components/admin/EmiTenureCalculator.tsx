import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles, Percent, Calendar, ArrowRight, Check } from 'lucide-react';
import { formatCurrency } from '../../core/formatters';

export interface EmiCalculationResult {
  tenureMonths: number;
  interestRate: number;
  interestAmount: number;
  totalOutstanding: number;
  emiAmount: number;
  totalEmis: number;
  remainingEmis: number;
  calculationType: 'flat' | 'reducing';
}

interface EmiTenureCalculatorProps {
  principal: number;
  processingFee: number;
  onApplyCalculation: (result: EmiCalculationResult) => void;
  defaultTenure?: number;
  defaultInterestRate?: number;
}

const PRESET_TENURES = [
  { months: 6, label: '6 Mo' },
  { months: 9, label: '9 Mo' },
  { months: 11, label: '11 Mo' },
  { months: 12, label: '12 Mo (1 Yr)' },
  { months: 24, label: '24 Mo (2 Yrs)' },
  { months: 36, label: '36 Mo (3 Yrs)' },
];

const PRESET_RATES = [
  { rate: 0, label: '0% (No-Cost)' },
  { rate: 10, label: '10%' },
  { rate: 12, label: '12%' },
  { rate: 14, label: '14%' },
  { rate: 18, label: '18%' },
];

export const EmiTenureCalculator: React.FC<EmiTenureCalculatorProps> = ({
  principal,
  processingFee,
  onApplyCalculation,
  defaultTenure = 12,
  defaultInterestRate = 12,
}) => {
  const [tenure, setTenure] = useState<number>(defaultTenure);
  const [isCustomTenure, setIsCustomTenure] = useState<boolean>(
    !PRESET_TENURES.some((p) => p.months === defaultTenure)
  );
  const [customTenureInput, setCustomTenureInput] = useState<string>(
    !PRESET_TENURES.some((p) => p.months === defaultTenure) ? String(defaultTenure) : '15'
  );

  const [interestRate, setInterestRate] = useState<number>(defaultInterestRate);
  const [isCustomRate, setIsCustomRate] = useState<boolean>(
    !PRESET_RATES.some((r) => r.rate === defaultInterestRate)
  );
  const [customRateInput, setCustomRateInput] = useState<string>(
    !PRESET_RATES.some((r) => r.rate === defaultInterestRate) ? String(defaultInterestRate) : '15'
  );

  const [calcType, setCalcType] = useState<'flat' | 'reducing'>('flat');

  // Compute live calculations
  const p = Math.max(0, Number(principal) || 0);
  const fee = Math.max(0, Number(processingFee) || 0);
  const n = Math.max(1, Number(tenure) || 1);
  const r = Math.max(0, Number(interestRate) || 0);

  let interestAmount = 0;
  let emiAmount = 0;
  let totalOutstanding = 0;

  if (calcType === 'flat') {
    // Flat Rate Interest: P * (r / 100) * (n / 12)
    interestAmount = Math.round(p * (r / 100) * (n / 12));
    totalOutstanding = p + interestAmount + fee;
    emiAmount = Math.round(totalOutstanding / n);
  } else {
    // Reducing Balance Formula: [P * mr * (1+mr)^n] / [(1+mr)^n - 1]
    const monthlyRate = r / 12 / 100;
    if (monthlyRate === 0) {
      interestAmount = 0;
      totalOutstanding = p + fee;
      emiAmount = Math.round(totalOutstanding / n);
    } else {
      const factor = Math.pow(1 + monthlyRate, n);
      emiAmount = Math.round((p * monthlyRate * factor) / (factor - 1));
      interestAmount = Math.max(0, emiAmount * n - p);
      totalOutstanding = p + interestAmount + fee;
    }
  }

  // Notify parent on any change
  useEffect(() => {
    onApplyCalculation({
      tenureMonths: n,
      interestRate: r,
      interestAmount,
      totalOutstanding,
      emiAmount,
      totalEmis: n,
      remainingEmis: n,
      calculationType: calcType,
    });
  }, [p, fee, n, r, calcType, interestAmount, totalOutstanding, emiAmount]);

  const handleSelectPresetTenure = (months: number) => {
    setIsCustomTenure(false);
    setTenure(months);
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
              <span>Smart EMI & Tenure Calculator</span>
              <span className="text-[10px] bg-akr-gold/20 text-akr-gold px-1.5 py-0.5 rounded font-mono font-medium">
                Auto-Synced
              </span>
            </h4>
            <p className="text-[10px] text-zinc-400">
              Select tenure & interest % — EMI, total interest, and total payable calculate live.
            </p>
          </div>
        </div>

        {/* Flat vs Reducing Toggle */}
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
      </div>

      {/* 1. Tenure Selection (Months) */}
      <div>
        <label className="flex items-center justify-between text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-akr-gold" />
            <span>Select Tenure (Number of Months) *</span>
          </span>
          <span className="text-akr-gold font-mono lowercase">
            {tenure} {tenure === 1 ? 'month' : 'months'}
          </span>
        </label>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {PRESET_TENURES.map((pItem) => {
            const isSelected = !isCustomTenure && tenure === pItem.months;
            return (
              <button
                key={pItem.months}
                type="button"
                onClick={() => handleSelectPresetTenure(pItem.months)}
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

          {/* Custom Months Option Button */}
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
            Custom Mo...
          </button>
        </div>

        {/* Custom Months Input Field when Custom is Active */}
        {isCustomTenure && (
          <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-black/60 border border-akr-gold/40">
            <span className="text-[11px] text-zinc-300">Enter custom duration:</span>
            <input
              type="number"
              min={1}
              max={120}
              value={customTenureInput}
              onChange={(e) => handleCustomTenureChange(e.target.value)}
              placeholder="e.g. 8, 18, 48"
              className="w-24 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1 text-xs text-center font-bold focus:border-akr-gold outline-none"
            />
            <span className="text-xs text-zinc-400 font-medium">Months</span>
          </div>
        )}
      </div>

      {/* 2. Interest Rate Selection (%) */}
      <div>
        <label className="flex items-center justify-between text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
          <span className="flex items-center gap-1">
            <Percent className="w-3 h-3 text-akr-gold" />
            <span>Annual Interest Rate (% p.a.) *</span>
          </span>
          <span className="text-akr-gold font-mono">{interestRate}% p.a.</span>
        </label>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
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

          {/* Custom % Button */}
          <button
            type="button"
            onClick={handleSelectCustomRate}
            className={`
              py-1.5 px-1.5 rounded-lg text-xs font-semibold text-center transition-all border
              ${
                isCustomRate
                  ? 'bg-akr-gold text-black border-akr-gold shadow-md font-bold scale-[1.02]'
                  : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white'
              }
            `}
          >
            Custom %
          </button>
        </div>

        {/* Custom Rate Input when Custom % is Active */}
        {isCustomRate && (
          <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-black/60 border border-akr-gold/40">
            <span className="text-[11px] text-zinc-300">Enter custom interest %:</span>
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={customRateInput}
              onChange={(e) => handleCustomRateChange(e.target.value)}
              placeholder="e.g. 11.5, 13"
              className="w-24 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1 text-xs text-center font-bold focus:border-akr-gold outline-none"
            />
            <span className="text-xs text-zinc-400 font-medium">% per annum</span>
          </div>
        )}
      </div>

      {/* 3. Live Customer Quote / Pitch Box (Admin can tell customer this exact summary) */}
      <div className="p-3 rounded-xl bg-black/70 border border-akr-gold/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-akr-gold tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Customer Quote & Schedule</span>
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">
            {calcType === 'flat' ? 'Flat Interest' : 'Reducing Rate'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div>
            <span className="text-[9px] uppercase text-zinc-500 block">Monthly EMI</span>
            <span className="text-base font-extrabold text-white">
              {formatCurrency(emiAmount)}
            </span>
            <span className="text-[9px] text-zinc-400 block">per month</span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-zinc-500 block">Tenure Duration</span>
            <span className="text-base font-extrabold text-akr-gold">
              {tenure} Mo
            </span>
            <span className="text-[9px] text-zinc-400 block">{tenure} Installments</span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-zinc-500 block">Total Interest</span>
            <span className="text-xs font-bold text-amber-400">
              {formatCurrency(interestAmount)}
            </span>
            <span className="text-[9px] text-zinc-400 block">@ {interestRate}% p.a.</span>
          </div>
          <div>
            <span className="text-[9px] uppercase text-zinc-500 block">Total Payable</span>
            <span className="text-xs font-bold text-emerald-400">
              {formatCurrency(totalOutstanding)}
            </span>
            <span className="text-[9px] text-zinc-400 block">(incl. ₹{fee} fee)</span>
          </div>
        </div>

        {/* Plain-English Quote for Admin to tell the customer */}
        <div className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300 flex items-start gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-akr-gold flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Admin Pitch to Customer: </strong>
            Quote <span className="text-akr-gold font-bold">{formatCurrency(emiAmount)}/month</span> for{' '}
            <span className="text-white font-bold">{tenure} months</span>. Total repayment is{' '}
            <span className="text-white font-bold">{formatCurrency(totalOutstanding)}</span>{' '}
            (Principal: {formatCurrency(p)} + Interest: {formatCurrency(interestAmount)} + Fee: {formatCurrency(fee)}).
          </div>
        </div>
      </div>
    </div>
  );
};
