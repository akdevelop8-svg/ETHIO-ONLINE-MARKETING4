/**
 * EOM Review & Rating Service
 * Phase 6: Post-Purchase Rating & Feedback
 */

import { OrderReview, Order, User } from '../../types/index.js';
import { auditService } from '../audit/auditService.js';
import { notificationService } from '../notifications/notificationService.js';

const STORAGE_REVIEWS_KEY = 'eom_reviews_vault_v1';

const INITIAL_SAMPLE_REVIEWS: OrderReview[] = [
  {
    id: 'rev-001',
    orderId: 'ord-1002',
    listingId: 'list-seed-002',
    listingTitle: 'Habesha Fashion & Lifestyle (120K Fans)',
    platform: 'tiktok',
    sellerId: 'usr-seller-02',
    sellerName: 'Tigist Creative Hub',
    buyerId: 'usr-buyer-02',
    buyerName: 'Selamawit Bekele',
    rating: 5,
    comment: 'Super fast handover with admin @mr_ebek. Clean TikTok account, 100% genuine followers and engagement!',
    moderationStatus: 'APPROVED',
    createdAt: '2026-08-25T17:00:00Z'
  }
];

class ReviewService {
  private reviews: OrderReview[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_REVIEWS_KEY);
        if (stored) {
          this.reviews = JSON.parse(stored);
        } else {
          this.reviews = [...INITIAL_SAMPLE_REVIEWS];
          this.persist();
        }
      } else {
        this.reviews = [...INITIAL_SAMPLE_REVIEWS];
      }
    } catch {
      this.reviews = [...INITIAL_SAMPLE_REVIEWS];
    }
    this.isInitialized = true;
  }

  private persist() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(this.reviews));
      }
    } catch {
      // Storage safety
    }
  }

  /**
   * Submit a review for a completed order
   */
  public submitReview(
    buyer: User,
    order: Order,
    rating: number,
    comment: string
  ): OrderReview {
    if (!buyer || !buyer.id) {
      throw new Error('Authentication required.');
    }
    if (order.buyerId !== buyer.id && buyer.authRole !== 'admin') {
      throw new Error('You can only review orders you have purchased.');
    }
    if (order.status !== 'SUCCESS') {
      throw new Error('Reviews can only be left on completed (SUCCESS) orders.');
    }

    this.init();
    if (this.hasBuyerReviewedOrder(buyer.id, order.id)) {
      throw new Error('You have already submitted a review for this order.');
    }

    const clampedRating = Math.max(1, Math.min(5, Math.round(rating)));
    const timestamp = new Date().toISOString();

    const newReview: OrderReview = {
      id: `rev-${Date.now()}`,
      orderId: order.id,
      listingId: order.listingId,
      listingTitle: order.listingTitle,
      platform: order.platform,
      sellerId: order.sellerId,
      sellerName: order.sellerName,
      buyerId: buyer.id,
      buyerName: buyer.fullName || buyer.email,
      rating: clampedRating,
      comment: comment.trim(),
      moderationStatus: 'APPROVED',
      createdAt: timestamp
    };

    this.reviews.unshift(newReview);
    this.persist();

    // Audit log
    auditService.log({
      actorId: buyer.id,
      actorName: buyer.fullName || buyer.email,
      actorRole: 'BUYER',
      action: 'REVIEW_SUBMITTED',
      entityType: 'ORDER',
      entityId: order.id,
      details: `Buyer left ${clampedRating}-star review for order #${order.orderNumber} (Seller: ${order.sellerName}).`
    });

    // Notify Seller
    notificationService.dispatch({
      targetUserId: order.sellerId,
      type: 'ORDER_STATUS_CHANGED',
      title: `New ${clampedRating}★ Review Received!`,
      message: `Buyer ${buyer.fullName || 'Verified Buyer'} left a review on "${order.listingTitle}".`,
      referenceId: order.id,
      referenceType: 'order'
    });

    return newReview;
  }

  /**
   * Check if buyer has already reviewed an order
   */
  public hasBuyerReviewedOrder(buyerId: string, orderId: string): boolean {
    this.init();
    return this.reviews.some((r) => r.buyerId === buyerId && r.orderId === orderId);
  }

  /**
   * Get reviews for a listing
   */
  public getReviewsForListing(listingId: string): OrderReview[] {
    this.init();
    return this.reviews.filter((r) => r.listingId === listingId && r.moderationStatus === 'APPROVED');
  }

  /**
   * Get reviews for a seller
   */
  public getReviewsForSeller(sellerId: string): OrderReview[] {
    this.init();
    return this.reviews.filter((r) => r.sellerId === sellerId && r.moderationStatus === 'APPROVED');
  }

  /**
   * Get all reviews left by a buyer
   */
  public getReviewsByBuyer(buyerId: string): OrderReview[] {
    this.init();
    return this.reviews.filter((r) => r.buyerId === buyerId);
  }
}

export const reviewService = new ReviewService();
