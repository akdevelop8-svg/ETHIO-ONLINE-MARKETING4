import React from 'react';
import { 
  ShieldCheck, 
  Send, 
  Bot, 
  CheckCircle2, 
  Lock, 
  ExternalLink 
} from 'lucide-react';

export interface FooterProps {
  onNavigate: (view: any) => void;
  onOpenAdminSupport: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenAdminSupport
}) => {
  return (
    <footer className="mt-12 pt-10 pb-20 sm:pb-10 border-t border-slate-800/60 bg-[#070B14] text-left">
      <div className="space-y-8">
        {/* Top Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center border border-white/10 shadow-lg shadow-indigo-500/10">
                <span className="text-white font-black text-xs">EOM</span>
              </div>
              <div>
                <span className="font-black text-base tracking-tighter text-slate-100 block">
                  ኢትዮ ONLINE MARKET
                </span>
                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">
                  Secure Escrow Node
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              Ethiopia&apos;s authoritative escrow gateway for high-value social media accounts. Experience absolute security with our blue-chip verification architecture.
            </p>
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold w-fit">
                <ShieldCheck className="w-3 h-3" />
                <span>Telebirr & CBE Protected</span>
              </div>
              <a 
                href="https://t.me/AK_DEVELOP2" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold w-fit hover:bg-purple-500/20 transition-colors"
              >
                <Bot className="w-3 h-3" />
                <span>Powered by AK DEVELOP ™</span>
              </a>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Marketplace</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate('marketplace')} className="hover:text-indigo-400 transition-colors cursor-pointer">
                  Browse Channels
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('sell')} className="hover:text-indigo-400 transition-colors cursor-pointer">
                  Sell Account
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('order')} className="hover:text-indigo-400 transition-colors cursor-pointer">
                  My Orders & Escrow
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('account')} className="hover:text-indigo-400 transition-colors cursor-pointer">
                  Account Settings
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Escrow & Security */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Trust & Security</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Moderation Audit</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Buyer Ownership Guarantee</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instant Seller Payouts</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Zero Chargeback Risk</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Verified Contacts & Telegram Bot */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Verified Support</h4>
            <div className="space-y-2 text-xs">
              <a
                href="https://t.me/Ethio_Online_Marketing_Bot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-sky-500/30 hover:border-sky-400 transition-all text-sky-300 group"
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-sky-400" />
                  <span className="font-bold">@Ethio_Online_Marketing_Bot</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-300" />
              </a>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Official Escrow Admins</span>
                <div className="flex flex-wrap gap-1.5">
                  <a
                    href="https://t.me/mr_ebek"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono font-bold"
                  >
                    <Send className="w-3 h-3 text-sky-400" />
                    <span>@mr_ebek</span>
                  </a>
                  <a
                    href="https://t.me/EXO_SMM"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono font-bold"
                  >
                    <Send className="w-3 h-3 text-sky-400" />
                    <span>@EXO_SMM</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-medium">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p>© {new Date().getFullYear()} ኢትዮ Online Market.</p>
            <span className="font-mono text-slate-600">v2.0.0</span>
            <a 
              href="https://t.me/AK_DEVELOP2" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-purple-400 transition-colors flex items-center gap-1"
            >
              <span>Powered by AK DEVELOP ™</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onOpenAdminSupport} className="hover:text-indigo-400 transition-colors cursor-pointer">
              Admin Escrow Desk
            </button>
            <span>•</span>
            <span>Ethiopian Digital Commerce Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
