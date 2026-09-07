import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  FileSearch, 
  RotateCcw, 
  CheckCircle2, 
  Scale, 
  XCircle,
  KeyRound,
  UserX,
  Radio,
  Ban,
  CreditCard,
  HelpCircle
} from 'lucide-react';
import { DisputeStatus, DisputeReason } from '../../types';

interface DisputeStatusBadgeProps {
  status: DisputeStatus;
  size?: 'sm' | 'md';
}

export const DisputeStatusBadge: React.FC<DisputeStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case 'OPEN':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 ${sizeClasses}`}>
          <AlertTriangle className="w-3 h-3 text-rose-400" />
          <span>Dispute Open</span>
        </span>
      );
    case 'UNDER_MEDIATION':
    case 'UNDER_REVIEW':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 ${sizeClasses}`}>
          <Scale className="w-3 h-3 text-amber-400" />
          <span>Under Mediation</span>
        </span>
      );
    case 'EVIDENCE_REQUESTED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 ${sizeClasses}`}>
          <FileSearch className="w-3 h-3 text-purple-400" />
          <span>Evidence Requested</span>
        </span>
      );
    case 'RESOLVED_BUYER_REFUND':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30 ${sizeClasses}`}>
          <RotateCcw className="w-3 h-3 text-blue-400" />
          <span>Refunded to Buyer</span>
        </span>
      );
    case 'RESOLVED_SELLER_RELEASE':
    case 'RESOLVED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ${sizeClasses}`}>
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Released to Seller</span>
        </span>
      );
    case 'RESOLVED_SPLIT_SETTLEMENT':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 ${sizeClasses}`}>
          <Scale className="w-3 h-3 text-cyan-400" />
          <span>Split Settlement</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 ${sizeClasses}`}>
          <XCircle className="w-3 h-3" />
          <span>Dispute Dismissed</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider bg-slate-800 text-slate-300 ${sizeClasses}`}>
          <Clock className="w-3 h-3" />
          <span>{status}</span>
        </span>
      );
  }
};

interface DisputeReasonBadgeProps {
  reason: DisputeReason | string;
}

export const DisputeReasonBadge: React.FC<DisputeReasonBadgeProps> = ({ reason }) => {
  const getReasonInfo = () => {
    switch (reason) {
      case 'CREDENTIAL_MISMATCH':
        return { label: 'Credential Mismatch', icon: KeyRound, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
      case 'SELLER_UNRESPONSIVE':
        return { label: 'Seller Unresponsive', icon: UserX, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' };
      case 'BUYER_UNRESPONSIVE':
        return { label: 'Buyer Unresponsive', icon: UserX, color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' };
      case '2FA_RECOVERY_ISSUE':
        return { label: '2FA Recovery Issue', icon: ShieldAlert, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' };
      case 'STRIKE_OR_BAN_ON_CHANNEL':
        return { label: 'Strikes / Policy Penalties', icon: Ban, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' };
      case 'PAYMENT_DISPUTE':
        return { label: 'Payment / Ref Issue', icon: CreditCard, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' };
      default:
        return { label: typeof reason === 'string' ? reason.replace(/_/g, ' ') : 'Dispute Reason', icon: HelpCircle, color: 'text-slate-300 border-slate-700 bg-slate-800/60' };
    }
  };

  const info = getReasonInfo();
  const Icon = info.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${info.color}`}>
      <Icon className="w-3 h-3 shrink-0" />
      <span className="truncate">{info.label}</span>
    </span>
  );
};
