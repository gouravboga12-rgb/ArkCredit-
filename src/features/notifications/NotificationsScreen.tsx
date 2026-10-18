import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Calendar, CreditCard, ShieldAlert, Sparkles } from 'lucide-react';
import { consumerApi } from '../../core/api';
import { AppNotification } from '../../core/types';
import { formatDisplayDate } from '../../core/formatters';
import { PageHeader, BottomNav, Skeleton, EmptyState } from '../../components/ui';

export const NotificationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const data = await consumerApi.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await consumerApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await consumerApi.markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'emi_reminder':
        return <Calendar className="w-4 h-4 text-amber-400" />;
      case 'payment_confirmation':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'balance_update':
        return <Sparkles className="w-4 h-4 text-akr-gold" />;
      default:
        return <Bell className="w-4 h-4 text-blue-400" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex-1 flex flex-col justify-between bg-akr-bg text-white pb-28 relative overflow-y-auto">
      <div>
        <PageHeader
          title="Notifications"
          onBack={() => navigate(-1)}
          rightAction={
            unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-akr-gold font-medium hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            ) : null
          }
        />

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-card" />
              <Skeleton className="h-20 w-full rounded-card" />
              <Skeleton className="h-20 w-full rounded-card" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-2.5 text-left">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`
                    p-3.5 rounded-card border transition-all cursor-pointer flex items-start gap-3
                    ${
                      notif.read
                        ? 'bg-akr-surface/70 border-akr-border/60'
                        : 'bg-akr-surface border-akr-gold/40 shadow-sm'
                    }
                  `}
                >
                  <div className="w-9 h-9 rounded-full bg-akr-bg border border-akr-border/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getNotifIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-xs font-bold truncate ${
                          notif.read ? 'text-zinc-300' : 'text-white'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-akr-gold flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-akr-text-muted mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-zinc-500 mt-2 block">
                      {formatDisplayDate(notif.createdAt, true)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Bell className="w-6 h-6" />}
              title="No Notifications Yet"
              description="You are all caught up! You will be alerted here for upcoming dues, payment receipts, and balance changes."
            />
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
