import { apiClient } from "../api/client";
import React, { useState, useEffect } from 'react';
import { 
  Store, 
  ShieldCheck, 
  Send, 
  Sparkles, 
  SlidersHorizontal 
} from 'lucide-react';
import { Listing, MarketplaceFilters, Order } from '../types';
import { ListingCard } from '../components/marketplace/ListingCard';
import { ListingDetailModal } from '../components/marketplace/ListingDetailModal';
import { CreateOrderModal } from '../components/marketplace/CreateOrderModal';
import { MarketplaceFilterBar } from '../components/marketplace/MarketplaceFilterBar';
import { EmptyState, LoadingState } from '../components/common/StateViews';
import { buyerService } from '../services/buyer/buyerService';
import { useAuth } from '../context/AuthContext';

export interface MarketplaceViewProps {
  onOrderCreated: (order: Order) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({ onOrderCreated }) => {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedListingForDetail, setSelectedListingForDetail] = useState<Listing | null>(null);
  const [selectedListingForOrder, setSelectedListingForOrder] = useState<Listing | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filters, setFilters] = useState<MarketplaceFilters>({
    platform: 'all',
    category: 'all',
    searchKeyword: '',
    sortBy: 'popular'
  });

  const loadMarketplace = async () => {
    try {
      const list = await apiClient.get<Listing[]>('/listings');
      let filtered = list;
      if (filters.platform && filters.platform !== 'all') filtered = filtered.filter((item) => item.platform === filters.platform);
      if (filters.category && filters.category !== 'all' && filters.category !== 'All') filtered = filtered.filter((item) => item.category === filters.category);
      if (filters.searchKeyword?.trim()) {
        const q = filters.searchKeyword.toLowerCase().trim();
        filtered = filtered.filter((item) => item.title.toLowerCase().includes(q) || item.handle.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
      }
      if (filters.sortBy === 'price_asc') filtered = [...filtered].sort((a, b) => a.priceETB - b.priceETB);
      else if (filters.sortBy === 'price_desc') filtered = [...filtered].sort((a, b) => b.priceETB - a.priceETB);
      else if (filters.sortBy === 'newest') filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      else if (filters.sortBy === 'followers_desc') filtered = [...filtered].sort((a, b) => b.followersCount - a.followersCount);
      setListings(filtered);
      setCategories(Array.from(new Set(list.map((item) => item.category).filter(Boolean))));
      if (user) setFavorites(buyerService.getFavoriteListingIds(user.id));
      else setFavorites([]);
    } catch (err) {
      console.error('Failed to load marketplace listings', err);
      setListings([]);
      setCategories([]);
    }
  };

  useEffect(() => {
    loadMarketplace();
  }, [filters, user]);

  const handleFilterChange = (updated: Partial<MarketplaceFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleToggleFavorite = (listingId: string) => {
    if (!user) return;
    buyerService.toggleFavorite(user.id, listingId);
    setFavorites(buyerService.getFavoriteListingIds(user.id));
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-24 text-left">
      {/* Escrow Guarantee Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl overflow-hidden border border-indigo-500/30 shadow-2xl group">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 bg-[#070B14]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-60" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-inner group-hover:scale-105 transition-transform duration-500">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tighter uppercase">
                  ኢትዮ ONLINE MARKET SECURE ESCROW
                </h3>
                <span className="px-2.5 py-1 rounded-lg text-[10px] bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black tracking-widest uppercase shadow-lg shadow-indigo-500/20">
                  Locked Integrity
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl font-medium">
                Buyer payments remain <span className="text-indigo-400 font-bold">100% secured</span> in the ኢትዮ ONLINE MARKET Vault. Funds are only released to sellers after full admin verification and ownership handover.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Market Fee</span>
              <span className="text-lg font-black text-amber-500 font-mono">25% Locked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <MarketplaceFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        categories={categories}
      />

      {/* Listings Grid */}
      {listings.length === 0 ? (
        <EmptyState
          title="No channels found"
          description="Try changing your search terms or selecting a different platform."
          actionText="Clear Filters"
          onAction={() =>
            setFilters({
              platform: 'all',
              category: 'all',
              searchKeyword: '',
              sortBy: 'popular'
            })
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {listings.map((listing, index) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              index={index}
              onSelect={(l) => setSelectedListingForDetail(l)}
              onToggleFavorite={user ? handleToggleFavorite : undefined}
              isFavorite={favorites.includes(listing.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedListingForDetail && (
        <ListingDetailModal
          isOpen={Boolean(selectedListingForDetail)}
          onClose={() => setSelectedListingForDetail(null)}
          listing={selectedListingForDetail}
          onInitiateBuy={(l) => {
            setSelectedListingForDetail(null);
            setSelectedListingForOrder(l);
          }}
        />
      )}

      {selectedListingForOrder && (
        <CreateOrderModal
          isOpen={Boolean(selectedListingForOrder)}
          onClose={() => setSelectedListingForOrder(null)}
          listing={selectedListingForOrder}
          onOrderCreated={(order) => {
            setSelectedListingForOrder(null);
            onOrderCreated(order);
          }}
        />
      )}
    </div>
  );
};
