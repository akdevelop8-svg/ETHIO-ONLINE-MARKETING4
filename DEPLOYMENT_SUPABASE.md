# EOM Deployment: Vercel + Supabase

This deployment uses only GitHub, Vercel, and Supabase. The Vite frontend is built into \`dist\`; \`api/[...path].ts\` sends API requests to a Node.js Vercel Function; Supabase provides PostgreSQL. No Render service or separate backend host is needed.

Never place database credentials, JWT secrets, admin passwords, or AI provider keys in frontend \`VITE_*\` variables or commit them to GitHub.

## 1. Configure Supabase

1. Open your Supabase project and wait for the database to be ready.
2. Select **Connect** and choose the **Transaction Pooler** connection URI. This is the recommended connection method for serverless traffic; it commonly uses port \`6543\`. Copy the exact URI provided by Supabase.
3. Put that URI into Vercel as the server-side \`DATABASE_URL\` variable. Do not post it in chat or commit it to GitHub.
4. Use the URI's SSL mode, or add \`sslmode=require\` if your copied URI does not already specify one. The application adds this for Supabase hosts when missing.

The application applies \`src/db/schema.sql\` when the serverless app initializes. It creates the SQL tables used by accounts and the generic \`backend_storage\` collection store. Customer password hashes are stored separately in \`users_secrets\`.

## 2. Configure Vercel

Import \`akdevelop8-svg/ETHIO-ONLINE-MARKETING4\` from GitHub. Keep the project root at the repository root. The checked-in \`vercel.json\` configures the Vite build and static output directory, includes \`src/db/schema.sql\` in the API function, and preserves SPA navigation.

Set these variables in **Vercel → Project → Settings → Environment Variables** for Production, plus Preview if you test preview URLs:

- \`DATABASE_URL\` — exact Supabase Transaction Pooler URI.
- \`JWT_SECRET\` — a unique, high-entropy random secret of at least 32 characters.
- \`ADMIN_PASSWORD\` — strong private password for the authorized administrators.
- \`REQUIRE_POSTGRES=true\` — declares the persistent database requirement.
- \`NODE_ENV=production\` — production behavior.
- \`GEMINI_API_KEY\` — optional server-side key for live AI responses.
- \`GEMINI_MODEL\` — optional AI model override.

The frontend and API use the same Vercel origin, so leave \`VITE_API_BASE_URL\` unset. Remove any old value that points to Render or another backend, then redeploy. \`CORS_ORIGIN\` is not necessary for this same-origin setup.

Do not reuse a real password from another service for \`JWT_SECRET\` or \`ADMIN_PASSWORD\`. Keep each secret private.

## 3. Serverless persistence behavior

The existing domain services use synchronous collection repositories backed by the PostgreSQL \`backend_storage\` table. A Vercel function instance cannot be treated as a permanent server, so this deployment reloads storage-backed collections from PostgreSQL at the start of each API request. It uses a PostgreSQL transaction-scoped advisory lock to serialize those requests across function instances and waits for pending writes before ending the response. This is a compatibility layer for the current architecture; because it serializes storage-backed requests, it is best for early-stage traffic rather than high-volume marketplace operation.

The database connection pool is limited to one application connection per function instance to reduce connection exhaustion. Supabase's Transaction Pooler is the intended connection string for serverless deployment.

## 4. Verify

Use the actual deployed Vercel domain:

1. \`/api/health\` should return JSON with \`"status":"ok"\`.
2. \`/api/health/db\` should return \`"status":"connected"\`. A \`503\` response means the database URI, connectivity, or schema initialization needs attention.
3. Register a new test user, sign out, sign in again, then reload the page.
4. In Supabase Table Editor or SQL Editor, verify the new account in \`public.users\` and its separate hash record in \`public.users_secrets\`. Never expose or copy a password hash.
5. Test listing creation and admin moderation, order flows, disputes, notifications, and AI fallback/live AI.
6. Review Vercel Function logs for database connection, schema, or persistence failures.

Only records written to this connected Supabase database are guaranteed to persist across invocations. Browser-local/demo records and previous in-memory records are not automatically migrated. Back up and explicitly migrate any real existing data before deleting or replacing an older database.
