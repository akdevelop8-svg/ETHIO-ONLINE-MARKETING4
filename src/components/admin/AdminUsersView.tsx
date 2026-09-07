import { apiClient } from "../../api/client";
import React, { useState } from 'react';
import { 
  Users, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Key, 
  Mail, 
  Phone 
} from 'lucide-react';
import { User } from '../../types';
import { Button } from '../common/Button';
import { EmptyState } from '../common/StateViews';
import { useToast } from '../common/Toast';

export interface AdminUsersViewProps {
  currentUser: User | null;
  users: User[];
  onUsersUpdated: () => void;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({
  currentUser,
  users,
  onUsersUpdated
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');

  const filtered = users.filter((u) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleToggleActive = async (user: User) => {
    if (!currentUser) return;
    try {
      await apiClient.post(`/admin/users/${user.id}/toggle-active`);
      showToast(`User status updated for ${user.email}.`, 'info');
      onUsersUpdated();
    } catch (err: any) {
      showToast(err.message || 'Action failed.', 'error');
    }
  };

  const handleToggleVerified = async (user: User) => {
    if (!currentUser) return;
    try {
      await apiClient.post(`/admin/users/${user.id}/toggle-verification`);
      showToast(`Verification status updated for ${user.email}.`, 'success');
      onUsersUpdated();
    } catch (err: any) {
      showToast(err.message || 'Action failed.', 'error');
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search users by name, email, Telegram, or phone..."
          className="w-full bg-[#141B26] text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No users found"
          description="No user accounts match your search query."
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((u) => (
            <div
              key={u.id}
              className="p-4 rounded-2xl bg-[#121824] border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 font-bold text-xs">
                    {u.fullName?.charAt(0) || u.email.charAt(0)}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{u.fullName || u.username || 'EOM User'}</span>
                      <span className="font-mono text-slate-400 text-[10px]">({u.username || 'No TG'})</span>
                    </h5>
                    <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.authRole === 'admin'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : u.authRole === 'seller'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    }`}
                  >
                    {u.authRole}
                  </span>

                  {u.isVerified ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                      Unverified
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500 font-mono">
                  Created: {new Date(u.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleVerified(u)}
                  >
                    {u.isVerified ? 'Unverify' : 'Mark Verified'}
                  </Button>
                  <Button
                    variant={u.isActive ? 'danger' : 'success'}
                    size="sm"
                    onClick={() => handleToggleActive(u)}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
