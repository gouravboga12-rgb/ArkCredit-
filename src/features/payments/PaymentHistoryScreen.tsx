import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Calendar, Download, Search } from 'lucide-react';
import { consumerApi } from '../../core/api';
import { Payment } from '../../core/types';
import { formatMonthHeader } from '../../core/formatters';
import { PageHeader, ListRow, BottomNav, Skeleton, EmptyState } from '../../components/ui';

export const PaymentHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'emi' | 'card'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '1m' | '3m' | '6m' | '1y'>('6m');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchPayments() {
      try {
        setLoading(true);
        const data = await consumerApi.getPaymentHistory();
        setPayments(data);
      } catch (err) {
        console.error('Failed to fetch payments', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    // Type filter
    if (typeFilter === 'emi' && !p.planTypeId.includes('loan') && !p.planTypeId.includes('emi')) {
      return false;
    }
    if (typeFilter === 'card' && !p.planTypeId.includes('card')) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchRef = p.transactionRef.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
      const matchAmount = p.amount.toString().includes(q);
      if (!matchRef && !matchAmount) return false;
    }

    return true;
  });

  // Group by month
  const groupedByMonth: Record<string, Payment[]> = {};
  filteredPayments.forEach((p) => {
    const month = formatMonthHeader(p.createdAt);
    if (!groupedByMonth[month]) {
      groupedByMonth[month] = [];
    }
    groupedByMonth[month].push(p);
  });

  const monthKeys = Object.keys(groupedByMonth);

  return (
    <div className="flex-1 flex flex-col justify-between bg-akr-bg text-white pb-28 relative overflow-y-auto">
      <div>
        <PageHeader title="Payment History" onBack={() => navigate('/app/home')} />

        <div className="p-4 space-y-4">
          {/* Filters Row (Phone 4 in template) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Transaction Type Filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full bg-akr-surface border border-akr-border/80 text-white rounded-xl py-2.5 px-3 pr-8 text-xs font-semibold focus:border-akr-gold outline-none appearance-none"
              >
                <option value="all">All Transactions</option>
                <option value="emi">EMI Payments</option>
                <option value="card">Card Payments</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-akr-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Time Filter */}
            <div className="relative">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="w-full bg-akr-surface border border-akr-border/80 text-white rounded-xl py-2.5 px-3 pr-8 text-xs font-semibold focus:border-akr-gold outline-none appearance-none"
              >
                <option value="1m">Last 1 Month</option>
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="1y">Last 1 Year</option>
                <option value="all">All Time</option>
              </select>
              <Calendar className="w-3.5 h-3.5 text-akr-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reference or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-akr-surface/60 border border-akr-border/60 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:border-akr-gold outline-none"
            />
          </div>

          {/* Payments Grouped by Month Headers */}
          {loading ? (
            <div className="space-y-3 pt-2">
              <Skeleton className="h-6 w-32 rounded" />
              <Skeleton className="h-16 w-full rounded-card" />
              <Skeleton className="h-16 w-full rounded-card" />
            </div>
          ) : monthKeys.length > 0 ? (
            <div className="space-y-5 text-left">
              {monthKeys.map((month) => (
                <div key={month} className="space-y-2">
                  <h3 className="text-xs font-bold text-akr-gold tracking-wider uppercase px-1">
                    {month}
                  </h3>

                  <div className="space-y-2">
                    {groupedByMonth[month].map((p) => {
                      const isCard = p.planTypeId.includes('card');
                      return (
                        <ListRow
                          key={p.id}
                          title={isCard ? 'Card Payment' : 'EMI Payment'}
                          subtitle={p.reference}
                          date={p.createdAt}
                          amount={p.amount}
                          status={p.status}
                          mode={p.mode}
                          iconType={isCard ? 'card' : 'rupee'}
                          onDownload={() => navigate(`/app/receipt/${p.id}`)}
                          onClick={() => navigate(`/app/receipt/${p.id}`)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Transactions Found"
              description="No payments match your current filter settings."
              action={
                <button
                  onClick={() => {
                    setTypeFilter('all');
                    setTimeFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs bg-akr-surface text-akr-gold border border-akr-gold/40"
                >
                  Reset Filters
                </button>
              }
            />
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
