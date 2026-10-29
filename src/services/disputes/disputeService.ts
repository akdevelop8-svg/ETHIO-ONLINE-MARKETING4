/**
 * EOM (Ethio Online Market) Dispute Resolution & Escrow Mediation Service
 * Phase 9 - Three-Party Mediation, Evidence Vault & Admin Arbitration System
 */

import { 
  Dispute, 
  DisputeReason, 
  DisputeStatus, 
  DisputeMessage, 
  DisputeEvidence, 
  DisputeTimelineEvent, 
  ArbitrationDecision,
  User, 
  Order, 
  Transaction 
} from '../../types/index.js';
import { auditService } from '../audit/auditService.js';
import { notificationService } from '../notifications/notificationService.js';
import { authService } from '../auth/authService.js';
import { orderService } from '../orders/orderService.js';
import { transactionService } from '../transactions/transactionService.js';
import { disputeRepository, DisputeRepository } from '../persistence/index.js';

const STORAGE_DISPUTES_KEY = 'eom_disputes_v2';

const INITIAL_DEMO_DISPUTES: Dispute[] = [
  {
    id: 'disp-demo-1',
    disputeNumber: 'DISP-8902',
    orderId: 'ord-1002',
    orderNumber: 'ORD-8902',
    listingId: 'seed-tg-1',
    listingTitle: 'Tikvah Ethiopia Community Hub',
    platform: 'telegram',
    amountETB: 45000,
    buyerId: 'usr-buyer-1',
    buyerName: 'Abebe Bikila',
    buyerEmail: 'abebe.bikila@gmail.com',
    sellerId: 'usr-seller-1',
    sellerName: 'Solomon Tech Solutions',
    sellerEmail: 'solomon.tech@gmail.com',
    assignedAdminId: 'usr-admin-1',
    assignedAdminName: 'EOM Lead Escrow Officer (@mr_ebek)',
    reason: '2FA_RECOVERY_ISSUE',
    details: 'Seller transferred creator rights on Telegram, but 2-step verification recovery email is still linked to the old seller phone number.',
    status: 'UNDER_MEDIATION',
    evidence: [
      {
        id: 'ev-1',
        uploadedBy: 'usr-buyer-1',
        uploaderName: 'Abebe Bikila',
        uploaderRole: 'BUYER',
        title: 'Telegram Security Settings Screenshot',
        fileUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        description: 'Shows that Telegram 2FA cloud password has a 7-day waiting period before recovery email can be replaced.',
        createdAt: '2026-08-31T06:30:00.000Z'
      }
    ],
    messages: [
      {
        id: 'msg-1',
        disputeId: 'disp-demo-1',
        senderId: 'usr-buyer-1',
        senderName: 'Abebe Bikila',
        senderRole: 'BUYER',
        message: 'I received the creator invite, but I cannot finalize ownership because Telegram asks for a 2FA cloud password that was not provided.',
        createdAt: '2026-08-31T06:15:00.000Z'
      },
      {
        id: 'msg-2',
        disputeId: 'disp-demo-1',
        senderId: 'usr-seller-1',
        senderName: 'Solomon Tech Solutions',
        senderRole: 'SELLER',
        message: 'Hello Abebe. I just initiated the password reset on my side. Telegram sent an SMS verification code which I am ready to confirm with Admin.',
        createdAt: '2026-08-31T06:45:00.000Z'
      },
      {
        id: 'msg-3',
        disputeId: 'disp-demo-1',
        senderId: 'usr-admin-1',
        senderName: 'EOM Lead Escrow Officer (@mr_ebek)',
        senderRole: 'ADMIN',
        message: 'OFFICIAL ESCROW NOTICE: Both parties please halt any password resets on Telegram client. Seller @solomon, please upload screenshot of account active sessions to verify no third-party logins exist.',
        isIntervention: true,
        createdAt: '2026-08-31T07:10:00.000Z'
      }
    ],
    timeline: [
      {
        id: 'tl-1',
        event: 'Dispute opened by buyer regarding 2FA recovery delay',
        actor: 'Abebe Bikila (Buyer)',
        timestamp: '2026-08-31T06:15:00.000Z'
      },
      {
        id: 'tl-2',
        event: 'Escrow payout frozen; Admin assigned (@mr_ebek)',
        actor: 'System',
        timestamp: '2026-08-31T06:16:00.000Z'
      },
      {
        id: 'tl-3',
        event: 'Buyer uploaded proof of Telegram 2FA cloud lock',
        actor: 'Abebe Bikila (Buyer)',
        timestamp: '2026-08-31T06:30:00.000Z'
      },
      {
        id: 'tl-4',
        event: 'Admin issued official mediation instruction',
        actor: 'EOM Lead Escrow Officer',
        timestamp: '2026-08-31T07:10:00.000Z'
      }
    ],
    createdAt: '2026-08-31T06:15:00.000Z',
    updatedAt: '2026-08-31T07:10:00.000Z'
  },
  {
    id: 'disp-demo-2',
    disputeNumber: 'DISP-8740',
    orderId: 'ord-1003',
    orderNumber: 'ORD-8740',
    listingId: 'seed-yt-1',
    listingTitle: 'Habesha Tech Reviews',
    platform: 'youtube',
    amountETB: 85000,
    buyerId: 'usr-buyer-2',
    buyerName: 'Bethlehem Tadesse',
    buyerEmail: 'bethlehem.t@gmail.com',
    sellerId: 'usr-seller-2',
    sellerName: 'Addis Media Group',
    sellerEmail: 'addis.media@gmail.com',
    assignedAdminId: 'usr-admin-1',
    assignedAdminName: 'EOM Lead Escrow Officer (@mr_ebek)',
    reason: 'CREDENTIAL_MISMATCH',
    details: 'The YouTube channel transferred had 2 active community guideline copyright strikes which were not disclosed in the listing description.',
    status: 'RESOLVED_BUYER_REFUND',
    evidence: [
      {
        id: 'ev-2',
        uploadedBy: 'usr-buyer-2',
        uploaderName: 'Bethlehem Tadesse',
        uploaderRole: 'BUYER',
        title: 'YouTube Studio Channel Status & Features',
        fileUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
        description: 'Screenshot showing 2 strikes expiring in November 2026.',
        createdAt: '2026-08-30T10:00:00.000Z'
      }
    ],
    messages: [
      {
        id: 'msg-4',
        disputeId: 'disp-demo-2',
        senderId: 'usr-buyer-2',
        senderName: 'Bethlehem Tadesse',
        senderRole: 'BUYER',
        message: 'The channel has 2 active strikes. Monetization is suspended. I request a full refund to my CBE account.',
        createdAt: '2026-08-30T09:30:00.000Z'
      },
      {
        id: 'msg-5',
        disputeId: 'disp-demo-2',
        senderId: 'usr-admin-1',
        senderName: 'EOM Lead Escrow Officer (@mr_ebek)',
        senderRole: 'ADMIN',
        message: 'Evidence verified in YouTube Studio. Seller failed to disclose active account penalties. Escrow refund approved for buyer.',
        isIntervention: true,
        createdAt: '2026-08-30T11:00:00.000Z'
      }
    ],
    timeline: [
      {
        id: 'tl-5',
        event: 'Dispute opened for undisclosed copyright strikes',
        actor: 'Bethlehem Tadesse (Buyer)',
        timestamp: '2026-08-30T09:30:00.000Z'
      },
      {
        id: 'tl-6',
        event: 'Admin verified evidence and issued 100% Escrow Refund',
        actor: 'EOM Lead Escrow Officer',
        timestamp: '2026-08-30T11:00:00.000Z'
      }
    ],
    arbitration: {
      outcome: 'FULL_REFUND_BUYER',
      resolvedByAdminId: 'usr-admin-1',
      resolvedByAdminName: 'EOM Lead Escrow Officer (@mr_ebek)',
      buyerRefundAmountETB: 85000,
      sellerPayoutAmountETB: 0,
      resolutionNotes: 'Seller failed to disclose 2 copyright strikes preventing monetization. 100% funds refunded from EOM Vault.',
      resolvedAt: '2026-08-30T11:00:00.000Z'
    },
    createdAt: '2026-08-30T09:30:00.000Z',
    updatedAt: '2026-08-30T11:00:00.000Z'
  }
];

class DisputeService {
  private repo: DisputeRepository;
  private disputes: Dispute[] = [];
  private initialized = false;

  constructor(repo: DisputeRepository = disputeRepository) {
    this.repo = repo;
    this.init();
  }

  private init() {
    if (this.initialized) return;

    try {
      const stored = this.repo.findAll();
      if (stored && stored.length > 0) {
        this.disputes = stored;
      } else {
        this.disputes = [...INITIAL_DEMO_DISPUTES];
        this.persist();
      }
    } catch {
      this.disputes = [...INITIAL_DEMO_DISPUTES];
    }

    this.initialized = true;
  }

  private persist() {
    try {
      this.repo.saveAll(this.disputes);
    } catch (e) {
      console.error('Failed to persist disputes via repository:', e);
    }
  }

  /**
   * Get all disputes authorized for the active user
   */
  public getDisputesForUser(user: User): Dispute[] {
    this.init();
    if (!user || !user.id) return [];

    const isAdmin = user.authRole === 'admin' || user.role === 'ADMIN';
    if (isAdmin) {
      return [...this.disputes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return this.disputes
      .filter((d) => d.buyerId === user.id || d.sellerId === user.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Get a single dispute with authorization check
   */
  public getDisputeById(disputeId: string, user: User): Dispute | undefined {
    this.init();
    if (!user || !user.id) return undefined;

    const dispute = this.disputes.find((d) => d.id === disputeId || d.disputeNumber === disputeId);
    if (!dispute) return undefined;

    const isAdmin = user.authRole === 'admin' || user.role === 'ADMIN';
    if (!isAdmin && dispute.buyerId !== user.id && dispute.sellerId !== user.id) {
      throw new Error('Unauthorized: You do not have permission to view this dispute.');
    }

    return dispute;
  }

  /**
   * Get dispute by associated order ID
   */
  public getDisputeByOrderId(orderId: string, user?: User): Dispute | undefined {
    this.init();
    const dispute = this.disputes.find((d) => d.orderId === orderId || d.orderNumber === orderId);
    if (!dispute) return undefined;

    if (user) {
      const isAdmin = user.authRole === 'admin' || user.role === 'ADMIN';
      if (!isAdmin && dispute.buyerId !== user.id && dispute.sellerId !== user.id) {
        return undefined;
      }
    }

    return dispute;
  }

  /**
   * Open a new dispute with server-authoritative state freezing
   */
  public createDispute(
    actor: User,
    data: {
      orderId: string;
      reason: DisputeReason;
      details: string;
      customReasonDescription?: string;
      initialEvidence?: {
        title: string;
        fileUrl?: string;
        description: string;
      };
    }
  ): Dispute {
    this.init();
    if (!actor || !actor.id) {
      throw new Error('Authentication required to file a dispute.');
    }

    if (!data.details || data.details.trim().length < 5) {
      throw new Error('Please provide specific details explaining the issue (minimum 5 characters).');
    }

    const order = orderService.getOrderById(data.orderId, actor);

    if (!order) {
      throw new Error('Order not found or unauthorized.');
    }

    const isAdmin = actor.authRole === 'admin' || actor.role === 'ADMIN';
    const isBuyer = order.buyerId === actor.id;
    const isSeller = order.sellerId === actor.id;

    if (!isAdmin && !isBuyer && !isSeller) {
      throw new Error('Unauthorized: You are not a participant in this order.');
    }

    // Check if an unresolved dispute already exists for this order
    const existingDispute = this.disputes.find(
      (d) => d.orderId === order.id && 
      d.status !== 'RESOLVED_BUYER_REFUND' && 
      d.status !== 'RESOLVED_SELLER_RELEASE' && 
      d.status !== 'RESOLVED_SPLIT_SETTLEMENT' &&
      d.status !== 'RESOLVED' &&
      d.status !== 'REJECTED'
    );

    if (existingDispute) {
      throw new Error(`An active dispute (${existingDispute.disputeNumber}) is already open for this order.`);
    }

    const timestamp = new Date().toISOString();
    const disputeId = `disp-${Date.now()}`;
    const disputeNumber = `DISP-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialEvList: DisputeEvidence[] = [];
    if (data.initialEvidence && data.initialEvidence.title) {
      initialEvList.push({
        id: `ev-${Date.now()}`,
        uploadedBy: actor.id,
        uploaderName: actor.fullName || actor.email,
        uploaderRole: isAdmin ? 'ADMIN' : isBuyer ? 'BUYER' : 'SELLER',
        title: data.initialEvidence.title.trim(),
        fileUrl: data.initialEvidence.fileUrl?.trim() || undefined,
        description: data.initialEvidence.description?.trim() || '',
        createdAt: timestamp
      });
    }

    const initialMessages: DisputeMessage[] = [
      {
        id: `msg-${Date.now()}`,
        disputeId,
        senderId: actor.id,
        senderName: actor.fullName || actor.email,
        senderRole: isAdmin ? 'ADMIN' : isBuyer ? 'BUYER' : 'SELLER',
        message: data.details.trim(),
        attachments: initialEvList.length > 0 ? initialEvList : undefined,
        createdAt: timestamp
      }
    ];

    const timeline: DisputeTimelineEvent[] = [
      {
        id: `tl-${Date.now()}-1`,
        event: `Dispute opened (${data.reason.replace(/_/g, ' ')})`,
        actor: `${actor.fullName || actor.email} (${isAdmin ? 'Admin' : isBuyer ? 'Buyer' : 'Seller'})`,
        timestamp
      },
      {
        id: `tl-${Date.now()}-2`,
        event: 'Escrow payout frozen in EOM Vault pending arbitration',
        actor: 'System',
        timestamp
      }
    ];

    const newDispute: Dispute = {
      id: disputeId,
      disputeNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      listingId: order.listingId,
      listingTitle: order.listingTitle,
      platform: order.platform,
      amountETB: order.amountETB,
      buyerId: order.buyerId,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      sellerId: order.sellerId,
      sellerName: order.sellerName,
      sellerEmail: order.sellerEmail,
      assignedAdminId: 'usr-admin-1',
      assignedAdminName: 'EOM Lead Escrow Officer (@mr_ebek)',
      reason: data.reason,
      customReasonDescription: data.customReasonDescription,
      details: data.details.trim(),
      status: 'OPEN',
      evidence: initialEvList,
      messages: initialMessages,
      timeline,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.disputes.unshift(newDispute);
    this.persist();

    // Freeze Order state
    // Freeze Transaction escrow state if applicable
    try {
      transactionService.lockEscrowForDispute(order.id);
    } catch (err: any) {
      throw new Error(`Failed to lock transaction escrow: ${err.message}`);
    }

    // Update order status
    order.status = 'DISPUTED';
    order.escrowStatus = 'DISPUTED';
    order.disputeReason = `${data.reason}: ${data.details}`;
    order.updatedAt = timestamp;

    // Log Audit event
    auditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorRole: isAdmin ? 'ADMIN' : isBuyer ? 'BUYER' : 'SELLER',
      action: 'DISPUTE_OPENED',
      entityType: 'DISPUTE',
      entityId: newDispute.id,
      details: `Opened dispute ${disputeNumber} for order #${order.orderNumber}. Reason: ${data.reason}`,
      metadata: {
        orderId: order.id,
        amountETB: order.amountETB,
        reason: data.reason
      }
    });

    // Notify Admin & counterparty
    notificationService.dispatch({
      targetUserId: 'ADMIN',
      type: 'DISPUTE_OPENED',
      title: `Dispute Opened: ${disputeNumber}`,
      message: `${actor.fullName || actor.email} filed a dispute for Order #${order.orderNumber} (${order.amountETB.toLocaleString()} ETB).`,
      referenceId: newDispute.id,
      referenceType: 'dispute'
    });

    const counterpartyId = isBuyer ? order.sellerId : order.buyerId;
    if (counterpartyId) {
      notificationService.dispatch({
        targetUserId: counterpartyId,
        type: 'DISPUTE_OPENED',
        title: `Dispute Filed: Order #${order.orderNumber}`,
        message: `A dispute (${disputeNumber}) was opened regarding your channel transaction. Please visit the mediation room.`,
        referenceId: newDispute.id,
        referenceType: 'dispute'
      });
    }

    return newDispute;
  }

  /**
   * Send a real-time mediation message
   */
  public sendMessage(
    actor: User,
    disputeId: string,
    messageText: string,
    options?: {
      isIntervention?: boolean;
      attachment?: {
        title: string;
        fileUrl?: string;
        description: string;
      };
    }
  ): DisputeMessage {
    this.init();
    if (!actor || !actor.id) {
      throw new Error('Authentication required to send message.');
    }

    const dispute = this.disputes.find((d) => d.id === disputeId || d.disputeNumber === disputeId);
    if (!dispute) {
      throw new Error('Dispute not found.');
    }

    const isAdmin = actor.authRole === 'admin' || actor.role === 'ADMIN';
    const isBuyer = dispute.buyerId === actor.id;
    const isSeller = dispute.sellerId === actor.id;

    if (!isAdmin && !isBuyer && !isSeller) {
      throw new Error('Unauthorized: You are not a participant in this dispute.');
    }

    if (!messageText.trim() && !options?.attachment) {
      throw new Error('Message text or attachment is required.');
    }

    const timestamp = new Date().toISOString();
    const senderRole = isAdmin ? 'ADMIN' : isBuyer ? 'BUYER' : 'SELLER';

    let attachedEvidence: DisputeEvidence | undefined = undefined;
    if (options?.attachment) {
      attachedEvidence = {
        id: `ev-${Date.now()}`,
        uploadedBy: actor.id,
        uploaderName: actor.fullName || actor.email,
        uploaderRole: senderRole,
        title: options.attachment.title.trim(),
        fileUrl: options.attachment.fileUrl?.trim() || undefined,
        description: options.attachment.description?.trim() || '',
        createdAt: timestamp
      };
      dispute.evidence.push(attachedEvidence);
    }

    const newMessage: DisputeMessage = {
      id: `msg-${Date.now()}`,
      disputeId: dispute.id,
      senderId: actor.id,
      senderName: actor.fullName || actor.email,
      senderRole,
      message: messageText.trim(),
      isIntervention: isAdmin && Boolean(options?.isIntervention),
      attachments: attachedEvidence ? [attachedEvidence] : undefined,
      createdAt: timestamp
    };

    dispute.messages.push(newMessage);
    dispute.updatedAt = timestamp;

    // Auto advance OPEN status to UNDER_MEDIATION if Admin participates
    if (isAdmin && dispute.status === 'OPEN') {
      dispute.status = 'UNDER_MEDIATION';
      dispute.timeline.push({
        id: `tl-${Date.now()}`,
        event: 'Admin joined mediation session',
        actor: actor.fullName || actor.email,
        timestamp
      });
    }

    this.persist();

    // Log Audit if Admin intervention
    if (options?.isIntervention) {
      auditService.log({
        actorId: actor.id,
        actorName: actor.fullName || actor.email,
        actorRole: 'ADMIN',
        action: 'ADMIN_INTERVENTION',
        entityType: 'DISPUTE',
        entityId: dispute.id,
        details: `Admin posted official mediation directive: "${messageText.slice(0, 80)}..."`
      });
    }

    // Notify other parties
    const targetRecipients: string[] = [];
    if (!isBuyer) targetRecipients.push(dispute.buyerId);
    if (!isSeller) targetRecipients.push(dispute.sellerId);
    if (!isAdmin) targetRecipients.push('ADMIN');

    targetRecipients.forEach((targetId) => {
      notificationService.dispatch({
        targetUserId: targetId,
        type: 'DISPUTE_MESSAGE_SENT',
        title: `Mediation Update: ${dispute.disputeNumber}`,
        message: `${actor.fullName || actor.email} posted in dispute for Order #${dispute.orderNumber}.`,
        referenceId: dispute.id,
        referenceType: 'dispute'
      });
    });

    return newMessage;
  }

  /**
   * Submit Evidence / File Screenshot to the dispute vault
   */
  public submitEvidence(
    actor: User,
    disputeId: string,
    evidence: {
      title: string;
      fileUrl?: string;
      description: string;
    }
  ): DisputeEvidence {
    this.init();
    if (!actor || !actor.id) {
      throw new Error('Authentication required.');
    }

    const dispute = this.disputes.find((d) => d.id === disputeId || d.disputeNumber === disputeId);
    if (!dispute) {
      throw new Error('Dispute not found.');
    }

    const isAdmin = actor.authRole === 'admin' || actor.role === 'ADMIN';
    const isBuyer = dispute.buyerId === actor.id;
    const isSeller = dispute.sellerId === actor.id;

    if (!isAdmin && !isBuyer && !isSeller) {
      throw new Error('Unauthorized: You are not a participant in this dispute.');
    }

    if (!evidence.title.trim()) {
      throw new Error('Evidence title is required.');
    }

    const timestamp = new Date().toISOString();
    const senderRole = isAdmin ? 'ADMIN' : isBuyer ? 'BUYER' : 'SELLER';

    const newEvidence: DisputeEvidence = {
      id: `ev-${Date.now()}`,
      uploadedBy: actor.id,
      uploaderName: actor.fullName || actor.email,
      uploaderRole: senderRole,
      title: evidence.title.trim(),
      fileUrl: evidence.fileUrl?.trim() || undefined,
      description: evidence.description?.trim() || '',
      createdAt: timestamp
    };

    dispute.evidence.push(newEvidence);
    dispute.timeline.push({
      id: `tl-${Date.now()}`,
      event: `Evidence submitted: "${newEvidence.title}"`,
      actor: `${actor.fullName || actor.email} (${senderRole})`,
      timestamp
    });
    dispute.updatedAt = timestamp;

    this.persist();

    auditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorRole: senderRole,
      action: 'DISPUTE_EVIDENCE_SUBMITTED',
      entityType: 'DISPUTE',
      entityId: dispute.id,
      details: `Submitted evidence: ${newEvidence.title}`
    });

    return newEvidence;
  }

  /**
   * Request additional evidence as Admin
   */
  public requestEvidenceAsAdmin(
    admin: User,
    disputeId: string,
    requestedFrom: 'BUYER' | 'SELLER' | 'BOTH',
    details: string
  ): Dispute {
    this.init();
    const authCheck = authService.checkAdminAccess(admin);
    if (!authCheck.granted) {
      throw new Error(authCheck.reason || 'Unauthorized: Admin privileges required.');
    }

    const dispute = this.disputes.find((d) => d.id === disputeId || d.disputeNumber === disputeId);
    if (!dispute) {
      throw new Error('Dispute not found.');
    }

    const timestamp = new Date().toISOString();
    dispute.status = 'EVIDENCE_REQUESTED';
    dispute.updatedAt = timestamp;

    const requestNotice = `ADMIN EVIDENCE REQUEST: Additional proof required from ${requestedFrom}. Directive: ${details.trim()}`;

    dispute.messages.push({
      id: `msg-${Date.now()}`,
      disputeId: dispute.id,
      senderId: admin.id,
      senderName: admin.fullName || 'EOM Lead Admin',
      senderRole: 'ADMIN',
      message: requestNotice,
      isIntervention: true,
      createdAt: timestamp
    });

    dispute.timeline.push({
      id: `tl-${Date.now()}`,
      event: `Evidence requested from ${requestedFrom}`,
      actor: admin.fullName || admin.email,
      timestamp
    });

    this.persist();

    auditService.log({
      actorId: admin.id,
      actorName: admin.fullName || admin.email,
      actorRole: 'ADMIN',
      action: 'DISPUTE_EVIDENCE_REQUESTED',
      entityType: 'DISPUTE',
      entityId: dispute.id,
      details: `Requested evidence from ${requestedFrom}: ${details.trim()}`
    });

    return dispute;
  }

  /**
   * Server-authoritative Admin Arbitration Verdict & Escrow Settlement
   */
  public arbitrateDisputeAsAdmin(
    admin: User,
    disputeId: string,
    decision: {
      outcome: 'FULL_REFUND_BUYER' | 'RELEASE_ESCROW_SELLER' | 'SPLIT_SETTLEMENT';
      resolutionNotes: string;
      buyerRefundAmountETB?: number;
      sellerPayoutAmountETB?: number;
    }
  ): Dispute {
    this.init();
    const authCheck = authService.checkAdminAccess(admin);
    if (!authCheck.granted) {
      throw new Error(authCheck.reason || 'Unauthorized: Admin privileges required.');
    }

    const dispute = this.disputes.find((d) => d.id === disputeId || d.disputeNumber === disputeId);
    if (!dispute) {
      throw new Error('Dispute not found.');
    }

    if (
      dispute.status === 'RESOLVED_BUYER_REFUND' ||
      dispute.status === 'RESOLVED_SELLER_RELEASE' ||
      dispute.status === 'RESOLVED_SPLIT_SETTLEMENT'
    ) {
      throw new Error('This dispute has already been finalized by an administrative verdict.');
    }

    if (!decision.resolutionNotes || decision.resolutionNotes.trim().length < 5) {
      throw new Error('Mandatory administrative resolution reasoning must be provided (minimum 5 characters).');
    }

    const timestamp = new Date().toISOString();
    let finalStatus: DisputeStatus = 'RESOLVED_BUYER_REFUND';
    let buyerRefund = 0;
    let sellerPayout = 0;

    if (decision.outcome === 'FULL_REFUND_BUYER') {
      finalStatus = 'RESOLVED_BUYER_REFUND';
      buyerRefund = dispute.amountETB;
      sellerPayout = 0;
    } else if (decision.outcome === 'RELEASE_ESCROW_SELLER') {
      finalStatus = 'RESOLVED_SELLER_RELEASE';
      buyerRefund = 0;
      sellerPayout = dispute.amountETB;
    } else if (decision.outcome === 'SPLIT_SETTLEMENT') {
      finalStatus = 'RESOLVED_SPLIT_SETTLEMENT';
      buyerRefund = Number(decision.buyerRefundAmountETB || 0);
      sellerPayout = Number(decision.sellerPayoutAmountETB || 0);

      if (buyerRefund + sellerPayout !== dispute.amountETB) {
        throw new Error(
          `Split settlement amounts (${buyerRefund} + ${sellerPayout} = ${buyerRefund + sellerPayout} ETB) must equal the total escrow vault value (${dispute.amountETB} ETB).`
        );
      }
    }

    const arbitrationRecord: ArbitrationDecision = {
      outcome: decision.outcome,
      resolvedByAdminId: admin.id,
      resolvedByAdminName: admin.fullName || 'EOM Lead Escrow Officer',
      buyerRefundAmountETB: buyerRefund,
      sellerPayoutAmountETB: sellerPayout,
      resolutionNotes: decision.resolutionNotes.trim(),
      resolvedAt: timestamp
    };

    dispute.status = finalStatus;
    dispute.arbitration = arbitrationRecord;
    dispute.updatedAt = timestamp;

    const verdictMessage = `FINAL ARBITRATION VERDICT: ${decision.outcome.replace(/_/g, ' ')}. Buyer Allocation: ${buyerRefund.toLocaleString()} ETB | Seller Allocation: ${sellerPayout.toLocaleString()} ETB. Reason: ${decision.resolutionNotes.trim()}`;

    dispute.messages.push({
      id: `msg-${Date.now()}`,
      disputeId: dispute.id,
      senderId: admin.id,
      senderName: admin.fullName || 'EOM Lead Admin',
      senderRole: 'ADMIN',
      message: verdictMessage,
      isIntervention: true,
      createdAt: timestamp
    });

    dispute.timeline.push({
      id: `tl-${Date.now()}`,
      event: `Final verdict executed: ${decision.outcome.replace(/_/g, ' ')}`,
      actor: admin.fullName || admin.email,
      timestamp
    });

    this.persist();

    // Authoritative Sync with Phase 8 Transaction & Order state machines
    try {
      const allOrders = orderService.getAllOrdersForAdmin(admin);
      const order = allOrders.find((o) => o.id === dispute.orderId || o.orderNumber === dispute.orderNumber);

      if (order) {
        if (decision.outcome === 'FULL_REFUND_BUYER') {
          order.status = 'CANCELLED';
          order.escrowStatus = 'REFUNDED';
          order.adminNotes = `Arbitration Refund: ${decision.resolutionNotes.trim()}`;
        } else if (decision.outcome === 'RELEASE_ESCROW_SELLER') {
          order.status = 'SUCCESS';
          order.escrowStatus = 'RELEASED';
          order.adminNotes = `Arbitration Seller Release: ${decision.resolutionNotes.trim()}`;
        } else {
          order.status = 'SUCCESS';
          order.escrowStatus = 'RELEASED';
          order.adminNotes = `Arbitration Split Settlement: Buyer ${buyerRefund} ETB, Seller ${sellerPayout} ETB. ${decision.resolutionNotes.trim()}`;
        }
        order.updatedAt = timestamp;
      }

      // Sync Transaction in Phase 8 Transaction Service
      try {
        transactionService.executeArbitrationSettlement(admin, dispute.orderId, {
          outcome: decision.outcome,
          buyerRefundAmountETB: buyerRefund,
          sellerPayoutAmountETB: sellerPayout,
          resolutionNotes: decision.resolutionNotes.trim()
        });
      } catch (txSyncErr) {
        console.warn('Sync warning for transaction during dispute arbitration:', txSyncErr);
      }
    } catch (syncErr) {
      console.warn('Sync warning during dispute arbitration:', syncErr);
    }

    // Log Immutable Audit Event
    auditService.log({
      actorId: admin.id,
      actorName: admin.fullName || admin.email,
      actorRole: 'ADMIN',
      action: 'DISPUTE_ARBITRATED',
      entityType: 'DISPUTE',
      entityId: dispute.id,
      details: `Arbitrated dispute ${dispute.disputeNumber} -> ${decision.outcome}. Reason: ${decision.resolutionNotes.trim()}`,
      metadata: {
        disputeNumber: dispute.disputeNumber,
        outcome: decision.outcome,
        buyerRefundAmountETB: buyerRefund,
        sellerPayoutAmountETB: sellerPayout
      }
    });

    // Notify Buyer & Seller
    [dispute.buyerId, dispute.sellerId].forEach((recipientId) => {
      notificationService.dispatch({
        targetUserId: recipientId,
        type: 'DISPUTE_RESOLVED',
        title: `Dispute Arbitrated: ${dispute.disputeNumber}`,
        message: `Admin has executed the final settlement verdict (${decision.outcome.replace(/_/g, ' ')}). Funds updated accordingly.`,
        referenceId: dispute.id,
        referenceType: 'dispute'
      });
    });

    return dispute;
  }
}

export const disputeService = new DisputeService();
