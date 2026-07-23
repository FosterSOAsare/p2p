# 10 — Notifications & Dispute Resolution

## 10.1 Notification system

**Pipeline:** domain event → outbox row (same DB tx) → BullMQ worker → per-user preference resolution → channel dispatchers (in-app always; push FCM; email Resend; SMS Arkesel) → delivery status recorded on the notification row. Realtime in-app via Socket.IO room per user (badge count + toast).

**Channel policy by event (defaults):**

| Event | In-app | Push | Email | SMS |
|---|---|---|---|---|
| Escrow invited / accepted / funded | ✔ | ✔ | ✔ | — |
| Action deadline (24 h, 1 h warnings) | ✔ | ✔ | ✔ | ✔ (final hour, money at stake) |
| Delivery: driver assigned / arrived / code ready | ✔ | ✔ | — | ✔ (arrived) |
| Funds released / deposit confirmed / withdrawal paid | ✔ | ✔ | ✔ | ✔ |
| Dispute opened / response due / ruling | ✔ | ✔ | ✔ | ✔ |
| New chat message | ✔ | ✔ | digest | — |
| Security (new device, password change, 2FA change, withdrawal destination added) | ✔ | ✔ | ✔ (locked on) | ✔ |
| Marketing/product | ✔ | opt-in | opt-in | never |

Rules: OTPs and delivery codes are **never** in notification bodies; SMS reserved for money/security (cost + attention); email templates via react-email with consistent branding; digesting for chat (max 1 email/15 min/thread); quiet hours for push (22:00–07:00, except security + final deadline).

## 10.2 Dispute resolution

**Lifecycle:**

```
OPEN (party files: reason, description, evidence, requested outcome)
 → AWAITING_RESPONSE   counterparty has 48 h to respond + submit evidence
     · no response → arbitrator may summary-rule for the filer
 → UNDER_REVIEW        arbitrator assigned (round-robin, conflict check)
     · reviews: both evidence sets + auto-attached system snapshot
       (escrow events, chat export, delivery proof, vault access log)
     · may request more info (adds 24 h) or start a 3-way dispute chat
 → RULED               outcome: RELEASE | FULL_REFUND | PARTIAL (exact split)
     · written reasoning required (both parties see it)
 → 48 h appeal window  one appeal per party, must include NEW evidence;
     · appeal goes to a DIFFERENT arbitrator (senior queue)
 → FINAL → EXECUTED    engine moves funds per ruling (pro-rata fee)
```

**Design decisions:**
- Filing window: any time from FUNDED until inspection ends; filing freezes auto-release instantly.
- Evidence is two-sided visible (fair hearing) except arbitrator notes.
- Partial refunds: arbitrator sets exact buyer/seller amounts (must sum to escrow total minus pro-rata fee); typed-amount confirmation before execution.
- Abuse controls: dispute-loss history feeds risk score; frivolous-dispute pattern (≥3 losses in 90 days) → filing requires GH₵ deposit refundable on win (production idea; documented in v1).
- SLA targets: first arbitrator touch <24 h; ruling <72 h from UNDER_REVIEW. Metrics on the admin dashboard.
- Every arbitrator action → audit log + dispute record (dual-logged).
