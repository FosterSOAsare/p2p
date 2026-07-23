# SELLER — TODO

> Status audit updated 2026-07-23 (post escrow-engine + order lifecycle).
> Endpoint detail: [server/TODO.md](server/TODO.md).

## ✅ Done

- [x] Become a seller: KYC submit → pending → rejected (reason + prefilled resubmit) → verified, admin-reviewed
- [x] Dual payout accounts at KYC (momo GH₵ + TRX address, ≥1 required)
- [x] Authorization: `requireSeller` middleware, `SellerGuard` layout route, owner-or-admin on listing mutations
- [x] Listings CRUD: create / edit / delete (ConfirmDialog), paginated My Listings w/ status tabs
- [x] Public presence: marketplace browse/detail, seller profile (`/seller/:username`) — now with **rating + reviews**
- [x] **Incoming orders**: My Sales list (`?role=seller`), deal detail
- [x] **Mark as Delivered** — courier/driver/rider name, tracking or phone, optional details (+ "Online" for digital delivery)
- [x] **Get paid**: on buyer release, seller wallet credited (amount − seller fee half); `escrow_release` transaction recorded
- [x] Reviews received → rating shown on profile + listings
- [x] Deal-linked in-app messages on new order / delivered / released

## ❌ Left

- [ ] **Seller Dashboard** (`/dashboard` → `SellerDashboard`) — still mock (`sellerData.ts`). Wire real data: total earnings, **available payout balance** + escrow-locked (from `GET /api/wallet`), recent sales, listings snapshot. *(6 of the remaining type errors)*
- [ ] **Wallet / withdraw page** — no client UI yet, though server is ready (`GET /api/wallet`, `POST /withdraw`, `GET /transactions`). Seller can earn but can't view balance or cash out. Add a wallet page: balance + escrow-locked, transaction history, simulated momo withdraw.
- [ ] Seller's view of a dispute filed against their order (frozen state shown; resolution is admin-side — see admin TODO)

## ⏸ Parked (by decision)

- [ ] Live messaging via WebSocket (REST + thread shell ready)
- [ ] Real image upload (URL-based for now)
- [ ] Mock email notifications (server TODO §7b)
