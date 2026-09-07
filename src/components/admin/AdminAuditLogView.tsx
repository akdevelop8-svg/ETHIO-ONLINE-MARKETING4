import { apiClient } from "../../api/client";
import React, { useEffect, useState } from 'react';
import { ShieldCheck, Search, Filter, Calendar, Activity } from 'lucide-react';
import { AuditLog, User } from '../../types';
import { EmptyState } from '../common/StateViews';

export interface AdminAuditLogViewProps {
  currentUser: User | null;
}

export const AdminAuditLogView: React.FC<AdminAuditLogViewProps> = ({ currentUser }) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    apiClient.get<AuditLog[]>('/admin/audit').then(setLogs).catch(() => setLogs([]));
  }, [currentUser?.id]);

  const filtered = logs.filter((log) => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 text-left">
      {/* Top Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail, actors, actions, or entity IDs..."
            className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-[#141B26] text-slate-200 rounded-xl px-3 py-2 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
        >
          <option value="ALL">All Financial & Audit Actions</option>
          <option value="PAYMENT_SUBMITTED">PAYMENT_SUBMITTED</option>
          <option value="PAYMENT_VERIFIED">PAYMENT_VERIFIED</option>
          <option value="PAYMENT_REJECTED">PAYMENT_REJECTED</option>
          <option value="PAYOUT_PROCESSED">PAYOUT_PROCESSED</option>
          <option value="REFUND_ISSUED">REFUND_ISSUED</option>
          <option value="ORDER_CREATED">ORDER_CREATED</option>
          <option value="ORDER_COMPLETED">ORDER_COMPLETED</option>
          <option value="LISTING_APPROVED">LISTING_APPROVED</option>
          <option value="LISTING_REJECTED">LISTING_REJECTED</option>
          <option value="USER_LOGGED_IN">USER_LOGGED_IN</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No audit records found"
          description="There are no security or financial events matching your criteria."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl bg-[#141B26] border border-slate-800/80 space-y-1.5 font-sans"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {log.action}
                  </span>
                  <span className="font-bold text-slate-200">{log.actorName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({log.actorRole})</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{log.details}</p>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                <span>Target: {log.entityType} #{log.entityId}</span>
                <span>Audit ID: {log.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
