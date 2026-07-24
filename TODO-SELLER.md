# SELLER — TODO

> Status audit updated 2026-07-24 (Post Seller Dashboard, Payout Wallet, Dispute Arbitration & Cloudinary Uploads).
> Endpoint detail: [server/TODO.md](server/TODO.md).

## ✅ Done

- [x] Become a seller: KYC submit → pending → rejected (reason + prefilled resubmit) → verified, admin-reviewed
- [x] Dual payout accounts at KYC (momo GH₵ + TRX address, ≥1 required)
- [x] Authorization: `requireSeller` middleware, `SellerGuard` layout route, owner-or-admin on listing mutations
- [x] Listings CRUD: create / edit / delete (ConfirmDialog), paginated My Listings w/ status tabs
- [x] Public presence: marketplace browse/detail, seller profile (`/seller/:username`) — with **rating + reviews**
- [x] **Incoming orders**: My Sales list (`?role=seller`), deal detail
- [x] **Mark as Delivered** — courier/driver/rider name, tracking or phone, optional details (+ "Online" for digital delivery)
- [x] **Get paid**: on buyer release, seller wallet credited (amount − seller fee half); `escrow_release` transaction recorded
- [x] Reviews received → rating shown on profile + listings
- [x] Deal-linked in-app messages on new order / delivered / released
- [x] **Seller Dashboard** (`/dashboard` → `SellerDashboard`) — wired to real API data (`useDashboard()`, `useWallet()`), displaying Total Sales Revenue, Escrow-Locked Balance, Available Payout Balance, merchant sales queue, and 6-item inventory grid.
- [x] **Wallet & Payouts Page** ([SellerWallet.tsx](file:///c:/Users/foste/Desktop/Reaper/contracts/p2p/web/src/pages/SellerWallet.tsx)) — accessible via `/seller/wallet` and top header `<Wallet />` icon. Mobile Money payout modal, 24-hour Pending Clearance security hold tracking, compact transaction ledger with deal reference links and status indicators (`⏳ Clears in ~Xh` / `✅ Cleared`).
- [x] **Seller Dispute View & Dual-Party Evidence** — frozen dispute state banner, pre-dispute warning notice, dual-party evidence submission in deal chat, and full Admin Dispute Arbitration Console ([AdminDisputesList.tsx](file:///c:/Users/foste/Desktop/Reaper/contracts/p2p/web/src/pages/AdminDisputesList.tsx)) with binding rulings (`release`, `refund`, `split`).
- [x] **Real Cloudinary + Multer Image Uploads** — backend upload service (`POST /api/upload/single`, `POST /api/upload/multiple`), frontend `uploadApi.ts`, interactive image upload button in [ListingForm.tsx](file:///c:/Users/foste/Desktop/Reaper/contracts/p2p/web/src/features/seller/ui/ListingForm.tsx) with preview thumbnails, and paperclip file attachment button in chat ([MessageThread.tsx](file:///c:/Users/foste/Desktop/Reaper/contracts/p2p/web/src/pages/MessageThread.tsx)).

## ❌ Left

*All core seller features, wallet cashout flows, dispute resolution systems, and image uploads are **100% complete**.*

## ⏸ Parked (by decision)

- [ ] Live messaging via WebSocket (REST + thread shell with Cloudinary file attachments ready)
- [ ] Mock email notifications (server TODO §7b)
