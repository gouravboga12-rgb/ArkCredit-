import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as XLSX from 'xlsx';
import {
  IndianRupee,
  Search,
  Filter,
  Download,
  Plus,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Clock,
  Calendar,
} from 'lucide-react';
import { adminApi } from '../../../core/api';
import { useStore } from '../../../store';
import { Payment, PaymentMode, DuesPlan, Consumer } from '../../../core/types';
import { formatCurrency, formatDisplayDate } from '../../../core/formatters';
import {
  offlinePaymentFormSchema,
  OfflinePaymentFormData,
} from '../../../core/validation';
import {
  StatusBadge,
  Modal,
  InputField,
  GoldButton,
  OutlineGoldButton,
  Skeleton,
} from '../../../components/ui';

export const PaymentsScreen: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [consumerPlans, setConsumerPlans] = useState<DuesPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [consumerFilter, setConsumerFilter] = useState('all');

  // Offline Payment Modal
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [selectedOfflineConsumer, setSelectedOfflineConsumer] = useState<string>('');
  const [offlineFormError, setOfflineFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OfflinePaymentFormData>({
    resolver: zodResolver(offlinePaymentFormSchema),
    defaultValues: {
      mode: 'CASH',
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [pData, cData] = await Promise.all([
        adminApi.getPayments(),
        adminApi.getConsumers(),
      ]);
      setPayments(pData);
      setConsumers(cData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConsumerChangeForOffline = async (cId: string) => {
    setSelectedOfflineConsumer(cId);
    setValue('consumerId', cId);
    if (cId) {
      try {
        const dues = await adminApi.getConsumerDues(cId);
        const active = dues.filter((d) => d.status === 'active');
        setConsumerPlans(active);
        if (active.length > 0) {
          setValue('planId', active[0].id);
          setValue('amount', active[0].emiAmount || active[0].outstandingAmount);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setConsumerPlans([]);
    }
  };

  const handleRecordOfflinePayment = async (data: OfflinePaymentFormData) => {
    try {
      setOfflineFormError(null);
      await adminApi.recordOfflinePayment(data);
      setIsOfflineModalOpen(false);
      reset();
      loadData();
    } catch (err: any) {
      setOfflineFormError(err.message || 'Failed to record offline payment');
    }
  };

  const handleExportExcel = () => {
    const exportData = filtered.map((p) => ({
      'Transaction Ref': p.transactionRef,
      'Receipt / UTR': p.reference,
      'Consumer Name': p.consumerName,
      'Account Number': p.consumerAccount,
      'Plan Title': p.planTitle,
      'Amount (INR)': p.amount,
      'Payment Mode': p.mode,
      'Status': p.status.toUpperCase(),
      'Source': p.source.toUpperCase(),
      'Date & Time': formatDisplayDate(p.createdAt, true),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `AKR_Payments_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Filter payments
  const filtered = payments.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (modeFilter !== 'all' && p.mode !== modeFilter) return false;
    if (consumerFilter !== 'all' && p.consumerId !== consumerFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchRef = p.transactionRef.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
      const matchConsumer = p.consumerName.toLowerCase().includes(q) || p.consumerAccount.toLowerCase().includes(q);
      const matchPlan = p.planTitle.toLowerCase().includes(q);
      if (!matchRef && !matchConsumer && !matchPlan) return false;
    }

    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 text-left selection:bg-akr-gold selection:text-black">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Payments & Collections Ledger
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time audit of online gateway transactions and branch offline settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 border border-zinc-700 text-zinc-200 hover:border-akr-gold hover:text-white transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Report (Excel)</span>
          </button>

          <button
            onClick={() => {
              reset();
              setSelectedOfflineConsumer('');
              setConsumerPlans([]);
              setOfflineFormError(null);
              setIsOfflineModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-akr-gold text-black hover:brightness-105 shadow-gold-glow transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Record Offline Payment</span>
          </button>
        </div>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search transaction ID, UTR receipt, consumer name, account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#141417] border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:border-akr-gold outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#141417] border border-zinc-800 text-white rounded-xl py-2.5 px-3 pr-8 text-xs font-semibold focus:border-akr-gold outline-none appearance-none"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <Filter className="w-3.5 h-3.5 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Mode Filter */}
        <div className="relative">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="w-full bg-[#141417] border border-zinc-800 text-white rounded-xl py-2.5 px-3 pr-8 text-xs font-semibold focus:border-akr-gold outline-none appearance-none"
          >
            <option value="all">All Payment Modes</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Credit/Debit Card</option>
            <option value="NETBANKING">Net Banking</option>
            <option value="CASH">Cash (Offline)</option>
            <option value="CHEQUE">Cheque (Offline)</option>
            <option value="BANK_TRANSFER">Bank Transfer (Offline)</option>
          </select>
          <Filter className="w-3.5 h-3.5 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1B1B1F] text-zinc-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Transaction Ref</th>
                    <th className="py-3 px-4">Consumer</th>
                    <th className="py-3 px-4">Plan / Instrument</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Mode & Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-white">
                        <div>{p.transactionRef}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">Ref: {p.reference}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div>{p.consumerName}</div>
                        <div className="text-[10px] font-mono text-zinc-500">{p.consumerAccount}</div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        <div>{p.planTitle}</div>
                        <span className="text-[10px] text-akr-gold uppercase font-mono">{p.planTypeName}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400 text-sm">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        <span className="font-semibold text-white uppercase">{p.mode}</span>
                        <span className="ml-1.5 text-[9px] uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {p.source}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right text-zinc-400">
                        {formatDisplayDate(p.createdAt, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="lg:hidden space-y-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-[#141417] border border-zinc-800/80 shadow-card-dark space-y-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-white block">
                      {p.transactionRef}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      UTR / Ref: {p.reference}
                    </span>
                  </div>
                  <StatusBadge status={p.status} size="sm" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                  <div>
                    <span className="font-semibold text-white block">{p.consumerName}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{p.consumerAccount}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400 text-base block">
                      {formatCurrency(p.amount)}
                    </span>
                    <span className="text-[10px] text-zinc-500">Amount Paid</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                  <div>
                    <span className="text-zinc-300 block">{p.planTitle}</span>
                    <span className="text-[10px] text-akr-gold uppercase font-mono">{p.planTypeName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px] font-bold uppercase border border-zinc-700">
                      {p.mode}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 text-[9px] uppercase font-mono">
                      {p.source}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60 flex items-center justify-between">
                  <span>Timestamp</span>
                  <span className="font-mono">{formatDisplayDate(p.createdAt, true)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Record Offline Payment Modal */}
      <Modal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        title="Record Offline Payment (Branch / Cash / Cheque)"
      >
        <form onSubmit={handleSubmit(handleRecordOfflinePayment)} className="space-y-3.5 text-left">
          {offlineFormError && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{offlineFormError}</span>
            </div>
          )}

          {/* Consumer Selection */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Select Consumer *
            </label>
            <select
              value={selectedOfflineConsumer}
              onChange={(e) => handleConsumerChangeForOffline(e.target.value)}
              className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold"
            >
              <option value="">-- Choose Consumer --</option>
              {consumers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.accountNumber})
                </option>
              ))}
            </select>
            {errors.consumerId && (
              <p className="text-xs text-red-400 mt-1">{errors.consumerId.message}</p>
            )}
          </div>

          {/* Plan Selection (Required per brief) */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Target Dues Plan *
            </label>
            <select
              {...register('planId')}
              className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold"
            >
              <option value="">-- Choose Dues Plan --</option>
              {consumerPlans.map((dp) => (
                <option key={dp.id} value={dp.id}>
                  {dp.title} (Outstanding: {formatCurrency(dp.outstandingAmount)} • EMI: {formatCurrency(dp.emiAmount)})
                </option>
              ))}
            </select>
            {errors.planId && (
              <p className="text-xs text-red-400 mt-1">{errors.planId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InputField
              label="Amount Paid (₹) *"
              type="number"
              error={errors.amount?.message}
              {...register('amount')}
            />

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Offline Mode *
              </label>
              <select
                {...register('mode')}
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold"
              >
                <option value="CASH">Cash Receipt</option>
                <option value="CHEQUE">Cheque</option>
                <option value="BANK_TRANSFER">Direct Bank Transfer</option>
              </select>
            </div>
          </div>

          <InputField
            label="Reference / Cheque # / Deposit Receipt *"
            placeholder="e.g. CASH-REC-9941"
            error={errors.reference?.message}
            {...register('reference')}
          />

          <InputField
            label="Payment Date *"
            type="date"
            error={errors.date?.message}
            {...register('date')}
          />

          <div className="pt-3">
            <GoldButton type="submit" isLoading={isSubmitting}>
              Apply & Credit Offline Payment
            </GoldButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
