import React, { useEffect, useState, useMemo } from 'react';
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
  Sparkles,
  Clock,
  ArrowRight,
  Check,
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
  const consumers = useStore((state) => state.consumers);
  const consumerSession = useStore((state) => state.consumerSession);
  const notifications = useStore((state) => state.notifications);
  const cardRequests = useStore((state) => state.cardRequests);

  // Always resolve the freshest consumer record from the master consumers list in store
  const consumer = useMemo(() => {
    if (!consumerSession?.consumer) return null;
    const live = consumers.find(
      (c) => c.id === consumerSession.consumer.id || c.mobile === consumerSession.consumer.mobile
    );
    return live || consumerSession.consumer;
  }, [consumers, consumerSession]);

  const userCardRequest = consumer
    ? cardRequests.find(
        (r) =>
          r.consumerId === consumer.id ||
          r.phone === consumer.mobile ||
          (consumer.email && r.email?.toLowerCase() === consumer.email.toLowerCase())
      ) || null
    : null;

  const isCardApproved = consumer?.cardApproved === true || userCardRequest?.status === 'approved';
  const isCardPending = !isCardApproved && userCardRequest?.status === 'pending';
  const effectiveCreditLimit = consumer?.creditLimit || userCardRequest?.creditLimitApproved || 50000;

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

  // Keep store rehydrated and in sync when switching tabs or periodically
  useEffect(() => {
    const handleSync = async () => {
      try {
        await useStore.persist.rehydrate();
      } catch (e) {}
    };

    window.addEventListener('focus', handleSync);
    const interval = setInterval(handleSync, 2500);

    return () => {
      window.removeEventListener('focus', handleSync);
      clearInterval(interval);
    };
  }, []);

  // Update session storage if live consumer has been approved or had credit limit changed
  useEffect(() => {
    if (consumer && consumerSession?.consumer) {
      if (
        consumerSession.consumer.cardApproved !== consumer.cardApproved ||
        consumerSession.consumer.creditLimit !== consumer.creditLimit ||
        consumerSession.consumer.cardStatus !== consumer.cardStatus
      ) {
        const updated = { ...consumerSession, consumer };
        useStore.setState({ consumerSession: updated });
        localStorage.setItem('akr_consumer_session', JSON.stringify(updated));
      }
    }
  }, [consumer, consumerSession]);

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
            <div className="space-y-3">
              {/* Clear status pill */}
              <div className="p-4 rounded-2xl bg-akr-surface text-center text-xs text-zinc-400 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white text-xs">All Payments are Clear!</p>
                    <p className="text-[10px] text-zinc-400">No pending weekly dues or overdue EMIs.</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/25 font-bold uppercase">
                  Clear
                </span>
              </div>

              {/* Apply for EMI Card CTA Banner when user has not yet applied */}
              {!isCardApproved && !isCardPending && (
                <div className="rounded-2xl p-5 bg-gradient-to-tr from-[#1A1408] via-[#2A1E0A] to-[#453210] border-2 border-akr-gold/50 shadow-gold-glow relative overflow-hidden text-left space-y-3.5 group">
                  <div className="absolute top-0 right-0 w-44 h-full pointer-events-none opacity-25 overflow-hidden">
                    <div className="w-32 h-32 rounded-full bg-akr-gold blur-2xl" />
                  </div>

                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-akr-gold bg-akr-gold/15 px-2 py-0.5 rounded-full border border-akr-gold/30">
                          Pre-Approved Privilege
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-akr-gold animate-pulse" />
                      </div>
                      <h4 className="text-base font-bold text-white tracking-tight">
                        Apply for AKR EMI Privilege Card
                      </h4>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                        Get up to <strong className="text-akr-gold font-bold">₹50,000 – ₹1,00,000</strong> instant store credit with <strong className="text-emerald-400 font-bold">0% interest</strong> on bridal silk sarees, handlooms, and jewellery.
                      </p>
                    </div>

                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-akr-gold to-amber-600 text-black flex items-center justify-center flex-shrink-0 shadow-md">
                      <CreditCard className="w-6 h-6 stroke-[2.2]" />
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-wrap gap-2 text-[10px] text-zinc-300 font-medium">
                    <span className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-zinc-700/60">
                      <Check className="w-3 h-3 text-emerald-400" /> 0% APR Weekly EMIs
                    </span>
                    <span className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-zinc-700/60">
                      <Check className="w-3 h-3 text-emerald-400" /> Instant Store Approval
                    </span>
                    <span className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-zinc-700/60">
                      <Check className="w-3 h-3 text-emerald-400" /> ₹0 Annual Fee
                    </span>
                  </div>

                  <div className="relative z-10 pt-1">
                    <button
                      type="button"
                      onClick={() => navigate('/app/cards')}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-akr-gold via-amber-400 to-akr-gold-dark text-black font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.99] transition-all shadow-gold-glow cursor-pointer"
                    >
                      <span>Apply for EMI Card Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* If application is already pending review */}
              {isCardPending && (
                <div className="rounded-2xl p-4 bg-[#18140E] border border-amber-500/40 text-left space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-white">Card Application In Verification</h4>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/40">
                      In Review
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Your KYC application is currently being verified by the admin team.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/app/cards')}
                    className="w-full py-2 rounded-xl bg-zinc-800 text-akr-gold font-bold text-xs flex items-center justify-center gap-1 hover:bg-zinc-700"
                  >
                    <span>Check Application Status</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* If card is approved and active */}
              {isCardApproved && (
                <div className="rounded-2xl p-4 bg-[#141418] border border-akr-gold/40 text-left flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">AKR Privilege Card Active</span>
                    <span className="text-sm font-bold text-akr-gold font-sans">{formatCurrency(effectiveCreditLimit)} Credit Limit</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/app/cards')}
                    className="px-3 py-1.5 rounded-xl bg-akr-gold/15 hover:bg-akr-gold/25 border border-akr-gold/40 text-akr-gold font-bold text-xs flex items-center gap-1"
                  >
                    <span>View Card</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
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
