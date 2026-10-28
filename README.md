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

This project is intended to use only GitHub, Vercel, and Supabase. Vercel hosts the React frontend and routes `/api/*` requests to the Express serverless function in `api/[...path].ts`. Supabase provides PostgreSQL persistence.

### Vercel project settings

- **Framework Preset:** Vite (or Other if Vite is not detected)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node.js Version:** 22.x

The repository includes `vercel.json` and a catch-all API function. Do not create a separate Render service.

### Vercel environment variables

Set these under **Project → Settings → Environment Variables** for Production (and Preview only if needed):

- `DATABASE_URL` — Supabase PostgreSQL Session Pooler URI; keep it server-side.
- `JWT_SECRET` — unique, randomly generated secret of at least 32 characters.
- `ADMIN_PASSWORD` — private password for the authorized admin accounts.
- `GEMINI_API_KEY` — server-side Gemini API key if AI features are enabled.
- `NODE_ENV=production`
- `REQUIRE_POSTGRES=true`

Optionally set `CORS_ORIGIN` to the exact frontend origin if cross-origin access is needed. Same-origin frontend requests to `/api/*` do not require a separate backend URL or `VITE_API_BASE_URL`.

After changing environment variables, redeploy the project. Never place database credentials, JWT secrets, admin passwords, or AI provider keys in a `VITE_*` variable or commit real values to GitHub.

### Supabase database

1. Open the Supabase project and choose **Connect** or **Project Settings → Database**.
2. Copy the **Session Pooler** connection URI and set it as `DATABASE_URL` in Vercel.
3. Keep the database password private. URL-encode special characters if required by the URI.
4. The server applies `src/db/schema.sql` during initialization.

### Verify after deployment

- `https://YOUR-VERCEL-DOMAIN/api/health` should return JSON with `"status":"ok"`.
- `https://YOUR-VERCEL-DOMAIN/api/health/db` should return `"status":"connected"`.
- Register a new test account, sign out, sign back in, and refresh.
- Confirm the test account is saved in Supabase. Never expose password hashes.

**Important:** The API is being adapted from a long-running Express server to Vercel serverless execution. Verify registration, login, listings, orders, admin actions, AI, and database persistence in the deployed preview before relying on it for real customers or payments. Serverless instances can start independently, so any in-memory cache must not be treated as the source of truth.

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
