import React from 'react';
import { PaymentMethodType } from '../../types';
import { CreditCard, Building2, Smartphone } from 'lucide-react';

/**
 * Recognizable Ethiopian Bank & Mobile Wallet SVG Brand Logos
 */

export const TelebirrLogo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Telebirr">
    <rect width="48" height="48" rx="10" fill="#00A5DF" />
    <path d="M14 16C14 14.8954 14.8954 14 16 14H32C33.1046 14 34 14.8954 34 16V22C34 29.732 27.732 36 20 36H14V16Z" fill="#FEE300" opacity="0.9" />
    <path d="M22 14H32C33.1046 14 34 14.8954 34 16V22C34 28.6274 28.6274 34 22 34V14Z" fill="#75C043" />
    <circle cx="21" cy="23" r="4" fill="#005B94" />
    <path d="M19 19L27 27" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const CbeLogo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Commercial Bank of Ethiopia">
    <rect width="48" height="48" rx="10" fill="#581F6D" />
    <circle cx="24" cy="24" r="14" stroke="#FDB913" strokeWidth="2.5" />
    <path d="M24 14V34" stroke="#FDB913" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M16 20H32" stroke="#FDB913" strokeWidth="2" strokeLinecap="round" />
    <path d="M18 20L15 27H21L18 20Z" fill="#FDB913" />
    <path d="M30 20L27 27H33L30 20Z" fill="#FDB913" />
    <circle cx="24" cy="24" r="2.5" fill="#FFFFFF" />
  </svg>
);

export const DashenLogo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Dashen Bank">
    <rect width="48" height="48" rx="10" fill="#0E2F6C" />
    <path d="M24 10L36 24L24 38L12 24L24 10Z" stroke="#F4A91E" strokeWidth="3" strokeLinejoin="round" fill="#134394" />
    <path d="M24 16L30 24L24 32L18 24L24 16Z" fill="#F4A91E" />
    <circle cx="24" cy="24" r="2" fill="#FFFFFF" />
  </svg>
);

export const AwashLogo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Awash Bank">
    <rect width="48" height="48" rx="10" fill="#004A8F" />
    <path d="M14 34L24 14L34 34H28L24 24L20 34H14Z" fill="#EE7202" />
    <path d="M20 34L24 26L28 34H20Z" fill="#FFFFFF" />
    <path d="M24 14L30 28H35L26 11L24 14Z" fill="#F2A900" opacity="0.8" />
  </svg>
);

export const AbyssiniaLogo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Bank of Abyssinia">
    <rect width="48" height="48" rx="10" fill="#781D22" />
    <circle cx="24" cy="24" r="13" stroke="#F5A800" strokeWidth="2.5" />
    <path d="M24 15V33" stroke="#F5A800" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M16 24H32" stroke="#F5A800" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="24" cy="24" r="5" fill="#F5A800" />
    <circle cx="24" cy="24" r="2.5" fill="#781D22" />
  </svg>
);

export interface PaymentMethodIconProps {
  method: PaymentMethodType | string;
  className?: string;
}

export const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({ method, className = "w-5 h-5" }) => {
  const norm = String(method).toUpperCase();

  if (norm.includes('TELEBIRR')) {
    return <TelebirrLogo className={className} />;
  }
  if (norm.includes('COMMERCIAL_BANK_OF_ETHIOPIA') || norm === 'CBE' || norm.includes('CBE_BIRR')) {
    return <CbeLogo className={className} />;
  }
  if (norm.includes('ABYSSINIA') || norm.includes('BOA')) {
    return <AbyssiniaLogo className={className} />;
  }
  if (norm.includes('DASHEN') || norm.includes('AMOLE')) {
    return <DashenLogo className={className} />;
  }
  if (norm.includes('AWASH')) {
    return <AwashLogo className={className} />;
  }

  return <CreditCard className={className} />;
};

export interface PaymentMethodBadgeProps {
  method: PaymentMethodType | string;
  showLabel?: boolean;
}

export const PaymentMethodBadge: React.FC<PaymentMethodBadgeProps> = ({ method, showLabel = true }) => {
  const norm = String(method).toUpperCase();

  let label = 'Bank Transfer';
  let badgeStyle = 'bg-slate-800 text-slate-200 border-slate-700';

  if (norm.includes('TELEBIRR')) {
    label = 'Telebirr';
    badgeStyle = 'bg-sky-500/15 text-sky-400 border-sky-500/30';
  } else if (norm.includes('COMMERCIAL_BANK_OF_ETHIOPIA') || norm === 'CBE') {
    label = 'CBE';
    badgeStyle = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  } else if (norm.includes('ABYSSINIA') || norm.includes('BOA')) {
    label = 'Bank of Abyssinia';
    badgeStyle = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  } else if (norm.includes('CBE_BIRR')) {
    label = 'CBE Birr';
    badgeStyle = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
  } else if (norm.includes('DASHEN') || norm.includes('AMOLE')) {
    label = 'Dashen Bank';
    badgeStyle = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  } else if (norm.includes('AWASH')) {
    label = 'Awash Bank';
    badgeStyle = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeStyle}`}>
      <PaymentMethodIcon method={method} className="w-3.5 h-3.5 shrink-0" />
      {showLabel && <span>{label}</span>}
    </span>
  );
};
