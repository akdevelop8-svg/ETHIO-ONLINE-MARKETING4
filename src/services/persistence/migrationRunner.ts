/**
 * EOM Migration Runner & Schema Evolution Engine
 * Phase 10: Production Backend & Persistent Data Foundation
 *
 * Ensures backward compatibility across storage versions.
 * Safely migrates unversioned legacy localStorage payloads to versioned schema structures.
 */

import { IPersistenceAdapter } from './persistenceAdapter';
import { Transaction, Order } from '../../types';

export interface MigrationResult {
  collection: string;
  previousVersion: number;
  newVersion: number;
  migratedRecordsCount: number;
  errors: string[];
}

export interface MigrationRunSummary {
  success: boolean;
  appliedMigrations: string[];
  results: MigrationResult[];
  errors: string[];
}

const META_COLLECTION = 'eom_schema_meta';

export class MigrationRunner {
  private adapter: IPersistenceAdapter;

  constructor(adapter: IPersistenceAdapter) {
    this.adapter = adapter;
  }

  /**
   * Get current schema version recorded in persistent storage
   */
  public getCurrentVersion(): number {
    try {
      const records = this.adapter.getAll<{ id: string; version: number }>(META_COLLECTION);
      if (records && records.length > 0) {
        return records[0].version || 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Run all migrations on initial application bootstrap
   */
  public runMigrations(): MigrationRunSummary {
    const results: MigrationResult[] = [];
    const appliedMigrations: string[] = [];
    const allErrors: string[] = [];

    const txMigration = this.migrateTransactions();
    results.push(txMigration);
    if (txMigration.errors.length > 0) allErrors.push(...txMigration.errors);

    const orderMigration = this.migrateOrders();
    results.push(orderMigration);
    if (orderMigration.errors.length > 0) allErrors.push(...orderMigration.errors);

    appliedMigrations.push('001_initial_persistence_foundation');

    // Stamp current version
    try {
      this.adapter.batchSave(META_COLLECTION, [{ id: 'schema_version', version: 1, updatedAt: new Date().toISOString() }]);
    } catch (err) {
      console.warn('[MigrationRunner] Could not stamp schema version:', err);
    }

    return {
      success: allErrors.length === 0,
      appliedMigrations,
      results,
      errors: allErrors
    };
  }

  /**
   * Migrate and enforce financial integrity on transactions
   */
  private migrateTransactions(): MigrationResult {
    const collection = 'eom_transactions_vault_v1';
    const errors: string[] = [];
    let count = 0;

    try {
      const records = this.adapter.getAll<Transaction>(collection);
      let needsResave = false;

      const normalized = records.map((tx) => {
        let changed = false;
        // Ensure authoritative math on any legacy record
        if (typeof tx.amountETB === 'number') {
          const expectedFee = Math.round((tx.amountETB * 25) / 100);
          const expectedPayout = tx.amountETB - expectedFee;

          if (tx.platformFeeETB !== expectedFee || tx.sellerPayoutETB !== expectedPayout) {
            tx.platformFeeETB = expectedFee;
            tx.sellerPayoutETB = expectedPayout;
            changed = true;
          }
        }

        // Ensure status & verificationStatus are non-empty
        if (!tx.verificationStatus) {
          tx.verificationStatus = tx.status === 'PAYMENT_VERIFIED' 
            ? 'VERIFIED' 
            : tx.status === 'PAYMENT_SUBMITTED' 
              ? 'SUBMITTED' 
              : 'PENDING_SUBMISSION';
          changed = true;
        }

        if (changed) {
          needsResave = true;
          count++;
        }
        return tx;
      });

      if (needsResave) {
        this.adapter.batchSave(collection, normalized);
      }

      return {
        collection,
        previousVersion: 1,
        newVersion: 2,
        migratedRecordsCount: count,
        errors
      };
    } catch (err) {
      errors.push(String(err));
      return {
        collection,
        previousVersion: 1,
        newVersion: 2,
        migratedRecordsCount: 0,
        errors
      };
    }
  }

  /**
   * Migrate and enforce financial integrity on orders
   */
  private migrateOrders(): MigrationResult {
    const collection = 'eom_orders_vault_v2';
    const errors: string[] = [];
    let count = 0;

    try {
      const records = this.adapter.getAll<Order>(collection);
      let needsResave = false;

      const normalized = records.map((order) => {
        let changed = false;
        if (typeof order.amountETB === 'number') {
          const expectedFee = Math.round((order.amountETB * 25) / 100);
          const expectedPayout = order.amountETB - expectedFee;

          if (order.platformFeeETB !== expectedFee || order.sellerPayoutETB !== expectedPayout) {
            order.platformFeeETB = expectedFee;
            order.sellerPayoutETB = expectedPayout;
            changed = true;
          }
        }

        if (changed) {
          needsResave = true;
          count++;
        }
        return order;
      });

      if (needsResave) {
        this.adapter.batchSave(collection, normalized);
      }

      return {
        collection,
        previousVersion: 1,
        newVersion: 2,
        migratedRecordsCount: count,
        errors
      };
    } catch (err) {
      errors.push(String(err));
      return {
        collection,
        previousVersion: 1,
        newVersion: 2,
        migratedRecordsCount: 0,
        errors
      };
    }
  }
}
