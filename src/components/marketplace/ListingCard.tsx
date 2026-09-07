import React from 'react';
import { Users, Eye, CheckCircle2, ChevronRight, Heart, ShieldCheck } from 'lucide-react';
import { Listing } from '../../types';
import { PlatformBadge, VerificationBadge, ListingStatusBadge, NewBadge } from '../common/Badge';

export interface ListingCardProps {
  listing: Listing;
  onSelect: (listing: Listing) => void;
  onToggleFavorite?: (listingId: string) => void;
  isFavorite?: boolean;
  index?: number;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onSelect,
  onToggleFavorite,
  isFavorite = false,
  index = 0
}) => {
  const isSold = listing.status === 'SOLD' || listing.status === 'SOLD_OUT';
  const isInProgress = listing.status === 'ON_PROGRESS';
  const audienceCount = listing.followersCount || listing.subscriberCount || listing.subscribersCount || 0;
  const avgViewsCount = listing.averageViews || listing.avgViews;

  const getMetricLabel = () => {
    switch (listing.platform) {
      case 'youtube':
      case 'telegram':
        return 'Subscribers';
      default:
        return 'Followers';
    }
  };

  return (
    <div
      onClick={() => onSelect(listing)}
      className="group relative bg-[#05070A] hover:bg-[#090C14] border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-4 sm:p-5 transition-all duration-300 shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between cursor-pointer text-left overflow-hidden animate-flip-3d"
      style={{ animationDelay: `${index * 1.5}s`, transformStyle: 'preserve-3d' }}
    >
      {/* Background Decor */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/5 blur-3xl group-hover:bg-purple-500/10 transition-colors" />
      
      <div className="relative z-10">
        {/* Top Header: Platform Logo + Name + Verification + Status */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PlatformBadge platform={listing.platform} />
            {listing.verificationBadge && <VerificationBadge badge={listing.verificationBadge} />}
            {listing.isNew && <NewBadge />}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(listing.id);
                }}
                className={`p-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                  isFavorite ? 'text-rose-500 bg-rose-500/10 scale-110' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                }`}
                title={isFavorite ? 'Remove from saved' : 'Save listing'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
              </button>
            )}
            <ListingStatusBadge status={listing.status} />
          </div>
        </div>

        {/* Channel Name & Handle */}
        <div className="mb-3.5 flex items-center gap-3">
          {listing.profileImageUrl ? (
            <div className="relative">
              <img 
                src={listing.profileImageUrl} 
                alt="Profile" 
                className="w-11 h-11 rounded-full object-cover shrink-0 border-2 border-slate-900 group-hover:border-indigo-500/30 transition-colors bg-black"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#05070A] shadow-sm" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-slate-900/50 flex items-center justify-center text-slate-500 border border-slate-800/50">
              <Users className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <h4 className="text-base font-black text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1 leading-snug tracking-tight">
              {listing.title}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold mt-0.5">
              {listing.handle && (
                <span className="font-mono text-indigo-400/80">{listing.handle}</span>
              )}
              {listing.handle && <span className="text-slate-700">•</span>}
              <span className="truncate uppercase tracking-wider">{listing.category}</span>
            </div>
          </div>
        </div>

        {/* Channel Metrics Box */}
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#070B14]/50 border border-slate-800/50 mb-4 text-xs group-hover:border-indigo-500/20 transition-colors">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block">{getMetricLabel()}</span>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500/60" />
              <span className="font-black text-slate-200 font-mono text-sm">
                {audienceCount > 0 ? audienceCount.toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block">Reach Avg</span>
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-purple-500/60" />
              <span className="font-black text-slate-200 font-mono text-sm">
                {avgViewsCount ? Number(avgViewsCount).toLocaleString() : 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & "View Escrow" Action Footer */}
      <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between gap-2 mt-auto">
        <div>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block mb-0.5">Escrow Asset</span>
          <span className="text-lg font-black text-amber-500 font-mono tracking-tighter">
            {Number(listing.priceETB).toLocaleString()} <span className="text-xs">ETB</span>
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/10 group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:to-purple-600 text-indigo-400 group-hover:text-white text-[11px] font-black uppercase transition-all duration-300 border border-indigo-500/20 group-hover:border-indigo-400 group-hover:shadow-lg group-hover:shadow-indigo-500/20">
          <span>{isSold ? 'Sold Out' : isInProgress ? 'On Progress' : 'Buy Now'}</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};
