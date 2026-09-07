import { apiClient } from "../../api/client";
import React, { useEffect, useState, useRef } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Send, 
  Building2, 
  AlertCircle, 
  Info,
  Upload,
  Image as ImageIcon,
  X,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Alert } from '../common/Alert';
import { Transaction, PaymentMethodType } from '../../types';
import { OFFICIAL_ESCROW_ACCOUNTS, PAYMENT_METHODS_DATA, ESCROW_ADMINS } from '../../constants';
import { PaymentMethodIcon } from '../common/PaymentIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

export interface BuyerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onPaymentSubmitted: (updatedTx: Transaction) => void;
}

export const BuyerPaymentModal: React.FC<BuyerPaymentModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onPaymentSubmitted
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>(
    transaction?.paymentMethod || 'TELEBIRR'
  );
  const [senderName, setSenderName] = useState(
    transaction?.senderName || user?.fullName || ''
  );
  const [referenceCode, setReferenceCode] = useState(
    transaction?.paymentReference || ''
  );
  const [proofNotes, setProofNotes] = useState(
    transaction?.paymentProofNotes || ''
  );
  const [receiptImage, setReceiptImage] = useState<string | null>(
    transaction?.paymentProofUrl || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    setSelectedMethod(transaction.paymentMethod || 'TELEBIRR');
    setReferenceCode(transaction.paymentReference || '');
    setSenderName(transaction.senderName || user?.fullName || '');
    setProofNotes(transaction.paymentProofNotes || '');
    setReceiptImage(transaction.paymentProofUrl || null);
    setError(null);
  }, [transaction.id, transaction.paymentMethod, transaction.paymentReference, transaction.senderName, transaction.paymentProofNotes, transaction.paymentProofUrl, user?.fullName]);

  const [error, setError] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);

  if (!transaction) return null;

  const isApproved = transaction.status === 'PAYMENT_VERIFIED' || transaction.status === 'COMPLETED' || transaction.verificationStatus === 'VERIFIED';
  const isRejected = transaction.verificationStatus === 'REJECTED' || transaction.status === 'FAILED';

  const currentEscrowAccount = OFFICIAL_ESCROW_ACCOUNTS[selectedMethod] || OFFICIAL_ESCROW_ACCOUNTS.BANK_OF_ABYSSINIA;

  const handleCopyAccount = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(true);
    showToast('Bank Account Number copied to clipboard!', 'info');
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleCopyAdmin = (username: string) => {
    navigator.clipboard.writeText(username);
    setCopiedAdmin(true);
    showToast(`Admin username ${username} copied!`, 'info');
    setTimeout(() => setCopiedAdmin(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Receipt image size exceeds the 5MB limit. Please compress or choose a smaller image.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be signed in to submit payment details.');
      return;
    }
    if (!senderName.trim()) {
      setError('Please enter the Full Sender Name as shown on your bank transfer receipt.');
      return;
    }
    if (!referenceCode.trim()) {
      setError('Please enter the bank transaction reference number or confirmation code.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const updated = await apiClient.post<Transaction>(`/transactions/${transaction.id}/submit`, {
        reference: referenceCode.trim(),
        senderName: senderName.trim(),
        proofNotes: proofNotes.trim() || undefined,
        proofUrl: receiptImage || undefined,
        paymentMethod: selectedMethod
      });
      showToast('Bank payment receipt submitted for admin verification!', 'success');
      onPaymentSubmitted(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isApproved ? `Payment Approved — Order #${transaction.orderNumber}` : `Direct Bank Escrow Payment — Order #${transaction.orderNumber}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-5 text-left">
        {/* POST-APPROVAL VIEW */}
        {isApproved ? (
          <div className="space-y-5">
            {/* Approved Header Banner */}
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 text-center space-y-3 shadow-lg shadow-emerald-950/30">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-block px-3 py-0.5 rounded-full text-xs font-black bg-emerald-400 text-slate-950 uppercase tracking-wide mb-1">
                  Payment Approved ✓
                </span>
                <h3 className="text-lg font-black text-slate-100">Escrow Funds Verified & Locked</h3>
                <p className="text-xs text-emerald-200/90 max-w-md mx-auto leading-relaxed mt-1">
                  Your bank transfer of <strong className="text-amber-400 font-mono">{transaction.amountETB.toLocaleString()} ETB</strong> for order <strong className="text-slate-100">#{transaction.orderNumber}</strong> has been officially verified by EOM administrators.
                </p>
              </div>
            </div>

            {/* Purchase Ticket */}
            {transaction.purchaseTicket && (
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-indigo-300 uppercase tracking-widest font-black block">EOM Handover Ticket</span>
                    <span className="font-mono text-base font-black text-slate-100">{transaction.purchaseTicket.ticketId}</span>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase">Active</span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-slate-800/70 space-y-1.5 text-[11px]">
                  <div className="flex justify-between gap-3"><span className="text-slate-500">What you are buying</span><span className="text-slate-200 font-semibold text-right">{transaction.purchaseTicket.listingTitle}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Order</span><span className="text-amber-400 font-mono font-bold">#{transaction.purchaseTicket.orderNumber}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Ticket / Transaction ID</span><span className="text-slate-200 font-mono font-semibold text-right">{transaction.purchaseTicket.ticketId} / {transaction.purchaseTicket.transactionId}</span></div>
                </div>
                <p className="text-[11px] text-indigo-200 leading-relaxed">{transaction.purchaseTicket.instructions}</p>
                <div className="grid grid-cols-2 gap-2">
                  {transaction.purchaseTicket.admins.map((admin) => (
                    <a
                      key={admin.telegram}
                      href={`https://t.me/${admin.telegram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px] font-bold text-center hover:bg-sky-500/20"
                    >
                      {admin.telegram}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps Box */}
            <div className="p-4 rounded-xl bg-[#141B26] border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Next Step: Account Ownership Transfer</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Please contact an authorized EOM administrator on Telegram to complete the account-transfer process and receive 2FA credentials.
              </p>

              {/* Authorized Telegram Contacts */}
              <div className="space-y-2 pt-1">
                {ESCROW_ADMINS.map((admin) => (
                  <div
                    key={admin.telegram}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-100 block">{admin.name}</span>
                      <span className="font-mono text-amber-400 font-semibold">{admin.telegram}</span>
                    </div>
                    <a
                      href={`https://t.me/${admin.telegram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <span>Telegram</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const ticket = transaction.purchaseTicket;
                  if (!ticket) return;
                  const lines = [
                    'EOM — PURCHASE / HANDOVER TICKET',
                    `Ticket ID: ${ticket.ticketId}`,
                    `Order: #${ticket.orderNumber}`,
                    `Ticket ID: ${ticket.ticketId}`,
                    `Transaction ID: ${ticket.transactionId}`,
                    `Listing ID: ${ticket.listingId}`,
                    `Item: ${ticket.listingTitle}`,
                    `Platform: ${ticket.platform}`,
                    `Buyer: ${ticket.buyerName}`,
                    `Issued: ${new Date(ticket.issuedAt).toLocaleString()}`,
                    '',
                    ticket.instructions,
                    '',
                    'Authorized Telegram: @mr_ebek, @EXO_SMM'
                  ].join('\n');
                  const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = `${ticket.ticketId}.txt`;
                  document.body.appendChild(anchor);
                  anchor.click();
                  anchor.remove();
                  URL.revokeObjectURL(url);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 text-indigo-200 text-xs font-bold transition-colors"
              >
                Download Ticket
              </button>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => handleCopyAdmin('@mr_ebek')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {copiedAdmin ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Copied @mr_ebek</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Admin Username</span>
                  </>
                )}
              </button>

              <a
                href="https://t.me/mr_ebek"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Contact Admin on Telegram</span>
              </a>
            </div>
          </div>
        ) : (
          /* PAYMENT SUBMISSION FORM VIEW */
          <div className="space-y-5">
            {/* Rejection Alert Banner */}
            {isRejected && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 space-y-2 text-left">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" />
                  <span>Your Payment Could Not Be Verified</span>
                </div>
                <p className="text-xs text-rose-200 leading-relaxed font-mono bg-black/40 p-2.5 rounded-xl border border-rose-900/60">
                  Reason: {transaction.rejectionReason || 'Receipt screenshot or reference code could not be verified on the bank ledger.'}
                </p>
                <p className="text-[11px] text-rose-300">
                  Please review your transfer details, upload a clear receipt screenshot, and resubmit below.
                </p>
              </div>
            )}

            {/* Escrow Manual Verification Notice */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 leading-relaxed">
                <span className="font-bold text-amber-300 block mb-0.5">Direct Manual Bank Verification</span>
                Transfer exact funds to the official EOM Bank Account. Upload your payment receipt screenshot. Payment is <strong className="text-amber-300 underline">NOT</strong> considered verified until an authorized EOM administrator reviews it.
              </div>
            </div>

            {error && <Alert variant="error" title="Submission Error" message={error} />}

            {/* Read-Only Order & Financial Summary */}
            <div className="p-4 rounded-xl bg-[#141B26] border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Order Reference ID:</span>
                <span className="font-mono text-xs font-bold text-amber-400">#{transaction.orderNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Target Channel:</span>
                <span className="font-bold text-slate-100 truncate max-w-[220px]">{transaction.listingTitle}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Expected Deposit Amount:</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  {transaction.amountETB.toLocaleString()} ETB
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                <div>Platform Fee (25%): <span className="font-mono text-slate-300">{transaction.platformFeeETB.toLocaleString()} ETB</span></div>
                <div>Seller Payout (75%): <span className="font-mono text-slate-300">{transaction.sellerPayoutETB.toLocaleString()} ETB</span></div>
              </div>
            </div>

            {/* Payment Method Selector (Defaults to BoA) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Select Destination Bank
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {PAYMENT_METHODS_DATA.map((method) => {
                  const isSelected = selectedMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id as PaymentMethodType)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                          : 'bg-[#141B26] border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-[#182232]'
                      }`}
                    >
                      <PaymentMethodIcon method={method.id} className="w-8 h-8 shrink-0 rounded-lg shadow-sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate text-slate-100">
                          {method.name}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">{method.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Bank Account Details Box */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Official EOM Bank Account
                </span>
                <span className="text-[10px] text-slate-400">Authorized Escrow</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Account Name:</span>
                  <span className="font-bold text-slate-100">{currentEscrowAccount.accountName}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-black/50 border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Account Number</span>
                    <span className="font-mono text-base font-black text-amber-400 tracking-wider">
                      {currentEscrowAccount.accountNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(currentEscrowAccount.accountNumber)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  >
                    {copiedAccount ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Account Number</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Payment Submission Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Sender Full Name (as shown on Bank Transfer) *"
                placeholder="e.g. Abebe Bikila"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                helperText="Required so admins can match your transfer on the bank ledger."
                required
              />

              <Input
                label="Transaction Reference Code / Ref ID *"
                placeholder="e.g. BOA-TX-7749102 or FT2608319984"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                helperText="The reference code from your bank SMS or transfer confirmation."
                required
              />

              {/* Receipt Screenshot Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Payment Receipt Screenshot / Photo (Max 5MB) *
                </label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {receiptImage ? (
                  <div className="relative p-2 rounded-xl bg-[#141B26] border border-slate-800 flex items-center gap-3">
                    <img
                      src={receiptImage}
                      alt="Receipt Screenshot"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <span className="font-bold text-emerald-400 block truncate">Receipt Screenshot Attached ✓</span>
                      <span className="text-[10px] text-slate-400 block">Ready for admin verification</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReceiptImage(null)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-slate-800 hover:border-amber-500/50 bg-[#141B26]/60 hover:bg-[#141B26] transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <Upload className="w-6 h-6 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Click to Upload Receipt Screenshot</span>
                      <span className="text-[10px] text-slate-500">Supports PNG, JPG, JPEG, WEBP (Up to 5MB)</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Optional Notes */}
              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-slate-300">
                  Additional Payment Notes / Remarks (Optional)
                </label>
                <textarea
                  className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs border border-slate-800 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 min-h-[50px]"
                  placeholder="e.g. Transferred from BoA mobile app around 2:30 PM."
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                />
              </div>

              {/* Operational Notice */}
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200/90 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Notice: Payment is <strong>NOT</strong> considered verified until an authorized EOM administrator reviews it on the bank ledger.</span>
              </div>

              {/* Submit Buttons */}
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
                  {isRejected ? 'Submit Corrected Payment Evidence' : 'Submit Receipt for Verification'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
};
