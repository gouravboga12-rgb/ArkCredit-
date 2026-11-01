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
import { DuesPlan, Payment, Consumer, AppNotification, CardRequest } from '../../core/types';
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
  const duesPlans = useStore((state) => state.duesPlans || []);
  const cardRequests = useStore((state) => state.cardRequests || []);
  const [myCardRequests, setMyCardRequests] = useState<CardRequest[]>([]);

  // Always resolve the freshest consumer record from the master consumers list in store
  const consumer = useMemo(() => {
    if (!consumerSession?.consumer) return null;
    const live = consumers.find(
      (c) => c.id === consumerSession.consumer.id || c.mobile === consumerSession.consumer.mobile
    );
    return live || consumerSession.consumer;
  }, [consumers, consumerSession]);

  // Combine live card requests from AWS API and local store
  const allCardRequests = useMemo(() => {
    const combined = [...myCardRequests, ...cardRequests];
    const map = new Map<string, CardRequest>();
    combined.forEach((r) => map.set(r.id, r));
    return Array.from(map.values());
  }, [myCardRequests, cardRequests]);

  // Check all requests for current consumer: prioritized by APPROVED > PENDING > any
  const userCardRequests = useMemo(() => {
    if (!consumer) return allCardRequests;
    return allCardRequests.filter(
      (r) =>
        r.consumerId === consumer.id ||
        r.phone === consumer.mobile ||
        (consumer.email && r.email?.toLowerCase() === consumer.email.toLowerCase())
    );
  }, [allCardRequests, consumer]);

  const approvedCardRequest = useMemo(() => {
    return userCardRequests.find((r) => r.status === 'approved') || null;
  }, [userCardRequests]);

  const pendingCardRequest = useMemo(() => {
    return userCardRequests.find((r) => r.status === 'pending') || null;
  }, [userCardRequests]);

  const userCardRequest = approvedCardRequest || pendingCardRequest || userCardRequests[0] || null;

  const isCardApproved =
    consumer?.cardApproved === true ||
    consumer?.cardStatus === 'approved' ||
    approvedCardRequest !== null ||
    userCardRequest?.status === 'approved';

  const isCardPending =
    !isCardApproved &&
    (consumer?.cardStatus === 'pending' ||
      pendingCardRequest !== null ||
      userCardRequest?.status === 'pending' ||
      myCardRequests.some((r) => r.status === 'pending'));

  const approvedLimit = approvedCardRequest?.creditLimitApproved || userCardRequest?.creditLimitApproved;
  const effectiveCreditLimit =
    consumer?.creditLimit && consumer.creditLimit > 0
      ? consumer.creditLimit
      : (approvedLimit && approvedLimit > 0 ? approvedLimit : 50000);

  const [duesData, setDuesData] = useState<{
    totalOutstanding: number;
    nextEmiAmount: number;
    nextEmiDate: string;
    isDueSoon: boolean;
    dueStatus?: string;
    plans: DuesPlan[];
    allPlans?: DuesPlan[];
  } | null>(null);

  // Distinguish between brand-new user with 0 loans ever vs. returning user who cleared past loans
  const userAllPlans = useMemo(() => {
    if (duesData?.allPlans && duesData.allPlans.length > 0) {
      return duesData.allPlans;
    }
    if (!consumer) return [];
    return duesPlans.filter((p) => p.consumerId === consumer.id);
  }, [duesData?.allPlans, duesPlans, consumer]);

  const activePlansCount = duesData?.plans?.length || 0;
  const hasCompletedPastLoans = useMemo(() => {
    return userAllPlans.some(
      (p) => p.status === 'closed' || p.outstandingAmount === 0 || p.remainingEmis === 0
    );
  }, [userAllPlans]);

  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const firstName = consumer?.name.split(' ')[0] || 'Member';

  // Count unread notifications using live notifications from AWS (or store fallback)
  const currentNotifs = liveNotifications.length > 0 ? liveNotifications : notifications;
  const unreadCount = currentNotifs.filter(
    (n) => (n.consumerId === consumer?.id || n.consumerId === null) && !n.read
  ).length;

  useEffect(() => {
    let isMounted = true;
    async function loadHomeData() {
      try {
        setLoading(true);
        const [duesRes, paymentsRes, notifsRes, myReqs, profile] = await Promise.all([
          consumerApi.getDues().catch(() => null),
          consumerApi.getPaymentHistory().catch(() => []),
          consumerApi.getNotifications().catch(() => []),
          consumerApi.getMyCardRequests().catch(() => []),
          consumerApi.getProfile().catch(() => null),
        ]);
        if (isMounted) {
          if (duesRes) setDuesData(duesRes);
          setRecentPayments(paymentsRes.slice(0, 3));
          if (Array.isArray(notifsRes)) setLiveNotifications(notifsRes);
          if (Array.isArray(myReqs)) setMyCardRequests(myReqs);
          if (profile) {
            useStore.getState().updateConsumerProfile(profile.id, profile);
            if (consumerSession) {
              const updatedSession = {
                ...consumerSession,
                consumer: { ...consumerSession.consumer, ...profile },
              };
              useStore.setState({ consumerSession: updatedSession });
              try {
                localStorage.setItem('akr_consumer_session', JSON.stringify(updatedSession));
              } catch (e) {}
            }
          }
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
  }, [consumerSession?.consumer?.id]);

  // Keep store rehydrated and in sync when switching tabs or periodically
  useEffect(() => {
    const handleSync = async () => {
      try {
        await useStore.persist.rehydrate();
        const [freshNotifs, myReqs, profile] = await Promise.all([
          consumerApi.getNotifications().catch(() => null),
          consumerApi.getMyCardRequests().catch(() => null),
          consumerApi.getProfile().catch(() => null),
        ]);
        if (Array.isArray(freshNotifs)) {
          setLiveNotifications(freshNotifs);
        }
        if (Array.isArray(myReqs)) {
          setMyCardRequests(myReqs);
        }
        if (profile) {
          useStore.getState().updateConsumerProfile(profile.id, profile);
        }
      } catch (e) {}
    };

    window.addEventListener('focus', handleSync);
    const interval = setInterval(handleSync, 3500);

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

  // If approved card request exists, but consumer profile is not yet approved in store, reconcile immediately
  useEffect(() => {
    if (approvedCardRequest && consumer) {
      if (!consumer.cardApproved || !consumer.creditLimit) {
        const targetLimit = approvedCardRequest?.creditLimitApproved || 50000;
        const resolvedLimit = consumer.creditLimit && consumer.creditLimit > 0 ? consumer.creditLimit : targetLimit;
        const cardNum = consumer.cardNumber || `5319 •••• •••• ${consumer.mobile.slice(-4)}`;
        const updatedConsumer: Consumer = {
          ...consumer,
          cardApproved: true,
          cardStatus: 'approved',
          creditLimit: resolvedLimit,
          cardNumber: cardNum,
        };

        useStore.setState((state) => ({
          consumers: state.consumers.map((c) =>
            c.id === consumer.id || c.mobile === consumer.mobile ? updatedConsumer : c
          ),
          consumerSession: state.consumerSession
            ? { ...state.consumerSession, consumer: updatedConsumer }
            : null,
        }));

        try {
          const raw = localStorage.getItem('akr_consumer_session');
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.consumer = updatedConsumer;
            localStorage.setItem('akr_consumer_session', JSON.stringify(parsed));
          }
        } catch (e) {}
      }
    }
  }, [approvedCardRequest, consumer]);

  const getPlanIcon = (plan: DuesPlan) => {
    const typeId = (plan?.planTypeId || '').toLowerCase();
    if (typeId.includes('card_bill')) return <Receipt className="w-4 h-4 text-akr-gold" />;
    if (typeId.includes('card')) return <CreditCard className="w-4 h-4 text-akr-gold" />;
    if (typeId.includes('loan')) return <Landmark className="w-4 h-4 text-akr-gold" />;
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
            <span>Hello, {consumer?.name || 'Valued Member'}</span>
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

        {/* Approved EMI Privilege Card & Borrowing Capacity Widget */}
        {isCardApproved && !loading && (
          <div
            onClick={() => navigate('/app/cards')}
            className="rounded-2xl p-4 bg-gradient-to-r from-[#17140B] via-[#241A0B] to-[#17140B] border border-akr-gold/40 shadow-md cursor-pointer hover:border-akr-gold transition-all text-left"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-akr-gold/20 text-akr-gold flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white tracking-wide">AKR EMI Card Borrowing Limit</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Available to Borrow
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-zinc-800/80 items-center">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block">Can Borrow</span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-400 font-sans">
                  {formatCurrency(Math.max(0, effectiveCreditLimit - (duesData?.totalOutstanding || 0)))}
                </span>
              </div>
              <div className="border-x border-zinc-800/80 px-2 text-center">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold block">Total Limit</span>
                <span className="text-xs sm:text-sm font-bold text-akr-gold font-sans">{formatCurrency(effectiveCreditLimit)}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold block">Active Dues</span>
                <span className="text-xs sm:text-sm font-bold text-zinc-300 font-sans">{formatCurrency(duesData?.totalOutstanding || 0)}</span>
              </div>
            </div>

            {/* Credit Capacity Bar */}
            {(() => {
              const outstanding = duesData?.totalOutstanding || 0;
              const usedPct = effectiveCreditLimit > 0 ? Math.min(100, Math.round((outstanding / effectiveCreditLimit) * 100)) : 0;
              const availPct = Math.max(0, 100 - usedPct);
              return (
                <div className="mt-2.5 space-y-1">
                  <div className="h-1.5 w-full bg-zinc-800/90 rounded-full overflow-hidden flex">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${usedPct}%` }}
                    />
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${availPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-400 pt-0.5">
                    <span>{usedPct}% used</span>
                    <span className="text-emerald-400 font-semibold">{availPct}% available to spend</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Your Dues Section (Exact Design from image copy.png with Pay Now button & clear dates) */}
        <div className="text-left space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider font-bold text-akr-text-muted flex items-center gap-1.5">
              <span>Weekly EMI Payments</span>
              {activePlansCount > 0 ? (
                <span className="text-[10px] bg-amber-500/15 text-amber-400 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                  {activePlansCount} Pending
                </span>
              ) : hasCompletedPastLoans ? (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                  0 Pending
                </span>
              ) : (
                <span className="text-[10px] bg-zinc-800 text-zinc-400 font-mono px-2 py-0.5 rounded-full border border-zinc-700">
                  0 Active
                </span>
              )}
            </h3>
            <span className="text-[11px] text-akr-gold font-medium">
              {activePlansCount > 0
                ? 'Weekly Schedule'
                : hasCompletedPastLoans
                ? 'All Dues Settled'
                : 'Store Financing'}
            </span>
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
          ) : hasCompletedPastLoans ? (
            <div className="space-y-3">
              {/* Completed past loans state */}
              <div className="p-4 rounded-2xl bg-akr-surface text-center text-xs text-zinc-400 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white text-xs">All Payments are Clear!</p>
                    <p className="text-[10px] text-zinc-400">You have successfully cleared all your assigned EMI plans.</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/25 font-bold uppercase">
                  Clear
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Brand new customer with 0 loans assigned yet */}
              <div className="p-4 rounded-2xl bg-[#141418] border border-zinc-800 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-akr-gold/15 border border-akr-gold/30 flex items-center justify-center text-akr-gold flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs">No Active Loans or EMIs</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                      {isCardApproved
                        ? `Your ${formatCurrency(effectiveCreditLimit)} EMI credit limit is ready to use in-store. EMIs will appear here once you make a purchase.`
                        : 'No EMI plans have been assigned to your account yet.'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-zinc-800/80 text-akr-gold text-[10px] font-bold border border-akr-gold/30 uppercase tracking-wider whitespace-nowrap ml-2">
                  {isCardApproved ? 'Available' : 'No Loans'}
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
                <div
                  onClick={() => navigate('/app/cards')}
                  className="rounded-2xl p-4 bg-gradient-to-r from-[#18140B] via-[#241B0E] to-[#18140B] border border-akr-gold/50 shadow-gold-glow text-left flex items-center justify-between cursor-pointer group hover:border-akr-gold transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-akr-gold to-amber-600 text-black flex items-center justify-center font-serif font-black text-xs shadow-md">
                      AKR
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-zinc-300 uppercase font-bold tracking-wider">
                          EMI Privilege Card Active
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <span className="text-sm font-bold text-akr-gold font-sans">
                        {formatCurrency(effectiveCreditLimit)} Credit Limit
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/app/cards');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-akr-gold/20 hover:bg-akr-gold/30 border border-akr-gold/40 text-akr-gold font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Card</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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
                  title={(pay?.planTypeId || '').toLowerCase().includes('card') ? 'Card Payment' : 'EMI Payment'}
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
