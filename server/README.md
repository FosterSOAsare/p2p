# P2P Marketplace Escrow — API Server

Express + TypeScript backend for the Group 2 P2P Marketplace Escrow project.
Escrow deals move through **6 states** — `created → funded → delivered → disbursed | disputed`, plus
`cancelled` when a seller pulls out of a funded order — with
standalone (off-marketplace) deals, share-code join, a per-pair chat, and admin dispute ruling.

> **Simulation notice:** all fiat / mobile-money (GHS) payments are **simulated** end-to-end — no
> real charge, no processor. Wallet money still moves atomically in the DB so balances are correct.
> The **TRX (TRON Shasta) crypto rail is not built yet** — TRX deals can be created but not funded.
> Email/SMS are simulated to the server console. Auto-release is disabled (the buyer releases manually);
> dispute auto-resolution was removed — every ruling is an admin's.

## Tech stack

| Concern    | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| Runtime    | Node.js + Express 5 + TypeScript (strict, `nodenext`)      |
| Database   | PostgreSQL (Neon) via Prisma 7 (`@prisma/adapter-pg`, Rust-free) |
| Auth       | JWT — access + rotating refresh, `Authorization: Bearer` only (no cookies) |
| Validation | Joi (per-feature schemas + `validate` middleware)          |
| Passwords  | argon2id                                                   |
| Uploads    | Multer (memory) → Cloudinary                               |

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

Optional scripts: `npx tsx scripts/seed-marketplace.ts` (categories + demo listings), `npx tsx scripts/make-admin.ts <username>` (promote an account to admin).

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
# WEB_ORIGIN=http://localhost:5173   # Optional: auto-detected (LAN IP) when unset

JWT_ACCESS_SECRET=<64-char hex — node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
JWT_REFRESH_SECRET=<64-char hex>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# Cloudinary (image/file uploads)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

`src/shared/config/env.ts` reads these with sane dev defaults (no schema validation — keep it simple).

## Project structure

Feature-module architecture (NestJS-style, Express implementation). Each feature owns its
`controller / router / service` (+ `model / validation` where needed); cross-cutting code lives in `shared/`.

```
server/
├── prisma/
│   ├── schema.prisma           # ~17 models, lowercase enums matching the web client
│   └── migrations/
├── prisma.config.ts            # Prisma 7 CLI config (loads .env, holds the connection URL)
├── scripts/                    # seed-marketplace.ts, make-admin.ts
├── src/
│   ├── index.ts                # entrypoint — boots the app on PORT
│   ├── app.ts                  # express app: middleware + feature router mounts
│   ├── features/
│   │   ├── health/             # GET /health
│   │   ├── auth/               # /api/auth — signup/login/refresh/verify/reset/me
│   │   ├── users/              # /api/users — profile, prefs, saved, blocks, dashboard
│   │   ├── kyc/                # /api/kyc — submit + status
│   │   ├── listings/           # /api/listings + /api/categories — marketplace CRUD
│   │   ├── escrows/            # /api/escrows — the core state machine + money.ts + escrow-machine.ts
│   │   ├── wallet/             # /api/wallet — simulated GHS balance + transactions
│   │   ├── messages/           # /api/messages — 1:1 conversation per user pair
│   │   ├── admin/              # /api/admin — KYC, disputes, users, deals oversight
│   │   └── upload/             # /api/upload — Multer → Cloudinary
│   ├── shared/
│   │   ├── config/env.ts
│   │   ├── constants/reserved-usernames.ts
│   │   ├── lib/{errors.ts, prisma.ts}
│   │   └── middleware/{auth, validate, error}.middleware.ts   # auth adds requireAdmin / requireSeller
│   ├── generated/prisma/       # generated Prisma client (gitignored)
│   └── types/express.d.ts      # req.user typing
├── TODO.md                     # endpoint checklist, partitioned by persona
└── README.md
```

### Adding a feature module
1. `src/features/<name>/` with `router / controller / service` (+ `validation` / `model` as needed).
2. Define Joi schemas, wire routes with `validate(...)` and `auth` / `requireAdmin` / `requireSeller` where required.
3. Mount in `src/app.ts` (`app.use("/api/<name>", <name>Router)`).

## Data model (`prisma/schema.prisma`)

- **User / Session / KycProfile** — username-first identity (login by email *or* username), rotating refresh-token sessions, a single lightweight KYC submission (dual optional payout: momo + TRX address) reviewed by an admin (no tiers).
- **Wallet / Transaction** — one simulated GHS balance per user + signed-amount history; atomic guarded debits.
- **Category / Listing / SavedListing / VendorBlock / Review** — marketplace CRUD, bookmarks, vendor blocks (+reason), post-deal reviews.
- **Escrow** — the core: share `code`, creator + nullable buyer/seller (join-by-code fills the empty side), amount + `feeAmount`, GHS/TRX + fiat/crypto rail, 6-state `status`, dispatch fields, timestamps.
- **Conversation / Message** — one thread per user pair (Binance-style); `postDealMessage()` injects system lines.
- **EscrowEvent** — append-only state timeline. **Dispute** — reason + `release | refund | split` ruling with amounts.
- **Milestone / CryptoEscrow** — defined for future digital-goods and TRX rails; **not yet used by any code**.

All enum values are lowercase and match the web client's vocabulary exactly — no mapping layer.

### Prisma 7 notes
- Connection URLs live in **`prisma.config.ts`**, not the schema (`datasource db` has provider only).
- Client generated into `src/generated/prisma/` (gitignored) — import from `"../../generated/prisma/client"`.
- Runtime requires a **driver adapter**: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` — see `src/shared/lib/prisma.ts`.
- Migrations need `DIRECT_URL` (Neon's pooled host can't run them).

## API

Endpoint checklist (per persona, with request shapes): **[TODO.md](./TODO.md)**. Flows: **[../FLOWS.md](../FLOWS.md)**. Summary:

| Area | Base | Highlights |
| --- | --- | --- |
| Health | `GET /health` | liveness |
| Auth | `/api/auth` | signup, login (email **or** username), refresh/logout, verify-email, forgot/reset/change password, `username-available`, `me` |
| Users | `/api/users` | public profile, profile update, notification prefs, saved listings, vendor blocks, dashboard |
| KYC | `/api/kyc` | submit + status (admin reviews) |
| Wallet | `/api/wallet` | balance (cleared / pending / escrow-locked), simulated deposit/withdraw, transactions |
| Marketplace | `/api/listings` `/api/categories` | search/filter/sort list, detail + reviews, seller CRUD (`requireSeller`) |
| Escrow | `/api/escrows` | `from-listing` checkout, standalone create, join by `code`, `fund` / `deliver` / `release` / `dispute` / `review` |
| Messages | `/api/messages` | 1:1 conversation list / thread / send / read |
| Admin | `/api/admin` | KYC queue, dispute ruling (moves money), user suspend/reinstate, deals oversight |
| Upload | `/api/upload` | `single` / `multiple` → Cloudinary |

## Conventions

- **Errors**: throw `ApiError.*` (400/401/403/404/409/501) in services; the error middleware shapes `{ error, details? }`.
- **Auth**: protected routes use `auth` (verifies the Bearer token, loads the user fresh onto `req.user`); admin routes add `requireAdmin`, seller routes `requireSeller`.
- **Validation**: every route with input gets a Joi schema — unknown keys stripped, values coerced.
- **State machine**: escrow transitions go through the single `transition()` gateway — guards role + current state, moves money in the same DB transaction, appends an `EscrowEvent`. Never mutate `status` directly.
- **Money**: `Decimal(14,2)`; integer-pesewa fee math; fee stored once at creation; fiat 1.5% (min GH₵2, cap GH₵150) / crypto 1.0%, 50/50 split.
