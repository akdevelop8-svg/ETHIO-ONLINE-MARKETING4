import { apiClient } from "../../api/client";
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ExternalLink, 
  AlertCircle 
} from 'lucide-react';
import { Listing, User } from '../../types';
import { Button } from '../common/Button';
import { PlatformBadge } from '../common/Badge';
import { EmptyState } from '../common/StateViews';
import { useToast } from '../common/Toast';

export interface AdminListingsModerationViewProps {
  listings: Listing[];
  currentUser: User | null;
  onListingUpdated: () => void;
}

export const AdminListingsModerationView: React.FC<AdminListingsModerationViewProps> = ({
  listings,
  currentUser,
  onListingUpdated
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const filtered = listings.filter((l) => {
    if (filter === 'PENDING') {
      if (l.moderationStatus !== 'PENDING_REVIEW' && l.status !== 'PENDING_REVIEW') return false;
    } else if (filter === 'APPROVED') {
      if (l.moderationStatus !== 'APPROVED' && l.status !== 'ACTIVE') return false;
    } else if (filter === 'REJECTED') {
      if (l.moderationStatus !== 'REJECTED' && l.status !== 'REJECTED') return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.sellerName.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApprove = async (listing: Listing) => {
    if (!currentUser) return;
    try {
      await apiClient.post(`/admin/listings/${listing.id}/moderate`, { action: 'APPROVE', notes: '' });
      showToast(`Channel "${listing.title}" approved and published to marketplace!`, 'success');
      onListingUpdated();
      setSelectedListing(null);
    } catch (err: any) {
      showToast(err.message || 'Approval failed.', 'error');
    }
  };

  const handleRemove = async (listing: Listing) => {
    if (!currentUser) return;
    if (!window.confirm(`Remove "${listing.title}" from the marketplace? This cannot be undone from the admin UI.`)) return;
    setIsProcessing(true);
    try {
      await apiClient.delete(`/admin/listings/${listing.id}`);
      showToast(`"${listing.title}" removed from marketplace.`, 'success');
      onListingUpdated();
      setSelectedListing(null);
    } catch (err: any) {
      showToast(err.message || 'Removal failed.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (listing: Listing) => {
    if (!currentUser) return;
    if (!rejectReason.trim()) {
      showToast('Please provide a rejection reason.', 'error');
      return;
    }
    try {
      await apiClient.post(`/admin/listings/${listing.id}/moderate`, { action: 'REJECT', notes: rejectReason.trim() });
      showToast(`Channel rejected and seller notified.`, 'error');
      onListingUpdated();
      setSelectedListing(null);
      setRejectReason('');
    } catch (err: any) {
      showToast(err.message || 'Rejection failed.', 'error');
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* Top Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'PENDING' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
            }`}
          >
            Pending Review ({listings.filter((l) => l.moderationStatus === 'PENDING_REVIEW' || l.status === 'PENDING_REVIEW').length})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'APPROVED' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
            }`}
          >
            Approved ({listings.filter((l) => l.moderationStatus === 'APPROVED' || l.status === 'ACTIVE').length})
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'REJECTED' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
            }`}
          >
            Rejected ({listings.filter((l) => l.moderationStatus === 'REJECTED' || l.status === 'REJECTED').length})
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
            }`}
          >
            All ({listings.length})
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search channels or sellers..."
            className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-3 py-1.5 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No channels found"
          description="There are no channel submissions in this moderation queue."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => (
            <div
              key={l.id}
              className="p-4 rounded-2xl bg-[#121824] border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={l.platform} showLabel={false} />
                  <h4 className="text-sm font-bold text-slate-100">{l.title}</h4>
                </div>
                <span className="font-mono text-sm font-black text-amber-400">
                  {Number(l.priceETB).toLocaleString()} ETB
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-2.5 rounded-xl bg-black/30 border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 block">Seller</span>
                  <span className="font-semibold text-slate-200">{l.sellerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Category</span>
                  <span className="text-slate-300">{l.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Audience</span>
                  <span className="font-mono font-bold text-slate-200">{(l.followersCount || l.subscribersCount || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Channel Link</span>
                  {l.channelUrl ? (
                    <a
                      href={l.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 font-mono inline-flex items-center gap-1 hover:underline truncate max-w-[120px]"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-500">None</span>
                  )}
                </div>
              </div>

              {l.description && (
                <p className="text-xs text-slate-400 line-clamp-2 bg-slate-900/60 p-2.5 rounded-xl">
                  {l.description}
                </p>
              )}

              {/* Admin Moderation Action Strip */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-slate-400">
                  Status: <strong className="text-amber-400">{l.moderationStatus}</strong>
                </span>

                <div className="flex items-center gap-2">
                  {l.moderationStatus !== 'APPROVED' && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleApprove(l)}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Approve & Publish
                    </Button>
                  )}

                  {l.moderationStatus === 'APPROVED' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemove(l)}
                      disabled={isProcessing}
                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    >
                      Remove from Marketplace
                    </Button>
                  )}

                  {l.moderationStatus !== 'REJECTED' && l.moderationStatus !== 'APPROVED' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setSelectedListing(l);
                        setRejectReason('Insufficient audience activity or unverified channel ownership.');
                      }}
                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    >
                      Reject Submission
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md bg-[#121824] border border-slate-700 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-100">
              Reject Channel: {selectedListing.title}
            </h4>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">Rejection Reason *</label>
              <textarea
                className="w-full bg-[#141B26] text-slate-100 rounded-xl p-2.5 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedListing(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleReject(selectedListing)}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
