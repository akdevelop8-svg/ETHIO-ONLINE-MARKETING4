import { apiClient } from "../../api/client";
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Building2, 
  User, 
  CreditCard,
  Image as ImageIcon,
  ExternalLink,
  ZoomIn
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { Transaction } from '../../types';
import { PaymentMethodBadge } from '../common/PaymentIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

export interface AdminPaymentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onTransactionUpdated: (updated: Transaction) => void;
}

export const AdminPaymentVerificationModal: React.FC<AdminPaymentVerificationModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onTransactionUpdated
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<'verify' | 'reject'>('verify');
  const [error, setError] = useState<string | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  if (!transaction) return null;

  const handleVerify = async () => {
    if (!user) return;
    setError(null);
    setIsProcessing(true);
    try {
      const updated = await apiClient.post<Transaction>(`/admin/transactions/${transaction.id}/verify`, {
        adminNotes: adminNotes.trim() || undefined
      });
      showToast(`Payment for #${transaction.transactionNumber} verified! Escrow locked.`, 'success');
      onTransactionUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to verify payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!user) return;
    if (!rejectionReason.trim()) {
      setError('Please provide a specific rejection reason for the buyer.');
      return;
    }
    setError(null);
    setIsProcessing(true);
    try {
      const updated = await apiClient.post<Transaction>(`/admin/transactions/${transaction.id}/reject`, {
        reason: rejectionReason.trim(),
        adminNotes: adminNotes.trim() || undefined
      });
      showToast(`Payment rejected and buyer notified.`, 'error');
      onTransactionUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reject payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Admin Payment Review — ${transaction.transactionNumber}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-left">
        {error && <Alert variant="error" title="Action Failed" message={error} />}

        {/* Order & Financial Summary */}
        <div className="p-4 rounded-xl bg-[#141B26] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Order Reference:</span>
            <span className="font-mono text-xs font-bold text-amber-400">#{transaction.orderNumber}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Claimed Deposit Amount:</span>
            <span className="font-mono text-base font-black text-slate-100">
              {transaction.amountETB.toLocaleString()} ETB
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Platform Fee (25%)</span>
              <span className="font-mono font-semibold text-purple-400">
                {transaction.platformFeeETB.toLocaleString()} ETB
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Seller Payout (75%)</span>
              <span className="font-mono font-semibold text-emerald-400">
                {transaction.sellerPayoutETB.toLocaleString()} ETB
              </span>
            </div>
          </div>
        </div>

        {/* Buyer Submission Evidence Box */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Submitted Transfer Evidence
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Buyer Full Name:</span>
              <span className="font-bold text-slate-200">{transaction.buyerName}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Bank Transfer Sender Name:</span>
              <span className="font-bold text-amber-300 font-mono">{transaction.senderName || 'Not specified'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Buyer Telegram Handle:</span>
              <span className="font-mono text-sky-400 font-semibold">{transaction.buyerTelegram || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Selected Payment Method:</span>
              <PaymentMethodBadge method={transaction.paymentMethod} />
            </div>

            <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Transaction Reference Code:</span>
              <span className="font-mono text-sm font-black text-amber-300">
                {transaction.paymentReference || 'No reference code provided'}
              </span>
            </div>

            {transaction.paymentProofNotes && (
              <div className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block font-bold mb-0.5 uppercase">Buyer Notes:</span>
                {transaction.paymentProofNotes}
              </div>
            )}

            {/* Receipt Screenshot Section */}
            {transaction.paymentProofUrl ? (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Attached Receipt Screenshot:</span>
                <div
                  onClick={() => setIsImageZoomed(!isImageZoomed)}
                  className="relative group rounded-xl overflow-hidden border border-slate-700 max-h-48 cursor-pointer bg-black/60"
                >
                  <img
                    src={transaction.paymentProofUrl}
                    alt="Receipt Evidence"
                    className="w-full h-auto object-contain max-h-48 mx-auto"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                    <ZoomIn className="w-5 h-5" />
                    <span>Click to Zoom</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-800/40 text-[11px] text-slate-400 italic">
                No receipt screenshot image attached.
              </div>
            )}
          </div>
        </div>

        {/* Image Zoom Lightbox */}
        {isImageZoomed && transaction.paymentProofUrl && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setIsImageZoomed(false)}
          >
            <div className="max-w-3xl max-h-[90vh] overflow-auto">
              <img
                src={transaction.paymentProofUrl}
                alt="Receipt Zoomed"
                className="w-full h-auto rounded-xl shadow-2xl border border-slate-700"
              />
              <p className="text-center text-xs text-slate-400 mt-2">Click anywhere to close</p>
            </div>
          </div>
        )}

        {/* Verification Action Toggle */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActionType('verify')}
            className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              actionType === 'verify'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-md shadow-emerald-500/10'
                : 'bg-slate-900/40 text-slate-400 border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Approve & Lock Escrow</span>
          </button>
          <button
            type="button"
            onClick={() => setActionType('reject')}
            className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              actionType === 'reject'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-md shadow-rose-500/10'
                : 'bg-slate-900/40 text-slate-400 border-slate-800'
            }`}
          >
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>Reject Deposit</span>
          </button>
        </div>

        {actionType === 'verify' ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Admin Notes (Optional)
              </label>
              <textarea
                className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                placeholder="e.g. Verified against BoA ledger by @mr_ebek"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
              />
            </div>
            <Button
              type="button"
              variant="success"
              fullWidth
              size="md"
              isLoading={isProcessing}
              onClick={handleVerify}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Approve Payment ({transaction.amountETB.toLocaleString()} ETB)
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-rose-300">
                Rejection Reason (Required) *
              </label>
              <textarea
                className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs border border-rose-900/80 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                placeholder="e.g. Reference code not found on Bank statement or receipt screenshot unreadable."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                required
              />
            </div>
            <Button
              type="button"
              variant="danger"
              fullWidth
              size="md"
              isLoading={isProcessing}
              onClick={handleReject}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Reject Payment Submission
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
