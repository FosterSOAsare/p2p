# Admin Pages

Page-by-page spec for the Admin/Moderator role, per [PLAN.md](PLAN.md). Admins are a separate elevated role, not a buyer/vendor upgrade — access is provisioned internally, not applied for. This file covers the tooling admins need to keep KYC, escrow, and disputes running.

## 1. Admin Login
- Separate login surface from buyer/vendor auth, same credentials model but with mandatory two-factor.
- No self-service signup — accounts are provisioned by another admin (see Admin Users, below).

## 2. Admin Dashboard
- At-a-glance counts: pending KYC reviews, open disputes (by age, oldest-first), flagged listings, orders/deals stuck near auto-release expiry.
- Platform health: KYC provider webhook failures, payout batch failures, ledger reconciliation warnings.
- Quick links into each queue below.

## 3. KYC Review Queue
- List of vendor applications the third-party provider flagged for manual review (not auto-approved/rejected), plus appeals of a `rejected` decision.
- Each row: applicant username, provider reference ID, provider's decision/confidence signal, submitted date.
- Detail view: only what the provider exposes (decision reasoning, document-type flags) — never raw ID images/PII stored outside the provider, per [PLAN.md](PLAN.md).
- Actions: approve (`kyc_status → verified`), reject (with reason sent to applicant), suspend an already-verified vendor (e.g. after fraud reports).

## 4. Disputes Queue
- List of open disputes across both marketplace orders and standalone escrow deals: opened_by, reason, amount, age, status (submitted / under review / appealed).
- Sort by age/amount so nothing sits unresolved near an auto-release deadline.
- Appealed cases are flagged distinctly and routed to a different or senior admin than whoever issued the original resolution.
- Each row links to Dispute Detail.

## 5. Dispute Detail
- Full context: order/deal terms, both parties' usernames, amount, currency, rail, release condition.
- Read-only view of the order/deal's **built-in chat thread**, auto-attached as the primary evidence source (per the Order Detail chat in [buyer.md](buyer.md) and [seller.md](seller.md)) — no need for either party to manually forward messages.
- Additional evidence: photos, tracking, receipts uploaded by either party.
- Resolution actions: release to seller/counterparty, refund to buyer/creator, partial split, or request more evidence from either party.
- If this case is an appeal, the prior resolution and the appealing party's stated reason are shown alongside the original evidence, and the resolving admin's decision here is final (per [buyer.md](buyer.md), one appeal per dispute).
- All actions timestamped and attributed to the resolving admin (audit trail).

## 6. Orders & Escrow Deals Oversight
- Search/lookup any order or standalone deal by ID, username, or amount — not just disputed ones.
- View full ledger entries for a deal (per [PLAN.md](PLAN.md) `LedgerEntry`, append-only).
- Manual override actions (used sparingly, always logged): force-hold funds pending investigation, manual release, manual refund.

## 7. Users
- Search all accounts (buyers and vendors): username, email, join date, role, KYC status if applicable.
- Actions: suspend/ban account, force-logout sessions, view a user's order/deal history for support purposes.
- Vendor-specific: view payout account status (without exposing full bank/wallet details), reset KYC to force re-verification.
- Visibility into who a user has blocked/been blocked by (per [buyer.md](buyer.md) block-vendor action) — useful context when investigating a report.

## 8. Listings Moderation
- Queue of reported/flagged listings (from buyer reports or automated policy checks): reason, reporter, listing snapshot.
- Actions: remove listing, warn vendor, escalate to Users for suspension.
- Includes moderation of paid-promotion listings (per [seller.md](seller.md) Promote Listing) — a boosted listing that gets removed should also void/refund the remaining promotion.

## 9. Fee & Payout Configuration
- Platform fee schedule (marketplace vs. standalone escrow, fiat vs. crypto rail).
- Listing promotion pricing/tiers (per [seller.md](seller.md) Promote Listing) and revenue reporting on boosted listings.
- Payout batch settings/schedule for the fiat rail; gas/fee handling policy for the crypto rail.
- Changes here are logged in the Audit Log — this affects live money movement.

## 9a. Support Tickets
- Queue of tickets/live-chat sessions opened from the buyer/seller Support/Help page (per [buyer.md](buyer.md)) — distinct from per-order chat and from Disputes, since these are general platform questions, not transaction-specific evidence.
- Each ticket: user, subject, status (open/pending/resolved), assigned admin.
- Escalation path: a ticket that turns out to be transaction-related can be converted into/linked with a Dispute Detail record.

## 10. Audit Log
- Append-only record of every admin action across all pages above: who, what, when, on which entity.
- Filterable by admin, action type, date range — the accountability backbone for KYC decisions, dispute resolutions, and manual ledger overrides.

## 11. Admin Users
- List of provisioned admin accounts and their permission level (e.g. full admin vs. support/read-only vs. KYC-reviewer-only), if roles are split later.
- Add/remove admin access — restricted to a super-admin tier.
