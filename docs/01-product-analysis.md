# 01 — Product Analysis

## 1.1 What the product is

**TaaS (Trust-as-a-Service)** is a dual-core platform:

1. **Integrated P2P Marketplace** — users list and buy goods (phones, laptops, electronics, digital products). Every purchase automatically creates an escrow transaction. The marketplace is a *consumer* of the escrow engine, not the product itself.
2. **Standalone Escrow Engine** — the core innovation. Any two parties who met *anywhere* (WhatsApp, Telegram, Twitter, in person) can create an escrow contract via a shareable link/QR code. Supported asset classes: physical goods, digital goods, online accounts, services (milestone-based), and cryptocurrency (TRON/TRX testnet for the academic build; Bitcoin listed in the vision as a later settlement adapter).

The one-sentence pitch: **"Stripe for trust"** — an intermediary layer that holds value until both sides of an informal deal have performed.

## 1.2 The problem being solved

- Informal P2P commerce in Ghana and across Africa happens overwhelmingly on WhatsApp/Telegram/Instagram, with **zero transaction protection** — "pay before delivery" scams and "receive then vanish" buyer fraud are endemic.
- Existing marketplaces (Jiji, Tonaton, Jumia) protect only transactions that originate inside their walls.
- International escrow services (Escrow.com) don't support mobile money, are expensive, and are not built for small informal deals.
- Crypto P2P deals rely on trusting the counterparty or on exchange P2P desks with limited asset coverage.

## 1.3 Users and roles

| Role | Description | Primary actions |
|---|---|---|
| **Buyer** | Pays into escrow | Fund escrow, track delivery, inspect, release/dispute |
| **Seller** | Delivers goods/services | Accept escrow, ship/deliver, receive payout |
| **External trader** | Arrives via escrow link from WhatsApp/Telegram | Join escrow, act as buyer or seller |
| **Service provider / client** | Milestone-based work | Define milestones, submit/approve deliverables |
| **Delivery driver (courier)** | Verified third party for physical goods | Accept jobs, scan QR / enter delivery code, capture proof |
| **Arbitrator (admin sub-role)** | Resolves disputes | Review evidence, rule, order refunds/releases |
| **KYC reviewer (admin sub-role)** | Approves identity documents | Approve/reject KYC submissions |
| **Super admin** | Platform owner | Everything: users, finance, settings, reports |
| **Support agent** | Read-mostly admin | View transactions, respond to tickets |

A single account can act as buyer in one escrow and seller in another — **roles are per-transaction, not per-account** (except driver and admin roles, which are separate account types).

## 1.4 Gaps and ambiguities in the proposal (and our resolutions)

| # | Gap / ambiguity | Recommendation adopted in this blueprint |
|---|---|---|
| 1 | Custodial vs non-custodial undecided | **Custodial** for fiat (simulated Paystack test mode) + **testnet smart-contract** for TRX. Real-money custody in Ghana requires a Bank of Ghana PSP/EMI licence — out of scope for the prototype but documented (see [07-kyc-compliance.md](07-kyc-compliance.md)). |
| 2 | No revenue/fee model | Escrow fee: **1.5% capped, min GH₵2**, split configurable (buyer pays / seller pays / 50-50, chosen at creation). Withdrawal fee passthrough. See [06-wallet-payments.md](06-wallet-payments.md). |
| 3 | No delivery logistics model | Platform does **not** run a fleet. Drivers are registered independent couriers OR seller-arranged couriers given a one-time driver session. See delivery system in [05-escrow-engine.md](05-escrow-engine.md). |
| 4 | "User verification" undefined | Risk-based tiered KYC (Tier 0–3), Ghana Card + selfie liveness at Tier 2. See [07-kyc-compliance.md](07-kyc-compliance.md). |
| 5 | No dispute SLA / process | Structured dispute lifecycle with evidence windows, admin arbitration, partial refunds, one appeal. See [11-disputes-admin.md](10-notifications-disputes.md). |
| 6 | No non-functional requirements | Added: 99.5% availability target, <300 ms p95 API latency, WCAG 2.1 AA, OWASP ASVS L2, audit log immutability, idempotent payment operations. |
| 7 | Bitcoin mentioned in early drafts, TRON chosen later | TRON (Shasta/Nile testnet) is the v1 crypto adapter (cheap, fast finality, TronGrid API). Bitcoin/USDT become future settlement adapters — the adapter pattern makes this a plug-in, not a rewrite. |
| 8 | Chat unspecified | In-escrow chat (per transaction, retained as dispute evidence) rather than open DMs — reduces spam/scam surface and keeps evidence scoped. |
| 9 | No expiry/timeout rules | Every state has a timeout (acceptance 72 h, funding 48 h, inspection 72 h auto-release, etc.). See state machine in [05-escrow-engine.md](05-escrow-engine.md). |
| 10 | Mobile + web both promised | **Web first** (Next.js, responsive/PWA), mobile app (React Native/Expo) reuses the same API and TypeScript types in Phase 2. |

## 1.5 Success metrics (for the evaluation chapter)

- Escrow completion rate (funded → released without dispute) ≥ 90% in simulation.
- Dispute resolution median time ≤ 72 h in test scenarios.
- Task-based usability (SUS score ≥ 70 from survey participants).
- Zero double-spend / balance-inconsistency events under concurrent load test (ledger invariant checks).
- End-to-end TRX testnet escrow demonstrably verifiable on Tronscan.

## 1.6 Explicit non-goals (v1)

- Real-money custody or live crypto mainnet.
- Open social feed / DMs outside transactions.
- Shipping-rate integration with courier companies.
- Native iOS/Android (Phase 2).
- Non-custodial smart-contract escrow for fiat.
