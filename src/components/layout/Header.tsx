import React from 'react';
import { Send, Bell, Wallet, Shield, LogIn, LayoutDashboard, Users } from 'lucide-react';
import { AppTab } from '../../types';
import { APP_SHORT_NAME } from '../../constants';
import { useAuth } from '../../context/AuthContext';

export interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  walletBalanceETB?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  walletBalanceETB = 0
}) => {
  const { user, isAuthenticated, openAuthModal, role } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0E1420]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        {/* Left Side: Community Group & Brand */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Community Group Button */}
          <button 
            onClick={() => onSelectTab('community')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 group/group-btn shadow-lg cursor-pointer ${
              activeTab === 'community'
                ? 'bg-indigo-600 text-white border border-white/20'
                : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white shadow-indigo-500/5'
            }`}
            title="Join Community Group"
          >
            <Users className="w-4 h-4 group-hover/group-btn:scale-110 transition-transform" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest hidden xs:block">ግሩፕ</span>
          </button>

          {/* Brand Logo & Name */}
          <button
            onClick={() => onSelectTab('marketplace')}
            className="flex items-center gap-3 hover:opacity-95 transition-all cursor-pointer text-left group"
          >
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-purple-500/30 transition-all duration-500 border border-white/10 overflow-hidden">
              <img src="/logo.jpg" alt="ኢትዮ ONLINE MARKET" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-100 leading-none tracking-tight flex items-center gap-1.5">
                ኢትዮ ONLINE MARKET
              </h1>
              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-[0.2em]">
                Verified Escrow Node
              </span>
            </div>
          </button>
        </div>

        {/* Action Icons / Auth Controls */}
        <div className="flex items-center gap-2">
          {/* Telegram Channel Link */}
          <a
            href="https://t.me/ethio_online_market"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center transition-colors cursor-pointer"
            title="Telegram Community"
          >
            <Send className="w-4 h-4 -rotate-12" />
          </a>

          {!isAuthenticated ? (
            /* Guest Mode Actions */
            <button
              onClick={() => openAuthModal('signin', 'Sign in to buy, sell, or manage orders.')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-bold transition-all shadow-sm shadow-amber-500/20 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          ) : (
            /* Authenticated User Actions */
            <>
              {/* Admin Portal Quick Switch */}
              {role === 'admin' && (
                <button
                  onClick={() => onSelectTab('admin')}
                  className={`px-2 py-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                    activeTab === 'admin'
                      ? 'bg-purple-500 text-slate-950 border-purple-400'
                      : 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20'
                  }`}
                  title="Admin Access Control Portal"
                >
                  <Shield className="w-3 h-3" />
                  <span>Admin</span>
                </button>
              )}

              {/* Notifications */}
              <button
                onClick={() => onSelectTab('account')}
                className="w-8 h-8 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 flex items-center justify-center transition-colors cursor-pointer relative"
                title="Account & Notifications"
              >
                <Bell className="w-4 h-4" />
                {!user?.isVerified && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>

              {/* Dashboard Quick Switch */}
              <button
                onClick={() => onSelectTab('dashboard')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#182234] border border-slate-700/80 hover:border-amber-400 transition-colors cursor-pointer"
                title="My Dashboard"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-slate-200 hidden sm:inline">Dashboard</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
