/**
 * EOM Secure Webhook Receiver & Verification Service
 * Phase 13: Real Payment Provider Integration & Secure Payment Verification
 */

import crypto from 'crypto';
import { transactionService } from '../transactions/transactionService.js';
import { auditService } from '../audit/auditService.js';
import { notificationService } from '../notifications/notificationService.js';
import { PaymentProviderRegistry, ProviderConnectionStatus } from './paymentProvider.js';
import { BaseRepository, Identifiable } from '../persistence/repository.js';
import { defaultStorageAdapter } from '../persistence/index.js';
import { User } from '../../types/index.js';

export interface WebhookEventRecord extends Identifiable {
  id: string;
  providerCode: string;
  providerEventId: string;
  transactionId?: string;
  orderId?: string;
  amountETB?: number;
  expectedAmountETB?: number;
  signature: string;
  status: 'PROCESSED' | 'FLAGGED_MISMATCH' | 'REJECTED' | 'DUPLICATE';
  receivedAt: string;
  processedAt: string;
}

export class WebhookEventRepository extends BaseRepository<WebhookEventRecord> {
  constructor() {
    super(defaultStorageAdapter, 'eom_webhook_events_v1');
  }

  public override findAll(): WebhookEventRecord[] {
    return defaultStorageAdapter.getAll<WebhookEventRecord>(this.collectionName);
  }

  public override save(item: WebhookEventRecord): void {
    defaultStorageAdapter.save<WebhookEventRecord>(this.collectionName, item);
  }

  public findByEventId(eventId: string): WebhookEventRecord | null {
    const all = this.findAll();
    return all.find((e) => e.providerEventId === eventId) || null;
  }
}

export const webhookEventRepository = new WebhookEventRepository();

export class WebhookService {
  private webhookRepo: WebhookEventRepository;

  constructor(repo: WebhookEventRepository = webhookEventRepository) {
    this.webhookRepo = repo;
  }

  /**
   * Verify HMAC signature for incoming webhook
   */
  public verifySignature(
    payload: string | object,
    signature: string,
    secret: string = process.env.WEBHOOK_SECRET || 'eom_webhook_secret_default'
  ): boolean {
    if (!signature) return false;
    try {
      const stringPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(stringPayload)
        .digest('hex');
      
      const sigBuffer = Buffer.from(signature.toLowerCase(), 'utf8');
      const expBuffer = Buffer.from(expectedSignature.toLowerCase(), 'utf8');
      
      if (sigBuffer.length !== expBuffer.length) return false;
      return crypto.timingSafeEqual(sigBuffer, expBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Process incoming payment provider webhook payload securely
   */
  public async processPaymentWebhook(params: {
    providerCode: string;
    headers: Record<string, string>;
    body: any;
    rawBody?: string;
  }): Promise<{
    success: boolean;
    processed: boolean;
    actionTaken?: 'VERIFIED' | 'REJECTED' | 'FLAGGED_MISMATCH' | 'IGNORED_DUPLICATE';
    transactionId?: string;
    orderId?: string;
    providerEventId?: string;
    connectionStatus: ProviderConnectionStatus;
    error?: string;
  }> {
    const { providerCode, headers, body, rawBody } = params;
    const adapter = PaymentProviderRegistry.getAdapter(providerCode);
    const connectionStatus = adapter.getConnectionStatus();

    const providerEventId =
      headers['x-event-id'] ||
      headers['x-telebirr-event-id'] ||
      body?.eventId ||
      body?.event_id ||
      body?.transactionId ||
      body?.referenceNumber;

    const signature =
      headers['x-signature'] ||
      headers['x-telebirr-signature'] ||
      body?.signature;

    const timestampStr =
      headers['x-timestamp'] ||
      body?.timestamp ||
      headers['x-telebirr-timestamp'];

    if (!providerEventId) {
      return {
        success: false,
        processed: false,
        connectionStatus,
        error: 'Missing provider event ID'
      };
    }

    // 1. Replay / Duplicate Webhook Check
    const existing = this.webhookRepo.findByEventId(providerEventId);
    if (existing) {
      return {
        success: true,
        processed: false,
        actionTaken: 'IGNORED_DUPLICATE',
        providerEventId,
        connectionStatus,
        error: 'Duplicate webhook event ignored (idempotent)'
      };
    }

    // 2. Timestamp Replay Attack Prevention (5 minute tolerance window)
    if (timestampStr) {
      const reqTime = new Date(timestampStr).getTime() || Number(timestampStr);
      if (!isNaN(reqTime)) {
        const timeDiffMs = Math.abs(Date.now() - reqTime);
        if (timeDiffMs > 5 * 60 * 1000) {
          return {
            success: false,
            processed: false,
            connectionStatus,
            error: 'Webhook rejected: Timestamp expired (potential replay attack)'
          };
        }
      }
    }

    // 3. Signature Verification
    const webhookSecret = process.env.WEBHOOK_SECRET || 'eom_webhook_secret_default';
    const payloadToSign = rawBody || body;
    const isValidSignature = this.verifySignature(payloadToSign, signature, webhookSecret);

    if (!isValidSignature && connectionStatus === ProviderConnectionStatus.IMPLEMENTED_AND_CONNECTED) {
      auditService.log({
        actorId: 'SYSTEM_WEBHOOK',
        actorName: 'Webhook Security Guard',
        actorRole: 'ADMIN',
        action: 'SECURITY_VIOLATION',
        entityType: 'PAYMENT',
        details: `Forged or corrupted webhook signature rejected for provider ${providerCode}. Event ID: ${providerEventId}`,
        metadata: { providerCode, providerEventId, signature }
      });

      return {
        success: false,
        processed: false,
        connectionStatus,
        error: 'Invalid webhook signature'
      };
    }

    // Extract Order & Transaction information from body
    const orderId = body?.orderId || body?.outTradeNo || body?.order_id;
    const transactionId = body?.transactionId || body?.txId || body?.tradeNo;
    const reportedAmountETB = Number(body?.amountETB || body?.totalAmount || body?.amount || 0);

    const tx = transactionService.getTransactionById(transactionId || orderId || '');
    if (!tx) {
      return {
        success: false,
        processed: false,
        connectionStatus,
        error: `Associated transaction or order not found for ${transactionId || orderId}`
      };
    }

    // 4. Payment Amount Security Verification
    const expectedAmountETB = tx.amountETB;
    if (reportedAmountETB && Math.abs(reportedAmountETB - expectedAmountETB) > 0.01) {
      // Flag Mismatch
      const record: WebhookEventRecord = {
        id: `wh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        providerCode,
        providerEventId,
        transactionId: tx.id,
        orderId: tx.orderId,
        amountETB: reportedAmountETB,
        expectedAmountETB,
        signature: signature || 'UNSIGNED',
        status: 'FLAGGED_MISMATCH',
        receivedAt: new Date().toISOString(),
        processedAt: new Date().toISOString()
      };
      this.webhookRepo.save(record);

      auditService.log({
        actorId: 'SYSTEM_WEBHOOK',
        actorName: `${providerCode} Webhook Receiver`,
        actorRole: 'ADMIN',
        action: 'PAYMENT_AMOUNT_MISMATCH',
        entityType: 'PAYMENT',
        entityId: tx.id,
        details: `CRITICAL PAYMENT MISMATCH DETECTED: Expected ${expectedAmountETB} ETB, but webhook reported ${reportedAmountETB} ETB for transaction #${tx.transactionNumber}. Auto-verification halted.`,
        metadata: { expectedAmountETB, reportedAmountETB, providerEventId }
      });

      notificationService.dispatch({
        targetUserId: 'ADMIN',
        type: 'PAYMENT_MISMATCH',
        title: 'Security Alert: Payment Amount Mismatch',
        message: `Order #${tx.orderNumber} received payment of ${reportedAmountETB} ETB (Expected ${expectedAmountETB} ETB). Requires immediate manual investigation.`,
        referenceId: tx.id,
        referenceType: 'transaction'
      });

      return {
        success: false,
        processed: true,
        actionTaken: 'FLAGGED_MISMATCH',
        transactionId: tx.id,
        orderId: tx.orderId,
        providerEventId,
        connectionStatus,
        error: `Payment amount mismatch: Expected ${expectedAmountETB} ETB, received ${reportedAmountETB} ETB.`
      };
    }

    // 5. Valid Automated Verification
    const systemAdmin: User = {
      id: 'admin-system-bot',
      username: 'EOM_AUTOMATED_ESCROW_BOT',
      email: 'bot@ethioonline.market',
      fullName: 'EOM Automated Verification Bot',
      role: 'ADMIN',
      authRole: 'admin',
      isActive: true,
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      transactionService.verifyPaymentAsAdmin(systemAdmin, tx.id, {
        adminNotes: `Verified automatically via secure ${providerCode} webhook. Provider Reference: ${providerEventId}`
      });

      const record: WebhookEventRecord = {
        id: `wh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        providerCode,
        providerEventId,
        transactionId: tx.id,
        orderId: tx.orderId,
        amountETB: expectedAmountETB,
        expectedAmountETB,
        signature: signature || 'VERIFIED_API',
        status: 'PROCESSED',
        receivedAt: new Date().toISOString(),
        processedAt: new Date().toISOString()
      };
      this.webhookRepo.save(record);

      return {
        success: true,
        processed: true,
        actionTaken: 'VERIFIED',
        transactionId: tx.id,
        orderId: tx.orderId,
        providerEventId,
        connectionStatus
      };
    } catch (err: any) {
      return {
        success: false,
        processed: false,
        connectionStatus,
        error: err.message || 'Failed to transition payment status'
      };
    }
  }
}

export const webhookService = new WebhookService();
