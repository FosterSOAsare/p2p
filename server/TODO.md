# Server TODO — API by persona

Express + TS · Prisma 7 + Neon Postgres · JWT Bearer (access + rotating refresh) · argon2id.
5-state escrow `created → funded → delivered → disbursed | disputed`. GHS fiat/momo is **simulated**; TRX (TRON Shasta) is **not built**. Fees: fiat 1.5% (min GH₵2, cap GH₵150) / crypto 1.0%, 50/50 split, stored once, invariant `fundingTotal = sellerPayout + fee`.

Legend: `[x]` done · `[ ]` not built · 🔒 auth required · 👑 admin · 🏪 seller (`requireSeller`).

---

## Shared — every authenticated account

### Auth (`/api/auth`)
- [x] `POST /signup` `{username,email,password,fullName}` → `{user}` (**no auto-login**); 409 on taken; reserved-username check; sends simulated verify email → user must verify then log in
- [x] `POST /login` `{identifier(email|username),password}`; generic errors, timing-equalized; **blocks unverified email** — re-sends the link + returns 403 `details.code:email_unverified` (checked after password) so the client routes to `/verify-email`. Dev unblock: `npx tsx scripts/verify-email.ts <username>`
- [x] `POST /refresh` — rotate; reuse of a revoked token revokes the whole session family
- [x] `POST /logout` · `GET /username-available?u=`
- [x] `POST /verify-email` `{token}` (link-based) · `POST /resend-verification` 🔒
- [x] `POST /forgot-password` (generic success) · `POST /reset-password` (revokes all sessions) · `POST /change-password` 🔒
- [x] `GET /me` 🔒 — profile + kycStatus + wallets + buyer stats

### Account & profile (`/api/users`)
- [x] `PATCH /me` 🔒 · `PUT /me/notification-prefs` 🔒 (prefs stored, not yet consumed)
- [x] `GET /:username` — public profile (store identity, rating aggregate, active listings)

### Wallet (`/api/wallet`) — simulated GHS
- [x] `GET /` — `{balance(cleared), pendingClearance, escrowLocked}`
- [x] `POST /deposit` · `POST /withdraw` (guarded; blocks on pending clearance) · `GET /transactions`

### Messaging (`/api/messages`) — server done, **client not wired**
- [x] `GET /` (conversations) · `GET /:username` (thread) · `POST /:username` (send) · `POST /:username/read`
- [x] `postDealMessage()` — system lines injected into a pair's thread on lifecycle/ruling events

### Uploads (`/api/upload`)
- [x] `POST /single` · `POST /multiple` — Multer → Cloudinary (10MB, image/PDF)

---

## Buyer

- [x] `GET /api/listings` — search/category/condition/maxPrice/sort (`featured|newest|price_asc|price_desc|rating`)/paginate; cards carry avg `rating` · `GET /:id` (detail + reviews) · `GET /api/categories`
- [x] `GET/POST/DELETE /api/users/me/saved[/:listingId]` — bookmarks
- [x] `GET /api/users/me/blocked` · `POST/DELETE /api/users/:username/block` — vendor block (+reason)
- [x] `GET /api/users/me/dashboard` — buyer stats (active orders, total spent, saved, recent)
- [x] **Checkout** `POST /api/escrows/from-listing` `{listingId,quantity,paymentMethod}` → escrow born `funded` (payment simulated), stock decremented, seller notified
- [x] **Deals** `GET /api/escrows?role=buyer` · `GET /:id` (party-only)
- [x] `POST /:id/release` (delivered→disbursed, credits seller) · `POST /:id/dispute` · `POST /:id/review` (disbursed, one per party)
- [x] **Standalone escrow** `POST /api/escrows` `{title,amount,currency,role,counterpartyUsername?}` → `created` + share code
- [x] `GET /api/escrows/code/:code` (public preview) · `POST /code/:code/accept` (join) · `PATCH /:id` (edit while `created`)
- [x] `POST /:id/fund` (created→funded; **fiat only** — TRX throws 501)
- [ ] Real payment step before funding (checkout is simulated — `TODO(payments)`)

## Seller

- [x] **KYC** `POST /api/kyc` `{legalName,storeName,country,address,idType,idNumber,momoNumber?,trxAddress?}` (≥1 payout) · `GET /me`
- [x] **Listings** 🏪 `POST /` · `PATCH /:id` · `DELETE /:id` (owner-or-admin) · `GET /mine` (forces `currency:GHS`)
- [x] **Deliver** `POST /api/escrows/:id/deliver` `{carrier?,trackingNumber?,note?}` (funded→delivered)
- [x] **Payout** — on buyer release, seller wallet credited (amount − seller fee half), `escrow_release` txn
- [x] Reviews received surface on profile + listing (avg rating)
- [ ] Seller notification emails on new order / delivered / released (`TODO(notifications)`)
- [ ] Promote/boost listing (paid placement)

## Admin (`/api/admin` 👑)

- [x] **KYC** `GET /kyc?status=` · `GET /kyc/:id` · `POST /kyc/:id/approve` · `POST /kyc/:id/reject {reason}` (pending-only, records reviewer)
- [x] **Disputes** `GET /disputes?status=open|resolved|all` · `GET /disputes/:id` (deal + timeline + full chat evidence) · `POST /disputes/:id/resolve {outcome:release|refund|split, buyerRefund?, rulingNote}` → moves money, records ruling, posts verdict, 409 if resolved
- [x] **Users** `GET /users` (search/role/status/paginate) · `GET /users/:id` · `PATCH /users/:id/status` (suspend/reinstate; can't change own)
- [x] **Deals oversight** `GET /escrows?status=&search=&paginate` (read-only; parties + open-dispute flag)
- [x] `GET /stats` — KPIs dashboard (users + suspended, active listings, KYC pending, open disputes, deals per status, settled GHS volume). Client: AdminDashboard (`/admin`).
- [ ] Listings moderation (browse all incl. drafts, takedown w/ reason)
- [ ] Deals **force-override** (manual hold / release / refund) + oversight detail endpoint
- [ ] Dispute **appeals** (one per dispute, senior/different admin) · audit log · support tickets

---

## Cross-cutting — not built / deferred (all personas)

- [ ] **TRX crypto rail** (TRON Shasta / TronGrid): `GET /:id/crypto`, `POST /:id/crypto/check`, on-chain fund/payout/refund. Standalone TRX deals can be *created* but `fund`/`payout`/`refund` throw 501. `CryptoEscrow` model unused.
- [ ] **Real payments** — buyer actually pays before funding (currently simulated)
- [ ] **Email/SMS notifications** — a `mailService.send()` that logs `[mail:simulated]` on each lifecycle event (verify/reset already simulated to console)
- [x] ~~Background jobs / time-locks~~ **dropped** — the platform is fully manual (no auto-release, no dispute auto-resolve). `autoReleaseAt`/`autoResolveAt` are nulled on transition; `sweepAutoRelease()` remains in code but is never scheduled. Re-add only if timed release is ever wanted.
- [ ] **Milestones** — `Milestone` model defined but unused (digital-goods/service split funding)
- [ ] `GET /api/escrows/:id/qr` — QR data-URL for the share link
- [ ] Tidy: standalone-deal validation accepts dead `rail`/`feeSplit`/`type` (always 50/50); JWT secrets default `""` (no startup guard)
