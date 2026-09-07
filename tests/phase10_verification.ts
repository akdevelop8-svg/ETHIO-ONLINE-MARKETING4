/**
 * EOM Phase 10 Production Backend & Persistent Data Verification Suite
 *
 * Validates:
 * 1. Storage Abstraction & BaseRepository CRUD operations
 * 2. MigrationRunner legacy migration & validation
 * 3. Authoritative Financial Calculations (25% platform fee / 75% seller payout)
 * 4. Escrow Dispute Protection (blocked release when DISPUTED)
 * 5. Settlement Idempotency & Re-entrancy Protection
 * 6. PaymentVerification State Machine transitions
 * 7. PaymentProvider Reference Validation
 */

import { InMemoryPersistenceAdapter } from '../src/services/persistence/persistenceAdapter';
import { 
  TransactionRepository, 
  OrderRepository, 
  PaymentVerificationRepository,
  BaseRepository
} from '../src/services/persistence/repository';
import { MigrationRunner } from '../src/services/persistence/migrationRunner';
import { 
  PaymentVerificationEngine, 
  VerificationState 
} from '../src/services/payments/paymentVerification';
import { PaymentProviderRegistry } from '../src/services/payments/paymentProvider';
import { TransactionService } from '../src/services/transactions/transactionService';
import { User, Order, Transaction } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failure] ${message}`);
  }
}

function assertThrows(fn: () => void, expectedErrorMessageSnippet: string) {
  try {
    fn();
    throw new Error('Expected function to throw an error, but it succeeded.');
  } catch (err: any) {
    if (!err.message.includes(expectedErrorMessageSnippet)) {
      throw new Error(`Expected error containing "${expectedErrorMessageSnippet}", but got: "${err.message}"`);
    }
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('              EOM PHASE 10 PERSISTENCE & PAYMENTS TEST SUITE             ');
  console.log('========================================================================\n');

  const memAdapter = new InMemoryPersistenceAdapter();

  // ------------------------------------------------------------------------
  // 1. Storage Abstraction & BaseRepository CRUD operations
  // ------------------------------------------------------------------------
  console.log('[Test 1] Storage Abstraction & BaseRepository CRUD...');
  
  const txRepo = new TransactionRepository(memAdapter);
  const pvRepo = new PaymentVerificationRepository(memAdapter);

  const testTx: Transaction = {
    id: 'tx-test-01',
    transactionNumber: 'EOM-TX-2026-0001',
    orderId: 'ord-test-01',
    orderNumber: 'EOM-ORD-2026-0001',
    listingId: 'list-test-01',
    listingTitle: 'Telememes 100K Subscribers',
    platform: 'telegram',
    buyerId: 'usr-buyer-01',
    buyerName: 'Test Buyer',
    sellerId: 'usr-seller-01',
    sellerName: 'Test Seller',
    amountETB: 10000,
    platformFeeETB: 2500,
    sellerPayoutETB: 7500,
    currency: 'ETB',
    paymentMethod: 'TELEBIRR',
    status: 'PAYMENT_PENDING',
    verificationStatus: 'PENDING_SUBMISSION',
    escrowStatus: 'PENDING',
    payoutStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  txRepo.save(testTx);
  
  const fetchedTx = txRepo.findById('tx-test-01');
  assert(fetchedTx !== null, 'Should retrieve saved transaction by ID.');
  assert(fetchedTx?.amountETB === 10000, 'Fetched transaction should preserve amount.');
  assert(fetchedTx?.platformFeeETB === 2500, 'Fetched transaction should preserve platform fee.');

  console.log('  ✔ CRUD Operations Successful.\n');

  // ------------------------------------------------------------------------
  // 2. MigrationRunner legacy migration & validation
  // ------------------------------------------------------------------------
  console.log('[Test 2] MigrationRunner legacy migration & financial integrity check...');
  
  // Seed unversioned/incorrect math records into storage to test repair capabilities
  const badTx: any = {
    id: 'tx-legacy-01',
    transactionNumber: 'EOM-TX-2026-9999',
    orderId: 'ord-legacy-01',
    orderNumber: 'EOM-ORD-2026-9999',
    listingId: 'list-legacy-01',
    listingTitle: 'Legacy Channel',
    platform: 'telegram',
    buyerId: 'usr-buyer-01',
    buyerName: 'Test Buyer',
    sellerId: 'usr-seller-01',
    sellerName: 'Test Seller',
    amountETB: 10000,
    platformFeeETB: 1000, // INCORRECT (Should be 2500)
    sellerPayoutETB: 9000, // INCORRECT (Should be 7500)
    currency: 'ETB',
    paymentMethod: 'TELEBIRR',
    status: 'PAYMENT_VERIFIED',
    escrowStatus: 'HELD',
    payoutStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  memAdapter.batchSave('eom_transactions_vault_v1', [testTx, badTx]);

  const migrationRunner = new MigrationRunner(memAdapter);
  assert(migrationRunner.getCurrentVersion() === 0, 'Schema version should start at 0.');
  
  const migrationSummary = migrationRunner.runMigrations();
  assert(migrationSummary.success, 'Migration run should report success.');
  assert(migrationRunner.getCurrentVersion() === 1, 'Schema version should now be stamped as 1.');

  const txList = txRepo.findAll();
  const migratedTx = txList.find(t => t.id === 'tx-legacy-01');
  assert(migratedTx !== undefined, 'Legacy transaction should still exist.');
  assert(migratedTx?.platformFeeETB === 2500, 'Legacy platform fee must be corrected to 25% (2500).');
  assert(migratedTx?.sellerPayoutETB === 7500, 'Legacy seller payout must be corrected to 75% (7500).');
  assert(migratedTx?.verificationStatus === 'VERIFIED', 'Missing verification status must be populated correctly.');

  console.log('  ✔ Legacy Migration & Financial Integrity repair verified.\n');

  // ------------------------------------------------------------------------
  // 3. Authoritative Financial Calculations
  // ------------------------------------------------------------------------
  console.log('[Test 3] Authoritative Financial Calculations (25% vs 75%)...');
  
  const txService = new TransactionService(txRepo, pvRepo);
  const testBuyer: User = {
    id: 'usr-buyer-01',
    email: 'buyer@eom.et',
    role: 'BUYER',
    authRole: 'user',
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const testOrder: Order = {
    id: 'ord-new-10',
    orderNumber: 'EOM-ORD-2026-0010',
    listingId: 'list-test-01',
    listingTitle: 'Telememes 100K Subscribers',
    platform: 'telegram',
    buyerId: 'usr-buyer-01',
    buyerName: 'Test Buyer',
    sellerId: 'usr-seller-01',
    sellerName: 'Test Seller',
    amountETB: 20000,
    platformFeeETB: 0, // Mocked / client payload
    sellerPayoutETB: 0, // Mocked / client payload
    status: 'PROCESSING',
    escrowStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const freshTx = txService.createTransactionForOrder(testBuyer, testOrder, 'TELEBIRR');
  assert(freshTx.platformFeeETB === 5000, 'Commission must be authoritatively calculated as 25% (5000 ETB).');
  assert(freshTx.sellerPayoutETB === 15000, 'Seller payout must be authoritatively calculated as 75% (15000 ETB).');

  console.log('  ✔ Authoritative math enforced successfully.\n');

  // ------------------------------------------------------------------------
  // 4. Escrow Dispute Protection
  // ------------------------------------------------------------------------
  console.log('[Test 4] Escrow Dispute Protection (blocked release when DISPUTED)...');
  
  // Attempt to complete/release a disputed order/transaction should fail
  const adminUser: User = {
    id: 'usr-admin-01',
    email: 'admin@eom.et',
    role: 'ADMIN',
    authRole: 'admin',
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const verifiedTx = txService.verifyPaymentAsAdmin(adminUser, freshTx.id);
  assert(verifiedTx.status === 'PAYMENT_VERIFIED', 'Status should be PAYMENT_VERIFIED.');

  // Put into dispute state
  verifiedTx.status = 'PAYMENT_VERIFIED'; // reset status
  verifiedTx.escrowStatus = 'DISPUTED';
  txRepo.save(verifiedTx);

  // Attempt seller release as admin during dispute should throw error
  assertThrows(() => {
    txService.completeTransactionAndReleaseEscrow(adminUser, verifiedTx.id);
  }, 'dispute');

  console.log('  ✔ Escrow Dispute Protection holds (release is safely blocked when disputed).\n');

  // ------------------------------------------------------------------------
  // 5. Settlement Idempotency & Re-entrancy Protection
  // ------------------------------------------------------------------------
  console.log('[Test 5] Settlement Idempotency & Re-entrancy Protection...');
  
  // Resolve dispute back to held, release it once
  verifiedTx.escrowStatus = 'HELD';
  txRepo.save(verifiedTx);

  const completedTx = txService.completeTransactionAndReleaseEscrow(adminUser, verifiedTx.id);
  assert(completedTx.status === 'COMPLETED', 'Transaction must advance to COMPLETED.');
  assert(completedTx.escrowStatus === 'RELEASED', 'Escrow status must be RELEASED.');
  assert(completedTx.payoutStatus === 'PAID', 'Payout status must be PAID.');

  // Try releasing again (re-entrancy / double payout attempt is safe and idempotent)
  const completedAgain = txService.completeTransactionAndReleaseEscrow(adminUser, verifiedTx.id);
  assert(completedAgain.status === 'COMPLETED', 'Idempotent release must return COMPLETED.');
  assert(completedAgain.escrowStatus === 'RELEASED', 'Idempotent release must return RELEASED.');

  console.log('  ✔ Double-spend/Idempotency checks protect escrow successfully.\n');

  // ------------------------------------------------------------------------
  // 6. PaymentVerification State Machine transitions
  // ------------------------------------------------------------------------
  console.log('[Test 6] PaymentVerification State Machine transitions...');

  const pendingRecord = PaymentVerificationEngine.createPendingRecord({
    transactionId: 'tx-test-sm-01',
    orderId: 'ord-test-sm-01',
    orderNumber: 'EOM-ORD-2026-9090',
    paymentMethod: 'TELEBIRR',
    claimedAmountETB: 5000
  });

  assert(pendingRecord.status === 'PENDING', 'Initial state should be PENDING.');

  // Valid transitions
  assert(PaymentVerificationEngine.canTransition('PENDING', 'SUBMITTED'), 'PENDING -> SUBMITTED should be valid.');
  assert(PaymentVerificationEngine.canTransition('SUBMITTED', 'VERIFIED'), 'SUBMITTED -> VERIFIED should be valid.');
  assert(PaymentVerificationEngine.canTransition('SUBMITTED', 'REJECTED'), 'SUBMITTED -> REJECTED should be valid.');

  // Invalid transitions
  assert(!PaymentVerificationEngine.canTransition('VERIFIED', 'PENDING'), 'VERIFIED -> PENDING should be blocked.');
  assert(!PaymentVerificationEngine.canTransition('REJECTED', 'VERIFIED'), 'REJECTED -> VERIFIED should be blocked directly.');

  assertThrows(() => {
    PaymentVerificationEngine.assertValidTransition('VERIFIED', 'PENDING');
  }, 'Illegal state transition');

  console.log('  ✔ State machine transitions verified.\n');

  // ------------------------------------------------------------------------
  // 7. PaymentProvider Reference Validation
  // ------------------------------------------------------------------------
  console.log('[Test 7] PaymentProvider Reference Validation...');

  const telebirrProvider = PaymentProviderRegistry.getProvider('TELEBIRR');
  assert(telebirrProvider.isAutomatedApiIntegration === false, 'Telebirr is manual escrow verification.');
  assert(telebirrProvider.validateReference('TB26083199').isValid === true, 'Telebirr uppercase reference with prefix TB should be valid.');
  assert(telebirrProvider.validateReference('123').isValid === false, 'Too short reference should be invalid.');

  const cbeProvider = PaymentProviderRegistry.getProvider('COMMERCIAL_BANK_OF_ETHIOPIA');
  assert(cbeProvider.validateReference('FT2608319984').isValid === true, 'CBE transaction reference starting with FT is valid.');

  console.log('  ✔ Reference validators behave correctly.\n');

  console.log('========================================================================');
  console.log('                 ALL TESTS PASSED SUCCESSFULLY (100%)                   ');
  console.log('========================================================================');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed!');
  console.error(err);
  process.exit(1);
});
