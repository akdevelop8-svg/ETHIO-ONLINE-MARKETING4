import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Search, 
  Calendar, 
  Building2, 
  User,
  ZoomIn
} from 'lucide-react';
import { Transaction, User as UserType } from '../../types';
import { Button } from '../common/Button';
import { TransactionStatusBadge } from '../transactions/TransactionStatusBadge';
import { PaymentMethodBadge } from '../common/PaymentIcons';
import { AdminPaymentVerificationModal } from '../transactions/AdminPaymentVerificationModal';
import { AdminRefundModal } from '../transactions/AdminRefundModal';
import { EmptyState } from '../common/StateViews';

export interface AdminPaymentsViewProps {
  currentUser: UserType | null;
  transactions: Transaction[];
  onTransactionsUpdated: () => void;
}

export const AdminPaymentsView: React.FC<AdminPaymentsViewProps> = ({
  currentUser,
  transactions,
  onTransactionsUpdated
}) => {
  const [filter, setFilter] = useState<'PENDING_SUBMISSION' | 'SUBMITTED' | 'VERIFIED' | 'COMPLETED' | 'REFUNDED' | 'ALL'>('SUBMITTED');
  const [search, setSearch] = useState('');
  const [selectedTxForVerification, setSelectedTxForVerification] = useState<Transaction | null>(null);
  const [selectedTxForRefund, setSelectedTxForRefund] = useState<Transaction | null>(null);
  const [zoomedReceiptUrl, setZoomedReceiptUrl] = useState<string | null>(null);

  const filtered = transactions.filter((tx) => {
    if (filter === 'SUBMITTED') {
      if (tx.status !== 'PAYMENT_SUBMITTED' && tx.verificationStatus !== 'SUBMITTED') return false;
    } else if (filter === 'VERIFIED') {
      if (tx.status !== 'PAYMENT_VERIFIED' && tx.verificationStatus !== 'VERIFIED') return false;
    } else if (filter === 'COMPLETED') {
      if (tx.status !== 'COMPLETED') return false;
    } else if (filter === 'REFUNDED') {
      if (tx.status !== 'REFUNDED') return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        tx.transactionNumber.toLowerCase().includes(q) ||
        tx.orderNumber.toLowerCase().includes(q) ||
        (tx.paymentReference && tx.paymentReference.toLowerCase().includes(q)) ||
        tx.buyerName.toLowerCase().includes(q) ||
        tx.sellerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          {(['SUBMITTED', 'VERIFIED', 'COMPLETED', 'REFUNDED', 'ALL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shrink-0 border ${
                filter === f 
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20' 
                  : 'bg-[#121824] text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              {f === 'SUBMITTED' ? 'Queued' : f} 
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search transactions..."
            className="w-full bg-[#0E1420] text-slate-100 placeholder-slate-600 rounded-xl pl-9 pr-3 py-2 text-[11px] border border-slate-800/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="There are no payment records matching this status queue."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className="group p-5 rounded-3xl bg-[#0E1420] border border-slate-800/80 hover:border-amber-500/30 transition-all duration-300 shadow-xl"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-black text-amber-500 block leading-tight">{tx.transactionNumber}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Order #{tx.orderNumber}</span>
                  </div>
                </div>
                <TransactionStatusBadge status={tx.status} />
              </div>

              {/* Breakdown Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#070B14]/60 border border-slate-800/40 mb-5">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest block">Total Deposit</span>
                  <span className="font-mono font-black text-slate-200 text-sm block">
                    {tx.amountETB.toLocaleString()} <span className="text-[10px] text-slate-500">ETB</span>
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest block">EOM Fee (25%)</span>
                  <span className="font-mono font-black text-purple-400/80 text-sm block">
                    {tx.platformFeeETB.toLocaleString()} <span className="text-[10px]">ETB</span>
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest block">Seller Pay (75%)</span>
                  <span className="font-mono font-black text-emerald-400/80 text-sm block">
                    {tx.sellerPayoutETB.toLocaleString()} <span className="text-[10px]">ETB</span>
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest block">Method</span>
                  <PaymentMethodBadge method={tx.paymentMethod} />
                </div>
              </div>

              {/* Reference & Proof Box */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/50 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block">Bank Reference</span>
                      <span className="font-mono font-black text-amber-500 text-base leading-none">
                        {tx.paymentReference || 'NOT_SUBMITTED'}
                      </span>
                    </div>
                    {tx.senderName && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block">Sender Name</span>
                        <span className="text-xs text-slate-200 font-bold">{tx.senderName}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-800/60 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Buyer:</span>
                        <span className="text-slate-300 font-bold">{tx.buyerName}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Seller:</span>
                        <span className="text-slate-300 font-bold">{tx.sellerName}</span>
                      </div>
                    </div>
                  </div>

                  {tx.paymentProofUrl && (
                    <div className="relative group rounded-2xl overflow-hidden border border-slate-800 bg-[#070B14] aspect-video sm:aspect-auto sm:h-full">
                      <img
                        src={tx.paymentProofUrl}
                        alt="Receipt"
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 backdrop-blur-sm">
                          Proof Attached
                        </span>
                        <button
                          onClick={() => setZoomedReceiptUrl(tx.paymentProofUrl!)}
                          className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-110 transition-transform"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {tx.paymentProofNotes && (
                  <div className="p-3 rounded-xl bg-slate-900/20 border border-slate-800/40 text-[11px] text-slate-400 italic">
                    <span className="text-amber-500/60 font-black uppercase tracking-widest mr-2 not-italic">Buyer Memo:</span>
                    {tx.paymentProofNotes}
                  </div>
                )}
              </div>

              {/* Admin Action Buttons */}
              <div className="mt-6 pt-5 border-t border-slate-800/60 flex items-center justify-end gap-3">
                {tx.status === 'PAYMENT_SUBMITTED' && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setSelectedTxForVerification(tx)}
                    className="shadow-lg shadow-amber-500/10"
                    leftIcon={<ShieldCheck className="w-4 h-4" />}
                  >
                    Verify & Lock Escrow
                  </Button>
                )}

                {tx.status === 'PAYMENT_VERIFIED' && (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setSelectedTxForRefund(tx)}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                  >
                    Reverse Escrow
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {zoomedReceiptUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-12 cursor-pointer"
            onClick={() => setZoomedReceiptUrl(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center"
            >
              <img
                src={zoomedReceiptUrl}
                alt="Receipt Zoomed"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10 ring-1 ring-white/5"
              />
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 px-6 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-[11px] text-white/70 font-bold uppercase tracking-[0.2em]"
              >
                Click anywhere to return
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedTxForVerification && (
        <AdminPaymentVerificationModal
          isOpen={Boolean(selectedTxForVerification)}
          onClose={() => setSelectedTxForVerification(null)}
          transaction={selectedTxForVerification}
          onTransactionUpdated={() => {
            onTransactionsUpdated();
            setSelectedTxForVerification(null);
          }}
        />
      )}

      {selectedTxForRefund && (
        <AdminRefundModal
          isOpen={Boolean(selectedTxForRefund)}
          onClose={() => setSelectedTxForRefund(null)}
          transaction={selectedTxForRefund}
          onRefundIssued={() => {
            onTransactionsUpdated();
            setSelectedTxForRefund(null);
          }}
        />
      )}
    </div>
  );
};
