import { apiClient } from "../../api/client";
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  Send, 
  CheckCircle2, 
  ExternalLink, 
  AlertTriangle, 
  Lock, 
  RotateCcw, 
  User, 
  CreditCard 
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { Order, Transaction, User as UserType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { TransactionStatusBadge } from '../transactions/TransactionStatusBadge';
import { useToast } from '../common/Toast';

export interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  currentUser: UserType | null;
  onOrderUpdated: (updatedOrder: Order) => void;
  onOpenPaymentModal: (order: Order, tx: Transaction | null) => void;
  onOpenDisputeModal: (order: Order) => void;
  onOpenMediationRoom?: (order: Order) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  currentUser,
  onOrderUpdated,
  onOpenPaymentModal,
  onOpenDisputeModal,
  onOpenMediationRoom
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isConfirmingCompletion, setIsConfirmingCompletion] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      apiClient.get<Transaction | null>(`/transactions/order/${order.id}`)
        .then((tx) => setTransaction(tx))
        .catch(console.error);
    } else {
      setTransaction(null);
    }
  }, [order, currentUser]);

  if (!order) return null;

  const isBuyer = currentUser?.id === order.buyerId;
  const isSeller = currentUser?.id === order.sellerId;
  const isAdmin = currentUser?.authRole === 'admin' || currentUser?.role === 'ADMIN';

  const handleConfirmCompletion = async () => {
    if (!user) return;
    setError(null);
    setIsConfirmingCompletion(true);
    try {
      const updated = await apiClient.post<Order>(`/orders/${order.id}/complete`, {
        notes: 'Buyer confirmed full receipt of channel credentials and 2FA ownership.'
      });
      showToast('Order marked completed! Escrow released to seller.', 'success');
      onOrderUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete order.');
    } finally {
      setIsConfirmingCompletion(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!user) return;
    setError(null);
    setIsCancelling(true);
    try {
      const updated = await apiClient.post<Order>(`/orders/${order.id}/cancel`, {
        reason: 'Cancelled by buyer prior to channel handover.'
      });
      showToast('Order cancelled.', 'info');
      onOrderUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Order Details — #${order.orderNumber}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-left">
        {error && <Alert variant="error" title="Action Error" message={error} />}

        {/* Escrow Status Card */}
        <div className="p-4 rounded-xl bg-[#141B26] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Order Status</span>
              <span className="font-bold text-slate-100 text-sm">{order.status}</span>
            </div>
            {transaction && <TransactionStatusBadge status={transaction.status} />}
          </div>

          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Channel Name</span>
              <span className="font-semibold text-slate-200 truncate block">{order.listingTitle}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase">Escrow Total</span>
              <span className="font-mono font-black text-amber-400 text-sm">
                {order.amountETB.toLocaleString()} ETB
              </span>
            </div>
          </div>
        </div>

        {/* Financial Breakdown (25% Commission / 75% Seller Payout) */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
            Escrow Financial Breakdown (Authoritative 25% / 75%)
          </span>
          <div className="flex items-center justify-between text-slate-400">
            <span>Listing Price (100%):</span>
            <span className="font-mono text-slate-200">{order.amountETB.toLocaleString()} ETB</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>EOM Platform Escrow Commission (25%):</span>
            <span className="font-mono text-slate-300">{order.platformFeeETB.toLocaleString()} ETB</span>
          </div>
          <div className="flex items-center justify-between text-emerald-400 font-semibold pt-1 border-t border-slate-800/80">
            <span>Net Seller Payout (75%):</span>
            <span className="font-mono">{order.sellerPayoutETB.toLocaleString()} ETB</span>
          </div>
        </div>

        {/* Transfer Step Progress */}
        <div className="p-3.5 rounded-xl bg-[#141B26] border border-slate-800 space-y-2 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Transfer Handover Step
          </span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-slate-800 font-mono font-semibold text-amber-300">
              {order.transferDetails?.step || 'VERIFICATION'}
            </span>
            <span className="text-slate-400">
              {order.transferDetails?.step === 'COMPLETED'
                ? 'Channel handed over & confirmed.'
                : 'Escrow admins verifying deposit & 2FA transfer.'}
            </span>
          </div>
          {order.adminNotes && (
            <p className="text-[11px] text-slate-400 italic pt-1">Note: {order.adminNotes}</p>
          )}
        </div>

        {/* Counterparty Information */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Buyer:</span>
            <span className="font-semibold text-slate-200">
              {order.buyerName} {order.buyerTelegram ? `(${order.buyerTelegram})` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Seller:</span>
            <span className="font-semibold text-slate-200">
              {order.sellerName} {order.sellerTelegram ? `(${order.sellerTelegram})` : ''}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          {/* Disputed State Notice & Mediation Room Link */}
          {order.status === 'DISPUTED' && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Order Frozen in Active Dispute</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Escrow payout is locked. EOM Arbitrators are actively mediating this case. Both buyer and seller must participate in the mediation chat room.
              </p>
              {order.disputeReason && (
                <p className="text-[11px] text-rose-200/90 italic bg-black/40 p-2 rounded-lg">
                  Reason: {order.disputeReason}
                </p>
              )}
              {onOpenMediationRoom && (
                <Button
                  variant="warning"
                  fullWidth
                  size="md"
                  onClick={() => onOpenMediationRoom(order)}
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  Enter 3-Party Mediation Room
                </Button>
              )}
            </div>
          )}

          {/* Buyer Actions */}
          {isBuyer && order.status === 'PROCESSING' && (
            <div className="space-y-2">
              <Button
                variant="platform"
                fullWidth
                size="md"
                onClick={() => onOpenPaymentModal(order, transaction)}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Deposit / Submit Payment Reference
              </Button>

              <Button
                variant="success"
                fullWidth
                size="md"
                isLoading={isConfirmingCompletion}
                onClick={handleConfirmCompletion}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                I Received Channel Ownership (Release Escrow)
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => onOpenDisputeModal(order)}
                  leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                >
                  Raise Dispute
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  isLoading={isCancelling}
                  onClick={handleCancelOrder}
                >
                  Cancel Order
                </Button>
              </div>
            </div>
          )}

          {/* Admin Controls */}
          {isAdmin && order.status === 'PROCESSING' && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
              <span className="text-[10px] font-bold text-purple-300 uppercase block">Admin Actions</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={handleConfirmCompletion}
                >
                  Force Complete & Disburse
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
