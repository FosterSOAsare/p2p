# 03 — Complete User Flows & Navigation

## 3.1 First-run journey (web)

```
Landing page ──► "How it works" / Fees
     │
     ├─ [Start an escrow] ──► signup wall at the moment of commitment (not before)
     └─ [Browse marketplace] ── browsing is public; buying requires account
```

Web has no splash screen; the mobile app (Phase 2) gets: Splash (logo, 1.5 s, version check) → 3-slide onboarding (skippable, shown once) → Auth.

## 3.2 Account creation & verification funnel

```
Sign up (email + password + full name + accept ToS)
  → Email OTP (6-digit, 10 min TTL, 5 attempts, resend after 60 s)
  → Phone number + SMS OTP  (required before any transaction)      [Tier 1]
  → Optional now, forced contextually later:
      KYC Tier 2 (Ghana Card + selfie liveness)   — required for:
        crypto escrow, transactions > GH₵1,000, seller payouts
      KYC Tier 3 (proof of address)               — payouts > GH₵5,000/mo
```

Principle: **progressive trust** — never front-load KYC; ask at the moment a limit is hit, with a clear "why we ask" screen.

**Login:** email/username + password → (if 2FA on) TOTP or SMS code → device fingerprint check → new device triggers email alert + optional approval. Session list visible in Settings.

**Password recovery:** email → reset link (single-use token, 30 min TTL) → new password → all sessions revoked → confirmation email. Never reveal whether the email exists.

## 3.3 Core loop A — Marketplace purchase

```
Browse/search → Listing detail → [Buy with escrow]
 → Auto-created escrow (terms prefilled from listing)
 → Buyer funds (wallet balance or Paystack MoMo/card)
 → Seller notified → seller ships (enters courier + tracking or assigns driver)
 → Delivery verification (QR/code — see doc 05)
 → Inspection window (72 h) → buyer [Release] or [Dispute]
 → Funds released to seller wallet (minus fee) → both prompted to review
```

## 3.4 Core loop B — External escrow via link

```
User A: [Create escrow] wizard:
  1. Type (physical / digital / account / service / crypto)
  2. Role (I am buyer / I am seller)
  3. Terms: title, description, amount+currency, fee split,
     deadlines, (milestones if service), (delivery method if physical)
  4. Review → creates escrow in DRAFT → share link/QR
     https://taas.app/e/9XK2-4FQ8   (+ WhatsApp share button)

User B opens link (public preview page: terms, fee, counterparty
  verification badge, "protected by TaaS" explainer)
  → Sign up / log in → [Accept terms] (or propose change → back to A)
  → escrow ACTIVE → funding → fulfilment → release (same as loop A)
```

## 3.5 Other journeys (summary)

- **Wallet:** Dashboard → Wallet → Deposit (Paystack popup / TRX address with QR) · Withdraw (MoMo number / bank, 2FA-gated) · full ledger history with filters.
- **Dispute:** Escrow detail → [Open dispute] → reason + evidence upload → counterparty response window (48 h) → arbitrator chat/review → ruling (full/partial refund or release) → 48 h appeal window → executed.
- **Settings:** Profile · Security (password, 2FA, sessions/devices) · Verification status · Notification preferences · Legal · Delete account.
- **Logout:** clears refresh cookie server-side, socket disconnect, redirect to landing. "Log out all devices" in Security.

## 3.6 Navigation structure (web)

**Public:** `/` landing · `/how-it-works` · `/fees` · `/market` (browse) · `/e/[code]` escrow link preview · `/login` `/signup` `/forgot-password` `/reset-password` `/verify-email`

**Authenticated shell** — top bar (logo · search · notification bell · wallet balance chip · avatar menu) + left sidebar (desktop) that collapses to a **bottom tab bar on mobile web/PWA** (same 5 tabs the native app will use):

| Tab | Route | Contents |
|---|---|---|
| Home | `/dashboard` | Action-needed cards, active escrows, recent activity |
| Market | `/market` | Browse, search, listing detail, sell |
| **+ Escrow** | `/escrow/new` | Center FAB — the hero action |
| Wallet | `/wallet` | Balances, deposit, withdraw, history |
| Activity | `/escrows` | All escrows, disputes, notifications |

Avatar menu → Profile, Settings, My listings, Reviews, Help, Logout.
**Admin** is a separate route group `/admin/*` with its own sidebar (see doc 11), role-gated.

**Deep links** (work on web now, map 1:1 to app links later):
`/e/[code]` join escrow · `/escrow/[id]` detail · `/escrow/[id]/dispute` · `/l/[listingId]` listing · `/wallet/deposit` · `/verify?token=` · `/driver/job/[id]` driver hand-off.

**Back navigation rules:** wizard steps preserve state on back; after terminal actions (payment success, escrow created) back is redirected to the detail page (history replace) so users can't resubmit; browser refresh on any wizard step restores from server-side draft.

## 3.7 Screen hierarchy diagram

```
Root
├─ Public (landing, how-it-works, fees, market browse, /e/[code])
├─ Auth (login, signup, forgot/reset, verify-email, verify-phone, 2fa)
├─ App shell (authed)
│  ├─ Dashboard
│  ├─ Market (browse → listing → buy | sell → create listing → my listings)
│  ├─ Escrow (list → detail → {fund, ship, track, inspect, release, dispute})
│  │            new (wizard) → share
│  ├─ Wallet (overview → deposit | withdraw | tx detail)
│  ├─ Disputes (list → detail → evidence, chat, ruling, appeal)
│  ├─ Chat (per-escrow thread)
│  ├─ Notifications (center)
│  └─ Settings (profile, security, verification, notifications, legal)
├─ Driver (jobs list → job detail → scan/enter code → proof capture)
└─ Admin (dashboard, users, KYC queue, escrows, disputes, finance,
          reports, settings, audit log)
```
