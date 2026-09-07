import { apiClient } from "../api/client";
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  Store, 
  ShieldCheck, 
  CreditCard, 
  ArrowUpRight, 
  Lock, 
  Clock, 
  PlusCircle, 
  RefreshCw 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order, Transaction, Listing } from '../types';
import { OrderCard } from '../components/orders/OrderCard';
import { OrderDetailModal } from '../components/orders/OrderDetailModal';
import { DisputeModal } from '../components/orders/DisputeModal';
import { BuyerPaymentModal } from '../components/transactions/BuyerPaymentModal';
import { TransactionHistoryList } from '../components/transactions/TransactionHistoryList';
import { SellerPayoutModal } from '../components/seller/SellerPayoutModal';
import { Button } from '../components/common/Button';

export interface DashboardViewProps {
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sellerStats, setSellerStats] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [paymentModalTx, setPaymentModalTx] = useState<Transaction | null>(null);
  const [disputeModalOrder, setDisputeModalOrder] = useState<Order | null>(null);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  const loadData = async () => {
    if (!user) return;
    const [userOrders, userTxs] = await Promise.all([
      apiClient.get<Order[]>('/orders'),
      apiClient.get<Transaction[]>('/transactions')
    ]);
    setOrders(userOrders);
    setTransactions(userTxs);

    if (user.role === 'SELLER') {
      const totalSalesETB = userTxs.filter((t) => t.sellerId === user.id && t.status === 'COMPLETED').reduce((sum, t) => sum + t.amountETB, 0);
      const lockedBalanceETB = userTxs.filter((t) => t.sellerId === user.id && (t.status === 'PAYMENT_VERIFIED' || t.status === 'PAYMENT_SUBMITTED')).reduce((sum, t) => sum + t.sellerPayoutETB, 0);
      setSellerStats({
        availableBalanceETB: Number(user.walletBalanceETB || 0),
        lockedBalanceETB,
        totalSalesETB,
        completedOrdersCount: userTxs.filter((t) => t.sellerId === user.id && t.status === 'COMPLETED').length,
        activeListingsCount: 0
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (!user) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-100">Sign In to View Dashboard</h3>
        <p className="text-xs text-slate-400">
          Track escrow deposits, channel handovers, and seller payout balances.
        </p>
      </div>
    );
  }

  const isSeller = user.role === 'SELLER';
  const isAdmin = user.authRole === 'admin' || user.role === 'ADMIN';

  // Authoritative calculations
  const pendingOrders = orders.filter((o) => o.status === 'PROCESSING');
  const completedOrders = orders.filter((o) => o.status === 'SUCCESS');
  const totalLockedEscrowETB = transactions
    .filter((t) => t.status === 'PAYMENT_VERIFIED' || t.status === 'PAYMENT_SUBMITTED')
    .reduce((sum, t) => sum + t.amountETB, 0);

  return (
    <div className="space-y-6 pb-24 text-left max-w-xl mx-auto">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#090C14] border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            {isSeller ? 'Available Payout' : 'Active Escrow Total'}
          </span>
          <span className="text-base sm:text-lg font-black text-amber-500 font-mono">
            {isSeller
              ? `${(sellerStats?.availableBalanceETB || 0).toLocaleString()} ETB`
              : `${totalLockedEscrowETB.toLocaleString()} ETB`}
          </span>
          <span className="text-[10px] text-slate-400 block">
            {isSeller ? '75% Net Disbursable' : `${pendingOrders.length} active orders`}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#090C14] border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Pending Orders</span>
          <span className="text-base sm:text-lg font-black text-slate-100 font-mono">
            {pendingOrders.length}
          </span>
          <span className="text-[10px] text-indigo-400 block flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Escrow Mediation</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#090C14] border border-slate-800/80 space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Completed Orders</span>
          <span className="text-base sm:text-lg font-black text-purple-400 font-mono">
            {completedOrders.length}
          </span>
          <span className="text-[10px] text-slate-400 block">100% Escrow Fulfilled</span>
        </div>
      </div>

      {/* Seller Quick Action Payout Bar */}
      {isSeller && sellerStats?.availableBalanceETB > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-emerald-300 block">
              Available Balance: {sellerStats.availableBalanceETB.toLocaleString()} ETB
            </span>
            <span className="text-[11px] text-emerald-400/80">Ready for direct withdrawal to CBE / Telebirr</span>
          </div>
          <Button
            variant="success"
            size="sm"
            onClick={() => setIsPayoutModalOpen(true)}
            leftIcon={<CreditCard className="w-3.5 h-3.5" />}
          >
            Withdraw (75%)
          </Button>
        </div>
      )}

      {/* Active Orders Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
            <span>Active Escrow Orders</span>
          </h3>
          <button
            type="button"
            onClick={() => onNavigateToTab('orders')}
            className="text-xs text-indigo-400 hover:underline font-semibold cursor-pointer"
          >
            View All ({orders.length})
          </button>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#090C14] border border-slate-800 text-center text-xs text-slate-400">
            No active escrow orders at the moment.
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingOrders.slice(0, 3).map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                currentUser={user}
                onSelect={(o) => setSelectedOrder(o)}
                onOpenPayment={async (o) => {
                  const tx = await apiClient.get<Transaction | null>(`/transactions/order/${o.id}`);
                  setPaymentModalOrder(o);
                  setPaymentModalTx(tx);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Financial Transactions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Payment & Escrow History</span>
          </h3>
          <button
            type="button"
            onClick={loadData}
            className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <TransactionHistoryList
          transactions={transactions}
          currentUser={user}
          onSelectTransaction={async (tx) => {
            try {
              const order = await apiClient.get<Order>(`/orders/${tx.orderId}`);
              if (order) setSelectedOrder(order);
            } catch (error) {
              console.error('Failed to load order for transaction:', error);
            }
          }}
        />
      </div>

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailModal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          currentUser={user}
          onOrderUpdated={() => loadData()}
          onOpenPaymentModal={(o, tx) => {
            setSelectedOrder(null);
            setPaymentModalOrder(o);
            setPaymentModalTx(tx);
          }}
          onOpenDisputeModal={(o) => {
            setSelectedOrder(null);
            setDisputeModalOrder(o);
          }}
        />
      )}

      {paymentModalOrder && (
        <BuyerPaymentModal
          isOpen={Boolean(paymentModalOrder)}
          onClose={() => {
            setPaymentModalOrder(null);
            setPaymentModalTx(null);
          }}
          order={paymentModalOrder}
          transaction={paymentModalTx}
          onPaymentSubmitted={() => {
            loadData();
            setPaymentModalOrder(null);
            setPaymentModalTx(null);
          }}
        />
      )}

      {disputeModalOrder && (
        <DisputeModal
          isOpen={Boolean(disputeModalOrder)}
          onClose={() => setDisputeModalOrder(null)}
          order={disputeModalOrder}
          onDisputeRaised={() => {
            loadData();
            setDisputeModalOrder(null);
          }}
        />
      )}

      {isPayoutModalOpen && (
        <SellerPayoutModal
          isOpen={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          currentUser={user}
          availableBalanceETB={sellerStats?.availableBalanceETB || 0}
          onPayoutRequested={() => {
            loadData();
            setIsPayoutModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
