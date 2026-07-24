# BUYER — TODO

> Status audit updated 2026-07-24 (Post Buyer Dashboard, Marketplace Checkout, Dispute Tracking & Standalone Escrow Wiring).
> Endpoint detail: [server/TODO.md](server/TODO.md).

## ✅ Done

- [x] Auth end-to-end: signup (username + live availability), login (email or username), verify-email (JWT links), forgot/reset/change password, refresh rotation
- [x] Profile & settings: prefill from `/me`, phone update, notification prefs (auto-save), live KYC status card
- [x] Marketplace: URL-driven search / category / sort / pagination, listing detail, 27 real categories
- [x] Saved listings (real bookmarks), seller profiles + vendor blocking (with reason)
- [x] **Checkout** (`/checkout?listing=`): quantity, payment method (simulated momo/card), live fee breakdown → escrow funded on the fly (no wallet/deposit needed)
- [x] **Order lifecycle**: My Orders list (`?role=buyer`), deal detail w/ 5-state stepper + timeline, **Confirm Receipt & Release** (buyer paid seller), Open Dispute (freezes deal)
- [x] **Reviews**: rate the seller after a completed deal → flows to seller profile rating + listing reviews
- [x] Message button → 1:1 thread with paperclip Cloudinary file attachment button; Disputes nav → `/escrow?tab=disputed`
- [x] **Buyer Dashboard** (`/dashboard` → `UserDashboard`) — wired to real API data (`useMe()`, `useDeals()`, `useBookmarks()`, `useDashboard()`). Displays Action-Needed queue (deals awaiting my release), Active Orders count, Total Spent (Σ disbursed as buyer), Saved items count, and recent purchases.
- [x] **Buy Now UX & Guard** — disabled / relabeled as "Out of Stock" or "Your Listing" when a product is unavailable or owned by the viewer.
- [x] **Buyer Dispute Tracking & Evidence** — live active dispute banner, pre-dispute warning callout, "Attach Photo Evidence" modal uploader, paperclip chat proof attachment, and live Admin Ruling Verdict announcement.
- [x] **Standalone Off-Platform Escrow** ([NewEscrow.tsx](file:///c:/Users/foste/Desktop/Reaper/contracts/p2p/web/src/pages/NewEscrow.tsx)) — wired to real `POST /api/escrows` endpoint (`useCreateStandaloneEscrow()`), supporting GH₵ and TRX rails, buyer/seller role toggle, fee split calculator, and instant navigation to the created escrow room (`/escrow/:id`).

## ❌ Left

*All core buyer features, checkout flows, dispute resolution systems, and standalone contract initiation are **100% complete**.*

## ⏸ Parked

- [ ] Live messaging via WebSocket (REST + thread shell with Cloudinary file attachments ready)
- [ ] Report listing (stretch)
