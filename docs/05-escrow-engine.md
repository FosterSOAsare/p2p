# 05 — Escrow Engine: State Machine, Workflows & Delivery Verification

## 5.1 Universal state machine

Every escrow, regardless of type, moves through one canonical machine; type-specific behavior lives in the *fulfilment* phase only.

```
 DRAFT ──create──► OPEN (awaiting counterparty)
   OPEN ──accept──► AWAITING_FUNDING          OPEN ──expire(72h)/cancel──► CANCELLED
   AWAITING_FUNDING ──funds confirmed──► FUNDED
   AWAITING_FUNDING ──expire(48h)/cancel──► CANCELLED
   FUNDED ──seller starts──► IN_FULFILMENT
   IN_FULFILMENT ──delivery verified / work submitted──► DELIVERED
   DELIVERED ──► INSPECTION (72h window)
   INSPECTION ──buyer releases OR window expires──► RELEASED ──payout──► CLOSED
   any state ≥ FUNDED ──either party──► DISPUTED
   DISPUTED ──ruling──► RELEASED | REFUNDED | PARTIAL (split) ──► CLOSED
   FUNDED/IN_FULFILMENT ──mutual cancel──► REFUNDED
```

Rules enforced in code (single `transition()` gateway):
- Transitions only via the whitelist table; anything else throws.
- Every transition: DB transaction + row lock on escrow + ledger writes + `escrow_events` append + outbox event.
- Timeouts are BullMQ delayed jobs scheduled at state entry and cancelled at state exit.
- Cancel rules: before FUNDED — creator can cancel unilaterally; after FUNDED — mutual consent or dispute only. **Money never leaves escrow except via RELEASED / REFUNDED / PARTIAL — and always to the platform wallet, then withdrawal (no direct external payout from escrow), keeping the ledger auditable.**

## 5.2 Per-type fulfilment workflows

### Physical goods
1. FUNDED → seller chooses fulfilment: platform driver (delivery job created) or own courier (must upload tracking ref + package photo).
2. Handover verification (see 5.4) → DELIVERED.
3. INSPECTION 72 h: buyer inspects; silence = auto-release (buyer is warned at 24 h and 1 h remaining).

### Digital goods (files, software, tickets)
1. FUNDED → seller uploads deliverable to escrow vault (stored encrypted, hash recorded).
2. Buyer can see file name/size/hash but **downloads only after funding is locked**; first download starts a 48 h inspection window.
3. Non-repudiation: download event logged (IP, time) — kills "I never received it" disputes.

### Online accounts (social media, gaming, subscriptions)
Highest-fraud category; special flow:
1. Seller submits credentials into the **credential vault** (AES-256-GCM encrypted, never in chat).
2. Buyer gets a 24 h **verify-and-secure window**: reveal credentials → change password/email → confirm control.
3. Recommended checklist shown to buyer (change password, email, 2FA, recovery numbers).
4. Risk banner: account recovery scams explained; disputes here require the vault access log as evidence. Platform ToS caveat: account resale may violate the origin platform's ToS — user acknowledges.

### Services (milestone-based)
1. Terms include milestone table (Σ milestones = total). Funding can be full upfront or per-milestone (chosen at creation).
2. Per milestone: provider [Submit work] (files/links/note) → client approve (releases that milestone's amount) or request revision (max 2 revision rounds, then dispute).
3. Deadline overrun per milestone → client may extend, cancel remaining milestones (refund of unreleased funds), or dispute.

### Cryptocurrency (TRX testnet, v1)
Use case: fiat↔crypto or crypto-for-goods swaps.
1. Escrow contract (Solidity/TVM) deployed once; each escrow = a contract record keyed by escrow ID.
2. Buyer sends exact TRX amount to the contract's deposit address (unique memo/sub-address per escrow); backend watches via TronGrid, requires **19 block confirmations** (~1 min).
3. Under/overpayment handling: underpaid → grace window to top up; overpaid → excess auto-refunded to sender address.
4. Release = backend (authorized release key, held in KMS) calls `release()` → contract transfers to seller's TRX address; txid stored and linked (verifiable on Tronscan).
5. Refund path mirrors release. Wrong-address risk is eliminated by *the contract paying only to addresses registered at escrow creation* — a mistyped address fails checksum validation at entry, and addresses are confirm-twice + QR-scannable.
6. Bitcoin (future adapter): 2-of-3 multisig P2WSH (buyer, seller, platform) — documented as future work, not built.

## 5.3 Fee model

- Escrow fee 1.5% (min GH₵2, cap GH₵150) — configurable in `platform_settings`.
- Split chosen at creation: buyer / seller / 50-50. Fee is taken at **release** (deducted from payout or added to funding total depending on split).
- Disputed-partial rulings: fee applied pro-rata to the released portion only.
- Payment-provider charges (Paystack ~1.95%) passed through on deposit, shown transparently.

## 5.4 Delivery Verification System (improved design)

Actors: Buyer B, Seller S, Driver D (platform-verified or one-time session courier).

### Code & QR design
- On driver pickup confirmation the system generates a **delivery secret**: a 6-digit numeric code + a QR encoding `{deliveryId, HMAC-SHA256(secret, deliveryId, expiry)}`.
- **Only B can view it** (blurred until tapped, watermarked with B's name, screenshot-discouraged UI). Never sent to D through any channel. Never in push/SMS body ("Your delivery code is ready" — not the code itself).
- QR is the primary path (D scans B's screen — fast, typo-free); 6-digit manual code is the fallback for broken cameras/feature phones. Barcode adds nothing over QR — dropped.
- Code TTL: activated when driver marks "arrived", expires 30 min later (regenerable by B if handover is delayed).

### Handover protocol
1. D taps **Arrived** → GPS checked against dropoff geofence (≤300 m). Outside geofence → verification blocked, flagged.
2. B taps **Reveal code** (this simultaneously confirms B's presence intent — a liveness signal).
3. D scans QR / enters code. 3 attempts max → lockout + auto-escalation to support + S notified.
4. On success D must capture: **photo of package at handover** (geo/time-stamped, camera-only, no gallery upload) + **B's signature on D's device**.
5. System marks DELIVERED, timestamps everything into `delivery_events`, starts inspection window, D's fee is credited.

### Driver authentication & trust
- Platform drivers: KYC'd accounts, admin-approved, photo + plate shown to both B and S; per-job acceptance; rating after each job.
- Seller's own courier: S generates a **one-time driver session link** (no account needed) that grants only that job's flow — still enforces GPS, photo, and code entry.

### Fraud & failure handling
| Threat | Control |
|---|---|
| D colludes with S, fakes delivery | D never possesses the code; needs B's screen. Photo + signature + GPS triple-check; mismatch voids auto-release. |
| B receives item then refuses to reveal code | D taps **Recipient refuses code**: captures photo + GPS as proof-of-attempt; escrow freezes into dispute; B's silence + D's evidence favor S. Code reveal ≠ release — B's inspection rights survive, so B has no incentive to withhold. |
| Code intercepted (shoulder-surf) | Code useless outside geofence + only valid for that deliveryId + 30 min TTL + attempt limit. |
| Wrong address / wrong recipient | Signature name mismatch flags; B can tap **I didn't receive this** during inspection → dispute with delivery evidence auto-attached. |
| Lost package | No "arrived" event within deliver-by deadline → auto-flag; platform-driver jobs carry driver liability (fee clawback + suspension); own-courier jobs resolve via dispute with tracking evidence; refund to B if S can't prove handover. |
| GPS spoofing | Mobile app uses mocked-location detection (Phase 2); v1 web driver flow records IP-geo cross-check; anomalies flag for manual review. |

## 5.5 Escrow events & audit
Every lifecycle action appends to `escrow_events` (actor, event, payload, IP, ts) — immutable, surfaced in the UI "Events" tab, and is the primary evidence source for arbitrators.
