import React from 'react';
import { 
  LayoutDashboard, 
  Store, 
  Plus, 
  ShoppingBag, 
  User 
} from 'lucide-react';
import { AppTab } from '../../types';
import { useAuth } from '../../context/AuthContext';

export interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab
}) => {
  const { requireAuth } = useAuth();

  const handleTabClick = (tab: AppTab) => {
    switch (tab) {
      case 'dashboard':
        requireAuth('Sign in to view your dashboard, earnings, and analytics.', () => onSelectTab('dashboard'));
        break;
      case 'sell':
        requireAuth('Sign in to list a social media channel for sale on EOM.', () => onSelectTab('sell'));
        break;
      case 'order':
        requireAuth('Sign in to view your orders and trade history.', () => onSelectTab('order'));
        break;
      default:
        onSelectTab(tab);
        break;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0E1420]/95 backdrop-blur-lg border-t border-slate-800/90 py-1.5 px-3">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        {/* Dashboard */}
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Dashboard</span>
        </button>

        {/* Marketplace */}
        <button
          onClick={() => handleTabClick('marketplace')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeTab === 'marketplace' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Store className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Marketplace</span>
        </button>

        {/* Sell (Prominent Center + Button) */}
        <div className="flex flex-col items-center justify-center flex-1 -mt-5">
          <button
            onClick={() => handleTabClick('sell')}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ${
              activeTab === 'sell'
                ? 'bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 shadow-amber-500/40 ring-4 ring-slate-900'
                : 'bg-amber-500 text-slate-950 shadow-amber-500/30 hover:bg-amber-400 ring-4 ring-slate-900'
            }`}
            title="List a channel for sale"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className={`text-[10px] mt-0.5 ${activeTab === 'sell' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
            Sell
          </span>
        </div>

        {/* Order */}
        <button
          onClick={() => handleTabClick('order')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeTab === 'order' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Order</span>
        </button>

        {/* Account */}
        <button
          onClick={() => handleTabClick('account')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeTab === 'account' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Account</span>
        </button>
      </div>
    </div>
  );
};
