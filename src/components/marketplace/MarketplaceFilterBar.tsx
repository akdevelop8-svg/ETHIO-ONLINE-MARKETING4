import React from 'react';
import { Search, Layers, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { PlatformType, MarketplaceFilters } from '../../types';
import { PlatformIcon } from '../common/Badge';

export interface MarketplaceFilterBarProps {
  filters: MarketplaceFilters;
  onFilterChange: (updated: Partial<MarketplaceFilters>) => void;
  categories: string[];
}

const PLATFORM_NAV_ITEMS: { id: PlatformType; name: string }[] = [
  { id: 'telegram', name: 'Telegram' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'x', name: 'X' }
];

export const MarketplaceFilterBar: React.FC<MarketplaceFilterBarProps> = ({
  filters,
  onFilterChange,
  categories
}) => {
  return (
    <div className="space-y-3.5 text-left w-full">
      {/* Platform Filter Navigation Row */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 pt-0.5">
        {/* All Platforms */}
        <button
          type="button"
          onClick={() => onFilterChange({ platform: 'all' })}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            filters.platform === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 border border-amber-400 font-extrabold'
              : 'bg-[#121824] hover:bg-[#182232] text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <Layers className={`w-3.5 h-3.5 ${filters.platform === 'all' ? 'text-slate-950' : 'text-amber-400'}`} />
          <span>All Platforms</span>
        </button>

        {/* Telegram, YouTube, Instagram, TikTok, Facebook, X */}
        {PLATFORM_NAV_ITEMS.map((p) => {
          const isActive = filters.platform === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onFilterChange({ platform: p.id })}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 border border-amber-400 font-extrabold'
                  : 'bg-[#121824] hover:bg-[#182232] text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <PlatformIcon
                platform={p.id}
                className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-slate-950' : ''}`}
              />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Search and Secondary Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        {/* Keyword Search */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search channels, @handle, categories..."
            className="w-full bg-[#121824] text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-slate-800/80 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all"
            value={filters.searchKeyword || ''}
            onChange={(e) => onFilterChange({ searchKeyword: e.target.value })}
          />
        </div>

        {/* Category Filter */}
        <div className="sm:col-span-3">
          <select
            value={filters.category || 'all'}
            onChange={(e) => onFilterChange({ category: e.target.value })}
            className="w-full bg-[#121824] text-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm border border-slate-800/80 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 cursor-pointer transition-all"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Selector */}
        <div className="sm:col-span-3">
          <select
            value={filters.sortBy || 'popular'}
            onChange={(e) => onFilterChange({ sortBy: e.target.value as any })}
            className="w-full bg-[#121824] text-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm border border-slate-800/80 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 cursor-pointer transition-all"
          >
            <option value="popular">Most Popular</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="followers_desc">Most Followers / Subscribers</option>
            <option value="newest">Newly Listed</option>
          </select>
        </div>
      </div>
    </div>
  );
};
