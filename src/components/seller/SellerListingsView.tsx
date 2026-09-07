import React, { useState } from 'react';
import { 
  Plus, 
  Store, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  ExternalLink, 
  Trash2 
} from 'lucide-react';
import { Listing, User } from '../../types';
import { Button } from '../common/Button';
import { PlatformBadge } from '../common/Badge';
import { EmptyState } from '../common/StateViews';
import { useToast } from '../common/Toast';

export interface SellerListingsViewProps {
  listings: Listing[];
  currentUser: User | null;
  onOpenCreateModal: () => void;
  onListingUpdated: () => void;
}

export const SellerListingsView: React.FC<SellerListingsViewProps> = ({
  listings,
  currentUser,
  onOpenCreateModal,
  onListingUpdated
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'SOLD'>('ALL');

  const filtered = listings.filter((l) => {
    if (filter === 'ACTIVE') return l.status === 'ACTIVE' && l.moderationStatus === 'APPROVED';
    if (filter === 'PENDING') return l.moderationStatus === 'PENDING_REVIEW' || l.status === 'PENDING_REVIEW';
    if (filter === 'SOLD') return l.status === 'SOLD';
    return true;
  });

  const getModerationBadge = (l: Listing) => {
    if (l.status === 'SOLD') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300">
          SOLD
        </span>
      );
    }
    if (l.moderationStatus === 'PENDING_REVIEW' || l.status === 'PENDING_REVIEW') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
          <Clock className="w-3 h-3 text-indigo-400 animate-pulse" />
          <span>Pending Admin Review</span>
        </span>
      );
    }
    if (l.moderationStatus === 'CHANGES_REQUESTED' || l.status === 'CHANGES_REQUESTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30">
          <span>Changes Requested</span>
        </span>
      );
    }
    if (l.moderationStatus === 'REJECTED' || l.status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
          <XCircle className="w-3 h-3 text-rose-400" />
          <span>Rejected</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        <span>Live on Marketplace</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 text-left">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 w-full sm:w-auto no-scrollbar">
          {(['ALL', 'ACTIVE', 'PENDING', 'SOLD'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shrink-0 border ${
                filter === t 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/20' 
                  : 'bg-[#090C14] text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onOpenCreateModal}
          className="w-full sm:w-auto shadow-lg shadow-indigo-500/10 bg-gradient-to-r from-indigo-600 to-purple-600 border-none"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Sell New Channel
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No channels listed"
          description="You have not submitted any channels matching this status filter."
          actionText="List a Channel"
          onAction={onOpenCreateModal}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((listing) => (
            <div
              key={listing.id}
              className="group p-5 rounded-2xl bg-[#090C14] border border-slate-800/80 hover:border-indigo-500/30 transition-all duration-300 shadow-xl"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-900/50 flex items-center justify-center border border-slate-800/50 shrink-0">
                    <PlatformBadge platform={listing.platform} showLabel={false} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-black text-slate-100 line-clamp-1 tracking-tight group-hover:text-indigo-400 transition-colors">
                      {listing.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{listing.handle || 'No Handle'}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  {getModerationBadge(listing)}
                </div>
              </div>

              {listing.rejectionReason && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 text-[11px] text-rose-300 leading-relaxed">
                  <div className="flex items-center gap-1.5 mb-1 text-rose-400 font-black uppercase tracking-widest">
                    <XCircle className="w-3 h-3" />
                    <span>Revision Required</span>
                  </div>
                  {listing.rejectionReason}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-[0.15em] block mb-0.5">Asset Evaluation</span>
                  <span className="font-mono text-base font-black text-amber-500">
                    {Number(listing.priceETB).toLocaleString()} <span className="text-[10px]">ETB</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {listing.channelUrl && (
                    <a
                      href={listing.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-900/50 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-500 hover:text-white text-slate-400 transition-all duration-300 border border-slate-800/50 hover:border-indigo-400 shadow-inner"
                      title="Visit Channel"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
