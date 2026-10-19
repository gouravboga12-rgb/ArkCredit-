import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Check,
  Info,
  FileCheck,
  ArrowRight,
  CreditCard,
  Layers,
  Lock,
  Clock,
  CheckCircle2,
  TrendingDown,
  Calendar,
  ExternalLink,
  Receipt,
  Landmark,
  Wallet,
} from 'lucide-react';
import { consumerApi } from '../../core/api';
import { CardType, CardRequest, DuesPlan, Consumer } from '../../core/types';
import { formatCurrency, formatDisplayDate } from '../../core/formatters';
import { useStore } from '../../store';
import {
  PageHeader,
  BottomNav,
  Modal,
  Skeleton,
  Toast,
  ToastMessage,
  GoldButton,
  StatusBadge,
} from '../../components/ui';
import { CardApplicationModal } from './CardApplicationModal';

export const CardsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<CardRequest | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Store data
  const consumers = useStore((state) => state.consumers);
  const consumerSession = useStore((state) => state.consumerSession);
  const duesPlans = useStore((state) => state.duesPlans);
  const cardRequests = useStore((state) => state.cardRequests);

  // Always resolve freshest consumer record from master consumers list
  const consumer = useMemo(() => {
    if (!consumerSession?.consumer) return null;
    const live = consumers.find(
      (c) => c.id === consumerSession.consumer.id || c.mobile === consumerSession.consumer.mobile
    );
    return live || consumerSession.consumer;
  }, [consumers, consumerSession]);

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

  const addToast = (message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type: 'success', message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    async function fetchCards() {
      try {
        setLoading(true);
        const data = await consumerApi.getCards();
        setCards(data);
      } catch (err) {
        console.error('Failed to load cards', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCards();
  }, []);

  // Single EMI Card definition
  const singleCard: CardType = cards[0] || {
    id: 'card_emi_privilege',
    name: 'AKR EMI Privilege Card',
    imageUrl: 'https://images.unsplash.com/photo-1589758438368-0ad531db3366?auto=format&fit=crop&w=600&q=80',
    features: [
      'Flexible Limit: Up to ₹50,000 / ₹1,00,000',
      '0% Interest on Silk Sarees & Store Purchases',
      'Convenient Weekly EMI Repayment Cycles',
      'Zero Hidden Charges & Instant Store Approval',
    ],
    benefits: [
      'Pre-approved credit limit customized to your retail purchase needs',
      'Direct store financing for bridal sarees, handlooms, and jewellery',
      'Pay in flexible 4 to 26 weekly installments at 0% APR on-time',
      'Transparent tracking of used limit, paid weeks, and remaining dues',
    ],
    charges: {
      joiningFee: 0,
      annualFee: 0,
      interestRate: '0% APR (On-Time)',
    },
    enabled: true,
  };

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

  // Card Approval State
  const isApproved =
    isDefaultApprovedUser ||
    consumer?.cardApproved === true ||
    approvedCardRequest !== null ||
    userCardRequest?.status === 'approved';

  const isPending =
    !isApproved &&
    (pendingCardRequest !== null || userCardRequest?.status === 'pending');

  // Active dues plans linked to consumer
  const activePlans = useMemo(() => {
    if (!consumer) return [];
    return duesPlans.filter((p) => p.consumerId === consumer.id && p.status === 'active');
  }, [duesPlans, consumer]);

  // Financial Calculations
  const approvedLimit = approvedCardRequest?.creditLimitApproved || userCardRequest?.creditLimitApproved;
  const totalCreditLimit =
    consumer?.creditLimit && consumer.creditLimit > 0
      ? consumer.creditLimit
      : (approvedLimit && approvedLimit > 0 ? approvedLimit : 30000);

  const usedAmount = activePlans.reduce((sum, p) => sum + (p.outstandingAmount || 0), 0);
  const availableBalance = Math.max(0, totalCreditLimit - usedAmount);
  const utilizationRate = totalCreditLimit > 0 ? Math.min(100, Math.round((usedAmount / totalCreditLimit) * 100)) : 0;

  const handleApplicationSuccess = (req: CardRequest) => {
    setSubmittedRequest(req);
    setIsApplicationModalOpen(false);
    addToast(`EMI Card application submitted! Ref: ${req.referenceNumber}`);
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

  const maskedCardNumber =
    consumer?.cardNumber ||
    (consumer?.mobile
      ? `5123 •••• •••• ${consumer.mobile.slice(-4)}`
      : '5123 •••• •••• 8842');

  const cardholderName = (consumer?.name || 'Valued Member').toUpperCase();

  return (
    <div className="flex-1 flex flex-col justify-between bg-akr-bg text-white pb-28 relative overflow-y-auto">
      <div>
        <PageHeader title="EMI Card" showBack={false} />

        <div className="p-4 space-y-4 text-left">
          {/* Header Title */}
          <div>
            <h2 className="text-base font-serif font-bold text-white flex items-center gap-1.5">
              <span>AKR EMI Privilege Card</span>
              <Sparkles className="w-4 h-4 text-akr-gold" />
            </h2>
            <p className="text-xs text-akr-text-muted mt-0.5">
              Your unified credit limit for instant silk sarees, bridal wear, and store product EMIs.
            </p>
          </div>

          {loading ? (
            <Skeleton className="h-60 w-full rounded-card" />
          ) : (
            <div className="space-y-4">
              {/* Visual Single EMI Card */}
              {/* Visual Single All-in-One EMI Privilege Card */}
              <div className="relative w-full min-h-[240px] sm:min-h-[260px] aspect-[1.48/1] max-w-md mx-auto rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-2xl bg-gradient-to-tr from-[#141008] via-[#2A1F0B] to-[#4A3714] border border-[#D4AF37]/60 group">
                {/* Decorative Metallic Sheen Overlay */}
                <div className="absolute inset-0 bg-gold-card-sheen opacity-70 pointer-events-none" />

                {/* Card Top: Branding & Chip & Status Pill */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-akr-gold via-amber-400 to-akr-gold-dark text-black flex items-center justify-center font-serif font-black text-sm shadow-md">
                      AKR
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-serif font-bold text-sm sm:text-base tracking-wider text-[#F3D98B] leading-tight">
                        AKR CREDIT CAPITAL
                      </span>
                      <span className="text-[7.5px] sm:text-[8px] uppercase tracking-widest text-zinc-300">
                        Store EMI Privilege Card
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Pill on Card */}
                    {isApproved ? (
                      <span className="flex items-center gap-1.5 text-[8.5px] sm:text-[9.5px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ACTIVE
                      </span>
                    ) : isPending ? (
                      <span className="flex items-center gap-1.5 text-[8.5px] sm:text-[9.5px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                        <Clock className="w-2.5 h-2.5" />
                        IN REVIEW
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[8.5px] sm:text-[9.5px] font-bold px-2.5 py-0.5 rounded-full bg-akr-gold/20 text-akr-gold-light border border-akr-gold/40 backdrop-blur-md">
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

                {/* Card Middle: Card Number & Cardholder */}
                <div className="relative z-10 flex items-center justify-between my-auto py-1">
                  <div>
                    <div className="text-[8px] sm:text-[9px] uppercase tracking-widest text-amber-200/80 font-mono mb-0.5">
                      EMI CARD NUMBER
                    </div>
                    <p className="text-base sm:text-xl text-white font-mono font-bold tracking-widest drop-shadow">
                      {isApproved ? maskedCardNumber : '•••• •••• •••• ••••'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[7.5px] sm:text-[8px] uppercase tracking-wider text-zinc-400 block font-mono">
                      CARDHOLDER
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono tracking-wide text-white drop-shadow block">
                      {cardholderName}
                    </span>
                    <span className="text-[8px] text-zinc-300 font-mono">
                      VALID THRU 11/29
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Integrated Dashboard Panel on the face of the card */}
                {isApproved ? (
                  <div className="relative z-10 rounded-xl p-2.5 sm:p-3 bg-black/65 backdrop-blur-md border border-akr-gold/40 shadow-inner">
                    <div className="grid grid-cols-3 gap-2 items-center">
                      {/* Credit Limit */}
                      <div className="text-left">
                        <span className="text-[8px] sm:text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">
                          Credit Limit
                        </span>
                        <span className="text-xs sm:text-base font-bold text-akr-gold font-sans tracking-tight">
                          {formatCurrency(totalCreditLimit)}
                        </span>
                      </div>

                      {/* Available Balance */}
                      <div className="text-center border-x border-zinc-700/60 px-1">
                        <span className="text-[8px] sm:text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">
                          Available Balance
                        </span>
                        <span className="text-xs sm:text-base font-bold text-emerald-400 font-sans tracking-tight">
                          {formatCurrency(availableBalance)}
                        </span>
                      </div>

                      {/* Used Amount & Meter */}
                      <div className="text-right">
                        <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-zinc-400 font-mono mb-1">
                          <span>Used:</span>
                          <span className="font-bold text-white">{formatCurrency(usedAmount)}</span>
                        </div>
                        {/* Slim Usage Bar */}
                        <div className="w-full h-1.5 rounded-full bg-zinc-800 border border-zinc-700/60 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-akr-gold rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(usedAmount > 0 ? 5 : 0, utilizationRate)}%` }}
                          />
                        </div>
                        <span className="text-[7.5px] sm:text-[8px] text-amber-300/90 font-medium tracking-tight block mt-1">
                          0% Interest Weekly EMI
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 flex items-center justify-between text-[10px] text-amber-200/90 font-medium pt-1">
                    <span>AKR Store Privilege Financing</span>
                    <span>0% Interest Weekly EMIs</span>
                  </div>
                )}
              </div>

              {/* CARD STATUS & CONTROLS SECTION */}
              {isApproved ? (
                /* APPROVED STATE: Card Controls & Active EMIs */
                <div className="space-y-4">
                  {/* Card In-Store Security & Usage Controls */}
                  <div className="p-4 rounded-card bg-akr-surface border border-akr-border/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-akr-text-muted flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-akr-gold" />
                        <span>Card Security & In-Store Controls</span>
                      </h4>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                        Protected
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-akr-bg border border-akr-border/60 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white text-[11px]">In-Store Purchases</p>
                          <p className="text-[9px] text-zinc-400">Silk sarees & retail</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400">Active</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-akr-bg border border-akr-border/60 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white text-[11px]">Contactless Tap</p>
                          <p className="text-[9px] text-zinc-400">Store POS machine tap</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400">Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Active EMIs using this card */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-akr-text-muted flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-akr-gold" />
                        <span>Active EMIs on this Card</span>
                      </h4>
                      <button
                        onClick={() => navigate('/app/pay')}
                        className="text-[11px] font-bold text-akr-gold hover:underline cursor-pointer"
                      >
                        Pay EMI Now
                      </button>
                    </div>

                    {activePlans.length > 0 ? (
                      <div className="space-y-2">
                        {activePlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="p-3.5 rounded-xl bg-akr-surface border border-akr-border/60 flex items-center justify-between hover:border-akr-gold/40 transition-colors"
                          >
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-white block">
                                {plan.title}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                <span>Ref: {plan.referenceNumber}</span>
                                <span>•</span>
                                <span>Due: {formatDisplayDate(plan.nextEmiDate)}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-akr-gold block">
                                {formatCurrency(plan.emiAmount)} /wk
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {plan.remainingEmis} wks left • Bal: {formatCurrency(plan.outstandingAmount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-akr-surface border border-akr-border/60 text-center text-xs text-zinc-400">
                        No active EMIs currently. Your full limit of {formatCurrency(totalCreditLimit)} is available for transactions!
                      </div>
                    )}
                  </div>
                </div>
              ) : isPending ? (
                /* PENDING APPROVAL STATE */
                <div className="p-4 rounded-card bg-akr-surface border border-amber-500/40 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Application Under Verification
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Your application for the AKR EMI Privilege Card is currently being verified by the admin team.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#141418] border border-zinc-800 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Reference Number:</span>
                      <span className="font-bold text-akr-gold">{userCardRequest?.referenceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Applicant:</span>
                      <span className="text-white">{userCardRequest?.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Status:</span>
                      <span className="text-amber-400 font-bold uppercase">Pending Admin Approval</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500">
                    Once the admin verifies your KYC and sets your credit limit, your card will become immediately active here.
                  </p>
                </div>
              ) : (
                /* NOT APPLIED STATE: Apply Now Banner & Limit Range */
                <div className="p-4 rounded-card bg-akr-surface border border-akr-gold/40 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-akr-gold block">
                        Pre-Approved Credit Range
                      </span>
                      <h3 className="text-lg font-bold text-white mt-0.5">
                        Up to ₹50,000 – ₹1,00,000 Limit
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Apply in less than 2 minutes. Instant verification and approval by AKR Credit Capital.
                      </p>
                    </div>
                  </div>

                  {/* Highlights */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Zero joining fee & zero annual maintenance charges</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Direct in-store financing for bridal sarees, handlooms & jewellery</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Flexible 4, 6, 8, 10, 12 to 26 weekly installments at 0% APR on-time</span>
                      </div>
                    </div>

                  {/* Apply Now Button */}
                  <GoldButton
                    onClick={() => setIsApplicationModalOpen(true)}
                    className="w-full py-3.5 flex items-center justify-center gap-2 text-sm font-bold shadow-gold-glow"
                  >
                    <span>Apply Now for EMI Card</span>
                    <ArrowRight className="w-4 h-4" />
                  </GoldButton>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Application Modal */}
      <CardApplicationModal
        card={singleCard}
        isOpen={isApplicationModalOpen}
        onClose={() => setIsApplicationModalOpen(false)}
        onSuccess={handleApplicationSuccess}
      />

      {/* Celebratory Application Submitted Confirmation Modal */}
      {submittedRequest && (
        <Modal
          isOpen={!!submittedRequest}
          onClose={() => setSubmittedRequest(null)}
          title="Application Submitted! 🎉"
          maxWidth="sm"
        >
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <FileCheck className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Application Received Successfully
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Your request for <strong className="text-akr-gold">{submittedRequest.cardTypeName}</strong> has been
                routed to the AKR Credit Capital Admin verification queue.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141418] border border-zinc-800 text-xs space-y-1.5 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Ref Number:</span>
                <span className="font-bold text-akr-gold">{submittedRequest.referenceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Applicant:</span>
                <span className="text-white">{submittedRequest.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">PAN Card:</span>
                <span className="text-white">{submittedRequest.panNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Status:</span>
                <span className="text-amber-400 font-bold uppercase">Pending Admin Review</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500">
              The admin team will verify your KYC documents and determine your credit limit shortly.
            </p>

            <button
              type="button"
              onClick={() => setSubmittedRequest(null)}
              className="w-full py-2.5 rounded-xl bg-akr-gold text-black font-bold text-xs hover:bg-akr-gold-light transition-all shadow-md cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        </Modal>
      )}

      {/* Floating Toast */}
      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <BottomNav />
    </div>
  );
};
