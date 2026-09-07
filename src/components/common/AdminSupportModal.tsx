import React from 'react';
import { Shield, Send, ExternalLink, Bot, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { OFFICIAL_EOM_CONTACTS } from '../../constants';

export interface AdminSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  contextMessage?: string;
}

export const AdminSupportModal: React.FC<AdminSupportModalProps> = ({
  isOpen,
  onClose,
  title = 'Official EOM Admin & Escrow Support',
  contextMessage
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-lg">
      <div className="space-y-4 text-left">
        {contextMessage ? (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            {contextMessage}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Connect directly with verified Ethio Online Market administrators and automated bots for transaction assistance, escrow verification, and dispute resolution.
          </p>
        )}

        {/* Contacts List */}
        <div className="space-y-2.5">
          {OFFICIAL_EOM_CONTACTS.map((contact) => (
            <div
              key={contact.id}
              className="p-3.5 rounded-xl bg-[#141B26] border border-slate-800 hover:border-slate-700 transition-colors flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    contact.isBot
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                  }`}
                >
                  {contact.isBot ? <Bot className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-100">{contact.name}</span>
                    <span className="font-mono text-xs font-semibold text-amber-400">
                      {contact.username}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      {contact.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{contact.description}</p>
                </div>
              </div>
              <a
                href={contact.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
              </a>
            </div>
          ))}
        </div>

        {/* Security Notice */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Escrow Protection Guarantee</span>
          </div>
          <p className="leading-normal">
            Only conduct transactions through official EOM channels. EOM admins will NEVER ask for your account password or payment to personal unverified accounts.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
