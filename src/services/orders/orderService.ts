/**
 * EOM Order & Escrow Management Service
 * Phase 2 - 8: Platform Operations & Escrow Lifecycle
 */

import { Order, OrderStatus, EscrowStatus, PaymentMethodType, User, Listing, DisputeTicket } from '../../types/index.js';
import { PLATFORM_FEE_PERCENTAGE } from '../../constants/index.js';
import { authService } from '../auth/authService.js';
import { auditService } from '../audit/auditService.js';
import { notificationService } from '../notifications/notificationService.js';
import { listingService } from '../marketplace/listingService.js';
import { transactionService } from '../transactions/transactionService.js';
import { orderRepository, defaultStorageAdapter, OrderRepository } from '../persistence/index.js';

const STORAGE_ORDERS_KEY = 'eom_orders_vault_v2';
const STORAGE_DISPUTES_KEY = 'eom_disputes_vault_v1';

const INITIAL_SAMPLE_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'EOM-ORD-2026-891',
    listingId: 'list-seed-001',
    listingTitle: 'Ethio Tech Insights (48K Subscribers)',
    platform: 'telegram',
    channelUrl: 'https://t.me/ethiotechinsights',
    buyerId: 'usr-buyer-01',
    buyerName: 'Yared Getachew',
    buyerEmail: 'yared.getachew@gmail.com',
    buyerPhone: '+251911987654',
    buyerTelegram: '@yared_g',
    sellerId: 'usr-seller-01',
    sellerName: 'Abebe Tech & Media',
    sellerEmail: 'abebe.media@gmail.com',
    sellerPhone: '+251911234567',
    sellerTelegram: '@abebe_media',
    amountETB: 35000,
    platformFeeETB: 8750, // 25%
    sellerPayoutETB: 26250, // 75%
    status: 'PROCESSING',
    escrowStatus: 'HELD',
    paymentMethod: 'TELEBIRR',
    adminNotes: 'Funds locked in Telebirr escrow. Channel 2FA transfer initiated.',
    transferDetails: {
      step: 'CREDENTIAL_HANDOVER',
      initiatedAt: '2026-08-30T15:00:00Z',
      verifiedByAdmin: '@mr_ebek'
    },
    createdAt: '2026-08-30T14:30:00Z',
    updatedAt: '2026-08-30T15:00:00Z'
  },
  {
    id: 'ord-1002',
    orderNumber: 'EOM-ORD-2026-842',
    listingId: 'list-seed-002',
    listingTitle: 'Habesha Fashion & Lifestyle (120K Fans)',
    platform: 'tiktok',
    channelUrl: 'https://tiktok.com/@habesha_style_daily',
    buyerId: 'usr-buyer-02',
    buyerName: 'Selamawit Bekele',
    buyerEmail: 'selam.bekele@yahoo.com',
    buyerPhone: '+251922876543',
    buyerTelegram: '@selam_bekele',
    sellerId: 'usr-seller-02',
    sellerName: 'Tigist Creative Hub',
    sellerEmail: 'tigist.style@yahoo.com',
    sellerPhone: '+251922345678',
    sellerTelegram: '@tigist_creatives',
    amountETB: 78000,
    platformFeeETB: 19500,
    sellerPayoutETB: 58500,
    status: 'SUCCESS',
    escrowStatus: 'RELEASED',
    paymentMethod: 'COMMERCIAL_BANK_OF_ETHIOPIA',
    adminNotes: 'TikTok email transfer verified by buyer. Escrow funds transferred to seller CBE account.',
    transferDetails: {
      step: 'COMPLETED',
      initiatedAt: '2026-08-25T11:00:00Z',
      completedAt: '2026-08-25T16:45:00Z',
      verifiedByAdmin: '@EXO_SMM'
    },
    createdAt: '2026-08-25T10:00:00Z',
    updatedAt: '2026-08-25T16:45:00Z'
  },
  {
    id: 'ord-1003',
    orderNumber: 'EOM-ORD-2026-799',
    listingId: 'list-seed-003',
    listingTitle: 'Ethio Premier League Highlights (85K Subs)',
    platform: 'youtube',
    channelUrl: 'https://youtube.com/@ethiopremier_tv',
    buyerId: 'usr-buyer-03',
    buyerName: 'Henok Tadesse',
    buyerEmail: 'henok.tadesse@gmail.com',
    buyerPhone: '+251933765432',
    buyerTelegram: '@henok_t',
    sellerId: 'usr-seller-03',
    sellerName: 'Dawit Sports Zone',
    sellerEmail: 'dawit.sports@gmail.com',
    sellerPhone: '+251933456789',
    sellerTelegram: '@dawit_sports',
    amountETB: 145000,
    platformFeeETB: 36250,
    sellerPayoutETB: 108750,
    status: 'PROCESSING',
    escrowStatus: 'HELD',
    paymentMethod: 'TELEBIRR',
    adminNotes: 'Buyer deposited via Dashen Amole. YouTube Primary Owner transfer pending 7-day waiting period.',
    transferDetails: {
      step: 'VERIFICATION',
      initiatedAt: '2026-08-29T09:00:00Z',
      verifiedByAdmin: '@mr_ebek'
    },
    createdAt: '2026-08-29T08:30:00Z',
    updatedAt: '2026-08-29T09:00:00Z'
  },
  {
    id: 'ord-1004',
    orderNumber: 'EOM-ORD-2026-650',
    listingId: 'list-mod-004',
    listingTitle: 'Betting Tips Daily (90K Bots)',
    platform: 'telegram',
    channelUrl: 'https://t.me/bettingtips251',
    buyerId: 'usr-buyer-01',
    buyerName: 'Yared Getachew',
    buyerEmail: 'yared.getachew@gmail.com',
    buyerPhone: '+251911987654',
    sellerId: 'usr-seller-07',
    sellerName: 'Fast Promo 251',
    amountETB: 12000,
    platformFeeETB: 3000,
    sellerPayoutETB: 9000,
    status: 'CANCELLED',
    escrowStatus: 'REFUNDED',
    paymentMethod: 'TELEBIRR',
    adminNotes: 'Listing found to be fraudulent. Buyer full deposit refunded to Telebirr.',
    disputeReason: 'Channel rejected for bot activity.',
    createdAt: '2026-08-28T08:30:00Z',
    updatedAt: '2026-08-28T09:30:00Z'
  }
];

class OrderService {
  private repo: OrderRepository;
  private orders: Order[] = [];
  private isInitialized = false;

  constructor(repo: OrderRepository = orderRepository) {
    this.repo = repo;
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    try {
      const stored = this.repo.findAll();
      if (stored && stored.length > 0) {
        this.orders = stored;
      } else {
        this.orders = [...INITIAL_SAMPLE_ORDERS];
        this.persist();
      }
    } catch {
      this.orders = [...INITIAL_SAMPLE_ORDERS];
    }
    this.isInitialized = true;
  }

  private persist() {
    try {
      this.repo.saveAll(this.orders);
    } catch {
      // Storage safety
    }
  }

  public getUserOrders(userId: string, requestingUser?: User | null): Order[] {
    this.init();
    if (requestingUser) {
      const isAdmin = requestingUser.authRole === 'admin' || requestingUser.role === 'ADMIN';
      if (!isAdmin && requestingUser.id !== userId) {
        return [];
      }
    }
    return this.orders.filter((o) => o.buyerId === userId || o.sellerId === userId);
  }

  public getOrdersForUser(userId: string): Order[] {
    return this.getUserOrders(userId);
  }

  public getOrdersBySeller(sellerId: string, requestingUser?: User | null): Order[] {
    this.init();
    if (requestingUser) {
      const isAdmin = requestingUser.authRole === 'admin' || requestingUser.role === 'ADMIN';
      if (!isAdmin && requestingUser.id !== sellerId) {
        return [];
      }
    }
    return this.orders
      .filter((o) => o.sellerId === sellerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrdersByBuyer(buyerId: string, requestingUser?: User | null): Order[] {
    this.init();
    if (requestingUser) {
      const isAdmin = requestingUser.authRole === 'admin' || requestingUser.role === 'ADMIN';
      if (!isAdmin && requestingUser.id !== buyerId) {
        return [];
      }
    }
    return this.orders
      .filter((o) => o.buyerId === buyerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllOrdersForAdmin(
    requestingUser: User | null,
    filter?: {
      status?: OrderStatus | 'ALL';
      escrowStatus?: EscrowStatus | 'ALL';
      platform?: string;
      searchQuery?: string;
    }
  ): Order[] {
    const authCheck = authService.checkAdminAccess(requestingUser);
    if (!authCheck.granted) {
      throw new Error(authCheck.reason || 'Unauthorized: Admin privileges required.');
    }
    this.init();
    let results = [...this.orders];
    if (filter) {
      if (filter.status && filter.status !== 'ALL') {
        results = results.filter((o) => o.status === filter.status);
      }
      if (filter.escrowStatus && filter.escrowStatus !== 'ALL') {
        results = results.filter((o) => o.escrowStatus === filter.escrowStatus);
      }
      if (filter.platform && filter.platform !== 'all' && filter.platform !== 'ALL') {
        results = results.filter((o) => o.platform === filter.platform);
      }
      if (filter.searchQuery && filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase().trim();
        results = results.filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.listingTitle.toLowerCase().includes(q) ||
            o.buyerName.toLowerCase().includes(q) ||
            (o.buyerEmail && o.buyerEmail.toLowerCase().includes(q)) ||
            o.sellerName.toLowerCase().includes(q) ||
            (o.sellerEmail && o.sellerEmail.toLowerCase().includes(q)) ||
            o.id.toLowerCase().includes(q)
        );
      }
    }
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results;
  }

  public getOrderById(orderId: string, requestingUser?: User | null): Order | null {
    this.init();
    const order = this.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) return null;

    if (requestingUser) {
      const isAdmin = requestingUser.authRole === 'admin' || requestingUser.role === 'ADMIN';
      const isParticipant = requestingUser.id === order.buyerId || requestingUser.id === order.sellerId;
      if (!isAdmin && !isParticipant) {
        return null;
      }
    }
    return order;
  }

  public createOrder(
    buyer: User,
    listingOrId: Listing | string,
    paymentMethod: PaymentMethodType = 'TELEBIRR',
    buyerNotes?: string,
    contactOverrides?: { phone?: string; telegram?: string }
  ): Order {
    if (!buyer || !buyer.id) {
      throw new Error('Authentication required: You must be logged in to create an order.');
    }
    this.init();

    const listingId = typeof listingOrId === 'string' ? listingOrId : listingOrId.id;
    const listing = listingService.getRawListingById(listingId);
    if (!listing) {
      throw new Error('Channel listing not found or has been removed.');
    }

    if (listing.status === 'SOLD') {
      throw new Error('This channel has already been sold and is no longer available.');
    }
    if (listing.status === 'SUSPENDED') {
      throw new Error('This channel is currently suspended and cannot be purchased.');
    }
    if (listing.status !== 'ACTIVE' || listing.moderationStatus !== 'APPROVED') {
      throw new Error('Only active, approved marketplace channels can be ordered.');
    }

    if (
      listing.isSeedData === true ||
      listing.isDemo === true ||
      listing.id.startsWith('demo-') ||
      listing.id.startsWith('list-seed')
    ) {
      throw new Error('Demo channels cannot be ordered in the live escrow market.');
    }

    if (listing.sellerId === buyer.id) {
      throw new Error('You cannot purchase your own listed channel.');
    }

    const existingActiveOrder = this.orders.find(
      (o) => o.listingId === listing.id && o.status === 'PROCESSING'
    );
    if (existingActiveOrder) {
      throw new Error('An active escrow order is already in progress for this channel. Please check back later.');
    }

    const timestamp = new Date().toISOString();
    const amountETB = Number(listing.priceETB);
    const platformFeeETB = Math.round((amountETB * PLATFORM_FEE_PERCENTAGE) / 100);
    const sellerPayoutETB = amountETB - platformFeeETB;
    const orderNumber = `EOM-ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderNumber,
      listingId: listing.id,
      listingTitle: listing.title,
      platform: listing.platform,
      channelUrl: listing.channelUrl,
      buyerId: buyer.id,
      buyerName: buyer.fullName || buyer.email,
      buyerEmail: buyer.email,
      buyerPhone: contactOverrides?.phone || buyer.phone,
      buyerTelegram: contactOverrides?.telegram || buyer.username,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      sellerEmail: listing.sellerEmail,
      sellerPhone: listing.sellerPhone,
      sellerTelegram: listing.sellerTelegram,
      amountETB,
      platformFeeETB,
      sellerPayoutETB,
      status: 'PROCESSING',
      escrowStatus: 'HELD',
      paymentMethod,
      adminNotes: buyerNotes || 'Escrow deposit initiated. Channel transfer verification in progress.',
      transferDetails: {
        step: 'VERIFICATION',
        initiatedAt: timestamp
      },
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Link transaction first
    try {
      transactionService.createTransactionForOrder(buyer, newOrder, paymentMethod);
    } catch (err: any) {
      throw new Error(`Failed to initialize escrow transaction: ${err.message}`);
    }

    this.orders.unshift(newOrder);
    this.persist();

    // Reserve the marketplace asset immediately. It stays visible as
    // "ON PROGRESS" until completion, when it becomes "SOLD".
    listingService.markListingInProgress(listing.id);

    // Audit Log
    auditService.log({
      actorId: buyer.id,
      actorName: buyer.fullName || buyer.email,
      actorRole: buyer.role,
      action: 'ORDER_CREATED',
      entityType: 'ORDER',
      entityId: newOrder.id,
      details: `Created escrow order #${orderNumber} for "${listing.title}" with ${paymentMethod} (${amountETB} ETB).`,
      metadata: {
        amountETB,
        platformFeeETB,
        sellerPayoutETB,
        paymentMethod
      }
    });

    // Notification to Admin
    notificationService.dispatch({
      targetUserId: 'ADMIN',
      type: 'ORDER_CREATED',
      title: 'New Escrow Order Placed',
      message: `Buyer ${buyer.fullName || buyer.email} placed order #${orderNumber} for "${listing.title}" (${amountETB} ETB).`,
      referenceId: newOrder.id,
      referenceType: 'order'
    });

    // Notification to Seller
    notificationService.dispatch({
      targetUserId: listing.sellerId,
      type: 'ORDER_CREATED',
      title: 'You have a new buyer!',
      message: `An escrow order has been initiated for "${listing.title}". Escrow funds are secured by EOM admins.`,
      referenceId: newOrder.id,
      referenceType: 'order'
    });

    // Notification to Buyer
    notificationService.dispatch({
      targetUserId: buyer.id,
      type: 'ORDER_CREATED',
      title: `Order #${orderNumber} Confirmed`,
      message: `Your escrow order for "${listing.title}" has been created. Admins @mr_ebek and @EXO_SMM are mediating the transfer.`,
      referenceId: newOrder.id,
      referenceType: 'order'
    });

    return newOrder;
  }

  public completeOrder(actor: User, orderId: string, notes?: string): Order {
    if (!actor || !actor.id) {
      throw new Error('Authentication required.');
    }
    this.init();
    const order = this.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) {
      throw new Error(`Order #${orderId} not found.`);
    }

    const isAdmin = actor.authRole === 'admin' || actor.role === 'ADMIN';
    const isBuyer = actor.id === order.buyerId;

    if (!isAdmin && !isBuyer) {
      throw new Error('Unauthorized: Only the buyer or an administrator can confirm order completion.');
    }

    if (order.status === 'SUCCESS') {
      return order;
    }

    if (order.status === 'CANCELLED') {
      throw new Error('Cannot complete a cancelled order.');
    }

    // Complete linked transaction and disburse payout first.
    try {
      transactionService.completeTransactionAndReleaseEscrow(actor, order.id);
    } catch (err: any) {
      throw new Error(`Failed to complete order: ${err.message}`);
    }

    const timestamp = new Date().toISOString();
    order.status = 'SUCCESS';
    order.escrowStatus = 'RELEASED';
    order.adminNotes = notes || (isAdmin ? `Completed and verified by admin ${actor.fullName || '@mr_ebek'}.` : 'Buyer confirmed channel ownership transfer.');

    if (!order.transferDetails) {
      order.transferDetails = {
        step: 'COMPLETED',
        initiatedAt: order.createdAt,
        completedAt: timestamp,
        verifiedByAdmin: isAdmin ? actor.fullName || '@mr_ebek' : 'Buyer Confirmed'
      };
    } else {
      order.transferDetails.step = 'COMPLETED';
      order.transferDetails.completedAt = timestamp;
      order.transferDetails.verifiedByAdmin = isAdmin ? actor.fullName || '@mr_ebek' : (order.transferDetails.verifiedByAdmin || 'Buyer Confirmed');
    }

    order.updatedAt = timestamp;
    this.persist();

    // Mark listing sold
    listingService.markListingSold(order.listingId);

    // Audit log
    auditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorRole: isAdmin ? 'ADMIN' : 'BUYER',
      action: 'ORDER_COMPLETED',
      entityType: 'ORDER',
      entityId: order.id,
      details: `${isAdmin ? 'Admin' : 'Buyer'} confirmed completion of order #${order.orderNumber} for "${order.listingTitle}".`
    });

    // Notify Buyer
    notificationService.dispatch({
      targetUserId: order.buyerId,
      type: 'ORDER_STATUS_CHANGED',
      title: `Order #${order.orderNumber} Completed!`,
      message: `Congratulations! Channel ownership transfer for "${order.listingTitle}" is complete.`,
      referenceId: order.id,
      referenceType: 'order'
    });

    // Notify Seller
    notificationService.dispatch({
      targetUserId: order.sellerId,
      type: 'ORDER_STATUS_CHANGED',
      title: `Order #${order.orderNumber} Completed & Escrow Released`,
      message: `Buyer verified ownership for "${order.listingTitle}". Escrow payout of ${order.sellerPayoutETB.toLocaleString()} ETB is ready.`,
      referenceId: order.id,
      referenceType: 'order'
    });

    return order;
  }

  public updateTransferStep(
    actor: User,
    orderId: string,
    step: 'VERIFICATION' | 'CREDENTIAL_HANDOVER' | 'COMPLETED',
    note?: string
  ): Order {
    if (!actor || !actor.id) {
      throw new Error('Authentication required.');
    }
    this.init();
    const order = this.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) {
      throw new Error(`Order #${orderId} not found.`);
    }

    const isAdmin = actor.authRole === 'admin' || actor.role === 'ADMIN';
    const isBuyer = actor.id === order.buyerId;
    const isSeller = actor.id === order.sellerId;

    if (!isAdmin && !isBuyer && !isSeller) {
      throw new Error('Unauthorized: You are not a participant in this order.');
    }

    if (step === 'COMPLETED') {
      return this.completeOrder(actor, orderId, note);
    }

    if (isSeller && step !== 'CREDENTIAL_HANDOVER') {
      throw new Error('Sellers can only mark readiness for credential handover.');
    }

    const timestamp = new Date().toISOString();
    if (!order.transferDetails) {
      order.transferDetails = {
        step,
        initiatedAt: order.createdAt
      };
    } else {
      order.transferDetails.step = step;
    }

    if (note) {
      order.adminNotes = note;
    }
    order.updatedAt = timestamp;
    this.persist();

    auditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorRole: actor.role,
      action: 'ORDER_TRANSFER_STEP_UPDATED',
      entityType: 'ORDER',
      entityId: order.id,
      details: `${actor.fullName || actor.email} updated order #${order.orderNumber} transfer step to "${step}".`
    });

    const targetUserId = isBuyer ? order.sellerId : order.buyerId;
    notificationService.dispatch({
      targetUserId,
      type: 'ORDER_STATUS_CHANGED',
      title: `Order #${order.orderNumber} Step: ${step}`,
      message: `Transfer progress updated: ${step}. ${note || ''}`,
      referenceId: order.id,
      referenceType: 'order'
    });

    return order;
  }

  public updateOrderStatus(
    adminUser: User | null,
    orderId: string,
    newStatus: OrderStatus,
    options?: {
      escrowStatus?: EscrowStatus;
      transferStep?: 'VERIFICATION' | 'CREDENTIAL_HANDOVER' | 'COMPLETED';
      adminNotes?: string;
      disputeReason?: string;
    }
  ): Order {
    const authCheck = authService.checkAdminAccess(adminUser);
    if (!authCheck.granted || !adminUser) {
      throw new Error(authCheck.reason || 'Unauthorized: Admin privileges required.');
    }
    this.init();
    const order = this.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) {
      throw new Error(`Order #${orderId} not found.`);
    }

    const timestamp = new Date().toISOString();
    const previousStatus = order.status;
    order.status = newStatus;

    if (options?.escrowStatus) {
      order.escrowStatus = options.escrowStatus;
    } else {
      if (newStatus === 'SUCCESS') order.escrowStatus = 'RELEASED';
      else if (newStatus === 'CANCELLED') order.escrowStatus = 'REFUNDED';
      else if (newStatus === 'DISPUTED') order.escrowStatus = 'DISPUTED';
    }

    if (options?.adminNotes) {
      order.adminNotes = options.adminNotes;
    }
    if (options?.disputeReason) {
      order.disputeReason = options.disputeReason;
    }

    if (!order.transferDetails) {
      order.transferDetails = {
        step: options?.transferStep || 'VERIFICATION',
        initiatedAt: timestamp
      };
    } else {
      if (options?.transferStep) {
        order.transferDetails.step = options.transferStep;
      }
      if (newStatus === 'SUCCESS') {
        order.transferDetails.step = 'COMPLETED';
        order.transferDetails.completedAt = timestamp;
      }
      order.transferDetails.verifiedByAdmin = adminUser.username || adminUser.fullName || '@mr_ebek';
    }

    order.updatedAt = timestamp;
    this.persist();

    if (newStatus === 'CANCELLED') {
      listingService.restoreListingToActive(order.listingId);
    } else if (newStatus === 'SUCCESS') {
      listingService.markListingSold(order.listingId);
    }

    auditService.log({
      actorId: adminUser.id,
      actorName: adminUser.fullName || adminUser.username || 'Admin',
      actorRole: 'ADMIN',
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'ORDER',
      entityId: order.id,
      details: `Admin changed order #${order.orderNumber} status from "${previousStatus}" to "${newStatus}". Escrow: ${order.escrowStatus}.`,
      metadata: {
        previousStatus,
        newStatus,
        escrowStatus: order.escrowStatus,
        notes: options?.adminNotes
      }
    });

    notificationService.dispatch({
      targetUserId: order.buyerId,
      type: 'ORDER_STATUS_CHANGED',
      title: `Order #${order.orderNumber} is now ${newStatus}`,
      message: `Your order for "${order.listingTitle}" has been updated to ${newStatus}. ${options?.adminNotes ? `Admin note: ${options.adminNotes}` : ''}`,
      referenceId: order.id,
      referenceType: 'order'
    });

    notificationService.dispatch({
      targetUserId: order.sellerId,
      type: 'ORDER_STATUS_CHANGED',
      title: `Order #${order.orderNumber} Update: ${newStatus}`,
      message: `The escrow status for "${order.listingTitle}" is now ${order.escrowStatus}. ${newStatus === 'SUCCESS' ? 'Payout will be released to your bank account.' : ''}`,
      referenceId: order.id,
      referenceType: 'order'
    });

    return order;
  }

  public cancelOrderAsBuyer(buyer: User, orderId: string, reason: string): Order {
    if (!buyer || !buyer.id) {
      throw new Error('Authentication required.');
    }
    this.init();
    const order = this.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) {
      throw new Error('Order not found.');
    }
    if (order.buyerId !== buyer.id && buyer.authRole !== 'admin') {
      throw new Error('Unauthorized: You are not the buyer of this order.');
    }
    if (order.status === 'SUCCESS') {
      throw new Error('Cannot cancel an already completed order.');
    }
    
    // First, attempt to cancel the transaction. This will throw if the payment is already verified and the user is not an admin.
    try {
      transactionService.cancelTransaction(buyer, order.id, reason);
    } catch (err: any) {
      throw new Error(`Failed to cancel order: ${err.message}`);
    }

    if (order.status === 'CANCELLED') {
      return order;
    }

    const timestamp = new Date().toISOString();
    order.status = 'CANCELLED';
    order.escrowStatus = 'REFUNDED';
    order.disputeReason = reason;
    order.adminNotes = `Cancelled by buyer: ${reason}. Escrow deposit flagged for refund.`;
    order.updatedAt = timestamp;
    this.persist();

    // A cancelled order releases the listing back to the marketplace.
    listingService.restoreListingToActive(order.listingId);

    auditService.log({
      actorId: buyer.id,
      actorName: buyer.fullName || buyer.email,
      actorRole: 'BUYER',
      action: 'ORDER_CANCELLED',
      entityType: 'ORDER',
      entityId: order.id,
      details: `Buyer cancelled order #${order.orderNumber}. Reason: ${reason}`
    });

    notificationService.dispatch({
      targetUserId: 'ADMIN',
      type: 'ORDER_STATUS_CHANGED',
      title: `Order #${order.orderNumber} Cancelled by Buyer`,
      message: `Buyer ${buyer.fullName || buyer.email} requested cancellation for order #${order.orderNumber}. Escrow refund required.`,
      referenceId: order.id,
      referenceType: 'order'
    });

    notificationService.dispatch({
      targetUserId: order.sellerId,
      type: 'ORDER_STATUS_CHANGED',
      title: `Order #${order.orderNumber} Cancelled`,
      message: `Order for "${order.listingTitle}" was cancelled by the buyer. Reason: ${reason}`,
      referenceId: order.id,
      referenceType: 'order'
    });

    return order;
  }

  public cancelOrder = this.cancelOrderAsBuyer.bind(this);

  public raiseDispute(
    buyer: User,
    orderId: string,
    reason: string,
    details: string
  ): { order: Order; dispute: DisputeTicket } {
    if (!buyer || !buyer.id) {
      throw new Error('Authentication required.');
    }
    this.init();
    const order = this.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) {
      throw new Error('Order not found.');
    }
    if (order.buyerId !== buyer.id && buyer.authRole !== 'admin') {
      throw new Error('Unauthorized: You are not the buyer of this order.');
    }

    const timestamp = new Date().toISOString();
    order.status = 'DISPUTED';
    order.escrowStatus = 'DISPUTED';
    order.disputeReason = `${reason}: ${details}`;
    order.updatedAt = timestamp;

    const dispute: DisputeTicket = {
      id: `disp-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerId: buyer.id,
      buyerName: buyer.fullName || buyer.email,
      sellerId: order.sellerId,
      sellerName: order.sellerName,
      reason,
      details,
      status: 'OPEN',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    try {
      const list = defaultStorageAdapter.getAll<DisputeTicket>(STORAGE_DISPUTES_KEY);
      list.unshift(dispute);
      defaultStorageAdapter.batchSave(STORAGE_DISPUTES_KEY, list);
    } catch {
      // Storage safety
    }
    this.persist();

    auditService.log({
      actorId: buyer.id,
      actorName: buyer.fullName || buyer.email,
      actorRole: 'BUYER',
      action: 'DISPUTE_RAISED',
      entityType: 'ORDER',
      entityId: order.id,
      details: `Buyer opened dispute for order #${order.orderNumber}. Reason: ${reason} - ${details}`
    });

    notificationService.dispatch({
      targetUserId: 'ADMIN',
      type: 'ORDER_STATUS_CHANGED',
      title: `Dispute Opened: Order #${order.orderNumber}`,
      message: `Buyer ${buyer.fullName || buyer.email} filed a dispute: "${reason}". Admin arbitration required.`,
      referenceId: order.id,
      referenceType: 'order'
    });

    return { order, dispute };
  }

  public getDisputesForBuyer(buyerId: string): DisputeTicket[] {
    try {
      const list = defaultStorageAdapter.getAll<DisputeTicket>(STORAGE_DISPUTES_KEY);
      return list.filter((d) => d.buyerId === buyerId);
    } catch {
      // Return empty on error
    }
    return [];
  }
}

export const orderService = new OrderService();
