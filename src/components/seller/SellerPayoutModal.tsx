import { apiClient } from "../../api/client";
import React, { useState } from 'react';
import { DollarSign, Building2, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Alert } from '../common/Alert';
import { User } from '../../types';
import { PaymentMethodIcon } from '../common/PaymentIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

export interface SellerPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  availableBalanceETB: number;
  onPayoutRequested: () => void;
}

export const SellerPayoutModal: React.FC<SellerPayoutModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  availableBalanceETB,
  onPayoutRequested
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [bankName, setBankName] = useState('Commercial Bank of Ethiopia (CBE)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState(currentUser?.fullName || '');
  const [amountETB, setAmountETB] = useState(String(availableBalanceETB || ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!accountNumber.trim() || !accountHolder.trim() || !amountETB) {
      setError('Please fill in all payout details.');
      return;
    }
    const requested = Number(amountETB);
    if (requested <= 0 || requested > availableBalanceETB) {
      setError(`Withdrawal amount must be between 1 and ${availableBalanceETB.toLocaleString()} ETB.`);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/seller/payout', {
        amountETB: requested,
        bankName,
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolder.trim()
      });
      showToast(`Payout request of ${requested.toLocaleString()} ETB submitted!`, 'success');
      onPayoutRequested();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit payout request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Seller Payout"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
          <span className="font-bold text-emerald-300 block mb-0.5">Authoritative Seller Payout</span>
          Funds released from completed orders are processed directly to your Ethiopian bank account or Telebirr.
        </div>

        {error && <Alert variant="error" title="Error" message={error} />}

        <div className="p-3 rounded-xl bg-[#141B26] border border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400">Available Balance:</span>
          <span className="font-mono text-base font-black text-amber-400">
            {availableBalanceETB.toLocaleString()} ETB
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Select Payout Channel</label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[
              { id: 'Commercial Bank of Ethiopia (CBE)', name: 'CBE', methodKey: 'CBE' },
              { id: 'Telebirr (Ethio Telecom)', name: 'Telebirr', methodKey: 'TELEBIRR' },
              { id: 'Dashen Bank (Amole)', name: 'Dashen Bank', methodKey: 'DASHEN' },
              { id: 'Awash Bank', name: 'Awash Bank', methodKey: 'AWASH' }
            ].map((b) => {
              const isSelected = bankName === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBankName(b.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                      : 'bg-[#141B26] border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-[#182232]'
                  }`}
                >
                  <PaymentMethodIcon method={b.methodKey} className="w-6 h-6 shrink-0 rounded-md" />
                  <span className="text-xs font-bold truncate">{b.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Account Holder Full Name *"
          placeholder="e.g. Abebe Kebede"
          value={accountHolder}
          onChange={(e) => setAccountHolder(e.target.value)}
          required
        />

        <Input
          label="Account Number / Telebirr Phone *"
          placeholder="e.g. 100012345678 or +251 91 123 4567"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          required
        />

        <Input
          label="Withdrawal Amount (ETB) *"
          type="number"
          placeholder="e.g. 25000"
          value={amountETB}
          onChange={(e) => setAmountETB(e.target.value)}
          max={availableBalanceETB}
          required
        />

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Submit Payout Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
