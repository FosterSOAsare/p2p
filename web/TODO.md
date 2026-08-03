## Messaging

Realtime chat is merged and on `main`. Text, image and PDF sending verified single-handed; what's left is verification that needs a second person or a full deal.

- [ ] Verify a live two-account session — unread counts, read ticks and typing across two devices, plus reconnect gap-fill (kill the network mid-thread and confirm no messages are lost).
- [ ] Verify `/admin/disputes/:id` end-to-end on a real disputed deal: chat, attachments and `system` notices all appear in the case record; the ruling dial's preview matches what actually lands in the wallets; an admin note reaches both parties live.

## Buyer
- [ ] Report listing (stretch)

## Seller

- [ ] Promote/boost listing (spec only)

## Admin

- [ ] Listings moderation view · deals force-override actions · audit log

## Crypto

- [ ] **TRX crypto rail UI** — deposit address, confirmation tracking, Tronscan links. Standalone TRX deals can be created but not funded until the server rail lands.
