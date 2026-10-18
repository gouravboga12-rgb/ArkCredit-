import React, { useEffect, useState } from 'react';
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
  Monitor,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '../../store';
import { consumerApi } from '../../core/api';
import { consumerAuthService } from '../../services/consumerAuthService';
import { DuesPlan, CardType } from '../../core/types';
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
  const consumerSession = useStore((state) => state.consumerSession);
  const consumer = consumerSession?.consumer;

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<DuesPlan[]>([]);
  const [allPlans, setAllPlans] = useState<DuesPlan[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('all');
  const [activeCardIndex, setActiveCardIndex] = useState(0);

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
    ? `${Math.max(...plans.map((p) => p.tenureMonths || 0), 12)} Months`
    : `${selectedPlan?.tenureMonths || 0} Months`;

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

          {/* EMI Schedule with Plan Selector (Phone 5 in template) */}
          <div className="p-4 rounded-card bg-akr-surface border border-akr-border/80 text-left">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase font-bold text-white tracking-wider">
                EMI Schedule
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
                  <div className="text-[10px] text-zinc-400 uppercase">Next EMI</div>
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

            {/* 3 Metric Grid: Total/Remaining EMIs, EMI Amount, Loan Tenure */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-akr-border/60">
              <div>
                <span className="text-[9px] uppercase text-zinc-400 block">Remaining</span>
                <span className="text-xs font-bold text-white mt-0.5 block">
                  {displayRemaining} EMIs
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-zinc-400 block">EMI Amount</span>
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

          {/* Dues Summary (Phone 5 in template) */}
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

          {/* Your Cards Carousel (Phone 5 in template) */}
          <div className="text-left">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase font-bold text-white tracking-wider">
                Your Cards ({cards.length})
              </h3>
              <button
                type="button"
                onClick={() => navigate('/app/cards')}
                className="text-xs font-semibold text-akr-gold hover:underline"
              >
                View All
              </button>
            </div>

            {loading ? (
              <Skeleton className="h-44 w-full rounded-card" />
            ) : cards.length > 0 ? (
              <div>
                {/* Horizontal Snap Scroll Carousel */}
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
                  {cards.map((card, i) => (
                    <div
                      key={card.id}
                      className="w-[85%] flex-shrink-0 snap-center"
                      onClick={() => setActiveCardIndex(i)}
                    >
                      <div
                        className={`
                          p-4 rounded-xl border relative overflow-hidden aspect-[1.7/1] flex flex-col justify-between
                          ${
                            card.name.toLowerCase().includes('gold')
                              ? 'bg-gradient-to-tr from-[#1E1708] to-[#4A3912] border-akr-gold/50'
                              : 'bg-gradient-to-tr from-[#15171C] to-[#2B303C] border-zinc-500/40'
                          }
                        `}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-serif font-bold text-xs tracking-wider text-akr-gold">
                            AKR CREDIT CAPITAL
                          </span>
                          <span className="font-mono text-[9px] text-zinc-300">VALID 10/30</span>
                        </div>

                        <div>
                          <h4 className="font-serif text-sm font-bold text-white drop-shadow">
                            {card.name}
                          </h4>
                          <p className="font-mono text-xs text-zinc-300 tracking-widest mt-0.5">
                            •••• •••• •••• 8842
                          </p>
                        </div>

                        <div className="flex justify-between items-end">
                          <span className="text-[9px] text-zinc-300 uppercase">
                            {consumer?.name || 'Rahul Sharma'}
                          </span>
                          <span className="font-sans font-black italic text-sm text-white">
                            VISA
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Carousel Indicator Dots */}
                <div className="flex justify-center gap-1.5 mt-2">
                  {cards.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveCardIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        activeCardIndex === i ? 'w-4 bg-akr-gold' : 'bg-zinc-700'
                      }`}
                      aria-label={`Card ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            ) : null}
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

            {/* Switch to Admin Panel */}
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/60 text-akr-gold transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-akr-gold/15 text-akr-gold flex items-center justify-center">
                  <Monitor className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white">Admin Business Panel</h4>
                  <p className="text-[10px] text-zinc-400">Switch to management portal</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-akr-gold" />
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
