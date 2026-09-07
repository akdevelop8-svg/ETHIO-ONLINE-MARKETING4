import { apiClient } from "../../api/client";
import React, { useState } from 'react';
import { 
  Scale, 
  Search, 
  Filter, 
  MessageSquare, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Eye, 
  RotateCcw, 
  CheckCircle2, 
  DollarSign, 
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { Dispute, User } from '../../types';
import { DisputeStatusBadge, DisputeReasonBadge } from '../disputes/DisputeBadges';
import { MediationChatRoom } from '../disputes/MediationChatRoom';
import { AdminArbitrationModal } from '../disputes/AdminArbitrationModal';
import { Button } from '../common/Button';
import { EmptyState } from '../common/StateViews';

export interface AdminDisputesViewProps {
  currentUser: User | null;
  onDisputesUpdated?: () => void;
}

export const AdminDisputesView: React.FC<AdminDisputesViewProps> = ({
  currentUser,
  onDisputesUpdated
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [arbitrateDispute, setArbitrateDispute] = useState<Dispute | null>(null);
  const [allDisputes, setAllDisputes] = useState<Dispute[]>([]);

  React.useEffect(() => {
    if (currentUser) {
      apiClient.get<Dispute[]>('/disputes').then(setAllDisputes).catch(console.error);
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const openCount = allDisputes.filter(
    (d) => d.status === 'OPEN' || d.status === 'UNDER_MEDIATION' || d.status === 'EVIDENCE_REQUESTED'
  ).length;

  const totalEscrowAtRisk = allDisputes
    .filter((d) => d.status === 'OPEN' || d.status === 'UNDER_MEDIATION' || d.status === 'EVIDENCE_REQUESTED')
    .reduce((acc, curr) => acc + curr.amountETB, 0);

  const resolvedCount = allDisputes.filter(
    (d) => d.status === 'RESOLVED_BUYER_REFUND' || d.status === 'RESOLVED_SELLER_RELEASE' || d.status === 'RESOLVED_SPLIT_SETTLEMENT' || d.status === 'RESOLVED'
  ).length;

  const filteredDisputes = allDisputes.filter((d) => {
    if (filter === 'ACTIVE') {
      if (
        d.status === 'RESOLVED_BUYER_REFUND' || 
        d.status === 'RESOLVED_SELLER_RELEASE' || 
        d.status === 'RESOLVED_SPLIT_SETTLEMENT' ||
        d.status === 'RESOLVED'
      ) return false;
    }
    if (filter === 'RESOLVED') {
      if (
        d.status !== 'RESOLVED_BUYER_REFUND' && 
        d.status !== 'RESOLVED_SELLER_RELEASE' && 
        d.status !== 'RESOLVED_SPLIT_SETTLEMENT' &&
        d.status !== 'RESOLVED'
      ) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.disputeNumber.toLowerCase().includes(q) ||
        d.orderNumber.toLowerCase().includes(q) ||
        d.listingTitle.toLowerCase().includes(q) ||
        d.buyerName.toLowerCase().includes(q) ||
        d.sellerName.toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <div className="space-y-4 text-left">
      {/* Dispute Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[#121824] border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Disputes</span>
          <span className="text-base font-black text-slate-100 font-mono">{allDisputes.length}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121824] border border-slate-800 space-y-1">
          <span className="text-[10px] text-amber-400 uppercase font-semibold block">Active Mediation</span>
          <span className="text-base font-black text-amber-300 font-mono">{openCount}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121824] border border-slate-800 space-y-1">
          <span className="text-[10px] text-rose-400 uppercase font-semibold block">Escrow in Dispute</span>
          <span className="text-base font-black text-rose-300 font-mono">
            {totalEscrowAtRisk.toLocaleString()} ETB
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121824] border border-slate-800 space-y-1">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Resolved Disputes</span>
          <span className="text-base font-black text-emerald-300 font-mono">{resolvedCount}</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-[#141B26] text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            All Disputes ({allDisputes.length})
          </button>
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'ACTIVE'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-[#141B26] text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            Active ({openCount})
          </button>
          <button
            onClick={() => setFilter('RESOLVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'RESOLVED'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-[#141B26] text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dispute #, order #, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl pl-8 pr-3 py-1.5 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>
      </div>

      {/* Disputes List */}
      {filteredDisputes.length === 0 ? (
        <EmptyState
          title="No disputes found"
          description="There are currently no arbitration tickets matching this filter."
        />
      ) : (
        <div className="space-y-3">
          {filteredDisputes.map((disp) => {
            const isSettled = 
              disp.status === 'RESOLVED_BUYER_REFUND' || 
              disp.status === 'RESOLVED_SELLER_RELEASE' || 
              disp.status === 'RESOLVED_SPLIT_SETTLEMENT' ||
              disp.status === 'RESOLVED';

            return (
              <div
                key={disp.id}
                className="p-4 rounded-2xl bg-[#121824] border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-sm"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-amber-400">{disp.disputeNumber}</span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-xs text-slate-400">Order #{disp.orderNumber}</span>
                    <DisputeStatusBadge status={disp.status} />
                    <DisputeReasonBadge reason={disp.reason} />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">Escrow Value:</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-100">
                      {disp.amountETB.toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                {/* Listing and Participants */}
                <div className="p-3 rounded-xl bg-black/40 border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-200 line-clamp-1">
                    {disp.listingTitle} ({disp.platform.toUpperCase()})
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>
                      Buyer: <strong className="text-blue-400">{disp.buyerName}</strong> ({disp.buyerEmail})
                    </div>
                    <div>
                      Seller: <strong className="text-emerald-400">{disp.sellerName}</strong> ({disp.sellerEmail})
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 italic pt-1 border-t border-slate-800/60">
                    "{disp.details}"
                  </p>
                </div>

                {/* Evidence & Messages Count Footer */}
                <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>{disp.messages.length} messages</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span>{disp.evidence.length} evidence uploads</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                      onClick={() => setSelectedDisputeId(disp.id)}
                    >
                      Mediation Room
                    </Button>

                    {!isSettled && (
                      <Button
                        size="sm"
                        variant="warning"
                        leftIcon={<Scale className="w-3.5 h-3.5" />}
                        onClick={() => setArbitrateDispute(disp)}
                      >
                        Arbitrate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mediation Chat Room Modal */}
      {selectedDisputeId && (
        <MediationChatRoom
          disputeId={selectedDisputeId}
          currentUser={currentUser}
          onClose={() => setSelectedDisputeId(null)}
          onDisputeUpdated={() => {
            onDisputesUpdated?.();
          }}
        />
      )}

      {/* Admin Arbitration Modal */}
      {arbitrateDispute && (
        <AdminArbitrationModal
          isOpen={Boolean(arbitrateDispute)}
          onClose={() => setArbitrateDispute(null)}
          dispute={arbitrateDispute}
          currentUser={currentUser}
          onArbitrationExecuted={() => {
            setArbitrateDispute(null);
            onDisputesUpdated?.();
          }}
        />
      )}
    </div>
  );
};
