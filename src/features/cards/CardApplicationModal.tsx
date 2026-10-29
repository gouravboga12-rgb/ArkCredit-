import React, { useState } from 'react';
import {
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  FileCheck,
  X,
} from 'lucide-react';
import { CardType, CardRequest } from '../../core/types';
import { consumerApi } from '../../core/api';
import { useStore } from '../../store';
import { Modal, GoldButton, InputField } from '../../components/ui';

interface CardApplicationModalProps {
  card: CardType | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (request: CardRequest) => void;
}

export const CardApplicationModal: React.FC<CardApplicationModalProps> = ({
  card,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const consumerSession = useStore((state) => state.consumerSession);
  const consumer = consumerSession?.consumer;

  // Form State
  const [fullName, setFullName] = useState(consumer?.name || '');
  const [phone, setPhone] = useState(consumer?.mobile || '');
  const [email, setEmail] = useState(consumer?.email || '');
  const [address, setAddress] = useState(consumer?.address || '');
  const [panNumber, setPanNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('65000');
  const [panDocName, setPanDocName] = useState<string>('PAN_Document_Self.pdf');
  const [panDocData, setPanDocData] = useState<string>(
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!card) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPanDocName(file.name);
      // Read data URL for preview
      const reader = new FileReader();
      reader.onload = () => {
        setPanDocData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const useSamplePan = () => {
    setPanDocName('Official_PAN_Card_Sample.pdf');
    setPanDocData(
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please provide your full legal name as per PAN card.');
      return;
    }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!address.trim() || address.trim().length < 6) {
      setError('Please provide a complete residential/communication address.');
      return;
    }
    const cleanPan = panNumber.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      setError('Please enter a valid 10-character PAN card number (e.g. ABCDE1234F).');
      return;
    }
    const cleanAadhar = aadharNumber.trim().replace(/\s/g, '');
    if (!/^\d{12}$/.test(cleanAadhar)) {
      setError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (!panDocName) {
      setError('Please upload your PAN card document or attach a sample.');
      return;
    }

    try {
      setSubmitting(true);
      const req = await consumerApi.submitCardRequest({
        consumerId: consumer?.id,
        cardTypeId: card.id,
        cardTypeName: card.name,
        fullName: fullName.trim(),
        phone: cleanPhone,
        email: email.trim() || undefined,
        address: address.trim(),
        panNumber: cleanPan,
        aadharNumber: cleanAadhar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3'),
        panDocName,
        panDocData,
        monthlyIncome: monthlyIncome ? Number(monthlyIncome) : undefined,
      });

      onSuccess(req);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit card application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Card Application & Inquiry" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Selected Card Banner */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-[#1E1708] via-[#2A200B] to-[#141418] border border-akr-gold/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-akr-gold/20 text-akr-gold flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-akr-gold tracking-wider block">
                Selected Privilege Card
              </span>
              <h3 className="text-sm font-bold text-white">{card.name}</h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 block uppercase">Annual Fee</span>
            <span className="text-xs font-bold text-akr-gold">
              {card.charges.annualFee === 0 ? 'FREE' : `₹${card.charges.annualFee}/yr`}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Basic Applicant Details */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-zinc-400">
            <User className="w-3.5 h-3.5 text-akr-gold" />
            <span>1. Personal & Contact Details</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Full Name (as on PAN) *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name as per Aadhaar"
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-akr-gold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                10-Digit Mobile Number *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                maxLength={10}
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-akr-gold font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@example.com"
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-akr-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Monthly Net Income (₹)
              </label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="e.g. 75000"
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-akr-gold font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Residential / Card Delivery Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Flat/House No., Street, Landmark, City & Pincode"
              className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-akr-gold"
              required
            />
          </div>
        </div>

        {/* Section 2: KYC & Government Identifiers */}
        <div className="space-y-3 pt-2 border-t border-zinc-800">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. Government KYC Identifiers</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                PAN Card Number *
              </label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-akr-gold font-mono uppercase tracking-wider"
                required
              />
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Format: 5 letters, 4 numbers, 1 letter</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                12-Digit Aadhaar Number *
              </label>
              <input
                type="text"
                value={aadharNumber}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
                  const formatted = raw.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (m, p1, p2, p3) =>
                    [p1, p2, p3].filter(Boolean).join(' ')
                  );
                  setAadharNumber(formatted);
                }}
                placeholder="4821 9920 1823"
                maxLength={14}
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-akr-gold font-mono tracking-wider"
                required
              />
              <span className="text-[10px] text-zinc-500 mt-0.5 block">12 digits government Aadhaar ID</span>
            </div>
          </div>
        </div>

        {/* Section 3: PAN Upload */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-zinc-400 uppercase">
              Upload PAN Card Document (Image or PDF) *
            </label>
            <button
              type="button"
              onClick={useSamplePan}
              className="text-[11px] text-akr-gold hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Use Sample PAN Document</span>
            </button>
          </div>

          <div className="border-2 border-dashed border-zinc-700 hover:border-akr-gold/60 rounded-xl p-4 text-center bg-[#151518] transition-colors relative">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Upload PAN Card Document"
            />
            {panDocName ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <FileCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">{panDocName}</span>
                  <span className="text-[10px] text-zinc-400">Document attached & ready for admin verification</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-zinc-300">
                  Click or drag PAN document here to upload
                </p>
                <p className="text-[10px] text-zinc-500">Supported formats: JPG, PNG, PDF up to 5MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Notice of IST Timings & Redirection */}
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-akr-gold flex-shrink-0 mt-0.5" />
          <span>
            Upon submission, your application will be routed to the AKR Credit Capital Admin team under the{' '}
            <strong className="text-white">Card Requests</strong> portal for verification and card dispatch.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <GoldButton type="submit" isLoading={submitting}>
            Submit Card Application
          </GoldButton>
        </div>
      </form>
    </Modal>
  );
};
