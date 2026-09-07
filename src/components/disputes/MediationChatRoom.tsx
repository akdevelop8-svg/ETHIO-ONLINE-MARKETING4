import { apiClient } from "../../api/client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Scale, 
  Send, 
  Paperclip, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Image as ImageIcon, 
  User as UserIcon, 
  FileText, 
  ExternalLink, 
  RotateCcw, 
  CheckCircle2, 
  Plus, 
  X, 
  ChevronRight,
  Info
} from 'lucide-react';
import { Dispute, User, DisputeMessage, DisputeEvidence } from '../../types';
import { DisputeStatusBadge, DisputeReasonBadge } from './DisputeBadges';
import { AdminArbitrationModal } from './AdminArbitrationModal';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';

export interface MediationChatRoomProps {
  disputeId: string;
  currentUser: User | null;
  onClose: () => void;
  onDisputeUpdated?: () => void;
}

export const MediationChatRoom: React.FC<MediationChatRoomProps> = ({
  disputeId,
  currentUser,
  onClose,
  onDisputeUpdated
}) => {
  const { showToast } = useToast();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'evidence' | 'timeline'>('chat');
  const [inputText, setInputText] = useState('');
  const [isIntervention, setIsIntervention] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEvidenceDrawer, setShowEvidenceDrawer] = useState(false);
  const [showArbitrationModal, setShowArbitrationModal] = useState(false);

  // Evidence upload form state
  const [evTitle, setEvTitle] = useState('');
  const [evUrl, setEvUrl] = useState('');
  const [evDescription, setEvDescription] = useState('');

  // Admin Request Evidence State
  const [showRequestEvidenceModal, setShowRequestEvidenceModal] = useState(false);
  const [requestEvTarget, setRequestEvTarget] = useState<'BUYER' | 'SELLER' | 'BOTH'>('BOTH');
  const [requestEvDirective, setRequestEvDirective] = useState('Please submit official screenshot proof of account security status and 2FA settings within 24 hours.');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadDispute = async () => {
    if (!currentUser) return;
    try {
      const data = await apiClient.get<Dispute>(`/disputes/${disputeId}`);
      if (data) {
        setDispute({ ...data });
      }
    } catch (err: any) {
      showToast(err.message || 'Unable to access dispute mediation room.', 'error');
      onClose();
    }
  };

  useEffect(() => {
    loadDispute();
  }, [disputeId, currentUser]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dispute?.messages, activeTab]);

  if (!dispute || !currentUser) {
    return null;
  }

  const isAdmin = currentUser.authRole === 'admin' || currentUser.role === 'ADMIN';
  const isBuyer = dispute.buyerId === currentUser.id;
  const isSeller = dispute.sellerId === currentUser.id;

  const isResolved = 
    dispute.status === 'RESOLVED_BUYER_REFUND' || 
    dispute.status === 'RESOLVED_SELLER_RELEASE' || 
    dispute.status === 'RESOLVED_SPLIT_SETTLEMENT' ||
    dispute.status === 'RESOLVED';

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(`/disputes/${dispute.id}/messages`, {
        message: inputText.trim(),
        isIntervention: isAdmin && isIntervention
      });
      setInputText('');
      setIsIntervention(false);
      await loadDispute();
      onDisputeUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to send message.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) {
      showToast('Evidence title is required.', 'error');
      return;
    }

    try {
      await apiClient.post(`/disputes/${dispute.id}/evidence`, {
        title: evTitle.trim(),
        fileUrl: evUrl.trim() || undefined,
        description: evDescription.trim()
      });
      showToast('Evidence successfully uploaded to mediation vault.', 'success');
      setEvTitle('');
      setEvUrl('');
      setEvDescription('');
      setShowEvidenceDrawer(false);
      await loadDispute();
      onDisputeUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload evidence.', 'error');
    }
  };

  const handleAdminRequestEvidence = () => {
    setShowRequestEvidenceModal(true);
  };

  const handleExecuteRequestEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEvDirective.trim()) {
      showToast('Directive details cannot be empty.', 'error');
      return;
    }

    try {
      await apiClient.post(`/admin/disputes/${dispute.id}/request-evidence`, {
        target: requestEvTarget,
        directive: requestEvDirective.trim()
      });
      showToast(`Evidence request issued to ${requestEvTarget.toLowerCase()}.`, 'warning');
      setShowRequestEvidenceModal(false);
      await loadDispute();
      onDisputeUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to issue evidence request.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[92vh] sm:h-[86vh] bg-[#0E131F] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left">
        
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 bg-[#141B28] border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-slate-100">{dispute.disputeNumber}</span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-xs text-slate-400 font-mono">Order #{dispute.orderNumber}</span>
                <DisputeStatusBadge status={dispute.status} />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-100 line-clamp-1 mt-0.5">
                {dispute.listingTitle} ({dispute.platform.toUpperCase()})
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="text-right mr-2 hidden sm:block">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Locked Escrow</span>
              <span className="text-sm font-mono font-bold text-amber-400">{dispute.amountETB.toLocaleString()} ETB</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dispute Details Ribbon */}
        <div className="px-4 py-2 bg-black/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <DisputeReasonBadge reason={dispute.reason} />
            <span>Buyer: <strong className="text-blue-300 font-medium">{dispute.buyerName}</strong></span>
            <span>•</span>
            <span>Seller: <strong className="text-emerald-300 font-medium">{dispute.sellerName}</strong></span>
            <span>•</span>
            <span>Lead Admin: <strong className="text-amber-300 font-medium">{dispute.assignedAdminName || '@mr_ebek'}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Opened {new Date(dispute.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 pt-2 bg-[#101622] border-b border-slate-800/80 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'chat'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Mediation Room</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {dispute.messages.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'evidence'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Evidence Vault</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {dispute.evidence.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Timeline & Verdict</span>
            {isResolved && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0B0F19]">
          
          {/* TAB 1: LIVE CHAT */}
          {activeTab === 'chat' && (
            <div className="space-y-3.5">
              {/* Initial Issue Summary Banner */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Dispute Claim Statement:</span>
                </div>
                <p className="text-slate-300 pl-6 leading-relaxed">
                  "{dispute.details}"
                </p>
              </div>

              {/* Chat Message Stream */}
              {dispute.messages.map((msg) => {
                const isMsgAdmin = msg.senderRole === 'ADMIN';
                const isMsgBuyer = msg.senderRole === 'BUYER';
                const isMsgSeller = msg.senderRole === 'SELLER';
                const isOwnMessage = msg.senderId === currentUser.id;

                if (msg.isIntervention) {
                  return (
                    <div key={msg.id} className="my-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 shadow-lg text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-amber-300 font-bold">
                        <div className="flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          <span>OFFICIAL EOM ADMIN DIRECTIVE</span>
                        </div>
                        <span className="text-[10px] text-amber-400/80 font-mono font-normal">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-amber-100 font-medium leading-relaxed">{msg.message}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} text-xs`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
                      <span className={`font-bold ${
                        isMsgAdmin ? 'text-amber-400' : isMsgBuyer ? 'text-blue-400' : 'text-emerald-400'
                      }`}>
                        {msg.senderName} ({msg.senderRole})
                      </span>
                      <span>•</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                    </div>

                    <div className={`p-3 rounded-2xl max-w-[85%] sm:max-w-[75%] leading-relaxed shadow-sm ${
                      isOwnMessage
                        ? 'bg-amber-500/20 text-slate-100 border border-amber-500/30 rounded-tr-none'
                        : isMsgAdmin
                        ? 'bg-[#182030] text-amber-200 border border-amber-500/30 rounded-tl-none'
                        : isMsgBuyer
                        ? 'bg-[#131E2E] text-slate-100 border border-blue-500/20 rounded-tl-none'
                        : 'bg-[#13221E] text-slate-100 border border-emerald-500/20 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.message}</p>

                      {/* Attachments inside message */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-700/50 space-y-1.5">
                          {msg.attachments.map((att) => (
                            <div key={att.id} className="p-2 rounded-lg bg-black/40 border border-slate-700/60 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-[11px] font-bold block truncate text-slate-200">{att.title}</span>
                                {att.description && (
                                  <span className="text-[10px] text-slate-400 block truncate">{att.description}</span>
                                )}
                              </div>
                              {att.fileUrl && (
                                <a
                                  href={att.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* TAB 2: EVIDENCE VAULT */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Dispute Evidence Vault</h4>
                  <p className="text-[11px] text-slate-400">All submitted screenshots, 2FA logs, and proofs for arbitration.</p>
                </div>
                {!isResolved && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowEvidenceDrawer(true)}
                    leftIcon={<Plus className="w-3.5 h-3.5 text-amber-400" />}
                  >
                    Upload Evidence
                  </Button>
                )}
              </div>

              {dispute.evidence.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#121824] border border-slate-800 space-y-2">
                  <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                  <span className="text-xs font-bold text-slate-300 block">No Evidence Submitted Yet</span>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Parties are encouraged to upload screenshots of 2FA logs, chat messages, or transfer countdowns.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dispute.evidence.map((ev) => (
                    <div key={ev.id} className="p-3.5 rounded-xl bg-[#131A27] border border-slate-800 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-200 line-clamp-1">{ev.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 font-semibold text-amber-400">
                            {ev.uploaderRole}
                          </span>
                        </div>

                        {ev.fileUrl && (
                          <div className="rounded-lg overflow-hidden border border-slate-800 h-36 bg-black/50 relative group">
                            <img
                              src={ev.fileUrl}
                              alt={ev.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <a
                              href={ev.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-slate-200 hover:text-white backdrop-blur-sm"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}

                        <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                          {ev.description || 'No additional notes provided.'}
                        </p>
                      </div>

                      <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span>By {ev.uploaderName}</span>
                        <span>{new Date(ev.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TIMELINE & VERDICT */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {/* Verdict Card if Resolved */}
              {dispute.arbitration && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 to-emerald-500/10 border border-amber-500/40 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                        Official Escrow Settlement Verdict
                      </span>
                    </div>
                    <DisputeStatusBadge status={dispute.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">Buyer Refund</span>
                      <span className="text-sm font-bold font-mono text-blue-400">
                        {dispute.arbitration.buyerRefundAmountETB.toLocaleString()} ETB
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">Seller Payout</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">
                        {dispute.arbitration.sellerPayoutAmountETB.toLocaleString()} ETB
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Arbitration Reasoning:</span>
                    <p className="p-2.5 rounded-lg bg-black/30 text-slate-200 leading-relaxed font-sans">
                      {dispute.arbitration.resolutionNotes}
                    </p>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
                    <span>Signed by: <strong className="text-amber-300">{dispute.arbitration.resolvedByAdminName}</strong></span>
                    <span>{new Date(dispute.arbitration.resolvedAt).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Chronological Audit Timeline */}
              <div className="p-4 rounded-2xl bg-[#121824] border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Dispute Audit History</span>
                </h4>

                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800 pl-6">
                  {dispute.timeline.map((tl) => (
                    <div key={tl.id} className="relative text-xs space-y-0.5">
                      <span className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-amber-400 ring-4 ring-[#121824]" />
                      <span className="font-semibold text-slate-200 block">{tl.event}</span>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>{tl.actor}</span>
                        <span>•</span>
                        <span>{new Date(tl.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Evidence Upload Slide-in Drawer */}
        {showEvidenceDrawer && (
          <div className="p-4 bg-[#141B29] border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">Submit Dispute Evidence</span>
              <button onClick={() => setShowEvidenceDrawer(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUploadEvidence} className="space-y-2.5">
              <input
                type="text"
                placeholder="Evidence Title (e.g. 2FA Recovery SMS Screen)"
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                required
                className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-xs border border-slate-700"
              />
              <input
                type="url"
                placeholder="Image/Screenshot URL (optional)"
                value={evUrl}
                onChange={(e) => setEvUrl(e.target.value)}
                className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-xs border border-slate-700"
              />
              <textarea
                placeholder="Description of the evidence..."
                rows={2}
                value={evDescription}
                onChange={(e) => setEvDescription(e.target.value)}
                className="w-full bg-slate-900 text-slate-100 rounded-lg px-3 py-2 text-xs border border-slate-700"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowEvidenceDrawer(false)}>Cancel</Button>
                <Button size="sm" variant="primary" type="submit">Submit to Vault</Button>
              </div>
            </form>
          </div>
        )}

        {/* Admin Arbitration Bar if Admin */}
        {isAdmin && !isResolved && (
          <div className="px-4 py-2.5 bg-amber-500/10 border-t border-amber-500/30 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="font-bold hidden sm:inline">Admin Authority:</span>
              <span className="text-[11px] text-amber-200">Arbitrate and settle escrow funds</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAdminRequestEvidence}
              >
                Request Evidence
              </Button>
              <Button
                size="sm"
                variant="warning"
                leftIcon={<Scale className="w-3.5 h-3.5" />}
                onClick={() => setShowArbitrationModal(true)}
              >
                Arbitrate Dispute
              </Button>
            </div>
          </div>
        )}

        {/* Message Input Bottom Bar */}
        {!isResolved ? (
          <form
            onSubmit={handleSendMessage}
            className="p-3 sm:p-4 bg-[#141B28] border-t border-slate-800 flex flex-col gap-2 shrink-0"
          >
            {isAdmin && (
              <label className="flex items-center gap-2 text-[11px] text-amber-400 cursor-pointer self-start">
                <input
                  type="checkbox"
                  checked={isIntervention}
                  onChange={(e) => setIsIntervention(e.target.checked)}
                  className="rounded border-amber-500/50 text-amber-500"
                />
                <span className="font-bold">Official Admin Intervention Notice</span>
              </label>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEvidenceDrawer(!showEvidenceDrawer)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition-colors"
                title="Attach evidence"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={
                  isAdmin 
                    ? "Type administrative directive or guidance..." 
                    : isBuyer 
                    ? "Reply to seller and escrow officer..." 
                    : "Reply to buyer and escrow officer..."
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-900 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-xs border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                disabled={!inputText.trim()}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Send
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-3 bg-[#141B28] border-t border-slate-800 text-center text-xs text-slate-400 shrink-0">
            This dispute has been finalized by an administrative verdict. Escrow funds have been settled.
          </div>
        )}
      </div>

      {/* Admin Arbitration Modal */}
      {showArbitrationModal && (
        <AdminArbitrationModal
          isOpen={showArbitrationModal}
          onClose={() => setShowArbitrationModal(false)}
          dispute={dispute}
          currentUser={currentUser}
          onArbitrationExecuted={() => {
            loadDispute();
            onDisputeUpdated?.();
            setShowArbitrationModal(false);
          }}
        />
      )}

      {/* Admin Request Evidence Modal */}
      {showRequestEvidenceModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#121824] border border-slate-700 rounded-2xl p-5 space-y-4 text-left shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Issue Evidence Requirement</h3>
              </div>
              <button 
                onClick={() => setShowRequestEvidenceModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteRequestEvidence} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Request Evidence From:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BOTH', 'BUYER', 'SELLER'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRequestEvTarget(t)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        requestEvTarget === t
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-sm'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {t === 'BOTH' ? 'Both Parties' : t === 'BUYER' ? 'Buyer Only' : 'Seller Only'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Official Directive Notice & Requirements:
                </label>
                <textarea
                  rows={3}
                  value={requestEvDirective}
                  onChange={(e) => setRequestEvDirective(e.target.value)}
                  placeholder="Specify required screenshots, logs, or transfer verification steps..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => setShowRequestEvidenceModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  variant="warning" 
                  type="submit"
                  leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
                >
                  Send Official Notice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
