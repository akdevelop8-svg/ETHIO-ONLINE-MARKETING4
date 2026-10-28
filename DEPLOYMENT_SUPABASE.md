# EOM Production Deployment: Vercel + Supabase

This repository uses a Vite/React frontend, an Express API, and PostgreSQL. The production hosting stack is GitHub, Vercel, and Supabase only. Vercel serves the frontend and runs the API with Vercel Functions; Supabase provides persistent PostgreSQL storage. Do not commit credentials or put database secrets in frontend variables.

## 1. Supabase database

1. Open your Supabase project and click Connect.
2. Choose the PostgreSQL **Session Pooler** connection URI, and ensure SSL is enabled (the application adds sslmode=require for Supabase URIs when it is missing).
3. Keep the complete URI private. It is the value for the server-side DATABASE_URL environment variable. URL-encode reserved password characters such as @, :, /, #, or ?.
4. The API applies src/db/schema.sql during initialization. This creates/updates application tables, including users, users_secrets, and backend_storage. Password hashes belong in users_secrets; never store plain-text passwords.

**Why Session Pooler?** The current service layer uses synchronous collection snapshots. To avoid stale snapshots overwriting newer marketplace data across Vercel instances, the Vercel API takes a PostgreSQL session-level advisory lock for each API request, reloads the stored collections, and waits for queued writes before responding. That lock requires a session-preserving connection, so do not use Supabase's transaction-mode pooler URI for this version.

## 2. Vercel environment variables

In Vercel, open the project → Settings → Environment Variables. Add the following server-side variables for Production:

- DATABASE_URL = Supabase Session Pooler URI
- JWT_SECRET = a unique private random secret of at least 32 characters
- ADMIN_PASSWORD = a strong private administrator password
- NODE_ENV = production
- REQUIRE_POSTGRES = true
- GEMINI_API_KEY = optional, if live AI answers are required
- GEMINI_MODEL = optional override for the configured model
- CORS_ORIGIN = optional comma-separated exact browser origins, for example https://your-project.vercel.app

Do not prefix secrets with VITE_. Vite exposes any VITE_* value to browser code.

The frontend and API use the same Vercel domain, so leave VITE_API_BASE_URL unset. The frontend calls /api on its own origin.

## 3. Build and routing

- Connect the GitHub repository akdevelop8-svg/ETHIO-ONLINE-MARKETING4 to the existing Vercel project.
- Set the project root to the repository root.
- Select Node.js 22.x in Vercel's project settings.
- Let Vercel use the repository's existing build command. It builds the Vite frontend; the API entry points are api/index.ts and api/[...path].ts.
- After adding or changing environment variables, redeploy the project.

The API intentionally fails closed in production if PostgreSQL configuration or the persistent database is unavailable; it must not silently switch to memory-only storage.

## 4. Post-deployment checks

1. Open https://YOUR-VERCEL-DOMAIN/api/health and confirm "status":"ok".
2. Open https://YOUR-VERCEL-DOMAIN/api/health/db and confirm "status":"connected".
3. Register a new test account, sign out, sign in again, and refresh.
4. Test listing submit/review, orders, notifications, and admin operations with test data. Do not test real payments until all relevant flows have been reviewed.
5. If AI is enabled, test one normal question and check Vercel runtime logs for provider errors.

## 5. Important limitations and data migration

The current marketplace domain layer still uses synchronous in-memory snapshots, so this deployment path serializes API requests through a database advisory lock. It is appropriate only as a compatibility step for initial operation and limits throughput. Before handling substantial concurrent traffic or real-value transactions, migrate reads and writes to direct PostgreSQL queries/transactions with row-level or domain-specific concurrency controls.

Only records written after the production API is connected to Supabase are guaranteed to persist there. Browser-local, demo, or in-memory records are not automatically migrated. Back up and explicitly migrate any real existing customer data before replacing an existing production database.

The authorized administrator usernames are @mr_ebek and @EXO_SMM. Keep passwords, database URIs, JWT secrets, and AI keys private.
