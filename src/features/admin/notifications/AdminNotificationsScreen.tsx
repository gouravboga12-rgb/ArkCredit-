import React, { useEffect, useState } from 'react';
import { Bell, Send, Users, CheckCircle, Sparkles, Calendar, CreditCard } from 'lucide-react';
import { adminApi } from '../../../core/api';
import { AppNotification, Consumer } from '../../../core/types';
import { formatDisplayDate } from '../../../core/formatters';
import { Modal, InputField, GoldButton, StatusBadge } from '../../../components/ui';

export const AdminNotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [recipient, setRecipient] = useState<string>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'general' | 'emi_reminder' | 'payment_confirmation' | 'balance_update'>('general');
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [nData, cData] = await Promise.all([
        adminApi.getNotifications().catch(() => []),
        adminApi.getConsumers().catch(() => []),
      ]);
      setNotifications(Array.isArray(nData) ? nData : []);
      setConsumers(Array.isArray(cData) ? cData : []);
    } catch (err) {
      console.error('Failed to load notifications or consumers', err);
      setNotifications([]);
      setConsumers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyTemplate = (templateType: 'emi_reminder' | 'payment_confirmation' | 'balance_update') => {
    setType(templateType);
    if (templateType === 'emi_reminder') {
      setTitle('Upcoming EMI Payment Reminder');
      setMessage('Your monthly EMI payment is scheduled in 3 days. Please ensure sufficient funds or pay early.');
    } else if (templateType === 'payment_confirmation') {
      setTitle('Payment Successfully Reconciled');
      setMessage('Your recent dues payment has been received and credited to your account statement.');
    } else if (templateType === 'balance_update') {
      setTitle('Account Balance Statement Update');
      setMessage('Your total outstanding balance has been adjusted based on recent portfolio reconciliations.');
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please enter title and message');
      return;
    }

    try {
      setIsSending(true);
      setSuccessMsg(null);
      await adminApi.createNotification({
        consumerId: recipient === 'all' ? undefined : recipient,
        title,
        message,
        type,
      });

      setSuccessMsg('Notification dispatched successfully! Appears in consumer app immediately.');
      setTitle('');
      setMessage('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 text-left selection:bg-akr-gold selection:text-black">
      {/* Top Header */}
      <div className="pb-4 border-b border-zinc-800">
        <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
          Push Notification Center
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Broadcast alerts to all registered consumers or target individual accounts with automated templates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dispatch Form (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark space-y-4">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Send className="w-4 h-4 text-akr-gold" />
            <span>Compose Notification</span>
          </h3>

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Templates Buttons */}
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-2">
              Quick Templates:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApplyTemplate('emi_reminder')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>EMI Reminder</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('payment_confirmation')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-zinc-700 transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Payment Confirmation</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('balance_update')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-akr-gold border border-zinc-700 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Balance Update</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-3.5 pt-2">
            {/* Recipient Target */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Recipient Target *
              </label>
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-2.5 text-xs outline-none focus:border-akr-gold"
              >
                <option value="all">Broadcast to All Active Consumers ({Array.isArray(consumers) ? consumers.length : 0})</option>
                {Array.isArray(consumers) && consumers.map((c) => (
                  <option key={c.id} value={c.id}>
                    Single Consumer: {c.name} ({c.accountNumber})
                  </option>
                ))}
              </select>
            </div>

            <InputField
              label="Notification Title *"
              placeholder="e.g. Upcoming EMI Reminder"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Message Content *
              </label>
              <textarea
                rows={3}
                placeholder="Type push message delivered to the consumer's mobile app..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-3 text-xs outline-none focus:border-akr-gold resize-none"
              />
            </div>

            <GoldButton type="submit" isLoading={isSending}>
              Dispatch Notification
            </GoldButton>
          </form>
        </div>

        {/* Live Notification Log (1 col) */}
        <div className="p-5 rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-akr-gold" />
              <span>Recent Dispatches ({Array.isArray(notifications) ? notifications.length : 0})</span>
            </h3>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
              {Array.isArray(notifications) && notifications.map((n) => {
                const con = Array.isArray(consumers) ? consumers.find((c) => c.id === n.consumerId) : undefined;
                return (
                  <div key={n.id} className="p-3 rounded-xl bg-akr-bg border border-zinc-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white truncate max-w-[170px]">{n.title}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {n.consumerId ? 'Targeted' : 'Broadcast'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">{n.message}</p>
                    <div className="flex justify-between items-center mt-2 text-[9px] text-zinc-500">
                      <span>{con ? con.name : 'All Consumers'}</span>
                      <span>{formatDisplayDate(n.createdAt, true)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
