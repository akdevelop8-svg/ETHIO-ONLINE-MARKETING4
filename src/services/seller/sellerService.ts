/**
 * EOM Seller Service
 * Phase 5: Seller Onboarding, Profile, Verification & Payout Management
 */

import { User, SellerProfile, VerificationBadgeType, PayoutStatus } from '../../types/index.js';
import { auditService } from '../audit/auditService.js';
import { notificationService } from '../notifications/notificationService.js';
import { defaultStorageAdapter } from '../persistence/index.js';

const STORAGE_SELLER_PROFILES_KEY = 'eom_seller_profiles_v1';

export interface SellerOnboardingData {
  businessName?: string;
  telegramHandle: string;
  phone: string;
  payoutBank: string;
  payoutAccountNumber: string;
  payoutAccountHolder: string;
  agreedToEscrowTerms: boolean;
}

export interface PayoutRequest {
  id: string;
  sellerId: string;
  orderId?: string;
  amountETB: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: PayoutStatus;
  requestedAt: string;
  processedAt?: string;
  adminNotes?: string;
}

class SellerService {
  private profiles: Record<string, SellerProfile> = {};
  private isInitialized = false;
  private payoutRequests: PayoutRequest[] = [];

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    try {
      const storedProfiles = defaultStorageAdapter.getAll<any>(STORAGE_SELLER_PROFILES_KEY);
      this.profiles = {};
      storedProfiles.forEach((record) => {
        if (record?.id && record?.profile) this.profiles[record.id] = record.profile;
        else if (record?.userId) this.profiles[record.userId] = record;
      });
      this.payoutRequests = defaultStorageAdapter.getAll<PayoutRequest>('eom_seller_payout_requests_v1');
    } catch {
      this.profiles = {};
      this.payoutRequests = [];
    }
    this.isInitialized = true;
  }

  private persist() {
    try {
      const profileRecords = Object.entries(this.profiles).map(([id, profile]) => ({ id, profile }));
      defaultStorageAdapter.batchSave(STORAGE_SELLER_PROFILES_KEY, profileRecords);
      defaultStorageAdapter.batchSave('eom_seller_payout_requests_v1', this.payoutRequests);
    } catch {
      // Storage failure safety
    }
  }

  /**
   * Get seller profile by user ID
   */
  public getSellerProfile(userId: string): SellerProfile | null {
    this.init();
    return this.profiles[userId] || null;
  }

  /**
   * Get seller analytics and wallet balances
   */
  public getSellerAnalytics(user: User): {
    availableBalanceETB: number;
    lockedBalanceETB: number;
    totalSalesETB: number;
    completedOrdersCount: number;
    activeListingsCount: number;
  } {
    this.init();
    const profile = this.getSellerProfile(user.id);
    return {
      availableBalanceETB: user.walletBalanceETB || 0,
      lockedBalanceETB: user.lockedBalanceETB || 0,
      totalSalesETB: profile?.totalSales || (user.walletBalanceETB || 0),
      completedOrdersCount: profile?.totalReviews || 0,
      activeListingsCount: 0
    };
  }

  /**
   * Onboard or update seller profile
   */
  public onboardSeller(user: User, data: SellerOnboardingData): SellerProfile {
    if (!user || !user.id) {
      throw new Error('Authentication required for seller onboarding.');
    }
    if (!data.agreedToEscrowTerms) {
      throw new Error('You must agree to the EOM Escrow and Channel Ownership Terms.');
    }
    if (!data.telegramHandle || !data.phone) {
      throw new Error('Telegram handle and valid phone number are required.');
    }

    this.init();
    const existing = this.profiles[user.id];
    const cleanTelegram = data.telegramHandle.startsWith('@')
      ? data.telegramHandle
      : `@${data.telegramHandle}`;

    const profile: SellerProfile = {
      userId: user.id,
      businessName: data.businessName?.trim() || user.fullName || cleanTelegram,
      verificationBadge: existing?.verificationBadge || 'VERIFIED_ACCOUNT',
      totalSales: existing?.totalSales || 0,
      rating: existing?.rating || 5.0,
      totalReviews: existing?.totalReviews || 0,
      payoutAccount: {
        bankName: data.payoutBank || 'Telebirr',
        accountNumber: data.payoutAccountNumber || data.phone,
        accountHolder: data.payoutAccountHolder || user.fullName || 'Seller'
      }
    };

    this.profiles[user.id] = profile;
    this.persist();

    auditService.log({
      actorId: user.id,
      actorName: user.fullName || user.email,
      actorRole: 'SELLER',
      action: existing ? 'SELLER_PROFILE_UPDATED' : 'SELLER_ONBOARDED',
      entityType: 'USER',
      entityId: user.id,
      details: `Seller ${profile.businessName} (${cleanTelegram}) registered payout details.`
    });

    notificationService.dispatch({
      targetUserId: user.id,
      type: 'USER_REGISTERED',
      title: 'Seller Account Active',
      message: `Welcome to EOM Seller Hub, ${profile.businessName}! You can now list and manage channels.`,
      referenceId: user.id,
      referenceType: 'user'
    });

    return profile;
  }

  /**
   * Update payout account details securely
   */
  public updatePayoutAccount(
    user: User,
    payout: { bankName: string; accountNumber: string; accountHolder: string }
  ): SellerProfile {
    if (!user || !user.id) {
      throw new Error('Unauthorized');
    }
    this.init();
    const profile = this.profiles[user.id] || {
      userId: user.id,
      businessName: user.fullName || 'Seller',
      verificationBadge: 'VERIFIED_ACCOUNT',
      totalSales: 0,
      rating: 5.0,
      totalReviews: 0
    };

    profile.payoutAccount = {
      bankName: payout.bankName.trim(),
      accountNumber: payout.accountNumber.trim(),
      accountHolder: payout.accountHolder.trim()
    };

    this.profiles[user.id] = profile;
    this.persist();

    auditService.log({
      actorId: user.id,
      actorName: user.fullName || user.email,
      actorRole: 'SELLER',
      action: 'PAYOUT_ACCOUNT_UPDATED',
      entityType: 'WALLET',
      entityId: user.id,
      details: `Updated payout destination to ${payout.bankName} (${payout.accountNumber.slice(-4)}).`
    });

    return profile;
  }

  /**
   * Request Payout from available balance
   */
  public requestPayout(
    user: User,
    amountETB: number,
    payout: { bankName: string; accountNumber: string; accountHolderName: string }
  ): PayoutRequest {
    if (!user || !user.id) {
      throw new Error('Authentication required.');
    }
    if (amountETB <= 0) {
      throw new Error('Payout amount must be greater than zero.');
    }

    const currentBalance = user.walletBalanceETB || 0;
    if (amountETB > currentBalance) {
      throw new Error(`Requested amount exceeds available balance (${currentBalance} ETB).`);
    }

    this.updatePayoutAccount(user, {
      bankName: payout.bankName,
      accountNumber: payout.accountNumber,
      accountHolder: payout.accountHolderName
    });

    const pendingTotal = this.payoutRequests
      .filter((p) => p.sellerId === user.id && (p.status === 'PENDING' || p.status === 'PROCESSING'))
      .reduce((sum, p) => sum + p.amountETB, 0);
    if (amountETB + pendingTotal > currentBalance) {
      throw new Error(`Requested amount plus existing pending payouts exceeds available balance (${currentBalance} ETB).`);
    }

    const timestamp = new Date().toISOString();
    const req: PayoutRequest = {
      id: `payout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sellerId: user.id,
      amountETB,
      bankName: payout.bankName,
      accountNumber: payout.accountNumber,
      accountHolder: payout.accountHolderName,
      status: 'PROCESSING',
      requestedAt: timestamp
    };

    // Persist the payout request in the correct flow so Admin → Payments
    // can review it after refreshes and backend restarts.
    this.payoutRequests.unshift(req);
    this.persist();

    auditService.log({
      actorId: user.id,
      actorName: user.fullName || user.email,
      actorRole: 'SELLER',
      action: 'PAYOUT_REQUESTED',
      entityType: 'WALLET',
      entityId: req.id,
      details: `Requested withdrawal of ${amountETB} ETB to ${payout.bankName} (${payout.accountNumber}).`,
      metadata: {
        amountETB,
        bankName: payout.bankName
      }
    });

    notificationService.dispatch({
      targetUserId: 'ADMIN',
      type: 'PAYMENT_PENDING',
      title: 'Seller Payout Requested',
      message: `${user.fullName || user.email} requested withdrawal of ${amountETB} ETB.`,
      referenceId: req.id,
      referenceType: 'transaction'
    });

    return req;
  }

  /**
   * ADMIN ONLY: Update seller verification tier
   */
  public setSellerVerificationTier(
    adminUser: User,
    sellerId: string,
    tier: VerificationBadgeType
  ): SellerProfile {
    if (adminUser.authRole !== 'admin' && adminUser.role !== 'ADMIN') {
      throw new Error('Unauthorized: Admin access required.');
    }
    this.init();
    const profile = this.profiles[sellerId] || {
      userId: sellerId,
      totalSales: 0,
      rating: 5.0,
      totalReviews: 0
    };

    profile.verificationBadge = tier;
    this.profiles[sellerId] = profile;
    this.persist();

    auditService.log({
      actorId: adminUser.id,
      actorName: adminUser.fullName || 'Admin',
      actorRole: 'ADMIN',
      action: 'SELLER_VERIFIED',
      entityType: 'USER',
      entityId: sellerId,
      details: `Assigned verification tier "${tier}" to seller ${sellerId}.`
    });

    return profile;
  }
}

export const sellerService = new SellerService();
