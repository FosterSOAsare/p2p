## Messaging

- [ ] **Merge `feat/messaging` into `main`, then verify with a second account.** Realtime chat (Socket.IO), the two-pane `/messages` inbox, file messages and live unread counts are built on that branch. On `main`, `MessageThread.tsx` is still local-state only — chat doesn't persist and the admin dispute evidence transcript stays empty.
- [ ] Verify the admin dispute view renders the evidence transcript end-to-end (blocked on the merge above).

## Buyer

- [ ] **Join-by-code screen** — enter a share code to preview and accept a deal (server `GET /code/:code` + `POST /code/:code/accept` already exist), plus a QR share screen for the creator.
- [ ] Report listing (stretch)

## Seller

- [ ] Promote/boost listing (spec only)

## Admin

- [ ] Listings moderation view · deals force-override actions · dispute appeals · audit log

## Crypto

- [ ] **TRX crypto rail UI** — deposit address, confirmation tracking, Tronscan links. Standalone TRX deals can be created but not funded until the server rail lands.
