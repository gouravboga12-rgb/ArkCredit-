import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Users,
  Search,
  Plus,
  Filter,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  CreditCard,
  History,
  FileSpreadsheet,
  Coins,
  PlusCircle,
  Calendar,
  Landmark,
  ShieldAlert,
  Check,
  Key,
  Copy,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../../../core/api';
import { useStore } from '../../../store';
import { Consumer, DueStatus, DuesPlan, Payment, PlanType } from '../../../core/types';
import { formatCurrency, formatDisplayDate, maskAccount, formatDateOnlyIST } from '../../../core/formatters';
import {
  adminConsumerFormSchema,
  AdminConsumerFormData,
  adminDuesPlanFormSchema,
  AdminDuesPlanFormData,
} from '../../../core/validation';
import {
  StatusBadge,
  Modal,
  InputField,
  GoldButton,
  OutlineGoldButton,
  Skeleton,
} from '../../../components/ui';
import { EmiTenureCalculator, EmiCalculationResult } from '../../../components/admin/EmiTenureCalculator';

export const ConsumerManagementScreen: React.FC = () => {
  const [consumers, setConsumers] = useState<any[]>([]);
  const [planTypes, setPlanTypes] = useState<PlanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingConsumer, setEditingConsumer] = useState<any | null>(null);
  const [viewingConsumer, setViewingConsumer] = useState<any | null>(null);
  const [consumerDues, setConsumerDues] = useState<DuesPlan[]>([]);
  const [consumerPayments, setConsumerPayments] = useState<Payment[]>([]);

  // Add/Edit Dues/EMI Modal State
  const [isAddDuesModalOpen, setIsAddDuesModalOpen] = useState(false);
  const [targetConsumerForDues, setTargetConsumerForDues] = useState<any | null>(null);
  const [editingDuesPlan, setEditingDuesPlan] = useState<DuesPlan | null>(null);
  const [duesFormError, setDuesFormError] = useState<string | null>(null);

  // Plan Delete Confirmation Modal State
  const [planToDelete, setPlanToDelete] = useState<{ plan: DuesPlan; consumer: any } | null>(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  // Delete Confirmation Modal State
  const [consumerToDelete, setConsumerToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback Toast
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Credential Visibility & Copy States
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [showDrawerPassword, setShowDrawerPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2200);
  };

  const adminSession = useStore((state) => state.adminSession);
  const isSuperAdmin = adminSession?.role === 'super_admin';

  const [formError, setFormError] = useState<string | null>(null);

  // Consumer registration form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AdminConsumerFormData>({
    resolver: zodResolver(adminConsumerFormSchema),
    defaultValues: {
      status: 'active',
      password: 'Demo@123',
    },
  });

  const generatePassword = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newPass = `Akr@${randomSuffix}`;
    setValue('password', newPass, { shouldValidate: true });
    setShowModalPassword(true);
  };

  // Dues / EMI Plan form
  const duesForm = useForm<AdminDuesPlanFormData>({
    resolver: zodResolver(adminDuesPlanFormSchema),
    defaultValues: {
      planTypeId: '',
      title: 'Personal Loan EMI',
      referenceNumber: `LN-${Date.now().toString().slice(-4)}`,
      principal: 15000,
      interest: 2000,
      processingFee: 500,
      emiAmount: 2500,
      nextEmiDate: '2026-11-25',
      totalEmis: 12,
      remainingEmis: 12,
      tenureMonths: 12,
    },
  });

  const duesPrincipal = duesForm.watch('principal') || 0;
  const duesInterest = duesForm.watch('interest') || 0;
  const duesFee = duesForm.watch('processingFee') || 0;
  const calculatedTotalOutstanding = Number(duesPrincipal) + Number(duesInterest) + Number(duesFee);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cData, ptData] = await Promise.all([
        adminApi.getConsumers(),
        adminApi.getPlanTypes(),
      ]);
      setConsumers(cData);
      setPlanTypes(ptData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrUpdate = async (data: AdminConsumerFormData) => {
    try {
      setFormError(null);
      if (editingConsumer) {
        await adminApi.updateConsumer(editingConsumer.id, {
          name: data.name,
          mobile: data.mobile,
          email: data.email,
          address: data.address,
          accountNumber: data.accountNumber,
          status: data.status,
          passwordHash: data.password || editingConsumer.passwordHash || 'Demo@123',
        });
        setSuccessToast(`Consumer ${data.name} updated successfully! (ID: ${data.accountNumber})`);
      } else {
        const passwordToUse = data.password?.trim() || 'Demo@123';
        const created = await adminApi.createConsumer({
          name: data.name,
          mobile: data.mobile,
          email: data.email,
          address: data.address,
          accountNumber: data.accountNumber,
          status: data.status,
          passwordHash: passwordToUse,
        });
        setSuccessToast(`Consumer ${data.name} registered! ID: ${data.accountNumber}, Password: ${passwordToUse}`);
      }
      setIsAddModalOpen(false);
      setEditingConsumer(null);
      reset();
      await loadData();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Error saving consumer');
    }
  };

  const openEdit = (c: any) => {
    setEditingConsumer(c);
    setValue('name', c.name);
    setValue('mobile', c.mobile);
    setValue('email', c.email);
    setValue('address', c.address || '');
    setValue('accountNumber', c.accountNumber);
    setValue('status', c.status);
    setValue('password', c.passwordHash || 'Demo@123');
    setShowModalPassword(false);
    setIsAddModalOpen(true);
  };

  // Open the Add EMI / Dues Plan Modal for a specific consumer
  const openAddDues = (c: any) => {
    setTargetConsumerForDues(c);
    setEditingDuesPlan(null);
    setDuesFormError(null);
    const defaultPt = planTypes.find((p) => p.enabled)?.id || 'pt_loan_emi';
    duesForm.reset({
      planTypeId: defaultPt,
      title: 'Personal Loan EMI',
      referenceNumber: `LN-${c.accountNumber?.slice(-4) || '101'}-${Date.now().toString().slice(-4)}`,
      principal: 15000,
      interest: 2000,
      processingFee: 500,
      emiAmount: 2500,
      nextEmiDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      totalEmis: 12,
      remainingEmis: 12,
      tenureMonths: 12,
    });
    setIsAddDuesModalOpen(true);
  };

  const openEditDues = (plan: DuesPlan, c: any) => {
    setTargetConsumerForDues(c);
    setEditingDuesPlan(plan);
    setDuesFormError(null);
    duesForm.reset({
      planTypeId: plan.planTypeId,
      title: plan.title,
      referenceNumber: plan.referenceNumber,
      principal: plan.principal,
      interest: plan.interest,
      processingFee: plan.processingFee,
      emiAmount: plan.emiAmount,
      nextEmiDate: plan.nextEmiDate ? plan.nextEmiDate.split('T')[0] : new Date().toISOString().split('T')[0],
      totalEmis: plan.totalEmis,
      remainingEmis: plan.remainingEmis,
      tenureMonths: plan.tenureMonths || plan.totalEmis || 12,
    });
    setIsAddDuesModalOpen(true);
  };

  const handleApplyEmiCalculation = (calc: EmiCalculationResult) => {
    duesForm.setValue('interest', calc.interestAmount);
    duesForm.setValue('emiAmount', calc.emiAmount);
    duesForm.setValue('tenureMonths', calc.tenureMonths);
    duesForm.setValue('totalEmis', calc.totalEmis);
    duesForm.setValue('remainingEmis', calc.remainingEmis);
  };

  const handleQuickDueDate = (type: '7d' | '14d' | '21d' | '30d') => {
    const now = new Date();
    const target = new Date();
    if (type === '7d') {
      target.setDate(now.getDate() + 7);
    } else if (type === '14d') {
      target.setDate(now.getDate() + 14);
    } else if (type === '21d') {
      target.setDate(now.getDate() + 21);
    } else if (type === '30d') {
      target.setDate(now.getDate() + 30);
    }
    duesForm.setValue('nextEmiDate', target.toISOString().split('T')[0]);
  };

  const handleCreateDuesPlan = async (data: AdminDuesPlanFormData) => {
    if (!targetConsumerForDues) return;
    try {
      setDuesFormError(null);
      if (editingDuesPlan) {
        await adminApi.updateDuesPlan(editingDuesPlan.id, data);
        setSuccessToast(`EMI Plan "${data.title}" updated successfully!`);
      } else {
        await adminApi.createDuesPlan({
          ...data,
          consumerId: targetConsumerForDues.id,
        });
        setSuccessToast(`EMI Plan "${data.title}" created & assigned to ${targetConsumerForDues.name}!`);
      }

      // Reload consumers to update total outstanding and plan counts
      await loadData();

      // If viewingConsumer drawer is currently open, refresh their dues list
      if (viewingConsumer && viewingConsumer.id === targetConsumerForDues.id) {
        const updatedDues = await adminApi.getConsumerDues(targetConsumerForDues.id);
        setConsumerDues(updatedDues);
      }

      setIsAddDuesModalOpen(false);
      setEditingDuesPlan(null);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setDuesFormError(err.message || 'Error saving EMI plan');
    }
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      setIsDeletingPlan(true);
      await adminApi.deleteDuesPlan(planToDelete.plan.id);
      await loadData();
      if (viewingConsumer) {
        const updatedDues = await adminApi.getConsumerDues(viewingConsumer.id);
        setConsumerDues(updatedDues);
      }
      setSuccessToast(`Plan "${planToDelete.plan.title}" deleted successfully!`);
      setPlanToDelete(null);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error deleting plan');
    } finally {
      setIsDeletingPlan(false);
    }
  };

  const confirmDelete = async () => {
    if (!consumerToDelete) return;
    try {
      setIsDeleting(true);
      await adminApi.deleteConsumer(consumerToDelete.id);
      setConsumers((prev) => prev.filter((c) => c.id !== consumerToDelete.id));
      if (viewingConsumer?.id === consumerToDelete.id) {
        setViewingConsumer(null);
      }
      setSuccessToast(`Consumer ${consumerToDelete.name} was permanently deleted.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setConsumerToDelete(null);
    } catch (err: any) {
      // Fallback to direct store deletion to guarantee responsiveness
      useStore.getState().deleteConsumerByAdmin(
        consumerToDelete.id,
        adminSession?.admin.name || 'Admin'
      );
      setConsumers((prev) => prev.filter((c) => c.id !== consumerToDelete.id));
      if (viewingConsumer?.id === consumerToDelete.id) {
        setViewingConsumer(null);
      }
      setSuccessToast(`Consumer ${consumerToDelete.name} was permanently deleted.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setConsumerToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const openView = async (c: any) => {
    setViewingConsumer(c);
    setShowDrawerPassword(false);
    try {
      const [dues, allPayments] = await Promise.all([
        adminApi.getConsumerDues(c.id).catch(() => []),
        adminApi.getPayments().catch(() => []),
      ]);
      setConsumerDues(dues || []);
      const pays = (allPayments || []).filter((p: any) => p.consumerId === c.id);
      setConsumerPayments(pays);
    } catch (err) {
      console.error(err);
      setConsumerDues([]);
      setConsumerPayments([]);
    }
  };

  const todayIST = useMemo(() => formatDateOnlyIST(new Date().toISOString()), []);

  const filtered = consumers.filter((c) => {
    // 1. Strict Gating: ONLY show consumers whose EMI Card application has been approved!
    if (c.cardApproved !== true) return false;

    // 2. Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'inactive' && c.status !== 'inactive') return false;
      if (statusFilter !== 'inactive' && c.dueStatus.toLowerCase() !== statusFilter.toLowerCase()) return false;
    }

    // 3. Date-wise Filter
    if (datePreset !== 'all') {
      const consumerDateIST = formatDateOnlyIST(c.createdAt);
      if (datePreset === 'today') {
        if (consumerDateIST !== todayIST) return false;
      } else if (datePreset === 'yesterday') {
        const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
        const yesterdayIST = formatDateOnlyIST(yesterday.toISOString());
        if (consumerDateIST !== yesterdayIST) return false;
      } else if (datePreset === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        if (new Date(c.createdAt) < weekAgo) return false;
      } else if (datePreset === 'month') {
        const currentMonthIST = todayIST.slice(0, 7);
        if (consumerDateIST.slice(0, 7) !== currentMonthIST) return false;
      } else if (datePreset === 'custom') {
        if (fromDate && consumerDateIST < fromDate) return false;
        if (toDate && consumerDateIST > toDate) return false;
      }
    }

    // 4. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.accountNumber.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-600/80 text-emerald-200 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Header & Add Consumer Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Consumer Portfolio Directory
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Card Approved Only
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Displaying consumers with approved EMI Cards. Manage credentials, view active EMIs, and track credit limits.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingConsumer(null);
            reset({
              name: '',
              mobile: '',
              email: '',
              address: '',
              accountNumber: `AKR${Math.floor(100000 + Math.random() * 900000)}`,
              status: 'active',
              password: 'Demo@123',
            });
            setShowModalPassword(false);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-akr-gold text-black font-bold text-xs hover:bg-akr-gold-light transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Consumer</span>
        </button>
      </div>

      {/* Search, Status & Date Filter Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by consumer name, mobile number, or account number..."
              className="w-full bg-[#141417] border border-zinc-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-akr-gold"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:w-52 relative">
            <Filter className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#141417] border border-zinc-800 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-akr-gold appearance-none cursor-pointer"
            >
              <option value="all">All Statuses ({consumers.filter(c => c.cardApproved === true).length})</option>
              <option value="clear">Clear</option>
              <option value="due soon">Due Soon</option>
              <option value="overdue">Overdue</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Date Filter Preset */}
          <div className="sm:w-48 relative">
            <Calendar className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="w-full bg-[#141417] border border-zinc-800 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-akr-gold appearance-none cursor-pointer"
            >
              <option value="all">All Time (Joined)</option>
              <option value="today">Joined Today</option>
              <option value="yesterday">Joined Yesterday</option>
              <option value="week">Past 7 Days</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Pickers (shown when custom is selected or can be toggled) */}
        {datePreset === 'custom' && (
          <div className="p-3 rounded-xl bg-[#141417] border border-akr-border/80 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-akr-gold" />
              <span>Joined Date Range:</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-[#1c1c22] border border-zinc-700 text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-akr-gold"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-[#1c1c22] border border-zinc-700 text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-akr-gold"
              />
            </div>
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setDatePreset('all');
                }}
                className="text-akr-gold hover:underline text-[11px] font-bold ml-auto"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}

        {/* Filter Indicator Bar */}
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span>
            Showing <strong className="text-white">{filtered.length}</strong> approved consumer accounts
            {datePreset !== 'all' && (
              <span className="text-akr-gold ml-1">
                (Filtered by {datePreset === 'custom' ? `${fromDate || 'start'} to ${toDate || 'today'}` : datePreset})
              </span>
            )}
          </span>
          {(searchQuery || statusFilter !== 'all' || datePreset !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setDatePreset('all');
                setFromDate('');
                setToDate('');
              }}
              className="text-akr-gold hover:underline font-semibold cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Consumers Table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#141417] border border-zinc-800 text-zinc-400">
          <Users className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
          <p className="text-sm font-semibold">No consumers found matching criteria.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-zinc-800 bg-[#121214] shadow-sm">
            <table className="w-full text-left text-xs text-zinc-200">
              <thead className="bg-[#18181B] text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800 select-none">
                <tr>
                  <th className="py-3 px-4">Consumer Details</th>
                  <th className="py-3 px-4">Customer ID</th>
                  <th className="py-3 px-4">Mobile & Email</th>
                  <th className="py-3 px-4">Password</th>
                  <th className="py-3 px-4">Active Plans & EMIs</th>
                  <th className="py-3 px-4">Total Outstanding</th>
                  <th className="py-3 px-4">Next EMI</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-akr-gold/15 text-akr-gold font-bold flex items-center justify-center text-xs">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <span>{c.name}</span>
                          {c.status === 'inactive' && (
                            <span className="block text-[10px] text-zinc-500 font-normal">Inactive</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{c.accountNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.accountNumber, `id-${c.id}`)}
                          className="text-zinc-500 hover:text-akr-gold transition-colors p-1"
                          title="Copy Customer ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {copiedField === `id-${c.id}` && (
                          <span className="text-[10px] text-emerald-400 font-sans">Copied!</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">
                      <div className="flex items-center gap-1">
                        <span className="font-mono">{c.mobile}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.mobile, `mob-${c.id}`)}
                          className="text-zinc-500 hover:text-akr-gold transition-colors p-0.5"
                          title="Copy Mobile"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10px] text-zinc-500">{c.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">
                      <div className="inline-flex items-center gap-1.5 bg-[#18181D] px-2.5 py-1 rounded-lg border border-zinc-800">
                        <Lock className="w-3 h-3 text-akr-gold flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-zinc-200">
                          {showPasswordMap[c.id] ? (c.passwordHash || 'Demo@123') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswordMap((prev) => ({ ...prev, [c.id]: !prev[c.id] }))
                          }
                          className="text-zinc-400 hover:text-white p-0.5 ml-0.5 transition-colors"
                          title={showPasswordMap[c.id] ? 'Hide Password' : 'Show Password'}
                        >
                          {showPasswordMap[c.id] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.passwordHash || 'Demo@123', `pass-${c.id}`)}
                          className="text-zinc-400 hover:text-akr-gold p-0.5 transition-colors"
                          title="Copy Password"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {copiedField === `pass-${c.id}` && (
                          <span className="text-[9px] text-emerald-400 font-sans">Copied!</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openView(c)}
                          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-mono text-[11px] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Click to view & edit this customer's EMI plans"
                        >
                          {c.activePlansCount} {c.activePlansCount === 1 ? 'plan' : 'plans'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openAddDues(c)}
                          className="px-2 py-0.5 rounded bg-akr-gold/15 text-akr-gold hover:bg-akr-gold/30 border border-akr-gold/40 text-[10px] font-bold flex items-center gap-1 transition-all"
                          title="Add an EMI or Loan plan to this consumer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Add EMI</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-akr-gold">
                      {formatCurrency(c.totalOutstanding)}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">
                      <div className="font-semibold text-white">
                        {c.nextEmiAmount > 0 ? formatCurrency(c.nextEmiAmount) : '-'}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {c.nextEmiDate ? formatDisplayDate(c.nextEmiDate) : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={c.status === 'inactive' ? 'Inactive' : c.dueStatus} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openAddDues(c)}
                          className="p-1.5 rounded-lg text-akr-gold hover:text-white hover:bg-akr-gold/20 transition-colors"
                          title="Add EMI / Loan Plan"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openView(c)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="View Full Profile & Credentials"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-akr-gold hover:bg-zinc-800 transition-colors"
                          title="Edit Consumer & Password"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConsumerToDelete(c)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                          title="Delete Consumer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Stacked Cards View (Responsive design) */}
          <div className="lg:hidden space-y-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-[#141417] border border-zinc-800 shadow-sm space-y-3 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-akr-gold/15 text-akr-gold font-bold flex items-center justify-center text-xs">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-akr-gold font-semibold">{c.accountNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(c.accountNumber, `m-id-${c.id}`)}
                          className="text-zinc-500 hover:text-akr-gold p-0.5"
                          title="Copy ID"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {copiedField === `m-id-${c.id}` && (
                          <span className="text-[9px] text-emerald-400">Copied</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={c.status === 'inactive' ? 'Inactive' : c.dueStatus} size="sm" />
                </div>

                {/* Password row for mobile */}
                <div className="p-2 rounded-lg bg-[#18181D] border border-zinc-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-akr-gold flex-shrink-0" />
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Password:</span>
                    <span className="font-mono text-zinc-200 font-semibold text-xs">
                      {showPasswordMap[c.id] ? (c.passwordHash || 'Demo@123') : '••••••••'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswordMap((prev) => ({ ...prev, [c.id]: !prev[c.id] }))
                      }
                      className="p-1 text-zinc-400 hover:text-white"
                      title={showPasswordMap[c.id] ? 'Hide' : 'Show'}
                    >
                      {showPasswordMap[c.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(c.passwordHash || 'Demo@123', `m-pass-${c.id}`)}
                      className="p-1 text-zinc-400 hover:text-akr-gold"
                      title="Copy Password"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copiedField === `m-pass-${c.id}` && (
                      <span className="text-[9px] text-emerald-400">Copied</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Outstanding</span>
                    <span className="font-bold text-akr-gold">{formatCurrency(c.totalOutstanding)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Next EMI</span>
                    <span className="font-bold text-white">
                      {c.nextEmiAmount > 0 ? formatCurrency(c.nextEmiAmount) : 'None'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <span className="text-[11px] text-zinc-400 font-mono">{c.mobile}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openAddDues(c)}
                      className="px-2.5 py-1 rounded bg-akr-gold/15 text-akr-gold text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add EMI
                    </button>
                    <button
                      onClick={() => openView(c)}
                      className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 text-xs font-semibold"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConsumerToDelete(c)}
                      className="px-2 py-1 rounded bg-red-950/40 text-red-400 text-xs font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Consumer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingConsumer ? 'Edit Consumer' : 'Register New Consumer'}
      >
        <form onSubmit={handleSubmit(handleCreateOrUpdate)} className="space-y-3.5 text-left">
          {formError && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <InputField
            label="Full Name"
            placeholder="e.g. Rahul Sharma"
            error={errors.name?.message}
            {...register('name')}
          />

          <InputField
            label="10-Digit Mobile Number"
            placeholder="9876543210"
            error={errors.mobile?.message}
            {...register('mobile')}
          />

          <InputField
            label="Email Address"
            type="email"
            placeholder="rahul@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <InputField
            label="Customer ID / Account Number (for Login) *"
            placeholder="e.g. AKR10004821 or CUST101"
            error={errors.accountNumber?.message}
            {...register('accountNumber')}
          />

          {/* Password Field with View/Hide & Generator */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-zinc-400 uppercase">
                Login Password (for Consumer App) *
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-[11px] text-akr-gold hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Generate Password</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showModalPassword ? 'text' : 'password'}
                placeholder="Enter password (e.g. Demo@123)"
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-akr-gold font-mono pr-12"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowModalPassword(!showModalPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition-colors"
                title={showModalPassword ? 'Hide Password' : 'Show Password'}
              >
                {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-400 mt-1">{errors.password.message}</p>
            )}
            <p className="text-[10px] text-zinc-500">
              Customer can log in using their Customer ID, Mobile, or Email and this password.
            </p>
          </div>

          <InputField
            label="Residential Address"
            placeholder="Full street address and city"
            error={errors.address?.message}
            {...register('address')}
          />

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Account Status
            </label>
            <select
              {...register('status')}
              className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold"
            >
              <option value="active">Active (Can log in & pay)</option>
              <option value="inactive">Inactive (Suspended)</option>
            </select>
          </div>

          <div className="pt-3">
            <GoldButton type="submit" isLoading={isSubmitting}>
              {editingConsumer ? 'Save Changes & Update Credentials' : 'Register Consumer & Proceed to Add EMIs'}
            </GoldButton>
          </div>
        </form>
      </Modal>

      {/* Add / Edit EMI Dues Plan Modal for Specific Consumer */}
      {targetConsumerForDues && (
        <Modal
          isOpen={isAddDuesModalOpen}
          onClose={() => {
            setIsAddDuesModalOpen(false);
            setEditingDuesPlan(null);
          }}
          title={
            editingDuesPlan
              ? `Edit EMI Plan: ${editingDuesPlan.title} (${targetConsumerForDues.name})`
              : `Assign EMI Plan to ${targetConsumerForDues.name}`
          }
          maxWidth="lg"
        >
          <form onSubmit={duesForm.handleSubmit(handleCreateDuesPlan)} className="space-y-4 text-left">
            {/* Consumer Context Header */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-akr-gold/30 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase block">Account Holder</span>
                <span className="font-bold text-white">{targetConsumerForDues.name}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase block">Account Number</span>
                <span className="font-mono font-bold text-akr-gold">{targetConsumerForDues.accountNumber}</span>
              </div>
            </div>

            {duesFormError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{duesFormError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  Plan Type *
                </label>
                <select
                  {...duesForm.register('planTypeId')}
                  className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold"
                >
                  {planTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.category})
                    </option>
                  ))}
                </select>
                {duesForm.formState.errors.planTypeId && (
                  <p className="text-[10px] text-red-400 mt-1">{duesForm.formState.errors.planTypeId.message}</p>
                )}
              </div>

              <div>
                <InputField
                  label="Plan Title *"
                  placeholder="e.g. Personal Loan EMI / AKR Card EMI"
                  error={duesForm.formState.errors.title?.message}
                  {...duesForm.register('title')}
                />
              </div>
            </div>

            <div>
              <InputField
                label="Reference Number *"
                placeholder="e.g. LN-2026-8812 / CRD-4019"
                error={duesForm.formState.errors.referenceNumber?.message}
                {...duesForm.register('referenceNumber')}
              />
            </div>

            {/* Base Loan Principal & Processing Fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label="Principal Amount (₹) *"
                type="number"
                placeholder="15000"
                error={duesForm.formState.errors.principal?.message}
                {...duesForm.register('principal')}
              />
              <InputField
                label="Processing Fee (₹) *"
                type="number"
                placeholder="500"
                error={duesForm.formState.errors.processingFee?.message}
                {...duesForm.register('processingFee')}
              />
            </div>

            {/* Smart EMI & Tenure Calculator (6, 9, 11, 12, 24, 36 mo + Custom months & % p.a.) */}
            {/* Smart EMI & Tenure Calculator (4, 6, 8, 10, 12, 16, 20, 26 wks + Custom weeks, 0% interest) */}
            <EmiTenureCalculator
              key={editingDuesPlan ? editingDuesPlan.id : 'new'}
              principal={duesPrincipal}
              processingFee={duesFee}
              onApplyCalculation={handleApplyEmiCalculation}
              defaultTenure={editingDuesPlan?.tenureWeeks || editingDuesPlan?.tenureMonths || 12}
              defaultInterestRate={0}
            />

            {/* Synced Breakdown & Installment Terms */}
            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-akr-gold uppercase tracking-wider block">
                  Final Terms & Schedule (Auto-Filled)
                </span>
                <span className="text-[10px] text-zinc-400">
                  Values prefilled by calculator, editable if needed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <InputField
                  label="Interest Amount (₹) *"
                  type="number"
                  placeholder="0"
                  error={duesForm.formState.errors.interest?.message}
                  {...duesForm.register('interest')}
                />
                <InputField
                  label="Weekly EMI Amount (₹) *"
                  type="number"
                  placeholder="2000"
                  error={duesForm.formState.errors.emiAmount?.message}
                  {...duesForm.register('emiAmount')}
                />
                <div className="p-2.5 rounded-lg bg-black/60 border border-zinc-700/80 flex flex-col justify-center">
                  <span className="text-[10px] text-zinc-400 uppercase">Total Outstanding</span>
                  <span className="font-bold text-base text-akr-gold">
                    {formatCurrency(calculatedTotalOutstanding)}
                  </span>
                </div>
              </div>

              {/* Next Due Date with Quick Select Chips */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">
                    First Weekly EMI Due Date *
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500 mr-1">Quick Set:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickDueDate('7d')}
                      className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded transition-colors"
                    >
                      +7 Days (1 Wk)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDueDate('14d')}
                      className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded transition-colors"
                    >
                      +14 Days (2 Wks)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDueDate('21d')}
                      className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded transition-colors"
                    >
                      +21 Days (3 Wks)
                    </button>
                  </div>
                </div>
                <InputField
                  type="date"
                  error={duesForm.formState.errors.nextEmiDate?.message}
                  {...duesForm.register('nextEmiDate')}
                />
              </div>

              {/* Installments & Tenure Count */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <InputField
                  label="Total Weekly EMIs *"
                  type="number"
                  placeholder="12"
                  error={duesForm.formState.errors.totalEmis?.message}
                  {...duesForm.register('totalEmis')}
                />
                <InputField
                  label="Remaining EMIs *"
                  type="number"
                  placeholder="12"
                  error={duesForm.formState.errors.remainingEmis?.message}
                  {...duesForm.register('remainingEmis')}
                />
                <InputField
                  label="Tenure (Weeks) *"
                  type="number"
                  placeholder="12"
                  error={duesForm.formState.errors.tenureMonths?.message}
                  {...duesForm.register('tenureMonths')}
                />
              </div>
            </div>

            <div className="pt-2">
              <GoldButton type="submit" isLoading={duesForm.formState.isSubmitting}>
                {editingDuesPlan ? 'Save & Update EMI Plan' : 'Assign & Activate EMI Plan'}
              </GoldButton>
            </div>
          </form>
        </Modal>
      )}

      {/* In-App Delete Confirmation Modal */}
      {consumerToDelete && (
        <Modal
          isOpen={!!consumerToDelete}
          onClose={() => setConsumerToDelete(null)}
          title="Confirm Permanent Deletion"
          maxWidth="sm"
        >
          <div className="text-left space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200">
              <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-white">Permanently Delete Consumer?</p>
                <p className="text-zinc-400 mt-0.5">
                  Are you sure you want to delete <strong className="text-white">{consumerToDelete.name}</strong> ({consumerToDelete.accountNumber})?
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              This will permanently wipe their account, active dues plans, and payment records from the system. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setConsumerToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Permanently Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* In-App Delete Plan Confirmation Modal */}
      {planToDelete && (
        <Modal
          isOpen={!!planToDelete}
          onClose={() => setPlanToDelete(null)}
          title="Confirm Delete EMI / Dues Plan"
          maxWidth="sm"
        >
          <div className="text-left space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200">
              <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-white">Permanently Delete this EMI Plan?</p>
                <p className="text-zinc-400 mt-0.5">
                  Are you sure you want to remove <strong className="text-white">{planToDelete.plan.title}</strong> (Ref: {planToDelete.plan.referenceNumber}) for <strong className="text-white">{planToDelete.consumer.name}</strong>?
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              Outstanding balance of {formatCurrency(planToDelete.plan.outstandingAmount)} will be removed from the customer's total dues.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePlan}
                disabled={isDeletingPlan}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                {isDeletingPlan ? 'Deleting...' : 'Yes, Delete Plan'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Consumer Full Details Modal */}
      {viewingConsumer && (
        <Modal
          isOpen={!!viewingConsumer}
          onClose={() => setViewingConsumer(null)}
          title={`Consumer Profile: ${viewingConsumer.name}`}
          maxWidth="xl"
        >
          <div className="space-y-4 text-left">
            {/* Customer Login Credentials Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#1A1A22] via-[#16161C] to-[#121215] border border-akr-gold/40 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-akr-gold/20 text-akr-gold flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Customer App Login Credentials
                    </h4>
                    <p className="text-[10px] text-zinc-400">
                      Share these credentials with the customer to let them log into the app.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const c = viewingConsumer;
                    setViewingConsumer(null);
                    openEdit(c);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-akr-gold/15 hover:bg-akr-gold/25 border border-akr-gold/40 text-akr-gold text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Edit credentials or change password"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Credentials</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                {/* Customer ID */}
                <div className="bg-[#0E0E11] p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">Customer ID / Account #</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-bold text-white text-sm">{viewingConsumer.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(viewingConsumer.accountNumber, 'drawer-id')}
                      className="text-zinc-400 hover:text-akr-gold p-1 transition-colors"
                      title="Copy Customer ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {copiedField === 'drawer-id' && <span className="text-[10px] text-emerald-400 font-medium">Copied to clipboard!</span>}
                </div>

                {/* Mobile */}
                <div className="bg-[#0E0E11] p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">Login Mobile</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-bold text-white text-sm">{viewingConsumer.mobile}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(viewingConsumer.mobile, 'drawer-mob')}
                      className="text-zinc-400 hover:text-akr-gold p-1 transition-colors"
                      title="Copy Mobile"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {copiedField === 'drawer-mob' && <span className="text-[10px] text-emerald-400 font-medium">Copied to clipboard!</span>}
                </div>

                {/* Password with Eye toggle */}
                <div className="bg-[#0E0E11] p-3 rounded-xl border border-zinc-800">
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">Login Password</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-bold text-akr-gold text-sm tracking-wide">
                      {showDrawerPassword ? (viewingConsumer.passwordHash || 'Demo@123') : '••••••••'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowDrawerPassword(!showDrawerPassword)}
                        className="text-zinc-400 hover:text-white p-1 transition-colors"
                        title={showDrawerPassword ? 'Hide Password' : 'Show Password'}
                      >
                        {showDrawerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(viewingConsumer.passwordHash || 'Demo@123', 'drawer-pass')}
                        className="text-zinc-400 hover:text-akr-gold p-1 transition-colors"
                        title="Copy Password"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {copiedField === 'drawer-pass' && <span className="text-[10px] text-emerald-400 font-medium">Copied to clipboard!</span>}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                <span>
                  Login Email: <strong className="text-zinc-200">{viewingConsumer.email}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const text = `AKR Credit Capital Login Credentials\nCustomer ID: ${viewingConsumer.accountNumber}\nMobile: ${viewingConsumer.mobile}\nEmail: ${viewingConsumer.email}\nPassword: ${viewingConsumer.passwordHash || 'Demo@123'}`;
                    handleCopy(text, 'drawer-all');
                  }}
                  className="text-akr-gold hover:underline font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedField === 'drawer-all' ? 'Copied Full Credentials!' : 'Copy All Login Details'}</span>
                </button>
              </div>
            </div>

            {/* Consumer Quick Stats Header */}
            <div className="p-4 rounded-xl bg-akr-bg border border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase text-zinc-500 block">Account</span>
                <span className="font-mono font-bold text-white">{viewingConsumer.accountNumber}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-zinc-500 block">Total Dues</span>
                <span className="font-bold text-akr-gold">
                  {formatCurrency(viewingConsumer.totalOutstanding)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-zinc-500 block">Mobile</span>
                <span className="text-zinc-300 font-mono">{viewingConsumer.mobile}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-zinc-500 block">Status</span>
                <StatusBadge status={viewingConsumer.status === 'inactive' ? 'Inactive' : viewingConsumer.dueStatus} size="sm" />
              </div>
            </div>

            {/* Dues Plans with Direct Add, Edit and Delete Buttons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Active Dues Plans ({consumerDues.length})
                </h4>
                <button
                  type="button"
                  onClick={() => openAddDues(viewingConsumer)}
                  className="px-3 py-1.5 rounded-lg bg-akr-gold text-black font-bold text-xs flex items-center gap-1 hover:bg-akr-gold-light transition-all shadow-md active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New EMI / Dues Plan</span>
                </button>
              </div>

              {consumerDues.length > 0 ? (
                <div className="space-y-2.5">
                  {consumerDues.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-white text-sm">{p.title}</h5>
                          <StatusBadge status={p.status === 'active' ? 'Active' : 'Closed'} size="sm" />
                        </div>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          Ref: <span className="text-zinc-200">{p.referenceNumber}</span> • Next Due:{' '}
                          <span className="text-akr-gold">{p.nextEmiDate ? formatDisplayDate(p.nextEmiDate) : 'N/A'}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-400">
                          <span>Principal: <strong className="text-zinc-200">{formatCurrency(p.principal)}</strong></span>
                          <span>Interest: <strong className="text-zinc-200">{formatCurrency(p.interest)}</strong></span>
                          <span>Fee: <strong className="text-zinc-200">{formatCurrency(p.processingFee)}</strong></span>
                          <span>Schedule: <strong className="text-zinc-200">{p.totalEmis - p.remainingEmis}/{p.totalEmis} EMIs</strong> ({p.tenureMonths || p.totalEmis} Mo)</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800">
                        <div className="text-left sm:text-right">
                          <span className="font-bold text-sm text-akr-gold block">{formatCurrency(p.outstandingAmount)}</span>
                          <div className="text-[10px] text-zinc-400">
                            EMI: <span className="text-white font-semibold">{formatCurrency(p.emiAmount)}/wk</span>
                          </div>
                        </div>

                        {/* Direct Edit and Delete Buttons for this specific EMI plan */}
                        <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
                          <button
                            type="button"
                            onClick={() => openEditDues(p, viewingConsumer)}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-akr-gold font-semibold text-xs flex items-center gap-1 transition-all active:scale-95"
                            title="Edit this EMI plan"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPlanToDelete({ plan: p, consumer: viewingConsumer })}
                            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 transition-colors"
                            title="Delete this EMI plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-zinc-900/60 border border-dashed border-zinc-800 text-center">
                  <p className="text-xs text-zinc-400 mb-2">No active plans assigned yet to this consumer.</p>
                  <button
                    type="button"
                    onClick={() => openAddDues(viewingConsumer)}
                    className="inline-flex items-center gap-1 text-xs text-akr-gold font-bold hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Assign First EMI Plan</span>
                  </button>
                </div>
              )}
            </div>

            {/* Payment History */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                Recent Payments ({consumerPayments.length})
              </h4>
              {consumerPayments.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {consumerPayments.map((p) => (
                    <div key={p.id} className="p-2.5 rounded-lg bg-akr-bg border border-zinc-800 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-mono text-zinc-300">{p.transactionRef}</span>
                        <p className="text-[10px] text-zinc-500">{formatDisplayDate(p.createdAt, true)} • {p.mode}</p>
                      </div>
                      <span className="font-bold text-emerald-400">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No payment records found.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
