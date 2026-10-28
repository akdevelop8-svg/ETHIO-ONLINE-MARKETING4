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


## PRODUCTION DEPLOYMENT

### Render

- **Build Command:** `npm install --include=dev --no-audit --no-fund && npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`
- **Node:** 22.x recommended


Set these Render environment variables before deployment:

- DATABASE_URL — Render PostgreSQL connection URL
- JWT_SECRET — long random server-side secret
- ADMIN_PASSWORD — server-side password for the two authorized admin usernames
- GEMINI_API_KEY — Gemini API key if AI features are enabled
- NODE_ENV=production
- REQUIRE_POSTGRES=true

Customer registration does not require email verification and does not require choosing Buyer/Seller. A normal customer account uses role USER and can browse, buy, and submit listings for sale.

Authorized admin usernames remain @mr_ebek and @EXO_SMM. Do not put the admin password or JWT secret in frontend code or GitHub.


## Database and split-host frontend/API configuration

For production PostgreSQL persistence, configure `DATABASE_URL` with the Supabase PostgreSQL **Session Pooler** URI and keep `REQUIRE_POSTGRES=true`. The backend applies `src/db/schema.sql` during startup. Production startup fails rather than silently continuing in memory if the required database is unavailable.

If the React frontend is hosted on Vercel while the Express API is hosted separately (for example on Render), set Vercel's `VITE_API_BASE_URL` to the backend origin, then redeploy. Configure the backend's `CORS_ORIGIN` with the exact frontend origin. Leave `VITE_API_BASE_URL` unset only when the same Express host serves both the frontend and `/api` routes.

See [DEPLOYMENT_SUPABASE.md](./DEPLOYMENT_SUPABASE.md) for the full setup and verification checklist. Never put database credentials, the JWT secret, admin password, or AI provider key in a `VITE_*` variable or commit real values to GitHub.

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
