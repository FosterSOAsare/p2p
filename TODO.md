# TaaS — Master TODO

Comprehensive build checklist derived from the locked functional spec in [`docs/`](docs/README.md).
Owner tags: **[BE]** backend (owned by teammate) · **[FE]** frontend · **[SH]** shared packages · **[SC]** smart contract · **[INF]** infra/devops · **[QA]** testing · **[DOC]** report/docs.

Current state: `web/` is a Vite SPA prototype (marketplace browse/detail, mock escrow list/detail/chat, auth screens, dashboards — all mock data, no API). Functionality in `docs/` is authoritative; the Coinbase DESIGN.md is **not** adopted — keep the existing visual style.

---

## 0. Foundational decisions & repo setup

- [ ] [INF] Decide Vite→Next.js migration path for `/e/[code]` SSR/OG previews (docs/02 requires SSR; options: migrate app to Next.js, or keep Vite + tiny SSR edge service for link previews)
- [ ] [INF] Restructure into monorepo: `apps/web`, `apps/api`, `packages/shared`, `packages/contracts` (pnpm workspaces + Turborepo) — coordinate with backend owner
- [ ] [INF] Docker Compose for local dev: Postgres, Redis, MinIO, mock Paystack
- [ ] [INF] CI pipeline: lint, typecheck, tests, semgrep SAST, dependency audit (merge-blocking)
- [ ] [SH] `packages/shared`: Zod schemas, TS types/enums, constants, `Money` type (BIGINT minor units — pesewas / SUN) + formatter
- [ ] [SH] Shared escrow status/type enums matching docs/05 state machine exactly
- [ ] [INF] Env setup: `local` / `staging` / `demo` (docs/02 §2.4); `.env.example` maintained

## 1. Auth & accounts [BE-owned, FE integration]

- [ ] [BE] Signup (email+password+full name+ToS), argon2id hashing, zxcvbn gate, HIBP breach check
- [ ] [BE] Email OTP verification (6-digit, 10 min TTL, 5 attempts, 60 s resend, 15 min lock)
- [ ] [BE] Phone + SMS OTP (Tier 1 gate; rate limit 3 sends/hour)
- [ ] [BE] Login: generic errors (no enumeration), CAPTCHA after 5 failures, lock after 10 + email alert
- [ ] [BE] Sessions: 15-min JWT access (in memory) + 30-day rotating refresh (httpOnly/Secure/SameSite=Lax); reuse detection → revoke family + alert
- [ ] [BE] 2FA: TOTP primary + SMS fallback + 10 hashed backup codes; step-up re-auth if last auth >10 min
- [ ] [BE] Device fingerprinting, new-device email alert, sessions list + revoke, suspicious-login detection
- [ ] [BE] Password reset: single-use 30-min token, revoke all sessions, never reveal account existence
- [ ] [BE] RBAC roles: user, driver, support, kyc_reviewer, arbitrator, admin; object-level authz on every fetch (IDOR guard)
- [ ] [FE] Wire existing auth screens (Signup/Login/Verify/Forgot/Reset/Change) to real API; add OTP input screens (A5, A9), 2FA challenge (A7), backup-codes display (F7)
- [ ] [FE] Session/device management UI in Settings (F7)

## 2. KYC & compliance

- [ ] [BE] Tier model 0–3 with per-tier limits enforced middleware-side (docs/07 §7.2 table)
- [ ] [BE] `KycProvider` interface; prototype = manual admin review queue (Smile ID swap later)
- [ ] [BE] Document upload to private bucket (presigned, ≤10 MB, type-sniffed), duplicate-identity detection (doc-number hash), sanctions/PEP screen (OpenSanctions)
- [ ] [BE] Risk score + AML monitoring rules (structuring, rapid in-out, counterparty loops, geo mismatch) → flag/step-up/freeze
- [ ] [BE] New-account friction: first escrow ≤ GH₵500 for accounts <7 days
- [ ] [FE] Verification hub with tier ladder (B1), "why we verify" interstitial (B2), doc capture (B3), selfie/liveness w/ consent checkbox (B4), address proof (B5), status screens incl. rejection+resubmit ≤3 (B6)
- [ ] [FE] Replace current prefilled VendorKyc demo page with the real tiered flow

## 3. Wallet & double-entry ledger

- [ ] [BE] Ledger: append-only `ledger_entries`, balanced journals, trigger blocks UPDATE/DELETE, nightly invariant job (Σledger=cache, Σall=0 → freeze+alert)
- [ ] [BE] Wallet accounts per user per currency: AVAILABLE / ESCROW_LOCKED / PENDING_WITHDRAWAL + platform accounts (FEES, SUSPENSE, PROVIDER_CLEARING)
- [ ] [BE] Deposits — Paystack: init w/ idempotency key, webhook-only trust (signature verify, event-id dedupe), suspense for unmatched
- [ ] [BE] Withdrawals: saved destinations w/ name-match (Paystack resolve), 2FA always, 24 h new-destination hold, tier velocity limits, >GH₵5,000 admin approval, FAILED → auto-return + notify
- [ ] [BE] Multi-currency GHS + TRX, no FX, BIGINT minor units everywhere
- [ ] [FE] Wallet overview (E1: three balances per currency), Deposit (E2), Withdraw w/ 2FA (E3), transaction detail + receipt PDF (E4), ledger history filters + CSV export

## 4. Escrow engine (the core)

- [ ] [BE] State machine w/ single `transition(escrowId, event, actor)` gateway; whitelist transition table; DB tx + row lock + optimistic `version`; `escrow_events` append; outbox emit
- [ ] [BE] Timeouts as BullMQ delayed jobs scheduled on state entry / cancelled on exit: accept 72 h, funding 48 h, inspection 72 h auto-release (24 h + 1 h warnings); race-safe vs dispute filing
- [ ] [BE] Cancel rules: unilateral pre-FUNDED; mutual or dispute after; money leaves only via RELEASED/REFUNDED/PARTIAL to platform wallet
- [ ] [BE] Fee engine: 1.5% min GH₵2 cap GH₵150, split buyer/seller/50-50, taken at release, pro-rata on partial rulings; config in `platform_settings`
- [ ] [BE] Share codes (unique 8-char), expiry, public preview payload
- [ ] Type-specific fulfilment:
  - [ ] [BE] Physical: driver job OR own-courier (tracking ref + package photo required)
  - [ ] [BE] Digital: encrypted vault upload, hash recorded, download gated on funding, first download starts 48 h inspection, download log (IP/time)
  - [ ] [BE] Online accounts: credential vault (AES-256-GCM, never in chat), 24 h verify-and-secure window, access log as dispute evidence
  - [ ] [BE] Services: milestone table (Σ=total), full-upfront or per-milestone funding, submit→approve/revision (max 2)→release per milestone
  - [ ] [BE] Crypto: see §7
- [ ] [FE] Create-escrow wizard 4 steps w/ server-side drafts (D1: type cards, role+counterparty, terms incl. milestones/fee split/deadlines, review) — replace current single-form NewEscrow
- [ ] [FE] Share screen: link + QR + WhatsApp/Telegram buttons + expiry note (D2)
- [ ] [FE] Public escrow link preview `/e/[code]` w/ OG tags (A10) + invalid/expired states
- [ ] [FE] Escrow list w/ tabs Needs action / Active / Completed / Cancelled+Disputed (D3)
- [ ] [FE] Escrow detail (D4): stepper timeline, exactly-one context-aware primary action per state per role, terms accordion, chat tab, events log tab, danger zone; realtime via socket
- [ ] [FE] Fund escrow (D5): wallet / Paystack / TRX watcher states, refresh-safe
- [ ] [FE] Fulfilment screens (D6), delivery tracking + blurred code panel (D7), inspection w/ countdown + release confirm (D8), completion + mutual review (D9)

## 5. Delivery verification & drivers

- [ ] [BE] Delivery secret: 6-digit code + HMAC QR `{deliveryId, hmac, expiry}`; buyer-only visibility; TTL 30 min from "arrived", regenerable; 3 attempts → lockout + escalation
- [ ] [BE] Geofence check ≤300 m on arrive/verify; proof capture required (camera-only photo + signature); `delivery_events` timeline
- [ ] [BE] Platform drivers: separate account type, admin approval, per-job accept (15 min), fee credit on verify
- [ ] [BE] One-time driver session links for seller couriers (job-scoped, no account)
- [ ] [BE] Failure flows: recipient-refuses-code w/ proof-of-attempt, no-arrival auto-flag, lost-package liability rules
- [ ] [FE] Driver onboarding (G1), jobs list (G2), active job flow: pickup photo → transit → arrived → scan QR / enter code → proof + signature pad (G3)
- [ ] [FE] Buyer code-reveal panel: blurred until tap, watermark, "only show to driver" warning (D7)

## 6. Marketplace

- [ ] [BE] Listings CRUD (Tier 1 gated), draft autosave, automated content check → review queue, statuses draft/pending_review/active/paused/sold/removed
- [ ] [BE] Full-text search (tsvector GIN), category tree, filters, pagination
- [ ] [BE] Buy-with-escrow: listing → auto-created escrow with prefilled terms (marketplace is a consumer of the engine)
- [ ] [FE] Market browse w/ infinite scroll + filters drawer (C2) — adapt existing Products page
- [ ] [FE] Listing detail w/ message-seller inquiry + sold state (C3) — adapt existing ProductDetail
- [ ] [FE] Create listing multi-step w/ photo reorder + preview (C4) — replace current modal in UserProducts
- [ ] [FE] My listings tabs (C5); checkout → escrow flow (C6) — the currently-missing `/checkout` route
- [ ] [FE] Currency: switch UI from USD to GH₵ (+ TRX where applicable)

## 7. Crypto rail (TRON testnet)

- [ ] [SC] Solidity/TVM escrow contract: deposit tracking per escrow, owner-only `release()`/`refund()`, pays only pre-registered addresses, emergency pause
- [ ] [SC] Hardhat test suite (reentrancy, overflow, access control) — report artifact
- [ ] [BE] TronGrid watcher: 19-confirmation credit, under/overpayment handling (grace top-up / auto-refund excess), stall alerts at 2 h
- [ ] [BE] Release key in KMS; txids stored + linked (Tronscan-verifiable)
- [ ] [BE] Per-user HD deposit addresses; address checksum validation + confirm-twice UX
- [ ] [FE] TRX deposit screen w/ QR + live confirmation counter; crypto escrow gated behind Tier 2

## 8. Disputes & arbitration

- [ ] [BE] Lifecycle: OPEN → AWAITING_RESPONSE (48 h) → UNDER_REVIEW → RULED → 48 h appeal (different/senior arbitrator, new evidence required) → FINAL → EXECUTED; filing instantly freezes auto-release
- [ ] [BE] System snapshot auto-attach: escrow events + chat export + delivery proof + vault access log
- [ ] [BE] Partial rulings: exact split summing to total minus pro-rata fee; typed-amount confirmation
- [ ] [BE] Arbitrator assignment: round-robin + conflict-of-interest exclusion; SLA metrics (<24 h first touch, <72 h ruling)
- [ ] [BE] Dispute-loss → risk score; frivolous-filing pattern flag
- [ ] [FE] Open-dispute form (F1), dispute detail: evidence columns, 3-way chat, ruling card, appeal (F2)

## 9. Chat (per-escrow)

- [ ] [BE] Immutable messages (text/image/file ≤25 MB), system events inline, read receipts, typing indicator (Socket.IO)
- [ ] [BE] Scam-pattern scan ("pay outside escrow", phone numbers pre-funding) → warning banner + flag
- [ ] [FE] Chat tab in escrow detail + full-screen thread (F3) — adapt existing EscrowMessages

## 10. Notifications

- [ ] [BE] Outbox pattern (same-tx write) → BullMQ worker → preference resolution → dispatchers (in-app always, FCM push, Resend email, Arkesel SMS); delivery status recorded
- [ ] [BE] Channel matrix per docs/10; OTPs/codes never in bodies; security email locked on; chat digest ≤1 email/15 min; push quiet hours 22:00–07:00 (except security/final-deadline)
- [ ] [FE] Notification center w/ tabs + deep links (F4); preference matrix in Settings (F8); realtime badge/toast via socket

## 11. Admin panel

- [ ] [BE] Admin authn: mandatory 2FA, optional IP allowlist; every mutation audit-logged; typed reason on destructive/override actions
- [ ] [FE]+[BE] Screens 1–11 (docs/11): dashboard KPIs, user management (suspend/freeze modes, dual-control balance adjustments), KYC review queue w/ claim locking, escrow oversight + force-transition (dual confirm), dispute workspace, drivers/deliveries, finance (reconciliation, withdrawal approvals, chargebacks), listings moderation, reports/analytics, platform settings (versioned, freeze switches), audit log viewer w/ hash-chain status

## 12. Database & data layer

- [ ] [BE] Prisma schema for all ~30 tables per docs/09 (UUID v7, enums, money BIGINT, soft-delete where noted)
- [ ] [BE] Append-only triggers on `ledger_entries`, `escrow_events`, `audit_logs`
- [ ] [BE] Critical indexes + constraints (docs/09 §9.3), partial unique on open disputes
- [ ] [BE] Seed script for demo data
- [ ] [BE] Migrations in git; `prisma migrate deploy` on boot

## 13. Security hardening (cross-cutting, ASVS L2)

- [ ] [BE] Zod validation on every input (shared schemas), rate limiting (Redis sliding window, tight buckets on login/OTP/withdraw/code-verify)
- [ ] [BE] Idempotency-Key on all money POSTs; webhook replay protection (event-id + 5-min window)
- [ ] [BE] Field-level AES-256-GCM (vault, KYC metadata, phones), envelope encryption, KMS keys
- [ ] [BE] File uploads: magic-byte sniffing, image re-encode, AV scan hook; EXIF strip (except delivery proof — stored separately)
- [ ] [BE] Audit log middleware (actor, before/after diff, IP, UA, request id) + monthly hash-chain checkpoint
- [ ] [FE]+[INF] Security headers: CSP nonce-based, X-Frame-Options, Referrer-Policy, Permissions-Policy; HSTS
- [ ] [BE] PII scrubbing in logs (pino redact); public profiles never expose email/phone/legal name

## 14. Frontend app shell & gap-closing (current Vite app → blueprint)

- [ ] [FE] Authenticated shell: top bar (search, bell, wallet chip, avatar) + sidebar → bottom tab bar on mobile (Home / Market / +Escrow FAB / Wallet / Activity) (docs/03 §3.6)
- [ ] [FE] Route alignment: `/dashboard`, `/market`, `/l/[id]`, `/escrows`, `/escrow/[id]`, `/e/[code]`, `/wallet`, `/u/[handle]`, `/admin/*`; deep links + back-nav rules (history-replace after money success, wizard state restore)
- [ ] [FE] Dashboard w/ "action needed" queue + deadline chips (C1) — replace current UserDashboard
- [ ] [FE] Public profile `/u/[handle]` (F5); Settings: profile (F6), security (F7), notifications (F8), danger zone w/ blocking rules (F9)
- [ ] [FE] System screens: 404/410 expired-link, maintenance, session-expired modal w/ state preservation, suspended-account, PWA offline banner (H)
- [ ] [FE] Global conventions: skeletons not spinners, Zod client validation on blur, success panels for money actions, confirm dialogs on irreversible actions (docs/04 header)
- [ ] [FE] Replace all mock data files with TanStack Query hooks against the real API; remove role-toggle hacks (UserOrders buyer/seller switch → real per-transaction roles)
- [ ] [FE] Landing page updates: fee calculator w/ GH₵ + fee-split selector (A3), live stats, how-it-works per type (A2)

## 15. Testing & verification [QA]

- [ ] Unit tests: state machine transition table (every legal + illegal transition), fee math, ledger balancing, Money type
- [ ] Integration: funding→release E2E with ledger invariant asserts; concurrent double-release race test (must be impossible)
- [ ] Webhook tests: signature, replay, dedupe, suspense routing
- [ ] Delivery code: HMAC verify, TTL, attempt lockout, geofence
- [ ] Contract tests (Hardhat) + a live Shasta testnet E2E verifiable on Tronscan
- [ ] Load test: zero balance-inconsistency under concurrency (success metric, docs/01 §1.5)
- [ ] Accessibility pass WCAG 2.1 AA; usability test (SUS ≥ 70 target)
- [ ] Edge-case suite: all 24 cases in docs/12 §12.1 get at least one test or documented manual verification

## 16. Deployment [INF]

- [ ] Neon Postgres + Upstash Redis + Cloudflare R2 provisioning
- [ ] API → Render (Docker, `render.yaml`, migrations on boot); Web → Vercel (`apps/web` root, `API_ORIGIN` envs)
- [ ] CORS/`WEB_ORIGIN` + Socket.IO origin config; Paystack webhook registration
- [ ] Demo environment: frozen build + seeded data for supervisor demo
- [ ] Backup/restore drill documented; incident freeze switches wired

## 17. Report / academic deliverables [DOC]

- [ ] Compliance chapter: BoG Act 987 / AML Act 1044 / Data Protection Act 843 / FATF VASP — why testnet-only (docs/07)
- [ ] Architecture + ERD diagrams from docs; Swagger/OpenAPI export
- [ ] Success-metrics evaluation: completion rate ≥90%, dispute median ≤72 h, SUS ≥70, ledger invariants, Tronscan-verifiable escrow
- [ ] Edge-case catalogue + resolutions writeup

---

## Explicit non-goals (v1) — do not build
Real-money custody · mainnet crypto · DMs outside transactions · native iOS/Android (Phase 2) · shipping-rate API integrations · non-custodial fiat escrow · FX conversion.

## Phase 2+ parking lot
React Native app · USDT-TRC20 · WhatsApp bot · Escrow API / "Pay with TaaS" button · BTC multisig adapter · reputation passports · AI dispute triage · installment escrow · GH↔NG corridor.
