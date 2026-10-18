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
    setValue('tenureMonths', calc.tenureMonths);
    setValue('totalEmis', calc.totalEmis);
    setValue('remainingEmis', calc.remainingEmis);
  };

  const handleQuickDueDate = (type: '30d' | '5th' | '10th') => {
    const now = new Date();
    const target = new Date();
    if (type === '30d') {
      target.setDate(now.getDate() + 30);
    } else if (type === '5th') {
      target.setMonth(now.getMonth() + 1);
      target.setDate(5);
    } else if (type === '10th') {
      target.setMonth(now.getMonth() + 1);
      target.setDate(10);
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
    setValue('tenureMonths', plan.tenureMonths);
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

  // Filter plans
  const filteredPlans = plans.filter((p) => {
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
    <div className="p-4 sm:p-6 md:p-8 space-y-6 text-left selection:bg-akr-gold selection:text-black">
      {/* Top Header & Bulk Upload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Consumer Dues & EMI Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Maintain individualized EMI schedules, assign multiple dues plans, and execute bulk CSV updates.
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
            placeholder="Search by plan title, reference (e.g. LN-2024-8842), or consumer..."
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
      ) : (
        <div className="rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1B1B1F] text-zinc-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Plan Title & Reference</th>
                  <th className="py-3 px-4">Consumer</th>
                  <th className="py-3 px-4">Outstanding</th>
                  <th className="py-3 px-4">Breakdown (P + I + Fee)</th>
                  <th className="py-3 px-4">EMI Amount</th>
                  <th className="py-3 px-4">Next Due Date</th>
                  <th className="py-3 px-4">EMIs Left</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredPlans.map((p) => {
                  const consumer = consumers.find((c) => c.id === p.consumerId);
                  return (
                    <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{p.title}</div>
                        <div className="text-[10px] font-mono text-zinc-400">{p.referenceNumber}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-200">{consumer?.name || '-'}</div>
                        <div className="text-[10px] font-mono text-zinc-500">{consumer?.accountNumber}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-akr-gold text-sm">
                        {formatCurrency(p.outstandingAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300 font-mono text-[11px]">
                        ₹{p.principal.toLocaleString('en-IN')} + ₹{p.interest.toLocaleString('en-IN')} + ₹{p.processingFee.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {p.emiAmount > 0 ? formatCurrency(p.emiAmount) : 'None'}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {p.nextEmiDate ? formatDisplayDate(p.nextEmiDate) : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {p.remainingEmis} / {p.totalEmis}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.status === 'active' ? 'Active' : 'Closed'} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
            label="Plan Title"
            placeholder="e.g. Personal Loan EMI"
            error={errors.title?.message}
            {...register('title')}
          />

          <InputField
            label="Reference Number"
            placeholder="e.g. LN-2026-8812"
            error={errors.referenceNumber?.message}
            {...register('referenceNumber')}
          />

          {/* Base Loan Principal & Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField
              label="Principal Amount (₹) *"
              type="number"
              placeholder="10000"
              error={errors.principal?.message}
              {...register('principal')}
            />
            <InputField
              label="Processing Fee (₹) *"
              type="number"
              placeholder="500"
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
            defaultInterestRate={12}
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
                label="Monthly EMI (₹) *"
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
                  First EMI Due Date *
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-500 mr-1">Quick Set:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickDueDate('30d')}
                    className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded transition-colors"
                  >
                    +30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDueDate('5th')}
                    className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded transition-colors"
                  >
                    5th Next Mo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDueDate('10th')}
                    className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded transition-colors"
                  >
                    10th Next Mo
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
                label="Total EMIs *"
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
                label="Tenure (Mo) *"
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
    </div>
  );
};
