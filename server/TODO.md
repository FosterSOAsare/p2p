# Server TODO — open items

Express + TS · Prisma 7 + Neon Postgres · JWT Bearer (access + rotating refresh) · argon2id.
5-state escrow `created → funded → delivered → disbursed | disputed`. GHS fiat/momo runs on a real wallet balance (Paystack test mode); TRX (TRON Shasta) is **not built**. Fees: fiat 1.5% (min GH₵2, cap GH₵150) / crypto 1.0%, divided per deal by `FeeSplit` (`buyer` | `seller` | `split`), stored once, invariant `fundingTotal = sellerPayout + fee`.

Only what's still outstanding is listed here — see `FLOWS.md` for the endpoints that already exist.

---

## Messaging

- [ ] **Merge realtime messaging (`feat/messaging`) into `main`.** Socket.IO on the API port, JWT handshake auth, `user:`/`convo:` rooms, persist-then-emit for chat, file and system messages, plus the `MessageType`/attachment migration. `main` currently has only the REST endpoints.

## Seller

- [ ] Promote/boost listing (paid placement)

## Admin (`/api/admin` 👑)

- [ ] Listings moderation (browse all incl. drafts, takedown w/ reason)
- [ ] Deals **force-override** (manual hold / release / refund) + oversight detail endpoint
- [ ] Dispute **appeals** (one per dispute, senior/different admin) · audit log · support tickets

## Crypto

- [ ] **TRX crypto rail** (TRON Shasta / TronGrid): `GET /:id/crypto`, `POST /:id/crypto/check`, on-chain fund/payout/refund. Standalone TRX deals can be *created* but `fund`/`payout`/`refund` throw 501. `CryptoEscrow` model unused.
