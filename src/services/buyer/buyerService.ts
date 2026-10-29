/**
 * EOM Buyer Service
 * Phase 6: Buyer System, Saved Channels, Preferences & Activity
 */

import { User, Listing, BuyerProfile, ListingCategory, PaymentMethodType } from '../../types/index.js';
import { listingService } from '../marketplace/listingService.js';
import { auditService } from '../audit/auditService.js';

const STORAGE_FAVORITES_PREFIX = 'eom_buyer_favs_';
const STORAGE_BUYER_PROFILE_PREFIX = 'eom_buyer_profile_';

class BuyerService {
  /**
   * Get saved listing IDs for a user
   */
  public getFavorites(userId?: string): string[] {
    if (!userId) return [];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(`${STORAGE_FAVORITES_PREFIX}${userId}`);
        return stored ? JSON.parse(stored) : [];
      }
    } catch {
      // Storage safety
    }
    return [];
  }

  public getFavoriteListingIds(userId?: string): string[] {
    return this.getFavorites(userId);
  }

  /**
   * Toggle a listing in buyer's saved/favorites
   */
  public toggleFavorite(userId: string, listingId: string): { favorites: string[]; isSaved: boolean } {
    if (!userId) {
      return { favorites: [], isSaved: false };
    }
    try {
      const current = this.getFavorites(userId);
      const exists = current.includes(listingId);
      const updated = exists
        ? current.filter((id) => id !== listingId)
        : [...current, listingId];

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`${STORAGE_FAVORITES_PREFIX}${userId}`, JSON.stringify(updated));
      }
      return { favorites: updated, isSaved: !exists };
    } catch {
      return { favorites: [], isSaved: false };
    }
  }

  /**
   * Check if a listing is saved
   */
  public isFavorite(userId: string, listingId: string): boolean {
    if (!userId) return false;
    const favs = this.getFavorites(userId);
    return favs.includes(listingId);
  }

  /**
   * Get full listing objects for all saved IDs
   */
  public getFavoriteListings(userId: string): Listing[] {
    if (!userId) return [];
    const favIds = this.getFavorites(userId);
    if (favIds.length === 0) return [];
    const allApproved = listingService.getPublicApprovedListings();
    return allApproved.filter((item) => favIds.includes(item.id));
  }

  /**
   * Get or initialize Buyer Profile
   */
  public getBuyerProfile(userId: string): BuyerProfile {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(`${STORAGE_BUYER_PROFILE_PREFIX}${userId}`);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch {
      // Return default
    }
    const defaultProfile: BuyerProfile = {
      userId,
      savedListingIds: this.getFavorites(userId),
      totalPurchases: 0,
      totalSpentETB: 0,
      savedCategories: [],
      preferredPaymentMethod: 'TELEBIRR'
    };
    return defaultProfile;
  }

  /**
   * Update Buyer Preferences
   */
  public updateBuyerPreferences(
    userId: string,
    updates: Partial<BuyerProfile>
  ): BuyerProfile {
    const current = this.getBuyerProfile(userId);
    const updated: BuyerProfile = {
      ...current,
      ...updates,
      userId
    };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`${STORAGE_BUYER_PROFILE_PREFIX}${userId}`, JSON.stringify(updated));
      }
    } catch {
      // Storage safety
    }
    return updated;
  }
}

export const buyerService = new BuyerService();
