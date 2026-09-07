-- ========================================================
-- EOM (Ethio Online Market) Production PostgreSQL Schema
-- Phase 10: Production Backend & Persistent Data Foundation
-- ========================================================

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    normalized_phone VARCHAR(50) UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('BUYER', 'SELLER', 'ADMIN', 'MODERATOR', 'USER')),
    auth_role VARCHAR(50) NOT NULL CHECK (auth_role IN ('guest', 'user', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url VARCHAR(500),
    wallet_balance_etb INT DEFAULT 0 CHECK (wallet_balance_etb >= 0),
    locked_balance_etb INT DEFAULT 0 CHECK (locked_balance_etb >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. LISTINGS TABLE
CREATE TABLE IF NOT EXISTS listings (
    id VARCHAR(100) PRIMARY KEY,
    seller_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_name VARCHAR(150) NOT NULL,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'telegram', 'facebook', 'x')),
    title VARCHAR(255) NOT NULL,
    handle VARCHAR(150) NOT NULL,
    channel_url VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    followers_count INT DEFAULT 0,
    subscribers_count INT,
    average_views INT,
    average_likes INT,
    account_age_months INT,
    is_monetized BOOLEAN DEFAULT FALSE,
    price_etb INT NOT NULL CHECK (price_etb > 0),
    price_rating VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    moderation_status VARCHAR(50),
    analytics_screenshot_url TEXT,
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(100) PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    listing_id VARCHAR(100) NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
    buyer_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_etb INT NOT NULL CHECK (amount_etb > 0),
    platform_fee_etb INT NOT NULL CHECK (platform_fee_etb >= 0),
    seller_payout_etb INT NOT NULL CHECK (seller_payout_etb >= 0),
    status VARCHAR(50) NOT NULL,
    escrow_status VARCHAR(50) NOT NULL,
    payment_method VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(100) PRIMARY KEY,
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    order_id VARCHAR(100) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    buyer_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_etb INT NOT NULL CHECK (amount_etb > 0),
    platform_fee_etb INT NOT NULL CHECK (platform_fee_etb >= 0),
    seller_payout_etb INT NOT NULL CHECK (seller_payout_etb >= 0),
    payment_method VARCHAR(50) NOT NULL,
    payment_destination_account VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    verification_status VARCHAR(50) NOT NULL,
    escrow_status VARCHAR(50) NOT NULL,
    payout_status VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100),
    payment_proof_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. DISPUTES TABLE
CREATE TABLE IF NOT EXISTS disputes (
    id VARCHAR(100) PRIMARY KEY,
    dispute_number VARCHAR(100) UNIQUE NOT NULL,
    order_id VARCHAR(100) NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    buyer_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    actor_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('SUCCESS', 'WARNING', 'FAILED')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL, -- user ID or 'ADMIN'
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    reference_id VARCHAR(100),
    reference_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. USER SECRETS TABLE
-- Password hashes are intentionally isolated from the public user profile table.
CREATE TABLE IF NOT EXISTS users_secrets (
    user_id VARCHAR(100) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. GENERIC PERSISTENCE STORE
-- Stores application-domain objects in JSONB so the synchronous service/repository
-- layer survives Render restarts while keeping secrets out of the JSON store.
CREATE TABLE IF NOT EXISTS backend_storage (
    collection VARCHAR(150) NOT NULL,
    id VARCHAR(150) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS idx_backend_storage_collection ON backend_storage(collection);

-- Create highly-efficient indexes for rapid lookups and joins
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_order ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
