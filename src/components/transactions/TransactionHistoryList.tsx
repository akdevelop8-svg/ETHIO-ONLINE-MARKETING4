import React, { useState } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  Building2, 
  ChevronRight, 
  Search, 
  Filter 
} from 'lucide-react';
import { Transaction, User } from '../../types';
import { TransactionStatusBadge } from './TransactionStatusBadge';
import { PaymentMethodBadge } from '../common/PaymentIcons';
import { EmptyState } from '../common/StateViews';

export interface TransactionHistoryListProps {
  transactions: Transaction[];
  currentUser: User | null;
  onSelectTransaction?: (tx: Transaction) => void;
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({
  transactions,
  currentUser,
  onSelectTransaction
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const isAdmin = currentUser?.authRole === 'admin' || currentUser?.role === 'ADMIN';

  const filtered = transactions.filter((tx) => {
    if (statusFilter !== 'ALL' && tx.status !== statusFilter) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        tx.transactionNumber.toLowerCase().includes(q) ||
        tx.orderNumber.toLowerCase().includes(q) ||
        tx.listingTitle.toLowerCase().includes(q) ||
        (tx.paymentReference && tx.paymentReference.toLowerCase().includes(q)) ||
        tx.buyerName.toLowerCase().includes(q) ||
        tx.sellerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-3 text-left">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions, ref codes, order #..."
            className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#141B26] text-slate-200 rounded-xl px-3 py-2 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
        >
          <option value="ALL">All Payment Statuses</option>
          <option value="PAYMENT_PENDING">Awaiting Deposit</option>
          <option value="PAYMENT_SUBMITTED">Pending Verification</option>
          <option value="PAYMENT_VERIFIED">Escrow Verified</option>
          <option value="COMPLETED">Completed & Disbursed</option>
          <option value="REFUNDED">Refunded</option>
          <option value="FAILED">Rejected / Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="No financial transactions match your current search and filter settings."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => {
            const isBuyer = currentUser?.id === tx.buyerId;
            const isSeller = currentUser?.id === tx.sellerId;

            return (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction?.(tx)}
                className="p-3.5 rounded-xl bg-[#141B26] border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {tx.transactionNumber}
                    </span>
                    <span className="text-[10px] text-slate-500">•</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Order #{tx.orderNumber}
                    </span>
                  </div>
                  <TransactionStatusBadge status={tx.status} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-200 line-clamp-1 group-hover:text-amber-400 transition-colors">
                      {tx.listingTitle}
                    </h5>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                      <PaymentMethodBadge method={tx.paymentMethod} />
                      {tx.paymentReference && (
                        <span>• Ref: <strong className="font-mono text-amber-400/90">{tx.paymentReference}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm sm:text-base font-black text-slate-100">
                      {tx.amountETB.toLocaleString()} ETB
                    </span>
                    {isSeller && (
                      <span className="block text-[10px] text-emerald-400 font-semibold">
                        Net: {tx.sellerPayoutETB.toLocaleString()} ETB (75%)
                      </span>
                    )}
                    {isAdmin && (
                      <span className="block text-[10px] text-purple-400 font-semibold">
                        Fee: {tx.platformFeeETB.toLocaleString()} ETB (25%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-amber-400 transition-colors font-medium">
                    <span>View Breakdown</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
