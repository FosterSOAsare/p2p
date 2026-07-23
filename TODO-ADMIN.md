# ADMIN — TODO

> Status audit updated 2026-07-23 (post escrow-engine + order lifecycle).
> Endpoint detail: [server/TODO.md](server/TODO.md).

## ✅ Done

- [x] Admin role + guards: `requireAdmin` middleware, `AdminGuard` layout route, admin section in account popup
- [x] KYC review queue: pending/approved/rejected tabs, applicant detail (identity + payout accounts), approve / reject with required reason, pending-only guard, reviewer + timestamp
- [x] Admin listing powers: edit/delete any listing (ownership bypass)
- [x] `scripts/make-admin.ts` for promoting accounts

## ❌ Left — HIGHEST PRIORITY: dispute resolution

The order flow can *open* disputes (deal freezes correctly), but **no admin can rule on them** — so disputed funds are stuck forever (auto-resolve is disabled). The money logic is already ported and ready in `escrows.service.ts` (`RESOLVE_RELEASE / RESOLVE_REFUND / RESOLVE_PARTIAL`, incl. partial pro-rata fee math) — this is mostly wiring an endpoint + UI.

- [ ] `GET /api/admin/disputes?status=open` — queue with deal + parties + reason/description context
- [ ] `GET /api/admin/disputes/:id` — detail (deal, timeline, both parties, amounts)
- [ ] `POST /api/admin/disputes/:id/rule` — `{ outcome: release | refund | split, buyerRefund?, note }` → calls the existing `transition(RESOLVE_*)`; moves wallet money, sets escrow `disbursed`, records ruling + reviewer + timestamp
- [ ] Client: admin dispute workspace (list + detail + ruling form), linked from the admin nav

## ❌ Left — needs no escrow (build anytime)

- [ ] **Admin dashboard** (`/admin`) — `GET /api/admin/stats`: users, listings, KYC pending, deals per status, GH₵ volume, open disputes; becomes the admin `/dashboard` target
- [ ] **User management** — `GET /api/admin/users` (search/paginate), suspend / unsuspend (`AccountStatus` already enforced at login/refresh/auth), user detail
- [ ] Listings moderation view — browse all incl. drafts, takedown w/ reason

## ❌ Left — later

- [ ] Time-locked auto-resolution job (disputes past deadline → default outcome; delivered past deadline → auto-release). **Currently disabled by decision — everything manual.**
- [ ] Finance snapshot — platform fee earnings (note: with simulated payment, fee revenue isn't recorded as income yet)

## Notes

- Admin nav currently points at `/admin/kyc`; switch to `/admin` dashboard once stats exist.
- Every admin mutation should record actor + timestamp (KYC does; disputes/user actions must too).
