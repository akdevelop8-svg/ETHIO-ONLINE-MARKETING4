/**
 * EOM Marketplace & Moderation Service
 * Phase 2 - 8: Platform Operations & Moderation Architecture
 * Enforces the strict rule:
 * SELLER SUBMISSION -> PENDING REVIEW -> ADMIN REVIEW -> APPROVED -> VISIBLE IN PUBLIC MARKETPLACE
 */

import { 
  Listing, 
  ListingStatus, 
  ListingModerationStatus, 
  ModerationAction, 
  ModerationHistoryEntry, 
  MarketplaceFilters, 
  User 
} from '../../types';
import { SAMPLE_INITIAL_LISTINGS } from '../../constants';
import { authService } from '../auth/authService';
import { auditService } from '../audit/auditService';
import { notificationService } from '../notifications/notificationService';
import { listingRepository, ListingRepository } from '../persistence';

const STORAGE_LISTINGS_KEY = 'eom_listings_vault_v2';

class ListingService {
  private repo: ListingRepository;
  private listings: Listing[] = [];
  private isInitialized = false;

  constructor(repo: ListingRepository = listingRepository) {
    this.repo = repo;
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    try {
      const stored = this.repo.findAll();
      if (stored && stored.length > 0) {
        this.listings = stored.map((item) => {
          const isSeed = 
            item.isSeedData === true || 
            item.isDemo === true || 
            item.id.startsWith('demo-') || 
            item.id.startsWith('list-seed') || 
            item.id.startsWith('list-mod');
          return isSeed ? { ...item, isSeedData: true, isDemo: true } : item;
        });
      } else {
        this.listings = SAMPLE_INITIAL_LISTINGS.map((item) => ({
          ...item,
          isSeedData: true,
          isDemo: true
        }));
        this.persist();
      }
    } catch {
      this.listings = SAMPLE_INITIAL_LISTINGS.map((item) => ({
        ...item,
        isSeedData: true,
        isDemo: true
      }));
    }
    this.isInitialized = true;
  }

  private persist() {
    try {
      this.repo.saveAll(this.listings);
    } catch {
      // Storage safety
    }
  }

  /**
   * PUBLIC MARKETPLACE QUERY (Strict Boundary)
   * NEVER returns pending, under review, rejected, suspended, or seed/demo listings.
   */
  public getPublicApprovedListings(filters?: MarketplaceFilters): Listing[] {
    this.init();
    let results = this.listings.filter((item) => {
      const isApproved = item.moderationStatus === 'APPROVED';
      // Keep approved listings visible with a clear lifecycle badge:
      // ACTIVE -> ON_PROGRESS -> SOLD. Only ACTIVE listings are buyable.
      const isMarketplaceStatus = ['ACTIVE', 'ON_PROGRESS', 'SOLD'].includes(item.status);
      const isDemo = item.isSeedData === true || item.isDemo === true || item.id.startsWith('demo-') || item.id.startsWith('list-seed') || item.id.startsWith('list-mod');
      return isApproved && isMarketplaceStatus && !isDemo;
    });

    if (!filters) return results;

    if (filters.platform && filters.platform !== 'all') {
      results = results.filter((item) => item.platform === filters.platform);
    }
    if (filters.category && filters.category !== 'all' && filters.category !== 'All') {
      results = results.filter((item) => item.category === filters.category);
    }
    if (filters.searchKeyword && filters.searchKeyword.trim()) {
      const q = filters.searchKeyword.toLowerCase().trim();
      results = results.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.handle.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    }

    if (filters.sortBy === 'price_asc') {
      results.sort((a, b) => a.priceETB - b.priceETB);
    } else if (filters.sortBy === 'price_desc') {
      results.sort((a, b) => b.priceETB - a.priceETB);
    } else if (filters.sortBy === 'newest') {
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (filters.sortBy === 'followers_desc') {
      results.sort((a, b) => b.followersCount - a.followersCount);
    }

    return results;
  }

  public getListings(filters?: MarketplaceFilters): Listing[] {
    return this.getPublicApprovedListings(filters);
  }

  public getCategories(): string[] {
    this.init();
    const categoriesSet = new Set<string>();
    this.listings.forEach((l) => {
      if (l.category) categoriesSet.add(l.category);
    });
    return Array.from(categoriesSet);
  }

  /**
   * ADMIN QUERY: Get all platform listings with moderation status
   */
  public getAllListingsForAdmin(
    requestingUser: User | null,
    filter?: {
      moderationStatus?: ListingModerationStatus | 'ALL';
      platform?: string;
      searchQuery?: string;
    }
  ): Listing[] {
    const authCheck = authService.checkAdminAccess(requestingUser);
    if (!authCheck.granted) {
      throw new Error(authCheck.reason || 'Unauthorized: Admin privileges required.');
    }

    this.init();
    let results = [...this.listings];

    if (filter) {
      if (filter.moderationStatus && filter.moderationStatus !== 'ALL') {
        results = results.filter((l) => l.moderationStatus === filter.moderationStatus);
      }
      if (filter.platform && filter.platform !== 'all' && filter.platform !== 'ALL') {
        results = results.filter((l) => l.platform === filter.platform);
      }
      if (filter.searchQuery && filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase().trim();
        results = results.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.handle.toLowerCase().includes(q) ||
            l.sellerName.toLowerCase().includes(q) ||
            (l.sellerTelegram && l.sellerTelegram.toLowerCase().includes(q)) ||
            l.id.toLowerCase().includes(q)
        );
      }
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results;
  }

  /**
   * Get listings created by a specific seller
   */
  public getListingsBySeller(sellerId: string): Listing[] {
    this.init();
    return this.listings.filter((l) => l.sellerId === sellerId);
  }

  /**
   * Get single listing by ID
   */
  public getListingById(id: string, requestingUser?: User | null): Listing | null {
    this.init();
    const item = this.listings.find((l) => l.id === id);
    if (!item) return null;

    const isAdmin = requestingUser && (requestingUser.authRole === 'admin' || requestingUser.role === 'ADMIN');
    const isOwner = requestingUser && requestingUser.id === item.sellerId;

    const isPubliclyAvailable =
      item.moderationStatus === 'APPROVED' &&
      ['ACTIVE', 'ON_PROGRESS', 'SOLD'].includes(item.status) && 
      item.isSeedData !== true && 
      item.isDemo !== true &&
      !item.id.startsWith('demo-') && 
      !item.id.startsWith('list-seed');

    if (!isPubliclyAvailable && !isAdmin && !isOwner) {
      return null;
    }

    return item;
  }

  /**
   * Internal authoritative listing lookup by ID
   */
  public getRawListingById(id: string): Listing | null {
    this.init();
    return this.listings.find((l) => l.id === id) || null;
  }

  /**
   * Mark an approved listing as ON_PROGRESS while an active purchase/escrow
   * is being processed. The listing remains visible but cannot be purchased
   * by another buyer.
   */
  public markListingInProgress(listingId: string): Listing | null {
    this.init();
    const listing = this.listings.find((l) => l.id === listingId);
    if (!listing) return null;
    if (listing.status === 'SOLD') return listing;
    listing.status = 'ON_PROGRESS';
    listing.updatedAt = new Date().toISOString();
    this.persist();
    return listing;
  }

  /**
   * Return a cancelled/rejected purchase listing to the marketplace.
   */
  public restoreListingToActive(listingId: string): Listing | null {
    this.init();
    const listing = this.listings.find((l) => l.id === listingId);
    if (!listing) return null;
    if (listing.moderationStatus === 'APPROVED' && listing.status !== 'SOLD') {
      listing.status = 'ACTIVE';
      listing.updatedAt = new Date().toISOString();
      this.persist();
    }
    return listing;
  }

  /**
   * Mark a listing as SOLD upon order completion
   */
  public markListingSold(listingId: string): Listing | null {
    this.init();
    const listing = this.listings.find((l) => l.id === listingId);
    if (!listing) return null;

    const timestamp = new Date().toISOString();
    listing.status = 'SOLD';
    listing.updatedAt = timestamp;
    this.persist();

    auditService.log({
      actorId: 'system',
      actorName: 'EOM Escrow Engine',
      actorRole: 'ADMIN',
      action: 'LISTING_MARKED_SOLD',
      entityType: 'LISTING',
      entityId: listing.id,
      details: `Listing "${listing.title}" (${listing.id}) marked as SOLD.`
    });

    return listing;
  }

  /**
   * SELLER DRAFT: Save incomplete channel listing as DRAFT
   */
  public saveDraft(
    seller: User,
    data: {
      id?: string;
      platform: Listing['platform'];
      title: string;
      handle: string;
      channelUrl: string;
      category: Listing['category'];
      description?: string;
      followersCount?: number;
      subscribersCount?: number;
      averageViews?: number;
      averageLikes?: number;
      isMonetized?: boolean;
      priceETB?: number;
      analyticsScreenshotUrl?: string;
      sellerTelegram?: string;
      sellerPhone?: string;
    }
  ): Listing {
    if (!seller || !seller.id) {
      throw new Error('Authentication required to save drafts.');
    }
    this.init();
    const timestamp = new Date().toISOString();

    if (data.id) {
      const existing = this.listings.find((l) => l.id === data.id);
      if (existing) {
        if (existing.sellerId !== seller.id) {
          throw new Error('Unauthorized: You cannot modify another seller\'s draft.');
        }
        existing.platform = data.platform;
        existing.title = data.title.trim() || 'Untitled Channel Draft';
        existing.handle = data.handle.trim();
        existing.channelUrl = data.channelUrl.trim();
        existing.category = data.category;
        existing.description = data.description?.trim() || '';
        existing.followersCount = Number(data.followersCount) || 0;
        existing.subscribersCount = data.subscribersCount;
        existing.averageViews = data.averageViews;
        existing.averageLikes = data.averageLikes;
        existing.isMonetized = Boolean(data.isMonetized);
        existing.priceETB = Number(data.priceETB) || 0;
        existing.analyticsScreenshotUrl = data.analyticsScreenshotUrl;
        existing.sellerTelegram = data.sellerTelegram;
        existing.sellerPhone = data.sellerPhone || seller.phone;
        existing.updatedAt = timestamp;
        this.persist();
        return existing;
      }
    }

    const newListingId = `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const draftListing: Listing = {
      id: newListingId,
      sellerId: seller.id,
      sellerName: seller.fullName || seller.username || 'EOM Verified Seller',
      sellerEmail: seller.email,
      sellerPhone: data.sellerPhone || seller.phone,
      sellerTelegram: data.sellerTelegram,
      platform: data.platform,
      title: data.title.trim() || 'Untitled Channel Draft',
      handle: data.handle.trim(),
      channelUrl: data.channelUrl.trim(),
      category: data.category,
      description: data.description?.trim() || '',
      followersCount: Number(data.followersCount) || 0,
      subscribersCount: data.subscribersCount,
      averageViews: data.averageViews,
      averageLikes: data.averageLikes,
      isMonetized: Boolean(data.isMonetized),
      priceETB: Number(data.priceETB) || 0,
      priceRating: 'GOOD_PRICE',
      isNew: true,
      status: 'DRAFT',
      isSeedData: false,
      isDemo: false,
      analyticsScreenshotUrl: data.analyticsScreenshotUrl,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.listings.unshift(draftListing);
    this.persist();

    auditService.log({
      actorId: seller.id,
      actorName: seller.fullName || seller.email,
      actorRole: seller.role,
      action: 'LISTING_DRAFT_SAVED',
      entityType: 'LISTING',
      entityId: draftListing.id,
      details: `Saved draft for ${data.platform} channel "${draftListing.title}".`
    });

    return draftListing;
  }

  /**
   * SELLER EDIT: Update a seller's own listing
   */
  public updateSellerListing(
    seller: User,
    listingId: string,
    updates: {
      platform?: Listing['platform'];
      title?: string;
      handle?: string;
      channelUrl?: string;
      category?: Listing['category'];
      description?: string;
      followersCount?: number;
      subscribersCount?: number;
      averageViews?: number;
      averageLikes?: number;
      accountAgeMonths?: number;
      isMonetized?: boolean;
      priceETB?: number;
      analyticsScreenshotUrl?: string;
      profileImageUrl?: string;
      sellerTelegram?: string;
      sellerPhone?: string;
    }
  ): Listing {
    if (!seller || !seller.id) {
      throw new Error('Authentication required.');
    }
    this.init();
    const listing = this.listings.find((l) => l.id === listingId);
    if (!listing) {
      throw new Error(`Listing "${listingId}" not found.`);
    }
    if (listing.sellerId !== seller.id) {
      throw new Error('Unauthorized: You cannot edit another seller\'s listing.');
    }

    const timestamp = new Date().toISOString();
    if (updates.platform) listing.platform = updates.platform;
    if (updates.title) listing.title = updates.title.trim();
    if (updates.handle) listing.handle = updates.handle.trim();
    if (updates.channelUrl) listing.channelUrl = updates.channelUrl.trim();
    if (updates.category) listing.category = updates.category;
    if (updates.description !== undefined) listing.description = updates.description.trim();
    if (updates.followersCount !== undefined) {
      if (isNaN(Number(updates.followersCount)) || Number(updates.followersCount) < 0) throw new Error('Valid followers count is required.');
      listing.followersCount = Number(updates.followersCount);
    }
    if (updates.subscribersCount !== undefined) listing.subscribersCount = updates.subscribersCount;
    if (updates.averageViews !== undefined) listing.averageViews = updates.averageViews;
    if (updates.averageLikes !== undefined) listing.averageLikes = updates.averageLikes;
    if (updates.isMonetized !== undefined) listing.isMonetized = Boolean(updates.isMonetized);
    if (updates.priceETB !== undefined) {
      if (isNaN(Number(updates.priceETB)) || Number(updates.priceETB) <= 0) throw new Error('Valid price greater than 0 ETB is required.');
      listing.priceETB = Number(updates.priceETB);
      if (listing.priceETB < 25000) listing.priceRating = 'VERY_GOOD_PRICE';
      else if (listing.priceETB > 100000) listing.priceRating = 'MEDIUM_PRICE';
      else listing.priceRating = 'GOOD_PRICE';
    }
    if (updates.analyticsScreenshotUrl !== undefined) listing.analyticsScreenshotUrl = updates.analyticsScreenshotUrl;
    if (updates.profileImageUrl !== undefined) listing.profileImageUrl = updates.profileImageUrl;
    if (updates.accountAgeMonths !== undefined) listing.accountAgeMonths = updates.accountAgeMonths;
    if (updates.sellerTelegram !== undefined) listing.sellerTelegram = updates.sellerTelegram;
    if (updates.sellerPhone !== undefined) listing.sellerPhone = updates.sellerPhone;

    listing.updatedAt = timestamp;
    this.persist();

    auditService.log({
      actorId: seller.id,
      actorName: seller.fullName || seller.email,
      actorRole: seller.role,
      action: 'LISTING_UPDATED',
      entityType: 'LISTING',
      entityId: listing.id,
      details: `Updated listing "${listing.title}" (${listing.handle}).`
    });

    return listing;
  }

  /**
   * SELLER SUBMIT DRAFT / RESUBMIT
   */
  public submitDraftForReview(seller: User, listingId: string): Listing {
    if (!seller || !seller.id) {
      throw new Error('Authentication required.');
    }
    this.init();
    const listing = this.listings.find((l) => l.id === listingId);
    if (!listing) {
      throw new Error(`Listing "${listingId}" not found.`);
    }
    if (listing.sellerId !== seller.id) {
      throw new Error('Unauthorized: You cannot submit another seller\'s listing.');
    }
    if (!listing.title || !listing.handle || !listing.channelUrl || !listing.priceETB) {
      throw new Error('Please complete all required fields (title, handle, URL, price) before submitting.');
    }

    const timestamp = new Date().toISOString();
    const isResubmission = listing.status === 'CHANGES_REQUESTED';
    listing.status = 'PENDING_REVIEW';
    listing.moderationStatus = 'PENDING_REVIEW';
    listing.updatedAt = timestamp;

    if (!listing.moderationHistory) {
      listing.moderationHistory = [];
    }

    listing.moderationHistory.push({
      id: `hist-${Date.now()}`,
      adminId: 'system',
      adminUsername: 'System',
      action: isResubmission ? 'RESUBMITTED' : 'SUBMITTED',
      reason: isResubmission ? 'Seller provided updated details and resubmitted for verification.' : 'Draft submitted for admin verification.',
      timestamp
    });

    this.persist();

    auditService.log({
      actorId: seller.id,
      actorName: seller.fullName || seller.email,
      actorRole: seller.role,
      action: isResubmission ? 'LISTING_RESUBMITTED' : 'LISTING_SUBMITTED',
      entityType: 'LISTING',
      entityId: listing.id,
      details: `Seller ${seller.fullName || seller.email} submitted ${listing.platform} channel "${listing.title}" for review.`
    });

    notificationService.dispatch({
      targetUserId: 'ADMIN',
      type: 'LISTING_SUBMITTED',
      title: 'Listing Pending Review',
      message: `${seller.fullName || seller.email} submitted ${listing.platform} channel "${listing.title}" for review.`,
      referenceId: listing.id,
      referenceType: 'listing'
    });

    return listing;
  }

  /**
   * SELLER DELETE
   */
  public deleteSellerListing(seller: User, listingId: string): boolean {
    if (!seller || !seller.id) {
      throw new Error('Authentication required.');
    }
    this.init();
    const index = this.listings.findIndex((l) => l.id === listingId);
    if (index === -1) return false;

    const listing = this.listings[index];
    if (listing.sellerId !== seller.id) {
      throw new Error('Unauthorized: You cannot delete another seller\'s listing.');
    }

    if (listing.status === 'ACTIVE' && listing.moderationStatus === 'APPROVED') {
      throw new Error('Approved live listings cannot be deleted directly. Contact Admin support.');
    }

    this.listings.splice(index, 1);
    this.persist();

    auditService.log({
      actorId: seller.id,
      actorName: seller.fullName || seller.email,
      actorRole: seller.role,
      action: 'SELLER_LISTING_DELETED',
      entityType: 'LISTING',
      entityId: listingId,
      details: `Seller deleted listing "${listing.title}" (${listing.id}).`
    });

    return true;
  }

  /**
   * SELLER SUBMISSION: Submit a new listing for Admin Moderation
   */
  public submitListing(
    seller: User,
    data: {
      platform: Listing['platform'];
      title: string;
      handle: string;
      channelUrl: string;
      category: Listing['category'];
      description: string;
      followersCount: number;
      subscribersCount?: number;
      averageViews?: number;
      averageLikes?: number;
      accountAgeMonths?: number;
      isMonetized: boolean;
      priceETB: number;
      analyticsScreenshotUrl?: string;
      profileImageUrl?: string;
      sellerTelegram?: string;
      sellerPhone?: string;
    }
  ): Listing {
    this.init();
    
    if (!data.title || !data.title.trim()) throw new Error('Listing title is required.');
    if (!data.handle || !data.handle.trim()) throw new Error('Channel/Account handle is required.');
    if (!data.channelUrl || !data.channelUrl.trim()) throw new Error('Channel URL is required.');
    if (!data.priceETB || isNaN(Number(data.priceETB)) || Number(data.priceETB) <= 0) {
      throw new Error('Valid price greater than 0 ETB is required.');
    }
    if (!data.followersCount || isNaN(Number(data.followersCount)) || Number(data.followersCount) < 0) {
      throw new Error('Valid followers count is required.');
    }

    const timestamp = new Date().toISOString();
    const newListingId = `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    let priceRating: Listing['priceRating'] = 'GOOD_PRICE';
    if (data.priceETB < 25000) priceRating = 'VERY_GOOD_PRICE';
    else if (data.priceETB > 100000) priceRating = 'MEDIUM_PRICE';

    const newListing: Listing = {
      id: newListingId,
      sellerId: seller.id,
      sellerName: seller.fullName || seller.username || 'EOM Verified Seller',
      sellerEmail: seller.email,
      sellerPhone: data.sellerPhone || seller.phone,
      sellerTelegram: data.sellerTelegram,
      platform: data.platform,
      title: data.title.trim(),
      handle: data.handle.trim(),
      channelUrl: data.channelUrl.trim(),
      category: data.category,
      description: data.description.trim(),
      followersCount: Number(data.followersCount) || 0,
      subscribersCount: data.subscribersCount,
      averageViews: data.averageViews,
      averageLikes: data.averageLikes,
      accountAgeMonths: data.accountAgeMonths,
      isMonetized: Boolean(data.isMonetized),
      priceETB: Number(data.priceETB),
      priceRating,
      isNew: true,
      status: 'PENDING_REVIEW',
      moderationStatus: 'PENDING_REVIEW',
      isSeedData: false,
      isDemo: false,
      analyticsScreenshotUrl: data.analyticsScreenshotUrl,
      profileImageUrl: data.profileImageUrl,
      moderationHistory: [
        {
          id: `hist-${Date.now()}`,
          adminId: 'system',
          adminUsername: 'System',
          action: 'SUBMITTED',
          reason: 'Listing submitted for ownership and analytics verification.',
          timestamp
        }
      ],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.listings.unshift(newListing);
    this.persist();

    auditService.log({
      actorId: seller.id,
      actorName: seller.fullName || seller.email,
      actorRole: seller.role,
      action: 'LISTING_SUBMITTED',
      entityType: 'LISTING',
      entityId: newListing.id,
      details: `Submitted ${data.platform} listing "${data.title}" (${data.handle}) for Admin verification.`,
      metadata: {
        platform: data.platform,
        priceETB: data.priceETB,
        followers: data.followersCount
      }
    });

    notificationService.dispatch({
      targetUserId: 'ADMIN',
      type: 'LISTING_SUBMITTED',
      title: 'New Listing Pending Review',
      message: `${seller.fullName || seller.email} submitted ${data.platform} channel "${data.title}" for review.`,
      referenceId: newListing.id,
      referenceType: 'listing'
    });

    return newListing;
  }

  public createListing = this.submitListing.bind(this);

  /**
   * ADMIN MODERATION ACTION: Approve, Reject, or Request Changes
   */
  public moderateListing(
    adminUser: User | null,
    listingId: string,
    action: ModerationAction,
    options?: {
      reason?: string;
      adminNotes?: string;
    }
  ): Listing {
    const authCheck = authService.checkAdminAccess(adminUser);
    if (!authCheck.granted || !adminUser) {
      throw new Error(authCheck.reason || 'Unauthorized: Admin privileges required.');
    }

    this.init();
    const listing = this.listings.find((l) => l.id === listingId);
    if (!listing) {
      throw new Error(`Listing with ID "${listingId}" not found.`);
    }

    const timestamp = new Date().toISOString();
    const adminHandle = adminUser.username || `@${adminUser.fullName?.replace(/\s+/g, '_').toLowerCase()}` || 'Admin';

    if (!listing.moderationHistory) {
      listing.moderationHistory = [];
    }

    if (action === 'APPROVE') {
      listing.moderationStatus = 'APPROVED';
      listing.status = 'ACTIVE';
      listing.adminNotes = options?.adminNotes || 'Approved by administrator.';
      listing.rejectionReason = undefined;
      listing.moderationHistory.push({
        id: `hist-${Date.now()}`,
        adminId: adminUser.id,
        adminUsername: adminHandle,
        action: 'APPROVED',
        reason: options?.adminNotes || 'Channel authenticity and metrics verified.',
        timestamp
      });

      auditService.log({
        actorId: adminUser.id,
        actorName: adminUser.fullName || adminHandle,
        actorRole: 'ADMIN',
        action: 'LISTING_APPROVED',
        entityType: 'LISTING',
        entityId: listing.id,
        details: `Approved listing "${listing.title}" (${listing.handle}) on ${listing.platform}.`,
        metadata: {
          priceETB: listing.priceETB,
          platform: listing.platform
        }
      });

      notificationService.dispatch({
        targetUserId: listing.sellerId,
        type: 'LISTING_APPROVED',
        title: 'Listing Approved & Live!',
        message: `Your listing "${listing.title}" has been approved and is now active on the public Marketplace.`,
        referenceId: listing.id,
        referenceType: 'listing'
      });
    } else if (action === 'REJECT') {
      listing.moderationStatus = 'REJECTED';
      listing.status = 'REJECTED';
      listing.rejectionReason = options?.reason || 'Listing does not meet EOM quality and ownership criteria.';
      listing.adminNotes = options?.adminNotes;
      listing.moderationHistory.push({
        id: `hist-${Date.now()}`,
        adminId: adminUser.id,
        adminUsername: adminHandle,
        action: 'REJECTED',
        reason: options?.reason || 'Listing rejected during admin review.',
        timestamp
      });

      auditService.log({
        actorId: adminUser.id,
        actorName: adminUser.fullName || adminHandle,
        actorRole: 'ADMIN',
        action: 'LISTING_REJECTED',
        entityType: 'LISTING',
        entityId: listing.id,
        details: `Rejected listing "${listing.title}". Reason: ${options?.reason || 'Policy violation'}`,
        status: 'WARNING',
        metadata: {
          reason: options?.reason
        }
      });

      notificationService.dispatch({
        targetUserId: listing.sellerId,
        type: 'LISTING_REJECTED',
        title: 'Listing Rejected',
        message: `Your listing "${listing.title}" was not approved. Reason: ${options?.reason || 'Check moderation notes.'}`,
        referenceId: listing.id,
        referenceType: 'listing'
      });
    } else if (action === 'REQUEST_CHANGES') {
      listing.moderationStatus = 'CHANGES_REQUESTED';
      listing.status = 'CHANGES_REQUESTED';
      listing.adminNotes = options?.reason || 'Additional verification required.';
      listing.rejectionReason = options?.reason;
      listing.moderationHistory.push({
        id: `hist-${Date.now()}`,
        adminId: adminUser.id,
        adminUsername: adminHandle,
        action: 'CHANGES_REQUESTED',
        reason: options?.reason || 'Please provide updated screenshots or handle proof.',
        timestamp
      });

      auditService.log({
        actorId: adminUser.id,
        actorName: adminUser.fullName || adminHandle,
        actorRole: 'ADMIN',
        action: 'LISTING_CHANGES_REQUESTED',
        entityType: 'LISTING',
        entityId: listing.id,
        details: `Requested changes on "${listing.title}": ${options?.reason}`,
        status: 'WARNING',
        metadata: {
          requestedChanges: options?.reason
        }
      });

      notificationService.dispatch({
        targetUserId: listing.sellerId,
        type: 'LISTING_CHANGES_REQUESTED',
        title: 'Action Required on Listing',
        message: `Admin requested changes for "${listing.title}": ${options?.reason || 'Please review notes.'}`,
        referenceId: listing.id,
        referenceType: 'listing'
      });
    }

    listing.updatedAt = timestamp;
    this.persist();
    return listing;
  }

  /**
   * ADMIN DELETE LISTING
   */
  public deleteListing(adminUser: User | null, listingId: string): boolean {
    const authCheck = authService.checkAdminAccess(adminUser);
    if (!authCheck.granted || !adminUser) {
      throw new Error(authCheck.reason || 'Unauthorized: Admin privileges required.');
    }
    this.init();
    const index = this.listings.findIndex((l) => l.id === listingId);
    if (index === -1) return false;

    const removed = this.listings.splice(index, 1)[0];
    this.persist();

    auditService.log({
      actorId: adminUser.id,
      actorName: adminUser.fullName || 'Admin',
      actorRole: 'ADMIN',
      action: 'LISTING_DELETED',
      entityType: 'LISTING',
      entityId: listingId,
      details: `Deleted listing "${removed.title}" (${removed.handle}) permanently.`
    });

    return true;
  }
}

export const listingService = new ListingService();
