import { apiClient } from "../../api/client";
import React, { useState } from 'react';
import { AlertTriangle, Send, Paperclip } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { Order, DisputeReason } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

export interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onDisputeRaised: (updatedOrder: Order) => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  order,
  onDisputeRaised
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reason, setReason] = useState<DisputeReason>('CREDENTIAL_MISMATCH');
  const [details, setDetails] = useState('');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!details.trim() || details.trim().length < 5) {
      setError('Please provide specific dispute details explaining the issue (minimum 5 characters).');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const createdDispute = await apiClient.post<any>('/disputes/create', {
        orderId: order.id,
        reason,
        details: details.trim(),
        initialEvidence: evidenceTitle.trim() ? {
          title: evidenceTitle.trim(),
          fileUrl: evidenceUrl.trim() || undefined,
          description: details.trim()
        } : undefined
      });

      showToast(`Dispute #${createdDispute.disputeNumber} opened. Escrow frozen for mediation.`, 'warning');
      const updatedOrder = {
        ...order,
        status: 'DISPUTED' as const,
        escrowStatus: 'DISPUTED' as const,
        disputeReason: `${reason}: ${details.trim()}`
      };
      onDisputeRaised(updatedOrder);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to open dispute.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Open Dispute — Order #${order.orderNumber}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-amber-300 block mb-0.5">Admin Dispute Arbitration</span>
            Opening a dispute will freeze escrow payout. Administrators (@mr_ebek & @EXO_SMM) will step into the 3-party mediation room to review 2FA and ownership proofs.
          </div>
        </div>

        {error && <Alert variant="error" title="Error" message={error} />}

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-300">Dispute Reason</label>
          <select
            className="w-full bg-[#141B26] text-slate-100 rounded-xl px-3.5 py-2.5 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            value={reason}
            onChange={(e) => setReason(e.target.value as DisputeReason)}
          >
            <option value="CREDENTIAL_MISMATCH">Credential Mismatch / Invalid Login</option>
            <option value="2FA_RECOVERY_ISSUE">2FA Recovery Email / Cloud Password Issue</option>
            <option value="SELLER_UNRESPONSIVE">Seller Unresponsive / Refusing Transfer</option>
            <option value="BUYER_UNRESPONSIVE">Buyer Unresponsive</option>
            <option value="STRIKE_OR_BAN_ON_CHANNEL">Undisclosed Strikes / Channel Penalties</option>
            <option value="PAYMENT_DISPUTE">Payment / Bank Transfer Discrepancy</option>
            <option value="OTHER">Other Issue</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-300">
            Explain the Issue in Detail *
          </label>
          <textarea
            className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            placeholder="Describe what happened, error messages, and what steps were attempted with the other party..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            required
          />
        </div>

        {/* Optional Initial Proof */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-amber-400" />
            <span>Attach Initial Screenshot / Evidence (Optional)</span>
          </span>
          <input
            type="text"
            placeholder="Evidence title (e.g. 2FA Lock Screen)"
            value={evidenceTitle}
            onChange={(e) => setEvidenceTitle(e.target.value)}
            className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-lg px-3 py-1.5 text-xs border border-slate-800"
          />
          <input
            type="url"
            placeholder="Image / Screenshot URL (optional)"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-lg px-3 py-1.5 text-xs border border-slate-800"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="md"
            isLoading={isSubmitting}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Submit Dispute
          </Button>
        </div>
      </form>
    </Modal>
  );
};
