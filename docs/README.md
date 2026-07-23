# TaaS — Trust-as-a-Service Platform · Software Blueprint

Design and Development of a Trust-as-a-Service (TaaS) Platform: A Multi-Platform P2P Marketplace and Standalone Escrow Engine (Group 2, KNUST Computer Science).

**Build order: web first (Next.js), mobile app (React Native) in Phase 2.**

| Doc | Contents |
|---|---|
| [01-product-analysis.md](01-product-analysis.md) | Purpose, users/roles, proposal gap analysis, success metrics, non-goals |
| [02-architecture.md](02-architecture.md) | System architecture, full tech stack with justifications, patterns, repo layout |
| [03-user-flows.md](03-user-flows.md) | End-to-end journeys, navigation system, deep links, screen hierarchy |
| [04-screens.md](04-screens.md) | Every screen: components, validation, states, permissions |
| [05-escrow-engine.md](05-escrow-engine.md) | State machine, per-type workflows (physical/digital/accounts/services/crypto), delivery QR/code verification system, fees |
| [06-wallet-payments.md](06-wallet-payments.md) | Double-entry ledger, deposits, withdrawals, refunds, multi-currency |
| [07-kyc-compliance.md](07-kyc-compliance.md) | Tiered KYC, AML, Ghana regulatory context (Act 987/1044/843, FATF/VASP) |
| [08-security.md](08-security.md) | AuthN/Z, 2FA, encryption, fraud controls, audit logging (OWASP ASVS L2) |
| [09-database.md](09-database.md) | Full schema: ~30 tables, relationships, constraints, indexes |
| [10-notifications-disputes.md](10-notifications-disputes.md) | Multi-channel notification matrix, dispute/arbitration lifecycle |
| [11-admin-panel.md](11-admin-panel.md) | Admin roles and all 11 admin screens |
| [12-edge-cases-roadmap.md](12-edge-cases-roadmap.md) | 24 edge cases with resolutions, Phase 2/3 roadmap |

## Visual design system

Adopted reference: **Coinbase DESIGN.md** from [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) → https://getdesign.md/coinbase/design-md

Why: TaaS sells *trust* in money-moving flows spanning fiat **and** crypto — exactly Coinbase's design problem. Clean institutional blue, light+dark modes, consumer-simple financial UI. Runner-up: **Stripe** (premium purple-gradient, weight-300 type) — better fit for the marketing/landing pages and the future developer-API docs, so: **Coinbase system for the product UI, Stripe-style gradients allowed on the public landing page.** Avoid Binance/Kraken (trading-terminal density we don't need) and Wise (transfer-app patterns, weaker crypto fit).

Practical use: drop the DESIGN.md into the repo root as `DESIGN.md`; AI coding agents (Claude Code, Cursor) will style generated UI against it. Map its tokens into Tailwind config + shadcn/ui CSS variables.
