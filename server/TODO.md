# Server TODO — open items

## Seller

- [ ] Promote/boost listing (paid placement)

## Admin (`/api/admin` 👑)

- [ ] Deals **force-override** (manual hold / release / refund) + oversight detail endpoint
- [ ] Audit log · support tickets

## Crypto

- [ ] **TRX crypto rail** (TRON Shasta / TronGrid): `GET /:id/crypto`, `POST /:id/crypto/check`, on-chain fund/payout/refund. Standalone TRX deals can be *created* but `fund`/`payout`/`refund` throw 501. `CryptoEscrow` model unused.
