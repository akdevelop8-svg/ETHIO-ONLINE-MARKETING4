# EOM v2.0.0

## Production lifecycle
- Fixed seller listing submission path and preserved server-authoritative moderation.
- Added explicit listing lifecycle: ACTIVE → ON PROGRESS → SOLD OUT.
- Active purchase reserves the listing; cancellation returns it to ACTIVE.
- Completed purchase marks the listing SOLD.
- Added admin marketplace removal endpoint and UI.

## Buyer payment / ticket flow
- Buyer order creation continues directly to payment instructions.
- Payment methods are limited to Telebirr, CBE, and Bank of Abyssinia.
- Buyer submits sender name, transaction/reference code, receipt screenshot, and optional note.
- Admin Payments queue supports Approve / Reject.
- Approval creates a durable EOM handover ticket with item/order/transaction IDs and @mr_ebek / @EXO_SMM contacts.
- Rejection stores the reason and notifies the buyer for corrected resubmission.
- Increased JSON request limit to safely accept a 5 MB image encoded as base64.

## Accounts
- Email, phone (when provided), and username uniqueness are enforced.
- Removed the old rigid “username must be 3-32 characters” registration message.
- Customer accounts remain server/database-backed so their orders and listings survive sign-out and redeploys when PostgreSQL is configured.
- Fixed password-reset request field mismatch.

## Branding
- Administrative attribution uses `mr_ebek & EXO_SMM`.
- `AK DEVELOP ™` remains only in the footer attribution and AI developer attribution, as requested.

## Deployment
- Version: 2.0.0
- Requires PostgreSQL in production (`REQUIRE_POSTGRES=true`).
- Set `DATABASE_URL`, `JWT_SECRET`, and `ADMIN_PASSWORD` in the deployment environment.
