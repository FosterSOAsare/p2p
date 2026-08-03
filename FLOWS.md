# Application Flows

End-to-end flows in the P2P Marketplace Escrow app. Each lists the steps, the endpoints/states involved, and status (✅ working · ⚠️ partial · ⛔ not built). Detail: [server/TODO.md](server/TODO.md) · [web/TODO.md](web/TODO.md).

Roles: **Buyer** (any account) · **Seller** (KYC-verified) · **Admin** (provisioned). Escrow states: `created → funded → delivered → disbursed | disputed`, plus `cancelled` — reachable from `created` (either party walks away, no money moved) or from `funded` (seller pulls out; buyer refunded in full).

---

## 1. Auth & account

### 1.1 Signup ✅
Signup form (username w/ live availability) → `POST /api/auth/signup` → argon2id hash, user + GHS wallet created, session started, simulated verify-email link logged to server console → tokens stored → redirected into the app.

### 1.2 Email verification ✅
Email link `/verify-email?token=` → `POST /api/auth/verify-email` (JWT signed with refresh secret + `purpose:verify_email`, idempotent). Nags but blocks nothing. Resend: `POST /api/auth/resend-verification`.

### 1.3 Login ✅
`{identifier(email OR username), password}` → `POST /api/auth/login`. Generic errors (no enumeration), timing-equalized dummy hash on miss, suspended accounts rejected.

### 1.4 Session refresh ✅
Access JWT expires → `api.ts` transparently calls `POST /api/auth/refresh` once and retries. Refresh tokens rotate; reusing a revoked token revokes the whole session family.

### 1.5 Password reset ✅
`POST /forgot-password` (always generic success) → simulated link `/reset-password?token=` → `POST /reset-password` (token self-invalidates via passwordHash in signature; revokes all sessions). Logged-in change: `POST /change-password`.

### 1.6 Logout ✅
`POST /api/auth/logout` revokes the session; client clears tokens + sets `me` to null.

### 1.7 Settings ✅
`/settings` → `PATCH /api/users/me` (fullName, phone, avatar) and `PUT /api/users/me/notification-prefs` (auto-save). *(Prefs stored, not yet consumed — no emails.)*

---

## 2. Become a seller (KYC) ✅
Buyer opens `/sell` → KYC form (legal name, store, country, address, ID, **≥1 payout**: momo and/or TRX address) → `POST /api/kyc` → status `pending` → **Admin** reviews (§7.1) → `verified` unlocks listing/payout, or `rejected` with reason (resubmit allowed). `requireSeller` gates seller actions; `SellerGuard` gates seller routes.

---

## 3. Marketplace (buyer) ✅
Browse `/marketplace` → `GET /api/listings` (URL-driven search / category / condition / maxPrice / sort / pagination) + `GET /api/categories`. Listing detail `GET /api/listings/:id` (increments views, seller card, reviews, avg rating). Actions: **save** (`/me/saved`), **block vendor** (`/:username/block` +reason), **message seller**, **Buy Now** → Checkout. *(Marketplace is GHS/fiat only.)*

---

## 4. Seller listings ✅
`SellerGuard` → My Listings (`GET /api/listings/mine`, status tabs, paginated). Create/edit (`POST`/`PATCH`) via `ListingForm` with **real Cloudinary image upload** (`POST /api/upload/multiple`, preview thumbnails). Delete (`DELETE`, ConfirmDialog; FK-guarded → 409 "mark out of stock"). Currency forced to GHS server-side.

---

## 5. Marketplace order = escrow (the core lifecycle) ✅
The golden path. All transitions go through the single `transition()` gateway (status + actor whitelist, money moves in the same DB transaction, appends `EscrowEvent`, posts a deal chat line).

1. **Checkout** — Buyer at `/checkout?listing=` picks quantity + payment method (simulated momo/card), sees live fee breakdown → `POST /api/escrows/from-listing` → escrow born **`funded`** (payment simulated, buyer not debited), stock decremented, seller notified in-app.
2. **Deliver** — Seller at deal detail → `POST /:id/deliver` (courier/rider name, tracking or phone, optional note; "Online" for digital) → **`delivered`**.
3. **Release** — Buyer clicks *Confirm Receipt & Release* → `POST /:id/release` → **`disbursed`**; seller wallet credited (amount − seller fee half), `escrow_release` txn. *(Release only after delivery — no early release.)*
4. **Review** — either party `POST /:id/review` (1–5, one per party); buyer→seller review surfaces on the listing + seller profile rating. *(Hidden on admin-resolved deals.)*

**Cancel** — Seller at a still-`funded` order → `POST /:id/cancel {reason?}` → **`cancelled`**: buyer refunded the full `fundingTotal` (platform keeps no fee), listing stock restored, reason relayed in the deal chat and by email. Not offered once `delivered` — from there it's release-or-dispute.

Money on a GH₵200 order: buyer funds 201.50 → seller gets 198.50 → fee 3.00. **Auto-release is disabled** — release is manual.

---

## 6. Standalone / custom escrow ✅ (fiat) · ⛔ (TRX funding)
Off-marketplace contract between two accounts — no listing, no KYC required.

1. **Create** — `/escrow/new` → `POST /api/escrows` `{title, description?, amount, currency(GHS|TRX), role(buyer|seller), counterpartyUsername?}` → **`created`** + unique share code. Known username fills the counterparty; unknown ⇒ joinable by code.
2. **Share / join** — leave the counterparty blank and the deal detail response carries a `share` block (join URL + QR data-URL), rendered on the deal page. The link lands on `/join/:code` → public preview (`GET /api/escrows/code/:code`) showing terms, which side you'd take and what you'd pay/receive; signed-out visitors are bounced through `/login?redirect=` and back. Accepting (`POST /code/:code/accept`) fills the empty side and redirects to the deal — at which point `share` goes null and the QR disappears. Creator may `PATCH /:id` while still `created`.
3. **Fund** — `POST /:id/fund` (`created→funded`) — **fiat simulated only**; TRX throws 501 (crypto rail unbuilt).
4. Then **deliver → release → review** exactly as §5.

**Cancel** — while still `created`, either party may `POST /:id/cancel {reason?}` → **`cancelled`**. No wallet was ever debited, so nothing is refunded and no stock is involved; it just clears a deal (or a never-accepted invite) out of the deals list. Works on TRX deals too, since no money effects run.

⛔ **Not built:** on-chain TRX funding/payout, milestone-based deals.

---

## 7. Dispute & arbitration ✅ (server + admin client)

1. **Open** — Buyer or seller at a `funded`/`delivered` deal → `POST /:id/dispute` `{reason, description}` → **`disputed`**; the deal **freezes** (no further party actions; `autoReleaseAt` nulled). The *pair* freezes too: while a dispute is open between two users, neither can start another deal with the other — checkout, standalone create and join-by-code all 409 (`assertNoOpenDispute`). The form takes reason + description only — photos and receipts go in the deal chat, which is what the arbitrator reads (§7.2).
2. **Review** — Admin at `/admin/disputes` (queue, status tab in URL) opens the detail drawer: deal terms, both parties, amounts, timeline, and the **evidence transcript** — what the two parties actually said about *this* deal (chat, image/file attachments and the escrow's own system notices interleaved) without handing over the pair's whole history. Read from the `Conversation`, not `escrow.messages`: only `postDealMessage` stamps `Message.escrowId`, so that relation holds lifecycle notices alone. The window opens at the deal's **first** system notice (falling back to `escrow.createdAt`, since notices are best-effort) and stays open until the ruling — deliberately *not* capped at the last notice, which is the dispute-open line itself, with the parties' evidence posted after it.
3. **Rule** — `POST /api/admin/disputes/:id/resolve {outcome: release | refund | split, buyerRefund?, rulingNote}` → calls `transition(RESOLVE_*)` → credits seller and/or buyer wallets (pro-rata fee on split), sets **`disbursed`**, records `outcome`/`ruledAmount*`/`rulingNote`/`resolvedById`, posts a "⚖️ Official Admin Ruling" chat line. 409 if already resolved.
4. **After** — verdict renders on the deal page; **payout skips the 24h clearance hold** (admin was involved) → straight to available balance; **no review** offered on a dispute-resolved deal.

⛔ **Not built:** appeals, time-locked auto-resolution.

---

## 8. Wallet & payouts ✅ (simulated GHS)
`/wallet` → `GET /api/wallet` returns **available (cleared)**, **pending clearance** (seller payouts held 24h, *except* admin-resolved), and **escrow-locked** (Σ funding of active deals). Deposit `POST /deposit` (instant simulated momo). Withdraw `POST /withdraw` (atomic guarded debit; blocks if amount > cleared balance). History `GET /transactions` (signed amounts, deal links, paginated). No buyer top-up UI (checkout is simulated); TRX never touches wallets.

---

## 9. Messaging (realtime, WebSocket)
One 1:1 thread per user pair, live over **Socket.IO** on the same port as the API. The socket is the transport; Postgres stays the source of truth, so history survives reloads, offline parties catch up, and the dispute evidence transcript populates itself.

Handshake carries the JWT access token. Every socket joins `user:<id>` (notifications — unread bumps and deal notices reach you on any page) and joins `convo:<id>` while a thread is open (messages, read ticks, typing). Opening a thread is keyed by *username*, so the room always derives from your own identity.

Client: `/messages?u=<username>` — two-pane inbox (conversation list + open thread), `useChat` for the thread, `useMessageNotifications` in `Layout` for the session-wide socket and live unread counts. Messages are `text` | `file` | `system`: files upload to Cloudinary over HTTP and travel as URL + metadata; system lines are the escrow notices, rendered as chips linking to `/escrow/:id`.

---

## 10. Admin console ✅
`AdminGuard`; role-based nav hides all buyer/seller chrome. Five sections:
- **Dashboard** (`/admin`) — `GET /api/admin/stats`: KPI cards (users + suspended, active listings, KYC pending, open disputes, total deals, settled GHS volume) + deals-by-status breakdown. The admin landing target (`/dashboard` → `/admin`).
- **KYC review** (`/admin/kyc`) — pending/verified/rejected tabs → applicant detail → approve (`→verified`) / reject `{reason}` (`→rejected`); pending-only, records reviewer + timestamp.
- **Disputes** (`/admin/disputes`) — see §7.
- **Users** (`/admin/users`) — search + role/status filters + pagination (all URL params); detail drawer (phone, wallets, deal/listing counts); **suspend / reinstate** (`PATCH /users/:id/status`; enforced at login; can't change own account).
- **Deals oversight** (admin `/deals` → all deals) — status/search/pagination in URL params; read-only; disputed rows jump to arbitration.

⛔ **Not built:** listings moderation, deals force-override, audit log, support tickets.

---

## 11. Routing & dashboards ✅
`/dashboard` role-routes: admin → `/admin` (stats dashboard), verified seller → SellerDashboard, else buyer UserDashboard. `/deals` role-routes: admin → all deals, buyer/seller → own deals (scoped server-side + endpoint is admin-only, so role is enforced twice). No user-specific route prefixes — access is decided by role.

---

## Legend of what's simulated vs real
- **Real:** auth, KYC, listings, escrow state machine + fee math + wallet money movement, disputes, admin tooling, Cloudinary uploads.
- **Simulated:** payment at checkout (escrow born funded), momo deposit/withdraw, verify/reset emails (console).
- **Not built:** TRX crypto rail, real payment processor, email/SMS delivery, background auto-release/resolve, milestones, Socket.IO Redis adapter (single-instance only).
