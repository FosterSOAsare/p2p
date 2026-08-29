# Mobile parity, bug fixes and performance — session notes

Branch: `feat/mobile-promotions-crypto-audit`

Three things happened here: the bugs from the presentation got fixed, the two
features the web had gained were ported to mobile, and the whole system got
noticeably faster once we measured where the time was actually going.

Every number below was measured against the live Neon database from a dev
machine in Ghana, three runs each, warm.

---

## 1. The presentation bug — custom escrow deals

It was **two** bugs, and neither was routing.

**The submit button did nothing.** `NewEscrowScreen.tsx` validated the form and
then called `goBack()`. The POST was a `TODO(api)` comment and there was no
`useCreateStandaloneEscrow` in `dealsApi` to call. The route was wired fine.

**The fee-split values were rejected.** The chips sent `BUYER` / `SELLER` /
`SPLIT`; the server's schema only accepts lowercase. Confirmed against the
running API:

```
POST /api/escrows  {"feeSplit":"BUYER"}
  -> 400  "feeSplit" must be one of [buyer, seller, split]
```

So even once the POST existed, it would still have failed.

**Admin escrows showed invented data.** `DealsScreen` imported the older
`escrow/ui/AdminDealsScreen`, which still read `mockData`, while the
`/admin/deals` route rendered the API-backed one in `admin/ui/`. Only the tab
used the mock version — so an admin saw real deals in the console and fake ones
in the Deals tab. That's the "escrow part on the admin side".

**The fee preview was wrong.** It quoted a flat 1.5% with no minimum and no cap,
and used the same rate for crypto. The real schedule is 1.5% on GHS with a GH₵2
floor and GH₵150 ceiling, 1.0% uncapped on TRX. Ported the server's `quoteFee`
and checked five cases against the live API — all match; the old code was wrong
on four:

| Deal | Old preview | Server actually charges |
|---|---|---|
| GHS 500, split | 7.50 | 7.50 ✓ |
| TRX 500, split | 7.50 | **5.00** |
| GHS 50, buyer | 0.75 | **2.00** (minimum) |
| GHS 50,000, buyer | 750.00 | **150.00** (cap) |
| TRX 50, buyer | 0.75 | **0.50** |

---

## 2. The two web features, ported to mobile

**Promotions** — hub + studio against `/api/promotions`, reachable from My
Listings (header and per-row) and the seller dashboard.

Two deliberate differences from the web. Rank is a **stepper**, not a slider —
React Native has no built-in range input, and it steps in the same fives the
server validates against. Paying a shortfall reuses `useTopUp`; the web has to
stash a `pendingAction` in sessionStorage and resume on a callback route because
navigating away destroys its page, whereas `openAuthSessionAsync` hands control
straight back.

**Crypto deposits (NOWPayments / TRX)** — this one was more urgent than it
looked. `PaymentSheet` knew what the crypto rail was but only used it to hide
the wallet, so a TRX buyer got a momo/card sheet for a `FUND` the server refuses
outright. **There was no way to fund a TRX deal from the phone at all.**

> ⚠️ **The rail is wired but cannot run yet — `NOWPAYMENTS_API_KEY` is not in
> `server/.env`.** `POST /api/escrows/:id/crypto/start` returns
> `501 "Crypto funding is not configured on this server"`. This affects the
> **web identically** — same endpoint, same guard. Add `NOWPAYMENTS_API_KEY` and
> `NOWPAYMENTS_IPN_SECRET`; the base URL already defaults to the sandbox.

A second, mobile-only blocker was found and fixed. The invoice's success URL was
hard-coded to `WEB_ORIGIN`, and `NP_id` on that redirect is the only place
NOWPayments discloses the payment id before an IPN arrives. A phone never saw
it, so its only route to settlement was the webhook — which cannot reach a
server on localhost. The buyer would pay and the deal would sit on `waiting`
indefinitely, which is worse than a visible error.

`crypto/start` now accepts a `returnUrl`, so the app passes its own deep link
and `openAuthSessionAsync` catches the redirect with `NP_id` attached — the same
fallback the web has always had. Because that is a redirect target on a payment
page, it is allowlisted server-side (`server/src/features/escrows/return-url.ts`)
rather than trusted: the app scheme, `exp://` in development only, or an exact
origin match against `WEB_ORIGIN`. Verified refused: other hosts, suffix and
prefix lookalikes, the `user@host` trick, protocol downgrade, a different port,
`javascript:` and `data:`.

---

## 3. Audit findings

- **Sign-out never revoked the session.** Mobile cleared the keychain only; the
  refresh token stayed valid server-side until it expired. Now posts
  `/api/auth/logout` like the web always has.
- **The buyer-reports queue had no mobile screen.** `/api/admin/reports` was
  web-only, so a flagged listing couldn't be ruled on from the phone. Added.
- **Activity tab was the last mock screen.** Now built from `GET /api/escrows` —
  from each deal's timestamps rather than `events[]`, since the list endpoint
  omits the audit array and reading it would cost one request per deal.
- **`mockData.ts` deleted** (853 lines) — nothing read its values any more.
- **The logo had not been added.** The app was `p2p-M` with Expo's stock blue
  chevron on an Expo-blue splash. Icons now generated from the web's own
  `logo.svg`; app named "P2P Trust Market".
- Removed ~700 KB of unreferenced Expo template leftovers.

---

## 4. Performance — where the time actually went

The measured round trip to Neon is **~230ms**. Nothing else matters much: what
counts is how many round trips a request makes.

### The pool had one connection

This was the big one, and it made every other optimisation in the codebase a
no-op.

```
8 concurrent queries, cold pool : 2106ms
8 concurrent queries, warm pool :  232ms
8 sequential queries            : 1827ms   (8 x 230ms, as expected)
```

`pg` opens connections lazily and each one costs a full TLS handshake to
us-east-2. So every `Promise.all` in the services was **silently running
sequentially** — waiting on handshakes, not on Postgres. The batching was
correct all along; the pool underneath it wasn't there.

Fix: open 12 connections at boot (the widest single-request fan-out), and
`idleTimeoutMillis: 0` so they aren't reaped after 10s idle — which is what
caused "fast, then slow again after a quiet minute".

### Auth re-read the user on every request

`auth` middleware did a `user.findUnique` per call — one round trip in front of
*every* authenticated endpoint, before the handler even started — and
`requireSeller` did a second for the KYC status. Both now come from a 15-second
cache, dropped explicitly on suspension, KYC approval/rejection and
resubmission, so those still take effect immediately.

### Three handlers awaited rows they never used

`auth.me`, `users.getDashboard` and `wallet.listTransactions` each fetched a row
and then ran queries that only ever needed `userId` — which the verified token
already carries. The dashboard was three levels deep; it's one batch now.

### Results

| Endpoint | Before | After | Change |
|---|---|---|---|
| `login` | 3.60s | **0.62s** | −83% |
| `/api/users/me/dashboard` | 1.60s | **0.69s** | −57% |
| `/api/auth/me` | 0.91s | **0.46s** | −49% |
| `/api/notifications` | 0.46s | **0.23s** | −50% |
| `/api/wallet/transactions` | 1.80s | **1.13s** | −37% |
| `/api/escrows` | 1.14s | **0.92s** | −19% |
| `/api/messages` | 1.14s | **0.92s** | −19% |

401/403 re-verified on every gate afterwards; payloads unchanged.

---

## 5. Messages

### Why they were slow to arrive

Two separate causes.

**Client:** the socket delivered the message, and mobile *threw it away* and
called `invalidateQueries` — refetching the whole thread over REST. The message
had arrived in milliseconds and then sat invisible until that returned. Sending
was worse: a POST, then an invalidate, so two sequential round trips before your
own text appeared.

**Server:** `message.create` used `include: { sender }`. Prisma can't insert and
join in one statement, so it wraps the pair in a transaction — BEGIN, INSERT,
SELECT, COMMIT — five sequential round trips to write one row:

```
message.create WITH include    : 1177ms
message.create WITHOUT include :  233ms
```

The sender is now fetched alongside the conversation (both indexed point
lookups, neither depends on the other) and the insert is left plain.

| | Before | After |
|---|---|---|
| `sendMessage()` service time | 1810ms | **911ms** |
| send → on the receiver's screen | 2044ms | **923ms** |

...and that's *on top of* removing the client's full-thread refetch, which was
adding another round trip again before anything rendered.

### What else changed in chat

The thread now runs entirely on the socket (`useChat`, ported from the web).
The server already had every handler — history and gap-fill in the
`conversation:open` ack, `conversation:history`, `message:send`, `message:read`,
`typing`. Mobile just wasn't using them. **No server changes were needed.**

- **Sends are optimistic** — your message appears at once as a pending bubble
  and reconciles on ack. A refused send stays put, marked failed, with
  Retry/Discard.
- **Admin/system messages are fixed.** Mobile had no `type === 'system'` branch
  at all, so deal notices rendered as ordinary bubbles aligned to whichever
  account the server recorded as sender — reading as if a person had said them.
  They're centred chips now, tappable through to the deal, matching the web.
- **Typing indicators** came free — the events were already being broadcast.

---

## 6. Optimistic UI

Nothing in the mobile app used `onMutate`. Every tap waited out a round trip.

Now optimistic, with rollback on failure: **notification read / read-all**,
**listing delete**, **block / unblock vendor**.

Two were already optimistic but rolled back *wrongly*:

- **Saved listings** dropped the override in `onSettled`, which fires when the
  mutation returns — but the refetch it triggers is a *second* round trip, so
  the heart filled, emptied, then re-filled a second later. It now lives until
  the server's own list agrees.
- **Notification preference switches** never rolled back at all: a refused save
  left the switch showing the value the server had just rejected, with only the
  error text disagreeing.

### Deliberately NOT optimistic

Escrow fund/deliver/release/cancel/dispute, promotion purchases, withdrawals,
and every admin ruling. These move money or decide someone's case, the server
owns the state machine that says which transitions are even legal, and a
rollback there isn't recoverable — the user has already read it as done. They
keep their spinners.

---

## 7. Known gaps — please read

- **There are no automated tests in this repo.** Everything above was verified
  by hand against the live API. Nothing guards these changes from regressing. If
  we want real confidence before the next demo, a test suite is the honest next
  step.
- **The promotions purchase flow and the reports queue are unexercised.** They
  typecheck and bundle, and their endpoints return correct 403s, but buying a
  spotlight end-to-end needs a KYC-verified seller and an admin account.
- **The crypto rail has never completed a payment.** It needs
  `NOWPAYMENTS_API_KEY` in `server/.env` (see section 2); without it
  `crypto/start` is a 501 on web and mobile alike. What *has* been verified:
  TRX deals create with the right 1.0% fee, `GET /crypto` returns exactly the
  shape the panel expects, the `returnUrl` allowlist refuses every attack
  tried, and legitimate return URLs reach the service. What has **not**: an
  invoice actually opening, a payment settling, or the IPN. Assume this one is
  untested until someone runs it with sandbox keys.
- **Promotions is seller-only and is not a tab.** It's reached from My Listings
  (header button, and "Promote" on any active row) or the seller dashboard
  hero. A buyer account sees "Sell Goods" instead of "My Listings" and gets a
  403 from `/api/promotions/*`, so it is invisible to them by design — same as
  the web.
- **Your local Prisma client may be stale.** `server/src/generated` is
  gitignored and predated the crypto schema — `npx tsc --noEmit` in `server/`
  failed with 10 errors until `npx prisma generate` was run. Run it after
  pulling.
- **Test data was left in the Neon database** during verification: users
  `audit_54750` and `peer_58668`, ~6 unfunded escrows and some chat messages
  between them. They'll show up in the admin lists. Safe to delete.

---

## Reproducing the measurements

```bash
# endpoint timings
curl -s -o /dev/null -H "Authorization: Bearer $TOKEN" \
  -w "%{time_total}s\n" http://localhost:8000/api/users/me/dashboard

# round-trip floor, and whether the pool is warm
#   single query ~230ms; 8 concurrent should also be ~230ms once warm
```
