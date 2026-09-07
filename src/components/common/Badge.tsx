import React from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Globe
} from 'lucide-react';
import { PlatformType, VerificationBadgeType, PriceRatingType, ListingStatus } from '../../types';

export interface PlatformBadgeProps {
  platform: PlatformType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TelegramIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Telegram">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18.2.2 0 0 0-.21-.02c-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
  </svg>
);

export const YoutubeIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="YouTube">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export const InstagramIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Instagram">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

export const TiktokIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="TikTok">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.04-4.52z" />
  </svg>
);

export const FacebookIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Facebook">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const XIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="X">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const PlatformIcon: React.FC<{ platform: PlatformType; className?: string }> = ({ platform, className = "w-4 h-4" }) => {
  switch (platform) {
    case 'telegram':
      return <TelegramIcon className={`${className} text-[#229ED9]`} />;
    case 'youtube':
      return <YoutubeIcon className={`${className} text-[#FF0000]`} />;
    case 'instagram':
      return <InstagramIcon className={`${className} text-[#E1306C]`} />;
    case 'tiktok':
      return <TiktokIcon className={`${className} text-[#00F2FE]`} />;
    case 'facebook':
      return <FacebookIcon className={`${className} text-[#1877F2]`} />;
    case 'x':
      return <XIcon className={`${className} text-slate-100`} />;
    default:
      return <Globe className={className} />;
  }
};

export const PlatformBadge: React.FC<PlatformBadgeProps> = ({ platform, showLabel = true }) => {
  const getStyles = () => {
    switch (platform) {
      case 'telegram':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/25';
      case 'youtube':
        return 'bg-red-500/10 text-red-400 border-red-500/25';
      case 'instagram':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/25';
      case 'tiktok':
        return 'bg-teal-500/10 text-teal-300 border-teal-500/25';
      case 'facebook':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
      case 'x':
        return 'bg-zinc-500/10 text-zinc-200 border-zinc-500/25';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getLabel = () => {
    switch (platform) {
      case 'telegram': return 'Telegram';
      case 'youtube': return 'YouTube';
      case 'instagram': return 'Instagram';
      case 'tiktok': return 'TikTok';
      case 'facebook': return 'Facebook';
      case 'x': return 'X';
      default: return platform;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${getStyles()}`}>
      <PlatformIcon platform={platform} className="w-3.5 h-3.5 shrink-0" />
      {showLabel && <span className="tracking-tight">{getLabel()}</span>}
    </span>
  );
};

export const VerificationBadge: React.FC<{ type?: VerificationBadgeType; badge?: VerificationBadgeType; className?: string }> = ({ type, badge, className = '' }) => {
  const activeType = type || badge;
  if (!activeType) return null;
  switch (activeType) {
    case 'VERIFIED_ACCOUNT':
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${className}`}>
          <CheckCircle2 className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
          <span>Verified Account</span>
        </span>
      );
    case 'TRUSTED_SELLER':
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 ${className}`}>
          <ShieldCheck className="w-3 h-3 text-blue-400 stroke-[2.5]" />
          <span>Trusted Seller</span>
        </span>
      );
    case 'PREMIUM_SELLER':
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 ${className}`}>
          <Sparkles className="w-3 h-3 text-purple-300 stroke-[2.5]" />
          <span>Premium Seller</span>
        </span>
      );
    default:
      return null;
  }
};

export const NewBadge: React.FC = () => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm">
    NEW
  </span>
);

export const PriceRatingBadge: React.FC<{ rating?: PriceRatingType }> = ({ rating }) => {
  if (!rating) return null;
  switch (rating) {
    case 'VERY_GOOD_PRICE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-700/60 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Very Good Price</span>
        </span>
      );
    case 'GOOD_PRICE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-emerald-950/40 text-emerald-300/90 border border-emerald-800/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Good Price</span>
        </span>
      );
    case 'MEDIUM_PRICE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-amber-950/50 text-amber-300 border border-amber-700/50">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Medium Price</span>
        </span>
      );
    case 'HIGH_PRICE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-orange-950/60 text-orange-300 border border-orange-700/50">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          <span>High Price</span>
        </span>
      );
    case 'VERY_HIGH_PRICE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-rose-950/70 text-rose-300 border border-rose-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span>Very High Price</span>
        </span>
      );
    default:
      return null;
  }
};

export const ListingStatusBadge: React.FC<{ status: ListingStatus | 'SOLD_OUT' | 'ONGOING_SOLD' }> = ({ status }) => {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
        <span>ACTIVE</span>
      </span>
    );
  }
  if (status === 'ON_PROGRESS') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
        <span>ON PROGRESS</span>
      </span>
    );
  }
  if (status === 'SOLD' || status === 'SOLD_OUT') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
        <span>SOLD OUT</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
      <span>{status}</span>
    </span>
  );
};
