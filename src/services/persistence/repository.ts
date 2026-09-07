/**
 * EOM Repository Pattern Core & Concrete Data Repositories
 * Phase 10: Production Backend & Persistent Data Foundation
 */

import { IPersistenceAdapter } from './persistenceAdapter';
import { 
  Transaction, 
  Order, 
  Listing, 
  Dispute, 
  AuditLog, 
  AppNotification 
} from '../../types';

export interface Identifiable {
  id: string;
}

export class BaseRepository<T extends Identifiable> {
  protected adapter: IPersistenceAdapter;
  protected collectionName: string;

  constructor(adapter: IPersistenceAdapter, collectionName: string) {
    this.adapter = adapter;
    this.collectionName = collectionName;
  }

  public findAll(): T[] {
    return this.adapter.getAll<T>(this.collectionName);
  }

  public findById(id: string): T | null {
    const all = this.findAll();
    return all.find((item) => item.id === id) || null;
  }

  public save(item: T): void {
    this.adapter.save<T>(this.collectionName, item);
  }

  public saveAll(items: T[]): void {
    this.adapter.batchSave<T>(this.collectionName, items);
  }

  public delete(id: string): void {
    this.adapter.delete(this.collectionName, id);
  }

  public clear(): void {
    this.adapter.clear(this.collectionName);
  }
}

// Concrete Repositories
export class TransactionRepository extends BaseRepository<Transaction> {
  constructor(adapter: IPersistenceAdapter) {
    super(adapter, 'eom_transactions_vault_v1');
  }
}

export class OrderRepository extends BaseRepository<Order> {
  constructor(adapter: IPersistenceAdapter) {
    super(adapter, 'eom_orders_vault_v2');
  }
}

export class ListingRepository extends BaseRepository<Listing> {
  constructor(adapter: IPersistenceAdapter) {
    super(adapter, 'eom_listings_vault_v1');
  }
}

export class DisputeRepository extends BaseRepository<Dispute> {
  constructor(adapter: IPersistenceAdapter) {
    super(adapter, 'eom_disputes_vault_v1');
  }
}

export class AuditRepository extends BaseRepository<AuditLog> {
  constructor(adapter: IPersistenceAdapter) {
    super(adapter, 'eom_audit_logs_vault_v1');
  }
}

export class NotificationRepository extends BaseRepository<AppNotification> {
  constructor(adapter: IPersistenceAdapter) {
    super(adapter, 'eom_notifications_v2');
  }
}

export interface PaymentVerificationRecord extends Identifiable {
  transactionId: string;
  orderId: string;
  orderNumber: string;
  paymentMethod: string;
  claimedAmountETB: number;
  status: 'PENDING' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  senderName?: string;
  referenceNumber?: string;
  proofUrl?: string;
  proofNotes?: string;
  rejectionReason?: string;
  verifiedByAdminId?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class PaymentVerificationRepository extends BaseRepository<PaymentVerificationRecord> {
  constructor(adapter: IPersistenceAdapter) {
    super(adapter, 'eom_payment_verifications_v1');
  }

  public findByTransactionId(transactionId: string): PaymentVerificationRecord | null {
    const all = this.findAll();
    return all.find((x) => x.transactionId === transactionId) || null;
  }
}
