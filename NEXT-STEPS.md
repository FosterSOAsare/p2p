# Next Steps — road to done

The remaining work to finish the P2P Marketplace Escrow build, in priority order. Scope is the
**Group 2 proposal**: Express+TS server, 5-state escrow, **simulated fiat (GHS)**, **real TRX on TRON
Shasta testnet**, usernames, share-code/QR join, admin dispute ruling. Real card/momo processing and
mainnet crypto are **out of scope** by design.

Detail lives in [server/TODO.md](server/TODO.md), [web/TODO.md](web/TODO.md), [FLOWS.md](FLOWS.md).
Effort: **S** ≈ half a day · **M** ≈ 1–2 days · **L** ≈ 3+ days.

## Where we are ✅
Auth, KYC, marketplace, checkout → deliver → release → review, wallet + withdraw, buyer/seller/admin
dashboards, and the full admin console (stats · KYC · disputes · users · deals oversight) are wired to the
real API and typecheck clean. Two "finished-looking" features are **not functional** (see Phase 1), and the
**crypto rail** (the proposal's second pillar) isn't built yet.

---

## Phase 1 — Make the half-finished features real  ⏱ highest value, lowest effort

- [ ] **Wire deal messaging (M)** — the backend `/api/messages` (list/thread/send/read) is done; the client
  `MessageThread.tsx` is local-state only and there's no `messagesApi.ts`. Write the hook + wire the component
  so messages persist. **Unblocks three things at once:** buyer↔seller chat, the paperclip attachment, and the
  **admin dispute evidence transcript** (currently always empty). No WebSocket needed for REST send/receive.
- [ ] **Simulated notifications (S)** — a `mailService.send()` that `console.log`s `[mail:simulated] To <email>: …`
  on each lifecycle event (order placed, delivered, released, dispute opened, ruling). Consume the stored
  notification prefs. Mirrors the existing simulated verify/reset pattern. Marks `TODO(notifications)` done.

## Phase 2 — Crypto rail (TRX / TRON Shasta)  ⏱ the second pillar

- [ ] **On-chain escrow (L)** — decide custodial-wallet vs. TVM smart contract (proposal allows either; custodial
  is faster for MVP parity with fiat disputes). Then: per-deal deposit address, TronGrid watcher crediting on
  confirmations, and `fund`/`payout`/`refund` for `rail: crypto` (they throw 501 today). Store txids.
- [ ] **Crypto UI (M)** — deposit address + QR + live confirmation counter + Tronscan links on the deal page;
  wire the `CryptoEscrow` model (currently defined but unused).
- [ ] **One verifiable Shasta tx (S)** — a real testnet escrow release, link on Tronscan — the proposal's crypto
  proof point.

## Phase 3 — Standalone escrow completeness  ✅ done

- [x] **Join-by-code screen** — `/join/:code` renders the public preview (`GET /api/escrows/code/:code`):
  terms, which side you'd take, what you'd pay or receive. Signed-out visitors go through
  `/login?redirect=` and back. Joining (`POST /code/:code/accept`) redirects to the deal.
- [x] **QR share** — the deal detail response carries a `share` block (join URL + QR data-URL) whenever a
  side is still empty; the deal page renders it as a QR + copyable link, and it disappears once someone
  joins. No separate `/:id/qr` endpoint — it rides on the request the page already makes.

## Phase 4 — Admin completeness  ⏱ nice-to-have depth

- [ ] **Listings moderation (M)** — browse all listings incl. drafts, takedown with reason.
- [ ] **Deals force-override (M)** — admin manual hold / release / refund + an oversight detail drawer
  (oversight is list-only, read-only today).
- [ ] **Dispute appeals (M)** — one appeal per dispute, routed to a different/senior admin.
- [ ] **Audit log (M)** — append-only record of every admin mutation (KYC/disputes already stamp actor+time).

## Phase 5 — Cleanup & polish  ⏱ before the demo

- [ ] Remove dead modules: `web/.../sellerData.ts`, `userProfile.ts`, and the homepage-only mock in `products.ts`.
- [ ] Decide **milestones**: build split funding for digital/service deals, or drop the unused `Milestone` model.
- [ ] Add redirect-safe handling / confirm all legacy URLs are gone (404 page already in place).
- [ ] Tidy: standalone-deal validation accepts dead `rail`/`feeSplit`/`type`; JWT secrets default `""` (add a
  startup guard).

## Phase 6 — Verification & academic deliverables  ⏱ required to "submit"

- [ ] **Tests** — state-machine transition table (every legal + illegal transition), fee math + pesewa rounding,
  wallet guarded-debit / no-negative-balance, dispute pro-rata split. (User paused tests during the build —
  resume here.)
- [ ] **E2E walkthroughs** — golden path (fund→release→review) and dispute path (open→rule→payout) asserted end to end.
- [ ] **API docs** — Swagger/OpenAPI export of the routes.
- [ ] **Diagrams** — ERD from `schema.prisma` + the module/architecture diagram.
- [ ] **Report chapters** — architecture, compliance note (why testnet-only: BoG / AML / Data Protection),
  success-metrics evaluation (completion rate, dispute turnaround, ledger correctness, Tronscan-verifiable escrow).
- [ ] **Demo build** — seeded data + deployed server/web for the supervisor demo (Neon + host).

---

## Recommended immediate next step
**Phase 1 → wire deal messaging.** It's a small, self-contained change that turns three visibly-broken
features functional (chat, attachments, dispute evidence) and removes the biggest "looks done but isn't" gap
before the crypto rail work begins. Then do the simulated notifications alongside it.

## Definition of done (proposal)
Marketplace + standalone escrow both work end-to-end on **simulated GHS** and **real Shasta TRX**; disputes are
admin-ruled with money movement; per-deal chat persists and auto-attaches as dispute evidence; a testnet escrow
is verifiable on Tronscan; and the report + diagrams + tests back it up.
