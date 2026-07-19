# Buyer Pages

Page-by-page spec for everything a buyer sees and does, per [PLAN.md](PLAN.md). Buyers never need vendor KYC — only a standard account. Every page below is scoped to the buyer role; vendor-only and admin-only pages are out of scope for this file.

## 1. Home / Landing
- Hero: value prop (trust-first P2P marketplace, escrow built in).
- Entry points: "Browse marketplace" and "Start an escrow deal" (standalone, non-marketplace).
- How-it-works summary strip: sign up → browse/agree → funds in escrow → confirm → release.
- Trust signals: number of completed deals, dispute resolution rate (if available).

## 2. Sign Up / Log In
- Sign up: username, email, password (or OAuth), terms acceptance.
- Log in: email/username + password, "remember me," link to Forgot Password.
- Verify email: sent on signup, resend-link option, blocks nothing critical but nags until confirmed.
- Forgot password: enter email → sends reset link.
- Reset password: token-based link from email → set new password → redirect to login.
- Change password (while logged in): current password + new password, lives here and is linked from Account Settings.
- Two-factor / security prompts (optional, later): code entry on login if enabled in Account Settings.
- Post-signup redirect: straight into buyer experience (no KYC gate — that's vendor-only).

## 3. Marketplace / Browse
- Search bar + filters: category, price range, condition, shipping area, seller verification status.
- Listing grid: image, title, price, shipping estimate, vendor username, verified-vendor badge.
- Sort: price, newest, seller rating.
- Save action on each card (heart/bookmark icon) — adds to Saved Listings without leaving the grid.
- Save search: persist the current filter combination and revisit it later from Saved Listings.
- Empty/no-results state.

## 4. Saved Listings
- Grid of listings the buyer has bookmarked, same card format as Marketplace Browse, with a "still available" / "price changed" / "no longer listed" indicator.
- Saved searches list: name, filter summary, "run search" action, remove.
- Unsave action per item.

## 5. Listing Detail
- Title, images, price, condition, quantity available, description.
- Vendor panel: username, KYC/verified badge, rating, response time.
- Shipping/return policy section.
- Primary action: "Buy now" → creates an Order and routes to Checkout.
- Secondary: "Message vendor" (pre-purchase question), "Save," "Report listing," "Block vendor" (hides this and all other listings from the vendor, prevents them from messaging).

## 6. Checkout
- Order summary: item, price, quantity, shipping address.
- Payment rail choice: fiat or crypto (per [PLAN.md](PLAN.md) escrow module).
- Escrow terms preview: release condition (buyer confirmation / auto-release timer), fee breakdown.
- Confirm & pay → funds authorized/locked into the order's `EscrowDeal`.

## 7. My Orders
- List of orders with status: created, escrow_funded, shipped, delivered/confirmed, released, disputed, refunded.
- Filters: active vs. completed vs. disputed.
- Each row links to Order Detail.

## 8. Order Detail
- Item, vendor, amount, currency, rail, timeline of status changes.
- Shipment/tracking info (if provided by vendor).
- Built-in chat: buyer and vendor message each other directly on the order (questions, delivery coordination, dispute discussion) — persisted per-order, timestamped, read receipts. If a dispute is opened, this thread is attached as evidence automatically rather than requiring a manual upload.
- Primary actions: "Confirm receipt" (triggers escrow release), "Open dispute."
- Auto-release countdown if applicable.
- Link to leave a rating once completed.

## 9. Start an Escrow Deal (standalone, non-marketplace)
- No listing required — this is the third-party-contract path from [PLAN.md](PLAN.md).
- Fields: counterparty username, amount, currency, rail (crypto default, fiat selectable), release condition (manual confirm / timer / milestone), description of the deal.
- Send to counterparty for acceptance before funds lock.

## 10. My Escrow Deals (standalone)
- List of standalone deals separate from marketplace orders: draft, awaiting acceptance, funded, released, disputed, refunded.
- Each row links to Escrow Deal Detail.

## 11. Escrow Deal Detail (standalone)
- Counterparty, amount, currency, rail, release condition, expiry.
- Status timeline (audit trail per [PLAN.md](PLAN.md) `LedgerEntry`).
- Built-in chat with the counterparty, same as Order Detail — persisted per-deal, auto-attached as dispute evidence if opened.
- Actions: confirm/release, open dispute, cancel (if still pending acceptance).

## 12. Disputes
- Open dispute form: reason, additional evidence upload (photos, tracking, receipts) — the order/deal chat thread is attached automatically, no need to re-upload it.
- Dispute status view: submitted → under review → resolved, with admin resolution notes once closed.
- Appeal: if either party isn't satisfied with the resolution, a time-limited "Appeal this decision" action re-opens the case for a different/senior admin, with a required reason. One appeal per dispute to prevent stalling.

## 13. Wallet / Payment Methods
- Fiat: linked payment method(s) for checkout/escrow funding.
- Crypto: connected wallet address(es), balance/transaction history relevant to the buyer's deals.
- Add/remove payment method.

## 14. Ratings & Reviews
- Ratings the buyer has given (per order/deal) and can still leave.
- Ratings the buyer has received as a counterparty (visible on their own profile).

## 15. Notifications
- Order/deal status changes, dispute updates, auto-release warnings, messages from vendors/counterparties.
- Read/unread state, link-through to the relevant Order/Deal Detail page.

## 16. Profile
- Public-facing page shown to vendors/counterparties: username, avatar, join date, rating summary, count of completed orders/deals.
- Recent reviews received (pulled from Ratings & Reviews).
- No private data (email, payment methods) ever shown here — that's Account Settings.
- Own-profile view adds an "Edit profile" action (display name, avatar, bio) that opens into Account Settings.

## 17. Account Settings
- Account info: username, email, password (change password links to the Auth flow in section 2).
- Profile edit: avatar, display name, bio — feeds the public Profile page.
- Security: linked login methods, active sessions, two-factor toggle.
- Notification preferences.
- Linked payment methods (shortcut to Wallet page).
- Blocked users: list of blocked vendors/counterparties, with an unblock action.
- Danger zone: deactivate/delete account.

## 18. Support / Help
- FAQ / help center articles (how escrow works, how disputes work, KYC basics).
- Contact platform support: live chat or ticket form, separate from the per-order buyer↔vendor chat — this thread goes to platform staff, not the counterparty.
- Ticket status tracking if a support request was filed.
