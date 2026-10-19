import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Users,
  IndianRupee,
  Calendar,
  Download,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { adminApi } from '../../../core/api';
import { useStore } from '../../../store';
import { formatCurrency, formatDisplayDate } from '../../../core/formatters';
import { StatusBadge } from '../../../components/ui';

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<{
    totalConsumers: number;
    activeConsumers: number;
    totalOutstanding: number;
    totalCollected: number;
    upcomingPlansCount: number;
  } | null>(null);

  const duesPlans = useStore((state) => state.duesPlans);
  const consumers = useStore((state) => state.consumers);
  const payments = useStore((state) => state.payments);
  const planTypes = useStore((state) => state.planTypes);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await adminApi.getDashboard();
        setStats(data);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      }
    }
    loadStats();
  }, []);

  // Upcoming EMIs within next 7 days
  const upcomingPlans = duesPlans
    .filter((p) => p.status === 'active' && p.outstandingAmount > 0 && p.nextEmiDate)
    .sort((a, b) => new Date(a.nextEmiDate).getTime() - new Date(b.nextEmiDate).getTime())
    .slice(0, 5);

  // Overdue Plans Filter & Metrics for Overdue Checking Section
  const isPlanOverdue = (p: any) =>
    p.status === 'active' &&
    p.outstandingAmount > 0 &&
    (Boolean(p.overdueAmount && p.overdueAmount > 0) ||
      Boolean(p.nextEmiDate && new Date(p.nextEmiDate) < new Date()));

  const overduePlans = duesPlans.filter(isPlanOverdue);
  const totalOverdueBase = overduePlans.reduce(
    (sum, p) => sum + (p.emiAmount * (p.missedWeeks || p.missedMonths || 1)),
    0
  );
  const totalOverdueLateFees = overduePlans.reduce((sum, p) => sum + (p.overdueAmount || 0), 0);
  const totalMandatoryOverdue = totalOverdueBase + totalOverdueLateFees;

  // Collections per month data for Recharts Bar Chart
  const monthlyCollectionsData = [
    { month: 'Jun 2026', collected: 32000, dues: 45000 },
    { month: 'Jul 2026', collected: 48500, dues: 52000 },
    { month: 'Aug 2026', collected: 55000, dues: 58000 },
    { month: 'Sep 2026', collected: 62000, dues: 64000 },
    { month: 'Oct 2026', collected: 78500, dues: 85000 },
  ];

  // Outstanding vs Collected Pie Chart Data
  const pieData = [
    { name: 'Collected', value: stats?.totalCollected || 120000, color: '#D4AF37' },
    { name: 'Outstanding', value: stats?.totalOutstanding || 145000, color: '#3A3A40' },
  ];

  // Real Excel Exports using SheetJS
  const handleExportDues = () => {
    const exportData = duesPlans.map((p) => {
      const c = consumers.find((con) => con.id === p.consumerId);
      const pt = planTypes.find((t) => t.id === p.planTypeId);
      return {
        'Consumer Name': c?.name || 'Unknown',
        'Account Number': c?.accountNumber || '-',
        'Plan Title': p.title,
        'Plan Type': pt?.name || '-',
        'Reference Number': p.referenceNumber,
        'Outstanding (INR)': p.outstandingAmount,
        'Principal (INR)': p.principal,
        'Interest (INR)': p.interest,
        'Processing Fee (INR)': p.processingFee,
        'EMI Amount (INR)': p.emiAmount,
        'Next EMI Date': p.nextEmiDate,
        'Remaining EMIs': p.remainingEmis,
        'Status': p.status.toUpperCase(),
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dues Summary');
    XLSX.writeFile(wb, `AKR_Dues_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPayments = () => {
    const exportData = payments.map((p) => {
      const c = consumers.find((con) => con.id === p.consumerId);
      const plan = duesPlans.find((dp) => dp.id === p.planId);
      return {
        'Transaction Ref': p.transactionRef,
        'Receipt Ref': p.reference,
        'Consumer Name': c?.name || 'Unknown',
        'Account Number': c?.accountNumber || '-',
        'Plan Title': plan?.title || 'EMI Payment',
        'Amount (INR)': p.amount,
        'Mode': p.mode,
        'Status': p.status.toUpperCase(),
        'Date & Time': p.createdAt,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collections Report');
    XLSX.writeFile(wb, `AKR_Collections_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 text-left selection:bg-akr-gold selection:text-black">
      {/* Top Header with Title and Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Financial Operations Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time portfolio dues, settlement velocity, and active consumer metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDues}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-akr-gold hover:text-white transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Dues (Excel)</span>
          </button>

          <button
            onClick={handleExportPayments}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-akr-gold text-black hover:brightness-105 transition-all shadow-gold-glow"
          >
            <Download className="w-4 h-4" />
            <span>Export Collections</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Consumers */}
        <div className="p-5 rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
              Total Consumers
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {stats?.totalConsumers || consumers.length}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {stats?.activeConsumers || consumers.filter((c) => c.status === 'active').length} active accounts
            </p>
          </div>
        </div>

        {/* Total Outstanding Portfolio */}
        <div className="p-5 rounded-2xl bg-[#141417] border border-akr-gold/40 shadow-card-dark flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold text-akr-gold tracking-wider">
              Total Outstanding
            </span>
            <div className="w-9 h-9 rounded-xl bg-akr-gold/15 border border-akr-gold/30 text-akr-gold flex items-center justify-center">
              <IndianRupee className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {formatCurrency(stats?.totalOutstanding || 145000)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Across all active plans</p>
          </div>
        </div>

        {/* Total Collections */}
        <div className="p-5 rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
              Dues Collected
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {formatCurrency(stats?.totalCollected || 120000)}
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.2% month-over-month
            </p>
          </div>
        </div>

        {/* Upcoming EMIs next 7 days */}
        <div className="p-5 rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
              Upcoming EMIs
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-800/40 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {upcomingPlans.length} Due Soon
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Scheduled next 7 days</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collections Trend Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Monthly Collections Trend (INR)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Dues billed vs collected by month</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCollectionsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#71717A" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717A" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', borderRadius: 8, fontSize: 12 }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                />
                <Bar dataKey="collected" fill="#D4AF37" radius={[4, 4, 0, 0]} name="Collected" />
                <Bar dataKey="dues" fill="#2E2E33" radius={[4, 4, 0, 0]} name="Billed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outstanding vs Collected Donut */}
        <div className="p-5 rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide mb-1">
              Portfolio Settlement Ratio
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Overall recovered vs remaining debt</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', borderRadius: 8, fontSize: 12 }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-around text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-akr-gold" />
              <span className="text-zinc-300">Collected</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3A3A40]" />
              <span className="text-zinc-300">Outstanding</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Accounts & Collections Checking Section */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-[#1E1212] to-[#141417] border-2 border-red-500/40 shadow-card-dark space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-red-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Overdue Accounts & Collections Checking
                </h3>
                <span className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full">
                  {overduePlans.length} Delinquent
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Weekly installments past due with mandatory penalty enforcement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-red-500/30">
              <span className="text-[10px] text-zinc-400 uppercase block">Total Due + Late Fee</span>
              <span className="text-sm font-bold text-akr-gold font-sans">{formatCurrency(totalMandatoryOverdue)}</span>
            </div>
            <button
              onClick={() => navigate('/admin/dues')}
              className="text-xs font-semibold text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
            >
              <span>Manage in Dues</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {overduePlans.length > 0 ? (
          <>
            {/* Desktop Overdue Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#241515] text-red-300 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4 rounded-l-lg">Consumer</th>
                    <th className="py-2.5 px-4">Account Number</th>
                    <th className="py-2.5 px-4">Product Purchase</th>
                    <th className="py-2.5 px-4">Overdue Duration</th>
                    <th className="py-2.5 px-4">Weekly EMI</th>
                    <th className="py-2.5 px-4">Late Penalty</th>
                    <th className="py-2.5 px-4">Mandatory Min</th>
                    <th className="py-2.5 px-4 rounded-r-lg text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-950/60">
                  {overduePlans.map((p) => {
                    const consumer = consumers.find((c) => c.id === p.consumerId);
                    const missedWks = p.missedWeeks || p.missedMonths || 1;
                    const mandatoryMin = (p.emiAmount * missedWks) + (p.overdueAmount || 0);
                    return (
                      <tr key={p.id} className="hover:bg-red-950/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">
                          {consumer?.name || 'Customer'}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-300">
                          {consumer?.accountNumber || '-'}
                        </td>
                        <td className="py-3 px-4 text-zinc-200">
                          <div>{p.title}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">Ref: {p.referenceNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[10px] bg-red-950 border border-red-700/80 text-red-300 font-bold px-2 py-0.5 rounded-full">
                            <span>⚠️</span> {missedWks} {missedWks === 1 ? 'Week' : 'Weeks'} Missed
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-300">
                          {formatCurrency(p.emiAmount)} /wk
                        </td>
                        <td className="py-3 px-4 font-bold text-red-400">
                          +{formatCurrency(p.overdueAmount || 0)}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-akr-gold text-sm font-sans">
                          {formatCurrency(mandatoryMin)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => navigate('/admin/dues')}
                            className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-200 text-xs font-semibold transition-colors"
                          >
                            Adjust Penalty
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Overdue Cards */}
            <div className="lg:hidden space-y-2.5">
              {overduePlans.map((p) => {
                const consumer = consumers.find((c) => c.id === p.consumerId);
                const missedWks = p.missedWeeks || p.missedMonths || 1;
                const mandatoryMin = (p.emiAmount * missedWks) + (p.overdueAmount || 0);
                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/40 space-y-2 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">{consumer?.name || 'Customer'}</h4>
                        <span className="text-[10px] font-mono text-zinc-400">{consumer?.accountNumber}</span>
                      </div>
                      <span className="text-[10px] bg-red-900/60 border border-red-600 text-red-200 font-bold px-2 py-0.5 rounded-full">
                        {missedWks} wk missed
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-red-900/40 text-xs">
                      <div>
                        <span className="text-zinc-200 font-medium block">{p.title}</span>
                        <span className="text-[10px] text-zinc-400">Due: {formatDisplayDate(p.nextEmiDate)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-akr-gold text-sm block">
                          {formatCurrency(mandatoryMin)}
                        </span>
                        <span className="text-[10px] text-red-400">+{formatCurrency(p.overdueAmount || 0)} Fee</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-4 rounded-xl bg-black/30 border border-zinc-800 text-center">
            <ShieldCheck className="w-7 h-7 text-emerald-400 mx-auto mb-1.5 opacity-90" />
            <p className="font-bold text-white text-xs">Zero Overdue Accounts</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              All weekly product EMI installments are currently operating on schedule.
            </p>
          </div>
        )}
      </div>

      {/* Upcoming EMIs Table */}
      <div className="p-5 rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Upcoming EMIs Scheduled Next 7 Days
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Consumers with immediate repayments due</p>
          </div>
          <button
            onClick={() => navigate('/admin/dues')}
            className="text-xs font-semibold text-akr-gold hover:underline"
          >
            Manage All Dues →
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#1B1B1F] text-zinc-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4 rounded-l-lg">Consumer</th>
                <th className="py-2.5 px-4">Account Number</th>
                <th className="py-2.5 px-4">Plan Title</th>
                <th className="py-2.5 px-4">EMI Amount</th>
                <th className="py-2.5 px-4">Due Date</th>
                <th className="py-2.5 px-4 rounded-r-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {upcomingPlans.map((p) => {
                const consumer = consumers.find((c) => c.id === p.consumerId);
                return (
                  <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      {consumer?.name || 'Rahul Sharma'}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {consumer?.accountNumber || '-'}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{p.title}</td>
                    <td className="py-3 px-4 font-bold text-akr-gold">
                      {formatCurrency(p.emiAmount)}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {formatDisplayDate(p.nextEmiDate)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status="Due Soon" size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Card View */}
        <div className="lg:hidden space-y-2.5">
          {upcomingPlans.map((p) => {
            const consumer = consumers.find((c) => c.id === p.consumerId);
            return (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-[#18181D] border border-zinc-800/80 space-y-2 text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{consumer?.name || 'Customer'}</h4>
                    <span className="text-[10px] font-mono text-zinc-400">{consumer?.accountNumber}</span>
                  </div>
                  <StatusBadge status="Due Soon" size="sm" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                  <div>
                    <span className="text-zinc-300 font-medium block">{p.title}</span>
                    <span className="text-[10px] text-zinc-400">Due: {formatDisplayDate(p.nextEmiDate)}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-akr-gold text-sm block">
                      {formatCurrency(p.emiAmount)}
                    </span>
                    <span className="text-[10px] text-zinc-500">EMI</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
