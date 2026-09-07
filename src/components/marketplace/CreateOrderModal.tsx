import { apiClient } from "../../api/client";
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Send, 
  Building2, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Alert } from '../common/Alert';
import { Listing, PaymentMethodType, Order } from '../../types';
import { PAYMENT_METHODS_DATA } from '../../constants';
import { PaymentMethodIcon } from '../common/PaymentIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

export interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  onOrderCreated: (order: Order) => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  listing,
  onOrderCreated
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('TELEBIRR');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || '');
  const [buyerTelegram, setBuyerTelegram] = useState(user?.username || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!listing) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be signed in to create an escrow order.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const order = await apiClient.post<Order>('/orders/create', {
        listingId: listing.id,
        paymentMethod,
        notes: notes.trim() || undefined,
        buyerPhone: buyerPhone.trim() || undefined,
        buyerTelegram: buyerTelegram.trim() || undefined
      });
      showToast(`Escrow Order #${order.orderNumber} initiated successfully!`, 'success');
      onOrderCreated(order);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate escrow order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Initiate Escrow Purchase"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Protection Banner */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 block mb-0.5">Secure Purchase Flow</span>
            Create the order first, then transfer the exact amount using Telebirr, CBE, or Bank of Abyssinia. Admin verification locks the payment in escrow.
          </div>
        </div>

        {error && <Alert variant="error" title="Order Error" message={error} />}

        {/* Channel Summary */}
        <div className="p-3.5 rounded-xl bg-[#141B26] border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Target Channel:</span>
            <span className="font-bold text-slate-100 truncate max-w-[220px]">{listing.title}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Platform:</span>
            <span className="font-semibold text-amber-400 uppercase">{listing.platform}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">Total Purchase Price:</span>
            <span className="font-mono text-base font-black text-amber-400">
              {Number(listing.priceETB).toLocaleString()} ETB
            </span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Select Escrow Payment Channel
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PAYMENT_METHODS_DATA.map((method) => {
              const isSelected = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id as PaymentMethodType)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-sm ring-1 ring-amber-400'
                      : 'bg-[#141B26] border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-[#182232]'
                  }`}
                >
                  <PaymentMethodIcon method={method.id} className="w-8 h-8 shrink-0 rounded-lg shadow-sm" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block truncate text-slate-100">{method.name}</span>
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5">{method.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Your Telegram Username *"
            placeholder="@your_username"
            value={buyerTelegram}
            onChange={(e) => setBuyerTelegram(e.target.value)}
            helperText="For admin transfer mediation"
            required
          />
          <Input
            label="Phone Number"
            placeholder="+251 91 123 4567"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-300">
            Order Notes or Handover Preferences (Optional)
          </label>
          <textarea
            className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            placeholder="e.g. Please transfer ownership to my Telegram ID directly."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={<Lock className="w-4 h-4" />}
          >
            Create Order & Continue
          </Button>
        </div>
      </form>
    </Modal>
  );
};
