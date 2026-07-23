# 02 — System Architecture & Technology Stack

## 2.1 High-level architecture

```
                ┌───────────────────────────────────────────────┐
                │              PRESENTATION LAYER               │
                │  Next.js Web App (v1)   React Native (v2)     │
                │  - Marketplace UI       - same API client     │
                │  - Escrow portal        - shared TS types     │
                │  - Admin dashboard                            │
                └───────────────────┬───────────────────────────┘
                                    │ HTTPS / REST + WebSocket
                ┌───────────────────▼───────────────────────────┐
                │            API GATEWAY (NestJS)               │
                │  AuthN/AuthZ · rate limiting · validation     │
                └───────────────────┬───────────────────────────┘
        ┌───────────┬───────────────┼──────────────┬────────────┐
        ▼           ▼               ▼              ▼            ▼
   Marketplace   ESCROW ENGINE   Wallet/Ledger   Dispute      KYC
   module        (state machine) (double-entry)  module      module
        └───────────┴───────┬───────┴──────────────┴────────────┘
                            │
              ┌─────────────┼──────────────────┐
              ▼             ▼                  ▼
        PostgreSQL       Redis            Object storage (R2/S3)
        (source of       (cache, BullMQ   (KYC docs, evidence,
         truth)           job queues)      listing images)
                            │
        ┌───────────────────┼────────────────────────┐
        ▼                   ▼                        ▼
   Paystack (test)     TronGrid API           Notification providers
   fiat/MoMo adapter   TRX testnet adapter    (Resend email, Arkesel
                                               SMS, FCM push)
```

**Style: modular monolith.** One NestJS deployable with strict module boundaries (marketplace, escrow, wallet, dispute, kyc, notification). Microservices would add operational cost with zero benefit at this scale; the module boundaries let you extract services later if ever needed. The escrow engine module exposes an internal API that both the marketplace module and the external-link flow consume — this *is* the "TaaS" claim, enforced in code.

## 2.2 Technology choices and why

| Layer | Choice | Why (vs alternatives) |
|---|---|---|
| Web frontend | **Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui** | SSR matters here: escrow links shared on WhatsApp/Telegram need Open Graph previews ("Kofi invited you to a GH₵1,200 escrow") — a pure SPA (Vite/CRA) can't do that. shadcn/ui gives accessible fintech-grade components fast. React skills transfer to React Native in Phase 2. Vue has a smaller talent/library pool for fintech UI. |
| Mobile (Phase 2) | **React Native + Expo** | Reuses the TypeScript API client, Zod schemas, and business types from the web repo (monorepo). Flutter would mean a second language (Dart) and duplicated validation logic for a 3-person team. |
| Backend | **NestJS (Node 20+, TypeScript)** | Spring-Boot-like structure (modules, DI, guards, pipes) that supervisors respect, but one language across the whole stack. Express alone lacks structure; Spring Boot splits the team across Java + TS. |
| API style | **REST + OpenAPI (Swagger auto-gen)** + **Socket.IO** for realtime | REST is simplest for a documented uni project; Nest generates Swagger docs for the report. Sockets push escrow state changes, chat, and notifications. |
| Database | **PostgreSQL 16 + Prisma ORM** | Money demands ACID, `SELECT … FOR UPDATE` row locking, and CHECK constraints; Postgres also gives JSONB (webhook payloads, audit metadata) and full-text search for listings. MySQL works but has weaker JSON/CTE support; MongoDB is wrong for double-entry ledgers. Prisma = typed queries + migrations checked into git. |
| Cache / jobs | **Redis + BullMQ** | Escrow timeouts (auto-release after 72 h), webhook retry, OTP throttling, notification fan-out — all are delayed/repeatable jobs. Cron alone can't do per-record delays cleanly. |
| Auth | **Self-built in NestJS**: argon2id password hashing, short-lived JWT access (15 min) + rotating refresh tokens (httpOnly, Secure, SameSite=Lax cookies), TOTP 2FA (otplib), email/SMS OTP | Auth is a stated learning objective — building it (correctly, following OWASP) is worth more academically than plugging in Auth0. Cookies over localStorage kills token-theft-via-XSS. |
| File storage | **Cloudflare R2 (S3 API)** | Free egress, S3-compatible SDK. Presigned upload/download URLs; KYC bucket is private with short-TTL signed GETs only. |
| Fiat payments | **Paystack (test mode)** | Native Ghana support: MTN MoMo, Vodafone Cash, AirtelTigo, cards. Test mode = realistic simulation without a licence. Adapter interface (`SettlementAdapter`) so Flutterwave/Stripe can be swapped in. |
| Crypto | **TRON Shasta/Nile testnet via TronGrid + TronWeb; Solidity escrow contract (TVM)** | Free testnet TRX from faucets, 3-second finality, negligible fees, no node to run. The contract holds funds; backend watches deposits via TronGrid and triggers release. Bitcoin has no smart contracts without significant complexity (multisig/HTLC) — it stays a future adapter. |
| Email | **Resend** (or SES) | Simple API, React-email templates, free tier covers the project. |
| SMS/OTP | **Arkesel or Hubtel** (Ghana) | Local sender IDs and pricing; Twilio as fallback abstraction. |
| Push | **Firebase Cloud Messaging** | Free, works for web push now and React Native later. |
| KYC vendor (production path) | **Smile ID** | Ghana Card document verification + biometric liveness, built for African IDs. For the prototype: manual admin review queue implementing the same interface (`KycProvider`), so the swap is one class. |
| Hosting | Web → **Vercel**; API + workers → **Render/Railway**; DB → **Neon**; Redis → **Upstash** | All have free tiers; deployable by students without DevOps overhead. Docker Compose for local dev. |
| Monorepo | **pnpm workspaces + Turborepo**: `apps/web`, `apps/api`, `apps/mobile` (later), `packages/shared` (Zod schemas, types, constants) | One PR can change API + UI + validation together; mobile inherits everything in Phase 2. |

## 2.3 Key cross-cutting patterns

1. **Settlement Adapter pattern** — `SettlementAdapter` interface: `initDeposit()`, `verifyDeposit()`, `payout()`, `refund()`. Implementations: `PaystackAdapter`, `TronAdapter`, `InternalWalletAdapter`. Adding Bitcoin/USDT later = new class, zero engine changes.
2. **Escrow engine as a state machine** — single `EscrowService.transition(escrowId, event, actor)` entry point; every transition is validated against an explicit transition table, executed in a DB transaction, appended to `escrow_events`, and emits domain events (→ notifications, sockets, jobs). No other code may mutate escrow status.
3. **Double-entry ledger** — money never "updates a balance column" directly; every movement writes balanced ledger entries inside the same DB transaction (see [06-wallet-payments.md](06-wallet-payments.md)).
4. **Idempotency everywhere money moves** — client-supplied `Idempotency-Key` header on deposit/withdraw/release; webhook handlers dedupe on provider event ID.
5. **Outbox pattern for notifications** — domain events written to an `outbox` table in the same transaction as the state change; a BullMQ worker delivers them. No lost notifications on crash.
6. **Audit log middleware** — every authenticated mutating request records actor, IP, user agent, entity, before/after diff (see [08-security.md](08-security.md)).

## 2.4 Environments

| Env | Purpose | Money |
|---|---|---|
| `local` | Docker Compose: Postgres, Redis, MinIO, mock Paystack | Fake |
| `staging` | Deployed, Paystack test keys, TRON Shasta | Test |
| `demo` | Frozen build for supervisor demo, seeded data | Test |

## 2.5 Repository layout

```
TaaS/
├─ apps/
│  ├─ web/          # Next.js (marketplace + escrow portal + admin)
│  └─ api/          # NestJS
│     └─ src/modules/{auth,users,kyc,wallet,ledger,escrow,
│                     marketplace,delivery,dispute,chat,
│                     notification,admin,crypto,payments}
├─ packages/
│  ├─ shared/       # Zod schemas, TS types, enums, constants
│  └─ contracts/    # Solidity escrow contract + Hardhat tests
├─ docs/            # this blueprint
└─ docker-compose.yml
```
