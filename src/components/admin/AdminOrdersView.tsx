import { apiClient } from "../../api/client";
import React, { useState } from 'react';
import { 
  ShoppingBag, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Search, 
  RotateCcw 
} from 'lucide-react';
import { Order, User as UserType, OrderStatus, EscrowStatus } from '../../types';
import { Button } from '../common/Button';
import { PlatformBadge } from '../common/Badge';
import { EmptyState } from '../common/StateViews';
import { useToast } from '../common/Toast';

export interface AdminOrdersViewProps {
  currentUser: UserType | null;
  orders: Order[];
  onOrdersUpdated: () => void;
}

export const AdminOrdersView: React.FC<AdminOrdersViewProps> = ({
  currentUser,
  orders,
  onOrdersUpdated
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<OrderStatus | 'DISPUTED' | 'ALL'>('PROCESSING');
  const [search, setSearch] = useState('');

  const filtered = orders.filter((o) => {
    if (filter === 'DISPUTED') {
      if (o.status !== 'DISPUTED' && o.escrowStatus !== 'DISPUTED') return false;
    } else if (filter !== 'ALL') {
      if (o.status !== filter) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.listingTitle.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.sellerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!currentUser) return;
    try {
      await apiClient.post(`/admin/orders/${orderId}/status`, { status: newStatus });
      showToast(`Order status updated to ${newStatus}.`, 'success');
      onOrdersUpdated();
    } catch (err: any) {
      showToast(err.message || 'Status update failed.', 'error');
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setFilter('PROCESSING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'PROCESSING' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
            }`}
          >
            In Escrow ({orders.filter((o) => o.status === 'PROCESSING').length})
          </button>
          <button
            onClick={() => setFilter('DISPUTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'DISPUTED' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
            }`}
          >
            Disputes ({orders.filter((o) => o.status === 'DISPUTED' || o.escrowStatus === 'DISPUTED').length})
          </button>
          <button
            onClick={() => setFilter('SUCCESS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'SUCCESS' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
            }`}
          >
            Completed ({orders.filter((o) => o.status === 'SUCCESS').length})
          </button>
          <button
            onClick={() => setFilter('CANCELLED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'CANCELLED' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
            }`}
          >
            Cancelled ({orders.filter((o) => o.status === 'CANCELLED').length})
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
            }`}
          >
            All ({orders.length})
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order #, user, or listing..."
            className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-3 py-1.5 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="There are no escrow orders matching this status queue."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div
              key={o.id}
              className="p-4 rounded-2xl bg-[#121824] border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400">{o.orderNumber}</span>
                  <span className="text-[10px] text-slate-500">•</span>
                  <PlatformBadge platform={o.platform} showLabel={false} />
                  <span className="text-xs font-bold text-slate-200">{o.listingTitle}</span>
                </div>

                <span className="font-mono text-sm font-black text-slate-100">
                  {o.amountETB.toLocaleString()} ETB
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-2.5 rounded-xl bg-black/30 border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 block">Buyer</span>
                  <span className="font-semibold text-slate-200">{o.buyerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Seller</span>
                  <span className="font-semibold text-slate-200">{o.sellerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Platform Fee (25%)</span>
                  <span className="font-mono text-purple-400">{o.platformFeeETB.toLocaleString()} ETB</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Seller Net (75%)</span>
                  <span className="font-mono text-emerald-400">{o.sellerPayoutETB.toLocaleString()} ETB</span>
                </div>
              </div>

              {o.disputeReason && (
                <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-900/60 text-xs text-rose-300">
                  <strong className="block font-bold">Dispute Note:</strong>
                  {o.disputeReason}
                </div>
              )}

              {/* Admin Actions */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
                <span className="text-slate-400">
                  Escrow Vault: <strong className="text-amber-400">{o.escrowStatus}</strong>
                </span>

                <div className="flex items-center gap-2">
                  {o.status === 'PROCESSING' && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleUpdateStatus(o.id, 'SUCCESS')}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Release & Disburse
                    </Button>
                  )}

                  {o.status === 'PROCESSING' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleUpdateStatus(o.id, 'CANCELLED')}
                    >
                      Cancel Order
                    </Button>
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
