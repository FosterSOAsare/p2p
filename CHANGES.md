# Changes — backend features + cross-device dev setup

This PR implements the remaining backend features (real Paystack deposits, real
money on funding, lifecycle emails, QR share) and adds a small set of zero-config
networking tweaks so the app can be tested across devices on the same WiFi.

Totals: 21 files (15 modified, 6 new). No new npm dependencies committed.
`.env` files are gitignored — no secrets or machine-specific IPs are included.

---

## ✅ In scope — assigned backend features

### 1. Real Paystack deposit (test mode)
- **`server/src/shared/lib/paystack.ts`** (new) — Paystack client: initialize a
  charge, verify by reference, and verify webhook signatures (HMAC-SHA512).
- **`server/prisma/schema.prisma`** — `PaymentIntent` model + `PaymentStatus`
  enum + `User.paymentIntents` relation.
- **`server/prisma/migrations/20260725090000_payment_intents/`** (new) — migration
  for the above.
- **`server/src/features/wallet/wallet.service.ts`** — `initDeposit`,
  `settleDeposit`, `verifyDeposit`, `handlePaystackWebhook`. The pending→success
  flip is a guarded update, so webhook and poll can't double-credit (idempotent).
- **`server/src/features/wallet/wallet.controller.ts`** — `initDeposit`,
  `verifyDeposit`, `paystackWebhook` handlers.
- **`server/src/features/wallet/wallet.validation.ts`** — Joi schemas.
- **`server/src/features/wallet/wallet.router.ts`** — new routes.
- **`server/src/app.ts`** — mounts the webhook with a raw-body parser (before the
  JSON parser) so the signature can be verified over the untouched bytes.

New endpoints:
- `POST /api/wallet/deposit/init` → `{ authorizationUrl, reference }`
- `GET  /api/wallet/deposit/verify/:reference` (poll fallback for localhost)
- `POST /api/wallet/webhook/paystack` (signature-verified)

The existing `POST /api/wallet/deposit` (instant, simulated) remains as a
dev/no-Paystack fallback.

### 2. Funding now moves real money (auto-fund removed)
- **`server/src/features/escrows/escrows.service.ts`** — the `FUND` transition now
  debits the buyer's wallet; marketplace **checkout** debits too. A short balance
  rolls the whole operation back (stock restored).
- **`server/src/features/wallet/wallet.service.ts`** — `escrowLocked` no longer
  counts unfunded `created` deals.

> Behaviour change: checkout and `POST /escrows/:id/fund` now require sufficient
> wallet balance; otherwise they return 400 asking the buyer to top up.

### 3. Email templates + delivery
- **`server/src/shared/mail/mail.service.ts`** (new) — renders HTML templates and
  logs `[mail:simulated] To <email>: <subject>` by default. Set `MAIL_DRIVER=smtp`
  (+ `SMTP_*`, and `npm i nodemailer`) to deliver for real — no other code change.
- **`server/templates/`** (new) — `layout.html` + 8 templates: verify-account,
  forgot-password, login, new-order, funds-release, dispute-created,
  dispute-resolved, withdrawal.
- **`server/src/features/auth/auth.service.ts`** — verify / reset / login emails.
- **`server/src/features/escrows/escrows.service.ts`** — new-order, funds-release,
  dispute-created, dispute-resolved (order emails respect `emailShipmentUpdates`).
- **`server/src/features/wallet/wallet.service.ts`** — withdrawal receipt.

### 4. QR share
- **`server/src/features/escrows/escrows.service.ts`** (`buildShareInvite`) — the
  deal detail response carries `share: { code, joinUrl, dataUrl }` while a side is
  still empty, `null` otherwise. Superseded the standalone `GET /api/escrows/:id/qr`
  endpoint: the deal page already fetches detail, and one source keeps the QR from
  drifting from the link it encodes. Party access is inherited from `getDetail`.

### Supporting
- **`server/src/shared/config/env.ts`** — Paystack + mail env vars,
  `paystackEnabled()`.
- **`server/src/shared/lib/errors.ts`** — `ApiError.badGateway()` (used by the
  Paystack client).
- **`server/.env.example`** (new) — documents every env var.
- **`server/TODO.md`** — completed items ticked off.

---

## 🔧 Out of scope — cross-device dev convenience

These make phone/LAN testing work with zero config. They are not part of the
original feature ask.

- **`server/src/shared/lib/net.ts`** (new) — detect the machine's current LAN IP
  and recognise private-LAN origins.
- **`server/src/shared/config/env.ts`** — `WEB_ORIGIN` auto-detects the LAN IP
  when unset (so email links are clickable from a phone); `CORS_ORIGINS` list;
  `WEB_PORT`.
- **`server/src/app.ts`** — in development, CORS also allows any localhost /
  private-LAN origin (multi-origin), on top of the explicit list.
- **`server/src/index.ts`** — startup log prints the web origin used in email links.
- **`web/src/features/shared/libs/api.ts`** — the frontend derives the API host
  from `window.location.hostname` (open at localhost → API on localhost:8000; open
  at a LAN IP → that IP:8000). This is the only change under `web/`.

---

## For teammates
- **DB:** the `payment_intents` migration is already applied to the shared Neon
  database. A fresh clone just needs `npx prisma migrate deploy` (no-op) and
  `npx prisma generate`.
- **Dependencies:** none added to `package.json`. Real email needs a one-time
  `npm i nodemailer`; simulated mode needs nothing.
- **Env:** all new vars are optional (see `server/.env.example`). Paystack blank →
  simulated deposit; mail defaults to simulated; `WEB_ORIGIN`/`CORS_ORIGINS`/IP are
  auto-detected — nobody sets an IP.
- **Run for cross-device testing:** `npm run dev` (server) and
  `npm run dev -- --host` (web), then open the LAN URL the server prints.
