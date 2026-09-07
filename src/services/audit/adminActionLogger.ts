/**
 * EOM Admin Action Logger Utility Service
 * Phase 15 - Final Production Hardening & Administrative Accountability
 * 
 * Captures, sanitizes, and persists administrative operations:
 * - Listing approvals & rejections
 * - Payment verifications & rejections
 * - Escrow releases & arbitrated refunds
 * - Dispute resolutions & evidence directives
 * - Customer account status updates
 * 
 * Guarantees:
 * - Records timestamp, admin identifier (@mr_ebek / @EXO_SMM), action type, and target entity
 * - Strips and redacts any sensitive credentials, passwords, tokens, or private secrets
 * - Provides audit trails for compliance, dispute arbitration, and platform transparency
 */

import { User, UserRole, AuthRole } from '../../types';
import { auditRepository, AuditRepository } from '../persistence';

export interface AdminActionRecord {
  id: string;
  timestamp: string;
  adminIdentifier: string; // e.g. '@mr_ebek' or '@EXO_SMM'
  adminId: string;
  adminRole: 'ADMIN' | 'admin';
  actionType: 
    | 'LISTING_APPROVAL'
    | 'LISTING_REJECTION'
    | 'LISTING_EDIT'
    | 'PAYMENT_VERIFICATION'
    | 'PAYMENT_REJECTION'
    | 'ESCROW_RELEASE'
    | 'REFUND_EXECUTION'
    | 'DISPUTE_ARBITRATION'
    | 'DISPUTE_EVIDENCE_REQUEST'
    | 'USER_STATUS_CHANGE'
    | 'USER_VERIFICATION_CHANGE'
    | 'COMMISSION_SETTLEMENT'
    | 'SYSTEM_CONFIG_UPDATE';
  targetEntityType: 'LISTING' | 'PAYMENT' | 'ORDER' | 'TRANSACTION' | 'DISPUTE' | 'USER' | 'SYSTEM';
  targetEntityId: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  metadata?: Record<string, unknown>;
}

export interface AdminActionFilter {
  adminIdentifier?: string;
  actionType?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  since?: string;
  status?: string;
}

const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'auth',
  'jwt',
  'hash',
  'credential',
  'private',
  'apikey',
  'api_key',
  'pin',
  'bearer',
  'salt'
];

export class AdminActionLogger {
  private repo: AuditRepository;
  private inMemoryCache: AdminActionRecord[] = [];
  private isLoaded = false;

  constructor(repo: AuditRepository = auditRepository) {
    this.repo = repo;
    this.init();
  }

  private init() {
    if (this.isLoaded) return;
    try {
      const stored = this.repo.findAll();
      if (stored && Array.isArray(stored)) {
        // Map any existing audit logs into admin action records where applicable
        this.inMemoryCache = stored
          .filter((log: any) => log.actorRole === 'ADMIN' || log.actorRole === 'admin')
          .map((log: any) => ({
            id: log.id || `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: log.timestamp || new Date().toISOString(),
            adminIdentifier: log.actorName || log.actorId,
            adminId: log.actorId,
            adminRole: 'ADMIN',
            actionType: (log.action as any) || 'SYSTEM_CONFIG_UPDATE',
            targetEntityType: (log.entityType as any) || 'SYSTEM',
            targetEntityId: log.entityId || 'N/A',
            details: log.details || '',
            status: log.status || 'SUCCESS',
            metadata: log.metadata
          }));
      }
    } catch {
      this.inMemoryCache = [];
    }
    this.isLoaded = true;
  }

  /**
   * Deep sanitize metadata to remove sensitive credentials, passwords, tokens, and hashes.
   */
  public sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const clean: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(metadata)) {
      const lower = key.toLowerCase();
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => lower.includes(pattern));

      if (isSensitive) {
        clean[key] = '[REDACTED_CREDENTIAL]';
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        clean[key] = this.sanitizeMetadata(val as Record<string, unknown>);
      } else if (typeof val === 'string' && (val.startsWith('ey') || val.length > 250 && !val.startsWith('http'))) {
        // Redact potential JWT or raw token strings
        if (val.includes('.') && val.split('.').length === 3) {
          clean[key] = '[REDACTED_JWT_TOKEN]';
        } else {
          clean[key] = val;
        }
      } else {
        clean[key] = val;
      }
    }

    return clean;
  }

  /**
   * Derive canonical admin identifier (e.g. '@mr_ebek' or '@EXO_SMM')
   */
  public getCanonicalAdminIdentifier(admin: User | { id: string; username?: string; email?: string; fullName?: string }): string {
    if (admin.username) {
      return admin.username.startsWith('@') ? admin.username : `@${admin.username}`;
    }
    if (admin.email) {
      if (admin.email.includes('mr_ebek')) return '@mr_ebek';
      if (admin.email.includes('exo_smm')) return '@EXO_SMM';
      return admin.email;
    }
    if (admin.fullName) {
      if (admin.fullName.includes('@mr_ebek')) return '@mr_ebek';
      if (admin.fullName.includes('@EXO_SMM')) return '@EXO_SMM';
      return admin.fullName;
    }
    return admin.id;
  }

  /**
   * Generic Admin Action Recorder
   */
  public logAction(params: {
    admin: User | { id: string; username?: string; email?: string; fullName?: string };
    actionType: AdminActionRecord['actionType'];
    targetEntityType: AdminActionRecord['targetEntityType'];
    targetEntityId: string;
    details: string;
    status?: 'SUCCESS' | 'WARNING' | 'FAILED';
    metadata?: Record<string, unknown>;
  }): AdminActionRecord {
    this.init();

    const adminIdentifier = this.getCanonicalAdminIdentifier(params.admin);
    const sanitizedMeta = this.sanitizeMetadata(params.metadata);

    const record: AdminActionRecord = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      adminIdentifier,
      adminId: params.admin.id,
      adminRole: 'ADMIN',
      actionType: params.actionType,
      targetEntityType: params.targetEntityType,
      targetEntityId: params.targetEntityId,
      details: params.details,
      status: params.status || 'SUCCESS',
      metadata: sanitizedMeta
    };

    this.inMemoryCache.unshift(record);

    // Keep memory cache constrained to last 1,000 administrative operations
    if (this.inMemoryCache.length > 1000) {
      this.inMemoryCache = this.inMemoryCache.slice(0, 1000);
    }

    // Persist to underlying storage repository as an audit log
    try {
      this.repo.save({
        id: record.id,
        actorId: record.adminId,
        actorName: record.adminIdentifier,
        actorRole: 'ADMIN',
        action: record.actionType,
        entityType: record.targetEntityType as any,
        entityId: record.targetEntityId,
        details: record.details,
        status: record.status,
        metadata: record.metadata,
        timestamp: record.timestamp
      });
    } catch {
      // Storage fallback safety
    }

    return record;
  }

  // ---------------------------------------------------------------------------
  // Specialized Domain Helper Methods
  // ---------------------------------------------------------------------------

  /**
   * Log Channel Listing Approval
   */
  public logListingApproval(
    admin: User,
    listingId: string,
    channelTitle: string,
    metadata?: Record<string, unknown>
  ): AdminActionRecord {
    return this.logAction({
      admin,
      actionType: 'LISTING_APPROVAL',
      targetEntityType: 'LISTING',
      targetEntityId: listingId,
      details: `Admin ${this.getCanonicalAdminIdentifier(admin)} approved listing "${channelTitle}" (${listingId}) for public marketplace.`,
      status: 'SUCCESS',
      metadata: {
        listingId,
        channelTitle,
        ...metadata
      }
    });
  }

  /**
   * Log Channel Listing Rejection
   */
  public logListingRejection(
    admin: User,
    listingId: string,
    channelTitle: string,
    reason: string,
    metadata?: Record<string, unknown>
  ): AdminActionRecord {
    return this.logAction({
      admin,
      actionType: 'LISTING_REJECTION',
      targetEntityType: 'LISTING',
      targetEntityId: listingId,
      details: `Admin ${this.getCanonicalAdminIdentifier(admin)} rejected listing "${channelTitle}" (${listingId}). Reason: ${reason}`,
      status: 'WARNING',
      metadata: {
        listingId,
        channelTitle,
        rejectionReason: reason,
        ...metadata
      }
    });
  }

  /**
   * Log Manual Payment Deposit Verification & Escrow Lock
   */
  public logPaymentVerification(
    admin: User,
    paymentReference: string,
    orderId: string,
    amountETB: number,
    provider: string,
    metadata?: Record<string, unknown>
  ): AdminActionRecord {
    return this.logAction({
      admin,
      actionType: 'PAYMENT_VERIFICATION',
      targetEntityType: 'PAYMENT',
      targetEntityId: paymentReference,
      details: `Admin ${this.getCanonicalAdminIdentifier(admin)} verified ${amountETB.toLocaleString()} ETB ${provider} payment for Order ${orderId}. Escrow locked.`,
      status: 'SUCCESS',
      metadata: {
        paymentReference,
        orderId,
        amountETB,
        provider,
        ...metadata
      }
    });
  }

  /**
   * Log Manual Payment Deposit Rejection
   */
  public logPaymentRejection(
    admin: User,
    paymentReference: string,
    orderId: string,
    reason: string,
    metadata?: Record<string, unknown>
  ): AdminActionRecord {
    return this.logAction({
      admin,
      actionType: 'PAYMENT_REJECTION',
      targetEntityType: 'PAYMENT',
      targetEntityId: paymentReference,
      details: `Admin ${this.getCanonicalAdminIdentifier(admin)} rejected payment ${paymentReference} for Order ${orderId}. Reason: ${reason}`,
      status: 'WARNING',
      metadata: {
        paymentReference,
        orderId,
        rejectionReason: reason,
        ...metadata
      }
    });
  }

  /**
   * Log Escrow Release and Seller Payout (75% seller / 25% platform)
   */
  public logEscrowRelease(
    admin: User,
    orderId: string,
    transactionId: string,
    sellerPayoutETB: number,
    commissionETB: number,
    metadata?: Record<string, unknown>
  ): AdminActionRecord {
    return this.logAction({
      admin,
      actionType: 'ESCROW_RELEASE',
      targetEntityType: 'TRANSACTION',
      targetEntityId: transactionId,
      details: `Admin ${this.getCanonicalAdminIdentifier(admin)} released escrow for Order ${orderId}. Payout: ${sellerPayoutETB.toLocaleString()} ETB (75%), Commission: ${commissionETB.toLocaleString()} ETB (25%).`,
      status: 'SUCCESS',
      metadata: {
        orderId,
        transactionId,
        sellerPayoutETB,
        commissionETB,
        ...metadata
      }
    });
  }

  /**
   * Log Dispute Arbitration Ruling
   */
  public logDisputeArbitration(
    admin: User,
    disputeId: string,
    outcome: string,
    resolutionNotes: string,
    metadata?: Record<string, unknown>
  ): AdminActionRecord {
    return this.logAction({
      admin,
      actionType: 'DISPUTE_ARBITRATION',
      targetEntityType: 'DISPUTE',
      targetEntityId: disputeId,
      details: `Admin ${this.getCanonicalAdminIdentifier(admin)} resolved dispute ${disputeId} with ruling: ${outcome}. Notes: ${resolutionNotes}`,
      status: 'SUCCESS',
      metadata: {
        disputeId,
        outcome,
        resolutionNotes,
        ...metadata
      }
    });
  }

  /**
   * Retrieve filtered admin action history
   */
  public getActions(filter?: AdminActionFilter): AdminActionRecord[] {
    this.init();
    let records = [...this.inMemoryCache];

    if (filter) {
      if (filter.adminIdentifier) {
        const query = filter.adminIdentifier.toLowerCase().replace(/^@/, '');
        records = records.filter((r) => r.adminIdentifier.toLowerCase().includes(query));
      }
      if (filter.actionType) {
        records = records.filter((r) => r.actionType === filter.actionType);
      }
      if (filter.targetEntityType) {
        records = records.filter((r) => r.targetEntityType === filter.targetEntityType);
      }
      if (filter.targetEntityId) {
        records = records.filter((r) => r.targetEntityId === filter.targetEntityId);
      }
      if (filter.status) {
        records = records.filter((r) => r.status === filter.status);
      }
      if (filter.since) {
        const sinceTime = new Date(filter.since).getTime();
        records = records.filter((r) => new Date(r.timestamp).getTime() >= sinceTime);
      }
    }

    return records;
  }
}

export const adminActionLogger = new AdminActionLogger();
