import React from 'react';
import { 
  Users, 
  Eye, 
  ShieldCheck, 
  ExternalLink, 
  DollarSign, 
  Lock, 
  Send, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Listing } from '../../types';
import { PlatformBadge, VerificationBadge, ListingStatusBadge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';

export interface ListingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  onInitiateBuy: (listing: Listing) => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  isOpen,
  onClose,
  listing,
  onInitiateBuy
}) => {
  const { requireAuth } = useAuth();

  if (!listing) return null;

  const isSold = listing.status === 'SOLD';
  const isInProgress = listing.status === 'ON_PROGRESS';
  const isPendingReview = listing.moderationStatus === 'PENDING_REVIEW' || listing.status === 'PENDING_REVIEW';

  const handleBuyClick = () => {
    requireAuth('Sign in to initiate escrow purchase for this channel.', () => {
      onInitiateBuy(listing);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={listing.title} maxWidth="max-w-xl">
      <div className="space-y-5 text-left">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <PlatformBadge platform={listing.platform} />
            {listing.verificationBadge && <VerificationBadge badge={listing.verificationBadge} />}
          </div>
          <ListingStatusBadge status={listing.status} />
        </div>

        {/* Profile Image & Name (If available) */}
        {listing.profileImageUrl && (
          <div className="flex items-center gap-4 pt-1">
            <img 
              src={listing.profileImageUrl} 
              alt="Profile" 
              className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/30 bg-[#141B26]"
            />
            <div>
              <h4 className="text-sm font-bold text-slate-100">{listing.title}</h4>
              <p className="text-xs text-sky-400 font-mono mt-0.5">{listing.handle}</p>
            </div>
          </div>
        )}

        {/* Channel Main Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-[#141B26] border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">
              {listing.platform === 'youtube' || listing.platform === 'telegram' ? 'Subscribers' : 'Followers'}
            </span>
            <span className="text-base font-black text-amber-400 font-mono">
              {(listing.followersCount || listing.subscriberCount || listing.subscribersCount || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#141B26] border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Average Reach</span>
            <span className="text-base font-black text-slate-100 font-mono">
              {listing.averageViews || listing.avgViews ? Number(listing.averageViews || listing.avgViews).toLocaleString() : 'Active'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#141B26] border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Age (Months)</span>
            <span className="text-base font-black text-slate-100 font-mono">
              {listing.accountAgeMonths || 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#141B26] border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Monetized</span>
            <span className="text-base font-black text-slate-100 font-mono">
              {listing.isMonetized ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        {/* Channel Description */}
        <div className="space-y-1.5">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Channel Description</h5>
          <p className="text-xs sm:text-sm text-slate-300 bg-[#141B26] p-3.5 rounded-xl border border-slate-800 leading-relaxed whitespace-pre-line">
            {listing.description || 'No description provided by seller.'}
          </p>
        </div>

        {/* Dashboard Screenshot */}
        {listing.analyticsScreenshotUrl && (
          <div className="space-y-1.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Dashboard / Analytics</h5>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#141B26]">
              <img 
                src={listing.analyticsScreenshotUrl} 
                alt="Account Dashboard Screenshot" 
                className="w-full h-auto max-h-64 object-contain"
              />
            </div>
          </div>
        )}

        {/* Channel Link & Seller Info */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Public Channel Link:</span>
            {listing.channelUrl ? (
              <a
                href={listing.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sky-400 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Visit Channel</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-slate-500">Provided upon escrow initiation</span>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">Verified Seller:</span>
            <span className="font-semibold text-slate-200">{listing.sellerName}</span>
          </div>
        </div>

        {/* Escrow Guarantee Box */}
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/60 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-200 leading-relaxed">
            <span className="font-bold text-emerald-300 block mb-0.5">100% EOM Escrow Protection</span>
            Your payment is held safely by verified administrators (@mr_ebek & @EXO_SMM) until channel ownership is completely transferred to your control.
          </div>
        </div>

        {/* Purchase Action Bar */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fixed Price</span>
            <span className="text-lg sm:text-xl font-black text-amber-400 font-mono">
              {Number(listing.priceETB).toLocaleString()} ETB
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={onClose}>
              Close
            </Button>
            {!isSold && !isInProgress && !isPendingReview && (
              <Button
                variant="primary"
                size="md"
                onClick={handleBuyClick}
                leftIcon={<Lock className="w-4 h-4" />}
              >
                Buy with Escrow
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
