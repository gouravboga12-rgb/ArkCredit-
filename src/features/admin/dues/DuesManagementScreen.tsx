import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  IndianRupee,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Calendar,
  Layers,
  ChevronRight,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { adminApi } from '../../../core/api';
import { useStore } from '../../../store';
import { DuesPlan, PlanType, Consumer } from '../../../core/types';
import { formatCurrency, formatDisplayDate } from '../../../core/formatters';
import {
  adminDuesPlanFormSchema,
  AdminDuesPlanFormData,
  bulkDuesRowSchema,
  BulkDuesRow,
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

export const DuesManagementScreen: React.FC = () => {
  const [plans, setPlans] = useState<DuesPlan[]>([]);
  const [planTypes, setPlanTypes] = useState<PlanType[]>([]);
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'all' | 'overdue'
  const [activeTab, setActiveTab] = useState<'all' | 'overdue'>('all');

  // Overdue Modal State
  const [overdueTargetPlan, setOverdueTargetPlan] = useState<DuesPlan | null>(null);
  const [manualOverdueFee, setManualOverdueFee] = useState<number>(250);
  const [missedWeeks, setMissedWeeks] = useState<number>(1);
  const [overdueRemarks, setOverdueRemarks] = useState<string>('Payment past due date. Late fee applied.');
  const [isSavingOverdue, setIsSavingOverdue] = useState<boolean>(false);
  const [overdueToast, setOverdueToast] = useState<string | null>(null);

  const [selectedConsumerId, setSelectedConsumerId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DuesPlan | null>(null);
  const [modalConsumerId, setModalConsumerId] = useState<string>('');

  // Bulk Upload State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  const adminSession = useStore((state) => state.adminSession);
  const isSuperAdmin = adminSession?.role === 'super_admin';

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdminDuesPlanFormData>({
    resolver: zodResolver(adminDuesPlanFormSchema),
    defaultValues: {
      principal: 10000,
      interest: 1500,
      processingFee: 500,
      emiAmount: 2000,
      nextEmiDate: '2026-11-25',
      totalEmis: 12,
      remainingEmis: 6,
      tenureMonths: 12,
    },
  });

  const principal = watch('principal') || 0;
  const interest = watch('interest') || 0;
  const processingFee = watch('processingFee') || 0;
  const calculatedTotal = Number(principal) + Number(interest) + Number(processingFee);

  const handleApplyEmiCalculation = (calc: EmiCalculationResult) => {
    setValue('interest', calc.interestAmount);
    setValue('emiAmount', calc.emiAmount);
    setValue('tenureMonths', calc.tenureWeeks);
    setValue('totalEmis', calc.totalEmis);
    setValue('remainingEmis', calc.remainingEmis);
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
    setValue('nextEmiDate', target.toISOString().split('T')[0]);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [ptData, cData] = await Promise.all([
        adminApi.getPlanTypes(),
        adminApi.getConsumers(),
      ]);
      setPlanTypes(ptData);
      setConsumers(cData);

      const state = useStore.getState();
      setPlans(state.duesPlans);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrUpdatePlan = async (data: AdminDuesPlanFormData) => {
    try {
      if (editingPlan) {
        await adminApi.updateDuesPlan(editingPlan.id, data);
      } else {
        await adminApi.createDuesPlan({
          ...data,
          consumerId: modalConsumerId,
        });
      }
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      reset();
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error saving dues plan');
    }
  };

  const openAddPlanForConsumer = (cId: string) => {
    setEditingPlan(null);
    setModalConsumerId(cId);
    const enabledPt = planTypes.find((p) => p.enabled);
    reset({
      planTypeId: enabledPt?.id || '',
      title: 'Personal Loan EMI',
      referenceNumber: `LN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      principal: 15000,
      interest: 2000,
      processingFee: 500,
      emiAmount: 2500,
      nextEmiDate: '2026-11-25',
      totalEmis: 12,
      remainingEmis: 7,
      tenureMonths: 12,
    });
    setIsPlanModalOpen(true);
  };

  const openEditPlan = (plan: DuesPlan) => {
    setEditingPlan(plan);
    setModalConsumerId(plan.consumerId);
    setValue('planTypeId', plan.planTypeId);
    setValue('title', plan.title);
    setValue('referenceNumber', plan.referenceNumber);
    setValue('principal', plan.principal);
    setValue('interest', plan.interest);
    setValue('processingFee', plan.processingFee);
    setValue('emiAmount', plan.emiAmount);
    setValue('nextEmiDate', plan.nextEmiDate);
    setValue('totalEmis', plan.totalEmis);
    setValue('remainingEmis', plan.remainingEmis);
    setValue('tenureMonths', plan.tenureWeeks || plan.tenureMonths || plan.totalEmis || 12);
    setValue('linkedCardTypeId', plan.linkedCardTypeId || '');
    setIsPlanModalOpen(true);
  };

  const handleDeletePlan = async (id: string, title: string) => {
    if (!isSuperAdmin) {
      alert('Only Super Admin can delete dues plans.');
      return;
    }
    if (window.confirm(`Permanently delete dues plan "${title}"?`)) {
      try {
        await adminApi.deleteDuesPlan(id);
        loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to delete');
      }
    }
  };

  // Sample CSV / Excel Download
  const handleDownloadSampleCsv = () => {
    const sampleRows = [
      {
        account_number: 'AKR10004821',
        plan_type: 'Loan EMI',
        plan_reference: 'LN-2024-8842',
        outstanding: 17000,
        principal: 13500,
        interest: 3000,
        processing_fee: 500,
        emi_amount: 2750,
        next_emi_date: '2026-10-25',
        total_emis: 36,
        remaining_emis: 18,
        tenure_months: 36,
      },
      {
        account_number: 'AKR10005512',
        plan_type: 'Card EMI',
        plan_reference: 'CD-EMI-5512',
        outstanding: 12500,
        principal: 11000,
        interest: 1200,
        processing_fee: 300,
        emi_amount: 2500,
        next_emi_date: '2026-10-20',
        total_emis: 12,
        remaining_emis: 5,
        tenure_months: 12,
      },
    ];

    const csv = Papa.unparse(sampleRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'AKR_Dues_Bulk_Upload_Sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse Uploaded CSV / Excel File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRowErrors([]);
    setUploadSuccessMessage(null);

    const isCsv = file.name.endsWith('.csv');

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          validateAndStageRows(results.data);
        },
        error: (err) => {
          setRowErrors([`CSV Parsing Error: ${err.message}`]);
        },
      });
    } else {
      // Excel parse via SheetJS
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          validateAndStageRows(data);
        } catch (err: any) {
          setRowErrors([`Excel Reading Error: ${err.message}`]);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const validateAndStageRows = (rawRows: any[]) => {
    const errors: string[] = [];
    const validRows: any[] = [];

    rawRows.forEach((row, i) => {
      const rowNum = i + 2;
      const res = bulkDuesRowSchema.safeParse(row);
      if (!res.success) {
        const issues = res.error.issues.map((it) => it.message).join(', ');
        errors.push(`Row ${rowNum}: ${issues}`);
      } else {
        // Check if plan_type exists in planTypes
        const ptMatch = planTypes.find(
          (pt) =>
            pt.name.toLowerCase().trim() === res.data.plan_type.toLowerCase().trim() ||
            pt.category.toLowerCase().trim() === res.data.plan_type.toLowerCase().trim()
        );
        if (!ptMatch) {
          errors.push(`Row ${rowNum}: Unknown plan_type "${res.data.plan_type}"`);
        } else if (!ptMatch.enabled) {
          errors.push(`Row ${rowNum}: Plan type "${res.data.plan_type}" is currently disabled`);
        } else {
          validRows.push({
            accountNumber: res.data.account_number,
            planType: res.data.plan_type,
            planReference: res.data.plan_reference,
            outstanding: res.data.outstanding,
            principal: res.data.principal,
            interest: res.data.interest,
            processingFee: res.data.processing_fee,
            emiAmount: res.data.emi_amount,
            nextEmiDate: res.data.next_emi_date,
            totalEmis: res.data.total_emis,
            remainingEmis: res.data.remaining_emis,
            tenureMonths: res.data.tenure_months,
          });
        }
      }
    });

    setRowErrors(errors);
    setParsedRows(validRows);
  };

  const handleConfirmBulkUpload = async () => {
    if (parsedRows.length === 0) return;
    try {
      setIsUploading(true);
      const res = await adminApi.bulkUploadDues(parsedRows);
      setUploadSuccessMessage(
        `Applied ${res.successCount} dues records successfully! Updated plans are now live in consumer apps.`
      );
      setParsedRows([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Bulk upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const calculateDaysOverdue = (dateStr?: string) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const now = new Date();
    const dateDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.floor((todayDay.getTime() - dateDay.getTime()) / (1000 * 3600 * 24));
    return Math.max(0, diff);
  };

  // Overdue plans: active with outstanding balance that crossed due date by 1+ days or already have overdue fees
  const overduePlans = plans.filter((p) => {
    if (p.status !== 'active' || p.outstandingAmount <= 0) return false;
    const days = calculateDaysOverdue(p.nextEmiDate);
    return days >= 1 || (p.overdueAmount && p.overdueAmount > 0);
  });

  const openOverdueModal = (plan: DuesPlan) => {
    setOverdueTargetPlan(plan);
    setManualOverdueFee(plan.overdueAmount || 250);
    setMissedWeeks(plan.missedWeeks || plan.missedMonths || 1);
    setOverdueRemarks(plan.overdueRemarks || 'Payment past due date. Late fee applied.');
  };

  const handleSaveOverdueFee = async () => {
    if (!overdueTargetPlan) return;
    try {
      setIsSavingOverdue(true);
      await adminApi.setPlanOverdueFee(overdueTargetPlan.id, {
        overdueAmount: Number(manualOverdueFee),
        missedWeeks: Number(missedWeeks),
        missedMonths: Number(missedWeeks),
        remarks: overdueRemarks,
      });
      setOverdueToast(`Overdue late fee of ₹${Number(manualOverdueFee).toLocaleString('en-IN')} updated for "${overdueTargetPlan.title}"!`);
      setOverdueTargetPlan(null);
      await loadData();
      setTimeout(() => setOverdueToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error updating overdue fee');
    } finally {
      setIsSavingOverdue(false);
    }
  };

  // Filter plans
  const filteredPlans = (activeTab === 'overdue' ? overduePlans : plans).filter((p) => {
    if (selectedConsumerId !== 'all' && p.consumerId !== selectedConsumerId) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchRef = p.referenceNumber.toLowerCase().includes(q);
      const con = consumers.find((c) => c.id === p.consumerId);
      const matchConsumer = con?.name.toLowerCase().includes(q) || con?.accountNumber.toLowerCase().includes(q);
      if (!matchTitle && !matchRef && !matchConsumer) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {overdueToast && (
        <div className="fixed top-5 right-5 z-50 p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-600/80 text-emerald-200 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{overdueToast}</span>
        </div>
      )}

      {/* Top Header & Bulk Upload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Consumer Dues & EMI Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Maintain individualized EMI schedules, assign multiple dues plans, and track overdue accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setParsedRows([]);
              setRowErrors([]);
              setUploadSuccessMessage(null);
              setIsBulkModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 border border-zinc-700 text-zinc-200 hover:border-akr-gold hover:text-white transition-all shadow-sm"
          >
            <Upload className="w-4 h-4 text-akr-gold" />
            <span>Bulk CSV / Excel Upload</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation: All Plans vs Overdue Tracker */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-akr-gold text-black shadow-md'
              : 'bg-[#141417] text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Active Dues Plans</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-current font-mono">
            {plans.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'overdue'
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-[#181212] text-red-300 hover:bg-red-950/60 border border-red-500/30'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span>⚠️ Overdue Accounts & Late Fees</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-mono font-bold animate-pulse">
            {overduePlans.length} Overdue
          </span>
        </button>
      </div>

      {/* Overdue Section Explanatory Alert Banner */}
      {activeTab === 'overdue' && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-600/40 flex items-start gap-3 text-xs text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-left">
            <h4 className="font-bold text-white text-sm">Overdue Accounts & Manual Late Fee Management</h4>
            <p className="text-zinc-300">
              The accounts below have crossed their scheduled EMI due date by 1 or more days. As an Admin, you can assign an overdue late fee penalty and specify whether 1 or 2 months are missed.
              Once saved, the penalty updates dynamically in the customer's portal and enforces a strict, non-negotiable payment total without partial discounts.
            </p>
          </div>
        </div>
      )}

      {/* Filter Row: Consumer Dropdown & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Consumer Filter */}
        <div>
          <select
            value={selectedConsumerId}
            onChange={(e) => setSelectedConsumerId(e.target.value)}
            className="w-full bg-[#141417] border border-zinc-800 text-white rounded-xl py-2.5 px-3 text-xs font-semibold focus:border-akr-gold outline-none"
          >
            <option value="all">All Consumers ({consumers.length})</option>
            {consumers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.accountNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={
              activeTab === 'overdue'
                ? "Search overdue borrowers, references, or phone..."
                : "Search by plan title, reference (e.g. LN-2024-8842), or consumer..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#141417] border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:border-akr-gold outline-none"
          />
        </div>
      </div>

      {/* Selected Consumer Quick Action Banner */}
      {selectedConsumerId !== 'all' && (
        <div className="p-4 rounded-xl bg-akr-gold/10 border border-akr-gold/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-akr-gold tracking-wider">
              Selected Consumer
            </span>
            <h3 className="text-sm font-bold text-white">
              {consumers.find((c) => c.id === selectedConsumerId)?.name}
            </h3>
          </div>
          <button
            onClick={() => openAddPlanForConsumer(selectedConsumerId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-akr-gold text-black shadow-gold-glow hover:brightness-105"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Plan for Consumer</span>
          </button>
        </div>
      )}

      {/* Dues Plans Table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#141417] border border-zinc-800 text-zinc-400">
          <Layers className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
          <p className="text-sm font-semibold">
            {activeTab === 'overdue'
              ? 'No accounts currently overdue! All active EMI payments are on schedule.'
              : 'No dues plans found matching criteria.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1B1B1F] text-zinc-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Plan Title & Reference</th>
                    <th className="py-3 px-4">Consumer</th>
                    <th className="py-3 px-4">Outstanding</th>
                    {activeTab === 'overdue' ? (
                      <>
                        <th className="py-3 px-4">Due Date & Delay</th>
                        <th className="py-3 px-4">Missed Tenure</th>
                        <th className="py-3 px-4">Regular EMI</th>
                        <th className="py-3 px-4">Late Fee Penalty</th>
                        <th className="py-3 px-4">Total Mandatory Payable</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-4">Breakdown (P + I + Fee)</th>
                        <th className="py-3 px-4">EMI Amount</th>
                        <th className="py-3 px-4">Next Due Date</th>
                        <th className="py-3 px-4">EMIs Left</th>
                        <th className="py-3 px-4">Status</th>
                      </>
                    )}
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredPlans.map((p) => {
                    const consumer = consumers.find((c) => c.id === p.consumerId);
                    const daysOverdue = calculateDaysOverdue(p.nextEmiDate);
                    const isOverdue = daysOverdue >= 1;
                    const missedWeeksCount = p.missedWeeks || p.missedMonths || 1;
                    const mandatoryPayable =
                      (p.emiAmount * missedWeeksCount) + (p.overdueAmount || 0);

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-zinc-800/40 transition-colors ${
                          isOverdue ? 'bg-red-950/10' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{p.title}</span>
                            {isOverdue && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                Overdue
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400">{p.referenceNumber}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-zinc-200">{consumer?.name || '-'}</div>
                          <div className="text-[10px] font-mono text-zinc-500">{consumer?.accountNumber}</div>
                          {consumer?.mobile && (
                            <div className="text-[10px] text-zinc-400">{consumer.mobile}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-akr-gold text-sm">
                          {formatCurrency(p.outstandingAmount)}
                        </td>

                        {activeTab === 'overdue' ? (
                          <>
                            <td className="py-3.5 px-4">
                              <span className="font-medium text-white block">
                                {p.nextEmiDate ? formatDisplayDate(p.nextEmiDate) : 'N/A'}
                              </span>
                              <span className="text-[10px] font-bold text-red-400">
                                {daysOverdue} days past due
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-800 text-amber-300 border border-zinc-700">
                                {missedWeeksCount === 2 ? '2 Weeks Missed' : `${missedWeeksCount} Week${missedWeeksCount > 1 ? 's' : ''} Missed`}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-zinc-200">
                              {formatCurrency(p.emiAmount)}
                            </td>

                            <td className="py-3.5 px-4">
                              {p.overdueAmount && p.overdueAmount > 0 ? (
                                <span className="font-bold text-red-400 font-mono">
                                  + {formatCurrency(p.overdueAmount)}
                                </span>
                              ) : (
                                <span className="text-zinc-500 text-[11px] italic">Not set</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-emerald-400 text-sm font-mono block">
                                {formatCurrency(mandatoryPayable)}
                              </span>
                              <span className="text-[10px] text-zinc-500 block">Strict (No discounts)</span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3.5 px-4 text-zinc-300 font-mono text-[11px]">
                              ₹{p.principal.toLocaleString('en-IN')} + ₹{p.interest.toLocaleString('en-IN')} + ₹{p.processingFee.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-white">
                              {p.emiAmount > 0 ? formatCurrency(p.emiAmount) : 'None'}
                              {p.overdueAmount && p.overdueAmount > 0 ? (
                                <span className="text-[10px] text-red-400 block font-normal">
                                  + {formatCurrency(p.overdueAmount)} late fee
                                </span>
                              ) : null}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-300">
                              {p.nextEmiDate ? formatDisplayDate(p.nextEmiDate) : 'N/A'}
                              {isOverdue && (
                                <span className="text-[10px] text-red-400 block font-semibold">
                                  ({daysOverdue}d overdue)
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-300">
                              {p.remainingEmis} / {p.totalEmis}
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge status={p.status === 'active' ? 'Active' : 'Closed'} size="sm" />
                            </td>
                          </>
                        )}

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Overdue Action Button */}
                            {isOverdue && (
                              <button
                                onClick={() => openOverdueModal(p)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/40 transition-all flex items-center gap-1 cursor-pointer"
                                title="Levy / Edit Overdue Penalty"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>{p.overdueAmount ? 'Edit Overdue' : 'Levy Late Fee'}</span>
                              </button>
                            )}

                            <button
                              onClick={() => openEditPlan(p)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-akr-gold hover:bg-zinc-800"
                              title="Edit Plan"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeletePlan(p.id, p.title)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                                title="Delete Plan (Super Admin)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="lg:hidden space-y-3">
            {filteredPlans.map((p) => {
              const consumer = consumers.find((c) => c.id === p.consumerId);
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-[#141417] border border-zinc-800/80 shadow-card-dark space-y-3 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{p.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                          {p.referenceNumber}
                        </span>
                        <span className="text-xs font-semibold text-zinc-300">
                          {consumer?.name || 'Customer'}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={p.status === 'active' ? 'Active' : 'Closed'} size="sm" />
                  </div>

                  {/* Financial Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Outstanding</span>
                      <span className="font-bold text-akr-gold text-sm">{formatCurrency(p.outstandingAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">EMI Amount</span>
                      <span className="font-bold text-white">
                        {p.emiAmount > 0 ? formatCurrency(p.emiAmount) : 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Next Due Date</span>
                      <span className="text-zinc-300">
                        {p.nextEmiDate ? formatDisplayDate(p.nextEmiDate) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">EMIs Left</span>
                      <span className="text-zinc-300 font-mono">
                        {p.remainingEmis} / {p.totalEmis}
                      </span>
                    </div>
                  </div>

                  {/* Principal Breakdown */}
                  <div className="p-2.5 rounded-xl bg-[#18181D] border border-zinc-800/80 text-[11px] font-mono flex items-center justify-between text-zinc-400">
                    <span>Breakdown:</span>
                    <span className="text-zinc-300">
                      ₹{p.principal.toLocaleString('en-IN')} (P) + ₹{p.interest.toLocaleString('en-IN')} (I) + ₹{p.processingFee.toLocaleString('en-IN')} (Fee)
                    </span>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                    {calculateDaysOverdue(p.nextEmiDate) >= 1 && (
                      <button
                        onClick={() => openOverdueModal(p)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/40 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{p.overdueAmount ? 'Edit Late Fee' : 'Levy Late Fee'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => openEditPlan(p)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 text-akr-gold" />
                      <span>Edit Plan</span>
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeletePlan(p.id, p.title)}
                        className="px-3 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-950/60 text-red-400 border border-red-900/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add / Edit Dues Plan Modal */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={editingPlan ? 'Edit Dues Plan' : 'Assign New Dues Plan'}
      >
        <form onSubmit={handleSubmit(handleCreateOrUpdatePlan)} className="space-y-3.5 text-left">
          {/* Plan Type Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Plan Type Master
            </label>
            <select
              {...register('planTypeId')}
              className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold"
            >
              {planTypes
                .filter((pt) => pt.enabled || (editingPlan && editingPlan.planTypeId === pt.id))
                .map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name} ({pt.category}) {!pt.enabled ? '[Disabled]' : ''}
                  </option>
                ))}
            </select>
          </div>

          <InputField
            label="Product / Item Name *"
            placeholder="e.g. Kanchipuram Silk Bridal Saree"
            error={errors.title?.message}
            {...register('title')}
          />

          <InputField
            label="Reference Number"
            placeholder="e.g. SAR-2026-8812"
            error={errors.referenceNumber?.message}
            {...register('referenceNumber')}
          />

          {/* Base Product Price & Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField
              label="Product Price / Principal (₹) *"
              type="number"
              placeholder="10000"
              error={errors.principal?.message}
              {...register('principal')}
            />
            <InputField
              label="Processing Fee (₹) *"
              type="number"
              placeholder="0"
              error={errors.processingFee?.message}
              {...register('processingFee')}
            />
          </div>

          {/* Smart EMI & Tenure Calculator */}
          <EmiTenureCalculator
            principal={principal}
            processingFee={processingFee}
            onApplyCalculation={handleApplyEmiCalculation}
            defaultTenure={12}
            defaultInterestRate={0}
          />

          {/* Synced Breakdown & Installment Terms */}
          <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-akr-gold uppercase tracking-wider block">
                Final Terms & Schedule (Auto-Filled)
              </span>
              <span className="text-[10px] text-zinc-400">
                Prefilled by calculator, editable
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <InputField
                label="Interest (₹) *"
                type="number"
                error={errors.interest?.message}
                {...register('interest')}
              />
              <InputField
                label="Weekly EMI (₹) *"
                type="number"
                error={errors.emiAmount?.message}
                {...register('emiAmount')}
              />
              <div className="p-2.5 rounded-lg bg-black/60 border border-zinc-700/80 flex flex-col justify-center">
                <span className="text-[10px] text-zinc-400 uppercase">Total Outstanding</span>
                <span className="font-bold text-base text-akr-gold">
                  {formatCurrency(calculatedTotal)}
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
                error={errors.nextEmiDate?.message}
                {...register('nextEmiDate')}
              />
            </div>

            {/* Total EMIs, Remaining, Tenure */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <InputField
                label="Total Weekly EMIs *"
                type="number"
                error={errors.totalEmis?.message}
                {...register('totalEmis')}
              />
              <InputField
                label="Remaining *"
                type="number"
                error={errors.remainingEmis?.message}
                {...register('remainingEmis')}
              />
              <InputField
                label="Tenure (Weeks) *"
                type="number"
                error={errors.tenureMonths?.message}
                {...register('tenureMonths')}
              />
            </div>
          </div>

          <div className="pt-3">
            <GoldButton type="submit" isLoading={isSubmitting}>
              {editingPlan ? 'Save Changes' : 'Create & Assign Plan'}
            </GoldButton>
          </div>
        </form>
      </Modal>

      {/* Bulk Upload CSV / Excel Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Upload Dues via CSV / Excel"
        maxWidth="xl"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-zinc-400">
            Upload a spreadsheet with columns:{' '}
            <code className="text-akr-gold font-mono text-[11px]">
              account_number, plan_type, plan_reference, outstanding, principal, interest, processing_fee, emi_amount, next_emi_date, total_emis, remaining_emis, tenure_months
            </code>
          </p>

          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div>
              <h5 className="text-xs font-bold text-white">Sample CSV Template</h5>
              <p className="text-[10px] text-zinc-400">Download formatted template for reference</p>
            </div>
            <button
              onClick={handleDownloadSampleCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 text-akr-gold border border-zinc-700 hover:border-akr-gold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Drag & Drop File Input */}
          <div className="p-6 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-akr-gold text-center cursor-pointer transition-colors">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="bulk-file-input"
            />
            <label htmlFor="bulk-file-input" className="cursor-pointer">
              <Upload className="w-8 h-8 text-akr-gold mx-auto mb-2" />
              <span className="text-xs font-bold text-white block">
                Click to browse CSV or Excel file
              </span>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">
                Supports .csv, .xlsx, .xls
              </span>
            </label>
          </div>

          {/* Success Message */}
          {uploadSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{uploadSuccessMessage}</span>
            </div>
          )}

          {/* Row Level Errors */}
          {rowErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-300 space-y-1 max-h-36 overflow-y-auto">
              <span className="font-bold block text-red-200">
                {rowErrors.length} Row Validation Errors Found:
              </span>
              {rowErrors.map((err, i) => (
                <div key={i} className="text-[11px] leading-tight">
                  • {err}
                </div>
              ))}
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">
                  Validated Preview ({parsedRows.length} valid rows)
                </span>
                <span className="text-emerald-400 font-semibold">Ready to Apply</span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-800">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-[#1B1B1F] text-zinc-400 uppercase">
                    <tr>
                      <th className="p-2">Account</th>
                      <th className="p-2">Plan Type</th>
                      <th className="p-2">Ref</th>
                      <th className="p-2">Outstanding</th>
                      <th className="p-2">EMI</th>
                      <th className="p-2">Next Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className="hover:bg-zinc-800/40">
                        <td className="p-2 font-mono text-white">{r.accountNumber}</td>
                        <td className="p-2 text-zinc-300">{r.planType}</td>
                        <td className="p-2 text-zinc-300 font-mono">{r.planReference}</td>
                        <td className="p-2 font-bold text-akr-gold">₹{r.outstanding}</td>
                        <td className="p-2 text-white">₹{r.emiAmount}</td>
                        <td className="p-2 text-zinc-400">{r.nextEmiDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <GoldButton
                onClick={handleConfirmBulkUpload}
                isLoading={isUploading}
              >
                Apply & Update {parsedRows.length} Records
              </GoldButton>
            </div>
          )}
        </div>
      </Modal>
      {/* Overdue Penalty Management Modal */}
      {overdueTargetPlan && (
        <Modal
          isOpen={!!overdueTargetPlan}
          onClose={() => setOverdueTargetPlan(null)}
          title="Levy Overdue & Late Payment Penalty"
          maxWidth="md"
        >
          <div className="space-y-4 text-left text-xs">
            {/* Target Account Info */}
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-600/40 text-red-200 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm">{overdueTargetPlan.title}</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                  {calculateDaysOverdue(overdueTargetPlan.nextEmiDate)} Days Past Due
                </span>
              </div>
              <p className="text-[11px] text-zinc-300">
                Borrower: <strong className="text-white">{consumers.find(c => c.id === overdueTargetPlan.consumerId)?.name || 'Consumer'}</strong> ({consumers.find(c => c.id === overdueTargetPlan.consumerId)?.accountNumber})
                • Ref: {overdueTargetPlan.referenceNumber}
              </p>
              <p className="text-[11px] text-zinc-400">
                Scheduled Due Date: <strong className="text-zinc-200">{formatDisplayDate(overdueTargetPlan.nextEmiDate)}</strong>
              </p>
            </div>

            {/* Missed Weeks Tenure */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1.5">
                Missed Weekly EMI Tenure *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMissedWeeks(1)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    missedWeeks === 1
                      ? 'bg-akr-gold/15 border-akr-gold text-white shadow-sm'
                      : 'bg-[#18181B] border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold block text-xs">1 Week Missed</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    Current Weekly EMI ({formatCurrency(overdueTargetPlan.emiAmount)}) + Penalty
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMissedWeeks(2)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    missedWeeks === 2
                      ? 'bg-akr-gold/15 border-akr-gold text-white shadow-sm'
                      : 'bg-[#18181B] border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold block text-xs">2 Weeks Missed</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    2x Weekly EMIs ({formatCurrency(overdueTargetPlan.emiAmount * 2)}) + Penalty
                  </span>
                </button>
              </div>
            </div>

            {/* Manual Overdue Late Fee Amount */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-300 uppercase">
                  Manual Late Fee / Overdue Amount (₹) *
                </label>
                <span className="text-[10px] text-akr-gold font-bold">Quick Presets</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 mb-2">
                {[150, 250, 500, 750, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setManualOverdueFee(amt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      manualOverdueFee === amt
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'bg-[#18181B] border border-zinc-700 text-zinc-300 hover:border-red-400'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="0"
                value={manualOverdueFee}
                onChange={(e) => setManualOverdueFee(Number(e.target.value))}
                placeholder="250"
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-red-500"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Enter the exact overdue fine to be charged to the customer.
              </span>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                Admin Audit Remarks / Reason
              </label>
              <textarea
                rows={2}
                value={overdueRemarks}
                onChange={(e) => setOverdueRemarks(e.target.value)}
                placeholder="e.g. Crossed weekly due date by 7 days. Applied standard late fee."
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold resize-none"
              />
            </div>

            {/* Live Calculation Preview Box */}
            <div className="p-3.5 rounded-xl bg-[#121215] border border-zinc-800 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-akr-gold tracking-wider block">
                Total Mandatory Payment Calculation (User Side)
              </span>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>
                  Missed Weekly EMI ({missedWeeks} {missedWeeks > 1 ? 'weeks' : 'week'} x {formatCurrency(overdueTargetPlan.emiAmount)}):
                </span>
                <span className="font-mono text-white">
                  {formatCurrency(overdueTargetPlan.emiAmount * missedWeeks)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Manual Overdue Penalty / Late Fee:</span>
                <span className="font-mono text-red-400 font-bold">
                  + {formatCurrency(Number(manualOverdueFee) || 0)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-zinc-800 flex justify-between items-center text-sm">
                <span className="font-bold text-white">Total Non-Negotiable Payable:</span>
                <span className="font-bold font-mono text-emerald-400 text-base">
                  {formatCurrency((overdueTargetPlan.emiAmount * missedWeeks) + (Number(manualOverdueFee) || 0))}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 italic block pt-1">
                • User cannot edit or pay less than this amount. Discounts and partial payments are locked out.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setOverdueTargetPlan(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <GoldButton
                onClick={handleSaveOverdueFee}
                isLoading={isSavingOverdue}
                className="bg-red-500 hover:bg-red-600 text-white font-bold"
              >
                Save & Enforce Late Fee
              </GoldButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
