import React from 'react';
import { 
  ShoppingBag, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  Send, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { Order, User } from '../../types';
import { PlatformBadge } from '../common/Badge';

export interface OrderCardProps {
  order: Order;
  currentUser: User | null;
  onSelect: (order: Order) => void;
  onOpenPayment?: (order: Order) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  currentUser,
  onSelect,
  onOpenPayment
}) => {
  const isBuyer = currentUser?.id === order.buyerId;
  const isSeller = currentUser?.id === order.sellerId;

  const getStatusBadge = () => {
    switch (order.status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Completed</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>In Escrow Transfer</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <span>Cancelled</span>
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>Disputed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300">
            <span>{order.status}</span>
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => onSelect(order)}
      className="p-4 rounded-2xl bg-[#121824] hover:bg-[#161F2E] border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer text-left space-y-3 group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-amber-400">{order.orderNumber}</span>
          <span className="text-[10px] text-slate-500">•</span>
          <PlatformBadge platform={order.platform} showLabel={false} />
        </div>
        {getStatusBadge()}
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-1">
          {order.listingTitle}
        </h4>
        <p className="text-xs text-slate-400 mt-0.5">
          {isBuyer ? `Seller: ${order.sellerName}` : `Buyer: ${order.buyerName}`}
        </p>
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Amount</span>
          <span className="text-sm sm:text-base font-black text-amber-400 font-mono">
            {order.amountETB.toLocaleString()} ETB
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isBuyer && order.status === 'PROCESSING' && onOpenPayment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPayment(order);
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Deposit / View Reference
            </button>
          )}

          <div className="flex items-center gap-0.5 text-xs text-slate-400 group-hover:text-amber-400 transition-colors font-medium">
            <span>Details</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
