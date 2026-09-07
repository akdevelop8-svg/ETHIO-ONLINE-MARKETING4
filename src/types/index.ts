/**
 * EOM (Ethio Online Market) Domain Types & Architecture Definitions
 * Phase 0 - Phase 8 Domain Types
 */

export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN' | 'MODERATOR' | 'USER';
export type AuthRole = 'guest' | 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  phone?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  role: UserRole;
  authRole: AuthRole;
  isVerified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  isActive: boolean;
  avatarUrl?: string;
  walletBalanceETB?: number;
  lockedBalanceETB?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SignUpData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
  username?: string;
  role?: string;
}

export interface SignInData {
  identifier: string; // Email or Phone or Username
  password: string;
  rememberMe?: boolean;
}

export interface AuthSession {
  token: string;
  userId: string;
  role: AuthRole;
  expiresAt: string;
  createdAt: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmation {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export type AuthModalView = 'signin' | 'signup' | 'forgot-password' | 'verify-email' | 'reset-password';

export type PlatformType = 
  | 'youtube' 
  | 'instagram' 
  | 'tiktok' 
  | 'telegram' 
  | 'facebook' 
  | 'x';

export type ListingStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'PENDING_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'CHANGES_REQUESTED' 
  | 'ACTIVE'
  | 'ON_PROGRESS'
  | 'SOLD' 
  | 'SUSPENDED';

export type ListingModerationStatus = 
  | 'PENDING_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'CHANGES_REQUESTED';

export type ModerationAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

export interface ModerationHistoryEntry {
  id: string;
  adminId: string;
  adminUsername: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'RESUBMITTED';
  reason?: string;
  timestamp: string;
}

export type VerificationBadgeType = 
  | 'VERIFIED_ACCOUNT' 
  | 'TRUSTED_SELLER' 
  | 'PREMIUM_SELLER';

export type PriceRatingType = 
  | 'VERY_GOOD_PRICE' 
  | 'GOOD_PRICE' 
  | 'MEDIUM_PRICE' 
  | 'HIGH_PRICE' 
  | 'VERY_HIGH_PRICE';

export type MonetizationStatus = 'MONETIZED' | 'NOT_MONETIZED';

export type ListingCategory = 
  | 'All'
  | 'Art & Design'
  | 'Automotive'
  | 'Application'
  | 'Business'
  | 'Comedy'
  | 'Crypto & NFT'
  | 'Clip'
  | 'Education'
  | 'Entertainment'
  | 'Fashion & Beauty'
  | 'Finance'
  | 'Food & Cooking'
  | 'Gaming'
  | 'Health & Fitness'
  | 'Lifestyle'
  | 'Memes'
  | 'Music'
  | 'News & Politics'
  | 'Pets & Animals'
  | 'Real Estate'
  | 'Science'
  | 'Sports'
  | 'Technology'
  | 'Travel'
  | 'Vlog'
  | 'Other';

export type EscrowStatus = 
  | 'PENDING' 
  | 'PAID' 
  | 'HELD' 
  | 'RELEASED' 
  | 'REFUNDED' 
  | 'DISPUTED';

export type OrderStatus = 
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_VERIFIED'
  | 'PROCESSING' 
  | 'SUCCESS' 
  | 'CANCELLED' 
  | 'DISPUTED';

export type PaymentMethodType = 
  | 'TELEBIRR' 
  | 'COMMERCIAL_BANK_OF_ETHIOPIA' 
  | 'BANK_OF_ABYSSINIA';

export type PayoutStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'PAID' 
  | 'FAILED';

export type DisputeReason = 
  | 'CREDENTIAL_MISMATCH' 
  | 'SELLER_UNRESPONSIVE' 
  | 'BUYER_UNRESPONSIVE' 
  | '2FA_RECOVERY_ISSUE' 
  | 'STRIKE_OR_BAN_ON_CHANNEL' 
  | 'PAYMENT_DISPUTE'
  | 'OTHER';

export type DisputeStatus = 
  | 'OPEN' 
  | 'UNDER_MEDIATION' 
  | 'EVIDENCE_REQUESTED' 
  | 'RESOLVED_BUYER_REFUND' 
  | 'RESOLVED_SELLER_RELEASE' 
  | 'RESOLVED_SPLIT_SETTLEMENT'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'REJECTED';

export type DisputeParticipantRole = 'BUYER' | 'SELLER' | 'ADMIN' | 'SYSTEM';

export interface DisputeEvidence {
  id: string;
  uploadedBy: string;
  uploaderName: string;
  uploaderRole: 'BUYER' | 'SELLER' | 'ADMIN';
  title: string;
  fileUrl?: string;
  description: string;
  createdAt: string;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderName: string;
  senderRole: DisputeParticipantRole;
  message: string;
  isIntervention?: boolean;
  attachments?: DisputeEvidence[];
  isSystemEvent?: boolean;
  createdAt: string;
}

export interface ArbitrationDecision {
  outcome: 'FULL_REFUND_BUYER' | 'RELEASE_ESCROW_SELLER' | 'SPLIT_SETTLEMENT';
  resolvedByAdminId: string;
  resolvedByAdminName: string;
  buyerRefundAmountETB: number;
  sellerPayoutAmountETB: number;
  resolutionNotes: string;
  resolvedAt: string;
}

export interface DisputeTimelineEvent {
  id: string;
  event: string;
  actor: string;
  timestamp: string;
}

export interface Dispute {
  id: string;
  disputeNumber: string;
  orderId: string;
  orderNumber: string;
  listingId: string;
  listingTitle: string;
  platform: PlatformType;
  amountETB: number;
  buyerId: string;
  buyerName: string;
  buyerEmail?: string;
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
  assignedAdminId?: string;
  assignedAdminName?: string;
  reason: DisputeReason;
  customReasonDescription?: string;
  details: string;
  status: DisputeStatus;
  evidence: DisputeEvidence[];
  messages: DisputeMessage[];
  timeline: DisputeTimelineEvent[];
  arbitration?: ArbitrationDecision;
  createdAt: string;
  updatedAt: string;
}

export interface SellerProfile {
  userId: string;
  businessName?: string;
  verificationBadge?: VerificationBadgeType;
  totalSales: number;
  rating: number;
  totalReviews: number;
  payoutAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

export interface Listing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
  sellerPhone?: string;
  sellerTelegram?: string;
  platform: PlatformType;
  title: string;
  handle: string;
  channelUrl: string;
  category: ListingCategory;
  description: string;
  followersCount: number;
  subscribersCount?: number;
  averageViews?: number;
  averageLikes?: number;
  totalLikes?: number;
  totalViews?: number;
  accountAgeMonths?: number;
  isMonetized: boolean;
  priceETB: number;
  priceRating: PriceRatingType;
  isNew: boolean;
  isFeatured?: boolean;
  verificationBadge?: VerificationBadgeType;
  status: ListingStatus;
  moderationStatus?: ListingModerationStatus;
  moderationHistory?: ModerationHistoryEntry[];
  adminNotes?: string;
  rejectionReason?: string;
  analyticsScreenshotUrl?: string;
  profileImageUrl?: string;
  isSeedData?: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  listingId: string;
  listingTitle: string;
  platform: PlatformType;
  channelUrl?: string;
  buyerId: string;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerTelegram?: string;
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
  sellerPhone?: string;
  sellerTelegram?: string;
  amountETB: number;
  platformFeeETB: number;
  sellerPayoutETB: number;
  status: OrderStatus;
  escrowStatus: EscrowStatus;
  paymentMethod?: PaymentMethodType;
  adminNotes?: string;
  disputeReason?: string;
  transferDetails?: {
    step: 'VERIFICATION' | 'CREDENTIAL_HANDOVER' | 'COMPLETED';
    initiatedAt: string;
    completedAt?: string;
    verifiedByAdmin?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type TransactionStatus = 
  | 'PAYMENT_PENDING' 
  | 'PAYMENT_SUBMITTED' 
  | 'PAYMENT_VERIFIED' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'REFUNDED' 
  | 'COMPLETED';

export type PaymentVerificationStatus = 
  | 'PENDING_SUBMISSION' 
  | 'SUBMITTED' 
  | 'VERIFIED' 
  | 'REJECTED';

export interface PurchaseTicket {
  ticketId: string;
  orderId: string;
  orderNumber: string;
  transactionId: string;
  listingId: string;
  listingTitle: string;
  platform: PlatformType;
  buyerId: string;
  buyerName: string;
  instructions: string;
  admins: Array<{ name: string; telegram: string }>;
  issuedAt: string;
  status: 'ACTIVE' | 'USED' | 'CANCELLED';
}

export interface TransactionRefundRecord {
  refundAmountETB: number;
  reason: string;
  authorizedBy: string;
  refundedAt: string;
  refundDestination?: string;
  notes?: string;
}

export interface SellerPayoutRecord {
  accountBank: string;
  accountNumber: string;
  accountHolder: string;
  payoutAmountETB: number;
  processedAt?: string;
  processedByAdmin?: string;
  payoutReference?: string;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  orderId: string;
  orderNumber: string;
  listingId: string;
  listingTitle: string;
  platform: PlatformType;
  buyerId: string;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerTelegram?: string;
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
  sellerPhone?: string;
  sellerTelegram?: string;
  amountETB: number;
  platformFeeETB: number;
  sellerPayoutETB: number;
  currency: 'ETB';
  paymentMethod: PaymentMethodType;
  paymentDestinationAccount?: string;
  status: TransactionStatus;
  verificationStatus: PaymentVerificationStatus;
  escrowStatus: EscrowStatus;
  payoutStatus: PayoutStatus;
  senderName?: string;
  paymentReference?: string;
  paymentProofUrl?: string;
  paymentProofNotes?: string;
  rejectionReason?: string;
  submittedAt?: string;
  verifiedAt?: string;
  verifiedByAdmin?: string;
  completedAt?: string;
  refundDetails?: TransactionRefundRecord;
  payoutDetails?: SellerPayoutRecord;
  cancellationReason?: string;
  adminNotes?: string;
  purchaseTicket?: PurchaseTicket;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  userId: string;
  availableETB: number;
  lockedETB: number;
  totalIncomeETB: number;
  currency: 'ETB';
}

export interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole | AuthRole;
  entityType: 'LISTING' | 'ORDER' | 'TRANSACTION' | 'PAYMENT' | 'REFUND' | 'PAYOUT' | 'DISPUTE' | 'USER' | 'AUTH' | 'WALLET' | 'SYSTEM';
  entityId?: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export interface PayoutAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export type NotificationEventType = 
  | 'LISTING_SUBMITTED'
  | 'LISTING_APPROVED'
  | 'LISTING_REJECTED'
  | 'LISTING_CHANGES_REQUESTED'
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'USER_REGISTERED'
  | 'ESCROW_FUNDS_LOCKED'
  | 'ESCROW_FUNDS_RELEASED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_REJECTED'
  | 'PAYMENT_MISMATCH'
  | 'SYSTEM_ALERT'
  | 'PAYOUT_PROCESSED'
  | 'REFUND_ISSUED'
  | 'TRANSACTION_CANCELLED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_MESSAGE_SENT'
  | 'DISPUTE_EVIDENCE_REQUESTED'
  | 'DISPUTE_EVIDENCE_SUBMITTED'
  | 'DISPUTE_RESOLVED';

export interface AppNotification {
  id: string;
  userId: string; // user ID or 'ADMIN'
  type: NotificationEventType;
  title: string;
  message: string;
  isRead: boolean;
  referenceId?: string;
  referenceType?: 'listing' | 'order' | 'transaction' | 'dispute' | 'user' | 'system';
  createdAt: string;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  pendingListingsCount: number;
  approvedListingsCount: number;
  rejectedListingsCount: number;
  changesRequestedListingsCount: number;
  pendingOrdersCount: number;
  processingOrdersCount: number;
  successfulOrdersCount: number;
  cancelledOrdersCount: number;
  disputedOrdersCount: number;
  pendingPaymentsCount?: number;
  verifiedPaymentsCount?: number;
  totalSalesVolumeETB: number;
  totalPlatformRevenueETB: number;
  totalEscrowLockedETB: number;
}

export type AdminPortalSubTab = 
  | 'overview' 
  | 'listings' 
  | 'orders' 
  | 'payments'
  | 'disputes'
  | 'users' 
  | 'audit' 
  | 'support';

export interface MarketplaceFilters {
  platform?: PlatformType | 'all' | string;
  searchQuery?: string;
  searchKeyword?: string;
  category?: ListingCategory | 'all' | string;
  sortBy?: 'recommended' | 'popular' | 'followers_desc' | 'followers_asc' | 'newest' | 'price_asc' | 'price_desc' | 'engagement_desc' | string;
  onlyNew?: boolean;
  monetizedOnly?: boolean | null;
  priceStrength?: PriceRatingType | 'ALL';
  verificationBadge?: VerificationBadgeType | 'ALL';
  minFollowers?: number;
  maxFollowers?: number;
  minPrice?: number;
  maxPrice?: number;
}

export type AppTab = 'dashboard' | 'marketplace' | 'sell' | 'order' | 'account' | 'admin' | 'design-system' | 'community';

export type LanguageCode = 'en' | 'am' | 'om' | 'ti' | 'aa';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

export interface OrderReview {
  id: string;
  orderId: string;
  listingId: string;
  listingTitle: string;
  platform: PlatformType;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  rating: number; // 1 to 5
  comment: string;
  moderationStatus: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
  createdAt: string;
}

export interface BuyerProfile {
  userId: string;
  savedListingIds: string[];
  totalPurchases: number;
  totalSpentETB: number;
  savedCategories?: ListingCategory[];
  preferredPaymentMethod?: PaymentMethodType;
}

export interface DisputeTicket {
  id: string;
  orderId: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  reason: string;
  details: string;
  status: DisputeStatus;
  createdAt: string;
  updatedAt: string;
  adminResolution?: string;
}
