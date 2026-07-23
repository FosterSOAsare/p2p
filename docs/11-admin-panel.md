# 11 — Admin Panel

Separate route group `/admin` (same Next.js app, distinct layout/sidebar), roles: `support` (read + respond), `kyc_reviewer`, `arbitrator`, `admin` (all). Mandatory 2FA; every mutation audit-logged; destructive actions require a typed reason.

## Screens

1. **Admin dashboard** — KPI tiles (GMV in escrow, escrows by status, disputes open + SLA breaches, KYC queue depth, withdrawal approvals pending, failed webhooks), timeseries charts (escrow volume, completion rate, dispute rate), realtime alert strip (fraud flags, invariant-check failures).
2. **User management** — search/filter (tier, status, risk score); user detail: profile, KYC history, wallets + ledger, escrows, sessions/devices, risk events, notes. Actions: suspend (reason enum + free text; wallet enters withdrawal-only or full-freeze), reinstate, force password reset, revoke sessions, adjust tier (reason), manual balance adjustment (dual-control: second admin must approve; writes `adjustment` ledger pair).
3. **KYC review queue** — FIFO with claim locking (no two reviewers on one doc); side-by-side doc image + extracted fields + selfie match panel + duplicate-identity warnings; approve / reject (reason picklist + note); throughput stats per reviewer.
4. **Escrow management** — all escrows, filterable; detail view = user-side view + admin extras (full event log, ledger entries, force-transition tools gated to `admin` with dual confirmation — used only for stuck states, always audit-logged).
5. **Dispute workspace** (arbitrator home) — queue (unassigned / mine / appealed), SLA countdown badges; case view: evidence compare, system snapshot, 3-way chat, ruling form (outcome, amounts with live validation against escrow total, reasoning ≥100 chars), request-info button.
6. **Deliveries & drivers** — driver applications (approve/suspend), active deliveries map/list, failed-verification escalations, driver performance (ratings, fail rate).
7. **Finance** — platform accounts view (fees, suspense, clearing), reconciliation screen (provider statement import vs ledger diff), withdrawal approval queue (> GH₵5,000), chargeback tracker, invariant-check history.
8. **Listings moderation** — flagged/pending listings, banned-term rules editor, category management.
9. **Reports & analytics** — cohort retention, funnel (signup→tier1→first escrow→completion), fee revenue, dispute outcomes distribution, export CSV.
10. **Platform settings** — fee %, caps, tier limits, timeout durations, freeze switches (withdrawals / escrow creation / crypto module), maintenance banner text. All versioned (who/when/old→new).
11. **Audit log viewer** — read-only, filter by actor/entity/action/date, export; hash-chain verification status indicator.
