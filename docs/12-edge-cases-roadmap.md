# 12 — Edge Cases & Future Enhancements

## 12.1 Edge-case catalogue (each has a designed resolution, not an afterthought)

| # | Edge case | Handling |
|---|---|---|
| 1 | Buyer disappears after funding | Delivery still verifiable via code/QR flow → auto-release after inspection window. If buyer vanishes *pre-delivery* on a service escrow: provider submits work; 72 h silence = auto-approve per milestone (warned in ToS + reminders). |
| 2 | Seller disappears after funding | Deliver-by deadline passes with no fulfilment event → auto-flag → buyer offered one-click full refund; seller strike recorded (3 strikes → suspension review). |
| 3 | Both disappear | Funds sit in ESCROW_LOCKED; 90-day dormancy job notifies both, then escalates to admin resolution; unclaimed funds policy documented (regulatory requirement in production). |
| 4 | Failed payment mid-funding | Payment row FAILED; escrow stays AWAITING_FUNDING with retry CTA until funding deadline; partial card auth never credited (webhook-only trust). |
| 5 | Double webhook / replay | Dedupe on provider event id + idempotency keys; duplicate credit lands in suspense via invariant check. |
| 6 | Deposit after escrow expired | Funds credit to buyer's AVAILABLE (not escrow) + notification; escrow can be re-opened by mutual consent within 7 days. |
| 7 | Wrong/misformatted TRX address | Checksum validation at entry + confirm-twice + QR; contract only pays pre-registered addresses, so a later typo is impossible. |
| 8 | Crypto underpayment / overpayment | Grace top-up window / auto-refund of excess to sender address (see doc 05). |
| 9 | TRX deposited but confirmations stall / chain congestion | Watcher retries with backoff; status shows "confirming"; 2 h stall → support alert; funds never credited early. |
| 10 | Expired delivery code at handover | Buyer regenerates instantly in-app; driver waits ≤30 min; repeated expiry (buyer stalling) → driver files failed-handover with GPS+photo proof. |
| 11 | Buyer refuses to reveal code after receiving item | Driver "recipient refuses" flow: proof-of-attempt captured, escrow → dispute; driver testimony + GPS + photo favor seller. Code reveal ≠ fund release, so honest buyers lose nothing by revealing. |
| 12 | Fake delivery confirmation (driver-seller collusion) | Driver never has the code; needs buyer's screen. Photo+signature+geofence cross-check; buyer's "not received" during inspection reopens with full delivery forensics. |
| 13 | Lost/damaged package | No arrival event by deadline → auto-flag (doc 05 §fraud table); damaged: buyer photographs at handover *before* code entry is optional but inspection window covers it — dispute with photos. |
| 14 | Wrong-recipient delivery | Signature-name mismatch flag + buyer "didn't receive" path; geofence limits radius of error. |
| 15 | KYC failure / doc rejection ×3 | Locked from resubmission → support ticket flow; account remains Tier 1 with limits; clear reasons at every rejection. |
| 16 | Duplicate identity across accounts | Doc-number hash match → both accounts flagged, newer frozen pending review. |
| 17 | Account suspended with funds inside | Withdrawal-only mode unless fraud hold; fraud hold requires admin dual-control and 30-day review clock. |
| 18 | Refund/withdrawal fails at provider | Withdrawal → FAILED → auto-return ledger pair to AVAILABLE + notify + retry CTA; repeated failure → destination re-verification. |
| 19 | Card chargeback after escrow release | Payments row → CHARGEBACK_PENDING; user wallet frozen up to chargeback amount; evidence pack (delivery proof, chat, events) auto-compiled for Paystack representment; loss socialized to platform reserve if lost (production: chargeback-risk pricing on card deposits; MoMo has no chargebacks — prefer it). |
| 20 | Network failure mid-action | All money POSTs idempotent → safe retry; wizard drafts server-side; socket reconnect re-syncs state; UI never shows optimistic success for money. |
| 21 | Clock skew abuse on deadlines | All deadlines server-computed and stored absolute; clients only render countdowns. |
| 22 | Dispute filed at 71:59 of inspection | Filing instantly freezes auto-release job (job checks dispute existence at execution — race-safe). |
| 23 | Arbitrator conflict of interest | Assignment excludes arbitrators with any past escrow/chat relation to parties; appeal always different arbitrator. |
| 24 | Data breach of KYC bucket | Envelope encryption means bucket leak ≠ plaintext; access logging + short-TTL URLs; incident runbook + Act 843 breach-notification duty documented. |

## 12.2 Future enhancements (competitive roadmap)

**Phase 2 (post-defence):** React Native app (shared packages ready) · USDT-TRC20 stablecoin escrow (the real demand) · in-app FX quote (GHS↔USDT) via partner · WhatsApp bot (create/track escrow via chat — meets users where the deals happen) · Escrow API + embeddable "Pay with TaaS" button for social sellers (true Trust-as-a-Service) .

**Phase 3:** Bitcoin 2-of-3 multisig adapter · reputation passports (portable, signed trust score) · AI-assisted dispute triage (evidence summarization for arbitrators) · logistics-partner integrations (Bolt Send, local riders) with live tracking · installment escrow (buy-now-pay-in-escrow) · business accounts (team roles, invoicing, bulk escrow) · insurance pool add-on (opt-in premium covers non-delivery beyond ruling) · cross-border corridor (GH↔NG) with dual-currency escrow.

**Differentiators vs Escrow.com / marketplace-native protection:** mobile-money-first, chat-commerce-native (link/QR/WhatsApp bot), micro-transaction-friendly fees, crypto+fiat under one ledger, and delivery verification designed for informal courier ecosystems.
