/**
 * EOM Persistence Module Entry Point & Singleton Registration
 * Phase 10: Production Backend & Persistent Data Foundation
 */

import { LocalStoragePersistenceAdapter, IPersistenceAdapter } from './persistenceAdapter.js';
import { 
  TransactionRepository, 
  OrderRepository, 
  ListingRepository, 
  DisputeRepository, 
  AuditRepository, 
  NotificationRepository,
  PaymentVerificationRepository
} from './repository.js';
import { MigrationRunner } from './migrationRunner.js';

// Instantiate Default Storage Adapter
export let defaultStorageAdapter: IPersistenceAdapter = new LocalStoragePersistenceAdapter();

export function setStorageAdapter(adapter: IPersistenceAdapter) {
  defaultStorageAdapter = adapter;
  
  // Re-instantiate repositories with the new adapter
  transactionRepository = new TransactionRepository(defaultStorageAdapter);
  orderRepository = new OrderRepository(defaultStorageAdapter);
  listingRepository = new ListingRepository(defaultStorageAdapter);
  disputeRepository = new DisputeRepository(defaultStorageAdapter);
  auditRepository = new AuditRepository(defaultStorageAdapter);
  notificationRepository = new NotificationRepository(defaultStorageAdapter);
  paymentVerificationRepository = new PaymentVerificationRepository(defaultStorageAdapter);
}

// Instantiate and Export Repository Singletons
export let transactionRepository = new TransactionRepository(defaultStorageAdapter);
export let orderRepository = new OrderRepository(defaultStorageAdapter);
export let listingRepository = new ListingRepository(defaultStorageAdapter);
export let disputeRepository = new DisputeRepository(defaultStorageAdapter);
export let auditRepository = new AuditRepository(defaultStorageAdapter);
export let notificationRepository = new NotificationRepository(defaultStorageAdapter);
export let paymentVerificationRepository = new PaymentVerificationRepository(defaultStorageAdapter);

// Re-export Core Classes and Interfaces
export * from './persistenceAdapter.js';
export * from './repository.js';
export * from './migrationRunner.js';

// Run Migrations Synchronously on App Bootstrap/Import
try {
  const defaultMigrationRunner = new MigrationRunner(defaultStorageAdapter);
  const result = defaultMigrationRunner.runMigrations();
  if (result.success) {
    console.log('[Persistence] Migration succeeded. Database foundations ready.');
  } else {
    console.warn('[Persistence] Migration finished with warnings:', result.errors);
  }
} catch (err) {
  console.error('[Persistence] Migration runner crashed during bootstrap:', err);
}
