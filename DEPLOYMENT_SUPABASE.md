# EOM Production Deployment: Supabase, Render, and Vercel

This app uses an Express API and PostgreSQL. Supabase supplies the managed PostgreSQL database; the backend connects with `pg` and applies `src/db/schema.sql` during startup. Do **not** put database credentials in frontend variables or commit real secrets.

## 1. Create the database in Supabase

1. Create a Supabase project and wait until its database is available.
2. Open **Project Settings → Database → Connection string**.
3. Choose the **Session pooler** connection URI when deploying on a host that may not support a direct IPv6 connection. Use the URI format Supabase shows for your project and set SSL mode to `require`.
4. If the database password has symbols such as `@`, `:`, `/`, `#`, or `?`, URL-encode those characters before placing it in the URI.
5. Keep the URI private. It is a backend secret.

The app runs `src/db/schema.sql` when the backend starts. This creates/updates the app's SQL tables, including `users`, `users_secrets`, and `backend_storage`. Customer passwords are stored as bcrypt hashes in `users_secrets`; never store plain-text passwords.

## 2. Configure the backend host (Render)

In the Render service that runs this repository, set these environment variables in **Environment**:

- `NODE_ENV=production`
- `REQUIRE_POSTGRES=true`
- `DATABASE_URL=<the Supabase Session Pooler URI>`
- `JWT_SECRET=<a unique random secret of at least 32 characters>`
- `ADMIN_PASSWORD=<a strong private admin password>`
- `GEMINI_API_KEY=<your server-side Gemini API key>`
- `GEMINI_MODEL=gemini-3.8-flash`
- `CORS_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app`

For a custom frontend domain, include its exact origin in `CORS_ORIGIN` as well, separated by a comma. Origins should include the scheme (for example `https://`) but no path or trailing slash.

Recommended Render commands:

- Build: `npm install --include=dev --no-audit --no-fund && npm run build`
- Start: `npm start`
- Health check: `/api/health`

The backend now refuses to start in production when `REQUIRE_POSTGRES=true` but the database URL is missing/invalid or persisted application data cannot be loaded. This prevents silent use of memory-only storage.

## 3. Configure Vercel when frontend and backend are on different hosts

If Vercel hosts only the built React frontend and Render hosts the Express API:

1. Open the Vercel project for this frontend.
2. Go to **Settings → Environment Variables**.
3. Add `VITE_API_BASE_URL` with the **backend origin only**, e.g. `https://YOUR-RENDER-SERVICE.onrender.com`. Do not append `/api`; the application adds that automatically. An origin that already ends in `/api` is also normalized.
4. Apply it to Production (and Preview if you test preview deployments).
5. Redeploy the frontend so Vite embeds the new value into the build.

Do not set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_PASSWORD`, or `GEMINI_API_KEY` as `VITE_*` variables. Every `VITE_*` variable is visible to the browser.

If the same Express service on Render serves both the frontend and API, leave `VITE_API_BASE_URL` unset; same-origin `/api` requests are correct.

## 4. Verify the deployment

Open these URLs using the actual backend origin:

1. `https://YOUR-BACKEND-ORIGIN/api/health` → should return JSON with `"status":"ok"`.
2. `https://YOUR-BACKEND-ORIGIN/api/health/db` → must return `"status":"connected"`; `"simulated"` is not acceptable for production.
3. Open the frontend, register a **new test account**, sign out, sign back in, and refresh the page.
4. Check the Supabase SQL editor for the new row in `public.users` and its hash in `public.users_secrets`. Never expose or copy the hash to the frontend.
5. Sign in to the Admin Portal and verify the customer appears in the Users tab.
6. Send a normal question in the AI assistant. If the API is reachable but the AI reports a configuration problem, check the Render logs and the server-side `GEMINI_API_KEY` / `GEMINI_MODEL` values.

Unknown `/api/*` URLs now return a JSON 404 instead of the SPA's HTML page, which makes routing mistakes easier to diagnose.

## Important data note

Only records written after the production backend is connected to Supabase are guaranteed to persist there. Any prior demo/local-storage/in-memory records are not automatically migrated by deploying this code. Back up and explicitly migrate any real pre-existing customer data before deleting or replacing an older database.
