import { apiClient } from "../../api/client";
import React, { useState } from 'react';
import { 
  Scale, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  DollarSign, 
  FileText 
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { Dispute, User } from '../../types';
import { useToast } from '../common/Toast';

export interface AdminArbitrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: Dispute | null;
  currentUser: User | null;
  onArbitrationExecuted: (updatedDispute: Dispute) => void;
}

export const AdminArbitrationModal: React.FC<AdminArbitrationModalProps> = ({
  isOpen,
  onClose,
  dispute,
  currentUser,
  onArbitrationExecuted
}) => {
  const { showToast } = useToast();
  const [outcome, setOutcome] = useState<'FULL_REFUND_BUYER' | 'RELEASE_ESCROW_SELLER' | 'SPLIT_SETTLEMENT'>('FULL_REFUND_BUYER');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [buyerRefundAmount, setBuyerRefundAmount] = useState<number>(0);
  const [sellerPayoutAmount, setSellerPayoutAmount] = useState<number>(0);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize split amounts when dispute loads
  React.useEffect(() => {
    if (dispute) {
      setBuyerRefundAmount(dispute.amountETB);
      setSellerPayoutAmount(0);
      setResolutionNotes('');
      setConfirmed(false);
      setError(null);
    }
  }, [dispute, isOpen]);

  const handleOutcomeChange = (newOutcome: 'FULL_REFUND_BUYER' | 'RELEASE_ESCROW_SELLER' | 'SPLIT_SETTLEMENT') => {
    setOutcome(newOutcome);
    if (!dispute) return;
    if (newOutcome === 'FULL_REFUND_BUYER') {
      setBuyerRefundAmount(dispute.amountETB);
      setSellerPayoutAmount(0);
    } else if (newOutcome === 'RELEASE_ESCROW_SELLER') {
      setBuyerRefundAmount(0);
      setSellerPayoutAmount(dispute.amountETB);
    } else {
      // 50-50 default split
      const half = Math.round(dispute.amountETB / 2);
      setBuyerRefundAmount(half);
      setSellerPayoutAmount(dispute.amountETB - half);
    }
  };

  if (!dispute || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setError('Please acknowledge and confirm the arbitration verdict.');
      return;
    }
    if (!resolutionNotes.trim() || resolutionNotes.trim().length < 5) {
      setError('Mandatory administrative resolution reasoning is required (minimum 5 characters).');
      return;
    }

    if (outcome === 'SPLIT_SETTLEMENT') {
      if (Number(buyerRefundAmount) + Number(sellerPayoutAmount) !== dispute.amountETB) {
        setError(`Split allocation sum (${Number(buyerRefundAmount) + Number(sellerPayoutAmount)} ETB) must exactly match the locked escrow amount (${dispute.amountETB.toLocaleString()} ETB).`);
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const updated = await apiClient.post<Dispute>(`/admin/disputes/${dispute.id}/arbitrate`, {
        outcome,
        resolutionNotes: resolutionNotes.trim(),
        buyerRefundAmountETB: outcome === 'FULL_REFUND_BUYER' ? dispute.amountETB : outcome === 'SPLIT_SETTLEMENT' ? Number(buyerRefundAmount) : 0,
        sellerPayoutAmountETB: outcome === 'RELEASE_ESCROW_SELLER' ? dispute.amountETB : outcome === 'SPLIT_SETTLEMENT' ? Number(sellerPayoutAmount) : 0
      });

      showToast(`Arbitration verdict executed: ${outcome.replace(/_/g, ' ')}`, 'success');
      onArbitrationExecuted(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to execute arbitration decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Arbitrate Dispute — ${dispute.disputeNumber}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Header summary */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Order Reference:</span>
            <span className="font-mono text-slate-200 font-bold">#{dispute.orderNumber}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Locked Escrow Amount:</span>
            <span className="font-mono text-amber-400 font-bold text-sm">{dispute.amountETB.toLocaleString()} ETB</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Buyer vs. Seller:</span>
            <span className="text-slate-200">
              <strong className="text-blue-400">{dispute.buyerName}</strong> vs <strong className="text-emerald-400">{dispute.sellerName}</strong>
            </span>
          </div>
        </div>

        {error && <Alert variant="error" title="Arbitration Error" message={error} />}

        {/* Verdict Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Select Arbitration Decision</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleOutcomeChange('FULL_REFUND_BUYER')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                outcome === 'FULL_REFUND_BUYER'
                  ? 'bg-blue-500/15 border-blue-400 text-blue-300 ring-1 ring-blue-400'
                  : 'bg-[#141B26] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <RotateCcw className="w-4 h-4 text-blue-400 mb-1.5" />
              <span className="text-xs font-bold block text-slate-100">Full Refund</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">100% to Buyer</span>
            </button>

            <button
              type="button"
              onClick={() => handleOutcomeChange('RELEASE_ESCROW_SELLER')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                outcome === 'RELEASE_ESCROW_SELLER'
                  ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                  : 'bg-[#141B26] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1.5" />
              <span className="text-xs font-bold block text-slate-100">Release Escrow</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">100% to Seller</span>
            </button>

            <button
              type="button"
              onClick={() => handleOutcomeChange('SPLIT_SETTLEMENT')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                outcome === 'SPLIT_SETTLEMENT'
                  ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400'
                  : 'bg-[#141B26] border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Scale className="w-4 h-4 text-cyan-400 mb-1.5" />
              <span className="text-xs font-bold block text-slate-100">Split Settlement</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Custom Split</span>
            </button>
          </div>
        </div>

        {/* Split Calculation fields if split is selected */}
        {outcome === 'SPLIT_SETTLEMENT' && (
          <div className="p-3.5 rounded-xl bg-[#141B26] border border-cyan-500/30 space-y-3">
            <span className="text-xs font-bold text-cyan-300 block">Allocate Escrow Distribution</span>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Buyer Refund (ETB)</label>
                <input
                  type="number"
                  min="0"
                  max={dispute.amountETB}
                  value={buyerRefundAmount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBuyerRefundAmount(val);
                    setSellerPayoutAmount(Math.max(0, dispute.amountETB - val));
                  }}
                  className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-xs border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Seller Payout (ETB)</label>
                <input
                  type="number"
                  min="0"
                  max={dispute.amountETB}
                  value={sellerPayoutAmount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSellerPayoutAmount(val);
                    setBuyerRefundAmount(Math.max(0, dispute.amountETB - val));
                  }}
                  className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-xs border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono font-bold"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
              <span>Total Allocated:</span>
              <span className={`font-mono font-bold ${Number(buyerRefundAmount) + Number(sellerPayoutAmount) === dispute.amountETB ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(Number(buyerRefundAmount) + Number(sellerPayoutAmount)).toLocaleString()} / {dispute.amountETB.toLocaleString()} ETB
              </span>
            </div>
          </div>
        )}

        {/* Mandatory Resolution Reasoning */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-300">
            Official Arbitration Reasoning * (Visible to Buyer & Seller)
          </label>
          <textarea
            rows={3}
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Explain why this decision was reached based on the evidence, 2FA logs, and EOM Escrow Guidelines..."
            required
            className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 cursor-pointer text-xs text-amber-200">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-amber-500/50 text-amber-500 focus:ring-amber-500"
          />
          <div className="leading-tight">
            <span className="font-bold block text-amber-300">Authoritative Escrow Movement Confirmation</span>
            I confirm that I have reviewed all mediation evidence and authorize EOM Vault funds to be settled irrevocably according to this decision.
          </div>
        </label>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="warning"
            size="md"
            isLoading={isSubmitting}
            disabled={!confirmed || !resolutionNotes.trim()}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            Execute Settlement Verdict
          </Button>
        </div>
      </form>
    </Modal>
  );
};
