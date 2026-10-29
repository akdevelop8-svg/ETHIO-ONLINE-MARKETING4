/**
 * EOM Admin Analytics & Operational Aggregator Service
 * Phase 2 - 8: Platform Operations & Executive Dashboard
 */

import { AdminDashboardMetrics, User } from '../../types/index.js';
import { authService } from '../auth/authService.js';
import { listingService } from '../marketplace/listingService.js';
import { orderService } from '../orders/orderService.js';
import { transactionService } from '../transactions/transactionService.js';

class AdminService {
  /**
   * Calculate live platform operational metrics
   */
  public getDashboardMetrics(requestingUser: User | null): AdminDashboardMetrics {
    const authCheck = authService.checkAdminAccess(requestingUser);
    if (!authCheck.granted) {
      throw new Error(authCheck.reason || 'Unauthorized: Admin privileges required.');
    }

    const allUsers = authService.getAllUsersForAdmin(requestingUser);
    const allListings = listingService.getAllListingsForAdmin(requestingUser);
    const allOrders = orderService.getAllOrdersForAdmin(requestingUser);
    const allTransactions = transactionService.getAllTransactionsForAdmin(requestingUser);

    const activeUsers = allUsers.filter((u) => u.isActive).length;
    const pendingListings = allListings.filter(
      (l) => l.moderationStatus === 'PENDING_REVIEW' || l.status === 'PENDING_REVIEW'
    ).length;
    const approvedListings = allListings.filter(
      (l) => l.moderationStatus === 'APPROVED' || l.status === 'ACTIVE'
    ).length;
    const rejectedListings = allListings.filter(
      (l) => l.moderationStatus === 'REJECTED' || l.status === 'REJECTED'
    ).length;
    const changesRequestedListings = allListings.filter(
      (l) => l.moderationStatus === 'CHANGES_REQUESTED' || l.status === 'CHANGES_REQUESTED'
    ).length;

    const processingOrders = allOrders.filter((o) => o.status === 'PROCESSING').length;
    const successfulOrders = allOrders.filter((o) => o.status === 'SUCCESS').length;
    const cancelledOrders = allOrders.filter((o) => o.status === 'CANCELLED').length;
    const disputedOrders = allOrders.filter((o) => o.status === 'DISPUTED' || o.escrowStatus === 'DISPUTED').length;

    const pendingPaymentsCount = allTransactions.filter(
      (t) => t.verificationStatus === 'SUBMITTED' || t.status === 'PAYMENT_SUBMITTED'
    ).length;
    const verifiedPaymentsCount = allTransactions.filter(
      (t) => t.verificationStatus === 'VERIFIED' || t.status === 'PAYMENT_VERIFIED'
    ).length;

    let totalSalesVolumeETB = 0;
    let totalPlatformRevenueETB = 0;
    let totalEscrowLockedETB = 0;

    allOrders.forEach((o) => {
      if (o.status === 'SUCCESS') {
        totalSalesVolumeETB += o.amountETB;
        totalPlatformRevenueETB += o.platformFeeETB;
      }
      if (o.status === 'PROCESSING' && o.escrowStatus === 'HELD') {
        totalEscrowLockedETB += o.amountETB;
      }
    });

    return {
      totalUsers: allUsers.length,
      activeUsers,
      pendingListingsCount: pendingListings,
      approvedListingsCount: approvedListings,
      rejectedListingsCount: rejectedListings,
      changesRequestedListingsCount: changesRequestedListings,
      pendingOrdersCount: processingOrders,
      processingOrdersCount: processingOrders,
      successfulOrdersCount: successfulOrders,
      cancelledOrdersCount: cancelledOrders,
      disputedOrdersCount: disputedOrders,
      pendingPaymentsCount,
      verifiedPaymentsCount,
      totalSalesVolumeETB,
      totalPlatformRevenueETB,
      totalEscrowLockedETB
    };
  }
}

export const adminService = new AdminService();
