import { apiClient } from "../../api/client";
import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, User, DollarSign } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Alert } from '../common/Alert';
import { Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

export interface AdminRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onRefundIssued: (updated: Transaction) => void;
}

export const AdminRefundModal: React.FC<AdminRefundModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onRefundIssued
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [refundDestination, setRefundDestination] = useState(
    transaction?.buyerPhone || transaction?.buyerEmail || ''
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transaction) return null;

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!reason.trim()) {
      setError('A mandatory reason is required to issue an official escrow refund.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    try {
      const updated = await apiClient.post<Transaction>(`/admin/transactions/${transaction.id}/refund`, {
        reason: reason.trim(),
        refundDestinationAccount: refundDestination.trim() || undefined
      });
      showToast(`Refund of ${transaction.amountETB.toLocaleString()} ETB issued successfully!`, 'success');
      onRefundIssued(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process refund.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Issue Escrow Refund — #${transaction.transactionNumber}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleRefund} className="space-y-4 text-left">
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-2.5 text-xs text-purple-200">
          <AlertTriangle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-purple-300 block mb-0.5">Authoritative Escrow Refund</span>
            This action will revert the transaction, release locked funds back to the buyer, and create an immutable audit record.
          </div>
        </div>

        {error && <Alert variant="error" title="Refund Error" message={error} />}

        {/* Transaction Summary */}
        <div className="p-3.5 rounded-xl bg-[#141B26] border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Order:</span>
            <span className="font-mono text-slate-200 font-bold">{transaction.orderNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Buyer:</span>
            <span className="text-slate-200 font-semibold">{transaction.buyerName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Refund Amount (100%):</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              {transaction.amountETB.toLocaleString()} ETB
            </span>
          </div>
        </div>

        <Input
          label="Refund Destination (Bank Account or Telebirr Phone)"
          placeholder="e.g. +251 91 198 7654 or CBE Account"
          value={refundDestination}
          onChange={(e) => setRefundDestination(e.target.value)}
        />

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-300">
            Mandatory Refund Reason *
          </label>
          <textarea
            className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            placeholder="e.g. Seller was unable to provide 2FA ownership transfer or channel dispute resolved in favor of buyer."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="md"
            isLoading={isProcessing}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Confirm & Issue Refund
          </Button>
        </div>
      </form>
    </Modal>
  );
};
