import { Router, Response } from 'express';
import { listingService } from '../services/marketplace/listingService.js';
import { User } from '../types/index.js';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware.js';

export const listingsRouter = Router();

listingsRouter.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const all = listingService.getPublicApprovedListings();
    res.json(all);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

listingsRouter.get('/seller', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const sellerListings = listingService.getListingsBySeller(user.id);
    res.json(sellerListings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

listingsRouter.get('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const listing = listingService.getListingById(req.params.id, user);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found or access restricted.' });
    }
    res.json(listing);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

listingsRouter.post('/create', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const listing = listingService.submitListing(user, req.body);
    res.json(listing);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

listingsRouter.put('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const rawListing = listingService.getRawListingById(req.params.id);
    if (!rawListing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    const isAdmin = user.role === 'ADMIN' || user.authRole === 'admin';
    const isOwner = rawListing.sellerId === user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized: You can only edit your own listings.' });
    }

    const listing = listingService.updateSellerListing(user, req.params.id, req.body);
    res.json(listing);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

listingsRouter.delete('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const rawListing = listingService.getRawListingById(req.params.id);
    if (!rawListing) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    const isAdmin = user.role === 'ADMIN' || user.authRole === 'admin';
    const isOwner = rawListing.sellerId === user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete your own listings.' });
    }

    listingService.deleteSellerListing(user, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
