import React, { useEffect, useState } from 'react';
import { Layers, Plus, Edit, CheckCircle, XCircle, Landmark, CreditCard, Receipt, Wallet } from 'lucide-react';
import { adminApi } from '../../../core/api';
import { PlanType, PlanCategory } from '../../../core/types';
import { Modal, InputField, GoldButton, StatusBadge } from '../../../components/ui';

export const PlanTypesScreen: React.FC = () => {
  const [planTypes, setPlanTypes] = useState<PlanType[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPt, setEditingPt] = useState<PlanType | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<PlanCategory>('LOAN_EMI');
  const [icon, setIcon] = useState('landmark');
  const [enabled, setEnabled] = useState(true);

  const loadPlanTypes = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getPlanTypes();
      setPlanTypes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanTypes();
  }, []);

  const openAdd = () => {
    setEditingPt(null);
    setName('');
    setCategory('LOAN_EMI');
    setIcon('landmark');
    setEnabled(true);
    setIsModalOpen(true);
  };

  const openEdit = (pt: PlanType) => {
    setEditingPt(pt);
    setName(pt.name);
    setCategory(pt.category);
    setIcon(pt.icon);
    setEnabled(pt.enabled);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Plan type name is required');
      return;
    }

    try {
      if (editingPt) {
        await adminApi.updatePlanType(editingPt.id, {
          name,
          category,
          icon,
          enabled,
        });
      } else {
        await adminApi.createPlanType({
          name,
          category,
          icon,
          enabled,
        });
      }
      setIsModalOpen(false);
      loadPlanTypes();
    } catch (err: any) {
      alert(err.message || 'Failed to save plan type');
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'credit-card':
        return <CreditCard className="w-5 h-5 text-akr-gold" />;
      case 'receipt':
        return <Receipt className="w-5 h-5 text-akr-gold" />;
      case 'wallet':
        return <Wallet className="w-5 h-5 text-akr-gold" />;
      case 'landmark':
      default:
        return <Landmark className="w-5 h-5 text-akr-gold" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 text-left selection:bg-akr-gold selection:text-black">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            EMI & Dues Types Master List
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure financial instrument categories. Disabled types cannot be assigned to new plans.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-akr-gold text-black hover:brightness-105 shadow-gold-glow transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Plan Type</span>
        </button>
      </div>

      {/* Grid of Plan Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {planTypes.map((pt) => (
          <div
            key={pt.id}
            className={`
              p-5 rounded-2xl bg-[#141417] border shadow-card-dark transition-all flex flex-col justify-between
              ${pt.enabled ? 'border-zinc-800 hover:border-akr-gold/50' : 'border-zinc-800/40 opacity-70'}
            `}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  {getIcon(pt.icon)}
                </div>
                <StatusBadge status={pt.enabled ? 'Active' : 'Inactive'} size="sm" />
              </div>

              <h3 className="text-sm font-bold text-white">{pt.name}</h3>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5 uppercase">
                Category: {pt.category}
              </p>
            </div>

            <div className="pt-4 mt-3 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-[10px] text-zinc-500">
                {pt.enabled ? 'Assignable to consumers' : 'Disabled for new plans'}
              </span>
              <button
                onClick={() => openEdit(pt)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
                title="Edit Plan Type"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Add / Edit Plan Type */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPt ? 'Edit Plan Type' : 'Add New Plan Type'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <InputField
            label="Plan Type Name"
            placeholder="e.g. Loan EMI, Card EMI, Service Dues"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PlanCategory)}
              className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold"
            >
              <option value="LOAN_EMI">LOAN_EMI</option>
              <option value="CARD_EMI">CARD_EMI</option>
              <option value="CARD_BILL">CARD_BILL</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Icon Symbol
            </label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold"
            >
              <option value="landmark">Landmark (Loan)</option>
              <option value="credit-card">Credit Card (Card EMI)</option>
              <option value="receipt">Receipt (Bill)</option>
              <option value="wallet">Wallet (Other Dues)</option>
            </select>
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
                Enable this plan type for new dues plans
              </span>
            </label>
          </div>

          <div className="pt-2">
            <GoldButton type="submit">
              {editingPt ? 'Save Changes' : 'Create Plan Type'}
            </GoldButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
