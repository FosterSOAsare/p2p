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

- [ ] `POST /` 🔒 — `{ legalName, storeName, taxId?, country, address, idType, idNumber, payoutRail (fiat|crypto), momoNumber? | trxAddress? }` → status `pending` (no file uploads — decorative in client; no tier system)
- [ ] `GET /me` 🔒 — `{ status: unverified|pending|verified|rejected, rejectionReason? }`

## 4. Wallet (`/api/wallet`) — simulated GHS momo; client shows balances but has no wallet page yet (FE to add)

- [ ] `GET /` 🔒 — `{ available, escrowLocked, currency: "GHS" }` (+ seller `totalEarnings` derived)
- [ ] `POST /deposit` 🔒 — `{ amount }` → instant simulated momo credit (Simulation banner)
- [ ] `POST /withdraw` 🔒 — `{ amount, destination }` → instant simulated payout
- [ ] `GET /transactions` 🔒 — history (type, amount, escrow link, createdAt)

## 5. Marketplace (`/api/listings`) — client: Products, ProductDetail, UserProducts, SellerDashboard

- [ ] `GET /` — query params the client filter bar needs: `search`, `category`, `condition`, `verifiedOnly`, `maxPrice`, `sort (featured|price_asc|price_desc|rating)`, pagination
- [ ] `GET /:id` — detail: full product fields + vendor card (name, verified, rating, responseTime*) + reviews (*drop or hardcode responseTime)
- [ ] `POST /` 🔒 (KYC-verified sellers) — `{ title, price, quantity, category, condition?, description?, images[] (URLs — no upload infra), location? }`
- [ ] `PATCH /:id` 🔒 (owner) — edit-listing modal fields; `DELETE /:id` 🔒 (owner)
- [ ] `GET /mine` 🔒 — seller's listings with `views`, `status (active|out_of_stock|draft)`
- [ ] `GET /:id/reviews` — included in detail; `POST /api/escrows/:id/review` 🔒 — `{ rating, comment }` after disbursed (`verifiedPurchase` = came from a real deal)

## 6. Escrow — the core (`/api/escrows`) — client: Escrow list, NewEscrow, EscrowDetail, EscrowMessages, UserOrders, UserDashboard

### CRUD + join
- [ ] `POST /` 🔒 — `{ title, description?, counterpartyUsername?, role (buyer|seller — creator's side), amount, currency (GHS|TRX), milestones?: [{ title, amount }] }` → `{ deal, code, shareUrl }`; unknown username ⇒ still created, joinable by code; response feeds `navigate('/escrow/:id')`
- [ ] `POST /from-listing` 🔒 — `{ listingId, quantity? }` → escrow prefilled from listing (buyer = caller, seller = vendor) — backs the missing `/checkout?listing=:id` page
- [ ] `GET /` 🔒 — my deals; filters: `tab (all|active|disbursed|disputed)` (active = created+funded+delivered), `role (buyer|seller)`, `search`; include summary stats (total volume, active count)
- [ ] `GET /:id` 🔒 (party only) — full detail: parties (usernames), status, amounts, fee breakdown, timeline events, milestones, tracking info, dispute, crypto panel
- [ ] `GET /code/:code` — **public** share-link preview (title, amount, currency, creator, status) for the join screen
- [ ] `POST /code/:code/accept` 🔒 — join as counterparty → fills empty buyer/seller side
- [ ] `GET /:id/qr` 🔒 — QR data-URL of the share link (`qrcode` pkg)

### State machine (one transition endpoint each; enforce role + current-state guards; append EscrowEvent on every transition)
- [ ] `POST /:id/fund` 🔒 (buyer) — `created → funded`. GHS: debit simulated wallet into escrow lock. TRX: returns `{ depositAddress, expectedTrx }` and stays `created` until watcher confirms deposit
- [ ] `POST /:id/deliver` 🔒 (seller) — `funded → delivered`; optional `{ note?, carrier?, trackingNumber? }` (the client's "Enter Tracking & Dispatch" modal: carrier DHL/FedEx/UPS + tracking code); sets `autoReleaseAt = now + AUTO_RELEASE_HOURS`
- [ ] `POST /:id/release` 🔒 (buyer) — `funded|delivered → disbursed`; GHS: credit seller wallet minus fee; TRX: sign + broadcast Shasta transfer to seller address, store txid ("Confirm Receipt & Release" buttons)
- [ ] `POST /:id/dispute` 🔒 (either party) — `funded|delivered → disputed`; `{ reason, description }`; freezes auto-release
- [ ] Milestones (digital goods = milestone markers): `POST /:id/milestones/:mid/deliver` 🔒 (seller), `POST /:id/milestones/:mid/release` 🔒 (buyer) — statuses `pending → delivered → disbursed`

### Chat (per-deal, immutable — becomes dispute evidence)
- [ ] `GET /:id/messages` 🔒 (party only)
- [ ] `POST /:id/messages` 🔒 — `{ message }` (attachments = `[Attachment: name]` text convention for now, matching client)

### Crypto rail (TRX Shasta via TronGrid)
- [ ] `GET /:id/crypto` 🔒 — `{ depositAddress, expectedTrx, receivedTrx, confirmations, depositTxid?, releaseTxid?, refundTxid? }` + Tronscan links
- [ ] `POST /:id/crypto/check` 🔒 — poll TronGrid now; flips `created → funded` when deposit confirmed

## 7. Admin (`/api/admin`) 👑 — monitoring dashboard + dispute ruling (no client screens yet — FE to build `/admin`)

- [ ] `GET /stats` — KPIs: users, deals per status, GHS/TRX volume, open disputes, KYC pending
- [ ] `GET /users` — search/list; `PATCH /users/:id` — `{ status: active|suspended }`
- [ ] `GET /escrows` — all deals, filter by status (oversight table)
- [ ] `GET /disputes?status=open` — queue with deal + chat/evidence context
- [ ] `POST /disputes/:id/rule` — `{ outcome: release|refund|split, buyerAmount?, sellerAmount?, note }` → moves money, escrow → `disbursed`, records ruling
- [ ] `GET /kyc?status=pending` — review queue; `POST /kyc/:id/approve` · `POST /kyc/:id/reject { reason }`

## 8. Background jobs (not endpoints — simple `setInterval` workers are fine at this scope)

- [ ] Auto-release: `delivered` + `autoReleaseAt` passed + no dispute → auto `disbursed` (time-locked resolution, per Terms copy: 14-day timer — make `AUTO_RELEASE_HOURS` env-configurable)
- [ ] Dispute auto-resolution: `disputed` + no admin ruling by `autoResolveAt` → default ruling (configurable outcome)
- [ ] TRX deposit watcher: poll TronGrid for pending crypto escrows → confirm funding

---

## Client alignment notes (for FE, surfaced by the audit — keep server canonical)

1. **Currency**: NewEscrow/Calculator/KYC use `USD | USDC | USDT` + "Stripe" copy → switch to `GHS | TRX` (deals data + `currency.ts` already correct).
2. **Statuses**: UI invents `released`, `completed`, `shipped`, `awaiting_shipment` → map to the 5 canonical states (`released/completed → disbursed`; `awaiting_shipment → funded`; `shipped → delivered`).
3. **Missing pages to build**: `/checkout?listing=:id`, escrow join-by-code (+ show code/QR on detail/share screen), `/admin`, wallet page, review-submission form, dispute button on marketplace orders.
4. Render `SimulationNotice` (exists, never mounted) on all fiat money screens; wire real auth state in `Layout.tsx` (currently hard-coded `isLoggedIn = true`).
