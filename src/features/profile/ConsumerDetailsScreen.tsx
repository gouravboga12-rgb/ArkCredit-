import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Calendar,
  CreditCard,
  User,
  Bell,
  LogOut,
  ChevronRight,
  ShieldCheck,
  FileText,
  Edit2,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useStore } from '../../store';
import { consumerApi } from '../../core/api';
import { consumerAuthService } from '../../services/consumerAuthService';
import { DuesPlan, CardType, Consumer } from '../../core/types';
import { formatCurrency, formatDisplayDate, maskAccount } from '../../core/formatters';
import {
  PageHeader,
  BottomNav,
  StatusBadge,
  Modal,
  InputField,
  GoldButton,
  Skeleton,
  Toast,
  ToastMessage,
} from '../../components/ui';

export const ConsumerDetailsScreen: React.FC = () => {
  const navigate = useNavigate();
  const consumers = useStore((state) => state.consumers);
  const consumerSession = useStore((state) => state.consumerSession);
  const cardRequests = useStore((state) => state.cardRequests);

  // Always resolve freshest consumer record from master consumers list
  const consumer = useMemo(() => {
    if (!consumerSession?.consumer) return null;
    const live = consumers.find(
      (c) => c.id === consumerSession.consumer.id || c.mobile === consumerSession.consumer.mobile
    );
    return live || consumerSession.consumer;
  }, [consumers, consumerSession]);

  // Check card requests for current user: prioritize APPROVED > PENDING > any
  const userCardRequests = useMemo(() => {
    if (!consumer) return [];
    return cardRequests.filter(
      (r) =>
        r.consumerId === consumer.id ||
        r.phone === consumer.mobile ||
        (consumer.email && r.email?.toLowerCase() === consumer.email.toLowerCase())
    );
  }, [cardRequests, consumer]);

  const approvedCardRequest = useMemo(() => {
    return userCardRequests.find((r) => r.status === 'approved') || null;
  }, [userCardRequests]);

  const pendingCardRequest = useMemo(() => {
    return userCardRequests.find((r) => r.status === 'pending') || null;
  }, [userCardRequests]);

  const userCardRequest = approvedCardRequest || pendingCardRequest || userCardRequests[0] || null;

  const isDefaultApprovedUser =
    consumer?.mobile === '9876543210' ||
    consumer?.id === 'c_rahul_4821' ||
    (consumer?.name ? consumer.name.toLowerCase().includes('rahul') : false);

  const isApproved =
    isDefaultApprovedUser ||
    consumer?.cardApproved === true ||
    approvedCardRequest !== null ||
    userCardRequest?.status === 'approved';

  const isPending =
    !isApproved &&
    (pendingCardRequest !== null || userCardRequest?.status === 'pending');

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<DuesPlan[]>([]);
  const [allPlans, setAllPlans] = useState<DuesPlan[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('all');
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const approvedLimit = approvedCardRequest?.creditLimitApproved || userCardRequest?.creditLimitApproved;
  const totalCreditLimit =
    consumer?.creditLimit && consumer.creditLimit > 0
      ? consumer.creditLimit
      : (approvedLimit && approvedLimit > 0 ? approvedLimit : 30000);

  const usedAmount = plans.reduce((sum, p) => sum + (p.outstandingAmount || 0), 0);
  const availableBalance = Math.max(0, totalCreditLimit - usedAmount);

  const maskedCardNumber =
    consumer?.cardNumber ||
    (consumer?.mobile
      ? `5123 •••• •••• ${consumer.mobile.slice(-4)}`
      : '5123 •••• •••• 8842');

  const cardholderName = (consumer?.name || 'Valued Member').toUpperCase();

  // Modals
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isFullScheduleOpen, setIsFullScheduleOpen] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState(consumer?.name || '');
  const [editEmail, setEditEmail] = useState(consumer?.email || '');
  const [editAddress, setEditAddress] = useState(consumer?.address || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Preferences toggles
  const [prefs, setPrefs] = useState({
    pushEnabled: true,
    smsEnabled: true,
    emailEnabled: true,
    emiReminders: true,
    promotionalOffers: false,
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type: 'success', message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    if ((approvedCardRequest || isDefaultApprovedUser) && consumer) {
      const targetLimit = approvedCardRequest?.creditLimitApproved || 30000;
      if (!consumer.cardApproved || consumer.creditLimit !== targetLimit) {
        const cardNum = consumer.cardNumber || `5123 •••• •••• ${consumer.mobile.slice(-4)}`;
        const updatedConsumer: Consumer = {
          ...consumer,
          cardApproved: true,
          cardStatus: 'approved',
          creditLimit: targetLimit,
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
  }, [approvedCardRequest, isDefaultApprovedUser, consumer]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [duesRes, cardsRes] = await Promise.all([
          consumerApi.getDues(),
          consumerApi.getCards(),
        ]);
        setPlans(duesRes.plans);
        setAllPlans(duesRes.allPlans);
        setCards(cardsRes);
      } catch (err) {
        console.error('Failed to load consumer profile data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [consumer?.id]);

  const handleCopyAccount = () => {
    if (consumer?.accountNumber) {
      navigator.clipboard.writeText(consumer.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast('Account number copied to clipboard');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      await consumerApi.updateProfile({
        name: editName,
        email: editEmail,
        address: editAddress,
      });
      setIsEditProfileOpen(false);
      addToast('Profile information updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = () => {
    consumerAuthService.logout();
    navigate('/app/login');
  };

  // Derive schedule view
  const isAll = selectedPlanId === 'all';
  const selectedPlan = isAll ? null : plans.find((p) => p.id === selectedPlanId);

  const displayEmiAmount = isAll
    ? plans.reduce((sum, p) => sum + p.emiAmount, 0)
    : selectedPlan?.emiAmount || 0;

  const displayNextDate = isAll
    ? plans[0]?.nextEmiDate || ''
    : selectedPlan?.nextEmiDate || '';

  const displayRemaining = isAll
    ? plans.reduce((sum, p) => sum + p.remainingEmis, 0)
    : selectedPlan?.remainingEmis || 0;

  const displayTenure = isAll
    ? `${Math.max(...plans.map((p) => p.tenureWeeks || p.tenureMonths || 0), plans.length > 0 ? 12 : 0)} Weeks`
    : `${selectedPlan?.tenureWeeks || selectedPlan?.tenureMonths || 0} Weeks`;

  const totalOutstanding = plans.reduce((sum, p) => sum + p.outstandingAmount, 0);

  return (
    <div className="flex-1 flex flex-col justify-between bg-akr-bg text-white pb-28 relative overflow-y-auto">
      <div>
        <PageHeader title="Consumer Details" showBack={false} />

        <div className="p-4 space-y-4">
          {/* Account Block (Phone 5 in template) */}
          <div className="p-5 rounded-card bg-akr-surface border border-akr-border/90 shadow-card-dark text-left relative overflow-hidden">
            {/* Gold Wave Accent Graphic */}
            <div className="absolute top-0 right-0 w-44 h-full pointer-events-none opacity-20 overflow-hidden">
              <svg viewBox="0 0 200 150" className="w-full h-full fill-none stroke-akr-gold stroke-1">
                <path d="M50 0 C 80 50, 120 80, 200 120" />
                <path d="M10 0 C 60 70, 100 90, 200 150" />
                <path d="M80 0 C 110 40, 150 70, 200 90" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-akr-text-muted tracking-wider">
                  Account Number
                </span>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="flex items-center gap-1 text-[11px] text-akr-gold hover:text-akr-gold-light transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="font-mono text-xl font-bold tracking-widest text-white mb-4">
                {maskAccount(consumer?.accountNumber)}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-akr-text-muted tracking-wider block">
                  Account Holder
                </span>
                <div className="text-sm font-bold text-white mt-0.5">
                  {consumer?.name || 'Rahul Sharma'}
                </div>
              </div>
            </div>
          </div>

          {/* EMI Schedule & Dues Summary */}
          {plans.length > 0 ? (
            <>
              {/* EMI Schedule with Plan Selector */}
              <div className="p-4 rounded-card bg-akr-surface border border-akr-border/80 text-left">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase font-bold text-white tracking-wider">
                    Weekly EMI Schedule
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsFullScheduleOpen(true)}
                    className="text-xs font-semibold text-akr-gold hover:underline"
                  >
                    View All
                  </button>
                </div>

                {/* Plan Selector Filter */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      selectedPlanId === 'all'
                        ? 'bg-akr-gold text-black'
                        : 'bg-akr-bg text-zinc-400 border border-akr-border'
                    }`}
                  >
                    Combined Summary
                  </button>
                  {plans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                        selectedPlanId === p.id
                          ? 'bg-akr-gold text-black'
                          : 'bg-akr-bg text-zinc-400 border border-akr-border'
                      }`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>

                {/* Next EMI pill row */}
                <div className="p-3 rounded-xl bg-akr-bg border border-akr-border/60 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-akr-gold/15 text-akr-gold flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase">Next Weekly EMI</div>
                      <div className="text-sm font-bold text-white font-sans">
                        {displayEmiAmount > 0 ? formatCurrency(displayEmiAmount) : 'No EMI'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <StatusBadge status="Due Soon" size="sm" />
                    <div className="text-[10px] text-zinc-400 mt-1">
                      {displayNextDate ? formatDisplayDate(displayNextDate) : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* 3 Metric Grid */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-akr-border/60">
                  <div>
                    <span className="text-[9px] uppercase text-zinc-400 block">Remaining</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">
                      {displayRemaining} Weeks
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-zinc-400 block">Weekly EMI</span>
                    <span className="text-xs font-bold text-akr-gold mt-0.5 block">
                      {formatCurrency(displayEmiAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-zinc-400 block">Tenure</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">
                      {displayTenure}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dues Summary */}
              <div className="p-4 rounded-card bg-akr-surface border border-akr-border/80 text-left">
                <h3 className="text-xs uppercase font-bold text-white tracking-wider mb-3">
                  Dues Summary
                </h3>

                <div className="flex items-center justify-between pb-3 border-b border-akr-border/60">
                  <div>
                    <span className="text-[10px] uppercase text-zinc-400 block">Total Outstanding</span>
                    <span className="text-xl font-bold text-white font-sans">
                      {formatCurrency(totalOutstanding)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-zinc-400 block">Next Due</span>
                    <span className="text-xs font-semibold text-white">
                      {displayNextDate ? formatDisplayDate(displayNextDate) : 'N/A'}
                    </span>
                    <div className="mt-1 flex justify-end">
                      <StatusBadge status="Due Soon" size="sm" />
                    </div>
                  </div>
                </div>

                {/* Per-plan list */}
                <div className="pt-3 space-y-2">
                  {plans.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-zinc-200 truncate">{p.title}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">Ref: {p.referenceNumber}</p>
                      </div>
                      <span className="font-bold text-akr-gold flex-shrink-0">
                        {formatCurrency(p.outstandingAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Clean 0 Dues State */
            <div className="p-4 rounded-card bg-akr-surface border border-akr-border/80 text-left space-y-2">
              <h3 className="text-xs uppercase font-bold text-white tracking-wider">
                Dues Summary
              </h3>
              <div className="p-4 rounded-xl bg-akr-bg border border-zinc-800 text-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-1.5 opacity-90" />
                <p className="font-bold text-white text-xs">No Active Loan or EMI Dues</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Your account is completely clear. Apply for your EMI Privilege Card to finance silk sarees and store purchases!
                </p>
              </div>
            </div>
          )}

          {/* AKR EMI Privilege Card (Matches CardsScreen) */}
          <div className="text-left space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-bold text-white tracking-wider flex items-center gap-1.5">
                <span>EMI Privilege Card</span>
                {isApproved && (
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Active
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => navigate('/app/cards')}
                className="text-xs font-semibold text-akr-gold hover:underline flex items-center gap-1"
              >
                <span>{isApproved ? 'Manage Card' : 'Card Details'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Visual Single All-in-One EMI Privilege Card */}
            <div
              onClick={() => navigate('/app/cards')}
              className="relative w-full min-h-[220px] sm:min-h-[240px] aspect-[1.48/1] max-w-md mx-auto rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-2xl bg-gradient-to-tr from-[#141008] via-[#2A1F0B] to-[#4A3714] border border-[#D4AF37]/60 cursor-pointer group hover:border-akr-gold transition-all"
            >
              {/* Metallic Sheen Overlay */}
              <div className="absolute inset-0 bg-gold-card-sheen opacity-70 pointer-events-none" />

              {/* Card Top: Branding & Chip */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-akr-gold via-amber-400 to-akr-gold-dark text-black flex items-center justify-center font-serif font-black text-xs sm:text-sm shadow-md">
                    AKR
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-serif font-bold text-xs sm:text-sm tracking-wider text-[#F3D98B] leading-tight">
                      AKR CREDIT CAPITAL
                    </span>
                    <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-zinc-300">
                      Store EMI Privilege Card
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Pill on Card */}
                  {isApproved ? (
                    <span className="flex items-center gap-1.5 text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ACTIVE
                    </span>
                  ) : isPending ? (
                    <span className="flex items-center gap-1 text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Clock className="w-2.5 h-2.5" />
                      IN REVIEW
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full bg-akr-gold/20 text-akr-gold-light border border-akr-gold/40">
                      <Sparkles className="w-2.5 h-2.5" />
                      PRE-APPROVED
                    </span>
                  )}

                  {/* Golden EMV Chip */}
                  <div className="w-8 h-6 sm:w-9 sm:h-7 rounded bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-600/70 flex items-center justify-center opacity-95 shadow-inner">
                    <div className="w-6 h-4 sm:w-7 sm:h-5 border border-amber-700/60 rounded-xs" />
                  </div>
                </div>
              </div>

              {/* Card Middle: Title & Masked Number */}
              <div className="relative z-10 flex items-center justify-between my-auto py-1">
                <div>
                  <div className="text-[7.5px] sm:text-[8.5px] uppercase tracking-widest text-amber-200/80 font-mono mb-0.5">
                    EMI CARD NUMBER
                  </div>
                  <p className="text-sm sm:text-lg text-white font-mono font-bold tracking-widest drop-shadow">
                    {isApproved ? maskedCardNumber : '•••• •••• •••• ••••'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[7px] sm:text-[8px] uppercase tracking-wider text-zinc-400 block font-mono">
                    CARDHOLDER
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold font-mono tracking-wide text-white drop-shadow block">
                    {cardholderName}
                  </span>
                  <span className="text-[7.5px] text-zinc-300 font-mono">
                    VALID THRU 11/29
                  </span>
                </div>
              </div>

              {/* Card Bottom: Integrated Dashboard Panel on the face of the card */}
              {isApproved ? (
                <div className="relative z-10 rounded-xl p-2.5 bg-black/65 backdrop-blur-md border border-akr-gold/40 shadow-inner">
                  <div className="grid grid-cols-3 gap-1.5 items-center">
                    <div className="text-left">
                      <span className="text-[7.5px] sm:text-[8px] text-zinc-400 uppercase font-bold tracking-wider block">
                        Credit Limit
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-akr-gold font-sans tracking-tight">
                        {formatCurrency(totalCreditLimit)}
                      </span>
                    </div>

                    <div className="text-center border-x border-zinc-700/60 px-1">
                      <span className="text-[7.5px] sm:text-[8px] text-zinc-400 uppercase font-bold tracking-wider block">
                        Available Balance
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-400 font-sans tracking-tight">
                        {formatCurrency(availableBalance)}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-between text-[7.5px] sm:text-[8px] text-zinc-400 font-mono mb-0.5">
                        <span>Used:</span>
                        <span className="font-bold text-white">{formatCurrency(usedAmount)}</span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-zinc-800 border border-zinc-700/60 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-akr-gold rounded-full"
                          style={{ width: `${Math.max(usedAmount > 0 ? 5 : 0, totalCreditLimit > 0 ? (usedAmount / totalCreditLimit) * 100 : 0)}%` }}
                        />
                      </div>
                      <span className="text-[7px] text-amber-300/90 font-medium block mt-0.5">
                        0% Weekly EMI
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex items-center justify-between text-[9px] text-amber-200/90 font-medium pt-1">
                  <span>AKR Store Privilege Financing</span>
                  <span>0% Interest Weekly EMIs</span>
                </div>
              )}
            </div>

            {isPending && (
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between text-xs">
                <span className="text-amber-300">Application submitted • In review by admin</span>
                <button
                  type="button"
                  onClick={() => navigate('/app/cards')}
                  className="text-akr-gold font-bold hover:underline"
                >
                  View Status
                </button>
              </div>
            )}

            {!isApproved && !isPending && (
              <div className="p-3.5 rounded-xl bg-akr-surface border border-akr-gold/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-akr-gold uppercase font-bold block">Pre-Approved Limit</span>
                  <span className="text-xs font-bold text-white">Up to ₹50,000 – ₹1,00,000</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app/cards')}
                  className="px-3 py-1.5 rounded-lg bg-akr-gold text-black font-bold text-xs hover:bg-akr-gold-light transition-all shadow-md flex items-center gap-1 cursor-pointer"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Profile & Notifications Navigation Links (Phone 5 in template) */}
          <div className="p-2 rounded-card bg-akr-surface border border-akr-border/80 text-left space-y-1">
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(true)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-akr-bg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white">Profile Information</h4>
                  <p className="text-[10px] text-zinc-400">Edit name, email, and billing address</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => setIsPreferencesOpen(true)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-akr-bg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white">Notification Preferences</h4>
                  <p className="text-[10px] text-zinc-400">Push, SMS, and EMI payment alerts</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-950/20 text-red-400 transition-colors pt-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-950/40 text-red-400 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold">Sign Out</h4>
                  <p className="text-[10px] text-red-400/80">Log out of your AKR consumer account</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <Modal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit Profile Information"
      >
        <form onSubmit={handleSaveProfile} className="space-y-3.5 text-left">
          <InputField
            label="Full Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <InputField
            label="Email Address"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
          />

          <InputField
            label="10-Digit Mobile (Read-Only)"
            value={consumer?.mobile || ''}
            readOnly
            hint="Mobile number is tied to KYC and cannot be altered online"
          />

          <InputField
            label="Account Number (Read-Only)"
            value={consumer?.accountNumber || ''}
            readOnly
          />

          <InputField
            label="Residential Address"
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
            required
          />

          <div className="pt-3">
            <GoldButton type="submit" isLoading={isSavingProfile}>
              Save Profile Changes
            </GoldButton>
          </div>
        </form>
      </Modal>

      {/* Notification Preferences Modal */}
      <Modal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        title="Notification Preferences"
      >
        <div className="space-y-3 text-left">
          <label className="flex items-center justify-between p-3 rounded-xl bg-akr-bg border border-akr-border">
            <div>
              <span className="text-xs font-bold text-white block">Push Notifications</span>
              <span className="text-[10px] text-zinc-400">Receive in-app alerts and announcements</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.pushEnabled}
              onChange={(e) => setPrefs({ ...prefs, pushEnabled: e.target.checked })}
              className="w-4 h-4 accent-akr-gold"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-akr-bg border border-akr-border">
            <div>
              <span className="text-xs font-bold text-white block">SMS Reminders</span>
              <span className="text-[10px] text-zinc-400">Receive SMS text 3 days before due date</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.smsEnabled}
              onChange={(e) => setPrefs({ ...prefs, smsEnabled: e.target.checked })}
              className="w-4 h-4 accent-akr-gold"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-akr-bg border border-akr-border">
            <div>
              <span className="text-xs font-bold text-white block">Monthly Statements via Email</span>
              <span className="text-[10px] text-zinc-400">Detailed repayment statement on 1st of month</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.emailEnabled}
              onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })}
              className="w-4 h-4 accent-akr-gold"
            />
          </label>

          <GoldButton
            onClick={() => {
              setIsPreferencesOpen(false);
              addToast('Preferences saved successfully');
            }}
          >
            Save Preferences
          </GoldButton>
        </div>
      </Modal>

      {/* Full EMI Schedule Modal ("View All") */}
      <Modal
        isOpen={isFullScheduleOpen}
        onClose={() => setIsFullScheduleOpen(false)}
        title="Full EMI Repayment Schedule"
        maxWidth="lg"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-zinc-400">
            Complete schedule of paid and upcoming EMI installments across all active and cleared loans.
          </p>

          <div className="space-y-3">
            {allPlans.map((p) => (
              <div key={p.id} className="p-3.5 rounded-xl bg-akr-bg border border-akr-border/80">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-white">{p.title}</h4>
                    <p className="text-[10px] text-zinc-400 font-mono">Ref: {p.referenceNumber}</p>
                  </div>
                  <StatusBadge status={p.status === 'active' ? 'Active' : 'Closed'} size="sm" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-zinc-800">
                  <div>
                    <span className="text-[9px] uppercase text-zinc-500">EMI</span>
                    <span className="font-bold text-white block">{formatCurrency(p.emiAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-zinc-500">Paid / Total</span>
                    <span className="font-bold text-white block">
                      {p.totalEmis - p.remainingEmis} / {p.totalEmis}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-zinc-500">Next Date</span>
                    <span className="font-bold text-akr-gold-light block">
                      {p.nextEmiDate ? formatDisplayDate(p.nextEmiDate) : 'Cleared'}
                    </span>
                  </div>
                </div>

                {p.status === 'active' && p.outstandingAmount > 0 && (
                  <div className="pt-2 mt-2 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">
                      Balance: <strong className="text-white">{formatCurrency(p.outstandingAmount)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFullScheduleOpen(false);
                        navigate(`/app/pay?planId=${p.id}`);
                      }}
                      className="bg-akr-gold text-black px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-akr-gold-light transition-all flex items-center gap-1 active:scale-95 shadow-md"
                    >
                      <span>Pay Now ({formatCurrency(p.emiAmount > 0 ? p.emiAmount : p.outstandingAmount)})</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Floating Toast */}
      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <BottomNav />
    </div>
  );
};
