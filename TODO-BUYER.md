# BUYER — TODO

> Status audit updated 2026-07-23 (post escrow-engine + order lifecycle).
> Endpoint detail: [server/TODO.md](server/TODO.md).

## ✅ Done

- [x] Auth end-to-end: signup (username + live availability), login (email or username), verify-email (JWT links), forgot/reset/change password, refresh rotation
- [x] Profile & settings: prefill from `/me`, phone update, notification prefs (auto-save), live KYC status card
- [x] Marketplace: URL-driven search / category / sort / pagination, listing detail, 27 real categories
- [x] Saved listings (real bookmarks), seller profiles + vendor blocking (with reason)
- [x] **Checkout** (`/checkout?listing=`): quantity, payment method (simulated momo/card), live fee breakdown → escrow funded on the fly (no wallet/deposit needed)
- [x] **Order lifecycle**: My Orders list (`?role=buyer`), deal detail w/ 5-state stepper + timeline, **Confirm Receipt & Release** (buyer paid seller), Open Dispute (freezes deal)
- [x] **Reviews**: rate the seller after a completed deal → flows to seller profile rating + listing reviews
- [x] Message button → 1:1 thread (UI shell); Disputes nav → `/escrow?tab=disputed`

## ❌ Left

- [ ] **Buyer Dashboard** (`/dashboard` → `UserDashboard`) — still mock (`userProfile.ts`). Wire real data: action-needed queue (deals awaiting my release), active orders count, total spent (Σ disbursed as buyer), saved-items count. *(6 of the remaining type errors)*
- [ ] **Buy Now UX** — disable / relabel on ProductDetail when the listing is out of stock or is the buyer's own (checkout already guards both server-side; this is polish)
- [ ] Buyer view of a dispute they're party to — currently shows frozen banner; fine until admin ruling exists (see admin TODO)

## ❌ Left — standalone escrow (second pillar, not marketplace)

- [ ] **NewEscrow page** — wire to `POST /api/escrows` (`createStandalone`): GH₵/TRX (drop USD/Stripe copy), counterparty by username, "I am the buyer/seller" selector, fund step
- [ ] **Join by code** — public preview (`GET /api/escrows/code/:code`) + accept (`/code/:code/accept`); share screen + QR
- [ ] **TRX / crypto rail** — deposit address, TronGrid confirmation watcher, Tronscan links (standalone only; marketplace stays fiat)
- [ ] Milestones for service/digital deals (schema ready)

## ⏸ Parked

- [ ] Live messaging via WebSocket (button + thread shell exist)
- [ ] Report listing (stretch)
