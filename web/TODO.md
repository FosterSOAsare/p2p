# Client TODO — by persona

React + Vite + React Router + TanStack Query. One fetch client (`features/shared/libs/api.ts`, JWT bearer + transparent refresh). Filters/pagination are **URL-query-driven**; guards are layout routes (`SellerGuard`, `AdminGuard`); role branching via `useMe()`.

Legend: `[x]` done & wired · `[ ]` not done · ⚠️ built but non-functional.

---

## Shared shell

- [x] Role-aware `Layout` nav + profile dropdown + mobile drawer (admin sees only admin chrome; buyer/seller chrome hidden for admin)
- [x] Routes: `/settings`, `/deals` (role-aware), `/wallet`, `/escrow/new`, `/escrow/:id`, marketplace, admin console
- [x] Auth state via always-enabled `useMe`; transparent 401→refresh; `apiErrorMessage` normalization
- [x] Theme toggle (light/dark), `SimulationNotice`, `ConfirmDialog`, `StarRatingInput`, `AdminSectionNav`
- [x] Legacy URLs (`/escrow`, `/user/orders`, `/user/settings`, `/seller/wallet`) fully migrated to `/deals`, `/settings`, `/wallet`; a proper **404 page** (`NotFound`) catches anything unmatched
- [x] Homepage **Featured Listings** now real (top 6 by rating via `sort=rating`); **TrustMetrics + Testimonials** intentionally static (copy updated to match features — GHS, no crypto/tiers)

## Messaging — realtime (WebSocket)

- [x] **Live 1:1 chat over Socket.IO** — `features/messages/` (socket singleton, `useChat`, `ChatPanel`, two-pane `/messages?u=` inbox). History, sends, read receipts and typing all travel over the socket; messages persist to Postgres, so the admin dispute **evidence transcript** populates automatically
- [x] Text + file messages (Cloudinary upload over HTTP, URL/metadata over the socket) — verified for images and PDFs
- [x] Deal lifecycle notices render as system chips linking to `/escrow/:id`
- [x] Live unread counts — `notify:message` / `message:read` invalidate the conversation list; total badge on the Messages nav item
- [ ] Verify the admin dispute view renders the evidence transcript end-to-end

---

## Buyer

- [x] Auth screens: signup (**no auto-login** → routes to verify-email), login (re-sends link + routes to verify-email if unverified), verify-email, forgot/reset/change password
- [x] `/settings` — profile, phone, **profile photo upload** (Cloudinary → `avatarUrl`), notification prefs (auto-save), KYC status card
- [x] Marketplace: URL-driven search/category/sort/paginate, listing detail, 27 categories
- [x] Saved listings (bookmarks), seller profiles, vendor blocking (+reason)
- [x] **Checkout** (`/checkout?listing=`): quantity, simulated momo/card, live fee breakdown → funded escrow
- [x] **Deals** (`/deals`): URL-query tabs + pagination; deal detail 5-state stepper + timeline
- [x] Confirm Receipt & Release · Open Dispute (freeze) · dispute banner + verdict render
- [x] **Reviews** after a normal completion — **hidden on admin-resolved deals** (`!deal.dispute`)
- [x] **Buyer Dashboard** (`/dashboard`) — real data (action-needed queue, active orders, total spent, saved)
- [x] **Standalone escrow** (`/escrow/new`) — `POST /api/escrows`, GHS/TRX rails, buyer/seller toggle, fee split
- [x] Photo evidence upload (Cloudinary) — *file uploads, but can't reach counterparty until messaging is wired*
- [ ] Join-by-code screen (server `GET /code/:code` + accept exist) + QR share screen
- [ ] Report listing (stretch)

## Seller

- [x] Become a seller: KYC submit → pending → rejected (prefilled resubmit) → verified
- [x] Dual payout accounts at KYC (momo + TRX, ≥1)
- [x] `SellerGuard`; Listings CRUD (create/edit/delete) + paginated My Listings w/ status tabs
- [x] **Real Cloudinary image upload** in `ListingForm` (preview thumbnails) — persists on the listing
- [x] Seller profile (`/seller/:username`) with rating + reviews
- [x] **My Sales** (`/deals`, seller deals) · deal detail
- [x] **Mark Delivered** — courier/rider name, tracking or phone, optional note, "Online" for digital
- [x] **Get paid** — wallet credited on buyer release; `escrow_release` txn
- [x] **Seller Dashboard** (`/dashboard`) — revenue, escrow-locked, available payout, sales queue, inventory
- [x] **Wallet & Payouts** (`/wallet`) — balances, withdraw modal, 24h pending-clearance hold, tx ledger
- [x] Admin-resolved dispute payouts skip the hold → straight to available balance
- [ ] Promote/boost listing (spec only)

## Admin

- [x] `AdminGuard`; four-section console: **KYC · Disputes · Users · Deals** (nav + dropdown + `AdminSectionNav`)
- [x] **KYC queue** (`/admin/kyc`) — tabs, applicant detail, approve/reject with reason
- [x] **Disputes** (`/admin/disputes`) — queue + detail drawer + release/refund/split ruling (wired end-to-end; status tab in URL params). Ruling moves money + releases frozen funds
- [x] **Users** (`/admin/users`) — search + role/status filters + pagination (all URL params); detail drawer; suspend/reinstate
- [x] **Deals oversight** (`/deals` as admin → `AdminDealsList`) — status/search/paginate in URL params; read-only; disputed rows link to arbitration
- [x] Admin **stats dashboard** (`/admin`) — KPI cards (users, listings, KYC pending, open disputes, total deals, settled volume) + deals-by-status; admin landing target (`/dashboard` → `/admin`)
- [ ] Listings moderation view · deals force-override actions · dispute appeals · audit log
- [ ] Evidence chat transcript — messages now persist, so it should populate; not yet verified in the admin view

---

## Parked / by design

- [ ] Redis adapter for Socket.IO (only needed if the API ever runs multi-instance)
- [ ] Real payment step at checkout (simulated by design)
- [ ] **TRX crypto rail** UI (deposit address, confirmations, Tronscan) — standalone TRX deals can be created but not funded
- [ ] Dead modules to remove: `sellerData.ts`, `userProfile.ts`, most of `products.ts` (homepage-only mock)
