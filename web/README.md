# P2P Marketplace Escrow — Web Client

React + Vite + TypeScript front-end for the Group 2 P2P Marketplace Escrow project. Talks to the
[API server](../server) over REST. Buyers browse and buy, sellers list and fulfil, admins review
KYC and arbitrate disputes — all against a 5-state escrow (`created → funded → delivered → disbursed | disputed`).

> Fiat (GHS) payments are **simulated**; the TRX crypto rail is **not built yet**. See [../FLOWS.md](../FLOWS.md)
> for every flow and [TODO.md](./TODO.md) for the per-persona status.

## Tech stack

| Concern       | Choice                                             |
| ------------- | -------------------------------------------------- |
| Framework     | React 19 + Vite                                    |
| Routing       | React Router 7 (layout routes as guards)           |
| Server state  | TanStack Query 5 (one fetch client, transparent token refresh) |
| Forms         | react-hook-form + zod resolvers                    |
| Styling       | Tailwind CSS 4 (`@tailwindcss/vite`), dark/light theme |
| Icons / QR    | lucide-react · qrcode.react                        |
| Lint          | oxlint                                             |

## Setup

```bash
cd web
npm install
npm run dev        # http://localhost:5173 (proxy target: API at http://localhost:8000)
```

| Script            | What it does                          |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Vite dev server with HMR              |
| `npm run build`   | `tsc -b && vite build`                |
| `npm run preview` | Preview the production build          |
| `npm run lint`    | oxlint                                |

The API base URL comes from `VITE_API_URL` (defaults to `http://localhost:8000`).

## Architecture

Feature-sliced. Each feature owns its data hooks (`data/`) and UI (`ui/`); routed pages live in `pages/`.

```
web/src/
├── App.tsx                     # route table (guards as layout routes)
├── main.tsx                    # providers + router bootstrap
├── pages/                      # routed screens (Home, Checkout, Deals, EscrowDetail, Admin*, …)
└── features/
    ├── shared/
    │   ├── libs/api.ts         # fetch client — Bearer token + one-shot 401 refresh + ApiError
    │   ├── libs/{currency,date,useDebouncedValue}.ts
    │   └── ui/                 # Layout (role-aware nav), Footer, Badge, ConfirmDialog, StarRatingInput, …
    ├── auth/                   # signup / login / verify / reset — data + UI
    ├── marketplace/            # browse + product detail (data + ui)
    ├── escrow/                 # deals: ordersApi, walletApi, DealCard, DealsListView
    ├── seller/                 # KYC + listings (SellerGuard, ListingForm)
    ├── user/                   # profile, settings, dashboard, saved, blocks
    ├── admin/                  # AdminGuard, AdminSectionNav, KYC/disputes/users/deals data
    ├── upload/                 # Cloudinary upload hook
    └── homepage/               # landing sections
```

### Key routes

| Path | Who | What |
| --- | --- | --- |
| `/marketplace`, `/marketplace/:id` | all | browse + listing detail |
| `/checkout?listing=` | buyer | simulated payment → funded escrow |
| `/deals` | role-aware | buyer/seller → own deals · admin → all deals |
| `/escrow/new`, `/escrow/:id` | buyer/seller | create standalone deal · deal detail + lifecycle actions |
| `/wallet` | seller | balances + withdraw + transactions |
| `/dashboard` | role-aware | buyer / seller / (admin → KYC) |
| `/settings` | all | profile + notification prefs |
| `/listings*` | seller (`SellerGuard`) | my listings CRUD |
| `/admin/kyc`, `/admin/disputes`, `/admin/users` | admin (`AdminGuard`) | review console |

### Conventions

- **Guards** are React Router layout routes wrapping `<Outlet/>` (`SellerGuard`, `AdminGuard`); role branching via `useMe()`.
- **Filters & pagination live in the URL** (`useSearchParams`) — deals, users, and disputes are all query-driven and shareable.
- **All server calls** go through `features/shared/libs/api.ts` (`api<T>(path, {method, body})`), which attaches the JWT and transparently refreshes on 401.
- **Money actions** confirm before firing and surface `apiErrorMessage(err)`; irreversible actions use `ConfirmDialog`.

## Status

Order lifecycle, wallet, dashboards, and the admin console (KYC · disputes · users · deals) are wired to
the real API. Known gaps: **deal messaging** is a UI shell (`MessageThread` is local-state only — the
`/api/messages` backend exists but isn't wired), the **TRX crypto rail** and **real payments** are not built,
and the homepage's featured/metrics sections are still mock. Full breakdown in [TODO.md](./TODO.md).
