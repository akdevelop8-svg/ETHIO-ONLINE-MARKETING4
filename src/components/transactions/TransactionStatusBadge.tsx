import React from 'react';
import { TransactionStatus, PaymentVerificationStatus, EscrowStatus } from '../../types';

export const TransactionStatusBadge: React.FC<{
  status: TransactionStatus;
  verificationStatus?: PaymentVerificationStatus;
  escrowStatus?: EscrowStatus;
}> = ({ status, verificationStatus, escrowStatus }) => {
  switch (status) {
    case 'PAYMENT_PENDING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Awaiting Payment</span>
        </span>
      );
    case 'PAYMENT_SUBMITTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
          <span>Pending Admin Verification</span>
        </span>
      );
    case 'PAYMENT_VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Escrow Locked & Verified</span>
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          <span>Completed & Disbursed</span>
        </span>
      );
    case 'REFUNDED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span>Escrow Refunded</span>
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span>Payment Rejected</span>
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-700/50 text-slate-400 border border-slate-700">
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
          <span>{status}</span>
        </span>
      );
  }
};
