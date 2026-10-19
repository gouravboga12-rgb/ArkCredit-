import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  User,
  CreditCard,
  IndianRupee,
  Layers,
  MoreHorizontal,
  ChevronRight,
  ShieldCheck,
  Headphones,
  HelpCircle,
  FileText,
  Landmark,
  Receipt,
  Wallet,
} from 'lucide-react';
import { useStore } from '../../store';
import { consumerApi } from '../../core/api';
import { DuesPlan, Payment } from '../../core/types';
import { formatCurrency, formatDisplayDate } from '../../core/formatters';
import { AkrLogo } from '../../assets/logo';
import {
  AmountCard,
  ListRow,
  BottomNav,
  BottomSheet,
  Skeleton,
  StatusBadge,
  DuePaymentCard,
} from '../../components/ui';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const consumerSession = useStore((state) => state.consumerSession);
  const notifications = useStore((state) => state.notifications);

  const [duesData, setDuesData] = useState<{
    totalOutstanding: number;
    nextEmiAmount: number;
    nextEmiDate: string;
    isDueSoon: boolean;
    plans: DuesPlan[];
  } | null>(null);

  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const consumer = consumerSession?.consumer;
  const firstName = consumer?.name.split(' ')[0] || 'Member';

  // Count unread notifications
  const unreadCount = notifications.filter(
    (n) => (n.consumerId === consumer?.id || n.consumerId === null) && !n.read
  ).length;

  useEffect(() => {
    let isMounted = true;
    async function loadHomeData() {
      try {
        setLoading(true);
        const [duesRes, paymentsRes] = await Promise.all([
          consumerApi.getDues(),
          consumerApi.getPaymentHistory(),
        ]);
        if (isMounted) {
          setDuesData(duesRes);
          setRecentPayments(paymentsRes.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load home data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadHomeData();
    return () => {
      isMounted = false;
    };
  }, [consumer?.id]);

  const getPlanIcon = (plan: DuesPlan) => {
    if (plan.planTypeId.includes('card_bill')) return <Receipt className="w-4 h-4 text-akr-gold" />;
    if (plan.planTypeId.includes('card')) return <CreditCard className="w-4 h-4 text-akr-gold" />;
    if (plan.planTypeId.includes('loan')) return <Landmark className="w-4 h-4 text-akr-gold" />;
    return <Wallet className="w-4 h-4 text-akr-gold" />;
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-akr-bg text-white relative">
      <div className="flex-1 px-4 pt-3 pb-28 space-y-5">
        {/* Top Header: Logo, Notification Bell, Profile Avatar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AkrLogo size="sm" variant="image" />
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell with red dot */}
            <button
              onClick={() => navigate('/app/notifications')}
              className="relative w-9 h-9 rounded-full bg-akr-surface border border-akr-border text-white hover:text-akr-gold flex items-center justify-center transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-akr-danger border-2 border-black animate-pulse" />
              )}
            </button>

            {/* Profile Avatar */}
            <button
              onClick={() => navigate('/app/profile')}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-akr-gold to-amber-200 text-black font-bold text-xs flex items-center justify-center shadow-sm select-none"
              aria-label="Profile"
            >
              {firstName.charAt(0)}
            </button>
          </div>
        </div>

        {/* Greeting Section */}
        <div className="text-left pt-1">
          <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
            <span>Hello, {consumer?.name || 'Rahul Sharma'}</span>
            <span className="text-xl">👋</span>
          </h2>
          <p className="text-xs text-akr-text-muted mt-0.5">
            Your financial journey matters to us.
          </p>
        </div>

        {/* Main Outstanding Amount Card (Phone 2) */}
        {loading ? (
          <Skeleton className="h-44 w-full rounded-card" />
        ) : (
          <AmountCard
            totalOutstanding={duesData?.totalOutstanding || 0}
            nextEmiAmount={duesData?.nextEmiAmount || 0}
            nextEmiDate={duesData?.nextEmiDate || ''}
            isDueSoon={duesData?.isDueSoon || false}
            isOverdue={Boolean(
              duesData?.plans.some(
                (p) =>
                  (p.overdueAmount || 0) > 0 ||
                  (p.nextEmiDate && new Date(p.nextEmiDate) < new Date() && p.outstandingAmount > 0)
              )
            )}
            overdueAmount={
              duesData?.plans.reduce((sum, p) => sum + (p.overdueAmount || 0), 0) || 0
            }
            onPayClick={() => navigate('/app/pay')}
          />
        )}

        {/* Your Dues Section (Exact Design from image copy.png with Pay Now button & clear dates) */}
        <div className="text-left space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider font-bold text-akr-text-muted flex items-center gap-1.5">
              <span>Weekly EMI Payments</span>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                {duesData?.plans.length || 0} Pending
              </span>
            </h3>
            <span className="text-[11px] text-akr-gold font-medium">Clear Dates & Schedule</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : duesData?.plans && duesData.plans.length > 0 ? (
            <div className="space-y-3.5">
              {duesData.plans.map((plan) => (
                <DuePaymentCard
                  key={plan.id}
                  plan={plan}
                  onPayNow={(planId) => navigate(`/app/pay?planId=${planId}`)}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-akr-surface text-center text-xs text-zinc-400 border border-zinc-800">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-white text-sm">All Payments are Clear!</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">You have no pending dues or overdue EMIs.</p>
            </div>
          )}
        </div>

        {/* Quick Actions (4 Round Gold Icons as in Phone 2) */}
        <div>
          <div className="grid grid-cols-4 gap-2 text-center select-none">
            {/* Pay Now */}
            <div
              onClick={() => navigate('/app/pay')}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="w-13 h-13 p-3.5 rounded-full bg-gradient-to-br from-[#F3D98B] to-[#C99A2E] text-black shadow-gold-glow group-hover:scale-105 group-active:scale-95 transition-all flex items-center justify-center">
                <IndianRupee className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-xs font-semibold text-white mt-2 group-hover:text-akr-gold transition-colors">
                Pay Now
              </span>
            </div>

            {/* Payment History */}
            <div
              onClick={() => navigate('/app/history')}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="w-13 h-13 p-3.5 rounded-full bg-[#201D16] border border-akr-gold/40 text-akr-gold group-hover:border-akr-gold group-hover:scale-105 group-active:scale-95 transition-all flex items-center justify-center">
                <FileText className="w-6 h-6 stroke-2" />
              </div>
              <span className="text-xs font-semibold text-white mt-2 group-hover:text-akr-gold transition-colors">
                History
              </span>
            </div>

            {/* Cards */}
            <div
              onClick={() => navigate('/app/cards')}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="w-13 h-13 p-3.5 rounded-full bg-[#201D16] border border-akr-gold/40 text-akr-gold group-hover:border-akr-gold group-hover:scale-105 group-active:scale-95 transition-all flex items-center justify-center">
                <CreditCard className="w-6 h-6 stroke-2" />
              </div>
              <span className="text-xs font-semibold text-white mt-2 group-hover:text-akr-gold transition-colors">
                Cards
              </span>
            </div>

            {/* More */}
            <div
              onClick={() => setMoreSheetOpen(true)}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="w-13 h-13 p-3.5 rounded-full bg-[#201D16] border border-akr-gold/40 text-akr-gold group-hover:border-akr-gold group-hover:scale-105 group-active:scale-95 transition-all flex items-center justify-center">
                <MoreHorizontal className="w-6 h-6 stroke-2" />
              </div>
              <span className="text-xs font-semibold text-white mt-2 group-hover:text-akr-gold transition-colors">
                More
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity Section (Last 3 transactions with View All) */}
        <div className="text-left pt-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white tracking-wide">Recent Activity</h3>
            <button
              onClick={() => navigate('/app/history')}
              className="text-xs font-semibold text-akr-gold hover:underline"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-card" />
              <Skeleton className="h-16 w-full rounded-card" />
            </div>
          ) : recentPayments.length > 0 ? (
            <div className="space-y-2">
              {recentPayments.map((pay) => (
                <ListRow
                  key={pay.id}
                  title={pay.planTypeId.includes('card') ? 'Card Payment' : 'EMI Payment'}
                  subtitle={pay.reference}
                  date={pay.createdAt}
                  amount={pay.amount}
                  status={pay.status}
                  mode={pay.mode}
                  iconType="check"
                  onClick={() => navigate(`/app/receipt/${pay.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-card bg-akr-surface text-center text-xs text-zinc-400">
              No recent payments recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet for 'More' Quick Action */}
      <BottomSheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="Quick Services & Support"
      >
        <div className="space-y-2 pt-2">
          <div
            onClick={() => {
              setMoreSheetOpen(false);
              navigate('/app/profile');
            }}
            className="flex items-center justify-between p-3.5 rounded-xl bg-akr-bg border border-akr-border hover:border-akr-gold cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-akr-gold/15 text-akr-gold flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-white">Consumer Details</h4>
                <p className="text-[11px] text-zinc-400">View EMI schedule, dues summary, and account info</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </div>

          <div
            onClick={() => {
              setMoreSheetOpen(false);
              navigate('/app/notifications');
            }}
            className="flex items-center justify-between p-3.5 rounded-xl bg-akr-bg border border-akr-border hover:border-akr-gold cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-akr-gold/15 text-akr-gold flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-white">Notifications</h4>
                <p className="text-[11px] text-zinc-400">View EMI alerts, reminders, and payment confirmations</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </div>

          <div
            onClick={() => {
              alert('Customer Care Hotline: 1800-AKR-CREDIT (1800-257-2733)\nEmail: support@akrcredit.com');
              setMoreSheetOpen(false);
            }}
            className="flex items-center justify-between p-3.5 rounded-xl bg-akr-bg border border-akr-border hover:border-akr-gold cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-akr-gold/15 text-akr-gold flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-white">24/7 Priority Support</h4>
                <p className="text-[11px] text-zinc-400">Call customer care or email our financial advisors</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </div>
        </div>
      </BottomSheet>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
};
