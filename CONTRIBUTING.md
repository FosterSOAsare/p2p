# Contributing to VeriTrust

VeriTrust is a KNUST Group 2 mini-project, maintained by its authors. This guide
documents the workflow, conventions, and local setup so contributions stay
consistent and the history stays readable.

> By contributing you agree that your contributions are covered by the project's
> [LICENSE](LICENSE) and that you will follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Table of contents

- [Ground rules](#ground-rules)
- [Local setup](#local-setup)
- [Branching](#branching)
- [Commit messages](#commit-messages)
- [Pull requests](#pull-requests)
- [Coding standards](#coding-standards)
- [Adding a server feature module](#adding-a-server-feature-module)
- [Database & migrations](#database--migrations)
- [Before you push](#before-you-push)

## Ground rules

- **Never commit secrets.** `.env` files, real connection strings, API keys, and
  the `.neon` project file are gitignored — keep it that way. Only `.env.example`
  is committed.
- **One logical change per pull request.** Keep diffs focused and reviewable.
- **Match the surrounding code.** Naming, structure, and comment density should
  read like the file you're editing.
- **Security-sensitive changes** (auth, escrow transitions, money movement,
  disputes) get extra scrutiny — call them out explicitly in the PR.

## Local setup

Prerequisites: **Node.js 20 LTS+**, npm, and a PostgreSQL database (a free
[Neon](https://neon.tech) project). See the [README](README.md#getting-started)
for the full quick start. In short:

```bash
# API
cd server && npm install
cp .env.example .env            # fill DATABASE_URL, DIRECT_URL, JWT secrets
npx prisma migrate deploy && npx prisma generate
npm run dev                     # http://localhost:8000

# Web
cd web && npm install && npm run dev        # http://localhost:5173

# Mobile
cd mobile && npm install && npx expo start
```

## Branching

The default branch is `main`. **Do not commit directly to `main`** — branch, then
open a pull request. Name branches by type and scope:

```
feat/escrow-milestones
fix/wallet-double-debit
docs/api-reference
chore/ci-node-version
```

## Commit messages

This repo uses **[Conventional Commits](https://www.conventionalcommits.org/)**.
Look at `git log` — the history already follows this, often with a plain-English
subject describing the effect:

```
feat(payments): actually tell the buyer the payment went through
fix(mobile): don't strand the buyer behind a completed payment
fix(auth): let password managers fill and save credentials
```

Format:

```
<type>(<scope>): <short, imperative summary>

<optional body — the why, not just the what>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `perf`.
Common scopes: `auth`, `escrows`, `wallet`, `payments`, `messages`, `admin`,
`web`, `mobile`, `seed`, `ux`, `ci`.

## Pull requests

1. Branch from an up-to-date `main`.
2. Make your change; keep it focused.
3. Run the checks in [Before you push](#before-you-push).
4. Open a PR against `main`, fill in the template, and link any related flow in
   [FLOWS.md](FLOWS.md).
5. Request review from a teammate. For anything touching money or auth, a review
   is required, not optional.

## Coding standards

- **TypeScript, strict**, across server, web, and mobile.
- **Server:** feature-module layout (`router / controller / service / validation`).
  Business logic and every DB/money mutation live in the **service**; controllers
  stay thin; validate every input with **Joi**. Throw `ApiError.*` — never write
  HTTP status codes from a service.
- **Never mutate an escrow `status` directly.** All transitions go through the
  single `transition()` gateway (see [ARCHITECTURE.md](ARCHITECTURE.md#escrow-state-machine)).
- **Money is `Decimal(14,2)`; fee math is in integer pesewas.** No floating-point
  arithmetic on money.
- **Web:** feature-sliced (`data/` hooks + `ui/`); all server calls go through
  `features/shared/libs/api.ts`; filters/pagination live in the URL; irreversible
  actions confirm first.
- **Mobile:** Expo SDK 54 — read the exact versioned docs at
  <https://docs.expo.dev/versions/v54.0.0/> before using an Expo API; several
  APIs differ from newer SDKs (see [mobile/AGENTS.md](mobile/AGENTS.md)).

## Adding a server feature module

1. Create `server/src/features/<name>/` with `router`, `controller`, `service`
   (add `validation` and `model` as needed).
2. Define Joi schemas; wire routes with `validate(...)` and `auth` /
   `requireSeller` / `requireAdmin` where required.
3. Mount it in `server/src/app.ts`:
   `app.use("/api/<name>", <name>Router)`.

## Database & migrations

- Schema is [`server/prisma/schema.prisma`](server/prisma/schema.prisma). Enum
  values are **lowercase** to match the client vocabulary — keep it that way.
- Create a migration with `npx prisma migrate dev --name <change>`; commit the
  generated migration folder.
- The generated client (`src/generated/prisma/`) is **gitignored** — always run
  `npx prisma generate` after pulling a schema change.
- Migrations need `DIRECT_URL` (Neon's pooled host can't run them).

## Before you push

Run the same checks CI runs:

```bash
cd server && npx prisma generate && npm run typecheck
cd web    && npm run build && npm run lint
cd mobile && npx tsc --noEmit
```

Everything should pass before you open the PR.
