# Security Policy

VeriTrust handles authentication, wallets, and (simulated) money movement, so it
is built with a security-first posture even as a coursework project. This
document describes the security model and how to report a vulnerability.

> **Reminder:** VeriTrust is a **demonstration system**. Fiat payments are
> simulated and **no real funds are transmitted**; the crypto rail is
> **TRON Shasta testnet only**. It is not a licensed financial service and must
> not be used with real money.

## Reporting a vulnerability

**Please do not open a public GitHub issue for a security problem**, and do not
disclose it publicly until it has been addressed.

Instead, report it privately to the maintainers:

- Use **[GitHub Security Advisories](https://github.com/FosterSOAsare/p2p/security/advisories/new)**
  ("Report a vulnerability") on this repository, **or**
- Contact a maintainer directly (see the [team list](README.md#team)).

Please include:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if you have one),
- affected component(s): `server`, `web`, or `mobile`, and
- any suggested remediation.

We will acknowledge your report, investigate, and keep you informed of progress.
Because this is a student project, response times are best-effort.

## Scope

In scope: the API server, web client, and mobile app in this repository —
authentication, session/token handling, the escrow state machine, wallet and
money-ledger logic, dispute arbitration, access control, input validation, and
handling of uploads and payment webhooks.

Out of scope: third-party providers (Neon, Cloudinary, Paystack, NOWPayments,
Render, Vercel) — report issues in those to the respective vendors; and any
finding that depends on already-compromised credentials or a modified client.

## Security model (how the project defends itself)

- **Passwords** are hashed with **argon2id**. Login returns generic errors (no
  account enumeration) and runs a dummy hash on a miss to equalise timing.
- **Sessions** use short-lived access JWTs plus **rotating refresh tokens**;
  reusing a revoked refresh token revokes the entire session family. Tokens are
  sent as `Authorization: Bearer` only (no cookies). Mobile stores tokens in the
  device secure store (`expo-secure-store`).
- **Authorization is role-based and enforced server-side** (`auth`,
  `requireSeller`, `requireAdmin`) — never trusting a client's own routing.
- **All input is validated** with Joi (unknown keys stripped, values coerced).
- **The escrow engine is a guarded state machine.** Every money/state change
  passes one `transition()` gateway that checks the actor and current state and
  moves money in the **same DB transaction** as the state change; an immutable
  event is appended. Disputes freeze the deal — and the pair.
- **The money ledger is guarded and idempotent.** Debits use conditional updates
  that cannot go negative; deposits, withdrawals, and crypto deposits use
  **idempotency keys** so retries and racing webhooks/polls settle exactly once.
- **Payment webhooks are signature-verified** (e.g. Paystack HMAC-SHA512 over the
  raw request body; NOWPayments IPN signature). An unverifiable webhook is
  rejected.
- **Custody:** the crypto rail uses a hosted-invoice provider that owns the
  address — **the platform never stores a private key**.
- **Transport & headers:** `helmet` is applied; CORS is an explicit allow-list in
  production (the permissive localhost/LAN allowance is **development only**).
- **Secrets** are never committed — `.env` files (and the `.neon` project file)
  are gitignored; only `.env.example` is tracked.

## Known limitations (by design, for this scope)

- Fiat payment settlement is **simulated**; the crypto rail is **testnet only**.
- Realtime messaging runs **single-instance** (no Redis adapter yet).
- Depth appropriate to a regulated money-transmitter (full AML/KYC tiers,
  licensing, production custody controls) is intentionally **not** implemented —
  testnet-only crypto is the deliberate compliance boundary.

If you find something outside these known limitations, please report it.
