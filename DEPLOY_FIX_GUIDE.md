# EOM Production Fix — Vercel + Supabase

The production stack is **GitHub + Vercel + Supabase**. Vercel serves the Vite frontend and runs the Express API through Vercel Functions. Supabase supplies the PostgreSQL database.

## 1. Current production blockers addressed by this branch

- Added API Function entry points at api/index.ts and api/[...path].ts.
- Separated the local Vite/Express server from the API bootstrap, so the API Function does not need to start a persistent HTTP listener.
- Required PostgreSQL in Vercel production instead of silently accepting new data into instance-local memory.
- Refreshed the snapshot-based persistence store from Supabase for each API request, serialized requests across Vercel instances through a PostgreSQL session advisory lock, and wait for queued writes before returning an API response.
- Propagated database write failures so the API returns a retryable failure rather than silently reporting success.

## 2. Vercel project settings

Connect the repository akdevelop8-svg/ETHIO-ONLINE-MARKETING4 to the existing Vercel project.

- Root Directory: repository root
- Node.js: 22.x
- Build Command: npm run build (Vite build)
- API functions: api/index.ts and api/[...path].ts

Set these server-side variables in Vercel → Project → Settings → Environment Variables:

- DATABASE_URL = Supabase PostgreSQL Session Pooler URI, with SSL enabled
- JWT_SECRET = long, private random secret (at least 32 characters)
- ADMIN_PASSWORD = strong private administrator password
- NODE_ENV = production
- REQUIRE_POSTGRES = true
- GEMINI_API_KEY = optional, for live AI answers
- GEMINI_MODEL = optional override for the default model
- CORS_ORIGIN = optional exact browser origin(s), comma-separated if more than one

Leave VITE_API_BASE_URL unset: frontend and API share the same Vercel domain.

## 3. Supabase database

In the Supabase dashboard, choose Connect → Session Pooler and copy its URI into DATABASE_URL. Keep the URI and password private. The application applies src/db/schema.sql during API initialization; this creates the tables used by the app, including users_secrets and backend_storage.

Session Pooler mode is required for the current compatibility layer because it uses PostgreSQL session-level advisory locks. Do not use the transaction-mode pooler URI with this code.

## 4. Test after deployment

1. /api/health returns status ok.
2. /api/health/db returns status connected.
3. Register a new test account, sign out, sign in again, and refresh the site.
4. Test listing submission and admin moderation with non-financial test data.
5. Test AI if GEMINI_API_KEY is configured.
6. Review Vercel runtime logs before trying real payments.

Authorized admin usernames remain @mr_ebek and @EXO_SMM. Never commit database credentials, JWT secrets, admin passwords, or provider keys.

## 5. Limitations and data migration

The existing marketplace service layer uses synchronous collection snapshots. Serializing all API requests is a compatibility step to reduce cross-instance stale writes; it limits throughput and should not be treated as the final high-scale architecture. Before high-volume traffic or real-value transactions, migrate to direct PostgreSQL operations with explicit transactions and suitable row-level locks.

Existing browser-local, demo, and in-memory records are not automatically migrated to Supabase. Back up and explicitly migrate any real data before replacing an existing production database.
