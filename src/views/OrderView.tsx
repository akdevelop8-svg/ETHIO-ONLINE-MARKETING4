import { apiClient } from "../api/client";
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Filter, Lock, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order, Transaction, OrderStatus } from '../types';
import { OrderCard } from '../components/orders/OrderCard';
import { OrderDetailModal } from '../components/orders/OrderDetailModal';
import { BuyerPaymentModal } from '../components/transactions/BuyerPaymentModal';
import { DisputeModal } from '../components/orders/DisputeModal';
import { MediationChatRoom } from '../components/disputes/MediationChatRoom';
import { EmptyState } from '../components/common/StateViews';

export const OrderView: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [paymentModalTx, setPaymentModalTx] = useState<Transaction | null>(null);
  const [disputeModalOrder, setDisputeModalOrder] = useState<Order | null>(null);
  const [activeMediationDisputeId, setActiveMediationDisputeId] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!user) return;
    try {
      const userOrders = await apiClient.get<Order[]>('/orders');
      setOrders(userOrders);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-100">Sign In to View Orders</h3>
        <p className="text-xs text-slate-400">
          Manage channel transfers, confirm receipt, and view escrow verification status.
        </p>
      </div>
    );
  }

  const handleOpenMediation = async (order: Order) => {
    if (!user) return;
    try {
      const disputes = await apiClient.get<any[]>('/disputes');
      const dispute = disputes.find((d) => d.orderId === order.id);
      if (dispute) {
        setSelectedOrder(null);
        setActiveMediationDisputeId(dispute.id);
      }
    } catch (error) {
      console.error('Failed to load dispute mediation record:', error);
    }
  };

  const filtered = orders.filter((o) => {
    if (filter !== 'ALL' && o.status !== filter) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.listingTitle.toLowerCase().includes(q) ||
        o.sellerName.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-24 text-left max-w-xl mx-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-amber-400" />
          <span>My Escrow Orders</span>
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          {orders.length} total orders
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
          }`}
        >
          All ({orders.length})
        </button>
        <button
          onClick={() => setFilter('PROCESSING')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'PROCESSING' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
          }`}
        >
          In Progress ({orders.filter((o) => o.status === 'PROCESSING').length})
        </button>
        <button
          onClick={() => setFilter('SUCCESS')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'SUCCESS' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
          }`}
        >
          Completed ({orders.filter((o) => o.status === 'SUCCESS').length})
        </button>
        <button
          onClick={() => setFilter('DISPUTED')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'DISPUTED' ? 'bg-amber-500 text-slate-950' : 'bg-[#141B26] text-slate-300 border border-slate-800'
          }`}
        >
          Disputed ({orders.filter((o) => o.status === 'DISPUTED').length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by order # or channel name..."
          className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="You do not have any active or past orders in this category."
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((order) => (
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

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailModal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          currentUser={user}
          onOrderUpdated={() => loadOrders()}
          onOpenPaymentModal={(o, tx) => {
            setSelectedOrder(null);
            setPaymentModalOrder(o);
            setPaymentModalTx(tx);
          }}
          onOpenDisputeModal={(o) => {
            setSelectedOrder(null);
            setDisputeModalOrder(o);
          }}
          onOpenMediationRoom={(o) => handleOpenMediation(o)}
        />
      )}

      {paymentModalOrder && (
        <BuyerPaymentModal
          isOpen={Boolean(paymentModalOrder)}
          onClose={() => {
            setPaymentModalOrder(null);
            setPaymentModalTx(null);
          }}
          transaction={paymentModalTx}
          onPaymentSubmitted={() => {
            loadOrders();
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
            loadOrders();
            setDisputeModalOrder(null);
          }}
        />
      )}

      {activeMediationDisputeId && (
        <MediationChatRoom
          disputeId={activeMediationDisputeId}
          currentUser={user}
          onClose={() => setActiveMediationDisputeId(null)}
          onDisputeUpdated={() => loadOrders()}
        />
      )}
    </div>
  );
};
