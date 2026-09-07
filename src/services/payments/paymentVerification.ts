/**
 * EOM Payment Verification State Machine
 * Phase 10: Production Backend & Persistent Data Foundation
 */

import { PaymentVerificationRecord } from '../persistence/repository';

export type VerificationState = 'PENDING' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export class PaymentVerificationEngine {
  private static VALID_TRANSITIONS: Record<VerificationState, VerificationState[]> = {
    PENDING: ['SUBMITTED', 'VERIFIED', 'UNDER_REVIEW', 'REJECTED', 'EXPIRED'],
    SUBMITTED: ['UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED'],
    UNDER_REVIEW: ['VERIFIED', 'REJECTED', 'EXPIRED'],
    VERIFIED: [], // Terminal successful state
    REJECTED: ['SUBMITTED'], // Allow resubmission after rejection
    EXPIRED: ['SUBMITTED'] // Allow new payment submission after expiration
  };

  /**
   * Factory method to construct an initial pending verification record
   */
  public static createPendingRecord(params: {
    transactionId: string;
    orderId: string;
    orderNumber: string;
    paymentMethod: string;
    claimedAmountETB: number;
  }): PaymentVerificationRecord {
    const now = new Date().toISOString();
    return {
      id: `pv-${params.transactionId}`,
      transactionId: params.transactionId,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      paymentMethod: params.paymentMethod,
      claimedAmountETB: params.claimedAmountETB,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Inspect if a transition is allowed under state machine rules
   */
  public static canTransition(from: VerificationState, to: VerificationState): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Asserts a transition is valid or throws an error
   */
  public static assertValidTransition(from: VerificationState, to: VerificationState): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`[PaymentVerificationEngine] Illegal state transition from '${from}' to '${to}'`);
    }
  }
}
