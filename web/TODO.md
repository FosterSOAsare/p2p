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
- ~~Decide whether admins get a **Messages** nav entry.~~ Moot: moderation now goes out as
  notifications, so nothing creates an admin↔user conversation any more. Every remaining
  `postDealMessage` call is buyer↔seller (dispute notes and rulings post as `system` lines
  into the pair's own thread). Admins hold no threads to surface.

## Crypto

- [ ] **TRX crypto rail UI** — deposit address, confirmation tracking, Tronscan links. Standalone TRX deals can be created but not funded until the server rail lands.
