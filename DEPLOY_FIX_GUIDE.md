# EOM Production Fix — Render Deployment

This package fixes the production blockers found in the deployed EOM build.

## 1. What was broken

- `users_secrets` was queried during customer registration/login but was never created by `schema.sql`.
- `backend_storage` was used by the persistence adapter but was never created by `schema.sql`.
- The PostgreSQL persistence adapter loaded normalized SQL tables into camelCase application repositories, so saved marketplace objects could disappear after a restart.
- Production authentication correctly requires `JWT_SECRET`, but Render was not configured with it.
- The production deployment is standardized on npm; the repository no longer depends on Bun tooling.
- The current source contains `src/components/transactions/BuyerPaymentModal.tsx`; the earlier Render commit did not contain/resolve that file, causing the Vite build error.

## 2. Render Environment Variables

Set these in Render → EOM → Environment:

- `DATABASE_URL` = your real PostgreSQL connection URL
- `JWT_SECRET` = a long random secret (at least 32 characters; do not use the example value)
- `GEMINI_API_KEY` = your Gemini API key
- `NODE_ENV` = `production`

Optional:

- `CORS_ORIGIN` = your deployed EOM URL if you want to restrict CORS. `*` is used when omitted.

## 3. Build and start commands

This package uses **npm**. Do not use Bun for this repository unless you intentionally add a Bun lockfile.

Build Command:

`npm install --include=dev --no-audit --no-fund && npm run build`

Start Command:

`npm start`

Health Check Path:

`/api/health`

Recommended Node version: **22.x**.

## 4. Database behavior

On server startup, EOM automatically executes `src/db/schema.sql`.
The schema now creates:

- `users`
- `users_secrets`
- `listings`
- `orders`
- `transactions`
- `disputes`
- `audit_logs`
- `notifications`
- `backend_storage`

Customer email verification is disabled: successful registration marks the account verified and immediately signs the customer in.

## 5. Admin login

Only these two handles are accepted by the admin login logic:

- `@mr_ebek`
- `@EXO_SMM`

The admin password is currently defined by the application logic. For a real public production launch, move it to a Render secret and rotate it after testing.

## 6. Required test order after deployment

1. Open `/api/health` and confirm `status: ok`.
2. Open `/api/health/db` and confirm `status: connected`.
3. Register a brand-new customer account.
4. Confirm the account is automatically signed in without email verification.
5. Refresh the page and confirm the session remains valid.
6. Open Dashboard, Account, Sell, and Orders.
7. Submit a listing as the customer.
8. Sign in as `@mr_ebek` or `@EXO_SMM` and approve the listing.
9. Confirm the approved listing appears in Marketplace.
10. Test buyer order creation and payment verification.
11. Test admin escrow release/refund/dispute controls.

Do not publish real payment credentials, database passwords, or JWT secrets in GitHub.
