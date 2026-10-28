<div align="center">
<img width="1200" height="475" alt="Ethio Online Market" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Ethio Online Market (EOM)

Ethio Online Market is a React/Vite marketplace with an Express API and Supabase PostgreSQL persistence.

**Deployment stack:** GitHub + Vercel + Supabase only. No Render service is required.

## Run locally

**Prerequisite:** Node.js 22.x.

1. Install packages:
   \`npm install --include=dev --no-audit --no-fund\`
2. Create a local \`.env\` file and set \`DATABASE_URL\`, \`JWT_SECRET\`, and \`ADMIN_PASSWORD\`. Add \`GEMINI_API_KEY\` only if the live AI assistant should be enabled.
3. Start the local app:
   \`npm run dev\`
4. Create a production frontend build:
   \`npm run build\`

The local Express entry point is \`dev-server.ts\`. Vercel serves the built Vite frontend from \`dist\` and the serverless API through \`api/[...path].ts\`.

## Deploy with Vercel + Supabase

### 1. Connect GitHub to Vercel

Import \`akdevelop8-svg/ETHIO-ONLINE-MARKETING4\` into Vercel. Keep the project root at the repository root. The checked-in \`vercel.json\` selects the Vite preset, builds the frontend into \`dist\`, includes the SQL schema in the API function, and routes SPA pages to \`index.html\`.

### 2. Configure environment variables in Vercel

Open **Project Settings → Environment Variables** and add the following to Production. Add them to Preview too when testing preview deployments.

- \`DATABASE_URL\` — Supabase PostgreSQL **Transaction Pooler** connection URI (usually port \`6543\`); copy the URI from the Supabase Connect dialog rather than constructing the host manually.
- \`JWT_SECRET\` — a unique random secret, at least 32 characters.
- \`ADMIN_PASSWORD\` — the private password for authorized administrator sign-in.
- \`REQUIRE_POSTGRES=true\` — documents that persistent storage is mandatory.
- \`GEMINI_API_KEY\` — optional server-side Gemini key for live AI responses.
- \`GEMINI_MODEL\` — optional model override for the AI assistant.
- \`NODE_ENV=production\` — recommended for production behavior.

Never put database credentials, the JWT secret, the admin password, or the Gemini API key in a \`VITE_*\` variable. Never commit real secrets to GitHub or share them in chat.

### 3. Use the same origin for frontend and API

The frontend calls \`/api\` on its own Vercel origin. Do **not** set \`VITE_API_BASE_URL\` for this deployment. If it was previously set to a Render or other backend URL, remove it from Vercel and redeploy. \`CORS_ORIGIN\` is not needed for the normal same-origin setup.

### 4. Verify the deployment

Open the deployed Vercel site and check:

1. \`https://YOUR-VERCEL-DOMAIN/api/health\` returns JSON with \`"status":"ok"\`.
2. \`https://YOUR-VERCEL-DOMAIN/api/health/db\` returns \`"status":"connected"\`.
3. Register a new test account, sign out, sign in again, and refresh.
4. Check Supabase's SQL Editor or Table Editor for the new user in \`public.users\`; the password hash is stored separately in \`public.users_secrets\`.
5. Test listing submission, admin moderation, orders, notifications, and the AI assistant.

The SQL schema in \`src/db/schema.sql\` is applied by the serverless app during initialization. If initialization fails, check the Vercel Function logs and the Supabase connection URI. Do not test using real payment credentials or real customer financial information.

## Persistence and scale notes

Most marketplace services use synchronous collection repositories backed by \`backend_storage\`. On Vercel, the API reloads this data from Supabase under a transaction-scoped PostgreSQL advisory lock and waits for queued writes before sending a response. This avoids stale per-instance collection snapshots, but serializes the marketplace API's storage-backed requests and is intended for a small early-stage workload. Before substantial traffic, the long-term improvement is to convert those synchronous repository operations to direct asynchronous SQL transactions.

Only data written to the connected production Supabase database persists between serverless invocations. Local browser storage, development memory, and any older demo records are not automatically migrated. Back up and explicitly migrate any existing real records before replacing a live database.

## Marketplace behavior

- Customer accounts can register and sign in; email verification is not required by the current flow.
- Normal customers use role \`USER\` and can browse the marketplace and submit listings for review.
- Authorized admin usernames are \`@mr_ebek\` and \`@EXO_SMM\`; their password must be configured server-side.
- New seller listings enter \`PENDING_REVIEW\` and become public only after an authorized administrator approves them.
- The stated marketplace commission is 25%; seller payout is 75% of the order amount.
- Payment evidence must be checked by an authorized administrator. Uploading proof alone does not mean a payment is verified.
- \`AK DEVELOP ™\` remains the footer and AI developer attribution.
