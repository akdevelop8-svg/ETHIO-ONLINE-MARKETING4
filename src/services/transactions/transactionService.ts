/**
 * EOM Server-Authoritative Transaction & Payment Management Service
 * Phase 8: Transaction Processing, Escrow Verification, Seller Payouts & Refunds
 *
 * CRITICAL ARCHITECTURAL RULE:
 * The client is never authoritative for financial calculations or status transitions.
 * - Commission is strictly 25% (authoritatively computed)
 * - Seller payout is strictly 75% (authoritatively computed)
 * - Transitions (PAYMENT_VERIFIED, COMPLETED, REFUNDED) strictly require authenticated authorization
 */

import { 
  Transaction, 
  TransactionStatus, 
  PaymentVerificationStatus, 
  PaymentMethodType, 
  Order, 
  User, 
  EscrowStatus, 
  PayoutStatus,
  TransactionRefundRecord,
  SellerPayoutRecord
} from '../../types/index.js';
import { PLATFORM_FEE_PERCENTAGE, OFFICIAL_ESCROW_ACCOUNTS } from '../../constants/index.js';
import { authService } from '../auth/authService.js';
import { auditService } from '../audit/auditService.js';
import { notificationService } from '../notifications/notificationService.js';
import { listingService } from '../marketplace/listingService.js';
import { 
  transactionRepository, 
  paymentVerificationRepository,
  TransactionRepository,
  PaymentVerificationRepository
} from '../persistence/index.js';
import { PaymentVerificationEngine } from '../payments/paymentVerification.js';
import { PaymentProviderRegistry } from '../payments/paymentProvider.js';

const STORAGE_TRANSACTIONS_KEY = 'eom_transactions_vault_v1';

export class TransactionService {
  private txRepo: TransactionRepository;
  private pvRepo: PaymentVerificationRepository;
  private transactions: Transaction[] = [];
  private isInitialized = false;

  constructor(
    txRepo: TransactionRepository = transactionRepository,
    pvRepo: PaymentVerificationRepository = paymentVerificationRepository
  ) {
    this.txRepo = txRepo;
    this.pvRepo = pvRepo;
    this.init();
  }

  private init(): void {
    if (this.isInitialized) return;
    try {
      this.transactions = this.txRepo.findAll();
      this.isInitialized = true;
    } catch {
      this.transactions = [];
      this.isInitialized = true;
    }
  }

  private persist(): void {
    try {
      this.txRepo.saveAll(this.transactions);
    } catch {
      // Storage save fallback
    }
  }

  /**
   * Reset local storage state (for testing/cleanup)
   */
  public resetToDefaults(): void {
    this.transactions = [];
    this.persist();
  }

  /**
   * Authoritative Transaction Creation linked to an Escrow Order
   * Computes exact platform commission (25%) and net seller payout (75%) authoritatively from listing price.
   * Client-passed amounts or fee overrides are strictly ignored.
   */
  public createTransactionForOrder(
    buyer: User,
    order: Order,
    paymentMethod: PaymentMethodType = 'TELEBIRR'
  ): Transaction {
    if (!buyer || !buyer.id) {
      throw new Error('Authentication required: You must be logged in to initiate a transaction.');
    }
    this.init();

    // Prevent duplicate active transaction for the same order
    const existingTx = this.transactions.find(
      (t) => t.orderId === order.id && t.status !== 'CANCELLED' && t.status !== 'FAILED'
    );
    if (existingTx) {
      return existingTx;
    }

    // Authoritatively resolve listing price to prevent client tampering
    const rawListing = listingService.getRawListingById(order.listingId);
    const amountETB = rawListing ? Number(rawListing.priceETB) : Number(order.amountETB);
    
    // Authoritative math
    const platformFeeETB = Math.round((amountETB * PLATFORM_FEE_PERCENTAGE) / 100);
    const sellerPayoutETB = amountETB - platformFeeETB;
    const timestamp = new Date().toISOString();
    const transactionNumber = `EOM-TX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const escrowAccount = OFFICIAL_ESCROW_ACCOUNTS[paymentMethod] || OFFICIAL_ESCROW_ACCOUNTS.TELEBIRR;

    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      transactionNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      listingId: order.listingId,
      listingTitle: order.listingTitle,
      platform: order.platform,
      buyerId: buyer.id,
      buyerName: buyer.fullName || buyer.username || buyer.email,
      buyerEmail: buyer.email,
      buyerPhone: buyer.phone || order.buyerPhone,
      buyerTelegram: buyer.username || order.buyerTelegram,
      sellerId: order.sellerId,
      sellerName: order.sellerName,
      sellerEmail: order.sellerEmail,
      sellerPhone: order.sellerPhone,
      sellerTelegram: order.sellerTelegram,
      amountETB,
      platformFeeETB,
      sellerPayoutETB,
      currency: 'ETB',
      paymentMethod,
      paymentDestinationAccount: `${escrowAccount.name} (${escrowAccount.accountNumber})`,
      status: 'PAYMENT_PENDING',
      verificationStatus: 'PENDING_SUBMISSION',
      escrowStatus: 'HELD',
      payoutStatus: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.transactions.unshift(newTx);
    this.persist();

    // Audit log
    auditService.log({
      actorId: buyer.id,
      actorName: buyer.fullName || buyer.email,
      actorRole: buyer.role || 'BUYER',
      action: 'TRANSACTION_CREATED',
      entityType: 'TRANSACTION',
      entityId: newTx.id,
      details: `Created escrow transaction #${newTx.transactionNumber} for ${newTx.amountETB.toLocaleString()} ETB via ${paymentMethod}.`,
      metadata: { orderId: order.id, listingId: order.listingId, amountETB }
    });

    return newTx;
  }

  /**
   * Buyer Submits Payment Reference & Proof for Escrow Verification
   */
  public submitBuyerPayment(
    actor: User,
    transactionId: string,
    details: {
      paymentReference: string;
      senderName?: string;
      paymentProofUrl?: string;
      paymentProofNotes?: string;
      paymentMethod?: PaymentMethodType;
    }
  ): Transaction {
    if (!actor || !actor.id) {
      throw new Error('Authentication required.');
    }
    const cleanedRef = details.paymentReference.trim();
    if (!cleanedRef) {
      throw new Error('Transaction reference or confirmation code is required.');
    }

    this.init();
    const tx = this.transactions.find(
      (t) => t.id === transactionId || t.transactionNumber === transactionId || t.orderId === transactionId
    );

    if (!tx) {
      throw new Error(`Transaction ${transactionId} not found.`);
    }

    // Enforce Reference Reuse Protection across different orders
    const duplicateTx = this.transactions.find(
      (t) => t.id !== tx.id && t.orderId !== tx.orderId && t.paymentReference && t.paymentReference.trim().toUpperCase() === cleanedRef.toUpperCase()
    );
    if (duplicateTx) {
      throw new Error(`Payment reference "${cleanedRef}" has already been used for another order (${duplicateTx.orderNumber}). Reference reuse is strictly prohibited.`);
    }

    // Validate reference format with provider adapter
    const targetMethod = details.paymentMethod || tx.paymentMethod;
    const adapter = PaymentProviderRegistry.getAdapter(targetMethod);
    const refCheck = adapter.validateReference(cleanedRef);
    if (!refCheck.isValid) {
      throw new Error(`Invalid payment reference format for ${targetMethod}: ${refCheck.error}`);
    }

    const isAdmin = actor.authRole === 'admin' || actor.role === 'ADMIN';
    if (!isAdmin && actor.id !== tx.buyerId) {
      throw new Error('Unauthorized: Only the buyer or an admin can submit payment details for this transaction.');
    }

    if (tx.status === 'COMPLETED') {
      throw new Error('Cannot submit payment for an already completed transaction.');
    }

    if (tx.status === 'CANCELLED' || tx.status === 'REFUNDED') {
      throw new Error(`Cannot submit payment for a ${tx.status.toLowerCase()} transaction.`);
    }

    if (tx.status === 'PAYMENT_VERIFIED') {
      throw new Error('Payment has already been verified and locked in escrow.');
    }

    const isResubmission = tx.status === 'PAYMENT_SUBMITTED';

    const timestamp = new Date().toISOString();
    tx.paymentReference = details.paymentReference.trim();
    if (details.senderName) tx.senderName = details.senderName.trim();
    if (details.paymentProofUrl) tx.paymentProofUrl = details.paymentProofUrl.trim();
    if (details.paymentProofNotes) tx.paymentProofNotes = details.paymentProofNotes.trim();
    if (details.paymentMethod) {
      tx.paymentMethod = details.paymentMethod;
      const escrowAccount = OFFICIAL_ESCROW_ACCOUNTS[details.paymentMethod];
      if (escrowAccount) {
        tx.paymentDestinationAccount = `${escrowAccount.name} (${escrowAccount.accountNumber})`;
      }
    }

    tx.status = 'PAYMENT_SUBMITTED';
    tx.verificationStatus = 'SUBMITTED';
    tx.submittedAt = timestamp;
    tx.updatedAt = timestamp;

    let pvr = this.pvRepo.findByTransactionId(tx.id);
    if (!pvr) {
      pvr = PaymentVerificationEngine.createPendingRecord({
        transactionId: tx.id,
        orderId: tx.orderId,
        orderNumber: tx.orderNumber,
        paymentMethod: tx.paymentMethod,
        claimedAmountETB: tx.amountETB
      });
    }
    PaymentVerificationEngine.assertValidTransition(pvr.status, 'SUBMITTED');
    pvr.status = 'SUBMITTED';
    pvr.referenceNumber = tx.paymentReference;
    if (tx.senderName) pvr.senderName = tx.senderName;
    pvr.proofNotes = tx.paymentProofNotes;
    pvr.proofUrl = tx.paymentProofUrl;
    pvr.updatedAt = timestamp;
    this.pvRepo.save(pvr);

    this.persist();

    // Audit log
    auditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorRole: actor.role || 'BUYER',
      action: 'PAYMENT_SUBMITTED',
      entityType: 'PAYMENT',
      entityId: tx.id,
      details: `Buyer ${isResubmission ? 're-submitted' : 'submitted'} payment ref "${tx.paymentReference}" for transaction #${tx.transactionNumber} (${tx.amountETB.toLocaleString()} ETB).`,
      metadata: { transactionNumber: tx.transactionNumber, orderId: tx.orderId, isResubmission }
    });

    if (!isResubmission) {
      // Notify Buyer
      notificationService.dispatch({
        targetUserId: tx.buyerId,
        type: 'PAYMENT_SUBMITTED',
        title: 'Payment Submitted for Verification',
        message: `Your payment reference "${tx.paymentReference}" for order #${tx.orderNumber} has been received. Admin escrow verification is underway.`,
        referenceId: tx.id,
        referenceType: 'transaction'
      });

      // Notify Admin
      notificationService.dispatch({
        targetUserId: 'ADMIN',
        type: 'PAYMENT_SUBMITTED',
        title: 'New Escrow Payment Proof Submitted',
        message: `Buyer ${tx.buyerName} submitted ref "${tx.paymentReference}" for ${tx.amountETB.toLocaleString()} ETB (Order #${tx.orderNumber}).`,
        referenceId: tx.id,
        referenceType: 'transaction'
      });
    }

    return tx;
  }

  /**
   * ADMIN: Verify Buyer Payment
   * Locks escrow funds securely and advances order to verification/handover
   */
  public verifyPaymentAsAdmin(
    admin: User,
    transactionId: string,
    options?: { adminNotes?: string }
  ): Transaction {
    const authCheck = authService.checkAdminAccess(admin);
    if (!authCheck.granted) {
      throw new Error(`Unauthorized: Admin privileges required (${authCheck.reason || 'FORBIDDEN'}).`);
    }

    this.init();
    const tx = this.transactions.find(
      (t) => t.id === transactionId || t.transactionNumber === transactionId || t.orderId === transactionId
    );

    if (!tx) {
      throw new Error(`Transaction ${transactionId} not found.`);
    }

    if (tx.status === 'COMPLETED') {
      return tx;
    }
    
    if (tx.status === 'CANCELLED' || tx.status === 'REFUNDED' || tx.status === 'FAILED') {
      throw new Error(`Cannot verify payment for a ${tx.status.toLowerCase()} transaction.`);
    }

    if (tx.status !== 'PAYMENT_SUBMITTED' && tx.status !== 'PAYMENT_PENDING') {
       throw new Error(`Cannot verify payment: unexpected status ${tx.status}.`);
    }

    const timestamp = new Date().toISOString();
    tx.status = 'PAYMENT_VERIFIED';
    tx.verificationStatus = 'VERIFIED';
    tx.escrowStatus = 'HELD';
    tx.verifiedAt = timestamp;
    tx.verifiedByAdmin = admin.fullName || admin.username || '@mr_ebek';
    if (options?.adminNotes) {
      tx.adminNotes = options.adminNotes;
    }
    tx.updatedAt = timestamp;

    // Issue a durable buyer handover ticket exactly once after payment verification.
    if (!tx.purchaseTicket) {
      tx.purchaseTicket = {
        ticketId: `EOM-TKT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        orderId: tx.orderId,
        orderNumber: tx.orderNumber,
        transactionId: tx.id,
        listingId: tx.listingId,
        listingTitle: tx.listingTitle,
        platform: tx.platform,
        buyerId: tx.buyerId,
        buyerName: tx.buyerName,
        instructions: 'Screenshot or download this ticket and send it to @mr_ebek or @EXO_SMM on Telegram to start the ownership handover. Do not share your password outside the official EOM admins.',
        admins: [
          { name: 'Lead Escrow Officer', telegram: '@mr_ebek' },
          { name: 'Operations & Moderation Admin', telegram: '@EXO_SMM' }
        ],
        issuedAt: timestamp,
        status: 'ACTIVE'
      };
    }

    let pvr = this.pvRepo.findByTransactionId(tx.id);
    if (!pvr) {
      pvr = PaymentVerificationEngine.createPendingRecord({
        transactionId: tx.id,
        orderId: tx.orderId,
        orderNumber: tx.orderNumber,
        paymentMethod: tx.paymentMethod,
        claimedAmountETB: tx.amountETB
      });
    }
    PaymentVerificationEngine.assertValidTransition(pvr.status, 'VERIFIED');
    pvr.status = 'VERIFIED';
    pvr.verifiedByAdminId = admin.id;
    pvr.verifiedAt = timestamp;
    pvr.updatedAt = timestamp;
    this.pvRepo.save(pvr);

    this.persist();

    // Audit log
    auditService.log({
      actorId: admin.id,
      actorName: admin.fullName || admin.email,
      actorRole: 'ADMIN',
      action: 'PAYMENT_VERIFIED',
      entityType: 'PAYMENT',
      entityId: tx.id,
      details: `Admin ${tx.verifiedByAdmin} verified escrow payment for #${tx.transactionNumber} (${tx.amountETB.toLocaleString()} ETB). Escrow locked.`,
      metadata: { transactionNumber: tx.transactionNumber, orderId: tx.orderId }
    });

    // Notify Buyer
    notificationService.dispatch({
      targetUserId: tx.buyerId,
      type: 'PAYMENT_VERIFIED',
      title: 'Payment Verified & Escrow Locked',
      message: `Your deposit of ${tx.amountETB.toLocaleString()} ETB is verified and locked in the EOM escrow vault. Your handover ticket ${tx.purchaseTicket?.ticketId || ''} is ready. Send the ticket screenshot to @mr_ebek or @EXO_SMM.`,
      referenceId: tx.id,
      referenceType: 'transaction'
    });

    // Notify Seller
    notificationService.dispatch({
      targetUserId: tx.sellerId,
      type: 'PAYMENT_VERIFIED',
      title: 'Buyer Deposit Secured in Escrow',
      message: `Buyer funds for "${tx.listingTitle}" are securely held. You may proceed with channel handover and 2FA credentials.`,
      referenceId: tx.id,
      referenceType: 'transaction'
    });

    return tx;
  }

  /**
   * ADMIN: Reject Buyer Payment with clear reason
   */
  public rejectPaymentAsAdmin(
    admin: User,
    transactionId: string,
    reason: string,
    adminNotes?: string
  ): Transaction {
    const authCheck = authService.checkAdminAccess(admin);
    if (!authCheck.granted) {
      throw new Error(`Unauthorized: Admin privileges required (${authCheck.reason || 'FORBIDDEN'}).`);
    }

    if (!reason || !reason.trim()) {
      throw new Error('Rejection reason is required.');
    }

    this.init();
    const tx = this.transactions.find(
      (t) => t.id === transactionId || t.transactionNumber === transactionId || t.orderId === transactionId
    );

    if (!tx) {
      throw new Error(`Transaction ${transactionId} not found.`);
    }

    if (tx.status === 'FAILED' || tx.verificationStatus === 'REJECTED') {
      return tx; // already rejected
    }

    if (tx.status === 'COMPLETED' || tx.status === 'REFUNDED' || tx.status === 'PAYMENT_VERIFIED') {
      throw new Error(`Cannot reject payment for a ${tx.status.toLowerCase()} transaction.`);
    }

    const timestamp = new Date().toISOString();
    tx.status = 'FAILED';
    tx.verificationStatus = 'REJECTED';
    tx.rejectionReason = reason.trim();
    if (adminNotes) tx.adminNotes = adminNotes.trim();
    tx.updatedAt = timestamp;

    let pvr = this.pvRepo.findByTransactionId(tx.id);
    if (!pvr) {
      pvr = PaymentVerificationEngine.createPendingRecord({
        transactionId: tx.id,
        orderId: tx.orderId,
        orderNumber: tx.orderNumber,
        paymentMethod: tx.paymentMethod,
        claimedAmountETB: tx.amountETB
      });
    }
    PaymentVerificationEngine.assertValidTransition(pvr.status, 'REJECTED');
    pvr.status = 'REJECTED';
    pvr.rejectionReason = reason.trim();
    pvr.updatedAt = timestamp;
    this.pvRepo.save(pvr);

    this.persist();

    // Audit log
    auditService.log({
      actorId: admin.id,
      actorName: admin.fullName || admin.email,
      actorRole: 'ADMIN',
      action: 'PAYMENT_REJECTED',
      entityType: 'PAYMENT',
      entityId: tx.id,
      details: `Admin rejected payment submission for #${tx.transactionNumber}. Reason: ${reason}`,
      metadata: { transactionNumber: tx.transactionNumber, reason }
    });

    // Notify Buyer
    notificationService.dispatch({
      targetUserId: tx.buyerId,
      type: 'PAYMENT_REJECTED',
      title: 'Payment Verification Action Needed',
      message: `Your payment for order #${tx.orderNumber} could not be verified: "${reason}". Please submit a valid reference code or contact support.`,
      referenceId: tx.id,
      referenceType: 'transaction'
    });

    return tx;
  }

  /**
   * Complete Transaction & Disburse Seller Payout
   * Triggered upon buyer confirmation of channel receipt or admin completion
   */
  public completeTransactionAndReleaseEscrow(
    actor: User,
    transactionIdOrOrderId: string,
    payoutAccount?: { accountBank: string; accountNumber: string; accountHolder: string }
  ): Transaction {
    if (!actor || !actor.id) {
      throw new Error('Authentication required.');
    }
    this.init();

    const tx = this.transactions.find(
      (t) => t.id === transactionIdOrOrderId || t.transactionNumber === transactionIdOrOrderId || t.orderId === transactionIdOrOrderId
    );

    if (!tx) {
      throw new Error(`Transaction not found.`);
    }

    const isAdmin = actor.authRole === 'admin' || actor.role === 'ADMIN';
    const isBuyer = actor.id === tx.buyerId;

    if (!isAdmin && !isBuyer) {
      throw new Error('Unauthorized: Only the buyer or an admin can finalize this transaction.');
    }

    if (tx.status === 'COMPLETED') {
      return tx; // Already completed
    }

    if (tx.escrowStatus === 'DISPUTED') {
      throw new Error('Cannot release escrow funds while a dispute is active. An admin must arbitrate the dispute first.');
    }

    if (tx.status === 'CANCELLED' || tx.status === 'REFUNDED' || tx.status === 'FAILED') {
      throw new Error(`Cannot release escrow funds for a ${tx.status.toLowerCase()} transaction.`);
    }

    if (tx.status === 'PAYMENT_PENDING' || tx.verificationStatus !== 'VERIFIED') {
      throw new Error(
        `Cannot release escrow funds: Payment must be verified in escrow by an administrator first (current verification status: ${tx.verificationStatus}).`
      );
    }

    const timestamp = new Date().toISOString();
    tx.status = 'COMPLETED';
    tx.escrowStatus = 'RELEASED';
    tx.payoutStatus = 'PAID';
    tx.completedAt = timestamp;

    if (payoutAccount) {
      tx.payoutDetails = {
        accountBank: payoutAccount.accountBank,
        accountNumber: payoutAccount.accountNumber,
        accountHolder: payoutAccount.accountHolder,
        payoutAmountETB: tx.sellerPayoutETB,
        processedAt: timestamp,
        processedByAdmin: isAdmin ? actor.fullName || '@mr_ebek' : 'System Escrow Release',
        payoutReference: `EOM-PAY-${Math.floor(100000 + Math.random() * 900000)}`
      };
    } else if (!tx.payoutDetails) {
      tx.payoutDetails = {
        accountBank: 'Seller Designated Account',
        accountNumber: tx.sellerPhone || 'On File',
        accountHolder: tx.sellerName,
        payoutAmountETB: tx.sellerPayoutETB,
        processedAt: timestamp,
        processedByAdmin: isAdmin ? actor.fullName || '@mr_ebek' : 'System Escrow Release',
        payoutReference: `EOM-PAY-${Math.floor(100000 + Math.random() * 900000)}`
      };
    }

    tx.updatedAt = timestamp;
    this.persist();

    // Audit log
    auditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorRole: isAdmin ? 'ADMIN' : 'BUYER',
      action: 'PAYOUT_PROCESSED',
      entityType: 'PAYOUT',
      entityId: tx.id,
      details: `Escrow released and seller payout of ${tx.sellerPayoutETB.toLocaleString()} ETB finalized for transaction #${tx.transactionNumber}.`,
      metadata: { transactionNumber: tx.transactionNumber, sellerPayoutETB: tx.sellerPayoutETB, platformFeeETB: tx.platformFeeETB }
    });

    // Notify Seller
    notificationService.dispatch({
      targetUserId: tx.sellerId,
      type: 'PAYOUT_PROCESSED',
      title: 'Seller Payout Disbursed!',
      message: `Escrow funds of ${tx.sellerPayoutETB.toLocaleString()} ETB (75% net proceeds) have been released for "${tx.listingTitle}".`,
      referenceId: tx.id,
      referenceType: 'transaction'
    });

    return tx;
  }

  /**
   * ADMIN: Issue Refund for Transaction
   * Preserves full history and audit record
   */
  public issueRefund(
    admin: User,
    transactionIdOrOrderId: string,
    reason: string,
    refundDestination?: string
  ): Transaction {
    const authCheck = authService.checkAdminAccess(admin);
    if (!authCheck.granted) {
      throw new Error(`Unauthorized: Admin privileges required (${authCheck.reason || 'FORBIDDEN'}).`);
    }

    if (!reason || !reason.trim()) {
      throw new Error('A detailed refund reason is required.');
    }

    this.init();
    const tx = this.transactions.find(
      (t) => t.id === transactionIdOrOrderId || t.transactionNumber === transactionIdOrOrderId || t.orderId === transactionIdOrOrderId
    );

    if (!tx) {
      throw new Error(`Transaction not found.`);
    }

    if (tx.status === 'REFUNDED') {
      return tx; // Already refunded
    }

    if (tx.status === 'COMPLETED') {
      throw new Error('Cannot issue refund for an already completed transaction where payout was released.');
    }

    const timestamp = new Date().toISOString();
    const refundRecord: TransactionRefundRecord = {
      refundAmountETB: tx.amountETB,
      reason: reason.trim(),
      authorizedBy: admin.fullName || admin.username || '@mr_ebek',
      refundedAt: timestamp,
      refundDestination: refundDestination || tx.buyerPhone || tx.buyerEmail || 'Original Payment Source'
    };

    tx.status = 'REFUNDED';
    tx.escrowStatus = 'REFUNDED';
    tx.payoutStatus = 'FAILED';
    tx.refundDetails = refundRecord;
    tx.updatedAt = timestamp;

    this.persist();

    // Audit log
    auditService.log({
      actorId: admin.id,
      actorName: admin.fullName || admin.email,
      actorRole: 'ADMIN',
      action: 'REFUND_ISSUED',
      entityType: 'REFUND',
      entityId: tx.id,
      details: `Admin ${refundRecord.authorizedBy} issued full escrow refund of ${tx.amountETB.toLocaleString()} ETB for #${tx.transactionNumber}. Reason: ${reason}`,
      metadata: { transactionNumber: tx.transactionNumber, orderId: tx.orderId, refundAmountETB: tx.amountETB, reason }
    });

    // Notify Buyer
    notificationService.dispatch({
      targetUserId: tx.buyerId,
      type: 'REFUND_ISSUED',
      title: 'Escrow Refund Processed',
      message: `A full refund of ${tx.amountETB.toLocaleString()} ETB for order #${tx.orderNumber} has been issued. Reason: "${reason}".`,
      referenceId: tx.id,
      referenceType: 'transaction'
    });

    // Notify Seller
    notificationService.dispatch({
      targetUserId: tx.sellerId,
      type: 'REFUND_ISSUED',
      title: 'Escrow Order Refunded to Buyer',
      message: `Transaction #${tx.transactionNumber} for "${tx.listingTitle}" was refunded by admin. Reason: "${reason}".`,
      referenceId: tx.id,
      referenceType: 'transaction'
    });

    return tx;
  }

  /**
   * Cancel Transaction (Buyer or Admin)
   */
  public cancelTransaction(
    actor: User,
    transactionIdOrOrderId: string,
    reason?: string
  ): Transaction {
    if (!actor || !actor.id) {
      throw new Error('Authentication required.');
    }
    this.init();

    const tx = this.transactions.find(
      (t) => t.id === transactionIdOrOrderId || t.transactionNumber === transactionIdOrOrderId || t.orderId === transactionIdOrOrderId
    );

    if (!tx) {
      throw new Error(`Transaction not found.`);
    }

    const isAdmin = actor.authRole === 'admin' || actor.role === 'ADMIN';
    const isBuyer = actor.id === tx.buyerId;

    if (!isAdmin && !isBuyer) {
      throw new Error('Unauthorized: You cannot cancel a transaction belonging to another user.');
    }

    if (tx.status === 'COMPLETED') {
      throw new Error('Completed transactions cannot be cancelled. Please request an admin refund or raise a dispute.');
    }

    if (tx.status === 'PAYMENT_VERIFIED' && !isAdmin) {
      throw new Error('Payment has already been verified and locked in escrow. Please request an official admin refund or dispute resolution.');
    }

    if (tx.status === 'CANCELLED') {
      return tx; // Already cancelled
    }

    const timestamp = new Date().toISOString();
    tx.status = 'CANCELLED';
    tx.escrowStatus = tx.verificationStatus === 'VERIFIED' ? 'REFUNDED' : 'PENDING';
    tx.cancellationReason = reason || (isBuyer ? 'Cancelled by buyer' : 'Cancelled by administrator');
    tx.updatedAt = timestamp;

    this.persist();

    // Audit log
    auditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorRole: isAdmin ? 'ADMIN' : 'BUYER',
      action: 'TRANSACTION_CANCELLED',
      entityType: 'TRANSACTION',
      entityId: tx.id,
      details: `${isAdmin ? 'Admin' : 'Buyer'} cancelled transaction #${tx.transactionNumber}. Reason: ${tx.cancellationReason}`,
      metadata: { transactionNumber: tx.transactionNumber, orderId: tx.orderId }
    });

    // Notify Buyer
    notificationService.dispatch({
      targetUserId: tx.buyerId,
      type: 'TRANSACTION_CANCELLED',
      title: `Transaction #${tx.transactionNumber} Cancelled`,
      message: `The transaction for "${tx.listingTitle}" has been cancelled.`,
      referenceId: tx.id,
      referenceType: 'transaction'
    });

    // Notify Seller
    notificationService.dispatch({
      targetUserId: tx.sellerId,
      type: 'TRANSACTION_CANCELLED',
      title: `Order & Transaction Cancelled`,
      message: `The pending transaction for "${tx.listingTitle}" has been cancelled.`,
      referenceId: tx.id,
      referenceType: 'transaction'
    });

    return tx;
  }

  /**
   * ADMIN: Execute Arbitration Settlement
   * Authoritative transaction settlement based on dispute arbitration decision.
   */
  public lockEscrowForDispute(orderId: string): void {
    this.init();
    const tx = this.transactions.find((t) => t.orderId === orderId);
    if (tx && tx.escrowStatus !== 'REFUNDED' && tx.escrowStatus !== 'RELEASED') {
      tx.escrowStatus = 'DISPUTED';
      tx.updatedAt = new Date().toISOString();
      this.persist();
    }
  }

  public executeArbitrationSettlement(
    admin: User,
    orderId: string,
    decision: {
      outcome: 'FULL_REFUND_BUYER' | 'RELEASE_ESCROW_SELLER' | 'SPLIT_SETTLEMENT';
      buyerRefundAmountETB: number;
      sellerPayoutAmountETB: number;
      resolutionNotes: string;
    }
  ): Transaction | null {
    const authCheck = authService.checkAdminAccess(admin);
    if (!authCheck.granted) {
      throw new Error(authCheck.reason || 'Unauthorized: Admin privileges required.');
    }
    
    this.init();
    const tx = this.transactions.find((t) => t.orderId === orderId);
    if (!tx) return null;

    if (tx.status === 'COMPLETED' || tx.status === 'REFUNDED') {
       // Cannot arbitrate already settled transaction
       return tx;
    }

    const timestamp = new Date().toISOString();
    
    if (decision.outcome === 'FULL_REFUND_BUYER') {
      tx.status = 'REFUNDED';
      tx.escrowStatus = 'REFUNDED';
      tx.refundDetails = {
        refundAmountETB: decision.buyerRefundAmountETB,
        reason: decision.resolutionNotes.trim(),
        authorizedBy: admin.fullName || admin.email,
        refundedAt: timestamp,
        refundDestination: 'Buyer Original Method'
      };
    } else if (decision.outcome === 'RELEASE_ESCROW_SELLER') {
      tx.status = 'COMPLETED';
      tx.escrowStatus = 'RELEASED';
      tx.payoutStatus = 'PAID';
      tx.completedAt = timestamp;
      // Re-calculate the 75% for seller, 25% for platform just in case
      const platformFee = Math.round((decision.sellerPayoutAmountETB * PLATFORM_FEE_PERCENTAGE) / 100);
      const netPayout = decision.sellerPayoutAmountETB - platformFee;
      
      tx.payoutDetails = {
        accountBank: 'Seller Designated Account',
        accountNumber: tx.sellerPhone || 'On File',
        accountHolder: tx.sellerName,
        payoutAmountETB: netPayout,
        processedAt: timestamp,
        processedByAdmin: admin.fullName || '@mr_ebek',
        payoutReference: `EOM-ARB-${Math.floor(100000 + Math.random() * 900000)}`
      };
    } else if (decision.outcome === 'SPLIT_SETTLEMENT') {
      tx.status = 'COMPLETED';
      tx.escrowStatus = 'RELEASED';
      
      const platformFee = Math.round((decision.sellerPayoutAmountETB * PLATFORM_FEE_PERCENTAGE) / 100);
      const netPayout = decision.sellerPayoutAmountETB - platformFee;

      tx.payoutDetails = {
        accountBank: 'Seller Designated Account',
        accountNumber: tx.sellerPhone || 'On File',
        accountHolder: tx.sellerName,
        payoutAmountETB: netPayout,
        processedAt: timestamp,
        processedByAdmin: admin.fullName || '@mr_ebek',
        payoutReference: `EOM-SPLIT-${Math.floor(100000 + Math.random() * 900000)}`
      };
      
      tx.refundDetails = {
        refundAmountETB: decision.buyerRefundAmountETB,
        reason: `Split arbitration: ${decision.resolutionNotes.trim()}`,
        authorizedBy: admin.fullName || admin.email,
        refundedAt: timestamp,
        refundDestination: 'Buyer Original Method'
      };
    }

    tx.updatedAt = timestamp;
    this.persist();
    return tx;
  }

  /**
   * Get Transaction by ID with strict authorization
   */
  public getTransactionById(transactionId: string, requestingUser?: User | null): Transaction | null {
    this.init();
    const tx = this.transactions.find(
      (t) => t.id === transactionId || t.transactionNumber === transactionId || t.orderId === transactionId
    );
    if (!tx) return null;

    if (requestingUser) {
      const isAdmin = requestingUser.authRole === 'admin' || requestingUser.role === 'ADMIN';
      const isParticipant = requestingUser.id === tx.buyerId || requestingUser.id === tx.sellerId;
      if (!isAdmin && !isParticipant) {
        return null;
      }
    }
    return tx;
  }

  /**
   * Get Transaction by Order ID
   */
  public getTransactionByOrderId(orderId: string, requestingUser?: User | null): Transaction | null {
    this.init();
    const tx = this.transactions.find((t) => t.orderId === orderId);
    if (!tx) return null;

    if (requestingUser) {
      const isAdmin = requestingUser.authRole === 'admin' || requestingUser.role === 'ADMIN';
      const isParticipant = requestingUser.id === tx.buyerId || requestingUser.id === tx.sellerId;
      if (!isAdmin && !isParticipant) {
        return null;
      }
    }
    return tx;
  }

  /**
   * Get all transactions for a specific user (buyer or seller)
   */
  public getTransactionsForUser(userId: string): Transaction[] {
    this.init();
    return this.transactions
      .filter((t) => t.buyerId === userId || t.sellerId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get Buyer Transactions
   */
  public getTransactionsByBuyer(buyerId: string, requestingUser?: User | null): Transaction[] {
    this.init();
    if (requestingUser) {
      const isAdmin = requestingUser.authRole === 'admin' || requestingUser.role === 'ADMIN';
      if (!isAdmin && requestingUser.id !== buyerId) {
        return [];
      }
    }
    return this.transactions
      .filter((t) => t.buyerId === buyerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get Seller Transactions
   */
  public getTransactionsBySeller(sellerId: string, requestingUser?: User | null): Transaction[] {
    this.init();
    if (requestingUser) {
      const isAdmin = requestingUser.authRole === 'admin' || requestingUser.role === 'ADMIN';
      if (!isAdmin && requestingUser.id !== sellerId) {
        return [];
      }
    }
    return this.transactions
      .filter((t) => t.sellerId === sellerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * ADMIN: Get all platform transactions
   */
  public getAllTransactionsForAdmin(requestingUser: User | null): Transaction[] {
    const authCheck = authService.checkAdminAccess(requestingUser);
    if (!authCheck.granted) {
      throw new Error(authCheck.reason || 'Unauthorized: Admin privileges required.');
    }
    this.init();
    return [...this.transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const transactionService = new TransactionService();
