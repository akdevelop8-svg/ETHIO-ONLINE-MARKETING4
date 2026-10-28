<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/29b3fcc3-c6b8-4a4e-8f96-86be4c2534fa

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install --include=dev --no-audit --no-fund`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## PRODUCTION DEPLOYMENT — Vercel + Supabase

The production stack is deliberately limited to **GitHub, Vercel, and Supabase**. Vercel serves the Vite frontend and runs the Express API through Vercel Functions; Supabase provides PostgreSQL persistence.

### Vercel deployment

Connect this repository to your existing Vercel project. Keep the project root set to the repository root and use Node.js 22.x. Vercel builds the Vite frontend from the existing build script, while api/index.ts and api/[...path].ts expose the API routes.

Configure these **server-side Vercel Environment Variables** for Production (and Preview only if you want preview deployments to access a database):

- DATABASE_URL — the Supabase PostgreSQL **Session Pooler** URI, with SSL enabled.
- JWT_SECRET — a private random secret of at least 32 characters.
- ADMIN_PASSWORD — a strong private administrator password.
- NODE_ENV=production
- REQUIRE_POSTGRES=true
- GEMINI_API_KEY — optional, for live AI answers.
- GEMINI_MODEL — optional model override; if omitted, the application uses its configured default.
- CORS_ORIGIN — optional comma-separated list of exact trusted browser origins. Include https:// and no trailing slash.

Do not put DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD, or GEMINI_API_KEY in a VITE_* variable or commit them to GitHub. The frontend and API share the same Vercel origin, so leave VITE_API_BASE_URL unset; the browser will call /api on the current site.

### Supabase database setup

1. In Supabase, open Connect and choose the **Session Pooler** connection string.
2. Copy its URI into Vercel's DATABASE_URL variable and keep the password private. If the password contains reserved URI characters, URL-encode them.
3. The application runs src/db/schema.sql during API initialization. It creates the database tables, including users, users_secrets, and backend_storage.
4. Redeploy the Vercel project after saving the environment variables.

**Important design note:** the marketplace's existing service layer works with synchronous in-memory collection snapshots. On Vercel, API requests are therefore serialized with a PostgreSQL session-level advisory lock, collections are refreshed from the database before each request, and queued writes are flushed before a successful response is sent. This is a compatibility measure for the current codebase and limits API throughput. As traffic grows, replace the snapshot store with direct, transaction-based database operations before allowing concurrent high-volume orders or payments.

### Verify the deployment

Open these URLs on the deployed Vercel domain:

1. /api/health → JSON with "status":"ok".
2. /api/health/db → JSON with "status":"connected". A "simulated" result is not suitable for production.
3. Register a new test user, sign out, sign back in, and refresh the page.
4. Test listing submission and moderation with non-financial test data.
5. Send a normal question to the AI assistant if GEMINI_API_KEY is configured.

The production API now refuses to initialize when the required PostgreSQL database is not configured or its persisted data cannot be loaded. A failed persistence write should return a retryable error rather than silently acknowledging success.

Only records written after the production API is connected to Supabase are guaranteed to persist there. Existing browser-local, demo, or in-memory records are not automatically migrated. Back up and explicitly migrate any real data before replacing an existing production database.

Authorized admin usernames remain @mr_ebek and @EXO_SMM. Do not share admin credentials, database connection strings, or API keys in chat or commit them to GitHub.

## EOM v2.0.0 — Marketplace & Escrow lifecycle
- Seller submissions use the server-authoritative `/api/listings/create` flow and enter `PENDING_REVIEW`.
- Admins `@mr_ebek` and `@EXO_SMM` can Approve/Reject listings from Admin → Moderation.
- Approved listings are `ACTIVE`; an accepted purchase reserves the listing as `ON_PROGRESS`; completed purchases become `SOLD OUT`.
- Cancelled/rejected orders release the listing back to `ACTIVE` when appropriate.
- Buyer payment supports Telebirr, CBE, and Bank of Abyssinia, with receipt + sender/reference notes sent to Admin → Payments.
- Admin payment Approve creates a durable handover ticket containing the buyer, item, order/transaction IDs, and the authorized Telegram contacts.
- Payment Reject requires a reason and notifies the buyer so corrected evidence can be resubmitted.
- Email, phone (when provided), and username uniqueness are enforced server-side. Registration no longer exposes the old rigid `username must be 3-32 characters` message.
- Admins can remove approved listings from the marketplace while preserving the audit trail.
- `AK DEVELOP ™` remains only in the footer attribution and the AI developer attribution; administrative UI uses `mr_ebek & EXO_SMM`.
