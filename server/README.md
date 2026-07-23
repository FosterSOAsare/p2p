# P2P Marketplace Escrow — API Server

Express + TypeScript backend for the Group 2 P2P Marketplace Escrow project.
Escrow deals move through **5 states** — `created → funded → delivered → disbursed | disputed` — with
share-code/QR join, per-deal chat, admin dispute ruling, and time-locked auto-resolution.

> **Simulation notice:** all fiat/mobile-money (GHS) payments are **simulated** end-to-end.
> Only **TRON Shasta testnet TRX** actually moves on-chain (via TronGrid).

## Tech stack

| Concern    | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| Runtime    | Node.js + Express 5 + TypeScript (strict, `nodenext`)      |
| Database   | PostgreSQL (Neon) via Prisma 7 (`@prisma/adapter-pg`)      |
| Auth       | JWT — access + refresh tokens, `Authorization: Bearer` header only (no cookies) |
| Validation | Joi (per-feature schemas + `validate` middleware)          |
| Passwords  | argon2                                                     |
| Extras     | helmet, cors, qrcode (share QR), express-async-handler     |

## Setup

```bash
cd server
npm install

# 1. Environment — create server/.env (see keys below)

# 2. Database — create tables on Neon + generate the Prisma client
npx prisma migrate dev --name init
#    (if Neon rejects the shadow database:)
#    npx prisma db push && npx prisma generate

# 3. Run
npm run dev        # tsx watch, http://localhost:8000
```

### Scripts

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Dev server with reload (`tsx watch`)  |
| `npm run build`     | Compile to `dist/`                    |
| `npm start`         | Run the compiled build                |
| `npm run typecheck` | `tsc --noEmit`                        |

### Environment (`server/.env`)

```env
DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require   # Neon pooled — runtime
DIRECT_URL=postgresql://.../neondb?sslmode=require               # Neon direct (no -pooler) — migrations
PORT=8000
WEB_ORIGIN=http://localhost:5173

JWT_ACCESS_SECRET=<64-char hex — node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_REFRESH_SECRET=<64-char hex>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
```

`src/shared/config/env.ts` reads these with sane dev defaults (no schema validation — keep the file simple).

## Project structure

Feature-module architecture (NestJS-style, Express implementation). Each feature owns its
controller / router / service / model / validation; cross-cutting code lives in `shared/`.

```
server/
├── prisma/
│   └── schema.prisma          # 13 models, lowercase enums matching the web client
├── prisma.config.ts           # Prisma 7 CLI config (loads .env, holds the connection URL)
├── src/
│   ├── index.ts               # entrypoint — boots the app on PORT
│   ├── app.ts                 # express app: middleware + feature router mounts
│   ├── features/
│   │   ├── health/            # GET /health
│   │   │   ├── health.controller.ts
│   │   │   ├── health.router.ts
│   │   │   └── health.service.ts
│   │   └── auth/              # /api/auth — signup, login, username-available (service WIP)
│   │       ├── auth.controller.ts   # thin: req → service → res (express-async-handler)
│   │       ├── auth.router.ts       # routes + validate(schema) wiring
│   │       ├── auth.service.ts      # business logic, talks to Prisma
│   │       ├── auth.model.ts        # TS types / DTOs
│   │       └── auth.validation.ts   # Joi schemas (body/query/params)
│   ├── shared/
│   │   ├── config/env.ts
│   │   ├── constants/reserved-usernames.ts
│   │   ├── lib/
│   │   │   ├── errors.ts      # ApiError (400/401/403/404/409/501 helpers)
│   │   │   └── prisma.ts      # PrismaClient + pg driver adapter (Prisma 7)
│   │   └── middleware/
│   │       ├── auth.middleware.ts     # Bearer token → verify → load user from DB → req.user (+ requireAdmin)
│   │       ├── validate.middleware.ts # Joi validation of req.body/query/params
│   │       └── error.middleware.ts    # 404 + central error handler
│   ├── generated/prisma/      # generated Prisma client (gitignored)
│   └── types/express.d.ts     # req.user typing
├── TODO.md                    # full endpoint checklist (source of truth for the build order)
└── README.md
```

### Adding a new feature module

1. `src/features/<name>/` with the five files above (only what you need — health has no model/validation).
2. Define Joi schemas in `<name>.validation.ts`, wire routes in `<name>.router.ts` with `validate(...)` and `auth` where required.
3. Mount the router in `src/app.ts` (`app.use("/api/<name>", <name>Router)`).

## Data model (prisma/schema.prisma)

Simplified from the earlier TaaS blueprint (~30 models → 13):

- **User / Session / KycProfile** — username-first identity (login by email *or* username), refresh-token sessions, single lightweight KYC submission reviewed by an admin (no tiers).
- **Wallet / Transaction** — simulated GHS balance with a signed-amount transaction history.
- **Listing / SavedListing / Review** — marketplace CRUD, bookmarks, post-deal reviews.
- **Escrow** — the core: share `code`, creator + nullable buyer/seller sides (join-by-code fills the empty side), GHS/TRX + fiat/crypto rail, 5-state `status`, carrier/tracking, `autoReleaseAt`.
- **Milestone** — digital-goods milestone markers (`pending → delivered → disbursed`).
- **ChatMessage / EscrowEvent** — immutable per-deal chat (dispute evidence) + append-only state timeline.
- **Dispute** — reason, `release | refund | split` ruling with split amounts, `autoResolveAt`.
- **CryptoEscrow** — Shasta deposit address (+ encrypted key), expected/received TRX, confirmations, txids.

All enum values are lowercase and match the web client's vocabulary exactly — no mapping layer.

### Prisma 7 notes

- Connection URLs live in **`prisma.config.ts`**, not the schema (`datasource db` has provider only).
- The client is generated into `src/generated/prisma/` (gitignored) — import from `"../../generated/prisma/client"`.
- Runtime requires a **driver adapter**: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` — see `src/shared/lib/prisma.ts`.
- Migrations need `DIRECT_URL` (Neon's pooled host can't run them).

## API

Full endpoint checklist with request shapes: **[TODO.md](./TODO.md)**. Summary:

| Area | Base | Highlights |
| --- | --- | --- |
| Health | `GET /health` | liveness |
| Auth | `/api/auth` | signup, login (email **or** username), refresh/logout, verify-email, forgot/reset/change password, `username-available`, `me` |
| Users | `/api/users` | profile update, notification prefs, saved listings |
| KYC | `/api/kyc` | submit + status (admin reviews) |
| Wallet | `/api/wallet` | balance, simulated deposit/withdraw, transactions |
| Marketplace | `/api/listings` | search/filter/sort list, detail + reviews, seller CRUD |
| Escrow | `/api/escrows` | create (+ `from-listing` checkout), join by `code`, QR, `fund` / `deliver` / `release` / `dispute` transitions, milestones, chat, TRX panel |
| Admin | `/api/admin` | stats, users, escrow oversight, dispute ruling, KYC queue |

Background jobs (simple intervals): auto-release after `autoReleaseAt`, dispute auto-resolution, TronGrid deposit watcher.

## Conventions

- **Errors**: throw `ApiError.*` in services; the error middleware shapes `{ error, details? }` responses.
- **Auth**: protected routes use the `auth` middleware (verifies the Bearer token, loads the user fresh from the DB onto `req.user`); admin routes add `requireAdmin`.
- **Validation**: every route with input gets a Joi schema — unknown keys are stripped, values coerced (e.g. usernames lowercased).
- **State machine**: escrow transitions are single-purpose endpoints that guard role + current state and append an `EscrowEvent` — never mutate `status` directly.
- **Money**: amounts are `Decimal(14,2)` (TRX fields `Decimal(18,6)`); fees — fiat 1.5%, crypto 1.0%.
