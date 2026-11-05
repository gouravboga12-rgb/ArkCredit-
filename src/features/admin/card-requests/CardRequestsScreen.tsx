import React, { useEffect, useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  FileCheck,
  User,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Download,
  IndianRupee,
  Check,
  X,
  ChevronDown,
  RefreshCw,
  Ban,
  ShieldAlert,
  Sliders,
  Edit3,
  AlertTriangle,
  Info,
  Lock,
} from 'lucide-react';
import { adminApi } from '../../../core/api';
import { CardRequest, CardRequestStatus, Consumer, DuesPlan } from '../../../core/types';
import { formatCurrency, formatDateTimeIST, formatDateOnlyIST } from '../../../core/formatters';
import { useStore } from '../../../store';
import { Modal, StatusBadge, GoldButton, Skeleton } from '../../../components/ui';

export const CardRequestsScreen: React.FC = () => {
  const [requests, setRequests] = useState<CardRequest[]>([]);
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [duesPlans, setDuesPlans] = useState<DuesPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cardTierFilter, setCardTierFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [customDate, setCustomDate] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Modals
  const [viewingRequest, setViewingRequest] = useState<CardRequest | null>(null);
  const [approvingRequest, setApprovingRequest] = useState<CardRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<CardRequest | null>(null);
  const [suspendingRequest, setSuspendingRequest] = useState<CardRequest | null>(null);
  const [reactivatingRequest, setReactivatingRequest] = useState<CardRequest | null>(null);
  const [editingLimitRequest, setEditingLimitRequest] = useState<CardRequest | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<{ name: string; url: string } | null>(null);

  // Approval / Suspend / Reactivate / Edit Limit Forms
  const [creditLimit, setCreditLimit] = useState<number>(50000);
  const [adminRemarks, setAdminRemarks] = useState<string>('');
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [reactivateLimit, setReactivateLimit] = useState<number>(50000);
  const [reactivateRemarks, setReactivateRemarks] = useState<string>('');
  const [editLimitValue, setEditLimitValue] = useState<number>(50000);
  const [editLimitRemarks, setEditLimitRemarks] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const adminSession = useStore((state) => state.adminSession);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadRequests = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const [reqData, consumersData, plansData] = await Promise.all([
        adminApi.getCardRequests().catch(() => []),
        adminApi.getConsumers().catch(() => []),
        adminApi.getDuesPlans().catch(() => []),
      ]);
      setRequests(Array.isArray(reqData) ? reqData : []);
      setConsumers(Array.isArray(consumersData) ? consumersData : []);
      setDuesPlans(Array.isArray(plansData) ? plansData : []);
    } catch (err) {
      console.error('Failed to load card requests', err);
      setRequests([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests(false);

    const onFocus = () => {
      loadRequests(false);
    };
    const onRealtimeSync = () => {
      loadRequests(false);
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('akr_consumer_realtime_update', onRealtimeSync);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('akr_consumer_realtime_update', onRealtimeSync);
    };
  }, []);

  // Today in IST (YYYY-MM-DD)
  const todayIST = useMemo(() => formatDateOnlyIST(new Date().toISOString()), []);

  // Filter logic
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // 1. Status Filter
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }

      // 2. Card Tier Filter
      if (cardTierFilter !== 'all') {
        const tierName = cardTierFilter.toLowerCase();
        if (!(r.cardTypeName || '').toLowerCase().includes(tierName)) {
          return false;
        }
      }

      // 3. Date Filter (Evaluated against IST timezone)
      const reqDateIST = formatDateOnlyIST(r.createdAt);
      if (datePreset === 'today') {
        if (reqDateIST !== todayIST) return false;
      } else if (datePreset === 'yesterday') {
        const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
        const yesterdayIST = formatDateOnlyIST(yesterday.toISOString());
        if (reqDateIST !== yesterdayIST) return false;
      } else if (datePreset === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        if (new Date(r.createdAt) < weekAgo) return false;
      } else if (datePreset === 'month') {
        const currentMonthIST = todayIST.slice(0, 7); // YYYY-MM
        if (reqDateIST.slice(0, 7) !== currentMonthIST) return false;
      } else if (datePreset === 'custom') {
        if (customDate && reqDateIST !== customDate) return false;
        if (fromDate && reqDateIST < fromDate) return false;
        if (toDate && reqDateIST > toDate) return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (r.fullName || '').toLowerCase().includes(q) ||
          (r.phone || '').includes(q) ||
          (r.panNumber || '').toLowerCase().includes(q) ||
          (r.referenceNumber || '').toLowerCase().includes(q) ||
          (r.cardTypeName || '').toLowerCase().includes(q) ||
          (r.email && r.email.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [requests, statusFilter, datePreset, customDate, fromDate, toDate, searchQuery, todayIST]);

  // Status counts for top summary cards
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === 'pending').length;
    const approved = requests.filter((r) => r.status === 'approved').length;
    const suspended = requests.filter((r) => r.status === 'suspended').length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;
    const todayCount = requests.filter((r) => formatDateOnlyIST(r.createdAt) === todayIST).length;
    return { total, pending, approved, suspended, rejected, todayCount };
  }, [requests, todayIST]);

  const handleApprove = async () => {
    if (!approvingRequest) return;
    try {
      setIsProcessing(true);
      await adminApi.updateCardRequestStatus(approvingRequest.id, {
        status: 'approved',
        remarks: adminRemarks.trim() || 'KYC verified and approved. Card issuance initiated.',
        creditLimit: creditLimit || 100000,
      });

      showToast(`Card application ${approvingRequest.referenceNumber} Approved with ₹${creditLimit.toLocaleString('en-IN')} limit!`);
      setApprovingRequest(null);
      setAdminRemarks('');
      await loadRequests();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendingRequest) return;
    try {
      setIsProcessing(true);
      await adminApi.updateCardRequestStatus(suspendingRequest.id, {
        status: 'suspended',
        remarks: suspendReason.trim() || 'Privilege Card suspended by store administration. New EMI plans blocked.',
      });

      showToast(`Privilege Card for ${suspendingRequest.fullName} has been SUSPENDED.`);
      setSuspendingRequest(null);
      setSuspendReason('');
      await loadRequests();
    } catch (err: any) {
      alert(err.message || 'Error suspending card');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async () => {
    if (!reactivatingRequest) return;
    try {
      setIsProcessing(true);
      const targetLimit = reactivateLimit || reactivatingRequest.creditLimitApproved || 50000;
      await adminApi.updateCardRequestStatus(reactivatingRequest.id, {
        status: 'approved',
        remarks: reactivateRemarks.trim() || 'Privilege Card reactivated. Credit line restored.',
        creditLimit: targetLimit,
      });

      showToast(`Privilege Card for ${reactivatingRequest.fullName} REACTIVATED with ₹${targetLimit.toLocaleString('en-IN')} limit!`);
      setReactivatingRequest(null);
      setReactivateRemarks('');
      await loadRequests();
    } catch (err: any) {
      alert(err.message || 'Error reactivating card');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCardLimit = async () => {
    if (!editingLimitRequest) return;

    // Detect customer active debt before saving
    const targetConsumer = consumers.find(
      (c) =>
        (editingLimitRequest.consumerId && c.id === editingLimitRequest.consumerId) ||
        c.mobile === editingLimitRequest.phone ||
        (editingLimitRequest.email && c.email?.toLowerCase() === editingLimitRequest.email.toLowerCase())
    );
    const consumerId = targetConsumer?.id || editingLimitRequest.consumerId;
    const consumerActivePlans = duesPlans.filter(
      (p) => p.consumerId === consumerId && p.status === 'active'
    );
    const totalOutstanding = consumerActivePlans.length > 0
      ? consumerActivePlans.reduce((sum, p) => sum + (p.outstandingAmount || 0), 0)
      : (targetConsumer?.totalOutstanding ?? editingLimitRequest.consumerOutstanding ?? 0);

    if (totalOutstanding > 0 && editLimitValue < totalOutstanding) {
      alert(
        `Cannot reduce card limit to ₹${editLimitValue.toLocaleString('en-IN')}! The customer currently has ₹${totalOutstanding.toLocaleString('en-IN')} in active utilized EMI debt (${consumerActivePlans.length || 1} plan(s)) that still must be paid. Minimum allowable limit is ₹${totalOutstanding.toLocaleString('en-IN')}.`
      );
      return;
    }

    try {
      setIsProcessing(true);
      await adminApi.updateCardRequestCreditLimit(editingLimitRequest.id, {
        creditLimit: editLimitValue,
        remarks: editLimitRemarks.trim() || `Card limit updated to ₹${editLimitValue.toLocaleString('en-IN')}`,
      });

      setRequests((prev) =>
        prev.map((item) =>
          item.id === editingLimitRequest.id
            ? { ...item, creditLimitApproved: editLimitValue }
            : item
        )
      );

      window.dispatchEvent(
        new CustomEvent('akr_limit_updated', {
          detail: { requestId: editingLimitRequest.id, creditLimit: editLimitValue },
        })
      );
      window.dispatchEvent(
        new CustomEvent('akr_consumer_realtime_update', {
          detail: { creditLimit: editLimitValue },
        })
      );

      showToast(`Credit limit updated to ₹${editLimitValue.toLocaleString('en-IN')} for ${editingLimitRequest.fullName}!`);
      setEditingLimitRequest(null);
      setEditLimitRemarks('');
      await loadRequests();
    } catch (err: any) {
      alert(err.message || 'Error updating card limit');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadDocument = (fileName: string, fileUrl?: string) => {
    if (!fileUrl) {
      alert('Document data is not available for download.');
      return;
    }

    try {
      if (fileUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName || 'document.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      fetch(fileUrl)
        .then((response) => response.blob())
        .then((blob) => {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName || 'document.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        })
        .catch(() => {
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = fileName || 'document.png';
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    } catch (e) {
      console.error('Download error:', e);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'document.png';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    try {
      setIsProcessing(true);
      await adminApi.updateCardRequestStatus(rejectingRequest.id, {
        status: 'rejected',
        remarks: adminRemarks.trim() || 'Application rejected due to incomplete KYC criteria.',
      });

      showToast(`Card application ${rejectingRequest.referenceNumber} Marked as Rejected.`);
      setRejectingRequest(null);
      setAdminRemarks('');
      await loadRequests();
    } catch (err: any) {
      alert(err.message || 'Error rejecting request');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-600/80 text-emerald-200 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide flex items-center gap-2">
            <span>Privilege Card Requests</span>
            <span className="text-xs bg-akr-gold/20 text-akr-gold px-2.5 py-0.5 rounded-full border border-akr-gold/30 font-sans font-bold">
              {stats.pending} Pending
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Review applicant KYC, verify PAN & Aadhaar details, inspect uploaded documents, and initiate card issuance.
          </p>
        </div>

        {/* Actions & Live IST Clock Badge */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              loadRequests(true);
            }}
            className="p-2.5 rounded-xl bg-[#141418] hover:bg-zinc-800 border border-zinc-800 hover:border-akr-gold/40 text-zinc-300 hover:text-akr-gold text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Refresh Card Requests"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-akr-gold' : ''}`} />
            <span>Refresh</span>
          </button>

          <div className="p-2.5 rounded-xl bg-[#141418] border border-zinc-800 text-right">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Indian Standard Time (IST)</span>
            <span className="text-xs font-mono font-bold text-akr-gold flex items-center gap-1.5 justify-end">
              <Clock className="w-3.5 h-3.5 text-akr-gold" />
              <span>{formatDateTimeIST(new Date().toISOString())}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-[#141418] border border-zinc-800 text-left">
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Requests</span>
          <span className="text-xl font-bold text-white mt-1 block">{stats.total}</span>
          <span className="text-[10px] text-zinc-500">All-time applications</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#181816] border border-amber-500/30 text-left">
          <span className="text-[10px] uppercase font-bold text-amber-400 block flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Pending Review</span>
          </span>
          <span className="text-xl font-bold text-amber-300 mt-1 block">{stats.pending}</span>
          <span className="text-[10px] text-amber-500/80">Awaiting decision</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#121814] border border-emerald-500/30 text-left">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>Approved & Issued</span>
          </span>
          <span className="text-xl font-bold text-emerald-300 mt-1 block">{stats.approved}</span>
          <span className="text-[10px] text-emerald-500/80">Active credit lines</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1F1810] border border-amber-600/40 text-left">
          <span className="text-[10px] uppercase font-bold text-amber-400 block flex items-center gap-1">
            <Ban className="w-3 h-3" />
            <span>Card Suspended</span>
          </span>
          <span className="text-xl font-bold text-amber-300 mt-1 block">{stats.suspended}</span>
          <span className="text-[10px] text-amber-500/80">New EMIs blocked</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#181212] border border-red-500/30 text-left">
          <span className="text-[10px] uppercase font-bold text-red-400 block flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
          <span className="text-xl font-bold text-red-300 mt-1 block">{stats.rejected}</span>
          <span className="text-[10px] text-red-500/80">Criteria unmet</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#141418] border border-akr-gold/30 text-left col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-akr-gold block flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Today's Requests</span>
          </span>
          <span className="text-xl font-bold text-white mt-1 block">{stats.todayCount}</span>
          <span className="text-[10px] text-zinc-400">Received today in IST</span>
        </div>
      </div>

      {/* Date-wise & Status Filter Bar (User Explicit Request) */}
      <div className="p-4 rounded-xl bg-[#141417] border border-zinc-800 space-y-3 text-left">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-akr-gold" />
            <span>Date & Timing Filters (IST Timezone)</span>
          </span>
          {datePreset !== 'all' && (
            <button
              onClick={() => {
                setDatePreset('all');
                setCustomDate('');
              }}
              className="text-[11px] text-akr-gold hover:underline"
            >
              Reset to All Dates
            </button>
          )}
        </div>

        {/* Date Presets Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Dates' },
            { id: 'today', label: `Today (IST: ${todayIST})` },
            { id: 'yesterday', label: 'Yesterday (IST)' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'This Month (Oct 2026)' },
            { id: 'custom', label: 'Custom Specific Date' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDatePreset(preset.id)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none
                ${
                  datePreset === preset.id
                    ? 'bg-akr-gold text-black shadow-md'
                    : 'bg-[#18181B] text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/60'
                }
              `}
            >
              {preset.label}
            </button>
          ))}

          {/* Custom Date Input */}
          {datePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2.5 p-2 rounded-lg bg-[#121215] border border-zinc-700/80">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span>From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-[#18181B] border border-zinc-700 text-white rounded-lg px-2 py-1 text-xs outline-none font-mono focus:border-akr-gold"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span>To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-[#18181B] border border-zinc-700 text-white rounded-lg px-2 py-1 text-xs outline-none font-mono focus:border-akr-gold"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span>Or Day:</span>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="bg-[#18181B] border border-akr-gold/60 text-white rounded-lg px-2 py-1 text-xs outline-none font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Search, Status & Tier Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/80">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Applicant, Phone, PAN, or Ref..."
              className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-akr-gold"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-akr-gold appearance-none cursor-pointer"
            >
              <option value="all">All Request Statuses ({requests.length})</option>
              <option value="pending">Pending Review ({stats.pending})</option>
              <option value="approved">Approved & Initiated ({stats.approved})</option>
              <option value="suspended">Suspended Cards ({stats.suspended})</option>
              <option value="rejected">Rejected ({stats.rejected})</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Card Tier Filter */}
          <div className="relative">
            <select
              value={cardTierFilter}
              onChange={(e) => setCardTierFilter(e.target.value)}
              className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-akr-gold appearance-none cursor-pointer"
            >
              <option value="all">All Card Tiers</option>
              <option value="gold">AKR Gold Cards</option>
              <option value="platinum">AKR Platinum Cards</option>
              <option value="titanium">AKR Titanium Cards</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Table / Requests List */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#141417] border border-zinc-800 text-zinc-400">
          <CreditCard className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
          <p className="text-sm font-semibold">No card requests found matching criteria.</p>
          <p className="text-xs text-zinc-500 mt-1">
            Try adjusting your date filter or search query.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-zinc-800 bg-[#121214] shadow-sm">
            <table className="w-full text-left text-xs text-zinc-200">
              <thead className="bg-[#18181B] text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800 select-none">
                <tr>
                  <th className="py-3 px-4">Ref & Date (IST)</th>
                  <th className="py-3 px-4">Applicant & Contact</th>
                  <th className="py-3 px-4">Card Requested</th>
                  <th className="py-3 px-4">PAN & Aadhaar</th>
                  <th className="py-3 px-4">Uploaded PAN</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filteredRequests.map((r) => {
                  const isPending = r.status === 'pending';
                  const isApproved = r.status === 'approved';
                  const isSuspended = r.status === 'suspended';
                  const isRejected = r.status === 'rejected';

                  return (
                    <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                      {/* Ref & Date in IST */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-white block">{r.referenceNumber}</span>
                        <span className="text-[11px] text-akr-gold font-mono block mt-0.5">
                          {formatDateTimeIST(r.createdAt)}
                        </span>
                      </td>

                      {/* Applicant & Contact */}
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-akr-gold/15 text-akr-gold font-bold flex items-center justify-center text-xs">
                            {r.fullName.charAt(0)}
                          </div>
                          <div>
                            <span>{r.fullName}</span>
                            <span className="block text-[11px] font-mono text-zinc-400 font-normal">
                              {r.phone}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Card Requested */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white block">{r.cardTypeName}</span>
                        {r.monthlyIncome && (
                          <span className="text-[10px] text-zinc-400 block">
                            Income: {formatCurrency(r.monthlyIncome)}/mo
                          </span>
                        )}
                      </td>

                      {/* PAN & Aadhaar */}
                      <td className="py-3.5 px-4 font-mono text-zinc-300">
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase mr-1">PAN:</span>
                          <strong className="text-white">{r.panNumber}</strong>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          <span className="text-[10px] text-zinc-500 uppercase mr-1">Aadhaar:</span>
                          <span>{r.aadharNumber}</span>
                        </div>
                      </td>

                      {/* Uploaded PAN Document */}
                      <td className="py-3.5 px-4">
                        {r.panDocName ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewDocUrl({
                                  name: r.panDocName || 'PAN_Document',
                                  url: r.panDocData || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-akr-gold text-[11px] font-medium border border-zinc-700 transition-colors cursor-pointer"
                              title="Click to view uploaded PAN document"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="max-w-[110px] truncate">{r.panDocName}</span>
                              <Eye className="w-3 h-3 text-zinc-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadDocument(r.panDocName || 'PAN_Document', r.panDocData)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-akr-gold border border-zinc-700 transition-colors cursor-pointer"
                              title="Download attached PAN document"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Not Attached</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-amber-300 uppercase bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                        {isApproved && (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle className="w-3 h-3" />
                              <span>Approved</span>
                            </span>
                            {r.creditLimitApproved ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  Limit: {formatCurrency(r.creditLimitApproved)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLimitRequest(r);
                                    setEditLimitValue(r.creditLimitApproved || 50000);
                                    setEditLimitRemarks('');
                                  }}
                                  className="text-[10px] text-akr-gold hover:text-amber-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                                  title="Edit Card Limit"
                                >
                                  (Edit)
                                </button>
                              </div>
                            ) : null}
                          </div>
                        )}
                        {isSuspended && (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-amber-400 uppercase bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                              <Ban className="w-3 h-3 text-amber-400" />
                              <span>Suspended</span>
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-zinc-400 font-mono">
                                Limit: {formatCurrency(r.creditLimitApproved || 50000)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLimitRequest(r);
                                  setEditLimitValue(r.creditLimitApproved || 50000);
                                  setEditLimitRemarks('');
                                }}
                                className="text-[10px] text-akr-gold hover:text-amber-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                                title="Edit Card Limit"
                              >
                                (Edit)
                              </button>
                            </div>
                            <span className="block text-[10px] text-zinc-500 mt-0.5 font-mono">
                              New EMIs blocked
                            </span>
                          </div>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-red-400 uppercase bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/30">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingRequest(r)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1"
                            title="View Full Application Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          {(isApproved || isSuspended) && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLimitRequest(r);
                                setEditLimitValue(r.creditLimitApproved || 50000);
                                setEditLimitRemarks('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-akr-gold/40 text-akr-gold hover:text-amber-300 text-xs font-semibold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                              title="Edit Card Limit (Increase or Decrease Dynamically)"
                            >
                              <Sliders className="w-3.5 h-3.5 text-akr-gold" />
                              <span>Edit Limit</span>
                            </button>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => {
                                setSuspendingRequest(r);
                                setSuspendReason('Customer card temporarily suspended by administration. New EMI plans blocked.');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all flex items-center gap-1 shadow-sm"
                              title="Suspend Privilege Card (Block New EMIs)"
                            >
                              <Ban className="w-3.5 h-3.5 text-amber-400" />
                              <span>Suspend</span>
                            </button>
                          )}

                          {isSuspended && (
                            <button
                              type="button"
                              onClick={() => {
                                setReactivatingRequest(r);
                                setReactivateLimit(r.creditLimitApproved || 50000);
                                setReactivateRemarks('Privilege Card reactivated. Credit line restored.');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all flex items-center gap-1 shadow-sm"
                              title="Reactivate Privilege Card"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Reactivate</span>
                            </button>
                          )}

                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setApprovingRequest(r);
                                  setCreditLimit(150000);
                                  setAdminRemarks(`Approved for ${r.cardTypeName}. KYC verified.`);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                title="Approve & Initiate Card"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingRequest(r);
                                  setAdminRemarks('Does not meet current credit underwriting guidelines.');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold border border-red-800/60 transition-colors"
                                title="Reject Application"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="lg:hidden space-y-3">
            {filteredRequests.map((r) => {
              const isPending = r.status === 'pending';
              const isApproved = r.status === 'approved';
              const isSuspended = r.status === 'suspended';
              const isRejected = r.status === 'rejected';

              return (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-[#141417] border border-zinc-800/80 shadow-card-dark space-y-3 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-akr-gold/15 text-akr-gold font-bold flex items-center justify-center text-xs">
                          {r.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{r.fullName}</h4>
                          <span className="text-[10px] font-mono text-zinc-400 block">{r.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-300 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle className="w-3 h-3" />
                          <span>Approved</span>
                        </span>
                      )}
                      {isSuspended && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-400 uppercase bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/40">
                          <Ban className="w-3 h-3 text-amber-400" />
                          <span>Suspended</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-red-400 uppercase bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/30">
                          <XCircle className="w-3 h-3" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ref & Date Banner */}
                  <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-[#18181D] border border-zinc-800">
                    <span className="font-mono text-zinc-300 font-semibold">{r.referenceNumber}</span>
                    <span className="text-[10px] text-akr-gold font-mono">{formatDateTimeIST(r.createdAt)}</span>
                  </div>

                  {/* Card & KYC Row */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Card Requested</span>
                      <span className="font-bold text-white text-xs block">{r.cardTypeName}</span>
                      {r.monthlyIncome && (
                        <span className="text-[10px] text-zinc-400">
                          Inc: {formatCurrency(r.monthlyIncome)}/mo
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">PAN / Aadhaar</span>
                      <span className="font-mono font-bold text-zinc-200 block">{r.panNumber}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{r.aadharNumber}</span>
                    </div>
                  </div>

                  {/* PAN Document Button */}
                  {r.panDocName && (
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDocUrl({
                            name: r.panDocName || 'PAN_Document',
                            url: r.panDocData || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
                          })
                        }
                        className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-akr-gold text-xs font-semibold border border-zinc-700/80"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{r.panDocName}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          Preview <Eye className="w-3 h-3" />
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadDocument(r.panDocName || 'PAN_Document', r.panDocData)}
                        className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-akr-gold border border-zinc-700/80 transition-colors"
                        title="Download Document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => setViewingRequest(r)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>

                    {(isApproved || isSuspended) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLimitRequest(r);
                          setEditLimitValue(r.creditLimitApproved || 50000);
                          setEditLimitRemarks('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-akr-gold/40 text-akr-gold text-xs font-semibold flex items-center gap-1 shadow-sm"
                        title="Edit Card Limit"
                      >
                        <Sliders className="w-3.5 h-3.5 text-akr-gold" />
                        <span>Limit</span>
                      </button>
                    )}

                    {isApproved && (
                      <button
                        type="button"
                        onClick={() => {
                          setSuspendingRequest(r);
                          setSuspendReason('Customer card temporarily suspended by administration. New EMI plans blocked.');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <Ban className="w-3.5 h-3.5 text-amber-400" />
                        <span>Suspend</span>
                      </button>
                    )}

                    {isSuspended && (
                      <button
                        type="button"
                        onClick={() => {
                          setReactivatingRequest(r);
                          setReactivateLimit(r.creditLimitApproved || 50000);
                          setReactivateRemarks('Privilege Card reactivated. Credit line restored.');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Reactivate</span>
                      </button>
                    )}

                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setApprovingRequest(r);
                            setCreditLimit(150000);
                            setAdminRemarks(`Approved for ${r.cardTypeName}. KYC verified.`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectingRequest(r);
                            setAdminRemarks('Does not meet current credit underwriting guidelines.');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold border border-red-800/60 flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* View Full Application Modal */}
      {viewingRequest && (
        <Modal
          isOpen={!!viewingRequest}
          onClose={() => setViewingRequest(null)}
          title={`Application Details: ${viewingRequest.referenceNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-left text-xs">
            {/* Top Status & Timestamp Banner */}
            <div className="p-3.5 rounded-xl bg-[#141418] border border-akr-gold/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                  Application Submission Time (IST)
                </span>
                <span className="font-mono font-bold text-akr-gold text-sm">
                  {formatDateTimeIST(viewingRequest.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">
                  Current Status
                </span>
                <StatusBadge
                  status={
                    viewingRequest.status === 'approved'
                      ? 'Clear'
                      : viewingRequest.status === 'rejected'
                      ? 'Inactive'
                      : 'Due Soon'
                  }
                  size="sm"
                />
              </div>
            </div>

            {/* Applicant Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#18181D] border border-zinc-800">
              <div>
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">Applicant Full Name</span>
                <span className="font-bold text-white text-sm">{viewingRequest.fullName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">Contact Mobile</span>
                <span className="font-mono font-semibold text-white">{viewingRequest.phone}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">Email Address</span>
                <span className="text-zinc-300">{viewingRequest.email || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">Monthly Net Income</span>
                <span className="font-bold text-akr-gold">
                  {viewingRequest.monthlyIncome ? formatCurrency(viewingRequest.monthlyIncome) : 'Not specified'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">Communication / Delivery Address</span>
                <span className="text-zinc-200">{viewingRequest.address}</span>
              </div>
            </div>

            {/* Government Identifiers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#18181D] border border-zinc-800">
              <div>
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">PAN Card Number</span>
                <span className="font-mono font-bold text-white text-sm tracking-wider">{viewingRequest.panNumber}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">Aadhaar Number</span>
                <span className="font-mono font-bold text-white text-sm tracking-wider">{viewingRequest.aadharNumber}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Attached PAN Document</span>
                {viewingRequest.panDocName ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-[#101012] border border-zinc-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="font-mono text-white text-xs truncate">{viewingRequest.panDocName}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDocUrl({
                            name: viewingRequest.panDocName || 'PAN',
                            url: viewingRequest.panDocData || '',
                          })
                        }
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-akr-gold text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadDocument(viewingRequest.panDocName || 'PAN_Document', viewingRequest.panDocData)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-zinc-700"
                        title="Download attached PAN document"
                      >
                        <Download className="w-3 h-3 text-akr-gold" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="text-zinc-500">No document attached</span>
                )}
              </div>
            </div>

            {/* Admin Remarks / Decision History */}
            {viewingRequest.adminRemarks && (
              <div className="p-3.5 rounded-xl bg-[#141418] border border-zinc-800">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Admin Audit Remarks</span>
                <p className="text-zinc-300 italic">{viewingRequest.adminRemarks}</p>
                {viewingRequest.creditLimitApproved && (
                  <p className="text-akr-gold font-bold mt-1">
                    Approved Credit Limit: {formatCurrency(viewingRequest.creditLimitApproved)}
                  </p>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
              >
                Close
              </button>

              {viewingRequest.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const r = viewingRequest;
                      setViewingRequest(null);
                      setApprovingRequest(r);
                      setCreditLimit(150000);
                      setAdminRemarks(`Approved for ${r.cardTypeName}. KYC verified.`);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve & Initiate Card</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Approve & Initiate Card Modal */}
      {approvingRequest && (
        <Modal
          isOpen={!!approvingRequest}
          onClose={() => setApprovingRequest(null)}
          title={`Approve Card: ${approvingRequest.cardTypeName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-left text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-emerald-200">
              <h4 className="font-bold text-white text-sm">Initiate Card for {approvingRequest.fullName}</h4>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                Ref: {approvingRequest.referenceNumber} • PAN: {approvingRequest.panNumber}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-400 uppercase">
                  Approved Credit Limit (₹) *
                </label>
                <span className="text-[10px] text-akr-gold font-bold">Quick Presets</span>
              </div>

              {/* Quick Limit Preset Chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[20000, 30000, 40000, 50000, 100000].map((presetAmt) => (
                  <button
                    key={presetAmt}
                    type="button"
                    onClick={() => setCreditLimit(presetAmt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      creditLimit === presetAmt
                        ? 'bg-akr-gold text-black shadow-sm'
                        : 'bg-[#18181B] border border-zinc-700 text-zinc-300 hover:border-akr-gold'
                    }`}
                  >
                    ₹{presetAmt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                placeholder="50000"
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-akr-gold font-mono font-bold"
              />
              <span className="text-[10px] text-zinc-500 mt-0.5 block">
                Assign a limit between ₹20,000 and ₹1,00,000 based on applicant profile.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Admin Approval Notes / Remarks
              </label>
              <textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                rows={2}
                placeholder="KYC verified via PAN & Aadhaar. Approved for dispatch."
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setApprovingRequest(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
              >
                Cancel
              </button>
              <GoldButton onClick={handleApprove} isLoading={isProcessing}>
                Confirm Approval & Dispatch
              </GoldButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectingRequest && (
        <Modal
          isOpen={!!rejectingRequest}
          onClose={() => setRejectingRequest(null)}
          title={`Reject Card Request: ${rejectingRequest.referenceNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-left text-xs">
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-700/50 text-red-200">
              <h4 className="font-bold text-white text-sm">Reject Application for {rejectingRequest.fullName}</h4>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                The applicant will be notified of the decision.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Rejection Reason *
              </label>
              <textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                rows={3}
                placeholder="e.g. Incomplete KYC documentation or insufficient credit history."
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing || !adminRemarks.trim()}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Suspend Card Modal */}
      {suspendingRequest && (
        <Modal
          isOpen={!!suspendingRequest}
          onClose={() => setSuspendingRequest(null)}
          title={`Suspend Privilege Card: ${suspendingRequest.referenceNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-left text-xs">
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 space-y-1">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-white text-sm">
                  Suspend Privilege Card for {suspendingRequest.fullName}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-300">
                Contact: <span className="font-mono text-white">{suspendingRequest.phone}</span> • Card: <span className="text-akr-gold font-semibold">{suspendingRequest.cardTypeName}</span>
              </p>
              <div className="p-2.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-300 text-[11px] mt-2 leading-relaxed">
                <strong>Enforcement Effect:</strong> Suspending this card immediately locks the customer's credit facility. The customer <strong>CANNOT</strong> be assigned any new EMI plans in the admin panel until the card is reactivated. Existing dues remain recorded.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Reason for Suspension *
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                placeholder="e.g. Delinquent overdue payments, customer request, or administrative security hold."
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-amber-500 resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSuspendingRequest(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold cursor-pointer hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspend}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Suspending...' : 'Confirm Suspend Card'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reactivate Card Modal */}
      {reactivatingRequest && (
        <Modal
          isOpen={!!reactivatingRequest}
          onClose={() => setReactivatingRequest(null)}
          title={`Reactivate Privilege Card: ${reactivatingRequest.referenceNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-left text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-emerald-200 space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-white text-sm">
                  Reactivate Privilege Card for {reactivatingRequest.fullName}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-300">
                Contact: <span className="font-mono text-white">{reactivatingRequest.phone}</span> • Card: <span className="text-akr-gold font-semibold">{reactivatingRequest.cardTypeName}</span>
              </p>
              <p className="text-[11px] text-emerald-300/90 pt-1">
                Reactivating this card will restore borrowing privileges and allow new EMI plans to be assigned immediately.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Approved Credit Limit (₹)
              </label>
              <input
                type="number"
                value={reactivateLimit}
                onChange={(e) => setReactivateLimit(Number(e.target.value))}
                placeholder="50000"
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-akr-gold font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Reactivation Remarks
              </label>
              <textarea
                value={reactivateRemarks}
                onChange={(e) => setReactivateRemarks(e.target.value)}
                rows={2}
                placeholder="e.g. Account cleared and verified. Credit line restored."
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setReactivatingRequest(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold cursor-pointer hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReactivate}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Reactivating...' : 'Confirm Reactivate Card'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dynamic Edit Card Limit Modal with Active Debt Detection & Limit Reduction Guard */}
      {editingLimitRequest && (() => {
        // Find matching consumer & active plans
        const targetConsumer = consumers.find(
          (c) =>
            (editingLimitRequest.consumerId && c.id === editingLimitRequest.consumerId) ||
            c.mobile === editingLimitRequest.phone ||
            (editingLimitRequest.email && c.email?.toLowerCase() === editingLimitRequest.email.toLowerCase())
        );

        const consumerId = targetConsumer?.id || editingLimitRequest.consumerId;
        const consumerActivePlans = duesPlans.filter(
          (p) => p.consumerId === consumerId && p.status === 'active'
        );

        const totalOutstanding = consumerActivePlans.length > 0
          ? consumerActivePlans.reduce((sum, p) => sum + (p.outstandingAmount || 0), 0)
          : (targetConsumer?.totalOutstanding ?? editingLimitRequest.consumerOutstanding ?? 0);

        const activePlansCount = consumerActivePlans.length > 0
          ? consumerActivePlans.length
          : (targetConsumer?.activePlansCount ?? editingLimitRequest.activePlansCount ?? 0);

        const currentLimit = editingLimitRequest.creditLimitApproved || 50000;
        const delta = editLimitValue - currentLimit;
        const isReducing = delta < 0;
        const isBelowOutstanding = totalOutstanding > 0 && editLimitValue < totalOutstanding;
        const minAllowedLimit = totalOutstanding;
        const maxReducibleAmount = Math.max(0, currentLimit - totalOutstanding);
        const remainingCapacityAfterReduction = Math.max(0, editLimitValue - totalOutstanding);

        return (
          <Modal
            isOpen={!!editingLimitRequest}
            onClose={() => setEditingLimitRequest(null)}
            title={`Edit Card Limit: ${editingLimitRequest.fullName}`}
            maxWidth="md"
          >
            <div className="space-y-4 text-left text-xs">
              {/* Customer Details Banner */}
              <div className="p-3.5 rounded-xl bg-[#141418] border border-akr-gold/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-akr-gold font-bold text-xs">
                    {editingLimitRequest.referenceNumber}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                    {editingLimitRequest.cardTypeName}
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm">{editingLimitRequest.fullName}</h4>
                <p className="text-[11px] text-zinc-400">
                  Contact: <span className="font-mono text-zinc-200">{editingLimitRequest.phone}</span> • Current Approved Limit:{' '}
                  <strong className="text-white font-mono">
                    ₹{currentLimit.toLocaleString('en-IN')}
                  </strong>
                </p>
              </div>

              {/* Debt Utilization & Minimum Limit Card */}
              <div className="p-3 rounded-xl bg-[#18181D] border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-akr-gold" />
                    <span>Card Utilization & Active Debt to be Paid</span>
                  </span>
                  {totalOutstanding > 0 ? (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                      {activePlansCount} Active EMI Plan{activePlansCount === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                      0 Active Dues
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">
                      Current Limit
                    </span>
                    <span className="font-mono font-bold text-white text-xs block mt-0.5">
                      ₹{currentLimit.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-zinc-900 border border-amber-500/40">
                    <span className="text-[10px] text-amber-400 uppercase block font-semibold">
                      Still Must Pay
                    </span>
                    <span className="font-mono font-bold text-amber-300 text-xs block mt-0.5">
                      ₹{totalOutstanding.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">
                      Max Reducible
                    </span>
                    <span className="font-mono font-bold text-emerald-400 text-xs block mt-0.5">
                      ₹{maxReducibleAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {totalOutstanding > 0 && (
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/80">
                    <span className="text-zinc-400 font-medium">Strict Minimum Limit Allowed:</span>
                    <span className="font-mono font-bold text-akr-gold">
                      ₹{minAllowedLimit.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Dynamic Detection Alert / Awareness Banners */}
              {isBelowOutstanding ? (
                <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/80 text-red-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 animate-bounce" />
                    <span className="font-extrabold text-sm text-red-300">
                      CANNOT REDUCE LIMIT BELOW ACTIVE OUTSTANDING!
                    </span>
                  </div>
                  <p className="text-xs text-red-200/90 leading-relaxed">
                    This customer currently has <strong className="text-white font-mono font-bold">₹{totalOutstanding.toLocaleString('en-IN')}</strong> that still must be paid across <strong className="text-white font-mono">{activePlansCount} active EMI plan{activePlansCount === 1 ? '' : 's'}</strong> on this privilege card.
                  </p>
                  <p className="text-[11px] text-red-300 font-semibold">
                    You <span className="underline uppercase">cannot reduce</span> the card limit below what the customer has already used. The minimum allowable limit is <strong className="text-white font-mono">₹{minAllowedLimit.toLocaleString('en-IN')}</strong>.
                  </p>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">Quick Fix:</span>
                    <button
                      type="button"
                      onClick={() => setEditLimitValue(minAllowedLimit)}
                      className="px-2.5 py-1 rounded-lg bg-red-800 hover:bg-red-700 text-white font-bold text-[11px] font-mono cursor-pointer transition-colors shadow-sm active:scale-95"
                    >
                      Set to Min Allowable: ₹{minAllowedLimit.toLocaleString('en-IN')}
                    </button>
                  </div>
                </div>
              ) : isReducing ? (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/60 text-amber-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="font-bold text-xs text-amber-300">
                      LIMIT REDUCTION DETECTED (-₹{Math.abs(delta).toLocaleString('en-IN')} / -{Math.round((Math.abs(delta) / currentLimit) * 100)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    You are reducing this card limit from <span className="font-mono text-zinc-200">₹{currentLimit.toLocaleString('en-IN')}</span> to <strong className="font-mono text-white">₹{editLimitValue.toLocaleString('en-IN')}</strong>.
                    Customer still owes <span className="font-mono text-amber-300 font-semibold">₹{totalOutstanding.toLocaleString('en-IN')}</span> across active EMIs.
                  </p>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    ✓ Safe reduction: New limit exceeds active debt. Customer retains <span className="font-mono font-bold">₹{remainingCapacityAfterReduction.toLocaleString('en-IN')}</span> in borrowing headroom.
                  </p>
                </div>
              ) : delta > 0 ? (
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    Limit increase (+₹{delta.toLocaleString('en-IN')} / +{Math.round((delta / currentLimit) * 100)}%). Customer's borrowing capacity expands to ₹{editLimitValue.toLocaleString('en-IN')}.
                  </span>
                </div>
              ) : null}

              {/* Dynamic Credit Limit Value Input & Live Comparison */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">
                    New Credit Limit (₹) *
                  </label>
                  {(() => {
                    if (delta > 0) {
                      const pct = Math.round((delta / currentLimit) * 100);
                      return (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                          ▲ +₹{delta.toLocaleString('en-IN')} (+{pct}%) Limit Increase
                        </span>
                      );
                    } else if (delta < 0) {
                      const pct = Math.round((Math.abs(delta) / currentLimit) * 100);
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono border ${
                          isBelowOutstanding
                            ? 'text-red-400 bg-red-500/15 border-red-500/40'
                            : 'text-amber-400 bg-amber-500/15 border-amber-500/30'
                        }`}>
                          ▼ -₹{Math.abs(delta).toLocaleString('en-IN')} (-{pct}%) Limit Decrease
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] text-zinc-500 font-mono">
                        No Change
                      </span>
                    );
                  })()}
                </div>

                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-akr-gold absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={editLimitValue}
                    onChange={(e) => setEditLimitValue(Math.max(1000, Number(e.target.value) || 0))}
                    min={minAllowedLimit || 1000}
                    step={1000}
                    className={`w-full bg-[#18181B] border rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none font-mono font-bold transition-colors ${
                      isBelowOutstanding
                        ? 'border-red-500 text-red-300 focus:border-red-400'
                        : 'border-zinc-700 text-white focus:border-akr-gold'
                    }`}
                    placeholder="50000"
                    required
                  />
                </div>
                {isBelowOutstanding && (
                  <span className="block text-[11px] text-red-400 mt-1 font-semibold">
                    * Limit cannot be lower than ₹{minAllowedLimit.toLocaleString('en-IN')} (Customer's active EMI debt).
                  </span>
                )}
              </div>

              {/* Quick Adjustments */}
              <div>
                <span className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1.5">
                  Quick Adjustments (Increase / Decrease Dynamically)
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Decrements */}
                  {[25000, 10000, 5000].map((amt) => {
                    const wouldBe = editLimitValue - amt;
                    const isBlocked = totalOutstanding > 0 && wouldBe < totalOutstanding;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          if (!isBlocked) {
                            setEditLimitValue(wouldBe);
                          }
                        }}
                        disabled={isBlocked}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all border ${
                          isBlocked
                            ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed opacity-50 line-through'
                            : 'bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 cursor-pointer'
                        }`}
                        title={
                          isBlocked
                            ? `Cannot reduce below active debt of ₹${totalOutstanding.toLocaleString('en-IN')}`
                            : `Decrease by ₹${amt.toLocaleString('en-IN')}`
                        }
                      >
                        -₹{amt.toLocaleString('en-IN')}
                      </button>
                    );
                  })}

                  {/* Increments */}
                  <button
                    type="button"
                    onClick={() => setEditLimitValue((v) => v + 5000)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                  >
                    +₹5,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditLimitValue((v) => v + 10000)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                  >
                    +₹10,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditLimitValue((v) => v + 25000)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                  >
                    +₹25,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditLimitValue((v) => v + 50000)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                  >
                    +₹50,000
                  </button>
                </div>
              </div>

              {/* Standard Limit Presets */}
              <div>
                <span className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1.5">
                  Standard Limit Presets
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[25000, 50000, 75000, 100000, 150000, 200000].map((preset) => {
                    const isBelow = totalOutstanding > 0 && preset < totalOutstanding;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          if (!isBelow) {
                            setEditLimitValue(preset);
                          }
                        }}
                        disabled={isBelow}
                        className={`py-1 px-2 rounded-lg text-[11px] font-mono font-bold transition-all border flex items-center justify-center gap-1 ${
                          editLimitValue === preset
                            ? 'bg-akr-gold text-black border-akr-gold shadow-sm'
                            : isBelow
                            ? 'bg-zinc-900/60 text-zinc-600 border-zinc-800/80 cursor-not-allowed line-through opacity-50'
                            : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/80 hover:bg-zinc-700 cursor-pointer'
                        }`}
                        title={
                          isBelow
                            ? `Locked: Below customer debt of ₹${totalOutstanding.toLocaleString('en-IN')}`
                            : `Set limit to ₹${(preset / 1000).toFixed(0)}k`
                        }
                      >
                        {isBelow && <Lock className="w-2.5 h-2.5 text-zinc-600" />}
                        <span>₹{(preset / 1000).toFixed(0)}k</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audit Remarks */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  Admin Audit Remarks (Optional)
                </label>
                <textarea
                  value={editLimitRemarks}
                  onChange={(e) => setEditLimitRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Card limit updated based on customer request and verified repayment track record."
                  className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingLimitRequest(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold cursor-pointer hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCardLimit}
                  disabled={isProcessing || isBelowOutstanding}
                  className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-md ${
                    isBelowOutstanding
                      ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                      : 'bg-akr-gold hover:bg-amber-400 text-black cursor-pointer active:scale-95'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>
                    {isProcessing
                      ? 'Saving Limit...'
                      : isBelowOutstanding
                      ? `Cannot Reduce Below Debt (₹${minAllowedLimit.toLocaleString('en-IN')})`
                      : 'Save & Update Limit'}
                  </span>
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Document Preview Modal */}
      {previewDocUrl && (
        <Modal
          isOpen={!!previewDocUrl}
          onClose={() => setPreviewDocUrl(null)}
          title={`Document Preview: ${previewDocUrl.name}`}
          maxWidth="lg"
        >
          <div className="space-y-3 text-center">
            <div className="p-2 rounded-xl bg-black border border-zinc-800 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={previewDocUrl.url}
                alt={previewDocUrl.name}
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-xl"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 pt-2 border-t border-zinc-800">
              <span className="font-mono text-zinc-300 truncate max-w-full sm:max-w-xs">{previewDocUrl.name}</span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => downloadDocument(previewDocUrl.name, previewDocUrl.url)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-akr-gold hover:text-white border border-akr-gold/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Download Document"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocUrl(null)}
                  className="px-4 py-1.5 rounded-lg bg-akr-gold hover:bg-amber-400 text-black font-bold text-xs transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
