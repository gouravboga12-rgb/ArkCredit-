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
  ArrowUpCircle,
  TrendingUp,
  Check,
  X,
  BookOpen,
  Receipt,
} from 'lucide-react';
import { adminApi } from '../../../core/api';
import { useStore } from '../../../store';
import { broadcastLocalRealtimeEvent } from '../../../core/realtime/socket';
import { DuesPlan, PlanType, Consumer, PlanCategory } from '../../../core/types';
import { formatCurrency, formatDisplayDate } from '../../../core/formatters';
import { calculatePlanOverdue } from '../../../core/domain';
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
  const [planFormError, setPlanFormError] = useState<string | null>(null);

  // Credit Limit Upgrade States inside Plan Modal
  const [isUpgradingLimit, setIsUpgradingLimit] = useState(false);
  const [newCreditLimitInput, setNewCreditLimitInput] = useState<string>('');
  const [isSavingLimitUpgrade, setIsSavingLimitUpgrade] = useState(false);
  const [upgradeSuccessMsg, setUpgradeSuccessMsg] = useState<string | null>(null);
  const [showCustomUpgradeInput, setShowCustomUpgradeInput] = useState(false);

  // Bulk Upload State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  // Plan Ledger Modal State
  const [selectedLedgerPlan, setSelectedLedgerPlan] = useState<DuesPlan | null>(null);
  const [ledgerPayments, setLedgerPayments] = useState<any[]>([]);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [loadingLedgerPayments, setLoadingLedgerPayments] = useState(false);

  const openPlanLedger = async (plan: DuesPlan) => {
    setSelectedLedgerPlan(plan);
    setIsLedgerModalOpen(true);
    try {
      setLoadingLedgerPayments(true);
      const allPayments = await adminApi.getPayments();
      const planPayments = allPayments.filter(
        (p) => p.planId === plan.id || p.consumerId === plan.consumerId
      );
      setLedgerPayments(planPayments);
    } catch (err) {
      console.error('Failed to load ledger payments', err);
    } finally {
      setLoadingLedgerPayments(false);
    }
  };

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

  // Custom Plan Type creation inside Add Plan Form
  const [isCreatingPlanType, setIsCreatingPlanType] = useState(false);
  const [newPlanTypeName, setNewPlanTypeName] = useState('');
  const [newPlanTypeCategory, setNewPlanTypeCategory] = useState<PlanCategory>('SAREE_EMI');
  const [isSavingPlanType, setIsSavingPlanType] = useState(false);

  const handleSaveCustomPlanType = async () => {
    if (!newPlanTypeName.trim()) return;
    try {
      setIsSavingPlanType(true);
      const created = await adminApi.createPlanType({
        name: newPlanTypeName.trim(),
        category: newPlanTypeCategory,
        icon: 'shopping-bag',
        enabled: true,
      });

      // Update local state list
      setPlanTypes((prev) => {
        const filtered = prev.filter((p) => p.id !== created.id);
        return [...filtered, created];
      });

      // Update Zustand store
      useStore.setState((state) => ({
        planTypes: [...state.planTypes.filter((p) => p.id !== created.id), created],
      }));

      // Immediately select in the form
      setValue('planTypeId', created.id);
      if (!watch('title')) {
        setValue('title', `${created.name} EMI`);
      }

      setIsCreatingPlanType(false);
      setNewPlanTypeName('');
      setOverdueToast(`Custom EMI Type "${created.name}" created and selected!`);
      setTimeout(() => setOverdueToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to create custom EMI plan type');
    } finally {
      setIsSavingPlanType(false);
    }
  };

  const handleApplyEmiCalculation = (calc: EmiCalculationResult) => {
    setValue('interest', calc.interestAmount);
    setValue('emiAmount', calc.emiAmount);
    setValue('tenureWeeks', calc.tenureWeeks);
    setValue('tenureMonths', calc.tenureMonths);
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
      const [ptData, cData, pData] = await Promise.all([
        adminApi.getPlanTypes().catch(() => []),
        adminApi.getConsumers().catch(() => []),
        adminApi.getDuesPlans().catch(() => []),
      ]);
      setPlanTypes(ptData || []);
      setConsumers(cData || []);
      setPlans(pData || []);
    } catch (err) {
      console.error(err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleRealtimeDues = () => {
      loadData();
    };
    const handleRealtimePayment = () => {
      loadData();
    };
    const handleRealtimeConsumer = () => {
      loadData();
    };

    window.addEventListener('akr_dues_realtime_update', handleRealtimeDues);
    window.addEventListener('akr_payment_realtime_update', handleRealtimePayment);
    window.addEventListener('akr_consumer_realtime_update', handleRealtimeConsumer);

    return () => {
      window.removeEventListener('akr_dues_realtime_update', handleRealtimeDues);
      window.removeEventListener('akr_payment_realtime_update', handleRealtimePayment);
      window.removeEventListener('akr_consumer_realtime_update', handleRealtimeConsumer);
    };
  }, []);

  const handlePlanValidationError = (formErrors: any) => {
    console.error('Plan form validation errors:', formErrors);
    const firstMsg = Object.values(formErrors)[0] as any;
    setPlanFormError(firstMsg?.message || 'Please fill in all required fields correctly.');
  };

  const handleCreateOrUpdatePlan = async (data: AdminDuesPlanFormData) => {
    try {
      setPlanFormError(null);
      const principal = Number(data.principal) || 0;

      // Real-time card suspension & credit limit enforcement
      const targetConsumer = consumers.find((c) => c.id === modalConsumerId);
      if (targetConsumer) {
        if (!editingPlan && targetConsumer.cardStatus === 'suspended') {
          setPlanFormError(
            `Customer Privilege Card is currently SUSPENDED! New EMI plans cannot be assigned to ${targetConsumer.name} while their card is suspended. Please reactivate their card under Privilege Card Requests before proceeding.`
          );
          return;
        }

        const consumerLimit = Number(targetConsumer.creditLimit) || 0;
        const currentOutstanding = Number(targetConsumer.totalOutstanding) || 0;
        const adjustedOutstanding = editingPlan
          ? Math.max(0, currentOutstanding - (Number(editingPlan.outstandingAmount) || 0))
          : currentOutstanding;
        const availableBalance = Math.max(0, consumerLimit - adjustedOutstanding);

        if (principal > availableBalance) {
          setPlanFormError(
            `Credit limit exceeded! Customer's available credit balance is ${formatCurrency(availableBalance)}, but requested principal is ${formatCurrency(principal)}. Please upgrade credit limit before proceeding.`
          );
          return;
        }
      }

      const interest = Number(data.interest) || 0;
      const processingFee = Number(data.processingFee) || 0;
      const calculatedTotal = principal + interest + processingFee;
      const tenureWeeks = Number(data.tenureWeeks) || Number(data.totalEmis) || (Number(data.tenureMonths) ? Number(data.tenureMonths) * 4 : 12);
      const tenureMonths = Number(data.tenureMonths) || Math.ceil(tenureWeeks / 4);

      const planPayload = {
        ...data,
        principal,
        interest,
        processingFee,
        outstandingAmount: calculatedTotal,
        totalPaymentDue: calculatedTotal,
        tenureWeeks,
        tenureMonths,
        nextEmiDate: data.nextEmiDate ? data.nextEmiDate.split('T')[0] : new Date().toISOString().split('T')[0],
        consumerId: modalConsumerId,
        status: 'active' as const,
      };

      if (editingPlan) {
        await adminApi.updateDuesPlan(editingPlan.id, planPayload);
        setOverdueToast(`Plan "${data.title}" updated successfully!`);
      } else {
        await adminApi.createDuesPlan(planPayload);
        setOverdueToast(`Plan "${data.title}" created successfully!`);
      }
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      reset();
      loadData();
      broadcastLocalRealtimeEvent('DUES_UPDATED', { consumerId: modalConsumerId });
      setTimeout(() => setOverdueToast(null), 4000);
    } catch (err: any) {
      console.error('Error saving plan:', err);
      setPlanFormError(err.message || 'Error saving dues plan');
    }
  };

  const openAddPlanForConsumer = (cId: string) => {
    setEditingPlan(null);
    setModalConsumerId(cId);
    setPlanFormError(null);
    setIsUpgradingLimit(false);
    setShowCustomUpgradeInput(false);
    setUpgradeSuccessMsg(null);
    const targetConsumer = consumers.find((c) => c.id === cId);
    setNewCreditLimitInput(String(targetConsumer?.creditLimit || 50000));
    const enabledPt = planTypes.find((p) => p.enabled);
    reset({
      planTypeId: enabledPt?.id || '',
      title: 'Personal Loan EMI',
      referenceNumber: `LN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      principal: 15000,
      interest: 0,
      processingFee: 0,
      emiAmount: 1250,
      nextEmiDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      totalEmis: 12,
      remainingEmis: 12,
      tenureWeeks: 12,
      tenureMonths: 3,
    });
    setIsPlanModalOpen(true);
  };

  const openEditPlan = (plan: DuesPlan) => {
    setEditingPlan(plan);
    setModalConsumerId(plan.consumerId);
    setPlanFormError(null);
    setIsUpgradingLimit(false);
    setShowCustomUpgradeInput(false);
    setUpgradeSuccessMsg(null);
    const targetConsumer = consumers.find((c) => c.id === plan.consumerId);
    setNewCreditLimitInput(String(targetConsumer?.creditLimit || 50000));
    const weeks = plan.tenureWeeks || (plan.tenureMonths ? plan.tenureMonths * 4 : plan.totalEmis || 12);
    setValue('planTypeId', plan.planTypeId);
    setValue('title', plan.title);
    setValue('referenceNumber', plan.referenceNumber);
    setValue('principal', plan.principal);
    setValue('interest', plan.interest || 0);
    setValue('processingFee', plan.processingFee || 0);
    setValue('emiAmount', plan.emiAmount);
    setValue('nextEmiDate', plan.nextEmiDate ? plan.nextEmiDate.split('T')[0] : '');
    setValue('totalEmis', plan.totalEmis);
    setValue('remainingEmis', plan.remainingEmis);
    setValue('tenureWeeks', weeks);
    setValue('tenureMonths', plan.tenureMonths || Math.ceil(weeks / 4));
    setValue('linkedCardTypeId', plan.linkedCardTypeId || '');
    setIsPlanModalOpen(true);
  };

  const handleUpgradeCreditLimit = async (suggestedAmount?: number) => {
    const targetConsumer = consumers.find((c) => c.id === modalConsumerId);
    if (!targetConsumer) return;
    const targetLimit = suggestedAmount !== undefined ? suggestedAmount : Number(newCreditLimitInput);
    if (!targetLimit || isNaN(targetLimit) || targetLimit <= 0) {
      alert('Please enter a valid credit limit greater than ₹0');
      return;
    }
    try {
      setIsSavingLimitUpgrade(true);
      await adminApi.updateConsumer(targetConsumer.id, { creditLimit: targetLimit });
      setConsumers((prev) =>
        prev.map((c) => (c.id === targetConsumer.id ? { ...c, creditLimit: targetLimit } : c))
      );

      // Broadcast to global store so other admin screens and session sync immediately
      useStore.getState().updateConsumerProfile(targetConsumer.id, { creditLimit: targetLimit });
      useStore.setState((state) => ({
        consumers: state.consumers.map((c) =>
          c.id === targetConsumer.id ? { ...c, creditLimit: targetLimit } : c
        ),
        cardRequests: state.cardRequests.map((r) =>
          r.consumerId === targetConsumer.id || r.phone === targetConsumer.mobile
            ? { ...r, creditLimitApproved: targetLimit }
            : r
        ),
      }));

      const cSession = useStore.getState().consumerSession;
      if (cSession && (cSession.consumer.id === targetConsumer.id || cSession.consumer.mobile === targetConsumer.mobile)) {
        const updatedSession = {
          ...cSession,
          consumer: { ...cSession.consumer, creditLimit: targetLimit },
        };
        useStore.setState({ consumerSession: updatedSession });
        try {
          localStorage.setItem('akr_consumer_session', JSON.stringify(updatedSession));
        } catch (e) {}
      }

      window.dispatchEvent(new CustomEvent('akr_limit_updated', { detail: { consumerId: targetConsumer.id, creditLimit: targetLimit } }));

      setUpgradeSuccessMsg(`Credit limit successfully upgraded to ₹${targetLimit.toLocaleString('en-IN')}!`);
      setIsUpgradingLimit(false);
      setPlanFormError(null);
      setTimeout(() => setUpgradeSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to upgrade credit limit');
    } finally {
      setIsSavingLimitUpgrade(false);
    }
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
        broadcastLocalRealtimeEvent('DUES_UPDATED', { planId: id });
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

  // Overdue plans: active with outstanding balance that are past due date or already have overdue fees
  const overduePlans = plans.filter((p) => calculatePlanOverdue(p).isOverdue);

  const openOverdueModal = (plan: DuesPlan) => {
    const overdueInfo = calculatePlanOverdue(plan);
    setOverdueTargetPlan(plan);
    setManualOverdueFee(plan.overdueAmount || 250);
    setMissedWeeks(overdueInfo.missedWeeks);
    setOverdueRemarks(
      plan.overdueRemarks || `${overdueInfo.missedWeeks} weeks overdue (${overdueInfo.daysOverdue} days past due). Late fee applied.`
    );
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
      const matchTitle = (p.title || '').toLowerCase().includes(q);
      const matchRef = (p.referenceNumber || '').toLowerCase().includes(q);
      const con = consumers.find((c) => c.id === p.consumerId);
      const matchConsumer = (con?.name || '').toLowerCase().includes(q) || (con?.accountNumber || '').toLowerCase().includes(q);
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
                        <th className="py-3 px-4">Repayment Progress</th>
                        <th className="py-3 px-4">Status</th>
                      </>
                    )}
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredPlans.map((p) => {
                    const consumer = consumers.find((c) => c.id === p.consumerId);
                    const overdueInfo = calculatePlanOverdue(p);
                    const daysOverdue = overdueInfo.daysOverdue;
                    const isOverdue = overdueInfo.isOverdue;
                    const missedWeeksCount = overdueInfo.missedWeeks;
                    const mandatoryPayable = overdueInfo.mandatoryOverduePayable;

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
                                {missedWeeksCount} {missedWeeksCount === 1 ? 'Week' : 'Weeks'} Missed
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-zinc-200">
                              <div>{formatCurrency(overdueInfo.overdueEmiTotal)}</div>
                              <div className="text-[10px] text-zinc-500 font-sans">
                                ({missedWeeksCount}x {formatCurrency(p.emiAmount)})
                              </div>
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
                            <td className="py-3.5 px-4">
                              {(() => {
                                const total = p.totalEmis || 4;
                                const remaining = p.remainingEmis !== undefined ? p.remainingEmis : 0;
                                const paid = Math.max(0, total - remaining);
                                const pct = Math.round((paid / total) * 100);
                                return (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                                        {paid} / {total} Paid
                                      </span>
                                      <span className="text-[10px] text-zinc-400 font-mono font-medium">
                                        ({pct}%)
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-zinc-400 font-mono">
                                      {remaining} {remaining === 1 ? 'EMI' : 'EMIs'} left ({formatCurrency(p.outstandingAmount)})
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge status={p.status === 'active' ? 'Active' : 'Closed'} size="sm" />
                            </td>
                          </>
                        )}

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Ledger Button */}
                            <button
                              onClick={() => openPlanLedger(p)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#1E1B13] text-akr-gold hover:bg-akr-gold hover:text-black border border-akr-gold/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                              title="View Plan Repayment Ledger"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Ledger</span>
                            </button>

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
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Repayment</span>
                      <span className="text-emerald-400 font-bold block">
                        {Math.max(0, (p.totalEmis || 4) - (p.remainingEmis || 0))} / {p.totalEmis || 4} Paid
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {p.remainingEmis} left
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
                    <button
                      onClick={() => openPlanLedger(p)}
                      className="px-3 py-1.5 rounded-lg bg-[#1E1B13] border border-akr-gold/40 text-akr-gold hover:bg-akr-gold hover:text-black text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Ledger</span>
                    </button>
                    {calculatePlanOverdue(p).isOverdue && (
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
        <form onSubmit={handleSubmit(handleCreateOrUpdatePlan, handlePlanValidationError)} className="space-y-3.5 text-left">
          {/* Customer Context & Credit Limit Dashboard */}
          {(() => {
            const targetConsumer = consumers.find((c) => c.id === modalConsumerId);
            if (!targetConsumer) return null;

            const consumerCreditLimit = Number(targetConsumer.creditLimit) || 0;
            const consumerOutstanding = Number(targetConsumer.totalOutstanding) || 0;
            const adjustedOutstanding = editingPlan
              ? Math.max(0, consumerOutstanding - (Number(editingPlan.outstandingAmount) || 0))
              : consumerOutstanding;
            const availableCredit = Math.max(0, consumerCreditLimit - adjustedOutstanding);
            const principalNum = Number(principal) || 0;
            const isLimitExceeded = principalNum > availableCredit;
            const shortfall = Math.max(0, principalNum - availableCredit);
            const recommendedLimit = adjustedOutstanding + principalNum;

            return (
              <div className="space-y-3">
                {/* Account Header with Limit Metrics */}
                <div className="p-3 rounded-xl bg-gradient-to-b from-[#18181C] to-[#121215] border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase block font-medium">Customer</span>
                      <span className="font-bold text-white text-sm">{targetConsumer.name}</span>
                      <span className="text-[11px] text-zinc-500 font-mono block">{targetConsumer.accountNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNewCreditLimitInput(String(consumerCreditLimit || 50000));
                          setIsUpgradingLimit(!isUpgradingLimit);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-akr-gold/15 hover:bg-akr-gold/25 border border-akr-gold/40 text-akr-gold text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{isUpgradingLimit ? 'Close Upgrade' : 'Upgrade Limit'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 Metric Pills: Total Limit | Active Dues | Available Balance */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800 text-center">
                    <div className="p-2 rounded-lg bg-black/40 border border-zinc-800">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-medium">Credit Limit</span>
                      <span className="text-xs font-bold text-white font-mono">{formatCurrency(consumerCreditLimit)}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/40 border border-zinc-800">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-medium">Active Dues</span>
                      <span className="text-xs font-bold text-amber-400 font-mono">{formatCurrency(adjustedOutstanding)}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/40 border border-zinc-800">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-medium">Available Balance</span>
                      <span className={`text-xs font-bold font-mono ${availableCredit >= principalNum && availableCredit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(availableCredit)}
                      </span>
                    </div>
                  </div>

                  {/* Inline Upgrade Limit Drawer */}
                  {isUpgradingLimit && (
                    <div className="mt-2.5 p-3 rounded-xl bg-[#141418] border border-akr-gold/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-akr-gold flex items-center gap-1.5 uppercase tracking-wider">
                          <ArrowUpCircle className="w-4 h-4" /> Upgrade Credit Limit
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsUpgradingLimit(false)}
                          className="text-zinc-500 hover:text-white text-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-akr-gold font-bold text-xs">₹</span>
                          <input
                            type="number"
                            value={newCreditLimitInput}
                            onChange={(e) => setNewCreditLimitInput(e.target.value)}
                            placeholder="e.g. 60000"
                            className="w-full bg-[#1A1A1E] border border-zinc-700 text-white rounded-lg pl-7 pr-3 py-2 text-xs outline-none focus:border-akr-gold font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpgradeCreditLimit()}
                          disabled={isSavingLimitUpgrade || !newCreditLimitInput}
                          className="px-4 py-2 rounded-lg bg-akr-gold hover:bg-amber-400 text-black font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isSavingLimitUpgrade ? 'Saving...' : 'Apply'}</span>
                        </button>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-zinc-500">Quick Limits:</span>
                        {[50000, 75000, 100000, recommendedLimit]
                          .filter((val, idx, arr) => val > consumerCreditLimit && arr.indexOf(val) === idx)
                          .map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setNewCreditLimitInput(String(preset));
                                handleUpgradeCreditLimit(preset);
                              }}
                              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2 py-0.5 rounded border border-zinc-700 transition-colors"
                            >
                              {preset === recommendedLimit ? `Min Required (${formatCurrency(preset)})` : formatCurrency(preset)}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Limit Upgrade Success Feedback */}
                {upgradeSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{upgradeSuccessMsg}</span>
                  </div>
                )}

                {/* Credit Limit Exceeded Warning */}
                {isLimitExceeded && (
                  <div className="p-3.5 rounded-xl bg-amber-950/70 border-2 border-amber-500/70 text-amber-200 text-xs space-y-2 shadow-lg">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-sm">Credit Limit Exceeded!</p>
                        <p className="text-amber-200/95 leading-relaxed">
                          Available limit is <strong>{formatCurrency(availableCredit)}</strong>, but requested principal is <strong>{formatCurrency(principalNum)}</strong> (Short by <strong className="text-red-400">{formatCurrency(shortfall)}</strong>).
                        </p>
                        <p className="text-zinc-400 text-[11px]">
                          This EMI limit does not support this customer. Please upgrade their credit limit or adjust the principal amount to proceed.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-500/30 space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Option 1: Direct Required Upgrade Button */}
                        <button
                          type="button"
                          onClick={() => handleUpgradeCreditLimit(recommendedLimit)}
                          disabled={isSavingLimitUpgrade}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-akr-gold to-amber-400 hover:brightness-110 active:scale-95 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-gold-glow disabled:opacity-50"
                        >
                          <ArrowUpCircle className="w-4 h-4 stroke-[2.5]" />
                          <span>
                            {isSavingLimitUpgrade ? 'Upgrading...' : `Upgrade Credit Limit to ${formatCurrency(recommendedLimit)}`}
                          </span>
                        </button>

                        {/* Option 2: Custom Manual Upgrade Button Toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomUpgradeInput(!showCustomUpgradeInput);
                            if (!newCreditLimitInput) {
                              setNewCreditLimitInput(String(recommendedLimit));
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            showCustomUpgradeInput
                              ? 'bg-zinc-800 text-white border-zinc-500 shadow-inner'
                              : 'bg-black/60 text-akr-gold border-akr-gold/50 hover:bg-zinc-900 hover:border-akr-gold'
                          }`}
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span>{showCustomUpgradeInput ? 'Hide Custom Option' : 'Custom Upgrade Option...'}</span>
                        </button>
                      </div>

                      {/* Custom Upgrade Input & Quick Chips (Option 2 Content) */}
                      {showCustomUpgradeInput && (
                        <div className="p-3.5 rounded-xl bg-black/80 border border-akr-gold/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-akr-gold uppercase tracking-wider flex items-center gap-1.5">
                              <span>Enter Custom Credit Limit Manually</span>
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Min Required: {formatCurrency(recommendedLimit)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-akr-gold font-bold text-xs">₹</span>
                              <input
                                type="number"
                                min={recommendedLimit}
                                value={newCreditLimitInput}
                                onChange={(e) => setNewCreditLimitInput(e.target.value)}
                                placeholder={`e.g. ${recommendedLimit}`}
                                className="w-full bg-[#1A1A1E] border border-zinc-700 text-white rounded-lg pl-7 pr-3 py-2 text-xs outline-none focus:border-akr-gold font-mono font-bold"
                                autoFocus
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUpgradeCreditLimit()}
                              disabled={isSavingLimitUpgrade || !newCreditLimitInput || Number(newCreditLimitInput) <= 0}
                              className="px-4 py-2 rounded-lg bg-akr-gold hover:bg-amber-400 text-black font-extrabold text-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>{isSavingLimitUpgrade ? 'Saving...' : 'Apply Custom Limit'}</span>
                            </button>
                          </div>

                          {/* Quick Preset Chips */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[10px] text-zinc-400">Quick options:</span>
                            {[recommendedLimit, 60000, 75000, 100000, 150000]
                              .filter((val, idx, arr) => val >= recommendedLimit && arr.indexOf(val) === idx)
                              .map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    setNewCreditLimitInput(String(val));
                                    handleUpgradeCreditLimit(val);
                                  }}
                                  className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                                    val === recommendedLimit
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold hover:bg-amber-500/30'
                                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700'
                                  }`}
                                >
                                  {val === recommendedLimit ? `Exact (${formatCurrency(val)})` : formatCurrency(val)}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {/* Plan Type Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-zinc-400 uppercase">
                Plan Type Master *
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingPlanType(true)}
                className="text-[11px] font-bold text-akr-gold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Add Custom Type</span>
              </button>
            </div>
            <select
              {...register('planTypeId')}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setIsCreatingPlanType(true);
                } else {
                  setValue('planTypeId', e.target.value);
                }
              }}
              className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold cursor-pointer"
            >
              <option value="" disabled>Select an EMI Plan Type...</option>
              {planTypes
                .filter((pt) => pt.enabled || (editingPlan && editingPlan.planTypeId === pt.id))
                .map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name} ({pt.category}) {!pt.enabled ? '[Disabled]' : ''}
                  </option>
                ))}
              <option value="__custom__" className="text-akr-gold font-bold">
                + Type & Add Custom EMI Type...
              </option>
            </select>

            {/* Inline Custom EMI Type Creator */}
            {isCreatingPlanType && (
              <div className="mt-2.5 p-3 rounded-xl bg-[#141418] border border-akr-gold/40 space-y-2.5 shadow-xl animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-akr-gold uppercase tracking-wider flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Custom EMI Plan Type
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingPlanType(false);
                      setNewPlanTypeName('');
                    }}
                    className="text-zinc-500 hover:text-white text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={newPlanTypeName}
                    onChange={(e) => setNewPlanTypeName(e.target.value)}
                    placeholder="Enter EMI Type Name (e.g. Bridal Saree EMI, Gold Loan EMI)"
                    className="w-full bg-[#1A1A1E] border border-zinc-700 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-akr-gold"
                    autoFocus
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 uppercase mb-0.5 font-bold">
                        Category
                      </label>
                      <select
                        value={newPlanTypeCategory}
                        onChange={(e) => setNewPlanTypeCategory(e.target.value as PlanCategory)}
                        className="w-full bg-[#1A1A1E] border border-zinc-700 text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-akr-gold cursor-pointer"
                      >
                        <option value="SAREE_EMI">Saree EMI</option>
                        <option value="PRODUCT_PURCHASE">Product Purchase</option>
                        <option value="RETAIL_PURCHASE">Retail Purchase</option>
                        <option value="CUSTOM_STORE">Custom Store</option>
                        <option value="LOAN_EMI">Loan EMI</option>
                        <option value="CARD_EMI">Card EMI</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-400 uppercase mb-0.5 font-bold">
                        Action
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSaveCustomPlanType}
                          disabled={isSavingPlanType || !newPlanTypeName.trim()}
                          className="flex-1 py-1.5 rounded-lg bg-akr-gold hover:bg-amber-400 text-black font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Check className="w-3 h-3" />
                          <span>{isSavingPlanType ? 'Saving...' : 'Save & Select'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingPlanType(false);
                            setNewPlanTypeName('');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                error={errors.tenureWeeks?.message || errors.tenureMonths?.message}
                {...register('tenureWeeks')}
              />
            </div>
          </div>

          {planFormError && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{planFormError}</span>
            </div>
          )}

          {(() => {
            const targetConsumer = consumers.find((c) => c.id === modalConsumerId);
            const consumerCreditLimit = Number(targetConsumer?.creditLimit) || 0;
            const consumerOutstanding = Number(targetConsumer?.totalOutstanding) || 0;
            const adjustedOutstanding = editingPlan
              ? Math.max(0, consumerOutstanding - (Number(editingPlan.outstandingAmount) || 0))
              : consumerOutstanding;
            const availableCredit = Math.max(0, consumerCreditLimit - adjustedOutstanding);
            const principalNum = Number(principal) || 0;
            const isLimitExceeded = Boolean(targetConsumer && principalNum > availableCredit);

            return (
              <div className="pt-3">
                <GoldButton
                  type="submit"
                  disabled={isLimitExceeded || isSubmitting}
                  isLoading={isSubmitting}
                >
                  {isLimitExceeded
                    ? `Cannot Assign — Exceeds Credit Limit (${formatCurrency(availableCredit)} Available)`
                    : editingPlan
                    ? 'Save Changes'
                    : 'Create & Assign Plan'}
                </GoldButton>
              </div>
            );
          })()}
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase">
                  Missed Weekly EMI Tenure *
                </label>
                {(() => {
                  const calculated = overdueTargetPlan.nextEmiDate ? calculatePlanOverdue(overdueTargetPlan).missedWeeks : 1;
                  return (
                    <span className="text-[10px] text-amber-400 font-medium">
                      Calculated: {calculated} {calculated === 1 ? 'Week' : 'Weeks'} Missed
                    </span>
                  );
                })()}
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[1, 2, 3, 4].map((w) => {
                  const maxEmis = overdueTargetPlan.remainingEmis || overdueTargetPlan.totalEmis || 12;
                  if (w > maxEmis) return null;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setMissedWeeks(w)}
                      className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        missedWeeks === w
                          ? 'bg-akr-gold/20 border-akr-gold text-akr-gold font-bold shadow-sm'
                          : 'bg-[#18181B] border-zinc-700 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs font-bold">{w} {w === 1 ? 'Week' : 'Weeks'}</span>
                      <span className="text-[10px] font-mono text-zinc-400 block">
                        {formatCurrency(overdueTargetPlan.emiAmount * w)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Direct Input for Custom Weeks */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-xs">Custom Missed Weeks:</span>
                <input
                  type="number"
                  min={1}
                  max={overdueTargetPlan.remainingEmis || overdueTargetPlan.totalEmis || 52}
                  value={missedWeeks}
                  onChange={(e) => setMissedWeeks(Math.max(1, Math.min(overdueTargetPlan.remainingEmis || 52, Number(e.target.value) || 1)))}
                  className="w-24 px-3 py-1.5 rounded-lg bg-[#18181B] border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-akr-gold"
                />
                <span className="text-[10px] text-zinc-500">
                  (Max: {overdueTargetPlan.remainingEmis || overdueTargetPlan.totalEmis} remaining EMIs)
                </span>
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

      {/* 4. Plan Repayment Ledger Modal */}
      {selectedLedgerPlan && (
        <Modal
          isOpen={isLedgerModalOpen}
          onClose={() => {
            setIsLedgerModalOpen(false);
            setSelectedLedgerPlan(null);
          }}
          title={`Plan Repayment Ledger — ${selectedLedgerPlan.title} (${selectedLedgerPlan.referenceNumber})`}
          maxWidth="2xl"
        >
          {(() => {
            const plan = selectedLedgerPlan;
            const consumer = consumers.find((c) => c.id === plan.consumerId);
            const totalEmis = plan.totalEmis || 4;
            const remainingEmis = plan.remainingEmis !== undefined ? plan.remainingEmis : 0;
            const paidEmis = Math.max(0, totalEmis - remainingEmis);
            const totalPlanAmount = plan.totalPaymentDue || plan.principal;
            const totalPaidAmount = Math.max(0, totalPlanAmount - plan.outstandingAmount);
            const progressPct = Math.round((paidEmis / totalEmis) * 100);

            const baseDateStr = plan.firstEmiDate || plan.startDate || (plan.createdAt ? plan.createdAt.split('T')[0] : '2026-11-02');
            const base = new Date(baseDateStr);
            const validBase = isNaN(base.getTime()) ? new Date('2026-11-02') : base;

            const matchingPayments = ledgerPayments
              .filter((pay) => pay.planId === plan.id || pay.consumerId === plan.consumerId)
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            const installments = Array.from({ length: totalEmis }, (_, i) => {
              const instNum = i + 1;
              const isPaid = instNum <= paidEmis;
              const instDate = new Date(validBase);
              instDate.setDate(validBase.getDate() + (7 * i));
              const dateStr = instDate.toISOString().split('T')[0];
              const matchedPayment = isPaid ? matchingPayments[i] : null;

              return {
                installmentNumber: instNum,
                dueDate: dateStr,
                amount: plan.emiAmount,
                isPaid,
                isNextDue: instNum === paidEmis + 1,
                payment: matchedPayment,
              };
            });

            return (
              <div className="space-y-4 text-left">
                {/* Consumer & Plan Metadata Card */}
                <div className="p-4 rounded-xl bg-[#141418] border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
                      Account Holder / Customer
                    </span>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <span>{consumer?.name || 'Customer'}</span>
                      <span className="text-xs font-mono text-akr-gold font-normal">
                        ({consumer?.accountNumber || 'N/A'})
                      </span>
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Mobile: {consumer?.mobile || 'N/A'} • Reference: {plan.referenceNumber}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      0% Interest-Free Weekly EMI
                    </span>
                    <StatusBadge status={plan.status === 'active' ? 'Active' : 'Closed'} size="sm" />
                  </div>
                </div>

                {/* Ledger Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#18181D] border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono block">Total Financed</span>
                    <span className="text-base font-extrabold text-white">{formatCurrency(totalPlanAmount)}</span>
                    <span className="text-[10px] text-zinc-500 block">Principal + Fee</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#18181D] border border-emerald-900/40">
                    <span className="text-[10px] text-emerald-400 uppercase font-mono block">Total Received</span>
                    <span className="text-base font-extrabold text-emerald-400">{formatCurrency(totalPaidAmount)}</span>
                    <span className="text-[10px] text-emerald-400 font-bold block">{paidEmis} of {totalEmis} EMIs Paid</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#18181D] border border-zinc-800">
                    <span className="text-[10px] text-akr-gold uppercase font-mono block">Current Balance</span>
                    <span className="text-base font-extrabold text-akr-gold">{formatCurrency(plan.outstandingAmount)}</span>
                    <span className="text-[10px] text-zinc-400 block">{remainingEmis} {remainingEmis === 1 ? 'EMI' : 'EMIs'} remaining</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#18181D] border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono block">Next Scheduled Due</span>
                    <span className="text-sm font-bold text-white block mt-0.5">
                      {plan.nextEmiDate ? formatDisplayDate(plan.nextEmiDate) : 'Cleared'}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono block">{formatCurrency(plan.emiAmount)} / week</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="p-3 rounded-xl bg-[#121215] border border-zinc-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400">
                      Repayment Completion: {paidEmis} / {totalEmis} Paid ({progressPct}%)
                    </span>
                    <span className="text-zinc-400 font-mono text-[11px]">
                      {plan.outstandingAmount > 0 ? `${formatCurrency(plan.outstandingAmount)} Remaining` : 'Fully Settled'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-akr-gold to-amber-400 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Week-by-Week Installment Schedule Table */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-akr-gold" />
                      <span>Weekly Installment Schedule & Ledger</span>
                    </h5>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {matchingPayments.length} verified payment record{matchingPayments.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="border border-zinc-800 rounded-xl overflow-hidden bg-black/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#18181D] text-zinc-400 font-mono border-b border-zinc-800 uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Scheduled Due Date</th>
                          <th className="py-2.5 px-3">EMI Amount</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Payment Date</th>
                          <th className="py-2.5 px-3">Transaction Ref / UTR</th>
                          <th className="py-2.5 px-3 text-right">Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-sans">
                        {installments.map((inst) => (
                          <tr
                            key={inst.installmentNumber}
                            className={`transition-colors ${
                              inst.isPaid ? 'bg-emerald-950/10 hover:bg-emerald-950/20' : 'hover:bg-zinc-900/40'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-bold text-zinc-300">
                              Wk {inst.installmentNumber}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-white">
                              {formatDisplayDate(inst.dueDate)}
                            </td>
                            <td className="py-2.5 px-3 font-bold font-mono text-akr-gold">
                              {formatCurrency(inst.amount)}
                            </td>
                            <td className="py-2.5 px-3">
                              {inst.isPaid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                  ✓ PAID
                                </span>
                              ) : inst.isNextDue ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                                  ● NEXT DUE
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                                  UPCOMING
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-300 font-mono text-[11px]">
                              {inst.payment ? formatDisplayDate(inst.payment.createdAt, true) : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-300">
                              {inst.payment ? (
                                <span>{inst.payment.reference || inst.payment.transactionRef}</span>
                              ) : (
                                <span className="text-zinc-500 italic">Pending payment</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[10px] text-zinc-300">
                              {inst.payment ? (
                                <span className="uppercase px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                                  {inst.payment.mode || 'UPI'}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <span className="text-[10px] text-zinc-500 italic">
                    Audited ledger dynamically synchronized with backend MongoDB & Razorpay records.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLedgerModalOpen(false);
                      setSelectedLedgerPlan(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs cursor-pointer"
                  >
                    Close Ledger
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};
