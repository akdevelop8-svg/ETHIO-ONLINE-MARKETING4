/**
 * EOM Database Types mapping domain entities to a relational layout.
 * Phase 10: Production Backend & Persistent Data Foundation
 */

export interface DbUser {
  id: string; // PRIMARY KEY
  email: string; // UNIQUE
  normalized_phone?: string; // UNIQUE
  full_name: string;
  username: string; // UNIQUE
  role: 'BUYER' | 'SELLER' | 'ADMIN' | 'MODERATOR' | 'USER';
  auth_role: 'guest' | 'user' | 'admin';
  is_verified: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  is_active: boolean;
  avatar_url?: string;
  wallet_balance_etb: number;
  locked_balance_etb: number;
  created_at: string;
  updated_at: string;
}

export interface DbListing {
  id: string; // PRIMARY KEY
  seller_id: string; // FOREIGN KEY -> users.id
  seller_name: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'telegram' | 'facebook' | 'x';
  title: string;
  handle: string;
  channel_url: string;
  category: string;
  description: string;
  followers_count: number;
  is_monetized: boolean;
  price_etb: number;
  price_rating: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbOrder {
  id: string; // PRIMARY KEY
  order_number: string; // UNIQUE
  listing_id: string; // FOREIGN KEY -> listings.id
  buyer_id: string; // FOREIGN KEY -> users.id
  seller_id: string; // FOREIGN KEY -> users.id
  amount_etb: number;
  platform_fee_etb: number;
  seller_payout_etb: number;
  status: string;
  escrow_status: string;
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

export interface DbTransaction {
  id: string; // PRIMARY KEY
  transaction_number: string; // UNIQUE
  order_id: string; // FOREIGN KEY -> orders.id
  buyer_id: string; // FOREIGN KEY -> users.id
  seller_id: string; // FOREIGN KEY -> users.id
  amount_etb: number;
  platform_fee_etb: number;
  seller_payout_etb: number;
  payment_method: string;
  payment_destination_account?: string;
  status: string;
  verification_status: string;
  escrow_status: string;
  payout_status: string;
  payment_reference?: string;
  payment_proof_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DbDispute {
  id: string; // PRIMARY KEY
  dispute_number: string; // UNIQUE
  order_id: string; // FOREIGN KEY -> orders.id
  buyer_id: string; // FOREIGN KEY -> users.id
  seller_id: string; // FOREIGN KEY -> users.id
  reason: string;
  details: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbAuditLog {
  id: string; // PRIMARY KEY
  action: string;
  actor_id: string; // FOREIGN KEY -> users.id
  actor_name: string;
  actor_role: string;
  entity_type: string;
  entity_id?: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  timestamp: string;
}

export interface DbNotification {
  id: string; // PRIMARY KEY
  user_id: string; // user ID or 'ADMIN'
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
}
