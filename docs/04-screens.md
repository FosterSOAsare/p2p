# 04 — Screen-by-Screen UI/UX Specification

Conventions applied to **every** screen (stated once, not repeated):
- **Loading:** skeleton placeholders (never spinners on full pages); buttons show inline spinner + disable on submit.
- **Errors:** field-level inline messages; network failure → toast + retry; destructive/irreversible actions always behind a confirm dialog.
- **Empty states:** illustration + one-line explanation + primary CTA.
- **Validation:** client-side Zod schema (shared package) + identical server-side validation; submit disabled until valid; show errors on blur, not on keystroke.
- **Success:** toast for minor actions; full-screen success panel (icon + summary + next actions) for money-moving actions.
- **Permissions:** all `/app` screens require session; money actions require Tier ≥ 1 (phone verified); crypto + >GH₵1,000 require Tier 2.

## A. Public & Auth

| # | Screen | Purpose · key components · rules |
|---|---|---|
| A1 | **Landing** `/` | Hero ("Get paid. Get your goods. No trust required."), 3-step how-it-works strip, live stats (escrows completed, GH₵ protected), fee calculator widget, testimonial cards, CTA **Start an escrow** + **Browse market**. |
| A2 | **How it works** | Tabbed by transaction type (goods/service/crypto) with step diagrams; FAQ accordion. |
| A3 | **Fees** | Fee table + interactive calculator (amount → fee → who pays selector). |
| A4 | **Sign up** | Full name, email, password (strength meter; ≥8 chars, zxcvbn score ≥3), ToS checkbox. OAuth "Continue with Google" optional. Error: duplicate email → "email already registered" + login link. |
| A5 | **Email verification** | 6-digit OTP input (auto-advance boxes), resend w/ 60 s countdown, change-email link. 5 wrong attempts → 15 min lock. |
| A6 | **Login** | Email + password, "remember me", forgot link. Generic error "invalid credentials" (no user enumeration). After 5 failures → CAPTCHA; 10 → 15 min lock + email alert. |
| A7 | **2FA challenge** | TOTP 6-digit or SMS fallback; "use backup code" link; trust-this-device 30 d checkbox. |
| A8 | **Forgot / Reset password** | Email entry (always shows "if the account exists we sent a link"); reset form = new password ×2, revokes all sessions on success. |
| A9 | **Phone verification** | Country-coded phone input (default +233), SMS OTP; rate limit 3 sends/hour. Blocking modal version appears when an unverified user attempts any transaction. |
| A10 | **Escrow link preview** `/e/[code]` | Public. Shows: type icon, title, amount+fee split, creator's display name + verification badge + rating, expiry countdown, "What is TaaS?" explainer. CTA **Accept & continue** → auth wall. Invalid/expired code → dedicated error state with "create your own escrow" CTA. |

## B. KYC

| # | Screen | Spec |
|---|---|---|
| B1 | **Verification hub** `/settings/verification` | Tier ladder UI (0→3) showing current tier, unlocked limits, and what each next tier requires. Entry point for all KYC flows. |
| B2 | **Why we verify** interstitial | Shown when a limit blocks an action: explains exactly which action triggered it and what's needed. Never a dead end — always [Verify now] / [Go back]. |
| B3 | **Document capture** | Doc type select (Ghana Card / Passport), front+back photo upload or camera, client-side blur/glare detection hints, file ≤10 MB jpg/png/pdf. |
| B4 | **Selfie / liveness** | Camera capture with face-outline overlay; instructions (good light, no hat); consent checkbox for biometric processing (Data Protection Act). |
| B5 | **Address proof** (Tier 3) | Utility bill/bank statement upload ≤3 months old + address form (region, city, digital address GhanaPost GPS). |
| B6 | **KYC status** | Pending (est. review time), Approved (tier badge confetti), Rejected (reason + what to fix + resubmit CTA, max 3 attempts then support). |

## C. Dashboard & Marketplace

| # | Screen | Spec |
|---|---|---|
| C1 | **Dashboard** `/dashboard` | "Action needed" queue at top (fund X, inspect Y, respond to dispute Z — each with deadline countdown chips), then: active escrows carousel, wallet balance card, recent activity feed. Empty state: "No escrows yet" + create/browse CTAs. |
| C2 | **Market browse** `/market` | Search bar (debounced, full-text), category chips (Phones, Laptops, Electronics, Digital, Other), filters drawer (price range, condition, location, seller tier), sort (newest/price/rating). Card grid: image, title, price, seller badge+rating, "escrow protected" tag. Infinite scroll + skeletons. |
| C3 | **Listing detail** `/l/[id]` | Image gallery (swipe/zoom), title, price, condition, description, seller panel (avatar, tier badge, rating, member since, response time), delivery options, report-listing flag. CTA **Buy with escrow** (primary) · **Message seller** (creates pre-escrow inquiry thread). Sold state: banner + similar listings. |
| C4 | **Create listing** `/market/sell` | Requires Tier 1. Multi-step: photos (1–8, first = cover, drag-reorder) → details (title ≤80, category, condition enum, price GH₵, qty) → delivery options (pickup / courier / platform driver) → preview → publish. Draft autosaved. Listing goes live after automated content check; flagged terms → admin review queue. |
| C5 | **My listings** | Tabs: Active / Pending review / Sold / Drafts. Row actions: edit, pause, delete (confirm), share. |
| C6 | **Checkout (buy with escrow)** | Prefilled escrow terms from listing (read-only price, editable delivery address), fee display with split, payment method select (wallet / MoMo / card), total breakdown. [Pay into escrow] → Paystack modal → success panel with escrow link. |

## D. Escrow

| # | Screen | Spec |
|---|---|---|
| D1 | **Create escrow wizard** `/escrow/new` | 4 steps with progress bar. **1 Type:** 5 large cards (physical/digital/account/service/crypto — crypto locked behind Tier 2 with tooltip). **2 Role & counterparty:** I'm buyer/seller toggle; optional counterparty email/phone (invites directly) or leave open (share link). **3 Terms:** title ≤100, description ≤2000, amount+currency (GH₵ or TRX), fee split (radio: I pay / they pay / split), deadlines (accept-by, deliver-by), type-specific fields: milestones table for services (name, amount, due — must sum to total); delivery method for physical; asset description for accounts/crypto. **4 Review:** full summary, fee math, legal note → [Create escrow]. Validation: amount ≥ GH₵10 / 50 TRX; ≤ tier limit; deadlines ≥ 24 h out. Draft persisted server-side per step. |
| D2 | **Escrow created / share** | Success panel: link `taas.app/e/9XK2-4FQ8`, big QR, copy button, WhatsApp/Telegram share buttons, expiry note ("expires in 72 h if not accepted"). |
| D3 | **Escrow list** `/escrows` | Tabs: Needs action / Active / Completed / Cancelled+Disputed. Rows: type icon, title, counterparty, amount, **status pill + deadline countdown**, role badge (buyer/seller). Filter by type/date. Empty per tab. |
| D4 | **Escrow detail** `/escrow/[id]` | The heart of the app. Layout: header (title, amount, status pill), **horizontal stepper timeline** (Created→Accepted→Funded→In progress→Delivered→Inspection→Released) with timestamps; context-aware primary action button (exactly one per state per role — e.g. buyer/FUNDED sees nothing, seller/FUNDED sees [Mark as shipped]); terms accordion; parties panel; **per-escrow chat tab**; events log tab; danger zone (cancel / dispute, each with rules & confirm). Realtime: status + chat update via socket without refresh. |
| D5 | **Fund escrow** | Amount summary + method (wallet: shows balance, insufficient → inline top-up; Paystack: modal; TRX: shows contract deposit address + QR + exact amount + "waiting for confirmation" live watcher with block confirmations counter). Idempotent — refresh-safe. |
| D6 | **Shipping / fulfilment (seller)** | Physical: choose [Platform driver] (creates delivery job) or [Own courier] (courier name, tracking ref, photo of package + receipt required). Digital/account: secure delivery form (credentials vault field — encrypted, revealed to buyer only after funding, see doc 05). Service: milestone submit (files/links + note per milestone). |
| D7 | **Delivery tracking (buyer)** | Map-less v1: event timeline (picked up, in transit, arriving), driver card (name, photo, plate, verified badge) when platform driver. **Delivery code panel: 6-digit code + QR, blurred until buyer taps "Reveal", with warning "only show this to the driver at handover".** |
| D8 | **Inspection & release** | Countdown banner ("auto-release in 71:59:59 — funds go to seller unless you act"), delivery proof gallery (photos, signature, GPS stamp), [Release funds] (confirm dialog restating amount, irreversible) · [Report a problem] → dispute flow. Milestone variant: approve per milestone. |
| D9 | **Escrow completed** | Success panel: released amount, fee, payout note, mutual review prompt (1–5 stars + text ≤500), share CTA. |

## E. Wallet

| # | Screen | Spec |
|---|---|---|
| E1 | **Wallet overview** `/wallet` | Balance cards per currency: **Available / In escrow / Pending withdrawal** (three numbers per currency, GH₵ + TRX). Quick actions: Deposit, Withdraw, transaction search. Recent ledger entries list (icon, description, signed amount, running balance, status). |
| E2 | **Deposit** | Method tabs: MoMo/Card (amount → Paystack popup → webhook-confirmed) · TRX (per-user deposit address + QR, min amount, confirmations note, live "detected/confirmed" states). |
| E3 | **Withdraw** | Destination (saved MoMo/bank accounts, add-new with SMS OTP confirm), amount (max = available), fee shown, **2FA required to submit**. New destination added <24 h ago → withdrawal held + email alert (fraud rule). States: pending → processing → paid / failed (auto-refund to balance + notification). |
| E4 | **Transaction detail** | Full ledger entry: type, linked escrow (deep link), provider reference, fee breakdown, timestamps, status trail, [Download receipt PDF], [Report issue]. |

## F. Disputes, Chat, Notifications, Settings

| # | Screen | Spec |
|---|---|---|
| F1 | **Open dispute** | Reason select (not delivered / not as described / wrong item / service not done / other), description ≥50 chars, evidence upload (≤10 files, images/pdf/video ≤50 MB), requested outcome (full refund / partial — amount slider / other). Warning: "counterparty will see everything you submit". |
| F2 | **Dispute detail** | Status banner (evidence window countdown), three-column evidence view (yours / theirs / arbitrator notes), dispute chat (both parties + arbitrator; system messages for rulings), ruling card (outcome, amounts, reasoning), [Appeal] within 48 h (one appeal, requires new evidence). |
| F3 | **Chat (per escrow)** | Text, images, files ≤25 MB; system events inline ("escrow funded"); read receipts; typing indicator; messages immutable (no delete — evidence). Content notice: sharing phone numbers before funding triggers a scam-warning banner. |
| F4 | **Notification center** | Tabs: All / Escrows / Money / Security. Row: icon, title, time, unread dot; tap deep-links. Mark-all-read. |
| F5 | **Profile (public)** `/u/[handle]` | Avatar, display name, tier badge, rating + review list, completed-escrow count, member since. Report user. Own view → [Edit]. |
| F6 | **Settings — Profile** | Avatar upload (crop), display name, handle (unique), bio ≤160. Email/phone change re-triggers verification of the new value. |
| F7 | **Settings — Security** | Change password (current + new, revokes other sessions option), 2FA setup (QR + manual key → confirm code → **backup codes shown once, forced download/copy**), active sessions list (device, location, last seen, [Revoke]), login history. |
| F8 | **Settings — Notifications** | Matrix: rows = event categories, columns = push/email/SMS toggles. Security alerts email cannot be disabled (grayed on). |
| F9 | **Settings — Danger zone** | Deactivate (reversible) / Delete account: blocked while any escrow is active or balance > 0; shows blocking items with links; 14-day grace period; identity re-auth required. |

## G. Driver

| # | Screen | Spec |
|---|---|---|
| G1 | **Driver onboarding** | Separate account type: personal KYC + vehicle info + plate + photo; admin approval required. |
| G2 | **Jobs list** | Assigned deliveries: pickup/dropoff areas, package size, fee. Accept/decline (15 min window). |
| G3 | **Active job** | Steps: navigate to pickup → **capture pickup photo + seller confirm** → in transit (GPS pinged every 2 min, background) → arrived → **[Scan buyer's QR] or enter 6-digit code** (3 attempts; geofence 300 m; failure → escalation) → capture proof photo + buyer signature pad → done (fee credited). Offline mode: code verification falls back to signed-HMAC offline check, syncs later. |

## H. Errors & system screens

- **404 / 410** (expired escrow link) — distinct pages with recovery CTAs.
- **Maintenance mode** — status page link.
- **Session expired** — modal, re-login inline, return to same screen (state preserved).
- **Suspended account** — reason category + appeal form; wallet withdrawal-only mode if funds remain and no fraud hold.
- **Offline (PWA)** — cached shell + banner; money actions disabled offline.
