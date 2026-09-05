# Changelog

All notable changes to **VeriTrust** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project follows [Conventional Commits](https://www.conventionalcommits.org/).
Because this is an actively developed coursework project, changes are grouped
under **Unreleased** until a tagged release is cut; the milestone timeline at the
end gives the chronological picture.

## [Unreleased]

### Added

- **Escrow engine** — a guarded 6-state machine (`created → funded → delivered → disbursed | disputed`, plus `cancelled`) with every transition passing one `transition()` gateway that moves money in the same DB transaction and appends an immutable event.
- **Marketplace** — listings with search / category / condition / price / sort filters, listing detail with reviews and ratings, saved listings, and vendor blocking.
- **Standalone escrow deals** — off-marketplace contracts between any two accounts, joinable by **share code + QR**, with counterparty autosuggest.
- **Realtime messaging** — 1:1 chat over Socket.IO with text, file attachments, and live deal system notices; Postgres-backed so history and offline catch-up work.
- **Disputes & arbitration** — either party can freeze a deal; an admin case view merges chat and state changes into one evidence transcript, ruled with a single release/refund/split dial. Rulings are final.
- **Wallet & payouts** — cleared / pending / escrow-locked balances, atomic guarded debits, transaction history, and first-class **withdrawal** requests reviewed by an admin.
- **KYC** — buyer→seller upgrade via a reviewed submission (dual momo / TRX payout).
- **Admin console** — stats dashboard, KYC queue, dispute arbitration, user suspend/reinstate, deals oversight, listing moderation, and buyer listing **reports**.
- **Promotions** — paid 7/14/30-day listing spotlights with pause/resume and countdowns.
- **In-app notifications** system.
- **Crypto rail** — NOWPayments integration for TRX on the TRON Shasta testnet (deposit routes, IPN webhook, funding UI).
- **Fiat deposits** — Paystack test-mode integration (init + signature-verified webhook + verify poll), alongside the instant simulated deposit.
- **Lifecycle emails** — HTML templates for verification, orders, releases, disputes, withdrawals, and takedowns (simulated to console by default; SMTP driver available).
- **Mobile app** — full Expo (React Native) client with buyer, seller, and admin suites; realtime chat; persistent sessions; a light/dark theme toggle; and clean returns from external payment redirects.
- **Cross-device dev support** — zero-config LAN detection for CORS and email links; a one-command dev launcher for Linux and Windows.
- **Deployment config** — `render.yaml` (API, pinned to the database's region) and Vercel config for the web build.
- **Project documentation & governance** — root `README`, `ARCHITECTURE`, `LICENSE`, `CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`, issue/PR templates, and a CI workflow.

### Changed

- Funding now moves real (simulated) money — checkout and `fund` debit the buyer's wallet and roll back on a short balance; auto-funding was removed.
- Dispute **auto-resolution was removed** — every ruling is a manual admin decision; auto-release is disabled (the buyer releases manually).
- QR sharing moved onto the deal-detail response (rendered once and cached) instead of a standalone endpoint.
- The KYC vendor form was paged into an intro + three steps on both clients.
- Many mutations across both clients were made **optimistic**, and chat moved onto the socket.
- Password-manager-friendly auth: fields let managers fill and save credentials; Android offers to save the password.
- Responsive passes on mobile: bottom tab bar on phones, tablet-aware grids/forms, and auth screens that no longer stretch on tablets.

### Fixed

- **Crypto:** never settle a deposit worth nothing; settle atomically; stop reusing an invoice pointing at a stale destination; restore the mobile payment redirect.
- **Wallet:** atomic rejection and idempotent payout submits (no double payouts).
- **Auth (mobile):** stop concurrent token refreshes from revoking every session.
- **Payments (mobile):** finish the purchase after returning from Paystack; pay the amount the buyer chose; don't strand the buyer behind a completed payment.
- **Realtime:** other users' changes (including the admin console) land without a manual refresh.
- **Web:** repaired the build (missing import + a loose currency type); theme is changeable from the header by anyone.

### Performance

- Warm the database connection pool at boot and keep the (serverless) database awake, so requests after an idle spell don't pay cold-start latency.
- Standalone deal creation cut from ~8.8s to ~1.6s; message-send latency roughly halved; redundant DB round trips removed.

### Security

- argon2id password hashing; rotating refresh tokens with session-family revocation on reuse.
- Signature-verified payment webhooks (Paystack HMAC-SHA512; NOWPayments IPN).
- Idempotency keys on deposits, withdrawals, and crypto deposits.
- Secrets kept out of the repo (`.env` and the `.neon` file gitignored).

---

## Milestone timeline

A high-level view of how the build progressed (see `git log` for the full detail).

| Period | Milestone |
| --- | --- |
| **2026-07** | Foundations — auth, KYC, marketplace, the core escrow lifecycle, wallet, and the admin console (web first). |
| **2026-07 → 08** | Realtime messaging (Socket.IO), the 6-state escrow with cancellation, fee-split logic, disputes with manual admin rulings, share-code/QR join, promotions, listing moderation & reports, and in-app notifications. |
| **2026-08** | Mobile app build-out — buyer/seller/admin suites reaching parity with web; the NOWPayments crypto (TRX Shasta) rail end to end; Paystack fiat deposits; lifecycle emails. |
| **2026-08 → 09** | Withdrawals as first-class auditable records; performance work (pool warming, keep-alive, latency cuts); responsive/tablet polish; deployment config (Render + Vercel); password-manager-friendly auth. |
| **2026-09** | Professional project documentation and repository governance. |

[Unreleased]: https://github.com/FosterSOAsare/p2p/commits/main
