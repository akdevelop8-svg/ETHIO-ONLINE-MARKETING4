/**
 * EOM Audit & Platform Activity Service
 * Phase 2 - 8: Platform Operations & Accountability
 * Secure logging service that records user, transaction & admin operations.
 * Enforces sanitization to ensure passwords and credentials are never stored.
 */

import { AuditLog, User, UserRole, AuthRole } from '../../types';
import { authService } from '../auth/authService';
import { auditRepository, AuditRepository } from '../persistence';

const STORAGE_AUDIT_KEY = 'eom_audit_log_v2';

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-001',
    actorId: 'usr-admin-01',
    actorName: 'Admin (@mr_ebek)',
    actorRole: 'ADMIN',
    action: 'LISTING_APPROVED',
    entityType: 'LISTING',
    entityId: 'list-seed-001',
    details: 'Approved Telegram channel listing "@ethiotechinsights" after verifying channel ownership & analytics.',
    status: 'SUCCESS',
    metadata: {
      platform: 'telegram',
      priceETB: 35000,
      followersCount: 48500
    },
    timestamp: '2026-08-15T12:30:00Z'
  },
  {
    id: 'audit-002',
    actorId: 'usr-admin-02',
    actorName: 'Admin (@EXO_SMM)',
    actorRole: 'ADMIN',
    action: 'LISTING_APPROVED',
    entityType: 'LISTING',
    entityId: 'list-seed-002',
    details: 'Approved TikTok listing "@habesha_style_daily" following review of 2.4M video likes screenshot.',
    status: 'SUCCESS',
    metadata: {
      platform: 'tiktok',
      priceETB: 78000
    },
    timestamp: '2026-08-20T16:00:00Z'
  },
  {
    id: 'audit-003',
    actorId: 'usr-admin-01',
    actorName: 'Admin (@mr_ebek)',
    actorRole: 'ADMIN',
    action: 'LISTING_REJECTED',
    entityType: 'LISTING',
    entityId: 'list-mod-004',
    details: 'Rejected listing "@bettingtips251" due to artificial subscriber manipulation.',
    status: 'WARNING',
    metadata: {
      reason: 'Detected artificial bot followers violating EOM authentic channel policies.'
    },
    timestamp: '2026-08-28T09:15:00Z'
  },
  {
    id: 'audit-004',
    actorId: 'usr-admin-02',
    actorName: 'Admin (@EXO_SMM)',
    actorRole: 'ADMIN',
    action: 'CHANGES_REQUESTED',
    entityType: 'LISTING',
    entityId: 'list-mod-003',
    details: 'Requested seller to submit uncropped analytics verification screenshot.',
    status: 'WARNING',
    metadata: {
      reason: 'Analytics screenshot cuts off handle verification header.'
    },
    timestamp: '2026-08-29T14:20:00Z'
  },
  {
    id: 'audit-005',
    actorId: 'usr-seller-04',
    actorName: 'Kidus Entertainment',
    actorRole: 'SELLER',
    action: 'LISTING_SUBMITTED',
    entityType: 'LISTING',
    entityId: 'list-mod-001',
    details: 'Submitted Telegram listing "@aradamemes" for admin ownership verification.',
    status: 'SUCCESS',
    metadata: {
      platform: 'telegram',
      askingPriceETB: 42000
    },
    timestamp: '2026-08-30T18:30:00Z'
  }
];

class AuditService {
  private repo: AuditRepository;
  private logs: AuditLog[] = [];
  private isInitialized = false;

  constructor(repo: AuditRepository = auditRepository) {
    this.repo = repo;
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    try {
      const stored = this.repo.findAll();
      if (stored && stored.length > 0) {
        this.logs = stored;
      } else {
        this.logs = [...INITIAL_AUDIT_LOGS];
        this.persist();
      }
    } catch {
      this.logs = [...INITIAL_AUDIT_LOGS];
    }
    this.isInitialized = true;
  }

  private persist() {
    try {
      this.repo.saveAll(this.logs);
    } catch {
      // Storage safety
    }
  }

  /**
   * Log an activity or administrative operation
   * Sanitizes metadata to ensure sensitive fields (passwords, tokens) are never recorded.
   */
  public log(entry: {
    actorId: string;
    actorName: string;
    actorRole: UserRole | AuthRole;
    action: string;
    entityType: 'LISTING' | 'ORDER' | 'TRANSACTION' | 'PAYMENT' | 'REFUND' | 'PAYOUT' | 'DISPUTE' | 'USER' | 'AUTH' | 'WALLET' | 'SYSTEM';
    entityId?: string;
    details: string;
    status?: 'SUCCESS' | 'WARNING' | 'FAILED';
    metadata?: Record<string, unknown>;
  }): AuditLog {
    this.init();

    // Sanitize metadata
    let sanitizedMeta: Record<string, unknown> | undefined = undefined;
    if (entry.metadata) {
      sanitizedMeta = {};
      for (const [key, value] of Object.entries(entry.metadata)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('hash') ||
          lowerKey.includes('credential')
        ) {
          sanitizedMeta[key] = '[REDACTED]';
        } else {
          sanitizedMeta[key] = value;
        }
      }
    }

    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actorId: entry.actorId,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details,
      status: entry.status || 'SUCCESS',
      metadata: sanitizedMeta,
      timestamp: new Date().toISOString()
    };

    this.logs.unshift(newLog);

    // Keep last 500 logs
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(0, 500);
    }

    this.persist();
    return newLog;
  }

  /**
   * Retrieve audit logs with admin authorization check
   */
  public getLogsForAdmin(
    requestingUser: User | null,
    filter?: {
      action?: string;
      actorRole?: string;
      entityType?: string;
      status?: string;
      searchQuery?: string;
    }
  ): AuditLog[] {
    const authCheck = authService.checkAdminAccess(requestingUser);
    if (!authCheck.granted) {
      throw new Error(authCheck.reason || 'Unauthorized: Admin privileges required to view audit records.');
    }

    this.init();
    let result = [...this.logs];

    if (filter) {
      if (filter.action && filter.action !== 'ALL') {
        result = result.filter((l) => l.action.toLowerCase() === filter.action?.toLowerCase());
      }
      if (filter.entityType && filter.entityType !== 'ALL') {
        result = result.filter((l) => l.entityType === filter.entityType);
      }
      if (filter.status && filter.status !== 'ALL') {
        result = result.filter((l) => l.status === filter.status);
      }
      if (filter.searchQuery && filter.searchQuery.trim()) {
        const query = filter.searchQuery.toLowerCase().trim();
        result = result.filter(
          (l) =>
            l.actorName.toLowerCase().includes(query) ||
            l.action.toLowerCase().includes(query) ||
            l.details.toLowerCase().includes(query) ||
            (l.entityId && l.entityId.toLowerCase().includes(query))
        );
      }
    }

    return result;
  }

  /**
   * Clear or reset logs (Admin authorized only)
   */
  public clearLogs(requestingUser: User | null): boolean {
    const authCheck = authService.checkAdminAccess(requestingUser);
    if (!authCheck.granted) {
      throw new Error('Unauthorized.');
    }
    this.logs = [];
    this.persist();
    return true;
  }
}

export const auditService = new AuditService();
