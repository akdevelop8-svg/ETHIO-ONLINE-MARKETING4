import { apiClient } from "../../api/client";
import React, { useState } from 'react';
import { 
  Send, 
  Upload, 
  DollarSign, 
  ShieldCheck, 
  Users, 
  Eye, 
  Info 
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Alert } from '../common/Alert';
import { PlatformType, Listing } from '../../types';
import { PLATFORMS_DATA, CATEGORIES_DATA } from '../../constants';
import { PlatformIcon } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

export interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListingCreated: (listing: Listing) => void;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  isOpen,
  onClose,
  onListingCreated
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [platform, setPlatform] = useState<PlatformType>('telegram');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES_DATA[0]);
  const [channelUrl, setChannelUrl] = useState('');
  const [priceETB, setPriceETB] = useState('');
  const [subscriberCount, setSubscriberCount] = useState('');
  const [avgViews, setAvgViews] = useState('');
  const [description, setDescription] = useState('');
  const [accountAge, setAccountAge] = useState('');
  const [isMonetized, setIsMonetized] = useState(false);
  const [ownershipProofUrl, setOwnershipProofUrl] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatedFee = priceETB ? Math.round((Number(priceETB) * 25) / 100) : 0;
  const calculatedPayout = priceETB ? Number(priceETB) - calculatedFee : 0;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be signed in to list a channel.');
      return;
    }
    if (!title.trim() || !channelUrl.trim() || !priceETB) {
      setError('Please fill in all required fields.');
      return;
    }
    if (Number(priceETB) < 100) {
      setError('Minimum listing price is 100 ETB.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const cleanHandle = channelUrl
        .trim()
        .replace(/^https?:\/\/(www\.)?(t\.me\/|instagram\.com\/|tiktok\.com\/@?|youtube\.com\/@?)/i, '');
      const formattedHandle = cleanHandle.startsWith('@') ? cleanHandle : `@${cleanHandle}`;

      const newListing = await apiClient.post<Listing>('/listings/create', {
        platform,
        title: title.trim(),
        handle: formattedHandle || `@${title.toLowerCase().replace(/\s+/g, '_')}`,
        channelUrl: channelUrl.trim(),
        category,
        priceETB: Number(priceETB),
        followersCount: subscriberCount ? Number(subscriberCount) : 0,
        subscribersCount: subscriberCount ? Number(subscriberCount) : undefined,
        averageViews: avgViews ? Number(avgViews) : undefined,
        accountAgeMonths: accountAge ? Number(accountAge) : undefined,
        isMonetized,
        description: description.trim() || '',
        analyticsScreenshotUrl: ownershipProofUrl.trim() || undefined,
        profileImageUrl: profileImageUrl.trim() || undefined,
        sellerTelegram: user.username || undefined,
        sellerPhone: user.phone || undefined
      });

      showToast('Channel listing submitted for admin review (within 72 hrs)!', 'success');
      onListingCreated(newListing);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit channel listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="List Channel for Sale"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
          <span className="font-bold text-indigo-300 block mb-0.5">Admin Moderation Lifecycle</span>
          All newly submitted channels undergo strict ownership verification and audience audit before going live on the marketplace.
        </div>

        {error && <Alert variant="error" title="Submission Error" message={error} />}

        {/* Platform Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2.5">
            Social Media Platform *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PLATFORMS_DATA.map((p) => {
              const isSelected = platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id as PlatformType)}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center gap-3 cursor-pointer group ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-white/20 shadow-lg shadow-indigo-500/20'
                      : 'bg-[#070B14] border-slate-800 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-white/20' : 'bg-slate-800 group-hover:bg-indigo-500/20'
                  }`}>
                    <PlatformIcon platform={p.id as PlatformType} className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                  </div>
                  <span className="truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Channel Title / Display Name *"
          placeholder="e.g. Ethio Tech Insights (48K Subscribers)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Category *</label>
            <select
              className="w-full bg-[#070B14] text-slate-100 rounded-xl px-3.5 py-2.5 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES_DATA.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Channel Public URL / Username *"
            placeholder="https://t.me/yourchannel or @username"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Listing Price (ETB) *"
            type="number"
            placeholder="e.g. 35000"
            value={priceETB}
            onChange={(e) => setPriceETB(e.target.value)}
            required
          />
          <Input
            label="Subscriber Count"
            type="number"
            placeholder="e.g. 48000"
            value={subscriberCount}
            onChange={(e) => setSubscriberCount(e.target.value)}
          />
          <Input
            label="Average Views / Post"
            type="number"
            placeholder="e.g. 12500"
            value={avgViews}
            onChange={(e) => setAvgViews(e.target.value)}
          />
          <Input
            label="Account Age (Months)"
            type="number"
            placeholder="e.g. 24"
            value={accountAge}
            onChange={(e) => setAccountAge(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isMonetized"
            checked={isMonetized}
            onChange={(e) => setIsMonetized(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-[#141B26] text-amber-500 focus:ring-amber-500/40"
          />
          <label htmlFor="isMonetized" className="text-xs font-semibold text-slate-300">
            Is this channel monetized (earning revenue)?
          </label>
        </div>

        {/* 25% Escrow Commission Calculator */}
        {priceETB && Number(priceETB) > 0 && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Platform Escrow Fee (25%):</span>
              <span className="font-mono text-slate-300">{calculatedFee.toLocaleString()} ETB</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>Your Estimated Payout (75%):</span>
              <span className="font-mono">{calculatedPayout.toLocaleString()} ETB</span>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-300">
            Channel Description & Highlights
          </label>
          <textarea
            className="w-full bg-[#070B14] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            placeholder="Highlight audience engagement, monetization status, daily revenue, niche topic..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Profile Picture (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, setProfileImageUrl)}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer"
            />
            {profileImageUrl && <p className="text-[10px] text-emerald-400 mt-1">Image selected</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">Dashboard Screenshot (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, setOwnershipProofUrl)}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer"
            />
            {ownershipProofUrl && <p className="text-[10px] text-emerald-400 mt-1">Image selected</p>}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Submit for Admin Review
          </Button>
        </div>
      </form>
    </Modal>
  );
};
