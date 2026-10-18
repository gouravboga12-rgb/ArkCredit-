import React, { useEffect, useState } from 'react';
import { ShieldCheck, Search, Filter, History, User } from 'lucide-react';
import { adminApi } from '../../../core/api';
import { ActivityLog } from '../../../core/types';
import { formatDisplayDate } from '../../../core/formatters';
import { Skeleton } from '../../../components/ui';

export const ActivityLogScreen: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        const data = await adminApi.getActivityLogs();
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchAdmin = log.adminUser.toLowerCase().includes(q);
      const matchConsumer = (log.consumerName || '').toLowerCase().includes(q);
      const matchNewVal = log.newValue.toLowerCase().includes(q);
      if (!matchAction && !matchAdmin && !matchConsumer && !matchNewVal) return false;
    }

    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 text-left selection:bg-akr-gold selection:text-black">
      {/* Top Header */}
      <div className="pb-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide flex items-center gap-2">
            <span>Audit Trail & Activity Log</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/50">
              Super Admin Only
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Immutable system audit trail logging all modifications to consumer accounts, dues plans, and offline entries.
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search action, admin user, consumer name, or value..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#141417] border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:border-akr-gold outline-none"
          />
        </div>

        {/* Action Filter */}
        <div className="relative">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-[#141417] border border-zinc-800 text-white rounded-xl py-2.5 px-3 pr-8 text-xs font-semibold focus:border-akr-gold outline-none appearance-none"
          >
            <option value="all">All Actions ({logs.length})</option>
            <option value="CREATE_DUES_PLAN">Create Dues Plan</option>
            <option value="UPDATE_DUES_PLAN">Update Dues Plan</option>
            <option value="DELETE_DUES_PLAN">Delete Dues Plan</option>
            <option value="RECORD_OFFLINE_PAYMENT">Record Offline Payment</option>
            <option value="BULK_CSV_DUES_UPDATE">Bulk CSV Update</option>
            <option value="CREATE_CONSUMER">Create Consumer</option>
            <option value="UPDATE_CONSUMER">Update Consumer</option>
            <option value="DELETE_CONSUMER">Delete Consumer</option>
            <option value="DISPATCH_NOTIFICATION">Dispatch Notification</option>
          </select>
          <Filter className="w-3.5 h-3.5 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-2xl bg-[#141417] border border-zinc-800 shadow-card-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1B1B1F] text-zinc-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Admin Operator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Consumer</th>
                    <th className="py-3 px-4">Previous Value</th>
                    <th className="py-3 px-4">New Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                        {formatDisplayDate(log.createdAt, true)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {log.adminUser}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-akr-gold border border-zinc-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300 font-medium">
                        {log.consumerName || log.consumerId}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px] max-w-xs truncate">
                        {log.oldValue}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-300 font-mono text-[11px] max-w-xs truncate">
                        {log.newValue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="lg:hidden space-y-3">
            {filtered.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-[#141417] border border-zinc-800/80 shadow-card-dark space-y-2.5 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-akr-gold border border-zinc-700 font-semibold">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {formatDisplayDate(log.createdAt, true)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Operator</span>
                    <span className="font-semibold text-white">{log.adminUser}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Target Consumer</span>
                    <span className="text-zinc-300">{log.consumerName || log.consumerId || '-'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 space-y-1 text-[11px] font-mono">
                  {log.oldValue && log.oldValue !== '-' && (
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-400 break-all">
                      <span className="text-[9px] uppercase text-zinc-500 font-bold block mb-0.5">Previous:</span>
                      {log.oldValue}
                    </div>
                  )}
                  {log.newValue && log.newValue !== '-' && (
                    <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 break-all">
                      <span className="text-[9px] uppercase text-emerald-500 font-bold block mb-0.5">Updated:</span>
                      {log.newValue}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
