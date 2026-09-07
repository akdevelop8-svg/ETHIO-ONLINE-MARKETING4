import { apiClient } from "../api/client";
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CreditCard, 
  ShoppingBag, 
  Store, 
  Users, 
  Activity, 
  DollarSign, 
  Lock, 
  RotateCcw, 
  FileText 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminPaymentsView } from '../components/admin/AdminPaymentsView';
import { AdminOrdersView } from '../components/admin/AdminOrdersView';
import { AdminListingsModerationView } from '../components/admin/AdminListingsModerationView';
import { AdminUsersView } from '../components/admin/AdminUsersView';
import { AdminAuditLogView } from '../components/admin/AdminAuditLogView';
import { AdminDisputesView } from '../components/admin/AdminDisputesView';
import { Tabs } from '../components/common/Tabs';

export const AdminPortalView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'payments' | 'listings' | 'orders' | 'disputes' | 'users' | 'audit'>('payments');
  const [analytics, setAnalytics] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [disputesCount, setDisputesCount] = useState<number>(0);

  const loadAdminData = async () => {
    if (!user) return;
    try {
      const stats = await apiClient.get<any>('/admin/stats');
      const allTx = await apiClient.get<any[]>('/admin/transactions');
      const allOrders = await apiClient.get<any[]>('/admin/orders');
      const allListings = await apiClient.get<any[]>('/admin/listings');
      const allUsers = await apiClient.get<any[]>('/admin/users');
      const allDisputes = await apiClient.get<any[]>('/admin/disputes');

      setAnalytics(stats);
      setTransactions(allTx);
      setOrders(allOrders);
      setListings(allListings);
      setUsers(allUsers);
      setDisputesCount(allDisputes.filter((d: any) => d.status === 'OPEN' || d.status === 'UNDER_MEDIATION' || d.status === 'EVIDENCE_REQUESTED').length);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [user]);

  if (!user || (user.authRole !== 'admin' && user.role !== 'ADMIN')) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-100">Admin Authorization Required</h3>
        <p className="text-xs text-slate-400">
          This portal is restricted to official ኢትዮ Online Market administrators (@mr_ebek & @EXO_SMM) for authoritative payment verification, dispute settlement, and escrow release.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: 'payments', label: `Payments (${transactions.filter((t) => t.status === 'PAYMENT_SUBMITTED').length})` },
    { id: 'disputes', label: `Disputes (${disputesCount})` },
    { id: 'listings', label: `Moderation (${listings.filter((l) => l.moderationStatus === 'PENDING_REVIEW').length})` },
    { id: 'orders', label: `Orders (${orders.filter((o) => o.status === 'PROCESSING').length})` },
    { id: 'users', label: `Users (${users.length})` },
    { id: 'audit', label: 'Audit Trail' }
  ];

  return (
    <div className="space-y-6 pb-24 text-left max-w-xl mx-auto">
      {/* Top Overview Metrics (25% Commission / 75% Payout) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[#121824] border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Platform GMV</span>
          <span className="text-sm sm:text-base font-black text-slate-100 font-mono">
            {(analytics?.totalSalesVolumeETB || 0).toLocaleString()} ETB
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121824] border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-purple-400 uppercase font-semibold block">Platform Revenue (25%)</span>
          <span className="text-sm sm:text-base font-black text-purple-300 font-mono">
            {(analytics?.totalPlatformRevenueETB || 0).toLocaleString()} ETB
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121824] border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Seller Payouts (75%)</span>
          <span className="text-sm sm:text-base font-black text-emerald-300 font-mono">
            {((analytics?.totalSalesVolumeETB || 0) - (analytics?.totalPlatformRevenueETB || 0)).toLocaleString()} ETB
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121824] border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-amber-400 uppercase font-semibold block">Locked Escrow</span>
          <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
            {(analytics?.totalEscrowLockedETB || 0).toLocaleString()} ETB
          </span>
        </div>
      </div>

      {/* Admin Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* Tab Panels */}
      {activeTab === 'payments' && (
        <AdminPaymentsView
          currentUser={user}
          transactions={transactions}
          onTransactionsUpdated={loadAdminData}
        />
      )}

      {activeTab === 'disputes' && (
        <AdminDisputesView
          currentUser={user}
          onDisputesUpdated={loadAdminData}
        />
      )}

      {activeTab === 'listings' && (
        <AdminListingsModerationView
          listings={listings}
          currentUser={user}
          onListingUpdated={loadAdminData}
        />
      )}

      {activeTab === 'orders' && (
        <AdminOrdersView
          currentUser={user}
          orders={orders}
          onOrdersUpdated={loadAdminData}
        />
      )}

      {activeTab === 'users' && (
        <AdminUsersView
          currentUser={user}
          users={users}
          onUsersUpdated={loadAdminData}
        />
      )}

      {activeTab === 'audit' && (
        <AdminAuditLogView currentUser={user} />
      )}
    </div>
  );
};
