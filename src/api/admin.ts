import { Router } from 'express';
import { pool } from '../db/pg.js';
import { transactionService } from '../services/transactions/transactionService.js';
import { authService } from '../services/auth/authService.js';
import { listingService } from '../services/marketplace/listingService.js';
import { orderService } from '../services/orders/orderService.js';
import { disputeService } from '../services/disputes/disputeService.js';
import { adminService } from '../services/admin/adminService.js';
import { auditRepository, defaultStorageAdapter } from '../services/persistence/index.js';
import { auditService } from '../services/audit/auditService.js';
import { adminActionLogger } from '../services/audit/adminActionLogger.js';
import { PaymentProviderRegistry } from '../services/payments/paymentProvider.js';
import { webhookEventRepository } from '../services/payments/webhookService.js';
import { User } from '../types/index.js';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/authMiddleware.js';

export const adminRouter = Router();

adminRouter.get('/stats', requireAuth, requireAdmin, async (req: AuthRequest, res: any) => {
  try {
    const stats = adminService.getDashboardMetrics(req.user as User);

    // User registration is stored in the normalized PostgreSQL users table.
    // The domain services intentionally use backend_storage, so their in-memory
    // legacy auth vault must not be used as the production customer count.
    if (pool) {
      const result = await pool.query(`
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_users
        FROM users
      `);
      stats.totalUsers = Number(result.rows[0]?.total_users ?? 0);
      stats.activeUsers = Number(result.rows[0]?.active_users ?? 0);
    }

    res.json(stats);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get('/users', requireAuth, requireAdmin, async (req: AuthRequest, res: any) => {
  try {
    if (pool) {
      const result = await pool.query(`SELECT id, email, normalized_phone, full_name, username, role, auth_role, is_verified, email_verified, phone_verified, is_active, avatar_url, wallet_balance_etb, locked_balance_etb, created_at, updated_at FROM users ORDER BY created_at DESC`);
      return res.json(result.rows.map((row) => ({
        id: row.id, email: row.email, phone: row.normalized_phone, fullName: row.full_name, username: row.username,
        role: row.role, authRole: row.auth_role, isVerified: Boolean(row.is_verified), emailVerified: Boolean(row.email_verified),
        phoneVerified: Boolean(row.phone_verified), isActive: Boolean(row.is_active), avatarUrl: row.avatar_url || undefined,
        walletBalanceETB: Number(row.wallet_balance_etb || 0), lockedBalanceETB: Number(row.locked_balance_etb || 0),
        createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString()
      })));
    }
    return res.json(authService.getAllUsersForAdmin(req.user as User));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get('/listings', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const listings = listingService.getAllListingsForAdmin(req.user as User);
    res.json(listings);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get('/orders', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const orders = orderService.getAllOrdersForAdmin(req.user as User);
    res.json(orders);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get('/transactions', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const txs = transactionService.getAllTransactionsForAdmin(req.user as User);
    res.json(txs);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get('/escrow', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const txs = transactionService.getAllTransactionsForAdmin(req.user as User);
    const locked = txs.filter((t) => t.status === 'PAYMENT_VERIFIED');
    res.json(locked);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get('/disputes', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const disputes = defaultStorageAdapter.getAll('disputes');
    res.json(disputes);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get('/payment-verifications', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const verifications = defaultStorageAdapter.getAll('payment_verifications');
    res.json(verifications);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get('/providers', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const statuses = PaymentProviderRegistry.getAllProviderStatuses();
    res.json(statuses);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get('/webhooks', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const events = webhookEventRepository.findAll();
    res.json(events);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get('/audit', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const logs = auditRepository.findAll();
    res.json(logs);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.get('/actions', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const { adminIdentifier, actionType, targetEntityType, status } = req.query as any;
    const actions = adminActionLogger.getActions({
      adminIdentifier,
      actionType,
      targetEntityType,
      status
    });
    res.json(actions);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post('/users/:id/toggle-active', requireAuth, requireAdmin, async (req: AuthRequest, res: any) => {
  try {
    const adminUser = req.user as User;
    let user: User;
    if (pool) {
      const current = await pool.query(`SELECT id, email, normalized_phone, full_name, username, role, auth_role, is_verified, email_verified, phone_verified, is_active, avatar_url, wallet_balance_etb, locked_balance_etb, created_at, updated_at FROM users WHERE id = $1`, [req.params.id]);
      if (!current.rows.length) return res.status(404).json({ error: 'User not found.' });
      const row = current.rows[0];
      if (row.id === adminUser.id && row.is_active) return res.status(400).json({ error: 'You cannot deactivate your own administrative account.' });
      const updated = await pool.query(`UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, email, normalized_phone, full_name, username, role, auth_role, is_verified, email_verified, phone_verified, is_active, avatar_url, wallet_balance_etb, locked_balance_etb, created_at, updated_at`, [req.params.id]);
      const u = updated.rows[0];
      user = { id: u.id, email: u.email, phone: u.normalized_phone, fullName: u.full_name, username: u.username, role: u.role, authRole: u.auth_role, isVerified: Boolean(u.is_verified), emailVerified: Boolean(u.email_verified), phoneVerified: Boolean(u.phone_verified), isActive: Boolean(u.is_active), avatarUrl: u.avatar_url || undefined, walletBalanceETB: Number(u.wallet_balance_etb || 0), lockedBalanceETB: Number(u.locked_balance_etb || 0), createdAt: new Date(u.created_at).toISOString(), updatedAt: new Date(u.updated_at).toISOString() };
    } else {
      user = authService.toggleUserActiveStatus(adminUser, req.params.id);
    }

    adminActionLogger.logAction({
      admin: adminUser, actionType: 'USER_STATUS_CHANGE', targetEntityType: 'USER', targetEntityId: req.params.id,
      details: `Admin ${adminUser.username || adminUser.email} set active status of user ${req.params.id} to ${user.isActive}`
    });
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post('/users/:id/toggle-verification', requireAuth, requireAdmin, async (req: AuthRequest, res: any) => {
  try {
    const adminUser = req.user as User;
    let user: User;
    if (pool) {
      const updated = await pool.query(`UPDATE users SET is_verified = NOT is_verified, email_verified = NOT email_verified, updated_at = NOW() WHERE id = $1 RETURNING id, email, normalized_phone, full_name, username, role, auth_role, is_verified, email_verified, phone_verified, is_active, avatar_url, wallet_balance_etb, locked_balance_etb, created_at, updated_at`, [req.params.id]);
      if (!updated.rows.length) return res.status(404).json({ error: 'User not found.' });
      const u = updated.rows[0];
      user = { id: u.id, email: u.email, phone: u.normalized_phone, fullName: u.full_name, username: u.username, role: u.role, authRole: u.auth_role, isVerified: Boolean(u.is_verified), emailVerified: Boolean(u.email_verified), phoneVerified: Boolean(u.phone_verified), isActive: Boolean(u.is_active), avatarUrl: u.avatar_url || undefined, walletBalanceETB: Number(u.wallet_balance_etb || 0), lockedBalanceETB: Number(u.locked_balance_etb || 0), createdAt: new Date(u.created_at).toISOString(), updatedAt: new Date(u.updated_at).toISOString() };
    } else {
      user = authService.toggleUserVerification(adminUser, req.params.id);
    }

    adminActionLogger.logAction({
      admin: adminUser, actionType: 'USER_VERIFICATION_CHANGE', targetEntityType: 'USER', targetEntityId: req.params.id,
      details: `Admin ${adminUser.username || adminUser.email} set verification status of user ${req.params.id} to ${user.isVerified}`
    });
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.delete('/listings/:id', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const adminUser = req.user as User;
    const deleted = listingService.deleteListing(adminUser, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Listing not found.' });
    adminActionLogger.logAction({
      admin: adminUser,
      actionType: 'LISTING_EDIT',
      targetEntityType: 'LISTING',
      targetEntityId: req.params.id,
      details: `Admin ${adminUser.username || adminUser.email} removed listing ${req.params.id} from the marketplace.`
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post('/listings/:id/moderate', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const adminUser = req.user as User;
    const { action, notes } = req.body;
    const listing = listingService.moderateListing(adminUser, req.params.id, action, { reason: notes, adminNotes: notes });

    if (action === 'APPROVE') {
      adminActionLogger.logListingApproval(adminUser, listing.id, listing.title, { notes });
    } else if (action === 'REJECT') {
      adminActionLogger.logListingRejection(adminUser, listing.id, listing.title, notes || 'Rejected by moderator', { notes });
    } else {
      adminActionLogger.logAction({
        admin: adminUser,
        actionType: 'LISTING_EDIT',
        targetEntityType: 'LISTING',
        targetEntityId: req.params.id,
        details: `Admin ${adminUser.username || adminUser.email} moderated listing ${req.params.id} with action "${action}". Notes: ${notes || 'N/A'}`
      });
    }

    res.json(listing);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post('/orders/:id/status', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const adminUser = req.user as User;
    const { status } = req.body;
    const order = orderService.updateOrderStatus(adminUser, req.params.id, status);

    adminActionLogger.logAction({
      admin: adminUser,
      actionType: 'COMMISSION_SETTLEMENT',
      targetEntityType: 'ORDER',
      targetEntityId: req.params.id,
      details: `Admin ${adminUser.username || adminUser.email} updated order ${req.params.id} status to ${status}`
    });

    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post('/disputes/:id/arbitrate', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const adminUser = req.user as User;
    const { outcome, resolutionNotes, adminNotes, resolution, finalOutcome } = req.body;
    const selectedOutcome = outcome || finalOutcome;
    const selectedNotes = resolutionNotes || adminNotes || resolution;
    const dispute = disputeService.arbitrateDisputeAsAdmin(adminUser, req.params.id, {
      outcome: selectedOutcome,
      resolutionNotes: selectedNotes
    });

    adminActionLogger.logDisputeArbitration(adminUser, req.params.id, selectedOutcome, selectedNotes);

    res.json(dispute);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post('/disputes/:id/request-evidence', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const adminUser = req.user as User;
    const { target, directive } = req.body;
    const dispute = disputeService.requestEvidenceAsAdmin(adminUser, req.params.id, target, directive);

    adminActionLogger.logAction({
      admin: adminUser,
      actionType: 'DISPUTE_EVIDENCE_REQUEST',
      targetEntityType: 'DISPUTE',
      targetEntityId: req.params.id,
      details: `Admin ${adminUser.username || adminUser.email} requested evidence from ${target} for dispute ${req.params.id}`
    });

    res.json(dispute);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post('/transactions/:id/verify', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const adminUser = req.user as User;
    const { adminNotes } = req.body || {};
    const tx = transactionService.verifyPaymentAsAdmin(adminUser, req.params.id, { adminNotes });

    adminActionLogger.logPaymentVerification(
      adminUser,
      tx.paymentReference || tx.id,
      tx.orderId,
      tx.amountETB,
      tx.paymentMethod || 'ETHIOPIAN_BANK',
      { adminNotes }
    );

    res.json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post('/transactions/:id/reject', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const adminUser = req.user as User;
    const { reason, adminNotes } = req.body;
    const tx = transactionService.rejectPaymentAsAdmin(adminUser, req.params.id, reason, adminNotes);

    adminActionLogger.logPaymentRejection(
      adminUser,
      tx.paymentReference || tx.id,
      tx.orderId,
      reason,
      { adminNotes }
    );

    res.json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post('/transactions/:id/release', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const adminUser = req.user as User;
    const tx = transactionService.completeTransactionAndReleaseEscrow(adminUser, req.params.id);

    adminActionLogger.logEscrowRelease(
      adminUser,
      tx.orderId,
      tx.id,
      tx.sellerPayoutETB,
      tx.platformFeeETB
    );

    res.json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post('/transactions/:id/refund', requireAuth, requireAdmin, (req: AuthRequest, res: any) => {
  try {
    const adminUser = req.user as User;
    const { reason, refundDestinationAccount } = req.body;
    const tx = transactionService.issueRefund(adminUser, req.params.id, reason, refundDestinationAccount);

    adminActionLogger.logAction({
      admin: adminUser,
      actionType: 'REFUND_EXECUTION',
      targetEntityType: 'TRANSACTION',
      targetEntityId: req.params.id,
      details: `Admin ${adminUser.username || adminUser.email} issued refund of ${tx.amountETB.toLocaleString()} ETB for transaction ${req.params.id}. Reason: ${reason}`
    });

    res.json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

