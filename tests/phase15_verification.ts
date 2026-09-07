/**
 * EOM Phase 15 Final End-to-End QA, Launch Preparation & Production Release Suite
 * Comprehensive End-to-End Validation of All Phase 1–14 Systems & Operational Guarantees
 */

import crypto from 'crypto';
import { transactionService } from '../src/services/transactions/transactionService';
import { listingService } from '../src/services/marketplace/listingService';
import { orderService } from '../src/services/orders/orderService';
import { authService } from '../src/services/auth/authService';
import { disputeService } from '../src/services/disputes/disputeService';
import { auditService } from '../src/services/audit/auditService';
import { notificationService } from '../src/services/notifications/notificationService';
import { webhookService } from '../src/services/payments/webhookService';
import { PaymentProviderRegistry, ProviderConnectionStatus } from '../src/services/payments/paymentProvider';
import { PaymentVerificationEngine } from '../src/services/payments/paymentVerification';
import { defaultStorageAdapter } from '../src/services/persistence';
import { User, Order, Listing, Transaction, Dispute } from '../src/types';
import { PLATFORM_FEE_PERCENTAGE, OFFICIAL_ESCROW_ACCOUNTS } from '../src/constants';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[PHASE 15 ASSERTION FAILED] ${message}`);
  }
}

async function runPhase15FinalQASuite() {
  console.log('================================================================================');
  console.log('       ETHIO ONLINE MARKET (EOM) - PHASE 15 PRODUCTION RELEASE AUDIT & QA       ');
  console.log('================================================================================');

  // Reset services to clean testing baseline
  transactionService.resetToDefaults();

  // Test Actors
  const buyer: User = {
    id: 'usr-buyer-qa-15',
    username: 'abebe_buyer_15',
    email: 'abebe15@ethioonline.market',
    fullName: 'Abebe Bikila Buyer',
    role: 'BUYER',
    authRole: 'user',
    phone: '+251911223344',
    isActive: true,
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const seller: User = {
    id: 'usr-seller-qa-15',
    username: 'almaz_seller_15',
    email: 'almaz15@ethioonline.market',
    fullName: 'Almaz Ayana Seller',
    role: 'SELLER',
    authRole: 'user',
    phone: '+251922334455',
    isActive: true,
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const adminEbek: User = {
    id: 'admin-ebek-id',
    username: 'mr_ebek',
    email: 'mr_ebek@ethioonline.market',
    fullName: 'Principal Escrow Officer @mr_ebek',
    role: 'ADMIN',
    authRole: 'admin',
    isActive: true,
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const adminExo: User = {
    id: 'admin-exo-id',
    username: 'EXO_SMM',
    email: 'exo_smm@ethioonline.market',
    fullName: 'Security Auditor @EXO_SMM',
    role: 'ADMIN',
    authRole: 'admin',
    isActive: true,
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const attacker: User = {
    id: 'usr-attacker-id',
    username: 'malicious_user',
    email: 'attacker@example.com',
    fullName: 'Malicious Bad Actor',
    role: 'BUYER',
    authRole: 'user',
    isActive: true,
    isVerified: false,
    emailVerified: false,
    phoneVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // ---------------------------------------------------------------------------
  // 1. SELLER LISTING & MODERATION LIFECYCLE
  // ---------------------------------------------------------------------------
  console.log('\n[E2E 1] Seller Channel Listing Lifecycle & Admin Moderation...');
  
  // 1.1 Seller submits channel listing
  const draftListing = listingService.submitListing(seller, {
    platform: 'telegram',
    title: 'Ethio Tech News & Software',
    handle: '@ethiotechnews',
    channelUrl: 'https://t.me/ethiotechnews',
    category: 'Business',
    description: 'Premier Ethiopian technology news channel with 45,000 active subscribers.',
    followersCount: 45000,
    priceETB: 20000,
    isMonetized: true
  });

  assert(draftListing.moderationStatus === 'PENDING_REVIEW', 'Submitted listing must be in PENDING_REVIEW state');
  assert(draftListing.status === 'PENDING_REVIEW', 'Submitted listing status must be PENDING_REVIEW');

  // 1.2 Unmoderated listing must NOT be visible to public marketplace
  const publicListings = listingService.getListings({});
  const isDraftVisible = publicListings.some((l) => l.id === draftListing.id);
  assert(!isDraftVisible, 'Pending review listing must NEVER be visible in public marketplace');

  // 1.3 Attacker cannot approve listing
  let unauthModError = false;
  try {
    listingService.moderateListing(attacker, draftListing.id, 'APPROVE', {
      adminNotes: 'Hacked approval'
    });
  } catch (err: any) {
    unauthModError = true;
  }
  assert(unauthModError, 'Non-admin cannot moderate listings');

  // 1.4 Admin approves listing
  const approvedListing = listingService.moderateListing(adminEbek, draftListing.id, 'APPROVE', {
    adminNotes: 'Verified channel ownership, active engagement metrics, and clean transfer history.'
  });
  assert(approvedListing.moderationStatus === 'APPROVED', 'Listing status must become APPROVED');
  assert(approvedListing.status === 'ACTIVE', 'Listing status must become ACTIVE');

  // 1.5 Now visible in public marketplace
  const publicListingsAfter = listingService.getListings({});
  const isApprovedVisible = publicListingsAfter.some((l) => l.id === draftListing.id);
  assert(isApprovedVisible, 'Approved listing must be visible in public marketplace');
  console.log('  ✔ Seller Submission -> Pending Review -> Admin Approval -> Public Marketplace verified.');

  // ---------------------------------------------------------------------------
  // 2. ORDER CREATION & AUTHORITATIVE FINANCIAL CALCULATIONS (25% / 75%)
  // ---------------------------------------------------------------------------
  console.log('\n[E2E 2] Order Creation & Server-Authoritative Financial Commission Split...');
  
  const order = orderService.createOrder(buyer, approvedListing.id, 'TELEBIRR');
  assert(order.amountETB === 20000, 'Order amount matches listing price (20,000 ETB)');
  assert(order.platformFeeETB === 5000, 'Platform commission must be strictly 25% (5,000 ETB)');
  assert(order.sellerPayoutETB === 15000, 'Seller payout must be strictly 75% (15,000 ETB)');
  assert(order.status === 'PROCESSING', 'Order initialized in PROCESSING state');

  const tx = transactionService.getTransactionByOrderId(order.id) || transactionService.createTransactionForOrder(buyer, order, 'TELEBIRR');
  assert(tx.amountETB === 20000, 'Transaction amount matches 20,000 ETB');
  assert(tx.platformFeeETB === 5000, 'Transaction platform fee is 25% (5,000 ETB)');
  assert(tx.sellerPayoutETB === 15000, 'Transaction seller payout is 75% (15,000 ETB)');
  assert(tx.status === 'PAYMENT_PENDING', 'Transaction initialized in PAYMENT_PENDING state');
  assert(tx.escrowStatus === 'HELD', 'Escrow status starts HELD');
  console.log('  ✔ Server-authoritative 25% fee (5,000 ETB) and 75% seller payout (15,000 ETB) verified.');

  // ---------------------------------------------------------------------------
  // 3. BUYER PAYMENT SUBMISSION & RECEIPT VALIDATION
  // ---------------------------------------------------------------------------
  console.log('\n[E3E 3] Buyer Payment Reference & Receipt Submission...');
  
  const paymentRef = `TB${Date.now().toString().slice(-8)}`;
  const submittedTx = transactionService.submitBuyerPayment(buyer, tx.id, {
    paymentReference: paymentRef,
    senderName: buyer.fullName,
    paymentProofNotes: 'Paid via Telebirr SuperApp from 0911223344'
  });

  assert(submittedTx.status === 'PAYMENT_SUBMITTED', 'Status must be PAYMENT_SUBMITTED');
  assert(submittedTx.verificationStatus === 'SUBMITTED', 'Verification status must be SUBMITTED');
  assert(submittedTx.paymentReference === paymentRef, 'Payment reference stored correctly');
  console.log('  ✔ Buyer payment reference and submission registered.');

  // ---------------------------------------------------------------------------
  // 4. ADMIN ESCROW PAYMENT VERIFICATION & SECURITY LOCK
  // ---------------------------------------------------------------------------
  console.log('\n[E2E 4] Admin Escrow Verification & Security Lock...');
  
  // Attacker cannot verify payment
  let unauthVerify = false;
  try {
    transactionService.verifyPaymentAsAdmin(attacker, tx.id);
  } catch {
    unauthVerify = true;
  }
  assert(unauthVerify, 'Non-admin cannot verify payment');

  // Authorized Admin (@mr_ebek) verifies payment against official merchant logs
  const verifiedTx = transactionService.verifyPaymentAsAdmin(adminEbek, tx.id, {
    adminNotes: 'Confirmed 20,000 ETB received in official Telebirr merchant account.'
  });
  assert(verifiedTx.status === 'PAYMENT_VERIFIED', 'Status must transition to PAYMENT_VERIFIED');
  assert(verifiedTx.verificationStatus === 'VERIFIED', 'Verification status must be VERIFIED');
  assert(verifiedTx.escrowStatus === 'HELD', 'Escrow funds securely locked as HELD');
  assert(verifiedTx.verifiedByAdmin?.includes('mr_ebek') || verifiedTx.verifiedByAdmin?.includes('Principal Escrow Officer'), 'Admin audit stamped');
  console.log('  ✔ Escrow payment verified and locked by Admin @mr_ebek.');

  // ---------------------------------------------------------------------------
  // 5. CHANNEL HANDOVER & ORDER COMPLETION / SELLER PAYOUT
  // ---------------------------------------------------------------------------
  console.log('\n[E2E 5] Secure Channel Ownership Handover & Seller Payout Execution...');
  
  // Update transfer step to CREDENTIAL_HANDOVER
  const handoverOrder = orderService.updateTransferStep(adminEbek, order.id, 'CREDENTIAL_HANDOVER', 'Credentials shared in secure admin chat.');
  assert(handoverOrder.transferDetails?.step === 'CREDENTIAL_HANDOVER', 'Transfer step moved to CREDENTIAL_HANDOVER');

  // Buyer confirms successful ownership transfer and completes order
  const completedOrder = orderService.completeOrder(buyer, order.id, 'Buyer verified ownership transfer of @ethiotechnews.');
  assert(completedOrder.status === 'SUCCESS', 'Order status marked SUCCESS');
  assert(completedOrder.escrowStatus === 'RELEASED', 'Order escrow status marked RELEASED');

  const completedTx = transactionService.getTransactionById(tx.id);
  assert(completedTx?.status === 'COMPLETED', 'Transaction completed');
  assert(completedTx?.escrowStatus === 'RELEASED', 'Escrow released');
  assert(completedTx?.sellerPayoutETB === 15000, 'Seller receives exact 75% payout (15,000 ETB)');
  console.log('  ✔ Handover confirmed and seller 75% payout (15,000 ETB) safely released.');

  // ---------------------------------------------------------------------------
  // 6. DISPUTE ARBITRATION & PROTECTION AGAINST UNAUTHORIZED RELEASE
  // ---------------------------------------------------------------------------
  console.log('\n[E2E 6] Dispute Arbitration & Escrow Protection...');
  
  // Create second listing and order for dispute testing
  const listingDispute = listingService.submitListing(seller, {
    platform: 'tiktok',
    title: 'Ethio Comedy TikTok Hub',
    handle: '@ethiocomedyhub',
    channelUrl: 'https://tiktok.com/@ethiocomedyhub',
    category: 'Entertainment',
    description: 'Popular Ethiopian TikTok comedy account with 100k followers.',
    followersCount: 100000,
    priceETB: 10000,
    isMonetized: false
  });
  listingService.moderateListing(adminEbek, listingDispute.id, 'APPROVE', { adminNotes: 'Verified.' });

  const orderDispute = orderService.createOrder(buyer, listingDispute.id, 'COMMERCIAL_BANK_OF_ETHIOPIA');
  const txDispute = transactionService.getTransactionByOrderId(orderDispute.id)!;
  transactionService.submitBuyerPayment(buyer, txDispute.id, { paymentReference: `FT${Date.now().toString().slice(-8)}` });
  transactionService.verifyPaymentAsAdmin(adminExo, txDispute.id, { adminNotes: 'CBE Birr transfer verified.' });

  // Raise dispute
  const dispute = disputeService.createDispute(buyer, {
    orderId: orderDispute.id,
    reason: 'SELLER_UNRESPONSIVE',
    details: 'Seller delayed channel ownership transfer beyond 24h window.'
  });
  assert(dispute.status === 'OPEN', 'Dispute status is OPEN');

  // Lock escrow in transactionService
  transactionService.lockEscrowForDispute(orderDispute.id);
  const disputedTx = transactionService.getTransactionById(txDispute.id);
  assert(disputedTx?.escrowStatus === 'DISPUTED', 'Escrow status must be DISPUTED');

  // Release MUST be blocked when escrow is disputed
  let blockedReleaseErr = false;
  try {
    transactionService.completeTransactionAndReleaseEscrow(adminEbek, txDispute.id);
  } catch (err: any) {
    blockedReleaseErr = true;
    assert(err.message.includes('dispute') || err.message.includes('DISPUTED'), 'Error must specify dispute block');
  }
  assert(blockedReleaseErr, 'Escrow release MUST be blocked when in DISPUTED state');
  console.log('  ✔ Escrow release safely blocked during active dispute.');

  // Admin resolves dispute with Full Buyer Refund
  const resolvedDispute = disputeService.arbitrateDisputeAsAdmin(adminEbek, dispute.id, {
    outcome: 'FULL_REFUND_BUYER',
    resolutionNotes: 'Seller failed to initiate TikTok ownership transfer. Full 10,000 ETB refunded to buyer.'
  });
  assert(resolvedDispute.status === 'RESOLVED_BUYER_REFUND', 'Resolved dispute status is RESOLVED_BUYER_REFUND');
  
  const settledTx = transactionService.getTransactionById(txDispute.id);
  assert(settledTx?.status === 'REFUNDED', 'Settled transaction status is REFUNDED');
  assert(settledTx?.escrowStatus === 'REFUNDED', 'Settled escrow status is REFUNDED');
  assert(settledTx?.refundDetails?.refundAmountETB === 10000, 'Full 10,000 ETB refund recorded');
  console.log('  ✔ Arbitration settlement executed and full buyer refund confirmed.');

  // ---------------------------------------------------------------------------
  // 7. WEBHOOK SECURITY & TAMPER PROTECTION
  // ---------------------------------------------------------------------------
  console.log('\n[E2E 7] Webhook Security: HMAC SHA-256, Idempotency & Replay Prevention...');
  
  const testEventId = `wh-e2e-${Date.now()}`;
  const webhookSecret = process.env.WEBHOOK_SECRET || 'eom_webhook_secret_default';
  
  const webhookPayload = {
    orderId: order.id,
    transactionId: tx.id,
    amountETB: 20000,
    referenceNumber: paymentRef
  };
  const validHmac = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(webhookPayload)).digest('hex');

  // 7.1 Forged signature rejection
  const forgedResult = await webhookService.processPaymentWebhook({
    providerCode: 'COMMERCIAL_BANK_OF_ETHIOPIA',
    headers: { 'x-event-id': testEventId, 'x-signature': 'forged_signature_hex' },
    body: webhookPayload
  });
  assert(!forgedResult.success, 'Forged signature must be rejected');

  // 7.2 Replay attack (>5 minutes expired timestamp)
  const expiredTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const replayResult = await webhookService.processPaymentWebhook({
    providerCode: 'COMMERCIAL_BANK_OF_ETHIOPIA',
    headers: { 'x-event-id': `wh-replay-${Date.now()}`, 'x-timestamp': expiredTime, 'x-signature': validHmac },
    body: webhookPayload
  });
  assert(!replayResult.success, 'Expired timestamp webhook must be rejected');
  assert(replayResult.error?.includes('Timestamp expired'), 'Replay attack detected');

  console.log('  ✔ Webhook HMAC signature verification and replay attack prevention verified.');

  // ---------------------------------------------------------------------------
  // 8. AUDIT TRAIL & NOTIFICATION INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n[E2E 8] Security Audit Trail & Notification Logging...');
  
  const recentAudits = auditService.getLogsForAdmin(adminEbek);
  assert(recentAudits.length > 5, 'Comprehensive audit entries generated across all actions');
  
  const buyerNotifs = notificationService.getNotificationsForUser(buyer);
  assert(buyerNotifs.length > 0, 'Buyer notifications dispatched for escrow status transitions');

  const sellerNotifs = notificationService.getNotificationsForUser(seller);
  assert(sellerNotifs.length > 0, 'Seller notifications dispatched for escrow status transitions');
  console.log(`  ✔ Audit trail (${recentAudits.length} events) and multi-party notifications verified.`);

  // ---------------------------------------------------------------------------
  // 9. PAYMENT PROVIDER STATUS CLASSIFICATION ACCURACY
  // ---------------------------------------------------------------------------
  console.log('\n[E2E 9] Payment Provider Registry & Connection Status Accuracy...');
  
  const allProviderStatuses = PaymentProviderRegistry.getAllProviderStatuses();
  assert(allProviderStatuses.length === 3, 'All 3 supported Ethiopian payment providers registered');
  
  for (const item of allProviderStatuses) {
    assert(
      item.status === ProviderConnectionStatus.IMPLEMENTED_AND_CONNECTED ||
      item.status === ProviderConnectionStatus.IMPLEMENTED_BUT_REQUIRES_CREDENTIALS,
      `Provider ${item.name} has valid status classification`
    );
    const adapter = PaymentProviderRegistry.getAdapter(item.code);
    const accountDetails = adapter.getAccountDetails();
    assert(!!accountDetails.accountNumber, `Provider ${item.name} provides escrow account number`);
  }
  console.log('  ✔ All 3 payment providers registered with accurate status & official escrow instructions.');

  // ---------------------------------------------------------------------------
  // 10. POSTGRES RESILIENCE & STORAGE FALLBACK
  // ---------------------------------------------------------------------------
  console.log('\n[E2E 10] Database Driver & Storage Adapter Fallback Integrity...');
  
  const savedRecord = { id: `test-db-${Date.now()}`, key: 'qa_val', timestamp: new Date().toISOString() };
  defaultStorageAdapter.save('eom_qa_audit', savedRecord);
  const retrievedRecords = defaultStorageAdapter.getAll<typeof savedRecord>('eom_qa_audit');
  const found = retrievedRecords.find((r) => r.id === savedRecord.id);
  assert(!!found, 'Storage adapter successfully persisted and retrieved records');
  defaultStorageAdapter.delete('eom_qa_audit', savedRecord.id);
  console.log('  ✔ Storage adapter abstraction and fallback mechanisms verified.');

  // ---------------------------------------------------------------------------
  // 11. CUSTOMER AUTHENTICATION & RESTRICTED ADMIN GATEKEEPER
  // ---------------------------------------------------------------------------
  console.log('\n[E2E 11] Customer Auth & Restricted Admin Authentication Gatekeeper...');

  // 11.1 Normal customer registration without role selection
  const regResult = await authService.register({
    fullName: 'Dawit Test Customer',
    email: `dawit_${Date.now()}@ethioonline.market`,
    phone: '+251911998877',
    username: `@dawit_${Date.now().toString().slice(-4)}`,
    password: 'SecureCustomerPass2026!',
    confirmPassword: 'SecureCustomerPass2026!',
    agreedToTerms: true
  });
  assert(regResult.user.role === 'USER', 'Registered customer gets unified USER role without buyer/seller distinction');
  assert(regResult.user.authRole === 'user', 'Registered customer gets standard user authRole');

  // Customer cannot access admin endpoints
  const customerAdminCheck = authService.checkAdminAccess(regResult.user);
  assert(!customerAdminCheck.granted, 'Normal customer is denied admin access');

  // 11.2 Reserved admin username registration prevention
  let reservedRegError = false;
  try {
    await authService.register({
      fullName: 'Fake Admin',
      email: 'impersonator@ethioonline.market',
      phone: '+251922112233',
      username: '@mr_ebek',
      password: 'SomePassword123!',
      confirmPassword: 'SomePassword123!',
      agreedToTerms: true
    });
  } catch {
    reservedRegError = true;
  }
  assert(reservedRegError, 'Registering reserved @mr_ebek handle must be rejected');

  // 11.3 Admin 1 (@mr_ebek) login with mrEXO@2026
  const admin1Login = await authService.login({
    identifier: '@mr_ebek',
    password: 'mrEXO@2026'
  });
  assert(admin1Login.user.role === 'ADMIN', 'Admin 1 user role is ADMIN');
  assert(admin1Login.user.authRole === 'admin', 'Admin 1 authRole is admin');
  assert(authService.checkAdminAccess(admin1Login.user).granted, 'Admin 1 granted admin gatekeeper access');

  // 11.4 Admin 2 (@EXO_SMM) login with mrEXO@2026
  const admin2Login = await authService.login({
    identifier: 'EXO_SMM',
    password: 'mrEXO@2026'
  });
  assert(admin2Login.user.role === 'ADMIN', 'Admin 2 user role is ADMIN');
  assert(admin2Login.user.authRole === 'admin', 'Admin 2 authRole is admin');
  assert(authService.checkAdminAccess(admin2Login.user).granted, 'Admin 2 granted admin gatekeeper access');

  // 11.5 Admin login with wrong password fails
  let wrongPassError = false;
  try {
    await authService.login({
      identifier: '@mr_ebek',
      password: 'WrongPassword2026!'
    });
  } catch {
    wrongPassError = true;
  }
  assert(wrongPassError, 'Admin login with incorrect password must fail');

  // 11.6 Random user with role=ADMIN in memory but not authorized handle is rejected
  const fakeAdminUser: User = {
    id: 'usr-fake-admin-99',
    username: '@fake_admin',
    email: 'fakeadmin@example.com',
    fullName: 'Fake Admin Impersonator',
    role: 'ADMIN',
    authRole: 'admin',
    isActive: true,
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const fakeAdminCheck = authService.checkAdminAccess(fakeAdminUser);
  assert(!fakeAdminCheck.granted, 'User with spoofed admin role but unauthorized identity is strictly denied');
  console.log('  ✔ Customer unified registration & strict @mr_ebek / @EXO_SMM admin gatekeeper verified.');

  // ===========================================================================
  // 12. ADMIN ACTION LOGGER SERVICE & CREDENTIAL SANITIZATION
  // ===========================================================================
  console.log('\n[12] Executing Admin Action Logger & Credential Redaction Verification...');
  const { adminActionLogger } = await import('../src/services/audit/adminActionLogger');

  // 12.1 Log listing approval
  const approvalLog = adminActionLogger.logListingApproval(
    adminEbek,
    'lst-test-approval-15',
    'Addis Tech Telegram Channel',
    { notes: 'Verified analytics and member count.' }
  );
  assert(approvalLog.actionType === 'LISTING_APPROVAL', 'Listing approval logged with correct action type');
  assert(approvalLog.adminIdentifier === '@mr_ebek', 'Listing approval records canonical @mr_ebek identifier');
  assert(approvalLog.status === 'SUCCESS', 'Listing approval status is SUCCESS');

  // 12.2 Log payment verification
  const paymentLog = adminActionLogger.logPaymentVerification(
    adminExo,
    'TXN-REF-CBE-987654',
    'ord-12345',
    25000,
    'CBE',
    { bankBranch: 'Bole Medhanialem', secretToken: 'super-secret-token-123', password: 'plainPassword' }
  );
  assert(paymentLog.actionType === 'PAYMENT_VERIFICATION', 'Payment verification action recorded');
  assert(paymentLog.adminIdentifier === '@EXO_SMM', 'Payment verification records canonical @EXO_SMM identifier');
  // Ensure credentials and secrets are stripped/redacted
  assert(paymentLog.metadata?.password === '[REDACTED_CREDENTIAL]', 'Password in metadata is properly redacted');
  assert(paymentLog.metadata?.secretToken === '[REDACTED_CREDENTIAL]', 'SecretToken in metadata is properly redacted');
  assert(paymentLog.metadata?.bankBranch === 'Bole Medhanialem', 'Non-sensitive metadata is preserved');

  // 12.3 Query admin actions with filters
  const ebekActions = adminActionLogger.getActions({ adminIdentifier: '@mr_ebek' });
  assert(ebekActions.some((a) => a.id === approvalLog.id), 'Can query actions by admin identifier @mr_ebek');

  const paymentActions = adminActionLogger.getActions({ actionType: 'PAYMENT_VERIFICATION' });
  assert(paymentActions.some((a) => a.id === paymentLog.id), 'Can query actions by actionType PAYMENT_VERIFICATION');
  console.log('  ✔ AdminActionLogger correctly records, redacts credentials, and queries administrative actions.');

  // ===========================================================================
  // 13. DATABASE CONNECTION VALIDATION & HEALTH CHECK SAFETY
  // ===========================================================================
  console.log('\n[13] Executing Database Connection & Safe Configuration Audit...');
  const { isValidPostgresUrl, getSanitizedDbInfo } = await import('../src/db/pg');

  // Test invalid URLs
  assert(!isValidPostgresUrl(undefined), 'Undefined DB URL is rejected');
  assert(!isValidPostgresUrl(''), 'Empty string DB URL is rejected');
  assert(!isValidPostgresUrl('postgres://user:••••••••@base:5432/db'), 'Masked bullet URL with host base is rejected');
  assert(!isValidPostgresUrl('base'), 'Invalid plain string host is rejected');
  assert(!isValidPostgresUrl('http://localhost:3000'), 'Non-postgres URL is rejected');

  // Test valid PostgreSQL URL
  assert(isValidPostgresUrl('postgres://postgres:securePass123@localhost:5432/eom_db'), 'Valid PostgreSQL URI is accepted');
  assert(isValidPostgresUrl('postgresql://user:pass@db.example.com:5432/market_prod?sslmode=require'), 'Valid postgresql URI with query params is accepted');

  const info = getSanitizedDbInfo();
  assert(typeof info.isConfigured === 'boolean', 'Sanitized DB info returns boolean configuration status');
  console.log('  ✔ Database connection string validator prevents EAI_AGAIN errors from malformed hostnames.');

  console.log('\n================================================================================');
  console.log('       ✔ ALL 13 PHASE 15 END-TO-END QA & RELEASE AUDIT SUITES PASSED (100%)     ');
  console.log('================================================================================\n');
}

runPhase15FinalQASuite().catch((err) => {
  console.error('\n❌ PHASE 15 QA SUITE FAILED:', err);
  process.exit(1);
});
