# Web TODO — open items

Realtime messaging, the dispute console and listings moderation are all built **and verified**
with live accounts. Only unstarted work is listed below.

---

## Buyer

- [ ] Report listing (stretch)

## Seller

- [ ] Promote/boost listing (spec only)

## Admin

- [ ] Deals force-override actions · audit log
- [ ] Link **Listings** from the admin sidebar — it's in the profile dropdown and `AdminSectionNav`, but `primaryNavItems` in `Layout.tsx` still lists only Dashboard / KYC / Disputes / Users / Deals.
- [ ] Decide whether admins get a **Messages** nav entry. `useMessageNotifications()` and `useUnreadTotal()` already run for them and `/messages` isn't admin-gated, so a seller's reply to a takedown notice is delivered and counted — just never surfaced.

## Listings moderation

- [ ] Drop the dispute's "what was changed" (`corrections`) field from the seller form and the admin review panel.

## Crypto

- [ ] **TRX crypto rail UI** — deposit address, confirmation tracking, Tronscan links. Standalone TRX deals can be created but not funded until the server rail lands.
