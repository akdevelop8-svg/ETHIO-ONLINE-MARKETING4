/**
 * EOM Constants & Configuration Data
 */

import { Listing, ListingCategory, PlatformType, LanguageOption, PaymentMethodType } from '../types';

export const APP_NAME = "ኢትዮ Online Market";
export const APP_SHORT_NAME = "ኢትዮ";
export const APP_TAGLINE = "Authority Escrow for Ethiopian Social Media";
export const APP_VERSION = "v2.5.1";
export const PLATFORM_FEE_PERCENTAGE = 25; // 25% platform marketplace fee

export interface EscrowAccountDetail {
  id: PaymentMethodType;
  name: string;
  provider: string;
  accountNumber: string;
  accountName: string;
  logoText: string;
  instructions: string[];
  referenceExample: string;
}

export const OFFICIAL_ESCROW_ACCOUNTS: Record<PaymentMethodType, EscrowAccountDetail> = {
  TELEBIRR: {
    id: 'TELEBIRR',
    name: 'Telebirr SuperApp',
    provider: 'Ethio Telecom Telebirr',
    accountNumber: '0975199311',
    accountName: 'Bereket',
    logoText: 'TELEBIRR',
    instructions: [
      'Open your Telebirr App on your mobile phone',
      'Select "Send Money" or "Pay via Telebirr"',
      'Enter EOM Escrow Phone: 0975199311 (Receiver: Bereket)',
      'Transfer the exact escrow deposit amount',
      'Copy the Telebirr Transaction ID (e.g., TB2026889921) and paste below'
    ],
    referenceExample: 'TB8934201948'
  },
  COMMERCIAL_BANK_OF_ETHIOPIA: {
    id: 'COMMERCIAL_BANK_OF_ETHIOPIA',
    name: 'Commercial Bank of Ethiopia (CBE)',
    provider: 'Commercial Bank of Ethiopia Account',
    accountNumber: '1000545036747',
    accountName: 'Bereket',
    logoText: 'CBE',
    instructions: [
      'Transfer via CBE Mobile Banking (CBE Mobile App / *889#) or Branch Deposit',
      'Account Number: 1000545036747 (Receiver: Bereket)',
      'Put Order Number in the reason/remark field',
      'Enter the FT Reference code (e.g. FT260812345678) below'
    ],
    referenceExample: 'FT260812345678'
  },
  BANK_OF_ABYSSINIA: {
    id: 'BANK_OF_ABYSSINIA',
    name: 'Bank of Abyssinia',
    provider: 'Bank of Abyssinia Account',
    accountNumber: '189429266',
    accountName: 'Bereket Nigusse',
    logoText: 'BOA',
    instructions: [
      'Transfer via BoA Mobile Banking App or Branch Deposit',
      'Account Number: 189429266 (Receiver: Bereket Nigusse)',
      'Include the Order Number in the transfer remarks/reference',
      'Enter your BoA Transaction Reference Code below'
    ],
    referenceExample: 'BOA-TX-7749102'
  }
};

export interface PlatformConfig {
  id: PlatformType;
  name: string;
  color: string;
  bgGradient: string;
  badgeBg: string;
  iconName: string;
  metricLabel: string;
  secondaryMetricLabel: string;
}

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#FF0000',
    bgGradient: 'from-red-600 to-rose-700',
    badgeBg: 'bg-red-500/15 text-red-400 border-red-500/30',
    iconName: 'Youtube',
    metricLabel: 'Subscribers',
    secondaryMetricLabel: 'Total Views'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#00F2FE',
    bgGradient: 'from-slate-950 via-teal-900 to-slate-900',
    badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    iconName: 'Music2',
    metricLabel: 'Followers',
    secondaryMetricLabel: 'Total Likes'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    color: '#229ED9',
    bgGradient: 'from-sky-500 to-indigo-600',
    badgeBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    iconName: 'Send',
    metricLabel: 'Subscribers',
    secondaryMetricLabel: 'Average Views'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    bgGradient: 'from-pink-600 via-purple-600 to-amber-500',
    badgeBg: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    iconName: 'Instagram',
    metricLabel: 'Followers',
    secondaryMetricLabel: 'Average Likes'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    bgGradient: 'from-blue-600 to-indigo-700',
    badgeBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    iconName: 'Facebook',
    metricLabel: 'Followers',
    secondaryMetricLabel: 'Page Likes'
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    color: '#E7E9EA',
    bgGradient: 'from-zinc-800 to-zinc-950',
    badgeBg: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    iconName: 'Twitter',
    metricLabel: 'Followers',
    secondaryMetricLabel: 'Monthly Impressions'
  }
];

export const CATEGORIES: ListingCategory[] = [
  'All',
  'Art & Design',
  'Automotive',
  'Application',
  'Business',
  'Comedy',
  'Crypto & NFT',
  'Clip',
  'Education',
  'Entertainment',
  'Fashion & Beauty',
  'Finance',
  'Food & Cooking',
  'Gaming',
  'Health & Fitness',
  'Lifestyle',
  'Memes',
  'Music',
  'News & Politics',
  'Pets & Animals',
  'Real Estate',
  'Science',
  'Sports',
  'Technology',
  'Travel',
  'Vlog',
  'Other'
];

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'am', label: 'Amharic', nativeLabel: 'አማርኛ' },
  { code: 'om', label: 'Afaan Oromo', nativeLabel: 'Afaan Oromoo' },
  { code: 'ti', label: 'Tigrinya', nativeLabel: 'ትግርኛ' },
  { code: 'aa', label: 'Qafar', nativeLabel: 'Qafaraf' }
];

export const SUPPORTED_BANKS = [
  {
    id: 'dashen',
    name: 'Dashen Bank / Amole',
    subtitle: 'Tap to deposit',
    logoText: 'DASHEN'
  },
  {
    id: 'cbe',
    name: 'CBE Bank / CBE Birr',
    subtitle: 'Commercial Bank of Ethiopia',
    logoText: 'CBE'
  },
  {
    id: 'awash',
    name: 'Awash Bank',
    subtitle: 'Tap to deposit',
    logoText: 'AWASH'
  },
  {
    id: 'telebirr',
    name: 'Telebirr',
    subtitle: 'Instant mobile transfer',
    logoText: 'TELEBIRR'
  }
];

export const AUTHORIZED_ADMIN_USERNAMES = [
  '@mr_ebek',
  '@EXO_SMM',
  'mr_ebek',
  'EXO_SMM'
] as const;

export const OFFICIAL_BOT_USERNAME = '@Ethio_Online_Marketing_Bot';

export interface OfficialContact {
  id: string;
  name: string;
  username: string;
  role: string;
  url: string;
  badge: string;
  description: string;
  isBot?: boolean;
}

export const OFFICIAL_EOM_CONTACTS: OfficialContact[] = [
  {
    id: 'admin_1',
    name: 'Admin 1',
    username: '@mr_ebek',
    role: 'Lead Administrator & Escrow Officer',
    url: 'https://t.me/mr_ebek',
    badge: 'LEAD ADMIN',
    description: 'Direct transaction disputes, identity verification & bank release approvals.'
  },
  {
    id: 'admin_2',
    name: 'Admin 2',
    username: '@EXO_SMM',
    role: 'Operations & Moderation Admin',
    url: 'https://t.me/EXO_SMM',
    badge: 'OPERATIONS',
    description: 'Channel listing review, analytics verification & seller onboarding.'
  },
  {
    id: 'bot_official',
    name: 'Official EOM Bot',
    username: '@Ethio_Online_Marketing_Bot',
    role: 'Automated Escrow & Instant Alerts',
    url: 'https://t.me/Ethio_Online_Marketing_Bot',
    badge: 'OFFICIAL BOT',
    description: 'Instant notification service for escrow locking, transfer status & approvals.',
    isBot: true
  }
];

export const INITIAL_PUBLIC_LISTINGS: Listing[] = [
  {
    id: 'demo-seed-001',
    sellerId: 'usr-seller-01',
    sellerName: 'Abebe Tech & Media',
    sellerEmail: 'abebe.media@gmail.com',
    sellerPhone: '+251911234567',
    sellerTelegram: '@abebe_media',
    platform: 'telegram',
    title: 'Ethio Tech Insights (48K Subscribers)',
    handle: '@ethiotechinsights',
    channelUrl: 'https://t.me/ethiotechinsights',
    category: 'Technology',
    description: 'Premier Ethiopian technology news and software review channel. Active daily organic readership with high engagement from Addis Ababa and regional university students.',
    followersCount: 48500,
    subscribersCount: 48500,
    averageViews: 14200,
    isMonetized: true,
    priceETB: 35000,
    priceRating: 'VERY_GOOD_PRICE',
    isNew: false,
    verificationBadge: 'VERIFIED_ACCOUNT',
    status: 'ACTIVE',
    moderationStatus: 'APPROVED',
    isSeedData: true,
    isDemo: true,
    analyticsScreenshotUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-08-15T12:30:00Z'
  },
  {
    id: 'demo-seed-002',
    sellerId: 'usr-seller-02',
    sellerName: 'Tigist Creative Hub',
    sellerEmail: 'tigist.style@yahoo.com',
    sellerPhone: '+251922345678',
    sellerTelegram: '@tigist_creatives',
    platform: 'tiktok',
    title: 'Habesha Fashion & Lifestyle (120K Fans)',
    handle: '@habesha_style_daily',
    channelUrl: 'https://tiktok.com/@habesha_style_daily',
    category: 'Fashion & Beauty',
    description: 'Top-tier Ethiopian cultural and modern fashion trends TikTok account. Over 2.4M organic video likes and strong sponsored brand potential.',
    followersCount: 120400,
    totalLikes: 2400000,
    isMonetized: true,
    priceETB: 78000,
    priceRating: 'GOOD_PRICE',
    isNew: true,
    verificationBadge: 'PREMIUM_SELLER',
    status: 'ACTIVE',
    moderationStatus: 'APPROVED',
    isSeedData: true,
    isDemo: true,
    analyticsScreenshotUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80',
    createdAt: '2026-08-20T14:15:00Z',
    updatedAt: '2026-08-20T16:00:00Z'
  },
  {
    id: 'demo-seed-003',
    sellerId: 'usr-seller-03',
    sellerName: 'Dawit Sports Zone',
    sellerEmail: 'dawit.sports@gmail.com',
    sellerPhone: '+251933456789',
    sellerTelegram: '@dawit_sports',
    platform: 'youtube',
    title: 'Ethio Premier League Highlights (85K Subs)',
    handle: '@ethiopremier_tv',
    channelUrl: 'https://youtube.com/@ethiopremier_tv',
    category: 'Sports',
    description: 'Fully monetized YouTube sports channel covering Ethiopian football, athletics, and African Champions League matches with 100% original video edits.',
    followersCount: 85200,
    subscribersCount: 85200,
    totalViews: 9800000,
    isMonetized: true,
    priceETB: 145000,
    priceRating: 'MEDIUM_PRICE',
    isNew: false,
    verificationBadge: 'TRUSTED_SELLER',
    status: 'ACTIVE',
    moderationStatus: 'APPROVED',
    isSeedData: true,
    isDemo: true,
    analyticsScreenshotUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=80',
    createdAt: '2026-08-22T08:30:00Z',
    updatedAt: '2026-08-22T11:00:00Z'
  }
];

export const INITIAL_PENDING_LISTINGS: Listing[] = [
  {
    id: 'demo-seed-mod-001',
    sellerId: 'usr-seller-04',
    sellerName: 'Kidus Entertainment',
    sellerEmail: 'kidus.ent@gmail.com',
    sellerPhone: '+251944567890',
    sellerTelegram: '@kidus_ent',
    platform: 'telegram',
    title: 'Arada Memes & Vines (62K Members)',
    handle: '@aradamemes',
    channelUrl: 'https://t.me/aradamemes',
    category: 'Memes',
    description: 'High-viral meme channel in Amharic with daily posting history since 2023. Includes original sticker pack creator ownership rights.',
    followersCount: 62000,
    subscribersCount: 62000,
    averageViews: 22000,
    isMonetized: false,
    priceETB: 42000,
    priceRating: 'VERY_GOOD_PRICE',
    isNew: true,
    status: 'PENDING_REVIEW',
    moderationStatus: 'PENDING_REVIEW',
    isSeedData: true,
    isDemo: true,
    analyticsScreenshotUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
    moderationHistory: [
      {
        id: 'mod-hist-01',
        adminId: 'system',
        adminUsername: 'System',
        action: 'SUBMITTED',
        reason: 'Seller submitted listing for admin ownership verification.',
        timestamp: '2026-08-30T18:30:00Z'
      }
    ],
    createdAt: '2026-08-30T18:30:00Z',
    updatedAt: '2026-08-30T18:30:00Z'
  },
  {
    id: 'demo-seed-mod-002',
    sellerId: 'usr-seller-05',
    sellerName: 'Beti Beauty Tips',
    sellerEmail: 'beti.beauty@gmail.com',
    sellerPhone: '+251955678901',
    sellerTelegram: '@beti_beauty',
    platform: 'instagram',
    title: 'Addis Glamour & Skincare (35K Followers)',
    handle: '@addis_glamour',
    channelUrl: 'https://instagram.com/addis_glamour',
    category: 'Fashion & Beauty',
    description: 'Highly targeted female audience in Addis Ababa, Hawassa, and Dire Dawa interested in cosmetics and natural skincare.',
    followersCount: 35400,
    averageLikes: 1850,
    isMonetized: false,
    priceETB: 28000,
    priceRating: 'GOOD_PRICE',
    isNew: true,
    status: 'PENDING_REVIEW',
    moderationStatus: 'PENDING_REVIEW',
    isSeedData: true,
    isDemo: true,
    analyticsScreenshotUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&auto=format&fit=crop&q=80',
    moderationHistory: [
      {
        id: 'mod-hist-02',
        adminId: 'system',
        adminUsername: 'System',
        action: 'SUBMITTED',
        reason: 'Seller submitted listing with Instagram analytics panel screenshot.',
        timestamp: '2026-08-30T20:10:00Z'
      }
    ],
    createdAt: '2026-08-30T20:10:00Z',
    updatedAt: '2026-08-30T20:10:00Z'
  },
  {
    id: 'demo-seed-mod-003',
    sellerId: 'usr-seller-06',
    sellerName: 'Mulugeta Crypto',
    sellerEmail: 'mulu.crypto@outlook.com',
    sellerPhone: '+251966789012',
    sellerTelegram: '@mulu_crypto',
    platform: 'x',
    title: 'Ethio Web3 & Airdrops (18K Followers)',
    handle: '@ethioweb3_hub',
    channelUrl: 'https://x.com/ethioweb3_hub',
    category: 'Crypto & NFT',
    description: 'X account with active Ethiopian web3 and freelance developer followers. Good engagement on telegram airdrop threads.',
    followersCount: 18900,
    isMonetized: false,
    priceETB: 16000,
    priceRating: 'HIGH_PRICE',
    isNew: false,
    status: 'CHANGES_REQUESTED',
    moderationStatus: 'CHANGES_REQUESTED',
    isSeedData: true,
    isDemo: true,
    adminNotes: 'Please provide full screen screenshot showing profile edit settings and primary phone link.',
    rejectionReason: 'Analytics screenshot cuts off handle verification header.',
    moderationHistory: [
      {
        id: 'mod-hist-03',
        adminId: 'admin_2',
        adminUsername: '@EXO_SMM',
        action: 'CHANGES_REQUESTED',
        reason: 'Analytics screenshot cuts off handle verification header. Please re-upload uncropped proof.',
        timestamp: '2026-08-29T14:20:00Z'
      }
    ],
    createdAt: '2026-08-29T11:00:00Z',
    updatedAt: '2026-08-29T14:20:00Z'
  },
  {
    id: 'demo-seed-mod-004',
    sellerId: 'usr-seller-07',
    sellerName: 'Fast Promo 251',
    sellerEmail: 'fastpromo251@gmail.com',
    sellerPhone: '+251977890123',
    sellerTelegram: '@fastpromo251',
    platform: 'telegram',
    title: 'Betting Tips Daily (90K Bots)',
    handle: '@bettingtips251',
    channelUrl: 'https://t.me/bettingtips251',
    category: 'Other',
    description: 'Betting channel with sudden surge in members.',
    followersCount: 90000,
    isMonetized: false,
    priceETB: 12000,
    priceRating: 'VERY_HIGH_PRICE',
    isNew: false,
    status: 'REJECTED',
    moderationStatus: 'REJECTED',
    isSeedData: true,
    isDemo: true,
    rejectionReason: 'Detected artificial bot followers violating EOM authentic channel policies.',
    moderationHistory: [
      {
        id: 'mod-hist-04',
        adminId: 'admin_1',
        adminUsername: '@mr_ebek',
        action: 'REJECTED',
        reason: 'Detected artificial bot followers violating EOM authentic channel policies. Ownership verification rejected.',
        timestamp: '2026-08-28T09:15:00Z'
      }
    ],
    createdAt: '2026-08-28T08:00:00Z',
    updatedAt: '2026-08-28T09:15:00Z'
  }
];

export const SAMPLE_INITIAL_LISTINGS: Listing[] = [
  ...INITIAL_PUBLIC_LISTINGS,
  ...INITIAL_PENDING_LISTINGS
];

export const DEMO_ACCOUNTS = [
  {
    id: 'customer_abebe',
    role: 'Customer Account',
    label: 'Abebe Media (@abebe_media)',
    email: 'abebe.media@gmail.com',
    password: 'Password123!',
    telegram: '@abebe_media'
  },
  {
    id: 'customer_yared',
    role: 'Customer Account',
    label: 'Yared Getachew (@yared_g)',
    email: 'yared.getachew@gmail.com',
    password: 'Password123!',
    telegram: '@yared_g'
  }
];

export const ESCROW_ADMINS = [
  {
    name: 'Admin 1 (Lead Escrow Officer)',
    telegram: '@mr_ebek',
    role: 'Lead Administrator & Escrow Officer',
    description: 'Direct transaction disputes, identity verification & bank release approvals.'
  },
  {
    name: 'Admin 2 (Operations & Moderation)',
    telegram: '@EXO_SMM',
    role: 'Operations & Moderation Admin',
    description: 'Channel listing review, analytics verification & seller onboarding.'
  }
];

export const PLATFORMS_DATA = PLATFORMS;

export const PAYMENT_METHODS_DATA = [
  {
    id: 'TELEBIRR',
    name: 'Telebirr',
    description: 'Ethio Telecom Instant Mobile Deposit',
    accountNumber: '0975199311',
    accountName: 'Bereket'
  },
  {
    id: 'COMMERCIAL_BANK_OF_ETHIOPIA',
    name: 'Commercial Bank of Ethiopia (CBE)',
    description: 'CBE Mobile Banking & Branch Deposit',
    accountNumber: '1000545036747',
    accountName: 'Bereket'
  },
  {
    id: 'BANK_OF_ABYSSINIA',
    name: 'Bank of Abyssinia',
    description: 'BoA Mobile Banking & Branch Deposit',
    accountNumber: '189429266',
    accountName: 'Bereket Nigusse'
  }
];

export const CATEGORIES_DATA = CATEGORIES.filter((c) => c !== 'All');

