import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Filter,
  Calendar,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  History,
  ArrowRight,
  TrendingUp,
  CreditCard,
  IndianRupee,
  Layers,
} from 'lucide-react';
import { consumerApi } from '../../core/api';
import { Payment, DuesPlan } from '../../core/types';
import { formatCurrency, formatDisplayDate, formatMonthHeader } from '../../core/formatters';
import { PageHeader, ListRow, BottomNav, Skeleton, EmptyState, StatusBadge, BottomSheet } from '../../components/ui';

export const PaymentHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [duesData, setDuesData] = useState<{
    totalOutstanding: number;
    nextEmiAmount: number;
    nextEmiDate: string;
    plans: DuesPlan[];
    allPlans?: DuesPlan[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Active View Tab: 'history' (Transactions) | 'ledger' (Repayment Schedule)
  const [activeTab, setActiveTab] = useState<'history' | 'ledger'>('history');

  // Filters
  const [selectedPlanId, setSelectedPlanId] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'emi' | 'card'>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected payment for detail modal
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [paymentsRes, duesRes] = await Promise.all([
          consumerApi.getPaymentHistory().catch(() => []),
          consumerApi.getDues().catch(() => null),
        ]);
        setPayments(paymentsRes);
        if (duesRes) setDuesData(duesRes);
      } catch (err) {
        console.error('Failed to fetch payment data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    const handleRealtimePayment = () => {
      fetchData();
    };
    const handleRealtimeDues = () => {
      fetchData();
    };

    window.addEventListener('akr_payment_realtime_update', handleRealtimePayment);
    window.addEventListener('akr_dues_realtime_update', handleRealtimeDues);

    return () => {
      window.removeEventListener('akr_payment_realtime_update', handleRealtimePayment);
      window.removeEventListener('akr_dues_realtime_update', handleRealtimeDues);
    };
  }, []);

  // Total paid metric
  const totalAmountPaid = useMemo(() => {
    return payments
      .filter((p) => p.status === 'success')
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [payments]);

  // Handle Date Presets
  const handleSelectPreset = (preset: 'all' | 'today' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'week') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setFromDate(past.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (preset === 'month') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      setFromDate(`${y}-${m}-01`);
      setToDate(todayStr);
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  // Unique plans list for filtering
  const consumerPlansList = useMemo(() => {
    return duesData?.allPlans || duesData?.plans || [];
  }, [duesData]);

  // Filter payments by Plan, Type, Custom Dates, and Search Query
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!p) return false;
      const pType = (p.planTypeId || '').toLowerCase();

      // 1. Specific Plan Filter
      if (selectedPlanId !== 'all') {
        if (selectedPlanId === 'card') {
          if (!pType.includes('card')) return false;
        } else if (p.planId !== selectedPlanId) {
          return false;
        }
      }

      // 2. Type filter
      if (typeFilter === 'emi' && !pType.includes('loan') && !pType.includes('emi') && pType.includes('card')) {
        return false;
      }
      if (typeFilter === 'card' && !pType.includes('card')) {
        return false;
      }

      // 3. Custom Date Range Filter
      if (fromDate || toDate) {
        if (!p.createdAt) return false;
        const pDate = p.createdAt.split('T')[0];
        if (fromDate && pDate < fromDate) return false;
        if (toDate && pDate > toDate) return false;
      }

      // 4. Search query matching UTR, reference, or Plan title
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchedPlan = consumerPlansList.find((plan) => plan.id === p.planId);
        const matchRef =
          (p.transactionRef || '').toLowerCase().includes(q) ||
          (p.reference || '').toLowerCase().includes(q) ||
          (p.planReference || '').toLowerCase().includes(q) ||
          (matchedPlan?.referenceNumber || '').toLowerCase().includes(q);
        const matchTitle =
          (p.planTitle || '').toLowerCase().includes(q) ||
          (matchedPlan?.title || '').toLowerCase().includes(q) ||
          (matchedPlan?.productName || '').toLowerCase().includes(q);
        const matchAmount =
          p.amount !== undefined && p.amount !== null ? p.amount.toString().includes(q) : false;
        if (!matchRef && !matchTitle && !matchAmount) return false;
      }

      return true;
    });
  }, [payments, selectedPlanId, typeFilter, fromDate, toDate, searchQuery, consumerPlansList]);

  // Group by month
  const groupedByMonth = useMemo(() => {
    const map: Record<string, Payment[]> = {};
    filteredPayments.forEach((p) => {
      const month = formatMonthHeader(p.createdAt);
      if (!map[month]) {
        map[month] = [];
      }
      map[month].push(p);
    });
    return map;
  }, [filteredPayments]);

  const monthKeys = Object.keys(groupedByMonth);

  return (
    <div className="flex-1 flex flex-col justify-between bg-akr-bg text-white pb-28 relative overflow-y-auto">
      <div>
        <PageHeader title="Payments & Ledger" onBack={() => navigate('/app/home')} />

        <div className="p-4 space-y-4">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1A1813] to-[#14120E] border border-akr-gold/40 shadow-lg text-left">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Total Paid</span>
              </span>
              <div className="text-xl font-extrabold text-white font-sans mt-1">
                {formatCurrency(totalAmountPaid)}
              </div>
              <span className="text-[10px] text-emerald-400 mt-0.5 block font-medium">
                {payments.filter((p) => p.status === 'success').length} verified repayments
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#18181D] to-[#121215] border border-zinc-800 shadow-lg text-left">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Active Balance</span>
              </span>
              <div className="text-xl font-extrabold text-akr-gold font-sans mt-1">
                {formatCurrency(duesData?.totalOutstanding || 0)}
              </div>
              <span className="text-[10px] text-zinc-400 mt-0.5 block font-mono">
                {duesData?.plans?.length || 0} active plan{duesData?.plans?.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Segmented Control: Transactions vs Ledger */}
          <div className="grid grid-cols-2 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-akr-gold text-black font-extrabold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Transaction History</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-akr-gold text-black font-extrabold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Repayment Ledger</span>
            </button>
          </div>

          {/* TAB 1: TRANSACTION HISTORY WITH CUSTOM DATE FILTERS */}
          {activeTab === 'history' && (
            <div className="space-y-3.5">
              {/* Filter Presets Row */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-akr-gold" />
                    <span>Filter By Date</span>
                  </span>
                  {(fromDate || toDate || datePreset !== 'all') && (
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('all')}
                      className="text-[10px] text-akr-gold hover:underline"
                    >
                      Clear Date Filter
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'month', label: 'This Month' },
                    { id: 'custom', label: 'Custom...' },
                  ].map((chip) => {
                    const isSelected = datePreset === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => handleSelectPreset(chip.id as any)}
                        className={`py-1.5 px-2 rounded-lg font-semibold border transition-all text-center ${
                          isSelected
                            ? 'bg-akr-gold text-black border-akr-gold font-bold shadow-sm'
                            : 'bg-akr-surface text-zinc-300 border-akr-border/60 hover:border-zinc-500'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Date Pickers when 'Custom...' or date is set */}
                {datePreset === 'custom' && (
                  <div className="p-3 rounded-xl bg-zinc-900/95 border border-akr-gold/40 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-bold">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full bg-black/60 border border-zinc-700 text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-akr-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase block mb-1 font-bold">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full bg-black/60 border border-zinc-700 text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-akr-gold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Plan Filter, Type Filter & Search Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <select
                    value={selectedPlanId !== 'all' ? selectedPlanId : typeFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'all' || val === 'emi' || val === 'card') {
                        setTypeFilter(val as any);
                        setSelectedPlanId('all');
                      } else {
                        setSelectedPlanId(val);
                        setTypeFilter('all');
                      }
                    }}
                    className="w-full bg-akr-surface border border-akr-border/80 text-white rounded-xl py-2 px-3 pr-8 text-xs font-semibold focus:border-akr-gold outline-none appearance-none truncate"
                  >
                    <option value="all">All EMI Plans & Payments</option>
                    {consumerPlansList.length > 0 && (
                      <optgroup label="Filter by EMI Plan">
                        {consumerPlansList.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.title} (Ref: {plan.referenceNumber})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Payment Categories">
                      <option value="emi">All Weekly EMIs</option>
                      <option value="card">Card Repayments</option>
                    </optgroup>
                  </select>
                  <Filter className="w-3.5 h-3.5 text-akr-gold absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search plan, UTR, ref, or amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-akr-surface border border-akr-border/80 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:border-akr-gold outline-none"
                  />
                </div>
              </div>

              {/* Quick EMI Plan Filter Pills */}
              {consumerPlansList.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanId('all');
                      setTypeFilter('all');
                    }}
                    className={`px-2.5 py-1 rounded-full whitespace-nowrap font-semibold border transition-all ${
                      selectedPlanId === 'all' && typeFilter === 'all'
                        ? 'bg-akr-gold/20 text-akr-gold border-akr-gold shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    All Plans ({payments.length})
                  </button>
                  {consumerPlansList.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const planPayCount = payments.filter((pay) => pay.planId === plan.id).length;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          setTypeFilter('all');
                        }}
                        className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium border flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-akr-gold/20 text-akr-gold border-akr-gold font-bold shadow-sm'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white'
                        }`}
                      >
                        <span>{plan.title}</span>
                        <span className="font-mono text-[9px] opacity-75">({planPayCount})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Payments Grouped by Month Headers */}
              {loading ? (
                <div className="space-y-3 pt-2">
                  <Skeleton className="h-6 w-32 rounded" />
                  <Skeleton className="h-16 w-full rounded-card" />
                  <Skeleton className="h-16 w-full rounded-card" />
                </div>
              ) : monthKeys.length > 0 ? (
                <div className="space-y-5 text-left pt-1">
                  {monthKeys.map((month) => (
                    <div key={month} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold text-akr-gold tracking-wider uppercase">
                          {month}
                        </h3>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {groupedByMonth[month].length} payment{groupedByMonth[month].length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {groupedByMonth[month].map((p) => {
                          const matchedPlan =
                            duesData?.plans?.find((plan) => plan.id === p.planId) ||
                            duesData?.allPlans?.find((plan) => plan.id === p.planId);

                          const isCard = (p.planTypeId || '').toLowerCase().includes('card');

                          // Determine clear plan title so customer immediately recognizes the item
                          const planTitle =
                            p.planTitle ||
                            matchedPlan?.title ||
                            (p.planId === 'all' || p.planId === 'plan_all'
                              ? 'Combined EMI Repayment (All Plans)'
                              : isCard
                              ? 'Privilege Card Payment'
                              : 'Weekly EMI Repayment');

                          // Plan reference ID
                          const planRef = p.planReference || matchedPlan?.referenceNumber || '';

                          // Installment calculation description
                          const emiAmt = matchedPlan?.emiAmount || 0;
                          let installmentTag = p.installmentDescription || '';
                          if (!installmentTag && emiAmt > 0 && p.amount > 0) {
                            const weeksCovered = Math.round(p.amount / emiAmt);
                            installmentTag = weeksCovered > 1 ? `${weeksCovered} Wks Paid` : 'Weekly EMI';
                          } else if (!installmentTag) {
                            installmentTag = isCard ? 'Card Repayment' : 'Weekly EMI';
                          }

                          return (
                            <ListRow
                              key={p.id}
                              title={planTitle}
                              badgeText={planRef ? `Ref: ${planRef}` : undefined}
                              tagText={installmentTag}
                              subtitle={p.reference}
                              date={p.createdAt}
                              amount={p.amount}
                              status={p.status}
                              mode={p.mode}
                              iconType={isCard ? 'card' : 'rupee'}
                              onClick={() => setSelectedPayment(p)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No Transactions Found"
                  description="No payments match your date range or filter settings."
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setTypeFilter('all');
                        setDatePreset('all');
                        setFromDate('');
                        setToDate('');
                        setSearchQuery('');
                      }}
                      className="px-4 py-1.5 rounded-lg text-xs bg-akr-surface text-akr-gold border border-akr-gold/40"
                    >
                      Reset All Filters
                    </button>
                  }
                />
              )}
            </div>
          )}

          {/* TAB 2: REPAYMENT LEDGER (WEEK-BY-WEEK INSTALLMENTS) */}
          {activeTab === 'ledger' && (
            <div className="space-y-4 text-left">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-32 w-full rounded-2xl" />
                  <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
              ) : duesData?.plans && duesData.plans.length > 0 ? (
                duesData.plans.map((plan) => {
                  const totalEmis = plan.totalEmis || 4;
                  const remainingEmis = plan.remainingEmis !== undefined ? plan.remainingEmis : 1;
                  const paidEmis = Math.max(0, totalEmis - remainingEmis);
                  const progressPct = Math.round((paidEmis / totalEmis) * 100);
                  const baseDateStr = plan.firstEmiDate || plan.startDate || (plan.createdAt ? plan.createdAt.split('T')[0] : '2026-11-02');
                  const base = new Date(baseDateStr);
                  const validBase = isNaN(base.getTime()) ? new Date('2026-11-02') : base;

                  // Find matching payments for this plan
                  const planPayments = payments
                    .filter((pay) => pay.planId === plan.id || pay.consumerId === plan.consumerId)
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                  // Build the week-by-week installment schedule
                  const installments = Array.from({ length: totalEmis }, (_, i) => {
                    const instNum = i + 1;
                    const isPaid = instNum <= paidEmis;
                    const instDate = new Date(validBase);
                    instDate.setDate(validBase.getDate() + (7 * i));
                    const dateStr = instDate.toISOString().split('T')[0];
                    const matchedPay = isPaid ? planPayments[i] : null;

                    return {
                      installmentNumber: instNum,
                      dueDate: dateStr,
                      amount: plan.emiAmount,
                      isPaid,
                      payment: matchedPay,
                    };
                  });

                  return (
                    <div
                      key={plan.id}
                      className="p-4 rounded-2xl bg-gradient-to-b from-[#18181D] to-[#121215] border border-akr-gold/40 shadow-xl space-y-3.5"
                    >
                      {/* Plan Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-3">
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                              0% Interest Free
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Ref: {plan.referenceNumber}
                            </span>
                          </div>
                          <h4 className="text-base font-extrabold text-white">
                            {plan.title || 'EMI Repayment Plan'}
                          </h4>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 uppercase font-mono block">
                            Balance Due
                          </span>
                          <span className="text-base font-extrabold text-akr-gold">
                            {formatCurrency(plan.outstandingAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Repayment Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-400">
                            {paidEmis} of {totalEmis} Weekly EMIs Paid ({progressPct}%)
                          </span>
                          <span className="text-zinc-400 font-mono text-[11px]">
                            {remainingEmis} {remainingEmis === 1 ? 'Week' : 'Weeks'} Remaining
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-akr-gold to-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Week-by-Week Installment Table */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                          Installment Repayment Ledger
                        </span>

                        <div className="divide-y divide-zinc-800/80 rounded-xl bg-black/50 border border-zinc-800 overflow-hidden">
                          {installments.map((inst) => (
                            <div
                              key={inst.installmentNumber}
                              className={`p-3 flex items-center justify-between text-xs transition-colors ${
                                inst.isPaid ? 'bg-emerald-950/20' : 'bg-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                    inst.isPaid
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                      : inst.installmentNumber === paidEmis + 1
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                  }`}
                                >
                                  {inst.isPaid ? '✓' : inst.installmentNumber}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white">
                                      Week {inst.installmentNumber} Installment
                                    </span>
                                    {inst.isPaid ? (
                                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded uppercase">
                                        Paid
                                      </span>
                                    ) : inst.installmentNumber === paidEmis + 1 ? (
                                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded uppercase">
                                        Next Due
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-zinc-800 text-zinc-400 font-medium px-1.5 py-0.2 rounded uppercase">
                                        Upcoming
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-zinc-400 font-mono block mt-0.5">
                                    Scheduled: {formatDisplayDate(inst.dueDate)}
                                  </span>
                                  {inst.payment && (
                                    <span className="text-[10px] text-emerald-400/90 font-mono block">
                                      Paid on {formatDisplayDate(inst.payment.createdAt)} • Ref: {inst.payment?.reference || inst.payment?.transactionRef}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-extrabold text-white block">
                                  {formatCurrency(inst.amount)}
                                </span>
                                <span className="text-[10px] text-zinc-400 block font-mono">
                                  0% Interest
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      {plan.outstandingAmount > 0 && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/app/pay?planId=${plan.id}`)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-akr-gold via-amber-400 to-akr-gold-dark hover:brightness-110 text-black font-extrabold text-xs shadow-gold-glow flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>Pay Next Weekly EMI ({formatCurrency(plan.emiAmount)})</span>
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  title="No Active Plans"
                  description="You do not have any active EMI schedules or dues at this moment."
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet for Payment Transaction Details & Credited Plan Allocation */}
      {selectedPayment && (
        <BottomSheet
          isOpen={!!selectedPayment}
          onClose={() => setSelectedPayment(null)}
          title="Payment Details & Allocation"
        >
          {(() => {
            const matchedPlan =
              duesData?.plans?.find((p) => p.id === selectedPayment.planId) ||
              duesData?.allPlans?.find((p) => p.id === selectedPayment.planId);
            const isCard = (selectedPayment.planTypeId || '').toLowerCase().includes('card');
            const planTitle =
              selectedPayment.planTitle ||
              matchedPlan?.title ||
              (selectedPayment.planId === 'all' || selectedPayment.planId === 'plan_all'
                ? 'Combined EMI Repayment (All Plans)'
                : isCard
                ? 'Privilege Card Payment'
                : 'Weekly EMI Repayment');
            const planRef = selectedPayment.planReference || matchedPlan?.referenceNumber || '-';

            return (
              <div className="space-y-4 pt-1 text-left text-xs">
                {/* Header card with status */}
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                    Payment Successful
                  </span>
                  <div className="text-2xl font-black text-white font-sans">
                    {formatCurrency(selectedPayment.amount)}
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono block">
                    {formatDisplayDate(selectedPayment.createdAt)}
                  </span>
                </div>

                {/* Allocated Plan Details Box */}
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
                  <span className="text-[10px] font-bold text-akr-gold uppercase tracking-wider block">
                    Credited EMI Plan Details
                  </span>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Financed Item / Plan:</span>
                    <span className="font-bold text-white text-right max-w-[60%] truncate">
                      {planTitle}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Loan Reference:</span>
                    <span className="font-mono font-bold text-akr-gold text-right">
                      {planRef}
                    </span>
                  </div>

                  {selectedPayment.installmentDescription && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Tenure Coverage:</span>
                      <span className="font-semibold text-emerald-400">
                        {selectedPayment.installmentDescription}
                      </span>
                    </div>
                  )}

                  {matchedPlan && (
                    <>
                      <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Current Balance Remaining:</span>
                        <span className="font-bold text-akr-gold">
                          {formatCurrency(matchedPlan.outstandingAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">Repayment Progress:</span>
                        <span className="text-zinc-300">
                          {matchedPlan.totalEmis - matchedPlan.remainingEmis} of {matchedPlan.totalEmis} Weeks Paid
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Transaction Proof Details */}
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Transaction Record
                  </span>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Payment Mode:</span>
                    <span className="font-mono uppercase bg-zinc-800 px-2 py-0.5 rounded text-[11px] text-white">
                      {selectedPayment.mode || 'UPI'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Payment Gateway Ref:</span>
                    <span className="font-mono text-zinc-300 text-[11px] truncate max-w-[60%]">
                      {selectedPayment.reference || selectedPayment.transactionRef}
                    </span>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPayment(null);
                      setActiveTab('ledger');
                    }}
                    className="w-full py-2.5 rounded-xl bg-akr-surface border border-akr-gold/50 text-akr-gold hover:bg-akr-gold hover:text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>View Complete Repayment Ledger</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </BottomSheet>
      )}

      <BottomNav />
    </div>
  );
};
