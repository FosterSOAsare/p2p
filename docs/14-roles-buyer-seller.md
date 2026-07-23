# 14 — Roles: Buyer vs Seller (design decision)

> Status: **adopted** (2026-07-23) · Applies to `p2p/server` + `p2p/web`
> Companion to [13-username-support.md](13-username-support.md). Reflects the proposal scope (5-state escrow, simulated fiat, lightweight KYC — no tiers).

## 14.1 Summary

**"Seller" is not an account type — it is a per-context role.** There is one signup, one login, one account model. A user is a buyer on some transactions and a seller on others, at the same time. What unlocks *marketplace* selling is a verified `KycProfile`; what decides who is buyer/seller on any given escrow is recorded **on the deal itself**.

This mirrors the client exactly:

- `UserOrders.tsx` has a **buyer/seller toggle inside one portal** — the same logged-in user views purchases and sales.
- `VendorKyc` (`/sell`, "Become a Seller") is the **only** gate to selling — a KYC submission, not a different account.
- `Signup.tsx` has no account-type picker; `NewEscrow.tsx` names only a creator and a counterparty.

## 14.2 Account level

`User.role` is `user | admin` — nothing else. `admin` exists for the monitoring dashboard and dispute ruling only. There is **no** `seller`/`vendor` value, and none should be added.

## 14.3 What a KycProfile grants

`KycProfile` (1:1 with User; single lightweight submission reviewed by an admin) is the marketplace-seller switch:

| `kyc.status`             | Effect                                                              |
| ------------------------ | ------------------------------------------------------------------- |
| *(no row)* / `pending`   | Cannot create listings; can buy and use standalone escrow freely    |
| `verified`               | Can create/manage listings; shown as "Verified Seller" badge        |
| `rejected`               | Same as none; client shows rejection reason, user may resubmit      |

Enforcement is a guard on the listing mutations only:

```
POST /api/listings          → 403 unless kyc.status === "verified"
PATCH/DELETE /api/listings  → 403 unless owner (owner implies verified at creation time)
```

The seller dashboard's "KYC Level 2 Verified" badge in the client is simply `kyc.status === "verified"` rendered (there are no levels/tiers in this scope).

## 14.4 Who is buyer / seller on an escrow

Roles are fixed **per deal**, stored as `Escrow.buyerId` / `Escrow.sellerId`:

1. **Listing-originated** (`POST /api/escrows/from-listing`): roles are implied —
   `buyerId = caller`, `sellerId = listing.sellerId`. No declaration needed.
2. **Standalone** (`POST /api/escrows`): the creator declares their side via
   `creatorRole: "buyer" | "seller"` (stored on the deal). The counterparty —
   resolved by username or joining later via share code — fills the *other* side.
   Until someone joins, one of `buyerId`/`sellerId` is null.

**Standalone selling requires no KYC.** A freelance contract between two users shouldn't demand marketplace-vendor verification; the escrow itself is the trust mechanism there, and escrow is a standalone product, not a marketplace checkout step. (If this is ever revisited, it is a one-line check in the escrow service.)

## 14.5 Authorization matrix

Escrow permissions key off the **deal**, never the account:

| Action                          | Allowed for                                   |
| ------------------------------- | --------------------------------------------- |
| `POST /:id/fund`                | `req.user.id === escrow.buyerId`              |
| `POST /:id/deliver`             | `req.user.id === escrow.sellerId`             |
| `POST /:id/release`             | `req.user.id === escrow.buyerId`              |
| `POST /:id/dispute`             | either party                                  |
| `GET /:id`, chat                | either party (admin read-only via `/api/admin`) |
| Milestone deliver / release     | seller / buyer respectively                   |

The client's role toggle maps to a query param, not separate endpoints:

```
GET /api/escrows?role=buyer   → where buyerId  = me   (purchases / "orders")
GET /api/escrows?role=seller  → where sellerId = me   (sales)
```

Seller-dashboard stats are aggregates over the same data: `Listing` rows (active listings, views) + escrows where `sellerId = me` (earnings, escrow-locked, payout balances).

## 14.6 Client impact

- Keep the single signup; keep `/sell` as the KYC entry point (replace its fake instant approval with `pending` → admin review, per server TODO §3).
- `UserOrders` toggle → drive from `?role=` instead of two mock arrays.
- `NewEscrow` needs one new input: the creator's side (`I am the buyer / I am the seller`) — this was missing from the form and is required by `POST /api/escrows`.
- Show the verified badge from `kyc.status`, not the mock `isKycVerified` booleans.
