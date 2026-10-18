import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, Check, Info, FileCheck, ArrowRight } from 'lucide-react';
import { consumerApi } from '../../core/api';
import { CardType, CardRequest } from '../../core/types';
import { PageHeader, BottomNav, CardTypeCard, Modal, Skeleton, Toast, ToastMessage, GoldButton } from '../../components/ui';
import { CardApplicationModal } from './CardApplicationModal';

export const CardsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [enquiringCard, setEnquiringCard] = useState<CardType | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<CardRequest | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  const handleOpenApplication = (card: CardType) => {
    setSelectedCard(null);
    setEnquiringCard(card);
  };

  const handleApplicationSuccess = (req: CardRequest) => {
    setSubmittedRequest(req);
    addToast(`Card application submitted! Reference: ${req.referenceNumber}`);
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-akr-bg text-white pb-28 relative overflow-y-auto">
      <div>
        <PageHeader title="Credit Cards" showBack={false} />

        <div className="p-4 space-y-4">
          <div className="text-left mb-2">
            <h2 className="text-base font-serif font-bold text-white flex items-center gap-1.5">
              <span>Exclusive AKR Privilege Cards</span>
              <Sparkles className="w-4 h-4 text-akr-gold" />
            </h2>
            <p className="text-xs text-akr-text-muted mt-0.5">
              Curated cards designed for exceptional travel, rewards, and everyday financial power.
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-card" />
              <Skeleton className="h-64 w-full rounded-card" />
            </div>
          ) : cards.length > 0 ? (
            <div className="space-y-4">
              {cards.map((card) => (
                <CardTypeCard
                  key={card.id}
                  card={card}
                  onEnquire={() => handleOpenApplication(card)}
                  onCardClick={() => setSelectedCard(card)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-card bg-akr-surface text-center text-xs text-zinc-400">
              No credit card types currently available for enquiry.
            </div>
          )}
        </div>
      </div>

      {/* Card Details Modal */}
      {selectedCard && (
        <Modal
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          title={selectedCard.name}
        >
          <div className="space-y-4 text-left">
            <CardTypeCard card={selectedCard} compact />

            {/* Benefits List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-akr-gold mb-2">
                Card Privileges & Benefits
              </h4>
              <div className="space-y-2">
                {selectedCard.benefits.map((b, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fees */}
            <div className="p-3 rounded-xl bg-akr-bg border border-akr-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-akr-text-muted">Joining Fee:</span>
                <span className="font-bold text-white">
                  {selectedCard.charges.joiningFee === 0 ? 'FREE' : `₹${selectedCard.charges.joiningFee}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-akr-text-muted">Annual Maintenance Fee:</span>
                <span className="font-bold text-white">
                  {selectedCard.charges.annualFee === 0 ? 'FREE' : `₹${selectedCard.charges.annualFee}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-akr-text-muted">Finance Charges:</span>
                <span className="font-bold text-akr-gold">{selectedCard.charges.interestRate}</span>
              </div>
            </div>

            <button
              onClick={() => handleOpenApplication(selectedCard)}
              className="w-full py-3 rounded-button font-bold text-sm bg-gold-gradient text-black shadow-gold-glow hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Inquire & Apply Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </Modal>
      )}

      {/* Card Application Form Modal */}
      <CardApplicationModal
        card={enquiringCard}
        isOpen={!!enquiringCard}
        onClose={() => setEnquiringCard(null)}
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
              Done & Return to Cards
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
