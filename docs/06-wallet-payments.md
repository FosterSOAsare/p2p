# 06 — Wallet & Payments

## 6.1 Design principle: double-entry ledger

Balances are **derived, never stored as the source of truth**. Every movement writes ≥2 balanced `ledger_entries` rows (debits = credits) inside one DB transaction. A cached `balance` column on `wallets` exists for reads but is recomputed/verified by a nightly invariant job (`Σ ledger = cached balance`, `Σ all accounts = 0`); any mismatch pages the team and freezes the affected wallet.

**Account types per user per currency:**
- `AVAILABLE` — spendable
- `ESCROW_LOCKED` — funded escrows (held against a specific escrow ID)
- `PENDING_WITHDRAWAL` — withdrawal requested, not yet settled

**Platform accounts:** `PLATFORM_FEES`, `PLATFORM_SUSPENSE` (unmatched deposits), `PROVIDER_CLEARING` (Paystack/TRON in-transit).

Example — buyer funds GH₵1,000 escrow via MoMo, seller-pays-fee, then release:

```
Deposit confirmed:   DR PROVIDER_CLEARING 1,000 │ CR buyer.AVAILABLE 1,000
Fund escrow:         DR buyer.AVAILABLE   1,000 │ CR buyer.ESCROW_LOCKED 1,000
Release (fee 15):    DR buyer.ESCROW_LOCKED 1,000 │ CR seller.AVAILABLE 985
                                                  │ CR PLATFORM_FEES     15
Withdraw 985:        DR seller.AVAILABLE 985 │ CR seller.PENDING_WITHDRAWAL 985
Payout settles:      DR seller.PENDING_WITHDRAWAL 985 │ CR PROVIDER_CLEARING 985
```

## 6.2 Deposits

- **Fiat (Paystack):** amount → init transaction (idempotency key) → Paystack popup (MoMo/card) → **webhook is the only truster of success** (signature-verified, deduped on event id); client-side "success" only optimistically shows pending. Unmatched/duplicate webhook amounts land in `PLATFORM_SUSPENSE` for admin reconciliation.
- **TRX:** per-user deposit address (derived HD path) or per-escrow contract address; watcher polls TronGrid; credit after 19 confirmations; below-minimum dust ignored (documented in UI).

## 6.3 Withdrawals

- Destinations: saved MoMo numbers / bank accounts (name-match check via Paystack resolve API).
- Controls: 2FA on every withdrawal; new destination = 24 h hold; velocity limits per tier (Tier 1: GH₵2,000/day; Tier 2: GH₵10,000/day; Tier 3: custom); large withdrawals (> GH₵5,000) → manual admin approval queue.
- Lifecycle: `REQUESTED → PROCESSING → PAID | FAILED(auto-refund to AVAILABLE + notify)`. Provider transfer reference stored for reconciliation.

## 6.4 Refunds & pending states

- Escrow refunds move `ESCROW_LOCKED → AVAILABLE` (internal, instant).
- Provider-level refunds (card chargeback path) tracked in `payments` with status `CHARGEBACK_PENDING`; disputed chargebacks freeze the linked user pending review (see edge cases doc).
- All in-flight items appear under "Pending" in the wallet UI with explanatory copy and ETA.

## 6.5 Multi-currency

- v1 currencies: **GHS** and **TRX** — separate wallets, separate ledgers, no FX conversion on-platform (avoids exchange licensing scope). Escrow currency fixed at creation.
- Money stored as **BIGINT minor units** (pesewas; SUN for TRX 1e6) — never floats. `packages/shared` exports a `Money` type + formatter.
- Future: USDT-TRC20 adapter (stablecoin escrow is the killer feature for GH traders), BTC multisig adapter.

## 6.6 Transaction history

Filterable ledger view (type, currency, date range, linked escrow), CSV export, per-entry receipt PDF (reference, counterparty, fee breakdown) — required for the "audit" story in the report.
