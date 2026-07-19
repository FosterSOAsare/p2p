# Seller (Vendor) Pages

Page-by-page spec for everything a vendor sees and does, per [PLAN.md](PLAN.md). There is no separate seller signup — every seller must first register and sign in as a regular buyer, then apply to become a seller from within that account. Sign up, login, forgot/reset password, standalone escrow deals, disputes, and basic profile/notifications work exactly as in [buyer.md](buyer.md) and aren't repeated here except where the vendor view differs. This file covers what's added once someone applies to sell: the application step, KYC, listings, fulfillment, and payouts.

## 1. Apply to Become a Seller
- Only reachable from an existing, logged-in buyer account (entry point: button on buyer Profile/Account Settings — "Apply to sell"). There is no "sign up as a seller" path.
- Short application step first: confirm intent, agree to seller terms/fee schedule.
- Explains the gate up front: applying does not make you a seller — the account stays buyer-only until KYC finishes with `verified`. Cannot publish listings or receive payouts before that.
- On submit, the account is marked `kyc_status: pending` and the applicant is routed straight into Vendor KYC.

## 2. Vendor KYC
- Status banner at top of every vendor page while not yet verified: `unverified` / `pending` / `rejected` / `suspended`, with reason text on rejection/suspension.
- Start verification: launches the third-party provider's hosted flow (per [PLAN.md](PLAN.md) `KycProvider` interface) — full name, DOB, address, government ID, liveness/selfie, all handled by the provider, not stored locally.
- Pending state: "Under review" with provider reference ID and estimated turnaround.
- Rejected state: reason (if provider supplies one), option to re-submit.
- Verified state: confirmation + unlocks Listings and Payouts.

## 3. Vendor Dashboard
- Landing page after login for verified vendors: snapshot of active listings, pending orders needing action, unread messages, payout balance.
- Quick links into Listings, Orders, Payouts.
- KYC status banner still shown here if not yet verified (dashboard is visible pre-verification, but actions are gated).

## 4. My Listings
- Table/grid of listings: title, price, quantity, status (draft/active/paused/archived), views, pending orders count, promotion status (boosted/not).
- Filters: status, category.
- Bulk actions: pause, archive.
- Per-listing "Boost" action → routes into the Promote Listing flow (below).
- "Create listing" button — disabled with tooltip explaining the KYC gate if not yet verified.

## 5. Create / Edit Listing
- Fields: title, description, category, condition, price, currency, quantity, images, shipping options, return policy.
- Save as draft vs. publish (publish blocked until `kyc_status == verified`).
- Preview: shows exactly what buyers see on Listing Detail.

## 5a. Promote Listing (boosting)
- Paid options to increase a listing's visibility: bump to top of search/category results for a set duration, or a "featured" placement on the Marketplace Browse page.
- Duration/tier picker with price, payment taken via the vendor's linked payment method (fiat) — not routed through escrow, since it's a platform fee, not a buyer-vendor transaction.
- Active promotions shown on My Listings with expiry countdown; renew/extend action.

## 6. Incoming Orders
- List of orders against the vendor's listings: new, awaiting shipment, shipped, delivered/confirmed, disputed, released, refunded.
- Filters: needs action vs. completed vs. disputed.
- Each row links to Order Detail (vendor view).

## 7. Order Detail (vendor view)
- Buyer username, item, amount, currency, rail, full status timeline.
- Fulfillment actions: mark as shipped, add carrier/tracking number, add fulfillment notes.
- Built-in chat with the buyer — same thread as buyer's Order Detail in [buyer.md](buyer.md), persisted per-order, auto-attached as evidence if a dispute is opened.
- Dispute response: submit additional evidence (tracking, photos) if buyer opens a dispute — the chat thread is already attached.
- Shows escrow status clearly (funded/held vs. released) since payout depends on it.

## 8. Payouts / Earnings
- Balance: available (released from escrow) vs. pending (still in escrow) vs. on hold (disputed).
- Payout accounts: fiat (bank/Stripe Connect account) and crypto (wallet address) — both gated behind KYC verified.
- Settlement history: per-order/deal ledger entries, fees deducted, payout batch references.
- Request payout / view next scheduled payout.

## 9. Store Settings
- Store/display name, description, logo — public-facing on all of the vendor's listings and their Profile.
- Default shipping regions and return policy (pre-filled onto new listings).
- Payout account management (shortcut to Payouts page).

## 10. Vendor Profile (public)
- Same shape as buyer Profile in [buyer.md](buyer.md), plus: verified-vendor badge, store name/description, active listings grid, aggregate rating from completed orders.
- No KYC documents or provider reference ever shown publicly — verified/unverified badge only.

## Shared pages (see [buyer.md](buyer.md) — vendor view is the same page, same component, with vendor-specific data)
- Auth: Sign up / Log in / Verify email / Forgot & Reset password / Change password.
- Standalone Escrow Deals: Start deal, My Deals, Deal Detail — a vendor can still open third-party escrow deals unrelated to their store, same as any buyer.
- Disputes: shared dispute flow (including the appeal step), vendor just appears as the "seller" party.
- Saved Listings, Ratings & Reviews, Notifications, Support/Help, Account Settings (security, notification prefs, password, blocked users).
