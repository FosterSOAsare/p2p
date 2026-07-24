# Server TODO — API Endpoints

Derived from a full audit of `web/` (every route, form field, and button) + the proposal scope:
Express + TS · Prisma + Neon · JWT (Bearer header) · 5-state escrow `created → funded → delivered → disbursed | disputed` · GHS fiat/momo **simulated** · TRX = **real TRON Shasta** (TronGrid) · usernames · share code + QR join · admin ruling + time-locked auto-resolution.

Conventions: all `🔒` routes require `Authorization: Bearer <access token>` (auth middleware). `👑` = admin only. Amounts are plain numbers. `currency: GHS | TRX`; rail is derived (GHS → fiat, TRX → crypto). Fees: fiat 1.5%, crypto 1.0% (client shows these in NewEscrow + EscrowCalculator).

---

## 0. Health

- [x] `GET /health` — status + uptime

## 1. Auth (`/api/auth`) — client: Signup, Login, VerifyEmail, Forgot/Reset/ChangePassword

- [x] `POST /signup` — `{ username, email, password, fullName }` → 201 `{ user, tokens }`; 409 taken username/email; reserved-username check; sends (simulated) verification link
- [x] `POST /login` — `{ identifier (email OR username), password }` → `{ user, tokens }`; generic error, no enumeration
- [x] `POST /refresh` — `{ refreshToken }` → new token pair (rotate session; reuse revokes all sessions)
- [x] `POST /logout` — `{ refreshToken }` → revoke session
- [x] `GET /username-available?u=` — `{ available }` (live check on signup form)
- [x] `POST /verify-email` — `{ token }` (client is **link-based**, not OTP; simulated mail → link logged to server console)
- [x] `POST /resend-verification` 🔒
- [x] `POST /forgot-password` — `{ email }` → always generic success; reset link token (simulated delivery)
- [x] `POST /reset-password` — `{ token, newPassword }` (client sends token via `/reset-password?token=`; revokes all sessions)
- [x] `POST /change-password` 🔒 — `{ currentPassword, newPassword }` (revokes sessions, returns fresh tokens)
- [x] `GET /me` 🔒 — user + profile fields the client shows (username, fullName, email, phone, avatarUrl, kycStatus, joinedDate) + dashboard counts (activeOrdersCount, totalSpent, savedItemsCount)

Out of scope (client shows but proposal drops): Google OAuth buttons → remove client-side.

## 2. Users & settings (`/api/users`) — client: UserSettings

- [x] `PATCH /me` 🔒 — `{ fullName, phone, avatarUrl }` (username immutable v1; email change out of scope; `null` clears phone/avatar)
- [x] `PUT /me/notification-prefs` 🔒 — `{ emailShipmentUpdates, smsReleaseAlerts }` (the two checkboxes)
- [x] `GET /me/saved` 🔒 — saved listing cards · `POST /me/saved/:listingId` · `DELETE /me/saved/:listingId` (bookmark toggle; both idempotent)
- [ ] *(stretch)* `POST /me/blocked/:username` + `DELETE` — vendor block toggle · `POST /api/listings/:id/report` — report listing

## 3. KYC (`/api/kyc`) — client: VendorKyc (replace fake instant approval with pending → admin review)

- [x] `POST /` 🔒 — `{ legalName, storeName, taxId?, country, address, idType, idNumber, momoNumber?, trxAddress? }` (no rail choice — both payout accounts at once, ≥1 required) → status `pending`; 409 while pending/verified; resubmit allowed after rejection (no file uploads; no tier system)
- [x] `GET /me` 🔒 — `{ status: unverified|pending|verified|rejected, rejectionReason?, submission }` (submission echo prefills the rejected-refill form)

## 4. Wallet (`/api/wallet`) — simulated GHS momo; client shows balances but has no wallet page yet (FE to add)

- [x] `GET /` 🔒 — `{ balance, escrowLocked, currency: "GHS" }`
- [x] `POST /deposit` 🔒 — `{ amount }` → instant simulated momo credit
- [x] `POST /withdraw` 🔒 — `{ amount, destination }` → instant simulated payout (guarded balance)
- [x] `GET /transactions` 🔒 — paginated history (type, signed amount, escrow link, createdAt)

## 5. Marketplace (`/api/listings`) — client: Products, ProductDetail, UserProducts, SellerDashboard

> **Rail rule:** marketplace listings are **GHS/fiat only** (simulated momo). TRX/crypto is exclusively for standalone escrow deals (§6). Listing create enforces `currency: GHS`; listing-originated escrows are always `rail: fiat`.

- [x] `GET /` — `search` (title/description/@seller), `category`, `condition`, `verifiedOnly`, `maxPrice`, `sort (featured|newest|price_asc|price_desc)`, `page`/`limit` pagination → `{ listings, total, page, pages }`
- [x] `GET /:id` — full detail + seller card (username, storeName, verified, joinedAt) + reviews + avg rating; increments `views`
- [x] `GET /api/categories` — Category table (27 seeded), ordered by position
- [x] `POST /` 🔒 (`requireSeller`) — `{ title, price, quantity, category, condition?, description?, images[] (URLs), location? }`; forces `currency: GHS`
- [x] `PATCH /:id` · `DELETE /:id` 🔒 (owner-or-admin) — edit / delete
- [x] `GET /mine` 🔒 — seller's own listings (any status), paginated + status filter
- [x] `POST /api/escrows/:id/review` 🔒 — `{ rating 1-5, comment? }` after disbursed; one per party; buyer→seller reviews surface on the listing + seller profile rating. Listing detail already returns reviews + avg rating.

## 6. Escrow — the core (`/api/escrows`) — client: Escrow list, NewEscrow, EscrowDetail, UserOrders

> Engine ported from TaaS into the 5-state model (`created → funded → delivered → disbursed | disputed`).
> Single `transition()` gateway + static machine table (status whitelist + allowed actor), status-guarded update, money moves in the same DB transaction. Fee: fiat 1.5% (min GH₵2, cap GH₵150) / crypto 1.0%, stored once; 50/50 split; invariant `fundingTotal === sellerPayout + fee`. **Payment is simulated** (no buyer wallet/charge — see §7b).

### CRUD + join
- [x] `POST /from-listing` 🔒 — checkout: `{ listingId, quantity, paymentMethod }` → creates escrow already `funded` (simulated payment), decrements stock, notifies seller in-app. Backs `/checkout`.
- [x] `POST /` 🔒 — standalone: `{ title, description?, counterpartyUsername?, role, amount, currency }` → `created`; unknown username ⇒ joinable by code. *(client NewEscrow not yet wired)*
- [x] `GET /` 🔒 — my deals; `role (buyer|seller)`, `status`, `page`/`limit`; `serialize()` incl. `availableActions` per role
- [x] `GET /:id` 🔒 (party only) — full detail: parties, status, fee breakdown, timeline events, tracking, dispute, `myReview`
- [x] `GET /code/:code` — **public** share-link preview (`creatorIsBuyer`, `joinable`)
- [x] `POST /code/:code/accept` 🔒 — join as counterparty → fills the empty side
- [ ] `GET /:id/qr` 🔒 — QR data-URL of the share link (`qrcode` pkg) *(standalone-share pillar)*

### State machine (one endpoint per event; role + current-state guarded; appends EscrowEvent + in-app deal message)
- [x] `POST /:id/fund` 🔒 (buyer) — `created → funded` (simulated; standalone deals). TRX funding not yet wired (fiat only for now).
- [x] `POST /:id/deliver` 🔒 (seller) — `funded → delivered`; `{ carrier?, trackingNumber?, note? }` (courier/rider name, tracking or phone, optional details; "Online" for digital)
- [x] `POST /:id/release` 🔒 (buyer) — `delivered → disbursed`; credits seller wallet (− seller fee). **Only after delivery** (no early release).
- [x] `POST /:id/dispute` 🔒 (either party) — `funded|delivered → disputed`; `{ reason, description }`; freezes the deal
- [x] `POST /:id/review` 🔒 — `{ rating, comment? }` after disbursed (see §5)
- [ ] Milestones — `POST /:id/milestones/:mid/deliver|release` *(digital-goods pillar; schema ready)*

### Crypto rail (TRX Shasta via TronGrid) — NOT STARTED
- [ ] `GET /:id/crypto` 🔒 — deposit address, expected/received TRX, confirmations, txids + Tronscan links
- [ ] `POST /:id/crypto/check` 🔒 — poll TronGrid; flips `created → funded` on confirmed deposit

## 7. Admin (`/api/admin`) 👑

- [x] `GET /kyc?status=` (+ `GET /kyc/:id`); `POST /kyc/:id/approve` · `POST /kyc/:id/reject { reason }` (pending-only guard; records reviewer + timestamp)
- [ ] **Dispute resolution (HIGH PRIORITY)** — disputes freeze but no admin can rule → funds stuck. Money logic already in `escrows.service.ts` (`RESOLVE_RELEASE/REFUND/PARTIAL`, partial pro-rata):
  - [ ] `GET /disputes?status=open` — queue with deal + parties + reason context
  - [ ] `GET /disputes/:id` — detail (deal, timeline, amounts)
  - [ ] `POST /disputes/:id/rule` — `{ outcome: release|refund|split, buyerRefund?, note }` → `transition(RESOLVE_*)`, moves money, records ruling
- [ ] `GET /stats` — KPIs: users, deals per status, GHS volume, open disputes, KYC pending
- [ ] `GET /users` (search/paginate) · `PATCH /users/:id { status }` (suspend/unsuspend — already enforced at auth)
- [ ] `GET /escrows` — oversight table, filter by status

## 7b. Payments & notifications (deferred)

- [ ] [BE] **Real payment step** — buyer actually pays for the order before it's marked funded. Right now checkout SIMULATES payment (no wallet, no charge): `POST /from-listing` creates the escrow `funded` immediately. `escrows.service.ts` + `applyEffects` FUND both have `TODO(payments)` markers.
- [ ] [BE] **Mock email notifications** — a `mailService.send()` that `console.log`s `[mail:simulated] To <email>: ...` on each lifecycle event (order placed → seller, delivered → buyer, released → both, dispute opened → both, review received). Mirror the existing simulated verify/reset email pattern. Only the **in-app** conversation message exists today (`postDealMessage`). Real email/push (Resend) is later. `TODO(notifications)`.

## 8. Background jobs (simple `setInterval` workers)

> **Auto-release & auto-resolve are DISABLED by decision — everything is manual for now.** `sweepAutoRelease()` exists in `escrows.service.ts` but is not started; `autoReleaseAt`/`autoResolveAt` are set to null on deliver/dispute. To re-enable, start the interval in `index.ts` and restore the deadline columns.

- [ ] Auto-release: `delivered` + `autoReleaseAt` passed + no dispute → auto `disbursed` *(disabled)*
- [ ] Dispute auto-resolution: `disputed` past `autoResolveAt` → default ruling *(disabled)*
- [ ] TRX deposit watcher: poll TronGrid for pending crypto escrows → confirm funding *(with crypto rail)*

---

## Client alignment notes

- [x] Real auth state in `Layout.tsx` (was hard-coded `isLoggedIn = true`)
- [x] `SimulationNotice` mounted on checkout
- [x] `/checkout`, order pages (deals/orders/detail), review form — all wired to real API
- [x] Statuses collapsed to the 5 canonical states; KYC/marketplace on `GHS`
- [ ] **NewEscrow** still uses `USD | USDC | USDT` + Stripe copy — rework to `GHS | TRX` + wire to `POST /api/escrows` (standalone pillar)
- [ ] Still to build: escrow join-by-code + code/QR share screen, `/admin` dashboard + dispute workspace, **wallet page**, buyer/seller **dashboards** (still mock)

---

## Remaining highlights (see TODO-BUYER / TODO-SELLER / TODO-ADMIN)

1. **Admin dispute resolution** — highest priority; disputed funds are stuck without it (server logic ready).
2. **Wallet/withdraw page + seller dashboard** — server ready, no UI.
3. **Buyer dashboard** — still mock.
4. Standalone-escrow pillar (NewEscrow, join-by-code, QR) + **TRX crypto rail**.
