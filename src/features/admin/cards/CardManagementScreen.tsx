import React, { useEffect, useState } from 'react';
import { CreditCard, Plus, Edit, Trash2, Check, AlertCircle, Eye, EyeOff, Upload } from 'lucide-react';
import { adminApi } from '../../../core/api';
import { useStore } from '../../../store';
import { CardType } from '../../../core/types';
import { formatCurrency } from '../../../core/formatters';
import { Modal, InputField, GoldButton, StatusBadge, CardTypeCard } from '../../../components/ui';

export const CardManagementScreen: React.FC = () => {
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [features, setFeatures] = useState('');
  const [benefits, setBenefits] = useState('');
  const [joiningFee, setJoiningFee] = useState<number>(999);
  const [annualFee, setAnnualFee] = useState<number>(999);
  const [interestRate, setInterestRate] = useState('3.5% p.m.');
  const [enabled, setEnabled] = useState(true);

  const adminSession = useStore((state) => state.adminSession);
  const isSuperAdmin = adminSession?.role === 'super_admin';

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getCards();
      setCards(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  const openAdd = () => {
    setEditingCard(null);
    setName('');
    setImageUrl('https://images.unsplash.com/photo-1589758438368-0ad531db3366?auto=format&fit=crop&w=600&q=80');
    setFeatures('Higher Limits, Exclusive Rewards, Global Acceptance');
    setBenefits('2% cashback on all spends, Complimentary insurance, Zero fuel surcharge');
    setJoiningFee(999);
    setAnnualFee(999);
    setInterestRate('3.5% p.m.');
    setEnabled(true);
    setIsModalOpen(true);
  };

  const openEdit = (card: CardType) => {
    setEditingCard(card);
    setName(card.name);
    setImageUrl(card.imageUrl);
    setFeatures(card.features.join(', '));
    setBenefits(card.benefits.join(', '));
    setJoiningFee(card.charges.joiningFee);
    setAnnualFee(card.charges.annualFee);
    setInterestRate(card.charges.interestRate);
    setEnabled(card.enabled);
    setIsModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Card name is required');
      return;
    }

    const payload = {
      name,
      imageUrl,
      features: features.split(',').map((s) => s.trim()).filter(Boolean),
      benefits: benefits.split(',').map((s) => s.trim()).filter(Boolean),
      charges: {
        joiningFee: Number(joiningFee),
        annualFee: Number(annualFee),
        interestRate,
      },
      enabled,
    };

    try {
      if (editingCard) {
        await adminApi.updateCard(editingCard.id, payload);
      } else {
        await adminApi.createCard(payload);
      }
      setIsModalOpen(false);
      loadCards();
    } catch (err: any) {
      alert(err.message || 'Failed to save card');
    }
  };

  const handleToggleEnable = async (card: CardType) => {
    try {
      await adminApi.updateCard(card.id, { enabled: !card.enabled });
      loadCards();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id: string, cardName: string) => {
    if (!isSuperAdmin) {
      alert('Only Super Admin can delete card types');
      return;
    }
    if (window.confirm(`Permanently delete ${cardName}?`)) {
      try {
        await adminApi.deleteCard(id);
        loadCards();
      } catch (err: any) {
        alert(err.message || 'Failed to delete');
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 text-left selection:bg-akr-gold selection:text-black">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            Card Types & Catalogue Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Publish card products, configure rewards, and toggle live visibility in the consumer app.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-akr-gold text-black hover:brightness-105 shadow-gold-glow transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Card Product</span>
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`
              p-5 rounded-2xl bg-[#141417] border shadow-card-dark flex flex-col justify-between transition-all
              ${card.enabled ? 'border-zinc-800' : 'border-zinc-800/40 opacity-70'}
            `}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <StatusBadge status={card.enabled ? 'Active' : 'Inactive'} size="sm" />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleEnable(card)}
                    className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                      card.enabled
                        ? 'bg-amber-950/40 text-amber-300 border-amber-800/40 hover:bg-amber-900/60'
                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/60'
                    }`}
                  >
                    {card.enabled ? (
                      <>
                        <EyeOff className="w-3 h-3" /> Disable
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" /> Enable
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Card Visual Preview */}
              <CardTypeCard card={card} compact />

              <div className="mt-4 space-y-1.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Features</h4>
                <div className="flex flex-wrap gap-1">
                  {card.features.map((f, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-zinc-800 grid grid-cols-3 gap-1 text-xs">
                <div>
                  <span className="text-[9px] uppercase text-zinc-500">Joining</span>
                  <span className="font-bold text-white block">
                    {card.charges.joiningFee === 0 ? 'FREE' : formatCurrency(card.charges.joiningFee)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-zinc-500">Annual</span>
                  <span className="font-bold text-white block">
                    {card.charges.annualFee === 0 ? 'FREE' : formatCurrency(card.charges.annualFee)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-zinc-500">Finance</span>
                  <span className="font-bold text-akr-gold block">{card.charges.interestRate}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">
                {card.enabled ? 'Live in Consumer App' : 'Hidden from Consumer App'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openEdit(card)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
                  title="Edit Card Details"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => handleDelete(card.id, card.name)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/60 text-zinc-300 hover:text-red-400"
                    title="Delete Card (Super Admin)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Card Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCard ? 'Edit Card Product' : 'Create Card Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
          <InputField
            label="Card Product Name *"
            placeholder="e.g. AKR Titanium Card"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Card Artwork / Image Upload (Stored as Data URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="text-xs text-zinc-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
              />
            </div>
          </div>

          <InputField
            label="Features (Comma separated)"
            placeholder="Higher Limits, Exclusive Rewards, Global Acceptance"
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            required
          />

          <InputField
            label="Benefits (Comma separated)"
            placeholder="2% cashback on all spends, Airport lounge visits"
            value={benefits}
            onChange={(e) => setBenefits(e.target.value)}
            required
          />

          <div className="grid grid-cols-3 gap-2">
            <InputField
              label="Joining Fee (₹)"
              type="number"
              value={joiningFee}
              onChange={(e) => setJoiningFee(Number(e.target.value))}
            />
            <InputField
              label="Annual Fee (₹)"
              type="number"
              value={annualFee}
              onChange={(e) => setAnnualFee(Number(e.target.value))}
            />
            <InputField
              label="Interest Rate"
              placeholder="3.5% p.m."
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 accent-akr-gold rounded"
              />
              <span className="text-xs font-bold text-white">
                Live Status: Show immediately in consumer Cards tab
              </span>
            </label>
          </div>

          <div className="pt-3">
            <GoldButton type="submit">
              {editingCard ? 'Save Changes' : 'Create Card Product'}
            </GoldButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
