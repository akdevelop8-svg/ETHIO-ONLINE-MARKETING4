# EOM Production Deployment: Vercel + Supabase

This project is configured to use GitHub for source control, Vercel for the frontend and Express API serverless function, and Supabase for PostgreSQL. A separate Render service is not required.

## 1. Deploy from GitHub to Vercel

1. Open the Vercel dashboard and import `akdevelop8-svg/ETHIO-ONLINE-MARKETING4`.
2. Use the `main` branch for production. For this serverless migration, first deploy the feature branch as a Preview and test it before merging.
3. Use Node.js 22.x.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. The repository's `vercel.json` configures the Vite build and includes the SQL schema file in the API function bundle.
7. The catch-all function at `api/[...path].ts` forwards API requests to the Express app exported through `appPromise` in `server.ts`.

Vercel should serve the static React build and route API endpoints under `/api/*` to the serverless function on the same domain. The frontend should therefore use the default same-origin API URL; do not set `VITE_API_BASE_URL` for this deployment.

## 2. Configure Supabase

1. Create or open the Supabase project and wait until its database is available.
2. Find the PostgreSQL **Session Pooler** connection URI under **Connect** or **Project Settings → Database**.
3. Keep the URI private. If its password contains URL-special characters, encode them correctly.
4. The app applies `src/db/schema.sql` during server initialization.

## 3. Configure Vercel environment variables

Open **Vercel → Project → Settings → Environment Variables** and add:

- `DATABASE_URL` — Supabase PostgreSQL Session Pooler URI.
- `JWT_SECRET` — unique random server-side secret of at least 32 characters.
- `ADMIN_PASSWORD` — strong private password for the authorized admin usernames.
- `GEMINI_API_KEY` — server-side Gemini key if AI features are enabled.
- `NODE_ENV` — `production`.
- `REQUIRE_POSTGRES` — `true`.

Only set `CORS_ORIGIN` if you need to allow a separate frontend origin. For the same-origin Vercel frontend and API, it can be left unset. Never put any secret in a `VITE_*` variable or commit a real secret to GitHub.

Redeploy after setting or changing environment variables.

## 4. Verify the deployment

Use your actual Vercel domain:

1. `/api/health` should return JSON containing `"status":"ok"`.
2. `/api/health/db` must return `"status":"connected"`; `"simulated"` is not acceptable for production.
3. Register a new test account, sign out, sign back in, and refresh the page.
4. Confirm the test account exists in Supabase.
5. Test listing creation, buying/order flow, admin moderation, notifications, and AI.
6. Review Vercel function logs and Supabase logs for errors.

## Important serverless and data notes

This codebase was originally written as a long-running Express server and uses a persistence adapter with an in-memory cache plus asynchronous PostgreSQL writes. Vercel serverless functions can run in separate instances, so the cache may be stale across instances and background writes may not finish before a function is frozen. The deployment wiring alone does not prove that every marketplace workflow is safe for production. Test all workflows in Preview, and before real customer or payment use, ensure database writes are awaited and shared state is read from PostgreSQL rather than relying on a per-instance cache.

Existing local/demo/in-memory records are not automatically migrated to Supabase. Back up and explicitly migrate any real data before replacing an older deployment.
