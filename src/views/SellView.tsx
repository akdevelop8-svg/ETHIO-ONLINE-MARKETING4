import { apiClient } from "../api/client";
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Store, 
  ShieldCheck, 
  CreditCard, 
  Lock, 
  DollarSign, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Listing, User, Transaction } from '../types';
import { SellerListingsView } from '../components/seller/SellerListingsView';
import { CreateListingModal } from '../components/seller/CreateListingModal';
import { SellerPayoutModal } from '../components/seller/SellerPayoutModal';
import { Button } from '../components/common/Button';

export const SellView: React.FC = () => {
  const { user, requireAuth } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  const loadSellerData = async () => {
    if (!user) return;
    try {
      const [userListings, userTransactions] = await Promise.all([
        apiClient.get<Listing[]>('/listings/seller'),
        apiClient.get<Transaction[]>('/transactions')
      ]);
      const completed = userTransactions.filter((t) => t.sellerId === user.id && t.status === 'COMPLETED');
      const locked = userTransactions.filter((t) => t.sellerId === user.id && (t.status === 'PAYMENT_VERIFIED' || t.status === 'PAYMENT_SUBMITTED'));
      setListings(userListings);
      setAnalytics({
        availableBalanceETB: Number(user.walletBalanceETB || 0),
        lockedBalanceETB: locked.reduce((sum, t) => sum + t.sellerPayoutETB, 0),
        totalSalesETB: completed.reduce((sum, t) => sum + t.amountETB, 0),
        completedOrdersCount: completed.length,
        activeListingsCount: userListings.filter((l) => l.status === 'ACTIVE' && l.moderationStatus === 'APPROVED').length
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, [user]);

  if (!user) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <Store className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-100">Sign In to Sell Channels</h3>
        <p className="text-xs text-slate-400">
          List your Telegram, TikTok, and YouTube channels with official Ethio Online Market escrow guarantee and 75% instant payout.
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={() => requireAuth('Sign in to list and sell channels.', () => {})}
        >
          Sign In / Register
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 text-left max-w-xl mx-auto">
      {/* Seller Financial Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#070B14] border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Available Payout</span>
          <span className="text-base sm:text-lg font-black text-indigo-400 font-mono">
            {(analytics?.availableBalanceETB || 0).toLocaleString()} ETB
          </span>
          <span className="text-[10px] text-emerald-400 block">75% Net Disbursable</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#070B14] border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Pending Payouts</span>
          <span className="text-base sm:text-lg font-black text-purple-400 font-mono">
            {(analytics?.lockedBalanceETB || 0).toLocaleString()} ETB
          </span>
          <span className="text-[10px] text-amber-500/60 block">In Escrow Hold</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#070B14] border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Revenue</span>
          <span className="text-base sm:text-lg font-black text-slate-100 font-mono">
            {(analytics?.totalSalesETB || 0).toLocaleString()} ETB
          </span>
          <span className="text-[10px] text-slate-400 block">{analytics?.completedOrdersCount || 0} channels sold</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#070B14] border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Channel Inventory</span>
          <span className="text-base sm:text-lg font-black text-sky-400 font-mono">
            {listings.length}
          </span>
          <span className="text-[10px] text-slate-400 block">
            {listings.filter((l) => l.moderationStatus === 'APPROVED' && l.status === 'ACTIVE').length} active live
          </span>
        </div>
      </div>

      {/* Payout Action Callout */}
      {analytics?.availableBalanceETB > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-emerald-300 block">
              {(analytics.availableBalanceETB).toLocaleString()} ETB Ready for Payout
            </span>
            <span className="text-[11px] text-emerald-400/80">Withdraw to CBE or Telebirr account</span>
          </div>
          <Button
            variant="success"
            size="sm"
            onClick={() => setIsPayoutModalOpen(true)}
            leftIcon={<CreditCard className="w-3.5 h-3.5" />}
          >
            Request Payout
          </Button>
        </div>
      )}

      {/* Seller Listings Management */}
      <SellerListingsView
        listings={listings}
        currentUser={user}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onListingUpdated={() => loadSellerData()}
      />

      {/* Historical Sales */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Completed Historical Sales
        </h3>
        <div className="space-y-3">
          {listings.filter(l => l.status === 'SOLD' || l.status === 'SOLD_OUT').length === 0 ? (
            <div className="p-4 rounded-xl border border-slate-800 bg-[#121824] text-center text-xs text-slate-400">
              No completed sales yet.
            </div>
          ) : (
            listings.filter(l => l.status === 'SOLD' || l.status === 'SOLD_OUT').map(soldListing => (
              <div key={soldListing.id} className="p-3.5 rounded-xl border border-slate-800 bg-[#121824] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{soldListing.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{soldListing.platform} • {soldListing.handle}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    +{Number(soldListing.priceETB * 0.75).toLocaleString()} ETB
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Net Payout</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateListingModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onListingCreated={() => {
            loadSellerData();
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {isPayoutModalOpen && (
        <SellerPayoutModal
          isOpen={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          currentUser={user}
          availableBalanceETB={analytics?.availableBalanceETB || 0}
          onPayoutRequested={() => {
            loadSellerData();
            setIsPayoutModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
