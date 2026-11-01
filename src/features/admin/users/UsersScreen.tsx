import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  RefreshCw,
  Send,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  BellRing,
} from 'lucide-react';
import { adminApi } from '../../../core/api';
import { RegisteredUser } from '../../../core/types';
import { formatDisplayDate, formatCurrency } from '../../../core/formatters';
import { Modal, GoldButton, OutlineGoldButton, Skeleton } from '../../../components/ui';

export const UsersScreen: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_applied' | 'pending' | 'approved' | 'rejected'>('all');

  // Invite modal state
  const [selectedUserForInvite, setSelectedUserForInvite] = useState<RegisteredUser | null>(null);
  const [customInviteMessage, setCustomInviteMessage] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const loadUsers = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      else setIsRefreshing(true);
      const data = await adminApi.getRegisteredUsers();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Failed to load registered users', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers(true);
  }, []);

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'not_applied' && u.cardStatus !== 'not_applied') return false;
        if (statusFilter === 'pending' && u.cardStatus !== 'pending') return false;
        if (statusFilter === 'approved' && u.cardStatus !== 'approved' && !u.cardApproved) return false;
        if (statusFilter === 'rejected' && u.cardStatus !== 'rejected') return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = (u.email || '').toLowerCase().includes(q);
        const matchMobile = (u.mobile || '').includes(q);
        const matchAccount = (u.accountNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchMobile && !matchAccount) {
          return false;
        }
      }

      return true;
    });
  }, [users, statusFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = users.length;
    const notApplied = users.filter((u) => u.cardStatus === 'not_applied' && !u.cardApproved).length;
    const pending = users.filter((u) => u.cardStatus === 'pending' && !u.cardApproved).length;
    const approved = users.filter((u) => u.cardStatus === 'approved' || u.cardApproved).length;
    return { total, notApplied, pending, approved };
  }, [users]);

  // Open invite modal
  const openInviteModal = (user: RegisteredUser) => {
    setSelectedUserForInvite(user);
    setCustomInviteMessage(
      `Hi ${user.name}, you are pre-qualified for the AKR EMI Privilege Card with 0% interest on store purchases. Tap to complete your card application now!`
    );
  };

  // Dispatch invite notification
  const handleDispatchInvite = async () => {
    if (!selectedUserForInvite) return;
    try {
      setIsSendingInvite(true);
      const res = await adminApi.sendCardInvite(selectedUserForInvite.id, customInviteMessage);
      showToast(`In-app notification sent to ${selectedUserForInvite.name}'s bell icon!`);

      // Update local state to show inviteSent
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUserForInvite.id
            ? { ...u, inviteSent: true, inviteSentAt: new Date().toISOString() }
            : u
        )
      );
      setSelectedUserForInvite(null);
    } catch (err: any) {
      alert(err.message || 'Failed to send card invitation');
    } finally {
      setIsSendingInvite(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 text-left selection:bg-akr-gold selection:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#16161A] border border-akr-gold/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-slide-in">
          <BellRing className="w-4 h-4 text-akr-gold flex-shrink-0 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
              Registered Users & Onboarding
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-akr-gold/15 text-akr-gold border border-akr-gold/30">
              Directory
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            View all consumer registrations, monitor EMI card application status, and send instant in-app activation requests.
          </p>
        </div>

        <button
          onClick={() => loadUsers(false)}
          disabled={isRefreshing}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-akr-gold hover:text-white transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-akr-gold' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
              Total Registered
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">{stats.total}</div>
            <p className="text-[11px] text-zinc-400 mt-1">Active registered user accounts</p>
          </div>
        </div>

        {/* Not Applied */}
        <div className="p-5 rounded-2xl bg-[#141417] border border-amber-500/30 shadow-card-dark flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
              Not Applied
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-800/40 text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-amber-400">{stats.notApplied}</div>
            <p className="text-[11px] text-zinc-400 mt-1">Eligible for EMI Card invitation</p>
          </div>
        </div>

        {/* Application In Review */}
        <div className="p-5 rounded-2xl bg-[#141417] border border-blue-500/30 shadow-card-dark flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">
              Under Review
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-blue-400">{stats.pending}</div>
            <p className="text-[11px] text-zinc-400 mt-1">Pending KYC verification</p>
          </div>
        </div>

        {/* Card Active / Approved */}
        <div className="p-5 rounded-2xl bg-[#141417] border border-emerald-500/30 shadow-card-dark flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
              Card Approved
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-400">{stats.approved}</div>
            <p className="text-[11px] text-zinc-400 mt-1">Active AKR EMI cardholders</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-[#141417] border border-zinc-800">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by user name, mobile, email, or AKR account ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-akr-gold transition-colors"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { id: 'all', label: 'All Users' },
            { id: 'not_applied', label: `Not Applied (${stats.notApplied})` },
            { id: 'pending', label: `In Review (${stats.pending})` },
            { id: 'approved', label: `Approved (${stats.approved})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-akr-gold text-black font-bold shadow-sm'
                  : 'bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table / List */}
      <div className="p-5 rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1B1B1F] text-zinc-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 rounded-l-xl">User Profile</th>
                    <th className="py-3 px-4">Account ID</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Registered Date</th>
                    <th className="py-3 px-4">EMI Card Status</th>
                    <th className="py-3 px-4 rounded-r-xl text-right">Card Onboarding Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredUsers.map((user) => {
                    const isApproved = user.cardStatus === 'approved' || user.cardApproved;
                    const isPending = user.cardStatus === 'pending';
                    const isNotApplied = !isApproved && !isPending;

                    return (
                      <tr key={user.id} className="hover:bg-zinc-800/40 transition-colors">
                        {/* Profile Name & Avatar */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-akr-gold to-amber-200 text-black font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                user.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {user.googleId && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold" title="Google OAuth Verified">
                                    G
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 font-mono">ID: {user.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Account Number */}
                        <td className="py-3 px-4 font-mono text-zinc-200 font-bold">
                          {user.accountNumber || '-'}
                        </td>

                        {/* Contact Info */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5 text-zinc-300">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-zinc-500" />
                              <span className="font-mono">{user.mobile}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              <Mail className="w-3 h-3 text-zinc-500" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Registration Date */}
                        <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                          {formatDisplayDate(user.createdAt, true)}
                        </td>

                        {/* EMI Card Status Badge */}
                        <td className="py-3 px-4">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Card Active</span>
                              {user.creditLimit ? (
                                <span className="text-[10px] font-mono text-emerald-400">({formatCurrency(user.creditLimit)})</span>
                              ) : null}
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-700/60">
                              <Clock className="w-3.5 h-3.5" />
                              <span>In Review</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Not Applied</span>
                            </span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="py-3 px-4 text-right">
                          {isNotApplied ? (
                            <div className="flex items-center justify-end gap-2">
                              {user.inviteSent && (
                                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mr-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Invite Sent</span>
                                </span>
                              )}
                              <button
                                onClick={() => openInviteModal(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-akr-gold to-amber-300 text-black text-xs font-bold shadow-gold-glow hover:brightness-105 transition-all"
                                title="Send in-app notification to this user's bell icon"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{user.inviteSent ? 'Resend Enable Request' : 'Send Request to Enable EMI Card'}</span>
                              </button>
                            </div>
                          ) : isPending ? (
                            <button
                              onClick={() => navigate('/admin/card-requests')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-colors"
                            >
                              <span>Review KYC Application</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-zinc-500 font-mono">
                              {user.cardNumber || 'Privilege Card Assigned'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View */}
            <div className="lg:hidden space-y-3">
              {filteredUsers.map((user) => {
                const isApproved = user.cardStatus === 'approved' || user.cardApproved;
                const isPending = user.cardStatus === 'pending';
                const isNotApplied = !isApproved && !isPending;

                return (
                  <div
                    key={user.id}
                    className="p-4 rounded-xl bg-[#18181D] border border-zinc-800 space-y-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-akr-gold to-amber-200 text-black font-bold text-sm flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {user.googleId && (
                              <span className="text-[9px] px-1 rounded bg-blue-950 text-blue-300 font-semibold">
                                Google
                              </span>
                            )}
                          </h4>
                          <span className="text-[11px] font-mono text-akr-gold">{user.accountNumber}</span>
                        </div>
                      </div>

                      {/* Status */}
                      {isApproved ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                          Card Active
                        </span>
                      ) : isPending ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/60">
                          In Review
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60">
                          Not Applied
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-zinc-300 space-y-1 pt-2 border-t border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-mono">{user.mobile}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Joined: {formatDisplayDate(user.createdAt)}</span>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="pt-2 border-t border-zinc-800/80">
                      {isNotApplied ? (
                        <button
                          onClick={() => openInviteModal(user)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-akr-gold to-amber-300 text-black text-xs font-bold shadow-gold-glow hover:brightness-105 transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{user.inviteSent ? 'Resend Enable Request' : 'Send Request to Enable EMI Card'}</span>
                        </button>
                      ) : isPending ? (
                        <button
                          onClick={() => navigate('/admin/card-requests')}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800 text-blue-300 border border-blue-500/40 text-xs font-semibold"
                        >
                          <span>Review Application in Card Requests</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="text-center text-xs text-emerald-400 font-semibold py-1">
                          ✓ Cardholder Active (Limit: {formatCurrency(user.creditLimit || 50000)})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-zinc-400">
            <Users className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
            <p className="text-sm font-semibold text-white">No registered users found</p>
            <p className="text-xs text-zinc-500 mt-1">
              {searchQuery ? 'Try clearing your search query or filter.' : 'New user signups will appear here automatically.'}
            </p>
          </div>
        )}
      </div>

      {/* Send Invite Modal */}
      {selectedUserForInvite && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedUserForInvite(null)}
          title="Send Request to Enable EMI Card"
          maxWidth="md"
        >
          <div className="space-y-4 text-left">
            <p className="text-xs text-zinc-400 -mt-2">
              Dispatches an immediate targeted notification to {selectedUserForInvite.name}'s bell icon
            </p>
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
              <div className="text-xs text-zinc-400 flex items-center justify-between">
                <span>Target User:</span>
                <span className="font-bold text-white">{selectedUserForInvite.name}</span>
              </div>
              <div className="text-xs text-zinc-400 flex items-center justify-between">
                <span>Account Number:</span>
                <span className="font-mono text-akr-gold">{selectedUserForInvite.accountNumber}</span>
              </div>
              <div className="text-xs text-zinc-400 flex items-center justify-between">
                <span>Registered Mobile:</span>
                <span className="font-mono text-white">{selectedUserForInvite.mobile}</span>
              </div>
              <div className="text-xs text-zinc-400 flex items-center justify-between">
                <span>Notification Target:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <BellRing className="w-3 h-3" /> User Bell Icon Alert
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                In-App Notification Message:
              </label>
              <textarea
                value={customInviteMessage}
                onChange={(e) => setCustomInviteMessage(e.target.value)}
                rows={3}
                className="w-full bg-[#18181B] border border-zinc-700 text-white rounded-xl p-3 text-xs outline-none focus:border-akr-gold leading-relaxed"
                placeholder="Enter notification text..."
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                This notification will appear in the consumer's header bell with an interactive "Complete Card Application" CTA button.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedUserForInvite(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchInvite}
                disabled={isSendingInvite || !customInviteMessage.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-akr-gold to-amber-300 text-black font-bold text-xs shadow-gold-glow hover:brightness-105 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingInvite ? 'Sending Notification...' : 'Send Notification'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
