# P2P Marketplace Platform — Architecture & Build Plan

## Context

This is a greenfield project (the old static HTML mockup in `contracts/p2p` has been removed — nothing to build on top of). The goal is a peer-to-peer marketplace for physical goods with three core pillars:

1. **Marketplace** — vendors list goods, buyers browse and purchase.
2. **Escrow** — funds are held until delivery is confirmed or a dispute is resolved, supporting **both fiat and crypto** rails. Escrow is a **standalone product, not just a marketplace checkout step**: two parties can open an escrow deal for a contract/transaction entirely outside the marketplace (no listing, no purchase on the site), and this off-platform, third-party-contract use case is where **crypto is the primary rail** (self-custody-friendly, no need for either party to have a payout account on the platform). Marketplace purchases can use either rail, but fiat is the natural default there since both sides already have platform accounts.
3. **Vendor KYC** — vendors must pass identity verification through a **third-party KYC provider** (not built in-house) before they can list items or receive payouts.

This plan defines the system architecture, data model, module boundaries, and a phased build order so implementation can start from a solid foundation instead of ad hoc pages.

## Roles & Core Flows

- **Buyer** — browses listings, places orders, funds go to escrow, confirms receipt or opens a dispute.
- **Vendor** — must be `KYC_VERIFIED` before listing or receiving payouts; manages inventory and fulfillment.
- **Admin/Moderator** — resolves disputes, reviews flagged KYC edge cases, manages platform fees and payout holds.

Golden path (marketplace): Sign up → (if vendor) complete KYC via provider → vendor lists item → buyer orders → buyer's payment locked in escrow (fiat or crypto) → vendor ships → buyer confirms → escrow releases to vendor payout → both parties can rate. Dispute path branches at "buyer confirms" into admin review with refund/partial/release outcomes.

Golden path (standalone/third-party escrow): Two signed-in users (no listing, no marketplace purchase involved — e.g. a freelance contract, an off-platform sale) → either creates an `EscrowDeal` naming the counterparty, amount, currency, and release condition → counterparty accepts → funds locked (crypto by default; fiat also selectable) → release condition met (manual confirm, timer, or milestone) → funds released → dispute path same as marketplace (admin review). This path does **not** require vendor KYC, since no marketplace listing or payout-as-a-vendor is involved — only standard account authentication.

## High-Level Architecture

Modular monolith to start (single deployable backend, clearly bounded modules) rather than microservices — right-sized for an MVP marketplace, avoids premature distributed-systems complexity, and each module can be split out later if needed.

```
Client (web app)
   │
   ▼
API Gateway / Backend (REST or GraphQL)
   ├── Auth & Accounts module
   ├── Vendor KYC module ──────► Third-party KYC provider (Persona/Sumsub/Onfido — pluggable, pick later) via webhook
   ├── Marketplace module (listings, search, categories)
   ├── Orders module
   ├── Escrow module
   │     ├── Fiat rail  ──► Payment processor with hold/capture (e.g. Stripe Connect) 
   │     └── Crypto rail ──► On-chain escrow contract or custodial wallet service (stablecoin-first)
   ├── Disputes/Admin module
   ├── Notifications module (email/in-app)
   └── Ledger module (single source of truth for balances/movements across both rails)
   │
   ▼
Database (Postgres) + Object storage (KYC docs pass-through, listing images)
```

Key architectural decision: **the Ledger module is rail-agnostic.** Every escrow transaction (fiat or crypto) is represented as a normalized ledger entry (`amount`, `currency`, `rail`, `status`). Orders and disputes never talk to Stripe or a chain directly — they talk to the Escrow module, which delegates to whichever rail adapter matches the deal's currency. This keeps fiat/crypto parity and lets a third rail be added later without touching Orders/Disputes.

## Data Model (core entities)

- **User** — id, username, email, password/auth, role flags (buyer/vendor/admin), created_at.
- **VendorProfile** — user_id, kyc_status (`unverified`/`pending`/`verified`/`rejected`/`suspended`), kyc_provider_ref (external ID only — no raw PII stored locally beyond what's needed for support), payout_accounts (fiat bank/Stripe Connect acct, crypto wallet address).
- **KycCheck** — vendor_id, provider, provider_reference_id, status, submitted_at, decided_at, raw_result_webhook_ref. Local DB stores **status + provider reference only**; documents/PII stay with the provider.
- **Listing** — vendor_id, title, description, price, currency, category, condition, quantity, status (draft/active/paused/archived), images.
- **Order** — buyer_id, vendor_id, listing_id, amount, currency, rail (fiat/crypto), status (created → escrow_funded → shipped → delivered/confirmed → released, or disputed → resolved/refunded).
- **EscrowDeal** — order_id (nullable — most deals are standalone third-party contracts with no listing/order at all; a marketplace `Order` is one *possible* source of a deal, not the default), creator_id, counterparty_id, amount, currency, rail, release_condition, expiry, status.
- **LedgerEntry** — escrow_deal_id, direction (in/out/hold/release/refund), amount, currency, rail, external_ref (Stripe charge id / tx hash), created_at. Append-only, never mutated.
- **Dispute** — escrow_deal_id, opened_by, reason, evidence[], status, resolution, resolved_by (admin), resolved_at.
- **Rating** — order_id, from_user, to_user, score, comment.

## Module Details

### 1. Auth & Accounts
Standard email/password (or OAuth) + session/JWT. Every user starts as a buyer; becoming a vendor is a role upgrade gated by KYC, not a separate signup flow.

### 2. Vendor KYC (third-party sourced)
- Vendor initiates verification → backend creates a session with the KYC provider (e.g. Persona, Sumsub, Onfido — kept pluggable behind a `KycProvider` interface since no vendor is chosen yet) → vendor completes the flow on the provider's hosted UI/SDK → provider sends a **webhook** on decision → backend updates `KycCheck.status` and `VendorProfile.kyc_status`.
- Local system never stores raw documents/selfies — only the provider's reference ID and decision status. This limits compliance surface area.
- Middleware/guard: any "create listing" or "request payout" action checks `kyc_status == verified`, otherwise 403 with a clear reason.

### 3. Marketplace
Listings CRUD (vendor-owned, gated by KYC), search/filter (category, price, condition), listing detail view showing vendor's KYC/trust badge and rating.

### 4. Orders
Created when a buyer checks out a listing. Order status machine drives what's shown to buyer/vendor and is the trigger point into Escrow.

### 5. Escrow (fiat + crypto, marketplace + standalone)
Escrow is its own module, not a sub-step of checkout — `EscrowDeal` is the core object, and an `Order` (marketplace purchase) is just one thing that can create one. A deal can also be created directly by any two account holders for an off-platform/third-party contract, with no listing or vendor-KYC involved.

- **Fiat rail**: use a payment processor that supports hold-then-capture / marketplace payouts (e.g. Stripe Connect with manual payout, or a custodial ledger + traditional payment gateway). Funds authorized at deal creation, captured/held, released to the counterparty on confirmation. Natural default for marketplace orders since both sides already have platform accounts; also available for standalone deals if both parties prefer it.
- **Crypto rail**: the primary rail for standalone/third-party-contract escrow, since neither party needs a pre-existing platform payout account — just a wallet. Two viable approaches —
  - (a) **Smart contract escrow** (stablecoin, e.g. USDC on an EVM chain): buyer deposits into a contract, funds release on confirmation or an admin-triggered resolution call. More trustless, more engineering/audit overhead — fits the standalone use case well since parties may not otherwise trust the platform with custody.
  - (b) **Custodial wallet escrow**: platform-controlled wallet holds funds, backend enforces release logic same as fiat. Faster to build, less trustless, but consistent with the fiat model's admin dispute powers.
  - Recommend starting with **(b) custodial** for MVP parity with fiat dispute handling, with the ledger designed so a future on-chain contract can be swapped in as a rail adapter without changing Orders/Disputes/standalone-deal code. Since standalone/third-party deals are the case most likely to want trustless custody, plan the rail-adapter boundary so **(a) smart contract escrow** can be dropped in later specifically for that path without a redesign.
- Both rails write to the same `LedgerEntry` schema so admin tooling and reporting don't need to branch by currency type.
- Release triggers: confirmation (buyer, or counterparty for standalone deals), auto-release timer expiry, or admin dispute resolution.

### 6. Disputes/Admin
Buyer or vendor can flag an order as disputed before auto-release. Admin views evidence (messages, tracking, photos), and can release, partial-release, or refund. All state transitions are timestamped for audit.

### 7. Notifications
Order status changes, KYC decision, dispute updates, auto-release warnings — email + in-app.

## Suggested Tech Stack (recommend, not mandated)

- Backend: Node.js/TypeScript (NestJS or Express) or Python (FastAPI) — either fits a modular monolith well.
- DB: PostgreSQL (relational integrity matters a lot here — money, statuses, foreign keys).
- Frontend: React/Next.js.
- Fiat payments: Stripe Connect (marketplace payouts + manual capture supports the hold/release model directly).
- Crypto: start with a custodial hot-wallet service for a chosen stablecoin; revisit smart-contract escrow once volume justifies the audit cost.
- KYC: pluggable adapter interface; evaluate Persona / Sumsub / Onfido when ready to commit.

## Phased Build Order

1. **Foundations** — Auth/Accounts, DB schema, basic API scaffold.
2. **Escrow core + standalone deals (fiat first)** — `EscrowDeal`/`LedgerEntry` schema, deal creation between two accounts, Stripe Connect hold/release, dispute stub. Built first and independent of Marketplace/KYC since standalone deals don't need either.
3. **Escrow crypto rail** — custodial wallet adapter for standalone deals (the primary crypto use case), same ledger/state machine as fiat.
4. **Vendor KYC** — provider integration behind `KycProvider` interface, webhook handling, `kyc_status` gating.
5. **Marketplace** — listings CRUD, search/browse (KYC-gated creation).
6. **Orders** — wires marketplace purchases into the existing Escrow module (an Order creates an `EscrowDeal` under the hood).
7. **Disputes/Admin tooling** — evidence review, resolution actions, refund/partial payout (shared by both standalone and marketplace deals).
8. **Notifications, ratings, polish**.

## Open Decisions to Revisit Later (not blocking this plan)

- Which KYC provider (Persona/Sumsub/Onfido) — pluggable interface means this can be decided independently.
- Which chain/stablecoin for crypto rail, and whether to move from custodial to smart-contract escrow.
- Fee structure (platform cut, who pays gas/processing fees).

## Verification

This phase produces architecture, not code, so "verification" is: walk the golden path and dispute path against the module diagram and data model above with the user to confirm nothing is missing before any implementation begins.
