import React, { useEffect, useState } from 'react';
import { 
  User, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Key, 
  LogOut, 
  Send, 
  ExternalLink, 
  HelpCircle, 
  Heart, 
  FileText,
  Bell,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ESCROW_ADMINS } from '../constants';
import { useToast } from '../components/common/Toast';
import { apiClient } from '../api/client';
import { AppNotification } from '../types';

export interface AccountViewProps {
  onOpenAdminSupport: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  onOpenAdminSupport,
  onNavigateToTab
}) => {
  const { user, logout, updateProfile, requireAuth } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    const loadNotifications = async () => {
      setLoadingNotifications(true);
      try {
        const data = await apiClient.get<AppNotification[]>('/notifications');
        if (!cancelled) setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setNotifications([]);
      } finally {
        if (!cancelled) setLoadingNotifications(false);
      }
    };

    loadNotifications();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!user) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <User className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-100">Sign In to Your Account</h3>
        <p className="text-xs text-slate-400">
          Manage your contact credentials, Telegram escrow handle, and payout settings.
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={() => requireAuth('Sign in to access your account profile.', () => {})}
        >
          Sign In / Register
        </Button>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        username: username.trim()
      });
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const isAdmin = user.authRole === 'admin' || user.role === 'ADMIN';

  return (
    <div className="space-y-6 pb-24 text-left max-w-xl mx-auto">
      {/* User Header Profile Card */}
      <div className="p-5 rounded-2xl bg-[#121824] border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 font-black text-lg flex items-center justify-center border border-amber-500/40">
              {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{user.fullName || user.username || 'EOM User'}</span>
                {user.isVerified && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Verified
                  </span>
                )}
              </h3>
              <span className="text-xs text-slate-400 font-mono">{user.email}</span>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase ${
              isAdmin
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {user.authRole}
          </span>
        </div>

        {isAdmin && (
          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/50 flex items-center justify-between">
            <div className="text-xs text-purple-200">
              <strong className="block font-bold">Admin Privileges Active</strong>
              Access transaction verification and user moderation tools.
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateToTab('admin')}
            >
              Open Admin Portal
            </Button>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="p-5 rounded-2xl bg-[#121824] border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Notifications</h4>
            {notifications.some((n) => !n.isRead) && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-black">
                {notifications.filter((n) => !n.isRead).length} new
              </span>
            )}
          </div>
          {notifications.some((n) => !n.isRead) && (
            <button
              type="button"
              className="text-[10px] font-bold text-slate-400 hover:text-amber-400 inline-flex items-center gap-1.5"
              onClick={async () => {
                try {
                  await apiClient.post('/notifications/read-all', {});
                  setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                } catch (err: any) {
                  showToast(err.message || 'Could not mark notifications as read.', 'error');
                }
              }}
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>

        {loadingNotifications ? (
          <div className="text-xs text-slate-500 py-2">Loading notifications…</div>
        ) : notifications.length === 0 ? (
          <div className="text-xs text-slate-500 py-2">No notifications yet. Listing, payment, and order updates will appear here.</div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {notifications.slice(0, 20).map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={async () => {
                  if (notification.isRead) return;
                  try {
                    await apiClient.post(`/notifications/${notification.id}/read`, {});
                    setNotifications((prev) => prev.map((n) => n.id === notification.id ? { ...n, isRead: true } : n));
                  } catch (err: any) {
                    showToast(err.message || 'Could not update notification.', 'error');
                  }
                }}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${notification.isRead ? 'bg-[#141B26] border-slate-800/70' : 'bg-amber-500/5 border-amber-500/25 hover:border-amber-500/40'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="block text-xs font-bold text-slate-100">{notification.title}</span>
                    <span className="block mt-1 text-[11px] text-slate-400 leading-relaxed">{notification.message}</span>
                  </div>
                  {!notification.isRead && <span className="mt-1 w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                </div>
                <span className="block mt-2 text-[9px] font-mono text-slate-600">{new Date(notification.createdAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Profile Edit Form */}
      <form onSubmit={handleSaveProfile} className="p-5 rounded-2xl bg-[#121824] border border-slate-800/80 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Personal Information</h4>

        <Input
          label="Full Name"
          placeholder="e.g. Dawit Haile"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <Input
          label="Telegram Username (@)"
          placeholder="@username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          helperText="Used for channel ownership handover coordination"
        />

        <Input
          label="Phone Number"
          placeholder="+251 91 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="pt-2 flex justify-end">
          <Button type="submit" variant="primary" size="md" isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </form>

      {/* Official Admin Escrow Contact */}
      <div className="p-5 rounded-2xl bg-[#121824] border border-slate-800/80 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Official Escrow Administrators
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          For transaction verification, 2FA credential transfers, or dispute mediation, connect directly with our verified lead admins:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {ESCROW_ADMINS.map((admin) => (
            <a
              key={admin.telegram}
              href={`https://t.me/${admin.telegram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-[#141B26] border border-slate-800 hover:border-amber-500/40 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400 transition-colors">
                  {admin.name}
                </span>
                <span className="text-[11px] font-mono text-amber-400">{admin.telegram}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </a>
          ))}
        </div>

        <Button
          variant="outline"
          fullWidth
          size="sm"
          onClick={onOpenAdminSupport}
          leftIcon={<HelpCircle className="w-3.5 h-3.5" />}
        >
          View Bank Accounts & Payment Channels
        </Button>
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <Button
          variant="danger"
          fullWidth
          size="md"
          onClick={logout}
          leftIcon={<LogOut className="w-4 h-4" />}
        >
          Sign Out of Account
        </Button>
      </div>
    </div>
  );
};
